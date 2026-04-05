const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ─── Validation Rules ──────────────────────────────────────────────────────

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['viewer', 'analyst', 'admin']).withMessage('Role must be viewer, analyst, or admin'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

// ─── Helper ────────────────────────────────────────────────────────────────

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};

// ─── Controllers ───────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Public — creates a new user account.
 */
const register = catchAsync(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // Prevent non-admins from self-assigning admin role via registration
  const assignedRole = role && role === 'admin' ? 'viewer' : role || 'viewer';

  const user = await User.create({ name, email, password, role: assignedRole });
  sendTokenResponse(user, 201, res);
});

/**
 * POST /api/auth/login
 * Public — authenticates user and returns JWT.
 */
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Fetch user with password (select: false by default)
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Incorrect email or password.', 401));
  }

  if (user.status === 'inactive') {
    return next(new AppError('Your account has been deactivated. Contact an administrator.', 403));
  }

  sendTokenResponse(user, 200, res);
});

module.exports = { register, login, registerValidation, loginValidation };
