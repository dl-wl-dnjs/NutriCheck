import type { HealthProfileResponse } from '../types/api';

/** Goal chip + short allergen labels for the home “Active profile” card. */
export function buildActiveProfileChips(profile: HealthProfileResponse | null): {
  goal: string | null;
  allergenChips: string[];
} {
  if (profile == null) {
    return { goal: null, allergenChips: [] };
  }
  const goal = profile.fitness_goal?.trim() || null;
  const allergenChips = profile.allergens
    .map((a) => {
      const l = a.toLowerCase();
      if (l.includes('peanut')) {
        return 'Peanut-free';
      }
      if (l.includes('dairy') || l.includes('milk')) {
        return 'Dairy-free';
      }
      if (l.includes('gluten') || l.includes('wheat')) {
        return 'Gluten-free';
      }
      return a;
    })
    .slice(0, 4);
  return { goal, allergenChips };
}
