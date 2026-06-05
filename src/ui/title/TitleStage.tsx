import { useEffect, useRef } from 'react';
import { TitleScene } from '@/game/render/TitleScene';

// Mounts the Pixi title scene (dusk backdrop + the 3-vs-3 walk-in) into a full-bleed canvas
// behind the title UI. Owns the scene's lifecycle — built on mount, torn down on unmount
// (which is when the player hits Start and the screen flips to the game).

export function TitleStage(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = ref.current;
    if (container === null) return;
    const scene = new TitleScene();
    void scene.init(container).catch((err) => console.error('Title scene init failed', err));
    return () => scene.destroy();
  }, []);
  return <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} />;
}
