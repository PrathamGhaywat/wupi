"use client";

import { useCallback, useState, useMemo } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { WupiModelInfo } from "@/app/types";

interface ModelPickerProps {
  models: WupiModelInfo[];
  currentModel: string;
  onModelChange: (provider: string, modelId: string) => void;
  disabled: boolean;
}

export function ModelPicker({ models, currentModel, onModelChange, disabled }: ModelPickerProps) {
  const [open, setOpen] = useState(false);

  const currentModelObj = useMemo(
    () => models.find((m) => `${m.provider}/${m.id}` === currentModel),
    [models, currentModel]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, WupiModelInfo[]>();
    for (const m of models) {
      const arr = map.get(m.providerDisplayName) ?? [];
      arr.push(m);
      map.set(m.providerDisplayName, arr);
    }
    return map;
  }, [models]);

  const handleSelect = useCallback(
    (value: string) => {
      const [provider, ...rest] = value.split("/");
      onModelChange(provider, rest.join("/"));
      setOpen(false);
    },
    [onModelChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between rounded-xl px-3 font-normal shadow-sm"
        >
          <span className="truncate">
            {currentModelObj
              ? `${currentModelObj.name}`
              : "Select a model…"}
          </span>
          <ChevronsUpDownIcon className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] rounded-xl p-0 shadow-elevated" align="start">
        <Command>
          <CommandInput placeholder="Search models…" />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            {[...grouped.entries()].map(([providerName, ms]) => (
              <CommandGroup key={providerName} heading={providerName}>
                {ms.map((m) => (
                  <CommandItem
                    key={`${m.provider}/${m.id}`}
                    value={`${m.provider}/${m.id}`}
                    keywords={[m.providerDisplayName, m.provider, m.name, m.id]}
                    onSelect={handleSelect}
                  >
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <span className="truncate">{m.name}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground uppercase tracking-wider">
                        {m.providerDisplayName}
                      </span>
                      {m.configured ? null : (
                        <span className="shrink-0 text-[10px] text-muted-foreground">no key</span>
                      )}
                    </div>
                    <CheckIcon
                      className={`ml-auto size-3.5 shrink-0 ${
                        currentModel === `${m.provider}/${m.id}` ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}