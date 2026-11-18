import { useStore } from '@/state/store';
import { getEngine } from '@/game/engineRef';
import { auraValue, type SupportAura } from '@/data/enemies';
import { difficultyIndexOf } from '@/data/difficulties';
import { useT } from '@/i18n';
import { Sign, Tip, TipNote, TipText, TipTitle } from '@/ui/kit';
import { auraLine } from '@/ui/panels/map/foeWords';

// The SUPPORT's auras on the rail (2026-11-18; user: «siempre que un support esté activo en una oleada, que se pueda
// consultar lo que está dando a la oleada»): while a wave's support lives, the signs it wears over its head show at the
// top of the strip, centred under the rail and laid over the scene (user: «abajo, en la propia strip… centradas, para
// que no desplacen contenido de arriba nunca») (the same drawings: tools/assets icon set s9i_foes `map_aura_*`),
// each with its words and strength in a tooltip. Gone with the support. Reads the live sim; re-renders with each
// HUD push.

export function HudSupport(): React.JSX.Element | null {
  const t = useT();
  useStore((s) => s.hud); // refresh with every push: a support falls between two
  const globalStage = useStore((s) => s.hud.globalStage);
  const support = getEngine()?.world.enemies.find((e) => e.alive && e.enemyRole === 'support' && (e.auras?.length ?? 0) > 0);
  if (support === undefined) return null;
  const d = difficultyIndexOf(globalStage);
  return (
    <div className="tk-hud-auras">
      {(support.auras ?? []).map((key) => {
        const aura = key as SupportAura;
        return (
          <div key={key} className="tk-hud-aura has">
            <Sign name={`map_aura_${aura}`} alt={auraLine(aura, auraValue(aura, d))} />
            <Tip side="below">
              <TipTitle>{t('hud.supportAura')}</TipTitle>
              <TipText>{auraLine(aura, auraValue(aura, d))}</TipText>
              <TipNote>{t('hud.supportAuraHelp')}</TipNote>
            </Tip>
          </div>
        );
      })}
    </div>
  );
}
