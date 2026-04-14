import { AppDataSource } from '../../database/data-source';
import { User } from '../users/user.entity';
import { Book } from '../books/book.entity';

interface DashboardStats {
  users: { active: number; inactive: number };
  books: { active: number; inactive: number };
}

export const DashboardService = {
  async getStats(): Promise<DashboardStats> {
    const userRepo = AppDataSource.getRepository(User);
    const bookRepo = AppDataSource.getRepository(Book);

    const [activeUsers, inactiveUsers, activeBooks, inactiveBooks] = await Promise.all([
      userRepo.countBy({ isActive: true }),
      userRepo.countBy({ isActive: false }),
      bookRepo.countBy({ status: 'active' }),
      bookRepo.countBy({ status: 'coming_soon' }),
    ]);

    return {
      users: { active: activeUsers, inactive: inactiveUsers },
      books: { active: activeBooks, inactive: inactiveBooks },
    };
  },
};
