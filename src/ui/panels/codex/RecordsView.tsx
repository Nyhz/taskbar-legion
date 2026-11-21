import { useStore } from '@/state/store';
import { bestiaryDiscovered } from '@/sim/records';
import { getLanguage, tierName, useT, type TextKey } from '@/i18n';
import { StatRow, TipTag } from '@/ui/kit';
import type { ItemTier } from '@/data/tiers';

// The records: everything the journey has counted, as signs and numbers in two columns (what each is, in its
// tooltip) — the sheet's way of showing figures.

const num = (n: number): string => Math.floor(n).toLocaleString(getLanguage() === 'es' ? 'es-ES' : 'en-US');

export function RecordsView(): React.JSX.Element {
  const t = useT();
  const r = useStore((s) => s.records);
  const rows: { sign: string; label: TextKey; value: string }[] = [
    { sign: 'codex_kills', label: 'codex.recKills', value: num(r.kills) },
    { sign: 'hud_boss', label: 'codex.recBosses', value: num(r.bossKills) },
    { sign: 'map_skull', label: 'codex.recWorldBosses', value: num(r.worldBossKills) },
    { sign: 'hud_retry', label: 'codex.recWipes', value: num(r.wipes) },
    { sign: 'ui_gold', label: 'codex.recGold', value: num(r.goldEarned) },
    { sign: 'ui_xp', label: 'codex.recXp', value: num(r.xpEarned) },
    { sign: 'codex_hours', label: 'codex.recHours', value: num(r.playMs / 3_600_000) },
    { sign: 'codex_sec_bestiary', label: 'codex.recBestiary', value: num(bestiaryDiscovered(r)) },
    { sign: 'pet_sign_chest', label: 'codex.recFound', value: num(r.chestsFound) },
    { sign: 'hud_chest_normal', label: 'codex.recNormal', value: num(r.chestsOpened.normal) },
    { sign: 'hud_chest_stage', label: 'codex.recStage', value: num(r.chestsOpened.stageBoss) },
    { sign: 'hud_chest_world', label: 'codex.recWorld', value: num(r.chestsOpened.zoneBoss) },
    { sign: 'cube_star', label: 'codex.recBestItem', value: r.bestItemTier < 0 ? t('codex.none') : `T${r.bestItemTier}` },
    { sign: 'ui_gem', label: 'codex.recBestGem', value: r.bestGemTier < 1 ? t('codex.none') : `T${r.bestGemTier}` },
    { sign: 'stat_attackDamage', label: 'codex.recHit', value: num(r.highestHit) },
    { sign: 'cube2_synth', label: 'codex.recSynths', value: num(r.synths) },
    { sign: 'cube2_polish', label: 'codex.recPolishes', value: num(r.polishes) },
    { sign: 'codex_runaway', label: 'codex.recRunaways', value: num(r.runaways) },
    { sign: 'codex_merchant', label: 'codex.recMerchant', value: num(r.merchantBuys) },
  ];
  const tierTag = (label: TextKey, tier: number): string => (tier < 0 || (label === 'codex.recBestGem' && tier < 1) ? t(label) : `${t(label)} · ${tierName(tier as ItemTier)}`);
  return (
    <div className="tk-codex-recs">
      {rows.map((row) => (
        <StatRow key={row.label} sign={row.sign} alt={t(row.label)} value={row.value}>
          <TipTag side="left">
            {row.label === 'codex.recBestItem' ? tierTag(row.label, r.bestItemTier) : row.label === 'codex.recBestGem' ? tierTag(row.label, r.bestGemTier) : t(row.label)}
          </TipTag>
        </StatRow>
      ))}
    </div>
  );
}
