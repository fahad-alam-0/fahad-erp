import { ServiceResult } from '@/types/common.types';
import { LoginInput } from '../validation';

export const authFeatureService = {
  async authenticateUser(_input: LoginInput): Promise<ServiceResult<{ token: string }>> {
    return {
      success: true,
      data: { token: 'demo-jwt-token-placeholder' },
    };
  },
};
