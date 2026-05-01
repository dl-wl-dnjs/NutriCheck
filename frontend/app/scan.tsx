import { BlurView } from 'expo-blur';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { X, Zap, ZapOff } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  InputAccessoryView,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';
import { useScan } from '../lib/hooks/useScan';
import { tokens } from '../theme';

const RETICLE_W = 280;
const RETICLE_H = 180;
const CORNER_LEN = 32;
const CORNER_STROKE = 3;
const CORNER_RADIUS = 12;

function normalizeBarcode(input: string): string {
  return input.replace(/\D/g, '');
}

// iOS shows a "Done" accessory bar above the number pad by default because the
// numeric keyboard has no return key. We reference an empty InputAccessoryView
// so that bar doesn't render (on Android this ID is simply ignored).
const NO_ACCESSORY_ID = 'barcode-no-accessory';

function isValidUpc(input: string): boolean {
  const digits = normalizeBarcode(input);
  return digits.length >= 8 && digits.length <= 13;
}

export default function ScanScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { height: winH, width: winW } = useWindowDimensions();
  const { userId } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [flashOn, setFlashOn] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [upc, setUpc] = useState('');
  const [manualError, setManualError] = useState('');
  const lastScanAt = useRef(0);
  const mountedRef = useRef(true);
  const barcodeInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const scan = useScan(userId);
  const processing = scan.isPending;

  const scanLineProgress = useSharedValue(0);
  const pulseProgress = useSharedValue(0);
  const sheetProgress = useSharedValue(0);
  const keyboardOffset = useSharedValue(0);

  useEffect(() => {
    scanLineProgress.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    pulseProgress.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulseProgress, scanLineProgress]);

  useEffect(() => {
    sheetProgress.value = withTiming(sheetExpanded ? 1 : 0, {
      duration: 380,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
    });
    if (sheetExpanded) {
      // autoFocus on a TextInput inside an Animated.View races with the sheet
      // slide-in and silently drops the keyboard show. Focus explicitly after
      // the animation finishes so the number pad always pops.
      const handle = setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 420);
      return () => clearTimeout(handle);
    }
    return undefined;
  }, [sheetExpanded, sheetProgress]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates?.height ?? 0;
      const SHEET_BELOW_INPUT = 144;
      const lift = Math.max(0, h - SHEET_BELOW_INPUT);
      keyboardOffset.value = withTiming(lift, {
        duration: e.duration ?? 250,
        easing: Easing.out(Easing.quad),
      });
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      keyboardOffset.value = withTiming(0, {
        duration: e.duration ?? 250,
        easing: Easing.out(Easing.quad),
      });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset]);

  const scanLineStyle = useAnimatedStyle(() => {
    const travel = RETICLE_H - 20;
    return {
      transform: [{ translateY: interpolate(scanLineProgress.value, [0, 1], [-20, travel]) }],
    };
  });

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseProgress.value, [0, 1], [0.6, 1]),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    height: interpolate(sheetProgress.value, [0, 1], [90, 290]),
    transform: [{ translateY: -keyboardOffset.value }],
  }));

  const restartScanning = useCallback(() => {
    lastScanAt.current = 0;
  }, []);

  const submitBarcode = useCallback(
    async (rawBarcode: string, opts: { fromCamera: boolean }) => {
      const cleaned = normalizeBarcode(rawBarcode);
      if (!isValidUpc(cleaned)) {
        const msg = 'Please enter a barcode with 8 to 13 digits.';
        if (opts.fromCamera) {
          Alert.alert('Invalid barcode', msg);
        } else {
          setManualError(msg);
        }
        return;
      }

      setManualError('');
      if (opts.fromCamera && Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      try {
        await scan.mutateAsync({ barcode: cleaned });
        if (!mountedRef.current) {
          return;
        }
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.replace({ pathname: '/product/[barcode]', params: { barcode: cleaned } });
      } catch (e) {
        if (!mountedRef.current) {
          return;
        }
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        if (e instanceof ApiError && e.status === 404) {
          Alert.alert(
            'Product not found',
            'Product not in database. Try manual entry.',
            [{ text: 'OK', onPress: restartScanning }],
          );
          return;
        }
        if (e instanceof ApiError && e.status === 409) {
          Alert.alert(
            'Set up your profile first',
            'Add your health profile so we can personalise scores.',
            [
              { text: 'Cancel', style: 'cancel', onPress: restartScanning },
              {
                text: 'Open profile',
                onPress: () => router.replace('/(tabs)/profile'),
              },
            ],
          );
          return;
        }
        const message = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
        Alert.alert('Scan failed', message, [{ text: 'OK', onPress: restartScanning }]);
      }
    },
    [restartScanning, router, scan],
  );

  const onBarcode = useCallback(
    (data: string) => {
      const now = Date.now();
      if (now - lastScanAt.current < 2500 || processing) {
        return;
      }
      lastScanAt.current = now;
      void submitBarcode(data, { fromCamera: true });
    },
    [processing, submitBarcode],
  );

  if (!permission) {
    return (
      <View style={[styles.permWait, { paddingTop: insets.top + 24 }]}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permDenied, { paddingTop: insets.top + 48 }]}>
        <Text style={styles.permDeniedTitle}>Camera access is needed</Text>
        <Text style={styles.permDeniedBody}>
          Allow NutriCheck to use your camera so we can read product barcodes.
        </Text>
        <Pressable onPress={() => void requestPermission()} style={styles.permBtn}>
          <Text style={styles.permBtnText}>Grant permission</Text>
        </Pressable>
        {!permission.canAskAgain ? (
          <Pressable onPress={() => void Linking.openSettings()} style={styles.permBtnSecondary}>
            <Text style={styles.permBtnSecondaryText}>Open system settings</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => router.back()} style={styles.permGhost}>
          <Text style={styles.permGhostText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // Only one camera preview at a time; keep sessions healthy in Expo Go / stack nav.
  if (!isFocused) {
    return <View style={styles.root} />;
  }

  const darkTokens = tokens.dark;
  const reticleCenterY = winH * 0.4;
  const reticleTop = reticleCenterY - RETICLE_H / 2;
  const reticleBottom = reticleCenterY + RETICLE_H / 2;
  const reticleLeft = (winW - RETICLE_W) / 2;
  const sideW = reticleLeft;
  const submitEnabled = isValidUpc(upc) && !processing;

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashOn}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
        onBarcodeScanned={processing ? undefined : ({ data }) => onBarcode(data)}
        onMountError={({ message }) => {
          Alert.alert(
            'Camera error',
            message || 'Could not start the camera. On iOS Simulator there is no camera; use a real device, or try closing and reopening the Scan screen.',
            [{ text: 'OK' }],
          );
        }}
      />

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.dim, { top: 0, left: 0, right: 0, height: reticleTop }]} />
        <View style={[styles.dim, { top: reticleBottom, left: 0, right: 0, bottom: 0 }]} />
        <View style={[styles.dim, { top: reticleTop, left: 0, width: sideW, height: RETICLE_H }]} />
        <View
          style={[styles.dim, { top: reticleTop, right: 0, width: sideW, height: RETICLE_H }]}
        />
      </View>

      <View
        pointerEvents="none"
        style={[styles.reticle, { top: reticleTop, left: reticleLeft }]}
      >
        <View style={[styles.corner, styles.cornerTL]} />
        <View style={[styles.corner, styles.cornerTR]} />
        <View style={[styles.corner, styles.cornerBL]} />
        <View style={[styles.corner, styles.cornerBR]} />
        {!processing ? (
          <Animated.View style={[styles.scanLine, scanLineStyle]}>
            <View style={styles.scanLineCore} />
          </Animated.View>
        ) : null}
      </View>

      <View pointerEvents="none" style={[styles.scanLabel, { top: reticleBottom + 24 }]}>
        <Animated.Text style={[styles.scanLabelText, pulseStyle]}>
          {processing ? 'Processing…' : 'Scanning…'}
        </Animated.Text>
      </View>

      <View style={[styles.topbar, { top: Math.max(insets.top / 2, 6) }]}>
        <ToolbarButton onPress={() => router.back()}>
          <X size={16} color="#FFFFFF" strokeWidth={2.5} />
        </ToolbarButton>
        <ToolbarButton onPress={() => setFlashOn((f) => !f)} active={flashOn}>
          {flashOn ? (
            <Zap size={16} color="#FFFFFF" strokeWidth={2.5} />
          ) : (
            <ZapOff size={16} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
          )}
        </ToolbarButton>
      </View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 60 : 0}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(28,28,30,0.85)' }]} />

        {/*
          Collapsed: whole surface is a Pressable to expand.
          Expanded: plain View. The Pressable wrapper swallows taps into the
          TextInput on some devices and silently eats the keyboard-show event.
        */}
        {!sheetExpanded ? (
          <Pressable
            onPress={() => setSheetExpanded(true)}
            style={styles.sheetInner}
          >
            <View style={styles.sheetGrabber} />
            <View style={styles.sheetCollapsedLabel}>
              <Text style={styles.sheetCollapsedText}>Enter barcode manually</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.sheetInner}>
            <View style={styles.sheetGrabber} />
            <View style={styles.sheetExpanded}>
              <View style={styles.sheetTitleRow}>
                <Text style={styles.sheetTitle}>Having trouble scanning?</Text>
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setSheetExpanded(false);
                    setManualError('');
                    setUpc('');
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.sheetCancel}>Cancel</Text>
                </Pressable>
              </View>
              <Text style={styles.sheetSub}>Enter the barcode manually (8 to 13 digits)</Text>
              {manualError ? <Text style={styles.sheetError}>{manualError}</Text> : null}
              <View style={styles.formRow}>
                <TextInput
                  ref={barcodeInputRef}
                  value={upc}
                  onChangeText={(v) => {
                    const digits = normalizeBarcode(v);
                    setUpc(digits);
                    if (manualError !== '') {
                      setManualError('');
                    }
                  }}
                  placeholder="Barcode number"
                  placeholderTextColor="rgba(235,235,245,0.30)"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  returnKeyType="done"
                  maxLength={13}
                  autoFocus
                  inputAccessoryViewID={Platform.OS === 'ios' ? NO_ACCESSORY_ID : undefined}
                  style={styles.input}
                />
                <Pressable
                  disabled={!submitEnabled}
                  onPress={() => void submitBarcode(upc, { fromCamera: false })}
                  style={[
                    styles.submitBtn,
                    {
                      backgroundColor: submitEnabled ? darkTokens.accent.brand : '#2C2C2E',
                    },
                  ]}
                >
                  {processing ? (
                    <ActivityIndicator color={darkTokens.label.onAccent} />
                  ) : (
                    <Text
                      style={[
                        styles.submitText,
                        {
                          color: submitEnabled
                            ? darkTokens.label.onAccent
                            : 'rgba(235,235,245,0.3)',
                        },
                      ]}
                    >
                      Submit
                    </Text>
                  )}
                </Pressable>
              </View>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setSheetExpanded(false);
                  // Swap the scanner for the Search tab in one motion so the
                  // transition feels like a horizontal slide rather than a
                  // modal dismiss followed by a separate tab change.
                  router.replace('/(tabs)/search');
                }}
                hitSlop={8}
                style={styles.sheetNameSearch}
              >
                <Text style={styles.sheetNameSearchText}>or search by product name →</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Animated.View>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={NO_ACCESSORY_ID}>
          <View style={{ height: 0 }} />
        </InputAccessoryView>
      ) : null}
    </View>
  );
}

function ToolbarButton({
  children,
  onPress,
  active,
}: {
  children: React.ReactNode;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={6} style={styles.toolbarBtn}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 30 : 0}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: active ? 'rgba(255,255,255,0.18)' : 'rgba(28,28,30,0.6)',
            borderRadius: 18,
          },
        ]}
      />
      <View style={styles.toolbarBtnInner}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  permWait: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  permDenied: { flex: 1, backgroundColor: '#000', paddingHorizontal: 24 },
  permDeniedTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  permDeniedBody: { color: 'rgba(235,235,245,0.6)', fontSize: 15, lineHeight: 22 },
  permBtn: {
    marginTop: 24,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 17 },
  permBtnSecondary: {
    marginTop: 12,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permBtnSecondaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  permGhost: { marginTop: 12, height: 50, alignItems: 'center', justifyContent: 'center' },
  permGhostText: { color: 'rgba(235,235,245,0.6)', fontSize: 15 },

  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.60)' },

  reticle: {
    position: 'absolute',
    width: RETICLE_W,
    height: RETICLE_H,
    overflow: 'hidden',
  },
  corner: { position: 'absolute', width: CORNER_LEN, height: CORNER_LEN },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_STROKE,
    borderLeftWidth: CORNER_STROKE,
    borderColor: '#FFFFFF',
    borderTopLeftRadius: CORNER_RADIUS,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_STROKE,
    borderRightWidth: CORNER_STROKE,
    borderColor: '#FFFFFF',
    borderTopRightRadius: CORNER_RADIUS,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_STROKE,
    borderLeftWidth: CORNER_STROKE,
    borderColor: '#FFFFFF',
    borderBottomLeftRadius: CORNER_RADIUS,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_STROKE,
    borderRightWidth: CORNER_STROKE,
    borderColor: '#FFFFFF',
    borderBottomRightRadius: CORNER_RADIUS,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 40,
  },
  scanLineCore: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 18,
    height: 3,
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  scanLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanLabelText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(235,235,245,0.6)',
  },

  topbar: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  toolbarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  toolbarBtnInner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetInner: {
    flex: 1,
    paddingTop: 8,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#545458',
  },
  sheetCollapsedLabel: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCollapsedText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: -0.24,
  },
  sheetExpanded: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.43,
  },
  sheetCancel: {
    fontSize: 15,
    color: 'rgba(235,235,245,0.6)',
  },
  sheetSub: {
    fontSize: 15,
    color: 'rgba(235,235,245,0.6)',
    marginBottom: 12,
    letterSpacing: -0.24,
  },
  sheetError: {
    fontSize: 13,
    color: '#FF453A',
    marginBottom: 10,
  },
  sheetNameSearch: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  sheetNameSearchText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34D399',
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#2C2C2E',
    color: '#FFFFFF',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  submitBtn: {
    width: 96,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
