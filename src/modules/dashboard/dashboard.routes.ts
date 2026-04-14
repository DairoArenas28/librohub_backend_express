import { Router } from 'express';
import { authMiddleware, adminMiddleware } from '../../shared/auth.middleware';
import { getStats } from './dashboard.controller';

const router = Router();

router.get('/stats', authMiddleware, adminMiddleware, getStats);

export default router;
