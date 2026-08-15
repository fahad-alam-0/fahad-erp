import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';

/**
 * Shared TanStack Query wrapper hook for consistent server state retrieval.
 */
export function useQueryCustom<TData = unknown, TError = Error>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, TError>({
    queryKey,
    queryFn,
    ...options,
  });
}
