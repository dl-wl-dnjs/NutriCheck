import { AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useState, useEffect, useRef } from 'react';
import { scanBarcode, getCurrentUserId, type ScanResult } from '../services/api';
import { useScreenTokens } from '../useScreenTokens';

export function ProductResults() {
  const C = useScreenTokens();
  const { productId } = useParams();
  const [result, setResult]   = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 0);
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => { loadProduct(); }, [productId]);

  const loadProduct = async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const userId = getCurrentUserId();
      const scanResult = await scanBarcode(productId, userId);
      setResult(scanResult);
    } catch (err) {
      setError('Failed to load product details. Please try again.');
      console.error(err);
    } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: C.pageBg }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 mx-auto mb-4" style={{ borderBottom: `2px solid ${C.green}` }} />
          <p style={{ color: C.secondary }}>Analyzing product...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6" style={{ backgroundColor: C.pageBg }}>
        <AlertTriangle style={{ width: '64px', height: '64px', color: C.red, marginBottom: '16px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.primary, marginBottom: '8px' }}>Product Not Found</h2>
        <p style={{ color: C.secondary, textAlign: 'center', marginBottom: '24px' }}>{error || 'Unable to find this product.'}</p>
        <Link to="/scan">
          <button style={{ backgroundColor: C.green, color: '#FFFFFF', padding: '12px 24px', borderRadius: '14px', fontWeight: 600, fontSize: '17px', border: 'none', cursor: 'pointer' }}>
            Scan Another Product
          </button>
        </Link>
      </div>
    );
  }

  const { product, rating } = result;
  const isAvoid = rating.label === 'AVOID';
  const hasWarnings = rating.warnings.length > 0;

  const scoreCol = () => {
    if (rating.label === 'AVOID' || rating.label === 'Poor') return C.red;
    if (rating.label === 'Fair') return C.amber;
    return C.green;
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: C.pageBg }}>

      {/* Nav bar — flush with page background */}
      <div style={{ paddingTop: '59px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10, backgroundColor: C.navBg, borderBottom: scrolled ? `0.5px solid ${C.separatorLight}` : 'none', transition: 'border-bottom 0.15s' }}>
        <div className="flex items-center" style={{ height: '44px', paddingLeft: '8px', paddingRight: '16px', position: 'relative' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px' }}>
            <ChevronLeft style={{ width: '17px', height: '17px', color: C.green, strokeWidth: 2 }} />
          </Link>
          <span className="absolute left-1/2" style={{ transform: 'translateX(-50%)', fontSize: '17px', fontWeight: 600, color: C.primary, whiteSpace: 'nowrap' }}>
            Product Analysis
          </span>
        </div>
      </div>

      {/* Allergen banner */}
      {isAvoid && (
        <div className="flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: C.dangerTint, borderBottom: `0.5px solid rgba(255,69,58,0.3)`, flexShrink: 0 }}>
          <AlertTriangle style={{ width: '24px', height: '24px', color: C.red, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: C.red }}>AVOID THIS PRODUCT</p>
            <p style={{ fontSize: '12px', color: C.secondary }}>{rating.reason || rating.warnings[0]}</p>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ padding: '16px', paddingBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Product header */}
        <div style={{ backgroundColor: C.cardBg, borderRadius: '20px', padding: '20px', boxShadow: C.shadow, border: !C.dark ? `0.5px solid ${C.separatorLight}` : 'none' }}>
          {product.image_url && (
            <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '128px', objectFit: 'contain', marginBottom: '16px', borderRadius: '12px' }} />
          )}
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.primary, marginBottom: '4px' }}>{product.name}</h2>
          {product.brand && <p style={{ fontSize: '14px', color: C.secondary, marginBottom: '20px' }}>{product.brand}</p>}

          {/* Score ring */}
          <div className="flex items-center gap-5">
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <svg style={{ width: '112px', height: '112px', transform: 'rotate(-90deg)' }}>
                <circle cx="56" cy="56" r="50" stroke={C.dark ? 'rgba(235,235,245,0.1)' : 'rgba(0,0,0,0.08)'} strokeWidth="10" fill="none" />
                <circle cx="56" cy="56" r="50" stroke={scoreCol()} strokeWidth="10" fill="none"
                  strokeDasharray={`${rating.score * 3.14} 314`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span style={{ fontSize: '30px', fontWeight: 700, color: scoreCol() }}>{rating.score}</span>
                <span style={{ fontSize: '11px', color: C.secondary, fontWeight: 500 }}>/ 100</span>
              </div>
            </div>
            <div className="flex-1">
              <p style={{ fontSize: '14px', fontWeight: 700, color: scoreCol(), marginBottom: '6px' }}>{rating.label}</p>
              <p style={{ fontSize: '12px', color: C.secondary, lineHeight: '18px' }}>Personalized for your health profile</p>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {hasWarnings && !isAvoid && (
          <div style={{ backgroundColor: C.warningTint, borderRadius: '20px', padding: '16px', border: `0.5px solid ${C.dark ? 'rgba(255,159,10,0.3)' : 'rgba(255,149,0,0.3)'}` }}>
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle style={{ width: '20px', height: '20px', color: C.amber, flexShrink: 0 }} />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: C.amber }}>Health Warnings</h3>
            </div>
            <ul style={{ paddingLeft: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rating.warnings.map((w, i) => (
                <li key={i} style={{ fontSize: '13px', color: C.amber, lineHeight: '18px' }}>• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Ingredients */}
        {product.ingredients && product.ingredients.length > 0 && (
          <div style={{ backgroundColor: C.cardBg, borderRadius: '20px', padding: '20px', boxShadow: C.shadow, border: !C.dark ? `0.5px solid ${C.separatorLight}` : 'none' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: C.primary, marginBottom: '16px' }}>Ingredients</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {product.ingredients.map((ing, i) => (
                <div key={i} style={{ padding: '10px 12px', borderRadius: '10px', backgroundColor: C.elevated }}>
                  <span style={{ fontSize: '14px', color: C.primary, fontWeight: 500 }}>{ing}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Nutrition Facts */}
        {product.nutriments && (
          <div style={{ backgroundColor: C.cardBg, borderRadius: '20px', padding: '20px', boxShadow: C.shadow, border: !C.dark ? `0.5px solid ${C.separatorLight}` : 'none' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: C.primary, marginBottom: '16px' }}>Nutrition Facts (per 100g)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {product.nutriments.energy_kcal !== undefined && (
                <div style={{ backgroundColor: C.elevated, padding: '12px', borderRadius: '12px' }}>
                  <p style={{ fontSize: '11px', color: C.secondary, marginBottom: '4px' }}>Calories</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: C.primary }}>{product.nutriments.energy_kcal}</p>
                </div>
              )}
              {product.nutriments.proteins !== undefined && (
                <div style={{ backgroundColor: C.elevated, padding: '12px', borderRadius: '12px' }}>
                  <p style={{ fontSize: '11px', color: C.secondary, marginBottom: '4px' }}>Protein</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: C.primary }}>{product.nutriments.proteins}g</p>
                </div>
              )}
              {product.nutriments.carbohydrates !== undefined && (
                <div style={{ backgroundColor: C.elevated, padding: '12px', borderRadius: '12px' }}>
                  <p style={{ fontSize: '11px', color: C.secondary, marginBottom: '4px' }}>Carbs</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: C.primary }}>{product.nutriments.carbohydrates}g</p>
                </div>
              )}
              {product.nutriments.sugars !== undefined && (
                <div style={{ backgroundColor: C.dangerTint, padding: '12px', borderRadius: '12px', border: `0.5px solid rgba(255,69,58,0.25)` }}>
                  <p style={{ fontSize: '11px', color: C.red, marginBottom: '4px', fontWeight: 500 }}>Sugar</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: C.red }}>{product.nutriments.sugars}g</p>
                </div>
              )}
              {product.nutriments.fiber !== undefined && (
                <div style={{ backgroundColor: C.elevated, padding: '12px', borderRadius: '12px' }}>
                  <p style={{ fontSize: '11px', color: C.secondary, marginBottom: '4px' }}>Fiber</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: C.primary }}>{product.nutriments.fiber}g</p>
                </div>
              )}
              {product.nutriments.sodium !== undefined && (
                <div style={{ backgroundColor: C.elevated, padding: '12px', borderRadius: '12px' }}>
                  <p style={{ fontSize: '11px', color: C.secondary, marginBottom: '4px' }}>Sodium</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: C.primary }}>{product.nutriments.sodium}mg</p>
                </div>
              )}
              {product.nutriments.fat !== undefined && (
                <div style={{ backgroundColor: C.elevated, padding: '12px', borderRadius: '12px' }}>
                  <p style={{ fontSize: '11px', color: C.secondary, marginBottom: '4px' }}>Fat</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: C.primary }}>{product.nutriments.fat}g</p>
                </div>
              )}
              {product.nutriments.saturated_fat !== undefined && (
                <div style={{ backgroundColor: C.elevated, padding: '12px', borderRadius: '12px' }}>
                  <p style={{ fontSize: '11px', color: C.secondary, marginBottom: '4px' }}>Saturated Fat</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: C.primary }}>{product.nutriments.saturated_fat}g</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Alternatives CTA */}
        {rating.score < 70 && !isAvoid && (
          <Link to={`/alternatives/${product.id}`}>
            <button className="w-full active:scale-[0.98] transition-transform"
              style={{ height: '54px', borderRadius: '16px', backgroundColor: C.green, color: '#FFFFFF', fontSize: '17px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              View Healthier Alternatives
              <ChevronRight style={{ width: '18px', height: '18px' }} />
            </button>
          </Link>
        )}

        {/* Scan Another */}
        <Link to="/scan">
          <button className="w-full active:scale-[0.98] transition-transform"
            style={{ height: '54px', borderRadius: '16px', backgroundColor: 'transparent', color: C.green, fontSize: '17px', fontWeight: 700, border: `1.5px solid ${C.green}`, cursor: 'pointer' }}>
            Scan Another Product
          </button>
        </Link>
      </div>
    </div>
  );
}
