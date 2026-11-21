import { useStore } from '@/state/store';
import { KitRoot } from '@/ui/kit';
import { RetryKey } from './RetryKey';
import { NextStageKey } from './NextStageKey';
import { DangerBanner } from './DangerBanner';
import { StageBanner } from './StageBanner';
import { SaveErrorBadge } from './SaveErrorBadge';
import './overlay.css';
import { StripEffectTip } from './StripEffectTip';

// React overlay pinned over the Pixi strip (it fills the strip wrapper): ONE kit layer, authored at the art's
// pixel like the HUD above it — the banners, the failed-save warning, retry (with the arrow to the next stage over it). (The boss's
// name, life and clock live on the HUD rail — ui/hud/HudBoss — so nothing covers a tall boss; so do the chests; the floating loot lines live in the panel zone — GameView — so an open menu
// can't cover them.)

export function StripOverlay(): React.JSX.Element {
  const uiScale = useStore((s) => s.uiScale);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <KitRoot zoom={uiScale} className="tk-strip">
        <StageBanner />
        <DangerBanner />
        <SaveErrorBadge />
        <NextStageKey />
        <RetryKey />
        <StripEffectTip />
      </KitRoot>
    </div>
  );
}
