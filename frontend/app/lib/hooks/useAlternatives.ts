/**
 * Fetch healthier, same-category alternatives for a scanned product from
 * GET /alternatives/{product_id}. The backend blends local DB candidates with
 * an Open Food Facts category search and scores each with the user's profile.
 */

import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '../api';
import type { AlternativesResponse } from '../types';

export function alternativesQueryKey(userId: string, productId: string, limit: number) {
  return ['alternatives', userId, productId, limit] as const;
}

export function useAlternatives(
  userId: string,
  productId: string | null | undefined,
  limit: number = 5,
) {
  const enabled = userId.length > 0 && !!productId && productId.length > 0;
  return useQuery({
    queryKey: alternativesQueryKey(userId, productId ?? '', limit),
    queryFn: () => {
      const qs = new URLSearchParams({ user_id: userId, limit: String(limit) });
      return apiRequest<AlternativesResponse>(
        `/alternatives/${encodeURIComponent(productId as string)}?${qs.toString()}`,
      );
    },
    enabled,
    staleTime: 60_000,
  });
}
