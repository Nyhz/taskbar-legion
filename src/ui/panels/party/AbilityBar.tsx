import { useStore } from '@/state/store';
import { getEngine } from '@/game/engineRef';
import { heroAbilities } from '@/sim/loadout';
import { tryAbilityDef } from '@/data/abilities';
import { abilityIcon } from '@/ui/icons';
import { PALETTE } from '@/styles/palette';

// The selected hero's active abilities (max 2) with LIVE cooldowns, plus a picker of
// every unlocked ability to choose the two from. Subscribes to `hud` so the cooldown
// rings tick ~each frame; reads the sim combatant for remaining/total cooldown.

export function AbilityBar({ heroId }: { heroId: string }): React.JSX.Element {
  useStore((s) => s.hud); // refresh ~per frame for live cooldowns
  const hero = useStore((s) => s.roster.find((h) => h.id === heroId));
  const toggle = useStore((s) => s.toggleActiveAbility);
  if (hero === undefined) return <div />;

  const pool = heroAbilities(hero.classKey, hero.talents);
  const active = hero.activeAbilities ?? [];
  const combatant = getEngine()?.world.heroes.find((h) => h.id === heroId);

  return (
    // One compact row: label · the two active slots · a divider · the picker. Wraps
    // only if the ability pool is large.
    <div style={{ width: '100%', marginTop: 2, borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ whiteSpace: 'nowrap' }}>
        <span style={{ color: PALETTE.gold, fontWeight: 700, fontSize: 11 }}>Abilities </span>
        <span style={{ color: PALETTE.textMute, fontSize: 10 }}>{active.length}/2</span>
      </span>

      {[0, 1].map((i) => {
        const key = active[i];
        // A stale key (e.g. a renamed ability left in an old save) resolves to nothing —
        // show an empty slot instead of throwing and blacking out the whole UI.
        const def = key === undefined ? undefined : tryAbilityDef(key);
        if (key === undefined || def === undefined) return <EmptySlot key={i} />;
        const chargeMax = def.charge?.toCast;
        const charge = chargeMax !== undefined ? { cur: combatant?.charges?.[key] ?? 0, max: chargeMax } : undefined;
        const remaining = combatant?.cooldowns[key] ?? 0;
        const total = combatant?.cooldownTotals?.[key] ?? 0;
        return <ActiveSlot key={i} abilityKey={key} remaining={remaining} total={total} charge={charge} onClear={() => toggle(heroId, key)} />;
      })}

      {pool.length === 0 ? (
        <span style={{ color: PALETTE.textMute, fontSize: 10 }}>· Rank an ability in Talents</span>
      ) : (
        <>
          <span style={{ width: 1, height: 22, background: PALETTE.goldDim }} />
          {pool.map(({ def }) => {
            const on = active.includes(def.key);
            return (
              <button
                key={def.key}
                title={`${def.name} — ${def.desc}`}
                onClick={() => toggle(heroId, def.key)}
                style={{
                  width: 22, height: 22, fontSize: 12, padding: 0,
                  background: 'radial-gradient(circle at 38% 32%, #2c2536 0%, #15121c 80%)',
                  border: `2px solid ${on ? PALETTE.gold : PALETTE.ink}`,
                  boxShadow: on ? `0 0 6px ${PALETTE.gold}` : 'none',
                  borderRadius: '50%', color: PALETTE.textLight, cursor: 'pointer',
                }}
              >
                {abilityIcon(def)}
              </button>
            );
          })}
        </>
      )}
    </div>
  );
}

function ActiveSlot({ abilityKey, remaining, total, charge, onClear }: { abilityKey: string; remaining: number; total: number; charge?: { cur: number; max: number }; onClear: () => void }): React.JSX.Element {
  const def = tryAbilityDef(abilityKey);
  if (def === undefined) return <EmptySlot />; // unknown/renamed key — never crash the row
  // Passive aura (e.g. Retribution Aura): always on while slotted — no cooldown/charge.
  if (def.aura !== undefined) {
    return (
      <button
        title={`${def.name} — passive (always active while slotted) · ${def.desc}`}
        onClick={onClear}
        style={{
          position: 'relative', width: 30, height: 30, fontSize: 15, padding: 0, overflow: 'hidden',
          background: 'radial-gradient(circle at 38% 32%, #34304a 0%, #1b1726 80%)',
          border: `2px solid ${PALETTE.gold}`, boxShadow: `0 0 6px ${PALETTE.gold}`,
          borderRadius: '50%', color: PALETTE.textLight, cursor: 'pointer',
        }}
      >
        <span>{abilityIcon(def)}</span>
      </button>
    );
  }
  // Charge-gated ability (e.g. Aimed Shot): show a bottom-up charge fill + "cur/max".
  if (charge !== undefined) {
    const ready = charge.cur >= charge.max;
    const frac = Math.max(0, Math.min(1, charge.cur / Math.max(1, charge.max)));
    return (
      <button
        title={`${def.name} — ${charge.cur}/${charge.max} charges (1 per auto-attack)`}
        onClick={onClear}
        style={{
          position: 'relative', width: 30, height: 30, fontSize: 15, padding: 0, overflow: 'hidden',
          background: 'radial-gradient(circle at 38% 32%, #2c2536 0%, #15121c 80%)',
          border: `2px solid ${ready ? PALETTE.gold : PALETTE.goldDim}`,
          boxShadow: ready ? `0 0 6px ${PALETTE.gold}` : 'none',
          borderRadius: '50%', color: PALETTE.textLight, cursor: 'pointer',
        }}
      >
        {!ready && <span style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: `${frac * 100}%`, background: 'rgba(90,150,210,0.35)' }} />}
        <span style={{ position: 'relative', opacity: ready ? 1 : 0.7 }}>{abilityIcon(def)}</span>
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: PALETTE.textLight }}>
          {charge.cur}/{charge.max}
        </span>
      </button>
    );
  }
  const onCd = remaining > 0 && total > 0;
  const frac = onCd ? Math.max(0, Math.min(1, remaining / total)) : 0; // share still on cooldown
  return (
    <button
      title={`${def.name} — click to unassign`}
      onClick={onClear}
      style={{
        position: 'relative', width: 30, height: 30, fontSize: 15, padding: 0, overflow: 'hidden',
        background: 'radial-gradient(circle at 38% 32%, #2c2536 0%, #15121c 80%)',
        border: `2px solid ${onCd ? PALETTE.goldDim : PALETTE.gold}`,
        boxShadow: onCd ? 'none' : `0 0 6px ${PALETTE.gold}`,
        borderRadius: '50%', color: PALETTE.textLight, cursor: 'pointer',
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
    </button>
  );
}

function EmptySlot(): React.JSX.Element {
  return (
    <div
      title="Empty ability slot — choose one below"
      style={{ width: 30, height: 30, borderRadius: '50%', border: `2px dashed ${PALETTE.goldDim}`, color: PALETTE.goldDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
    >
      ＋
    </div>
  );
}
