import { create } from 'zustand';

// Whether the wandering merchant's window is open (ui/overlay/MerchantWindow). A tiny store of its own: the strip
// opens it when the merchant is tapped (game/GameStrip), the window closes it, and it closes by itself when the
// merchant leaves. Kept apart from the game store: nothing here is saved.

interface MerchantWindowState {
  open: boolean;
  /** The merchant event it was opened for (its number): a window left open never shows the next merchant. */
  eventN: number;
  show: (eventN: number) => void;
  hide: () => void;
}

export const useMerchantWindow = create<MerchantWindowState>()((set) => ({
  open: false,
  eventN: -1,
  show: (eventN) => set({ open: true, eventN }),
  hide: () => set({ open: false }),
}));
