---
name: wupi-build-package
description: Use when building, packaging, or releasing the Wupi desktop app, or when modifying build scripts, next.config.ts output, or the electron-builder config. Covers the build pipeline order, the mandatory standalone asset copy, where electron-builder config lives, asar unpacking, and output directories. Trigger on bun run build, build:next, build:electron, electron-builder, release/, electron-dist/, standalone output, or asarUnpack.
---

# Wupi build & package

## Pipeline

`bun run build` runs three steps in order (chained with `&&`):

1. **`build:next`** — `next build` (emits `.next/standalone/` because `next.config.ts` sets `output: "standalone"`), THEN copies `.next/static` → `.next/standalone/.next/static` and `public/` → `.next/standalone/public/` via inline `node -e` calls.
   - The copy is **mandatory**. The prod Electron main process spawns `.next/standalone/server.js`, which needs those two dirs to serve static assets and `public/`. Running `next build` alone produces a broken app.
2. **`build:electron`** — `tsc -p tsconfig.electron.json`, compiles `electron/**/*.ts` → `electron-dist/**/*.js`.
3. **`electron-builder`** — packages `electron-dist/**`, `.next/standalone/**`, and `package.json` into an asar. Output → `release/`.

## electron-builder config

Lives INLINE in `package.json` under the `build` key — there is no separate `electron-builder.yml`. Key facts:
- `appId: xyz.prathambuilds.wupi`
- `asar: true`, with **`.next/standalone/**` in `asarUnpack`** — node must `spawn` `server.js` from real files on disk; it cannot execute out of an asar archive. If you add other node-spawned assets, add them to `asarUnpack` too.
- `files`: `electron-dist/**/*.js`, `.next/standalone/**/*`, `package.json`.
- `directories.output: release`
- `extraMetadata.type: "module"` (matches the root `package.json` `"type": "module"`).
- Windows: `win.signAndEditExecutable: false` (no code signing is configured).

## Outputs (all gitignored)

- `.next/` — Next build output (including `standalone/`)
- `electron-dist/` — compiled Electron JS
- `release/` — electron-builder installers / unpacked app
- `dist/` — gitignored; not produced by the current pipeline

## Running a built bundle

- `bun run start` — runs `next start -p 3000` and `electron .` concurrently. `electron .` loads `package.json` `main` (`electron-dist/main.js`), which in non-dev mode spawns `.next/standalone/server.js` itself.
- For a true packaged run you don't need `start:next` — the Electron binary boots the Next server. `start` is for a quick local smoke of a built bundle before packaging.

## Dev (for contrast)

`bun run dev` runs `next dev` (:3000) and `electron -r tsx/cjs electron/main.ts` concurrently; Electron `wait-on`s :3000. In dev the main process does NOT spawn the Next server and does NOT use `electron-dist/` — `tsx` runs `electron/main.ts` from source. So a stale `electron-dist/` won't affect dev.

## Don't

- Don't run `next build` by itself and expect the app to work — the standalone asset copy in `build:next` is required.
- Don't add a `tailwind.config.*` — Tailwind v4 is CSS-first (`@import "tailwindcss"` + `@theme inline` in `app/globals.css`).
- Don't treat `electron/main.ts` as the runtime entry — the entry is the compiled `electron-dist/main.js` referenced by `package.json` `main`.
