import { useState } from 'react';
import { useStore } from '@/state/store';
import { DIFFICULTY_KEYS, worldInDifficulty } from '@/data/difficulties';
import { WORLDS, tryWorldDef, type CreatureDef } from '@/data/worlds';
import { creatureLore, creatureName, difficultyName, getLanguage, useT, worldName } from '@/i18n';
import { Pager, Sign, Tip, TipText, TipTitle } from '@/ui/kit';
import { CreatureFigure } from '@/ui/components/CreatureFigure';

// The bestiary: one world at a time. Its six creatures (beast, fighter, shooter, support, stage boss, world boss)
// as a row of heads — dark until the first one falls; the chosen one standing in the niche, its name (its line in
// the tooltip) and, under it, the five difficulties lit where it has been defeated.

/** A world's six creatures, in the order the bestiary shows them. */
export function worldCast(index: number): CreatureDef[] {
  const w = tryWorldDef(index);
  if (w === undefined) return [];
  return [w.creatures.beast, w.creatures.melee, w.creatures.ranged, ...(w.support === undefined ? [] : [w.support]), w.creatures.boss, ...(w.worldBoss === undefined ? [] : [w.worldBoss])];
}

const num = (n: number): string => n.toLocaleString(getLanguage() === 'es' ? 'es-ES' : 'en-US');

export function BestiaryView(): React.JSX.Element {
  const t = useT();
  const here = useStore((s) => worldInDifficulty(Math.max(1, s.hud.globalStage)));
  const bestiary = useStore((s) => s.records.bestiary);
  const [world, setWorld] = useState(here);
  const cast = worldCast(world);
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const chosen = cast.find((c) => c.key === picked) ?? cast[0];
  const seen = (key: string): boolean => (bestiary[key] ?? []).some((n) => n > 0);

  return (
    <div className="tk-codex-bestiary">
      <div className="tk-codex-world">
        <Pager
          page={world}
          pages={WORLDS.length}
          onPage={(p) => { setWorld(p); setPicked(undefined); }}
          pageLabel={(n) => t('codex.world', { n })}
          prevLabel={t('codex.prevWorld')}
          nextLabel={t('codex.nextWorld')}
        />
        <span className="nm">{worldName(world)}</span>
      </div>
      <div className="tk-codex-cast">
        {cast.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`tk-codex-head has${chosen?.key === c.key ? ' on' : ''}`}
            onClick={() => setPicked(c.key)}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={seen(c.key) ? creatureName(c.key) : t('codex.unknown')}
          >
            <CreatureFigure creature={c.key} width={22} height={22} frame="head" dark={!seen(c.key)} animate={false} />
            <Tip side="below" size="tag">{seen(c.key) ? creatureName(c.key) : t('codex.unknown')}</Tip>
          </button>
        ))}
      </div>
      {chosen !== undefined && (
        <>
          <div className="tk-niche tk-codex-niche">
            <CreatureFigure creature={chosen.key} width={100} height={110} dark={!seen(chosen.key)} />
          </div>
          <div className={`tk-codex-name has${seen(chosen.key) ? '' : ' none'}`}>
            {seen(chosen.key) ? creatureName(chosen.key) : t('codex.unknown')}
            <Tip side="left">
              <TipTitle>{seen(chosen.key) ? creatureName(chosen.key) : t('codex.unknown')}</TipTitle>
              <TipText>{seen(chosen.key) ? creatureLore(chosen.key) : t('codex.unknownHelp')}</TipText>
            </Tip>
          </div>
          <div className="tk-codex-diffs">
            {DIFFICULTY_KEYS.map((key, i) => {
              const n = bestiary[chosen.key]?.[i] ?? 0;
              return (
                <span key={key} className="has">
                  <Sign name={n > 0 ? `map_diff_${key}` : `map_diff_${key}_off`} alt={difficultyName(key)} />
                  <Tip side="above" size="tag">
                    {n > 0 ? t('codex.defeatedIn', { difficulty: difficultyName(key), n: num(n) }) : t('codex.notYetIn', { difficulty: difficultyName(key) })}
                  </Tip>
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
