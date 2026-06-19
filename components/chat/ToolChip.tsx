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
        "text-xs font-mono gap-1",
        !done && !isError && "animate-pulse"
      )}
    >
      {done ? (isError ? "✕" : "✓") : "…"} {name}
    </Badge>
  );
}