"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/sidebar/Sidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { InputArea } from "@/components/chat/InputArea";
import { AppLoader } from "@/components/loader/AppLoader";
import { DynamicSlogan } from "@/components/header/DynamicSlogan";
import SettingsModal from "./SettingsModal";
import type {
  WupiAgentEvent,
  WupiMessage,
  WupiModelInfo,
  WupiProviderInfo,
  WupiSessionState,
} from "./types";

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
  const [streamCount, setStreamCount] = useState(0);
  const hasElectron = useSyncExternalStore(
    () => () => {},
    () => !!window.electronAPI,
    () => false
  );
  const streamCountRef = useRef(streamCount);
  streamCountRef.current = streamCount;

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    api.onAgentEvent((event: WupiAgentEvent) => {
      switch (event.type) {
        case "agent_start":
          setStreamCount(1);
          setStreamingText("");
          setStreamingThinking("");
          setActiveTools({});
          setError(null);
          break;
        case "agent_end":
        case "agent_error":
          setStreamCount(0);
          break;
        case "message_update": {
          const e = event as { assistantMessageEvent?: { type: string; delta?: string } };
          const sub = e.assistantMessageEvent;
          if (sub?.type === "text_delta" && sub.delta) {
            setStreamingText((prev) => prev + sub.delta);
            setStreamCount((prev) => prev + 1);
          } else if (sub?.type === "thinking_delta" && sub.delta) {
            setStreamingThinking((prev) => prev + sub.delta);
            setStreamCount((prev) => prev + 1);
          } else if (sub?.type === "start") {
            setStreamCount((prev) => prev + 1);
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
      setStreamCount(0);
      setStreamingText("");
      setStreamingThinking("");
      setActiveTools({});
      setReady(true);
    });
    api.onAgentModels(setModels);
    api.onAgentProviders(setProviders);

    api
      .agentGetModels()
      .then((r) => {
        if (r) {
          setModels(r.models);
          setProviders(r.providers);
        }
      })
      .catch((e) => console.error("agentGetModels failed:", e));
    api
      .agentGetState()
      .then((s) => {
        if (s) {
          setState(s);
          setStreamCount(s.isStreaming ? 1 : 0);
        }
        setReady(true);
      })
      .catch((e) => console.error("agentGetState failed:", e));
  }, []);

  // Fallback: if no streaming activity for 3 seconds, assume done
  useEffect(() => {
    if (streamCount <= 0) return;
    const timer = setTimeout(() => setStreamCount(0), 3000);
    return () => clearTimeout(timer);
  }, [streamCount]);

  const isStreaming = streamCount > 0;
  const hasModel = !!state?.model;

  async function send() {
    const text = input.trim();
    if (!text || isStreaming) return;
    if (!hasModel) {
      setError("Select a model first. If none available, add an API key in Settings.");
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
    setStreamCount(0);
    setStreamingText("");
    setStreamingThinking("");
    setActiveTools({});
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

  const currentModelValue = state?.model
    ? `${state.model.provider}/${state.model.id}`
    : "";

  return (
    <>
      <AppSidebar
        models={models}
        currentModel={currentModelValue}
        onModelChange={pickModel}
        disabled={isStreaming}
        onSettingsClick={() => {
          fetchModels();
          setSettingsOpen(true);
        }}
      />

      <SidebarInset className="flex flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-2">
          <SidebarTrigger className="md:hidden" />
          <div className="hidden sm:flex items-center gap-2 font-semibold">
            <span className="text-lg">🜂</span>
            <span className="text-foreground">Wupi</span>
          </div>
          <Separator orientation="vertical" className="hidden sm:block h-5" />
          <div className="hidden sm:flex items-center">
            <DynamicSlogan />
          </div>
          <div className="flex-1" />
          <select
            className="max-w-[200px] truncate rounded-lg border border-input bg-background px-2 py-1 text-sm text-foreground"
            value={currentModelValue}
            onChange={(e) => {
              const [provider, ...rest] = e.target.value.split("/");
              pickModel(provider, rest.join("/"));
            }}
            disabled={isStreaming}
          >
            <option value="">
              {hasModel ? state?.model?.name : "Select a model…"}
            </option>
            {models
              .filter((m) => m.configured)
              .map((m) => (
                <option key={`${m.provider}/${m.id}`} value={`${m.provider}/${m.id}`}>
                  {m.name}
                </option>
              ))}
          </select>
        </header>

        <ChatArea
          state={state}
          streamingText={streamingText}
          streamingThinking={streamingThinking}
          activeTools={activeTools}
          ready={ready}
          hasModel={hasModel}
          hasElectron={hasElectron}
          error={error}
        />

        <InputArea
          isStreaming={isStreaming}
          hasModel={hasModel}
          hasElectron={hasElectron}
          input={input}
          onInputChange={setInput}
          onSend={send}
          onAbort={abort}
        />
      </SidebarInset>

      <AppLoader />

      {settingsOpen ? (
        <SettingsModal
          providers={providers}
          onClose={() => setSettingsOpen(false)}
          onChanged={refreshAfterAuth}
        />
      ) : null}
    </>
  );
}