/**
 * GET /scan-history (authenticated).
 */

import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '../api';
import { scanHistoryPath } from '../apiRouting';
import type { ScanHistoryResponse } from '../types';

export function scanHistoryQueryKey(userId: string, limit: number) {
  return ['scanHistory', userId, limit] as const;
}

export function useScanHistory(userId: string, limit = 10) {
  const enabled = userId.length > 0;
  const query = useQuery({
    queryKey: scanHistoryQueryKey(userId, limit),
    queryFn: () => apiRequest<ScanHistoryResponse>(scanHistoryPath(userId, limit)),
    enabled,
    staleTime: 30_000,
  });
  return { ...query, isPending: enabled && query.isPending };
}
