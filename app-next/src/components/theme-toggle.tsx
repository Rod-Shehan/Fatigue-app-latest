"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className, iconClassName }: { className?: string; iconClassName?: string } = {}) {
  const { resolved, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-11 w-11 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
        className
      )}
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
      title={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {resolved === "dark" ? (
        <Sun className={cn("h-6 w-6", iconClassName)} />
      ) : (
        <Moon className={cn("h-6 w-6", iconClassName)} />
      )}
    </Button>
  );
}
