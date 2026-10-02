/**
 * useClassifiedsDraft.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Autosave hook for classified ad forms.
 * Persists form state to localStorage keyed by nicho slug.
 * Shows save timestamp, supports restore and discard.
 *
 * Usage:
 *   const { saveStatus, restoreDraft, discardDraft, hasDraft, draftTimestamp } =
 *     useClassifiedsDraft({ nicheId, formState, setters });
 */
import { useEffect, useRef, useState, useCallback } from "react";

const DRAFT_PREFIX = "waesy:classified-draft:";
const AUTOSAVE_DEBOUNCE_MS = 1500;

export type DraftSaveStatus = "idle" | "saving" | "saved" | "error";

export interface DraftPayload {
  nicheId: string;
  savedAt: string; // ISO string
  data: Record<string, unknown>;
}

interface UseClassifiedsDraftOptions {
  nicheId: string;
  /**
   * A plain object with all the current form values.
   * The hook watches this for changes and debounce-saves.
   */
  formData: Record<string, unknown>;
  /**
   * Optional: Called when restoreDraft() is invoked,
   * with the stored data so the parent can rehydrate state.
   */
  onRestore?: (data: Record<string, unknown>) => void;
  /** Disable autosave entirely (e.g., during publish) */
  disabled?: boolean;
}

export function useClassifiedsDraft({
  nicheId,
  formData,
  onRestore,
  disabled = false,
}: UseClassifiedsDraftOptions) {
  const storageKey = `${DRAFT_PREFIX}${nicheId}`;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>("idle");
  const [draftTimestamp, setDraftTimestamp] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState<boolean>(false);

  // Check for existing draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: DraftPayload = JSON.parse(raw);
        setHasDraft(true);
        setDraftTimestamp(new Date(parsed.savedAt));
      }
    } catch {
      // silently ignore malformed draft
    }
  }, [storageKey]);

  // Autosave on formData change
  useEffect(() => {
    if (disabled || !nicheId) return;

    // Don't save if form is essentially empty (all falsy values)
    const hasContent = Object.values(formData).some((v) => {
      if (typeof v === "string") return v.trim().length > 0;
      if (Array.isArray(v)) return v.length > 0;
      if (typeof v === "number") return v > 0;
      return Boolean(v);
    });
    if (!hasContent) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    setSaveStatus("saving");

    debounceRef.current = setTimeout(() => {
      try {
        const payload: DraftPayload = {
          nicheId,
          savedAt: new Date().toISOString(),
          data: formData,
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        const ts = new Date(payload.savedAt);
        setDraftTimestamp(ts);
        setHasDraft(true);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formData, nicheId, storageKey, disabled]);

  const restoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed: DraftPayload = JSON.parse(raw);
      if (onRestore) onRestore(parsed.data);
    } catch {
      // silently ignore
    }
  }, [storageKey, onRestore]);

  const discardDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      setDraftTimestamp(null);
      setSaveStatus("idle");
    } catch {
      // silently ignore
    }
  }, [storageKey]);

  /** Call this when the ad is successfully published */
  const clearDraftAfterPublish = useCallback(() => {
    discardDraft();
  }, [discardDraft]);

  return {
    saveStatus,
    draftTimestamp,
    hasDraft,
    restoreDraft,
    discardDraft,
    clearDraftAfterPublish,
  };
}

/**
 * Format the draft timestamp for display.
 * Returns: "Rascunho salvo às 14:35" or "Rascunho salvo ontem às 22:10"
 */
export function formatDraftTimestamp(ts: Date | null): string {
  if (!ts) return "";
  const now = new Date();
  const isToday =
    ts.getDate() === now.getDate() &&
    ts.getMonth() === now.getMonth() &&
    ts.getFullYear() === now.getFullYear();

  const time = ts.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (isToday) return `Salvo às ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    ts.getDate() === yesterday.getDate() &&
    ts.getMonth() === yesterday.getMonth() &&
    ts.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Salvo ontem às ${time}`;

  return `Salvo em ${ts.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${time}`;
}
