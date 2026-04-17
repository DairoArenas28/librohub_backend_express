import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { UsersService } from './users.service';

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    const result = await UsersService.getById(userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.userId;
    if (!req.file) {
      res.status(400).json({ message: 'No se proporcionó ninguna imagen' });
      return;
    }
    const relativePath = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
    const result = await UsersService.updateAvatar(userId, relativePath);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const avatarPath = await UsersService.getAvatarPath(req.params.id);
    if (!avatarPath) {
      res.status(404).json({ message: 'Avatar not found' });
      return;
    }
    const fullPath = path.join(process.cwd(), avatarPath);
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ message: 'Avatar file not found' });
      return;
    }
    res.sendFile(fullPath);
  } catch (err) {
    next(err);
  }
}

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await UsersService.getAll();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await UsersService.create(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await UsersService.update(req.params.id, req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function removeUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await UsersService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
