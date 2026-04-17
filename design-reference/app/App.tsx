import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { Moon, Sun, Palette } from 'lucide-react';
import { router } from './routes';
import { ThemeProvider, useTheme } from './ThemeContext';
import { DesignTokens } from './components/DesignTokens';
import { tokens } from './tokens';

// ── Inner app shell (needs access to theme context) ───────────────────────────
function AppShell() {
  const { theme, toggleTheme } = useTheme();
  const [showTokens, setShowTokens]  = useState(false);
  const t    = tokens[theme];
  const dark = theme === 'dark';

  // Phone screen background before individual screens paint
  const phoneBg = dark ? '#000000' : '#F2F2F7';

  if (showTokens) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: t.surface.background }}>
        <DesignTokens onBack={() => setShowTokens(false)} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        background: dark
          ? 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f0f 100%)'
          : 'linear-gradient(135deg, #e8e8f0 0%, #d4d4e8 50%, #e8e8f0 100%)',
        padding: '32px 24px',
        gap: '0',
      }}
    >
      {/* ── Controls row (above phone) ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '20px',
        }}
      >
        {/* Design Tokens button */}
        <button
          onClick={() => setShowTokens(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            height: '34px', paddingLeft: '14px', paddingRight: '14px',
            borderRadius: '999px',
            backgroundColor: dark ? 'rgba(52,211,153,0.12)' : 'rgba(16,185,129,0.10)',
            border: `1px solid ${dark ? 'rgba(52,211,153,0.30)' : 'rgba(16,185,129,0.25)'}`,
            cursor: 'pointer', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          <Palette style={{ width: '14px', height: '14px', color: t.accent.brand }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: t.accent.brand }}>Design Tokens</span>
        </button>

        {/* Divider */}
        <div style={{ width: '1px', height: '18px', backgroundColor: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }} />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            height: '34px', paddingLeft: '14px', paddingRight: '14px',
            borderRadius: '999px',
            backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
            cursor: 'pointer', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          }}
        >
          {dark
            ? <Sun  style={{ width: '14px', height: '14px', color: '#FF9F0A' }} />
            : <Moon style={{ width: '14px', height: '14px', color: '#007AFF' }} />}
          <span
            style={{
              fontSize: '13px', fontWeight: 500,
              color: dark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
            }}
          >
            {dark ? 'Light Mode' : 'Dark Mode'}
          </span>
        </button>
      </div>

      {/* ── iPhone 15 Pro frame ────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          width: '393px',
          height: '852px',
          backgroundColor: '#000000',
          borderRadius: '56px',
          boxShadow: dark
            ? '0 32px 120px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.08)'
            : '0 32px 120px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          border: '14px solid #000000',
        }}
      >
        {/* Dynamic Island */}
        <div
          style={{
            position: 'absolute', top: '10px', left: '50%',
            transform: 'translateX(-50%)',
            width: '126px', height: '37px',
            backgroundColor: '#000000',
            borderRadius: '999px',
            zIndex: 50,
          }}
        />

        {/* Volume buttons */}
        <div style={{ position: 'absolute', left: '-14px', top: '88px',  width: '3px', height: '34px', backgroundColor: '#1a1a1a', borderRadius: '2px 0 0 2px' }} />
        <div style={{ position: 'absolute', left: '-14px', top: '136px', width: '3px', height: '50px', backgroundColor: '#1a1a1a', borderRadius: '2px 0 0 2px' }} />
        <div style={{ position: 'absolute', left: '-14px', top: '196px', width: '3px', height: '50px', backgroundColor: '#1a1a1a', borderRadius: '2px 0 0 2px' }} />

        {/* Power button */}
        <div style={{ position: 'absolute', right: '-14px', top: '136px', width: '3px', height: '64px', backgroundColor: '#1a1a1a', borderRadius: '0 2px 2px 0' }} />

        {/* Screen */}
        <div
          style={{
            width: '100%', height: '100%',
            overflow: 'hidden', position: 'relative',
            backgroundColor: phoneBg,
            borderRadius: '42px',
          }}
        >
          <RouterProvider router={router} />
        </div>
      </div>

      {/* ── Mode label below phone ─────────────────────────────────────── */}
      <p
        style={{
          marginTop: '16px',
          fontSize: '12px', fontWeight: 500,
          color: dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
          fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
          letterSpacing: '0.5px',
        }}
      >
        {dark ? '● DARK MODE' : '○ LIGHT MODE'} · iPhone 15 Pro · 393 × 852pt
      </p>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
