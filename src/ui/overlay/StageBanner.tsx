import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/state/store';
import { stageLabelOf } from '@/data/difficulties';

// A quick gray "ENTERING …" stripe that fades over the strip whenever the party moves to a
// new stage/world (the rising edge of hud.globalStage). Cosmetic, render-only — same shape
// as the red DangerBanner, but informational rather than alarming (gray, single fade).

export function StageBanner(): React.JSX.Element | null {
  const stage = useStore((s) => s.hud.globalStage);
  const prev = useRef(stage);
  const [runKey, setRunKey] = useState(0);
  const [label, setLabel] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (stage !== prev.current) {
      setLabel(stageLabelOf(stage)); // e.g. "Normal 1-1"
      setRunKey((k) => k + 1); // new key → remount → restart the fade
      setVisible(true);
    }
    prev.current = stage;
  }, [stage]);

  if (!visible) return null;
  return (
    <div
      key={runKey}
      className="tl-stage-banner"
      onAnimationEnd={() => setVisible(false)}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        height: 28,
        background: '#4f4b57',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        borderTop: '1px solid rgba(0,0,0,0.45)',
        borderBottom: '1px solid rgba(0,0,0,0.45)',
      }}
    >
      <span style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: 2, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
        ENTERING {label.toUpperCase()}
      </span>
    </div>
  );
}
