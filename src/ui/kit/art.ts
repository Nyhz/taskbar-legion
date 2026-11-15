// The interface art exported by the asset pipeline (`sh tools/assets/run.sh export-ui` → src/assets/ui).
// Components name a piece by its file stem: `art('hud_key')`.

const FILES = import.meta.glob<string>('../../assets/ui/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const ART: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(FILES).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -'.png'.length), url]),
);

// A transparent pixel: a missing piece must never take the interface down with it.
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

/** URL of a piece of interface art by file stem. Unknown names warn and render nothing. */
export function art(name: string): string {
  const url = ART[name];
  if (url === undefined) {
    console.warn(`[kit] unknown interface art "${name}"`);
    return BLANK;
  }
  return url;
}
