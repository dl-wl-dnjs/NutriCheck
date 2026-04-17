import { Image, type ImageStyle, type StyleProp } from 'react-native';

import { useScreenTokens } from '../hooks/useScreenTokens';

const LOCKUP_LIGHT = require('../assets/logo/nutricheck-lockup.png');
const LOCKUP_DARK = require('../assets/logo/nutricheck-dark.png');
const ICON_LIGHT = require('../assets/logo/icon-light.png');
const ICON_DARK = require('../assets/logo/icon-dark.png');
const WORDMARK_LIGHT = require('../assets/logo/wordmark-light.png');
const WORDMARK_DARK = require('../assets/logo/wordmark-dark.png');

// Source PNG aspect ratios (width / height). Pre-cropped so the visible
// content is flush against every edge — no transparent padding, so anything
// aligned to a Logo's container edges will line up with the actual artwork.
const LOCKUP_LIGHT_RATIO = 374 / 356;
const LOCKUP_DARK_RATIO = 541 / 461;
const ICON_LIGHT_RATIO = 228 / 274;
const ICON_DARK_RATIO = 269 / 280;
const WORDMARK_LIGHT_RATIO = 374 / 53;
const WORDMARK_DARK_RATIO = 441 / 60;

type Variant = 'lockup' | 'iconOnly' | 'wordmark';

type Props = {
  /** Height of the rendered logo in points. */
  size?: number;
  variant?: Variant;
  style?: StyleProp<ImageStyle>;
};

export function Logo({ size = 40, variant = 'lockup', style }: Props) {
  const { dark } = useScreenTokens();

  let source;
  let ratio: number;
  if (variant === 'iconOnly') {
    source = dark ? ICON_DARK : ICON_LIGHT;
    ratio = dark ? ICON_DARK_RATIO : ICON_LIGHT_RATIO;
  } else if (variant === 'wordmark') {
    source = dark ? WORDMARK_DARK : WORDMARK_LIGHT;
    ratio = dark ? WORDMARK_DARK_RATIO : WORDMARK_LIGHT_RATIO;
  } else {
    source = dark ? LOCKUP_DARK : LOCKUP_LIGHT;
    ratio = dark ? LOCKUP_DARK_RATIO : LOCKUP_LIGHT_RATIO;
  }

  const height = size;
  const width = Math.round(size * ratio);

  return (
    <Image
      source={source}
      style={[{ width, height, resizeMode: 'contain' }, style]}
      accessibilityRole="image"
      accessibilityLabel="NutriCheck"
    />
  );
}
