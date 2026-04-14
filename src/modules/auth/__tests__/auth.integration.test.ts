import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { globalErrorHandler } from '../../../shared/error.handler';
import authRouter from '../auth.routes';
import { AuthService } from '../auth.service';

// Mock AuthService to avoid real DB connections
jest.mock('../auth.service');

const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

// Build a test-specific Express app with auth router mounted
function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
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

// Helper: generate a valid JWT for change-password tests
function makeToken(userId = 'test-id', role = 'reader') {
  return jwt.sign({ userId, role }, 'test-secret');
}

// ─── POST /auth/login ────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  it('200 – returns token, role, userId on valid credentials', async () => {
    MockedAuthService.prototype.login.mockResolvedValueOnce({
      token: 'jwt-token',
      role: 'reader',
      userId: 'user-123',
    });

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'doc123', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ token: 'jwt-token', role: 'reader', userId: 'user-123' });
  });

  it('401 – wrong credentials', async () => {
    const { UnauthorizedError } = await import('../../../shared/errors');
    MockedAuthService.prototype.login.mockRejectedValueOnce(
      new UnauthorizedError('Invalid credentials')
    );

    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'doc123', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ message: 'Invalid credentials' });
  });

  it('422 – missing username', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'secret123' });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('422 – missing password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ username: 'doc123' });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });
});

// ─── POST /auth/register ─────────────────────────────────────────────────────

describe('POST /auth/register', () => {
  const validPayload = {
    name: 'John Doe',
    document: '12345678',
    email: 'john@example.com',
    phone: '555-1234',
    password: 'password123',
  };

  it('201 – registers successfully', async () => {
    MockedAuthService.prototype.register.mockResolvedValueOnce(undefined);

    const res = await request(app).post('/auth/register').send(validPayload);

    expect(res.status).toBe(201);
  });

  it('409 – duplicate email', async () => {
    const { ConflictError } = await import('../../../shared/errors');
    MockedAuthService.prototype.register.mockRejectedValueOnce(
      new ConflictError('Email already in use')
    );

    const res = await request(app).post('/auth/register').send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ message: 'Email already in use' });
  });

  it('422 – missing name', async () => {
    const { name: _name, ...payload } = validPayload;
    const res = await request(app).post('/auth/register').send(payload);
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('422 – invalid email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ ...validPayload, email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('422 – password too short', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ ...validPayload, password: 'short' });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });
});

// ─── POST /auth/forgot-password ──────────────────────────────────────────────

describe('POST /auth/forgot-password', () => {
  it('200 – always succeeds (even for non-existent email)', async () => {
    MockedAuthService.prototype.forgotPassword.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'unknown@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('200 – succeeds for existing email', async () => {
    MockedAuthService.prototype.forgotPassword.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'john@example.com' });

    expect(res.status).toBe(200);
  });

  it('422 – invalid email format', async () => {
    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('422 – missing email', async () => {
    const res = await request(app).post('/auth/forgot-password').send({});
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });
});

// ─── POST /auth/validate-code ────────────────────────────────────────────────

describe('POST /auth/validate-code', () => {
  it('200 – valid code', async () => {
    MockedAuthService.prototype.validateCode.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post('/auth/validate-code')
      .send({ email: 'john@example.com', code: 'ABC123' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: 'Code is valid' });
  });

  it('400 – invalid/expired code', async () => {
    const { BadRequestError } = await import('../../../shared/errors');
    MockedAuthService.prototype.validateCode.mockRejectedValueOnce(
      new BadRequestError('Invalid or expired reset code')
    );

    const res = await request(app)
      .post('/auth/validate-code')
      .send({ email: 'john@example.com', code: 'WRONG1' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'Invalid or expired reset code' });
  });

  it('422 – missing email', async () => {
    const res = await request(app)
      .post('/auth/validate-code')
      .send({ code: 'ABC123' });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('422 – missing code', async () => {
    const res = await request(app)
      .post('/auth/validate-code')
      .send({ email: 'john@example.com' });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('422 – code not exactly 6 chars', async () => {
    const res = await request(app)
      .post('/auth/validate-code')
      .send({ email: 'john@example.com', code: 'AB' });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });
});

// ─── POST /auth/reset-password ───────────────────────────────────────────────

describe('POST /auth/reset-password', () => {
  it('200 – resets password successfully', async () => {
    MockedAuthService.prototype.resetPassword.mockResolvedValueOnce(undefined);

    const res = await request(app).post('/auth/reset-password').send({
      email: 'john@example.com',
      code: 'ABC123',
      newPassword: 'newpassword123',
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: 'Password reset successfully' });
  });

  it('400 – invalid/expired code', async () => {
    const { BadRequestError } = await import('../../../shared/errors');
    MockedAuthService.prototype.resetPassword.mockRejectedValueOnce(
      new BadRequestError('Invalid or expired reset code')
    );

    const res = await request(app).post('/auth/reset-password').send({
      email: 'john@example.com',
      code: 'WRONG1',
      newPassword: 'newpassword123',
    });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ message: 'Invalid or expired reset code' });
  });

  it('422 – new password too short', async () => {
    const res = await request(app).post('/auth/reset-password').send({
      email: 'john@example.com',
      code: 'ABC123',
      newPassword: 'short',
    });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('422 – missing email', async () => {
    const res = await request(app).post('/auth/reset-password').send({
      code: 'ABC123',
      newPassword: 'newpassword123',
    });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });
});

// ─── POST /auth/change-password ──────────────────────────────────────────────

describe('POST /auth/change-password', () => {
  it('200 – changes password with valid JWT', async () => {
    MockedAuthService.prototype.changePassword.mockResolvedValueOnce(undefined);

    const token = makeToken();
    const res = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'oldpassword123', newPassword: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: 'Password changed successfully' });
  });

  it('401 – no JWT provided', async () => {
    const res = await request(app)
      .post('/auth/change-password')
      .send({ currentPassword: 'oldpassword123', newPassword: 'newpassword123' });

    expect(res.status).toBe(401);
  });

  it('401 – invalid JWT', async () => {
    const res = await request(app)
      .post('/auth/change-password')
      .set('Authorization', 'Bearer invalid.token.here')
      .send({ currentPassword: 'oldpassword123', newPassword: 'newpassword123' });

    expect(res.status).toBe(401);
  });

  it('422 – new password too short', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'oldpassword123', newPassword: 'short' });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('422 – missing currentPassword', async () => {
    const token = makeToken();
    const res = await request(app)
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ newPassword: 'newpassword123' });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });
});
