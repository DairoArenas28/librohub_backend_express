import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const errors = result.array();
    // Use the first validation error message as the main message
    const firstMessage = errors[0]?.msg ?? 'Validation error';
    res.status(422).json({ code: 'VALIDATION_ERROR', message: firstMessage, errors });
    return;
  }

  next();
}
