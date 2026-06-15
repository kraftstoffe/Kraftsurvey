"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";

type ThemeToggleProps = {
  className?: string;
  showLabel?: boolean;
};

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={cn(showLabel ? "sidebar-link w-full" : "btn-ghost p-2", className)}
      onClick={toggleTheme}
      aria-label={isDark ? "Light Theme aktivieren" : "Dark Theme aktivieren"}
      title={isDark ? "Light Theme" : "Dark Theme"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
      {showLabel && (isDark ? "Light Theme" : "Dark Theme")}
    </button>
  );
}
