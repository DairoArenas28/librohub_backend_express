export interface UserFormData {
  name: string;
  document: string;
  email: string;
  phone: string;
  password: string;
  role?: 'reader' | 'admin';
}

export interface UserResponse {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  role: 'reader' | 'admin';
  isActive: boolean;
  createdAt: Date;
}
