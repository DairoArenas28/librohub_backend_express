import { AppDataSource } from '../../database/data-source';
import { Book } from './book.entity';
import { Comment } from './comment.entity';
import { Favorite } from './favorite.entity';
import { BookFilters, BookSummary, CategoryBooks, BookFormData, CommentResponse, BookDetailResponse } from './books.types';
import { NotFoundError, ConflictError, AppError } from '../../shared/errors';
import { User } from '../users/user.entity';

export class BooksService {
  private get bookRepo() {
    return AppDataSource.getRepository(Book);
  }

  private get commentRepo() {
    return AppDataSource.getRepository(Comment);
  }

  private get favoriteRepo() {
    return AppDataSource.getRepository(Favorite);
  }

  async getByCategory(): Promise<CategoryBooks[]> {
    const books = await this.bookRepo.find({ where: { status: 'active' } });

    const map = new Map<string, BookSummary[]>();

    for (const book of books) {
      // simple-array con valor vacío produce [''] — lo filtramos
      const validCategories = book.categories.filter((c) => c && c.trim().length > 0);

      if (validCategories.length === 0) {
        // Libro sin categoría válida — lo ponemos en "Sin categoría"
        validCategories.push('Sin categoría');
      }

      for (const category of validCategories) {
        const summary: BookSummary = {
          id: book.id,
          title: book.title,
          author: book.author,
          coverUrl: book.coverUrl,
          categories: validCategories,
          category: category.trim(),
          year: book.year,
          status: book.status,
        };

        const key = category.trim();
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key)!.push(summary);
      }
    }

    return Array.from(map.entries()).map(([category, bookList]) => ({
      category,
      books: bookList,
    }));
  }

  async getAll(filters: BookFilters = {}): Promise<Book[]> {
    let books = await this.bookRepo.find();

    if (filters.category) {
      const categoryLower = filters.category.toLowerCase().trim();
      books = books.filter((book) =>
        book.categories.some((c) => c.toLowerCase().trim() === categoryLower)
      );
    }

    if (filters.year !== undefined) {
      books = books.filter((book) => book.year === filters.year);
    }

    return books;
  }

  async getById(id: string, userId: string): Promise<BookDetailResponse> {
    const book = await this.bookRepo.findOne({
      where: { id },
      relations: ['comments', 'comments.user', 'favorites', 'favorites.user'],
    });

    if (!book) {
      throw new NotFoundError('Book');
    }

    // Use a separate lightweight query to check PDF existence without loading the binary
    const pdfCheck = await this.bookRepo
      .createQueryBuilder('book')
      .select('(book.pdf_data IS NOT NULL)', 'hasPdf')
      .where('book.id = :id', { id })
      .getRawOne<{ hasPdf: boolean }>();

    const rawHasPdf = (pdfCheck as any)?.hasPdf;
    const hasPdf = rawHasPdf === true || rawHasPdf === 't';

    const isFavorite = book.favorites.some((f) => f.user?.id === userId);

    const ratings = book.comments
      .map((c: any) => c.rating)
      .filter((r: any) => typeof r === 'number');
    const rating =
      ratings.length > 0
        ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10
        : 0;

    const comments: CommentResponse[] = book.comments.map((c) => ({
      id: c.id,
      userId: c.user?.id ?? '',
      authorName: c.user?.name ?? '',
      avatarUrl: undefined,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
    }));

    return {
      id: book.id,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      category: book.categories[0] ?? '',
      year: book.year,
      status: book.status,
      pages: book.pages,
      language: book.language,
      isbn: book.isbn,
      publisher: book.publisher,
      synopsis: book.synopsis,
      rating,
      categories: book.categories,
      comments,
      isFavorite,
      hasPdf,
    };
  }

  async create(data: BookFormData): Promise<Book> {
    const existing = await this.bookRepo.findOne({ where: { isbn: data.isbn } });
    if (existing) {
      throw new ConflictError('ISBN already in use', 'BOOK_DUPLICATE_ISBN');
    }

    const book = this.bookRepo.create({
      ...data,
      coverUrl: data.coverUrl ?? '',
    });
    return this.bookRepo.save(book);
  }

  async update(id: string, data: Partial<BookFormData>): Promise<Book> {
    const book = await this.bookRepo.findOne({ where: { id } });
    if (!book) {
      throw new NotFoundError('Book');
    }

    Object.assign(book, data);
    return this.bookRepo.save(book);
  }

  async remove(id: string): Promise<void> {
    const book = await this.bookRepo.findOne({ where: { id } });
    if (!book) {
      throw new NotFoundError('Book');
    }

    await this.bookRepo.remove(book);
  }

  async addComment(bookId: string, userId: string, text: string): Promise<CommentResponse> {
    const book = await this.bookRepo.findOne({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundError('Book');
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });

    const comment = this.commentRepo.create({
      text,
      book,
      user: user ?? ({ id: userId } as User),
    });

    const saved = await this.commentRepo.save(comment);

    return {
      id: saved.id,
      userId,
      authorName: user?.name ?? '',
      avatarUrl: undefined,
      text: saved.text,
      createdAt: saved.createdAt.toISOString(),
    };
  }

  async uploadCover(id: string, buffer: Buffer, mimeType: string): Promise<{ coverUrl: string }> {
    const book = await this.bookRepo.findOne({ where: { id } });
    if (!book) {
      throw new NotFoundError('Book');
    }
    book.coverData = buffer;
    book.coverMimeType = mimeType;
    // Set coverUrl to the API endpoint so existing consumers still work
    book.coverUrl = `/api/v1/books/${id}/cover`;
    await this.bookRepo.save(book);
    return { coverUrl: book.coverUrl };
  }

  async downloadCover(id: string): Promise<{ data: Buffer; mimeType: string }> {
    const book = await this.bookRepo
      .createQueryBuilder('book')
      .addSelect('book.coverData')
      .where('book.id = :id', { id })
      .getOne();

    if (!book) {
      throw new NotFoundError('Book');
    }

    if (!book.coverData) {
      throw new AppError(404, 'Este libro no tiene imagen de portada');
    }

    return { data: book.coverData, mimeType: book.coverMimeType ?? 'image/jpeg' };
  }

  async uploadPdf(id: string, buffer: Buffer, mimeType: string): Promise<{ hasPdf: boolean }> {
    const book = await this.bookRepo.findOne({ where: { id } });
    if (!book) {
      throw new NotFoundError('Book');
    }
    book.pdfData = buffer;
    book.pdfMimeType = mimeType;
    await this.bookRepo.save(book);
    return { hasPdf: true };
  }

  async downloadPdf(id: string): Promise<{ data: Buffer; mimeType: string }> {
    const book = await this.bookRepo
      .createQueryBuilder('book')
      .addSelect('book.pdfData')
      .where('book.id = :id', { id })
      .getOne();

    if (!book) {
      throw new NotFoundError('Book');
    }

    if (book.pdfData === null) {
      throw new AppError(404, 'Este libro no tiene PDF disponible');
    }

    return { data: book.pdfData, mimeType: book.pdfMimeType ?? 'application/pdf' };
  }

  async toggleFavorite(bookId: string, userId: string): Promise<{ isFavorite: boolean }> {
    const book = await this.bookRepo.findOne({ where: { id: bookId } });
    if (!book) {
      throw new NotFoundError('Book');
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });

    const existing = await this.favoriteRepo.findOne({
      where: {
        book: { id: bookId },
        user: { id: userId },
      },
    });

    if (existing) {
      await this.favoriteRepo.remove(existing);
      return { isFavorite: false };
    }

    const favorite = this.favoriteRepo.create({
      book,
      user: user ?? ({ id: userId } as User),
    });
    await this.favoriteRepo.save(favorite);
    return { isFavorite: true };
  }
}
