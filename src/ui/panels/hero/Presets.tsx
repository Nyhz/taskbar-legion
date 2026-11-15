import { useStore } from '@/state/store';
import { LOADOUT_COUNT } from '@/state/slices/partySlice';
import type { Loadout } from '@/persistence/saveSchema';
import { tryAbilityDef } from '@/data/abilities';
import { className, useT, type TextKey } from '@/i18n';
import { useContextMenu } from '@/ui/components/ContextMenu';
import { Key, Tip, TipLine, TipText, TipTitle, TipWarn } from '@/ui/kit';

// The hero's two presets (0 = farm, 1 = boss). Click a saved one to restore it; right-click to save the
// current setup into it, or to clear it — exactly what the store's loadout actions do.

const PRESET_SIGN: readonly string[] = ['bag_farm', 'hud_boss'];
const PRESET_NAME: readonly TextKey[] = ['hero.presetFarm', 'hero.presetBoss'];

export function Presets({ heroId }: { heroId: string }): React.JSX.Element {
  const t = useT();
  const hero = useStore((s) => s.roster.find((h) => h.id === heroId));
  const saveLoadout = useStore((s) => s.saveLoadout);
  const applyLoadout = useStore((s) => s.applyLoadout);
  const clearLoadout = useStore((s) => s.clearLoadout);
  const openMenu = useContextMenu();

  return (
    <div className="tk-hero-pre">
      {Array.from({ length: LOADOUT_COUNT }, (_, i) => {
        const saved = hero?.loadouts?.[i] ?? null;
        const name = t(PRESET_NAME[i] ?? 'hero.presetFarm');
        return (
          <Key
            key={i}
            sign={PRESET_SIGN[i] ?? 'bag_farm'}
            label={name}
            lamp={saved !== null}
            className={saved === null ? 'empty' : undefined}
            onClick={() => {
              if (saved !== null) applyLoadout(heroId, i);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              openMenu(e.clientX, e.clientY, [
                { label: t('hero.presetSave'), sign: 'opt_export', onClick: () => saveLoadout(heroId, i) },
                ...(saved !== null
                  ? [
                      {
                        label: t('hero.presetClear'),
                        sign: 'opt_new',
                        danger: true,
                        onClick: () => clearLoadout(heroId, i),
                      },
                    ]
                  : []),
              ]);
            }}
            tip={
              <Tip side="above-end">
                <TipTitle>{name}</TipTitle>
                {saved === null ? (
                  <TipText>{t('hero.presetEmpty')}</TipText>
                ) : (
                  <Saved preset={saved} heroClass={hero?.classKey} />
                )}
                {saved !== null && <TipText>{t('hero.presetLoad')}</TipText>}
                <TipText>{t('hero.presetMenu')}</TipText>
              </Tip>
            }
          />
        );
      })}
    </div>
  );
}

function Saved({ preset, heroClass }: { preset: Loadout; heroClass: string | undefined }): React.JSX.Element {
  const t = useT();
  const points = Object.values(preset.talents).reduce((a, b) => a + b, 0);
  const abilities = preset.activeAbilities.flatMap((key) => tryAbilityDef(key)?.name ?? []);
  return (
    <>
      <TipLine label={t('hero.presetPoints')} value={points} />
      {abilities.length > 0 && <TipText>{abilities.join(' · ')}</TipText>}
      {heroClass !== undefined && preset.classKey !== heroClass && (
        <TipWarn>{t('hero.presetWrongClass', { name: className(preset.classKey) })}</TipWarn>
      )}
    </>
  );
}
