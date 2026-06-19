import { useSyncExternalStore } from "react";
import type { WupiAgentEvent } from "@/app/types";

export interface StreamingSnapshot {
  text: string;
  thinking: string;
  activeTools: Record<string, { name: string; done: boolean; isError: boolean }>;
  isStreaming: boolean;
}

type Listener = () => void;

let snapshot: StreamingSnapshot = {
  text: "",
  thinking: "",
  activeTools: {},
  isStreaming: false,
};

const listeners = new Set<Listener>();
let scheduled = false;
let rafId: number | null = null;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

function flush() {
  scheduled = false;
  rafId = null;
  timeoutId = null;
  notify();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  rafId = requestAnimationFrame(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    flush();
  });
  timeoutId = setTimeout(() => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    flush();
  }, 50);
}

export function dispatchStreamingEvent(event: WupiAgentEvent): void {
  switch (event.type) {
    case "agent_start":
      snapshot = { text: "", thinking: "", activeTools: {}, isStreaming: true };
      schedule();
      break;
    case "agent_end":
    case "agent_error":
      if (snapshot.isStreaming) {
        snapshot = { ...snapshot, isStreaming: false };
        schedule();
      }
      break;
    case "message_update": {
      const sub = (event as { assistantMessageEvent?: { type: string; delta?: string } })
        .assistantMessageEvent;
      if (sub?.type === "text_delta" && sub.delta) {
        snapshot = { ...snapshot, text: snapshot.text + sub.delta };
        schedule();
      } else if (sub?.type === "thinking_delta" && sub.delta) {
        snapshot = { ...snapshot, thinking: snapshot.thinking + sub.delta };
        schedule();
      } else if (sub?.type === "start" && !snapshot.isStreaming) {
        snapshot = { ...snapshot, isStreaming: true };
        schedule();
      }
      break;
    }
    case "tool_execution_start": {
      const e = event as unknown as { toolCallId: string; toolName: string };
      snapshot = {
        ...snapshot,
        activeTools: {
          ...snapshot.activeTools,
          [e.toolCallId]: { name: e.toolName, done: false, isError: false },
        },
      };
      schedule();
      break;
    }
    case "tool_execution_end": {
      const e = event as unknown as {
        toolCallId: string;
        toolName: string;
        isError: boolean;
      };
      snapshot = {
        ...snapshot,
        activeTools: {
          ...snapshot.activeTools,
          [e.toolCallId]: { name: e.toolName, done: true, isError: e.isError },
        },
      };
      schedule();
      break;
    }
  }
}

export function resetStreamingStore(): void {
  snapshot = { text: "", thinking: "", activeTools: {}, isStreaming: false };
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
  scheduled = false;
  notify();
}

export function getStreamingSnapshot(): StreamingSnapshot {
  return snapshot;
}

export function subscribeStreaming(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const emptySnapshot: StreamingSnapshot = {
  text: "",
  thinking: "",
  activeTools: {},
  isStreaming: false,
};

export function useStreamingSnapshot(): StreamingSnapshot {
  return useSyncExternalStore(
    subscribeStreaming,
    getStreamingSnapshot,
    () => emptySnapshot
  );
}

export function useStreamingSelector<T>(
  selector: (snapshot: StreamingSnapshot) => T
): T {
  return useSyncExternalStore(
    subscribeStreaming,
    () => selector(getStreamingSnapshot()),
    () => selector(emptySnapshot)
  );
}
