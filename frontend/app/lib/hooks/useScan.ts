/**
 * Submit a barcode to POST /scan (authenticated). Cache by barcode for Product screen.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '../api';
import { isLikelyUserUuid } from '../apiRouting';
import type { ScanRequest, ScanResponse } from '../types';

export function scanQueryKey(userId: string, barcode: string) {
  return ['scan', userId, barcode] as const;
}

export function useScan(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Pick<ScanRequest, 'barcode'>) => {
      const body: Record<string, string> = { barcode: input.barcode };
      if (isLikelyUserUuid(userId)) {
        body.user_id = userId.trim();
      }
      return apiRequest<ScanResponse>('/scan', {
        method: 'POST',
        body,
      });
    },
    onSuccess: (data, variables) => {
      qc.setQueryData(scanQueryKey(userId, variables.barcode), data);
      void qc.invalidateQueries({ queryKey: ['scanHistory', userId] });
    },
  });
}

/** Look up a cached scan; if cold, POST /scan once. */
export function useScanByBarcode(userId: string, barcode: string) {
  return useQuery({
    queryKey: scanQueryKey(userId, barcode),
    queryFn: () => {
      const body: Record<string, string> = { barcode };
      if (isLikelyUserUuid(userId)) {
        body.user_id = userId.trim();
      }
      return apiRequest<ScanResponse>('/scan', {
        method: 'POST',
        body,
      });
    },
    enabled: userId.length > 0 && barcode.length > 0,
    staleTime: 5 * 60_000,
  });
}
