import { X, AlertTriangle, Info } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { useScreenTokens } from '../useScreenTokens';

const INGREDIENTS: Record<string, { name: string; chemicalName: string; explanation: string; impact: string; category: string; commonUses: string[]; safe: boolean; warning?: string }> = {
  '1': {
    name: 'Milled Corn', chemicalName: 'Zea mays',
    explanation: 'Corn that has been ground into a fine powder. It is the primary ingredient in many breakfast cereals and provides carbohydrates for energy.',
    impact: 'Refined corn is quickly digested and can cause blood sugar spikes. For diabetes management, whole grains are preferred over refined grains.',
    category: 'Grain', commonUses: ['Cereals', 'Tortillas', 'Snacks'], safe: true,
  },
  '2': {
    name: 'Sugar', chemicalName: 'Sucrose (C₁₂H₂₂O₁₁)',
    explanation: 'A simple carbohydrate that provides sweetness and quick energy. Sugar is extracted from sugar cane or sugar beets.',
    impact: 'HIGH CONCERN for Diabetes: Sugar causes rapid blood sugar spikes. The 12g per serving in this product represents 48 calories from sugar alone.',
    category: 'Sweetener', commonUses: ['Sweetening', 'Preservation', 'Texture'], safe: false,
    warning: 'Excessive sugar intake is linked to diabetes, obesity, and heart disease.',
  },
  '3': {
    name: 'Malt Flavoring', chemicalName: 'Malted barley extract',
    explanation: 'A sweet flavoring made from sprouted and dried barley grains. It adds a distinctive sweet, nutty flavor to foods.',
    impact: 'ALLERGEN ALERT for Celiac Disease: Malt flavoring is derived from BARLEY, which contains GLUTEN.',
    category: 'Flavoring', commonUses: ['Cereals', 'Baked goods', 'Beverages'], safe: false,
    warning: 'Contains gluten — avoid if you have Celiac Disease or gluten intolerance.',
  },
  '4': {
    name: 'High Fructose Corn Syrup', chemicalName: 'HFCS-55 (55% fructose, 45% glucose)',
    explanation: 'A liquid sweetener made from corn starch. Enzymes convert some of the glucose to fructose, making it sweeter than regular corn syrup.',
    impact: 'CONCERN for Diabetes & Weight Loss: HFCS may contribute to insulin resistance. It provides empty calories without nutritional value.',
    category: 'Sweetener', commonUses: ['Soft drinks', 'Processed foods', 'Baked goods'], safe: false,
    warning: 'Linked to increased risk of metabolic syndrome and weight gain.',
  },
};

export function IngredientDetail() {
  const C = useScreenTokens();
  const { ingredientId } = useParams();
  const ingredient = INGREDIENTS[ingredientId || '1'] || INGREDIENTS['1'];

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: C.pageBg }}>

      {/* Nav bar — flush with page background */}
      <div style={{ paddingTop: '59px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10, backgroundColor: C.navBg, borderBottom: `0.5px solid ${C.separatorLight}` }}>
        <div className="flex items-center justify-between" style={{ height: '44px', paddingLeft: '16px', paddingRight: '8px', position: 'relative' }}>
          <span className="absolute left-1/2" style={{ transform: 'translateX(-50%)', fontSize: '17px', fontWeight: 600, color: C.primary, whiteSpace: 'nowrap' }}>
            Ingredient Details
          </span>
          <div style={{ flex: 1 }} />
          <Link to="/results/1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px' }}>
            <X style={{ width: '18px', height: '18px', color: C.green }} />
          </Link>
        </div>
      </div>

      {/* Warning banner */}
      {!ingredient.safe && (
        <div className="flex items-center gap-3 px-4 py-3"
          style={{ backgroundColor: C.dangerTint, borderBottom: `0.5px solid rgba(255,69,58,0.3)`, flexShrink: 0 }}>
          <AlertTriangle style={{ width: '24px', height: '24px', color: C.red, flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: C.red }}>Caution Recommended</p>
            <p style={{ fontSize: '12px', color: C.secondary }}>{ingredient.warning}</p>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '16px', paddingBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Name card */}
        <div style={{ backgroundColor: C.cardBg, borderRadius: '20px', padding: '20px', boxShadow: C.shadow, border: !C.dark ? `0.5px solid ${C.separatorLight}` : 'none' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: C.primary, marginBottom: '6px' }}>{ingredient.name}</h2>
          <p style={{ fontSize: '14px', color: C.secondary, marginBottom: '12px' }}>{ingredient.chemicalName}</p>
          <span style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '20px', backgroundColor: C.greenTint, color: C.green, fontSize: '13px', fontWeight: 600 }}>
            {ingredient.category}
          </span>
        </div>

        {/* What is it */}
        <div style={{ backgroundColor: C.cardBg, borderRadius: '20px', padding: '20px', boxShadow: C.shadow, border: !C.dark ? `0.5px solid ${C.separatorLight}` : 'none' }}>
          <div className="flex items-center gap-2 mb-3">
            <Info style={{ width: '18px', height: '18px', color: C.info }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: C.primary }}>What is it?</h3>
          </div>
          <p style={{ fontSize: '14px', color: C.secondary, lineHeight: '20px' }}>{ingredient.explanation}</p>
        </div>

        {/* Impact card */}
        <div style={{ backgroundColor: ingredient.safe ? C.cardBg : C.dangerTint, borderRadius: '20px', padding: '20px', boxShadow: C.shadow, border: ingredient.safe ? (!C.dark ? `0.5px solid ${C.separatorLight}` : 'none') : `0.5px solid rgba(255,69,58,0.3)` }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle style={{ width: '18px', height: '18px', color: ingredient.safe ? C.green : C.red }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: C.primary }}>Impact on Your Health Profile</h3>
          </div>
          <div style={{ backgroundColor: C.elevated, borderRadius: '10px', padding: '10px 12px', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: C.secondary, marginBottom: '2px', fontWeight: 500 }}>Your Profile:</p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: C.primary }}>Diabetes, Celiac Disease, Weight Loss Goal</p>
          </div>
          <p style={{ fontSize: '14px', color: ingredient.safe ? C.secondary : C.red, lineHeight: '20px', fontWeight: ingredient.safe ? 400 : 600 }}>
            {ingredient.impact}
          </p>
        </div>

        {/* Common Uses */}
        <div style={{ backgroundColor: C.cardBg, borderRadius: '20px', padding: '20px', boxShadow: C.shadow, border: !C.dark ? `0.5px solid ${C.separatorLight}` : 'none' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: C.primary, marginBottom: '12px' }}>Common Uses</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ingredient.commonUses.map((use, i) => (
              <span key={i} style={{ backgroundColor: C.elevated, color: C.secondary, fontSize: '13px', padding: '6px 14px', borderRadius: '20px', fontWeight: 500 }}>
                {use}
              </span>
            ))}
          </div>
        </div>

        {/* Back button */}
        <Link to="/results/1">
          <button className="w-full active:scale-[0.98] transition-transform"
            style={{ height: '54px', borderRadius: '16px', backgroundColor: C.green, color: '#FFFFFF', fontSize: '17px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            Back to Product Analysis
          </button>
        </Link>
      </div>
    </div>
  );
}
