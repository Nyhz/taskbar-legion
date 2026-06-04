import { saveGame } from '@/persistence/saveManager';
import { isTauri } from './tauri';

// Flush the save, then close the desktop app. In a browser this just saves (there's
// no window to destroy) — the quit button is only shown under Tauri anyway.
export async function quitGame(): Promise<void> {
  try {
    await saveGame();
  } catch {
    // a failed save must not trap the user in the app
  }
  if (!isTauri()) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  // destroy() closes immediately WITHOUT re-firing onCloseRequested (we already saved).
  await getCurrentWindow().destroy();
}
