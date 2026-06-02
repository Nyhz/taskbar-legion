import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './styles/global.css';

// Note: no <StrictMode> — it double-invokes effects in dev, which would init the
// Pixi Application twice. The render/sim layers are guarded by refs regardless.
const rootEl = document.getElementById('root');
if (rootEl === null) throw new Error('Missing #root element');
createRoot(rootEl).render(<App />);
