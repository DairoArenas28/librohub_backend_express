import { Request, Response, NextFunction } from 'express';
import { BooksService } from './books.service';

const booksService = new BooksService();

export async function getByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await booksService.getByCategory();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters: { category?: string; year?: number } = {};
    if (req.query.category) filters.category = req.query.category as string;
    if (req.query.year) filters.year = parseInt(req.query.year as string);
    const result = await booksService.getAll(filters);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await booksService.getById(req.params.id, userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function createBook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await booksService.create(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateBook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await booksService.update(req.params.id, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function removeBook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await booksService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await booksService.addComment(req.params.bookId, userId, req.body.text);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function toggleFavorite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await booksService.toggleFavorite(req.params.bookId, userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export const handlePdfUploadError = (err: any, req: Request, res: Response, next: NextFunction): void => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ message: 'El archivo PDF supera el tamaño máximo permitido de 50 MB' });
    return;
  }
  if (err.message === 'INVALID_MIME') {
    res.status(422).json({ message: 'El archivo debe ser un PDF' });
    return;
  }
  next(err);
};

export const handleCoverUploadError = (err: any, req: Request, res: Response, next: NextFunction): void => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ message: 'La imagen de portada no puede superar los 5 MB' });
    return;
  }
  if (err.message === 'INVALID_COVER_MIME') {
    res.status(422).json({ message: 'La portada debe ser una imagen PNG o JPG' });
    return;
  }
  next(err);
};

export const uploadCover = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No se proporcionó ninguna imagen de portada' });
      return;
    }
    const result = await booksService.uploadCover(req.params.id, req.file.buffer, req.file.mimetype);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const downloadCover = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await booksService.downloadCover(req.params.id);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(result.data);
  } catch (err) {
    next(err);
  }
};

export const uploadPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No se proporcionó ningún archivo PDF' });
      return;
    }
    const result = await booksService.uploadPdf(req.params.id, req.file.buffer, req.file.mimetype);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const downloadPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await booksService.downloadPdf(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(result.data);
  } catch (err) {
    next(err);
  }
};
