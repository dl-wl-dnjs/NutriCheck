// API client for NutriCheck backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const USE_MOCK_DATA = true; // Set to false when backend is available

export interface HealthProfile {
  user_id: string;
  conditions: string[];
  allergens: string[];
  fitness_goal: string;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  brand?: string;
  image_url?: string;
  ingredients?: string[];
  nutriments?: {
    energy_kcal?: number;
    proteins?: number;
    carbohydrates?: number;
    sugars?: number;
    fat?: number;
    saturated_fat?: number;
    fiber?: number;
    sodium?: number;
    salt?: number;
  };
}

export interface Rating {
  score: number;
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'AVOID';
  warnings: string[];
  reason?: string;
}

export interface ScanResult {
  product: Product;
  rating: Rating;
}

export interface ScanHistory {
  id: string;
  barcode: string;
  product_name: string;
  brand?: string;
  scanned_at: string;
  score: number;
  label: string;
}

export interface Alternative {
  product: Product;
  rating: Rating;
  suitability_note: string;
}

// Mock data for demo/offline mode
const MOCK_PRODUCTS: Record<string, ScanResult> = {
  '999999990001': {
    product: {
      id: '1',
      barcode: '999999990001',
      name: "Kellogg's Corn Flakes",
      brand: "Kellogg's",
      ingredients: ['Milled Corn', 'Sugar', 'Malt Flavoring', 'High Fructose Corn Syrup', 'Salt', 'BHT'],
      nutriments: {
        energy_kcal: 357,
        proteins: 7.5,
        carbohydrates: 84,
        sugars: 8,
        fat: 0.9,
        saturated_fat: 0.2,
        fiber: 3,
        sodium: 729
      }
    },
    rating: {
      score: 62,
      label: 'Fair',
      warnings: [
        'High sugar content (8g per 100g) - concern for diabetes',
        'Contains gluten (malt flavoring) - allergen detected for celiac disease',
        'Moderate sodium (729mg per 100g)'
      ]
    }
  },
  '999999990002': {
    product: {
      id: '2',
      barcode: '999999990002',
      name: 'Wonder Bread Classic White',
      brand: 'Wonder',
      ingredients: ['Enriched Wheat Flour', 'Water', 'High Fructose Corn Syrup', 'Yeast', 'Soybean Oil', 'Salt'],
      nutriments: {
        energy_kcal: 266,
        proteins: 7.5,
        carbohydrates: 49,
        sugars: 5,
        fat: 3.3,
        saturated_fat: 0.8,
        fiber: 2,
        sodium: 458
      }
    },
    rating: {
      score: 38,
      label: 'Poor',
      warnings: [
        'Contains gluten (wheat flour) - AVOID for celiac disease',
        'High in refined carbohydrates',
        'Low fiber content',
        'Contains added sugars'
      ]
    }
  },
  '999999990003': {
    product: {
      id: '3',
      barcode: '999999990003',
      name: "Nature's Path Organic Flax Plus",
      brand: "Nature's Path",
      ingredients: ['Organic Whole Wheat', 'Organic Flax Seeds', 'Organic Cane Sugar', 'Sea Salt'],
      nutriments: {
        energy_kcal: 357,
        proteins: 10,
        carbohydrates: 67,
        sugars: 4,
        fat: 5,
        saturated_fat: 0.5,
        fiber: 10,
        sodium: 286
      }
    },
    rating: {
      score: 87,
      label: 'Excellent',
      warnings: []
    }
  }
};

// Health Profile API
export async function getHealthProfile(userId: string): Promise<HealthProfile | null> {
  if (USE_MOCK_DATA) {
    // Return mock profile from localStorage
    const stored = localStorage.getItem('nutricheck_profile');
    if (stored) {
      return JSON.parse(stored);
    }
    // Return default demo profile
    return {
      user_id: userId,
      conditions: ['diabetes', 'celiac'],
      allergens: ['Gluten'],
      fitness_goal: 'lose_weight'
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/health-profile?user_id=${userId}`);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch health profile');
    return await response.json();
  } catch (error) {
    console.error('Error fetching health profile:', error);
    // Fallback to localStorage
    const stored = localStorage.getItem('nutricheck_profile');
    return stored ? JSON.parse(stored) : null;
  }
}

export async function saveHealthProfile(profile: HealthProfile): Promise<void> {
  if (USE_MOCK_DATA) {
    // Save to localStorage for demo
    localStorage.setItem('nutricheck_profile', JSON.stringify(profile));
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/health-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!response.ok) throw new Error('Failed to save health profile');
  } catch (error) {
    // Fallback to localStorage
    localStorage.setItem('nutricheck_profile', JSON.stringify(profile));
  }
}

// Scan API
export async function scanBarcode(barcode: string, userId: string): Promise<ScanResult> {
  if (USE_MOCK_DATA) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get product from mock data
    const result = MOCK_PRODUCTS[barcode] || MOCK_PRODUCTS['999999990001'];

    // Save to scan history in localStorage
    const history = JSON.parse(localStorage.getItem('nutricheck_history') || '[]');
    const newScan: ScanHistory = {
      id: Date.now().toString(),
      barcode: result.product.barcode,
      product_name: result.product.name,
      brand: result.product.brand,
      scanned_at: new Date().toISOString(),
      score: result.rating.score,
      label: result.rating.label
    };
    history.unshift(newScan);
    // Keep only last 10 scans
    if (history.length > 10) history.pop();
    localStorage.setItem('nutricheck_history', JSON.stringify(history));

    return result;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/scan/barcode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode, user_id: userId }),
    });
    if (!response.ok) throw new Error('Failed to scan barcode');
    return await response.json();
  } catch (error) {
    // Fallback to mock data
    const result = MOCK_PRODUCTS[barcode] || MOCK_PRODUCTS['999999990001'];
    if (!result) throw error;
    return result;
  }
}

export async function getScanHistory(userId: string): Promise<ScanHistory[]> {
  if (USE_MOCK_DATA) {
    const history = localStorage.getItem('nutricheck_history');
    if (history) {
      return JSON.parse(history);
    }
    // Return demo history
    return [
      {
        id: '1',
        barcode: '999999990001',
        product_name: "Kellogg's Corn Flakes",
        brand: "Kellogg's",
        scanned_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        score: 62,
        label: 'Fair'
      },
      {
        id: '2',
        barcode: '999999990002',
        product_name: 'Wonder Bread Classic White',
        brand: 'Wonder',
        scanned_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        score: 38,
        label: 'Poor'
      }
    ];
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/scan/history?user_id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch scan history');
    return await response.json();
  } catch (error) {
    console.error('Error fetching scan history:', error);
    // Fallback to localStorage
    const history = localStorage.getItem('nutricheck_history');
    return history ? JSON.parse(history) : [];
  }
}

// Product API
export async function getAlternatives(productId: string, userId: string): Promise<Alternative[]> {
  if (USE_MOCK_DATA) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return mock alternatives
    return [
      {
        product: MOCK_PRODUCTS['999999990003'].product,
        rating: MOCK_PRODUCTS['999999990003'].rating,
        suitability_note: 'Significant improvement: Higher fiber (10g vs 3g), lower sugar (4g vs 8g), and gluten-free option available. Better for weight loss and diabetes management.'
      },
      {
        product: {
          id: '4',
          barcode: '999999990004',
          name: "Barbara's Shredded Wheat",
          brand: "Barbara's",
          ingredients: ['Whole Wheat', 'Sea Salt'],
          nutriments: {
            energy_kcal: 340,
            proteins: 10,
            carbohydrates: 80,
            sugars: 0,
            fat: 2,
            saturated_fat: 0.3,
            fiber: 6,
            sodium: 0
          }
        },
        rating: {
          score: 84,
          label: 'Excellent',
          warnings: ['Contains gluten (whole wheat) - not suitable for celiac disease']
        },
        suitability_note: 'Moderate improvement: No added sugar, whole grain, but contains gluten. Good for diabetes and weight loss, but avoid with celiac disease.'
      },
      {
        product: {
          id: '5',
          barcode: '999999990005',
          name: 'Cascadian Farm Organic Granola',
          brand: 'Cascadian Farm',
          ingredients: ['Organic Whole Oats', 'Organic Cane Sugar', 'Organic Canola Oil', 'Organic Honey'],
          nutriments: {
            energy_kcal: 471,
            proteins: 9,
            carbohydrates: 65,
            sugars: 12,
            fat: 18,
            saturated_fat: 1.8,
            fiber: 7,
            sodium: 107
          }
        },
        rating: {
          score: 72,
          label: 'Good',
          warnings: ['Moderate sugar content (12g per 100g)', 'Higher calorie density - watch portion sizes for weight loss']
        },
        suitability_note: 'Slight improvement: Organic ingredients and higher fiber, but similar sugar content. Better overall quality but portion control needed for weight loss goal.'
      }
    ];
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/products/${productId}/alternatives?user_id=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch alternatives');
    return await response.json();
  } catch (error) {
    console.error('Error fetching alternatives:', error);
    return [];
  }
}

// User ID management (simple localStorage for demo)
export function getCurrentUserId(): string {
  let userId = localStorage.getItem('nutricheck_user_id');
  if (!userId) {
    userId = 'demo-user-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('nutricheck_user_id', userId);
  }
  return userId;
}
