"use client";

import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WupiModelInfo } from "@/app/types";

interface ModelPickerProps {
  models: WupiModelInfo[];
  currentModel: string;
  onModelChange: (provider: string, modelId: string) => void;
  disabled: boolean;
}

export function ModelPicker({ models, currentModel, onModelChange, disabled }: ModelPickerProps) {
  const grouped = new Map<string, WupiModelInfo[]>();
  for (const m of models) {
    const arr = grouped.get(m.providerDisplayName) ?? [];
    arr.push(m);
    grouped.set(m.providerDisplayName, arr);
  }

  const handleChange = useCallback(
    (value: string) => {
      const [provider, ...rest] = value.split("/");
      onModelChange(provider, rest.join("/"));
    },
    [onModelChange]
  );

  return (
    <Select value={currentModel} onValueChange={handleChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a model…" />
      </SelectTrigger>
      <SelectContent>
        {[...grouped.entries()].map(([providerName, ms]) => (
          <SelectGroup key={providerName}>
            <SelectLabel>{providerName}</SelectLabel>
            {ms.map((m) => (
              <SelectItem
                key={`${m.provider}/${m.id}`}
                value={`${m.provider}/${m.id}`}
              >
                {m.name} {m.configured ? "" : "(no key)"}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}