import type { AlternativesResponse, ScanBarcodeResponse, ScanHistoryItem } from '../types/api';
import { api } from './client';

export async function scanBarcode(userId: string, barcode: string): Promise<ScanBarcodeResponse> {
  const { data } = await api.post<ScanBarcodeResponse>('/api/scan/barcode', { user_id: userId, barcode });
  return data;
}

export async function getScanHistory(userId: string): Promise<ScanHistoryItem[]> {
  const { data } = await api.get<{ items: ScanHistoryItem[] }>('/api/scan/history', {
    params: { user_id: userId },
  });
  return data.items;
}

export async function getAlternatives(userId: string, productId: string): Promise<AlternativesResponse> {
  const { data } = await api.get<AlternativesResponse>(`/api/products/${productId}/alternatives`, {
    params: { user_id: userId },
  });
  return data;
}
