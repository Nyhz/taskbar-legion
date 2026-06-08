// "GPU-safe mode": a sticky escape hatch for machines where the normal (transparent,
// hi-dpi) canvas can't get a working WebGL context. When set, createPixiApp uses the most
// conservative config (opaque background, resolution 1). The RenderErrorPanel sets this and
// reloads, so a stranded user has a one-click recovery even on a combo we didn't pre-handle.

const KEY = 'tl_render_safe';

export function isRenderSafeMode(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setRenderSafeMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* private-mode / disabled storage — safe mode just won't persist */
  }
}
