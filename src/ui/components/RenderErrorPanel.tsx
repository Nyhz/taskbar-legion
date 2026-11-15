import { useMemo, useState } from 'react';
import { collectRenderDiagnostics, formatDiagnostics } from '@/game/render/gpuDiagnostics';
import { useT } from '@/i18n';
import { Head, Key, KitRoot, Title, Window } from '@/ui/kit';
import { kitZoomNear } from '@/ui/panels/items/kitZoom';
import '@/ui/overlay/overlay.css';

// Shown when a Pixi canvas fails to initialise or its textures fail to load. Replaces a silent black screen
// with a real, copyable report (which webview, which GPU, what WebGL exists, the actual error) plus a reload.
// Pure DOM on the interface kit — it needs no working canvas. The report itself is diagnostic text, not prose:
// it stays in English whatever the language, so the developer can read what a player sends.

function reload(): void {
  window.location.reload();
}

export function RenderErrorPanel({ error }: { error: unknown }): React.JSX.Element {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [zoom] = useState(() => kitZoomNear());

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
    <div className="tk-veil top" data-interactive="true">
      <KitRoot zoom={zoom}>
        {/* The close key reloads: there is nothing behind this panel to go back to. */}
        <Window id="render-error" closeLabel={t('overlay.gfxReload')} onClose={reload} width={270}>
          <Head>
            <Title>{t('overlay.gfxTitle')}</Title>
          </Head>
          <p className="tk-gfx-text">{t('overlay.gfxHelp')}</p>
          <pre className="tk-gfx-pre tl-scroll">{details}</pre>
          <div className="tk-away-keys">
            <Key onClick={reload}>{t('overlay.gfxReload')}</Key>
            <Key tone="gold" onClick={copy}>
              {copied ? t('overlay.gfxCopied') : t('overlay.gfxCopy')}
            </Key>
          </div>
        </Window>
      </KitRoot>
    </div>
  );
}
