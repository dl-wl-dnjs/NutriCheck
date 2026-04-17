import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react-native';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { scoreColor, useScreenTokens } from '../../hooks/useScreenTokens';
import { useAlternatives } from '../lib/hooks/useAlternatives';
import type { AlternativeItem } from '../lib/types';
import { buildNutritionGrid } from '../../utils/nutritionGrid';

type Alt = AlternativeItem;

function accentFor(alt: Alt, fallback: { green: string; amber: string; red: string }): string {
  if (alt.rating.avoid || alt.rating.label === 'AVOID' || alt.rating.label === 'Poor') {
    return fallback.red;
  }
  if (alt.rating.label === 'Fair') {
    return fallback.amber;
  }
  return fallback.green;
}

function colorMix(hex: string, alpha: number): string {
  // Accept #RRGGBB or shorter; fall back to hex with alpha suffix using rgba-encoded approach.
  // For tokens we already have (#10B981 / #34D399 / #FF9500 / #FF9F0A / #FF3B30 / #FF453A)
  // we can simply append a two-digit alpha or wrap in rgba.
  if (hex.startsWith('#') && (hex.length === 7 || hex.length === 4)) {
    const full =
      hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
    const r = parseInt(full.slice(1, 3), 16);
    const g = parseInt(full.slice(3, 5), 16);
    const b = parseInt(full.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return hex;
}

export default function AlternativesScreen() {
  const { productId, productName } = useLocalSearchParams<{
    productId: string;
    productName?: string;
  }>();
  const router = useRouter();
  const { userId } = useAuth();
  const C = useScreenTokens();
  const id = typeof productId === 'string' ? productId : productId?.[0];
  const { data, isLoading, isError, refetch } = useAlternatives(userId, id ?? null, 5);
  const items: Alt[] = data?.items ?? [];
  const note = data?.note ?? null;

  const titleName =
    typeof productName === 'string' ? productName : productName?.[0] ?? 'this product';

  const navBar = (
    <View style={styles.navbar}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        style={styles.navBack}
        accessibilityLabel="Back"
        accessibilityRole="button"
      >
        <ChevronLeft size={20} color={C.green} strokeWidth={2} />
      </Pressable>
      <View style={{ alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: C.primary,
            letterSpacing: -0.43,
          }}
        >
          Healthier alternatives
        </Text>
        {items.length > 0 ? (
          <Text style={{ fontSize: 11, color: C.secondary }}>
            {items.length} option{items.length === 1 ? '' : 's'} found
          </Text>
        ) : null}
      </View>
      <View style={{ width: 44 }} />
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: C.pageBg }}
        edges={['top', 'left', 'right']}
      >
        {navBar}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.green} size="large" />
          <Text style={{ color: C.secondary, marginTop: 16 }}>
            Finding healthier alternatives…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: C.pageBg }}
        edges={['top', 'left', 'right']}
      >
        {navBar}
        <View style={styles.emptyWrap}>
          <AlertTriangle size={64} color={C.red} />
          <Text style={[styles.emptyTitle, { color: C.primary }]}>
            Couldn&apos;t load alternatives
          </Text>
          <Text style={[styles.emptyBody, { color: C.secondary }]}>
            Check your connection and try again.
          </Text>
          <Pressable
            onPress={() => void refetch()}
            style={[styles.primaryBtn, { backgroundColor: C.green }]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 17 }}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: C.pageBg }}
        edges={['top', 'left', 'right']}
      >
        {navBar}
        <View style={styles.emptyWrap}>
          <AlertTriangle size={64} color={C.amber} />
          <Text style={[styles.emptyTitle, { color: C.primary }]}>No alternatives found</Text>
          <Text style={[styles.emptyBody, { color: C.secondary }]}>
            {note ??
              `We couldn't find better-scoring options for ${titleName} right now.`}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.primaryBtn, { backgroundColor: C.green }]}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 17 }}>
              Back to product
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.pageBg }} edges={['top', 'left', 'right']}>
      {navBar}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {items.map((alt, index) => {
          const accent =
            alt.rating.avoid || alt.rating.label === 'AVOID'
              ? C.red
              : scoreColor(alt.rating.score, C.theme) ?? accentFor(alt, C);
          const nutrition = buildNutritionGrid(alt.product).slice(0, 3);
          return (
            <View
              key={alt.product.id}
              style={[
                styles.card,
                {
                  backgroundColor: C.cardBg,
                  borderColor: C.dark ? 'transparent' : C.separatorLight,
                  borderWidth: C.dark ? 0 : StyleSheet.hairlineWidth,
                },
                C.shadow,
              ]}
            >
              {/* Rank header */}
              <View
                style={[
                  styles.rankHeader,
                  {
                    backgroundColor: colorMix(accent, 0.13),
                    borderBottomColor: colorMix(accent, 0.27),
                  },
                ]}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: accent }}>
                  #{index + 1} Recommended
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <Text style={{ fontSize: 28, fontWeight: '700', color: accent }}>
                    {alt.rating.score}
                  </Text>
                  <Text style={{ fontSize: 13, color: C.secondary }}>/ 100</Text>
                </View>
              </View>

              {alt.product.image_url ? (
                <View style={[styles.heroWrap, { backgroundColor: C.elevated }]}>
                  <Image
                    source={{ uri: alt.product.image_url }}
                    style={styles.hero}
                    resizeMode="contain"
                    accessible
                    accessibilityLabel={alt.product.name}
                  />
                </View>
              ) : null}

              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: C.primary, marginBottom: 2 }}>
                  {alt.product.name}
                </Text>
                {alt.product.brand ? (
                  <Text style={{ fontSize: 13, color: C.secondary, marginBottom: 12 }}>
                    {alt.product.brand}
                  </Text>
                ) : (
                  <View style={{ height: 12 }} />
                )}

                {alt.suitability_note ? (
                  <View
                    style={[
                      styles.suitability,
                      {
                        backgroundColor: C.greenTint,
                        borderColor: C.dark ? 'rgba(52,211,153,0.25)' : 'rgba(16,185,129,0.25)',
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 13, color: C.green, lineHeight: 18 }}>
                      {alt.suitability_note}
                    </Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                  <View
                    style={[
                      styles.ratingChip,
                      { backgroundColor: colorMix(accent, 0.13) },
                    ]}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: accent }}>
                      {alt.rating.label}
                    </Text>
                  </View>
                </View>

                {nutrition.length > 0 ? (
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                    {nutrition.map((cell) => (
                      <View
                        key={cell.label}
                        style={[styles.nutriCell, { backgroundColor: C.elevated }]}
                      >
                        <Text style={{ fontSize: 11, color: C.secondary }}>{cell.label}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }}>
                          {cell.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/product/[barcode]',
                      params: { barcode: alt.product.barcode },
                    })
                  }
                  style={[styles.cardCta, { backgroundColor: accent }]}
                >
                  <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
                    View full details
                  </Text>
                  <ChevronRight size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          );
        })}

        <Text
          style={{
            fontSize: 13,
            color: C.tertiary,
            lineHeight: 18,
            paddingHorizontal: 4,
            paddingTop: 4,
          }}
        >
          Alternatives are ranked by how well they match your health conditions, allergens, and
          fitness goal.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navbar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  navBack: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  heroWrap: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    width: '100%',
    height: '100%',
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suitability: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ratingChip: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  nutriCell: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cardCta: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  emptyBody: { textAlign: 'center', marginBottom: 24 },
  primaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
});
