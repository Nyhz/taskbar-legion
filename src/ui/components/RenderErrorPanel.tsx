import { useMemo, useState } from 'react';
import { PALETTE } from '@/styles/palette';
import { collectRenderDiagnostics, formatDiagnostics } from '@/game/render/gpuDiagnostics';

// Shown when a Pixi canvas fails to initialise or its textures fail to load. Replaces the old
// silent-black-screen failure with a real, copyable report (which webview, which GPU, what
// WebGL exists, the actual error) plus a reload. Pure DOM — needs no working canvas.

function reload(): void {
  window.location.reload();
}

export function RenderErrorPanel({ error }: { error: unknown }): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const details = useMemo(() => formatDiagnostics(collectRenderDiagnostics(), error), [error]);

  const copy = (): void => {
    void navigator.clipboard?.writeText(details).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      },
      () => {
        /* clipboard blocked — the text is on screen to copy by hand */
      },
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(13, 11, 18, 0.92)',
        pointerEvents: 'auto',
        fontFamily: 'monospace',
        padding: 16,
      }}
    >
      <div
        style={{
          maxWidth: 540,
          width: '100%',
          background: PALETTE.bgPanel,
          border: `2px solid ${PALETTE.goldDim}`,
          borderRadius: 4,
          padding: 20,
          color: PALETTE.textLight,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        <h2 style={{ margin: '0 0 8px', color: PALETTE.gold, fontSize: 18 }}>Graphics failed to start</h2>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: PALETTE.textMute, lineHeight: 1.5 }}>
          The game canvas couldn&apos;t start on this machine. Please copy these details and send
          them to the developer.
        </p>
        <pre
          style={{
            margin: '0 0 14px',
            padding: 10,
            background: PALETTE.ink,
            borderRadius: 3,
            color: PALETTE.parchment,
            fontSize: 11,
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 220,
            overflow: 'auto',
          }}
        >
          {details}
        </pre>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={copy} style={btnStyle(true)}>
            {copied ? 'Copied!' : 'Copy details'}
          </button>
          <button type="button" onClick={reload} style={btnStyle(false)}>
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(primary: boolean): React.CSSProperties {
  return {
    padding: '8px 14px',
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 'bold',
    cursor: 'pointer',
    borderRadius: 3,
    border: `2px solid ${primary ? PALETTE.gold : PALETTE.goldDim}`,
    background: primary ? PALETTE.gold : 'transparent',
    color: primary ? PALETTE.ink : PALETTE.textLight,
  };
}
