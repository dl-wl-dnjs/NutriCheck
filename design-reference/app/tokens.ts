/**
 * NutriCheck Design Tokens — single source of truth.
 * Every screen, component, and style references these; no raw hex values in components.
 *
 * Usage:
 *   import { useTheme } from './ThemeContext';
 *   import { tokens, typography, spacing, radius, scoreColor } from './tokens';
 *
 *   const { theme } = useTheme();
 *   const t = tokens[theme];
 *   // t.surface.background, t.label.primary, t.accent.brand, …
 */

export type Theme = 'light' | 'dark';

// ── Surface tokens ────────────────────────────────────────────────────────────
// Ordered by elevation (background → primary → elevated).
export interface SurfaceTokens {
  background:     string; // page canvas
  primary:        string; // cards, sheets
  elevated:       string; // chips, interactive rows
  tintedSuccess:  string; // green tint (selected, success state)
  tintedDanger:   string; // red tint (error, allergen)
  tintedWarning:  string; // amber tint (caution)
}

// ── Label tokens ─────────────────────────────────────────────────────────────
export interface LabelTokens {
  primary:   string; // high-emphasis text
  secondary: string; // supporting text
  tertiary:  string; // placeholders, footers
  onAccent:  string; // text on colored fills (#FFFFFF always)
}

// ── Accent tokens ────────────────────────────────────────────────────────────
export interface AccentTokens {
  brand:        string; // primary interactive — shifts #10B981 → #34D399 in dark
  brandPressed: string; // pressed / border accent
  danger:       string; // destructive / allergen alert
  warning:      string; // caution / moderate score
  info:         string; // informational / links
}

// ── Separator tokens ─────────────────────────────────────────────────────────
export interface SeparatorTokens {
  opaque:    string; // section dividers between filled surfaces
  nonOpaque: string; // hairlines (nav bar on scroll, tab bar top)
}

// ── Shadow tokens ────────────────────────────────────────────────────────────
// Dark mode = none (depth from #1C1C1E on #000). Light mode = two-layer.
export interface ShadowTokens {
  card: string;
}

export interface ThemeTokens {
  surface:   SurfaceTokens;
  label:     LabelTokens;
  accent:    AccentTokens;
  separator: SeparatorTokens;
  shadow:    ShadowTokens;
}

// ── Token values per mode ────────────────────────────────────────────────────
export const tokens: Record<Theme, ThemeTokens> = {
  light: {
    surface: {
      background:    '#F2F2F7',
      primary:       '#FFFFFF',
      elevated:      '#FFFFFF',
      tintedSuccess: '#ECFDF5',
      tintedDanger:  '#FEF2F2',
      tintedWarning: '#FFFBEB',
    },
    label: {
      primary:   '#000000',
      secondary: 'rgba(60,60,67,0.60)',
      tertiary:  'rgba(60,60,67,0.30)',
      onAccent:  '#FFFFFF',
    },
    accent: {
      brand:        '#10B981',
      brandPressed: '#059669',
      danger:       '#FF3B30',
      warning:      '#FF9500',
      info:         '#007AFF',
    },
    separator: {
      opaque:    'rgba(60,60,67,0.18)',
      nonOpaque: 'rgba(60,60,67,0.10)',
    },
    shadow: {
      card: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
    },
  },

  dark: {
    surface: {
      background:    '#000000',
      primary:       '#1C1C1E',
      elevated:      '#2C2C2E',
      tintedSuccess: 'rgba(16,185,129,0.15)',
      tintedDanger:  'rgba(255,69,58,0.15)',
      tintedWarning: 'rgba(255,159,10,0.15)',
    },
    label: {
      primary:   '#FFFFFF',
      secondary: 'rgba(235,235,245,0.60)',
      tertiary:  'rgba(235,235,245,0.30)',
      onAccent:  '#FFFFFF',
    },
    accent: {
      brand:        '#34D399', // brighter on black
      brandPressed: '#10B981',
      danger:       '#FF453A',
      warning:      '#FF9F0A',
      info:         '#0A84FF',
    },
    separator: {
      opaque:    'rgba(84,84,88,0.65)',
      nonOpaque: 'rgba(84,84,88,0.30)',
    },
    shadow: {
      card: 'none',
    },
  },
};

// ── Typography tokens ────────────────────────────────────────────────────────
// Identical in both modes (only color changes via label tokens).
export const typography = {
  largeTitle:  { fontSize: '34px', fontWeight: 700, letterSpacing: '0.37px',  lineHeight: '41px' },
  title2:      { fontSize: '22px', fontWeight: 700, letterSpacing: '0.35px',  lineHeight: '28px' },
  headline:    { fontSize: '17px', fontWeight: 600, letterSpacing: '-0.43px', lineHeight: '22px' },
  body:        { fontSize: '17px', fontWeight: 400, letterSpacing: '-0.43px', lineHeight: '22px' },
  subheadline: { fontSize: '15px', fontWeight: 400, letterSpacing: '-0.23px', lineHeight: '20px' },
  footnote:    { fontSize: '13px', fontWeight: 400, letterSpacing: '-0.08px', lineHeight: '18px' },
} as const;

// ── Spacing tokens (8pt grid) ─────────────────────────────────────────────────
export const spacing = {
  xs:  4,   // 4pt
  sm:  8,   // 8pt
  md:  12,  // 12pt
  lg:  16,  // 16pt
  xl:  20,  // 20pt
  '2xl': 24,  // 24pt
  '3xl': 32,  // 32pt
} as const;

// ── Radius tokens ─────────────────────────────────────────────────────────────
export const radius = {
  sm:   '8px',
  md:   '12px',
  lg:   '14px',   // buttons
  xl:   '20px',   // cards
  full: '999px',  // chips, pills
} as const;

// ── Score colour helper ────────────────────────────────────────────────────────
// Scan score colours are semantic — do NOT theme-shift these. They must mean the
// same thing in both modes: green = good, amber = okay, red = bad.
// We use the theme's accent tokens so brightness adapts correctly.
export function scoreColor(score: number, theme: Theme): string {
  if (score >= 70) return tokens[theme].accent.brand;
  if (score >= 40) return tokens[theme].accent.warning;
  return tokens[theme].accent.danger;
}

// ── Tab bar ────────────────────────────────────────────────────────────────────
export const tabBar = {
  light: {
    background: 'rgba(242,242,247,0.72)',
    border:     'rgba(60,60,67,0.10)',
  },
  dark: {
    background: 'rgba(28,28,30,0.72)',
    border:     'rgba(84,84,88,0.30)',
  },
} as const;
