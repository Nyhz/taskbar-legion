import { useEffect, useRef, type ReactNode } from 'react';
import { registerSurface } from '@/platform/surfaces';
import { Sign } from './Sign';
import { TipTag } from './Tip';

// The window of the redesign: one nine-slice with brass fittings, the close key on its top-right corner, and —
// when given — bookmark TABS hanging outside its left edge (`tabs`) and / or its right one (`tabsRight`), and
// PLACES on its top edge. The tabs take no room: the window's box is its frame. It is presentation only: where it
// stands, its scale (KitRoot) and its open/close animation belong to the panel layer. Like the old PixelWindow
// it tags itself as an interactive surface (click-through hit test) and it never clips: tooltips leave it freely.
//
//   <Window id="hero" closeLabel={t('…')} onClose={close}
//           tabs={[{ key: 'gear', sign: 'tab_gear', label: 'Equipo', state: 'on' }, …]} onTab={setTab}
//           places={[{ key: 'h0', sign: 'crest_knight', text: '47', label: 'Knight · nivel 47', state: 'on' }, …]} onPlace={pick}>
//     <Head><Title>Alijo</Title><span className="note">52 / 60</span><div className="end">…chips…</div></Head>
//     …
//   </Window>

/** on = the lit one · idle = can be chosen · next = can be bought now · shut = closed (dimmed). */
export type TabState = 'on' | 'idle' | 'next' | 'shut';

export interface WindowTab {
  key: string;
  /** What the tab is, in words: read by assistive tech and shown as its one-word tooltip (unless `tip`). */
  label: string;
  /** Art stem of the tab's 16×16 sign… */
  sign?: string;
  /** …or a short text instead (a page number). */
  text?: string;
  state?: TabState;
  /** The sign is a small one (a lock): centre it. */
  small?: boolean;
  /** A full tooltip (`Tip`) instead of the one-word tag. */
  tip?: ReactNode;
}

/** on = the lit one · idle = can be chosen · free = an empty place that can be filled · shut = closed. */
export type PlaceState = 'on' | 'idle' | 'free' | 'shut';

export interface WindowPlace {
  key: string;
  label: string;
  /** Art stem of the place's sign (a class crest; a "+" for a free place; a lock for a closed one). */
  sign?: string;
  /** A number beside the sign (a level). */
  text?: string;
  state?: PlaceState;
  /** A dot on the corner: something waits there (unspent points). */
  dot?: boolean;
  small?: boolean;
  /** A full tooltip (`Tip`) instead of the one-word tag. It opens below the place. */
  tip?: ReactNode;
}

export interface WindowProps {
  /** Unique id of this window as an interactive surface. */
  id: string;
  /** What the close key says to assistive tech. */
  closeLabel: string;
  onClose: () => void;
  tabs?: readonly WindowTab[];
  /** Bookmarks on the RIGHT edge (the same pieces, facing the other way). `onTab` gets their keys too. */
  tabsRight?: readonly WindowTab[];
  onTab?: (key: string) => void;
  places?: readonly WindowPlace[];
  onPlace?: (key: string) => void;
  /** Width of the content in art pixels. Omitted ⇒ as wide as its content. */
  width?: number;
  className?: string;
  children: ReactNode;
}

export function Window({
  id,
  closeLabel,
  onClose,
  tabs,
  tabsRight,
  onTab,
  places,
  onPlace,
  width,
  className,
  children,
}: WindowProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (el === null) return registerSurface({ id, getBounds: () => null });
    return registerSurface({ id, getBounds: () => el.getBoundingClientRect() });
  }, [id]);

  const hasTabs = tabs !== undefined && tabs.length > 0;
  const hasPlaces = places !== undefined && places.length > 0;
  const cls = `tk-book${hasPlaces ? ' places' : ''}${className === undefined ? '' : ` ${className}`}`;

  return (
    <div ref={rootRef} className={cls} data-interactive="true">
      {hasPlaces && (
        <div className="tk-places">
          {places.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`tk-place has ${p.state ?? 'idle'}`}
              aria-label={p.label}
              aria-pressed={p.state === 'on'}
              onClick={() => onPlace?.(p.key)}
            >
              {p.sign !== undefined && (
                <Sign name={p.sign} className={p.small === true ? 'small' : undefined} />
              )}
              {p.text !== undefined && <b>{p.text}</b>}
              {p.dot === true && <u />}
              {p.tip ?? <TipTag side="below">{p.label}</TipTag>}
            </button>
          ))}
        </div>
      )}
      {hasTabs && <Bookmarks tabs={tabs} onTab={onTab} />}
      {tabsRight !== undefined && tabsRight.length > 0 && (
        <Bookmarks tabs={tabsRight} onTab={onTab} side="right" />
      )}
      <div className="tk-win">
        <button type="button" className="tk-close" aria-label={closeLabel} onClick={onClose}>
          <Sign name="ui_x" />
        </button>
        <div className="tk-in" style={width === undefined ? undefined : { width }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** The head row of a window: a `Title`, an optional `<span className="note">` beside it, and an optional
 *  `<div className="end">` for things at the far end (kept clear of the close key). */
export function Head({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="tk-head">{children}</div>;
}

/** A window's title: the blackletter face at twice its size, in gold. */
export function Title({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="tk-title">{children}</div>;
}

/** A column of bookmark tabs. Inside a `Window` it hangs outside the given edge; `solo` makes it a plain column
 *  the caller places itself (next to a window that is not a kit one). Tooltips open away from the window. */
export function Bookmarks({
  tabs,
  onTab,
  side = 'left',
  solo = false,
}: {
  tabs: readonly WindowTab[];
  onTab?: (key: string) => void;
  side?: 'left' | 'right';
  solo?: boolean;
}): React.JSX.Element {
  return (
    <div className={`tk-tabs${side === 'right' ? ' right' : ''}${solo ? ' solo' : ''}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`tk-tab has ${tab.state ?? 'idle'}${tab.small === true ? ' small' : ''}`}
          aria-label={tab.label}
          aria-pressed={tab.state === 'on'}
          onClick={() => onTab?.(tab.key)}
        >
          {tab.sign !== undefined ? <Sign name={tab.sign} /> : <span>{tab.text}</span>}
          {tab.tip ?? <TipTag side={side === 'right' ? 'right' : 'left'}>{tab.label}</TipTag>}
        </button>
      ))}
    </div>
  );
}
