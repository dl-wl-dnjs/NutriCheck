/**
 * GET /search — authenticated; results scored for the current profile.
 */

import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '../api';
import { isLikelyUserUuid } from '../apiRouting';
import type { SearchResponse } from '../types';

export function searchQueryKey(userId: string, query: string, limit: number) {
  return ['search', userId, query, limit] as const;
}

export function useSearch(userId: string, query: string, limit: number = 20) {
  const q = query.trim();
  const enabled = userId.length > 0 && q.length >= 2;
  return useQuery({
    queryKey: searchQueryKey(userId, q, limit),
    queryFn: () => {
      const qs = new URLSearchParams({ q, limit: String(limit) });
      if (isLikelyUserUuid(userId)) {
        qs.set('user_id', userId.trim());
      }
      return apiRequest<SearchResponse>(`/search?${qs.toString()}`);
    },
    enabled,
    staleTime: 60_000,
  });
}
