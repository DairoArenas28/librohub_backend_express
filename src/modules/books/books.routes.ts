import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../../shared/auth.middleware';
import { validate } from '../../shared/validation.middleware';
import { bookFiltersSchema, createBookSchema, updateBookSchema, addCommentSchema } from './books.schema';
import {
  getByCategory,
  getAll,
  getById,
  createBook,
  updateBook,
  removeBook,
  addComment,
  toggleFavorite,
  uploadPdf,
  downloadPdf,
  handlePdfUploadError,
  uploadCover,
  downloadCover,
  handleCoverUploadError,
} from './books.controller';
import { pdfUpload } from './pdf.middleware';
import { coverUpload } from './cover.middleware';

const router = Router();

// Ruta pública — la portada se carga directamente en componentes Image sin token
router.get('/:id/cover', downloadCover);

router.use(authMiddleware);

router.get('/by-category', getByCategory);
router.get('/', bookFiltersSchema, validate, getAll);
router.get('/:id', getById);
router.post('/', adminMiddleware, createBookSchema, validate, createBook);
router.put('/:id', adminMiddleware, updateBookSchema, validate, updateBook);
router.delete('/:id', adminMiddleware, removeBook);
router.post('/:bookId/comments', addCommentSchema, validate, addComment);
router.post('/:bookId/favorite', toggleFavorite);
router.post('/:id/pdf', adminMiddleware, pdfUpload.single('pdf'), uploadPdf, handlePdfUploadError);
router.get('/:id/pdf', downloadPdf);
router.post('/:id/cover', adminMiddleware, coverUpload.single('cover'), uploadCover, handleCoverUploadError);

export default router;
