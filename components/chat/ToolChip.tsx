"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ToolChipProps {
  name: string;
  done: boolean;
  isError: boolean;
}

export function ToolChip({ name, done, isError }: ToolChipProps) {
  return (
    <Badge
      variant={isError ? "destructive" : done ? "secondary" : "default"}
      className={cn(
        "font-mono text-[0.6875rem] gap-1.5 rounded-lg px-2.5 py-0.5",
        !done && !isError && "animate-pulse"
      )}
    >
      {done ? (isError ? "✕" : "✓") : "…"} {name}
    </Badge>
  );
}