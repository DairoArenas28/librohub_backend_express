// Feature: librohub-backend-api, Property 12: GET /users nunca expone passwordHash

import * as fc from 'fast-check';

jest.mock('../../../database/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

import { AppDataSource } from '../../../database/data-source';
import { UsersService } from '../users.service';

/**
 * Validates: Requirements 15.1
 *
 * Property 12: GET /users nunca expone passwordHash
 */
describe('Property 12: GET /users nunca expone passwordHash', () => {
  it('Property 12: getAll() nunca retorna passwordHash ni password en ningún usuario', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            document: fc.string({ minLength: 1, maxLength: 20 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 1, maxLength: 20 }),
            passwordHash: fc.string({ minLength: 8, maxLength: 60 }),
            role: fc.constantFrom<'reader' | 'admin'>('reader', 'admin'),
            isActive: fc.boolean(),
            createdAt: fc.date(),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (users) => {
          const mockRepo = {
            find: jest.fn().mockResolvedValue(users),
          };

          (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

          const result = await UsersService.getAll();

          for (const user of result) {
            expect(user).not.toHaveProperty('passwordHash');
            expect(user).not.toHaveProperty('password');
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
