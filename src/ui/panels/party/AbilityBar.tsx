import { useStore } from '@/state/store';
import { getEngine } from '@/game/engineRef';
import { heroAbilities, MAX_ACTIVE_ABILITIES } from '@/sim/loadout';
import { tryAbilityDef } from '@/data/abilities';
import { abilityIcon } from '@/ui/icons';
import { PALETTE } from '@/styles/palette';
import { UltimateSlot } from './UltimateSlot';

// The selected hero's combat loadout, centered below the paper doll: the class ULTIMATE
// pinned on the left, then the hero's (≤2) ranked abilities as live-cooldown icons. The
// ranked abilities ARE the active loadout — they're chosen by spending talent points (the
// tree caps you at MAX_ACTIVE_ABILITIES), so there's no picker and no "active" toggle here.
// Subscribes to `hud` so the cooldown rings tick ~each frame.

export function AbilityBar({ heroId }: { heroId: string }): React.JSX.Element {
  useStore((s) => s.hud); // refresh ~per frame for live cooldowns
  const hero = useStore((s) => s.roster.find((h) => h.id === heroId));
  if (hero === undefined) return <div />;

  const pool = heroAbilities(hero.classKey, hero.talents).slice(0, MAX_ACTIVE_ABILITIES);
  const combatant = getEngine()?.world.heroes.find((h) => h.id === heroId);

  return (
    <div style={{ width: '100%', marginTop: 2, borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {/* The class ultimate (with its level requirement), pinned to the left of the row. */}
      <UltimateSlot classKey={hero.classKey} level={hero.level} />
      <span style={{ width: 1, height: 22, background: PALETTE.goldDim }} />

      {/* The two ability slots — filled by whatever the hero has ranked in Talents. */}
      {[0, 1].map((i) => {
        const entry = pool[i];
        // A stale key (e.g. a renamed ability left in an old save) resolves to nothing —
        // show an empty slot instead of throwing and blacking out the whole UI.
        const def = entry === undefined ? undefined : tryAbilityDef(entry.def.key);
        if (entry === undefined || def === undefined) return <EmptySlot key={i} />;
        const key = entry.def.key;
        const chargeMax = def.charge?.toCast;
        const charge = chargeMax !== undefined ? { cur: combatant?.charges?.[key] ?? 0, max: chargeMax } : undefined;
        const remaining = combatant?.cooldowns[key] ?? 0;
        const total = combatant?.cooldownTotals?.[key] ?? 0;
        return <ActiveSlot key={i} abilityKey={key} remaining={remaining} total={total} charge={charge} />;
      })}
    </div>
  );
}

function ActiveSlot({ abilityKey, remaining, total, charge }: { abilityKey: string; remaining: number; total: number; charge?: { cur: number; max: number } }): React.JSX.Element {
  const def = tryAbilityDef(abilityKey);
  if (def === undefined) return <EmptySlot />; // unknown/renamed key — never crash the row
  // Passive aura (e.g. Retribution Aura): always on while ranked — no cooldown/charge.
  if (def.aura !== undefined) {
    return (
      <div
        title={`${def.name} — passive (always active) · ${def.desc}`}
        style={{
          position: 'relative', width: 30, height: 30, fontSize: 15, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle at 38% 32%, #34304a 0%, #1b1726 80%)',
          border: `2px solid ${PALETTE.gold}`, boxShadow: `0 0 6px ${PALETTE.gold}`,
          borderRadius: '50%', color: PALETTE.textLight,
        }}
      >
        <span>{abilityIcon(def)}</span>
      </div>
    );
  }
  // Charge-gated ability (e.g. Aimed Shot): show a bottom-up charge fill + "cur/max".
  if (charge !== undefined) {
    const ready = charge.cur >= charge.max;
    const frac = Math.max(0, Math.min(1, charge.cur / Math.max(1, charge.max)));
    return (
      <div
        title={`${def.name} — ${charge.cur}/${charge.max} charges (1 per auto-attack) · ${def.desc}`}
        style={{
          position: 'relative', width: 30, height: 30, fontSize: 15, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle at 38% 32%, #2c2536 0%, #15121c 80%)',
          border: `2px solid ${ready ? PALETTE.gold : PALETTE.goldDim}`,
          boxShadow: ready ? `0 0 6px ${PALETTE.gold}` : 'none',
          borderRadius: '50%', color: PALETTE.textLight,
        }}
      >
        {!ready && <span style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: `${frac * 100}%`, background: 'rgba(90,150,210,0.35)' }} />}
        <span style={{ position: 'relative', opacity: ready ? 1 : 0.7 }}>{abilityIcon(def)}</span>
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: PALETTE.textLight }}>
          {charge.cur}/{charge.max}
        </span>
      </div>
    );
  }
  const onCd = remaining > 0 && total > 0;
  const frac = onCd ? Math.max(0, Math.min(1, remaining / total)) : 0; // share still on cooldown
  return (
    <div
      title={`${def.name} — ${def.desc}`}
      style={{
        position: 'relative', width: 30, height: 30, fontSize: 15, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(circle at 38% 32%, #2c2536 0%, #15121c 80%)',
        border: `2px solid ${onCd ? PALETTE.goldDim : PALETTE.gold}`,
        boxShadow: onCd ? 'none' : `0 0 6px ${PALETTE.gold}`,
        borderRadius: '50%', color: PALETTE.textLight,
      }}
    >
      <span style={{ opacity: onCd ? 0.55 : 1 }}>{abilityIcon(def)}</span>
      {onCd && (
        <>
          {/* dark sweep covering the remaining cooldown share, draining top→bottom */}
          <span style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: `${frac * 100}%`, background: 'rgba(8,6,12,0.62)' }} />
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: PALETTE.textLight }}>
            {remaining >= 1000 ? Math.ceil(remaining / 1000) : (remaining / 1000).toFixed(1)}
          </span>
        </>
      )}
    </div>
  );
}

function EmptySlot(): React.JSX.Element {
  return (
    <div
      title="No ability — rank one in the Talents tab"
      style={{ width: 30, height: 30, borderRadius: '50%', border: `2px dashed ${PALETTE.goldDim}`, color: PALETTE.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
    >
      ＋
    </div>
  );
}
