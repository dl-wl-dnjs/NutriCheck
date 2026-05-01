/** Types aligned with the FastAPI schemas for GET/PUT /profile, POST /scan, GET /scan-history. */

export type HealthTier = 'good' | 'okay' | 'bad';

export interface ProfileResponse {
  id: string;
  user_id: string;
  health_conditions: string[];
  allergens: string[];
  fitness_goal: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpsertBody {
  health_conditions: string[];
  allergens: string[];
  fitness_goal: string;
}

export interface ProductOut {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  category: string | null;
  ingredients_text: string | null;
  simplified_summary: string | null;
  nutriments: Record<string, unknown> | null;
  image_url: string | null;
  source: string;
}

export interface RatingOut {
  score: number;
  tier: HealthTier;
  label: string;
  avoid: boolean;
  avoid_reason: string | null;
  warnings: string[];
  recommendation: string | null;
  limited_information: boolean;
}

export interface ScanRequest {
  barcode: string;
}

export interface ScanResponse {
  scan_id: string;
  product: ProductOut;
  rating: RatingOut;
}

export interface ScanHistoryItemOut {
  id: string;
  barcode: string;
  score: number;
  tier: HealthTier;
  label: string;
  created_at: string;
  product_name: string | null;
  product_brand: string | null;
  product_image_url: string | null;
}

export interface ScanHistoryResponse {
  items: ScanHistoryItemOut[];
}

export interface AlternativeItem {
  product: ProductOut;
  rating: RatingOut;
  suitability_note: string | null;
}

export interface AlternativesResponse {
  items: AlternativeItem[];
  note: string | null;
}

export interface SearchResultItem {
  product: ProductOut;
  rating: RatingOut;
}

export interface SearchResponse {
  items: SearchResultItem[];
  query: string;
}
