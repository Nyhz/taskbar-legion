import { useRef, useState } from 'react';
import { resetGame, exportSave, importSave } from '@/persistence/saveManager';
import { PALETTE } from '@/styles/palette';

// Trigger a browser download of the current save as a JSON file. (Date is fine here —
// this is a UI edge, not the deterministic sim.)
function downloadSave(): void {
  const json = exportSave();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `taskbar-legion-save-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Options popover (New Game, …). Opened from the cogwheel in the Party panel header.
// (UI zoom is fixed at 1.5× now — no longer adjustable.)

export function OptionsPopover({ onClose }: { onClose: () => void }): React.JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file later
    if (file === undefined) return;
    if (!window.confirm('Import this save? It REPLACES your current progress and reloads.')) return;
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

      <Section label="Backup">
        <button onClick={downloadSave} style={backupBtn}>
          ⭳ Export
        </button>
        <button onClick={() => fileRef.current?.click()} style={backupBtn}>
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

