import Svg, { Circle } from 'react-native-svg';

import { useScreenTokens } from '../hooks/useScreenTokens';

type Props = {
  size: number;
  stroke: number;
  progress: number;
  color: string;
  trackColor?: string;
};

export function ScoreRing({ size, stroke, progress, color, trackColor }: Props) {
  const C = useScreenTokens();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const dash = c * clamped;
  const cx = size / 2;
  const cy = size / 2;
  const track = trackColor ?? C.separatorLight;

  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </Svg>
  );
}
