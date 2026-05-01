/**
 * Supabase Auth client for Expo. SecureStore on native; localStorage on web.
 * Returns null when URL/anon key are not configured.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const memory = new Map<string, string>();

async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') {
      return memory.get(key) ?? null;
    }
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') {
      memory.set(key, value);
      return;
    }
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function storageRemove(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') {
      memory.delete(key);
      return;
    }
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) {
    return client;
  }
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return null;
  }
  client = createClient(url, anonKey, {
    auth: {
      storage: {
        getItem: storageGet,
        setItem: storageSet,
        removeItem: storageRemove,
      },
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });
  return client;
}
