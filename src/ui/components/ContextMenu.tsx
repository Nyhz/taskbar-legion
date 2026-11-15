import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { KitRoot, Menu, MenuRow } from '@/ui/kit';
import { kitZoomAt } from '@/ui/panels/items/kitZoom';
import '@/ui/panels/items/items.css';

// A tiny global right-click menu. Any component calls useContextMenu()(x, y, items) from an onContextMenu
// handler; a full-screen backdrop closes it on outside click. It is drawn with the interface kit (Menu) inside a
// KitRoot of its own — it is portaled to <body> — at the zoom of the kit panel under the pointer (kitZoom.ts), so
// a menu looks like part of the window it was opened from.

export interface MenuItem {
  label: string;
  /** Art stem of the row's sign (`hud_stash`). Preferred. */
  sign?: string;
  /** Old callers pass an emoji here; the known ones are mapped to a sign, the rest are dropped. */
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

// The emoji the old panels use → the sign that says the same.
const EMOJI_SIGN: Readonly<Record<string, string>> = {
  '🛡️': 'tab_gear', // equip
  '⬇️': 'bag_pack', // unequip → back to the bag
  '🎒': 'bag_pack', // send to the bag
  '🧰': 'hud_stash', // send to the stash
  '◆': 'ui_gem', // socket a gem
  '💾': 'opt_export', // save a preset
  '🗑️': 'opt_new', // clear a preset
};

function signOf(item: MenuItem): string | undefined {
  return item.sign ?? (item.icon === undefined ? undefined : EMOJI_SIGN[item.icon]);
}

type OpenFn = (x: number, y: number, items: MenuItem[]) => void;

const Ctx = createContext<OpenFn>(() => undefined);
export const useContextMenu = (): OpenFn => useContext(Ctx);

const EDGE = 4; // px kept clear of the viewport's edge

interface OpenMenu {
  x: number;
  y: number;
  zoom: number;
  items: MenuItem[];
}

export function ContextMenuProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const open = useCallback<OpenFn>((x, y, items) => {
    if (items.length > 0) setMenu({ x, y, zoom: kitZoomAt(x, y), items });
  }, []);
  const close = (): void => setMenu(null);

  // Keep the plate on screen: once laid out, pull it back inside the viewport.
  useLayoutEffect(() => {
    const plate = plateRef.current;
    if (menu === null || plate === null) return;
    const box = plate.getBoundingClientRect();
    const x = Math.max(EDGE, Math.min(menu.x, window.innerWidth - box.width - EDGE));
    const y = Math.max(EDGE, Math.min(menu.y, window.innerHeight - box.height - EDGE));
    if (x !== menu.x || y !== menu.y) setMenu({ ...menu, x, y });
  }, [menu]);

  return (
    <Ctx.Provider value={open}>
      {children}
      {menu !== null &&
        createPortal(
          <>
            <div
              className="tk-layer-back"
              onClick={close}
              onContextMenu={(e) => {
                e.preventDefault();
                close();
              }}
            />
            <div
              ref={plateRef}
              className="tk-layer-menu"
              style={{ left: menu.x, top: menu.y }}
              data-interactive="true"
            >
              <KitRoot zoom={menu.zoom}>
                <Menu>
                  {menu.items.map((it, i) => (
                    <MenuRow
                      key={i}
                      sign={signOf(it)}
                      disabled={it.disabled}
                      danger={it.danger}
                      onClick={() => {
                        it.onClick();
                        close();
                      }}
                    >
                      {it.label}
                    </MenuRow>
                  ))}
                </Menu>
              </KitRoot>
            </div>
          </>,
          document.body,
        )}
    </Ctx.Provider>
  );
}
