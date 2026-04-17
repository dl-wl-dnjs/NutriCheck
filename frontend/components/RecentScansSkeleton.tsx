import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useScreenTokens } from '../hooks/useScreenTokens';

export function RecentScansSkeleton() {
  const C = useScreenTokens();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true);
  }, [pulse]);

  const shimmer = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.35,
  }));

  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingTop: 6 }}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            {
              width: 120,
              height: 108,
              borderRadius: 14,
              backgroundColor: C.elevated,
            },
            shimmer,
          ]}
        />
      ))}
    </View>
  );
}
