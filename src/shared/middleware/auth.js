const { verifyAccessToken } = require('../../modules/auth/auth.service');
const R = require('../utils/apiResponse');

/**
 * Attach req.user from JWT. Rejects if token is missing or invalid.
 */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return R.unauthorized(res, 'No token provided');

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    R.unauthorized(res, 'Invalid or expired token');
  }
};

/**
 * Require specific roles. Always apply AFTER authenticate.
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return R.unauthorized(res);
  if (!roles.includes(req.user.role)) return R.forbidden(res, `Required role: ${roles.join(' or ')}`);
  next();
};

const requireAdmin  = requireRole('admin');
const requireVendor = requireRole('vendor', 'admin');
const requireUser   = requireRole('user', 'vendor', 'admin');

module.exports = { authenticate, requireRole, requireAdmin, requireVendor, requireUser };
