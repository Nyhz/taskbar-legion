import { useStore } from '@/state/store';
import { useT, type TextKey } from '@/i18n';
import { Sign, Tip, TipText, TipTitle } from '@/ui/kit';
import { averageItemLevel, gearQuality, type GearQuality } from './gearQuality';

// The average item level of what the hero wears — the one big number of the window — with the arrow that says
// whether that gear is above, level with or below the stage the party is on.

const QUALITY_SIGN: Record<GearQuality, string> = { over: 'ui_up', even: 'bag_even', under: 'bag_down' };
const QUALITY_TEXT: Record<GearQuality, TextKey> = {
  over: 'hero.gearOver',
  even: 'hero.gearEven',
  under: 'hero.gearUnder',
};

export function ItemLevel({ heroId }: { heroId: string }): React.JSX.Element | null {
  const t = useT();
  const hero = useStore((s) => s.roster.find((h) => h.id === heroId));
  const stage = useStore((s) => s.hud.globalStage);
  if (hero === undefined) return null;
  const avg = averageItemLevel(hero.equipment);
  const quality = gearQuality(avg, stage);
  return (
    <div className="tk-hero-power has">
      <Sign name="ui_power" alt={t('hero.itemLevel')} />
      {avg.toFixed(1)}
      <Sign name={QUALITY_SIGN[quality]} />
      <Tip side="above">
        <TipTitle>{t('hero.itemLevel')}</TipTitle>
        <TipText>{t('hero.itemLevelHelp')}</TipText>
        <TipText>{t(QUALITY_TEXT[quality])}</TipText>
      </Tip>
    </div>
  );
}
