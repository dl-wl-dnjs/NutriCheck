import type { ViewStyle } from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { scoreColor, tabBarTokens, tokens, type ThemeName } from '../theme';

export interface ScreenTokens {
  pageBg: string;
  cardBg: string;
  elevated: string;
  primary: string;
  secondary: string;
  tertiary: string;
  onAccent: string;
  green: string;
  greenPressed: string;
  red: string;
  amber: string;
  info: string;
  greenTint: string;
  dangerTint: string;
  warningTint: string;
  separator: string;
  separatorLight: string;
  shadow: ViewStyle;
  navBg: string;
  tabBg: string;
  tabBorder: string;
  theme: ThemeName;
  dark: boolean;
}

export function useScreenTokens(): ScreenTokens {
  const { theme } = useTheme();
  const t = tokens[theme];
  const dark = theme === 'dark';

  return {
    pageBg: t.surface.background,
    cardBg: t.surface.primary,
    elevated: t.surface.elevated,
    primary: t.label.primary,
    secondary: t.label.secondary,
    tertiary: t.label.tertiary,
    onAccent: t.label.onAccent,
    green: t.accent.brand,
    greenPressed: t.accent.brandPressed,
    red: t.accent.danger,
    amber: t.accent.warning,
    info: t.accent.info,
    greenTint: t.surface.tintedSuccess,
    dangerTint: t.surface.tintedDanger,
    warningTint: t.surface.tintedWarning,
    separator: t.separator.opaque,
    separatorLight: t.separator.nonOpaque,
    shadow: t.shadow.card,
    navBg: t.surface.background,
    tabBg: tabBarTokens[theme].background,
    tabBorder: tabBarTokens[theme].border,
    theme,
    dark,
  };
}

export { scoreColor };
