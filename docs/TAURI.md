# TAURI.md — Desktop wrap (transparent always-on-top overlay → Windows `.exe`)

> Branch: `feat/tauri-desktop`. This plan turns the browser game into a **Tauri v2** desktop app:
> a **borderless, transparent, always-on-top** strip docked at the bottom of the screen, draggable
> from the GameStrip, with saves on the **real filesystem**. First shippable artifact: a Windows `.exe`.
>
> **This intentionally supersedes CLAUDE.md golden rule #5 and SPEC §0.5** (which deferred
> transparency / click-through to "v1.5"). We are now building v1.5's overlay. (CLAUDE.md rule #5
> has been updated to point here.)

---

## STATUS — implemented (2026-06-05, `feat/tauri-desktop`)

The whole pipeline is built; the macOS `.app` builds clean. Runtime polish (transparency / click-through
feel) is verified by launching the `.app`; the Windows `.exe` is verified from CI.

**Done:**
- `src-tauri/` scaffolded (Tauri v2). Identifier `dev.nyhz.taskbar-legion`; fs plugin registered.
- Window: transparent, `decorations:false`, `alwaysOnTop`, `skipTaskbar`, `shadow:false`, `macOSPrivateApi`.
- Transparency + click-through: `src/platform/desktopOverlay.ts` — a **fixed-footprint, non-maximized**
  (`1280×1040` logical) window, NOT a full-monitor sheet. `setIgnoreCursorEvents` toggled by polling
  `cursorPosition()` + `document.elementFromPoint`; the App marks structural layers `pointer-events:none`
  so only the strip + open panels capture the cursor and the empty transparent region clicks through.
- Drag: whole strip, plain mouse, no modifier — past a movement threshold hands the gesture to the OS via
  `Window.startDragging()`, so the **actual window** moves and travels FREELY across monitors (DPI-correct).
  In-game taps survive the threshold. Window position persisted (`taskbar-legion.overlay.winpos.v1`, physical
  outer-position) and, on boot, restored ONLY if its strip anchor still lands on a connected monitor
  (`availableMonitors()`) — otherwise it docks bottom-centre of the current monitor (anti-off-screen-brick).
- Quit: power button (top-right of the Party header) → "Yes / Back" modal → save + close (`platform/quit.ts`).
- Saves → filesystem: `src/platform/storage.ts` (`save.json` in the OS app-data dir under Tauri, IndexedDB
  on web/tests). `saveManager.ts` refactored onto it; frontier guard stays on localStorage; close-hook flush.
- App icon: Knight idle frame over the strip backdrop — `scripts/gen-icon.mjs` (`npm run gen:icon`).
- CI: `.github/workflows/desktop-build.yml` — **Linux + Windows + macOS** on native runners via
  `tauri-action`; a `v*` tag publishes all three to one GitHub Release.

**Build & run:**
- Dev (live reload, transparent mac window): `npm run tauri:dev`
- Local mac bundle: `npm run tauri:build` → `src-tauri/target/release/bundle/{macos,dmg}/`
- **Cross-platform Release** (Win `.exe`/`.msi`, macOS `.dmg`, Linux `.AppImage`/`.deb`): push a `v*` tag —
  `git tag v0.1.0 && git push origin v0.1.0` — and CI drafts a Release with all three attached. Or run
  "Desktop build" manually (`workflow_dispatch`) to get them as run Artifacts without a Release.
- Regenerate icons after art changes: `npm run gen:icon`.

**Still to verify at runtime (needs a human at the screen / a Windows box):** transparency edges, click-through
latency feel, drag feel, and that saves round-trip on Windows (different native paths than macOS — see §0/§6).

## Linux — known issues & fixes (from a v0.2.0 Arch/NVIDIA bug report, 2026-06-06)

A tester on CachyOS (Arch) / KDE Plasma 6 Wayland / NVIDIA proprietary found the Linux build unrunnable
out of the box. Four independent layers; the first two are fixed in-tree (land in 0.3.0), the third is
partially mitigated, the fourth is an upstream ecosystem limitation.

- **FIXED — tao panic: `setIgnoreCursorEvents` on a not-yet-shown window.** The window boots `visible:false`,
  but `startClickThrough()` → `setIgnoreCursorEvents(true)` ran before `win.show()`. On GTK an unrealized
  window's `GdkWindow` is `None`, and tao `unwrap()`s it → SIGABRT. Fix: `desktopOverlay.ts` now `win.show()`s
  BEFORE `startClickThrough()` **on Linux only** (`isLinuxWebview()` via UA); macOS/Windows keep the reveal in
  `finally` to avoid the opaque first-paint flash.
- **FIXED — native Wayland is unsupported.** GDK aborts with "protocol error 71", and neither `setPosition()`
  (bottom dock) nor the `cursorPosition()` poll (click-through) work on Wayland. Fix: `src-tauri/src/lib.rs`
  pins `GDK_BACKEND=x11` (XWayland) at startup on Linux unless the user already set it. XWayland supports both.
- **PARTIAL — AppImage bundles Ubuntu's webkit2gtk, which aborts (SIGABRT) against non-Ubuntu system libs**
  (e.g. Arch), so no window maps. Added a **`.deb`** bundle target (links the host WebKit, works on
  Debian/Ubuntu without bundling). Arch/Fedora users still have no native package — the workaround is
  `--appimage-extract` + run `usr/bin/app` from OUTSIDE the tree so its RPATH stops resolving the bundled
  WebKit. A proper raw-binary / AUR path would need CI work + a non-Ubuntu runner to test.
- **UPSTREAM (not fixable in our code) — NVIDIA proprietary: WebGL canvas vs window transparency are mutually
  exclusive.** WebKitGTK's DMA-BUF path vs the NVIDIA driver: with transparency on, the Pixi (WebGL) strip
  never composites or freezes after one frame; disabling the DMA-BUF renderer makes the window opaque. A
  future **opaque, non-click-through fallback mode** (boot a normal window when transparency+WebGL can't
  coexist) is the only app-side mitigation — tracked as a possible feature, not yet built.

---

## 0. The one hard constraint: you build on macOS, you ship on Windows

Tauri compiles for the **host OS**. You cannot reliably cross-compile a Windows `.exe` from macOS
(WebView2 + MSVC linking make it impractical). Therefore:

- **Local dev (macOS):** `npm run tauri dev` runs a transparent macOS `.app` for fast iteration.
  Transparency on macOS requires `macOSPrivateApi: true` in `tauri.conf.json`.
- **Windows `.exe`:** produced by **GitHub Actions on a `windows-latest` runner** via the official
  `tauri-apps/tauri-action`. WebView2 is preinstalled on Win10/11, so the installer stays small.
- **Caveat:** transparency + always-on-top + click-through take *different* native code paths on macOS
  vs. Windows. Behavior MUST be verified on a real Windows build before calling it done — the macOS
  `.app` is a dev proxy, not proof.

If you have access to a Windows machine/VM, you can also build there directly with the same commands.

---

## 1. Current state (what the investigation found)

The codebase is well-prepared — web dependencies are isolated:

- **Persistence is 3 files.** `persistence/saveManager.ts` (main save → IndexedDB via `idb`),
  `persistence/frontierGuard.ts` (sync localStorage backstop = `{seed, maxClearedStage}`),
  `state/settingsShim.ts` (legacy localStorage UI settings — mostly superseded by `SaveV1.settings`).
- **Rendering is opaque by design.** `index.html` sets `background:#14121a` on `html/body`; `App.tsx`
  root div paints `PALETTE.bgDeep`; `GameStrip.ts` inits Pixi with `background:'#14121a'` (no alpha).
  The strip is a fixed logical **600×160** anchored bottom-center; Pixi `resizeTo: container`.
- **No drag today.** Panels are statically positioned; `PixelWindow` is pure chrome.
- **The click-through hook already exists.** `src/platform/surfaces.ts` is a registry of interactive
  regions (`listSurfaces()` → `{id, getBounds()}`); `PixelWindow` already registers each open panel
  (`data-interactive="true"`). It was built for exactly this. **Nothing consumes it yet** — we add the
  consumer that drives Tauri `setIgnoreCursorEvents`.
- **Browser globals in use:** `navigator.storage.persist()`, `location.reload()` (both feature-gated),
  `beforeunload` / `visibilitychange` save triggers, `window.innerWidth/Height` for tooltip clamping,
  `devicePixelRatio`. All survive in a Tauri webview; only persistence + the save-on-teardown story
  need rethinking.

---

## 2. Target architecture

```
                          ┌─────────────────────────────────────────────┐
   transparent window  →  │  (transparent — desktop shows through;        │   click-through here:
   full monitor width,    │   click passes to desktop via                 │   setIgnoreCursorEvents(true)
   bottom ~60% tall       │   per-frame hit-test of listSurfaces())       │
                          │                                               │
                          │            ┌───────────────┐                  │
   open panels  →         │            │  party / tech │  ← registered    │   click captured here
   (registered surfaces)  │            └───────────────┘     surface      │   setIgnoreCursorEvents(false)
                          │   ┌───────────────────────────────────────┐   │
   GameStrip  →           │   │  [====== the strip (drag handle) =====]│   │   drag window from here
   (always interactive)   │   └───────────────────────────────────────┘   │
                          └───────────────────────────────────────────────┘
                                     anchored to bottom of monitor
```

- **One big transparent window** (full monitor width × enough height for the tallest open panel),
  bottom-anchored. Everything transparent **except** the strip + open panels.
- **A `hitTest` consumer** polls `listSurfaces()` (+ the strip's own bounds) each animation frame and
  toggles `setIgnoreCursorEvents` so the transparent void clicks through to the desktop while the
  strip/panels stay interactive. This is the heart of "I only see the strip."
- **Saves on disk** via `@tauri-apps/plugin-fs` in the app-data dir, behind a platform abstraction so
  `npm run dev` (plain browser) and vitest still use IndexedDB/localStorage.

---

## 3. Key design decisions (resolved)

| Decision | Choice | Why |
|---|---|---|
| Tauri version | **v2** | Current; best plugin + transparency story. |
| Window chrome | `decorations:false`, `transparent:true`, `alwaysOnTop:true`, `skipTaskbar:true`, `resizable:false`, `shadow:false`, `minimizable/maximizable:false` | "No X, no toolbar, nothing but the strip." |
| Bottom anchor | Computed at boot from `currentMonitor()` → `setPosition`; recomputed on monitor/resolution change | Tauri has no declarative bottom-dock. |
| Drag | `data-tauri-drag-region` on the **StripHud** bar + a dedicated grip; NOT the Pixi canvas (it owns game taps like the portal) | Avoids fighting in-game pointer interactions. (Open Q — see §7.) |
| Click-through | New `hitTest` consumer of the existing `surfaces.ts` registry → `setIgnoreCursorEvents` | Registry already exists for this. |
| Main save | **Migrate to `save.json` on the filesystem** (app-data dir) | User directive; user-visible, backup-able, eviction-proof. |
| Frontier guard | **Stays in webview `localStorage`** even under Tauri | Its whole point is being *synchronous* before teardown; Tauri fs is async. localStorage still works in the webview, so keep the crash-safety invariant for free. (Belt-and-suspenders; main durability now comes from the fs save + close-hook.) |
| Save-on-exit | Add Tauri `onCloseRequested` → `await save` → close, plus keep the 30s autosave | An always-on-top window never fires `visibilitychange`; close-hook is the reliable flush. |
| Storage detection | Runtime: `isTauri()` from `@tauri-apps/api`; Tauri plugin imported **dynamically** so vitest/browser bundles don't break | Keeps `sim/` + tests untouched and the web build working. |

---

## 4. Phased execution

### Phase A — Toolchain & scaffold
- [x] Install Rust toolchain (`rustup`, stable) — **done** (`rustc 1.96`).
- [ ] Add dev deps: `@tauri-apps/cli`, and runtime `@tauri-apps/api`, `@tauri-apps/plugin-fs`.
- [ ] `npm run tauri init` → scaffold `src-tauri/` (Cargo.toml, `tauri.conf.json`, `build.rs`,
      `src/lib.rs`/`main.rs`, capabilities). Point `frontendDist` at Vite's `dist`, `devUrl` at the
      Vite dev server, `beforeDevCommand: "npm run dev"`, `beforeBuildCommand: "npm run build"`.
- [ ] Add npm scripts: `"tauri": "tauri"`, `"tauri:dev"`, `"tauri:build"`.
- [ ] Generate app icons (`npm run tauri icon <1024.png>`). **Need a source icon** — make a simple
      pixel-art placeholder (see §7).
- [ ] `.gitignore`: add `src-tauri/target`.
- **Check:** `npm run tauri dev` boots the *unmodified* opaque game in a desktop window.

### Phase B — Window: transparent, borderless, always-on-top, bottom-docked
- [ ] `tauri.conf.json` window config per §3 (transparent, decorations off, alwaysOnTop, skipTaskbar,
      `macOSPrivateApi: true`). Size: full monitor width × panel-headroom height.
- [ ] Boot positioning module (`src-tauri` side or JS via `@tauri-apps/api/window`): compute bottom-center
      from the active monitor; reposition on monitor change.
- [ ] Make the app transparent:
  - `index.html`: drop the opaque `html/body` background → `transparent`.
  - `App.tsx`: root container `background` → transparent (keep strip/panel backgrounds).
  - `GameStrip.ts`: Pixi `backgroundAlpha: 0` (this is the line golden rule #5 forbade for v1 — now intended).
- **Check (macOS):** only the strip + menus are visible; desktop shows through everywhere else.

### Phase C — Click-through (the overlay illusion)
- [ ] New `src/platform/hitTest.ts`: consume `listSurfaces()` + the strip canvas bounds; on `pointermove`
      / per frame, call `setIgnoreCursorEvents(true|false)` depending on whether the cursor is over any
      interactive surface. Tauri-only (no-op in browser).
- [ ] Register the **GameStrip canvas** as a surface (today only `PixelWindow` panels register).
- [ ] Wire it from `App.tsx` boot, Tauri-gated.
- **Check:** clicking empty transparent space clicks the desktop behind it; strip/panels still respond.

### Phase D — Drag the window from the strip
- [ ] Add `data-tauri-drag-region` to the StripHud bar + a visible grip affordance.
- [ ] Verify it doesn't swallow strip game-taps (portal/collect) or HUD buttons (`onpointerdown`
      `stopPropagation` on real controls). Resolve the canvas-vs-drag conflict (§7).
- **Check:** drag the window around the desktop by the strip; it stays always-on-top.

### Phase E — Persistence → filesystem
- [ ] `src/platform/storage.ts`: `StorageAdapter` interface (`readSave/writeSave/clearSave`).
  - `webStorageAdapter` = current IndexedDB path (extracted from `saveManager.ts`).
  - `tauriStorageAdapter` = `@tauri-apps/plugin-fs`, writes `save.json` to `appDataDir()`
    (dynamic import; Tauri-gated).
- [ ] Refactor `saveManager.ts` to call the adapter instead of `idb` directly. Keep `frontierGuard.ts`
      on localStorage (works in the webview; preserves the synchronous backstop).
- [ ] `resetGame` / `importSave`: clear the fs file (+ localStorage frontier) and reload. `location.reload()`
      works in the webview; keep it.
- [ ] `requestPersistentStorage()` → no-op under Tauri (fs is already durable); guard it.
- [ ] Tauri `onCloseRequested` → `await saveGame()` → allow close.
- [ ] fs capability/permissions: grant the app-data scope in `src-tauri/capabilities`.
- **Check:** play, quit, relaunch → progress restored from `save.json`. Export/import/reset still work.

### Phase F — CI: the Windows `.exe`
- [ ] `.github/workflows/release.yml` using `tauri-apps/tauri-action` on `windows-latest` (and optionally
      `macos-latest`). Caches Cargo. Uploads NSIS installer + `.exe` as artifacts / release assets.
- [ ] Document the manual local Windows build path as a fallback.
- **Check:** CI run produces a downloadable `.exe`; smoke-test on Windows (transparency, always-on-top,
      drag, save persistence all behave — they take different native paths than macOS).

### Phase G — Reconcile docs
- [ ] Update CLAUDE.md golden rule #5 / SPEC §0.5 note: transparency + click-through are now IN scope.
- [ ] Tick items here; record non-obvious decisions.

---

## 5. Files that change

| File | Change |
|---|---|
| `package.json` | Tauri dev/runtime deps + scripts |
| `src-tauri/**` | New: Cargo project, `tauri.conf.json`, capabilities, icons, Rust entrypoint |
| `index.html` | Transparent background |
| `src/app/App.tsx` | Transparent root; Tauri-gated boot (hit-test, close-hook) |
| `src/game/GameStrip.ts` | `backgroundAlpha: 0` |
| `src/platform/hitTest.ts` | New: click-through consumer |
| `src/platform/storage.ts` | New: storage adapter (web + tauri) |
| `src/persistence/saveManager.ts` | Use storage adapter; keep frontier on localStorage |
| `src/ui/hud/StripHud.tsx` | Drag-region + grip |
| `.github/workflows/release.yml` | New: Windows build CI |
| `.gitignore` | `src-tauri/target` |

**Untouched:** all of `sim/`, `data/`, the vitest suite (storage Tauri code is dynamically imported and
gated, so node tests keep using the web path). Golden rule #1 (sim purity) is preserved.

---

## 6. Risks

- **Windows ≠ macOS for the native bits.** Transparency, always-on-top, `setIgnoreCursorEvents`, and
  drag all behave differently. Treat the Windows CI build as the real acceptance test.
- **Click-through granularity.** Per-frame `setIgnoreCursorEvents` can feel laggy at edges; may need a
  small hysteresis/dilation around surface bounds. The Pixi strip is a single rect, so it's simple; the
  risk is tooltips/portals that escape registered bounds.
- **Drag vs. game taps on the canvas.** Resolved by making only the HUD a drag region — but confirm the
  strip still feels draggable enough (§7).
- **Frontier guard stays on localStorage.** If a future requirement is "zero webview storage," we'd need
  a synchronous-enough fs path; not worth it now.
- **Tall transparent window blocking the desktop** is the exact problem the hit-test solves — if Phase C
  regresses, the overlay becomes an invisible click-blocker. Phase C must land with Phase B.

## 7. Open questions (resolve during build, not blockers)

1. **Drag handle:** HUD bar only, or also empty strip canvas via a modifier (e.g., hold a key)? Default:
   HUD bar + grip; revisit if it feels cramped.
2. **App icon:** no logo exists. Default: generate a simple pixel-art placeholder now, polish later.
3. **Taskbar presence:** `skipTaskbar:true` means no taskbar entry at all → how does the user quit?
   Need an in-app **Quit** (Options popover) + maybe a tray icon. Decide in Phase B.
4. **Multi-monitor / resolution change:** reposition logic must handle it; scope a basic version first.
