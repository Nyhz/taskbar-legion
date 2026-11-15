import { createContext, useContext } from 'react';

// What the panel layer tells a kit panel about the room it has: the height above the strip, in the panel's own
// art pixels. A panel uses it to show as much as fits (the hero window: how many rows of the bag).

export interface PanelSpace {
  availArtHeight: number;
}

export const PanelSpaceContext = createContext<PanelSpace>({ availArtHeight: 10_000 });

export function usePanelSpace(): PanelSpace {
  return useContext(PanelSpaceContext);
}
