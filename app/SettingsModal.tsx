"use client";

import { useEffect, useState } from "react";
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
  | {
      kind: "deviceCode";
      userCode: string;
      verificationUri: string;
      intervalSeconds?: number;
      expiresInSeconds?: number;
    }
  | { kind: "authUrl"; url: string; instructions?: string }
  | {
      kind: "prompt";
      id: string;
      message: string;
      placeholder?: string;
      allowEmpty?: boolean;
    }
  | {
      kind: "select";
      id: string;
      message: string;
      options: { id: string; label: string }[];
    }
  | { kind: "manualCode"; id: string }
  | { kind: "progress"; message: string }
  | { kind: "done"; ok: boolean; error?: string };

export default function SettingsModal({
  providers,
  onClose,
  onChanged,
}: SettingsModalProps) {
  const [selected, setSelected] = useState<string>(providers[0]?.id ?? "");
  const [key, setKey] = useState("");
  const [configDir, setConfigDir] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );
  const [logStep, setLogStep] = useState<LogStep>({ kind: "idle" });
  const [promptValue, setPromptValue] = useState("");
  const [manualCodeValue, setManualCodeValue] = useState("");

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
        setLogStep({
          kind: "authUrl",
          url: event.url as string,
          instructions: event.instructions as string | undefined,
        });
      } else if (t === "prompt") {
        setLogStep({
          kind: "prompt",
          id: event.id as string,
          message: event.message as string,
          placeholder: event.placeholder as string | undefined,
          allowEmpty: event.allowEmpty as boolean | undefined,
        });
        setPromptValue("");
      } else if (t === "select") {
        setLogStep({
          kind: "select",
          id: event.id as string,
          message: event.message as string,
          options: event.options as { id: string; label: string }[],
        });
      } else if (t === "manualCode") {
        setLogStep({ kind: "manualCode", id: event.id as string });
        setManualCodeValue("");
      } else if (t === "progress") {
        setLogStep({
          kind: "progress",
          message: event.message as string,
        });
      }
    };
    api()!.onAuthLoginEvent(handler);
  }, []);

  useEffect(() => {
    if (logStep.kind === "done" && logStep.ok) {
      onChanged();
    }
  }, [logStep, onChanged]);

  const effectiveSelected = providers.find((p) => p.id === selected)
    ? selected
    : providers[0]?.id ?? "";
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
    setLogStep({
      kind: "done",
      ok: res.ok,
      error: res.error,
    });
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Provider Settings</h2>
          <button
            className="rounded px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            onClick={handleClose}
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-xs text-zinc-500">
          Credentials are stored at{" "}
          <code className="font-mono">{configDir || "~/.wupi"}</code>
        </p>

        <label className="mb-1 block text-xs font-medium text-zinc-500">
          Provider
        </label>
        <select
          className="mb-3 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
          value={effectiveSelected}
          onChange={(e) => {
            setSelected(e.target.value);
            setKey("");
            setMsg(null);
          }}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName} ({AUTH_TYPE[p.id] === "oauth" ? "OAuth" : "key"}){" "}
              {p.configured ? "✓" : ""} · {p.modelCount} models
            </option>
          ))}
        </select>

        {current?.configured ? (
          <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            Configured
            {current.status.source
              ? ` · source: ${current.status.source}`
              : ""}
          </div>
        ) : null}

        {/* ── Login flow UI ── */}
        {logStep.kind !== "idle" ? (
          <LoginFlow step={logStep} onCancel={cancelLogin} onDismiss={dismissResult} promptValue={promptValue} manualCodeValue={manualCodeValue} onPromptChange={setPromptValue} onManualCodeChange={setManualCodeValue} onSubmitPrompt={submitPrompt} onSubmitSelect={submitSelect} onSubmitManualCode={submitManualCode} />
        ) : effectiveAuthType === "oauth" ? (
          <>
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              This provider uses OAuth. You can also set{" "}
              <code className="font-mono">
                {ENV_HINT[effectiveSelected] || "TOKEN"}=your_token
              </code>{" "}
              in{" "}
              <code className="font-mono">
                {configDir || "~/.wupi"}/.env
              </code>{" "}
              and restart instead.
            </div>
            <button
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              onClick={startLogin}
            >
              Sign in with browser
            </button>
          </>
        ) : (
          <>
            {ENV_HINT[effectiveSelected] ? (
              <p className="mb-2 text-xs text-zinc-500">
                API key. Set{" "}
                <code className="font-mono">
                  {ENV_HINT[effectiveSelected]}=your_key
                </code>{" "}
                in{" "}
                <code className="font-mono">
                  {configDir || "~/.wupi"}/.env
                </code>{" "}
                or paste below.
              </p>
            ) : null}

            <input
              type="password"
              className="mb-3 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm font-mono text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500"
              placeholder="Paste API key…"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
            />

            {msg ? (
              <div
                className={`mb-3 rounded px-3 py-2 text-xs ${
                  msg.kind === "ok"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                }`}
              >
                {msg.text}
              </div>
            ) : null}

            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
                onClick={save}
                disabled={busy || !key.trim()}
              >
                {busy ? "Saving…" : "Save key"}
              </button>
              {current?.configured ? (
                <button
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-red-600 disabled:opacity-40 dark:border-zinc-700"
                  onClick={remove}
                  disabled={busy}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LoginFlow({
  step,
  onCancel,
  onDismiss,
  promptValue,
  manualCodeValue,
  onPromptChange,
  onManualCodeChange,
  onSubmitPrompt,
  onSubmitSelect,
  onSubmitManualCode,
}: {
  step: LogStep;
  onCancel: () => void;
  onDismiss: () => void;
  promptValue: string;
  manualCodeValue: string;
  onPromptChange: (v: string) => void;
  onManualCodeChange: (v: string) => void;
  onSubmitPrompt: () => void;
  onSubmitSelect: (optionId: string | undefined) => void;
  onSubmitManualCode: () => void;
}) {
  if (step.kind === "waiting" || step.kind === "progress") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          {step.kind === "progress" ? step.message : "Starting login…"}
        </div>
        <CancelButton onClick={onCancel} />
      </div>
    );
  }

  if (step.kind === "done") {
    return (
      <div className="space-y-3">
        <div
          className={`rounded-lg px-3 py-2 text-xs ${
            step.ok
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
          }`}
        >
          {step.ok ? (
            "Authorized!"
          ) : (
            <>
              <p className="mb-1 font-medium">Authorization failed</p>
              <p className="font-mono">{step.error ?? "Unknown error"}</p>
            </>
          )}
        </div>
        <button
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          onClick={onDismiss}
        >
          {step.ok ? "Done" : "Try again"}
        </button>
      </div>
    );
  }

  if (step.kind === "deviceCode") {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center dark:border-amber-800 dark:bg-amber-950/30">
          <p className="mb-1 text-xs text-amber-800 dark:text-amber-300">
            Open the browser that just launched and enter this code:
          </p>
          <p className="select-all text-2xl font-bold tracking-widest text-amber-900 dark:text-amber-200">
            {step.userCode}
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            {step.verificationUri}
          </p>
        </div>
        <p className="text-xs text-zinc-500">
          Waiting for authorization
          {step.expiresInSeconds
            ? ` (expires in ${Math.round(step.expiresInSeconds / 60)} min)`
            : ""}
          …
        </p>
        <CancelButton onClick={onCancel} />
      </div>
    );
  }

  if (step.kind === "authUrl") {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            A browser window opened for authorization.
            {step.instructions ? ` ${step.instructions}` : ""}
          </p>
        </div>
        <p className="text-xs text-zinc-500">Waiting for authorization…</p>
        <CancelButton onClick={onCancel} />
      </div>
    );
  }

  if (step.kind === "prompt") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {step.message}
        </p>
        <input
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-500"
          placeholder={step.placeholder ?? ""}
          value={promptValue}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmitPrompt();
          }}
        />
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            onClick={onSubmitPrompt}
            disabled={!step.allowEmpty && !promptValue.trim()}
          >
            Submit
          </button>
          <button
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
            onClick={() => onSubmitSelect(undefined)}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (step.kind === "select") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {step.message}
        </p>
        {step.options.map((o) => (
          <button
            key={o.id}
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            onClick={() => onSubmitSelect(o.id)}
          >
            {o.label}
          </button>
        ))}
        <CancelButton onClick={() => onSubmitSelect(undefined)} />
      </div>
    );
  }

  if (step.kind === "manualCode") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Enter the code from the browser:
        </p>
        <input
          className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
          placeholder="Paste code…"
          value={manualCodeValue}
          onChange={(e) => onManualCodeChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmitManualCode();
          }}
        />
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            onClick={onSubmitManualCode}
            disabled={!manualCodeValue.trim()}
          >
            Submit
          </button>
          <CancelButton onClick={onCancel} />
        </div>
      </div>
    );
  }

  return null;
}

function CancelButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
      onClick={onClick}
    >
      {label ?? "Cancel"}
    </button>
  );
}
