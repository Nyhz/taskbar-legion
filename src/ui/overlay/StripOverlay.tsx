import { ChestPopups } from './ChestPopups';
import { LootToasts } from './LootToasts';
import { BossEnrageBar } from './BossEnrageBar';
import { RetryToggle } from './RetryToggle';
import { DangerBanner } from './DangerBanner';

// React overlay pinned over the Pixi strip (fills the strip wrapper, which excludes
// the launcher dock). Hosts the chest popups and the floating loot text. Transparent
// to pointer events except the popups themselves, so the strip behind stays untouched.

export function StripOverlay(): React.JSX.Element {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        // No clip: loot toasts rise out the top into the dark area above the strip.
        pointerEvents: 'none',
      }}
    >
      <ChestPopups />
      <LootToasts />
      <BossEnrageBar />
      <RetryToggle />
      <DangerBanner />
    </div>
  );
}
