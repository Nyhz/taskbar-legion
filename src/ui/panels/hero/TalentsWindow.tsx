import { useStore } from '@/state/store';
import { useT } from '@/i18n';
import { Window } from '@/ui/kit';
import { WING_CONTENT_ART } from '../panelLayout';
import { useWingTabs } from '../wingTabs';
import { TalentsTab } from './TalentsTab';

// The talents of the selected hero: a LEFT WING of the hero window (narrow and tall, the same width as every wing).

export function TalentsWindow(): React.JSX.Element {
  const t = useT();
  const heroId = useStore((s) => (s.roster.find((h) => h.id === s.selectedHeroId) ?? s.roster[0])?.id);
  const closePanel = useStore((s) => s.closePanel);
  const wings = useWingTabs('left');
  return (
    <Window
      id="panel-talents"
      closeLabel={t('talents.close')}
      onClose={() => closePanel('talents')}
      tabs={wings.tabs}
      onTab={wings.onTab}
      width={WING_CONTENT_ART}
    >
      {heroId !== undefined && <TalentsTab heroId={heroId} />}
    </Window>
  );
}
