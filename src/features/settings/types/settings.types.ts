import { UserRole } from '@/constants/roles.constants';

export interface UserProfileData {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  email?: string;
}

export interface UpdateProfileInput {
  full_name?: string;
  phone?: string;
}

export interface SetUserRoleInput {
  target_user_id: string;
  new_role: UserRole;
}

export interface SystemInfo {
  appName: string;
  version: string;
  environment: string;
  frontendStack: string;
  backendStack: string;
  authProvider: string;
  pwaStatus: string;
}
