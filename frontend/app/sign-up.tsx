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
import { getAuthRedirectUrlForEmail } from '../lib/authRedirect';
import { getSupabase } from '../lib/supabase';

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const C = useScreenTokens();
  const mode = resolveAuthBootstrap();
  const supabase = getSupabase();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (mode !== 'supabase' || !supabase) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: C.pageBg }]} edges={['top', 'bottom', 'left', 'right']}>
        <View style={{ padding: 20, flex: 1, justifyContent: 'center' }}>
          <Text style={{ color: C.secondary, fontSize: 16, textAlign: 'center' }}>
            Create account is only available when Supabase is configured (see frontend/.env).
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const onSubmit = async () => {
    setError(null);
    setInfo(null);
    const e = email.trim();
    if (!e || !password) {
      setError('Enter email and password.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for the password.');
      return;
    }
    setBusy(true);
    const { data, error: signErr } = await supabase.auth.signUp({
      email: e,
      password,
      options: { emailRedirectTo: getAuthRedirectUrlForEmail() },
    });
    setBusy(false);
    if (signErr) {
      setError(signErr.message);
      return;
    }
    if (data.session) {
      router.replace('/(tabs)');
      return;
    }
    setInfo(
      "We emailed you a confirmation link. Open it on this same phone, then come back and sign in. Check spam if you don't see it.",
    );
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
            Create account
          </Text>
          <Text style={{ fontSize: 14, color: C.secondary, textAlign: 'center' }}>
            We store your health profile in NutriCheck. Sign-in uses Supabase on this device only.
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
            placeholder="Password (8+ characters)"
            placeholderTextColor={C.tertiary}
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={[styles.input, { color: C.primary, borderColor: C.separatorLight }]}
            placeholder="Confirm password"
            placeholderTextColor={C.tertiary}
            secureTextEntry
            autoComplete="new-password"
            value={confirm}
            onChangeText={setConfirm}
          />
          {error ? (
            <Text style={[styles.feedback, { color: C.red }]} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          {info ? (
            <Text style={[styles.feedback, { color: C.green }]} accessibilityLiveRegion="polite">
              {info}
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
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 17 }}>Create account</Text>
            )}
          </Pressable>
          <Pressable onPress={() => router.replace('/sign-in')} accessibilityRole="button">
            <Text style={{ color: C.green, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>
              Already have an account? Sign in
            </Text>
          </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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



