import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../../shared/auth.middleware';
import { validate } from '../../shared/validation.middleware';
import { createUserSchema, updateUserSchema } from './users.schema';
import { getAll, getMe, createUser, updateUser, removeUser } from './users.controller';

const router = Router();

// Ruta accesible para cualquier usuario autenticado
router.get('/me', authMiddleware, getMe);

// Rutas solo para admin
router.use(authMiddleware, adminMiddleware);

router.get('/', getAll);
router.post('/', createUserSchema, validate, createUser);
router.put('/:id', updateUserSchema, validate, updateUser);
router.delete('/:id', removeUser);

export default router;
