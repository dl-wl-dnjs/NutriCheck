/**
 * Logo component — dual-theme aware.
 * - Dark logo (image-removebg-preview_(1).png) for dark mode
 * - Light logo (image-removebg-preview_(2).png) for light mode
 *
 * Usage: <Logo size={80} />   ← reads theme from context automatically
 *        <Logo size={80} theme="light" />  ← force a specific variant
 */

import darkLogoImage  from '../../imports/image-removebg-preview_(1).png';
import lightLogoImage from '../../imports/image-removebg-preview_(2).png';
import { useTheme } from '../ThemeContext';
import type { Theme } from '../tokens';

interface LogoProps {
  size?:      number;
  className?: string;
  /** Override the theme — omit to inherit from context */
  theme?:     Theme;
}

export function Logo({ size = 40, className = '', theme: themeProp }: LogoProps) {
  const { theme: ctxTheme } = useTheme();
  const activeTheme = themeProp ?? ctxTheme;
  const src = activeTheme === 'light' ? lightLogoImage : darkLogoImage;

  return (
    <img
      src={src}
      alt="NutriCheck logo"
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      className={className}
    />
  );
}

/** Logo + NutriCheck wordmark side by side */
export function LogoWithText({ size = 40, className = '', theme: themeProp }: LogoProps) {
  const { theme: ctxTheme } = useTheme();
  const activeTheme = themeProp ?? ctxTheme;
  const src = activeTheme === 'light' ? lightLogoImage : darkLogoImage;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={src}
        alt="NutriCheck logo"
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    </div>
  );
}
