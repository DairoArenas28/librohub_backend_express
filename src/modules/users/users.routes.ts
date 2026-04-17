import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../../shared/auth.middleware';
import { validate } from '../../shared/validation.middleware';
import { createUserSchema, updateUserSchema } from './users.schema';
import { getAll, getMe, createUser, updateUser, removeUser, uploadAvatar, getAvatar } from './users.controller';
import { avatarUpload } from './avatar.middleware';

const router = Router();

// Rutas accesibles para cualquier usuario autenticado
router.get('/me', authMiddleware, getMe);
router.post('/me/avatar', authMiddleware, avatarUpload.single('avatar'), uploadAvatar);
router.get('/:id/avatar', authMiddleware, getAvatar);

// Rutas solo para admin
router.use(authMiddleware, adminMiddleware);

router.get('/', getAll);
router.post('/', createUserSchema, validate, createUser);
router.put('/:id', updateUserSchema, validate, updateUser);
router.delete('/:id', removeUser);

export default router;
