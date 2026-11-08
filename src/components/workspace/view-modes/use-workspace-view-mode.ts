import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
  let navigate: any = null;
  try {
    navigate = useNavigate();
  } catch {
    navigate = null;
  }

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
        if (navigate) {
          try {
            navigate({
              search: (prev: any) => ({
                ...(typeof prev === "object" ? prev : {}),
                view: valid,
              }),
              replace: true,
            } as any);
          } catch {
            try {
              const url = new URL(window.location.href);
              url.searchParams.set("view", valid);
              window.history.replaceState(null, "", url.toString());
            } catch {}
          }
        } else {
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
