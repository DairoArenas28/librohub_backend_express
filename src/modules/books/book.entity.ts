import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Comment } from './comment.entity';
import { Favorite } from './favorite.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column()
  author!: string;

  @Column({ name: 'cover_url', default: '' })
  coverUrl!: string;

  @Column({ type: 'int', nullable: true })
  pages!: number;

  @Column({ nullable: true })
  language!: string;

  @Column({ unique: true })
  isbn!: string;

  @Column({ nullable: true })
  publisher!: string;

  @Column({ type: 'text', nullable: true })
  synopsis!: string;

  @Column({ type: 'int', nullable: true })
  year!: number;

  @Column({ type: 'enum', enum: ['active', 'coming_soon'], default: 'active' })
  status!: 'active' | 'coming_soon';

  @Column({ type: 'simple-array', default: '' })
  categories!: string[];

  @Column({ name: 'pdf_data', type: 'bytea', nullable: true, select: false })
  pdfData!: Buffer | null;

  @Column({ name: 'pdf_mime_type', type: 'varchar', nullable: true })
  pdfMimeType!: string | null;

  @Column({ name: 'cover_data', type: 'bytea', nullable: true, select: false })
  coverData!: Buffer | null;

  @Column({ name: 'cover_mime_type', type: 'varchar', nullable: true })
  coverMimeType!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Comment, (comment) => comment.book)
  comments!: Comment[];

  @OneToMany(() => Favorite, (favorite) => favorite.book)
  favorites!: Favorite[];
}
