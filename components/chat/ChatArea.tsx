"use client";

import { useRef, useEffect, useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { MessageBubble, StreamingBubble } from "@/components/chat/MessageBubble";
import { ChevronDown, Sparkles } from "lucide-react";
import { useStreamingSnapshot } from "@/lib/streaming-store";
import type { WupiSessionState } from "@/app/types";

interface ChatAreaProps {
  state: WupiSessionState | null;
  ready: boolean;
  hasModel: boolean;
  hasElectron: boolean;
  hasMessages: boolean;
  error: string | null;
}

export const ChatArea = memo(function ChatArea({
  state,
  ready,
  hasModel,
  hasElectron,
  hasMessages,
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

  if (!hasMessages && !snapshot.isStreaming) return null;

  return (
    <div className="flex-1 relative flex flex-col min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-3xl flex flex-col gap-4 px-4 py-6">
          {!hasElectron ? (
            <div className="mx-auto mt-10 max-w-md text-center text-sm text-muted-foreground leading-relaxed">
              Wupi must run inside Electron. Start the app with <code className="text-foreground">bun run dev</code>.
            </div>
          ) : null}

          {ready && !hasModel && hasElectron ? (
            <Alert variant="default">
              <Sparkles className="size-4 text-amber-500" />
              <AlertTitle>No model configured</AlertTitle>
              <AlertDescription>
                Open <strong className="text-foreground font-medium">Settings</strong> to add an API key for a provider
                (Anthropic, OpenAI, Google, …), then pick a model.
              </AlertDescription>
            </Alert>
          ) : null}

          {state && state.messages.length > 0 ? (
            <div className="flex flex-col gap-3">
              {state.messages.map((m, i) => (
                <MessageBubble key={i} message={m} />
              ))}
            </div>
          ) : null}

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
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-elevated hover:shadow-elevated"
          onClick={() => scrollToBottom(true)}
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="size-4" />
        </Button>
      ) : null}

      {error ? (
        <div className="mx-4 mb-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive leading-relaxed">
          {error}
        </div>
      ) : null}
    </div>
  );
});