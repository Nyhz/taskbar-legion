import type { GameEngine } from './engine';

// Bridge so React panels (which don't own the Pixi/engine instance) can invoke
// engine-only actions (open chests, etc.). GameStrip sets it on init / clears on
// destroy. UI reads it lazily; pure store actions don't need it.

let current: GameEngine | null = null;

export function setEngine(engine: GameEngine | null): void {
  current = engine;
}

export function getEngine(): GameEngine | null {
  return current;
}
