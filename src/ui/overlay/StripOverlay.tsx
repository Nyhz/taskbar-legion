import { useStore } from '@/state/store';
import { KitRoot } from '@/ui/kit';
import { BossPlate } from './BossPlate';
import { RetryKey } from './RetryKey';
import { HealDebuffBadge } from './HealDebuffBadge';
import { DangerBanner } from './DangerBanner';
import { StageBanner } from './StageBanner';
import { SaveErrorBadge } from './SaveErrorBadge';
import './overlay.css';

// React overlay pinned over the Pixi strip (it fills the strip wrapper). Two layers: the kit layer, authored at
// the art's pixel like the HUD above it (boss plate, retry, weakened healing), and the banners still authored at
// screen size. (The chests live on the HUD rail; the floating loot text lives in the panel zone — GameView — so
// an open menu can't cover it.)

export function StripOverlay(): React.JSX.Element {
  const uiScale = useStore((s) => s.uiScale);
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        // No clip: loot toasts rise out the top into the dark area above the strip.
        pointerEvents: 'none',
      }}
    >
      <KitRoot zoom={uiScale} className="tk-strip">
        <BossPlate />
        <HealDebuffBadge />
        <RetryKey />
      </KitRoot>
      <DangerBanner />
      <StageBanner />
      <SaveErrorBadge />
    </div>
  );
}
