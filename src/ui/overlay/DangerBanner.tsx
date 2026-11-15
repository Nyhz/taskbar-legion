import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/state/store';
import { useT } from '@/i18n';
import { Sign } from '@/ui/kit';

// A crimson band across the strip that flashes the instant a stage boss or a world (-10) boss appears — it
// pulses a few times (peaking at 0.9 opacity) then fades out. Cosmetic; driven by the rising edge of the HUD
// phase into 'boss' / 'zoneBoss'. Lives on the strip's kit layer (StripOverlay), in art pixels.

export function DangerBanner(): React.JSX.Element | null {
  const t = useT();
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
      className="tk-band danger"
      role="status"
      aria-label={t('overlay.dangerLabel')}
      onAnimationEnd={() => setVisible(false)}
    >
      <Sign name="hud_boss" />
      <span className="nm tk-ink">{t('overlay.danger')}</span>
      <Sign name="hud_boss" />
    </div>
  );
}
