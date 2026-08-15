import { User, Session } from '@supabase/supabase-js';
import { UserRole } from '@/constants/roles.constants';
import { UserProfile } from './user.types';

export interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}
