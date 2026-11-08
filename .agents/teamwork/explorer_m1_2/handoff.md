# Handoff Report: Explorer M1_2 — Polymorphic UniversalViewManager & ViewModeSwitcher

- **Timestamp**: 2026-11-04T04:42:00Z
- **Subagent**: Explorer M1_2 (Role: Component Contracts & View Modes Explorer)
- **Parent**: 71cb6393-bf04-4e51-946b-1dd9ac61e734
- **Working Directory**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_m1_2\`
- **Milestone**: Milestone M1 — Feature 3 (UniversalViewManager & ViewModeSwitcher)

---

## 1. Observation

### 1.1 Existing Component Inventory & Architectural Findings

1. **`src/components/workspace/workspace-canonical-toolbar.tsx` (Lines 1-475)**:
   - Contains a two-tier architecture:
     - **Tier 1 (Lines 167-252)**: Abas segmentadas Apple HIG (`waesy-tab-strip flex items-center p-1 rounded-lg bg-muted/40 border border-border/60 gap-1 min-h-11 focus-visible:...`) with active contrast `bg-background text-foreground font-bold` vs `text-muted-foreground`. Right side contains `handleColumns` (Settings2) and `handleDashboard` (BarChart3).
     - **Tier 2 (Lines 254-461)**: Search input with clear button, mobile `FilterTriggerButton` opening `FilterBottomSheet`, desktop `Select` dropdowns, secondary actions, and single primary action CTA.
   - Currently, several routes conflate domain filters/status tabs with view modes within Tier 1 (e.g. `workspace.clientes.index.tsx` places "Todos", "Ativos", "PF", "PJ" into tabs).
   - Currently lacks a dedicated, reusable `viewSwitcher` slot to host a standardized Table / Kanban / Cards switcher.

2. **`src/components/workspace/kanban/full-viewport-kanban.tsx` (Lines 1-105)**:
   - Canonical kanban presentation engine:
     - Outer scroll container: `tab-list flex gap-4 sm:gap-4 items-stretch flex-1 pb-4 overflow-x-auto no-scrollbar select-none`.
     - Column container: `flex flex-col h-full shrink-0 rounded-3xl border border-border/60 bg-muted/40 overflow-hidden w-72 sm:w-80`.
     - Column header with color pill, title, count badge, optional `headerAction`.
     - Card container: `flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-3`.
     - Empty state per column when `items.length === 0`.
   - Complementary component `src/components/workspace/kanban/niche-kanban-board.tsx` consumes `FullViewportKanban` using Single Sovereign Surface cards (`rounded-2xl border border-border/60 bg-card hover:border-foreground/25 focus-visible:ring-2`).

3. **`src/components/ui/table.tsx` (Lines 1-127)**:
   - Canonical table primitives: `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`.
   - Supports `windowVariant` (`compact`, `expanded`, `auto`). In `auto`, container has `relative w-full overflow-x-auto scroll-area-carousel no-scrollbar rounded-lg border border-border/50`.
   - `TableRow` has `min-h-11 sm:h-9` (respects DL-14 44px touch target on mobile and 36px high density on desktop).
   - `TableHead` uses `h-9 sm:h-10 px-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider`.
   - `TableCell` uses `px-3 py-3 sm:py-2 align-middle text-foreground font-mono tabular-nums` (when numeric).

4. **Existing View Mode Implementations across Workspace Routes**:
   - `src/routes/workspace.pedidos.index.tsx` (Lines 46, 104-140, 360-383): Ad-hoc local switcher with buttons for `table`, `kitchen`, `picking`, `emissions`, `service_flow` with `size-3.5` icons and local `useState`.
   - `src/routes/workspace.clientes.index.tsx` (Lines 177-257): Only renders `Table` view; lacks Kanban (lead funnel) and Cards views.
   - `src/routes/workspace.tarefas.tsx` (Lines 56, 191-230): Conflates `my-day`, `kanban`, `list`, `calendar` in `activeTab` state.
   - `src/routes/workspace.agenda.index.tsx` (Lines 116): Uses binary toggle `daily` vs `heatmap`.
   - None of these routes currently synchronize their view modes to the URL query string (`?view=table|kanban|cards`) or persistent storage (`workspace_user_view_preferences`), leading to lost user context on page refresh.

5. **Design Tokens & Design Lint Constraints**:
   - `AGENTS.md` Rule B.4 & B.26: Touch targets must be >= 44x44px (`h-11 min-h-11`) on mobile and primary controls. Focus visible `:focus-visible:ring-2` required on all interactive elements (DL-15).
   - DL-31: Single Sovereign Surface rule prohibits card inside card (containeritis).
   - DL-32: Max 2 columns for horizontal cards on desktop (`grid-cols-1 lg:grid-cols-2`).
   - DL-01 & DL-18: Prohibits raw `#HEX`, `rgb()`, `text-white`, `text-black`.
   - DL-27 & DL-28: Prohibits `transition-all`; requires property-specific transitions (`transition-colors`, `transition-opacity`) and `motion-reduce:transition-none`.

---

## 2. Logic Chain

1. **Need for Polymorphic `UniversalViewManager<T>`**:
   - Each operational workspace domain (Agenda, Clientes, Pedidos, Tarefas) deals with domain-specific entities (`AppointmentDTO`, `CustomerDTO`, `OrderDTO`, `WorkspaceTask`), but shares the exact same operational requirement: allow operators to switch seamlessly between tabular inspection, stage pipeline (Kanban), and rich entity cards.
   - By creating a polymorphic generic component `UniversalViewManager<T>`, we decouple view layout governance from domain data rendering. The manager enforces the complete 4-state matrix (Data, Loading skeleton, Empty state, Error state with retry) without duplicating loading/empty logic across 4+ routes.
   - To satisfy DL-31, `UniversalViewManager` acts as an unadorned layout conductor (`w-full flex-1 flex flex-col min-h-0`), allowing the individual renderers (`renderTable`, `renderKanban`, `renderCards`) to be the single sovereign surface.

2. **Need for Dedicated `ViewModeSwitcher`**:
   - The switcher must be a compact, Apple HIG-compliant segmented pill control.
   - It requires icons for visual identification: `List` (Table), `Kanban` (Kanban), and `LayoutGrid` (Cards) from `lucide-react`.
   - Ergonomics demand instant keyboard shortcuts (`1` for Table, `2` for Kanban, `3` for Cards), common in high-productivity workstations (Linear, Superhuman).
   - The keyboard listener must be strictly guarded: it must never hijack keystrokes when the user is typing in inputs, textareas, selects, contenteditable elements, or active dialog forms, nor when modifier keys (`Ctrl`, `Cmd`, `Alt`, `Shift`) are held.
   - For mobile touch ergonomics (DL-14 / WCAG 2.5.8), buttons must have `min-h-11 min-w-11` (44px) touch targets, while displaying responsive labels (`hidden sm:inline`) and desktop keyboard badges (`<kbd>`).

3. **URL Query Synchronization & Local Storage Fallback Hierarchy**:
   - The hierarchy of truth is deterministic:
     $$\text{Active View} = \text{URL Query } (?view=...) \succ \text{LocalStorage } (\text{waesy\_view\_pref\_*}) \succ \text{Default Mode } (\text{"table"})$$
   - When a user changes view mode via click or keyboard shortcut:
     1. Local state updates immediately for zero-latency UI response.
     2. LocalStorage writes synchronously to maintain persistence across sessions.
     3. TanStack Router executes `navigate({ search: (prev) => ({ ...prev, view: mode }), replace: true })`. The `replace: true` flag is mandatory to prevent pollutive history entries on back-button navigation.
   - Encapsulating this logic into a custom hook `useWorkspaceViewMode` provides a clean 3-line integration for all routes.

---

## 3. Caveats

1. **Route-Level `validateSearch`**:
   - While `useWorkspaceViewMode` uses `window.location.search` fallback defensively, for full TanStack Router type safety, downstream routes should declare `view: z.enum(["table", "kanban", "cards"]).optional()` in their `validateSearch` config.
2. **Domain-Specific Extensibility**:
   - Some domains (e.g. Agenda) also utilize a `"calendar"` mode, while Pedidos may utilize specialized views (`"kitchen"` / `"picking"`). The `ViewModeSwitcher` accepts `allowedModes?: WorkspaceViewMode[]` and can be extended with an optional `"calendar"` mode if needed, while keeping the core canonical triad (`table`, `kanban`, `cards`).
3. **Read-Only Explorer Boundary**:
   - No production application code or routes have been modified during this exploration. The specifications below are ready for immediate, drop-in implementation by the Worker.

---

## 4. Conclusion & Concrete Code Specifications

The Worker should create the new directory `src/components/workspace/view-modes/` containing:
1. `universal-view-manager.tsx`
2. `view-mode-switcher.tsx`
3. `use-workspace-view-mode.ts`
4. `index.ts`
5. Vitest tests in `__tests__/`

### 4.1 Specification: `src/components/workspace/view-modes/universal-view-manager.tsx`

```tsx
import React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState } from "@/components/state/states";

export type WorkspaceViewMode = "table" | "kanban" | "cards";

export interface UniversalViewManagerProps<T> {
  /** Active view mode to display */
  currentView: WorkspaceViewMode;
  /** Optional callback fired when the view mode is changed */
  onViewChange?: (mode: WorkspaceViewMode) => void;
  /** Primary dataset */
  data: T[];
  /** Render function for dense tabular representation */
  renderTable: (items: T[]) => React.ReactNode;
  /** Render function for column-based pipeline / kanban representation */
  renderKanban: (items: T[]) => React.ReactNode;
  /** Render function for card/grid representation */
  renderCards: (items: T[]) => React.ReactNode;
  /** Optional custom empty state node */
  emptyState?: React.ReactNode;
  /** Empty state title override */
  emptyTitle?: string;
  /** Empty state description override */
  emptyDescription?: string;
  /** Empty state primary action button label */
  emptyActionLabel?: string;
  /** Empty state primary action button callback */
  onEmptyAction?: () => void;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Optional custom skeleton renderer */
  renderSkeleton?: () => React.ReactNode;
  /** Error state indicator */
  isError?: boolean;
  /** Error object or message */
  error?: Error | string | null;
  /** Callback to retry query when in error state */
  onRetry?: () => void;
  /** Custom wrapper class */
  className?: string;
}

export function UniversalViewManager<T>({
  currentView,
  onViewChange,
  data,
  renderTable,
  renderKanban,
  renderCards,
  emptyState,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  isLoading = false,
  renderSkeleton,
  isError = false,
  error,
  onRetry,
  className,
}: UniversalViewManagerProps<T>) {
  // 1. Error State
  if (isError) {
    const errorMessage = typeof error === "string" ? error : error?.message;
    return (
      <div className={cn("w-full flex-1 flex flex-col justify-center items-center py-8", className)}>
        <ErrorState
          title="Erro ao carregar dados"
          description={errorMessage || "Não foi possível carregar os registros. Tente novamente."}
          onRetry={onRetry}
        />
      </div>
    );
  }

  // 2. Loading State (Custom skeleton or built-in auto skeleton per view mode)
  if (isLoading) {
    if (renderSkeleton) {
      return (
        <div className={cn("w-full flex-1 flex flex-col", className)}>
          {renderSkeleton()}
        </div>
      );
    }

    return (
      <div className={cn("w-full flex-1 flex flex-col", className)}>
        {currentView === "table" && <DefaultTableSkeleton />}
        {currentView === "kanban" && <DefaultKanbanSkeleton />}
        {currentView === "cards" && <DefaultCardsSkeleton />}
      </div>
    );
  }

  // 3. Empty State (Honest, clean empty state complying with DL-12)
  if (!data || data.length === 0) {
    if (emptyState) {
      return (
        <div className={cn("w-full flex-1 flex flex-col justify-center items-center py-8", className)}>
          {emptyState}
        </div>
      );
    }

    return (
      <div className={cn("w-full flex-1 flex flex-col justify-center items-center py-8", className)}>
        <EmptyState
          title={emptyTitle || "Nenhum registro encontrado"}
          description={emptyDescription || "Não há itens para exibir neste filtro ou visualização."}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
          minimal
        />
      </div>
    );
  }

  // 4. Content State (Single Sovereign Surface - zero containeritis)
  return (
    <div
      className={cn(
        "w-full flex-1 flex flex-col min-h-0 transition-opacity duration-150 motion-reduce:transition-none",
        className
      )}
    >
      {currentView === "table" && renderTable(data)}
      {currentView === "kanban" && renderKanban(data)}
      {currentView === "cards" && renderCards(data)}
      {currentView !== "table" && currentView !== "kanban" && currentView !== "cards" && renderTable(data)}
    </div>
  );
}

function DefaultTableSkeleton() {
  return (
    <div className="w-full rounded-lg border border-border/50 overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/40 bg-muted/30">
            <TableHead className="w-12 h-10"><Skeleton className="size-4 rounded" /></TableHead>
            <TableHead className="w-1/4 h-10"><Skeleton className="h-4 w-28 rounded" /></TableHead>
            <TableHead className="w-1/4 h-10"><Skeleton className="h-4 w-24 rounded" /></TableHead>
            <TableHead className="w-1/4 h-10"><Skeleton className="h-4 w-20 rounded" /></TableHead>
            <TableHead className="w-1/6 h-10 text-right"><Skeleton className="h-4 w-16 ml-auto rounded" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[0, 1, 2, 3, 4].map((i) => (
            <TableRow key={i} className="min-h-11 sm:h-9 border-b border-border/40">
              <TableCell className="w-12"><Skeleton className="size-4 rounded" /></TableCell>
              <TableCell><Skeleton className="h-4 w-3/4 rounded" /></TableCell>
              <TableCell><Skeleton className="h-4 w-1/2 rounded" /></TableCell>
              <TableCell><Skeleton className="h-4 w-2/3 rounded" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto rounded" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DefaultKanbanSkeleton() {
  return (
    <div className="flex gap-4 items-stretch flex-1 pb-4 overflow-x-auto no-scrollbar">
      {[0, 1, 2].map((col) => (
        <div key={col} className="w-72 sm:w-80 shrink-0 rounded-3xl border border-border/60 bg-muted/40 p-3 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          {[0, 1, 2].map((card) => (
            <div key={card} className="p-4 rounded-2xl border border-border/60 bg-card space-y-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="size-6 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DefaultCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 rounded-2xl border border-border/60 bg-card space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          </div>
          <Skeleton className="h-12 w-full rounded" />
          <div className="flex justify-between items-center pt-1 border-t border-border/40">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### 4.2 Specification: `src/components/workspace/view-modes/view-mode-switcher.tsx`

```tsx
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
              "flex items-center justify-center gap-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap",
              "transition-colors duration-150 motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              // Mobile touch target >= 44x44px (min-h-11, min-w-11)
              "min-h-11 min-w-11 sm:min-w-0",
              size === "sm" ? "sm:min-h-8 sm:h-8 sm:px-2.5" : "sm:h-9 sm:px-3",
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
                "hidden md:inline-flex items-center justify-center size-3.5 rounded text-3xs font-mono font-medium leading-none border ml-0.5",
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
```

---

### 4.3 Specification: `src/components/workspace/view-modes/use-workspace-view-mode.ts`

```tsx
import { useCallback, useEffect, useState } from "react";
import { useRouter, useNavigate } from "@tanstack/react-router";
import type { WorkspaceViewMode } from "./universal-view-manager";

export interface UseWorkspaceViewModeOptions {
  /** Identifier of the workspace module (agenda, clientes, pedidos, tarefas, etc.) */
  module: "agenda" | "clientes" | "pedidos" | "tarefas" | "financeiro" | "turismo" | string;
  /** Active tenant / store id for scoped local storage preference */
  storeId?: string;
  /** Initial fallback view mode if not in URL or localStorage (default: "table") */
  defaultMode?: WorkspaceViewMode;
  /** Allowed view modes for this screen (default: ["table", "kanban", "cards"]) */
  allowedModes?: WorkspaceViewMode[];
  /** Whether to sync view mode into URL query ?view=... (default: true) */
  syncWithUrl?: boolean;
  /** Whether to sync view mode into localStorage (default: true) */
  syncWithStorage?: boolean;
}

export interface UseWorkspaceViewModeReturn {
  currentView: WorkspaceViewMode;
  setViewMode: (mode: WorkspaceViewMode) => void;
  allowedModes: WorkspaceViewMode[];
}

export function useWorkspaceViewMode({
  module,
  storeId,
  defaultMode = "table",
  allowedModes = ["table", "kanban", "cards"],
  syncWithUrl = true,
  syncWithStorage = true,
}: UseWorkspaceViewModeOptions): UseWorkspaceViewModeReturn {
  const navigate = useNavigate();

  // Storage key scoped to tenant and module
  const storageKey = `waesy_view_pref_${module}_${storeId || "global"}`;

  // Helper to validate mode against allowed list
  const sanitizeMode = useCallback(
    (val: unknown): WorkspaceViewMode | null => {
      if (typeof val === "string" && (allowedModes as string[]).includes(val)) {
        return val as WorkspaceViewMode;
      }
      return null;
    },
    [allowedModes]
  );

  // Read URL query parameter defensively
  const readUrlView = useCallback((): WorkspaceViewMode | null => {
    if (!syncWithUrl || typeof window === "undefined") return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlView = params.get("view");
      return sanitizeMode(urlView);
    } catch {
      return null;
    }
  }, [syncWithUrl, sanitizeMode]);

  // Read localStorage defensively
  const readStorageView = useCallback((): WorkspaceViewMode | null => {
    if (!syncWithStorage || typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(storageKey);
      return sanitizeMode(stored);
    } catch {
      return null;
    }
  }, [syncWithStorage, storageKey, sanitizeMode]);

  // Initial resolution: URL > localStorage > defaultMode
  const [currentView, setCurrentViewState] = useState<WorkspaceViewMode>(() => {
    const fromUrl = readUrlView();
    if (fromUrl) return fromUrl;
    const fromStorage = readStorageView();
    if (fromStorage) return fromStorage;
    return defaultMode;
  });

  // Keep state in sync if URL changes externally (e.g. back/forward navigation)
  useEffect(() => {
    if (!syncWithUrl || typeof window === "undefined") return;

    const handlePopState = () => {
      const urlView = readUrlView();
      if (urlView && urlView !== currentView) {
        setCurrentViewState(urlView);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [syncWithUrl, readUrlView, currentView]);

  // Public setter that persists and updates URL
  const setViewMode = useCallback(
    (mode: WorkspaceViewMode) => {
      const valid = sanitizeMode(mode) || defaultMode;
      setCurrentViewState(valid);

      // Persist to localStorage
      if (syncWithStorage && typeof window !== "undefined") {
        try {
          localStorage.setItem(storageKey, valid);
        } catch (e) {
          console.warn("[useWorkspaceViewMode] Failed to save view preference:", e);
        }
      }

      // Sync to URL with replace: true to avoid history clutter
      if (syncWithUrl && typeof window !== "undefined") {
        try {
          navigate({
            search: (prev: any) => ({
              ...(typeof prev === "object" ? prev : {}),
              view: valid,
            }),
            replace: true,
          } as any);
        } catch {
          // Fallback if router context is not mounted
          try {
            const url = new URL(window.location.href);
            url.searchParams.set("view", valid);
            window.history.replaceState(null, "", url.toString());
          } catch {}
        }
      }
    },
    [sanitizeMode, defaultMode, syncWithStorage, storageKey, syncWithUrl, navigate]
  );

  return {
    currentView,
    setViewMode,
    allowedModes,
  };
}
```

---

### 4.4 Specification: `src/components/workspace/view-modes/index.ts`

```tsx
export { UniversalViewManager, type UniversalViewManagerProps, type WorkspaceViewMode } from "./universal-view-manager";
export { ViewModeSwitcher, type ViewModeSwitcherProps, type ViewModeOptionConfig, CANONICAL_VIEW_MODES } from "./view-mode-switcher";
export { useWorkspaceViewMode, type UseWorkspaceViewModeOptions, type UseWorkspaceViewModeReturn } from "./use-workspace-view-mode";
```

And re-export from `src/components/workspace/index.ts`:
```tsx
export * from "./view-modes";
```

---

### 4.5 Integration into `WorkspaceCanonicalToolbar`

In `src/components/workspace/workspace-canonical-toolbar.tsx`:
Add optional prop:
```tsx
export interface WorkspaceCanonicalToolbarProps {
  // ... existing props ...
  /** Seletor de Modo de Visualização Canônico (Tabela / Kanban / Cards) */
  viewSwitcher?: React.ReactNode;
}
```
And inside Tier 1 right cluster (lines 214-250):
```tsx
{/* LADO DIREITO DO TIER 1: View Switcher, Métricas & Customização de Colunas */}
{(viewSwitcher || handleDashboard || handleColumns) && (
  <div className="flex items-center gap-2 shrink-0 justify-end">
    {viewSwitcher && <div className="shrink-0">{viewSwitcher}</div>}
    {handleColumns && ( ... )}
    {handleDashboard && ( ... )}
  </div>
)}
```

---

## 5. Verification Method

Downstream Worker and QA can verify this implementation independently with the following procedures:

1. **Vitest Unit Test Suite**:
   Execute `npx vitest run src/components/workspace/view-modes/__tests__/` covering:
   - Rendering `Table`, `Kanban`, and `Cards` views correctly when `currentView` changes.
   - Verifying `isLoading=true` renders skeletons with zero CLS.
   - Verifying `data=[]` renders honest `EmptyState` without containeritis.
   - Verifying `isError=true` renders `ErrorState` and calls `onRetry`.
   - Verifying `ViewModeSwitcher` renders buttons with `min-h-11` on mobile.
   - Verifying keyboard shortcuts `1`, `2`, `3` trigger `onChange` when focused on body, but NOT when typing inside `<input>` or `<textarea>`.
   - Verifying `useWorkspaceViewMode` initializes from URL query string, updates localStorage, and calls router `navigate` with `replace: true`.

2. **Design Lint Ratchet**:
   Run `node scripts/design-lint.mjs --ratchet` to verify 0 new violations of DL-01 (colors), DL-02 (brackets), DL-03 (spacing), DL-14 (touch targets >=44px), DL-15 (focus visible), DL-28 (motion-reduce), DL-31 (containeritis), DL-32 (grid).

3. **TypeScript Compilation Quality Gate**:
   Run `cmd /c npm run typecheck` to confirm 0 compilation errors across all generic interfaces.

4. **Production Build Quality Gate**:
   Run `cmd /c npm run build` to verify clean rollup bundling and worker generation with exit code 0.
