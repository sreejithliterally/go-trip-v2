const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { Op }    = require('sequelize');
const { sequelize, User, UserCredential } = require('../../db/index');
const { QueryTypes } = require('sequelize');
const { sendOtpEmail } = require('../../shared/utils/mailer');
const { sendOtpSms }   = require('../../shared/utils/sms');

const SALT_ROUNDS = 12;
const OTP_TTL_MS  = (parseInt(process.env.OTP_EXPIRY_SECONDS) || 300) * 1000;

const hashPassword    = (plain)       => bcrypt.hash(plain, SALT_ROUNDS);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

const signAccessToken  = (payload) => jwt.sign(payload, process.env.JWT_SECRET,        { expiresIn: process.env.JWT_EXPIRES_IN         || '7d'  });
const signRefreshToken = (payload) => jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
const verifyAccessToken  = (token) => jwt.verify(token, process.env.JWT_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET);

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const normalizeContact = (email, phone) => ({
  email: email ? email.toLowerCase().trim() : null,
  phone: phone ? phone.trim() : null,
});

// Shared: send OTP and persist record for a given purpose
const _dispatchOtp = async (email, phone, purpose, payload = {}) => {
  const otp       = generateOtp();
  const otpHash   = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  // Invalidate prior pending OTPs for same contact + purpose
  await sequelize.query(
    `DELETE FROM otp_verifications
      WHERE (email = :email OR phone = :phone)
        AND purpose = :purpose
        AND verified_at IS NULL`,
    { replacements: { email, phone, purpose }, type: QueryTypes.RAW }
  );

  await sequelize.query(
    `INSERT INTO otp_verifications (email, phone, otp_hash, payload, expires_at, purpose)
     VALUES (:email, :phone, :otpHash, :payload, :expiresAt, :purpose)`,
    {
      replacements: { email, phone, otpHash, payload: JSON.stringify(payload), expiresAt, purpose },
      type: QueryTypes.RAW,
    }
  );

  if (email) {
    await sendOtpEmail(email, otp);
    return { message: `OTP sent to ${email}`, channel: 'email' };
  } else {
    await sendOtpSms(phone, otp);
    return { message: `OTP sent to ${phone}`, channel: 'sms' };
  }
};

// Shared: fetch + validate OTP record for a given purpose
const _consumeOtp = async (email, phone, otp, purpose) => {
  const contactClause = email ? 'email = :contact' : 'phone = :contact';
  const [record] = await sequelize.query(
    `SELECT * FROM otp_verifications
      WHERE ${contactClause}
        AND purpose = :purpose
        AND verified_at IS NULL
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1`,
    { replacements: { contact: email || phone, purpose }, type: QueryTypes.SELECT }
  );

  if (!record) throw Object.assign(new Error('OTP expired or not found. Please request a new one.'), { status: 400 });

  const valid = await bcrypt.compare(otp, record.otp_hash);
  if (!valid) throw Object.assign(new Error('Incorrect OTP'), { status: 400 });

  await sequelize.query(
    `UPDATE otp_verifications SET verified_at = NOW() WHERE id = :id`,
    { replacements: { id: record.id }, type: QueryTypes.RAW }
  );

  return record;
};

// ── Registration: step 1 ──────────────────────────────────────────────────────
const initiateRegister = async ({ email, phone, fullName, password, role = 'user' }) => {
  const { email: nEmail, phone: nPhone } = normalizeContact(email, phone);

  if (!nEmail && !nPhone) throw Object.assign(new Error('Email or phone is required'), { status: 400 });

  const whereClause = [];
  if (nEmail) whereClause.push({ email: nEmail });
  if (nPhone) whereClause.push({ phone: nPhone });

  const existing = await User.findOne({ where: { [Op.or]: whereClause } });
  if (existing) throw Object.assign(new Error('An account with this email or phone already exists'), { status: 409 });

  const passwordHash = await hashPassword(password);
  return _dispatchOtp(nEmail, nPhone, 'registration', { fullName, passwordHash, role });
};

// ── Registration: step 2 ──────────────────────────────────────────────────────
const verifyRegistrationOtp = async ({ email, phone, otp }) => {
  const { email: nEmail, phone: nPhone } = normalizeContact(email, phone);
  if (!nEmail && !nPhone) throw Object.assign(new Error('Email or phone is required'), { status: 400 });

  const record = await _consumeOtp(nEmail, nPhone, otp, 'registration');
  const { fullName, passwordHash, role } = record.payload;

  const t = await sequelize.transaction();
  try {
    const user = await User.create(
      { email: nEmail, phone: nPhone, fullName, role, isVerified: true },
      { transaction: t }
    );
    await UserCredential.create({ userId: user.id, passwordHash }, { transaction: t });
    await t.commit();

    const jwtPayload = { id: user.id, email: user.email, role: user.role };
    return {
      user: { id: user.id, email: user.email, phone: user.phone, fullName: user.fullName, role: user.role },
      accessToken:  signAccessToken(jwtPayload),
      refreshToken: signRefreshToken(jwtPayload),
    };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

// ── Login: OTP step 1 ─────────────────────────────────────────────────────────
const sendLoginOtp = async ({ email, phone }) => {
  const { email: nEmail, phone: nPhone } = normalizeContact(email, phone);
  if (!nEmail && !nPhone) throw Object.assign(new Error('Email or phone is required'), { status: 400 });

  const whereClause = [];
  if (nEmail) whereClause.push({ email: nEmail });
  if (nPhone) whereClause.push({ phone: nPhone });

  const user = await User.findOne({ where: { [Op.or]: whereClause, isActive: true } });
  if (!user) throw Object.assign(new Error('No active account found'), { status: 404 });

  return _dispatchOtp(nEmail, nPhone, 'login');
};

// ── Login: OTP step 2 ─────────────────────────────────────────────────────────
const verifyLoginOtp = async ({ email, phone, otp }) => {
  const { email: nEmail, phone: nPhone } = normalizeContact(email, phone);
  if (!nEmail && !nPhone) throw Object.assign(new Error('Email or phone is required'), { status: 400 });

  await _consumeOtp(nEmail, nPhone, otp, 'login');

  const whereClause = [];
  if (nEmail) whereClause.push({ email: nEmail });
  if (nPhone) whereClause.push({ phone: nPhone });

  const user = await User.findOne({ where: { [Op.or]: whereClause, isActive: true } });
  if (!user) throw Object.assign(new Error('Account not found'), { status: 404 });

  await user.update({ lastLoginAt: new Date() });

  const jwtPayload = { id: user.id, email: user.email, role: user.role };
  return {
    user: { id: user.id, email: user.email, phone: user.phone, fullName: user.fullName, role: user.role },
    accessToken:  signAccessToken(jwtPayload),
    refreshToken: signRefreshToken(jwtPayload),
  };
};

// ── Login: password-based (kept for backward compat) ─────────────────────────
const login = async ({ email, password }) => {
  const user = await User.findOne({
    where: { email: email.toLowerCase().trim(), isActive: true },
    include: [{ model: UserCredential, as: 'credential' }],
  });
  if (!user?.credential) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const valid = await comparePassword(password, user.credential.passwordHash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  await user.update({ lastLoginAt: new Date() });

  const jwtPayload = { id: user.id, email: user.email, role: user.role };
  return {
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    accessToken:  signAccessToken(jwtPayload),
    refreshToken: signRefreshToken(jwtPayload),
  };
};

// ── Refresh token ─────────────────────────────────────────────────────────────
const refresh = async (refreshToken) => {
  let payload;
  try { payload = verifyRefreshToken(refreshToken); }
  catch { throw Object.assign(new Error('Invalid refresh token'), { status: 401 }); }

  const user = await User.findOne({ where: { id: payload.id, isActive: true } });
  if (!user) throw Object.assign(new Error('User not found'), { status: 401 });

  const newPayload = { id: user.id, email: user.email, role: user.role };
  return { accessToken: signAccessToken(newPayload), refreshToken: signRefreshToken(newPayload) };
};

module.exports = { initiateRegister, verifyRegistrationOtp, sendLoginOtp, verifyLoginOtp, login, refresh, verifyAccessToken };
