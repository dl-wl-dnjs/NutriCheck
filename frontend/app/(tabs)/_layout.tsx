import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { ScanBarcode, Search as SearchIcon, User } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { useScreenTokens } from '../../hooks/useScreenTokens';

const BAR_HEIGHT = 49;
const ICON_SIZE = 25;
const ICON_TOP = 7;
const LABEL_GAP = 3;
const HOME_INDICATOR_WIDTH = 134;
const HOME_INDICATOR_HEIGHT = 5;
const HOME_INDICATOR_BOTTOM = 8;

const ACTIVE_DARK = '#34D399';
const ACTIVE_LIGHT = '#10B981';
const INACTIVE = '#8E8E93';

const HAIRLINE_DARK = 'rgba(84,84,88,0.65)';
const HAIRLINE_LIGHT = 'rgba(60,60,67,0.29)';

function NutriTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const C = useScreenTokens();
  const activeName = state.routes[state.index]?.name;

  const items: Array<{
    name: 'index' | 'search' | 'profile';
    label: string;
    Icon: typeof ScanBarcode;
  }> = [
    { name: 'index', label: 'Home', Icon: ScanBarcode },
    { name: 'search', label: 'Search', Icon: SearchIcon },
    { name: 'profile', label: 'Profile', Icon: User },
  ];

  const totalHeight = BAR_HEIGHT + insets.bottom;
  const activeColor = C.dark ? ACTIVE_DARK : ACTIVE_LIGHT;
  const hairlineColor = C.dark ? HAIRLINE_DARK : HAIRLINE_LIGHT;

  return (
    <View style={[styles.wrap, { height: totalHeight }]}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={50}
          tint={C.dark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: C.tabBg }]}
      />
      <View
        pointerEvents="none"
        style={[styles.hairline, { backgroundColor: hairlineColor }]}
      />
      <View style={[styles.row, { height: BAR_HEIGHT }]}>
        {items.map(({ name, label, Icon }) => {
          const active = activeName === name;
          const color = active ? activeColor : INACTIVE;
          return (
            <Pressable
              key={name}
              onPress={() => navigation.navigate(name)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              style={styles.tab}
            >
              <Icon size={ICON_SIZE} color={color} strokeWidth={2} />
              <Text style={[styles.tabLabel, { color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.homeIndicator,
          { backgroundColor: '#FFFFFF', opacity: C.dark ? 1 : 0 },
        ]}
      />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <NutriTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarShowLabel: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  hairline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: ICON_TOP,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
    marginTop: LABEL_GAP,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: HOME_INDICATOR_BOTTOM,
    left: '50%',
    marginLeft: -HOME_INDICATOR_WIDTH / 2,
    width: HOME_INDICATOR_WIDTH,
    height: HOME_INDICATOR_HEIGHT,
    borderRadius: 100,
  },
});
