export const formatAuthError = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return 'An unexpected authentication error occurred.';
};
