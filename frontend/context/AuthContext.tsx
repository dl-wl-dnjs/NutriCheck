import React, { createContext, useContext, useMemo } from 'react';

const DEFAULT_USER = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function resolveUserId(): string {
  const v = process.env.EXPO_PUBLIC_DEV_USER_ID;
  if (v != null && v.trim() !== '') {
    return v.trim();
  }
  return DEFAULT_USER;
}

interface AuthValue {
  userId: string;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => ({ userId: resolveUserId() }), []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (ctx == null) {
    throw new Error('useAuth requires AuthProvider');
  }
  return ctx;
}
