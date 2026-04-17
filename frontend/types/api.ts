export interface HealthProfilePayload {
  user_id: string;
  health_conditions: string[];
  allergens: string[];
  fitness_goal: string;
}

export interface HealthProfileResponse {
  id: string;
  user_id: string;
  health_conditions: string[];
  allergens: string[];
  fitness_goal: string;
  created_at: string;
  updated_at: string;
}

export interface ProductSummary {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  ingredients_text: string | null;
  simplified_summary: string | null;
  nutriments: Record<string, unknown> | null;
  source: string;
}

export interface RatingBlock {
  score: number;
  label: string;
  avoid: boolean;
  avoid_reason: string | null;
  warnings: string[];
  limited_information: boolean;
}

export interface ScanBarcodeResponse {
  product: ProductSummary;
  rating: RatingBlock;
  scan_id: string;
}

export interface ScanHistoryItem {
  id: string;
  barcode: string;
  score: number;
  label: string;
  created_at: string;
  product_name?: string | null;
  product_brand?: string | null;
}

export interface AlternativesResponse {
  source_product_id: string;
  alternatives: {
    product: ProductSummary;
    rating: RatingBlock;
    suitability_note: string | null;
  }[];
}
