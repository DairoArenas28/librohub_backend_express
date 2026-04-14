import { body, ValidationChain } from 'express-validator';

export const loginSchema: ValidationChain[] = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const registerSchema: ValidationChain[] = [
  body('name').notEmpty().withMessage('Name is required'),
  body('document').notEmpty().withMessage('Document is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

export const forgotPasswordSchema: ValidationChain[] = [
  body('email').isEmail().withMessage('Valid email is required'),
];

export const validateCodeSchema: ValidationChain[] = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('code')
    .notEmpty()
    .withMessage('Code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('Code must be exactly 6 characters'),
];

export const resetPasswordSchema: ValidationChain[] = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('code').notEmpty().withMessage('Code is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
];

export const changePasswordSchema: ValidationChain[] = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
];
