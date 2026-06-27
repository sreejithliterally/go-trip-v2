const Razorpay = require('razorpay');
const crypto   = require('crypto');
const { sequelize, Booking, BookingPricing, Payment, Refund, VendorProfile, VendorPayout } = require('../../db/index');
const { parsePagination } = require('../../shared/utils/pagination');
const R = require('../../shared/utils/apiResponse');
const logger = require('../../shared/utils/logger');

let _razorpay = null;
const getRazorpay = () => {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
};

// ── Step 3: Initiate Razorpay order ──────────────────────────────────────────

const initiate = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.body.bookingId, {
      include: [{ model: BookingPricing, as: 'pricing' }],
    });
    if (!booking)                         return R.notFound(res, 'Booking not found');
    if (booking.userId !== req.user.id)   return R.forbidden(res);
    if (booking.status !== 'pending_payment') return R.error(res, 'Booking is not awaiting payment');

    const amountPaise = Math.round(booking.pricing.totalAmount * 100);
    const order = await getRazorpay().orders.create({
      amount: amountPaise, currency: 'INR',
      receipt: booking.bookingRef,
      notes:   { booking_id: booking.id },
    });

    const payment = await Payment.create({ bookingId: booking.id, gateway: 'razorpay', gatewayOrderId: order.id, amount: booking.pricing.totalAmount, status: 'initiated' });
    res.json({ success: true, payment: { id: payment.id, gatewayOrderId: payment.gatewayOrderId, amount: payment.amount }, razorpayOrder: { id: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID } });
  } catch (err) { next(err); }
};

// ── Webhook ───────────────────────────────────────────────────────────────────

const razorpayWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const expected  = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(req.body).digest('hex');
    if (signature !== expected) { logger.warn('Invalid Razorpay webhook signature'); return res.status(400).json({ error: 'Invalid signature' }); }

    const event   = JSON.parse(req.body.toString());
    const payload = event.payload?.payment?.entity;
    logger.info('Razorpay webhook', { event: event.event });

    if (event.event === 'payment.captured') await handleCaptured(payload);
    else if (event.event === 'payment.failed') await handleFailed(payload);
    else if (event.event === 'refund.processed') await handleRefundProcessed(event.payload?.refund?.entity);

    res.json({ status: 'ok' });
  } catch (err) { logger.error('Webhook error', { err }); res.status(500).json({ error: 'Webhook processing failed' }); }
};

const handleCaptured = async (payload) => {
  await sequelize.transaction(async (t) => {
    const payment = await Payment.findOne({ where: { gatewayOrderId: payload.order_id, status: 'initiated' }, transaction: t });
    if (!payment) return;

    await payment.update({ status: 'captured', gatewayPaymentId: payload.id, method: payload.method, gatewayResponse: payload, paidAt: new Date() }, { transaction: t });
    await Booking.update({ status: 'confirmed', confirmedAt: new Date() }, { where: { id: payment.bookingId, status: 'pending_payment' }, transaction: t });

    const booking = await Booking.findByPk(payment.bookingId, {
      include: [{ model: BookingPricing, as: 'pricing' }],
      transaction: t,
    });
    const vp = await VendorProfile.findByPk(booking.vendorId, { transaction: t });
    if (booking && vp) {
      const gross      = booking.pricing.totalAmount;
      const commission = Math.round(gross * vp.commissionPct / 100 * 100) / 100;
      const tds        = Math.round(gross * 0.01 * 100) / 100;
      const net        = Math.round((gross - commission - tds) * 100) / 100;
      await VendorPayout.create({ vendorId: vp.id, bookingId: booking.id, grossAmount: gross, commissionAmount: commission, commissionPct: vp.commissionPct, tdsAmount: tds, netPayout: net }, { transaction: t }).catch(() => {});
    }
  });
};

const handleFailed = async (payload) => {
  await sequelize.transaction(async (t) => {
    const payment = await Payment.findOne({ where: { gatewayOrderId: payload.order_id }, transaction: t });
    if (!payment) return;
    await payment.update({ status: 'failed', gatewayResponse: payload }, { transaction: t });
    await Booking.update({ status: 'cancelled', cancelledAt: new Date() }, { where: { id: payment.bookingId, status: 'pending_payment' }, transaction: t });
  });
};

const handleRefundProcessed = async (payload) => {
  if (!payload) return;
  await Refund.update(
    { status: 'processed', gatewayRefundId: payload.id, processedAt: new Date() },
    { where: { status: ['requested', 'approved'] } }
  );
};

// ── Refunds ────────────────────────────────────────────────────────────────────

const initiateRefund = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.bookingId, { include: [{ model: BookingPricing, as: 'pricing' }] });
    if (!booking) return R.notFound(res);
    if (req.user.role !== 'admin' && booking.userId !== req.user.id) return R.forbidden(res);

    const payment = await Payment.findOne({ where: { bookingId: booking.id, status: 'captured' } });
    if (!payment) return R.error(res, 'No captured payment found');

    const refundAmount = parseFloat(req.body.refundAmount || booking.pricing.totalAmount);
    const rzRefund     = await getRazorpay().payments.refund(payment.gatewayPaymentId, { amount: Math.round(refundAmount * 100), notes: { booking_id: booking.id } });
    const refund = await Refund.create({ paymentId: payment.id, bookingId: booking.id, amount: refundAmount, reason: req.body.reason || null, gatewayRefundId: rzRefund.id, initiatedBy: req.user.id, status: 'approved' });
    R.created(res, { refund });
  } catch (err) { next(err); }
};

const listRefunds = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { count, rows } = await Refund.findAndCountAll({
      include: [{ model: Booking, as: 'booking', attributes: ['bookingRef', 'userId'] }],
      order: [['initiated_at', 'DESC']], limit, offset,
    });
    R.success(res, { refunds: rows, total: count });
  } catch (err) { next(err); }
};

// ── Payouts ────────────────────────────────────────────────────────────────────

const vendorPayouts = async (req, res, next) => {
  try {
    const vp = await VendorProfile.findOne({ where: { userId: req.user.id } });
    if (!vp) return R.forbidden(res);
    const { limit, offset } = parsePagination(req.query);
    const { count, rows } = await VendorPayout.findAndCountAll({
      where: { vendorId: vp.id },
      include: [{ model: Booking, as: 'booking', attributes: ['bookingRef'] }],
      order: [['created_at', 'DESC']], limit, offset,
    });
    R.paginated(res, { data: rows, total: count, limit, offset });
  } catch (err) { next(err); }
};

const adminPayouts = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const where = req.query.status ? { status: req.query.status } : {};
    const { count, rows } = await VendorPayout.findAndCountAll({
      where,
      include: [
        { model: Booking, as: 'booking', attributes: ['bookingRef'] },
        { model: VendorProfile, as: 'vendor', attributes: ['businessName'] },
      ],
      order: [['created_at', 'DESC']], limit, offset,
    });
    R.paginated(res, { data: rows, total: count, limit, offset });
  } catch (err) { next(err); }
};

const settleVendorPayout = async (req, res, next) => {
  try {
    const payout = await VendorPayout.findByPk(req.params.id);
    if (!payout) return R.notFound(res);
    await payout.update({ status: 'settled', bankTransferRef: req.body.bankTransferRef, settledAt: new Date() });
    R.success(res, { payout });
  } catch (err) { next(err); }
};

const myPayments = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { count, rows } = await Payment.findAndCountAll({
      include: [{ model: Booking, as: 'booking', where: { userId: req.user.id }, attributes: ['bookingRef', 'listingId'] }],
      attributes: { exclude: ['gatewayResponse'] },  // never expose raw gateway payload
      order: [['created_at', 'DESC']], limit, offset,
    });
    R.paginated(res, { data: rows, total: count, limit, offset });
  } catch (err) { next(err); }
};

module.exports = { initiate, razorpayWebhook, initiateRefund, listRefunds, vendorPayouts, adminPayouts, settleVendorPayout, myPayments };
