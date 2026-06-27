const { sequelize, Listing, Package, PackageItinerary, Enquiry, User, ListingImage } = require('../../db/index');
const { Op } = require('sequelize');
const { parsePagination }  = require('../../shared/utils/pagination');
const { assertVendorOwnsListing, getVendorProfileId, addImage } = require('../listings/listings.queries');
const R = require('../../shared/utils/apiResponse');
const { resolveFileUrl } = require('../../shared/middleware/upload');

const list = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const where = { category: 'package', isPublished: true, status: 'active' };
    if (req.query.city) where[Op.and] = [sequelize.where(sequelize.cast(sequelize.col('location_json'), 'text'), { [Op.iLike]: `%${req.query.city}%` })];

    const { count, rows } = await Listing.findAndCountAll({
      where, include: [{ model: Package, as: 'package' }],
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
        { model: Package, as: 'package', include: [{ model: PackageItinerary, as: 'itineraries', order: [['day_number', 'ASC']] }] },
        { model: ListingImage, as: 'images', where: { entityType: 'listing' }, required: false },
      ],
    });
    if (!listing) return R.notFound(res);
    R.success(res, { package: listing });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    const { title, description, locationJson, totalDays, totalNights, pricePerPerson, minGroupSize = 1, maxGroupSize, inclusions, exclusions, whatsprovided, bookingMode = 'enquiry_only', cancellationPolicyId } = req.body;

    const result = await sequelize.transaction(async (t) => {
      const listing = await Listing.create({ vendorId, category: 'package', title, description: description || null, locationJson, cancellationPolicyId: cancellationPolicyId || null }, { transaction: t });
      const pkg = await Package.create({ listingId: listing.id, totalDays, totalNights, pricePerPerson, minGroupSize, maxGroupSize: maxGroupSize || null, inclusions: inclusions || null, exclusions: exclusions || null, whatsprovided: whatsprovided || null, bookingMode }, { transaction: t });
      return { listing, package: pkg };
    });
    R.created(res, result);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    const listing  = await assertVendorOwnsListing(req.params.id, vendorId);
    const { title, description, pricePerPerson } = req.body;
    await listing.update({ title: title ?? listing.title, description: description ?? listing.description });
    if (pricePerPerson) {
      const pkg = await Package.findOne({ where: { listingId: listing.id } });
      if (pkg) await pkg.update({ pricePerPerson });
    }
    R.success(res, { message: 'Updated' });
  } catch (err) { next(err); }
};

const upsertItinerary = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    await assertVendorOwnsListing(req.params.id, vendorId);
    const pkg = await Package.findOne({ where: { listingId: req.params.id } });
    if (!pkg) return R.notFound(res);
    const { dayNumber, title, description, activitiesJson, mealsCovered } = req.body;
    const [item] = await PackageItinerary.upsert({ packageId: pkg.id, dayNumber, title, description: description || null, activitiesJson: activitiesJson || null, mealsCovered: mealsCovered || null });
    R.success(res, { itinerary: item });
  } catch (err) { next(err); }
};

const createEnquiry = async (req, res, next) => {
  try {
    const { travelDate, adults, infants = 0, message } = req.body;
    const enquiry = await Enquiry.create({ listingId: req.params.id, userId: req.user.id, travelDate: travelDate || null, adults, infants, message: message || null });
    R.created(res, { enquiry });
  } catch (err) { next(err); }
};

const listEnquiries = async (req, res, next) => {
  try {
    const vendorId = await getVendorProfileId(req.user.id);
    await assertVendorOwnsListing(req.params.id, vendorId);
    const { limit, offset } = parsePagination(req.query);
    const { count, rows } = await Enquiry.findAndCountAll({
      where: { listingId: req.params.id },
      include: [{ model: User, as: 'user', attributes: ['fullName', 'email'] }],
      order: [['created_at', 'DESC']], limit, offset,
    });
    R.paginated(res, { data: rows, total: count, limit, offset });
  } catch (err) { next(err); }
};

const replyEnquiry = async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findByPk(req.params.eid);
    if (!enquiry) return R.notFound(res);
    await enquiry.update({ vendorReply: req.body.vendorReply, repliedAt: new Date(), status: 'replied' });
    R.success(res, { enquiry });
  } catch (err) { next(err); }
};

const myEnquiries = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { count, rows } = await Enquiry.findAndCountAll({
      where: { userId: req.user.id },
      include: [{ model: Listing, as: 'listing', attributes: ['title'] }],
      order: [['created_at', 'DESC']], limit, offset,
    });
    R.paginated(res, { data: rows, total: count, limit, offset });
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

module.exports = { list, get, create, update, upsertItinerary, createEnquiry, listEnquiries, replyEnquiry, myEnquiries, uploadImages, submitForApproval, approve };
