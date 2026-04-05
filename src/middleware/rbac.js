const AppError = require('../utils/AppError');

/**
 * Role-based access control middleware factory.
 * Usage: allowRoles('admin', 'analyst')
 *
 * Roles hierarchy (highest to lowest):
 *  admin   → full access
 *  analyst → read records and view analytics
 *  viewer  → non-modifying access
 */
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. This action requires one of the following roles: ${roles.join(', ')}. Your current role is: ${req.user.role}.`,
          403
        )
      );
    }

    next();
  };
};

module.exports = { allowRoles };
