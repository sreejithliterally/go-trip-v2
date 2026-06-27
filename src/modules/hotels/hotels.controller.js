const { sequelize, QueryTypes, Listing, HotelProperty, RoomType, RoomMealPlan, RoomAmenity, AmenityMaster, ListingImage, ListingHighlight } = require('../../db/index');

// Standard meal plan templates seeded for every new room type.
// Vendors override prices; plans with all-zero prices are "available but unpriced".
const STANDARD_MEAL_PLANS = [
  { planCode: 'EP',  label: 'Room Only',                       includesBreakfast: false, includesLunch: false, includesDinner: false, includesSnacks: false, isDefault: true  },
  { planCode: 'CP',  label: 'With Breakfast',                  includesBreakfast: true,  includesLunch: false, includesDinner: false, includesSnacks: false, isDefault: false },
  { planCode: 'MAP', label: 'Breakfast + Dinner',              includesBreakfast: true,  includesLunch: false, includesDinner: true,  includesSnacks: false, isDefault: false },
  { planCode: 'AP',  label: 'All Meals',                       includesBreakfast: true,  includesLunch: true,  includesDinner: true,  includesSnacks: false, isDefault: false },
  { planCode: 'AI',  label: 'All Inclusive (Meals + Snacks)',   includesBreakfast: true,  includesLunch: true,  includesDinner: true,  includesSnacks: true,  isDefault: false },
];

/**
 * Build meal plan rows for bulk insert.
 * Uses vendor-supplied plans if provided; falls back to standard templates.
 * Prices default to 0 — vendor fills them in via PATCH /room-types/:id.
 */
const DEFAULT_LABEL = Object.fromEntries(STANDARD_MEAL_PLANS.map((p) => [p.planCode, p.label]));

/** Attach amenities to a room type (validates IDs, uses direct junction inserts). */
const attachAmenities = async (roomTypeId, amenityIds, transaction, { replace = false } = {}) => {
  if (!amenityIds?.length) return;
  const unique = [...new Set(amenityIds)];
  const found = await AmenityMaster.count({
    where: { id: unique, isActive: true },
    transaction,
  });
  if (found !== unique.length) {
    const err = new Error('One or more amenity IDs are invalid or inactive');
    err.status = 400;
    throw err;
  }
  if (replace) {
    await RoomAmenity.destroy({ where: { roomTypeId }, transaction });
  }
  await RoomAmenity.bulkCreate(
    unique.map((amenityId) => ({ roomTypeId, amenityId })),
    { transaction, ignoreDuplicates: !replace }
  );
};

const buildMealPlans = (roomTypeId, mealPlansInput) => {
  const templates = (mealPlansInput && mealPlansInput.length)
    ? mealPlansInput
    : STANDARD_MEAL_PLANS;

  return templates.map((p) => ({
    roomTypeId,
    planCode:          p.planCode,
    label:             p.label || DEFAULT_LABEL[p.planCode] || p.planCode,
    includesBreakfast: p.includesBreakfast ?? false,
    includesLunch:     p.includesLunch     ?? false,
    includesDinner:    p.includesDinner    ?? false,
    includesSnacks:    p.includesSnacks    ?? false,
    // Prices not used for now — food cost is bundled into basePricePerNight
    breakfastPricePp:  0,
    lunchPricePp:      0,
    dinnerPricePp:     0,
    snacksPricePp:     0,
    isDefault:         p.isDefault         ?? false,
  }));
};
const { Op } = require('sequelize');
const { parsePagination }  = require('../../shared/utils/pagination');
const { assertVendorOwnsListing, getVendorProfileId, addImage } = require('../listings/listings.queries');
const R = require('../../shared/utils/apiResponse');
const { resolveFileUrl } = require('../../shared/middleware/upload');

// ── Public ────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { city, minRating, search } = req.query;
    const where = { category: 'hotel', isPublished: true, status: 'active' };
    if (city)      where[Op.and] = [sequelize.where(sequelize.cast(sequelize.col('location_json'), 'text'), { [Op.iLike]: `%${city}%` })];
    if (minRating) where.avgRating = { [Op.gte]: minRating };

    const { count, rows } = await Listing.findAndCountAll({
      where,
      include: [{ model: HotelProperty, as: 'hotelProperty' }],
      order: [['avg_rating', 'DESC NULLS LAST'], ['created_at', 'DESC']],
      limit, offset,
      subQuery: false,
    });

    // Attach cover image per listing
    const data = await Promise.all(rows.map(async (l) => {
      const cover = await ListingImage.findOne({ where: { entityId: l.id, isCover: true } });
      return { ...l.toJSON(), coverImage: cover?.url ?? null };
    }));

    R.paginated(res, { data, total: count, limit, offset });
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    const listing = await Listing.findOne({
      where: { id: req.params.id, category: 'hotel' },
      include: [
        {
          model: HotelProperty, as: 'hotelProperty',
          include: [{
            model: RoomType, as: 'roomTypes',
            where: { isActive: true }, required: false,
            include: [
              { model: RoomMealPlan, as: 'mealPlans' },
              { model: AmenityMaster, as: 'amenities', through: { attributes: [] } },
            ],
          }],
        },
        { model: ListingImage, as: 'images', where: { entityType: 'listing' }, required: false, order: [['sort_order', 'ASC']] },
        { model: ListingHighlight, as: 'highlights', required: false },
      ],
    });
    if (!listing) return R.notFound(res);
    R.success(res, { hotel: listing });
  } catch (err) { next(err); }
};

const getRoomTypes = async (req, res, next) => {
  try {
    const hp = await HotelProperty.findOne({ where: { listingId: req.params.id } });
    if (!hp) return R.notFound(res);
    const roomTypes = await RoomType.findAll({
      where: { hotelPropertyId: hp.id, isActive: true },
      include: [{ model: RoomMealPlan, as: 'mealPlans' }, { model: AmenityMaster, as: 'amenities', through: { attributes: [] } }],
    });
    R.success(res, { roomTypes });
  } catch (err) { next(err); }
};

// ── Vendor ────────────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    const { title, description, locationJson, listingType, starRating, checkInTime, checkOutTime, propertyRules, cancellationPolicyId, metaJson } = req.body;

    const result = await sequelize.transaction(async (t) => {
      const listing = await Listing.create(
        { vendorId, category: 'hotel', title, description: description || null, locationJson, cancellationPolicyId: cancellationPolicyId || null, metaJson: metaJson || null },
        { transaction: t }
      );
      const hp = await HotelProperty.create(
        { listingId: listing.id, listingType, starRating: starRating || null, checkInTime: checkInTime || '14:00', checkOutTime: checkOutTime || '11:00', propertyRules: propertyRules || null },
        { transaction: t }
      );
      return { listing, hotelProperty: hp };
    });
    R.created(res, { id: result.listing.id, ...result });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    const listing  = await assertVendorOwnsListing(req.params.id, vendorId);
    const { title, description, locationJson, metaJson, starRating, checkInTime, checkOutTime, propertyRules, cancellationPolicyId } = req.body;

    await listing.update({ title: title ?? listing.title, description: description ?? listing.description, locationJson: locationJson ?? listing.locationJson, metaJson: metaJson ?? listing.metaJson, cancellationPolicyId: cancellationPolicyId ?? listing.cancellationPolicyId });

    if (starRating || checkInTime || checkOutTime || propertyRules) {
      const hp = await HotelProperty.findOne({ where: { listingId: listing.id } });
      if (hp) await hp.update({ starRating: starRating ?? hp.starRating, checkInTime: checkInTime ?? hp.checkInTime, checkOutTime: checkOutTime ?? hp.checkOutTime, propertyRules: propertyRules ?? hp.propertyRules });
    }
    R.success(res, { message: 'Updated' });
  } catch (err) { next(err); }
};

const createRoomType = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    await assertVendorOwnsListing(req.params.id, vendorId);
    const hp = await HotelProperty.findOne({ where: { listingId: req.params.id } });
    if (!hp) return R.notFound(res, 'Hotel property not found');

    // full_property listings represent the entire property as a single unit.
    // Only one room_type row is allowed — adding more would break availability tracking.
    if (hp.listingType === 'full_property') {
      const existing = await RoomType.count({ where: { hotelPropertyId: hp.id } });
      if (existing > 0) {
        return R.error(res, 'A full_property listing can only have one room type (representing the whole property). Use listingType "rooms" for multi-room hotels.', 400);
      }
    }

    const {
      name, bedType, numBeds = 1, floorAreaSqft, totalUnits,
      defaultAdultOccupancy = 2, maxAdultOccupancy = 3,
      defaultChildOccupancy = 0, maxChildOccupancy = 2,
      defaultInfantOccupancy = 0, maxInfantOccupancy = 2,
      basePricePerNight,
      extraAdultCharge = 0, extraChildCharge = 0, extraInfantCharge = 0,
      mealPlans, amenityIds,
    } = req.body;

    const result = await sequelize.transaction(async (t) => {
      const roomType = await RoomType.create({
        hotelPropertyId: hp.id, name, bedType, numBeds,
        floorAreaSqft: floorAreaSqft || null, totalUnits,
        defaultAdultOccupancy, maxAdultOccupancy,
        defaultChildOccupancy, maxChildOccupancy,
        defaultInfantOccupancy, maxInfantOccupancy,
        basePricePerNight, extraAdultCharge, extraChildCharge, extraInfantCharge,
      }, { transaction: t });

      const plans = await RoomMealPlan.bulkCreate(
        buildMealPlans(roomType.id, mealPlans),
        { transaction: t }
      );

      if (amenityIds && amenityIds.length) {
        await attachAmenities(roomType.id, amenityIds, t);
      }

      return { roomType, mealPlans: plans, amenityIds: amenityIds || [] };
    });

    R.created(res, { id: result.roomType.id, ...result });
  } catch (err) { next(err); }
};

/**
 * Shortcut for full_property listings.
 * Creates or updates the single room_type that represents the whole property.
 * Vendors call this instead of the generic /room-types endpoint.
 */
const setFullPropertyDetails = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    await assertVendorOwnsListing(req.params.id, vendorId);

    const hp = await HotelProperty.findOne({ where: { listingId: req.params.id } });
    if (!hp)                              return R.notFound(res, 'Hotel property not found');
    if (hp.listingType !== 'full_property') return R.error(res, 'This endpoint is only for full_property listings. Use /room-types for multi-room hotels.', 400);

    const { bedType, totalBeds = 1, maxGuests, pricePerNight, extraGuestCharge = 0 } = req.body;

    const existing = await RoomType.findOne({ where: { hotelPropertyId: hp.id } });

    if (existing) {
      // Update in place
      await existing.update({
        bedType,
        numBeds:               totalBeds,
        defaultAdultOccupancy: maxGuests,
        maxAdultOccupancy:     maxGuests,
        basePricePerNight:     pricePerNight,
        extraAdultCharge:      extraGuestCharge,
      });
      return R.success(res, { roomType: existing, message: 'Property details updated' });
    }

    // First time — create the single room_type (triggers availability seeding)
    const roomType = await RoomType.create({
      hotelPropertyId:       hp.id,
      name:                  'Entire Property',
      bedType,
      numBeds:               totalBeds,
      totalUnits:            1,
      defaultAdultOccupancy: maxGuests,
      maxAdultOccupancy:     maxGuests,
      basePricePerNight:     pricePerNight,
      extraAdultCharge:      extraGuestCharge,
    });
    R.created(res, { roomType, message: 'Property details saved. Availability seeded for 365 days.' });
  } catch (err) { next(err); }
};

const updateRoomType = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    await assertVendorOwnsListing(req.params.id, vendorId);
    const rt = await RoomType.findByPk(req.params.roomTypeId);
    if (!rt) return R.notFound(res);

    const {
      name, bedType, numBeds, floorAreaSqft, totalUnits,
      defaultAdultOccupancy, maxAdultOccupancy,
      defaultChildOccupancy, maxChildOccupancy,
      defaultInfantOccupancy, maxInfantOccupancy,
      basePricePerNight, extraAdultCharge, extraChildCharge, extraInfantCharge,
      isActive, mealPlans,
    } = req.body;

    await sequelize.transaction(async (t) => {
      await rt.update({
        name:                  name                  ?? rt.name,
        bedType:               bedType               ?? rt.bedType,
        numBeds:               numBeds               ?? rt.numBeds,
        floorAreaSqft:         floorAreaSqft         ?? rt.floorAreaSqft,
        totalUnits:            totalUnits            ?? rt.totalUnits,
        defaultAdultOccupancy: defaultAdultOccupancy ?? rt.defaultAdultOccupancy,
        maxAdultOccupancy:     maxAdultOccupancy     ?? rt.maxAdultOccupancy,
        defaultChildOccupancy: defaultChildOccupancy ?? rt.defaultChildOccupancy,
        maxChildOccupancy:     maxChildOccupancy     ?? rt.maxChildOccupancy,
        defaultInfantOccupancy:defaultInfantOccupancy?? rt.defaultInfantOccupancy,
        maxInfantOccupancy:    maxInfantOccupancy    ?? rt.maxInfantOccupancy,
        basePricePerNight:     basePricePerNight     ?? rt.basePricePerNight,
        extraAdultCharge:      extraAdultCharge      ?? rt.extraAdultCharge,
        extraChildCharge:      extraChildCharge      ?? rt.extraChildCharge,
        extraInfantCharge:     extraInfantCharge     ?? rt.extraInfantCharge,
        isActive:              isActive              ?? rt.isActive,
      }, { transaction: t });

      // If mealPlans provided — upsert each by planCode
      if (mealPlans && mealPlans.length) {
        for (const p of mealPlans) {
          await RoomMealPlan.upsert({
            roomTypeId:        rt.id,
            planCode:          p.planCode,
            label:             p.label || DEFAULT_LABEL[p.planCode] || p.planCode,
            includesBreakfast: p.includesBreakfast ?? false,
            includesLunch:     p.includesLunch     ?? false,
            includesDinner:    p.includesDinner    ?? false,
            includesSnacks:    p.includesSnacks    ?? false,
            breakfastPricePp:  0,
            lunchPricePp:      0,
            dinnerPricePp:     0,
            snacksPricePp:     0,
            isDefault:         p.isDefault         ?? false,
          }, { transaction: t });
        }
      }
    });

    const updated = await RoomType.findByPk(rt.id, {
      include: [{ model: RoomMealPlan, as: 'mealPlans' }],
    });
    R.success(res, { roomType: updated });
  } catch (err) { next(err); }
};


const setAmenities = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    await assertVendorOwnsListing(req.params.id, vendorId);
    const rt = await RoomType.findByPk(req.params.roomTypeId);
    if (!rt) return R.notFound(res);
    await attachAmenities(rt.id, req.body.amenityIds, null, { replace: true });
    R.success(res, { message: 'Amenities updated' });
  } catch (err) { next(err); }
};

const uploadImages = async (req, res, next) => {
  try {
    if (!req.files?.length) return R.error(res, 'No images uploaded');
    const vendorId = await getVendorProfileId(req.user.id);
    await assertVendorOwnsListing(req.params.id, vendorId);
    const images = await Promise.all(req.files.map((f, i) =>
      addImage({ listingId: req.params.id, entityType: 'listing', entityId: req.params.id, url: resolveFileUrl(f), sortOrder: i, isCover: i === 0 })
    ));
    R.created(res, { images });
  } catch (err) { next(err); }
};

const MAX_ROOM_TYPE_IMAGES = 3;

const uploadRoomTypeImages = async (req, res, next) => {
  try {
    if (!req.files?.length) return R.error(res, 'No images uploaded');

    const vendorId = await getVendorProfileId(req.user.id);
    await assertVendorOwnsListing(req.params.id, vendorId);

    const rt = await RoomType.findByPk(req.params.roomTypeId);
    if (!rt) return R.notFound(res, 'Room type not found');

    const existing = await ListingImage.count({ where: { entityType: 'room_type', entityId: rt.id } });
    const slots = MAX_ROOM_TYPE_IMAGES - existing;
    if (slots <= 0) return R.error(res, `Room type already has ${MAX_ROOM_TYPE_IMAGES} images (maximum reached)`, 400);
    if (req.files.length > slots) return R.error(res, `Only ${slots} more image(s) allowed (max ${MAX_ROOM_TYPE_IMAGES} per room type)`, 400);

    const images = await Promise.all(req.files.map((f, i) =>
      addImage({
        listingId:  req.params.id,
        entityType: 'room_type',
        entityId:   rt.id,
        url:        resolveFileUrl(f),
        sortOrder:  existing + i,
        isCover:    existing === 0 && i === 0,
      })
    ));
    R.created(res, { images });
  } catch (err) { next(err); }
};

const submitForApproval = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    const listing  = await assertVendorOwnsListing(req.params.id, vendorId);
    await listing.update({ status: 'pending_approval' });
    R.success(res, { message: 'Submitted for approval' });
  } catch (err) { next(err); }
};

const approve = async (req, res, next) => {
  try {
    await Listing.update({ status: 'active', isPublished: true }, { where: { id: req.params.id } });
    R.success(res, { message: 'Listing approved and published' });
  } catch (err) { next(err); }
};

const suspend = async (req, res, next) => {
  try {
    await Listing.update({ status: 'suspended', isPublished: false }, { where: { id: req.params.id } });
    R.success(res, { message: 'Listing suspended' });
  } catch (err) { next(err); }
};

module.exports = { list, get, getRoomTypes, create, update, setFullPropertyDetails, createRoomType, updateRoomType, setAmenities, uploadImages, uploadRoomTypeImages, submitForApproval, approve, suspend };
