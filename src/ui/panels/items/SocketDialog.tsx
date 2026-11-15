import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { GemInstance } from '@/data/gems';
import { gemGrants } from '@/sim/gems';
import { statLabel, useT } from '@/i18n';
import { Head, KitRoot, Sign, Title, Window } from '@/ui/kit';
import { statGain } from './itemText';
import { kitZoomNear } from './kitZoom';
import './items.css';

// The shell of the two socket dialogs: a dimmed backdrop over everything with one kit window in the middle.
// It is portaled to <body> (a kit window's drop shadow would otherwise trap a fixed layer inside it) and carries
// its own KitRoot at the zoom of the open panels. A click on the backdrop closes it.

export function SocketDialog({
  id,
  title,
  width,
  onClose,
  children,
}: {
  id: string;
  title: string;
  width: number;
  onClose: () => void;
  children: ReactNode;
}): React.JSX.Element {
  const t = useT();
  const [zoom] = useState(() => kitZoomNear());
  return createPortal(
    <div className="tk-layer-dialog" onClick={onClose} data-interactive="true">
      <div onClick={(e) => e.stopPropagation()}>
        <KitRoot zoom={zoom}>
          <Window id={id} closeLabel={t('items.close')} onClose={onClose} width={width}>
            <Head>
              <Title>{title}</Title>
            </Head>
            {children}
          </Window>
        </KitRoot>
      </div>
    </div>,
    document.body,
  );
}

/** What a gem grants once set (the same in any socket): one line per stat. */
export function GemGrants({ gem }: { gem: GemInstance }): React.JSX.Element {
  return (
    <>
      {gemGrants(gem).map((grant) => (
        <div key={grant.key} className="tk-socket-row">
          <Sign name={`stat_${grant.key}`} />
          <b>{statGain(grant.key, grant.value)}</b>
          <span>{statLabel(grant.key)}</span>
        </div>
      ))}
    </>
  );
}
