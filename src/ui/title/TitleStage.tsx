import { useEffect, useRef, useState } from 'react';
import { TitleScene } from '@/game/render/TitleScene';
import { RenderErrorPanel } from '@/ui/components/RenderErrorPanel';

// Mounts the Pixi title scene (dusk backdrop + the 3-vs-3 walk-in) into a full-bleed canvas
// behind the title UI. Owns the scene's lifecycle — built on mount, torn down on unmount
// (which is when the player hits Start and the screen flips to the game). If the canvas can't
// initialise, a RenderErrorPanel replaces the silent black screen with copyable diagnostics.

export function TitleStage(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<unknown>(null);
  useEffect(() => {
    const container = ref.current;
    if (container === null) return;
    const scene = new TitleScene();
    let cancelled = false;
    void scene.init(container).catch((err) => {
      console.error('Title scene init failed', err);
      if (!cancelled) setRenderError(err);
    });
    return () => {
      cancelled = true;
      scene.destroy();
    };
  }, []);
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {renderError !== null && <RenderErrorPanel error={renderError} />}
    </div>
  );
}
