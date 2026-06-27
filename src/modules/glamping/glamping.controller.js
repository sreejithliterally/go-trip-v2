const { sequelize, Listing, GlampingSite, GlampingMealPlan, ListingImage } = require('../../db/index');
const { Op } = require('sequelize');
const { parsePagination }  = require('../../shared/utils/pagination');
const { assertVendorOwnsListing, getVendorProfileId, addImage } = require('../listings/listings.queries');
const R = require('../../shared/utils/apiResponse');
const { resolveFileUrl } = require('../../shared/middleware/upload');

const list = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const where = { category: 'glamping', isPublished: true, status: 'active' };
    if (req.query.city) where[Op.and] = [sequelize.where(sequelize.cast(sequelize.col('location_json'), 'text'), { [Op.iLike]: `%${req.query.city}%` })];

    const { count, rows } = await Listing.findAndCountAll({
      where, include: [{ model: GlampingSite, as: 'glampingSite' }],
      order: [['avg_rating', 'DESC NULLS LAST']], limit, offset, subQuery: false,
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
        { model: GlampingSite, as: 'glampingSite', include: [{ model: GlampingMealPlan, as: 'mealPlans' }] },
        { model: ListingImage, as: 'images', where: { entityType: 'listing' }, required: false },
      ],
    });
    if (!listing) return R.notFound(res);
    R.success(res, { glamping: listing });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    const {
      title, description, locationJson, cancellationPolicyId,
      totalCamps, adultsPerCamp = 2, infantsPerCamp = 1,
      pricePerCampNight, extraAdultCharge = 0, extraInfantCharge = 0,
      aboutExperience, inclusions, exclusions, whatsprovided, thingsToCarry, howToReach,
    } = req.body;

    const result = await sequelize.transaction(async (t) => {
      const listing = await Listing.create(
        { vendorId, category: 'glamping', title, description: description || null, locationJson, cancellationPolicyId: cancellationPolicyId || null },
        { transaction: t }
      );
      const gs = await GlampingSite.create({
        listingId: listing.id, totalCamps, adultsPerCamp, infantsPerCamp,
        pricePerCampNight, extraAdultCharge, extraInfantCharge,
        aboutExperience:  aboutExperience  || null,
        inclusions:       inclusions       || null,
        exclusions:       exclusions       || null,
        whatsprovided:    whatsprovided    || null,
        thingsToCarry:    thingsToCarry    || null,
        howToReach:       howToReach       || null,
      }, { transaction: t });
      return { listing, glampingSite: gs };
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
      totalCamps, adultsPerCamp, infantsPerCamp,
      pricePerCampNight, extraAdultCharge, extraInfantCharge,
      aboutExperience, inclusions, exclusions, whatsprovided, thingsToCarry, howToReach,
    } = req.body;

    await listing.update({
      title:                  title                  ?? listing.title,
      description:            description            ?? listing.description,
      locationJson:           locationJson           ?? listing.locationJson,
      cancellationPolicyId:   cancellationPolicyId   ?? listing.cancellationPolicyId,
    });

    const gs = await GlampingSite.findOne({ where: { listingId: listing.id } });
    if (gs) {
      await gs.update({
        totalCamps:         totalCamps         ?? gs.totalCamps,
        adultsPerCamp:      adultsPerCamp      ?? gs.adultsPerCamp,
        infantsPerCamp:     infantsPerCamp     ?? gs.infantsPerCamp,
        pricePerCampNight:  pricePerCampNight  ?? gs.pricePerCampNight,
        extraAdultCharge:   extraAdultCharge   ?? gs.extraAdultCharge,
        extraInfantCharge:  extraInfantCharge  ?? gs.extraInfantCharge,
        aboutExperience:    aboutExperience    ?? gs.aboutExperience,
        inclusions:         inclusions         ?? gs.inclusions,
        exclusions:         exclusions         ?? gs.exclusions,
        whatsprovided:      whatsprovided      ?? gs.whatsprovided,
        thingsToCarry:      thingsToCarry      ?? gs.thingsToCarry,
        howToReach:         howToReach         ?? gs.howToReach,
      });
    }
    R.success(res, { message: 'Updated' });
  } catch (err) { next(err); }
};

const upsertMealPlan = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    await assertVendorOwnsListing(req.params.id, vendorId);
    const gs = await GlampingSite.findOne({ where: { listingId: req.params.id } });
    if (!gs) return R.notFound(res);
    const { planCode, label, includesBreakfast = false, includesLunch = false, includesDinner = false, breakfastPricePp = 0, lunchPricePp = 0, dinnerPricePp = 0, isDefault = false } = req.body;
    const [mp] = await GlampingMealPlan.upsert({ glampingSiteId: gs.id, planCode, label, includesBreakfast, includesLunch, includesDinner, breakfastPricePp, lunchPricePp, dinnerPricePp, isDefault });
    R.success(res, { mealPlan: mp });
  } catch (err) { next(err); }
};

const uploadImages = async (req, res, next) => {
  try {
    if (!req.files?.length) return R.error(res, 'No images uploaded');
    const vendorId = await getVendorProfileId(req.user.id);
    await assertVendorOwnsListing(req.params.id, vendorId);
    const images = await Promise.all(req.files.map((f, i) => addImage({ listingId: req.params.id, entityType: 'listing', entityId: req.params.id, url: resolveFileUrl(f), sortOrder: i, isCover: i === 0 })));
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
    R.success(res, { message: 'Listing approved' });
  } catch (err) { next(err); }
};

module.exports = { list, get, create, update, upsertMealPlan, uploadImages, submitForApproval, approve };
