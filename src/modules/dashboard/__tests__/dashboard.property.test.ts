// Feature: librohub-backend-api, Property 13: Conteos del dashboard son consistentes con el total

import * as fc from 'fast-check';

jest.mock('../../../database/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

import { AppDataSource } from '../../../database/data-source';
import { DashboardService } from '../dashboard.service';

/**
 * Validates: Requirements 16.1, 16.2, 16.3, 16.4, 16.5
 *
 * Property 13: Conteos del dashboard son consistentes con el total
 */
describe('Property 13: Conteos del dashboard son consistentes con el total', () => {
  it('Property 13: users.active + users.inactive === total users y books.active + books.inactive === total books', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        async (activeUsers, inactiveUsers, activeBooks, inactiveBooks) => {
          const mockUserRepo = {
            countBy: jest.fn().mockImplementation((where: Record<string, unknown>) => {
              if (where.isActive === true) return Promise.resolve(activeUsers);
              if (where.isActive === false) return Promise.resolve(inactiveUsers);
              return Promise.resolve(0);
            }),
          };

          const mockBookRepo = {
            countBy: jest.fn().mockImplementation((where: Record<string, unknown>) => {
              if (where.status === 'active') return Promise.resolve(activeBooks);
              if (where.status === 'coming_soon') return Promise.resolve(inactiveBooks);
              return Promise.resolve(0);
            }),
          };

          (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            const name = typeof entity === 'function' ? entity.name : String(entity);
            if (name === 'User') return mockUserRepo;
            if (name === 'Book') return mockBookRepo;
            return mockUserRepo;
          });

          const result = await DashboardService.getStats();

          expect(result.users.active + result.users.inactive).toBe(activeUsers + inactiveUsers);
          expect(result.books.active + result.books.inactive).toBe(activeBooks + inactiveBooks);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
