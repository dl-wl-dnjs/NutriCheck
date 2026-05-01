/**
 * GET /alternatives/{product_id} (authenticated).
 */

import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '../api';
import { isLikelyUserUuid } from '../apiRouting';
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
      const qs = new URLSearchParams({ limit: String(limit) });
      if (isLikelyUserUuid(userId)) {
        qs.set('user_id', userId.trim());
      }
      return apiRequest<AlternativesResponse>(
        `/alternatives/${encodeURIComponent(productId as string)}?${qs.toString()}`,
        { timeoutMs: 120_000 },
      );
    },
    enabled,
    staleTime: 60_000,
  });
}
