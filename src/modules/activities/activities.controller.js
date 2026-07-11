const { sequelize, Listing, Activity, ActivitySlot, ActivityHighlightMaster, ActivityHighlight, ListingImage } = require('../../db/index');
const { Op } = require('sequelize');
const { parsePagination }  = require('../../shared/utils/pagination');
const { assertVendorOwnsListing, getVendorProfileId, addImage } = require('../listings/listings.queries');
const R = require('../../shared/utils/apiResponse');
const { resolveFileUrl } = require('../../shared/middleware/upload');

const ACTIVITY_TYPES = [
  'trekking', 'water_sports', 'adventure', 'cultural',
  'wildlife', 'cycling', 'camping', 'yoga_wellness', 'culinary', 'sightseeing',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const HIGHLIGHT_INCLUDE = {
  model: ActivityHighlightMaster,
  as:    'highlights',
  through: { attributes: [] },
  attributes: ['id', 'name', 'description', 'icon', 'sortOrder'],
};

/**
 * Validate highlight IDs and attach them to an activity.
 * All IDs must belong to the activity's activityType.
 * replace=true removes all existing selections first.
 */
const attachHighlights = async (activityId, activityType, highlightIds, transaction, { replace = false } = {}) => {
  if (!highlightIds?.length) return;
  const unique = [...new Set(highlightIds)];

  const found = await ActivityHighlightMaster.count({
    where: { id: unique, activityType, isActive: true },
    transaction,
  });
  if (found !== unique.length) {
    const err = new Error(`One or more highlight IDs are invalid or do not belong to activityType "${activityType}"`);
    err.status = 400;
    throw err;
  }

  if (replace) {
    await ActivityHighlight.destroy({ where: { activityId }, transaction });
  }

  await ActivityHighlight.bulkCreate(
    unique.map(highlightMasterId => ({ activityId, highlightMasterId })),
    { transaction, ignoreDuplicates: true }
  );
};

// ── Public ────────────────────────────────────────────────────────────────────

const list = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const where = { category: 'activity', isPublished: true, status: 'active' };
    if (req.query.city) {
      where[Op.and] = [sequelize.where(sequelize.cast(sequelize.col('location_json'), 'text'), { [Op.iLike]: `%${req.query.city}%` })];
    }
    if (req.query.activityType) {
      where['$activity.activity_type$'] = req.query.activityType;
    }

    const { count, rows } = await Listing.findAndCountAll({
      where,
      include: [{ model: Activity, as: 'activity' }],
      order: [['avg_rating', 'DESC NULLS LAST']],
      limit, offset, subQuery: false,
    });
    const data = await Promise.all(rows.map(async (l) => {
      const cover = await ListingImage.findOne({ where: { entityId: l.id, isCover: true } });
      return { ...l.toJSON(), coverImage: cover?.url ?? null };
    }));
    R.paginated(res, { data, total: count, limit, offset });
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    const listing = await Listing.findByPk(req.params.id, {
      include: [
        {
          model: Activity, as: 'activity',
          include: [
            { model: ActivitySlot, as: 'slots', where: { isActive: true }, required: false },
            HIGHLIGHT_INCLUDE,
          ],
        },
        { model: ListingImage, as: 'images', where: { entityType: 'listing' }, required: false },
      ],
    });
    if (!listing) return R.notFound(res);
    R.success(res, { activity: listing });
  } catch (err) { next(err); }
};

// ── Vendor ────────────────────────────────────────────────────────────────────

const create = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    const {
      title, description, locationJson, cancellationPolicyId,
      activityType, basePriceAdult, basePriceInfant = 0, minAge,
      totalSlotsPerDay,
      aboutExperience, inclusions, exclusions, whatsprovided, thingsToCarry, howToReach,
      highlightIds,
    } = req.body;

    const result = await sequelize.transaction(async (t) => {
      const listing = await Listing.create(
        { vendorId, category: 'activity', title, description: description || null, locationJson, cancellationPolicyId: cancellationPolicyId || null },
        { transaction: t }
      );
      const act = await Activity.create({
        listingId:        listing.id,
        activityType:     activityType,
        basePriceAdult,
        basePriceInfant,
        minAge:           minAge           || null,
        totalSlotsPerDay: totalSlotsPerDay || null,
        aboutExperience:  aboutExperience  || null,
        inclusions:       inclusions       || null,
        exclusions:       exclusions       || null,
        whatsprovided:    whatsprovided    || null,
        thingsToCarry:    thingsToCarry    || null,
        howToReach:       howToReach       || null,
      }, { transaction: t });

      if (highlightIds?.length) {
        await attachHighlights(act.id, activityType, highlightIds, t);
      }

      return { listing, activity: act };
    });

    R.created(res, { id: result.listing.id, ...result });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    const listing  = await assertVendorOwnsListing(req.params.id, vendorId);
    const {
      title, description, locationJson, cancellationPolicyId,
      activityType, basePriceAdult, basePriceInfant, minAge, totalSlotsPerDay,
      aboutExperience, inclusions, exclusions, whatsprovided, thingsToCarry, howToReach,
    } = req.body;

    await listing.update({
      title:                title                ?? listing.title,
      description:          description          ?? listing.description,
      locationJson:         locationJson         ?? listing.locationJson,
      cancellationPolicyId: cancellationPolicyId ?? listing.cancellationPolicyId,
    });

    const act = await Activity.findOne({ where: { listingId: listing.id } });
    if (act) {
      await act.update({
        activityType:     activityType     ?? act.activityType,
        basePriceAdult:   basePriceAdult   ?? act.basePriceAdult,
        basePriceInfant:  basePriceInfant  ?? act.basePriceInfant,
        minAge:           minAge           ?? act.minAge,
        totalSlotsPerDay: totalSlotsPerDay ?? act.totalSlotsPerDay,
        aboutExperience:  aboutExperience  ?? act.aboutExperience,
        inclusions:       inclusions       ?? act.inclusions,
        exclusions:       exclusions       ?? act.exclusions,
        whatsprovided:    whatsprovided    ?? act.whatsprovided,
        thingsToCarry:    thingsToCarry    ?? act.thingsToCarry,
        howToReach:       howToReach       ?? act.howToReach,
      });
    }
    R.success(res, { message: 'Updated' });
  } catch (err) { next(err); }
};

const setHighlights = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    await assertVendorOwnsListing(req.params.id, vendorId);

    const act = await Activity.findOne({ where: { listingId: req.params.id } });
    if (!act) return R.notFound(res, 'Activity not found');

    await sequelize.transaction(async (t) => {
      await attachHighlights(act.id, act.activityType, req.body.highlightIds, t, { replace: true });
    });

    const updated = await ActivityHighlightMaster.findAll({
      include: [{ model: Activity, as: 'activities', where: { id: act.id }, through: { attributes: [] } }],
      attributes: ['id', 'name', 'description', 'icon', 'sortOrder'],
    });
    R.success(res, { highlights: updated });
  } catch (err) { next(err); }
};

// ── Slots ─────────────────────────────────────────────────────────────────────

const createSlot = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    await assertVendorOwnsListing(req.params.id, vendorId);
    const act = await Activity.findOne({ where: { listingId: req.params.id } });
    if (!act) return R.notFound(res);
    const { label, durationMinutes, startTime, maxParticipants, priceOverrideAdult, priceOverrideInfant } = req.body;
    const slot = await ActivitySlot.create({
      activityId:          act.id,
      label,
      durationMinutes:     durationMinutes    || null,
      startTime:           startTime          || null,
      maxParticipants:     maxParticipants    || null,
      priceOverrideAdult:  priceOverrideAdult || null,
      priceOverrideInfant: priceOverrideInfant || null,
    });
    R.created(res, { slot });
  } catch (err) { next(err); }
};

const updateSlot = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    await assertVendorOwnsListing(req.params.id, vendorId);
    const slot = await ActivitySlot.findByPk(req.params.slotId);
    if (!slot) return R.notFound(res);
    const { label, maxParticipants, priceOverrideAdult, isActive } = req.body;
    await slot.update({
      label:              label             ?? slot.label,
      maxParticipants:    maxParticipants   ?? slot.maxParticipants,
      priceOverrideAdult: priceOverrideAdult ?? slot.priceOverrideAdult,
      isActive:           isActive          ?? slot.isActive,
    });
    R.success(res, { slot });
  } catch (err) { next(err); }
};

// ── Images ────────────────────────────────────────────────────────────────────

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

// ── Status ────────────────────────────────────────────────────────────────────

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
    R.success(res, { message: 'Listing approved' });
  } catch (err) { next(err); }
};

module.exports = {
  ACTIVITY_TYPES,
  list, get,
  create, update, setHighlights,
  createSlot, updateSlot,
  uploadImages,
  submitForApproval, approve,
};
