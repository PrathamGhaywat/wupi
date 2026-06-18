<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Wupi

Personal AI agent desktop app: a Next.js 16 (App Router) UI embedded in Electron 42, powered by the `@earendil-works/pi-coding-agent` SDK. The goal is an OpenCode-like agent that feels like an app, not a server-side service — so the agent runtime lives in the Electron main process, not on a remote server.

## Stack

Next.js 16.2.9 · React 19 · Tailwind v4 · TypeScript 6 · Electron 42 · Bun (`bun.lock`) · ESLint 9 flat config.

## Commands

```bash
bun run dev        # Next dev (:3000) + Electron concurrently (Electron waits on :3000 via wait-on)
bun run dev:next   # Next dev only
bun run dev:electron
bun run build      # build:next -> build:electron -> electron-builder (output: release/)
bun run start      # built standalone Next + Electron
```

No `lint` / `typecheck` / `test` scripts are defined. Run these instead:
- Typecheck: `tsc -p tsconfig.json` (Next) **and** `tsc -p tsconfig.electron.json` (Electron) — both must pass.
- Lint: `eslint .` (flat config in `eslint.config.mjs`: `next/core-web-vitals` + `next/typescript`).

## Two TypeScript projects — do not mix

- `tsconfig.json` — Next app (`app/**`, root TS/TSX). `@/*` path alias → repo root. `noEmit`. Browser code.
- `tsconfig.electron.json` — Electron (`electron/**`). Emits to `electron-dist/`. `rootDir: electron`. Node code.

Node builtins and Electron APIs (`fs`, `child_process`, `app`, `BrowserWindow`, `ipcMain`) are importable ONLY in `electron/**`. The renderer bridge is `electron/preload.ts` → `window.electronAPI` (typed in `global.d.ts`). See the `wupi-architecture` skill for the full wiring.

## Electron + Next build

- `package.json` `main` = `electron-dist/main.js` (compiled output, NOT `electron/main.ts`).
- `next.config.ts` sets `output: "standalone"`. `build:next` runs `next build` THEN copies `.next/static` + `public/` into `.next/standalone/` — mandatory; the prod main process spawns `.next/standalone/server.js` and needs those assets. Don't run `next build` alone.
- In dev, Electron runs `electron/main.ts` via `tsx` and just loads `http://localhost:3000` (it does NOT spawn the Next server). In prod, it spawns `node .next/standalone/server.js` (port 3000) itself.
- `electron-builder` config is inlined in `package.json` (`build` key). `.next/standalone/**` is `asarUnpack`ed so node can spawn `server.js`. Output → `release/`.
- Outputs `dist/`, `release/`, `electron-dist/`, `.next/` are gitignored.

See the `wupi-build-package` skill for the full pipeline.

## Tailwind v4

No `tailwind.config.*` file. Config is CSS-first: `app/globals.css` uses `@import "tailwindcss"` + `@theme inline { ... }`. Do not create a JS/TS Tailwind config.

## pi SDK (`@earendil-works/pi-coding-agent`)

NOT yet installed — add with `bun add @earendil-works/pi-coding-agent @earendil-works/pi-ai`.

- The SDK is Node-only → run it in the **Electron main process**, never in the Next renderer.
- Local reference docs are the source of truth: `pi-docs-md/sdk.md`, `pi-docs-md/rpc.md`, `pi-docs-md/json.md`. Read the relevant one before integrating.
- See the `pi-sdk-integration` skill for the embedding pattern (auth, sessions, streaming).

## Conventions

- No comments in code unless explicitly requested.
- `CLAUDE.md` just contains `@AGENTS.md` — keep them in sync via this file.
- OpenCode dev skills live in `.opencode/skills/` (registered via `opencode.json`). The repo's `.agents/` dir is a separate convention: it's where the Wupi-embedded pi agent discovers project skills/extensions at runtime — don't put OpenCode skills there.
