"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/sidebar/Sidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { InputArea } from "@/components/chat/InputArea";
import { AppLoader } from "@/components/loader/AppLoader";
import { DynamicSlogan } from "@/components/header/DynamicSlogan";
import SettingsModal from "./SettingsModal";
import {
  dispatchStreamingEvent,
  resetStreamingStore,
  useStreamingSelector,
} from "@/lib/streaming-store";
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
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const hasElectron = useSyncExternalStore(
    () => () => {},
    () => !!window.electronAPI,
    () => false
  );
  const isStreaming = useStreamingSelector((s) => s.isStreaming);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    api.onAgentEvent((event: WupiAgentEvent) => {
      if (event.type === "agent_start") {
        setError(null);
      }
      dispatchStreamingEvent(event);
    });

    api.onAgentState((s) => {
      setState(s);
      resetStreamingStore();
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
        }
        setReady(true);
      })
      .catch((e) => console.error("agentGetState failed:", e));
  }, []);

  const hasModel = !!state?.model;

  async function send(text: string) {
    if (!text.trim() || isStreaming) return;
    if (!hasModel) {
      setError("Select a model first. If none available, add an API key in Settings.");
      return;
    }
    setError(null);
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
    resetStreamingStore();
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

  const configuredModels = useMemo(
    () => models.filter((m) => m.configured),
    [models]
  );

  const currentModelValue = state?.model
    ? `${state.model.provider}/${state.model.id}`
    : "";

  return (
    <>
      <AppSidebar
        models={configuredModels}
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
            className="max-w-[240px] truncate rounded-lg border border-input bg-background px-2 py-1 text-sm text-foreground"
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
            {configuredModels.map((m) => (
                <option key={`${m.provider}/${m.id}`} value={`${m.provider}/${m.id}`}>
                  [{m.providerDisplayName}] {m.name}
                </option>
              ))}
          </select>
        </header>

        <ChatArea
          state={state}
          ready={ready}
          hasModel={hasModel}
          hasElectron={hasElectron}
          error={error}
        />

        <InputArea
          isStreaming={isStreaming}
          hasModel={hasModel}
          hasElectron={hasElectron}
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