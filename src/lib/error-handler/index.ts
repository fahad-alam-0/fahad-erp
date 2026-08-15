import { AppError } from '../errors/AppError';

export interface UserFriendlyError {
  title: string;
  message: string;
  devDetails?: string;
}

export function handleAppError(error: unknown): UserFriendlyError {
  const isDev = import.meta.env.DEV;

  if (error instanceof AppError) {
    return {
      title: 'Application Error',
      message: error.message,
      devDetails: isDev ? error.stack : undefined,
    };
  }

  if (error instanceof Error) {
    return {
      title: 'Unexpected Error',
      message: isDev ? error.message : 'An unexpected error occurred. Please try again later.',
      devDetails: isDev ? error.stack : undefined,
    };
  }

  return {
    title: 'System Exception',
    message: 'An unknown system exception occurred.',
  };
}
