import { StyleSheet, Text, View } from 'react-native';

import { scoreColor, useScreenTokens } from '../hooks/useScreenTokens';

type Props = {
  score: number;
  label: string;
  avoid: boolean;
  size?: number;
  numFontSize?: number;
  labelFontSize?: number;
  showLabel?: boolean;
};

function displayLabelFor(score: number, label: string, avoid: boolean) {
  if (avoid || label === 'AVOID') {
    return 'AVOID';
  }
  if (score >= 70) {
    return 'GOOD';
  }
  if (score >= 40) {
    return 'FAIR';
  }
  return 'POOR';
}

export function ScoreBadge({
  score,
  label,
  avoid,
  size = 52,
  numFontSize = 20,
  labelFontSize = 10,
  showLabel = false,
}: Props) {
  const C = useScreenTokens();
  const color = avoid || label === 'AVOID' ? C.red : scoreColor(score, C.theme);
  const displayLabel = displayLabelFor(score, label, avoid);

  return (
    <View style={showLabel ? styles.column : undefined}>
      <View
        style={[
          styles.wrap,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
            backgroundColor: C.cardBg,
          },
        ]}
      >
        <Text style={[styles.num, { fontSize: numFontSize, color }]}>{score}</Text>
      </View>
      {showLabel ? (
        <Text
          style={[styles.microLabel, { color, fontSize: labelFontSize }]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'center', gap: 4 },
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  num: { fontWeight: '700' },
  microLabel: {
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    maxWidth: 80,
    textAlign: 'center',
  },
});
