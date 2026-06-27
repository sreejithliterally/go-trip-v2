const { validationResult } = require('express-validator');

/**
 * Run after express-validator chains. Returns 422 on failure.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error:   'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

module.exports = validate;
