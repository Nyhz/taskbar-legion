import { useRef, type ChangeEvent, type RefObject } from 'react';
import { exportSave } from '@/persistence/saveManager';
import { isTauri } from '@/platform/tauri';
import { exportSaveToFile, readSaveFromFile } from '@/platform/saveTransfer';
import { useT } from '@/i18n';
import { downloadSave, saveFileName } from './saveBackup';

// Export and import of the save, both ways the game can run: the native Save / Open dialogs under Tauri, a Blob
// download and a hidden <input type="file"> in the browser build. Picking a file to import does NOT import it:
// `onPicked` gets its text so the window can ask first (importing replaces the current game).

export interface Backup {
  /** The hidden file input the browser build picks through: mount it once. */
  fileRef: RefObject<HTMLInputElement>;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
  exportNow: () => void;
  pickImport: () => void;
}

export function useBackup(onError: (message: string) => void, onPicked: (text: string) => void): Backup {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportNow = (): void => {
    const json = exportSave();
    const name = saveFileName();
    if (!isTauri()) {
      downloadSave(json, name);
      return;
    }
    void exportSaveToFile(json, name).then((r) => {
      if (r.status === 'error') onError(t('options.exportFailed', { message: r.message }));
    });
  };

  const pickImport = (): void => {
    if (!isTauri()) {
      fileRef.current?.click();
      return;
    }
    void readSaveFromFile().then((r) => {
      if (r.status === 'cancelled') return;
      if (r.status === 'error') onError(t('options.importFailed', { message: r.message }));
      else if (r.text !== undefined) onPicked(r.text);
    });
  };

  const onFile = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again later
    if (file === undefined) return;
    void file.text().then(onPicked);
  };

  return { fileRef, onFile, exportNow, pickImport };
}
