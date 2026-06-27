const bcrypt = require('bcryptjs');
const svc = require('./auth.service');
const { User, UserCredential } = require('../../db/index');
const R = require('../../shared/utils/apiResponse');

const register = async (req, res, next) => {
  try {
    const result = await svc.initiateRegister(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const verifyOtp = async (req, res, next) => {
  try {
    const result = await svc.verifyRegistrationOtp(req.body);
    res.status(201).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const sendLoginOtp = async (req, res, next) => {
  try {
    const result = await svc.sendLoginOtp(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const verifyLoginOtp = async (req, res, next) => {
  try {
    const result = await svc.verifyLoginOtp(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const tokens = await svc.refresh(req.body.refreshToken);
    res.json({ success: true, ...tokens });
  } catch (err) { next(err); }
};

const me = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id','email','phone','fullName','role','avatarUrl','isVerified','createdAt'],
    });
    if (!user) return R.notFound(res);
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const cred = await UserCredential.findByPk(req.user.id);
    if (!cred) return R.unauthorized(res);

    const valid = await bcrypt.compare(currentPassword, cred.passwordHash);
    if (!valid) return R.error(res, 'Current password is incorrect', 400);

    await cred.update({ passwordHash: await bcrypt.hash(newPassword, 12) });
    res.json({ success: true, message: 'Password updated' });
  } catch (err) { next(err); }
};

module.exports = { register, verifyOtp, sendLoginOtp, verifyLoginOtp, refresh, me, changePassword };
