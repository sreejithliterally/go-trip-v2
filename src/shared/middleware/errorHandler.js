const logger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  logger.error(err.message, {
    stack:  err.stack,
    method: req.method,
    url:    req.originalUrl,
    userId: req.user?.id,
  });

  // Sequelize AggregateError (e.g. bulk validation) often has an empty .message
  if (err.name === 'AggregateError' && err.errors?.length) {
    err.message = err.errors.map((e) => e.message).join('; ');
  }
  if (err.status === 400 || err.name === 'ValidationError') {
    return res.status(400).json({ success: false, error: err.message, details: err.details });
  }

  if (err.code === '23505') {
    return res.status(409).json({ success: false, error: 'Duplicate entry', details: err.detail });
  }

  if (err.code === '23503') {
    return res.status(400).json({ success: false, error: 'Referenced resource not found' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};

module.exports = errorHandler;
