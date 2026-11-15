import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { useStore } from './state/store';
import './styles/global.css';

// Note: no <StrictMode> — it double-invokes effects in dev, which would init the
// Pixi Application twice. The render/sim layers are guarded by refs regardless.
// Dev only: the live store on `window`, so scripted captures (scripts/shot-app.mjs + dev-seed.js) reach THE
// store even after hot reload has re-served modules under new URLs. Dropped from production builds.
if (import.meta.env.DEV) (window as unknown as { __tlStore?: typeof useStore }).__tlStore = useStore;
const rootEl = document.getElementById('root');
if (rootEl === null) throw new Error('Missing #root element');
// Dev only: `/#kit` shows the interface kit's gallery instead of the game (src/ui/kit/Gallery.tsx). The branch and
// its dynamic import are dropped from production builds.
if (import.meta.env.DEV && window.location.hash.startsWith('#kit')) {
  void import('./ui/kit/Gallery').then(({ Gallery }) => createRoot(rootEl).render(<Gallery />));
} else {
  createRoot(rootEl).render(<App />);
}
