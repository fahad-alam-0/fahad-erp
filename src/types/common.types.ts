export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
  storeId?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ServiceResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
}
