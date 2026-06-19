---
name: pi-sdk-integration
description: Use when embedding the pi coding agent (@earendil-works/pi-coding-agent) into Wupi, wiring up agent sessions, auth/API keys, session persistence, streaming events, or deciding between the in-process SDK vs RPC subprocess mode. Trigger on createAgentSession, AgentSession, SessionManager, AuthStorage, ModelRegistry, message_update, text_delta, streamingBehavior, steer, followUp, navigateTree, compact, or pi-docs-md references.
---

# pi SDK integration in Wupi

Wupi embeds `@earendil-works/pi-coding-agent` to provide the agent. **The local docs in `pi-docs-md/` (`sdk.md`, `rpc.md`, `json.md`) are the source of truth** — read the relevant one before writing integration code. The API is specific and differs from anything in your training data.

## Placement

The SDK is Node-only. Run it in the **Electron main process** (`electron/**`), never in the Next renderer. Expose agent actions to the UI through `ipcMain.handle` + `preload.ts` + `window.electronAPI` (see the `wupi-architecture` skill). The Next app is the view; agent state lives in main. Keeping the agent in main is what makes Wupi feel like an app rather than a server-side service.

## Install (not yet done)

```bash
bun add @earendil-works/pi-coding-agent @earendil-works/pi-ai
```

`@earendil-works/pi-ai` is needed for `getModel()`.

## Minimal session

```ts
import { AuthStorage, createAgentSession, ModelRegistry, SessionManager } from "@earendil-works/pi-coding-agent";

const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(), // or SessionManager.create(cwd) to persist
  authStorage,
  modelRegistry,
});

const unsub = session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    // event.assistantMessageEvent.delta is one streaming text chunk
  }
});

await session.prompt("Hello");
```

For a custom system prompt, tools, or skills/prompt-templates, pass a `DefaultResourceLoader` (see `pi-docs-md/sdk.md` → "ResourceLoader" and the options sections).

## Auth / API keys

Resolution order (handled by `AuthStorage`): runtime override (`setRuntimeApiKey`, not persisted) → `auth.json` on disk → env (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, …) → fallback resolver for custom providers in `models.json`.

- Defaults: `~/.pi/agent/auth.json` (credentials) and `~/.pi/agent/models.json` (custom models).
- For an app-private store, pass explicit paths: `AuthStorage.create("/path/auth.json")`, `ModelRegistry.create(authStorage, "/path/models.json")`. As a personal desktop app, Wupi likely wants its own auth file (e.g. under `app.getPath("userData")`) instead of sharing `~/.pi/agent/` with a CLI install.
- OAuth tokens are also stored in `auth.json`.

## Streaming gotchas

- `prompt()` during an active stream THROWS unless you pass `streamingBehavior`. Use `session.steer("...")` (delivered after the current assistant turn's tool calls), `session.followUp("...")` (delivered when the agent stops), or `prompt(text, { streamingBehavior: "steer" | "followUp" })`.
- Extension commands (e.g. `/foo`) run immediately even mid-stream; they cannot be queued via `steer`/`followUp`.
- `subscribe()` is bound to a SPECIFIC `AgentSession`. If you use the runtime API (`createAgentSessionRuntime`) and call `newSession()` / `switchSession()` / `fork()` / `importFromJsonl()`, `runtime.session` changes — you must unsubscribe, re-subscribe on the new session, and rebind extensions (`session.bindExtensions(...)`).

## Session persistence

- `SessionManager.inMemory()` — ephemeral, lost on quit.
- `SessionManager.create(cwd)` — persisted as `.pi` JSONL sessions; supports the tree / fork / clone API (`getTree()`, `fork(entryId)`, `branch(entryId)`, …).
- `SessionManager.continueRecent(cwd)` / `SessionManager.open(path)` for resume/open flows.
- Sessions are a tree (entries have `id`/`parentId`); forking/branching is in-place.

## Resource discovery (skills, prompts, AGENTS.md)

`DefaultResourceLoader` (used when you don't pass a custom loader) discovers:
- Project: `.pi/extensions/`, `.pi/skills/`, `.pi/prompts/`, `.agents/skills/` (walked from cwd up to the git root), and `AGENTS.md` (walked up from cwd).
- Global: `~/.pi/agent/{extensions,skills,prompts}/`, `~/.agents/skills/`, `~/.pi/agent/AGENTS.md`.

The repo's empty `.agents/` dir is the project-local home for **pi** skills (the agent Wupi embeds). That is a DIFFERENT convention from OpenCode dev skills, which live in `.opencode/skills/`. Don't confuse the two.

## In-process SDK vs RPC subprocess

- **Prefer the in-process SDK** (above) for Wupi — type-safe, same Node process, direct state access, no IPC framing.
- **RPC mode** (`pi --mode rpc` over stdin/stdout JSONL) is for cross-language or process-isolated integration. If you ever use it: split records on `\n` only. Node's `readline` is NOT protocol-compliant — it also splits on `U+2028`/`U+2029`, which are valid inside JSON strings. See `pi-docs-md/rpc.md`.
- **JSON mode** (`pi --mode json "prompt"`) is one-shot event streaming — see `pi-docs-md/json.md`.

## When to read which doc

- `pi-docs-md/sdk.md` — the primary reference: `createAgentSession`, all options (model, tools, custom tools, extensions, skills, context files, sessions, settings), the runtime API, run modes, full export list.
- `pi-docs-md/rpc.md` — every command, response, and event type. The event taxonomy here ALSO applies to the in-process SDK's `subscribe()` stream (e.g. `message_update` deltas, `tool_execution_*`, `queue_update`, `compaction_*`).
- `pi-docs-md/json.md` — compact reference for the event/message type unions.
