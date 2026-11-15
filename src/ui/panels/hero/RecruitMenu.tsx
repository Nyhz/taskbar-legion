import { useStore } from '@/state/store';
import { CLASS_KEYS, classDef } from '@/data/classes';
import { format } from '@/sim/num';
import { className, useT } from '@/i18n';
import { classCrestStem } from '@/ui/itemArt';
import { Menu, MenuRow, Sign } from '@/ui/kit';

// The recruit picker under a free place: every class not yet in the party. An unlocked class is recruited at
// once; a locked one is unlocked first for its gold price (then it can be recruited) — the store's rules.

export function RecruitMenu({ left, onClose }: { left: number; onClose: () => void }): React.JSX.Element {
  const t = useT();
  const roster = useStore((s) => s.roster);
  const unlocked = useStore((s) => s.unlockedClasses);
  const gold = useStore((s) => s.gold);
  const addHero = useStore((s) => s.addHero);
  const unlockClass = useStore((s) => s.unlockClass);
  const fielded = new Set(roster.map((h) => h.classKey));
  const choices = CLASS_KEYS.filter((key) => !fielded.has(key));

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 29 }}
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div className="tk-hero-recruit" style={{ left }}>
        <Menu tall>
          {choices.length === 0 && <MenuRow disabled>{t('hero.recruitNone')}</MenuRow>}
          {choices.map((key) => {
            const def = classDef(key);
            const open = unlocked.includes(key);
            const cost = def.unlock.type === 'gold' ? def.unlock.cost : 0;
            return (
              <MenuRow
                key={key}
                sign={classCrestStem(key)}
                name
                disabled={!open && gold < cost}
                onClick={() => {
                  if (open) {
                    addHero(key);
                    onClose();
                  } else unlockClass(key);
                }}
                end={
                  open ? (
                    t('hero.recruit')
                  ) : (
                    <>
                      <Sign name="map_lock_s" alt={t('hero.recruitUnlock', { name: className(key) })} />
                      <Sign name="ui_gold" />
                      {format(cost)}
                    </>
                  )
                }
              >
                {className(key)}
              </MenuRow>
            );
          })}
        </Menu>
      </div>
    </>
  );
}
