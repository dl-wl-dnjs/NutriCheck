import axios from 'axios';

function baseUrl(): string {
  const u = process.env.EXPO_PUBLIC_API_URL;
  if (u == null || u.trim() === '') {
    throw new Error('Set EXPO_PUBLIC_API_URL in frontend/.env');
  }
  return u.replace(/\/$/, '');
}

export const api = axios.create({
  baseURL: baseUrl(),
  timeout: 45000,
});
