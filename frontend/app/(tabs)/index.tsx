import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Clock,
  Coffee,
  Leaf,
  ScanBarcode,
  ShoppingBag,
  User,
  Wheat,
} from 'lucide-react-native';
import type { ComponentType } from 'react';
import { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '../../components/Logo';
import { RecentScansSkeleton } from '../../components/RecentScansSkeleton';
import { useAuth } from '../../context/AuthContext';
import { useScreenTokens } from '../../hooks/useScreenTokens';
import { useProfile } from '../lib/hooks/useProfile';
import { useScanHistory } from '../lib/hooks/useScanHistory';

type IconType = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const PAGE_MARGIN = 16;
// The icon asset is ~228×274 (taller than wide). Set its height here;
// width is derived in Logo.tsx from the aspect ratio. The wordmark height
// is the cap-height of "NUTRICHECK" in pts (pre-cropped, no padding).
const HEADER_LOGO_SIZE = 52;
const HEADER_GAP = 14;
const WORDMARK_HEIGHT = 28;
const SUBTITLE_GAP = 6;
const HISTORY_LIMIT = 10;

function productCategory(name: string | null | undefined): { bg: string; Icon: IconType } {
  const lower = (name ?? '').toLowerCase();
  if (
    lower.includes('bread') ||
    lower.includes('wheat') ||
    lower.includes('flake') ||
    lower.includes('cereal')
  ) {
    return { bg: 'rgba(245,158,11,0.2)', Icon: Wheat };
  }
  if (lower.includes('organic') || lower.includes('flax') || lower.includes('granola')) {
    return { bg: 'rgba(16,185,129,0.2)', Icon: Leaf };
  }
  if (
    lower.includes('coffee') ||
    lower.includes('tea') ||
    lower.includes('drink') ||
    lower.includes('juice')
  ) {
    return { bg: 'rgba(139,92,246,0.2)', Icon: Coffee };
  }
  return { bg: 'rgba(99,102,241,0.2)', Icon: ShoppingBag };
}

function scoreBadgeColor(score: number, green: string, amber: string, red: string): string {
  if (score >= 70) {
    return green;
  }
  if (score >= 40) {
    return amber;
  }
  return red;
}

function titleCase(s: string): string {
  return s
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function HomeScreen() {
  const router = useRouter();
  const C = useScreenTokens();
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const profileQuery = useProfile(userId);
  const historyQuery = useScanHistory(userId, HISTORY_LIMIT);

  const history = historyQuery.data?.items ?? [];
  const profile = profileQuery.data ?? null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([profileQuery.refetch(), historyQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [historyQuery, profileQuery]);

  const cardShadow = C.dark
    ? null
    : ({
        boxShadow:
          '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.08)',
      } as const);

  const cardStyle = [styles.card, { backgroundColor: C.cardBg }, cardShadow];

  const profileLoading = profileQuery.isPending;
  const hasProfile =
    profile != null &&
    (profile.health_conditions.length > 0 ||
      (profile.fitness_goal != null && profile.fitness_goal !== ''));

  const historyLoading = historyQuery.isPending || (historyQuery.isFetching && history.length === 0);
  const historyError = historyQuery.isError && history.length === 0;

  const weeklyStats = useMemo(() => {
    if (history.length === 0) {
      return null;
    }
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = history.filter((s) => {
      const t = Date.parse(s.created_at);
      return Number.isFinite(t) && t >= weekAgo;
    });
    if (recent.length === 0) {
      return null;
    }
    let healthy = 0;
    let moderate = 0;
    let poor = 0;
    let total = 0;
    for (const s of recent) {
      const score = s.score ?? 0;
      total += score;
      if (score >= 70) {
        healthy += 1;
      } else if (score >= 40) {
        moderate += 1;
      } else {
        poor += 1;
      }
    }
    const avg = Math.round(total / recent.length);
    return { count: recent.length, avg, healthy, moderate, poor };
  }, [history]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: C.pageBg }}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: PAGE_MARGIN,
          paddingBottom: insets.bottom + 24,
        }}
        scrollIndicatorInsets={{ bottom: 83 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor={C.green}
          />
        }
      >
        <View style={styles.header}>
          <Logo size={HEADER_LOGO_SIZE} variant="iconOnly" />
          <View style={{ marginLeft: HEADER_GAP, flexShrink: 1 }}>
            <Logo size={WORDMARK_HEIGHT} variant="wordmark" />
            <Text
              style={{
                fontSize: 15,
                lineHeight: 20,
                color: C.secondary,
                marginTop: SUBTITLE_GAP,
              }}
            >
              Your personalized nutrition guide
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/scan')}
          accessibilityRole="button"
          accessibilityLabel="Scan barcode"
          style={({ pressed }) => [
            styles.scanHero,
            pressed && { transform: [{ scale: 0.98 }] },
          ]}
        >
          <View style={styles.scanGlowWrap}>
            <View
              pointerEvents="none"
              style={[styles.scanGlow, { shadowColor: C.green }]}
            />
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanCircle}
            >
              <ScanBarcode color="#FFFFFF" size={38} strokeWidth={2.5} />
            </LinearGradient>
          </View>
          <Text
            style={{
              fontSize: 21,
              fontWeight: '700',
              letterSpacing: 0.3,
              color: C.primary,
              marginTop: 12,
            }}
          >
            Scan Barcode
          </Text>
          <Text
            style={{
              fontSize: 14,
              lineHeight: 19,
              color: C.secondary,
              marginTop: 3,
            }}
          >
            Tap to scan a product
          </Text>
        </Pressable>

        <View style={[cardStyle, { marginBottom: 12 }]}>
          <View style={styles.cardHeader}>
            <User size={18} color={C.green} strokeWidth={2.5} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                letterSpacing: -0.4,
                color: C.primary,
                marginLeft: 8,
              }}
            >
              Your Profile
            </Text>
          </View>

          {profileLoading ? (
            <View style={{ gap: 10 }}>
              <View style={[styles.skeletonLine, { backgroundColor: C.elevated, width: '70%' }]} />
              <View style={[styles.skeletonLine, { backgroundColor: C.elevated, width: '50%' }]} />
              <View
                style={[
                  styles.skeletonLine,
                  { backgroundColor: C.elevated, width: '100%', height: 36, marginTop: 4 },
                ]}
              />
            </View>
          ) : hasProfile && profile ? (
            <View style={{ flex: 1 }}>
              <View style={styles.profileRow}>
                <Text style={{ fontSize: 14, color: C.secondary }}>Health Conditions</Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: C.primary,
                    maxWidth: 200,
                    textAlign: 'right',
                  }}
                >
                  {profile.health_conditions.length > 0
                    ? profile.health_conditions.slice(0, 2).map(titleCase).join(', ')
                    : 'None'}
                </Text>
              </View>
              <View style={styles.profileRow}>
                <Text style={{ fontSize: 14, color: C.secondary }}>Fitness Goal</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.primary }}>
                  {profile.fitness_goal ? titleCase(profile.fitness_goal) : 'Not set'}
                </Text>
              </View>
              <Pressable
                onPress={() => router.push('/(tabs)/profile')}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: C.green },
                  pressed && { backgroundColor: C.greenPressed },
                ]}
              >
                <Text style={{ color: C.onAccent, fontSize: 15, fontWeight: '600' }}>
                  Edit Profile
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 18,
                  color: C.secondary,
                  marginBottom: 12,
                }}
              >
                Set up your profile for personalized scores
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/profile')}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: C.green },
                  pressed && { backgroundColor: C.greenPressed },
                ]}
              >
                <Text style={{ color: C.onAccent, fontSize: 15, fontWeight: '600' }}>
                  Set up profile
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={[cardStyle, { marginBottom: 12 }]}>
          <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Clock size={18} color={C.green} strokeWidth={2.5} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  letterSpacing: -0.4,
                  color: C.primary,
                  marginLeft: 8,
                }}
              >
                Recent Scans
              </Text>
            </View>
            {history.length > 0 ? (
              <Pressable hitSlop={6}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: C.green }}>See All</Text>
              </Pressable>
            ) : null}
          </View>

          {historyLoading ? (
            <RecentScansSkeleton />
          ) : historyError ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <AlertTriangle size={28} color={C.red} strokeWidth={2} />
              <Text
                style={{
                  fontSize: 14,
                  color: C.secondary,
                  textAlign: 'center',
                  marginTop: 8,
                  marginBottom: 12,
                }}
              >
                Couldn&apos;t load recent scans.
              </Text>
              <Pressable
                onPress={() => void historyQuery.refetch()}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: C.green,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.green }}>Try again</Text>
              </Pressable>
            </View>
          ) : history.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 4 }}
            >
              {history.slice(0, 8).map((scan) => {
                const { bg: catBg, Icon: CatIcon } = productCategory(scan.product_name);
                const badgeColor = scoreBadgeColor(scan.score, C.green, C.amber, C.red);
                return (
                  <Pressable
                    key={scan.id}
                    onPress={() =>
                      router.push({
                        pathname: '/product/[barcode]',
                        params: { barcode: scan.barcode },
                      })
                    }
                    style={[styles.recentCard, { backgroundColor: C.pageBg }]}
                  >
                    <View style={[styles.recentThumb, { backgroundColor: catBg }]}>
                      {scan.product_image_url ? (
                        <Image
                          source={{ uri: scan.product_image_url }}
                          style={StyleSheet.absoluteFillObject}
                          resizeMode="cover"
                          accessibilityLabel={scan.product_name ?? scan.barcode}
                        />
                      ) : (
                        <CatIcon size={28} color={C.primary} />
                      )}
                      <View style={[styles.scoreBubble, { backgroundColor: badgeColor }]}>
                        <Text style={styles.scoreBubbleText}>{scan.score}</Text>
                      </View>
                    </View>
                    <View style={styles.recentLabel}>
                      <Text
                        numberOfLines={2}
                        style={{
                          fontSize: 11,
                          color: C.primary,
                          fontWeight: '500',
                          lineHeight: 14,
                        }}
                      >
                        {scan.product_name?.trim() ? scan.product_name : scan.barcode}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
              }}
            >
              <ScanBarcode size={32} color={C.tertiary} strokeWidth={2} />
              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 20,
                  color: C.secondary,
                  textAlign: 'center',
                  marginTop: 12,
                }}
              >
                Scan your first product to see it here
              </Text>
            </View>
          )}
        </View>

        <View style={cardStyle}>
          <View style={styles.weeklyHeader}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 1.2,
                color: C.tertiary,
                textTransform: 'uppercase',
              }}
            >
              Last 7 days
            </Text>
            {weeklyStats ? (
              <Text style={{ fontSize: 13, color: C.secondary }}>
                {weeklyStats.count} {weeklyStats.count === 1 ? 'scan' : 'scans'}
              </Text>
            ) : null}
          </View>

          {weeklyStats ? (
            <View>
              <View style={styles.weeklyAvgRow}>
                <Text
                  style={{
                    fontSize: 40,
                    fontWeight: '700',
                    letterSpacing: -1.2,
                    color: C.primary,
                    lineHeight: 44,
                  }}
                >
                  {weeklyStats.avg}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: C.secondary,
                    marginLeft: 10,
                    marginBottom: 6,
                    flexShrink: 1,
                  }}
                >
                  average health score
                </Text>
              </View>

              <View style={[styles.weeklyBar, { backgroundColor: C.elevated }]}>
                {weeklyStats.healthy > 0 ? (
                  <View
                    style={{
                      flex: weeklyStats.healthy,
                      backgroundColor: C.green,
                    }}
                  />
                ) : null}
                {weeklyStats.moderate > 0 ? (
                  <View
                    style={{
                      flex: weeklyStats.moderate,
                      backgroundColor: C.amber,
                    }}
                  />
                ) : null}
                {weeklyStats.poor > 0 ? (
                  <View
                    style={{
                      flex: weeklyStats.poor,
                      backgroundColor: C.red,
                    }}
                  />
                ) : null}
              </View>

              <View style={styles.weeklyLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: C.green }]} />
                  <Text style={[styles.legendText, { color: C.secondary }]}>
                    {weeklyStats.healthy} healthy
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: C.amber }]} />
                  <Text style={[styles.legendText, { color: C.secondary }]}>
                    {weeklyStats.moderate} moderate
                  </Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: C.red }]} />
                  <Text style={[styles.legendText, { color: C.secondary }]}>
                    {weeklyStats.poor} poor
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <Text
              style={{
                fontSize: 14,
                lineHeight: 19,
                color: C.secondary,
                marginTop: 4,
              }}
            >
              No scans yet this week.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    paddingBottom: 22,
  },
  scanHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 20,
  },
  scanGlowWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanGlow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.34,
    shadowRadius: 36,
    elevation: 8,
  },
  scanCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 18,
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 26,
    marginBottom: 10,
  },
  primaryBtn: {
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  recentCard: {
    width: 114,
    borderRadius: 13,
    overflow: 'hidden',
  },
  recentThumb: {
    width: 114,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBubble: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBubbleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 13,
  },
  recentLabel: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
  },
  weeklyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  weeklyAvgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  weeklyBar: {
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  weeklyLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    columnGap: 16,
    rowGap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
