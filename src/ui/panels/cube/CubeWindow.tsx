import { useState } from 'react';
import { useStore } from '@/state/store';
import { useT, type TextKey } from '@/i18n';
import { Chip, Head, Tip, TipText, TipTitle, Title, Window } from '@/ui/kit';
import { WING_CONTENT_ART } from '../panelLayout';
import { useWingTabs } from '../wingTabs';
import { SynthRecipe } from './SynthRecipe';
import { MeltRecipe } from './MeltRecipe';
import { TransfigRecipe } from './TransfigRecipe';
import { CUBE_MODES, type CubeMode } from './cubeLogic';
import './cube.css';

// The Cube: three recipes — synthesize, melt, transfigure — a RIGHT WING of the hero window, narrow and tall like
// every wing. It reads top to bottom: the NAME of the recipe in use, the three recipes to pick from, what the
// recipe does (its equation), the Cube's nine cells with what comes out, the keys with their verb, and under
// them the pieces of the bag it can take. (The Cube was once "francamente confusa": nothing is left unnamed.)

const SIGN: Record<CubeMode, string> = {
  synthesize: 'cube2_synth',
  melt: 'cube2_melt',
  transfigure: 'cube2_swap',
};
const NAME: Record<CubeMode, TextKey> = {
  synthesize: 'cube.synth',
  melt: 'cube.melt',
  transfigure: 'cube.transfig',
};
const HELP: Record<CubeMode, TextKey> = {
  synthesize: 'cube.synthHelp',
  melt: 'cube.meltHelp',
  transfigure: 'cube.transfigHelp',
};

export function CubeWindow(): React.JSX.Element {
  const t = useT();
  const closePanel = useStore((s) => s.closePanel);
  const wings = useWingTabs('right');
  const [mode, setMode] = useState<CubeMode>('synthesize');

  return (
    <Window
      id="panel-cube"
      closeLabel={t('cube.close')}
      onClose={() => closePanel('cube')}
      tabsRight={wings.tabs}
      onTab={wings.onTab}
      width={WING_CONTENT_ART}
    >
      <Head>
        <Title>{t(NAME[mode])}</Title>
      </Head>
      <div className="tk-cube-modes">
        {CUBE_MODES.map((m) => (
          <Chip
            key={m}
            sign={SIGN[m]}
            label={t(NAME[m])}
            on={mode === m}
            onClick={() => setMode(m)}
            tip={
              <Tip side="below">
                <TipTitle>{t(NAME[m])}</TipTitle>
                <TipText>{t(HELP[m])}</TipText>
              </Tip>
            }
          />
        ))}
      </div>
      {mode === 'synthesize' && <SynthRecipe />}
      {mode === 'melt' && <MeltRecipe />}
      {mode === 'transfigure' && <TransfigRecipe />}
    </Window>
  );
}
