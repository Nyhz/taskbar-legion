import { useState } from 'react';
import { useStore } from '@/state/store';
import { CUBE_INPUT_COUNT } from '@/sim/cube';
import { SYNTH_DOUBLE_TIER_CHANCE } from '@/data/cube';
import { getBonuses } from '@/sim/bonuses';
import { isGem, type InvEntry } from '@/sim/items';
import { entries } from '@/sim/slots';
import type { ItemTier } from '@/data/tiers';
import { gemName, tierName, useT } from '@/i18n';
import { Check, Key, Rule, Sign, Tip, TipText, TipTitle, art } from '@/ui/kit';
import { ItemCell } from '../items/ItemCell';
import { itemKindName } from '../items/itemText';
import { CubeFace } from './CubeFace';
import { CubePicker } from './CubePicker';
import { fillSynth, isSynthable, sameBatch, toggleSynth } from './cubeLogic';

// Synthesize: nine pieces — or nine gems — of one rarity become one of the next (5 % of the time, more with
// upgrades, it jumps two). The result takes the Cube's place until it is accepted.

interface Made {
  entry: InvEntry;
  lucky: boolean;
}

export function SynthRecipe(): React.JSX.Element {
  const t = useT();
  const bag = entries(useStore((s) => s.inventory));
  const stash = entries(useStore((s) => s.stash));
  const cubeCombine = useStore((s) => s.cubeCombine);
  const techRanks = useStore((s) => s.techRanks);
  const ownedPets = useStore((s) => s.ownedPets);
  const [useStash, setUseStash] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [made, setMade] = useState<Made | null>(null);

  // The bag first, then the stash: "fill" drains the bag before it touches the stash.
  const pool: InvEntry[] = [...bag.filter(isSynthable), ...(useStash ? stash.filter(isSynthable) : [])];
  const loaded = selected
    .map((id) => pool.find((e) => e.id === id))
    .filter((e): e is InvEntry => e !== undefined);
  const first = loaded[0];
  const ready = loaded.length === CUBE_INPUT_COUNT;
  const fill = fillSynth(pool);
  const luckPct =
    Math.round((SYNTH_DOUBLE_TIER_CHANCE + getBonuses(techRanks, ownedPets).synthDoubleChance) * 1000) / 10;

  const synthesize = (): void => {
    if (!ready || first === undefined) return;
    const out = cubeCombine(loaded.map((e) => e.id));
    if (out === null) return;
    setMade({ entry: out, lucky: out.tier > first.tier + 1 }); // two rarities above the inputs: the lucky strike
    setSelected([]);
  };

  if (made !== null) {
    const { entry, lucky } = made;
    return (
      <div className="tk-cube-made">
        <div className={lucky ? 'say lucky' : 'say'}>{lucky ? t('cube.madeLucky') : t('cube.made')}</div>
        <div className={lucky ? 'lit' : undefined}>
          <ItemCell item={isGem(entry) ? null : entry} gem={isGem(entry) ? entry : undefined} />
        </div>
        <div className="what">
          {tierName(entry.tier as ItemTier)} · {isGem(entry) ? gemName(entry.key) : itemKindName(entry)}
        </div>
        <Key tone="gold" onClick={() => setMade(null)}>
          {t('cube.accept')}
        </Key>
      </div>
    );
  }

  const next = first === undefined ? undefined : (Math.min(8, first.tier + 1) as ItemTier);
  return (
    <>
      <div className="tk-cube-eq">
        {first === undefined || next === undefined ? (
          <>
            {t('cube.eqSynthIn')}
            <Sign name="cube_arrow" />
            {t('cube.eqSynthOut')}
          </>
        ) : (
          <>
            9
            <img className="pip" src={art(`cube_pip_${first.tier}`)} alt={tierName(first.tier as ItemTier)} />
            <Sign name="cube_arrow" />
            1
            <img className="pip" src={art(`cube_pip_${next}`)} alt={tierName(next)} />
          </>
        )}
        <span className="end has">
          <Sign name="cube_lucky" alt={t('cube.lucky')} />
          {luckPct} %
          <Tip side="below-end">
            <TipTitle>{t('cube.lucky')}</TipTitle>
            <TipText>{t('cube.luckyHelp', { pct: luckPct })}</TipText>
          </Tip>
        </span>
      </div>
      <div className="tk-cube-work">
        <CubeFace loaded={loaded} onRemove={(e) => setSelected((cur) => toggleSynth(cur, pool, e))} />
        <Sign name="cube_arrow" />
        <div className="tk-cube-out">
          <div className="q has">
            <img src={art(next === undefined ? 'mark_well' : `smframe_${next}`)} alt="" />
            <span>?</span>
            <Tip side="left" size="tag">
              <div className="hd solo">
                {next === undefined ? t('cube.result') : `${t('cube.result')}: ${tierName(next)}`}
              </div>
            </Tip>
          </div>
          <span className={`tk-cube-count has${ready ? ' full' : ''}`}>
            {loaded.length} / {CUBE_INPUT_COUNT}
            <Tip side="left" size="tag">
              <div className="hd solo">{t('cube.loaded')}</div>
            </Tip>
          </span>
        </div>
      </div>
      <div className="tk-cube-keys">
        <Key
          disabled={fill === null}
          onClick={() => fill !== null && setSelected(fill)}
          tip={
            <Tip side="below">
              <TipText>{fill === null ? t('cube.fillNone') : t('cube.fillSynthHelp')}</TipText>
            </Tip>
          }
        >
          {t('cube.fill')}
        </Key>
        <span className="end">
          <Key tone="gold" disabled={!ready} onClick={synthesize}>
            {t('cube.synth')}
          </Key>
        </span>
      </div>
      <div className="tk-cube-opt">
        <Check
          checked={useStash}
          onChange={(on) => {
            setUseStash(on);
            setSelected([]);
          }}
        >
          {t('cube.useStash')}
        </Check>
      </div>
      <Rule />
      <CubePicker
        label={useStash ? t('cube.fromBagStash') : t('cube.fromBag')}
        pool={pool}
        selected={selected}
        isOff={(e) => !sameBatch(first, e) || ready}
        onPick={(e) => setSelected((cur) => toggleSynth(cur, pool, e))}
      />
    </>
  );
}
