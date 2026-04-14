import express, { Request, Response, NextFunction } from 'express';
import { globalErrorHandler } from './shared/error.handler';
import authRouter from './modules/auth/auth.routes';
import booksRouter from './modules/books/books.routes';
import usersRouter from './modules/users/users.routes';
import dashboardRouter from './modules/dashboard/dashboard.routes';

const app = express();

// CORS middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Health check (no auth required)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// API v1 routers
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/books', booksRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/dashboard', dashboardRouter);

// Global error handler (must be last)
app.use(globalErrorHandler);

export default app;
