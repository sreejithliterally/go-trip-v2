/**
 * Standard API response helpers.
 */

const success = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, ...data });

const created = (res, data) => success(res, data, 201);

const paginated = (res, { data, total, limit, offset }) =>
  res.json({ success: true, data, total, limit, offset });

const error = (res, message, statusCode = 400, details = null) =>
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(details && { details }),
  });

const notFound = (res, message = 'Resource not found') =>
  error(res, message, 404);

const forbidden = (res, message = 'Forbidden') =>
  error(res, message, 403);

const unauthorized = (res, message = 'Unauthorized') =>
  error(res, message, 401);

const serverError = (res, message = 'Internal server error') =>
  error(res, message, 500);

module.exports = { success, created, paginated, error, notFound, forbidden, unauthorized, serverError };
