import { ScanBarcode, User, Wheat, ShoppingBag, Leaf, Coffee } from 'lucide-react';
import { Link } from 'react-router';
import { Logo } from './Logo';
import { useState, useEffect } from 'react';
import { getScanHistory, getHealthProfile, getCurrentUserId, type ScanHistory, type HealthProfile } from '../services/api';
import { useScreenTokens } from '../useScreenTokens';

function getScoreBadgeColor(score: number, green: string, amber: string, red: string) {
  if (score >= 70) return green;
  if (score >= 40) return amber;
  return red;
}

function getProductCategory(name: string): { bg: string; Icon: React.ElementType } {
  const lower = name.toLowerCase();
  if (lower.includes('bread') || lower.includes('wheat') || lower.includes('flake') || lower.includes('cereal')) {
    return { bg: 'rgba(245,158,11,0.2)', Icon: Wheat };
  }
  if (lower.includes('organic') || lower.includes('flax') || lower.includes('granola')) {
    return { bg: 'rgba(16,185,129,0.2)', Icon: Leaf };
  }
  if (lower.includes('coffee') || lower.includes('tea') || lower.includes('drink') || lower.includes('juice')) {
    return { bg: 'rgba(139,92,246,0.2)', Icon: Coffee };
  }
  return { bg: 'rgba(99,102,241,0.2)', Icon: ShoppingBag };
}

export function Home() {
  const C = useScreenTokens();
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const userId = getCurrentUserId();
      const [history, userProfile] = await Promise.all([
        getScanHistory(userId),
        getHealthProfile(userId),
      ]);
      setScanHistory(history);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: C.pageBg }}>
      {/* Status Bar */}
      <div className="h-[52px]" />

      {/* Header */}
      <div style={{ padding: '0 20px 16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Logo size={80} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <h1 style={{ fontSize: '30px', lineHeight: '36px', letterSpacing: '-0.5px', color: C.primary, fontWeight: 700, margin: 0 }}>
              NutriCheck
            </h1>
            <p style={{ fontSize: '15px', lineHeight: '20px', letterSpacing: '-0.24px', color: C.secondary, margin: '4px 0 0 0' }}>
              Your personalized nutrition guide
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-[83px]">

        {/* Scan Barcode CTA */}
        <Link to="/scan" style={{ display: 'block', padding: '0 20px' }}>
          <button
            className="w-full active:scale-[0.98] transition-transform"
            style={{ background: 'none', border: 'none', padding: '20px 0 28px 0', cursor: 'pointer', width: '100%' }}
          >
            <div className="flex flex-col items-center">
              <div
                className="flex items-center justify-center"
                style={{ width: '80px', height: '80px', borderRadius: '40px', background: `linear-gradient(135deg, ${C.green} 0%, #059669 100%)`, marginBottom: '16px' }}
              >
                <ScanBarcode className="text-white" style={{ width: '36px', height: '36px', strokeWidth: 2.5 }} />
              </div>
              <h2 style={{ fontSize: '22px', lineHeight: '28px', letterSpacing: '0.35px', marginBottom: '4px', color: C.primary, fontWeight: 700 }}>
                Scan Barcode
              </h2>
              <p style={{ fontSize: '15px', lineHeight: '20px', letterSpacing: '-0.24px', color: C.secondary }}>
                Tap to scan a product
              </p>
            </div>
          </button>
        </Link>

        {/* Hairline */}
        <div style={{ height: '0.5px', backgroundColor: C.separator, margin: '0 20px' }} />

        {/* Your Profile */}
        <div style={{ padding: '20px 20px 0 20px' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '16px' }}>
            <User style={{ width: '18px', height: '18px', strokeWidth: 2.5, color: C.green, flexShrink: 0 }} />
            <h3 style={{ fontSize: '17px', lineHeight: '22px', letterSpacing: '-0.43px', color: C.primary, fontWeight: 600 }}>
              Your Profile
            </h3>
          </div>

          {profile ? (
            <>
              <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '15px', color: C.secondary }}>Health Conditions</span>
                <span style={{ fontSize: '15px', color: C.primary, fontWeight: 600, maxWidth: '180px', textAlign: 'right' }}>
                  {profile.conditions.length > 0
                    ? profile.conditions.map(c => c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')).join(', ')
                    : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '15px', color: C.secondary }}>Fitness Goal</span>
                <span style={{ fontSize: '15px', color: C.primary, fontWeight: 600 }}>
                  {profile.fitness_goal
                    ? profile.fitness_goal.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                    : 'Not set'}
                </span>
              </div>
              <Link to="/profile">
                <button className="w-full text-white active:opacity-80 transition-opacity"
                  style={{ height: '50px', borderRadius: '14px', backgroundColor: C.green, fontSize: '17px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  Edit Profile
                </button>
              </Link>
            </>
          ) : (
            <div style={{ paddingBottom: '4px' }}>
              <p style={{ fontSize: '15px', color: C.secondary, marginBottom: '16px' }}>
                Set up your profile to get personalised health scores.
              </p>
              <Link to="/profile">
                <button className="w-full text-white active:opacity-80 transition-opacity"
                  style={{ height: '50px', borderRadius: '14px', backgroundColor: C.green, fontSize: '17px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
                  Set Up Profile
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Hairline */}
        <div style={{ height: '0.5px', backgroundColor: C.separator, margin: '20px 20px 0 20px' }} />

        {/* Recent Scans */}
        <div style={{ padding: '20px 20px 0 20px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '14px' }}>
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <h3 style={{ fontSize: '17px', lineHeight: '22px', letterSpacing: '-0.43px', color: C.primary, fontWeight: 600 }}>
                Recent Scans
              </h3>
            </div>
            <button style={{ fontSize: '15px', color: C.green, background: 'none', border: 'none', cursor: 'pointer' }}>
              See All
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center" style={{ height: '108px' }}>
              <div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: `2px solid ${C.green}` }} />
            </div>
          ) : scanHistory.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none', marginLeft: '-20px', marginRight: '-20px', paddingLeft: '20px', paddingRight: '20px' }}>
              {scanHistory.slice(0, 5).map((scan) => {
                const { bg: catBg, Icon: CatIcon } = getProductCategory(scan.product_name);
                const badgeColor = getScoreBadgeColor(scan.score, C.green, C.amber, C.red);
                return (
                  <Link key={scan.id} to={`/results/${scan.barcode}`} className="flex-shrink-0"
                    style={{ width: '120px', height: '108px', borderRadius: '14px', backgroundColor: C.elevated, overflow: 'hidden', position: 'relative', display: 'block', boxShadow: C.shadow }}>
                    <div className="flex items-center justify-center"
                      style={{ width: '120px', height: '68px', backgroundColor: catBg, position: 'relative' }}>
                      <CatIcon style={{ width: '28px', height: '28px', color: C.primary, opacity: 0.7 }} />
                      <div className="absolute flex items-center justify-center text-white"
                        style={{ width: '26px', height: '26px', borderRadius: '13px', backgroundColor: badgeColor, top: '6px', right: '6px', fontSize: '11px', fontWeight: 700, lineHeight: 1 }}>
                        {scan.score}
                      </div>
                    </div>
                    <div style={{ padding: '6px 8px' }}>
                      <p style={{ fontSize: '11px', lineHeight: '14px', color: C.primary, fontWeight: 500, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                        {scan.product_name}
                      </p>
                    </div>
                  </Link>
                );
              })}
              <div className="flex-shrink-0" style={{ width: '4px' }} />
            </div>
          ) : (
            <div className="text-center" style={{ padding: '32px 0' }}>
              <p style={{ fontSize: '15px', color: C.secondary }}>
                No scans yet — scan a product to get started
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="absolute bottom-0 left-0 right-0"
        style={{ height: '83px', backgroundColor: C.tabBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: `0.5px solid ${C.tabBorder}` }}>
        <div className="flex h-full">
          <Link to="/" className="flex-1 flex flex-col items-center pt-2">
            <ScanBarcode style={{ width: '25px', height: '25px', strokeWidth: 2, color: C.green }} />
            <span style={{ fontSize: '10px', marginTop: '2px', color: C.green, fontWeight: 500 }}>Home</span>
          </Link>
          <Link to="/profile" className="flex-1 flex flex-col items-center pt-2">
            <User style={{ width: '25px', height: '25px', strokeWidth: 2, color: C.secondary }} />
            <span style={{ fontSize: '10px', marginTop: '2px', color: C.secondary, fontWeight: 500 }}>Profile</span>
          </Link>
        </div>
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2"
          style={{ width: '134px', height: '5px', backgroundColor: C.dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)', borderRadius: '100px' }} />
      </div>
    </div>
  );
}
