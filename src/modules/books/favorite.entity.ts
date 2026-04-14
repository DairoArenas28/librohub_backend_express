import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Book } from './book.entity';

@Entity('favorites')
@Unique(['user', 'book'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.favorites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Book, (book) => book.favorites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book!: Book;
}
