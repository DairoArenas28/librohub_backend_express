import { Request, Response, NextFunction } from 'express';
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
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const result = await UsersService.updateAvatar(userId, base64);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getAvatarBase64Json(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const base64 = await UsersService.getAvatarBase64(req.params.id);
    if (!base64) {
      res.status(404).json({ message: 'Avatar not found' });
      return;
    }
    res.status(200).json({ base64 });
  } catch (err) {
    next(err);
  }
}

export async function getAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const base64 = await UsersService.getAvatarBase64(req.params.id);
    if (!base64) {
      res.status(404).json({ message: 'Avatar not found' });
      return;
    }
    const matches = base64.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      res.status(500).json({ message: 'Invalid avatar format' });
      return;
    }
    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    res.set('Content-Type', mimeType);
    res.send(buffer);
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
