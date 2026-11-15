import { useStore } from '@/state/store';
import { getEngine } from '@/game/engineRef';
import { MAX_ACTIVE_ABILITIES, heroAbilities } from '@/sim/loadout';
import { tryAbilityDef, type AbilityDef } from '@/data/abilities';
import { ULTIMATES } from '@/data/ultimates';
import { abilityDescription, abilityName, ultimateDescription, ultimateName, useT, type TextKey } from '@/i18n';
import { abilityArtStem, ultimateArtStem } from '@/ui/abilityArt';
import { Node, Sign, Tip, TipLine, TipName, TipSub, TipText, TipTitle } from '@/ui/kit';

// The hero's combat kit under the paper doll: the class ULTIMATE (automatic once its level is reached — it takes
// no slot) and the abilities the hero has learned in Talents (at most MAX_ACTIVE_ABILITIES: learned = active),
// with their live cooldown or charges. Re-renders with each HUD push. Ability and ultimate names come straight
// from data (English) until the class kits are redesigned and get their dictionaries.

const TRIGGER_TEXT: Record<string, TextKey> = {
  onLethalDamage: 'hero.triggerLethal',
  onBossEngage: 'hero.triggerBoss',
};

export function AbilityRow({ heroId }: { heroId: string }): React.JSX.Element | null {
  const t = useT();
  useStore((s) => s.hud); // refresh with every push: cooldowns move each frame
  const hero = useStore((s) => s.roster.find((h) => h.id === heroId));
  if (hero === undefined) return null;
  const pool = heroAbilities(hero.classKey, hero.talents).slice(0, MAX_ACTIVE_ABILITIES);
  const combatant = getEngine()?.world.heroes.find((h) => h.id === heroId);
  const ult = ULTIMATES[hero.classKey];
  const ultOn = ult !== undefined && hero.level >= ult.unlockLevel;
  const trigger = ult === undefined ? undefined : TRIGGER_TEXT[ult.trigger];

  return (
    <>
      {ult !== undefined && (
        <Node
          kind="ultimate"
          state={ultOn ? 'on' : 'off'}
          locked={!ultOn}
          sign={ultimateArtStem(ult.key)}
          alt={ultimateName(hero.classKey)}
        >
          <Tip side="above" size="item" tier={3}>
            <TipName>{ultimateName(hero.classKey)}</TipName>
            <TipSub>{t('hero.ultimate')}</TipSub>
            <TipText>{ultimateDescription(hero.classKey)}</TipText>
            {trigger !== undefined && <TipText>{t(trigger)}</TipText>}
            <TipText>{ultOn ? t('hero.ultUnlocked') : t('hero.ultLocked', { n: ult.unlockLevel })}</TipText>
          </Tip>
        </Node>
      )}
      {Array.from({ length: MAX_ACTIVE_ABILITIES }, (_, i) => {
        const key = pool[i]?.def.key;
        // A stale key (a renamed ability left in an old save) resolves to nothing: an empty plate, never a throw.
        const def = key === undefined ? undefined : tryAbilityDef(key);
        if (key === undefined || def === undefined) return <EmptyAbility key={i} />;
        const chargeMax = def.charge?.toCast;
        return (
          <AbilityNode
            key={i}
            def={def}
            remainingMs={combatant?.cooldowns[key] ?? 0}
            charge={
              chargeMax === undefined ? undefined : { cur: combatant?.charges?.[key] ?? 0, max: chargeMax }
            }
          />
        );
      })}
    </>
  );
}

function seconds(ms: number): string {
  return ms >= 1000 ? String(Math.ceil(ms / 1000)) : (ms / 1000).toFixed(1);
}

function AbilityNode({
  def,
  remainingMs,
  charge,
}: {
  def: AbilityDef;
  remainingMs: number;
  charge?: { cur: number; max: number };
}): React.JSX.Element {
  const t = useT();
  const passive = def.aura !== undefined; // an aura is always on while learned: no cooldown, no charges
  const waiting = !passive && (charge !== undefined ? charge.cur < charge.max : remainingMs > 0);
  const corner = !waiting
    ? undefined
    : charge !== undefined
      ? `${charge.cur}/${charge.max}`
      : seconds(remainingMs);
  return (
    <Node kind="ability" state="on" sign={abilityArtStem(def.key)} alt={abilityName(def.key)} cooldown={corner}>
      <Tip side="above" size="item">
        <TipName tone="gold">{abilityName(def.key)}</TipName>
        <TipSub>{t('hero.ability')}</TipSub>
        <TipText>{abilityDescription(def.key)}</TipText>
        {passive && <TipText>{t('hero.abilityPassive')}</TipText>}
        {charge !== undefined && (
          <TipLine label={t('hero.abilityCharges')} value={`${charge.cur} / ${charge.max}`} />
        )}
        {charge !== undefined && (def.charge?.perAttack ?? 0) > 0 && <TipText>{t('hero.abilityChargesHelp')}</TipText>}
        {!passive && charge === undefined && (
          <TipLine label={t('hero.cooldown')} value={`${Number((def.cooldownMs / 1000).toFixed(1))} s`} />
        )}
      </Tip>
    </Node>
  );
}

function EmptyAbility(): React.JSX.Element {
  const t = useT();
  return (
    <div className="tk-node lock has">
      <Sign name="tal_plate_off" className="f" />
      <Tip side="above">
        <TipTitle>{t('hero.abilityEmpty')}</TipTitle>
        <TipText>{t('hero.abilityEmptyHelp')}</TipText>
      </Tip>
    </div>
  );
}
