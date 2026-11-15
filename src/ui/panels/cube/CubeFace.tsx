import type { ReactNode } from 'react';
import { CUBE_INPUT_COUNT } from '@/sim/cube';
import { isGem, isItem, type InvEntry } from '@/sim/items';
import { SlotGrid } from '@/ui/kit';
import { ItemCell } from '../items/ItemCell';

// The Cube's face: its nine cells, three by three. A loaded cell is taken out with a click.

export function CubeFace<T extends InvEntry>({
  loaded,
  onRemove,
  badgeOf,
}: {
  loaded: readonly T[];
  onRemove: (entry: T) => void;
  /** Something to put in a loaded cell's corner. */
  badgeOf?: (entry: T) => ReactNode;
}): React.JSX.Element {
  return (
    <SlotGrid cols={3}>
      {Array.from({ length: CUBE_INPUT_COUNT }, (_, i) => {
        const entry = loaded[i];
        if (entry === undefined) return <ItemCell key={i} item={null} />;
        return (
          <ItemCell
            key={i}
            item={isItem(entry) ? entry : null}
            gem={isGem(entry) ? entry : undefined}
            onClick={() => onRemove(entry)}
            badge={badgeOf?.(entry)}
          />
        );
      })}
    </SlotGrid>
  );
}
