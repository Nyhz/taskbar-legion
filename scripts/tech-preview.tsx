/**
 * Static visual preview of the reworked tech UI (run:
 *   npx vite-node scripts/tech-preview.tsx > /tmp/tech-preview.html
 * then open /tmp/tech-preview.html). Server-renders the REAL shipped TechCard +
 * category layout with sample ranks so the design can be eyeballed without a browser
 * automation tool. Dev tooling only.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { TECH_CATEGORIES, nodesByCategory, nodeCost } from '../src/data/techTree';
import { TechCard } from '../src/ui/panels/tech/TechCard';
import { CATEGORY_COLOR, CATEGORY_BLURB } from '../src/ui/panels/tech/techMeta';
import { PALETTE } from '../src/styles/palette';

// Sample ranks so cards show a mix of owned / unowned / maxed states.
const SAMPLE_RANKS: Record<string, number> = {
  cmb_attackDamage: 7,
  cmb_health: 4,
  cmb_critChance: 2,
  cmb_critDamage: 3,
  eco_gold: 6,
  eco_xp: 3,
  chest_drop_all: 4,
  chest_gem: 2,
  store_normal: 3,
  auto_open: 12, // maxed
  party_size: 2, // maxed (trio)
};
const GOLD = 48_500;

const panel = h(
  'div',
  { style: { width: 500, display: 'flex', flexDirection: 'column', gap: 6 } }, // ≈ PixelWindow(520) inner content
  h(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
    h('span', { style: { color: PALETTE.textMute, fontSize: 10 } }, 'Every upgrade scales forever — spend gold to rank up'),
    h('span', { style: { color: PALETTE.gold, fontWeight: 700 } }, `💰 ${GOLD.toLocaleString()}`),
  ),
  h(
    'div',
    {
      style: {
        // preview renders the FULL catalogue (no scroll clip) so every card/height is visible;
        // the live panel uses height:400 + overflowY:auto.
        overflow: 'visible', border: `1px solid ${PALETTE.ink}`,
        background: '#100d16', padding: 8, display: 'flex', flexDirection: 'column', gap: 14,
      },
    },
    ...TECH_CATEGORIES.map((category) => {
      const color = CATEGORY_COLOR[category];
      return h(
        'section',
        { key: category },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'baseline', gap: 8, borderBottom: `1px solid ${color}44`, paddingBottom: 3, marginBottom: 8 } },
          h('span', { style: { color, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' } }, category),
          h('span', { style: { color: PALETTE.textMute, fontSize: 9.5 } }, CATEGORY_BLURB[category]),
        ),
        h(
          'div',
          { style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 } },
          ...nodesByCategory(category).map((node) => {
            const rank = SAMPLE_RANKS[node.key] ?? 0;
            const buyable = rank < node.maxRanks && GOLD >= nodeCost(node, rank);
            return h(TechCard, { key: node.key, node, rank, buyable, onBuy: () => {} });
          }),
        ),
      );
    }),
  ),
);

const body = renderToStaticMarkup(panel);
process.stdout.write(`<!doctype html><html><head><meta charset="utf8"><style>
  body{margin:0;background:#14121a;font-family:'Segoe UI',system-ui,sans-serif;padding:24px;display:flex;justify-content:center}
  .frame{background:${PALETTE.bgPanel};border:2px solid ${PALETTE.ink};box-shadow:0 0 0 1px ${PALETTE.goldDim};padding:12px}
  button{font-family:inherit}
</style></head><body><div class="frame">${body}</div></body></html>`);
