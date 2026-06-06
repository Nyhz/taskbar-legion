import type { TalentNode } from '@/data/talents';
import { abilityDef, TARGET_LABEL } from '@/data/abilities';
import { STATS } from '@/data/stats';
import { abilityEffectLines, abilityCooldownMs, abilityAuraLine } from '@/sim/abilities';
import { healPowerEffectiveness } from '@/data/difficulties';
import { useStore } from '@/state/store';
import type { EffectiveStats } from '@/sim/stats';
import { PALETTE } from '@/styles/palette';

const MAX_RANK = 5;

// Hover card for a talent node. Ability nodes show target, cadence (cooldown w/ the
// hero's CDR, OR charge mechanic, OR "passive aura"), each effect's magnitude resolved
// at the hero's CURRENT stats + rank, AND a preview of what the next point would grant.
// Stat nodes show per-rank and current total.

export function TalentTooltip({ node, rank, stats }: { node: TalentNode; rank: number; stats: EffectiveStats }): React.JSX.Element {
  return node.kind === 'ability' && node.abilityKey !== undefined
    ? <AbilityCard abilityKey={node.abilityKey} rank={rank} stats={stats} />
    : <StatCard node={node} rank={rank} />;
}

function AbilityCard({ abilityKey, rank, stats }: { abilityKey: string; rank: number; stats: EffectiveStats }): React.JSX.Element {
  const ability = abilityDef(abilityKey);
  const shown = Math.max(1, rank);
  // The next purchasable rank. A 0/5 node's main block already previews rank 1 (what the
  // first point grants), so only show a separate "next" block once at least rank 1 is owned.
  const nextRank = rank >= 1 && rank < MAX_RANK ? rank + 1 : null;

  // Heal magnitudes reflect the CURRENT zone's heal-power debuff (so the tooltip matches what
  // a heal would actually do here), exactly as combat resolves it.
  const healEff = healPowerEffectiveness(useStore.getState().hud.globalStage);
  // Effect lines + (for aura abilities) the party-aura line, resolved at a given rank.
  const linesAt = (r: number): string[] => {
    const aura = abilityAuraLine(ability, r);
    const lines = abilityEffectLines(ability, r, stats, stats.health, healEff);
    return aura !== null ? [aura, ...lines] : lines;
  };
  const cur = linesAt(shown);
  const next = nextRank !== null ? linesAt(nextRank) : null;

  const cdMs = abilityCooldownMs(ability, shown, stats);
  const cdrActive = cdMs < ability.cooldownMs - 1;

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: PALETTE.gold, fontWeight: 700 }}>{ability.name}</span>
        <span style={{ color: PALETTE.textMute, fontSize: 10 }}>Ability · {rank}/{MAX_RANK}</span>
      </div>
      <div style={{ color: PALETTE.parchment }}>{ability.desc}</div>
      <Row label="Target" value={TARGET_LABEL[ability.target]} />
      {/* Cadence: a passive aura has none; a charge ability fires on banked charges, not a
          cooldown; everything else shows its CDR-adjusted cooldown. */}
      {ability.aura !== undefined ? (
        <Row label="Type" value="Passive · party aura" />
      ) : ability.charge !== undefined ? (
        <Row label="Charge" value={`+${ability.charge.perAttack}/attack · fires at ${ability.charge.toCast}`} />
      ) : (
        <Row
          label="Cooldown"
          value={cdrActive ? `${(cdMs / 1000).toFixed(1)}s (base ${(ability.cooldownMs / 1000).toFixed(0)}s)` : `${(ability.cooldownMs / 1000).toFixed(0)}s`}
        />
      )}
      <div style={{ borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 3 }}>
        <div style={{ color: PALETTE.textMute, fontSize: 10 }}>{rank === 0 ? 'At rank 1 (first point):' : `At rank ${shown} (your stats):`}</div>
        {cur.map((l, i) => (
          <div key={i} style={{ color: PALETTE.textLight, fontSize: 11 }}>• {l}</div>
        ))}
      </div>
      {next !== null && nextRank !== null && (
        <div style={{ borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 3 }}>
          <div style={{ color: PALETTE.textMute, fontSize: 10 }}>→ Next rank {nextRank}:</div>
          {next.map((l, i) => (
            <div key={i} style={{ color: PALETTE.hpGreen, fontSize: 11 }}>• {l}</div>
          ))}
        </div>
      )}
    </Card>
  );
}

function StatCard({ node, rank }: { node: TalentNode; rank: number }): React.JSX.Element {
  const p = node.passive;
  if (p === undefined) return <Card>{node.name}</Card>;
  // Use the NODE's mode, not the stat's native kind: flat-origin stats (health/armor/MR/
  // attackDamage) are stored as PERCENT talent nodes (FLAT_TO_PERCENT), so keying off
  // STATS[stat].kind wrongly dropped the % on those.
  const pct = p.mode === 'percent';
  const unit = pct ? '%' : '';
  const fmt = (x: number): string => (Number.isInteger(x) ? String(x) : x.toFixed(1));
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: PALETTE.textLight, fontWeight: 700 }}>{STATS[p.stat].label}</span>
        <span style={{ color: PALETTE.textMute, fontSize: 10 }}>Passive · {rank}/{node.maxRank}</span>
      </div>
      <Row label="Per rank" value={`+${fmt(p.valuePerRank)}${unit}`} />
      <Row label="Current" value={`+${fmt(p.valuePerRank * rank)}${unit}`} />
      {rank < node.maxRank && (
        <Row label={`→ Rank ${rank + 1}`} value={`+${fmt(p.valuePerRank * (rank + 1))}${unit}`} highlight />
      )}
      <Row label="Maxed" value={`+${fmt(p.valuePerRank * node.maxRank)}${unit}`} />
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div
      style={{
        width: 222,
        background: PALETTE.bgPanel,
        border: `2px solid ${PALETTE.ink}`,
        boxShadow: `0 0 0 1px ${PALETTE.goldDim}`,
        padding: 8,
        fontSize: 11,
        color: PALETTE.textLight,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      {children}
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: PALETTE.textMute }}>{label}</span>
      <span style={{ color: highlight ? PALETTE.hpGreen : PALETTE.parchment }}>{value}</span>
    </div>
  );
}
