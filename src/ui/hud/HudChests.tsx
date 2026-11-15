import { useStore } from '@/state/store';
import { getBonuses } from '@/sim/bonuses';
import { autoOpenIntervalMs, chestCapacity } from '@/sim/chests';
import { CHEST_TYPES, chestCountOf, type ChestType } from '@/data/chests';
import { openChestPopup } from '@/ui/loot/revealLoot';
import { chestName, useT } from '@/i18n';
import { Sign, Tip, TipLine, TipText, TipTitle } from '@/ui/kit';

// The chests the party holds, one group per kind: its sign and one square per storage slot, lit when it holds a
// chest (all red when there is no room left — the next drop of that kind is lost). Clicking a kind cracks every
// chest of it; the loot streams into the bag (revealLoot). The tooltip also says when auto-open sweeps next.

const SIGN: Record<ChestType, string> = {
  normal: 'hud_chest_normal',
  stageBoss: 'hud_chest_stage',
  zoneBoss: 'hud_chest_world',
};

// "4m 12s" / "37s" from a millisecond remainder (ceil so it never shows 0s while pending).
function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function HudChests(): React.JSX.Element {
  const t = useT();
  const chests = useStore((s) => s.chests);
  const techRanks = useStore((s) => s.techRanks);
  const petRanks = useStore((s) => s.petRanks);
  const autoOpen = useStore((s) => s.autoOpen);
  // Whole seconds, so the countdown re-renders about once a second, not on every HUD push.
  const nowSec = useStore((s) => Math.floor(s.hud.clockMs / 1000));
  const bonuses = getBonuses(techRanks, petRanks);

  // Mirrors engine.autoOpen(): it fires once now − (lastRunAt ?? 0) ≥ interval and sweeps every kind.
  const remaining = Math.max(0, (autoOpen.lastRunAt ?? 0) + autoOpenIntervalMs(bonuses) - nowSec * 1000);
  const autoLine = !autoOpen.unlocked
    ? t('hud.autoLocked')
    : remaining <= 0
      ? t('hud.autoDue')
      : t('hud.autoIn', { time: formatRemaining(remaining) });

  return (
    <>
      {CHEST_TYPES.map((type) => {
        const count = chestCountOf(chests, type);
        const capacity = chestCapacity(type, bonuses);
        const full = count >= capacity;
        const state = count === 0 ? ' zero' : full ? ' can full' : ' can';
        return (
          <button
            key={type}
            type="button"
            className={`tk-hud-res has${state}`}
            aria-label={`${chestName(type)}: ${count} / ${capacity}`}
            onClick={() => openChestPopup(type)}
          >
            <Sign name={SIGN[type]} />
            <div className={`tk-hud-pips ${type}`}>
              {Array.from({ length: capacity }, (_, i) => (
                <i key={i} className={i < count ? 'on' : undefined} />
              ))}
            </div>
            <Tip side="below-end">
              <TipTitle>{chestName(type)}</TipTitle>
              <TipLine
                label={t('hud.stored')}
                value={`${count} / ${capacity}`}
                tone={full ? 'bad' : undefined}
              />
              {count > 0 && <TipText>{full ? t('hud.chestFull') : t('hud.chestOpen')}</TipText>}
              <TipText>{autoLine}</TipText>
            </Tip>
          </button>
        );
      })}
    </>
  );
}
