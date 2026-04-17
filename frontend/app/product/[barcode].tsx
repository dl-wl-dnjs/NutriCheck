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

import { ScoreRing } from '../../components/ScoreRing';
import { useAuth } from '../../context/AuthContext';
import { scoreColor, useScreenTokens } from '../../hooks/useScreenTokens';
import type { ProductOut, RatingOut } from '../lib/types';
import { ApiError } from '../lib/api';
import { useScanByBarcode } from '../lib/hooks/useScan';
import { buildNutritionGrid } from '../../utils/nutritionGrid';

function allergenBannerText(rating: RatingOut): string | null {
  if (!rating.avoid) {
    return null;
  }
  const r = rating.avoid_reason ?? '';
  const m = r.match(/allergen:\s*(.+)$/i);
  if (m?.[1]) {
    return `Contains ${m[1].trim()}`;
  }
  if (r.trim()) {
    return r;
  }
  return 'Contains flagged ingredient';
}

function parseIngredients(summary: string | null): string[] {
  if (!summary) {
    return [];
  }
  return summary
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function ingredientConcernLevel(name: string): 'high' | 'medium' | 'low' | 'none' {
  const lower = name.toLowerCase();
  if (
    lower.includes('high fructose') ||
    lower.includes('partially hydrogenated') ||
    lower.includes('trans fat')
  ) {
    return 'high';
  }
  if (
    lower.includes('sugar') ||
    lower.includes('syrup') ||
    lower.includes('sodium') ||
    lower.includes('salt') ||
    lower.includes('palm oil')
  ) {
    return 'medium';
  }
  if (
    lower.includes('whole') ||
    lower.includes('organic') ||
    lower.includes('fibre') ||
    lower.includes('fiber') ||
    lower.includes('protein')
  ) {
    return 'low';
  }
  return 'none';
}

export default function ProductResultsScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const router = useRouter();
  const { userId } = useAuth();
  const C = useScreenTokens();

  const code = typeof barcode === 'string' ? barcode : barcode?.[0] ?? '';
  const normalized = code.replace(/\D/g, '');

  const query = useScanByBarcode(userId, normalized);

  if (query.isPending) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.pageBg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.green} size="large" />
          <Text style={{ color: C.secondary, marginTop: 16 }}>Analysing product…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (query.isError || !query.data) {
    const err = query.error;
    const notFound = err instanceof ApiError && err.status === 404;
    const needsProfile = err instanceof ApiError && err.status === 409;
    const title = notFound ? 'Product not found' : needsProfile ? 'Set up your profile first' : 'Analysis failed';
    const body = notFound
      ? 'Unable to find this product in the database.'
      : needsProfile
        ? 'Add your health profile so we can personalise the score.'
        : err instanceof Error
          ? err.message
          : 'Something went wrong while analysing this product.';
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: C.pageBg }}
        edges={['top', 'left', 'right']}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
          }}
        >
          <AlertTriangle size={64} color={C.red} />
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: C.primary,
              marginTop: 16,
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            {title}
          </Text>
          <Text
            style={{ color: C.secondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 }}
          >
            {body}
          </Text>
          {needsProfile ? (
            <Pressable
              onPress={() => router.replace('/(tabs)/profile')}
              style={{
                backgroundColor: C.green,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 14,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 17 }}>
                Open profile
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void query.refetch()}
              style={{
                backgroundColor: C.green,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 14,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 17 }}>Try again</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => router.replace('/scan')}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 24,
            }}
          >
            <Text style={{ color: C.green, fontWeight: '600', fontSize: 15 }}>
              Scan another product
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const data = query.data;
  const product: ProductOut = data.product;
  const rating: RatingOut = data.rating;
  const isAvoid = rating.avoid || rating.tier === 'bad';
  const scoreCol = isAvoid && rating.avoid ? C.red : scoreColor(rating.score, C.theme);
  const banner = allergenBannerText(rating);
  const grid = buildNutritionGrid(product);
  const ingredients = parseIngredients(product.simplified_summary ?? product.ingredients_text);
  // Always offer alternatives — even AVOID products (allergen / celiac / top-tier)
  // benefit from a "what can I eat instead?" path.
  const ringProgress = rating.avoid ? 1 : rating.score / 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.pageBg }} edges={['top', 'left', 'right']}>
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
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: C.primary,
            letterSpacing: -0.43,
          }}
        >
          Product Analysis
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {rating.avoid ? (
        <View
          style={[
            styles.banner,
            { backgroundColor: C.dangerTint, borderBottomColor: 'rgba(255,69,58,0.3)' },
          ]}
        >
          <AlertTriangle size={24} color={C.red} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.red }}>
              AVOID THIS PRODUCT
            </Text>
            {banner ? (
              <Text style={{ fontSize: 12, color: C.secondary }}>{banner}</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View
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
          {product.image_url ? (
            <View style={[styles.hero, { backgroundColor: C.elevated }]}>
              <Image
                source={{ uri: product.image_url }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="contain"
                accessibilityLabel={product.name}
              />
            </View>
          ) : null}
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: C.primary,
              marginBottom: 4,
            }}
          >
            {product.name}
          </Text>
          {product.brand ? (
            <Text style={{ fontSize: 14, color: C.secondary, marginBottom: 20 }}>
              {product.brand}
            </Text>
          ) : (
            <View style={{ height: 20 }} />
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <View style={{ width: 112, height: 112 }}>
              <ScoreRing size={112} stroke={10} progress={ringProgress} color={scoreCol} />
              <View style={StyleSheet.absoluteFillObject}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 30, fontWeight: '700', color: scoreCol }}>
                    {rating.score}
                  </Text>
                  <Text style={{ fontSize: 11, color: C.secondary, fontWeight: '500' }}>
                    / 100
                  </Text>
                </View>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: scoreCol,
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {rating.avoid ? 'AVOID' : rating.label}
              </Text>
              <Text style={{ fontSize: 12, color: C.secondary, lineHeight: 18 }}>
                {rating.recommendation ?? 'Personalised for your health profile'}
              </Text>
            </View>
          </View>
        </View>

        {rating.warnings.length > 0 && !rating.avoid ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: C.warningTint,
                borderColor: C.dark ? 'rgba(255,159,10,0.3)' : 'rgba(255,149,0,0.3)',
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 }}>
              <AlertTriangle size={20} color={C.amber} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.amber }}>
                Health warnings
              </Text>
            </View>
            {rating.warnings.map((w) => (
              <Text
                key={w}
                style={{ fontSize: 13, color: C.amber, lineHeight: 18, marginBottom: 6 }}
              >
                • {w}
              </Text>
            ))}
          </View>
        ) : null}

        {ingredients.length > 0 ? (
          <View
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
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.primary, marginBottom: 16 }}>
              Ingredients
            </Text>
            <View style={{ gap: 8 }}>
              {ingredients.map((ing) => {
                const level = ingredientConcernLevel(ing);
                const dot =
                  level === 'high'
                    ? C.red
                    : level === 'medium'
                      ? C.amber
                      : level === 'low'
                        ? C.green
                        : C.tertiary;
                return (
                  <Pressable
                    key={ing}
                    onPress={() =>
                      router.push({
                        pathname: '/ingredient/[id]',
                        params: {
                          id: encodeURIComponent(ing.toLowerCase()),
                          name: ing,
                          level,
                        },
                      })
                    }
                    style={[styles.ingRow, { backgroundColor: C.elevated }]}
                  >
                    <View style={[styles.ingDot, { backgroundColor: dot }]} />
                    <Text
                      style={{ flex: 1, fontSize: 14, color: C.primary, fontWeight: '500' }}
                      numberOfLines={1}
                    >
                      {ing}
                    </Text>
                    <ChevronRight size={16} color={C.tertiary} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {grid.length > 0 ? (
          <View
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
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.primary, marginBottom: 16 }}>
              Nutrition (per 100 g)
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {grid.map((cell) => (
                <View
                  key={cell.label}
                  style={{
                    width: '48%',
                    backgroundColor: C.elevated,
                    padding: 12,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ fontSize: 11, color: C.secondary, marginBottom: 4 }}>
                    {cell.label}
                  </Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: C.primary }}>
                    {cell.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={() =>
            router.push({
              pathname: '/alternatives/[productId]',
              params: { productId: String(product.id), productName: product.name },
            })
          }
          style={[styles.primaryBtn, { backgroundColor: C.green }]}
        >
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFFFFF' }}>
            View healthier alternatives
          </Text>
          <ChevronRight size={18} color="#FFFFFF" />
        </Pressable>

        <Pressable
          onPress={() => router.replace('/scan')}
          style={[styles.ghostBtn, { borderColor: C.green }]}
        >
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.green }}>
            Scan another product
          </Text>
        </Pressable>

        <Text
          style={{
            fontSize: 12,
            color: C.tertiary,
            textAlign: 'center',
            marginTop: 8,
            lineHeight: 18,
          }}
        >
          Informational only — not medical advice.
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  card: {
    borderRadius: 20,
    padding: 20,
  },
  hero: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
  },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  ingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ghostBtn: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
