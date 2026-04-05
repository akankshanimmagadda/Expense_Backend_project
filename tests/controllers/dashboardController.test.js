jest.mock('../../src/models/Transaction', () => ({
  aggregate: jest.fn(),
  find: jest.fn(),
}));

const Transaction = require('../../src/models/Transaction');
const { createRes, createNext, runHandler } = require('../helpers/httpMocks');
const {
  getSummary,
  getCategoryBreakdown,
  getMonthlyTrends,
  getWeeklyTrends,
  getRecentActivity,
} = require('../../src/controllers/dashboardController');

describe('dashboardController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getSummary computes income, expense and net balance', async () => {
    const req = { query: {} };
    const res = createRes();
    const next = createNext();

    Transaction.aggregate
      .mockResolvedValueOnce([
      { _id: 'income', total: 1000.25, count: 2 },
      { _id: 'expense', total: 300.1, count: 3 },
      ])
      .mockResolvedValueOnce([
        { _id: { period: 'current', type: 'income' }, total: 600 },
        { _id: { period: 'current', type: 'expense' }, total: 200 },
        { _id: { period: 'previous', type: 'income' }, total: 500 },
        { _id: { period: 'previous', type: 'expense' }, total: 250 },
      ]);

    await runHandler(getSummary, req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: {
        summary: {
          totalIncome: 1000.25,
          totalExpense: 300.1,
          incomeCount: 2,
          expenseCount: 3,
          netBalance: 700.15,
        },
        comparison: {
          currentMonth: {
            income: 600,
            expense: 200,
            netBalance: 400,
          },
          previousMonth: {
            income: 500,
            expense: 250,
            netBalance: 250,
          },
          percentageChange: {
            income: 20,
            expense: -20,
            netBalance: 60,
          },
        },
      },
    });
  });

  test('getCategoryBreakdown returns aggregate categories payload', async () => {
    const req = { query: {} };
    const res = createRes();
    const next = createNext();

    const categories = [{ category: 'food', categoryTotal: 250, breakdown: [] }];
    Transaction.aggregate.mockResolvedValue(categories);

    await runHandler(getCategoryBreakdown, req, res, next);

    expect(Transaction.aggregate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { categories },
    });
  });

  test('getMonthlyTrends clamps months and returns trends', async () => {
    const req = { query: { months: '99' } };
    const res = createRes();
    const next = createNext();

    const trends = [{ year: 2026, month: 4, label: '2026-04', entries: [] }];
    Transaction.aggregate.mockResolvedValue(trends);

    await runHandler(getMonthlyTrends, req, res, next);

    expect(Transaction.aggregate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { trends },
    });
  });

  test('getWeeklyTrends clamps weeks and returns trends', async () => {
    const req = { query: { weeks: '99' } };
    const res = createRes();
    const next = createNext();

    const trends = [{ year: 2026, week: 14, label: '2026-W14', entries: [] }];
    Transaction.aggregate.mockResolvedValue(trends);

    await runHandler(getWeeklyTrends, req, res, next);

    expect(Transaction.aggregate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { trends },
    });
  });

  test('getRecentActivity returns recent transaction list', async () => {
    const req = { query: { limit: '2' } };
    const res = createRes();
    const next = createNext();

    const rows = [{ _id: 't1' }, { _id: 't2' }];
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue(rows),
    };

    Transaction.find.mockReturnValue(findChain);

    await runHandler(getRecentActivity, req, res, next);

    expect(findChain.sort).toHaveBeenCalledWith('-date');
    expect(findChain.limit).toHaveBeenCalledWith(2);
    expect(findChain.populate).toHaveBeenCalledWith('user', 'name email');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      results: 2,
      data: { transactions: rows },
    });
  });
});
