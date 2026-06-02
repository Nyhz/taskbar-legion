import { useStore } from '@/state/store';
import { getBonuses } from '@/sim/bonuses';
import { chestCapacity } from '@/sim/chests';
import { CHEST_TYPES, chestCountOf, type ChestType } from '@/data/chests';
import { openChestPopup } from '@/ui/loot/revealLoot';
import { PALETTE } from '@/styles/palette';

// Per-type chest popups floating over the strip. A popup appears the moment you
// hold ≥1 chest of a type: a chest placeholder + one square per storage slot
// (filled as chests drop in). Click it to crack every chest of that type — the
// popup vanishes and the loot streams into the bag (see revealLoot).

const LABEL: Record<ChestType, string> = { normal: 'Normal', stageBoss: 'Stage Boss', zoneBoss: 'Zone Boss' };
const GLYPH: Record<ChestType, string> = { normal: '📦', stageBoss: '🎁', zoneBoss: '💎' };
const FILL: Record<ChestType, string> = { normal: PALETTE.parchment, stageBoss: PALETTE.gold, zoneBoss: PALETTE.research };
const COLUMNS: Record<ChestType, number> = { normal: 3, stageBoss: 2, zoneBoss: 2 };

export function ChestPopups(): React.JSX.Element | null {
  const chests = useStore((s) => s.chests);
  const techRanks = useStore((s) => s.techRanks);
  const ownedPets = useStore((s) => s.ownedPets);
  const bonuses = getBonuses(techRanks, ownedPets);

  const stacks = CHEST_TYPES.map((type) => ({
    type,
    count: chestCountOf(chests, type), // sum across drop-stage stacks of this type
    capacity: chestCapacity(type, bonuses),
  })).filter((s) => s.count > 0);

  if (stacks.length === 0) return null;

  return (
    <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {stacks.map(({ type, count, capacity }) => (
        <Popup key={type} type={type} count={count} capacity={capacity} />
      ))}
    </div>
  );
}

function Popup({ type, count, capacity }: { type: ChestType; count: number; capacity: number }): React.JSX.Element {
  return (
    <button
      data-interactive="true"
      title={`Open ${count} ${LABEL[type]} chest${count === 1 ? '' : 's'}`}
      onClick={() => openChestPopup(type)}
      style={{
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 6px',
        background: PALETTE.bgPanel,
        border: `1px solid ${PALETTE.gold}`,
        color: PALETTE.textLight,
      }}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{GLYPH[type]}</span>
      <span
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLUMNS[type]}, 9px)`,
          gap: 2,
        }}
      >
        {Array.from({ length: capacity }, (_, i) => (
          <span
            key={i}
            style={{
              width: 9,
              height: 9,
              background: i < count ? FILL[type] : PALETTE.bgInset,
              border: `1px solid ${i < count ? PALETTE.goldDim : PALETTE.ink}`,
            }}
          />
        ))}
      </span>
    </button>
  );
}
