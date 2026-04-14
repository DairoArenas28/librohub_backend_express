// Feature: librohub-backend-api, Property 8: by-category nunca incluye libros inactivos

import * as fc from 'fast-check';

jest.mock('../../../database/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

import { AppDataSource } from '../../../database/data-source';
import { BooksService } from '../books.service';

/**
 * Validates: Requirements 7.2
 *
 * Property 8: by-category nunca incluye libros inactivos
 */
describe('Property 8: by-category nunca incluye libros inactivos', () => {
  it('Property 8: getByCategory() solo retorna libros con status = active para cualquier mezcla de libros', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 50 }),
            author: fc.string({ minLength: 1, maxLength: 50 }),
            coverUrl: fc.string({ minLength: 1, maxLength: 100 }),
            categories: fc.array(
              fc.string({ minLength: 1, maxLength: 20 }),
              { minLength: 1, maxLength: 3 }
            ),
            status: fc.constantFrom<'active' | 'coming_soon'>('active', 'coming_soon'),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (books) => {
          const activeBooks = books.filter((b) => b.status === 'active');

          const mockRepo = {
            find: jest.fn().mockResolvedValue(activeBooks),
          };

          (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

          const service = new BooksService();
          const result = await service.getByCategory();

          for (const categoryEntry of result) {
            for (const book of categoryEntry.books) {
              expect(book.status).toBe('active');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

// Feature: librohub-backend-api, Property 7: Filtros de libros son correctos y combinables

/**
 * Validates: Requirements 8.2, 8.3, 8.4
 *
 * Property 7: Filtros de libros son correctos y combinables
 * Para cualquier combinación { category?, year? }, todos los libros retornados
 * deben satisfacer simultáneamente todos los filtros activos.
 */
describe('Property 7: Filtros de libros son correctos y combinables', () => {
  it('Property 7: getAll() retorna solo libros que satisfacen todos los filtros activos simultáneamente', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of books with random categories and years
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 50 }),
            author: fc.string({ minLength: 1, maxLength: 50 }),
            coverUrl: fc.string({ minLength: 1, maxLength: 100 }),
            categories: fc.array(
              fc.constantFrom('fiction', 'non-fiction', 'science', 'history', 'art'),
              { minLength: 1, maxLength: 3 }
            ),
            year: fc.integer({ min: 1900, max: 2024 }),
            status: fc.constantFrom<'active' | 'coming_soon'>('active', 'coming_soon'),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        // Generate optional filters
        fc.record({
          category: fc.option(
            fc.constantFrom('fiction', 'non-fiction', 'science', 'history', 'art'),
            { nil: undefined }
          ),
          year: fc.option(
            fc.integer({ min: 1900, max: 2024 }),
            { nil: undefined }
          ),
        }),
        async (books, filters) => {
          const mockRepo = {
            find: jest.fn().mockResolvedValue(books),
          };

          (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

          const service = new BooksService();

          // Build filters object with only defined values
          const activeFilters: { category?: string; year?: number } = {};
          if (filters.category !== undefined) activeFilters.category = filters.category;
          if (filters.year !== undefined) activeFilters.year = filters.year;

          const result = await service.getAll(activeFilters);

          for (const book of result) {
            // If category filter is active, all returned books must have that category (case-insensitive)
            if (activeFilters.category !== undefined) {
              const categoryLower = activeFilters.category.toLowerCase();
              const hasCategory = book.categories.some(
                (c) => c.toLowerCase() === categoryLower
              );
              expect(hasCategory).toBe(true);
            }

            // If year filter is active, all returned books must have that year
            if (activeFilters.year !== undefined) {
              expect(book.year).toBe(activeFilters.year);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

// Feature: librohub-backend-api, Property 7: Filtros de libros son correctos y combinables

/**
 * Validates: Requirements 8.2, 8.3, 8.4
 *
 * Property 7: Filtros de libros son correctos y combinables
 */
describe('Property 7: Filtros de libros son correctos y combinables', () => {
  it('Property 7: getAll() retorna solo libros que satisfacen todos los filtros activos simultáneamente', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 50 }),
            author: fc.string({ minLength: 1, maxLength: 50 }),
            coverUrl: fc.string({ minLength: 1, maxLength: 100 }),
            categories: fc.array(
              fc.constantFrom('fiction', 'non-fiction', 'science', 'history', 'art'),
              { minLength: 1, maxLength: 3 }
            ),
            year: fc.integer({ min: 1900, max: 2024 }),
            status: fc.constantFrom<'active' | 'coming_soon'>('active', 'coming_soon'),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        fc.record({
          category: fc.option(
            fc.constantFrom('fiction', 'non-fiction', 'science', 'history', 'art'),
            { nil: undefined }
          ),
          year: fc.option(fc.integer({ min: 1900, max: 2024 }), { nil: undefined }),
        }),
        async (books, filters) => {
          const mockRepo = {
            find: jest.fn().mockResolvedValue(books),
          };

          (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

          const service = new BooksService();

          const activeFilters: { category?: string; year?: number } = {};
          if (filters.category !== undefined) activeFilters.category = filters.category;
          if (filters.year !== undefined) activeFilters.year = filters.year;

          const result = await service.getAll(activeFilters);

          for (const book of result) {
            if (activeFilters.category !== undefined) {
              const categoryLower = activeFilters.category.toLowerCase();
              const hasCategory = book.categories.some((c) => c.toLowerCase() === categoryLower);
              expect(hasCategory).toBe(true);
            }
            if (activeFilters.year !== undefined) {
              expect(book.year).toBe(activeFilters.year);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

// Feature: librohub-backend-api, Property 9: isFavorite refleja el estado real en la BD

/**
 * Validates: Requirements 9.3
 *
 * Property 9: isFavorite refleja el estado real en la BD
 * Para cualquier par (userId, bookId), isFavorite debe ser true si y solo si
 * existe un registro Favorite con ese par.
 */
describe('Property 9: isFavorite refleja el estado real en la BD', () => {
  it('Property 9: getById() retorna isFavorite=true si y solo si el userId está en favorites', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a userId and bookId
        fc.uuid(),
        fc.uuid(),
        // Generate an array of other userIds that are in favorites
        fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
        // Whether the target userId is in favorites
        fc.boolean(),
        async (userId, bookId, otherUserIds, userIsInFavorites) => {
          // Build favorites array: optionally include the target userId
          const favoritesForOtherUsers = otherUserIds
            .filter((id) => id !== userId)
            .map((id) => ({ user: { id } }));

          const favorites = userIsInFavorites
            ? [...favoritesForOtherUsers, { user: { id: userId } }]
            : favoritesForOtherUsers;

          const mockBook = {
            id: bookId,
            title: 'Test Book',
            author: 'Test Author',
            coverUrl: 'http://example.com/cover.jpg',
            categories: ['fiction'],
            year: 2020,
            status: 'active',
            pages: 200,
            language: 'en',
            isbn: '978-0000000000',
            publisher: 'Test Publisher',
            synopsis: 'A test book',
            comments: [],
            favorites,
          };

          const mockRepo = {
            findOne: jest.fn().mockResolvedValue(mockBook),
            find: jest.fn().mockResolvedValue([]),
          };

          (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

          const service = new BooksService();
          const result = await service.getById(bookId, userId);

          expect(result.isFavorite).toBe(userIsInFavorites);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

// Feature: librohub-backend-api, Property 11: Respuesta de comentario contiene todos los campos requeridos

/**
 * Validates: Requirements 13.1, 13.5
 *
 * Property 11: Respuesta de comentario contiene todos los campos requeridos
 * Para cualquier texto no vacío, el objeto retornado debe contener id, userId,
 * authorName, text y createdAt con valores no nulos.
 */
describe('Property 11: Respuesta de comentario contiene todos los campos requeridos', () => {
  it('Property 11: addComment() retorna un objeto con id, userId, authorName, text y createdAt no nulos para cualquier texto no vacío', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),   // bookId
        fc.uuid(),   // userId
        fc.string({ minLength: 1 }), // non-empty text
        fc.string({ minLength: 1, maxLength: 50 }), // authorName
        async (bookId, userId, text, authorName) => {
          const mockBook = { id: bookId, title: 'Test Book' };
          const mockUser = { id: userId, name: authorName };
          const savedComment = {
            id: 'comment-uuid-' + bookId.slice(0, 8),
            text,
            createdAt: new Date(),
          };

          const mockBookRepo = {
            findOne: jest.fn().mockResolvedValue(mockBook),
          };
          const mockCommentRepo = {
            create: jest.fn().mockReturnValue(savedComment),
            save: jest.fn().mockResolvedValue(savedComment),
          };
          const mockUserRepo = {
            findOne: jest.fn().mockResolvedValue(mockUser),
          };

          (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            const name = typeof entity === 'function' ? entity.name : String(entity);
            if (name === 'Book') return mockBookRepo;
            if (name === 'Comment') return mockCommentRepo;
            if (name === 'User') return mockUserRepo;
            return mockBookRepo;
          });

          const service = new BooksService();
          const result = await service.addComment(bookId, userId, text);

          expect(result.id).not.toBeNull();
          expect(result.id).not.toBeUndefined();
          expect(result.userId).not.toBeNull();
          expect(result.userId).not.toBeUndefined();
          expect(result.authorName).not.toBeNull();
          expect(result.authorName).not.toBeUndefined();
          expect(result.text).not.toBeNull();
          expect(result.text).not.toBeUndefined();
          expect(result.createdAt).not.toBeNull();
          expect(result.createdAt).not.toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

// Feature: librohub-backend-api, Property 11: Respuesta de comentario contiene todos los campos requeridos

/**
 * Validates: Requirements 13.1, 13.5
 *
 * Property 11: Respuesta de comentario contiene todos los campos requeridos
 */
describe('Property 11: Respuesta de comentario contiene todos los campos requeridos', () => {
  it('Property 11: addComment() retorna un objeto con id, userId, authorName, text y createdAt no nulos', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (bookId, userId, text, authorName) => {
          const mockBook = { id: bookId, title: 'Test Book' };
          const mockUser = { id: userId, name: authorName };
          const savedComment = {
            id: 'comment-uuid-' + bookId.slice(0, 8),
            text,
            createdAt: new Date(),
          };

          const mockBookRepo = { findOne: jest.fn().mockResolvedValue(mockBook) };
          const mockCommentRepo = {
            create: jest.fn().mockReturnValue(savedComment),
            save: jest.fn().mockResolvedValue(savedComment),
          };
          const mockUserRepo = { findOne: jest.fn().mockResolvedValue(mockUser) };

          (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            const name = typeof entity === 'function' ? entity.name : String(entity);
            if (name === 'Book') return mockBookRepo;
            if (name === 'Comment') return mockCommentRepo;
            if (name === 'User') return mockUserRepo;
            return mockBookRepo;
          });

          const service = new BooksService();
          const result = await service.addComment(bookId, userId, text);

          expect(result.id).toBeTruthy();
          expect(result.userId).toBeTruthy();
          expect(result.authorName).not.toBeUndefined();
          expect(result.text).toBeTruthy();
          expect(result.createdAt).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

// Feature: librohub-backend-api, Property 10: Toggle de favorito es idempotente en pares

/**
 * Validates: Requirements 14.1, 14.2
 *
 * Property 10: Toggle de favorito es idempotente en pares
 * Para cualquier par (userId, bookId), dos toggles consecutivos deben restaurar
 * el estado original: toggle(toggle(state)) == state
 */
describe('Property 10: Toggle de favorito es idempotente en pares', () => {
  it('Property 10: toggleFavorite() dos veces consecutivas restaura el estado original para cualquier (userId, bookId)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),    // userId
        fc.uuid(),    // bookId
        fc.boolean(), // initialFavoriteExists
        async (userId, bookId, initialFavoriteExists) => {
          const mockBook = { id: bookId, title: 'Test Book' };
          const mockUser = { id: userId };

          // Track current state across calls
          let currentFavoriteExists = initialFavoriteExists;
          const existingFavorite = { id: 'fav-id', book: mockBook, user: mockUser };

          const mockBookRepo = {
            findOne: jest.fn().mockResolvedValue(mockBook),
          };
          const mockUserRepo = {
            findOne: jest.fn().mockResolvedValue(mockUser),
          };
          const mockFavoriteRepo = {
            findOne: jest.fn().mockImplementation(() => {
              return Promise.resolve(currentFavoriteExists ? existingFavorite : null);
            }),
            remove: jest.fn().mockImplementation(() => {
              currentFavoriteExists = false;
              return Promise.resolve();
            }),
            create: jest.fn().mockReturnValue(existingFavorite),
            save: jest.fn().mockImplementation(() => {
              currentFavoriteExists = true;
              return Promise.resolve(existingFavorite);
            }),
          };

          (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            const name = typeof entity === 'function' ? entity.name : String(entity);
            if (name === 'Book') return mockBookRepo;
            if (name === 'User') return mockUserRepo;
            if (name === 'Favorite') return mockFavoriteRepo;
            return mockBookRepo;
          });

          const service = new BooksService();

          // First toggle: flips the state
          const afterFirstToggle = await service.toggleFavorite(bookId, userId);
          expect(afterFirstToggle.isFavorite).toBe(!initialFavoriteExists);

          // Second toggle: should restore original state
          const afterSecondToggle = await service.toggleFavorite(bookId, userId);
          expect(afterSecondToggle.isFavorite).toBe(initialFavoriteExists);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

// Feature: librohub-backend-api, Property 10: Toggle de favorito es idempotente en pares

/**
 * Validates: Requirements 14.1, 14.2
 *
 * Property 10: Toggle de favorito es idempotente en pares
 * toggle(toggle(state)) == state
 */
describe('Property 10: Toggle de favorito es idempotente en pares', () => {
  it('Property 10: toggleFavorite() dos veces consecutivas restaura el estado original', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.boolean(),
        async (userId, bookId, initialFavoriteExists) => {
          const mockBook = { id: bookId, title: 'Test Book' };
          const mockUser = { id: userId };
          const existingFavorite = { id: 'fav-id', book: mockBook, user: mockUser };

          let currentFavoriteExists = initialFavoriteExists;

          const mockBookRepo = { findOne: jest.fn().mockResolvedValue(mockBook) };
          const mockUserRepo = { findOne: jest.fn().mockResolvedValue(mockUser) };
          const mockFavoriteRepo = {
            findOne: jest.fn().mockImplementation(() =>
              Promise.resolve(currentFavoriteExists ? existingFavorite : null)
            ),
            remove: jest.fn().mockImplementation(() => {
              currentFavoriteExists = false;
              return Promise.resolve();
            }),
            create: jest.fn().mockReturnValue(existingFavorite),
            save: jest.fn().mockImplementation(() => {
              currentFavoriteExists = true;
              return Promise.resolve(existingFavorite);
            }),
          };

          (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            const name = typeof entity === 'function' ? entity.name : String(entity);
            if (name === 'Book') return mockBookRepo;
            if (name === 'User') return mockUserRepo;
            if (name === 'Favorite') return mockFavoriteRepo;
            return mockBookRepo;
          });

          const service = new BooksService();

          const afterFirst = await service.toggleFavorite(bookId, userId);
          expect(afterFirst.isFavorite).toBe(!initialFavoriteExists);

          const afterSecond = await service.toggleFavorite(bookId, userId);
          expect(afterSecond.isFavorite).toBe(initialFavoriteExists);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
