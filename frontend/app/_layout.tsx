import 'react-native-reanimated';

import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { useScreenTokens } from '../hooks/useScreenTokens';
import { AppQueryProvider } from '../lib/QueryProvider';

const WEB_IPHONE_PREVIEW_WIDTH = 393;

/** When using Supabase or Clerk, send logged-out users to sign-in (dev mode skips this). */
function AuthRouteSync() {
  const { authMode, userId, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded || authMode === 'dev') {
      return;
    }
    const top = segments[0];
    const inAuthFlow = top === 'sign-in' || top === 'sign-up';

    if (!userId && !inAuthFlow) {
      router.replace('/sign-in');
    } else if (userId && inAuthFlow) {
      router.replace('/(tabs)');
    }
  }, [authMode, userId, isLoaded, segments, router]);

  return null;
}

function ThemedStack() {
  const C = useScreenTokens();

  const stack = (
    <>
      <AuthRouteSync />
      <StatusBar style={C.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.pageBg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="scan"
          options={{
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="product/[barcode]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="alternatives/[productId]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ingredient/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="sign-in"
          options={{ animation: 'slide_from_right', gestureEnabled: false, fullScreenGestureEnabled: false }}
        />
        <Stack.Screen
          name="sign-up"
          options={{ animation: 'slide_from_right', gestureEnabled: false, fullScreenGestureEnabled: false }}
        />
      </Stack>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[webOuter, { backgroundColor: C.dark ? '#0A0A0A' : '#C9C7C2' }]}>
        <View style={[webInner, { backgroundColor: C.pageBg }]}>{stack}</View>
      </View>
    );
  }

  return <View style={{ flex: 1, backgroundColor: C.pageBg }}>{stack}</View>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppQueryProvider>
          <AuthProvider>
            <ThemedStack />
          </AuthProvider>
        </AppQueryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const webOuter = {
  flex: 1,
  minHeight: '100vh' as unknown as number,
  alignItems: 'center' as const,
  paddingVertical: 20,
  paddingHorizontal: 14,
};

const webInner = {
  flex: 1,
  width: '100%' as const,
  maxWidth: WEB_IPHONE_PREVIEW_WIDTH,
  borderRadius: 12,
  overflow: 'hidden' as const,
  boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
};
