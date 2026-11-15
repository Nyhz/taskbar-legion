import { useRef, useState } from 'react';
import { resetGame, exportSave, importSave } from '@/persistence/saveManager';
import { isTauri } from '@/platform/tauri';
import { exportSaveToFile, readSaveFromFile } from '@/platform/saveTransfer';
import { PALETTE } from '@/styles/palette';
import { LANGS, LANG_NAMES, setLanguage, useLanguage, useT } from '@/i18n';

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
  const t = useT();
  const language = useLanguage();

  // Export: native Save dialog under Tauri, Blob download in the browser dev build.
  const onExport = (): void => {
    const json = exportSave();
    const name = saveFileName();
    if (isTauri()) {
      void exportSaveToFile(json, name).then((r) => {
        if (r.status === 'error') window.alert(t('options.exportFailed', { message: r.message }));
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
        window.alert(t('options.importFailed', { message: r.message }));
        return;
      }
      if (r.text === undefined || !window.confirm(t('options.importConfirm'))) return;
      const err = await importSave(r.text); // null on success → triggers a reload
      if (err !== null) window.alert(t('options.importFailed', { message: err }));
    });
  };

  // Browser-only fallback handler for the hidden file input.
  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file later
    if (file === undefined) return;
    if (!window.confirm(t('options.importConfirm'))) return;
    void file.text().then(async (text) => {
      const err = await importSave(text); // null on success → triggers a reload
      if (err !== null) window.alert(t('options.importFailed', { message: err }));
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
        <span style={{ fontWeight: 700, color: PALETTE.gold }}>{t('options.title')}</span>
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

      <Section label={t('options.language')}>
        {LANGS.map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            aria-pressed={lang === language}
            style={{
              ...backupBtn,
              background: lang === language ? PALETTE.gold : PALETTE.bgInset,
              color: lang === language ? PALETTE.ink : PALETTE.gold,
            }}
          >
            {LANG_NAMES[lang]}
          </button>
        ))}
      </Section>

      <Section label={t('options.backup')}>
        <button onClick={onExport} style={backupBtn}>
          ⭳ {t('options.exportSave')}
        </button>
        <button onClick={onImport} style={backupBtn}>
          ⭱ {t('options.importSave')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={onImportFile}
          style={{ display: 'none' }}
        />
      </Section>

      <Section label={t('options.save')}>
        <button
          onClick={() => {
            if (window.confirm(t('options.newGameConfirm'))) {
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
          ⟳ {t('options.newGame')}
        </button>
      </Section>
    </div>
  );
}

// The cogwheel that lives in the Party panel header (left of the close button). It
// toggles the options popover, anchored just below the title bar.
export function SettingsHeaderButton(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const t = useT();
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('options.settings')}
        title={t('options.settings')}
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

