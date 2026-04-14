import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service';

export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await DashboardService.getStats();
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
}
