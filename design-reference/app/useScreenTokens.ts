/**
 * useScreenTokens — drop-in replacement for the hardcoded `const C = {...}` blocks
 * that every screen used.  Import this + delete the old C block; every colour
 * will now react to the active theme from ThemeContext.
 *
 * Usage:
 *   const C = useScreenTokens();
 *   // C.pageBg, C.primary, C.green, C.elevated, C.shadow … all theme-aware
 */

import { useTheme } from './ThemeContext';
import { tokens, scoreColor, type Theme } from './tokens';

export interface ScreenTokens {
  // Surfaces
  pageBg:         string;
  cardBg:         string;   // was "cardSurface" — white on light, #1C1C1E on dark
  elevated:       string;   // chips, interactive rows
  // Labels
  primary:        string;
  secondary:      string;
  tertiary:       string;
  // Accents
  green:          string;   // accent/brand (shifts per mode)
  red:            string;   // accent/danger
  amber:          string;   // accent/warning
  info:           string;   // accent/info
  // Tinted backgrounds
  greenTint:      string;   // surface/tinted-success
  dangerTint:     string;   // surface/tinted-danger
  warningTint:    string;   // surface/tinted-warning
  // Separators
  separator:      string;   // opaque
  separatorLight: string;   // non-opaque
  // Shadows (string — use directly as boxShadow value)
  shadow:         string;
  // Nav & tab bar
  navBg:          string;   // flush with page background (no separate surface)
  tabBg:          string;   // blurred tab bar
  tabBorder:      string;   // top hairline on tab bar
  // Meta
  theme:          Theme;
  dark:           boolean;
}

export function useScreenTokens(): ScreenTokens {
  const { theme } = useTheme();
  const t    = tokens[theme];
  const dark = theme === 'dark';

  return {
    pageBg:         t.surface.background,
    cardBg:         t.surface.primary,
    elevated:       t.surface.elevated,
    primary:        t.label.primary,
    secondary:      t.label.secondary,
    tertiary:       t.label.tertiary,
    green:          t.accent.brand,
    red:            t.accent.danger,
    amber:          t.accent.warning,
    info:           t.accent.info,
    greenTint:      t.surface.tintedSuccess,
    dangerTint:     t.surface.tintedDanger,
    warningTint:    t.surface.tintedWarning,
    separator:      t.separator.opaque,
    separatorLight: t.separator.nonOpaque,
    shadow:         t.shadow.card,
    navBg:          t.surface.background,
    tabBg:          dark ? 'rgba(28,28,30,0.72)' : 'rgba(242,242,247,0.72)',
    tabBorder:      t.separator.nonOpaque,
    theme,
    dark,
  };
}

// Re-export scoreColor so screens don't need a separate import
export { scoreColor };
