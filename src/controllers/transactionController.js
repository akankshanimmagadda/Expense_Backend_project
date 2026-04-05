const { body, param } = require('express-validator');
const Transaction = require('../models/Transaction');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ─── Validation Rules ──────────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'salary', 'freelance', 'investment', 'business',
  'food', 'utilities', 'rent', 'transport', 'healthcare',
  'education', 'entertainment', 'shopping', 'travel',
  'insurance', 'savings', 'other',
];

const createValidation = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a number greater than 0'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').isIn(VALID_CATEGORIES).withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
];

const updateValidation = [
  param('id').isMongoId().withMessage('Invalid transaction ID'),
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').optional().isIn(VALID_CATEGORIES).withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),
  body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
];

// ─── Query Builder Helper ──────────────────────────────────────────────────

const buildFilter = (query) => {
  const filter = {};

  if (query.type) filter.type = query.type;
  if (query.category) filter.category = query.category;

  if (query.startDate || query.endDate) {
    filter.date = {};
    if (query.startDate) filter.date.$gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  if (query.minAmount || query.maxAmount) {
    filter.amount = {};
    if (query.minAmount) filter.amount.$gte = parseFloat(query.minAmount);
    if (query.maxAmount) filter.amount.$lte = parseFloat(query.maxAmount);
  }

  if (query.search) {
    filter.notes = { $regex: query.search, $options: 'i' };
  }

  return filter;
};

const buildSort = (query) => {
  const allowedFields = ['date', 'amount', 'createdAt'];
  const sortBy = allowedFields.includes(query.sortBy) ? query.sortBy : 'date';
  const sortOrder = query.order === 'asc' ? '' : '-';
  return `${sortOrder}${sortBy}`;
};

// ─── Controllers ───────────────────────────────────────────────────────────

/**
 * POST /api/transactions
 * Admin only — create a new financial record.
 */
const createTransaction = catchAsync(async (req, res) => {
  const { amount, type, category, date, notes } = req.body;

  const transaction = await Transaction.create({
    user: req.user._id,
    amount,
    type,
    category,
    date: date || Date.now(),
    notes,
  });

  res.status(201).json({
    status: 'success',
    data: { transaction },
  });
});

/**
 * GET /api/transactions
 * Analyst & Admin — list transactions with optional filters and pagination.
 * Query params: type, category, startDate, endDate, minAmount, maxAmount,
 * search, sortBy (date|amount|createdAt), order (asc|desc), page, limit
 */
const getTransactions = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = buildFilter(req.query);
  const sort = buildSort(req.query);

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate('user', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  res.status(200).json({
    status: 'success',
    results: transactions.length,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    data: { transactions },
  });
});

/**
 * GET /api/transactions/:id
 * Analyst & Admin — get a single transaction by ID.
 */
const getTransaction = catchAsync(async (req, res, next) => {
  const transaction = await Transaction.findById(req.params.id).populate('user', 'name email');
  if (!transaction) return next(new AppError('No transaction found with that ID.', 404));

  res.status(200).json({
    status: 'success',
    data: { transaction },
  });
});

/**
 * PATCH /api/transactions/:id
 * Admin only — update fields of an existing transaction.
 */
const updateTransaction = catchAsync(async (req, res, next) => {
  const allowedFields = ['amount', 'type', 'category', 'date', 'notes'];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  if (Object.keys(updates).length === 0) {
    return next(new AppError('No valid fields provided for update.', 400));
  }

  const transaction = await Transaction.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).populate('user', 'name email');

  if (!transaction) return next(new AppError('No transaction found with that ID.', 404));

  res.status(200).json({
    status: 'success',
    data: { transaction },
  });
});

/**
 * DELETE /api/transactions/:id
 * Admin only — soft delete (marks isDeleted: true).
 */
const deleteTransaction = catchAsync(async (req, res, next) => {
  // Bypass pre-find middleware to find even "deleted" records
  const transaction = await Transaction.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );

  if (!transaction) {
    return next(new AppError('No transaction found with that ID, or it has already been deleted.', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Transaction has been soft-deleted successfully.',
  });
});

module.exports = {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  createValidation,
  updateValidation,
};
