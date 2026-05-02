import { SignIn } from '@clerk/clerk-expo/web';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '../components/Logo';
import { resolveAuthBootstrap } from '../context/AuthContext';
import { useScreenTokens } from '../hooks/useScreenTokens';
import { getSupabase } from '../lib/supabase';

function mapSupabaseSignInError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('email not confirmed') || m.includes('not confirmed')) {
    return 'Confirm your email first (check your inbox), or turn off “Confirm email” in Supabase → Authentication → Providers → Email for local testing.';
  }
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
    return 'Wrong email or password. If you just signed up, confirm your email or reset the password in Supabase.';
  }
  return message;
}

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useScreenTokens();
  const mode = resolveAuthBootstrap();
  const pk = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const supabase = getSupabase();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (mode === 'supabase' && supabase) {
    const onSubmit = async () => {
      setError(null);
      const e = email.trim();
      if (!e || !password) {
        setError('Enter email and password.');
        return;
      }
      setBusy(true);
      const { error: signErr } = await supabase.auth.signInWithPassword({ email: e, password });
      setBusy(false);
      if (signErr) {
        setError(mapSupabaseSignInError(signErr.message));
        return;
      }
      router.replace('/(tabs)');
    };

    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.pageBg }]} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingTop: Math.max(insets.top, 12), paddingBottom: insets.bottom + 24 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.centerColumn}>
              <View style={styles.logoBlock}>
                <Logo size={132} variant="lockup" />
              </View>
              <View style={styles.formBlock}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: C.primary, textAlign: 'center' }}>
              Sign in
            </Text>
            <Text style={{ fontSize: 14, color: C.secondary, textAlign: 'center' }}>
              Use the account you created in NutriCheck. Your session stays on this device.
            </Text>
            <TextInput
              style={[styles.input, { color: C.primary, borderColor: C.separatorLight }]}
              placeholder="Email"
              placeholderTextColor={C.tertiary}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={[styles.input, { color: C.primary, borderColor: C.separatorLight }]}
              placeholder="Password"
              placeholderTextColor={C.tertiary}
              secureTextEntry
              autoComplete="password"
              value={password}
              onChangeText={setPassword}
            />
            {error ? (
              <Text style={[styles.feedback, { color: C.red }]} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}
            <Pressable
              onPress={() => void onSubmit()}
              disabled={busy}
              style={[styles.primaryBtn, { backgroundColor: C.green, opacity: busy ? 0.6 : 1 }]}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 17 }}>Sign in</Text>
              )}
            </Pressable>
            <Pressable onPress={() => router.push('/sign-up')} accessibilityRole="button">
              <Text style={{ color: C.green, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
                Create an account
              </Text>
            </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (mode === 'clerk' && pk) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.pageBg }]} edges={['top', 'bottom', 'left', 'right']}>
        <SignIn />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.pageBg }]} edges={['top', 'bottom', 'left', 'right']}>
      <View style={{ padding: 20, flex: 1, justifyContent: 'center' }}>
        <Text style={{ color: C.secondary, fontSize: 16, textAlign: 'center' }}>
          Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, or
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY, in frontend/.env to enable sign-in.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const FORM_MAX_WIDTH = 400;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerColumn: {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignItems: 'center',
  },
  logoBlock: { alignItems: 'center', marginBottom: 24 },
  formBlock: { width: '100%', gap: 16, alignItems: 'center' },
  feedback: { fontSize: 14, textAlign: 'center', width: '100%' },
  input: {
    alignSelf: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  primaryBtn: {
    alignSelf: 'stretch',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});



