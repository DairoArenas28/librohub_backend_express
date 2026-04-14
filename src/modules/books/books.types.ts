export interface BookFilters {
  category?: string;
  year?: number;
}

export interface CommentResponse {
  id: string;
  userId: string;
  authorName: string;
  avatarUrl?: string;
  text: string;
  createdAt: string; // ISO 8601
}

export interface BookSummary {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  categories: string[];
  category: string;
  year: number;
  status: 'active' | 'coming_soon';
}

export interface BookDetailResponse {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  category: string;
  year: number;
  status: 'active' | 'coming_soon';
  pages: number;
  language: string;
  isbn: string;
  publisher: string;
  synopsis: string;
  rating: number;
  categories: string[];
  comments: CommentResponse[];
  isFavorite: boolean;
  hasPdf: boolean;
}

export interface CategoryBooks {
  category: string;
  books: BookSummary[];
}

export interface BookFormData {
  title: string;
  author: string;
  coverUrl?: string;
  isbn: string;
  pages?: number;
  language?: string;
  publisher?: string;
  synopsis?: string;
  year?: number;
  status?: 'active' | 'coming_soon';
  categories?: string[];
}
