import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PALETTE } from '@/styles/palette';

// A tiny global right-click menu. Any component calls useContextMenu()(x, y, items)
// from an onContextMenu handler; a full-screen backdrop closes it on outside click.

export interface MenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

type OpenFn = (x: number, y: number, items: MenuItem[]) => void;

const Ctx = createContext<OpenFn>(() => undefined);
export const useContextMenu = (): OpenFn => useContext(Ctx);

export function ContextMenuProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const open = useCallback<OpenFn>((x, y, items) => {
    if (items.length > 0) setMenu({ x, y, items });
  }, []);
  const close = (): void => setMenu(null);

  return (
    <Ctx.Provider value={open}>
      {children}
      {menu !== null &&
        createPortal(
          <>
            <div
              onClick={close}
              onContextMenu={(e) => { e.preventDefault(); close(); }}
              style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
            />
            <div
              style={{
                position: 'fixed',
                left: Math.min(menu.x, window.innerWidth - 170),
                top: Math.min(menu.y, window.innerHeight - 30 - menu.items.length * 24),
                zIndex: 10001,
                minWidth: 150,
                background: PALETTE.bgPanel,
                border: `2px solid ${PALETTE.ink}`,
                boxShadow: `0 0 0 1px ${PALETTE.goldDim}, 3px 3px 0 rgba(0,0,0,0.5)`,
                padding: 3,
                fontSize: 11,
              }}
            >
              {menu.items.map((it, i) => (
                <button
                  key={i}
                  disabled={it.disabled}
                  onClick={() => { it.onClick(); close(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left',
                    padding: '4px 6px', background: 'transparent', border: 'none',
                    color: it.disabled ? PALETTE.textMute : it.danger === true ? PALETTE.titleRedHi : PALETTE.textLight,
                    cursor: it.disabled ? 'default' : 'pointer',
                  }}
                  onMouseEnter={(e) => { if (!it.disabled) e.currentTarget.style.background = PALETTE.bgInset; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span>{it.icon}</span>
                  <span style={{ flex: 1 }}>{it.label}</span>
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </Ctx.Provider>
  );
}
