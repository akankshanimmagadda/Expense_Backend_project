jest.mock('../../src/models/Transaction', () => ({
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

const Transaction = require('../../src/models/Transaction');
const AppError = require('../../src/utils/AppError');
const { createRes, createNext, runHandler } = require('../helpers/httpMocks');
const {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  createValidation,
  updateValidation,
} = require('../../src/controllers/transactionController');

const validate = require('../../src/middleware/validate');

describe('transactionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createValidation rejects negative amount', async () => {
    const req = {
      body: {
        amount: -10,
        type: 'income',
        category: 'salary',
      },
    };
    const res = createRes();
    const next = createNext();

    for (const middleware of createValidation) {
      await Promise.resolve(middleware(req, res, next));
    }
    next.mockClear();
    validate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(422);
    expect(next.mock.calls[0][0].errors).toEqual([
      { field: 'amount', message: 'Amount must be a number greater than 0' },
    ]);
  });

  test('updateValidation rejects negative amount', async () => {
    const req = {
      params: { id: '507f191e810c19729de860ea' },
      body: { amount: -10 },
    };
    const res = createRes();
    const next = createNext();

    for (const middleware of updateValidation) {
      await Promise.resolve(middleware(req, res, next));
    }
    next.mockClear();
    validate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(422);
    expect(next.mock.calls[0][0].errors).toEqual([
      { field: 'amount', message: 'Amount must be greater than 0' },
    ]);
  });

  test('createTransaction creates a transaction for authenticated user', async () => {
    const req = {
      user: { _id: 'u1' },
      body: {
        amount: 100,
        type: 'income',
        category: 'salary',
        notes: 'monthly salary',
      },
    };
    const res = createRes();
    const next = createNext();

    const created = { _id: 't1', ...req.body, user: 'u1' };
    Transaction.create.mockResolvedValue(created);

    await runHandler(createTransaction, req, res, next);

    expect(Transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user: 'u1',
        amount: 100,
        type: 'income',
        category: 'salary',
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { transaction: created },
    });
  });

  test('getTransactions returns paginated list', async () => {
    const req = { query: { page: '1', limit: '2', type: 'expense' } };
    const res = createRes();
    const next = createNext();

    const rows = [{ _id: 't1' }, { _id: 't2' }];
    const findChain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(rows),
    };

    Transaction.find.mockReturnValue(findChain);
    Transaction.countDocuments.mockResolvedValue(5);

    await runHandler(getTransactions, req, res, next);

    expect(Transaction.find).toHaveBeenCalledWith({ type: 'expense' });
    expect(findChain.populate).toHaveBeenCalledWith('user', 'name email role');
    expect(findChain.sort).toHaveBeenCalledWith('-date');
    expect(findChain.skip).toHaveBeenCalledWith(0);
    expect(findChain.limit).toHaveBeenCalledWith(2);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        results: 2,
      })
    );
  });

  test('getTransactions supports amount range, search and sorting options', async () => {
    const req = {
      query: {
        minAmount: '100',
        maxAmount: '1000',
        search: 'salary',
        sortBy: 'amount',
        order: 'asc',
      },
    };
    const res = createRes();
    const next = createNext();

    const rows = [{ _id: 't1' }];
    const findChain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(rows),
    };

    Transaction.find.mockReturnValue(findChain);
    Transaction.countDocuments.mockResolvedValue(1);

    await runHandler(getTransactions, req, res, next);

    expect(Transaction.find).toHaveBeenCalledWith({
      amount: { $gte: 100, $lte: 1000 },
      notes: { $regex: 'salary', $options: 'i' },
    });
    expect(findChain.sort).toHaveBeenCalledWith('amount');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getTransaction returns 404 for missing transaction', async () => {
    const req = { params: { id: '507f191e810c19729de860ea' } };
    const res = createRes();
    const next = createNext();

    const populate = jest.fn().mockResolvedValue(null);
    Transaction.findById.mockReturnValue({ populate });

    await runHandler(getTransaction, req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });

  test('updateTransaction rejects when no allowed fields are provided', async () => {
    const req = { params: { id: 't1' }, body: { badField: 'x' } };
    const res = createRes();
    const next = createNext();

    await runHandler(updateTransaction, req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  test('deleteTransaction soft-deletes and returns success message', async () => {
    const req = { params: { id: 't1' } };
    const res = createRes();
    const next = createNext();

    Transaction.findOneAndUpdate.mockResolvedValue({ _id: 't1', isDeleted: true });

    await runHandler(deleteTransaction, req, res, next);

    expect(Transaction.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 't1', isDeleted: false },
      { isDeleted: true },
      { new: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
      })
    );
  });
});
