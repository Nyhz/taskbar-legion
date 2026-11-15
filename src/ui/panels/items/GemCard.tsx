import type { GemInstance } from '@/data/gems';
import { gemGrants, gemLevel } from '@/sim/gems';
import { gemName, statLabel, tierName, useT } from '@/i18n';
import { Sign, Tip, TipAffix, TipName, TipNote, TipRule, TipSub, TipText, type TipSide } from '@/ui/kit';
import { statGain } from './itemText';

// The card of a loose gem. Gems are scaler-only and grant the SAME stat(s) in ANY socket, so one block shows
// exactly what it adds before committing a (permanent) socket.

export function GemCard({
  gem,
  side,
  still = false,
}: {
  gem: GemInstance;
  side?: TipSide;
  still?: boolean;
}): React.JSX.Element {
  const t = useT();
  return (
    <Tip size="item" tier={gem.tier} side={side} still={still}>
      <TipName>{gemName(gem.key)}</TipName>
      <TipSub
        end={
          <>
            <Sign name="ui_power" alt={t('items.gemLevel')} />
            {Math.round(gemLevel(gem))}
          </>
        }
      >
        {tierName(gem.tier)} · {t('items.gem')}
      </TipSub>
      <TipRule />
      <TipText>{t('items.gemAnySocket')}</TipText>
      {gemGrants(gem).map((grant) => (
        <TipAffix
          key={grant.key}
          sign={`stat_${grant.key}`}
          value={statGain(grant.key, grant.value)}
          name={statLabel(grant.key)}
          gem
        />
      ))}
      <TipNote>{t('items.gemHelp')}</TipNote>
    </Tip>
  );
}
