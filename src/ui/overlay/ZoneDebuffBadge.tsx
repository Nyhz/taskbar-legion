import { useState } from 'react';
import { useStore } from '@/state/store';
import { HEAL_POWER_EFFECTIVENESS, DIFFICULTY_KEYS, difficultyByIndex, difficultyIndexOf } from '@/data/difficulties';
import { PALETTE } from '@/styles/palette';

// A reddish skull pinned to the strip's top-right: the current zone's HEAL-POWER debuff. Each
// difficulty devalues heal power (a treadmill that forces the priest to keep upgrading), so the
// badge surfaces "healing is harder here" with a custom hover tooltip listing every difficulty.

export function ZoneDebuffBadge(): React.JSX.Element {
  const globalStage = useStore((s) => s.hud.globalStage);
  const [hover, setHover] = useState(false);
  const curIdx = difficultyIndexOf(globalStage);
  const reductionPct = Math.round((1 - (HEAL_POWER_EFFECTIVENESS[DIFFICULTY_KEYS[curIdx] ?? 'normal'])) * 100);
  if (reductionPct <= 0) return <></>; // no heal debuff here (Normal) → no skull

  return (
    <div
      style={{ position: 'absolute', top: 4, right: 4, pointerEvents: 'auto', zIndex: 6 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span style={{ fontSize: 17, lineHeight: 1, color: '#d23b3b', cursor: 'help', textShadow: '0 0 3px #000, 0 0 2px #000' }}>☠</span>
      {hover && <DebuffTooltip curIdx={curIdx} reductionPct={reductionPct} />}
    </div>
  );
}

function DebuffTooltip({ curIdx, reductionPct }: { curIdx: number; reductionPct: number }): React.JSX.Element {
  return (
    <div
      style={{
        position: 'absolute', top: 22, right: 0, width: 230, zIndex: 20,
        background: PALETTE.bgPanel, border: `1px solid ${PALETTE.titleRedHi}`,
        padding: '7px 9px', fontSize: 10, color: PALETTE.textLight, lineHeight: 1.4,
        boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ color: '#ff7a7a', fontWeight: 700, marginBottom: 3 }}>☠ Sacred Resistance</div>
      <div style={{ color: PALETTE.textMute, marginBottom: 5 }}>
        Healing grows harder each difficulty: heal power is <b style={{ color: '#ff9a9a' }}>−{reductionPct}%</b> effective in this zone. Keep upgrading the priest to hold your sustain.
      </div>
      {DIFFICULTY_KEYS.map((key, i) => {
        const red = Math.round((1 - HEAL_POWER_EFFECTIVENESS[key]) * 100);
        const here = i === curIdx;
        return (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', color: here ? PALETTE.gold : PALETTE.textMute, fontWeight: here ? 700 : 400 }}>
            <span>{here ? '▸ ' : ''}{difficultyByIndex(i).name}</span>
            <span>heal power −{red}%</span>
          </div>
        );
      })}
    </div>
  );
}
