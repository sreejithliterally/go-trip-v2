const { sequelize, QueryTypes, Booking, BookingPricing, BookingGuest, Listing, VendorProfile, Coupon, CancellationPolicy, Payment } = require('../../db/index');
const { Op } = require('sequelize');
const { parsePagination }   = require('../../shared/utils/pagination');
const { calculateBookingPrice, resolveCouponDiscount } = require('../../shared/utils/priceCalculator');
const { resolveEntityMeta, checkInventory, generateRef } = require('./bookings.service');
const R = require('../../shared/utils/apiResponse');

// ── Step 1: Check availability + price ────────────────────────────────────────

const checkAvailability = async (req, res, next) => {
  try {
    const { entityType, entityId, checkIn, checkOut, adults, infants = 0, unitsBooked = 1, mealPlanId, couponCode } = req.body;
    const meta    = await resolveEntityMeta(entityType, entityId);
    const endDate = checkOut || new Date(new Date(checkIn).getTime() + 86400000).toISOString().split('T')[0];

    const calRows = await sequelize.query(
      `SELECT date, total_units - booked_units - blocked_units AS available_units, is_blocked
       FROM availability_calendar WHERE entity_type = :entityType AND entity_id = :entityId
       AND date >= :checkIn AND date < :endDate ORDER BY date`,
      { type: QueryTypes.SELECT, replacements: { entityType, entityId, checkIn, endDate } }
    );

    if (!calRows.length) return R.error(res, 'No availability data for selected dates');
    const unavailable = calRows.filter(r => r.is_blocked || r.available_units < unitsBooked);
    if (unavailable.length) return res.json({ success: true, available: false, unavailableDates: unavailable.map(r => r.date) });

    const breakdown = await calculateBookingPrice({
      entityType, entityId, checkIn, checkOut, adults, infants, unitsBooked,
      defaultAdultOccupancy: meta.default_adult_occupancy || 2,
      extraAdultCharge:      meta.extra_adult_charge || 0,
      mealPlanId: mealPlanId || null, mealPlanType: meta.mealPlanType || null,
      platformFeePct: parseFloat(process.env.PLATFORM_FEE_PCT || '2'),
    });

    if (couponCode) {
      const coupon = await Coupon.findOne({ where: { code: couponCode, isActive: true } });
      if (coupon) {
        const { discountAmount } = await resolveCouponDiscount(coupon.id, breakdown.subtotal, meta.category);
        breakdown.discountAmount = discountAmount;
        breakdown.taxableAmount  = Math.max(0, breakdown.subtotal - discountAmount);
        breakdown.taxAmount      = Math.round(breakdown.taxableAmount * breakdown.taxRatePct) / 100;
        breakdown.totalAmount    = Math.round((breakdown.taxableAmount + breakdown.taxAmount + breakdown.platformFee) * 100) / 100;
      }
    }

    res.json({ success: true, available: true, priceBreakdown: breakdown });
  } catch (err) { next(err); }
};

// ── Step 2: Hold ──────────────────────────────────────────────────────────────

const hold = async (req, res, next) => {
  try {
    const { entityType, entityId, listingId, checkIn, checkOut, adults, infants = 0, unitsBooked = 1, mealPlanId, activitySlotId, couponCode, specialRequests, guests = [] } = req.body;
    const meta = await resolveEntityMeta(entityType, entityId);

    const result = await sequelize.transaction(async (t) => {
      // Lock availability rows
      const endDate = checkOut || new Date(new Date(checkIn).getTime() + 86400000).toISOString().split('T')[0];
      const calRows = await sequelize.query(
        `SELECT date, total_units - booked_units - blocked_units AS available_units, is_blocked
         FROM availability_calendar WHERE entity_type = :entityType AND entity_id = :entityId
         AND date >= :checkIn AND date < :endDate ORDER BY date FOR UPDATE`,
        { type: QueryTypes.SELECT, replacements: { entityType, entityId, checkIn, endDate }, transaction: t }
      );

      const unavailable = calRows.filter(r => r.is_blocked || r.available_units < unitsBooked);
      if (unavailable.length) throw Object.assign(new Error('Requested dates are not available'), { status: 409 });

      // Server-side price
      const breakdown = await calculateBookingPrice({
        entityType, entityId, checkIn, checkOut, adults, infants, unitsBooked,
        defaultAdultOccupancy: meta.default_adult_occupancy || 2,
        extraAdultCharge:      meta.extra_adult_charge || 0,
        mealPlanId: mealPlanId || null, mealPlanType: meta.mealPlanType || null,
        platformFeePct: parseFloat(process.env.PLATFORM_FEE_PCT || '2'),
      });

      // Coupon
      let couponId = null, couponCodeStored = null;
      if (couponCode) {
        const coupon = await Coupon.findOne({ where: { code: couponCode, isActive: true }, transaction: t, lock: t.LOCK.UPDATE });
        if (coupon) {
          const { discountAmount } = await resolveCouponDiscount(coupon.id, breakdown.subtotal, meta.category);
          breakdown.discountAmount = discountAmount;
          breakdown.taxableAmount  = Math.max(0, breakdown.subtotal - discountAmount);
          breakdown.taxAmount      = Math.round(breakdown.taxableAmount * breakdown.taxRatePct) / 100;
          breakdown.totalAmount    = Math.round((breakdown.taxableAmount + breakdown.taxAmount + breakdown.platformFee) * 100) / 100;
          couponId = coupon.id; couponCodeStored = coupon.code;
          await coupon.increment('usedCount', { transaction: t });
        }
      }

      const bookingRef = await generateRef(t);
      const booking = await Booking.create({
        bookingRef, userId: req.user.id, listingId, vendorId: meta.vendor_id,
        entityType, entityId, checkIn, checkOut: checkOut || null, adults, infants,
        unitsBooked, mealPlanId: mealPlanId || null, activitySlotId: activitySlotId || null,
        status: 'pending_payment', specialRequests: specialRequests || null,
      }, { transaction: t });

      const snapshot = { ...breakdown, entityType, entityId, checkIn, checkOut, adults, infants, unitsBooked };
      await BookingPricing.create({
        bookingId: booking.id, nights: breakdown.nights,
        basePrice: breakdown.basePrice, extraPersonCharge: breakdown.extraPersonCharge,
        mealCharge: breakdown.mealCharge, subtotal: breakdown.subtotal,
        couponId, couponCode: couponCodeStored, discountAmount: breakdown.discountAmount,
        taxableAmount: breakdown.taxableAmount, taxRatePct: breakdown.taxRatePct,
        taxAmount: breakdown.taxAmount, platformFee: breakdown.platformFee,
        platformFeePct: breakdown.platformFeePct, totalAmount: breakdown.totalAmount,
        snapshotJson: snapshot,
      }, { transaction: t });

      for (const [i, g] of guests.entries()) {
        await BookingGuest.create({ bookingId: booking.id, fullName: g.fullName, age: g.age || null, idType: g.idType || null, idNumber: g.idNumber || null, isPrimary: i === 0 }, { transaction: t });
      }

      return { booking, priceBreakdown: breakdown };
    });

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    if (err.status === 409) return R.error(res, err.message, 409);
    next(err);
  }
};

// ── My bookings ───────────────────────────────────────────────────────────────

const myBookings = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const where = { userId: req.user.id };
    if (req.query.status) where.status = req.query.status;
    const { count, rows } = await Booking.findAndCountAll({
      where,
      include: [
        { model: Listing, as: 'listing', attributes: ['title', 'category'] },
        { model: BookingPricing, as: 'pricing', attributes: ['totalAmount'] },
      ],
      order: [['created_at', 'DESC']], limit, offset,
    });
    R.paginated(res, { data: rows, total: count, limit, offset });
  } catch (err) { next(err); }
};

const myBookingDetail = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        { model: Listing, as: 'listing', attributes: ['title', 'category'] },
        { model: BookingPricing, as: 'pricing' },
        { model: BookingGuest, as: 'guests' },
      ],
    });
    if (!booking) return R.notFound(res);
    R.success(res, { booking });
  } catch (err) { next(err); }
};

// ── Cancel ────────────────────────────────────────────────────────────────────

const cancel = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: BookingPricing, as: 'pricing' },
        { model: Listing, as: 'listing', attributes: ['cancellationPolicyId'] },
      ],
    });
    if (!booking) return R.notFound(res);
    if (req.user.role !== 'admin' && booking.userId !== req.user.id) return R.forbidden(res);

    const cancellable = ['pending_payment', 'hold', 'confirmed'];
    if (!cancellable.includes(booking.status)) return R.error(res, `Cannot cancel booking with status: ${booking.status}`);

    // Calculate refund from policy
    let refundPct = 0;
    if (booking.listing?.cancellationPolicyId && booking.checkIn) {
      const policy = await CancellationPolicy.findByPk(booking.listing.cancellationPolicyId);
      if (policy) {
        const hoursUntil = (new Date(booking.checkIn) - new Date()) / 3600000;
        const rules = policy.rulesJson;
        const applicable = rules.filter(r => hoursUntil >= r.hours_before_checkin).sort((a, b) => b.hours_before_checkin - a.hours_before_checkin);
        refundPct = applicable[0]?.refund_pct ?? 0;
      }
    }
    const refundAmount = Math.round((booking.pricing?.totalAmount || 0) * refundPct / 100 * 100) / 100;

    await sequelize.transaction(async (t) => {
      await booking.update({ status: 'cancelled', cancelledAt: new Date(), cancellationReason: req.body.reason || null, cancelledBy: req.user.id }, { transaction: t });

      if (booking.status === 'confirmed' && refundAmount > 0) {
        const payment = await Payment.findOne({ where: { bookingId: booking.id, status: 'captured' }, transaction: t });
        if (payment) {
          const { Refund } = require('../../db/index');
          await Refund.create({ paymentId: payment.id, bookingId: booking.id, amount: refundAmount, reason: req.body.reason || 'Customer cancellation', status: 'requested' }, { transaction: t });
        }
      }
    });

    R.success(res, { message: 'Booking cancelled', refundAmount });
  } catch (err) { next(err); }
};

// ── Vendor ────────────────────────────────────────────────────────────────────

const vendorBookings = async (req, res, next) => {
  try {
    const vp = await VendorProfile.findOne({ where: { userId: req.user.id } });
    if (!vp) return R.forbidden(res);
    const { limit, offset } = parsePagination(req.query);
    const where = { vendorId: vp.id };
    if (req.query.status) where.status = req.query.status;
    const { count, rows } = await Booking.findAndCountAll({
      where,
      include: [
        { model: Listing, as: 'listing', attributes: ['title'] },
        { model: BookingPricing, as: 'pricing', attributes: ['totalAmount'] },
      ],
      order: [['created_at', 'DESC']], limit, offset,
    });
    R.paginated(res, { data: rows, total: count, limit, offset });
  } catch (err) { next(err); }
};

const checkIn  = async (req, res, next) => { try { await Booking.update({ status: 'checked_in', checkedInAt: new Date() }, { where: { id: req.params.id, status: 'confirmed' } }); R.success(res, { message: 'Checked in' }); } catch (err) { next(err); } };
const checkOut = async (req, res, next) => { try { await Booking.update({ status: 'completed', completedAt: new Date() }, { where: { id: req.params.id, status: 'checked_in' } }); R.success(res, { message: 'Checked out' }); } catch (err) { next(err); } };
const noShow   = async (req, res, next) => { try { await Booking.update({ status: 'no_show' }, { where: { id: req.params.id } }); R.success(res, { message: 'Marked as no-show' }); } catch (err) { next(err); } };

// ── Admin ─────────────────────────────────────────────────────────────────────

const adminList = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.status)   where.status   = req.query.status;
    if (req.query.vendorId) where.vendorId = req.query.vendorId;
    const { count, rows } = await Booking.findAndCountAll({
      where,
      include: [
        { model: Listing, as: 'listing', attributes: ['title', 'category'] },
        { model: BookingPricing, as: 'pricing', attributes: ['totalAmount'] },
      ],
      order: [['created_at', 'DESC']], limit, offset,
    });
    R.paginated(res, { data: rows, total: count, limit, offset });
  } catch (err) { next(err); }
};

const adminGet = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Listing, as: 'listing', attributes: ['title', 'category'] },
        { model: BookingPricing, as: 'pricing' },
        { model: BookingGuest, as: 'guests' },
        { model: VendorProfile, as: 'vendor', attributes: ['businessName'] },
      ],
    });
    if (!booking) return R.notFound(res);
    R.success(res, { booking });
  } catch (err) { next(err); }
};

const adminOverrideStatus = async (req, res, next) => {
  try {
    await Booking.update({ status: req.body.status }, { where: { id: req.params.id } });
    R.success(res, { message: 'Status updated' });
  } catch (err) { next(err); }
};

module.exports = { checkAvailability, hold, myBookings, myBookingDetail, cancel, vendorBookings, checkIn, checkOut, noShow, adminList, adminGet, adminOverrideStatus };
