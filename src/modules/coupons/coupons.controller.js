const { sequelize, Coupon } = require('../../db/index');
const { Op } = require('sequelize');
const { parsePagination } = require('../../shared/utils/pagination');
const R = require('../../shared/utils/apiResponse');

const validate = async (req, res, next) => {
  try {
    const { code, subtotal, category } = req.body;
    const coupon = await Coupon.findOne({
      where: {
        code, isActive: true,
        validFrom: { [Op.lte]: new Date() },
        validTo:   { [Op.gte]: new Date() },
        [Op.or]: [{ usageLimit: null }, { usedCount: { [Op.lt]: sequelize.col('usage_limit') } }],
        [Op.or]: [{ minBookingAmount: null }, { minBookingAmount: { [Op.lte]: subtotal } }],
      },
    });
    if (!coupon) return R.error(res, 'Invalid or expired coupon', 404);
    if (coupon.applicableCategories?.length && category && !coupon.applicableCategories.includes(category)) {
      return R.error(res, 'Coupon not applicable for this category');
    }

    let discount = coupon.discountType === 'flat'
      ? coupon.discountValue
      : Math.min(subtotal * coupon.discountValue / 100, coupon.maxDiscountCap || Infinity);

    res.json({ success: true, coupon: { id: coupon.id, code: coupon.code, discountType: coupon.discountType }, discountAmount: Math.min(discount, subtotal) });
  } catch (err) { next(err); }
};

const list = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { count, rows } = await Coupon.findAndCountAll({ order: [['created_at', 'DESC']], limit, offset });
    R.paginated(res, { data: rows, total: count, limit, offset });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { code, discountType, discountValue, maxDiscountCap, minBookingAmount, validFrom, validTo, usageLimit, applicableCategories } = req.body;
    const coupon = await Coupon.create({ code: code.toUpperCase(), discountType, discountValue, maxDiscountCap: maxDiscountCap || null, minBookingAmount: minBookingAmount || null, validFrom, validTo, usageLimit: usageLimit || null, applicableCategories: applicableCategories || null, createdBy: req.user.id });
    R.created(res, { coupon });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByPk(req.params.id);
    if (!coupon) return R.notFound(res);
    const { isActive, validTo, usageLimit } = req.body;
    await coupon.update({ isActive: isActive ?? coupon.isActive, validTo: validTo ?? coupon.validTo, usageLimit: usageLimit ?? coupon.usageLimit });
    R.success(res, { coupon });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await Coupon.update({ isActive: false }, { where: { id: req.params.id } });
    R.success(res, { message: 'Coupon deactivated' });
  } catch (err) { next(err); }
};

module.exports = { validate, list, create, update, remove };
