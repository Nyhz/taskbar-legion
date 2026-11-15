import { useState } from 'react';
import { useStore } from '@/state/store';
import { TIERS } from '@/data/tiers';
import { tierName, useT } from '@/i18n';
import { Check, Chip, Menu, Tip, TipTag, TipText } from '@/ui/kit';

// Melt on drop (auto-salvage): pieces of the ticked rarities turn into gold the moment they drop. The switch is
// here; which rarities it takes is a short list behind the cog, out of the way until it is wanted.

export function AutoMelt(): React.JSX.Element {
  const t = useT();
  const autoSalvage = useStore((s) => s.autoSalvage);
  const setAutoSalvage = useStore((s) => s.setAutoSalvage);
  const toggleTier = useStore((s) => s.toggleAutoSalvageTier);
  const [open, setOpen] = useState(false);
  const marked = autoSalvage.tiers.filter(Boolean).length;

  return (
    <div className="tk-cube-opt">
      <Check
        checked={autoSalvage.enabled}
        onChange={setAutoSalvage}
        tip={
          <Tip side="below">
            <TipText>{t('cube.autoMeltHelp')}</TipText>
          </Tip>
        }
      >
        {t('cube.autoMelt')} · {marked}
      </Check>
      <span className="end">
        <Chip
          sign="hud_options"
          label={t('cube.autoMeltPick')}
          on={open}
          onClick={() => setOpen((o) => !o)}
          tip={open ? undefined : <TipTag side="below-end">{t('cube.autoMeltPick')}</TipTag>}
        />
      </span>
      {open && (
        <Menu className="tk-cube-pop">
          {TIERS.map(({ tier }) => (
            <Check key={tier} checked={autoSalvage.tiers[tier] === true} onChange={() => toggleTier(tier)}>
              <span style={{ color: `var(--t${tier})` }}>{tierName(tier)}</span>
            </Check>
          ))}
        </Menu>
      )}
    </div>
  );
}
