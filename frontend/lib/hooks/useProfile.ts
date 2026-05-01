/**
 * GET/PUT /profile (authenticated).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiGetOrNull, apiRequest } from '../api';
import { profilePath } from '../apiRouting';
import type { ProfileResponse, ProfileUpsertBody } from '../types';

export function profileQueryKey(userId: string) {
  return ['profile', userId] as const;
}

export function useProfile(userId: string) {
  const enabled = userId.length > 0;
  const query = useQuery({
    queryKey: profileQueryKey(userId),
    queryFn: () => apiGetOrNull<ProfileResponse>(profilePath(userId)),
    enabled,
  });
  // Disabled queries stay "pending" in TanStack Query; treat as not loading when there is no user.
  return { ...query, isPending: enabled && query.isPending };
}

export function useUpdateProfile(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileUpsertBody) =>
      apiRequest<ProfileResponse>(profilePath(userId), {
        method: 'PUT',
        body,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: profileQueryKey(userId) });
      void qc.invalidateQueries({ queryKey: ['scanHistory', userId] });
      void qc.invalidateQueries({ queryKey: ['scan', userId] });
      void qc.invalidateQueries({ queryKey: ['alternatives', userId] });
    },
  });
}
