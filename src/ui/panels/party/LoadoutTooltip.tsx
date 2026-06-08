import { useStore } from '@/state/store';
import type { Loadout } from '@/persistence/saveSchema';
import { abilityIcon } from '@/ui/icons';
import { classDef } from '@/data/classes';
import { tryAbilityDef } from '@/data/abilities';
import { PALETTE } from '@/styles/palette';
import { LOADOUT_LABELS } from '@/state/slices/partySlice';

// Rich hover card for a Farm/Boss loadout slot — a pixel-art panel matching the item tooltip:
// a gold title bar and a Talents block (points spent + active abilities). Loadouts are
// talent-only (they never store gear), so there's no equipment section. Empty slots show a
// save prompt instead. The native `title` attribute doesn't render in the Tauri overlay
// webview, so this custom card is how loadout hover info shows at all.

export const LOADOUT_TIP_W = 224;

export function LoadoutTooltip({ heroId, index }: { heroId: string; index: number }): React.JSX.Element {
  const hero = useStore((s) => s.roster.find((h) => h.id === heroId));
  const lo = hero?.loadouts?.[index] ?? null;
  const label = LOADOUT_LABELS[index] ?? 'Loadout';

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
        <span>{'✦'} {label} Talents</span>
        {hero !== undefined && <span style={{ color: PALETTE.textMute, fontSize: 9, fontWeight: 400 }}>{classDef(hero.classKey).name}</span>}
      </div>

      <div style={{ padding: 6 }}>
        {lo === null ? <EmptyBody /> : <SavedBody lo={lo} heroClass={hero?.classKey} />}
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
        Right-click → <span style={{ color: PALETTE.gold }}>Save current loadout</span> to store this hero's talents here.
      </div>
    </div>
  );
}

function SavedBody({ lo, heroClass }: { lo: Loadout; heroClass: string | undefined }): React.JSX.Element {
  const pointsSpent = Object.values(lo.talents).reduce((a, b) => a + b, 0);
  const wrongClass = heroClass !== undefined && lo.classKey !== heroClass;
  const abilities = lo.activeAbilities.map((k) => tryAbilityDef(k)).filter((d): d is NonNullable<typeof d> => d !== undefined);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ color: PALETTE.textMute }}>Points spent</span>
        <span style={{ color: PALETTE.textLight, fontWeight: 700 }}>{pointsSpent}</span>
      </div>
      {abilities.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          {abilities.map((d) => (
            <span key={d.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: PALETTE.textLight }}>
              <span style={{ fontSize: 12 }}>{abilityIcon(d)}</span>
              {d.name}
            </span>
          ))}
        </div>
      )}
      {wrongClass && (
        <div style={{ color: PALETTE.enemyAccent, fontSize: 9, marginTop: 4 }}>
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
