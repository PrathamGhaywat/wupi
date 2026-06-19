export interface WupiModelInfo {
  provider: string;
  providerDisplayName: string;
  id: string;
  name: string;
  reasoning: boolean;
  contextWindow: number;
  maxTokens: number;
  input: ("text" | "image")[];
  configured: boolean;
}

export interface WupiAuthStatus {
  configured: boolean;
  source?:
    | "stored"
    | "runtime"
    | "environment"
    | "fallback"
    | "models_json_key"
    | "models_json_command";
  label?: string;
}

export interface WupiProviderInfo {
  id: string;
  displayName: string;
  configured: boolean;
  status: WupiAuthStatus;
  modelCount: number;
}

export interface WupiSessionState {
  isStreaming: boolean;
  model: WupiModelInfo | null;
  thinkingLevel: string;
  sessionId: string;
  messages: WupiMessage[];
}

export type WupiMessageContent =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "image"; data: string; mimeType: string }
  | { type: "toolCall"; id: string; name: string; arguments: Record<string, unknown> };

export interface WupiUserMessage {
  role: "user";
  content: string | WupiMessageContent[];
  timestamp: number;
}

export interface WupiAssistantMessage {
  role: "assistant";
  content: WupiMessageContent[];
  api: string;
  provider: string;
  model: string;
  usage?: {
    input: number;
    output: number;
    total: number;
    cost: { total: number };
  };
  stopReason?: string;
  errorMessage?: string;
  timestamp: number;
}

export interface WupiToolResultMessage {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: WupiMessageContent[];
  isError: boolean;
  timestamp: number;
}

export type WupiMessage =
  | WupiUserMessage
  | WupiAssistantMessage
  | WupiToolResultMessage
  | { role: string; [key: string]: unknown };

export interface WupiAgentEvent {
  type: string;
  [key: string]: unknown;
}
