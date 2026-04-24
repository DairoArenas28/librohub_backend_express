import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../database/data-source';
import { User } from '../users/user.entity';
import { PasswordResetCode } from './auth.entity';
import { JWT_EXPIRY, RESET_CODE_TTL_MINUTES } from './auth.constants';
import { generateResetCode, hashPassword, comparePassword } from './auth.utils';
import { sendPasswordResetEmail } from './email.service';
import { RegisterData, UserRole } from './auth.types';
import {
  UnauthorizedError,
  ConflictError,
  BadRequestError,
  NotFoundError,
} from '../../shared/errors';

export class AuthService {
  private get userRepo() {
    return AppDataSource.getRepository(User);
  }

  private get resetCodeRepo() {
    return AppDataSource.getRepository(PasswordResetCode);
  }

  async login(
    username: string,
    password: string
  ): Promise<{ token: string; role: UserRole; userId: string }> {
    const user = await this.userRepo.findOne({ where: { document: username } });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const secret = process.env.JWT_SECRET!;
    const token = jwt.sign({ userId: user.id, role: user.role }, secret, {
      expiresIn: JWT_EXPIRY,
    });

    return { token, role: user.role as UserRole, userId: user.id };
  }

  async register(data: RegisterData): Promise<void> {
    const existingEmail = await this.userRepo.findOne({ where: { email: data.email } });
    if (existingEmail) {
      throw new ConflictError('Email already in use');
    }

    const existingDocument = await this.userRepo.findOne({ where: { document: data.document } });
    if (existingDocument) {
      throw new ConflictError('Document already in use');
    }

    const passwordHash = await hashPassword(data.password);

    const user = this.userRepo.create({
      name: data.name,
      document: data.document,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: 'reader',
    });

    await this.userRepo.save(user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundError('User');
    }

    const code = generateResetCode();
    const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);

    const resetCode = this.resetCodeRepo.create({ email, code, expiresAt, used: false });
    await this.resetCodeRepo.save(resetCode);

    await sendPasswordResetEmail(email, code);
  }

  async validateCode(email: string, code: string): Promise<void> {
    const resetCode = await this.resetCodeRepo.findOne({
      where: { email, code },
      order: { expiresAt: 'DESC' },
    });

    if (!resetCode) {
      throw new BadRequestError('Invalid or expired reset code');
    }

    if (resetCode.used) {
      throw new BadRequestError('Reset code has already been used');
    }

    if (resetCode.expiresAt < new Date()) {
      throw new BadRequestError('Reset code has expired');
    }
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<void> {
    const resetCode = await this.resetCodeRepo.findOne({
      where: { email, code },
      order: { expiresAt: 'DESC' },
    });

    if (!resetCode) {
      throw new BadRequestError('Invalid or expired reset code');
    }

    if (resetCode.used) {
      throw new BadRequestError('Reset code has already been used');
    }

    if (resetCode.expiresAt < new Date()) {
      throw new BadRequestError('Reset code has expired');
    }

    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundError('User');
    }

    user.passwordHash = await hashPassword(newPassword);
    await this.userRepo.save(user);

    resetCode.used = true;
    await this.resetCodeRepo.save(resetCode);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User');
    }

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    user.passwordHash = await hashPassword(newPassword);
    await this.userRepo.save(user);
  }
}
