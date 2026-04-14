import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../modules/users/user.entity';
import { Book } from '../modules/books/book.entity';
import { Comment } from '../modules/books/comment.entity';
import { Favorite } from '../modules/books/favorite.entity';
import { PasswordResetCode } from '../modules/auth/auth.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  entities: [User, Book, Comment, Favorite, PasswordResetCode],
  migrations: ['src/database/migrations/*.ts'],
});
