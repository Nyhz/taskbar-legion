import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/state/store';

// A full-width red "DANGER" stripe that flashes over the strip the instant a stage boss
// or a zone (-10) boss appears — it pulses a few times (peaking at 0.9 opacity) then
// fades out. Cosmetic; driven by the rising edge of the HUD phase into 'boss'/'zoneBoss'.

export function DangerBanner(): React.JSX.Element | null {
  const phase = useStore((s) => s.hud.phase);
  const prev = useRef(phase);
  const [runKey, setRunKey] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isBoss = phase === 'boss' || phase === 'zoneBoss';
    const wasBoss = prev.current === 'boss' || prev.current === 'zoneBoss';
    if (isBoss && !wasBoss) {
      setRunKey((k) => k + 1); // new key → remount → restart the pulse animation
      setVisible(true);
    }
    prev.current = phase;
  }, [phase]);

  if (!visible) return null;
  return (
    <div
      key={runKey}
      className="tl-danger"
      onAnimationEnd={() => setVisible(false)}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        height: 32,
        background: '#cc1f1f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        borderTop: '1px solid rgba(0,0,0,0.45)',
        borderBottom: '1px solid rgba(0,0,0,0.45)',
      }}
    >
      <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: 6, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
        DANGER
      </span>
    </div>
  );
}
