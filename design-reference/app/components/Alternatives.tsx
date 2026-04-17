import { AlertTriangle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useState, useEffect, useRef } from 'react';
import { getAlternatives, getCurrentUserId, type Alternative } from '../services/api';
import { useScreenTokens } from '../useScreenTokens';

export function Alternatives() {
  const C = useScreenTokens();
  const { productId } = useParams();
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
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

  useEffect(() => { loadAlternatives(); }, [productId]);

  const loadAlternatives = async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const userId = getCurrentUserId();
      const alts = await getAlternatives(productId, userId);
      setAlternatives(alts);
    } catch (err) {
      setError('Failed to load alternatives. Please try again.');
      console.error(err);
    } finally { setLoading(false); }
  };

  const accentFor = (label: string) => {
    if (label === 'Excellent' || label === 'Good') return C.green;
    if (label === 'Fair') return C.amber;
    return C.red;
  };

  const NavBar = () => (
    <div style={{ paddingTop: '59px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10, backgroundColor: C.navBg, borderBottom: scrolled ? `0.5px solid ${C.separatorLight}` : 'none', transition: 'border-bottom 0.15s' }}>
      <div className="flex items-center" style={{ height: '44px', paddingLeft: '8px', paddingRight: '16px', position: 'relative' }}>
        <Link to={`/results/${productId}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px' }}>
          <ChevronLeft style={{ width: '17px', height: '17px', color: C.green, strokeWidth: 2 }} />
        </Link>
        <div className="absolute left-1/2" style={{ transform: 'translateX(-50%)', textAlign: 'center' }}>
          <p style={{ fontSize: '17px', fontWeight: 600, color: C.primary, whiteSpace: 'nowrap' }}>Healthier Alternatives</p>
          {alternatives.length > 0 && (
            <p style={{ fontSize: '11px', color: C.secondary }}>{alternatives.length} options found</p>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: C.pageBg }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 mx-auto mb-4" style={{ borderBottom: `2px solid ${C.green}` }} />
          <p style={{ color: C.secondary }}>Finding healthier alternatives...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6" style={{ backgroundColor: C.pageBg }}>
        <AlertTriangle style={{ width: '64px', height: '64px', color: C.red, marginBottom: '16px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.primary, marginBottom: '8px' }}>Error Loading Alternatives</h2>
        <p style={{ color: C.secondary, textAlign: 'center', marginBottom: '24px' }}>{error}</p>
        <Link to={`/results/${productId}`}>
          <button style={{ backgroundColor: C.green, color: '#FFFFFF', padding: '12px 24px', borderRadius: '14px', fontWeight: 600, fontSize: '17px', border: 'none', cursor: 'pointer' }}>
            Back to Product
          </button>
        </Link>
      </div>
    );
  }

  if (alternatives.length === 0) {
    return (
      <div className="h-full flex flex-col" style={{ backgroundColor: C.pageBg }}>
        <NavBar />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <AlertTriangle style={{ width: '64px', height: '64px', color: C.amber, marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: C.primary, marginBottom: '8px' }}>No Alternatives Found</h2>
          <p style={{ color: C.secondary, textAlign: 'center', marginBottom: '24px' }}>
            We couldn't find healthier alternatives for this product at the moment.
          </p>
          <Link to={`/results/${productId}`}>
            <button style={{ backgroundColor: C.green, color: '#FFFFFF', padding: '12px 24px', borderRadius: '14px', fontWeight: 600, fontSize: '17px', border: 'none', cursor: 'pointer' }}>
              Back to Product
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: C.pageBg }}>
      <NavBar />

      <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ padding: '16px', paddingBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {alternatives.map((alt, index) => {
          const accent = accentFor(alt.rating.label);
          return (
            <div key={alt.product.id} style={{ backgroundColor: C.cardBg, borderRadius: '20px', overflow: 'hidden', boxShadow: C.shadow, border: !C.dark ? `0.5px solid ${C.separatorLight}` : 'none' }}>
              {/* Rank header */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{ backgroundColor: `${accent}22`, borderBottom: `0.5px solid ${accent}44` }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: accent }}>#{index + 1} Recommended</span>
                <div className="flex items-baseline gap-1">
                  <span style={{ fontSize: '28px', fontWeight: 700, color: accent }}>{alt.rating.score}</span>
                  <span style={{ fontSize: '13px', color: C.secondary }}>/ 100</span>
                </div>
              </div>

              <div style={{ padding: '16px' }}>
                {alt.product.image_url && (
                  <img src={alt.product.image_url} alt={alt.product.name}
                    style={{ width: '100%', height: '96px', objectFit: 'contain', marginBottom: '12px', borderRadius: '10px' }} />
                )}
                <h3 style={{ fontSize: '17px', fontWeight: 700, color: C.primary, marginBottom: '2px' }}>{alt.product.name}</h3>
                {alt.product.brand && <p style={{ fontSize: '13px', color: C.secondary, marginBottom: '12px' }}>{alt.product.brand}</p>}

                {/* Suitability note */}
                <div style={{ backgroundColor: C.greenTint, borderRadius: '12px', padding: '10px 12px', marginBottom: '12px', border: `0.5px solid ${C.dark ? 'rgba(52,211,153,0.25)' : 'rgba(16,185,129,0.25)'}` }}>
                  <p style={{ fontSize: '13px', color: C.green, lineHeight: '18px' }}>{alt.suitability_note}</p>
                </div>

                {/* Rating chip */}
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '10px', backgroundColor: `${accent}22`, color: accent, fontSize: '13px', fontWeight: 700 }}>
                    {alt.rating.label}
                  </span>
                </div>

                {/* Nutrition highlights */}
                {alt.product.nutriments && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                    {alt.product.nutriments.sugars !== undefined && (
                      <div style={{ backgroundColor: C.elevated, padding: '8px', borderRadius: '10px', textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', color: C.secondary }}>Sugar</p>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: C.primary }}>{alt.product.nutriments.sugars}g</p>
                      </div>
                    )}
                    {alt.product.nutriments.sodium !== undefined && (
                      <div style={{ backgroundColor: C.elevated, padding: '8px', borderRadius: '10px', textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', color: C.secondary }}>Sodium</p>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: C.primary }}>{alt.product.nutriments.sodium}mg</p>
                      </div>
                    )}
                    {alt.product.nutriments.proteins !== undefined && (
                      <div style={{ backgroundColor: C.elevated, padding: '8px', borderRadius: '10px', textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', color: C.secondary }}>Protein</p>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: C.primary }}>{alt.product.nutriments.proteins}g</p>
                      </div>
                    )}
                  </div>
                )}

                <Link to={`/results/${alt.product.barcode}`}>
                  <button className="w-full active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                    style={{ height: '48px', borderRadius: '14px', backgroundColor: accent, color: '#FFFFFF', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                    View Full Details
                    <ChevronRight style={{ width: '18px', height: '18px' }} />
                  </button>
                </Link>
              </div>
            </div>
          );
        })}

        {/* Info footer */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '4px 0' }}>
          <p style={{ fontSize: '13px', color: C.tertiary, lineHeight: '18px', margin: 0 }}>
            Alternatives are filtered and ranked based on your health conditions, allergens, and fitness goal.
          </p>
        </div>
      </div>
    </div>
  );
}
