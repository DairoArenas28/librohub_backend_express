import { Router } from 'express';
import { validate } from '../../shared/validation.middleware';
import { authMiddleware } from '../../shared/auth.middleware';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  validateCodeSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.schema';
import {
  login,
  register,
  forgotPassword,
  validateCode,
  resetPassword,
  changePassword,
} from './auth.controller';

const router = Router();

router.post('/login', loginSchema, validate, login);
router.post('/register', registerSchema, validate, register);
router.post('/forgot-password', forgotPasswordSchema, validate, forgotPassword);
router.post('/validate-code', validateCodeSchema, validate, validateCode);
router.post('/reset-password', resetPasswordSchema, validate, resetPassword);
router.post('/change-password', changePasswordSchema, validate, authMiddleware, changePassword);

export default router;
