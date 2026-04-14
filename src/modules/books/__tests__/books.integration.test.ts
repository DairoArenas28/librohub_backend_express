import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { globalErrorHandler } from '../../../shared/error.handler';
import booksRouter from '../books.routes';
import { BooksService } from '../books.service';
import { NotFoundError, ConflictError } from '../../../shared/errors';

// Mock BooksService to avoid real DB connections
jest.mock('../books.service');

const MockedBooksService = BooksService as jest.MockedClass<typeof BooksService>;

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/books', booksRouter);
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

// ─── Sample data ─────────────────────────────────────────────────────────────

const sampleBook = {
  id: 'book-1',
  title: 'Clean Code',
  author: 'Robert C. Martin',
  coverUrl: 'https://example.com/cover.jpg',
  isbn: '978-0132350884',
  categories: ['Programming'],
  status: 'active',
  year: 2008,
  pages: 431,
  language: 'English',
  publisher: 'Prentice Hall',
  synopsis: 'A handbook of agile software craftsmanship.',
  rating: 4.5,
  category: 'Programming',
  comments: [],
  isFavorite: false,
};

const sampleCategoryBooks = [
  {
    category: 'Programming',
    books: [
      {
        id: 'book-1',
        title: 'Clean Code',
        author: 'Robert C. Martin',
        coverUrl: 'https://example.com/cover.jpg',
        categories: ['Programming'],
        status: 'active' as const,
      },
    ],
  },
];

const sampleComment = {
  id: 'comment-1',
  userId: 'user-1',
  authorName: 'Test User',
  text: 'Great book!',
  createdAt: new Date().toISOString(),
};

// ─── GET /books/by-category ───────────────────────────────────────────────────

describe('GET /books/by-category', () => {
  it('200 – returns books grouped by category with valid JWT', async () => {
    MockedBooksService.prototype.getByCategory.mockResolvedValueOnce(sampleCategoryBooks);

    const res = await request(app)
      .get('/books/by-category')
      .set('Authorization', `Bearer ${readerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('category');
    expect(res.body[0]).toHaveProperty('books');
  });

  it('401 – no JWT provided', async () => {
    const res = await request(app).get('/books/by-category');
    expect(res.status).toBe(401);
  });
});

// ─── GET /books ───────────────────────────────────────────────────────────────

describe('GET /books', () => {
  it('200 – returns all books with valid JWT', async () => {
    MockedBooksService.prototype.getAll.mockResolvedValueOnce([sampleBook] as any);

    const res = await request(app)
      .get('/books')
      .set('Authorization', `Bearer ${readerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('200 – filters by category', async () => {
    MockedBooksService.prototype.getAll.mockResolvedValueOnce([sampleBook] as any);

    const res = await request(app)
      .get('/books?category=Programming')
      .set('Authorization', `Bearer ${readerToken}`);

    expect(res.status).toBe(200);
    expect(MockedBooksService.prototype.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'Programming' })
    );
  });

  it('200 – filters by year', async () => {
    MockedBooksService.prototype.getAll.mockResolvedValueOnce([sampleBook] as any);

    const res = await request(app)
      .get('/books?year=2008')
      .set('Authorization', `Bearer ${readerToken}`);

    expect(res.status).toBe(200);
    expect(MockedBooksService.prototype.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2008 })
    );
  });

  it('401 – no JWT provided', async () => {
    const res = await request(app).get('/books');
    expect(res.status).toBe(401);
  });

  it('422 – non-numeric year query param', async () => {
    const res = await request(app)
      .get('/books?year=notanumber')
      .set('Authorization', `Bearer ${readerToken}`);

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });
});

// ─── GET /books/:id ───────────────────────────────────────────────────────────

describe('GET /books/:id', () => {
  it('200 – returns book detail with valid JWT', async () => {
    MockedBooksService.prototype.getById.mockResolvedValueOnce(sampleBook as any);

    const res = await request(app)
      .get('/books/book-1')
      .set('Authorization', `Bearer ${readerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'book-1');
  });

  it('404 – book not found', async () => {
    MockedBooksService.prototype.getById.mockRejectedValueOnce(new NotFoundError('Book'));

    const res = await request(app)
      .get('/books/nonexistent')
      .set('Authorization', `Bearer ${readerToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: 'Book not found' });
  });

  it('401 – no JWT provided', async () => {
    const res = await request(app).get('/books/book-1');
    expect(res.status).toBe(401);
  });
});

// ─── POST /books ──────────────────────────────────────────────────────────────

describe('POST /books', () => {
  const validPayload = {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    coverUrl: 'https://example.com/cover.jpg',
    isbn: '978-0132350884',
  };

  it('201 – admin creates a book', async () => {
    MockedBooksService.prototype.create.mockResolvedValueOnce(sampleBook as any);

    const res = await request(app)
      .post('/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('403 – reader cannot create a book', async () => {
    const res = await request(app)
      .post('/books')
      .set('Authorization', `Bearer ${readerToken}`)
      .send(validPayload);

    expect(res.status).toBe(403);
  });

  it('401 – no JWT provided', async () => {
    const res = await request(app).post('/books').send(validPayload);
    expect(res.status).toBe(401);
  });

  it('422 – missing required fields', async () => {
    const res = await request(app)
      .post('/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Only Title' });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('409 – duplicate ISBN', async () => {
    MockedBooksService.prototype.create.mockRejectedValueOnce(
      new ConflictError('ISBN already in use')
    );

    const res = await request(app)
      .post('/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ message: 'ISBN already in use' });
  });
});

// ─── PUT /books/:id ───────────────────────────────────────────────────────────

describe('PUT /books/:id', () => {
  const updatePayload = { title: 'Updated Title' };

  it('200 – admin updates a book', async () => {
    MockedBooksService.prototype.update.mockResolvedValueOnce({
      ...sampleBook,
      title: 'Updated Title',
    } as any);

    const res = await request(app)
      .put('/books/book-1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('title', 'Updated Title');
  });

  it('403 – reader cannot update a book', async () => {
    const res = await request(app)
      .put('/books/book-1')
      .set('Authorization', `Bearer ${readerToken}`)
      .send(updatePayload);

    expect(res.status).toBe(403);
  });

  it('404 – book not found', async () => {
    MockedBooksService.prototype.update.mockRejectedValueOnce(new NotFoundError('Book'));

    const res = await request(app)
      .put('/books/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatePayload);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: 'Book not found' });
  });

  it('401 – no JWT provided', async () => {
    const res = await request(app).put('/books/book-1').send(updatePayload);
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /books/:id ────────────────────────────────────────────────────────

describe('DELETE /books/:id', () => {
  it('204 – admin deletes a book', async () => {
    MockedBooksService.prototype.remove.mockResolvedValueOnce(undefined);

    const res = await request(app)
      .delete('/books/book-1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(204);
  });

  it('403 – reader cannot delete a book', async () => {
    const res = await request(app)
      .delete('/books/book-1')
      .set('Authorization', `Bearer ${readerToken}`);

    expect(res.status).toBe(403);
  });

  it('404 – book not found', async () => {
    MockedBooksService.prototype.remove.mockRejectedValueOnce(new NotFoundError('Book'));

    const res = await request(app)
      .delete('/books/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: 'Book not found' });
  });

  it('401 – no JWT provided', async () => {
    const res = await request(app).delete('/books/book-1');
    expect(res.status).toBe(401);
  });
});

// ─── POST /books/:bookId/comments ─────────────────────────────────────────────

describe('POST /books/:bookId/comments', () => {
  it('201 – adds a comment with valid JWT', async () => {
    MockedBooksService.prototype.addComment.mockResolvedValueOnce(sampleComment);

    const res = await request(app)
      .post('/books/book-1/comments')
      .set('Authorization', `Bearer ${readerToken}`)
      .send({ text: 'Great book!' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('text', 'Great book!');
  });

  it('404 – book not found', async () => {
    MockedBooksService.prototype.addComment.mockRejectedValueOnce(new NotFoundError('Book'));

    const res = await request(app)
      .post('/books/nonexistent/comments')
      .set('Authorization', `Bearer ${readerToken}`)
      .send({ text: 'Great book!' });

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: 'Book not found' });
  });

  it('401 – no JWT provided', async () => {
    const res = await request(app)
      .post('/books/book-1/comments')
      .send({ text: 'Great book!' });

    expect(res.status).toBe(401);
  });

  it('422 – empty comment text', async () => {
    const res = await request(app)
      .post('/books/book-1/comments')
      .set('Authorization', `Bearer ${readerToken}`)
      .send({ text: '' });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });
});

// ─── POST /books/:bookId/favorite ─────────────────────────────────────────────

describe('POST /books/:bookId/favorite', () => {
  it('200 – toggles favorite with valid JWT', async () => {
    MockedBooksService.prototype.toggleFavorite.mockResolvedValueOnce({ isFavorite: true });

    const res = await request(app)
      .post('/books/book-1/favorite')
      .set('Authorization', `Bearer ${readerToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isFavorite', true);
  });

  it('404 – book not found', async () => {
    MockedBooksService.prototype.toggleFavorite.mockRejectedValueOnce(new NotFoundError('Book'));

    const res = await request(app)
      .post('/books/nonexistent/favorite')
      .set('Authorization', `Bearer ${readerToken}`);

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ message: 'Book not found' });
  });

  it('401 – no JWT provided', async () => {
    const res = await request(app).post('/books/book-1/favorite');
    expect(res.status).toBe(401);
  });
});
