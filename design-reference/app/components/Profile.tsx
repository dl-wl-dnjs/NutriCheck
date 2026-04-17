import { AlertCircle, Check, ChevronLeft, Lock } from 'lucide-react';
import { Link } from 'react-router';
import { useState, useEffect, useRef } from 'react';
import { getHealthProfile, saveHealthProfile, getCurrentUserId } from '../services/api';
import { useScreenTokens, type ScreenTokens } from '../useScreenTokens';

const CONDITION_OPTIONS = [
  { id: 'diabetes',       label: 'Diabetes',        description: 'Affects sugar and carbohydrate analysis'  },
  { id: 'celiac',         label: 'Celiac Disease',   description: 'Flags gluten-containing ingredients'      },
  { id: 'hypertension',   label: 'Hypertension',     description: 'Monitors sodium and salt content'         },
  { id: 'kidney_disease', label: 'Kidney Disease',   description: 'Tracks potassium and phosphorus levels'   },
];

const ALLERGEN_OPTIONS = ['Gluten', 'Dairy', 'Eggs', 'Peanuts', 'Tree Nuts', 'Soy', 'Shellfish', 'Fish'];

const FITNESS_GOALS = [
  { id: 'lose_weight', label: 'Weight Loss',        description: 'Focus on low-calorie, high-protein options' },
  { id: 'gain_muscle', label: 'Muscle Gain',         description: 'Prioritize protein-rich foods'             },
  { id: 'maintain',   label: 'Nutritional Balance',  description: 'Maintain overall health and wellness'      },
];

function GreenCheck({ C }: { C: ScreenTokens }) {
  return (
    <div style={{ width: '24px', height: '24px', borderRadius: '12px', backgroundColor: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Check style={{ width: '14px', height: '14px', color: '#FFFFFF', strokeWidth: 3 }} />
    </div>
  );
}

function SectionHeader({ title, subtitle, C }: { title: string; subtitle: string; C: ScreenTokens }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ fontSize: '17px', fontWeight: 700, lineHeight: '28px', letterSpacing: '-0.43px', color: C.primary, margin: 0 }}>
        {title}
      </h2>
      <p style={{ fontSize: '13px', lineHeight: '18px', color: C.secondary, margin: '4px 0 0 0' }}>
        {subtitle}
      </p>
    </div>
  );
}

function ResetActionSheet({ C, onConfirm, onCancel }: { C: ScreenTokens; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onCancel} />
      <div style={{ position: 'relative', backgroundColor: C.dark ? '#1C1C1E' : '#FFFFFF', borderRadius: '14px 14px 0 0', padding: '20px 16px 0 16px', paddingBottom: '34px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: C.primary, lineHeight: '18px', marginBottom: '6px' }}>Reset Profile</p>
          <p style={{ fontSize: '13px', color: C.secondary, lineHeight: '18px', margin: 0 }}>Are you sure? This will clear all health data.</p>
        </div>
        <div style={{ height: '0.5px', backgroundColor: C.separatorLight }} />
        <button onClick={onConfirm} style={{ width: '100%', height: '57px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '17px', fontWeight: 400, color: C.red, borderBottom: `0.5px solid ${C.separatorLight}` }}>
          Reset Profile
        </button>
        <button onClick={onCancel} style={{ width: '100%', height: '57px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '17px', fontWeight: 600, color: C.primary }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function Profile() {
  const C = useScreenTokens();
  const [conditions,          setConditions]          = useState<string[]>([]);
  const [allergens,           setAllergens]           = useState<string[]>([]);
  const [fitnessGoal,         setFitnessGoal]         = useState('');
  const [showSuccess,         setShowSuccess]         = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [showResetSheet,      setShowResetSheet]      = useState(false);
  const [loading,             setLoading]             = useState(true);
  const [scrolled,            setScrolled]            = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 0);
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const userId = getCurrentUserId();
      const profile = await getHealthProfile(userId);
      if (profile) {
        setConditions(profile.conditions || []);
        setAllergens(profile.allergens || []);
        setFitnessGoal(profile.fitness_goal || '');
      }
    } catch (e) { console.error('Error loading profile:', e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!fitnessGoal) { setShowValidationError(true); return; }
    setShowValidationError(false);
    try {
      const userId = getCurrentUserId();
      await saveHealthProfile({ user_id: userId, conditions, allergens, fitness_goal: fitnessGoal });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e) {
      console.error('Error saving profile:', e);
      alert('Failed to save profile. Please try again.');
    }
  };

  const handleReset = () => {
    setConditions([]); setAllergens([]); setFitnessGoal('');
    setShowSuccess(false); setShowValidationError(false);
  };

  const toggleCondition = (id: string) =>
    setConditions(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);
  const toggleAllergen = (a: string) =>
    setAllergens(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);

  const selectedBorder = C.dark ? 'rgba(52,211,153,0.4)' : 'rgba(16,185,129,0.4)';

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.pageBg }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 mx-auto mb-4" style={{ borderBottom: `2px solid ${C.green}` }} />
          <p style={{ color: C.secondary }}>Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: C.pageBg }}>

      {/* Nav bar — flush with page background */}
      <div style={{ paddingTop: '59px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10, backgroundColor: C.navBg, borderBottom: scrolled ? `0.5px solid ${C.separatorLight}` : 'none', transition: 'border-bottom 0.15s' }}>
        <div style={{ height: '44px', display: 'flex', alignItems: 'center', paddingLeft: '8px', paddingRight: '16px', position: 'relative' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', marginLeft: '8px' }}>
            <ChevronLeft style={{ width: '17px', height: '17px', color: C.green, strokeWidth: 2 }} />
          </Link>
          <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '17px', fontWeight: 600, letterSpacing: '-0.43px', color: C.primary, whiteSpace: 'nowrap' }}>
            Manage Health Profile
          </span>
        </div>
      </div>

      {/* Success banner */}
      {showSuccess && (
        <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: C.greenTint, borderBottom: `0.5px solid ${selectedBorder}`, flexShrink: 0 }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '14px', backgroundColor: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Check style={{ width: '14px', height: '14px', color: '#FFFFFF', strokeWidth: 3 }} />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: C.green }}>Profile Updated Successfully</p>
            <p style={{ fontSize: '12px', color: C.secondary }}>Recalculating scores for recent scans…</p>
          </div>
        </div>
      )}

      {/* Validation error banner */}
      {showValidationError && (
        <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: C.dangerTint, borderBottom: `0.5px solid rgba(255,69,58,0.3)`, flexShrink: 0 }}>
          <AlertCircle style={{ width: '24px', height: '24px', color: C.red, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: C.red }}>Please select a fitness goal</p>
            <p style={{ fontSize: '12px', color: C.secondary }}>You must choose one fitness goal before saving</p>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>

        {/* Health Conditions */}
        <div style={{ paddingTop: '28px' }}>
          <SectionHeader title="Health Conditions" subtitle="Select all conditions that apply to you" C={C} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {CONDITION_OPTIONS.map(cond => {
              const sel = conditions.includes(cond.id);
              return (
                <button key={cond.id} onClick={() => toggleCondition(cond.id)}
                  style={{ height: '76px', borderRadius: '14px', backgroundColor: sel ? C.greenTint : C.elevated, boxShadow: sel ? `inset 0 0 0 1px ${selectedBorder}` : C.shadow, padding: '14px 20px 14px 16px', display: 'flex', alignItems: 'center', textAlign: 'left', border: 'none', cursor: 'pointer', transition: 'background-color 0.15s', width: '100%' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '17px', fontWeight: 600, color: C.primary, lineHeight: '22px', margin: 0 }}>{cond.label}</p>
                    <p style={{ fontSize: '14px', color: C.secondary, lineHeight: '18px', margin: '2px 0 0 0' }}>{cond.description}</p>
                  </div>
                  {sel && <GreenCheck C={C} />}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: '32px' }} />

        {/* Allergens */}
        <div>
          <SectionHeader title="Allergens" subtitle="Select any ingredients you're allergic to" C={C} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ALLERGEN_OPTIONS.map(allergen => {
              const sel = allergens.includes(allergen);
              return (
                <button key={allergen} onClick={() => toggleAllergen(allergen)}
                  style={{ height: '36px', paddingLeft: '16px', paddingRight: '16px', borderRadius: '999px', backgroundColor: sel ? C.green : C.elevated, color: sel ? '#FFFFFF' : C.primary, fontSize: '15px', fontWeight: 500, border: 'none', cursor: 'pointer', transition: 'background-color 0.15s, color 0.15s', whiteSpace: 'nowrap' }}>
                  {allergen}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: '32px' }} />

        {/* Fitness Goal */}
        <div>
          <SectionHeader title="Fitness Goal" subtitle="Choose one primary goal" C={C} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {FITNESS_GOALS.map(goal => {
              const sel = fitnessGoal === goal.id;
              return (
                <button key={goal.id} onClick={() => setFitnessGoal(goal.id)}
                  style={{ height: '76px', borderRadius: '14px', backgroundColor: sel ? C.greenTint : C.elevated, boxShadow: sel ? `inset 0 0 0 1px ${selectedBorder}` : C.shadow, padding: '14px 20px 14px 16px', display: 'flex', alignItems: 'center', textAlign: 'left', border: 'none', cursor: 'pointer', transition: 'background-color 0.15s', width: '100%' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '17px', fontWeight: 600, color: C.primary, lineHeight: '22px', margin: 0 }}>{goal.label}</p>
                    <p style={{ fontSize: '14px', color: C.secondary, lineHeight: '18px', margin: '2px 0 0 0' }}>{goal.description}</p>
                  </div>
                  {sel && <GreenCheck C={C} />}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: '32px' }} />

        {/* Save */}
        <button onClick={handleSave} className="active:scale-[0.98] transition-transform"
          style={{ width: '100%', height: '52px', borderRadius: '14px', backgroundColor: C.green, color: '#FFFFFF', fontSize: '17px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          Save Profile
        </button>

        <div style={{ height: '12px' }} />

        {/* Reset text link */}
        <button onClick={() => setShowResetSheet(true)}
          style={{ width: '100%', height: '44px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '15px', color: C.red }}>Reset Profile</span>
        </button>

        <div style={{ height: '24px' }} />

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
          <Lock style={{ width: '12px', height: '12px', color: C.tertiary, flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '13px', lineHeight: '18px', color: C.tertiary, margin: 0 }}>
            Your health data is encrypted (AES-256) and used only to personalize your scores. Updating your profile recalculates your last 10 scans.
          </p>
        </div>

        <div style={{ height: '34px' }} />
      </div>

      {showResetSheet && (
        <ResetActionSheet C={C}
          onConfirm={() => { handleReset(); setShowResetSheet(false); }}
          onCancel={() => setShowResetSheet(false)}
        />
      )}
    </div>
  );
}
