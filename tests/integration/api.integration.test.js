process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../../src/app');
const User = require('../../src/models/User');
const Transaction = require('../../src/models/Transaction');

jest.setTimeout(60000);
const testDbUri = process.env.MONGODB_URI_TEST;

const createAuthUser = async ({ role = 'viewer', name = 'Test User' } = {}) => {
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const email = `${role}-${stamp}@example.com`;
  const password = 'secret123';

  if (role === 'admin') {
    await User.create({ name, email, password, role: 'admin' });
    const loginRes = await request(app).post('/api/auth/login').send({ email, password });
    return { token: loginRes.body.token, email, password, id: loginRes.body.data.user._id };
  }

  const registerRes = await request(app).post('/api/auth/register').send({ name, email, password, role });
  return { token: registerRes.body.token, email, password, id: registerRes.body.data.user._id };
};

const integrationDescribe = testDbUri ? describe : describe.skip;

integrationDescribe('API integration', () => {
  beforeAll(async () => {
    await mongoose.connect(testDbUri);
  });

  afterEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  test('GET / returns health response', async () => {
    const res = await request(app).get('/');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toMatch(/running/i);
  });

  test('register and login return JWT', async () => {
    const email = `user-${Date.now()}@example.com`;
    const password = 'secret123';

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Integration User', email, password, role: 'viewer' });

    expect(registerRes.statusCode).toBe(201);
    expect(registerRes.body.status).toBe('success');
    expect(registerRes.body.token).toBeTruthy();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.status).toBe('success');
    expect(loginRes.body.token).toBeTruthy();
  });

  test('GET /api/users/me requires authentication', async () => {
    const res = await request(app).get('/api/users/me');

    expect(res.statusCode).toBe(401);
    expect(res.body.status).toBe('fail');
  });

  test('viewer cannot create transactions', async () => {
    const viewer = await createAuthUser({ role: 'viewer' });

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${viewer.token}`)
      .send({ amount: 1500, type: 'income', category: 'salary', notes: 'viewer attempt' });

    expect(res.statusCode).toBe(403);
    expect(res.body.status).toBe('fail');
  });

  test('analyst cannot create transactions', async () => {
    const analyst = await createAuthUser({ role: 'analyst' });

    const res = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${analyst.token}`)
      .send({ amount: 1500, type: 'income', category: 'salary', notes: 'analyst attempt' });

    expect(res.statusCode).toBe(403);
    expect(res.body.status).toBe('fail');
  });

  test('viewer cannot list transactions', async () => {
    const viewer = await createAuthUser({ role: 'viewer' });

    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.status).toBe('fail');
  });

  test('analyst can list transactions created by admin', async () => {
    const analyst = await createAuthUser({ role: 'analyst' });
    const admin = await createAuthUser({ role: 'admin' });

    const createRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ amount: 900, type: 'income', category: 'salary', notes: 'analyst income' });

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body.status).toBe('success');
    expect(createRes.body.data.transaction._id).toBeTruthy();

    const listRes = await request(app)
      .get('/api/transactions?type=income&page=1&limit=10')
      .set('Authorization', `Bearer ${analyst.token}`);

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.status).toBe('success');
    expect(Array.isArray(listRes.body.data.transactions)).toBe(true);
    expect(listRes.body.data.transactions.length).toBe(1);
  });

  test('admin can soft-delete transaction', async () => {
    const admin = await createAuthUser({ role: 'admin' });

    const createRes = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ amount: 220, type: 'expense', category: 'food', notes: 'to be deleted' });

    const txId = createRes.body.data.transaction._id;

    const deleteRes = await request(app)
      .delete(`/api/transactions/${txId}`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.status).toBe('success');

    const visible = await Transaction.findById(txId);
    expect(visible).toBeNull();
  });

  test('dashboard summary works for analyst and viewer', async () => {
    const analyst = await createAuthUser({ role: 'analyst' });
    const viewer = await createAuthUser({ role: 'viewer' });

    await Transaction.create([
      { user: analyst.id, amount: 1000, type: 'income', category: 'salary' },
      { user: analyst.id, amount: 300, type: 'expense', category: 'food' },
    ]);

    const analystRes = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${analyst.token}`);

    expect(analystRes.statusCode).toBe(200);
    expect(analystRes.body.status).toBe('success');
    expect(analystRes.body.data.summary.netBalance).toBe(700);

    const viewerRes = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(viewerRes.statusCode).toBe(200);
    expect(viewerRes.body.status).toBe('success');
  });

  test('admin can list users and update user role', async () => {
    const admin = await createAuthUser({ role: 'admin' });
    const viewer = await createAuthUser({ role: 'viewer', name: 'Viewer User' });

    const listRes = await request(app)
      .get('/api/users?page=1&limit=20')
      .set('Authorization', `Bearer ${admin.token}`);

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.status).toBe('success');
    expect(listRes.body.data.users.length).toBeGreaterThanOrEqual(2);

    const updateRoleRes = await request(app)
      .patch(`/api/users/${viewer.id}/role`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'analyst' });

    expect(updateRoleRes.statusCode).toBe(200);
    expect(updateRoleRes.body.data.user.role).toBe('analyst');
  });
});
