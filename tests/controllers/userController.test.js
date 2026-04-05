jest.mock('../../src/models/User', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
}));

const User = require('../../src/models/User');
const AppError = require('../../src/utils/AppError');
const { createRes, createNext, runHandler } = require('../helpers/httpMocks');
const {
  getMe,
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
} = require('../../src/controllers/userController');

describe('userController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getMe returns current user profile', async () => {
    const req = { user: { _id: 'u1', name: 'User One', role: 'viewer' } };
    const res = createRes();
    const next = createNext();

    await runHandler(getMe, req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { user: req.user },
    });
  });

  test('getAllUsers returns paginated users', async () => {
    const req = { query: { page: '2', limit: '1', role: 'viewer' } };
    const res = createRes();
    const next = createNext();

    const users = [{ _id: 'u2', name: 'User Two', role: 'viewer' }];
    const findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(users),
    };

    User.find.mockReturnValue(findChain);
    User.countDocuments.mockResolvedValue(3);

    await runHandler(getAllUsers, req, res, next);

    expect(User.find).toHaveBeenCalledWith({ role: 'viewer' });
    expect(findChain.sort).toHaveBeenCalledWith('-createdAt');
    expect(findChain.skip).toHaveBeenCalledWith(1);
    expect(findChain.limit).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        results: 1,
      })
    );
  });

  test('getUserById sends 404 when user is missing', async () => {
    const req = { params: { id: '507f191e810c19729de860ea' } };
    const res = createRes();
    const next = createNext();

    User.findById.mockResolvedValue(null);

    await runHandler(getUserById, req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(404);
  });

  test('updateUserRole blocks admin from demoting self', async () => {
    const req = {
      params: { id: 'self-id' },
      user: { _id: 'self-id' },
      body: { role: 'viewer' },
    };
    const res = createRes();
    const next = createNext();

    User.findById.mockResolvedValue({
      _id: { equals: jest.fn((id) => id === 'self-id') },
    });

    await runHandler(updateUserRole, req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(400);
  });

  test('updateUserStatus updates status for another user', async () => {
    const req = {
      params: { id: 'other-id' },
      user: { _id: 'self-id' },
      body: { status: 'inactive' },
    };
    const res = createRes();
    const next = createNext();

    const dbUser = {
      _id: { equals: jest.fn((id) => id === 'other-id') },
      status: 'active',
      save: jest.fn().mockResolvedValue(undefined),
    };

    User.findById.mockResolvedValue(dbUser);

    await runHandler(updateUserStatus, req, res, next);

    expect(dbUser.status).toBe('inactive');
    expect(dbUser.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
      })
    );
  });
});
