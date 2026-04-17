/**
 * Submit a barcode to POST /scan and cache the result by barcode so the Product
 * screen can consume the scan without repeating the POST (no duplicate history).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '../api';
import type { ScanRequest, ScanResponse } from '../types';

export function scanQueryKey(userId: string, barcode: string) {
  return ['scan', userId, barcode] as const;
}

export function useScan(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Pick<ScanRequest, 'barcode'>) =>
      apiRequest<ScanResponse>('/scan', {
        method: 'POST',
        body: { user_id: userId, barcode: input.barcode },
      }),
    onSuccess: (data, variables) => {
      qc.setQueryData(scanQueryKey(userId, variables.barcode), data);
      void qc.invalidateQueries({ queryKey: ['scanHistory', userId] });
    },
  });
}

/**
 * Look up a cached scan result by barcode; if the cache is cold (e.g. deep link
 * from Recent Scans) fall back to POST /scan.
 */
export function useScanByBarcode(userId: string, barcode: string) {
  return useQuery({
    queryKey: scanQueryKey(userId, barcode),
    queryFn: () =>
      apiRequest<ScanResponse>('/scan', {
        method: 'POST',
        body: { user_id: userId, barcode },
      }),
    enabled: userId.length > 0 && barcode.length > 0,
    staleTime: 5 * 60_000,
  });
}
