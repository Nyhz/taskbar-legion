import { useState } from 'react';
import { useStore } from '@/state/store';
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES, type AchievementCategory } from '@/data/achievements';
import { achievementProgress, achievementTotals, factValue } from '@/sim/achievements';
import { getLanguage, useT, type TextKey } from '@/i18n';
import { Chip, Sign, Tip, TipLine, TipNote, TipText, TipTitle } from '@/ui/kit';
import { SERIES_LINE, SERIES_NAME, achievementGoal, rewardWords } from '@/ui/codex/achievementWords';
import { CATEGORY_SIGN, FACT_SIGN, medalOf, roman, seriesOf } from './codexLayout';

// The achievements: six categories (keys), and under the chosen one its series — each a sign, its name and how many
// of its steps are reached, then a medal per step (dark until reached; bronze, silver, gold up the series). A
// medal's tooltip says the goal, how far along it is and what it gives; the series' says its line.

const CATEGORY_NAME: Record<AchievementCategory, TextKey> = {
  progress: 'codex.catProgress',
  combat: 'codex.catCombat',
  loot: 'codex.catLoot',
  collection: 'codex.catCollection',
  craft: 'codex.catCraft',
  events: 'codex.catEvents',
};

// Facts read as a count ("141 of 160" would mean nothing for a stage number or a tier: those show the bar alone).
const COUNTED: ReadonlySet<string> = new Set(['kills', 'bossKills', 'goldEarned', 'chestsNormal', 'chestsStageBoss', 'chestsZoneBoss', 'petsOwned', 'heroLevel', 'playHours', 'bestiary', 'synths', 'polishes', 'runaways', 'merchantBuys', 'wipes']);

const num = (n: number): string => Math.floor(n).toLocaleString(getLanguage() === 'es' ? 'es-ES' : 'en-US');

export function AchievementsView({ frontier }: { frontier: number }): React.JSX.Element {
  const t = useT();
  const [category, setCategory] = useState<AchievementCategory>('progress');
  const earned = useStore((s) => s.achievements);
  // (Each piece on its own: a selector that builds a new object would re-render forever.)
  const records = useStore((s) => s.records);
  const petsOwned = useStore((s) => s.ownedPets.length);
  const heroLevel = useStore((s) => s.roster.reduce((max, h) => Math.max(max, h.level), 0));
  const facts = { records, frontier, petsOwned, heroLevel };
  const got = new Set(earned);
  const totals = achievementTotals(earned);

  return (
    <div className="tk-codex-ach">
      <div className="tk-codex-cats">
        {ACHIEVEMENT_CATEGORIES.map((c) => (
          <Chip key={c} sign={CATEGORY_SIGN[c]} label={t(CATEGORY_NAME[c])} on={category === c} onClick={() => setCategory(c)}
            tip={<Tip side="below" size="tag">{t(CATEGORY_NAME[c])}</Tip>} />
        ))}
        <span className="end has">
          {earned.length}/{ACHIEVEMENTS.length}
          <Tip side="below-end">
            <TipTitle>{t('codex.achievementsCount', { n: earned.length, max: ACHIEVEMENTS.length })}</TipTitle>
            <TipNote>{t('codex.allTotals')}</TipNote>
            <TipLine label={<Sign name="ui_gold" />} value={rewardWords({ kind: 'goldMult', value: totals.goldMult })} />
            <TipLine label={<Sign name="ui_xp" />} value={rewardWords({ kind: 'xpMult', value: totals.xpMult })} />
            <TipLine label={<Sign name="hud_chest_normal" />} value={rewardWords({ kind: 'chestDropMult', value: totals.chestDropMult })} />
            <TipLine label={<Sign name="ui_gem" />} value={rewardWords({ kind: 'gemDropMult', value: totals.gemDropMult })} />
          </Tip>
        </span>
      </div>
      {seriesOf(category).map((s) => {
        const reached = s.steps.filter((a) => got.has(a.key)).length;
        return (
          <div key={s.fact} className="tk-codex-series">
            <div className="hd has">
              <Sign name={FACT_SIGN[s.fact]} />
              <span className="nm">{t(SERIES_NAME[s.fact])}</span>
              <span className="ct">{reached}/{s.steps.length}</span>
              <Tip side="left">
                <TipTitle>{t(SERIES_NAME[s.fact])}</TipTitle>
                <TipText>{t(SERIES_LINE[s.fact])}</TipText>
                <TipNote>{t('codex.seriesCount', { n: reached, max: s.steps.length })}</TipNote>
              </Tip>
            </div>
            <div className="md">
              {s.steps.map((a, i) => {
                const on = got.has(a.key);
                const value = factValue(a.fact, facts);
                return (
                  <span key={a.key} className="has">
                    <Sign name={`codex_medal_${medalOf(i, s.steps.length, on)}`} />
                    <Tip side="left">
                      <TipTitle>{`${t(SERIES_NAME[s.fact])} ${roman(i + 1)}`}</TipTitle>
                      <TipText>{achievementGoal(a.key)}</TipText>
                      <TipLine label={rewardWords(a.reward)} value={on ? t('codex.reached') : COUNTED.has(a.fact) ? t('codex.progress', { now: num(Math.min(value, a.target)), target: num(a.target) }) : undefined} tone={on ? 'good' : undefined} />
                      {!on && <div className="tk-codex-prog"><i style={{ width: `${Math.round(achievementProgress(a, facts) * 100)}%` }} /></div>}
                    </Tip>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
