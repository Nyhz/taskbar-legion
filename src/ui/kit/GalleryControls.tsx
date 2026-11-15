import { useState } from 'react';
import { Node, Pager, Segment, Sign, SlimKey, Switch } from './index';

// DEV ONLY — the kit's controls in use, for the gallery (Gallery.tsx; open the dev server at `/#kit`): the pager
// in its two shapes, the segment, the switch, the slim key, the role node, the big number and the niche.
// The Veil is not here: it covers the page.

const noop = (): void => undefined;
const LANGS = ['English', 'Español'];
const SCALES = ['×1', '×2', '×3'];

export function Controls(): React.JSX.Element {
  const [few, setFew] = useState(2);
  const [many, setMany] = useState(5);
  const [lang, setLang] = useState(1);
  const [scale, setScale] = useState(1);
  const [on, setOn] = useState(true);
  return (
    <div style={{ display: 'grid', gap: 8, justifyItems: 'start' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <Pager page={few} pages={4} listed={4} onPage={setFew} pageLabel={(n) => `Página ${n}`} />
        <Pager page={many} pages={8} listed={4} onPage={setMany} pageLabel={(n) => `Página ${n}`} />
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <Segment names items={LANGS.map((label, i) => ({ key: label, label, on: i === lang, onPick: () => setLang(i) }))} />
        <Segment items={SCALES.map((label, i) => ({ key: label, label, on: i === scale, onPick: () => setScale(i) }))} />
        <Switch on={on} onChange={setOn} label="Música" />
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 44 }}>
          <SlimKey label="Comprar por 380" onClick={noop}>
            380
          </SlimKey>
        </div>
        <div style={{ width: 44 }}>
          <SlimKey label="Comprar por 48 K" disabled>
            48 K
          </SlimKey>
        </div>
        <div className="tk-big" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Sign name="ui_gold" />
          12 480
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', height: 36 }}>
        <Node kind="role" state="off" sign="stat_armor" pips={{ rank: 0, max: 3 }} locked />
        <Node kind="role" state="on" sign="stat_health" pips={{ rank: 2, max: 3 }} onClick={noop} />
        <Node kind="role" state="max" sign="stat_block" pips={{ rank: 3, max: 3 }} onClick={noop} />
      </div>
      <div className="tk-niche" />
    </div>
  );
}
