# Wupi

A personal AI agent desktop app — Next.js 16 UI in an Electron shell, powered by the [pi coding agent](https://github.com/earendil-works/pi-coding-agent) SDK. The agent runtime runs in the Electron main process (not a remote server).

## Features

- **Chat with 980+ models** across 35+ providers (Anthropic, OpenAI, Google, DeepSeek, Groq, OpenRouter, xAI, Mistral, GitHub Copilot, and more)
- **API key & OAuth auth** — configure credentials per provider via the settings panel or a `~/.wupi/.env` file
- **Searchable model picker** — filter models by name, provider, or ID
- **Streaming responses** — real-time token streaming batched to React at ~60fps
- **Markdown rendering** — messages rendered with full Markdown + image support
- **Thinking/tool-call visibility** — see the agent's internal reasoning and tool usage
- **Theme support** — light/dark mode toggle
- **Desktop native** — packaged with Electron 42 via electron-builder

## Prerequisites

- [Bun](https://bun.sh) 1.x
- Node.js 22+

## Development

```bash
bun run dev              # Next.js dev server + Electron concurrently
bun run dev:next         # Next.js dev server only (http://localhost:3000)
bun run dev:electron     # Compile & launch Electron only (requires :3000 running)
```

The dev workflow:
1. `bun run dev:next` — starts the Next.js dev server with Turbopack
2. `bun run dev:electron` — compiles the Electron main process + preload, then launches Electron pointing at `localhost:3000`

Or just `bun run dev` to run both together.

## Configuration

Credentials are stored in `~/.wupi/`:

| File | Purpose |
|------|---------|
| `auth.json` | Stored API keys and OAuth tokens |
| `.env` | Environment variables (loaded at startup, e.g. `ANTHROPIC_API_KEY=sk-...`) |
| `models.json` | Auto-generated model registry (980+ models) |

Open the Settings panel in-app to add API keys or start OAuth flows.

## Building for Production

```bash
bun run build
```

This runs:
1. `next build` — builds the Next.js app in `standalone` mode
2. Electron main + preload compilation
3. `electron-builder` — packages into `release/`

Output: `release/` directory with platform installer.

## Project Structure

```
├── app/                  # Next.js App Router pages & components
│   ├── page.tsx          # Main chat page
│   ├── layout.tsx        # Root layout
│   ├── SettingsModal.tsx # Provider configuration UI
│   └── types.ts          # Shared TypeScript types
├── components/
│   ├── chat/             # Chat area, message bubbles, input, markdown
│   ├── sidebar/          # Sidebar, model picker, conversation list, theme toggle
│   └── ui/               # shadcn/ui components (button, dialog, command, popover, etc.)
├── electron/
│   ├── main.ts           # Electron main process (agent runtime, IPC handlers)
│   └── preload.ts        # Preload bridge (window.electronAPI)
├── lib/
│   ├── streaming-store.ts # Batched streaming state management
│   └── utils.ts          # cn() utility
├── hooks/                # React hooks (use-mobile)
├── tsconfig.json         # Next.js TypeScript config (browser, noEmit)
├── tsconfig.electron.json # Electron main process TypeScript config (Node, ESM output)
└── tsconfig.preload.json  # Preload TypeScript config (CommonJS output)
```

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Desktop:** Electron 42
- **Language:** TypeScript 6
- **Styling:** Tailwind CSS v4 (CSS-first config), shadcn/ui
- **Agent SDK:** `@earendil-works/pi-coding-agent`
- **Package Manager:** Bun
