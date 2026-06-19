<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Wupi

Personal AI agent desktop app: Next.js 16 (App Router) UI in Electron 42, powered by `@earendil-works/pi-coding-agent`. Agent runtime lives in the Electron main process (not a remote server).

## Commands

```bash
bun run dev              # Next dev (:3000) + Electron concurrently
bun run dev:next         # Next dev only
bun run dev:electron     # compile main + preload (.cjs), then Electron via tsx
bun run build            # build:next → build:electron → electron-builder (output: release/)
tsc -p tsconfig.json     # typecheck Next app only (browser, noEmit)
tsc -p tsconfig.electron.json && tsc -p tsconfig.preload.json && node -e "require('fs').renameSync('electron-dist/preload.js','electron-dist/preload.cjs')"
                          # typecheck + compile Electron + preload
eslint .                 # flat config at eslint.config.mjs
```

No `lint`/`typecheck`/`test` scripts exist. No test infrastructure exists in the repo.

## Architecture: two runtimes, three tsconfigs

- `tsconfig.json` — Next app (`app/**`, `@/*` → repo root). Browser-only. `noEmit`.
- `tsconfig.electron.json` — Electron main process (`electron/**`, **excluding** `electron/preload.ts`). Outputs ESM to `electron-dist/`. Node-only.
- `tsconfig.preload.json` — only `electron/preload.ts`. Outputs CommonJS (`.js` → manually renamed to `.cjs`). Preload + sandbox require CJS.

**Hard boundary:** Node builtins (`fs`, `child_process`, `app`, `BrowserWindow`, `ipcMain`) are importable only in `electron/`. The renderer talks to the main process exclusively through `window.electronAPI` (typed in `global.d.ts`, implemented in `electron/preload.ts`). Keep `global.d.ts` in sync with `preload.ts`.

## Agent runtime: `electron/main.ts` (~470 lines)

Single file (no separate `agent.ts`) — avoids ESM relative import extension conflicts between tsx (dev) and tsc (prod).

- `AuthStorage.create(AUTH_PATH)` — credentials at `~/.wupi/auth.json`
- `ModelRegistry.create(authStorage, MODELS_PATH)` — 980+ models across 35 providers, loaded synchronously in constructor
- `SessionManager.inMemory()` — ephemeral, no persistence

Streaming events flow: SDK subscription → `eventSink` (set to `forwardEvent`) → `webContents.send("agent:event", ...)`. On `agent_end`, main also sends `agent:state`.

## Config directory: `~/.wupi/`

`auth.json` (keys/tokens), `.env` (loaded at startup, e.g. `ANTHROPIC_API_KEY=sk-...`), `models.json` (generated model registry).

## Streaming performance: must batch

**Never call `useState` per text_delta.** The LLM can emit hundreds of events/second. `page.tsx` dispatches events to `lib/streaming-store.ts` which buffers mutations in a ref and flushes to React at ~60fps via `requestAnimationFrame` + 50ms setTimeout fallback. Consumer components subscribe via `useSyncExternalStore` (`useStreamingSnapshot` / `useStreamingSelector`). Provide `getServerSnapshot` for SSR.

When the final state arrives from main (`agent:state`), call `resetStreamingStore()` to clear the buffer so the `StreamingBubble` disappears alongside the new `MessageBubble`.

## Input state: keep local in InputArea

`input` state lives inside `InputArea.tsx` (not in `page.tsx`). Keystrokes must not re-render `Home` or `ChatArea`. `ChatArea` is wrapped in `React.memo`. `MessageBubble` is `React.memo`ed.

## Renderer SSR safety

Pages are `"use client"` but `window.electronAPI` is undefined during SSR. Guard with `useSyncExternalStore` or `typeof window !== "undefined"`. Direct `window.electronAPI.foo()` in render crashes.

## Model IDs

IDs can contain slashes (e.g. `deepseek/deepseek-v4-flash`). UI stores as `provider/modelId`, splits with:
```ts
const [provider, ...rest] = value.split("/");
const modelId = rest.join("/");
```

## Tailwind v4

CSS-first config. No `tailwind.config.*`. `app/globals.css` uses `@import "tailwindcss"` + `@theme inline { ... }`. Do not create a JS/TS Tailwind config.

## Build pipeline

- `build:next`: `next build` (output: `standalone` in `next.config.ts`) → manually copy `.next/static` + `public/` into `.next/standalone/`
- `build:electron`: compile main (ESM) + preload (CJS, renamed to .cjs)
- `electron-builder` config inlined in `package.json` (`build` key). `.next/standalone/**` is `asarUnpack`ed.
- Outputs: `.next/`, `electron-dist/`, `dist/`, `release/` — gitignored.

## Reference docs

- `pi-docs-md/sdk.md` — core pi SDK usage
- `pi-docs-md/sdk/` — runnable example files (01-minimal.ts through 13-session-runtime.ts)
- `pi-docs-md/rpc.md` — RPC mode
- `pi-docs-md/json.md` — JSON-driven agent config

## OpenCode skills

- `pi-sdk-integration` — embedding pi SDK, auth, sessions, streaming
- `wupi-architecture` — Electron+Next two-process split, preload bridge
- `wupi-build-package` — build pipeline, electron-builder config, asset copy

## Conventions

- No comments in code unless explicitly asked.
- `next.config.ts` sets `output: "standalone"` + `reactStrictMode: true`.
