import { ClerkProvider, useAuth as useClerkAuth, useClerk, useUser } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import * as Linking from 'expo-linking';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { setAuthHeadersFactory } from '../lib/api';
import { consumeSupabaseAuthUrl } from '../lib/authRedirect';
import { getSupabase } from '../lib/supabase';

const DEFAULT_USER = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function resolveUserId(): string {
  const v = process.env.EXPO_PUBLIC_DEV_USER_ID;
  if (v != null && v.trim() !== '') {
    return v.trim();
  }
  return DEFAULT_USER;
}

export type AuthMode = 'supabase' | 'clerk' | 'dev';

export function resolveAuthBootstrap(): AuthMode {
  const supUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const supAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (supUrl && supAnon) {
    return 'supabase';
  }
  if (process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()) {
    return 'clerk';
  }
  return 'dev';
}

export interface AuthValue {
  authMode: AuthMode;
  /** Stable id for React Query keys: Supabase user id, Clerk user id, or dev UUID. */
  userId: string;
  /** False until first session is known (Supabase/Clerk). True immediately in dev. */
  isLoaded: boolean;
  signOut: () => Promise<void>;
  /** @deprecated use authMode === 'clerk' */
  usingClerk: boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

function LegacyAuthProvider({ children }: { children: React.ReactNode }) {
  const userId = useMemo(() => resolveUserId(), []);
  setAuthHeadersFactory(async () => ({
    Authorization: `Bearer ${userId}`,
  }));
  const signOut = useCallback(async () => {
    /* no-op in dev token mode */
  }, []);
  const value = useMemo(
    () =>
      ({
        authMode: 'dev' as const,
        userId,
        isLoaded: true,
        signOut,
        usingClerk: false,
      }) satisfies AuthValue,
    [userId, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [userId, setUserId] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setIsLoaded(true);
      return;
    }

    const applySession = (accessToken: string | null, uid: string) => {
      if (accessToken) {
        setAuthHeadersFactory(async () => ({ Authorization: `Bearer ${accessToken}` }));
      } else {
        setAuthHeadersFactory(async () => ({}));
      }
      setUserId(uid);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session?.access_token ?? null, session?.user?.id ?? '');
      setIsLoaded(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.access_token ?? null, session?.user?.id ?? '');
    });

    const onLink = (url: string | null) => {
      if (url) {
        void consumeSupabaseAuthUrl(supabase, url);
      }
    };
    void Linking.getInitialURL().then(onLink);
    const linkSub = Linking.addEventListener('url', ({ url }) => onLink(url));

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, [supabase]);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  }, [supabase]);

  const value = useMemo(
    () =>
      ({
        authMode: 'supabase' as const,
        userId,
        isLoaded,
        signOut,
        usingClerk: false,
      }) satisfies AuthValue,
    [userId, isLoaded, signOut],
  );

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function ClerkSessionBridge({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useClerkAuth();
  const { user, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();

  if (isLoaded) {
    setAuthHeadersFactory(async () => {
      if (!isSignedIn) {
        return {};
      }
      const t = await getToken();
      return t ? { Authorization: `Bearer ${t}` } : {};
    });
  }

  const userId = isLoaded && user?.id ? user.id : '';
  const signOut = useCallback(async () => {
    await clerkSignOut();
  }, [clerkSignOut]);

  const value = useMemo(
    () =>
      ({
        authMode: 'clerk' as const,
        userId,
        isLoaded,
        signOut,
        usingClerk: true,
      }) satisfies AuthValue,
    [userId, isLoaded, signOut],
  );

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const mode = resolveAuthBootstrap();
  if (mode === 'supabase' && getSupabase() != null) {
    return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
  }
  const pk = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (mode === 'clerk' && pk) {
    return (
      <ClerkProvider publishableKey={pk} tokenCache={tokenCache}>
        <ClerkSessionBridge>{children}</ClerkSessionBridge>
      </ClerkProvider>
    );
  }
  return <LegacyAuthProvider>{children}</LegacyAuthProvider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (ctx == null) {
    throw new Error('useAuth requires AuthProvider');
  }
  return ctx;
}
