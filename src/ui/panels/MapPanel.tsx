import { useState } from 'react';
import { useStore } from '@/state/store';
import {
  worldFirstStage,
  resumeStageFor,
  expectedLevel,
  enemyHp,
  worldOf,
  stageInWorld,
  isZoneBossStage,
} from '@/data/stageScaling';
import { format } from '@/sim/num';
import { PALETTE } from '@/styles/palette';

// Travel map. Killing a boss permanently unlocks travel to every stage up to it.
// Each unlocked zone (world) expands into its ten stages: W-1..W-9 are travel
// targets, W-10 is the key-gated zone boss (shown, not a direct target). The live
// "frontier" (highest beaten boss → next stage) is one tap away at the top.
// Travelling never lowers progress — a refresh still drops you at the frontier.

function stageLabel(globalStage: number): string {
  return `${worldOf(globalStage)}-${stageInWorld(globalStage)}`;
}

export function MapPanel(): React.JSX.Element {
  const hud = useStore((s) => s.hud);
  const requestTravel = useStore((s) => s.requestTravel);
  const requestEnterZoneBoss = useStore((s) => s.requestEnterZoneBoss);
  const zoneKeys = hud.zoneKeys;

  const frontier = resumeStageFor(hud.maxClearedStage);
  const topWorld = worldOf(frontier);
  const worlds = Array.from({ length: topWorld }, (_, i) => i + 1);
  const [hoverStage, setHoverStage] = useState<number | null>(null);
  const detailStage = hoverStage ?? hud.globalStage;

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

      <div style={{ color: PALETTE.research, fontWeight: 700 }}>Zones</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 230, overflowY: 'auto' }}>
        {worlds.map((w) => (
          <ZoneRow
            key={w}
            world={w}
            frontier={frontier}
            maxCleared={hud.maxClearedStage}
            current={hud.globalStage}
            keys={zoneKeys[w] ?? 0}
            onHover={setHoverStage}
            onTravel={requestTravel}
            onEnterBoss={requestEnterZoneBoss}
          />
        ))}
      </div>

      <StageDetail globalStage={detailStage} maxClearedStage={hud.maxClearedStage} zoneKeys={zoneKeys} />
    </div>
  );
}

function ZoneRow({
  world, frontier, maxCleared, current, keys, onHover, onTravel, onEnterBoss,
}: {
  world: number;
  frontier: number;
  maxCleared: number;
  current: number;
  keys: number;
  onHover: (g: number | null) => void;
  onTravel: (g: number) => void;
  onEnterBoss: (world: number) => void;
}): React.JSX.Element {
  const stages = Array.from({ length: 10 }, (_, i) => i + 1);
  const nineBeaten = maxCleared >= worldFirstStage(world) + 8; // W-9 boss beaten → boss gate open
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ color: PALETTE.parchment, fontWeight: 700, fontSize: 10 }}>Zone {world}</span>
        <span style={{ color: keys > 0 ? PALETTE.titleRedHi : PALETTE.textMute, fontWeight: 700, fontSize: 10 }}>🗝 {keys}</span>
      </div>
      <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {stages.map((s) => {
          const g = worldFirstStage(world) + (s - 1);
          const reached = g <= frontier;
          const beaten = g <= maxCleared;
          const isBoss = isZoneBossStage(g);
          const isCurrent = g === current;
          // W-1..W-9: travel as before. W-10: not a travel target — entered with a key,
          // available once W-9 is beaten and a key is held (re-farmable thereafter).
          const canEnterBoss = isBoss && nineBeaten && keys >= 1;
          const travelable = reached && !isBoss;
          const clickable = travelable || canEnterBoss;

          const bg = isCurrent ? PALETTE.titleRed : isBoss ? (canEnterBoss ? PALETTE.titleRed : PALETTE.hpBack) : !reached ? PALETTE.bgDeep : PALETTE.bgInset;
          const border = isCurrent || canEnterBoss ? PALETTE.gold : isBoss ? PALETTE.titleRedHi : reached ? PALETTE.goldDim : PALETTE.ink;
          const fg = isBoss ? (beaten ? PALETTE.gold : PALETTE.titleRedHi) : !reached ? PALETTE.textMute : PALETTE.textLight;
          const title = isBoss
            ? nineBeaten
              ? `${world}-10 world boss — costs 1 key (you have ${keys})`
              : `${world}-10 world boss — beat ${world}-9 first`
            : reached ? `Travel to ${world}-${s}` : `${world}-${s} (locked)`;

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
              {isBoss ? (beaten ? '✓' : '🗝') : s}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StageDetail({ globalStage, maxClearedStage, zoneKeys }: { globalStage: number; maxClearedStage: number; zoneKeys: Record<number, number> }): React.JSX.Element {
  const isBoss = isZoneBossStage(globalStage);
  const beaten = globalStage <= maxClearedStage;
  const world = worldOf(globalStage);
  const keys = zoneKeys[world] ?? 0;
  return (
    <div style={{ borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ color: PALETTE.parchment, fontWeight: 700 }}>
        Stage {stageLabel(globalStage)} {isBoss ? '⚠ world boss' : ''}
      </div>
      <Row label="Enemy level" value={`~${expectedLevel(globalStage)}`} />
      <Row label="Enemy HP" value={`~${format(Math.round(enemyHp(globalStage)))}`} />
      <Row label="Boss" value={beaten ? '✓ beaten' : isBoss ? 'needs a zone key' : 'not yet cleared'} />
      {isBoss && <Row label="Cost" value={`1 🗝 (you have ${keys})`} />}
      <div style={{ color: PALETTE.textMute, fontSize: 9, marginTop: 2 }}>
        {isBoss
          ? 'World bosses cost 1 zone key — entered from the portal at W-9 or here. The key is spent even on a loss.'
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
