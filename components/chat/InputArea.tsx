"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputAreaProps {
  isStreaming: boolean;
  hasModel: boolean;
  hasElectron: boolean;
  onSend: (text: string) => void;
  onAbort: () => void;
}

export function InputArea({
  isStreaming,
  hasModel,
  hasElectron,
  onSend,
  onAbort,
}: InputAreaProps) {
  const [value, setValue] = useState("");

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
    <div className="border-t border-border p-4">
      <div className="mx-auto max-w-3xl relative">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasModel
              ? "Message Wupi…"
              : "Configure a model to start chatting…"
          }
          disabled={!hasElectron}
          className="min-h-[56px] max-h-32 resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Chat input"
        />

        <div className="absolute bottom-3 right-3">
          {isStreaming ? (
            <Button
              variant="destructive"
              size="icon"
              className="size-8 rounded-lg"
              onClick={onAbort}
              aria-label="Stop streaming"
            >
              <Square className="size-4" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="icon"
              className={cn(
                "size-8 rounded-lg transition-all",
                !value.trim() && "opacity-50"
              )}
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
  );
}