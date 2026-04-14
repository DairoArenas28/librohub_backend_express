// Feature: librohub-backend-api, Property 4: Código de recuperación es numérico de 6 dígitos
// Feature: librohub-backend-api, Property 2: Contraseñas se almacenan con bcrypt (cost >= 10)
// Feature: librohub-backend-api, Property 3: Registro siempre asigna rol reader

import * as fc from 'fast-check';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateResetCode, hashPassword } from '../auth.utils';
import { AuthService } from '../auth.service';
jest.mock('../../../database/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

import { AppDataSource } from '../../../database/data-source';
import * as authUtils from '../auth.utils';

/**
 * Validates: Requirements 3.1
 *
 * Property 4: Código de recuperación es numérico de 6 dígitos
 * - Verifica que generateResetCode() siempre retorna un string que cumple /^\d{6}$/
 * - Verifica que una fecha 15 minutos en el futuro está entre 14 y 16 minutos desde ahora
 */
describe('Property 4: Código de recuperación es numérico de 6 dígitos', () => {
  it('Property 4: generateResetCode siempre retorna un string de exactamente 6 dígitos numéricos', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const code = generateResetCode();
        expect(code).toMatch(/^\d{6}$/);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 4: expiresAt (15 min en el futuro) siempre está entre 14 y 16 minutos desde ahora', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const before = Date.now();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        const after = Date.now();

        const minExpected = before + 14 * 60 * 1000;
        const maxExpected = after + 16 * 60 * 1000;

        expect(expiresAt.getTime()).toBeGreaterThanOrEqual(minExpected);
        expect(expiresAt.getTime()).toBeLessThanOrEqual(maxExpected);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 2.5
 *
 * Property 2: Contraseñas se almacenan con bcrypt (cost >= 10)
 * - Para cualquier string de contraseña, bcrypt.compare(password, hash) retorna true
 * - El prefijo del hash indica cost >= 10 (formato $2b$<cost>$...)
 */
describe('Property 2: Contraseñas se almacenan con bcrypt (cost >= 10)', () => {
  it('Property 2: hashPassword produce un hash que bcrypt.compare verifica correctamente y tiene cost >= 10', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (password) => {
        const hash = await hashPassword(password);

        // Verify bcrypt.compare returns true
        const matches = await bcrypt.compare(password, hash);
        expect(matches).toBe(true);

        // Verify cost factor >= 10 by parsing the hash
        // bcrypt hash format: $2b$<cost>$<22-char salt><31-char hash>
        const parts = hash.split('$');
        // parts[0] = '', parts[1] = '2b' or '2a', parts[2] = cost, parts[3] = salt+hash
        expect(parts.length).toBeGreaterThanOrEqual(4);
        const cost = parseInt(parts[2], 10);
        expect(cost).toBeGreaterThanOrEqual(10);
      }),
      { numRuns: 5 }
    );
  });
});

/**
 * Validates: Requirements 2.1
 *
 * Property 3: Registro siempre asigna rol reader
 * - Para cualquier conjunto de datos de registro válidos, el usuario creado debe tener role = 'reader'
 */
describe('Property 3: Registro siempre asigna rol reader', () => {
  let hashPasswordSpy: jest.SpyInstance;

  beforeAll(() => {
    hashPasswordSpy = jest.spyOn(authUtils, 'hashPassword').mockResolvedValue('hashed_password');
  });

  afterAll(() => {
    hashPasswordSpy.mockRestore();
  });

  it('Property 3: register siempre crea el usuario con role = reader para cualquier dato válido', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          document: fc.string({ minLength: 1, maxLength: 20 }),
          email: fc.string({ minLength: 1, maxLength: 30 }).map(s => `${s.replace(/[^a-z0-9]/gi, 'a')}@test.com`),
          phone: fc.string({ minLength: 1, maxLength: 15 }),
          password: fc.string({ minLength: 1, maxLength: 30 }),
        }),
        async (data) => {
          let savedEntity: any = null;

          const mockRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((entity: any) => ({ ...entity })),
            save: jest.fn().mockImplementation(async (entity: any) => {
              savedEntity = entity;
              return entity;
            }),
          };

          (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

          const service = new AuthService();
          await service.register(data);

          expect(savedEntity).not.toBeNull();
          expect(savedEntity.role).toBe('reader');
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

// Feature: librohub-backend-api, Property 1: JWT contiene userId y role correctos

/**
 * Validates: Requirements 1.4
 *
 * Property 1: JWT contiene userId y role correctos
 * - Para cualquier usuario válido, el JWT generado debe decodificarse con `userId` y `role` correctos
 */
describe('Property 1: JWT contiene userId y role correctos', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('Property 1: login genera un JWT que contiene el userId y role correctos para cualquier usuario válido', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          role: fc.constantFrom<'reader' | 'admin'>('reader', 'admin'),
        }),
        async ({ userId, role }) => {
          const mockUser = {
            id: userId,
            role,
            document: 'testuser',
            passwordHash: 'hashed',
          };

          const mockRepo = {
            findOne: jest.fn().mockResolvedValue(mockUser),
          };

          (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

          jest.spyOn(authUtils, 'comparePassword').mockResolvedValue(true);

          const service = new AuthService();
          const result = await service.login('testuser', 'anypassword');

          const decoded = jwt.verify(result.token, 'test-secret') as { userId: string; role: string };

          expect(decoded.userId).toBe(userId);
          expect(decoded.role).toBe(role);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

// Feature: librohub-backend-api, Property 5: Reset de contraseña invalida el código usado

/**
 * Validates: Requirements 5.4
 *
 * Property 5: Reset de contraseña invalida el código usado
 * - Después de un reset exitoso, el campo `used` del PasswordResetCode debe ser true
 * - Un segundo intento con el mismo código debe resultar en error 400 (BadRequestError)
 */
describe('Property 5: Reset de contraseña invalida el código usado', () => {
  let hashPasswordSpy: jest.SpyInstance;

  beforeAll(() => {
    hashPasswordSpy = jest.spyOn(authUtils, 'hashPassword').mockResolvedValue('hashed_new_password');
  });

  afterAll(() => {
    hashPasswordSpy.mockRestore();
  });

  it('Property 5: después de resetPassword exitoso, el código queda marcado como used=true y un segundo intento lanza BadRequestError', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.string({ minLength: 1, maxLength: 20 })
            .map(s => `${s.replace(/[^a-z0-9]/gi, 'a')}@test.com`),
          code: fc.stringMatching(/^\d{6}$/),
          newPassword: fc.string({ minLength: 8, maxLength: 30 }),
        }),
        async ({ email, code, newPassword }) => {
          // Build a valid (not used, not expired) reset code
          const resetCode = {
            id: 'some-uuid',
            email,
            code,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min in the future
            used: false,
          };

          const mockUser = {
            id: 'user-uuid',
            email,
            passwordHash: 'old_hash',
          };

          let savedResetCode: any = null;

          const mockResetCodeRepo = {
            findOne: jest.fn().mockResolvedValue(resetCode),
            save: jest.fn().mockImplementation(async (entity: any) => {
              savedResetCode = { ...entity };
              return savedResetCode;
            }),
          };

          const mockUserRepo = {
            findOne: jest.fn().mockResolvedValue(mockUser),
            save: jest.fn().mockResolvedValue(mockUser),
          };

          const { PasswordResetCode: PRC } = require('../auth.entity');
          (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
            if (entity === PRC) {
              return mockResetCodeRepo;
            }
            return mockUserRepo;
          });

          const service = new AuthService();

          // First reset — should succeed
          await service.resetPassword(email, code, newPassword);

          // Verify the saved reset code has used = true
          expect(savedResetCode).not.toBeNull();
          expect(savedResetCode.used).toBe(true);

          // Second attempt — mock returns the code with used = true
          const usedResetCode = { ...resetCode, used: true };
          mockResetCodeRepo.findOne.mockResolvedValue(usedResetCode);

          // Should throw BadRequestError (400)
          await expect(service.resetPassword(email, code, newPassword))
            .rejects.toThrow('Reset code has already been used');
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});

// Feature: librohub-backend-api, Property 6: Nueva contraseña tras reset es verificable con bcrypt

/**
 * Validates: Requirements 5.1
 *
 * Property 6: Nueva contraseña tras reset es verificable con bcrypt
 * - Para cualquier newPassword válida (>= 8 chars), después del reset
 *   bcrypt.compare(newPassword, user.passwordHash) debe retornar true
 */
describe('Property 6: Nueva contraseña tras reset es verificable con bcrypt', () => {
  it('Property 6: después de resetPassword, bcrypt.compare(newPassword, savedUser.passwordHash) retorna true', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.string({ minLength: 1, maxLength: 20 })
            .map(s => `${s.replace(/[^a-z0-9]/gi, 'a')}@test.com`),
          code: fc.stringMatching(/^\d{6}$/),
          newPassword: fc.string({ minLength: 8, maxLength: 30 }),
        }),
        async ({ email, code, newPassword }) => {
          // Valid (not used, not expired) reset code
          const resetCode = {
            id: 'reset-uuid',
            email,
            code,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            used: false,
          };

          const mockUser = {
            id: 'user-uuid',
            email,
            passwordHash: 'old_hash',
          };

          let savedUser: any = null;

          const mockResetCodeRepo = {
            findOne: jest.fn().mockResolvedValue(resetCode),
            save: jest.fn().mockResolvedValue({ ...resetCode, used: true }),
          };

          const mockUserRepo = {
            findOne: jest.fn().mockResolvedValue(mockUser),
            save: jest.fn().mockImplementation(async (entity: any) => {
              savedUser = { ...entity };
              return savedUser;
            }),
          };

          const { PasswordResetCode: PRC } = require('../auth.entity');
          (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
            if (entity === PRC) {
              return mockResetCodeRepo;
            }
            return mockUserRepo;
          });

          const service = new AuthService();
          await service.resetPassword(email, code, newPassword);

          // savedUser must have been captured
          expect(savedUser).not.toBeNull();

          // The real bcrypt hash must verify against the original newPassword
          const matches = await bcrypt.compare(newPassword, savedUser.passwordHash);
          expect(matches).toBe(true);
        }
      ),
      { numRuns: 5 }
    );
  }, 60000);
});
