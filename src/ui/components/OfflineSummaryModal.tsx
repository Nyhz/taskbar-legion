import { useState } from 'react';
import type { OfflineSummary } from '@/sim/offline';
import type { ChestType } from '@/data/chests';
import { stageInWorldOf, worldInDifficulty } from '@/data/difficulties';
import { format } from '@/sim/num';
import { chestName, petName, useT } from '@/i18n';
import { Head, Key, KitRoot, Sign, Title, Window } from '@/ui/kit';
import { kitZoomNear } from '@/ui/panels/items/kitZoom';
import { awayDuration, placeLabel } from '@/ui/overlay/overlayText';
import '@/ui/overlay/overlay.css';

// "While you were away" (SPEC §8): what the capped catch-up brought — gold, experience, chests by kind (already
// within storage), pets found, and where the party moved if it did. One kit window over a veil; one key.

const CHEST_SIGN: Record<ChestType, string> = {
  normal: 'hud_chest_normal',
  stageBoss: 'hud_chest_stage',
  zoneBoss: 'hud_chest_world',
};

export function OfflineSummaryModal({
  summary,
  onClose,
}: {
  summary: OfflineSummary;
  onClose: () => void;
}): React.JSX.Element {
  const t = useT();
  const [zoom] = useState(() => kitZoomNear());
  const chests = summary.chests.filter((c) => c.count > 0);
  const moved = summary.toStage !== summary.fromStage;
  const place = (g: number): string => placeLabel(worldInDifficulty(g), stageInWorldOf(g));
  return (
    <div className="tk-veil" data-interactive="true">
      <KitRoot zoom={zoom}>
        <Window id="offline-summary" closeLabel={t('overlay.awayCollect')} onClose={onClose} width={214}>
          <Head>
            <Title>{t('overlay.awayTitle')}</Title>
          </Head>
          <p className="tk-away-note">{t('overlay.awayTime', { time: awayDuration(summary.cappedMs) })}</p>
          <Row sign="ui_gold" label={t('overlay.awayGold')} value={`+${format(summary.gold)}`} gold />
          <Row sign="ui_xp" label={t('overlay.awayXp')} value={`+${format(summary.xp)}`} />
          {chests.map((c) => (
            <Row key={c.type} sign={CHEST_SIGN[c.type]} label={chestName(c.type)} value={`+${c.count}`} />
          ))}
          {summary.petDrops.length > 0 && (
            <Row
              sign="hud_pets"
              label={t('overlay.awayPets')}
              value={summary.petDrops.map(petName).join(', ')}
            />
          )}
          {moved && (
            <Row
              sign="hud_map"
              label={t('overlay.awayStage')}
              value={`${place(summary.fromStage)} → ${place(summary.toStage)}`}
            />
          )}
          <div className="tk-away-keys">
            <Key tone="gold" onClick={onClose}>
              {t('overlay.awayCollect')}
            </Key>
          </div>
        </Window>
      </KitRoot>
    </div>
  );
}

function Row({
  sign,
  label,
  value,
  gold = false,
}: {
  sign: string;
  label: string;
  value: string;
  gold?: boolean;
}): React.JSX.Element {
  return (
    <div className="tk-away-row">
      <Sign name={sign} />
      <span>{label}</span>
      <b className={gold ? 'gold' : undefined}>{value}</b>
    </div>
  );
}
