import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ALLERGEN_OPTIONS, FITNESS_GOAL_OPTIONS, HEALTH_CONDITION_OPTIONS } from '../constants/profileOptions';
import { useProfile, useUpdateProfile } from '../app/lib/hooks/useProfile';

function stableSnapshot(conditions: string[], allergens: string[], goal: string | null) {
  return JSON.stringify({
    conditions: [...conditions].sort(),
    allergens: [...allergens].sort(),
    goal: goal ?? '',
  });
}

export function useHealthProfileEditor(userId: string) {
  const profileQuery = useProfile(userId);
  const updateProfile = useUpdateProfile(userId);

  const [conditions, setConditions] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [customAllergen, setCustomAllergen] = useState('');
  const [goal, setGoal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const baseline = useRef<string>('');
  const hydrated = useRef(false);

  useEffect(() => {
    if (profileQuery.isPending || profileQuery.isFetching) {
      return;
    }
    if (hydrated.current) {
      return;
    }
    hydrated.current = true;
    const existing = profileQuery.data;
    if (existing) {
      setConditions(existing.health_conditions);
      setAllergens(existing.allergens);
      setGoal(existing.fitness_goal);
      baseline.current = stableSnapshot(existing.health_conditions, existing.allergens, existing.fitness_goal);
    } else {
      baseline.current = stableSnapshot([], [], null);
    }
  }, [profileQuery.data, profileQuery.isFetching, profileQuery.isPending]);

  const dirty = useMemo(
    () => stableSnapshot(conditions, allergens, goal) !== baseline.current,
    [allergens, conditions, goal],
  );

  const toggleCondition = useCallback((value: string) => {
    setConditions((prev) => {
      if (value.toLowerCase().includes('none') || value.toLowerCase().includes('prefer not')) {
        return prev.includes(value) ? [] : [value];
      }
      const withoutNone = prev.filter((p) => !p.toLowerCase().includes('none'));
      if (withoutNone.includes(value)) {
        return withoutNone.filter((v) => v !== value);
      }
      return [...withoutNone, value];
    });
  }, []);

  const toggleAllergen = useCallback((value: string) => {
    setAllergens((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }, []);

  const addCustomAllergen = useCallback(() => {
    const t = customAllergen.trim();
    if (t === '') {
      return;
    }
    setAllergens((prev) => (prev.some((a) => a.toLowerCase() === t.toLowerCase()) ? prev : [...prev, t]));
    setCustomAllergen('');
  }, [customAllergen]);

  const selectGoal = useCallback((value: string) => {
    setGoal((g) => (g === value ? null : value));
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (goal == null || goal === '') {
      setError('Select a fitness or dietary goal.');
      return false;
    }
    setError(null);
    try {
      await updateProfile.mutateAsync({
        health_conditions: conditions,
        allergens,
        fitness_goal: goal,
      });
      baseline.current = stableSnapshot(conditions, allergens, goal);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not save profile. Try again.';
      setError(message);
      return false;
    }
  }, [allergens, conditions, goal, updateProfile]);

  return {
    conditions,
    allergens,
    customAllergen,
    setCustomAllergen,
    goal,
    loading: updateProfile.isPending,
    loadingProfile: profileQuery.isPending,
    error,
    dirty,
    toggleCondition,
    toggleAllergen,
    addCustomAllergen,
    selectGoal,
    save,
    optionLists: { HEALTH_CONDITION_OPTIONS, ALLERGEN_OPTIONS, FITNESS_GOAL_OPTIONS },
  };
}
