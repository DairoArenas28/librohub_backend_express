import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

/**
 * Generates a 6-digit numeric reset code, zero-padded if necessary.
 */
export function generateResetCode(): string {
  const code = Math.floor(Math.random() * 1_000_000);
  return code.toString().padStart(6, '0');
}

/**
 * Hashes a plain-text password using bcrypt with saltRounds >= 10.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compares a plain-text password against a bcrypt hash.
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
