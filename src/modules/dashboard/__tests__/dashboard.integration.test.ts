import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { globalErrorHandler } from '../../../shared/error.handler';
import dashboardRouter from '../dashboard.routes';
import { DashboardService } from '../dashboard.service';

jest.mock('../dashboard.service', () => ({
  DashboardService: {
    getStats: jest.fn(),
  },
}));

const mockedGetStats = DashboardService.getStats as jest.MockedFunction<typeof DashboardService.getStats>;

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/dashboard', dashboardRouter);
  app.use(globalErrorHandler);
  return app;
}

const app = buildTestApp();

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
});

afterEach(() => {
  jest.clearAllMocks();
});

function makeToken(userId = 'user-1', role: 'reader' | 'admin' = 'reader') {
  return jwt.sign({ userId, role }, 'test-secret');
}

const readerToken = makeToken('user-1', 'reader');
const adminToken = makeToken('admin-1', 'admin');

const sampleStats = {
  users: { active: 10, inactive: 2 },
  books: { active: 50, inactive: 5 },
};

describe('GET /dashboard/stats', () => {
  it('200 – returns stats with correct shape for admin JWT', async () => {
    mockedGetStats.mockResolvedValueOnce(sampleStats);
    const res = await request(app).get('/dashboard/stats').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('users');
    expect(res.body).toHaveProperty('books');
    expect(res.body.users).toHaveProperty('active', 10);
    expect(res.body.users).toHaveProperty('inactive', 2);
    expect(res.body.books).toHaveProperty('active', 50);
    expect(res.body.books).toHaveProperty('inactive', 5);
  });

  it('403 – reader role is forbidden', async () => {
    const res = await request(app).get('/dashboard/stats').set('Authorization', `Bearer ${readerToken}`);
    expect(res.status).toBe(403);
  });

  it('401 – no JWT provided', async () => {
    const res = await request(app).get('/dashboard/stats');
    expect(res.status).toBe(401);
  });
});
