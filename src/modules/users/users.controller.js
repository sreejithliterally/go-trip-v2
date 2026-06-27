const { User } = require('../../db/index');
const { parsePagination } = require('../../shared/utils/pagination');
const R = require('../../shared/utils/apiResponse');

const SAFE_ATTRS = ['id','email','phone','fullName','role','avatarUrl','isVerified','isActive','lastLoginAt','createdAt'];

const list = async (req, res, next) => {
  try {
    const { limit, offset } = parsePagination(req.query);
    const { count, rows }   = await User.findAndCountAll({
      attributes: SAFE_ATTRS,
      order: [['created_at', 'DESC']],
      limit, offset,
    });
    R.paginated(res, { data: rows, total: count, limit, offset });
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, { attributes: SAFE_ATTRS });
    if (!user) return R.notFound(res);
    R.success(res, { user });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return R.notFound(res);
    const { fullName, phone, role, isActive } = req.body;
    await user.update({ fullName: fullName ?? user.fullName, phone: phone ?? user.phone, role: role ?? user.role, isActive: isActive ?? user.isActive });
    R.success(res, { user: await user.reload({ attributes: SAFE_ATTRS }) });
  } catch (err) { next(err); }
};

const deactivate = async (req, res, next) => {
  try {
    await User.update({ isActive: false }, { where: { id: req.params.id } });
    R.success(res, { message: 'User deactivated' });
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return R.notFound(res);
    const { fullName, phone, avatarUrl } = req.body;
    await user.update({ fullName: fullName ?? user.fullName, phone: phone ?? user.phone, avatarUrl: avatarUrl ?? user.avatarUrl });
    R.success(res, { user: await user.reload({ attributes: SAFE_ATTRS }) });
  } catch (err) { next(err); }
};

module.exports = { list, get, update, deactivate, updateProfile };
