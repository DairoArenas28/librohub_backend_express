import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { globalErrorHandler } from '../../../shared/error.handler';
import usersRouter from '../users.routes';
import { UsersService } from '../users.service';
import { NotFoundError, ConflictError } from '../../../shared/errors';

jest.mock('../users.service', () => ({
  UsersService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

const MockedUsersService = UsersService as jest.Mocked<typeof UsersService>;

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/users', usersRouter);
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

const sampleUser = {
  id: 'user-1',
  name: 'John Doe',
  document: '12345678',
  email: 'john@example.com',
  phone: '555-1234',
  role: 'reader' as const,
  isActive: true,
  createdAt: new Date(),
};

const validCreatePayload = {
  name: 'Jane Doe',
  document: '87654321',
  email: 'jane@example.com',
  phone: '555-5678',
  password: 'password123',
  role: 'reader',
};

describe('GET /users', () => {
  it('200 – returns all users with admin JWT', async () => {
    MockedUsersService.getAll.mockResolvedValueOnce([sampleUser]);
    const res = await request(app).get('/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('403 – reader cannot list users', async () => {
    const res = await request(app).get('/users').set('Authorization', `Bearer ${readerToken}`);
    expect(res.status).toBe(403);
  });

  it('401 – no JWT provided', async () => {
    const res = await request(app).get('/users');
    expect(res.status).toBe(401);
  });
});

describe('POST /users', () => {
  it('201 – admin creates a user', async () => {
    MockedUsersService.create.mockResolvedValueOnce(sampleUser);
    const res = await request(app).post('/users').set('Authorization', `Bearer ${adminToken}`).send(validCreatePayload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('403 – reader cannot create a user', async () => {
    const res = await request(app).post('/users').set('Authorization', `Bearer ${readerToken}`).send(validCreatePayload);
    expect(res.status).toBe(403);
  });

  it('401 – no JWT provided', async () => {
    const res = await request(app).post('/users').send(validCreatePayload);
    expect(res.status).toBe(401);
  });

  it('422 – missing required fields', async () => {
    const res = await request(app).post('/users').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Only Name' });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('409 – duplicate email', async () => {
    MockedUsersService.create.mockRejectedValueOnce(new ConflictError('Email already in use'));
    const res = await request(app).post('/users').set('Authorization', `Bearer ${adminToken}`).send(validCreatePayload);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ message: 'Email already in use' });
  });
});

describe('PUT /users/:id', () => {
  const updatePayload = { name: 'Updated Name' };

  it('200 – admin updates a user', async () => {
    MockedUsersService.update.mockResolvedValueOnce({ ...sampleUser, name: 'Updated Name' });
    const res = await request(app).put('/users/user-1').set('Authorization', `Bearer ${adminToken}`).send(updatePayload);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Updated Name');
  });

  it('403 – reader cannot update a user', async () => {
    const res = await request(app).put('/users/user-1').set('Authorization', `Bearer ${readerToken}`).send(updatePayload);
    expect(res.status).toBe(403);
  });

  it('404 – user not found', async () => {
    MockedUsersService.update.mockRejectedValueOnce(new NotFoundError('User'));
    const res = await request(app).put('/users/nonexistent').set('Authorization', `Bearer ${adminToken}`).send(updatePayload);
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: 'User not found' });
  });

  it('401 – no JWT provided', async () => {
    const res = await request(app).put('/users/user-1').send(updatePayload);
    expect(res.status).toBe(401);
  });
});

describe('DELETE /users/:id', () => {
  it('204 – admin deletes a user', async () => {
    MockedUsersService.remove.mockResolvedValueOnce(undefined);
    const res = await request(app).delete('/users/user-1').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it('403 – reader cannot delete a user', async () => {
    const res = await request(app).delete('/users/user-1').set('Authorization', `Bearer ${readerToken}`);
    expect(res.status).toBe(403);
  });

  it('404 – user not found', async () => {
    MockedUsersService.remove.mockRejectedValueOnce(new NotFoundError('User'));
    const res = await request(app).delete('/users/nonexistent').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: 'User not found' });
  });

  it('401 – no JWT provided', async () => {
    const res = await request(app).delete('/users/user-1');
    expect(res.status).toBe(401);
  });
});
