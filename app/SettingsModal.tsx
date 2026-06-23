"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import type { WupiProviderInfo } from "./types";

interface SettingsModalProps {
  providers: WupiProviderInfo[];
  onClose: () => void;
  onChanged: () => void;
}

const ENV_HINT: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GEMINI_API_KEY",
  deepseek: "DEEPSEEK_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  xai: "XAI_API_KEY",
  mistral: "MISTRAL_API_KEY",
  "github-copilot": "GITHUB_TOKEN",
};

const AUTH_TYPE: Record<string, "api_key" | "oauth"> = {
  "github-copilot": "oauth",
};

type LogStep =
  | { kind: "idle" }
  | { kind: "waiting" }
  | { kind: "deviceCode"; userCode: string; verificationUri: string; intervalSeconds?: number; expiresInSeconds?: number }
  | { kind: "authUrl"; url: string; instructions?: string }
  | { kind: "prompt"; id: string; message: string; placeholder?: string; allowEmpty?: boolean }
  | { kind: "select"; id: string; message: string; options: { id: string; label: string }[] }
  | { kind: "manualCode"; id: string }
  | { kind: "progress"; message: string }
  | { kind: "done"; ok: boolean; error?: string };

export default function SettingsModal({ providers, onClose, onChanged }: SettingsModalProps) {
  const [selected, setSelected] = useState<string>(providers[0]?.id ?? "");
  const [key, setKey] = useState("");
  const [configDir, setConfigDir] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [logStep, setLogStep] = useState<LogStep>({ kind: "idle" });
  const [promptValue, setPromptValue] = useState("");
  const [manualCodeValue, setManualCodeValue] = useState("");
  const [providerOpen, setProviderOpen] = useState(false);

  const api = () => window.electronAPI;

  useEffect(() => {
    if (!api()) return;
    api()!.configGetDir().then(setConfigDir);
  }, []);

  useEffect(() => {
    if (!api()) return;
    const handler = (event: { type: string; [key: string]: unknown }) => {
      const t = event.type;
      if (t === "deviceCode") {
        setLogStep({
          kind: "deviceCode",
          userCode: event.userCode as string,
          verificationUri: event.verificationUri as string,
          intervalSeconds: event.intervalSeconds as number | undefined,
          expiresInSeconds: event.expiresInSeconds as number | undefined,
        });
      } else if (t === "authUrl") {
        setLogStep({ kind: "authUrl", url: event.url as string, instructions: event.instructions as string | undefined });
      } else if (t === "prompt") {
        setLogStep({ kind: "prompt", id: event.id as string, message: event.message as string, placeholder: event.placeholder as string | undefined, allowEmpty: event.allowEmpty as boolean | undefined });
        setPromptValue("");
      } else if (t === "select") {
        setLogStep({ kind: "select", id: event.id as string, message: event.message as string, options: event.options as { id: string; label: string }[] });
      } else if (t === "manualCode") {
        setLogStep({ kind: "manualCode", id: event.id as string });
        setManualCodeValue("");
      } else if (t === "progress") {
        setLogStep({ kind: "progress", message: event.message as string });
      }
    };
    api()!.onAuthLoginEvent(handler);
  }, []);

  useEffect(() => {
    if (logStep.kind === "done" && logStep.ok) {
      onChanged();
    }
  }, [logStep, onChanged]);

  const effectiveSelected = providers.find((p) => p.id === selected) ? selected : providers[0]?.id ?? "";
  const current = providers.find((p) => p.id === effectiveSelected);
  const effectiveAuthType = AUTH_TYPE[effectiveSelected] ?? "api_key";

  async function save() {
    if (!effectiveSelected || !key.trim()) return;
    setBusy(true);
    setMsg(null);
    const res = await api()!.authSetApiKey(effectiveSelected, key.trim());
    setBusy(false);
    if (res.ok) {
      setKey("");
      setMsg({ kind: "ok", text: "Saved." });
      onChanged();
    } else {
      setMsg({ kind: "err", text: "Failed to save." });
    }
  }

  async function remove() {
    if (!effectiveSelected) return;
    setBusy(true);
    setMsg(null);
    await api()!.authRemove(effectiveSelected);
    setBusy(false);
    setMsg({ kind: "ok", text: "Removed." });
    onChanged();
  }

  async function startLogin() {
    setLogStep({ kind: "waiting" });
    const res = await api()!.authLogin(effectiveSelected);
    setLogStep({ kind: "done", ok: res.ok, error: res.error });
  }

  async function cancelLogin() {
    await api()!.authLoginAbort(effectiveSelected);
    setLogStep({ kind: "idle" });
  }

  function dismissResult() {
    setLogStep({ kind: "idle" });
  }

  async function submitPrompt() {
    if (logStep.kind !== "prompt") return;
    setLogStep({ kind: "waiting" });
    await api()!.authLoginRespond(logStep.id, promptValue);
  }

  async function submitSelect(optionId: string | undefined) {
    if (logStep.kind !== "select") return;
    setLogStep({ kind: "waiting" });
    await api()!.authLoginRespond(logStep.id, optionId);
  }

  async function submitManualCode() {
    if (logStep.kind !== "manualCode") return;
    setLogStep({ kind: "waiting" });
    await api()!.authLoginRespond(logStep.id, manualCodeValue);
  }

  function handleClose() {
    if (logStep.kind !== "idle" && logStep.kind !== "done") {
      cancelLogin();
    }
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Provider Settings</DialogTitle>
          <DialogDescription>
            Credentials are stored at{" "}
            <code className="font-mono text-xs">{configDir || "~/.wupi"}</code>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">Provider</label>
            <Popover open={providerOpen} onOpenChange={setProviderOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={providerOpen}
                  className="w-full justify-between rounded-none px-3 font-normal"
                >
                  <span className="truncate">
                    {current?.displayName ?? "Select a provider…"}
                  </span>
                  <ChevronsUpDownIcon className="ml-2 size-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search providers…" />
                  <CommandList>
                    <CommandEmpty>No provider found.</CommandEmpty>
                    <CommandGroup>
                      {providers.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.id}
                          keywords={[p.displayName, p.id]}
                          onSelect={(v) => {
                            setSelected(v);
                            setKey("");
                            setMsg(null);
                            setProviderOpen(false);
                          }}
                        >
                          <div className="flex flex-1 items-center gap-2">
                            <span>{p.displayName}</span>
                            <span className="text-xs text-muted-foreground">
                              ({AUTH_TYPE[p.id] === "oauth" ? "OAuth" : "key"})
                            </span>
                            {p.configured ? (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">✓</Badge>
                            ) : null}
                            <span className="text-xs text-muted-foreground ml-auto">{p.modelCount} models</span>
                          </div>
                          <CheckIcon
                            className={`ml-auto size-3.5 shrink-0 ${
                              effectiveSelected === p.id ? "opacity-100" : "opacity-0"
                            }`}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {current?.configured ? (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
              Configured
              {current.status.source ? ` · source: ${current.status.source}` : ""}
            </div>
          ) : null}

          {logStep.kind !== "idle" ? (
            <LoginFlow step={logStep} onCancel={cancelLogin} onDismiss={dismissResult}
              promptValue={promptValue} manualCodeValue={manualCodeValue}
              onPromptChange={setPromptValue} onManualCodeChange={setManualCodeValue}
              onSubmitPrompt={submitPrompt} onSubmitSelect={submitSelect} onSubmitManualCode={submitManualCode} />
          ) : effectiveAuthType === "oauth" ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                This provider uses OAuth. You can also set{" "}
                <code className="font-mono">{ENV_HINT[effectiveSelected] || "TOKEN"}=your_token</code>{" "}
                in <code className="font-mono">{configDir || "~/.wupi"}/.env</code> and restart instead.
              </div>
              <Button onClick={startLogin}>Sign in with browser</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {ENV_HINT[effectiveSelected] ? (
                <p className="text-xs text-muted-foreground">
                  API key. Set <code className="font-mono">{ENV_HINT[effectiveSelected]}=your_key</code>{" "}
                  in <code className="font-mono">{configDir || "~/.wupi"}/.env</code> or paste below.
                </p>
              ) : null}

              <Input
                type="password"
                className="font-mono"
                placeholder="Paste API key…"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              />

              {msg ? (
                <div className={`rounded px-3 py-2 text-xs ${
                  msg.kind === "ok"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {msg.text}
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button className="flex-1" onClick={save} disabled={busy || !key.trim()}>
                  {busy ? "Saving…" : "Save key"}
                </Button>
                {current?.configured ? (
                  <Button variant="outline" onClick={remove} disabled={busy} className="text-destructive">
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CancelButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <Button variant="outline" className="w-full" onClick={onClick}>
      {label ?? "Cancel"}
    </Button>
  );
}

function LoginFlow({
  step, onCancel, onDismiss, promptValue, manualCodeValue,
  onPromptChange, onManualCodeChange, onSubmitPrompt, onSubmitSelect, onSubmitManualCode,
}: {
  step: LogStep; onCancel: () => void; onDismiss: () => void;
  promptValue: string; manualCodeValue: string;
  onPromptChange: (v: string) => void; onManualCodeChange: (v: string) => void;
  onSubmitPrompt: () => void; onSubmitSelect: (optionId: string | undefined) => void; onSubmitManualCode: () => void;
}) {
  if (step.kind === "waiting" || step.kind === "progress") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block size-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          {step.kind === "progress" ? step.message : "Starting login…"}
        </div>
        <CancelButton onClick={onCancel} />
      </div>
    );
  }

  if (step.kind === "done") {
    return (
      <div className="flex flex-col gap-3">
        <div className={`rounded-lg px-3 py-2 text-xs ${
          step.ok
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
            : "bg-destructive/10 text-destructive"
        }`}>
          {step.ok ? "Authorized!" : (
            <>
              <p className="mb-1 font-medium">Authorization failed</p>
              <p className="font-mono">{step.error ?? "Unknown error"}</p>
            </>
          )}
        </div>
        <Button onClick={onDismiss}>
          {step.ok ? "Done" : "Try again"}
        </Button>
      </div>
    );
  }

  if (step.kind === "deviceCode") {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-center">
          <p className="mb-1 text-xs text-amber-800 dark:text-amber-300">
            Open the browser that just launched and enter this code:
          </p>
          <p className="select-all text-2xl font-bold tracking-widest text-amber-900 dark:text-amber-200">
            {step.userCode}
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{step.verificationUri}</p>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Waiting for authorization
          {step.expiresInSeconds ? ` (expires in ${Math.round(step.expiresInSeconds / 60)} min)` : ""}…
        </p>
        <CancelButton onClick={onCancel} />
      </div>
    );
  }

  if (step.kind === "authUrl") {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            A browser window opened for authorization.
            {step.instructions ? ` ${step.instructions}` : ""}
          </p>
        </div>
        <p className="text-xs text-muted-foreground text-center">Waiting for authorization…</p>
        <CancelButton onClick={onCancel} />
      </div>
    );
  }

  if (step.kind === "prompt") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">{step.message}</p>
        <Input
          placeholder={step.placeholder ?? ""}
          value={promptValue}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSubmitPrompt(); }}
        />
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onSubmitPrompt} disabled={!step.allowEmpty && !promptValue.trim()}>
            Submit
          </Button>
          <Button variant="outline" onClick={() => onSubmitSelect(undefined)}>Cancel</Button>
        </div>
      </div>
    );
  }

  if (step.kind === "select") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">{step.message}</p>
        {step.options.map((o) => (
          <Button key={o.id} variant="outline" className="w-full justify-start" onClick={() => onSubmitSelect(o.id)}>
            {o.label}
          </Button>
        ))}
        <CancelButton onClick={() => onSubmitSelect(undefined)} />
      </div>
    );
  }

  if (step.kind === "manualCode") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">Enter the code from the browser:</p>
        <Input
          className="font-mono"
          placeholder="Paste code…"
          value={manualCodeValue}
          onChange={(e) => onManualCodeChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSubmitManualCode(); }}
        />
        <div className="flex gap-2">
          <Button className="flex-1" onClick={onSubmitManualCode} disabled={!manualCodeValue.trim()}>
            Submit
          </Button>
          <CancelButton onClick={onCancel} />
        </div>
      </div>
    );
  }

  return null;
}

