// Options (the current popover; the panel is rebuilt on the new kit later and keeps this namespace).
export const options = {
  title: 'Options',
  settings: 'Settings',
  language: 'Language',
  backup: 'Backup',
  exportSave: 'Export',
  importSave: 'Import',
  save: 'Save',
  newGame: 'New Game',
  newGameConfirm: 'Start a NEW GAME? This erases all progress (stage, gear, gold, tech) and cannot be undone.',
  importConfirm: 'Import this save? It REPLACES your current progress and reloads.',
  exportFailed: 'Export failed: {message}',
  importFailed: 'Import failed: {message}',
} as const;
