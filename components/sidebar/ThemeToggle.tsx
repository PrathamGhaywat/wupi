"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTheme } from "@/components/providers/ThemeProvider";

const THEMES = [
  { value: "light" as const, icon: Sun, label: "Light mode" },
  { value: "dark" as const, icon: Moon, label: "Dark mode" },
  { value: "system" as const, icon: Monitor, label: "System theme" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const current = THEMES.find((t) => t.value === theme) ?? THEMES[2];

  const cycleTheme = () => {
    const idx = THEMES.findIndex((t) => t.value === theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    setTheme(next.value);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip="Toggle theme"
          onClick={cycleTheme}
        >
          <current.icon className="size-4" />
          <span className="text-sm">{theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}