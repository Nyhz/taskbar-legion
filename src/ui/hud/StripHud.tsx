import { useStore } from '@/state/store';
import { format } from '@/sim/num';
import { CLASS_ACCENT } from '@/game/render/textures';
import { classDef } from '@/data/classes';
import { stageLabelOf } from '@/data/difficulties';
import { ScaleControls } from './ScaleControls';
import { PALETTE } from '@/styles/palette';

// The always-visible HUD row above the strip: stage label W-S, stage progress
// bar, gold (big-number formatted), and the chest tray — all driven by the live
// HUD snapshot the engine pushes. The single Menu button opens the party menu, which
// hosts the rest of the panel launchers.

export function StripHud(): React.JSX.Element {
  const hud = useStore((s) => s.hud);
  const toggleMenu = useStore((s) => s.toggleMenu);
  const menuOpen = useStore((s) => s.openPanels.includes('party'));
  const stageLabel = `${stageLabelOf(hud.globalStage)}${hud.phase === 'zoneBoss' ? ' ⚠' : ''}`;

  return (
    <div
      data-interactive="true"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '4px 6px',
        background: PALETTE.bgPanel,
        borderTop: `2px solid ${PALETTE.ink}`,
        borderBottom: `1px solid ${PALETTE.goldDim}`,
        color: PALETTE.textLight,
        fontSize: 12,
      }}
    >
      <button
        onClick={toggleMenu}
        title="Open the menu"
        style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', cursor: 'pointer',
          fontSize: 12, fontWeight: 700, letterSpacing: 1,
          background: menuOpen ? PALETTE.titleRed : PALETTE.bgInset,
          border: `1px solid ${menuOpen ? PALETTE.gold : PALETTE.ink}`,
          color: menuOpen ? PALETTE.gold : PALETTE.parchment,
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>☰</span> MENU
      </button>

      <span style={{ fontWeight: 700, color: PALETTE.gold, letterSpacing: 1 }}>TASKBAR LEGION</span>

      <span style={{ color: PALETTE.textMute }}>
        Stage <span style={{ color: PALETTE.parchment, fontWeight: 700 }}>{stageLabel}</span>
      </span>

      <ProgressBar value={hud.phase === 'boss' || hud.phase === 'zoneBoss' ? 1 : hud.stageProgress} boss={hud.phase === 'boss' || hud.phase === 'zoneBoss'} />

      <PartyLevels party={hud.party} />
      <Counter label="Gold" value={format(hud.gold)} color={PALETTE.gold} />
      <ChestTray chests={hud.chests} />
      <ZoneKeys held={hud.zoneKeysHeld} />

      <div style={{ flex: 1 }} />
      <ScaleControls />
    </div>
  );
}

function ProgressBar({ value, boss }: { value: number; boss: boolean }): React.JSX.Element {
  return (
    <div style={{ width: 120, height: 10, background: PALETTE.bgInset, border: `1px solid ${PALETTE.ink}` }}>
      <div
        style={{
          width: `${Math.round(value * 100)}%`,
          height: '100%',
          background: boss ? PALETTE.titleRedHi : PALETTE.hpGreen,
          transition: 'width 120ms linear',
        }}
      />
    </div>
  );
}

// One Lv readout per fielded hero, each tagged with its class color (heroes can
// sit at different levels — a late recruit starts at level 1 even though XP is shared).
function PartyLevels({ party }: { party: { classKey: string; level: number }[] }): React.JSX.Element {
  const list = party.length > 0 ? party : [{ classKey: 'knight', level: 1 }];
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: PALETTE.textMute }}>Lv</span>
      {list.map((h, i) => (
        <span key={i} title={classDef(h.classKey).name} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 7, height: 7, background: CLASS_ACCENT[h.classKey] ?? '#888', border: `1px solid ${PALETTE.ink}` }} />
          <span style={{ color: PALETTE.xpBlue, fontWeight: 700 }}>{h.level}</span>
        </span>
      ))}
    </span>
  );
}

// World-boss keys held for the CURRENT zone (world+difficulty) — one is spent to challenge
// this zone's X-10 boss (even on a wipe). Earned from the zone's stage-boss chests.
function ZoneKeys({ held }: { held: number }): React.JSX.Element {
  return (
    <span title="World-boss keys for this zone — one spent per X-10 attempt (even on a wipe)" style={{ color: PALETTE.textMute }}>
      🗝<span style={{ color: held > 0 ? PALETTE.gold : PALETTE.textMute, fontWeight: 700 }}>{held}</span>
    </span>
  );
}

function Counter({ label, value, color }: { label: string; value: string; color: string }): React.JSX.Element {
  return (
    <span style={{ color: PALETTE.textMute }}>
      {label}: <span style={{ color, fontWeight: 700 }}>{value}</span>
    </span>
  );
}

function ChestTray({ chests }: { chests: Record<string, number> }): React.JSX.Element {
  const items: { glyph: string; n: number; color: string }[] = [
    { glyph: '📦', n: chests.normal ?? 0, color: PALETTE.parchment },
    { glyph: '🎁', n: chests.stageBoss ?? 0, color: PALETTE.gold },
    { glyph: '💎', n: chests.zoneBoss ?? 0, color: PALETTE.research },
  ];
  return (
    <span style={{ display: 'flex', gap: 6 }}>
      {items.map((it) => (
        <span key={it.glyph} style={{ color: PALETTE.textMute }}>
          {it.glyph}
          <span style={{ color: it.color, fontWeight: 700 }}>{it.n}</span>
        </span>
      ))}
    </span>
  );
}
