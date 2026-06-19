"use client";

import { useRef, useEffect, useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { MessageBubble, StreamingBubble } from "@/components/chat/MessageBubble";
import { DynamicSlogan } from "@/components/header/DynamicSlogan";
import { ChevronDown } from "lucide-react";
import { useStreamingSnapshot } from "@/lib/streaming-store";
import type { WupiSessionState } from "@/app/types";

interface ChatAreaProps {
  state: WupiSessionState | null;
  ready: boolean;
  hasModel: boolean;
  hasElectron: boolean;
  error: string | null;
}

export const ChatArea = memo(function ChatArea({
  state,
  ready,
  hasModel,
  hasElectron,
  error,
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const snapshot = useStreamingSnapshot();

  const scrollToBottom = (smooth = true) => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  useEffect(() => {
    if (!isAtBottom) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: snapshot.isStreaming ? "auto" : "smooth",
    });
  }, [snapshot.text, snapshot.thinking, snapshot.activeTools, state, isAtBottom, snapshot.isStreaming]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setIsAtBottom(atBottom);
    setShowScrollButton(!atBottom);
  };

  const hasStreamingContent =
    snapshot.text ||
    snapshot.thinking ||
    Object.keys(snapshot.activeTools).length > 0;

  return (
    <div className="flex-1 relative flex flex-col min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
          {!hasElectron ? (
            <div className="mx-auto mt-10 max-w-md text-center text-sm text-muted-foreground">
              Wupi must run inside Electron. Start the app with <code>bun run dev</code>.
            </div>
          ) : null}

          {ready && !hasModel && hasElectron ? (
            <Alert className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
              <AlertTitle>No model configured</AlertTitle>
              <AlertDescription>
                Open <strong>Settings</strong> to add an API key for a provider
                (Anthropic, OpenAI, Google, …), then pick a model.
              </AlertDescription>
            </Alert>
          ) : null}

          {hasElectron && hasModel && (state?.messages.length ?? 0) === 0 && !snapshot.isStreaming ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
              <div className="mb-4 text-6xl">🜂</div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Wupi</h2>
              <DynamicSlogan />
              <p className="mt-4 text-sm text-muted-foreground max-w-md">
                Your personal AI agent. Ask me anything about your code, projects, or development workflow.
              </p>
            </div>
          ) : null}

          {state?.messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}

          {hasStreamingContent ? (
            <StreamingBubble
              text={snapshot.text}
              thinking={snapshot.thinking}
              tools={snapshot.activeTools}
            />
          ) : null}
        </div>
      </div>

      {showScrollButton ? (
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-md"
          onClick={() => scrollToBottom(true)}
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="size-4" />
        </Button>
      ) : null}

      {error ? (
        <div className="mx-4 mb-2 rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
});