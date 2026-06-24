"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SLOGANS = [
  "Code like nobody's watching",
  "Your AI pair programmer",
  "Ship faster, think deeper",
  "Where context meets code",
  "Build with intelligence",
  "Think less, create more",
  "Your code, amplified",
  "From idea to production",
  "Smart tools for smart devs",
  "Elevate your workflow",
];

export function AppLoader() {
  const [showLoader, setShowLoader] = useState(true);
  const [slogan, setSlogan] = useState("");

  useEffect(() => {
    const randomSlogan = SLOGANS[Math.floor(Math.random() * SLOGANS.length)];
    setSlogan(randomSlogan);

    const checkReady = () => {
      if (typeof window !== "undefined" && window.electronAPI) {
        setShowLoader(false);
      }
    };

    checkReady();
    const interval = setInterval(checkReady, 100);
    return () => clearInterval(interval);
  }, []);

  if (!showLoader) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center",
        "bg-background"
      )}
      role="status"
      aria-label="Loading Wupi"
    >
      <div className="flex flex-col items-center gap-8">
        <div className="relative size-20">
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-primary/10" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-primary border-t-transparent [animation-duration:0.8s]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl text-primary">🜂</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center max-w-sm px-4">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Wupi
          </h1>
          <p className="text-sm text-muted-foreground animate-pulse leading-relaxed">
            {slogan}
          </p>
        </div>

        <div className="flex items-center gap-2 w-56">
          <Skeleton className="h-1.5 flex-1 rounded-full" />
          <Skeleton className="h-1.5 flex-1 rounded-full [animation-delay:0.1s]" />
          <Skeleton className="h-1.5 flex-1 rounded-full [animation-delay:0.2s]" />
          <Skeleton className="h-1.5 flex-1 rounded-full [animation-delay:0.3s]" />
        </div>
      </div>
    </div>
  );
}