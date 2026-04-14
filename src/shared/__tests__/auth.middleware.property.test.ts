// Feature: librohub-backend-api, Property 14: Auth middleware rechaza cualquier token inválido con 401

/**
 * Validates: Requirements 17.4
 *
 * Property 14: Auth middleware rechaza cualquier token inválido con 401
 * - Genera strings arbitrarios como tokens (malformados, expirados, firma incorrecta, ausentes)
 * - Verifica que authMiddleware responde 401 y nunca llama next()
 */

import * as fc from 'fast-check';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../auth.middleware';

describe('Property 14: Auth middleware rechaza cualquier token inválido con 401', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  function makeMocks() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as unknown as NextFunction;
    return { res, next };
  }

  it('Property 14: arbitrary strings as Bearer tokens always return 401 and never call next()', () => {
    fc.assert(
      fc.property(fc.string(), (token) => {
        const { res, next } = makeMocks();
        const req = {
          headers: { authorization: `Bearer ${token}` },
        } as unknown as Request;

        authMiddleware(req, res, next);

        expect((res.status as jest.Mock).mock.calls[0][0]).toBe(401);
        expect(next).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('Property 14: missing Authorization header always returns 401 and never calls next()', () => {
    const { res, next } = makeMocks();
    const req = { headers: {} } as unknown as Request;

    authMiddleware(req, res, next);

    expect((res.status as jest.Mock).mock.calls[0][0]).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('Property 14: "Bearer " prefix with empty token always returns 401 and never calls next()', () => {
    const { res, next } = makeMocks();
    const req = {
      headers: { authorization: 'Bearer ' },
    } as unknown as Request;

    authMiddleware(req, res, next);

    expect((res.status as jest.Mock).mock.calls[0][0]).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('Property 14: non-Bearer authorization headers always return 401 and never call next()', () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        // Ensure it doesn't start with "Bearer " to test non-Bearer headers
        const authValue = value.startsWith('Bearer ') ? `Basic ${value}` : value;
        const { res, next } = makeMocks();
        const req = {
          headers: { authorization: authValue },
        } as unknown as Request;

        authMiddleware(req, res, next);

        expect((res.status as jest.Mock).mock.calls[0][0]).toBe(401);
        expect(next).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});
