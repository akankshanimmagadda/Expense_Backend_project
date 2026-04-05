const { body, param } = require('express-validator');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ─── Validation Rules ──────────────────────────────────────────────────────

const updateRoleValidation = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('role').isIn(['viewer', 'analyst', 'admin']).withMessage('Role must be viewer, analyst, or admin'),
];

const updateStatusValidation = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('status').isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
];

// ─── Controllers ───────────────────────────────────────────────────────────

/**
 * GET /api/users/me
 * Authenticated — returns the logged-in user's profile.
 */
const getMe = catchAsync(async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { user: req.user },
  });
});

/**
 * GET /api/users
 * Admin only — paginated list of all users.
 */
const getAllUsers = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;

  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: users.length,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    data: { users },
  });
});

/**
 * GET /api/users/:id
 * Admin only — get a single user by ID.
 */
const getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('No user found with that ID.', 404));

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

/**
 * PATCH /api/users/:id/role
 * Admin only — change a user's role.
 */
const updateUserRole = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('No user found with that ID.', 404));

  // Prevent admin from accidentally revoking their own admin role
  if (user._id.equals(req.user._id) && req.body.role !== 'admin') {
    return next(new AppError('Admins cannot remove their own admin role.', 400));
  }

  user.role = req.body.role;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: `User role updated to "${user.role}".`,
    data: { user },
  });
});

/**
 * PATCH /api/users/:id/status
 * Admin only — activate or deactivate a user.
 */
const updateUserStatus = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('No user found with that ID.', 404));

  if (user._id.equals(req.user._id)) {
    return next(new AppError('Admins cannot deactivate their own account.', 400));
  }

  user.status = req.body.status;
  await user.save();

  res.status(200).json({
    status: 'success',
    message: `User account has been ${user.status === 'active' ? 'activated' : 'deactivated'}.`,
    data: { user },
  });
});

module.exports = {
  getMe,
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  updateRoleValidation,
  updateStatusValidation,
};
