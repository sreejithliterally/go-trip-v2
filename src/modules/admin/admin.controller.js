const { sequelize, QueryTypes, Listing, VendorProfile, User, AmenityMaster, CancellationPolicy, AuditLog, ActivityHighlightMaster } = require('../../db/index');
const { parsePagination } = require('../../shared/utils/pagination');
const R = require('../../shared/utils/apiResponse');

const stats = async (req, res, next) => {
  try {
    const [bookingStats, revenueRow, userCount, listingStats, vendorStats] = await Promise.all([
      sequelize.query(`SELECT status, COUNT(*) AS count FROM bookings GROUP BY status`, { type: QueryTypes.SELECT }),
      sequelize.query(`SELECT COALESCE(SUM(bp.total_amount),0) AS total FROM booking_pricing bp JOIN bookings b ON b.id=bp.booking_id WHERE b.status IN ('confirmed','completed')`, { type: QueryTypes.SELECT }),
      User.count({ where: { role: 'user' } }),
      sequelize.query(`SELECT status, COUNT(*) AS count FROM listings GROUP BY status`, { type: QueryTypes.SELECT }),
      sequelize.query(`SELECT kyc_status, COUNT(*) AS count FROM vendor_profiles GROUP BY kyc_status`, { type: QueryTypes.SELECT }),
    ]);
    R.success(res, { stats: { bookingsByStatus: bookingStats, totalRevenue: revenueRow[0].total, totalUsers: userCount, listingsByStatus: listingStats, vendorsByKyc: vendorStats } });
  } catch (err) { next(err); }
};

const pendingListings = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { count, rows } = await Listing.findAndCountAll({
      where: { status: 'pending_approval' },
      include: [{ model: VendorProfile, as: 'vendor', attributes: ['businessName'], include: [{ model: User, as: 'user', attributes: ['email'] }] }],
      order: [['created_at', 'ASC']], limit, offset,
    });
    R.paginated(res, { data: rows, total: count, limit, offset });
  } catch (err) { next(err); }
};

const approveListing = async (req, res, next) => {
  try {
    await Listing.update({ status: 'active', isPublished: true }, { where: { id: req.params.id } });
    R.success(res, { message: 'Listing approved and published' });
  } catch (err) { next(err); }
};

const rejectListing = async (req, res, next) => {
  try {
    await Listing.update({ status: 'draft' }, { where: { id: req.params.id } });
    R.success(res, { message: 'Listing returned to draft' });
  } catch (err) { next(err); }
};

const auditLogs = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const where = {};
    if (req.query.entity_type) where.entityType = req.query.entity_type;
    if (req.query.actor_id)    where.actorId    = req.query.actor_id;
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'actor', attributes: ['email'] }],
      order: [['created_at', 'DESC']], limit, offset,
    });
    R.paginated(res, { data: rows, total: count, limit, offset });
  } catch (err) { next(err); }
};

const listAmenities = async (req, res, next) => {
  try {
    const amenities = await AmenityMaster.findAll({ where: { isActive: true }, order: [['category', 'ASC'], ['name', 'ASC']] });
    R.success(res, { amenities });
  } catch (err) { next(err); }
};

const createAmenity = async (req, res, next) => {
  try {
    const { name, iconSlug, category } = req.body;
    const amenity = await AmenityMaster.create({ name, iconSlug: iconSlug || null, category: category || null });
    R.created(res, { amenity });
  } catch (err) { next(err); }
};

const deleteAmenity = async (req, res, next) => {
  try {
    await AmenityMaster.update({ isActive: false }, { where: { id: req.params.id } });
    R.success(res, { message: 'Amenity deactivated' });
  } catch (err) { next(err); }
};

const listPolicies = async (req, res, next) => {
  try {
    const policies = await CancellationPolicy.findAll({ order: [['created_at', 'ASC']] });
    R.success(res, { policies });
  } catch (err) { next(err); }
};

const createPolicy = async (req, res, next) => {
  try {
    const { name, rulesJson } = req.body;
    const policy = await CancellationPolicy.create({ name, rulesJson });
    R.created(res, { policy });
  } catch (err) { next(err); }
};

const listActivityHighlights = async (req, res, next) => {
  try {
    const where = { isActive: true };
    if (req.query.activityType) where.activityType = req.query.activityType;
    const highlights = await ActivityHighlightMaster.findAll({
      where,
      order: [['activity_type', 'ASC'], ['name', 'ASC']],
    });
    R.success(res, { highlights });
  } catch (err) { next(err); }
};

module.exports = { stats, pendingListings, approveListing, rejectListing, auditLogs, listAmenities, createAmenity, deleteAmenity, listPolicies, createPolicy, listActivityHighlights };
