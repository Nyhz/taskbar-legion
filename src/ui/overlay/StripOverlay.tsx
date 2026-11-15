import { useStore } from '@/state/store';
import { KitRoot } from '@/ui/kit';
import { BossPlate } from './BossPlate';
import { RetryKey } from './RetryKey';
import { HealDebuffBadge } from './HealDebuffBadge';
import { DangerBanner } from './DangerBanner';
import { StageBanner } from './StageBanner';
import { SaveErrorBadge } from './SaveErrorBadge';
import './overlay.css';

// React overlay pinned over the Pixi strip (it fills the strip wrapper): ONE kit layer, authored at the art's
// pixel like the HUD above it — the boss plate, the banners, the failed-save warning, retry and weakened healing.
// (The chests live on the HUD rail; the floating loot lines live in the panel zone — GameView — so an open menu
// can't cover them.)

export function StripOverlay(): React.JSX.Element {
  const uiScale = useStore((s) => s.uiScale);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <KitRoot zoom={uiScale} className="tk-strip">
        <StageBanner />
        <DangerBanner />
        <BossPlate />
        <HealDebuffBadge />
        <SaveErrorBadge />
        <RetryKey />
      </KitRoot>
    </div>
  );
}
