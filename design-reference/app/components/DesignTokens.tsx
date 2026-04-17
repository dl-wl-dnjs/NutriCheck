/**
 * NutriCheck — Design Tokens Reference Page
 * ─────────────────────────────────────────
 * Single source of visual truth for the dual-theme system.
 * Every color, type style, spacing value, radius, and component sample shown
 * here corresponds 1-to-1 with /src/app/tokens.ts.
 *
 * Reference this page in subsequent screen prompts:
 *   "Use the theme variables defined in the Design Tokens page."
 */

import { useState } from 'react';
import { Check, Lock, Moon, Sun, ChevronLeft, ScanBarcode, User } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { Logo } from './Logo';
import {
  tokens,
  typography,
  spacing,
  radius,
  scoreColor,
  tabBar,
  type Theme,
  type ThemeTokens,
} from '../tokens';

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function SectionTitle({ label, t }: { label: string; t: ThemeTokens }) {
  return (
    <h2
      style={{
        ...typography.title2,
        color: t.label.primary,
        margin: '0 0 4px 0',
        paddingBottom: '12px',
        borderBottom: `0.5px solid ${t.separator.nonOpaque}`,
      }}
    >
      {label}
    </h2>
  );
}

function SectionSubtitle({ children, t }: { children: React.ReactNode; t: ThemeTokens }) {
  return (
    <p style={{ ...typography.footnote, color: t.label.secondary, margin: '8px 0 24px 0' }}>
      {children}
    </p>
  );
}

function GroupLabel({ label, t }: { label: string; t: ThemeTokens }) {
  return (
    <p
      style={{
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.8px',
        textTransform: 'uppercase' as const,
        color: t.label.tertiary,
        margin: '0 0 10px 0',
      }}
    >
      {label}
    </p>
  );
}

function GroupFootnote({ children, t }: { children: React.ReactNode; t: ThemeTokens }) {
  return (
    <p style={{ ...typography.footnote, color: t.label.tertiary, margin: '8px 0 0 0' }}>
      {children}
    </p>
  );
}

interface SwatchProps { name: string; value: string; t: ThemeTokens; theme: Theme }

function ColorSwatch({ name, value, t, theme }: SwatchProps) {
  // resolve the display value (raw color string, possibly rgba)
  const isVeryLight = ['#F2F2F7','#FFFFFF','#ECFDF5','#FEF2F2','#FFFBEB'].includes(value);
  const labelColor  = isVeryLight ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.85)';

  return (
    <div
      style={{
        borderRadius: radius.md,
        overflow: 'hidden',
        border: `0.5px solid ${t.separator.nonOpaque}`,
        boxShadow: theme === 'light' ? tokens.light.shadow.card : 'none',
      }}
    >
      <div
        style={{
          height: '60px',
          backgroundColor: value,
          display: 'flex',
          alignItems: 'flex-end',
          padding: '6px 8px',
        }}
      >
        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: labelColor }}>
          {value.length > 22 ? value.slice(0, 22) + '…' : value}
        </span>
      </div>
      <div style={{ padding: '7px 8px', backgroundColor: t.surface.elevated }}>
        <p style={{ ...typography.footnote, color: t.label.primary, margin: 0, fontWeight: 600, fontSize: '11px' }}>
          {name}
        </p>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function DesignTokens({ onBack }: { onBack: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const t    = tokens[theme];
  const dark = theme === 'dark';

  const [chipSel, setChipSel] = useState<string[]>(['Dairy', 'Gluten']);
  const [cardSel, setCardSel] = useState('lose_weight');

  // ── Swatch datasets ───────────────────────────────────────────────────────
  const surfaceSwatches = [
    { name: 'surface/background',     value: t.surface.background    },
    { name: 'surface/primary',        value: t.surface.primary       },
    { name: 'surface/elevated',       value: t.surface.elevated      },
    { name: 'surface/tinted-success', value: t.surface.tintedSuccess },
    { name: 'surface/tinted-danger',  value: t.surface.tintedDanger  },
    { name: 'surface/tinted-warning', value: t.surface.tintedWarning },
  ];

  const accentSwatches = [
    { name: 'accent/brand',         value: t.accent.brand        },
    { name: 'accent/brand-pressed', value: t.accent.brandPressed  },
    { name: 'accent/danger',        value: t.accent.danger       },
    { name: 'accent/warning',       value: t.accent.warning      },
    { name: 'accent/info',          value: t.accent.info         },
  ];

  const labelSwatches = [
    { name: 'label/primary',   value: t.label.primary   },
    { name: 'label/secondary', value: t.label.secondary },
    { name: 'label/tertiary',  value: t.label.tertiary  },
    { name: 'label/on-accent', value: t.label.onAccent  },
  ];

  const typeScale = [
    { token: 'type/large-title',  style: typography.largeTitle,  sample: 'Large Title',  meta: '34pt · Bold · +0.37'   },
    { token: 'type/title-2',      style: typography.title2,      sample: 'Title 2',       meta: '22pt · Bold · +0.35'   },
    { token: 'type/headline',     style: typography.headline,    sample: 'Headline',      meta: '17pt · Semibold · −0.43' },
    { token: 'type/body',         style: typography.body,        sample: 'Body',          meta: '17pt · Regular · −0.43' },
    { token: 'type/subheadline',  style: typography.subheadline, sample: 'Subheadline',   meta: '15pt · Regular · −0.23' },
    { token: 'type/footnote',     style: typography.footnote,    sample: 'Footnote',      meta: '13pt · Regular · −0.08' },
  ];

  const scoreTiers = [
    { label: 'score/good ≥ 70',   score: 82 },
    { label: 'score/okay 40–69',  score: 55 },
    { label: 'score/bad < 40',    score: 24 },
  ];

  const goalCards = [
    { id: 'lose_weight', label: 'Weight Loss',        desc: 'Focus on low-calorie, high-protein options' },
    { id: 'gain_muscle', label: 'Muscle Gain',         desc: 'Prioritize protein-rich foods'             },
    { id: 'maintain',   label: 'Nutritional Balance',  desc: 'Maintain overall health and wellness'      },
  ];

  const allergens = ['Gluten', 'Dairy', 'Eggs', 'Peanuts', 'Tree Nuts'];

  // ── Quick-ref table rows ───────────────────────────────────────────────────
  const tableRows: Array<{ key: string; val: string; note: string; isHeader?: boolean; isSpacer?: boolean }> = [
    { key: '// Surfaces',            val: '',  note: '', isHeader: true },
    { key: 't.surface.background',   val: dark ? '#000000' : '#F2F2F7',    note: 'page canvas'       },
    { key: 't.surface.primary',      val: dark ? '#1C1C1E' : '#FFFFFF',    note: 'cards / sheets'    },
    { key: 't.surface.elevated',     val: dark ? '#2C2C2E' : '#FFFFFF',    note: 'chips / rows'      },
    { key: 't.surface.tintedSuccess',val: dark ? 'rgba(16,185,129,.15)' : '#ECFDF5', note: 'selected / success' },
    { key: '', val: '', note: '', isSpacer: true },
    { key: '// Labels',              val: '',  note: '', isHeader: true },
    { key: 't.label.primary',        val: dark ? '#FFFFFF'             : '#000000',            note: 'body text'          },
    { key: 't.label.secondary',      val: dark ? 'rgba(235,235,245,.6)'  : 'rgba(60,60,67,.6)', note: 'supporting text'    },
    { key: 't.label.tertiary',       val: dark ? 'rgba(235,235,245,.3)'  : 'rgba(60,60,67,.3)', note: 'footer/placeholder' },
    { key: '', val: '', note: '', isSpacer: true },
    { key: '// Accents',             val: '',  note: '', isHeader: true },
    { key: 't.accent.brand',         val: dark ? '#34D399' : '#10B981', note: 'primary interactive' },
    { key: 't.accent.danger',        val: dark ? '#FF453A' : '#FF3B30', note: 'destructive'         },
    { key: 't.accent.warning',       val: dark ? '#FF9F0A' : '#FF9500', note: 'caution / mid score' },
    { key: 't.accent.info',          val: dark ? '#0A84FF' : '#007AFF', note: 'links / info'        },
    { key: '', val: '', note: '', isSpacer: true },
    { key: '// Separators',          val: '',  note: '', isHeader: true },
    { key: 't.separator.nonOpaque',  val: dark ? 'rgba(84,84,88,.3)'  : 'rgba(60,60,67,.1)',  note: 'nav hairline'     },
    { key: 't.separator.opaque',     val: dark ? 'rgba(84,84,88,.65)' : 'rgba(60,60,67,.18)', note: 'section dividers' },
    { key: '', val: '', note: '', isSpacer: true },
    { key: '// Typography',          val: '',  note: '', isHeader: true },
    { key: 'typography.headline',    val: '17pt Semibold −0.43', note: 'nav title / section head' },
    { key: 'typography.subheadline', val: '15pt Regular −0.23',  note: 'body supporting text'     },
    { key: 'typography.footnote',    val: '13pt Regular −0.08',  note: 'footer / captions'        },
    { key: '', val: '', note: '', isSpacer: true },
    { key: '// Spacing (pt)',        val: '',  note: '', isHeader: true },
    { key: 'spacing.lg → 16',  val: 'spacing.xl → 20',       note: 'spacing["3xl"] → 32'   },
    { key: '', val: '', note: '', isSpacer: true },
    { key: '// Radius',              val: '',  note: '', isHeader: true },
    { key: 'radius.lg → 14px',       val: 'radius.xl → 20px (cards)', note: 'radius.full → 999px (chips)' },
    { key: '', val: '', note: '', isSpacer: true },
    { key: '// Score helper',        val: '',  note: '', isHeader: true },
    { key: 'scoreColor(score,theme)',val: 'maps ≥70/40-69/<40', note: 'brand / warning / danger'  },
  ];

  return (
    <div
      style={{
        backgroundColor: t.surface.background,
        minHeight: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
        color: t.label.primary,
      }}
    >
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          backgroundColor: dark ? 'rgba(0,0,0,0.88)' : 'rgba(242,242,247,0.88)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `0.5px solid ${t.separator.nonOpaque}`,
          padding: '14px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
            }}
          >
            <ChevronLeft style={{ width: '16px', height: '16px', color: t.accent.brand, strokeWidth: 2 }} />
            <span style={{ ...typography.subheadline, color: t.accent.brand }}>Prototype</span>
          </button>

          <div style={{ width: '0.5px', height: '18px', backgroundColor: t.separator.opaque }} />

          <Logo size={30} />

          <div>
            <p style={{ ...typography.headline, margin: 0, color: t.label.primary }}>Design Tokens</p>
            <p style={{ ...typography.footnote, margin: 0, color: t.label.secondary }}>
              /src/app/tokens.ts — single source of truth
            </p>
          </div>
        </div>

        {/* Mode toggle pill */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            height: '34px', paddingLeft: '14px', paddingRight: '14px',
            borderRadius: radius.full,
            backgroundColor: t.surface.primary,
            border: `0.5px solid ${t.separator.opaque}`,
            boxShadow: t.shadow.card,
            cursor: 'pointer',
          }}
        >
          {dark
            ? <Sun  style={{ width: '14px', height: '14px', color: t.accent.warning }} />
            : <Moon style={{ width: '14px', height: '14px', color: t.accent.info }} />}
          <span style={{ ...typography.subheadline, color: t.label.primary, fontWeight: 500 }}>
            {dark ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
      </div>

      {/* ── Page body ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '40px 40px 80px' }}>

        {/* Mode badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '44px' }}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '6px 14px', borderRadius: radius.full,
              backgroundColor: dark ? 'rgba(52,211,153,0.10)' : 'rgba(16,185,129,0.08)',
              border: `1px solid ${dark ? 'rgba(52,211,153,0.25)' : 'rgba(16,185,129,0.2)'}`,
            }}
          >
            {dark
              ? <Moon style={{ width: '13px', height: '13px', color: t.accent.brand }} />
              : <Sun  style={{ width: '13px', height: '13px', color: t.accent.brand }} />}
            <span style={{ ...typography.footnote, color: t.accent.brand, fontWeight: 600 }}>
              {dark ? 'Dark Mode active' : 'Light Mode active'}
            </span>
          </div>
          <p style={{ ...typography.footnote, color: t.label.tertiary, margin: 0 }}>
            Toggle the mode above — every value on this page shifts via tokens simultaneously.
          </p>
        </div>

        {/* ══════════════════════════ 1. COLOR SYSTEM ══════════════════════ */}
        <div style={{ marginBottom: '56px' }}>
          <SectionTitle label="1 — Color System" t={t} />
          <SectionSubtitle t={t}>
            Six token groups. Every hex value on every component must reference one of these —
            never a raw hex literal.
          </SectionSubtitle>

          {/* Surfaces */}
          <div style={{ marginBottom: '32px' }}>
            <GroupLabel label="Surfaces — elevation order" t={t} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
              {surfaceSwatches.map(s => (
                <ColorSwatch key={s.name} name={s.name.replace('surface/', '')} value={s.value} t={t} theme={theme} />
              ))}
            </div>
            <GroupFootnote t={t}>
              Dark: depth comes from #1C1C1E on #000000 — no shadows needed.
              Light: shadow/card (two-layer) lifts surface/primary off surface/background.
            </GroupFootnote>
          </div>

          {/* Accents */}
          <div style={{ marginBottom: '32px' }}>
            <GroupLabel label="Accents — interactive & semantic" t={t} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
              {accentSwatches.map(s => (
                <ColorSwatch key={s.name} name={s.name.replace('accent/', '')} value={s.value} t={t} theme={theme} />
              ))}
            </div>
            <GroupFootnote t={t}>
              accent/brand shifts #10B981 → #34D399 in dark (brighter on black, same perceived weight).
              danger/warning/info each shift to their iOS dark-system variants.
            </GroupFootnote>
          </div>

          {/* Labels */}
          <div style={{ marginBottom: '32px' }}>
            <GroupLabel label="Labels — text hierarchy" t={t} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {labelSwatches.map(s => (
                <div
                  key={s.name}
                  style={{
                    borderRadius: radius.md, overflow: 'hidden',
                    border: `0.5px solid ${t.separator.nonOpaque}`,
                    boxShadow: t.shadow.card,
                  }}
                >
                  <div
                    style={{
                      height: '52px',
                      backgroundColor: dark ? '#2C2C2E' : '#E5E5EA',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '22px', fontWeight: 700,
                        color: s.value,
                        textShadow: s.name === 'label/on-accent' ? 'none' : undefined,
                      }}
                    >
                      Aa
                    </span>
                  </div>
                  <div style={{ padding: '7px 8px', backgroundColor: t.surface.elevated }}>
                    <p style={{ ...typography.footnote, color: t.label.primary, margin: 0, fontWeight: 600, fontSize: '11px' }}>
                      {s.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Separators */}
          <div style={{ marginBottom: '32px' }}>
            <GroupLabel label="Separators & Hairlines" t={t} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {[
                { name: 'separator/opaque',     value: t.separator.opaque,    use: 'section dividers' },
                { name: 'separator/non-opaque', value: t.separator.nonOpaque, use: 'nav hairline (on scroll only)' },
              ].map(s => (
                <div
                  key={s.name}
                  style={{
                    borderRadius: radius.md, overflow: 'hidden',
                    border: `0.5px solid ${t.separator.nonOpaque}`,
                    boxShadow: t.shadow.card,
                  }}
                >
                  <div style={{ height: '44px', backgroundColor: t.surface.primary, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                    <div style={{ flex: 1, height: '0.5px', backgroundColor: s.value }} />
                  </div>
                  <div style={{ padding: '7px 8px', backgroundColor: t.surface.elevated }}>
                    <p style={{ ...typography.footnote, color: t.label.primary, margin: 0, fontWeight: 600, fontSize: '11px' }}>{s.name}</p>
                    <p style={{ fontSize: '10px', color: t.label.secondary, margin: '2px 0 0', fontFamily: 'monospace' }}>{s.value} · {s.use}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shadows */}
          <div>
            <GroupLabel label="Shadows" t={t} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div
                style={{
                  borderRadius: radius.md, padding: '16px',
                  backgroundColor: tokens.light.surface.primary,
                  boxShadow: tokens.light.shadow.card,
                  border: `0.5px solid rgba(60,60,67,0.10)`,
                }}
              >
                <p style={{ ...typography.footnote, color: '#000000', margin: '0 0 6px', fontWeight: 600 }}>shadow/card — Light</p>
                <p style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(60,60,67,0.6)', margin: 0 }}>0 1px 2px rgba(0,0,0,0.04)</p>
                <p style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(60,60,67,0.6)', margin: 0 }}>0 8px 24px rgba(0,0,0,0.06)</p>
              </div>
              <div
                style={{
                  borderRadius: radius.md, padding: '16px',
                  backgroundColor: '#1C1C1E',
                  border: `0.5px solid rgba(84,84,88,0.30)`,
                }}
              >
                <p style={{ ...typography.footnote, color: '#FFFFFF', margin: '0 0 6px', fontWeight: 600 }}>shadow/card — Dark</p>
                <p style={{ fontSize: '11px', fontFamily: 'monospace', color: 'rgba(235,235,245,0.60)', margin: 0 }}>none</p>
                <p style={{ fontSize: '11px', color: 'rgba(235,235,245,0.35)', margin: '4px 0 0' }}>Depth: #1C1C1E on #000000</p>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════ 2. TYPOGRAPHY ════════════════════════ */}
        <div style={{ marginBottom: '56px' }}>
          <SectionTitle label="2 — Typography" t={t} />
          <SectionSubtitle t={t}>
            SF Pro throughout. Same scale in both modes — only color shifts via label tokens.
            Galaxia BC used exclusively for the NutriCheck wordmark.
          </SectionSubtitle>

          <div>
            {typeScale.map((row, i) => (
              <div
                key={row.token}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: i < typeScale.length - 1 ? `0.5px solid ${t.separator.nonOpaque}` : 'none',
                }}
              >
                <span style={{ ...row.style, color: t.label.primary }}>{row.sample}</span>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '24px' }}>
                  <p style={{ ...typography.footnote, color: t.accent.brand, margin: 0, fontWeight: 600, fontFamily: 'monospace' }}>{row.token}</p>
                  <p style={{ fontSize: '11px', color: t.label.tertiary, margin: '2px 0 0', fontFamily: 'monospace' }}>{row.meta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════ 3. SPACING ═══════════════════════════ */}
        <div style={{ marginBottom: '56px' }}>
          <SectionTitle label="3 — Spacing" t={t} />
          <SectionSubtitle t={t}>8pt grid. All padding, gap, and margin values use these tokens.</SectionSubtitle>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(Object.entries(spacing) as [string, number][]).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ width: '120px', flexShrink: 0, ...typography.footnote, color: t.accent.brand, fontFamily: 'monospace', fontWeight: 600 }}>
                  spacing/{key}
                </span>
                <div
                  style={{
                    height: '20px', width: `${val * 4}px`,
                    borderRadius: '4px', flexShrink: 0,
                    backgroundColor: dark ? 'rgba(52,211,153,0.25)' : 'rgba(16,185,129,0.18)',
                    border: `1px solid ${t.accent.brand}`,
                  }}
                />
                <span style={{ ...typography.footnote, color: t.label.secondary }}>{val}pt</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════ 4. RADIUS ════════════════════════════ */}
        <div style={{ marginBottom: '56px' }}>
          <SectionTitle label="4 — Radius" t={t} />
          <SectionSubtitle t={t}>
            All containers use radius tokens. iOS 60% corner smoothing (continuous curve) on device.
          </SectionSubtitle>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {(Object.entries(radius) as [string, string][]).map(([key, val]) => {
              const dim = key === 'full' ? 56 : Math.min(parseInt(val) * 5 + 24, 80);
              return (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: `${dim}px`, height: `${dim}px`,
                      borderRadius: val,
                      backgroundColor: dark ? 'rgba(52,211,153,0.10)' : 'rgba(16,185,129,0.08)',
                      border: `2px solid ${t.accent.brand}`,
                    }}
                  />
                  <p style={{ ...typography.footnote, color: t.accent.brand, margin: 0, fontFamily: 'monospace', fontWeight: 600 }}>
                    radius/{key}
                  </p>
                  <p style={{ fontSize: '11px', color: t.label.tertiary, margin: 0, fontFamily: 'monospace' }}>{val}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════ 5. SCORE COLOURS ═════════════════════ */}
        <div style={{ marginBottom: '56px' }}>
          <SectionTitle label="5 — Score Colours" t={t} />
          <SectionSubtitle t={t}>
            Semantic — do not theme independently. Map to accent tokens so brightness adapts per mode.
            scoreColor(score, theme) from tokens.ts handles the mapping automatically.
          </SectionSubtitle>

          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            {scoreTiers.map(({ label, score }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '72px', height: '72px', borderRadius: '36px',
                    backgroundColor: scoreColor(score, theme),
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '22px', fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>{score}</span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>/100</span>
                </div>
                <p style={{ ...typography.footnote, color: t.label.primary, margin: 0, fontWeight: 600, textAlign: 'center' }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════ 6. COMPONENTS ════════════════════════ */}
        <div style={{ marginBottom: '56px' }}>
          <SectionTitle label="6 — Components" t={t} />
          <SectionSubtitle t={t}>
            Live interactive samples. Toggle mode above — all colors shift via tokens, no manual recoloring.
          </SectionSubtitle>

          {/* Button / Primary */}
          <div style={{ marginBottom: '32px' }}>
            <GroupLabel label="Button / Primary" t={t} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              <button
                style={{
                  height: '52px', paddingLeft: '36px', paddingRight: '36px',
                  borderRadius: radius.lg, backgroundColor: t.accent.brand,
                  color: t.label.onAccent, border: 'none', cursor: 'pointer',
                  ...typography.headline,
                }}
              >
                Save Profile
              </button>
              <p style={{ ...typography.footnote, color: t.label.secondary, margin: 0 }}>
                52pt · radius/lg (14px) · accent/brand fill · label/on-accent · type/headline
              </p>
            </div>
          </div>

          {/* Button / Destructive-Text */}
          <div style={{ marginBottom: '32px' }}>
            <GroupLabel label="Button / Destructive-Text" t={t} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
              <button
                style={{
                  height: '44px', paddingLeft: '16px', paddingRight: '16px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: t.accent.danger,
                  ...typography.subheadline,
                }}
              >
                Reset Profile
              </button>
              <p style={{ ...typography.footnote, color: t.label.secondary, margin: 0 }}>
                44pt tap target · no fill · no border · accent/danger · type/subheadline Regular
              </p>
            </div>
          </div>

          {/* Chip */}
          <div style={{ marginBottom: '32px' }}>
            <GroupLabel label="Chip — Allergen / Filter" t={t} />
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {allergens.map(a => {
                const sel = chipSel.includes(a);
                return (
                  <button
                    key={a}
                    onClick={() => setChipSel(p => sel ? p.filter(x => x !== a) : [...p, a])}
                    style={{
                      height: '36px', paddingLeft: `${spacing.lg}px`, paddingRight: `${spacing.lg}px`,
                      borderRadius: radius.full,
                      backgroundColor: sel ? t.accent.brand : t.surface.elevated,
                      color: sel ? t.label.onAccent : t.label.primary,
                      border: 'none', cursor: 'pointer',
                      ...typography.subheadline, fontWeight: 500,
                      transition: 'background-color 0.15s, color 0.15s',
                    }}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
            <GroupFootnote t={t}>
              36pt · radius/full · Unselected: surface/elevated + label/primary ·
              Selected: accent/brand + label/on-accent · tap to toggle
            </GroupFootnote>
          </div>

          {/* Selectable Card */}
          <div style={{ marginBottom: '32px' }}>
            <GroupLabel label="Selectable Card — Fitness Goal" t={t} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '8px', maxWidth: '480px' }}>
              {goalCards.map(g => {
                const sel = cardSel === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setCardSel(g.id)}
                    style={{
                      height: '76px',
                      borderRadius: radius.lg,
                      backgroundColor: sel ? t.surface.tintedSuccess : t.surface.primary,
                      boxShadow: sel
                        ? `inset 0 0 0 1px ${dark ? 'rgba(52,211,153,0.4)' : 'rgba(16,185,129,0.4)'}`
                        : t.shadow.card,
                      border: (!sel && !dark) ? `0.5px solid ${t.separator.nonOpaque}` : 'none',
                      padding: `${spacing.md}px ${spacing.xl}px ${spacing.md}px ${spacing.lg}px`,
                      display: 'flex', alignItems: 'center',
                      textAlign: 'left', cursor: 'pointer',
                      transition: 'background-color 0.15s', width: '100%',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ ...typography.headline, color: t.label.primary, margin: 0 }}>{g.label}</p>
                      <p style={{ fontSize: '14px', color: t.label.secondary, margin: '2px 0 0', lineHeight: '18px' }}>{g.desc}</p>
                    </div>
                    {sel && (
                      <div
                        style={{
                          width: '24px', height: '24px', borderRadius: '12px',
                          backgroundColor: t.accent.brand, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Check style={{ width: '14px', height: '14px', color: '#FFFFFF', strokeWidth: 3 }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <GroupFootnote t={t}>
              76pt · radius/lg · Unselected: surface/primary + shadow/card ·
              Selected: surface/tinted-success + inset 1pt accent/brand (40% α) + 24pt checkmark circle
            </GroupFootnote>
          </div>

          {/* Nav Bar sample */}
          <div style={{ marginBottom: '32px' }}>
            <GroupLabel label="Nav Bar" t={t} />
            <div
              style={{
                borderRadius: radius.md, overflow: 'hidden',
                border: `0.5px solid ${t.separator.nonOpaque}`,
              }}
            >
              <div
                style={{
                  height: '44px', backgroundColor: t.surface.background,
                  display: 'flex', alignItems: 'center',
                  paddingLeft: '8px', paddingRight: '16px', position: 'relative',
                  borderBottom: `0.5px solid ${t.separator.nonOpaque}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px' }}>
                  <ChevronLeft style={{ width: '17px', height: '17px', color: t.accent.brand, strokeWidth: 2 }} />
                </div>
                <span
                  style={{
                    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                    ...typography.headline, color: t.label.primary, whiteSpace: 'nowrap',
                  }}
                >
                  Screen Title
                </span>
              </div>
            </div>
            <GroupFootnote t={t}>
              44pt bar + safe area · surface/background (flush, no card surface) ·
              hairline separator/non-opaque on scroll only · back = accent/brand, 17pt Regular strokeWidth 2
            </GroupFootnote>
          </div>

          {/* Tab Bar sample */}
          <div style={{ marginBottom: '32px' }}>
            <GroupLabel label="Tab Bar" t={t} />
            <div
              style={{
                height: '49px', borderRadius: radius.md, overflow: 'hidden',
                border: `0.5px solid ${t.separator.nonOpaque}`,
                display: 'flex',
                backgroundColor: dark ? tabBar.dark.background : tabBar.light.background,
                backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderTop: `0.5px solid ${dark ? tabBar.dark.border : tabBar.light.border}`,
              }}
            >
              {[
                { Icon: ScanBarcode, label: 'Home',    active: true  },
                { Icon: User,        label: 'Profile', active: false },
              ].map(({ Icon, label, active }) => (
                <div
                  key={label}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '3px',
                  }}
                >
                  <Icon style={{ width: '24px', height: '24px', strokeWidth: 2, color: active ? t.accent.brand : t.label.secondary }} />
                  <span style={{ fontSize: '10px', color: active ? t.accent.brand : t.label.secondary, fontWeight: active ? 600 : 400 }}>{label}</span>
                </div>
              ))}
            </div>
            <GroupFootnote t={t}>
              72% opacity blur · top hairline separator/non-opaque · active = accent/brand · inactive = label/secondary
            </GroupFootnote>
          </div>

          {/* Section Footer */}
          <div>
            <GroupLabel label="Section Footer (iOS Settings pattern)" t={t} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', maxWidth: '480px', marginBottom: '8px' }}>
              <Lock style={{ width: '12px', height: '12px', color: t.label.tertiary, flexShrink: 0, marginTop: '2px' }} />
              <p style={{ ...typography.footnote, color: t.label.tertiary, margin: 0 }}>
                Your health data is encrypted (AES-256) and used only to personalize your scores.
                Updating your profile recalculates your last 10 scans.
              </p>
            </div>
            <GroupFootnote t={t}>
              type/footnote · label/tertiary · inline 12pt SF Symbol · no container — replaces loud info cards
            </GroupFootnote>
          </div>
        </div>

        {/* ══════════════════════════ 7. QUICK REFERENCE ═══════════════════ */}
        <div>
          <SectionTitle label="7 — Token Quick Reference" t={t} />
          <SectionSubtitle t={t}>
            Copy variable names directly. Import from{' '}
            <code style={{ fontSize: '12px', color: t.accent.brand, fontFamily: 'monospace' }}>
              /src/app/tokens.ts
            </code>
            . Values shown for the currently active mode.
          </SectionSubtitle>

          <div
            style={{
              borderRadius: radius.md, overflow: 'hidden',
              border: `0.5px solid ${t.separator.nonOpaque}`,
              fontSize: '12px', fontFamily: 'monospace',
            }}
          >
            {/* Access pattern header */}
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: dark ? 'rgba(52,211,153,0.08)' : 'rgba(16,185,129,0.06)',
                borderBottom: `0.5px solid ${t.separator.nonOpaque}`,
              }}
            >
              <span style={{ color: t.accent.brand, fontWeight: 700 }}>// Usage pattern in any screen</span>
              <br />
              <span style={{ color: t.label.secondary }}>{'const { theme } = useTheme();'}</span>
              <br />
              <span style={{ color: t.label.secondary }}>{'const t = tokens[theme];'}</span>
            </div>

            {tableRows.map((row, i) => {
              if (row.isSpacer) {
                return <div key={i} style={{ height: '6px', backgroundColor: i % 2 === 0 ? t.surface.primary : t.surface.elevated }} />;
              }
              if (row.isHeader) {
                return (
                  <div
                    key={i}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: dark ? 'rgba(52,211,153,0.08)' : 'rgba(16,185,129,0.06)',
                    }}
                  >
                    <span style={{ color: t.accent.brand, fontWeight: 600 }}>{row.key}</span>
                  </div>
                );
              }
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid', gridTemplateColumns: '2.2fr 2fr 2fr',
                    padding: '6px 14px', gap: '8px',
                    backgroundColor: i % 2 === 0 ? t.surface.primary : t.surface.elevated,
                  }}
                >
                  <span style={{ color: t.label.primary }}>{row.key}</span>
                  <span style={{ color: t.label.secondary }}>{row.val}</span>
                  <span style={{ color: t.label.tertiary }}>{row.note}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
