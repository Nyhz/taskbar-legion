import { useStore } from '@/state/store';
import { Tip, TipText, TipTitle } from '@/ui/kit';
import { effectTipEntries } from './effectTipWords';

// The tooltip of an effect chip over a hero. The chips are drawn by the strip (Pixi), which only says which one
// the pointer is on, what its effects are worth and where it is (state `stripTip`, art pixels of the strip); this
// words it with the kit, in the overlay that lies over the canvas at the same scale. It opens BESIDE the chip,
// its top on the chip's — the chips ride over the heroes' heads, so the longest tooltip still ends inside the
// strip — and is kept inside the strip's width.

const TIP_W = 172; // a wide tip (kit.css)
const CHIP = 9;

export function StripEffectTip(): React.JSX.Element | null {
  const tip = useStore((s) => s.stripTip);
  if (tip === null) return null;
  const entries = effectTipEntries(tip.effects);
  if (entries.length === 0) return null;
  // (The layer is as wide as the strip: the clamp keeps the tip inside it.)
  const left = `clamp(2px, ${tip.x + CHIP + 3}px, calc(100% - ${TIP_W + 2}px))`;
  return (
    <div style={{ position: 'absolute', left, top: Math.max(2, tip.y), zIndex: 30, pointerEvents: 'none' }}>
      <Tip still size="wide">
        {entries.map((e) => (
          <div key={e.name}>
            <TipTitle>{e.name}</TipTitle>
            {e.lines.map((line) => (
              <TipText key={line}>{line}</TipText>
            ))}
          </div>
        ))}
      </Tip>
    </div>
  );
}
