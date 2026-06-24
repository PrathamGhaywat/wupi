"use client";

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

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
  onSend: (text: string) => void;
  onAbort: () => void;
  centered: boolean;
}

export function InputArea({
  isStreaming,
  hasModel,
  hasElectron,
  onSend,
  onAbort,
  centered,
}: InputAreaProps) {
  const [value, setValue] = useState("");
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
          </div>
        ) : null}

        <div className={cn("flex-1 grid", centered && "w-full")}>
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
              "shadow-sm transition-all duration-300 row-start-1 col-start-1",
              centered
                ? "min-h-[56px] max-h-40 bg-card pr-12 rounded-2xl text-base"
                : "min-h-[52px] max-h-36 bg-card pr-12"
            )}
            aria-label="Chat input"
          />

          <div className="row-start-1 col-start-1 justify-self-end self-center mr-2 flex">
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
    </div>
  );
}