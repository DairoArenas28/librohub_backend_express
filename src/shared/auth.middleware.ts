import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from './errors';

interface JwtPayload {
  userId: string;
  role: 'reader' | 'admin';
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  // Also accept token as query param (e.g. for PDF viewer via WebView)
  const queryToken = typeof req.query?.token === 'string' ? req.query.token : null;

  const rawToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : queryToken;

  if (!rawToken) {
    const error = new UnauthorizedError('Missing or invalid authorization header');
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  try {
    const secret = process.env.JWT_SECRET as string;
    const payload = jwt.verify(rawToken, secret) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    const error = new UnauthorizedError('Invalid or expired token');
    res.status(error.statusCode).json({ message: error.message });
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    const error = new ForbiddenError('Admin access required');
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  next();
}
