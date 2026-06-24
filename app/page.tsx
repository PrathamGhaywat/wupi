"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/sidebar/Sidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { InputArea } from "@/components/chat/InputArea";
import { AppLoader } from "@/components/loader/AppLoader";
import { DynamicSlogan } from "@/components/header/DynamicSlogan";
import { cn } from "@/lib/utils";
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
  const hasMessages = (state?.messages.length ?? 0) > 0;

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

  const currentModelValue = state?.model
    ? `${state.model.provider}/${state.model.id}`
    : "";

  return (
    <>
      <AppSidebar
        onSettingsClick={() => {
          fetchModels();
          setSettingsOpen(true);
        }}
      />

      <SidebarInset className="flex flex-col">
        <header
          className={cn(
            "flex items-center gap-3 border-b border-border/60 bg-background px-4 transition-all duration-300",
            hasMessages ? "h-12" : "h-0 overflow-hidden border-transparent"
          )}
        >
          <SidebarTrigger className="md:hidden" />
          <div className="hidden sm:flex items-center gap-2.5 font-medium">
            <span className="text-base">🜂</span>
            <span className="text-foreground tracking-tight">Wupi</span>
          </div>
          <Separator orientation="vertical" className="hidden sm:block h-4" />
          <div className="hidden sm:flex items-center">
            <DynamicSlogan />
          </div>
          <div className="flex-1" />
        </header>

        <ChatArea
          state={state}
          ready={ready}
          hasModel={hasModel}
          hasElectron={hasElectron}
          error={error}
          hasMessages={hasMessages}
        />

        <InputArea
          isStreaming={isStreaming}
          hasModel={hasModel}
          hasElectron={hasElectron}
          models={models}
          currentModel={currentModelValue}
          onModelChange={pickModel}
          onSend={send}
          onAbort={abort}
          centered={!hasMessages}
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