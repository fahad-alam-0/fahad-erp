import { ServiceResult } from '@/types/common.types';
import { JobCard } from '../types';

export const repairService = {
  async fetchJobCards(): Promise<ServiceResult<JobCard[]>> {
    return {
      success: true,
      data: [],
    };
  },
};
