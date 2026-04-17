import { PixelRatio, useWindowDimensions } from 'react-native';

const BASE_WIDTH = 390;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

/**
 * Scale spacing and sizes from an iPhone 14–class width baseline so layouts stay proportional on smaller and larger phones.
 */
export function useLayoutScale() {
  const { width, height } = useWindowDimensions();
  const scale = clamp(width / BASE_WIDTH, 0.82, 1.22);
  const s = (value: number) =>
    Math.max(1, Math.round(PixelRatio.roundToNearestPixel(value * scale)));
  return { width, height, scale, s };
}
