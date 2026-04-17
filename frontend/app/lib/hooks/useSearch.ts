/**
 * Free-text product search against GET /search. Results are personalized —
 * each item carries a score computed with the caller's health profile — and
 * cached per (userId, query) so rapid retypes don't hammer the backend.
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { apiRequest } from '../api';
import type { SearchResponse } from '../types';

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);
  return debounced;
}

export function searchQueryKey(userId: string, query: string, limit: number) {
  return ['search', userId, query, limit] as const;
}

export function useSearch(userId: string, query: string, limit: number = 20) {
  const debounced = useDebouncedValue(query.trim(), 300);
  const enabled = userId.length > 0 && debounced.length >= 2;
  return useQuery({
    queryKey: searchQueryKey(userId, debounced, limit),
    queryFn: () => {
      const qs = new URLSearchParams({
        q: debounced,
        user_id: userId,
        limit: String(limit),
      });
      return apiRequest<SearchResponse>(`/search?${qs.toString()}`);
    },
    enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
