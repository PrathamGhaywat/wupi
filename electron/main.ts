import { app, BrowserWindow, ipcMain, shell } from "electron";
import os from "os";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { spawn, ChildProcess } from "child_process";
import isDev from "electron-is-dev";
import {
  AuthStorage,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  createAgentSession,
  type AgentSession,
  type AgentSessionEvent,
  type AuthStatus,
} from "@earendil-works/pi-coding-agent";
import type { Api, Model } from "@earendil-works/pi-ai";

const appPath = app.getAppPath();
const basePath = appPath.endsWith(".asar")
  ? appPath.replace(".asar", ".asar.unpacked")
  : fs.existsSync(path.join(appPath, ".next"))
    ? appPath
    : path.dirname(appPath);

const WUPI_DIR = path.join(os.homedir(), ".wupi");
const AUTH_PATH = path.join(WUPI_DIR, "auth.json");
const MODELS_PATH = path.join(WUPI_DIR, "models.json");

let authStorage: AuthStorage;
let modelRegistry: ModelRegistry;
let settingsManager: SettingsManager;
let session: AgentSession | null = null;
let sessionPromise: Promise<AgentSession> | null = null;
let unsubscribe: (() => void) | null = null;

type EventSink = (event: AgentSessionEvent) => void;
let eventSink: EventSink | null = null;

function setEventSink(sink: EventSink | null): void {
  eventSink = sink;
}

function loadDotenv(): void {
  const dotenvPath = path.join(WUPI_DIR, ".env");
  try {
    const text = fs.readFileSync(dotenvPath, "utf-8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim();
      if (k && !process.env[k]) process.env[k] = v;
    }
  } catch {
    // File doesn't exist or unreadable — no dotenv, that's fine.
  }
}

function initAgent(): void {
  fs.mkdirSync(WUPI_DIR, { recursive: true });
  loadDotenv();
  authStorage = AuthStorage.create(AUTH_PATH);
  modelRegistry = ModelRegistry.create(authStorage, MODELS_PATH);
  settingsManager = SettingsManager.create(os.homedir(), WUPI_DIR);
}

async function ensureSession(sessionManager?: SessionManager): Promise<AgentSession> {
  if (session) return session;
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    const { session: s } = await createAgentSession({
      cwd: os.homedir(),
      agentDir: WUPI_DIR,
      authStorage,
      modelRegistry,
      settingsManager,
      sessionManager: sessionManager ?? SessionManager.create(os.homedir(), path.join(WUPI_DIR, "sessions")),
    });
    session = s;
    unsubscribe = s.subscribe((event) => {
      eventSink?.(event);
    });
    return s;
  })();
  try {
    return await sessionPromise;
  } finally {
    sessionPromise = null;
  }
}

interface ModelInfo {
  provider: string;
  providerDisplayName: string;
  id: string;
  name: string;
  reasoning: boolean;
  contextWindow: number;
  maxTokens: number;
  input: ("text" | "image")[];
  configured: boolean;
}

interface ProviderInfo {
  id: string;
  displayName: string;
  configured: boolean;
  status: AuthStatus;
  modelCount: number;
}

function getProviders(): ProviderInfo[] {
  const all = modelRegistry.getAll();
  const byProvider = new Map<string, Model<Api>[]>();
  for (const m of all) {
    const arr = byProvider.get(m.provider) ?? [];
    arr.push(m);
    byProvider.set(m.provider, arr);
  }
  const providers: ProviderInfo[] = [];
  for (const [id, models] of byProvider) {
    const status = modelRegistry.getProviderAuthStatus(id);
    providers.push({
      id,
      displayName: modelRegistry.getProviderDisplayName(id),
      configured: status.configured,
      status,
      modelCount: models.length,
    });
  }
  return providers.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function getModels(): ModelInfo[] {
  const all = modelRegistry.getAll();
  return all
    .map((m) => ({
      provider: m.provider,
      providerDisplayName: modelRegistry.getProviderDisplayName(m.provider),
      id: m.id,
      name: m.name,
      reasoning: m.reasoning,
      contextWindow: m.contextWindow,
      maxTokens: m.maxTokens,
      input: m.input,
      configured: modelRegistry.hasConfiguredAuth(m),
    }))
    .sort((a, b) => {
      const c = a.providerDisplayName.localeCompare(b.providerDisplayName);
      return c !== 0 ? c : a.name.localeCompare(b.name);
    });
}

interface SessionState {
  isStreaming: boolean;
  model: ModelInfo | null;
  thinkingLevel: string;
  sessionId: string;
  messages: unknown[];
}

async function getSessionState(): Promise<SessionState | null> {
  if (!session) return null;
  const m = session.model;
  return {
    isStreaming: session.isStreaming,
    model: m
      ? {
          provider: m.provider,
          providerDisplayName: modelRegistry.getProviderDisplayName(m.provider),
          id: m.id,
          name: m.name,
          reasoning: m.reasoning,
          contextWindow: m.contextWindow,
          maxTokens: m.maxTokens,
          input: m.input,
          configured: true,
        }
      : null,
    thinkingLevel: session.thinkingLevel,
    sessionId: session.sessionId,
    messages: session.messages as unknown[],
  };
}

function setApiKey(provider: string, key: string): void {
  authStorage.set(provider, { type: "api_key", key });
}

function removeApiKey(provider: string): void {
  authStorage.remove(provider);
}

async function selectModel(provider: string, modelId: string): Promise<void> {
  const s = await ensureSession();
  const m = modelRegistry.find(provider, modelId);
  if (!m) throw new Error(`Model not found: ${provider}/${modelId}`);
  await s.setModel(m);
}

async function sendPrompt(text: string): Promise<void> {
  const s = await ensureSession();
  if (s.isStreaming) throw new Error("Agent is already streaming");
  await s.prompt(text);
}

async function abortPrompt(): Promise<void> {
  if (!session) return;
  await session.abort();
}

function disposeAgent(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (session) {
    session.dispose();
    session = null;
  }
  sessionPromise = null;
}

let nextProcess: ChildProcess | null;
let mainWindow: BrowserWindow | null = null;

function startNext() {
  const serverPath = path.join(basePath, ".next", "standalone", "server.js");

  nextProcess = spawn("node", [serverPath], {
    env: { ...process.env, PORT: "3000" },
    stdio: "inherit",
    detached: true,
  });

  nextProcess.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") nextProcess = null;
  });
}

function send(channel: string, data: unknown): void {
  mainWindow?.webContents.send(channel, data);
}

function forwardEvent(event: unknown): void {
  send("agent:event", event);
  const e = event as { type: string };
  if (e.type === "agent_end") {
    getSessionState()
      .then((state) => {
        if (state) send("agent:state", state);
      })
      .catch(() => {});
  }
}

function pushModels(): void {
  send("agent:models", getModels());
  send("agent:providers", getProviders());
}

async function pushState(): Promise<void> {
  const state = await getSessionState();
  if (state) send("agent:state", state);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPreloadPath(): string {
  const p = isDev
    ? path.join(__dirname, "..", "electron-dist", "preload.cjs")
    : path.join(__dirname, "preload.cjs");
  if (!fs.existsSync(p)) {
    console.error("Preload script not found at:", p, "(isDev:", isDev, ")");
  }
  return p;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL("http://localhost:3000");

  mainWindow.webContents.on("did-finish-load", async () => {
    setEventSink(forwardEvent);
    pushModels();
    setTimeout(pushModels, 1500);
    try {
      const cwd = os.homedir();
      await ensureSession(SessionManager.continueRecent(cwd, path.join(WUPI_DIR, "sessions")));
    } catch (err) {
      console.error("Failed to init session:", err);
    }
    await pushState();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function registerIpc(): void {
  ipcMain.handle("agent:send", async (_e, text: string) => {
    try {
      await sendPrompt(text);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle("agent:abort", async () => {
    await abortPrompt();
    return { ok: true };
  });

  ipcMain.handle("agent:setModel", async (_e, provider: string, modelId: string) => {
    try {
      await selectModel(provider, modelId);
      await pushState();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle("agent:getState", async () => {
    return getSessionState();
  });

  ipcMain.handle("agent:getModels", async () => {
    return { models: getModels(), providers: getProviders() };
  });

  ipcMain.handle("auth:setApiKey", async (_e, provider: string, key: string) => {
    setApiKey(provider, key);
    pushModels();
    await pushState();
    return { ok: true };
  });

  ipcMain.handle("auth:remove", async (_e, provider: string) => {
    removeApiKey(provider);
    pushModels();
    await pushState();
    return { ok: true };
  });

  const loginControllers = new Map<string, AbortController>();
  const pendingResponses = new Map<
    string,
    { resolve: (v: string | undefined) => void }
  >();
  let responseIdCounter = 0;

  ipcMain.handle("auth:login", async (event, providerId: string) => {
    const ac = new AbortController();
    loginControllers.set(providerId, ac);
    try {
      await authStorage.login(providerId, {
        signal: ac.signal,
        onAuth: (info) => {
          shell.openExternal(info.url);
          event.sender.send("auth:login:event", { type: "authUrl", ...info });
        },
        onDeviceCode: (info) => {
          shell.openExternal(info.verificationUri);
          event.sender.send("auth:login:event", { type: "deviceCode", ...info });
        },
        onPrompt: async (prompt) => {
          const id = String(++responseIdCounter);
          const promise = new Promise<string | undefined>((resolve) => {
            pendingResponses.set(id, { resolve });
          });
          event.sender.send("auth:login:event", {
            type: "prompt",
            id,
            ...prompt,
          });
          return (await promise) ?? "";
        },
        onSelect: async (prompt) => {
          const id = String(++responseIdCounter);
          const promise = new Promise<string | undefined>((resolve) => {
            pendingResponses.set(id, { resolve });
          });
          event.sender.send("auth:login:event", {
            type: "select",
            id,
            ...prompt,
          });
          return promise;
        },
        onManualCodeInput: async () => {
          const id = String(++responseIdCounter);
          const promise = new Promise<string>((resolve) => {
            pendingResponses.set(id, {
              resolve: (v) => resolve(v ?? ""),
            });
          });
          event.sender.send("auth:login:event", { type: "manualCode", id });
          return promise;
        },
        onProgress: (message) => {
          event.sender.send("auth:login:event", { type: "progress", message });
        },
      });
      pushModels();
      await pushState();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      loginControllers.delete(providerId);
    }
  });

  ipcMain.handle("auth:login:abort", async (_e, providerId: string) => {
    loginControllers.get(providerId)?.abort();
    loginControllers.delete(providerId);
    return { ok: true };
  });

  ipcMain.handle(
    "auth:login:respond",
    async (_e, responseId: string, value: string | undefined) => {
      const p = pendingResponses.get(responseId);
      if (p) {
        pendingResponses.delete(responseId);
        p.resolve(value);
      }
      return { ok: true };
    }
  );

  ipcMain.handle("config:getDir", () => WUPI_DIR);
}

app.whenReady().then(() => {
  initAgent();
  registerIpc();
  if (!isDev) {
    startNext();
  }
  createWindow();
});

app.on("window-all-closed", () => {
  disposeAgent();
  if (nextProcess && nextProcess.pid) {
    process.kill(-nextProcess.pid);
  }
  app.quit();
});
