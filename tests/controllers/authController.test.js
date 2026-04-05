process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '7d';

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
}));

jest.mock('../../src/models/User', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const AppError = require('../../src/utils/AppError');
const { createRes, createNext, runHandler } = require('../helpers/httpMocks');
const { register, login } = require('../../src/controllers/authController');

describe('authController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('register creates a viewer when role is admin in payload', async () => {
    const req = {
      body: {
        name: 'Aadhy',
        email: 'aadhy@example.com',
        password: 'secret123',
        role: 'admin',
      },
    };
    const res = createRes();
    const next = createNext();

    User.create.mockResolvedValue({
      _id: 'user-1',
      name: 'Aadhy',
      email: 'aadhy@example.com',
      role: 'viewer',
    });

    await runHandler(register, req, res, next);

    expect(User.create).toHaveBeenCalledWith({
      name: 'Aadhy',
      email: 'aadhy@example.com',
      password: 'secret123',
      role: 'viewer',
    });
    expect(jwt.sign).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        token: 'mock-token',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('login succeeds for valid credentials', async () => {
    const req = {
      body: {
        email: 'aadhy@example.com',
        password: 'secret123',
      },
    };
    const res = createRes();
    const next = createNext();

    const dbUser = {
      _id: 'user-2',
      email: 'aadhy@example.com',
      status: 'active',
      comparePassword: jest.fn().mockResolvedValue(true),
    };

    const select = jest.fn().mockResolvedValue(dbUser);
    User.findOne.mockReturnValue({ select });

    await runHandler(login, req, res, next);

    expect(User.findOne).toHaveBeenCalledWith({ email: 'aadhy@example.com' });
    expect(select).toHaveBeenCalledWith('+password');
    expect(dbUser.comparePassword).toHaveBeenCalledWith('secret123');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        token: 'mock-token',
      })
    );
  });

  test('login rejects invalid credentials', async () => {
    const req = { body: { email: 'aadhy@example.com', password: 'wrong' } };
    const res = createRes();
    const next = createNext();

    const select = jest.fn().mockResolvedValue(null);
    User.findOne.mockReturnValue({ select });

    await runHandler(login, req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  test('login rejects inactive users', async () => {
    const req = { body: { email: 'aadhy@example.com', password: 'secret123' } };
    const res = createRes();
    const next = createNext();

    const dbUser = {
      _id: 'user-3',
      email: 'aadhy@example.com',
      status: 'inactive',
      comparePassword: jest.fn().mockResolvedValue(true),
    };

    const select = jest.fn().mockResolvedValue(dbUser);
    User.findOne.mockReturnValue({ select });

    await runHandler(login, req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});
