import { useState } from 'react';
import { useStore } from '@/state/store';
import { getBonuses } from '@/sim/bonuses';
import { className, useT } from '@/i18n';
import { classCrestStem } from '@/ui/itemArt';
import { Tip, TipText, TipTitle, Window, type WindowPlace } from '@/ui/kit';
import { PANEL_CONTENT_ART } from '../panelLayout';
import { useOpenWing, useWingTabs } from '../wingTabs';
import { HeroBody } from './HeroBody';
import { RecruitMenu } from './RecruitMenu';
import './hero.css';

// The hero window (kit panel `party`): the MAIN panel — fixed and centred over the strip. It holds only the hero:
// the paper doll, the quick stats, the combat kit and presets, and the bag under them. Top edge: one place per
// hero of the party — click to switch — then the places still to fill (recruit) or to open (party size comes
// from Upgrades). Its side edges carry the bookmarks of the auxiliary panels (wings); while a wing is open on a
// side, that side's bookmarks ride the wing's outer edge instead (ui/panels/wingTabs).

const PARTY_PLACES = 3;
// Where a place starts, in art px from the content's left edge: 5, then one every 38 (36 wide, 2 apart).
const PLACE_LEFT = 5;
const PLACE_STEP = 38;

export function HeroWindow(): React.JSX.Element {
  const t = useT();
  const roster = useStore((s) => s.roster);
  const selectedId = useStore((s) => s.selectedHeroId);
  const selectHero = useStore((s) => s.selectHero);
  const closePanel = useStore((s) => s.closePanel);
  const techRanks = useStore((s) => s.techRanks);
  const petRanks = useStore((s) => s.petRanks);
  const [recruitAt, setRecruitAt] = useState<number | null>(null); // index of the free place whose picker is open
  const hero = roster.find((h) => h.id === selectedId) ?? roster[0];
  const maxPlaces = getBonuses(techRanks, petRanks).partySlots;

  const places: WindowPlace[] = Array.from({ length: PARTY_PLACES }, (_, i): WindowPlace => {
    const h = roster[i];
    if (h !== undefined) {
      const label = t('hero.placeHero', { name: className(h.classKey), level: h.level });
      return {
        key: `hero:${h.id}`,
        sign: classCrestStem(h.classKey),
        text: String(h.level),
        label,
        state: h.id === hero?.id ? 'on' : 'idle',
        dot: h.talentPoints > 0,
        tip: (
          <Tip side="below">
            <TipTitle>{label}</TipTitle>
            {h.talentPoints > 0 && (
              <TipText>
                {h.talentPoints === 1 ? t('hero.unspentOne') : t('hero.unspentMany', { n: h.talentPoints })}
              </TipText>
            )}
          </Tip>
        ),
      };
    }
    if (i < maxPlaces) {
      return {
        key: `free:${i}`,
        sign: 'bag_recruit',
        label: t('hero.recruit'),
        state: 'free',
        tip: (
          <Tip side="below">
            <TipTitle>{t('hero.recruit')}</TipTitle>
            <TipText>{t('hero.recruitHelp')}</TipText>
          </Tip>
        ),
      };
    }
    return {
      key: `shut:${i}`,
      sign: 'map_lock_s',
      small: true,
      label: t('hero.placeShut'),
      state: 'shut',
      tip: (
        <Tip side="below">
          <TipTitle>{t('hero.placeShut')}</TipTitle>
          <TipText>{t('hero.placeShutHelp')}</TipText>
        </Tip>
      ),
    };
  });

  const onPlace = (key: string): void => {
    const [kind, rest] = key.split(':');
    if (kind === 'hero' && rest !== undefined) {
      setRecruitAt(null);
      selectHero(rest);
    } else if (kind === 'free') {
      const at = Number(rest);
      setRecruitAt((open) => (open === at ? null : at));
    }
  };

  const left = useWingTabs('left');
  const right = useWingTabs('right');
  const leftOpen = useOpenWing('left') !== undefined;
  const rightOpen = useOpenWing('right') !== undefined;

  return (
    <Window
      id="panel-party"
      closeLabel={t('hero.close')}
      onClose={() => closePanel('party')}
      tabs={leftOpen ? undefined : left.tabs}
      tabsRight={rightOpen ? undefined : right.tabs}
      onTab={(key) => {
        left.onTab(key);
        right.onTab(key);
      }}
      width={PANEL_CONTENT_ART}
      places={places}
      onPlace={onPlace}
    >
      <div className="tk-hero">
        {hero !== undefined && <HeroBody heroId={hero.id} />}
        {recruitAt !== null && (
          <RecruitMenu left={PLACE_LEFT + PLACE_STEP * recruitAt} onClose={() => setRecruitAt(null)} />
        )}
      </div>
    </Window>
  );
}
