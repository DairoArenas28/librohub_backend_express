import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';

const authService = new AuthService();

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.register(req.body);
    res.status(201).json({});
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.forgotPassword(req.body.email);
    res.status(200).json({ message: 'If the email exists, a reset code has been sent' });
  } catch (err) {
    next(err);
  }
}

export async function validateCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, code } = req.body;
    await authService.validateCode(email, code);
    res.status(200).json({ message: 'Code is valid' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, code, newPassword } = req.body;
    await authService.resetPassword(email, code, newPassword);
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(userId, currentPassword, newPassword);
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}
