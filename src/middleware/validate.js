const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Reads express-validator results and short-circuits with a 422
 * response if any validation errors were found.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return next(new AppError('Validation failed', 422, messages));
  }
  next();
};

module.exports = validate;
