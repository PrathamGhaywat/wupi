---
name: wupi-architecture
description: Use when adding or changing Electron main process, preload bridge, or Next.js app code in the Wupi Next+Electron app. Covers the two-process split, the two tsconfig projects, where Node code vs browser code goes, and how the standalone Next server is spawned in prod. Trigger on files under electron/, app/, global.d.ts, tsconfig.electron.json, or preload/window.electronAPI work.
---

# Wupi architecture

Wupi is a Next.js 16 (App Router) app embedded in Electron 42. Two runtimes, two tsconfig projects, one IPC bridge.

## Process split

| Concern | Lives in | tsconfig |
|---|---|---|
| UI / React / pages | `app/**` (Next App Router) + root TS/TSX | `tsconfig.json` — `@/*` → repo root, `noEmit`, browser libs (`dom`) |
| Electron main + preload | `electron/**` | `tsconfig.electron.json` — emits to `electron-dist/`, `rootDir: electron`, target ES2022, Node |

Hard rules:
- Node builtins and Electron APIs (`fs`, `path`, `child_process`, `app`, `BrowserWindow`, `ipcMain`, `contextBridge`) are importable ONLY in `electron/**`. They compile under `tsconfig.electron.json`.
- `app/**` is browser/renderer code. Never import Node builtins or Electron there — it runs in the Chromium renderer.
- These two projects are type-checked separately. A Node import that slips into `app/**` will pass `tsc -p tsconfig.electron.json` but fail `tsc -p tsconfig.json`. Always run both.

## The IPC bridge

The renderer cannot touch Node/Electron directly. The bridge is:

1. `electron/main.ts` registers handlers: `ipcMain.handle("ping", ...)`.
2. `electron/preload.ts` exposes them to the renderer via `contextBridge.exposeInMainWorld("electronAPI", { ping: () => ipcRenderer.invoke("ping") })`.
3. `global.d.ts` declares the type: `interface Window { electronAPI: { ping: () => Promise<string> } }`.

When adding a new main-process capability, update all three. The `window.electronAPI` surface in `global.d.ts` is the contract — keep it in sync with `preload.ts`.

## Dev flow

`bun run dev` runs `next dev` (port 3000) and `electron -r tsx/cjs electron/main.ts` concurrently. Electron uses `wait-on http://localhost:3000` before launching. In dev, Electron does NOT spawn the Next server — it expects it already running and just `loadURL("http://localhost:3000")`. The `tsx` loader runs `electron/main.ts` directly from source (no compile step in dev).

## Prod flow

`next.config.ts` sets `output: "standalone"`, so `next build` produces `.next/standalone/` (a self-contained server). `build:next` then copies `.next/static` and `public/` into `.next/standalone/` — required, the spawned server needs them.

In prod, `electron/main.ts` `spawn`s `node .next/standalone/server.js` with `PORT=3000` and `detached: true` before creating the window. `window-all-closed` kills the Next process group via the negative PID (`process.kill(-nextProcess.pid)`). This is why the Next server must be `detached`.

## Path resolution gotcha (prod vs dev)

`electron/main.ts` computes `basePath` three ways:
- asar-packed prod: rewrite `app.getAppPath()`'s trailing `.asar` → `.asar.unpacked` (so node can read real files).
- dev (next to a `.next` dir): use `app.getAppPath()` directly.
- dev fallback: step up one dir (dev `getAppPath()` points at `electron/`, so go up to project root).

Don't hardcode the path to `.next/standalone/server.js` — reuse/extend this `basePath` logic.

## Entry point

`package.json` `main` = `electron-dist/main.js` (the COMPILED output), not `electron/main.ts`. The TS source only runs in dev via the `tsx` loader; in prod Electron loads the compiled JS.
