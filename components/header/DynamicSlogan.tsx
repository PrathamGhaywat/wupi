"use client";

import { useEffect, useState } from "react";
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

export function DynamicSlogan() {
  const [slogan, setSlogan] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("wupi-slogan");
    const today = new Date().toDateString();
    if (stored) {
      try {
        const { slogan: s, date } = JSON.parse(stored);
        if (date === today) {
          setSlogan(s);
          return;
        }
      } catch {}
    }

    const random = SLOGANS[Math.floor(Math.random() * SLOGANS.length)];
    setSlogan(random);
    localStorage.setItem("wupi-slogan", JSON.stringify({ slogan: random, date: today }));
  }, []);

  if (!slogan) return null;

  return (
    <p className="text-sm text-muted-foreground/70 leading-relaxed animate-in fade-in duration-700">
      {slogan}
    </p>
  );
}