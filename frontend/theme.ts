import type { TextStyle, ViewStyle } from 'react-native';

export type ThemeName = 'light' | 'dark';

export interface SurfaceTokens {
  background: string;
  primary: string;
  elevated: string;
  tintedSuccess: string;
  tintedDanger: string;
  tintedWarning: string;
}

export interface LabelTokens {
  primary: string;
  secondary: string;
  tertiary: string;
  onAccent: string;
}

export interface AccentTokens {
  brand: string;
  brandPressed: string;
  danger: string;
  warning: string;
  info: string;
}

export interface SeparatorTokens {
  opaque: string;
  nonOpaque: string;
}

export interface ShadowTokens {
  card: ViewStyle;
}

export interface ThemeTokens {
  surface: SurfaceTokens;
  label: LabelTokens;
  accent: AccentTokens;
  separator: SeparatorTokens;
  shadow: ShadowTokens;
}

export const tokens: Record<ThemeName, ThemeTokens> = {
  light: {
    surface: {
      background: '#F2F2F7',
      primary: '#FFFFFF',
      elevated: '#FFFFFF',
      tintedSuccess: '#ECFDF5',
      tintedDanger: '#FEF2F2',
      tintedWarning: '#FFFBEB',
    },
    label: {
      primary: '#000000',
      secondary: 'rgba(60,60,67,0.60)',
      tertiary: 'rgba(60,60,67,0.30)',
      onAccent: '#FFFFFF',
    },
    accent: {
      brand: '#10B981',
      brandPressed: '#059669',
      danger: '#FF3B30',
      warning: '#FF9500',
      info: '#007AFF',
    },
    separator: {
      opaque: 'rgba(60,60,67,0.18)',
      nonOpaque: 'rgba(60,60,67,0.10)',
    },
    shadow: {
      card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 3,
      },
    },
  },

  dark: {
    surface: {
      background: '#000000',
      primary: '#1C1C1E',
      elevated: '#2C2C2E',
      tintedSuccess: 'rgba(16,185,129,0.15)',
      tintedDanger: 'rgba(255,69,58,0.15)',
      tintedWarning: 'rgba(255,159,10,0.15)',
    },
    label: {
      primary: '#FFFFFF',
      secondary: 'rgba(235,235,245,0.60)',
      tertiary: 'rgba(235,235,245,0.30)',
      onAccent: '#FFFFFF',
    },
    accent: {
      brand: '#34D399',
      brandPressed: '#10B981',
      danger: '#FF453A',
      warning: '#FF9F0A',
      info: '#0A84FF',
    },
    separator: {
      opaque: 'rgba(84,84,88,0.65)',
      nonOpaque: 'rgba(84,84,88,0.30)',
    },
    shadow: {
      card: {},
    },
  },
};

export const tabBarTokens = {
  light: {
    background: 'rgba(255,255,255,0.72)',
    border: 'rgba(60,60,67,0.10)',
  },
  dark: {
    background: 'rgba(28,28,30,0.72)',
    border: 'rgba(84,84,88,0.30)',
  },
} as const;

export const typography: Record<
  'largeTitle' | 'title2' | 'headline' | 'body' | 'subheadline' | 'footnote',
  TextStyle
> = {
  largeTitle: { fontSize: 34, fontWeight: '700', letterSpacing: 0.37, lineHeight: 41 },
  title2: { fontSize: 22, fontWeight: '700', letterSpacing: 0.35, lineHeight: 28 },
  headline: { fontSize: 17, fontWeight: '600', letterSpacing: -0.43, lineHeight: 22 },
  body: { fontSize: 17, fontWeight: '400', letterSpacing: -0.43, lineHeight: 22 },
  subheadline: { fontSize: 15, fontWeight: '400', letterSpacing: -0.23, lineHeight: 20 },
  footnote: { fontSize: 13, fontWeight: '400', letterSpacing: -0.08, lineHeight: 18 },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export function scoreColor(score: number, theme: ThemeName): string {
  if (score >= 70) {
    return tokens[theme].accent.brand;
  }
  if (score >= 40) {
    return tokens[theme].accent.warning;
  }
  return tokens[theme].accent.danger;
}

export interface ScoreVisual {
  color: string;
  ringColor: string;
  displayLabel: 'GOOD' | 'FAIR' | 'POOR' | 'AVOID';
}

export function scoreVisual(score: number, label: string, avoid: boolean, theme: ThemeName = 'light'): ScoreVisual {
  const t = tokens[theme];
  if (avoid || label === 'AVOID') {
    return { color: t.accent.danger, ringColor: t.accent.danger, displayLabel: 'AVOID' };
  }
  if (score >= 70) {
    return { color: t.accent.brand, ringColor: t.accent.brand, displayLabel: 'GOOD' };
  }
  if (score >= 40) {
    return { color: t.accent.warning, ringColor: t.accent.warning, displayLabel: 'FAIR' };
  }
  return { color: t.accent.danger, ringColor: t.accent.danger, displayLabel: 'POOR' };
}

