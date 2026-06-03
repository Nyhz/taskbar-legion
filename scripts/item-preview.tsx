/**
 * Static preview of the reworked ItemTooltip across the new gear identities
 * (run: npx vite-node scripts/item-preview.tsx > /tmp/item-preview.html). Dev tooling.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { composeItem, type ItemOrigin } from '../src/sim/loot';
import { makeRng } from '../src/sim/rng';
import { ItemTooltip } from '../src/ui/components/ItemTooltip';
import { GENERATOR_VERSION } from '../src/data/lootTables';
import { PALETTE } from '../src/styles/palette';
import type { ItemInstance } from '../src/sim/items';

const origin = (seed: number): ItemOrigin => ({ rollSeed: seed, stageIndex: 60, chestType: 'zoneBoss', generatorVersion: GENERATOR_VERSION });

// Find a split-armor piece (two mitigation base affixes) for the preview.
function splitArmor(): ItemInstance {
  for (let s = 1; s < 500; s++) {
    const it = composeItem('chest', 7, origin(s), makeRng(s), 55);
    if (it.baseAffix.length === 2) return it;
  }
  return composeItem('chest', 7, origin(1), makeRng(1), 55);
}

const items: { label: string; item: ItemInstance }[] = [
  { label: 'Knight Sword', item: composeItem('weapon', 6, origin(7), makeRng(7), 55, 'knight') },
  { label: 'Priest Wand', item: composeItem('weapon', 6, origin(13), makeRng(13), 55, 'priest') },
  { label: 'Ranger Quiver (off-hand)', item: composeItem('offhand', 6, origin(21), makeRng(21), 55, 'ranger') },
  { label: 'Armor (armor/MR split)', item: splitArmor() },
  { label: 'Freestyle Ring', item: composeItem('ring', 6, origin(33), makeRng(33), 55) },
];

const cards = items.map(({ label, item }) =>
  h('div', { key: label, style: { display: 'flex', flexDirection: 'column', gap: 4 } },
    h('div', { style: { color: PALETTE.gold, fontSize: 11, fontWeight: 700 } }, label),
    h(ItemTooltip, { item }),
  ),
);

const body = renderToStaticMarkup(h('div', { style: { display: 'flex', gap: 16, alignItems: 'flex-start' } }, ...cards));
process.stdout.write(`<!doctype html><html><head><meta charset="utf8"><style>
  body{margin:0;background:#14121a;font-family:'Segoe UI',system-ui,sans-serif;padding:20px}
</style></head><body>${body}</body></html>`);
