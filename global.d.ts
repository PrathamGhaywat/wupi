import type {
  WupiAgentEvent,
  WupiModelInfo,
  WupiProviderInfo,
  WupiSessionState,
} from "./app/types";

export {};

declare global {
  interface WupiSessionInfo {
    sessionFile: string;
    title: string;
    createdAt: number;
    messageCount: number;
    modelName?: string;
  }

  interface WupiAuthLoginEvent {
    type: string;
    [key: string]: unknown;
  }

  interface Window {
    electronAPI: {
      ping: () => Promise<string>;

      agentSend: (text: string) => Promise<{ ok: boolean; error?: string }>;
      agentAbort: () => Promise<{ ok: boolean }>;
      agentSetModel: (
        provider: string,
        modelId: string
      ) => Promise<{ ok: boolean; error?: string }>;
      agentGetState: () => Promise<WupiSessionState | null>;
      agentGetModels: () => Promise<{
        models: WupiModelInfo[];
        providers: WupiProviderInfo[];
      }>;

      authSetApiKey: (provider: string, key: string) => Promise<{ ok: boolean }>;
      authRemove: (provider: string) => Promise<{ ok: boolean }>;
      authLogin: (provider: string) => Promise<{ ok: boolean; error?: string }>;
      authLoginAbort: (provider: string) => Promise<{ ok: boolean }>;
      authLoginRespond: (
        responseId: string,
        value: string | undefined
      ) => Promise<{ ok: boolean }>;

      configGetDir: () => Promise<string>;

      sessionList: () => Promise<WupiSessionInfo[]>;
      sessionCreate: () => Promise<{ ok: boolean; error?: string }>;
      sessionSwitch: (sessionFile: string) => Promise<{ ok: boolean; error?: string }>;
      sessionDelete: (sessionFile: string) => Promise<{ ok: boolean }>;
      sessionRename: (sessionFile: string, title: string) => Promise<{ ok: boolean; error?: string }>;

      onAgentEvent: (cb: (event: WupiAgentEvent) => void) => void;
      onAgentState: (cb: (state: WupiSessionState) => void) => void;
      onAgentModels: (cb: (payload: WupiModelInfo[]) => void) => void;
      onAgentProviders: (cb: (payload: WupiProviderInfo[]) => void) => void;
      onAuthLoginEvent: (cb: (event: WupiAuthLoginEvent) => void) => void;
    };
  }
}
