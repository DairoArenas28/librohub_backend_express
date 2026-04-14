import { body, query, ValidationChain } from 'express-validator';

export const createBookSchema: ValidationChain[] = [
  body('title').notEmpty().withMessage('Title is required'),
  body('author').notEmpty().withMessage('Author is required'),
  body('coverUrl').optional().notEmpty().withMessage('Cover URL cannot be empty'),
  body('isbn').notEmpty().withMessage('ISBN is required'),
];

export const updateBookSchema: ValidationChain[] = [
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('author').optional().notEmpty().withMessage('Author cannot be empty'),
  body('coverUrl').optional().notEmpty().withMessage('Cover URL cannot be empty'),
  body('isbn').optional().notEmpty().withMessage('ISBN cannot be empty'),
  body('pages').optional().isInt({ min: 1 }).withMessage('Pages must be a positive integer'),
  body('language').optional().notEmpty().withMessage('Language cannot be empty'),
  body('publisher').optional().notEmpty().withMessage('Publisher cannot be empty'),
  body('synopsis').optional().notEmpty().withMessage('Synopsis cannot be empty'),
  body('year').optional().isInt({ min: 1 }).withMessage('Year must be a valid integer'),
  body('status').optional().notEmpty().withMessage('Status cannot be empty'),
];

export const addCommentSchema: ValidationChain[] = [
  body('text').notEmpty().withMessage('Comment text is required'),
];

export const bookFiltersSchema: ValidationChain[] = [
  query('year').optional().isInt().withMessage('Year must be a valid integer'),
];
