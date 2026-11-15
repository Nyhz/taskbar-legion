import { useStore } from '@/state/store';
import { useT } from '@/i18n';
import { Window } from '@/ui/kit';
import { WING_CONTENT_ART } from '../panelLayout';
import { useWingTabs } from '../wingTabs';
import { SheetTab } from './SheetTab';

// The sheet of the selected hero — every stat, the account's figures, the live effects: a LEFT WING of the hero
// window (narrow and tall, the same width as every wing).

export function SheetWindow(): React.JSX.Element {
  const t = useT();
  const heroId = useStore((s) => (s.roster.find((h) => h.id === s.selectedHeroId) ?? s.roster[0])?.id);
  const closePanel = useStore((s) => s.closePanel);
  const wings = useWingTabs('left');
  return (
    <Window
      id="panel-sheet"
      closeLabel={t('talents.close')}
      onClose={() => closePanel('sheet')}
      tabs={wings.tabs}
      onTab={wings.onTab}
      width={WING_CONTENT_ART}
    >
      {heroId !== undefined && <SheetTab heroId={heroId} />}
    </Window>
  );
}
