import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  ping: () => ipcRenderer.invoke("ping"),

  agentSend: (text: string) => ipcRenderer.invoke("agent:send", text),
  agentAbort: () => ipcRenderer.invoke("agent:abort"),
  agentSetModel: (provider: string, modelId: string) =>
    ipcRenderer.invoke("agent:setModel", provider, modelId),
  agentGetState: () => ipcRenderer.invoke("agent:getState"),
  agentGetModels: () => ipcRenderer.invoke("agent:getModels"),

  authSetApiKey: (provider: string, key: string) =>
    ipcRenderer.invoke("auth:setApiKey", provider, key),
  authRemove: (provider: string) => ipcRenderer.invoke("auth:remove", provider),
  authLogin: (provider: string) => ipcRenderer.invoke("auth:login", provider),
  authLoginAbort: (provider: string) =>
    ipcRenderer.invoke("auth:login:abort", provider),
  authLoginRespond: (responseId: string, value: string | undefined) =>
    ipcRenderer.invoke("auth:login:respond", responseId, value),

  configGetDir: () => ipcRenderer.invoke("config:getDir"),

  onAgentEvent: (cb: (event: unknown) => void) =>
    ipcRenderer.on("agent:event", (_e, event) => cb(event)),
  onAgentState: (cb: (state: unknown) => void) =>
    ipcRenderer.on("agent:state", (_e, state) => cb(state)),
  onAgentModels: (cb: (payload: unknown) => void) =>
    ipcRenderer.on("agent:models", (_e, payload) => cb(payload)),
  onAgentProviders: (cb: (payload: unknown) => void) =>
    ipcRenderer.on("agent:providers", (_e, payload) => cb(payload)),
  onAuthLoginEvent: (cb: (event: unknown) => void) =>
    ipcRenderer.on("auth:login:event", (_e, event) => cb(event)),
});
