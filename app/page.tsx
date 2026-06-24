"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Sparkles, CheckIcon } from "lucide-react";
import { AppSidebar } from "@/components/sidebar/Sidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { InputArea } from "@/components/chat/InputArea";
import { AppLoader } from "@/components/loader/AppLoader";
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

  const [modelOpen, setModelOpen] = useState(false);

  const configuredModels = models.filter((m) => m.configured);

  const currentModelObj = models.find(
    (m) => `${m.provider}/${m.id}` === currentModelValue
  );

  function computeStats(messages: WupiMessage[]) {
    let input = 0, output = 0, cost = 0;
    for (const m of messages) {
      if (m.role === "assistant") {
        const am = m as { usage?: { input: number; output: number; cost: { total: number } } };
        if (am.usage) {
          input += am.usage.input;
          output += am.usage.output;
          cost += am.usage.cost.total;
        }
      }
    }
    return { input, output, cost };
  }

  const stats = state ? computeStats(state.messages) : null;

  function fmtNum(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  }

  function fmtCost(n: number): string {
    if (n === 0) return "$0.00";
    if (n < 0.01) return `$${n.toFixed(4)}`;
    return `$${n.toFixed(2)}`;
  }

  return (
    <>
      <AppSidebar
        onSettingsClick={() => {
          fetchModels();
          setSettingsOpen(true);
        }}
      />

      <SidebarInset className="flex flex-col overflow-hidden">
        <header className="flex items-center gap-2 border-b border-border/60 bg-background px-4 h-11 shrink-0">
          <SidebarTrigger className="md:hidden" />
          <Popover open={modelOpen} onOpenChange={setModelOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs font-normal text-muted-foreground h-7 px-2"
                disabled={isStreaming}
              >
                <Sparkles className="size-3" />
                <span className="max-w-40 truncate">
                  {currentModelObj ? currentModelObj.name : "Select a model"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64 rounded-xl p-0 shadow-elevated"
              align="start"
              sideOffset={4}
            >
              <Command>
                <CommandInput placeholder="Search models…" />
                <CommandList>
                  <CommandEmpty>No model found.</CommandEmpty>
                  {configuredModels.length > 0 ? (
                    <CommandGroup>
                      {configuredModels.map((m) => (
                        <CommandItem
                          key={`${m.provider}/${m.id}`}
                          value={`${m.provider}/${m.id}`}
                          keywords={[m.providerDisplayName, m.provider, m.name, m.id]}
                          onSelect={(v) => {
                            const [provider, ...rest] = v.split("/");
                            pickModel(provider, rest.join("/"));
                            setModelOpen(false);
                          }}
                        >
                          <div className="flex flex-1 items-center gap-2 min-w-0">
                            <span className="truncate text-sm">{m.name}</span>
                            <span className="shrink-0 text-[10px] text-muted-foreground uppercase tracking-wider">
                              {m.providerDisplayName}
                            </span>
                          </div>
                          <CheckIcon
                            className={cn(
                              "ml-auto size-3.5 shrink-0",
                              currentModelValue === `${m.provider}/${m.id}`
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : (
                    <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                      No configured models. Add an API key in Settings.
                    </div>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <div className="flex-1" />
          {stats && (stats.input > 0 || stats.output > 0) ? (
            <div className="hidden sm:flex items-center gap-2 text-[0.625rem] text-muted-foreground/70 font-mono">
              <span title="Tokens in">in {fmtNum(stats.input)}</span>
              <span className="text-border/50">·</span>
              <span title="Tokens out">out {fmtNum(stats.output)}</span>
              <span className="text-border/50">·</span>
              <span title="Total cost">{fmtCost(stats.cost)}</span>
            </div>
          ) : null}
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