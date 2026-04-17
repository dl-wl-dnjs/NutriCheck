import type { ProductSummary } from '../types/api';

export type NutritionCell = { label: string; value: string };

function num(n: unknown): number | null {
  if (n == null) {
    return null;
  }
  const v = typeof n === 'string' ? Number.parseFloat(n) : Number(n);
  return Number.isFinite(v) ? v : null;
}

function fmtEnergy(record: Record<string, unknown>): string {
  const kcal =
    num(record['energy-kcal_100g']) ??
    num(record['energy-kcal']) ??
    (() => {
      const kj = num(record['energy-kj_100g']);
      return kj != null ? Math.round(kj / 4.184) : null;
    })();
  if (kcal != null) {
    return `${Math.round(kcal)}`;
  }
  return '—';
}

function fmtG(v: number | null): string {
  return v != null ? v.toFixed(1) : '—';
}

export function buildNutritionGrid(product: ProductSummary): NutritionCell[] {
  const n = product.nutriments;
  const record = n && typeof n === 'object' ? (n as Record<string, unknown>) : {};

  const protein = num(record['proteins_100g']) ?? num(record['proteins']);
  const carbs = num(record['carbohydrates_100g']) ?? num(record['carbohydrates']);
  const fat = num(record['fat_100g']) ?? num(record['fat']);

  return [
    { label: 'Calories', value: fmtEnergy(record) },
    { label: 'Protein (g)', value: fmtG(protein) },
    { label: 'Carbs (g)', value: fmtG(carbs) },
    { label: 'Fat (g)', value: fmtG(fat) },
  ];
}
