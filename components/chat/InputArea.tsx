"use client";

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { CheckIcon } from "lucide-react";
import type { WupiModelInfo } from "@/app/types";

const GREETINGS = [
  "Hey, what you wanna build?",
  "What's on your mind?",
  "Ready to code something awesome?",
  "What can I help you create?",
  "Got a project in mind?",
  "Let's build something great!",
  "What are we working on today?",
  "Fire away — what's the idea?",
  "What's the plan, chief?",
  "Let's get coding!",
];

const MOODS = [
  "I'm your AI pair programmer, ready when you are.",
  "Ask me anything — code, architecture, debugging.",
  "Your personal coding agent. Let's dive in.",
  "I can help with code, review, research, and more.",
  "From quick questions to full features — I've got you.",
];

interface InputAreaProps {
  isStreaming: boolean;
  hasModel: boolean;
  hasElectron: boolean;
  models: WupiModelInfo[];
  currentModel: string;
  onModelChange: (provider: string, modelId: string) => void;
  onSend: (text: string) => void;
  onAbort: () => void;
  centered: boolean;
}

export function InputArea({
  isStreaming,
  hasModel,
  hasElectron,
  models,
  currentModel,
  onModelChange,
  onSend,
  onAbort,
  centered,
}: InputAreaProps) {
  const [value, setValue] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [greeting, setGreeting] = useState(GREETINGS[0]);
  const [mood, setMood] = useState(MOODS[0]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
    setMood(MOODS[Math.floor(Math.random() * MOODS.length)]);
  }, []);

  useEffect(() => {
    if (centered && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [centered]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentModelObj = models.find(
    (m) => `${m.provider}/${m.id}` === currentModel
  );

  const configuredModels = models.filter((m) => m.configured);

  return (
    <div
      className={cn(
        "flex flex-col transition-all duration-500 ease-out",
        centered
          ? "flex-1 items-center justify-center px-4 pb-16"
          : "border-t border-border/60 bg-background/80 backdrop-blur-sm px-4 py-3"
      )}
    >
      <div
        className={cn(
          "w-full flex flex-col transition-all duration-500 ease-out",
          centered ? "max-w-xl items-center gap-5" : "max-w-3xl mx-auto gap-3"
        )}
      >
        {centered ? (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {greeting}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                {mood}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Popover open={modelOpen} onOpenChange={setModelOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-full text-xs font-normal h-7 px-3"
                    disabled={isStreaming}
                  >
                    <Sparkles className="size-3" />
                    {currentModelObj
                      ? currentModelObj.name
                      : configuredModels.length > 0
                        ? "Select a model"
                        : "No models available"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-72 rounded-xl p-0 shadow-elevated"
                  align="center"
                  sideOffset={6}
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
                                onModelChange(provider, rest.join("/"));
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
                                  currentModel === `${m.provider}/${m.id}`
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
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "relative flex items-end gap-2",
            centered && "w-full"
          )}
        >
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                hasModel
                  ? "Message Wupi…"
                  : "Configure a model to start chatting…"
              }
              disabled={!hasElectron}
              className={cn(
                "shadow-sm transition-all duration-300",
                centered
                  ? "min-h-[56px] max-h-40 bg-card pr-12 rounded-2xl text-base"
                  : "min-h-[52px] max-h-36 bg-card pr-12"
              )}
              aria-label="Chat input"
            />

            <div className="absolute bottom-2 right-2">
              {isStreaming ? (
                <Button
                  variant="destructive"
                  size="icon-sm"
                  onClick={onAbort}
                  aria-label="Stop streaming"
                >
                  <Square className="size-4" />
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="icon-sm"
                  className={cn("transition-all", !value.trim() && "opacity-50")}
                  onClick={handleSend}
                  disabled={!value.trim() || !hasModel || !hasElectron}
                  aria-label="Send message"
                >
                  <ArrowUp className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {!centered && configuredModels.length > 0 ? (
          <div className="flex items-center justify-between">
            <Popover open={modelOpen} onOpenChange={setModelOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="xs"
                  className="gap-1.5 rounded-lg text-[0.6875rem] font-normal text-muted-foreground h-6 px-2"
                  disabled={isStreaming}
                >
                  <Sparkles className="size-3" />
                  {currentModelObj ? currentModelObj.name : "Select a model"}
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
                              onModelChange(provider, rest.join("/"));
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
                                currentModel === `${m.provider}/${m.id}`
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : null}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        ) : null}
      </div>
    </div>
  );
}