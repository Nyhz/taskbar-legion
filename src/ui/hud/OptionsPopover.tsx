import { useRef, useState } from 'react';
import { resetGame, exportSave, importSave } from '@/persistence/saveManager';
import { isTauri } from '@/platform/tauri';
import { exportSaveToFile, readSaveFromFile } from '@/platform/saveTransfer';
import { useStore } from '@/state/store';
import { UI_ZOOM_LEVELS } from '@/state/slices/uiSlice';
import { PALETTE } from '@/styles/palette';

const IMPORT_CONFIRM = 'Import this save? It REPLACES your current progress and reloads.';

function saveFileName(): string {
  // Date is fine here — this is a UI edge, not the deterministic sim.
  return `taskbar-legion-save-${new Date().toISOString().slice(0, 10)}.json`;
}

// Browser fallback (plain `npm run dev`): trigger a Blob download. Under Tauri the
// native Save dialog is used instead — see onExport. Revoke is deferred a tick so the
// download isn't cancelled before it starts.
function downloadSave(json: string, name: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Options popover (New Game, …). Opened from the cogwheel in the Party panel header.
// (UI zoom is fixed at 1.5× now — no longer adjustable.)

export function OptionsPopover({ onClose }: { onClose: () => void }): React.JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);
  const uiZoom = useStore((s) => s.uiZoom);
  const setUiZoom = useStore((s) => s.setUiZoom);

  // Export: native Save dialog under Tauri, Blob download in the browser dev build.
  const onExport = (): void => {
    const json = exportSave();
    const name = saveFileName();
    if (isTauri()) {
      void exportSaveToFile(json, name).then((r) => {
        if (r.status === 'error') window.alert(`Export failed: ${r.message}`);
      });
    } else {
      downloadSave(json, name);
    }
  };

  // Import: native Open dialog under Tauri, hidden <input file> in the browser dev build.
  const onImport = (): void => {
    if (!isTauri()) {
      fileRef.current?.click();
      return;
    }
    void readSaveFromFile().then(async (r) => {
      if (r.status === 'cancelled') return;
      if (r.status === 'error') {
        window.alert(`Import failed: ${r.message}`);
        return;
      }
      if (r.text === undefined || !window.confirm(IMPORT_CONFIRM)) return;
      const err = await importSave(r.text); // null on success → triggers a reload
      if (err !== null) window.alert(`Import failed: ${err}`);
    });
  };

  // Browser-only fallback handler for the hidden file input.
  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file later
    if (file === undefined) return;
    if (!window.confirm(IMPORT_CONFIRM)) return;
    void file.text().then(async (text) => {
      const err = await importSave(text); // null on success → triggers a reload
      if (err !== null) window.alert(`Import failed: ${err}`);
    });
  };

  return (
    <div
      data-interactive="true"
      style={{
        width: 200,
        background: PALETTE.bgPanel,
        border: `2px solid ${PALETTE.ink}`,
        boxShadow: `0 0 0 1px ${PALETTE.goldDim}`,
        padding: 8,
        fontSize: 12,
        color: PALETTE.textLight,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 700, color: PALETTE.gold }}>Options</span>
        <button
          onClick={onClose}
          style={{
            background: PALETTE.titleRedHi,
            color: PALETTE.textLight,
            border: `1px solid ${PALETTE.ink}`,
            width: 18,
            height: 18,
            padding: 0,
            lineHeight: '14px',
          }}
        >
          ×
        </button>
      </div>

      <Section label="UI Zoom">
        {UI_ZOOM_LEVELS.map((z) => {
          const active = Math.abs(uiZoom - z) < 0.001;
          return (
            <button
              key={z}
              onClick={() => setUiZoom(z)}
              style={{
                flex: 1,
                padding: '5px 0',
                background: active ? PALETTE.gold : PALETTE.bgInset,
                border: `1px solid ${active ? PALETTE.gold : PALETTE.goldDim}`,
                color: active ? PALETTE.ink : PALETTE.gold,
                fontWeight: 700,
              }}
            >
              {z.toFixed(2)}×
            </button>
          );
        })}
      </Section>

      <Section label="Backup">
        <button onClick={onExport} style={backupBtn}>
          ⭳ Export
        </button>
        <button onClick={onImport} style={backupBtn}>
          ⭱ Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onImportFile}
          style={{ display: 'none' }}
        />
      </Section>

      <Section label="Save">
        <button
          onClick={() => {
            if (window.confirm('Start a NEW GAME? This erases all progress (stage, gear, gold, tech) and cannot be undone.')) {
              void resetGame();
            }
          }}
          style={{
            flex: 1,
            padding: '5px 0',
            background: PALETTE.bgInset,
            border: `1px solid ${PALETTE.enemyAccent}`,
            color: PALETTE.enemyAccent,
            fontWeight: 700,
          }}
        >
          ⟳ New Game
        </button>
      </Section>
    </div>
  );
}

// The cogwheel that lives in the Party panel header (left of the close button). It
// toggles the options popover, anchored just below the title bar.
export function SettingsHeaderButton(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        title="Settings"
        style={{
          background: open ? PALETTE.gold : PALETTE.titleRedHi,
          color: open ? PALETTE.ink : PALETTE.textLight,
          border: `1px solid ${PALETTE.ink}`,
          width: 18,
          height: 18,
          lineHeight: '14px',
          fontWeight: 700,
          padding: 0,
        }}
      >
        ⚙
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 6, zIndex: 80 }}>
          <OptionsPopover onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

const backupBtn: React.CSSProperties = {
  flex: 1,
  padding: '5px 0',
  background: PALETTE.bgInset,
  border: `1px solid ${PALETTE.goldDim}`,
  color: PALETTE.gold,
  fontWeight: 700,
};

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: PALETTE.textMute, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', gap: 4 }}>{children}</div>
    </div>
  );
}

