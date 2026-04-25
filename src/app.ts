import express, { Request, Response } from 'express';
import cors from 'cors';
import { globalErrorHandler } from './shared/error.handler';
import authRouter from './modules/auth/auth.routes';
import booksRouter from './modules/books/books.routes';
import usersRouter from './modules/users/users.routes';
import dashboardRouter from './modules/dashboard/dashboard.routes';

const app = express();

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));

// API v1 routers
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/books', booksRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/dashboard', dashboardRouter);

// Global error handler (must be last)
app.use(globalErrorHandler);

export default app;
