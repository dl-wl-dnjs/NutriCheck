import { useState } from 'react';
import { X, Zap, ZapOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { scanBarcode, getCurrentUserId } from '../services/api';

// Reticle geometry — keep in sync with the overlay calc() values
const RETICLE_W = 280;   // pt
const RETICLE_H = 180;   // pt
const RETICLE_CY = 40;   // % from top for the vertical center

export function ScanProduct() {
  const [processing, setProcessing] = useState(false);
  const [error, setError]           = useState('');
  const [flashOn, setFlashOn]       = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [upc, setUpc]               = useState('');
  const navigate = useNavigate();

  const handleScan = async (barcode: string) => {
    setProcessing(true);
    setError('');
    try {
      const userId = getCurrentUserId();
      await scanBarcode(barcode, userId);
      navigate(`/results/${barcode}`);
    } catch {
      setError('Product not found. Please try another barcode.');
      setProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (upc.length >= 8 && !processing) handleScan(upc);
  };

  // CSS calc strings for the reticle edges
  const reticleTop    = `calc(${RETICLE_CY}% - ${RETICLE_H / 2}px)`;
  const reticleBottom = `calc(${RETICLE_CY}% + ${RETICLE_H / 2}px)`;
  const reticleLeft   = `calc(50% - ${RETICLE_W / 2}px)`;
  const reticleRight  = `calc(50% + ${RETICLE_W / 2}px)`;
  const sideW         = `calc(50% - ${RETICLE_W / 2}px)`;

  const DIM = 'rgba(0,0,0,0.60)';
  const CORNER_LEN = 32;
  const CORNER_STROKE = 3;
  const CORNER_RADIUS = 12;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000', overflow: 'hidden' }}>

      {/* ── Layer 1: Camera feed (pure black in mockup) ── */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: '#0a0a0a' }} />

      {/* ── Layer 2: Dimming overlay — 4 rects that surround the reticle hole ── */}
      {/* Top band */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: reticleTop, backgroundColor: DIM, zIndex: 1 }} />
      {/* Bottom band */}
      <div style={{ position: 'absolute', top: reticleBottom, left: 0, right: 0, bottom: 0, backgroundColor: DIM, zIndex: 1 }} />
      {/* Left sliver */}
      <div style={{ position: 'absolute', top: reticleTop, left: 0, width: sideW, height: `${RETICLE_H}px`, backgroundColor: DIM, zIndex: 1 }} />
      {/* Right sliver */}
      <div style={{ position: 'absolute', top: reticleTop, right: 0, width: sideW, height: `${RETICLE_H}px`, backgroundColor: DIM, zIndex: 1 }} />

      {/* ── Layer 3: Reticle — corner brackets + scan line ── */}
      <div
        style={{
          position: 'absolute',
          width: `${RETICLE_W}px`,
          height: `${RETICLE_H}px`,
          left: reticleLeft,
          top: reticleTop,
          zIndex: 2,
        }}
      >
        {/* Corner: top-left */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: CORNER_LEN, height: CORNER_LEN,
          borderTop: `${CORNER_STROKE}px solid white`,
          borderLeft: `${CORNER_STROKE}px solid white`,
          borderRadius: `${CORNER_RADIUS}px 0 0 0`,
        }} />
        {/* Corner: top-right */}
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: CORNER_LEN, height: CORNER_LEN,
          borderTop: `${CORNER_STROKE}px solid white`,
          borderRight: `${CORNER_STROKE}px solid white`,
          borderRadius: `0 ${CORNER_RADIUS}px 0 0`,
        }} />
        {/* Corner: bottom-left */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0,
          width: CORNER_LEN, height: CORNER_LEN,
          borderBottom: `${CORNER_STROKE}px solid white`,
          borderLeft: `${CORNER_STROKE}px solid white`,
          borderRadius: `0 0 0 ${CORNER_RADIUS}px`,
        }} />
        {/* Corner: bottom-right */}
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: CORNER_LEN, height: CORNER_LEN,
          borderBottom: `${CORNER_STROKE}px solid white`,
          borderRight: `${CORNER_STROKE}px solid white`,
          borderRadius: `0 0 ${CORNER_RADIUS}px 0`,
        }} />

        {/* Scan line — glow gradient that sweeps top → bottom */}
        {!processing && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: '40px',
              // Center of glow = scan position; travels from -20px (top) to 160px (bottom)
              animation: 'nutriScanLine 2s ease-in-out infinite',
              background: 'linear-gradient(to bottom, rgba(16,185,129,0) 0%, rgba(16,185,129,0.35) 30%, rgba(16,185,129,0.9) 50%, rgba(16,185,129,0.35) 70%, rgba(16,185,129,0) 100%)',
            }}
          />
        )}
      </div>

      {/* ── Layer 4: "Scanning…" instructional text — 24pt below reticle ── */}
      <div
        style={{
          position: 'absolute',
          top: `calc(${RETICLE_CY}% + ${RETICLE_H / 2 + 24}px)`,
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 3,
        }}
      >
        <p
          style={{
            fontSize: '15px',
            fontWeight: 500,
            color: 'rgba(235,235,245,0.6)',
            animation: 'nutriScanPulse 1.5s ease-in-out infinite',
            display: 'inline-block',
          }}
        >
          {processing ? 'Processing…' : 'Scanning…'}
        </p>
      </div>

      {/* ── Layer 5: Top toolbar — 59pt safe area + 12pt gap ── */}
      <div
        style={{
          position: 'absolute',
          top: '71px',          // 59 + 12
          left: '16px',
          right: '16px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        {/* Close */}
        <Link to="/" style={{ display: 'block' }}>
          <div
            style={{
              width: '36px', height: '36px', borderRadius: '18px',
              backgroundColor: 'rgba(28,28,30,0.6)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: '14px', height: '14px', color: 'white', strokeWidth: 2.5 }} />
          </div>
        </Link>

        {/* Flashlight toggle */}
        <button
          onClick={() => setFlashOn(f => !f)}
          style={{
            width: '36px', height: '36px', borderRadius: '18px',
            backgroundColor: flashOn ? 'rgba(255,255,255,0.18)' : 'rgba(28,28,30,0.6)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
        >
          {flashOn
            ? <Zap    style={{ width: '14px', height: '14px', color: 'white', strokeWidth: 2.5 }} />
            : <ZapOff style={{ width: '14px', height: '14px', color: 'rgba(255,255,255,0.7)', strokeWidth: 2.5 }} />
          }
        </button>
      </div>

      {/* ── Layer 6: Bottom sheet ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          // 56pt content + 34pt home-indicator = 90pt collapsed
          // 240pt content + 34pt = 274pt expanded
          height: sheetExpanded ? '274px' : '90px',
          backgroundColor: 'rgba(28,28,30,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '20px 20px 0 0',
          transition: 'height 0.38s cubic-bezier(0.32, 0.72, 0, 1)',
          zIndex: 10,
          overflow: 'hidden',
          cursor: sheetExpanded ? 'default' : 'pointer',
        }}
        onClick={() => { if (!sheetExpanded) setSheetExpanded(true); }}
      >
        {/* Drag handle — always visible */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '8px' }}>
          <div style={{ width: '36px', height: '5px', borderRadius: '3px', backgroundColor: '#545458' }} />
        </div>

        {/* Collapsed label */}
        {!sheetExpanded && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '43px' }}>
            <p style={{ fontSize: '15px', fontWeight: 500, color: '#FFFFFF', letterSpacing: '-0.24px' }}>
              Enter barcode manually
            </p>
          </div>
        )}

        {/* Expanded content */}
        {sheetExpanded && (
          <div style={{ padding: '10px 20px 0 20px' }}>
            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#FFFFFF', letterSpacing: '-0.43px' }}>
                Having trouble scanning?
              </h3>
              <button
                onClick={(e) => { e.stopPropagation(); setSheetExpanded(false); setError(''); }}
                style={{
                  background: 'none', border: 'none',
                  color: 'rgba(235,235,245,0.6)', fontSize: '15px',
                  cursor: 'pointer', padding: '0 0 0 12px',
                }}
              >
                Cancel
              </button>
            </div>

            <p style={{ fontSize: '15px', color: 'rgba(235,235,245,0.6)', marginBottom: error ? '8px' : '16px', letterSpacing: '-0.24px' }}>
              Enter the barcode manually (8–13 digits)
            </p>

            {error && (
              <p style={{ fontSize: '13px', color: '#FF453A', marginBottom: '10px', letterSpacing: '-0.08px' }}>
                {error}
              </p>
            )}

            {/* Input + Submit row */}
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Barcode number"
                maxLength={13}
                value={upc}
                autoFocus
                onChange={(e) => setUpc(e.target.value.replace(/\D/g, ''))}
                style={{
                  flex: 1,
                  height: '48px',
                  backgroundColor: '#2C2C2E',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0 16px',
                  color: '#FFFFFF',
                  fontSize: '17px',
                  letterSpacing: '0.5px',
                  outline: 'none',
                  // Placeholder colour via className below
                }}
                className="nutricheck-input"
              />
              <button
                type="submit"
                disabled={upc.length < 8 || processing}
                style={{
                  width: '96px',
                  height: '48px',
                  flexShrink: 0,
                  backgroundColor: upc.length >= 8 && !processing ? '#10B981' : '#2C2C2E',
                  color: upc.length >= 8 && !processing ? '#FFFFFF' : 'rgba(235,235,245,0.3)',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '17px',
                  fontWeight: 600,
                  cursor: upc.length >= 8 && !processing ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.15s',
                }}
              >
                {processing ? '…' : 'Submit'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes nutriScanLine {
          0%   { top: -20px; }
          50%  { top: 160px; }
          100% { top: -20px; }
        }
        @keyframes nutriScanPulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1.0; }
        }
        .nutricheck-input::placeholder {
          color: rgba(235, 235, 245, 0.30);
        }
      `}</style>
    </div>
  );
}
