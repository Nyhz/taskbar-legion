import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/state/store';
import {
  worldFirstStage,
  resumeStageFor,
  expectedLevel,
  enemyHp,
  isZoneBossStage,
} from '@/data/stageScaling';
import {
  stageLabelOf, difficultyIndexOf,
  DIFFICULTIES, DIFFICULTY_KEYS, STAGES_PER_DIFFICULTY,
} from '@/data/difficulties';
import { format } from '@/sim/num';
import { PALETTE } from '@/styles/palette';

// Travel map. Killing a boss permanently unlocks travel to every stage up to it.
// Each unlocked zone (world) expands into its ten stages: W-1..W-9 are travel
// targets, W-10 is the key-gated zone boss (shown, not a direct target). The live
// "frontier" (highest beaten boss → next stage) is one tap away at the top.
// Travelling never lowers progress — a refresh still drops you at the frontier.

function stageLabel(globalStage: number): string {
  return stageLabelOf(globalStage);
}

export function MapPanel(): React.JSX.Element {
  const hud = useStore((s) => s.hud);
  const requestTravel = useStore((s) => s.requestTravel);
  const requestEnterZoneBoss = useStore((s) => s.requestEnterZoneBoss);

  const frontier = resumeStageFor(hud.maxClearedStage);
  const maxDiff = difficultyIndexOf(frontier); // highest unlocked difficulty (0..4)
  const [selDiff, setSelDiff] = useState<number>(() => difficultyIndexOf(hud.globalStage));
  const diff = Math.min(selDiff, maxDiff);
  const [hoverStage, setHoverStage] = useState<number | null>(null);
  const detailStage = hoverStage ?? hud.globalStage;

  // The selected difficulty's reached worlds. Global world index = diff·10 + localWorld;
  // its first global stage = diff·100 + (localWorld-1)·10 + 1. Show only worlds ≤ frontier.
  const baseWorld = diff * 10;
  const localWorlds = Array.from({ length: 10 }, (_, i) => i + 1)
    .filter((lw) => diff * STAGES_PER_DIFFICULTY + (lw - 1) * 10 + 1 <= frontier);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
      {/* Frontier — return to where progression is. */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '4px 6px', background: PALETTE.bgInset, border: `1px solid ${PALETTE.goldDim}`,
        }}
      >
        <span style={{ color: PALETTE.textMute }}>
          Frontier <span style={{ color: PALETTE.gold, fontWeight: 700 }}>{stageLabel(frontier)}</span>
        </span>
        <TravelButton onClick={() => requestTravel(frontier)} label="Resume" />
      </div>

      {/* Difficulty selector — pick any UNLOCKED difficulty, then travel to any cleared stage. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: PALETTE.research, fontWeight: 700 }}>Difficulty</span>
        <DifficultyDropdown current={diff} maxUnlocked={maxDiff} onSelect={setSelDiff} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 215, overflowY: 'auto' }}>
        {localWorlds.map((lw) => (
          <ZoneRow
            key={lw}
            world={baseWorld + lw}
            localWorld={lw}
            frontier={frontier}
            maxCleared={hud.maxClearedStage}
            current={hud.globalStage}
            onHover={setHoverStage}
            onTravel={requestTravel}
            onEnterBoss={requestEnterZoneBoss}
          />
        ))}
      </div>

      <StageDetail globalStage={detailStage} maxClearedStage={hud.maxClearedStage} />
    </div>
  );
}

// Custom pixel dropdown (replaces the native <select>): shows ALL difficulties, with the
// still-locked ones greyed + 🔒 and unselectable. Menu renders to a portal so the panel
// can't clip it.
function DifficultyDropdown({
  current, maxUnlocked, onSelect,
}: {
  current: number;
  maxUnlocked: number; // highest unlocked difficulty index
  onSelect: (d: number) => void;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  const toggle = (): void => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r !== undefined) setPos({ left: r.left, top: r.bottom + 2, width: r.width });
    setOpen((o) => !o);
  };

  const sel = DIFFICULTIES[DIFFICULTY_KEYS[current]!];
  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
          fontSize: 11, fontWeight: 700, padding: '3px 6px',
          background: PALETTE.bgInset, color: PALETTE.parchment,
          border: `1px solid ${open ? PALETTE.gold : PALETTE.goldDim}`, cursor: 'pointer',
        }}
      >
        <span>{sel?.name}</span>
        <span style={{ color: PALETTE.gold }}>{open ? '▴' : '▾'}</span>
      </button>
      {open && pos !== null &&
        createPortal(
          <>
            <div onClick={() => setOpen(false)} onContextMenu={(e) => { e.preventDefault(); setOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 10000 }} />
            <div
              style={{
                position: 'fixed', left: pos.left, top: pos.top, width: pos.width, zIndex: 10001,
                background: PALETTE.bgPanel, border: `2px solid ${PALETTE.ink}`,
                boxShadow: `0 0 0 1px ${PALETTE.goldDim}, 3px 3px 0 rgba(0,0,0,0.5)`, padding: 3, fontSize: 11,
              }}
            >
              {DIFFICULTY_KEYS.map((k, d) => {
                const def = DIFFICULTIES[k];
                const locked = d > maxUnlocked;
                const isSel = d === current;
                return (
                  <button
                    key={k}
                    disabled={locked}
                    onClick={() => { if (!locked) { onSelect(d); setOpen(false); } }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left',
                      padding: '4px 6px', border: 'none', fontWeight: isSel ? 700 : 400,
                      background: isSel ? PALETTE.bgInset : 'transparent',
                      color: locked ? PALETTE.textMute : isSel ? PALETTE.gold : PALETTE.textLight,
                      cursor: locked ? 'default' : 'pointer',
                    }}
                    onMouseEnter={(e) => { if (!locked && !isSel) e.currentTarget.style.background = PALETTE.bgInset; }}
                    onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ flex: 1 }}>{def.name}</span>
                    <span>{locked ? '🔒' : isSel ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

function ZoneRow({
  world, localWorld, frontier, maxCleared, current, onHover, onTravel, onEnterBoss,
}: {
  world: number; // GLOBAL world index (drives stage math)
  localWorld: number; // 1..10 within its difficulty (display)
  frontier: number;
  maxCleared: number;
  current: number;
  onHover: (g: number | null) => void;
  onTravel: (g: number) => void;
  onEnterBoss: (world: number) => void;
}): React.JSX.Element {
  const stages = Array.from({ length: 10 }, (_, i) => i + 1);
  const nineBeaten = maxCleared >= worldFirstStage(world) + 8; // W-9 boss beaten → boss gate open
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ color: PALETTE.parchment, fontWeight: 700, fontSize: 10 }}>World {localWorld}</span>
      </div>
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {stages.map((s) => {
          const g = worldFirstStage(world) + (s - 1);
          const reached = g <= frontier;
          const beaten = g <= maxCleared;
          const isBoss = isZoneBossStage(g);
          const isCurrent = g === current;
          // W-1..W-9: travel as before. W-10: not a travel target — entered as the
          // world-boss fight once W-9 is beaten (re-fightable thereafter; no key).
          const canEnterBoss = isBoss && nineBeaten;
          const travelable = reached && !isBoss;
          const clickable = travelable || canEnterBoss;

          const bg = isCurrent ? PALETTE.titleRed : isBoss ? (canEnterBoss ? PALETTE.titleRed : PALETTE.hpBack) : !reached ? PALETTE.bgDeep : PALETTE.bgInset;
          const border = isCurrent || canEnterBoss ? PALETTE.gold : isBoss ? PALETTE.titleRedHi : reached ? PALETTE.goldDim : PALETTE.ink;
          const fg = isBoss ? (beaten ? PALETTE.gold : PALETTE.titleRedHi) : !reached ? PALETTE.textMute : PALETTE.textLight;
          const title = isBoss
            ? nineBeaten
              ? `${localWorld}-10 world boss — enter (a wall; gear up)`
              : `${localWorld}-10 world boss — beat ${localWorld}-9 first`
            : reached ? `Travel to ${localWorld}-${s}` : `${localWorld}-${s} (locked)`;

          return (
            <button
              key={s}
              disabled={!clickable}
              onMouseEnter={() => onHover(g)}
              onFocus={() => onHover(g)}
              onMouseLeave={() => onHover(null)}
              onClick={() => {
                if (travelable) onTravel(g);
                else if (canEnterBoss) onEnterBoss(world);
              }}
              title={title}
              style={{
                width: 26, height: 22, padding: 0, fontSize: 9, fontWeight: 700,
                background: bg, border: `1px solid ${border}`, color: fg,
                cursor: clickable ? 'pointer' : 'default',
                opacity: isBoss ? (canEnterBoss || beaten ? 1 : 0.55) : reached ? 1 : 0.5,
              }}
            >
              {isBoss ? (beaten ? '✓' : '⚔') : s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StageDetail({ globalStage, maxClearedStage }: { globalStage: number; maxClearedStage: number }): React.JSX.Element {
  const isBoss = isZoneBossStage(globalStage);
  const beaten = globalStage <= maxClearedStage;
  return (
    <div style={{ borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ color: PALETTE.parchment, fontWeight: 700 }}>
        Stage {stageLabel(globalStage)} {isBoss ? '⚠ world boss' : ''}
      </div>
      <Row label="Enemy level" value={`~${expectedLevel(globalStage)}`} />
      <Row label="Enemy HP" value={`~${format(Math.round(enemyHp(globalStage)))}`} />
      <Row label="Boss" value={beaten ? '✓ beaten' : isBoss ? 'a wall — gear up' : 'not yet cleared'} />
      <div style={{ color: PALETTE.textMute, fontSize: 9, marginTop: 2 }}>
        {isBoss
          ? 'World bosses are hard walls — entered from the portal at W-9 or here once W-9 is beaten.'
          : 'Travelling here never changes your refresh point (still the frontier).'}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 10, whiteSpace: 'nowrap' }}>
      <span style={{ color: PALETTE.textMute }}>{label}</span>
      <span style={{ color: PALETTE.textLight }}>{value}</span>
    </div>
  );
}

function TravelButton({ onClick, label }: { onClick: () => void; label: string }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '2px 8px', cursor: 'pointer', fontWeight: 700, fontSize: 10,
        background: PALETTE.titleRed, border: `1px solid ${PALETTE.gold}`, color: PALETTE.textLight,
      }}
    >
      {label}
    </button>
  );
}
