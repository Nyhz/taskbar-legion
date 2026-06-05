// Native save export/import for the Tauri desktop build. The Tauri plugins are
// imported DYNAMICALLY inside each function so the plain-browser dev build and the
// vitest (node) suite never load `@tauri-apps/*` at module-evaluation time (mirrors
// platform/storage.ts). The browser fallback (Blob download / <input file>) lives in
// the OptionsPopover component; these helpers are only called when isTauri() is true.

export type TransferResult =
  | { status: 'ok'; text?: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Native "Save As…" export: let the user pick a path, then write the save JSON there.
 *  Returns 'cancelled' if they dismiss the dialog. */
export async function exportSaveToFile(json: string, defaultName: string): Promise<TransferResult> {
  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: 'Taskbar Legion save', extensions: ['json'] }],
    });
    if (path === null) return { status: 'cancelled' };
    await writeTextFile(path, json);
    return { status: 'ok' };
  } catch (err) {
    return { status: 'error', message: errMessage(err) };
  }
}

/** Native "Open…" import: let the user pick a .json save and return its text. The caller
 *  confirms with the user and runs the text through importSave. Returns 'cancelled' on dismiss. */
export async function readSaveFromFile(): Promise<TransferResult> {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    const picked = await open({
      multiple: false,
      directory: false,
      filters: [{ name: 'Taskbar Legion save', extensions: ['json'] }],
    });
    const path = Array.isArray(picked) ? picked[0] : picked;
    if (path === null || path === undefined) return { status: 'cancelled' };
    const text = await readTextFile(path);
    return { status: 'ok', text };
  } catch (err) {
    return { status: 'error', message: errMessage(err) };
  }
}
