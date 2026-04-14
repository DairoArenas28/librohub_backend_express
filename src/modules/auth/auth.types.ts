export type UserRole = 'reader' | 'admin';

export interface RegisterData {
  name: string;
  document: string;
  email: string;
  phone: string;
  password: string;
}

export interface JwtPayload {
  userId: string;
  role: UserRole;
  iat: number;
  exp: number;
}
