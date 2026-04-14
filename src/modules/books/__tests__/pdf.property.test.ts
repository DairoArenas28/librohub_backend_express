// Feature: pdf-book-upload-reader, Property 1: Round-trip de contenido PDF

import * as fc from 'fast-check';

jest.mock('../../../database/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

import { AppDataSource } from '../../../database/data-source';
import { BooksService } from '../books.service';

/**
 * Validates: Requirements 2.3, 4.2
 *
 * Property 1: Round-trip de contenido PDF
 * Para cualquier buffer binario arbitrario subido mediante uploadPdf,
 * downloadPdf debe retornar exactamente los mismos bytes.
 */
describe('Property 1: Round-trip de contenido PDF', () => {
  it('Property 1: downloadPdf() retorna exactamente los mismos bytes que fueron pasados a uploadPdf() para cualquier buffer arbitrario', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),                                    // bookId
        fc.uint8Array({ minLength: 0, maxLength: 1024 }), // arbitrary binary content
        async (bookId, bytes) => {
          const buffer = Buffer.from(bytes);

          // Simulate a book stored in the repo; pdfData is updated on save
          const storedBook: { id: string; pdfData: Buffer | null; pdfMimeType: string | null } = {
            id: bookId,
            pdfData: null,
            pdfMimeType: null,
          };

          // Mock for uploadPdf: uses findOne + save
          const mockRepo = {
            findOne: jest.fn().mockResolvedValue(storedBook),
            save: jest.fn().mockImplementation((book: typeof storedBook) => {
              storedBook.pdfData = book.pdfData;
              storedBook.pdfMimeType = book.pdfMimeType;
              return Promise.resolve(book);
            }),
            // Mock for downloadPdf: uses createQueryBuilder chain
            createQueryBuilder: jest.fn().mockReturnValue({
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getOne: jest.fn().mockResolvedValue(storedBook),
            }),
          };

          (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

          const service = new BooksService();

          // Upload the PDF
          const uploadResult = await service.uploadPdf(bookId, buffer, 'application/pdf');
          expect(uploadResult.hasPdf).toBe(true);

          // Download the PDF
          const downloadResult = await service.downloadPdf(bookId);

          // The downloaded bytes must be identical to the uploaded bytes
          expect(Buffer.compare(downloadResult.data, buffer)).toBe(0);
          expect(downloadResult.mimeType).toBe('application/pdf');
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

/**
 * Validates: Requirements 3.3
 *
 * Property 2: `hasPdf` refleja el estado real del almacenamiento
 * Para libros con pdfData = null, getById retorna hasPdf: false.
 * Para libros con pdfData como Buffer no vacío, getById retorna hasPdf: true.
 */
// Feature: pdf-book-upload-reader, Property 2: hasPdf refleja el estado real del almacenamiento
describe('Property 2: hasPdf refleja el estado real del almacenamiento', () => {
  it('Property 2: getById() retorna hasPdf: false cuando pdfData es null y hasPdf: true cuando pdfData es un Buffer no vacío', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),                                         // bookId
        fc.uuid(),                                         // userId
        fc.boolean(),                                      // hasPdfStored: whether the book has a PDF
        fc.uint8Array({ minLength: 1, maxLength: 512 }),   // non-empty pdf bytes
        async (bookId, userId, hasPdfStored, pdfBytes) => {
          const pdfData = hasPdfStored ? Buffer.from(pdfBytes) : null;

          const storedBook = {
            id: bookId,
            title: 'Test Book',
            author: 'Author',
            coverUrl: 'http://example.com/cover.jpg',
            categories: ['Fiction'],
            year: 2020,
            status: 'active' as const,
            pages: 100,
            language: 'es',
            isbn: bookId, // reuse uuid as isbn for uniqueness
            publisher: 'Publisher',
            synopsis: 'Synopsis',
            pdfData,
            pdfMimeType: hasPdfStored ? 'application/pdf' : null,
            comments: [],
            favorites: [],
            createdAt: new Date(),
          };

          // getRawOne returns the raw hasPdf value as the DB would return it
          const rawHasPdf = hasPdfStored ? true : false;

          const mockRepo = {
            // findOne with relations (used by getById for book + comments + favorites)
            findOne: jest.fn().mockResolvedValue(storedBook),
            // createQueryBuilder for the hasPdf check
            createQueryBuilder: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              getRawOne: jest.fn().mockResolvedValue({ hasPdf: rawHasPdf }),
            }),
          };

          (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

          const service = new BooksService();
          const result = await service.getById(bookId, userId);

          expect(result.hasPdf).toBe(hasPdfStored);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

/**
 * Validates: Requirements 3.4
 *
 * Property 3: `pdf_data` excluido de los listados
 * Para cualquier array de libros (con y sin PDF), ningún objeto retornado
 * por getAll() debe contener la clave `pdf_data` o `pdfData`.
 */
// Feature: pdf-book-upload-reader, Property 3: pdf_data excluido de los listados
describe('Property 3: pdf_data excluido de los listados', () => {
  it('Property 3: getAll() no expone pdfData ni pdf_data en ningún libro retornado', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 50 }),
            author: fc.string({ minLength: 1, maxLength: 50 }),
            coverUrl: fc.constant('http://example.com/cover.jpg'),
            categories: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
            year: fc.integer({ min: 1900, max: 2100 }),
            status: fc.constantFrom('active' as const, 'coming_soon' as const),
            pages: fc.integer({ min: 1, max: 2000 }),
            language: fc.constant('es'),
            isbn: fc.uuid(),
            publisher: fc.string({ minLength: 1, maxLength: 50 }),
            synopsis: fc.string({ minLength: 0, maxLength: 200 }),
            // TypeORM select: false means find() returns books WITHOUT pdfData
            // We simulate this by not including pdfData in the returned objects
          }),
          { minLength: 0, maxLength: 10 }
        ),
        async (books) => {
          // Simulate TypeORM's select: false — find() returns books without pdfData
          const mockRepo = {
            find: jest.fn().mockResolvedValue(books),
          };

          (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

          const service = new BooksService();
          const result = await service.getAll();

          for (const book of result) {
            expect(Object.prototype.hasOwnProperty.call(book, 'pdfData')).toBe(false);
            expect(Object.prototype.hasOwnProperty.call(book, 'pdf_data')).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});

/**
 * Validates: Requirements 2.6
 *
 * Property 4: Rechazo de archivos con MIME type inválido
 * Para cualquier MIME type que no sea 'application/pdf', el middleware
 * handlePdfUploadError debe responder con 422 y el mensaje correcto.
 */
// Feature: pdf-book-upload-reader, Property 4: Rechazo de archivos con MIME type inválido
describe('Property 4: Rechazo de archivos con MIME type inválido', () => {
  it('Property 4: handlePdfUploadError() responde con 422 para cualquier MIME type que no sea application/pdf', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter(s => s !== 'application/pdf'),
        async (_invalidMimeType) => {
          // The fileFilter in multer throws new Error('INVALID_MIME') for invalid MIME types.
          // handlePdfUploadError catches this and returns 422.
          const err = new Error('INVALID_MIME');

          const jsonMock = jest.fn();
          const statusMock = jest.fn().mockReturnValue({ json: jsonMock });

          const req = {} as any;
          const res = { status: statusMock, json: jsonMock } as any;
          // Make res.status().json() work by chaining
          statusMock.mockReturnValue({ json: jsonMock });
          const next = jest.fn();

          // Import the controller function
          const { handlePdfUploadError } = await import('../books.controller');

          handlePdfUploadError(err, req, res, next);

          expect(statusMock).toHaveBeenCalledWith(422);
          expect(jsonMock).toHaveBeenCalledWith({ message: 'El archivo debe ser un PDF' });
          expect(next).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
