import { useStore } from '@/state/store';
import type { SlotKey } from '@/data/itemSlots';
import { MAX_LEVEL, totalExpToReach } from '@/data/stageScaling';
import { format } from '@/sim/num';
import { className, useT } from '@/i18n';
import { classCrestStem } from '@/ui/itemArt';
import { Bar, Sign, Tip, TipLine, TipText, TipTitle, Title } from '@/ui/kit';
import { HeroIdleSprite } from '@/ui/components/HeroIdleSprite';
import { GearSlot, type ChoiceRequest, type SocketRequest } from './GearSlot';
import { StatColumn } from './StatColumn';

// The paper doll: five armour slots, the hero in the stone niche (level on the pennant), the weapon + jewelry
// slots, and beside them the hero's name, the ten quick stats in two columns and the experience bar.

const LEFT_SLOTS: readonly SlotKey[] = ['helmet', 'chest', 'gloves', 'legs', 'boots'];
const RIGHT_SLOTS: readonly SlotKey[] = ['weapon', 'offhand', 'ring', 'amulet', 'trinket'];

export function PaperDoll({
  heroId,
  requestSocket,
  requestSocketChoice,
}: {
  heroId: string;
  requestSocket: SocketRequest;
  requestSocketChoice: ChoiceRequest;
}): React.JSX.Element | null {
  const t = useT();
  const hero = useStore((s) => s.roster.find((h) => h.id === heroId));
  if (hero === undefined) return null;

  const expInto = hero.exp - totalExpToReach(hero.level);
  const expNeed = totalExpToReach(hero.level + 1) - totalExpToReach(hero.level);
  const expShare = Math.max(0, Math.min(1, expInto / Math.max(1, expNeed)));
  const capped = hero.level >= MAX_LEVEL;
  const crest = classCrestStem(hero.classKey);
  const slot = (key: SlotKey, tipSide: 'right' | 'left'): React.JSX.Element => (
    <GearSlot
      key={key}
      heroId={hero.id}
      slot={key}
      tipSide={tipSide}
      requestSocket={requestSocket}
      requestSocketChoice={requestSocketChoice}
    />
  );

  return (
    <div className="tk-hero-doll">
      <div className="tk-hero-col">{LEFT_SLOTS.map((key) => slot(key, 'right'))}</div>
      <div className="tk-hero-niche">
        <div className="tk-hero-lvl has">
          {hero.level}
          <Tip side="right">
            <TipTitle>{t('hero.level', { n: hero.level })}</TipTitle>
            <TipText>{t('hero.levelHelp', { cap: MAX_LEVEL })}</TipText>
          </Tip>
        </div>
        <div className="tk-hero-fig">
          <HeroIdleSprite classKey={hero.classKey} width={88} height={84} />
        </div>
      </div>
      <div className="tk-hero-col">{RIGHT_SLOTS.map((key) => slot(key, 'left'))}</div>
      <div className="tk-hero-side">
        <div className="tk-hero-who">
          {crest !== undefined && <Sign name={crest} />}
          <Title>{className(hero.classKey)}</Title>
        </div>
        <StatColumn heroId={hero.id} />
        <div className="tk-hero-line has">
          <Sign name="ui_xp" alt={t('hero.experience')} />
          <Bar value={capped ? 1 : expShare}>{capped ? MAX_LEVEL : `${Math.floor(expShare * 100)} %`}</Bar>
          <Tip side="above-end">
            <TipTitle>{t('hero.experience')}</TipTitle>
            {!capped && (
              <TipLine
                label={t('hero.toLevel', { n: hero.level + 1 })}
                value={format(Math.max(0, Math.ceil(expNeed - expInto)))}
              />
            )}
          </Tip>
        </div>
      </div>
    </div>
  );
}
