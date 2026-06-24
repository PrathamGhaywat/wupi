"use client";

import { memo } from "react";
import { ToolChip } from "@/components/chat/ToolChip";
import { Markdown } from "@/components/chat/Markdown";
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
        <div key={i} className="break-words leading-relaxed">
          <Markdown>{b.text}</Markdown>
        </div>
      );
    }
    if (b.type === "thinking") {
      return (
        <details key={i} className="my-2 overflow-hidden rounded-xl border border-border/50 bg-secondary/50 px-4 py-2.5 text-xs text-muted-foreground">
          <summary className="cursor-pointer text-[0.6875rem] font-medium tracking-wide text-muted-foreground/80 select-none">
            {b.thinking.length > 80 ? "Thinking" : "Thought"}
          </summary>
          <div className="mt-2 whitespace-pre-wrap leading-relaxed border-t border-border/30 pt-2">
            {b.thinking}
          </div>
        </details>
      );
    }
    if (b.type === "toolCall") {
      return (
        <div key={i} className="my-1.5 inline-flex items-center gap-1.5 rounded-lg bg-secondary/70 px-2.5 py-1 font-mono text-[0.6875rem] text-muted-foreground">
          <span className="text-foreground/40">→</span>
          {b.name}
          {Object.keys(b.arguments).length > 0 ? (
            <span className="text-foreground/30">(…)</span>
          ) : null}
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
        <div className="max-w-[75%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-sm">
          {userText(message)}
        </div>
      </div>
    );
  }

  if (message.role === "assistant") {
    const am = message as WupiAssistantMessage;
    return (
      <div className="flex justify-start">
        <div className="max-w-[75%] rounded-2xl rounded-bl-md bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm ring-1 ring-border/40">
          {am.errorMessage ? (
            <div className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              Error: {am.errorMessage}
            </div>
          ) : null}
          <AssistantBlocks content={am.content} />
          {am.usage ? (
            <div className="mt-2 flex items-center gap-2 border-t border-border/30 pt-2 text-[0.625rem] text-muted-foreground/70">
              <span>{am.provider}/{am.model}</span>
              <span className="text-border/50">·</span>
              <span>in {am.usage.input}</span>
              <span className="text-border/50">·</span>
              <span>out {am.usage.output}</span>
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
            "max-w-[75%] rounded-xl px-3 py-2 font-mono text-xs leading-relaxed",
            tr.isError
              ? "bg-destructive/8 text-destructive"
              : "bg-secondary/50 text-muted-foreground"
          )}
        >
          <div className="mb-0.5 flex items-center gap-1.5 font-sans text-[0.6875rem] font-medium">
            <span className={tr.isError ? "text-destructive" : "text-emerald-500"}>
              {tr.isError ? "✕" : "✓"}
            </span>
            {tr.toolName}
          </div>
          {text ? (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-[0.6875rem]">{text}</pre>
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
    <div className="flex flex-col gap-3">
      {thinking ? (
        <div className="flex justify-start">
          <div className="max-w-[75%] overflow-hidden rounded-2xl rounded-bl-md border border-border/50 bg-card/50 px-4 py-2.5 text-xs text-muted-foreground shadow-sm">
            <details>
              <summary className="cursor-pointer text-[0.6875rem] font-medium tracking-wide text-muted-foreground/80 select-none">
                thinking…
              </summary>
              <div className="mt-2 whitespace-pre-wrap leading-relaxed border-t border-border/30 pt-2">{thinking}</div>
            </details>
          </div>
        </div>
      ) : null}

      {Object.keys(tools).length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(tools).map(([id, t]) => (
            <ToolChip key={id} name={t.name} done={t.done} isError={t.isError} />
          ))}
        </div>
      ) : null}

      {text ? (
        <div className="flex justify-start">
          <div className="max-w-[75%] break-words rounded-2xl rounded-bl-md bg-card px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm ring-1 ring-border/40">
            <Markdown>{text}</Markdown>
            <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-foreground/60 align-middle rounded-full" />
          </div>
        </div>
      ) : null}
    </div>
  );
});