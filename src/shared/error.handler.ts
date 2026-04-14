import { Request, Response, NextFunction } from 'express';
import { AppError } from './errors';

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }
  // Handle payload too large (body-parser throws this when limit is exceeded)
  if ((err as any).type === 'entity.too.large') {
    res.status(413).json({ message: 'Payload too large' });
    return;
  }
  console.error(`[${req.method}] ${req.path} →`, err.message, err.stack);
  res.status(500).json({ message: err.message ?? 'Internal server error' });
}
