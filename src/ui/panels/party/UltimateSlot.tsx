import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ULTIMATES } from '@/data/ultimates';
import { glyphForIcon } from '@/ui/icons';
import { PALETTE } from '@/styles/palette';

// The hero's class ULTIMATE — a passive, always-active power that auto-fires on its
// trigger once the hero hits its unlock level. It occupies NEITHER of the 2 active slots,
// so it gets its own fixed indicator pinned to the left of the ability row: a violet slot
// showing the ult icon, a "Lv N" requirement badge (green ✓ once met), and a hover card
// that explains what it does and when it triggers.

const ULT_VIOLET = '#b07cff';
const ULT_VIOLET_DIM = '#6a4aa0';
const TIP_W = 224;

const TRIGGER_LABEL: Record<string, string> = {
  onLethalDamage: 'When a lethal blow would land',
  onBossEngage: 'On engaging a stage or world boss',
};

export function UltimateSlot({ classKey, level }: { classKey: string; level: number }): React.JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ left: number; top: number } | null>(null);
  const ult = ULTIMATES[classKey];
  if (ult === undefined) return null;

  const unlocked = level >= ult.unlockLevel;
  const accent = unlocked ? ULT_VIOLET : ULT_VIOLET_DIM;

  const onEnter = (): void => {
    const r = ref.current?.getBoundingClientRect();
    if (r === undefined) return;
    const left = r.left - TIP_W - 8 > 0 ? r.left - TIP_W - 8 : r.right + 8;
    const top = Math.max(4, Math.min(window.innerHeight - 190, r.top - 2));
    setTip({ left: Math.max(4, left), top });
  };

  return (
    <span style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ color: accent, fontWeight: 700, fontSize: 11, textShadow: unlocked ? `0 0 4px ${ULT_VIOLET}` : 'none' }}>Ult</span>
      <div
        ref={ref}
        onMouseEnter={onEnter}
        onMouseLeave={() => setTip(null)}
        style={{
          position: 'relative', width: 30, height: 30, fontSize: 15,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle at 38% 32%, #2c2536 0%, #15121c 80%)',
          border: `2px solid ${accent}`,
          boxShadow: unlocked ? `0 0 7px ${ULT_VIOLET}` : 'none',
          borderRadius: '50%', color: PALETTE.textLight, cursor: 'help',
        }}
      >
        <span style={{ opacity: unlocked ? 1 : 0.4, filter: unlocked ? 'none' : 'grayscale(1)' }}>{glyphForIcon(ult.icon)}</span>
        {/* Level-requirement badge, centered beneath the icon: red "Lv N" when locked,
            green "✓ N" once met. */}
        <span
          style={{
            position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
            fontSize: 8, fontWeight: 700, lineHeight: '10px',
            padding: '0 2px', borderRadius: 2, background: PALETTE.bgPanel,
            border: `1px solid ${unlocked ? PALETTE.hpGreen : PALETTE.titleRedHi}`,
            color: unlocked ? PALETTE.hpGreen : PALETTE.parchment, whiteSpace: 'nowrap',
          }}
        >
          {unlocked ? '✓' : `Lv${ult.unlockLevel}`}
        </span>
      </div>

      {tip !== null &&
        createPortal(
          <div style={{ position: 'fixed', left: tip.left, top: tip.top, zIndex: 9999, pointerEvents: 'none' }}>
            <UltimateCard classKey={classKey} level={level} />
          </div>,
          document.body,
        )}
    </span>
  );
}

function UltimateCard({ classKey, level }: { classKey: string; level: number }): React.JSX.Element | null {
  const ult = ULTIMATES[classKey];
  if (ult === undefined) return null;
  const unlocked = level >= ult.unlockLevel;
  return (
    <div
      style={{
        width: TIP_W, background: PALETTE.bgPanel, border: `2px solid ${PALETTE.ink}`,
        boxShadow: `0 0 0 1px ${ULT_VIOLET_DIM}`, padding: 8, fontSize: 11,
        color: PALETTE.textLight, display: 'flex', flexDirection: 'column', gap: 3,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: ULT_VIOLET, fontWeight: 700 }}>{glyphForIcon(ult.icon)} {ult.name}</span>
        <span style={{ color: PALETTE.textMute, fontSize: 10 }}>Ultimate</span>
      </div>
      <div style={{ color: PALETTE.parchment }}>{ult.desc}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: PALETTE.textMute }}>Triggers</span>
        <span style={{ color: PALETTE.parchment, textAlign: 'right' }}>{TRIGGER_LABEL[ult.trigger] ?? ult.trigger}</span>
      </div>
      <div style={{ borderTop: `1px solid ${ULT_VIOLET_DIM}`, paddingTop: 3, color: unlocked ? PALETTE.hpGreen : PALETTE.textMute }}>
        {unlocked
          ? `✓ Unlocked — auto-fires, no slot needed.`
          : `🔒 Unlocks at level ${ult.unlockLevel} (currently Lv ${level}).`}
      </div>
      <div style={{ color: PALETTE.textMute, fontSize: 10 }}>
        Always active once unlocked — costs no ability slot and fires automatically.
      </div>
    </div>
  );
}
