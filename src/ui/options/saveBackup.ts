// Getting a save out of the browser build: a dated file name and a Blob download. (Under Tauri the native Save
// dialog is used instead — see platform/saveTransfer.)

export function saveFileName(): string {
  // Date is fine here — this is a UI edge, not the deterministic sim.
  return `taskbar-legion-save-${new Date().toISOString().slice(0, 10)}.json`;
}

/** Trigger a download of `json` as `name`. Revoke is deferred a tick so the download isn't cancelled first. */
export function downloadSave(json: string, name: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
