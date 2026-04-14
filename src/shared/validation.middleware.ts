import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    res.status(422).json({ errors: result.array() });
    return;
  }

  next();
}
