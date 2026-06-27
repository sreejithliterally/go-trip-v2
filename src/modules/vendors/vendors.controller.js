const { VendorProfile, User } = require('../../db/index');
const { parsePagination } = require('../../shared/utils/pagination');
const R = require('../../shared/utils/apiResponse');
const { resolveFileUrl } = require('../../shared/middleware/upload');

const INCLUDE_USER = { model: User, as: 'user', attributes: ['email', 'fullName', 'phone'] };

const createProfile = async (req, res, next) => {
  try {
    const existing = await VendorProfile.findOne({ where: { userId: req.user.id } });
    if (existing) return R.error(res, 'Vendor profile already exists', 409);

    await User.update({ role: 'vendor' }, { where: { id: req.user.id } });

    const { businessName, panNumber, gstNumber } = req.body;
    const vendor = await VendorProfile.create({ userId: req.user.id, businessName, panNumber, gstNumber: gstNumber || null });
    R.created(res, { vendor });
  } catch (err) { next(err); }
};

const getMyProfile = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ where: { userId: req.user.id }, include: [INCLUDE_USER] });
    if (!vendor) return R.notFound(res, 'Vendor profile not found');
    // Never expose bankAccountJson to this endpoint (vendor-safe view)
    const data = vendor.toJSON();
    delete data.bankAccountJson;
    R.success(res, { vendor: data });
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ where: { userId: req.user.id } });
    if (!vendor) return R.notFound(res);
    const { businessName, gstNumber } = req.body;
    await vendor.update({ businessName: businessName ?? vendor.businessName, gstNumber: gstNumber ?? vendor.gstNumber });
    R.success(res, { vendor: { id: vendor.id, businessName: vendor.businessName, gstNumber: vendor.gstNumber, kycStatus: vendor.kycStatus } });
  } catch (err) { next(err); }
};

const uploadKyc = async (req, res, next) => {
  try {
    if (!req.files?.length) return R.error(res, 'No files uploaded');
    const vendor = await VendorProfile.findOne({ where: { userId: req.user.id } });
    if (!vendor) return R.notFound(res);

    const newDocs = req.files.map(f => ({ type: f.fieldname, url: resolveFileUrl(f), uploaded_at: new Date().toISOString() }));
    const existing = Array.isArray(vendor.kycDocsJson) ? vendor.kycDocsJson : [];
    await vendor.update({ kycDocsJson: [...existing, ...newDocs], kycStatus: 'under_review' });
    R.success(res, { kyc: { kycDocsJson: vendor.kycDocsJson, kycStatus: vendor.kycStatus } });
  } catch (err) { next(err); }
};

const updateBankAccount = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findOne({ where: { userId: req.user.id } });
    if (!vendor) return R.notFound(res);
    const { accountNo, ifsc, bankName, holderName } = req.body;
    await vendor.update({ bankAccountJson: { account_no: accountNo, ifsc, bank_name: bankName, holder_name: holderName } });
    R.success(res, { message: 'Bank account updated' });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const where = req.query.status ? { kycStatus: req.query.status } : {};
    const { count, rows } = await VendorProfile.findAndCountAll({
      where,
      include: [INCLUDE_USER],
      order: [['created_at', 'DESC']],
      limit, offset,
    });
    R.paginated(res, { data: rows.map(r => { const d = r.toJSON(); delete d.bankAccountJson; return d; }), total: count, limit, offset });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findByPk(req.params.id, { include: [INCLUDE_USER] });
    if (!vendor) return R.notFound(res);
    const data = vendor.toJSON(); delete data.bankAccountJson;
    R.success(res, { vendor: data });
  } catch (err) { next(err); }
};

const updateKycStatus = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findByPk(req.params.id);
    if (!vendor) return R.notFound(res);
    const { status } = req.body;
    await vendor.update({ kycStatus: status, approvedAt: status === 'approved' ? new Date() : null, approvedBy: req.user.id });
    R.success(res, { vendor: { id: vendor.id, kycStatus: vendor.kycStatus, approvedAt: vendor.approvedAt } });
  } catch (err) { next(err); }
};

const updateCommission = async (req, res, next) => {
  try {
    const vendor = await VendorProfile.findByPk(req.params.id);
    if (!vendor) return R.notFound(res);
    await vendor.update({ commissionPct: req.body.commissionPct });
    R.success(res, { vendor: { id: vendor.id, commissionPct: vendor.commissionPct } });
  } catch (err) { next(err); }
};

module.exports = { createProfile, getMyProfile, updateProfile, uploadKyc, updateBankAccount, list, getById, updateKycStatus, updateCommission };
