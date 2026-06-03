import { ChestPopups } from './ChestPopups';
import { BossEnrageBar } from './BossEnrageBar';
import { RetryToggle } from './RetryToggle';
import { DangerBanner } from './DangerBanner';

// React overlay pinned over the Pixi strip (fills the strip wrapper, which excludes
// the launcher dock). Hosts the chest popups + boss/danger banners. (The floating loot
// text lives in the panel zone instead — App.tsx — so an open menu can't cover it.)

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
      <BossEnrageBar />
      <RetryToggle />
      <DangerBanner />
    </div>
  );
}
