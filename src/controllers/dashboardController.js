const Transaction = require('../models/Transaction');
const catchAsync = require('../utils/catchAsync');

const percentageChange = (current, previous) => {
  if (previous === 0) return current === 0 ? 0 : null;
  return parseFloat((((current - previous) / previous) * 100).toFixed(2));
};

// ─── Controllers ───────────────────────────────────────────────────────────

/**
 * GET /api/dashboard/summary
 * Analyst & Admin — total income, total expense, net balance.
 */
const getSummary = catchAsync(async (req, res) => {
  const result = await Transaction.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const summary = { totalIncome: 0, totalExpense: 0, incomeCount: 0, expenseCount: 0 };
  result.forEach((item) => {
    if (item._id === 'income') {
      summary.totalIncome = parseFloat(item.total.toFixed(2));
      summary.incomeCount = item.count;
    } else if (item._id === 'expense') {
      summary.totalExpense = parseFloat(item.total.toFixed(2));
      summary.expenseCount = item.count;
    }
  });
  summary.netBalance = parseFloat((summary.totalIncome - summary.totalExpense).toFixed(2));

  const now = new Date();
  const startCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const monthComparison = await Transaction.aggregate([
    {
      $match: {
        isDeleted: false,
        date: { $gte: startPreviousMonth, $lt: startNextMonth },
      },
    },
    {
      $project: {
        type: 1,
        amount: 1,
        period: {
          $cond: [
            { $gte: ['$date', startCurrentMonth] },
            'current',
            'previous',
          ],
        },
      },
    },
    {
      $group: {
        _id: { period: '$period', type: '$type' },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const comparison = {
    currentMonth: { income: 0, expense: 0, netBalance: 0 },
    previousMonth: { income: 0, expense: 0, netBalance: 0 },
    percentageChange: { income: 0, expense: 0, netBalance: 0 },
  };

  monthComparison.forEach((item) => {
    const periodKey = item._id.period === 'current' ? 'currentMonth' : 'previousMonth';
    const typeKey = item._id.type === 'income' ? 'income' : 'expense';
    comparison[periodKey][typeKey] = parseFloat(item.total.toFixed(2));
  });

  comparison.currentMonth.netBalance = parseFloat(
    (comparison.currentMonth.income - comparison.currentMonth.expense).toFixed(2)
  );
  comparison.previousMonth.netBalance = parseFloat(
    (comparison.previousMonth.income - comparison.previousMonth.expense).toFixed(2)
  );

  comparison.percentageChange.income = percentageChange(
    comparison.currentMonth.income,
    comparison.previousMonth.income
  );
  comparison.percentageChange.expense = percentageChange(
    comparison.currentMonth.expense,
    comparison.previousMonth.expense
  );
  comparison.percentageChange.netBalance = percentageChange(
    comparison.currentMonth.netBalance,
    comparison.previousMonth.netBalance
  );

  res.status(200).json({ status: 'success', data: { summary, comparison } });
});

/**
 * GET /api/dashboard/categories
 * Analyst & Admin — breakdown of totals and counts by category and type.
 */
const getCategoryBreakdown = catchAsync(async (req, res) => {
  const result = await Transaction.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: { category: '$category', type: '$type' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.category',
        breakdown: {
          $push: {
            type: '$_id.type',
            total: { $round: ['$total', 2] },
            count: '$count',
          },
        },
        categoryTotal: { $sum: '$total' },
      },
    },
    { $sort: { categoryTotal: -1 } },
    {
      $project: {
        _id: 0,
        category: '$_id',
        breakdown: 1,
        categoryTotal: { $round: ['$categoryTotal', 2] },
      },
    },
  ]);

  res.status(200).json({ status: 'success', data: { categories: result } });
});

/**
 * GET /api/dashboard/trends
 * Analyst & Admin — monthly income vs expense for the past 12 months.
 * Optional query: ?months=N (1–24, default 12)
 */
const getMonthlyTrends = catchAsync(async (req, res) => {
  const months = Math.min(Math.max(parseInt(req.query.months) || 12, 1), 24);
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months + 1);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const result = await Transaction.aggregate([
    {
      $match: {
        isDeleted: false,
        date: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          type: '$type',
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: { year: '$_id.year', month: '$_id.month' },
        entries: {
          $push: {
            type: '$_id.type',
            total: { $round: ['$total', 2] },
            count: '$count',
          },
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        // Build a label like "2025-03"
        label: {
          $concat: [
            { $toString: '$_id.year' },
            '-',
            {
              $cond: [
                { $lt: ['$_id.month', 10] },
                { $concat: ['0', { $toString: '$_id.month' }] },
                { $toString: '$_id.month' },
              ],
            },
          ],
        },
        entries: 1,
      },
    },
  ]);

  res.status(200).json({ status: 'success', data: { trends: result } });
});

/**
 * GET /api/dashboard/trends/weekly
 * All roles — weekly income vs expense for recent weeks.
 * Optional query: ?weeks=N (1-52, default 12)
 */
const getWeeklyTrends = catchAsync(async (req, res) => {
  const weeks = Math.min(Math.max(parseInt(req.query.weeks) || 12, 1), 52);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - ((weeks - 1) * 7));
  startDate.setHours(0, 0, 0, 0);

  const result = await Transaction.aggregate([
    {
      $match: {
        isDeleted: false,
        date: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $isoWeekYear: '$date' },
          week: { $isoWeek: '$date' },
          type: '$type',
        },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: { year: '$_id.year', week: '$_id.week' },
        entries: {
          $push: {
            type: '$_id.type',
            total: { $round: ['$total', 2] },
            count: '$count',
          },
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.week': 1 } },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        week: '$_id.week',
        label: {
          $concat: [
            { $toString: '$_id.year' },
            '-W',
            {
              $cond: [
                { $lt: ['$_id.week', 10] },
                { $concat: ['0', { $toString: '$_id.week' }] },
                { $toString: '$_id.week' },
              ],
            },
          ],
        },
        entries: 1,
      },
    },
  ]);

  res.status(200).json({ status: 'success', data: { trends: result } });
});

/**
 * GET /api/dashboard/recent
 * All authenticated — most recent 10 transactions.
 * Optional query: ?limit=N (max 50)
 */
const getRecentActivity = catchAsync(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const transactions = await Transaction.find()
    .sort('-date')
    .limit(limit)
    .populate('user', 'name email');

  res.status(200).json({
    status: 'success',
    results: transactions.length,
    data: { transactions },
  });
});

module.exports = { getSummary, getCategoryBreakdown, getMonthlyTrends, getWeeklyTrends, getRecentActivity };
