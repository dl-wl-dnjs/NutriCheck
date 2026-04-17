import type { HealthProfilePayload, HealthProfileResponse } from '../types/api';
import { api } from './client';

export async function getHealthProfile(userId: string): Promise<HealthProfileResponse | null> {
  try {
    const { data } = await api.get<HealthProfileResponse>(`/api/health-profile/${userId}`);
    return data;
  } catch {
    return null;
  }
}

export async function saveHealthProfile(payload: HealthProfilePayload): Promise<HealthProfileResponse> {
  const { data } = await api.post<HealthProfileResponse>('/api/health-profile', payload);
  return data;
}
