/**
 * Loads and updates the health profile via GET/PUT /profile/{user_id}; invalidates
 * scan history after a successful save so home reflects updated personalization.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGetOrNull, apiRequest } from '../api';
import type { ProfileResponse, ProfileUpsertBody } from '../types';
export function profileQueryKey(userId: string) {
  return ['profile', userId] as const;
}

export function useProfile(userId: string) {
  return useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => apiGetOrNull<ProfileResponse>(`/profile/${userId}`),
    enabled: userId.length > 0,
  });
}

export function useUpdateProfile(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileUpsertBody) =>
      apiRequest<ProfileResponse>(`/profile/${userId}`, {
        method: 'PUT',
        body,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: profileQueryKey(userId) });
      void qc.invalidateQueries({ queryKey: ['scanHistory', userId] });
      // A profile change reshapes every cached ScanResponse and alternatives list,
      // so drop those too — the next Product / Alternatives render will refetch.
      void qc.invalidateQueries({ queryKey: ['scan', userId] });
      void qc.invalidateQueries({ queryKey: ['alternatives', userId] });
    },
  });
}
