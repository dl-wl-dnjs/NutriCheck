import type { HealthProfileResponse } from '../types/api';

export function buildProfileTags(profile: HealthProfileResponse | null): string[] {
  if (profile == null) {
    return ['Complete your health profile'];
  }
  const tags: string[] = [];
  const allergens = profile.allergens.map((a) => a.toLowerCase());
  const conditions = profile.health_conditions.map((c) => c.toLowerCase());

  const gluten =
    allergens.some((a) => a.includes('gluten') || a.includes('wheat')) ||
    conditions.some((c) => c.includes('celiac'));
  if (gluten) {
    tags.push('Avoid Gluten');
  }

  const g = profile.fitness_goal.toLowerCase();
  if (g.includes('lose') && g.includes('weight')) {
    tags.push('Weight Loss');
  } else if (g.includes('muscle') || (g.includes('gain') && !g.includes('maintain'))) {
    tags.push('High Protein');
  } else if (g.includes('whole')) {
    tags.push('Whole Foods');
  } else {
    tags.push(profile.fitness_goal);
  }

  if (conditions.some((c) => c.includes('hypertension') || c.includes('blood pressure'))) {
    tags.push('Blood Pressure');
  } else if (conditions.some((c) => c.includes('diabetes'))) {
    tags.push('Glucose Aware');
  } else if (conditions.some((c) => c.includes('cholesterol'))) {
    tags.push('Lipids');
  } else if (
    profile.health_conditions.length > 0 &&
    !profile.health_conditions.some((c) => c.toLowerCase().includes('none'))
  ) {
    tags.push(profile.health_conditions[0]);
  }

  const deduped = [...new Set(tags)];
  return deduped.slice(0, 3);
}
