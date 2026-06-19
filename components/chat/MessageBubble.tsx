"use client";

import { memo } from "react";
import { ToolChip } from "@/components/chat/ToolChip";
import { cn } from "@/lib/utils";
import type { WupiMessage, WupiAssistantMessage, WupiMessageContent } from "@/app/types";

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

function AssistantBlocks({ content }: { content: WupiMessageContent[] }) {
  return content.map((b, i) => {
    if (b.type === "text") {
      return (
        <div key={i} className="whitespace-pre-wrap break-words">
          {b.text}
        </div>
      );
    }
    if (b.type === "thinking") {
      return (
        <details key={i} className="my-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium">thinking</summary>
          <div className="mt-1 whitespace-pre-wrap">{b.thinking}</div>
        </details>
      );
    }
    if (b.type === "toolCall") {
      return (
        <div key={i} className="my-1 rounded-md bg-muted px-3 py-1.5 font-mono text-xs text-muted-foreground">
          ⟶ {b.name}({Object.keys(b.arguments).length > 0 ? JSON.stringify(b.arguments) : ""})
        </div>
      );
    }
    return null;
  });
}

interface MessageBubbleProps {
  message: WupiMessage;
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground">
          {userText(message)}
        </div>
      </div>
    );
  }

  if (message.role === "assistant") {
    const am = message as WupiAssistantMessage;
    return (
      <div className="flex justify-start">
        <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm text-foreground">
          {am.errorMessage ? (
            <div className="text-destructive">Error: {am.errorMessage}</div>
          ) : null}
          <AssistantBlocks content={am.content} />
          {am.usage ? (
            <div className="mt-1 text-[10px] text-muted-foreground">
              {am.provider}/{am.model} · in {am.usage.input} / out {am.usage.output}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (message.role === "toolResult") {
    const tr = message as {
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
          className={cn(
            "max-w-[80%] rounded-lg px-3 py-1 font-mono text-xs",
            tr.isError
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground"
          )}
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
});

interface StreamingBubbleProps {
  text: string;
  thinking: string;
  tools: Record<string, { name: string; done: boolean; isError: boolean }>;
}

export const StreamingBubble = memo(function StreamingBubble({ text, thinking, tools }: StreamingBubbleProps) {
  return (
    <div className="flex flex-col gap-2">
      {thinking ? (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-border px-3 py-1 text-xs text-muted-foreground">
            <details>
              <summary className="cursor-pointer font-medium">thinking…</summary>
              <div className="mt-1 whitespace-pre-wrap">{thinking}</div>
            </details>
          </div>
        </div>
      ) : null}

      {Object.keys(tools).length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {Object.entries(tools).map(([id, t]) => (
            <ToolChip key={id} name={t.name} done={t.done} isError={t.isError} />
          ))}
        </div>
      ) : null}

      {text ? (
        <div className="flex justify-start">
          <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-muted px-4 py-2 text-sm text-foreground">
            {text}
            <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-foreground/50 align-middle rounded-sm" />
          </div>
        </div>
      ) : null}
    </div>
  );
});