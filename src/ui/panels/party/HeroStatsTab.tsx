import { useStore } from '@/state/store';
import { getEngine } from '@/game/engineRef';
import { aggregate } from '@/sim/stats';
import { heroBaseStats, equipmentMods, talentPassiveMods } from '@/sim/loadout';
import { getBonuses, type Bonuses } from '@/sim/bonuses';
import { chestDropChance } from '@/sim/chests';
import { CHEST_TYPES, type ChestType } from '@/data/chests';
import { OFFENSIVE_STATS, DEFENSIVE_STATS, STATS, type StatKey } from '@/data/stats';
import { effectDef } from '@/data/effects';
import { format } from '@/sim/num';
import { PALETTE } from '@/styles/palette';

// Stats tab: computed effective stats split offensive/defensive (derived, never
// stored), then a Utility section — per-hero utility stats (cooldown/heal) plus
// the account-wide economy & chest figures derived from tech + pets — and finally
// the live active buffs/debuffs read off the sim combatant. Subscribes to `hud`
// so it refreshes ~each frame.

const CHEST_LABEL: Record<ChestType, string> = { normal: 'Normal', stageBoss: 'Stage boss', zoneBoss: 'Zone boss' };

export function HeroStatsTab({ heroId }: { heroId: string }): React.JSX.Element {
  useStore((s) => s.hud); // re-render roughly per frame for live effects
  const hero = useStore((s) => s.roster.find((h) => h.id === heroId));
  const techRanks = useStore((s) => s.techRanks);
  const ownedPets = useStore((s) => s.ownedPets);
  if (hero === undefined) return <div>No hero.</div>;

  const bonuses = getBonuses(techRanks, ownedPets);
  const mods = [...equipmentMods(hero.equipment), ...talentPassiveMods(hero.classKey, hero.talents), ...bonuses.combatMods];
  const stats = aggregate(heroBaseStats(hero.classKey, hero.level), mods);
  const combatant = getEngine()?.world.heroes.find((h) => h.id === hero.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {combatant && (
        <div style={{ color: PALETTE.textMute, fontSize: 10 }}>
          HP {format(Math.round(combatant.hp))} / {format(Math.round(combatant.maxHp))}
        </div>
      )}

      {/* Single column (the panel is narrow): sections stack vertically so long stat
          labels never need to scroll sideways. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <StatCol title="Offensive" keys={OFFENSIVE_STATS} stats={stats} />
        <StatCol title="Defensive" keys={DEFENSIVE_STATS} stats={stats} />
      </div>

      <UtilitySection stats={stats} bonuses={bonuses} />

      <div style={{ borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 4 }}>
        <div style={{ color: PALETTE.textMute }}>Active effects:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(combatant?.effects ?? []).length === 0 && <span style={{ color: PALETTE.textMute }}>none</span>}
          {combatant?.effects.map((e, i) => {
            const d = effectDef(e.defKey);
            return (
              <span key={i} style={{ fontSize: 10, color: d.beneficial ? PALETTE.hpGreen : PALETTE.enemyAccent, border: `1px solid ${PALETTE.ink}`, padding: '0 3px' }}>
                {d.name} {(e.remainingMs / 1000).toFixed(1)}s
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCol({ title, keys, stats }: { title: string; keys: StatKey[]; stats: Record<StatKey, number> }): React.JSX.Element {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ color: title === 'Offensive' ? '#e8a0a0' : '#a0c8e8', fontWeight: 700 }}>{title}</div>
      {keys.map((k) => {
        const pct = STATS[k].kind === 'percent';
        const v = stats[k];
        if (v === 0) return null;
        return (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 10, whiteSpace: 'nowrap' }}>
            <span style={{ color: PALETTE.textMute }}>{STATS[k].label}</span>
            <span style={{ color: PALETTE.textLight }}>{pct ? `${v.toFixed(1)}%` : format(Math.round(v))}</span>
          </div>
        );
      })}
    </div>
  );
}

// Account-wide multipliers are stored as final factors (1 + Σ); show the bonus part.
function bonusPct(mult: number): string {
  return `+${Math.round((mult - 1) * 100)}%`;
}

function UtilitySection({ stats, bonuses }: { stats: Record<StatKey, number>; bonuses: Bonuses }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 4 }}>
      <div style={{ color: PALETTE.research, fontWeight: 700 }}>Utility</div>

      {/* Per-hero utility stats (from gear / talents / tech). */}
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: 10 }}>
        <KV label="Cooldown Reduction" value={`${stats.cooldownReduction.toFixed(1)}%`} />
        <KV label="Heal Power" value={`${stats.healPower.toFixed(1)}%`} />
      </div>

      {/* Account-wide figures (identical for the whole party — from tech + pets). */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: PALETTE.gold, fontWeight: 700, fontSize: 10 }}>Economy (account)</div>
          <KV label="Gold Find" value={bonusPct(bonuses.goldMult)} />
          <KV label="XP Gain" value={bonusPct(bonuses.xpMult)} />
          <KV label="Offline Yield" value={bonusPct(bonuses.offlineMult)} />
          <KV label="Gem Drop" value={bonusPct(bonuses.gemDropMult)} />
          <KV label="Zone Key" value={bonusPct(bonuses.zoneKeyMult)} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: PALETTE.parchment, fontWeight: 700, fontSize: 10 }}>Chests (account)</div>
          {CHEST_TYPES.map((t) => (
            <KV key={t} label={`${CHEST_LABEL[t]} drop`} value={`${(chestDropChance(t, bonuses) * 100).toFixed(2)}%`} />
          ))}
        </div>
      </div>
      <div style={{ color: PALETTE.textMute, fontSize: 9 }}>
        Drop = chance per relevant kill (normal) / boss kill. Multiplicative on the base rate, not additive.
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 10, whiteSpace: 'nowrap' }}>
      <span style={{ color: PALETTE.textMute }}>{label}</span>
      <span style={{ color: PALETTE.textLight }}>{value}</span>
    </div>
  );
}
