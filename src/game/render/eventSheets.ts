// Where the strip events' atlases are (inlined as data: URIs by the build, like every PNG of the game).

const EVENTS = import.meta.glob<string>('../../assets/strip/events/*.png', { query: '?url', import: 'default' });

/** Loads the URL of an event figure's atlas, or undefined if that event has no figure. */
export function eventSheetLoader(kind: string): (() => Promise<string>) | undefined {
  const suffix = `/${kind}.png`;
  const path = Object.keys(EVENTS).find((p) => p.endsWith(suffix));
  return path === undefined ? undefined : EVENTS[path];
}
