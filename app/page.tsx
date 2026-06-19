"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import SettingsModal from "./SettingsModal";
import type {
  WupiAgentEvent,
  WupiAssistantMessage,
  WupiMessage,
  WupiModelInfo,
  WupiProviderInfo,
  WupiSessionState,
} from "./types";

function userText(m: WupiMessage): string {
  if (m.role !== "user") return "";
  const c = (m as { content: string | unknown[] }).content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .filter((b): b is { type: "text"; text: string } => (b as { type: string }).type === "text")
      .map((b) => b.text)
      .join("");
  }
  return "";
}

function assistantBlocks(m: WupiAssistantMessage) {
  return m.content.map((b, i) => {
    if (b.type === "text") {
      return (
        <div key={i} className="whitespace-pre-wrap break-words">
          {b.text}
        </div>
      );
    }
    if (b.type === "thinking") {
      return (
        <details key={i} className="my-1 rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 dark:border-zinc-700">
          <summary className="cursor-pointer">thinking</summary>
          <div className="mt-1 whitespace-pre-wrap">{b.thinking}</div>
        </details>
      );
    }
    if (b.type === "toolCall") {
      return (
        <div key={i} className="my-1 rounded bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          ⟶ {b.name}({Object.keys(b.arguments).length > 0 ? JSON.stringify(b.arguments) : ""})
        </div>
      );
    }
    return null;
  });
}

function MessageView({ m }: { m: WupiMessage }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          {userText(m)}
        </div>
      </div>
    );
  }
  if (m.role === "assistant") {
    const am = m as WupiAssistantMessage;
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-2 text-sm dark:bg-zinc-800">
          {am.errorMessage ? (
            <div className="text-red-600 dark:text-red-400">Error: {am.errorMessage}</div>
          ) : null}
          {assistantBlocks(am)}
          {am.usage ? (
            <div className="mt-1 text-[10px] text-zinc-400">
              {am.provider}/{am.model} · in {am.usage.input} / out {am.usage.output}
            </div>
          ) : null}
        </div>
      </div>
    );
  }
  if (m.role === "toolResult") {
    const tr = m as {
      toolName: string;
      content: { type: string; text?: string }[];
      isError: boolean;
    };
    const text = tr.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    return (
      <div className="flex justify-start">
        <div
          className={`max-w-[80%] rounded-lg px-3 py-1 font-mono text-xs ${
            tr.isError
              ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
              : "bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
          }`}
        >
          <div className="mb-0.5 font-sans font-medium">
            {tr.isError ? "✕ " : "✓ "}
            {tr.toolName}
          </div>
          {text ? (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words">{text}</pre>
          ) : null}
        </div>
      </div>
    );
  }
  return null;
}

export default function Home() {
  const [models, setModels] = useState<WupiModelInfo[]>([]);
  const [providers, setProviders] = useState<WupiProviderInfo[]>([]);
  const [state, setState] = useState<WupiSessionState | null>(null);
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [streamingThinking, setStreamingThinking] = useState("");
  const [activeTools, setActiveTools] = useState<
    Record<string, { name: string; done: boolean; isError: boolean }>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const hasElectron = useSyncExternalStore(
    () => () => {},
    () => !!window.electronAPI,
    () => false
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) {
      return;
    }

    api.onAgentEvent((event: WupiAgentEvent) => {
      switch (event.type) {
        case "agent_start":
          setStreamingText("");
          setStreamingThinking("");
          setActiveTools({});
          setError(null);
          break;
        case "message_update": {
          const e = event as {
            assistantMessageEvent?: { type: string; delta?: string };
          };
          const sub = e.assistantMessageEvent;
          if (sub?.type === "text_delta" && sub.delta) {
            setStreamingText((prev) => prev + sub.delta);
          } else if (sub?.type === "thinking_delta" && sub.delta) {
            setStreamingThinking((prev) => prev + sub.delta);
          }
          break;
        }
        case "tool_execution_start": {
          const e = event as unknown as { toolCallId: string; toolName: string };
          setActiveTools((prev) => ({
            ...prev,
            [e.toolCallId]: { name: e.toolName, done: false, isError: false },
          }));
          break;
        }
        case "tool_execution_end": {
          const e = event as unknown as { toolCallId: string; toolName: string; isError: boolean };
          setActiveTools((prev) => ({
            ...prev,
            [e.toolCallId]: { name: e.toolName, done: true, isError: e.isError },
          }));
          break;
        }
      }
    });

    api.onAgentState((s) => {
      setState(s);
      setStreamingText("");
      setStreamingThinking("");
      setActiveTools({});
      setReady(true);
    });
    api.onAgentModels(setModels);
    api.onAgentProviders(setProviders);

    api.agentGetModels()
      .then((r) => {
        if (r) {
          setModels(r.models);
          setProviders(r.providers);
        }
      })
      .catch((e) => console.error("agentGetModels failed:", e));
    api.agentGetState()
      .then((s) => {
        if (s) setState(s);
        setReady(true);
      })
      .catch((e) => console.error("agentGetState failed:", e));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [state, streamingText, activeTools]);

  const isStreaming = state?.isStreaming ?? false;
  const hasModel = !!state?.model;
  const configuredModels = models.filter((m) => m.configured);

  async function send() {
    const text = input.trim();
    if (!text || isStreaming) return;
    if (!hasModel) {
      setError("Select a model first (top-right). If none available, add an API key in Settings.");
      return;
    }
    setInput("");
    setError(null);
    setStreamingText("");
    setStreamingThinking("");
    setActiveTools({});
    const optimistic: WupiMessage = {
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setState((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev
    );
    const res = await window.electronAPI.agentSend(text);
    if (!res.ok) {
      setError(res.error ?? "Failed to send");
      setState((prev) =>
        prev
          ? { ...prev, messages: prev.messages.filter((m) => m !== optimistic) }
          : prev
      );
    }
  }

  async function abort() {
    await window.electronAPI.agentAbort();
  }

  async function pickModel(provider: string, id: string) {
    const res = await window.electronAPI.agentSetModel(provider, id);
    if (!res.ok) setError(res.error ?? "Failed to set model");
  }

  function refreshAfterAuth() {
    fetchModels();
    window.electronAPI.agentGetState().then((s) => {
      if (s) setState(s);
    });
  }

  function fetchModels() {
    window.electronAPI
      .agentGetModels()
      .then((r) => {
        if (r) {
          setModels(r.models);
          setProviders(r.providers);
        }
      })
      .catch((e) => console.error("agentGetModels failed:", e));
  }

  const grouped = new Map<string, WupiModelInfo[]>();
  for (const m of models) {
    const arr = grouped.get(m.providerDisplayName) ?? [];
    arr.push(m);
    grouped.set(m.providerDisplayName, arr);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <div className="flex items-center gap-2 font-semibold">
          <span className="text-lg">🜂</span>
          <span>Wupi</span>
        </div>
        <div className="flex-1" />
        <select
          className="max-w-[280px] truncate rounded-lg border border-zinc-300 bg-transparent px-2 py-1 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
          value={state?.model ? `${state.model.provider}/${state.model.id}` : ""}
          onChange={(e) => {
            const [provider, ...rest] = e.target.value.split("/");
            pickModel(provider, rest.join("/"));
          }}
          disabled={isStreaming}
        >
          <option value="">{hasModel ? state?.model?.name : "Select a model…"}</option>
          {[...grouped.entries()].map(([providerName, ms]) => (
            <optgroup key={providerName} label={providerName}>
              {ms.map((m) => (
                <option key={`${m.provider}/${m.id}`} value={`${m.provider}/${m.id}`}>
                  {m.name} {m.configured ? "" : "(no key)"}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          className="rounded-lg border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          onClick={() => {
            fetchModels();
            setSettingsOpen(true);
          }}
        >
          Settings
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {!hasElectron ? (
          <div className="mx-auto mt-10 max-w-md text-center text-sm text-zinc-500">
            Wupi must run inside Electron. Start the app with <code>bun run dev</code>.
          </div>
        ) : null}

        {ready && !hasModel && hasElectron ? (
          <div className="mx-auto mt-6 max-w-md rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
            No model configured. Open <strong>Settings</strong> to add an API key for a provider
            (Anthropic, OpenAI, Google, …), then pick a model.
            {configuredModels.length === 0 ? null : null}
          </div>
        ) : null}

        {state?.messages.map((m, i) => (
          <MessageView key={i} m={m} />
        ))}

        {streamingThinking ? (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-zinc-200 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700">
              <details>
                <summary className="cursor-pointer">thinking…</summary>
                <div className="mt-1 whitespace-pre-wrap">{streamingThinking}</div>
              </details>
            </div>
          </div>
        ) : null}

        {Object.keys(activeTools).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(activeTools).map(([id, t]) => (
              <span
                key={id}
                className={`rounded-full px-2 py-0.5 text-xs font-mono ${
                  t.isError
                    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                    : t.done
                      ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                }`}
              >
                {t.done ? (t.isError ? "✕" : "✓") : "…"} {t.name}
              </span>
            ))}
          </div>
        ) : null}

        {streamingText ? (
          <div className="flex justify-start">
            <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-2 text-sm dark:bg-zinc-800">
              {streamingText}
              <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-zinc-400 align-middle" />
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mx-4 mb-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </div>
      ) : null}

      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 resize-none rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none placeholder-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
            rows={1}
            placeholder={hasModel ? "Message Wupi…" : "Configure a model to start chatting…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={!hasElectron}
          />
          {isStreaming ? (
            <button
              className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/40"
              onClick={abort}
            >
              Stop
            </button>
          ) : (
            <button
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
              onClick={send}
              disabled={!input.trim() || !hasModel || !hasElectron}
            >
              Send
            </button>
          )}
        </div>
      </div>

      {settingsOpen ? (
        <SettingsModal
          providers={providers}
          onClose={() => setSettingsOpen(false)}
          onChanged={refreshAfterAuth}
        />
      ) : null}
    </div>
  );
}
