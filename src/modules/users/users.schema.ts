import { body, ValidationChain } from 'express-validator';

export const createUserSchema: ValidationChain[] = [
  body('name').notEmpty().withMessage('Name is required'),
  body('document').notEmpty().withMessage('Document is required'),
  body('email').isEmail().withMessage('A valid email is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['reader', 'admin']).withMessage('Role must be reader or admin'),
];

export const updateUserSchema: ValidationChain[] = [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('document').optional().notEmpty().withMessage('Document cannot be empty'),
  body('email').optional().isEmail().withMessage('A valid email is required'),
  body('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['reader', 'admin']).withMessage('Role must be reader or admin'),
];
