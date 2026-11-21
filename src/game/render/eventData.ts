import file from '@/assets/strip/events/events.json';
import type { FigureMeta } from './figureData';

// The strip events' figures as data (no Pixi here — pure): the runaway chest's and the wandering merchant's atlas
// layout and clips, the same shape as a pet's. Written by the asset pipeline (`sh tools/assets/run.sh export-events`
// → src/assets/strip/events/); `root`/`ground` are the point under the figure's feet. Drawn facing right.

interface EventFile {
  events: Record<string, FigureMeta>;
}

const DATA = file as unknown as EventFile;

export function eventMeta(kind: string): FigureMeta | undefined {
  return DATA.events[kind];
}

export const EVENT_FIGURES: readonly string[] = Object.keys(DATA.events);
