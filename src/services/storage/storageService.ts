import { ServiceResult } from '@/types/common.types';

export const storageService = {
  async uploadFile(_file: File, _folder: string): Promise<ServiceResult<string>> {
    return {
      success: true,
      data: 'https://placeholder.fahadelectronics.com/uploaded-file.jpg',
    };
  },
  async getPublicUrl(_path: string): Promise<string> {
    return 'https://placeholder.fahadelectronics.com/uploaded-file.jpg';
  },
};
