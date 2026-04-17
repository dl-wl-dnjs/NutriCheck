/**
 * Fetches recent scans from GET /scan-history/{user_id}?limit= for the home row
 * and pull-to-refresh; query key is shared so profile save can invalidate it.
 */

import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '../api';
import type { ScanHistoryResponse } from '../types';

export function scanHistoryQueryKey(userId: string, limit: number) {
  return ['scanHistory', userId, limit] as const;
}

export function useScanHistory(userId: string, limit = 10) {
  return useQuery({
    queryKey: scanHistoryQueryKey(userId, limit),
    queryFn: () =>
      apiRequest<ScanHistoryResponse>(`/scan-history/${userId}?limit=${encodeURIComponent(String(limit))}`),
    enabled: userId.length > 0,
  });
}
