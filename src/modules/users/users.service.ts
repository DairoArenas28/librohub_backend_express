import { AppDataSource } from '../../database/data-source';
import { User } from './user.entity';
import { UserFormData, UserResponse } from './users.types';
import { hashPassword } from '../auth/auth.utils';
import { ConflictError, NotFoundError } from '../../shared/errors';
import { Comment } from '../books/comment.entity';
import { Favorite } from '../books/favorite.entity';
import path from 'path';
import fs from 'fs';

const repo = () => AppDataSource.getRepository(User);

function toResponse(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    document: user.document,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    avatarPath: user.avatarPath ?? null,
  };
}

export const UsersService = {
  async getAll(): Promise<UserResponse[]> {
    const users = await repo().find();
    return users.map(toResponse);
  },

  async getById(id: string): Promise<UserResponse> {
    const user = await repo().findOne({ where: { id } });
    if (!user) throw new NotFoundError('User');
    return toResponse(user);
  },

  async create(data: UserFormData): Promise<UserResponse> {
    const existing = await repo().findOne({ where: { email: data.email } });
    if (existing) {
      throw new ConflictError('Email already in use');
    }

    const passwordHash = await hashPassword(data.password);
    const user = repo().create({
      name: data.name,
      document: data.document,
      email: data.email,
      phone: data.phone,
      role: data.role ?? 'reader',
      passwordHash,
    });

    const saved = await repo().save(user);
    return toResponse(saved);
  },

  async update(id: string, data: Partial<UserFormData>): Promise<UserResponse> {
    const user = await repo().findOne({ where: { id } });
    if (!user) {
      throw new NotFoundError('User');
    }

    const { password, ...rest } = data;
    Object.assign(user, rest);

    if (password) {
      user.passwordHash = await hashPassword(password);
    }

    const saved = await repo().save(user);
    return toResponse(saved);
  },

  async remove(id: string): Promise<void> {
    const user = await repo().findOne({ where: { id } });
    if (!user) throw new NotFoundError('User');

    const commentRepo = AppDataSource.getRepository(Comment);
    const favoriteRepo = AppDataSource.getRepository(Favorite);
    await commentRepo.delete({ user: { id } });
    await favoriteRepo.delete({ user: { id } });

    await repo().remove(user);
  },

  async updateAvatar(id: string, filePath: string): Promise<UserResponse> {
    const user = await repo().findOne({ where: { id } });
    if (!user) throw new NotFoundError('User');

    // Remove old avatar file if exists
    if (user.avatarPath) {
      const old = path.join(process.cwd(), user.avatarPath);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }

    user.avatarPath = filePath;
    const saved = await repo().save(user);
    return toResponse(saved);
  },

  async getAvatarPath(id: string): Promise<string | null> {
    const user = await repo().findOne({ where: { id } });
    if (!user) throw new NotFoundError('User');
    return user.avatarPath ?? null;
  },
};
