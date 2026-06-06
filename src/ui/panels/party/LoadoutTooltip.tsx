import { useStore } from '@/state/store';
import type { Loadout } from '@/persistence/saveSchema';
import { SLOT_KEYS, SLOTS, type SlotKey } from '@/data/itemSlots';
import { SLOT_ICON, abilityIcon } from '@/ui/icons';
import { tierStyle, tierName } from '@/ui/tierStyle';
import { classDef } from '@/data/classes';
import { tryAbilityDef } from '@/data/abilities';
import { findEntry } from '@/sim/slots';
import { isItem, type ItemInstance } from '@/sim/items';
import { PALETTE } from '@/styles/palette';
import { LOADOUT_LABELS } from '@/state/slices/partySlice';

// Rich hover card for a Farm/Boss loadout slot — a pixel-art panel matching the item tooltip:
// a gold title bar, an Equipment block (each saved slot with its tier-coloured grade + ilvl,
// flagging anything sold/unavailable), a Talents block (points spent + active abilities), and
// an action hint. Empty slots show a save prompt instead. The native `title` attribute doesn't
// render in the Tauri overlay webview, so this custom card is how loadout hover info shows at all.

export const LOADOUT_TIP_W = 224;

export function LoadoutTooltip({ heroId, index }: { heroId: string; index: number }): React.JSX.Element {
  const hero = useStore((s) => s.roster.find((h) => h.id === heroId));
  const inventory = useStore((s) => s.inventory);
  const stash = useStore((s) => s.stash);
  const lo = hero?.loadouts?.[index] ?? null;
  const label = LOADOUT_LABELS[index] ?? 'Loadout';

  // Resolve a saved item id from wherever it currently lives (own gear, bag, stash); undefined
  // means it was sold, deleted, or is now worn by another hero — i.e. it won't load.
  const resolve = (id: string): ItemInstance | undefined => {
    const eq = hero === undefined ? undefined : Object.values(hero.equipment).find((it) => it?.id === id);
    if (eq !== undefined) return eq;
    const f = findEntry(inventory, id) ?? findEntry(stash, id);
    return f !== undefined && isItem(f) ? f : undefined;
  };

  const accent = lo === null ? PALETTE.goldDim : PALETTE.gold;

  return (
    <div
      style={{
        width: LOADOUT_TIP_W,
        background: PALETTE.bgDeep,
        border: `2px solid ${accent}`,
        boxShadow: `0 0 0 1px ${PALETTE.ink}, 4px 4px 0 rgba(0,0,0,0.6)`,
        fontSize: 11,
        lineHeight: 1.5,
        imageRendering: 'pixelated',
      }}
    >
      {/* title bar */}
      <div
        style={{
          background: PALETTE.bgInset,
          borderBottom: `2px solid ${accent}`,
          boxShadow: `inset 0 0 0 1px ${PALETTE.ink}`,
          padding: '4px 6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 700,
          letterSpacing: 0.3,
          color: accent,
        }}
      >
        <span>{'⚔️'} {label} Loadout</span>
        {hero !== undefined && <span style={{ color: PALETTE.textMute, fontSize: 9, fontWeight: 400 }}>{classDef(hero.classKey).name}</span>}
      </div>

      <div style={{ padding: 6 }}>
        {lo === null ? (
          <EmptyBody />
        ) : (
          <SavedBody lo={lo} resolve={resolve} heroClass={hero?.classKey} />
        )}
      </div>
    </div>
  );
}

function EmptyBody(): React.JSX.Element {
  return (
    <div style={{ textAlign: 'center', padding: '6px 2px' }}>
      <div style={{ fontSize: 22, color: PALETTE.goldDim, marginBottom: 4 }}>＋</div>
      <div style={{ color: PALETTE.textLight, fontWeight: 700, marginBottom: 2 }}>No loadout saved</div>
      <div style={{ color: PALETTE.textMute, fontSize: 10, lineHeight: 1.3 }}>
        Right-click → <span style={{ color: PALETTE.gold }}>Save current loadout</span> to store this hero's gear &amp; talents here.
      </div>
    </div>
  );
}

function SavedBody({
  lo,
  resolve,
  heroClass,
}: {
  lo: Loadout;
  resolve: (id: string) => ItemInstance | undefined;
  heroClass: string | undefined;
}): React.JSX.Element {
  // Saved gear in canonical paper-doll order; flag any piece that won't load.
  const rows = SLOT_KEYS.flatMap((slot) => {
    const id = lo.items[slot];
    if (id === undefined) return [];
    return [{ slot, item: resolve(id) }];
  });
  const missing = rows.filter((r) => r.item === undefined).length;
  const pointsSpent = Object.values(lo.talents).reduce((a, b) => a + b, 0);
  const wrongClass = heroClass !== undefined && lo.classKey !== heroClass;
  const abilities = lo.activeAbilities.map((k) => tryAbilityDef(k)).filter((d): d is NonNullable<typeof d> => d !== undefined);

  return (
    <>
      <SectionHeader glyph="🛡️" label={`Equipment (${rows.length - missing}/${rows.length})`} />
      {rows.length === 0 ? (
        <div style={{ color: PALETTE.textMute, paddingLeft: 2 }}>— no gear —</div>
      ) : (
        rows.map(({ slot, item }) => <GearRow key={slot} slot={slot} item={item} />)
      )}
      {missing > 0 && (
        <div style={{ color: PALETTE.enemyAccent, fontSize: 9, marginTop: 2 }}>
          {missing} item{missing > 1 ? 's' : ''} unavailable — loading skips {missing > 1 ? 'them' : 'it'}.
        </div>
      )}

      <SectionHeader glyph="✦" label="Talents" />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ color: PALETTE.textMute }}>Points spent</span>
        <span style={{ color: PALETTE.textLight, fontWeight: 700 }}>{pointsSpent}</span>
      </div>
      {abilities.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
          {abilities.map((d) => (
            <span key={d.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: PALETTE.textLight }}>
              <span style={{ fontSize: 12 }}>{abilityIcon(d)}</span>
              {d.name}
            </span>
          ))}
        </div>
      )}
      {wrongClass && (
        <div style={{ color: PALETTE.enemyAccent, fontSize: 9, marginTop: 2 }}>
          Saved as {classDef(lo.classKey).name} — talents won't apply to this class.
        </div>
      )}

      {/* footer hint */}
      <div style={{ marginTop: 6, paddingTop: 4, borderTop: `1px solid ${PALETTE.ink}`, color: PALETTE.textMute, fontSize: 9, lineHeight: 1.3 }}>
        <span style={{ color: PALETTE.gold }}>Click</span> to load · <span style={{ color: PALETTE.gold }}>right-click</span> to overwrite / clear.
      </div>
    </>
  );
}

// One equipment line: slot icon + tier-coloured "Grade Slot" + ilvl, or a red "unavailable".
function GearRow({ slot, item }: { slot: SlotKey; item: ItemInstance | undefined }): React.JSX.Element {
  const ts = item !== undefined ? tierStyle(item.tier) : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 14, textAlign: 'center', fontSize: 10 }}>{SLOT_ICON[slot]}</span>
      {item === undefined || ts === null ? (
        <span style={{ flex: 1, color: PALETTE.textMute }}>{SLOTS[slot].label} <span style={{ color: PALETTE.enemyAccent }}>· unavailable</span></span>
      ) : (
        <>
          <span className={ts.iridescent ? 'tl-iridescent' : undefined} style={{ flex: 1, color: ts.color, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tierName(item.tier)} {SLOTS[slot].label}
          </span>
          <span style={{ color: PALETTE.textMute, fontSize: 10 }}>Lv{item.ilvl}</span>
        </>
      )}
    </div>
  );
}

function SectionHeader({ glyph, label }: { glyph: string; label: string }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: PALETTE.gold, fontWeight: 700, margin: '6px 0 2px', borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 4 }}>
      <span style={{ fontSize: 10 }}>{glyph}</span>
      {label}
    </div>
  );
}
