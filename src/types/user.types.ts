import { UserRole } from '@/constants/roles.constants';

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
