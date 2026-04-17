import { api } from './client';

export async function getUserSummary(userId: string): Promise<{ display_name: string | null } | null> {
  try {
    const { data } = await api.get<{ display_name: string | null }>(`/api/users/${userId}`);
    return data;
  } catch {
    return null;
  }
}
