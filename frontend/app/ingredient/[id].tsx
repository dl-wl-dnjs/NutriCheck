import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, ChevronLeft, Info } from 'lucide-react-native';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useScreenTokens } from '../../hooks/useScreenTokens';

type ConcernLevel = 'high' | 'medium' | 'low' | 'none';

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function describe(name: string, level: ConcernLevel): string {
  const lower = name.toLowerCase();
  if (lower.includes('sugar') || lower.includes('syrup')) {
    return 'A sweetener that contributes quick-release carbohydrates. Heavily refined sugars cause blood-sugar spikes and add empty calories without providing fibre or vitamins.';
  }
  if (lower.includes('sodium') || lower.includes('salt')) {
    return 'Sodium is an electrolyte that balances fluids, but most processed foods contain far more than the body needs. High intake is linked to blood-pressure and kidney concerns.';
  }
  if (lower.includes('gluten') || lower.includes('wheat')) {
    return 'A protein found in wheat, barley and rye. Essential to avoid if you have celiac disease or non-celiac gluten sensitivity.';
  }
  if (lower.includes('palm oil')) {
    return 'A vegetable oil high in saturated fat. Production is also linked to deforestation, so many shoppers prefer alternatives.';
  }
  if (lower.includes('whole grain') || lower.includes('fibre') || lower.includes('fiber')) {
    return 'Whole grains and fibre support healthy digestion, keep you fuller for longer, and help regulate blood sugar.';
  }
  if (lower.includes('protein')) {
    return 'Protein supports muscle repair, satiety, and overall metabolism. A good marker for a more balanced product.';
  }
  if (level === 'high') {
    return 'This ingredient is often flagged in nutrition databases because it can contribute to negative health outcomes when consumed in excess.';
  }
  if (level === 'medium') {
    return 'This ingredient is generally considered moderate-impact. It’s worth keeping an eye on your total daily intake across products.';
  }
  if (level === 'low') {
    return 'This ingredient is usually a positive marker in a product and contributes to a better nutrition profile.';
  }
  return 'Details for this ingredient are still being expanded. Check back soon as our ingredient database grows.';
}

function metaFor(level: ConcernLevel) {
  if (level === 'high') {
    return { safe: false, label: 'High concern', short: 'Caution recommended' };
  }
  if (level === 'medium') {
    return { safe: false, label: 'Moderate concern', short: 'Keep an eye on your intake' };
  }
  if (level === 'low') {
    return { safe: true, label: 'Low concern', short: 'A positive ingredient marker' };
  }
  return { safe: true, label: 'Unknown', short: 'Not yet classified' };
}

export default function IngredientDetailScreen() {
  const router = useRouter();
  const { name, level, note } = useLocalSearchParams<{
    name?: string;
    level?: ConcernLevel | string;
    note?: string;
  }>();
  const C = useScreenTokens();

  const displayName = typeof name === 'string' && name.trim() ? titleCase(name) : 'Ingredient';
  const displayLevel: ConcernLevel =
    level === 'high' || level === 'medium' || level === 'low' ? level : 'none';
  const meta = metaFor(displayLevel);
  const impactColor =
    displayLevel === 'high' ? C.red : displayLevel === 'medium' ? C.amber : C.green;
  const chipBg =
    displayLevel === 'high'
      ? C.dangerTint
      : displayLevel === 'medium'
        ? C.warningTint
        : C.greenTint;

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
          Ingredient details
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {!meta.safe ? (
        <View
          style={[
            styles.banner,
            { backgroundColor: C.dangerTint, borderBottomColor: 'rgba(255,69,58,0.3)' },
          ]}
        >
          <AlertTriangle size={24} color={C.red} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.red }}>
              Caution recommended
            </Text>
            <Text style={{ fontSize: 12, color: C.secondary }}>{meta.short}</Text>
          </View>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Name card */}
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
          <Text
            style={{
              fontSize: 24,
              fontWeight: '700',
              color: C.primary,
              marginBottom: 6,
            }}
          >
            {displayName}
          </Text>
          <Text style={{ fontSize: 14, color: C.secondary, marginBottom: 12 }}>
            Classification based on your profile
          </Text>
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: chipBg,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: impactColor }}>
              {meta.label}
            </Text>
          </View>
        </View>

        {/* What is it */}
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
          <View style={styles.cardHeader}>
            <Info size={18} color={C.info} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.primary, marginLeft: 8 }}>
              What is it?
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: C.secondary, lineHeight: 20 }}>
            {typeof note === 'string' && note.trim() ? note : describe(displayName, displayLevel)}
          </Text>
        </View>

        {/* Impact */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: meta.safe ? C.cardBg : C.dangerTint,
              borderColor: meta.safe
                ? C.dark
                  ? 'transparent'
                  : C.separatorLight
                : 'rgba(255,69,58,0.3)',
              borderWidth: meta.safe ? (C.dark ? 0 : StyleSheet.hairlineWidth) : StyleSheet.hairlineWidth,
            },
            C.shadow,
          ]}
        >
          <View style={styles.cardHeader}>
            <AlertTriangle size={18} color={meta.safe ? C.green : C.red} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.primary, marginLeft: 8 }}>
              Impact on your profile
            </Text>
          </View>
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              fontWeight: meta.safe ? '400' : '600',
              color: meta.safe ? C.secondary : C.red,
            }}
          >
            {meta.safe
              ? 'This ingredient aligns with your current health profile.'
              : `Flagged based on your health profile — tap back to see other ingredients in this product.`}
          </Text>
        </View>

        <Pressable
          onPress={() => router.back()}
          style={[styles.primaryBtn, { backgroundColor: C.green }]}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 17 }}>
            Back to product analysis
          </Text>
        </Pressable>

        <Text
          style={{
            fontSize: 12,
            color: C.tertiary,
            textAlign: 'center',
            marginTop: 4,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
