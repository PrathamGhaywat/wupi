<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Wupi

Personal AI agent desktop app: Next.js 16 (App Router) UI in Electron 42, powered by `@earendil-works/pi-coding-agent`. Agent runtime lives in the Electron main process (not a remote server).

## Stack

Next.js 16.2.9 · React 19 · Tailwind v4 · TypeScript 6 · Electron 42 · Bun · ESLint 9 flat config.

## Commands

```bash
bun run dev              # Next dev (:3000) + Electron concurrently
bun run dev:next         # Next dev only
bun run dev:electron     # compiles main + preload (.cjs), then runs Electron via tsx
bun run build            # build:next -> build:electron -> electron-builder (output: release/)
tsc -p tsconfig.json     # typecheck Next (browser)
tsc -p tsconfig.electron.json && tsc -p tsconfig.preload.json && node -e "require('fs').renameSync('electron-dist/preload.js','electron-dist/preload.cjs')"
                          # typecheck + compile Electron + preload
eslint .                 # flat config in eslint.config.mjs: next/core-web-vitals + next/typescript
```

No `lint`/`typecheck`/`test` scripts exist — run the above manually.

## Two TypeScript projects — do not mix

- `tsconfig.json` — Next app (`app/**`, `@/*` path alias → repo root). `noEmit`. Browser-only.
- `tsconfig.electron.json` — Electron (`electron/**`, excluding `electron/preload.ts`). Emits ESM to `electron-dist/`. Node-only.
- `tsconfig.preload.json` — compiles only `electron/preload.ts` as CommonJS (`.js` → renamed to `.cjs`).

Electron APIs (`fs`, `child_process`, `app`, `BrowserWindow`, `ipcMain`) are importable ONLY in `electron/`. The renderer bridge is `electron/preload.ts` → `window.electronAPI` (typed in `global.d.ts`).

## Preload must be CommonJS

`package.json` has `"type": "module"`, so all `.js` files are treated as ESM. But **Electron preload scripts require CommonJS** — the sandboxed renderer doesn't support ESM. The preload is compiled separately by `tsconfig.preload.json` (`module: "commonjs"`) and renamed from `.js` to `.cjs` (`.cjs` forces CommonJS).

Both `dev:electron` and `build:electron` scripts do this: `tsc -p tsconfig.preload.json && rename preload.js → preload.cjs`.

## Agent runtime

All agent logic lives in `electron/main.ts` (~470 lines). Inlined (no separate `agent.ts` file) to avoid ESM relative import extension conflicts between tsx (dev) and tsc (prod). Key components:

- `AuthStorage.create(AUTH_PATH)` — persists credentials to `~/.wupi/auth.json`
- `ModelRegistry.create(authStorage, MODELS_PATH)` — 980+ built-in models across 35 providers, loaded synchronously in constructor
- `SessionManager.inMemory()` — conversation lost on restart (v1 simplification)
- `authStorage.login(providerId, callbacks)` — OAuth flows (device code for GitHub Copilot/OpenAI Codex, PKCE for Anthropic)

## Config directory: `~/.wupi/`

- `auth.json` — stored API keys and OAuth tokens
- `.env` — loaded at startup by `loadDotenv()`; set keys as `ANTHROPIC_API_KEY=sk-...`
- `models.json` — model registry (generated)

## IPC bridge

`electron/preload.ts` via `contextBridge.exposeInMainWorld("electronAPI", ...)`:

| Method | IPC channel | Purpose |
|---|---|---|
| `agentSend` | `agent:send` | Send prompt |
| `agentAbort` | `agent:abort` | Stop streaming |
| `agentSetModel` | `agent:setModel` | Select model (provider, modelId) |
| `agentGetModels` | `agent:getModels` | Returns `{models, providers}` |
| `authSetApiKey` | `auth:setApiKey` | Save API key |
| `authLogin` | `auth:login` | Start OAuth login (invoke returns on completion) |
| `authLoginAbort` | `auth:login:abort` | Cancel OAuth login |
| `authLoginRespond` | `auth:login:respond` | Reply to interactive OAuth prompt/select |
| `onAuthLoginEvent` | `auth:login:event` | OAuth step events (deviceCode, authUrl, prompt, select, progress) |
| `onAgentEvent` | `agent:event` | Raw AgentSessionEvent stream |
| `onAgentState` | `agent:state` | Snapshot pushed after agent_end |

The `Window.electronAPI` type contract is in `global.d.ts` — keep in sync with `preload.ts`.

## Renderer SSR safety

Pages are `"use client"` but must not access `window.electronAPI` during SSR. Use `useSyncExternalStore` or guard with `typeof window !== "undefined"`. Direct `window.electronAPI.foo()` in render crashes.

## Model IDs

IDs can contain slashes (e.g. `deepseek/deepseek-v4-flash`). UI stores as `provider/modelId` and splits with:
```ts
const [provider, ...rest] = value.split("/");
const modelId = rest.join("/");
```

## Tailwind v4

CSS-first config. No `tailwind.config.*` file. `app/globals.css` uses `@import "tailwindcss"` + `@theme inline { ... }`. Do not create a JS/TS Tailwind config.

## Build pipeline

- `build:next`: `next build` (output: `standalone`) → manually copy `.next/static` + `public/` into `.next/standalone/`
- `build:electron`: compile main (ESM) + preload (CJS, renamed to .cjs)
- `electron-builder` config inlined in `package.json` (`build` key). `.next/standalone/**` is `asarUnpack`ed.
- Outputs: `.next/`, `electron-dist/`, `dist/`, `release/` — all gitignored.

## pi SDK reference docs

- `pi-docs-md/sdk.md` — core SDK usage
- `pi-docs-md/sdk/` — runnable example files (01-minimal.ts through 13-session-runtime.ts)
- `pi-docs-md/rpc.md` — RPC mode (electron-to-child-process)
- `pi-docs-md/json.md` — JSON-driven agent config

## OpenCode skills (load when relevant)

- `pi-sdk-integration` — embedding pi SDK, auth, sessions, streaming
- `wupi-architecture` — Electron+Next two-process split, preload bridge
- `wupi-build-package` — build pipeline, electron-builder config, asset copy

## Conventions

- No comments in code unless explicitly asked.
- `CLAUDE.md` just contains `@AGENTS.md`.
- `./skills/` = Contains useful skills that can be loaded into the agent at runtime. 
- `./pi-docs-md/` = Markdown reference docs for the pi SDK and related concepts, generated from the original TypeScript source. Not meant to be edited directly. Also contains example files that can be referred to for usage patterns. (see ./pi-docs-md/sdk/ for runnable examples)
