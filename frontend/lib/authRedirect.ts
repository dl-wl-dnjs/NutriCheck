/**
 * Supabase email confirmation / magic links must redirect to a URL that opens this app,
 * not http://localhost (which breaks on a phone). See frontend/.env.example.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/** URL Supabase redirects to after the user taps the email link (must be allowlisted in Supabase). */
export function getAuthRedirectUrlForEmail(): string {
  const override = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim();
  if (override) {
    return override;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/sign-in`;
  }
  return Linking.createURL('sign-in');
}

/** Apply access/refresh tokens or PKCE code from the post-confirmation URL. */
export async function consumeSupabaseAuthUrl(supabase: SupabaseClient, url: string): Promise<void> {
  try {
    const parsed = new URL(url);
    const hash = (parsed.hash ?? '').replace(/^#/, '');
    if (hash) {
      const q = new URLSearchParams(hash);
      const access_token = q.get('access_token');
      const refresh_token = q.get('refresh_token');
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        return;
      }
    }
    const code = parsed.searchParams.get('code');
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  } catch {
    /* malformed URL */
  }
}
