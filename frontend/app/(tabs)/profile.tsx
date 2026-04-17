import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { AlertCircle, Check, ChevronLeft, Lock, Moon, Palette, Sun } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useHealthProfileEditor } from '../../hooks/useHealthProfileEditor';
import { useScreenTokens } from '../../hooks/useScreenTokens';

type ConditionOpt = { label: string; description: string };
type GoalOpt = { label: string; description: string };

const CONDITION_DESCRIPTIONS: Record<string, string> = {
  Hypertension: 'Monitors sodium and salt content',
  'Type 2 diabetes': 'Affects sugar and carb analysis',
  'High cholesterol': 'Watches saturated fat and trans fat',
  'Celiac disease': 'Flags gluten-containing ingredients',
  'None / prefer not to say': 'Use generic scoring without personalisation',
};

const GOAL_DESCRIPTIONS: Record<string, string> = {
  'Lose weight': 'Focus on low-calorie, high-protein options',
  'Maintain weight': 'Balanced picks that match your baseline',
  'Gain muscle': 'Prioritise protein-rich foods',
  'Eat more whole foods': 'Favour minimally-processed options',
};

function GreenCheck({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Check size={14} color="#FFFFFF" strokeWidth={3} />
    </View>
  );
}

function SectionHeading({
  title,
  subtitle,
  primary,
  secondary,
}: {
  title: string;
  subtitle: string;
  primary: string;
  secondary: string;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 17,
          fontWeight: '700',
          lineHeight: 28,
          letterSpacing: -0.43,
          color: primary,
        }}
      >
        {title}
      </Text>
      <Text style={{ fontSize: 13, lineHeight: 18, color: secondary, marginTop: 4 }}>
        {subtitle}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const C = useScreenTokens();
  const { preference, setPreference } = useTheme();
  const { userId } = useAuth();
  const hp = useHealthProfileEditor(userId);
  const allowLeave = useRef(false);
  const hpRef = useRef(hp);
  hpRef.current = hp;

  const [showSuccess, setShowSuccess] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [customAllergenInput, setCustomAllergenInput] = useState('');

  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (allowLeave.current || !hpRef.current.dirty) {
        return;
      }
      e.preventDefault();
      Alert.alert('Discard changes?', 'Unsaved changes will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            allowLeave.current = true;
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return sub;
  }, [navigation]);

  const onSave = async () => {
    if (hp.goal == null || hp.goal === '') {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const ok = await hp.save();
    if (ok) {
      allowLeave.current = true;
      setShowSuccess(true);
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setTimeout(() => {
        setShowSuccess(false);
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 900);
    } else {
      const message = hp.error ?? 'Could not save profile. Try again.';
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Save failed', message);
    }
  };

  const onReset = () => {
    hp.optionLists.HEALTH_CONDITION_OPTIONS.forEach((c) => {
      if (hp.conditions.includes(c.label)) {
        hp.toggleCondition(c.label);
      }
    });
    hp.optionLists.ALLERGEN_OPTIONS.forEach((a) => {
      if (hp.allergens.includes(a.label)) {
        hp.toggleAllergen(a.label);
      }
    });
    if (hp.goal) {
      hp.selectGoal(hp.goal);
    }
    setShowSuccess(false);
    setShowValidation(false);
  };

  if (hp.loadingProfile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.pageBg }}>
        <ActivityIndicator color={C.green} style={{ marginTop: 48 }} />
      </SafeAreaView>
    );
  }

  const conditionOptions: ConditionOpt[] = hp.optionLists.HEALTH_CONDITION_OPTIONS.map((c) => ({
    label: c.label,
    description: CONDITION_DESCRIPTIONS[c.label] ?? '',
  }));
  const goalOptions: GoalOpt[] = hp.optionLists.FITNESS_GOAL_OPTIONS.map((g) => ({
    label: g.label,
    description: GOAL_DESCRIPTIONS[g.label] ?? '',
  }));
  const allergenOptions: string[] = hp.optionLists.ALLERGEN_OPTIONS.map((a) => a.label);

  const selectedBorder = C.dark ? 'rgba(52,211,153,0.4)' : 'rgba(16,185,129,0.4)';

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: C.pageBg }}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Nav bar */}
        <View style={styles.navbar}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={styles.navBack}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <ChevronLeft size={20} color={C.green} strokeWidth={2} />
          </Pressable>
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              letterSpacing: -0.43,
              color: C.primary,
            }}
          >
            Manage health profile
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Success banner */}
        {showSuccess ? (
          <View
            style={[
              styles.banner,
              { backgroundColor: C.greenTint, borderBottomColor: selectedBorder },
            ]}
          >
            <View
              style={[styles.bannerIcon, { backgroundColor: C.green }]}
            >
              <Check size={14} color="#FFFFFF" strokeWidth={3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.green }}>
                Profile updated
              </Text>
              <Text style={{ fontSize: 12, color: C.secondary }}>
                Recalculating scores for recent scans…
              </Text>
            </View>
          </View>
        ) : null}

        {/* Validation banner */}
        {showValidation ? (
          <View
            style={[
              styles.banner,
              { backgroundColor: C.dangerTint, borderBottomColor: 'rgba(255,69,58,0.3)' },
            ]}
          >
            <AlertCircle size={24} color={C.red} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.red }}>
                Please select a fitness goal
              </Text>
              <Text style={{ fontSize: 12, color: C.secondary }}>
                Choose one goal before saving
              </Text>
            </View>
          </View>
        ) : null}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 83 + insets.bottom + 32,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Appearance */}
          <View style={{ paddingTop: 24 }}>
            <SectionHeading
              title="Appearance"
              subtitle="Match your system, or pick a mode"
              primary={C.primary}
              secondary={C.secondary}
            />
            <View
              style={[
                styles.segmented,
                { backgroundColor: C.elevated, borderColor: C.separatorLight },
              ]}
            >
              {(
                [
                  { id: 'system' as const, label: 'System', Icon: Palette },
                  { id: 'light' as const, label: 'Light', Icon: Sun },
                  { id: 'dark' as const, label: 'Dark', Icon: Moon },
                ]
              ).map(({ id, label, Icon }) => {
                const active = preference === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setPreference(id)}
                    style={[
                      styles.segment,
                      active && { backgroundColor: C.green },
                    ]}
                  >
                    <Icon
                      size={16}
                      color={active ? '#FFFFFF' : C.primary}
                      strokeWidth={2}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: active ? '#FFFFFF' : C.primary,
                        marginLeft: 6,
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ height: 32 }} />

          {/* Health Conditions */}
          <SectionHeading
            title="Health conditions"
            subtitle="Select all conditions that apply"
            primary={C.primary}
            secondary={C.secondary}
          />
          <View style={{ gap: 10 }}>
            {conditionOptions.map((cond) => {
              const sel = hp.conditions.includes(cond.label);
              return (
                <Pressable
                  key={cond.label}
                  onPress={() => hp.toggleCondition(cond.label)}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: sel ? C.greenTint : C.elevated,
                      borderColor: sel ? selectedBorder : 'transparent',
                    },
                    !sel && C.shadow,
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: '600',
                        color: C.primary,
                        lineHeight: 22,
                      }}
                    >
                      {cond.label}
                    </Text>
                    {cond.description ? (
                      <Text
                        style={{
                          fontSize: 13,
                          color: C.secondary,
                          lineHeight: 18,
                          marginTop: 2,
                        }}
                      >
                        {cond.description}
                      </Text>
                    ) : null}
                  </View>
                  {sel ? <GreenCheck color={C.green} /> : null}
                </Pressable>
              );
            })}
          </View>

          <View style={{ height: 32 }} />

          {/* Allergens */}
          <SectionHeading
            title="Allergens"
            subtitle="Select any ingredients you're allergic to"
            primary={C.primary}
            secondary={C.secondary}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {allergenOptions.map((a) => {
              const sel = hp.allergens.includes(a);
              return (
                <Pressable
                  key={a}
                  onPress={() => hp.toggleAllergen(a)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: sel ? C.green : C.elevated,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '500',
                      color: sel ? '#FFFFFF' : C.primary,
                    }}
                  >
                    {a}
                  </Text>
                </Pressable>
              );
            })}
            {hp.allergens
              .filter((a) => !allergenOptions.includes(a))
              .map((a) => (
                <Pressable
                  key={a}
                  onPress={() => hp.toggleAllergen(a)}
                  style={[styles.chip, { backgroundColor: C.green }]}
                >
                  <Text style={{ fontSize: 15, fontWeight: '500', color: '#FFFFFF' }}>{a}</Text>
                </Pressable>
              ))}
          </View>

          {/* Custom allergen input */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <TextInput
              value={customAllergenInput}
              onChangeText={setCustomAllergenInput}
              placeholder="Add custom allergen"
              placeholderTextColor={C.tertiary}
              style={[
                styles.customInput,
                { backgroundColor: C.elevated, color: C.primary, borderColor: C.separatorLight },
              ]}
              onSubmitEditing={() => {
                const t = customAllergenInput.trim();
                if (t) {
                  hp.setCustomAllergen(t);
                  hp.addCustomAllergen();
                  setCustomAllergenInput('');
                }
              }}
              returnKeyType="done"
            />
            <Pressable
              onPress={() => {
                const t = customAllergenInput.trim();
                if (t) {
                  hp.setCustomAllergen(t);
                  hp.addCustomAllergen();
                  setCustomAllergenInput('');
                }
              }}
              style={[styles.addBtn, { borderColor: C.green }]}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: C.green }}>Add</Text>
            </Pressable>
          </View>

          <View style={{ height: 32 }} />

          {/* Fitness Goal */}
          <SectionHeading
            title="Fitness goal"
            subtitle="Choose one primary goal"
            primary={C.primary}
            secondary={C.secondary}
          />
          <View style={{ gap: 10 }}>
            {goalOptions.map((goal) => {
              const sel = hp.goal === goal.label;
              return (
                <Pressable
                  key={goal.label}
                  onPress={() => hp.selectGoal(goal.label)}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: sel ? C.greenTint : C.elevated,
                      borderColor: sel ? selectedBorder : 'transparent',
                    },
                    !sel && C.shadow,
                  ]}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: '600',
                        color: C.primary,
                        lineHeight: 22,
                      }}
                    >
                      {goal.label}
                    </Text>
                    {goal.description ? (
                      <Text
                        style={{
                          fontSize: 13,
                          color: C.secondary,
                          lineHeight: 18,
                          marginTop: 2,
                        }}
                      >
                        {goal.description}
                      </Text>
                    ) : null}
                  </View>
                  {sel ? <GreenCheck color={C.green} /> : null}
                </Pressable>
              );
            })}
          </View>

          {hp.error ? (
            <Text style={{ fontSize: 13, color: C.red, marginTop: 16 }}>{hp.error}</Text>
          ) : null}

          <View style={{ height: 32 }} />

          {/* Save */}
          <Pressable
            onPress={() => void onSave()}
            disabled={hp.loading}
            style={[
              styles.saveBtn,
              { backgroundColor: C.green, opacity: hp.loading ? 0.65 : 1 },
            ]}
          >
            {hp.loading ? (
              <ActivityIndicator color={C.onAccent} />
            ) : (
              <Text style={{ fontSize: 17, fontWeight: '600', color: C.onAccent }}>
                Save profile
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setShowReset(true)}
            style={{ height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12 }}
          >
            <Text style={{ fontSize: 15, color: C.red }}>Reset profile</Text>
          </Pressable>

          <View style={{ flexDirection: 'row', marginTop: 24, paddingHorizontal: 4 }}>
            <Lock size={12} color={C.tertiary} style={{ marginTop: 4, marginRight: 6 }} />
            <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, color: C.tertiary }}>
              Your health data is encrypted and used only to personalise your scores. Updating your
              profile recalculates your last 10 scans.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        transparent
        visible={showReset}
        animationType="fade"
        onRequestClose={() => setShowReset(false)}
      >
        <Pressable
          onPress={() => setShowReset(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: C.dark ? '#1C1C1E' : '#FFFFFF',
                paddingBottom: 34 + Math.max(insets.bottom - 20, 0),
              },
            ]}
          >
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: C.primary,
                  marginBottom: 6,
                }}
              >
                Reset profile
              </Text>
              <Text style={{ fontSize: 13, color: C.secondary, textAlign: 'center' }}>
                Are you sure? This will clear all health data.
              </Text>
            </View>
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.separatorLight }} />
            <Pressable
              onPress={() => {
                onReset();
                setShowReset(false);
              }}
              style={styles.sheetBtn}
            >
              <Text style={{ fontSize: 17, color: C.red }}>Reset profile</Text>
            </Pressable>
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.separatorLight }} />
            <Pressable onPress={() => setShowReset(false)} style={styles.sheetBtn}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: C.primary }}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navbar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  navBack: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  optionRow: {
    minHeight: 76,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  chip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingHorizontal: 16,
  },
  sheetBtn: {
    height: 57,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
