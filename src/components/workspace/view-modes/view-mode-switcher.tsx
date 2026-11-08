import React, { useEffect, useCallback } from "react";
import { List, Kanban, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceViewMode } from "./universal-view-manager";

export interface ViewModeOptionConfig {
  id: WorkspaceViewMode;
  label: string;
  icon: React.ElementType;
  shortcutKey: string;
  tooltip: string;
}

export const CANONICAL_VIEW_MODES: ViewModeOptionConfig[] = [
  {
    id: "table",
    label: "Tabela",
    icon: List,
    shortcutKey: "1",
    tooltip: "Visualização em Tabela (tecla 1)",
  },
  {
    id: "kanban",
    label: "Kanban",
    icon: Kanban,
    shortcutKey: "2",
    tooltip: "Visualização em Kanban (tecla 2)",
  },
  {
    id: "cards",
    label: "Cards",
    icon: LayoutGrid,
    shortcutKey: "3",
    tooltip: "Visualização em Cards (tecla 3)",
  },
];

export interface ViewModeSwitcherProps {
  /** Current active view mode */
  value: WorkspaceViewMode;
  /** Callback fired when view mode changes */
  onChange: (mode: WorkspaceViewMode) => void;
  /** Restrict to a subset of modes (defaults to all canonical modes) */
  allowedModes?: WorkspaceViewMode[];
  /** Enable global numeric shortcut keys 1, 2, 3 (defaults to true) */
  enableKeyboardShortcuts?: boolean;
  /** Optional container className */
  className?: string;
  /** Size variant: default (h-11 on mobile/desktop) or sm (h-9 on desktop, min-h-11 on mobile) */
  size?: "default" | "sm";
}

export function ViewModeSwitcher({
  value,
  onChange,
  allowedModes,
  enableKeyboardShortcuts = true,
  className,
  size = "default",
}: ViewModeSwitcherProps) {
  const effectiveModes = React.useMemo(() => {
    if (!allowedModes || allowedModes.length === 0) {
      return CANONICAL_VIEW_MODES;
    }
    return CANONICAL_VIEW_MODES.filter((m) => allowedModes.includes(m.id));
  }, [allowedModes]);

  // Keyboard shortcut listener (1 = table, 2 = kanban, 3 = cards)
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enableKeyboardShortcuts) return;

      // Guard: Ignore if typing inside text fields, editable areas, or active dialog inputs
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Guard: Ignore if any modifier key is active (Ctrl, Cmd, Alt, Shift)
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return;
      }

      const match = effectiveModes.find((m) => m.shortcutKey === event.key);
      if (match && match.id !== value) {
        event.preventDefault();
        onChange(match.id);
      }
    },
    [enableKeyboardShortcuts, effectiveModes, value, onChange]
  );

  useEffect(() => {
    if (!enableKeyboardShortcuts) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboardShortcuts, handleKeyDown]);

  if (effectiveModes.length <= 1) {
    return null;
  }

  return (
    <div
      role="radiogroup"
      aria-label="Modo de visualização"
      className={cn(
        "inline-flex items-center p-1 rounded-xl bg-muted/40 border border-border/60 select-none shrink-0 gap-1",
        size === "sm" ? "min-h-11 sm:min-h-9" : "min-h-11",
        className
      )}
    >
      {effectiveModes.map((mode) => {
        const Icon = mode.icon;
        const isActive = value === mode.id;

        return (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={mode.tooltip}
            title={mode.tooltip}
            onClick={() => onChange(mode.id)}
            className={cn(
              "flex items-center justify-center gap-2 px-3 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap",
              "transition-colors duration-150 motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              // Mobile touch target >= 44x44px (min-h-11, min-w-11)
              "min-h-11 min-w-11 sm:min-w-0",
              size === "sm" ? "sm:min-h-8 sm:h-8 sm:px-2" : "sm:h-9 sm:px-3",
              isActive
                ? "bg-background text-foreground font-bold shadow-xs border border-border/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
            )}
          >
            <Icon
              className={cn(
                "size-3.5 shrink-0 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span className="hidden sm:inline">{mode.label}</span>
            <kbd
              aria-hidden="true"
              className={cn(
                "hidden md:inline-flex items-center justify-center size-3.5 rounded text-3xs font-mono font-medium leading-none border ml-1",
                isActive
                  ? "bg-muted text-foreground border-border/60"
                  : "bg-muted/50 text-muted-foreground/80 border-border/30"
              )}
            >
              {mode.shortcutKey}
            </kbd>
          </button>
        );
      })}
    </div>
  );
}
