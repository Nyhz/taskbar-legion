import { useState } from 'react';
import { useStore } from '@/state/store';
import { getEngine } from '@/game/engineRef';
import { useT, type TextKey } from '@/i18n';
import { Chip, Head, Tip, TipText, TipTitle, Title, Window } from '@/ui/kit';
import { WING_CONTENT_ART } from '../panelLayout';
import { useWingTabs } from '../wingTabs';
import { CODEX_SECTIONS, SECTION_SIGN, type CodexSection } from './codexLayout';
import { BestiaryView } from './BestiaryView';
import { AchievementsView } from './AchievementsView';
import { RecordsView } from './RecordsView';
import './codex.css';

// The Codex (user, 2026-11-21): a RIGHT WING of the hero window, like every wing. Three sections — the bestiary of
// the ten worlds, the achievements (each a small, permanent economy bonus) and the journey's records — picked
// from the keys under its name, as the Cube picks its recipes.

const NAME: Record<CodexSection, TextKey> = {
  bestiary: 'codex.secBestiary',
  achievements: 'codex.secAchievements',
  records: 'codex.secRecords',
};
const HELP: Record<CodexSection, TextKey> = {
  bestiary: 'codex.secBestiaryHelp',
  achievements: 'codex.secAchievementsHelp',
  records: 'codex.secRecordsHelp',
};

export function CodexWindow(): React.JSX.Element {
  const t = useT();
  const closePanel = useStore((s) => s.closePanel);
  const wings = useWingTabs('right');
  const [section, setSection] = useState<CodexSection>('achievements');
  const frontier = useStore((s) => Math.max(s.maxClearedStage, s.hud.maxClearedStage, getEngine()?.world.maxClearedStage ?? 0));

  return (
    <Window
      id="panel-codex"
      closeLabel={t('codex.close')}
      onClose={() => closePanel('codex')}
      tabsRight={wings.tabs}
      onTab={wings.onTab}
      width={WING_CONTENT_ART}
    >
      <Head>
        <Title>{t(NAME[section])}</Title>
      </Head>
      <div className="tk-codex-secs">
        {CODEX_SECTIONS.map((s) => (
          <Chip
            key={s}
            sign={SECTION_SIGN[s]}
            label={t(NAME[s])}
            on={section === s}
            onClick={() => setSection(s)}
            tip={
              <Tip side="below">
                <TipTitle>{t(NAME[s])}</TipTitle>
                <TipText>{t(HELP[s])}</TipText>
              </Tip>
            }
          />
        ))}
      </div>
      {section === 'bestiary' && <BestiaryView />}
      {section === 'achievements' && <AchievementsView frontier={frontier} />}
      {section === 'records' && <RecordsView />}
    </Window>
  );
}
