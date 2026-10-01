/**
 * useFormDraft.ts — Hook Canônico de Autosave e Prevenção de Perda de Dados
 * ─────────────────────────────────────────────────────────────────────────────
 * Salva automaticamente o estado de formulários no localStorage com debounce.
 * Previne perda acidental ao recarregar a página, fechar aba ou rotacionar dispositivo.
 * Fornece status do rascunho, timestamp formatado, restauração e descarte seguro.
 */
import { useEffect, useRef, useState, useCallback } from "react";

const DRAFT_PREFIX = "waesy:form-draft:";
const DEFAULT_AUTOSAVE_DEBOUNCE_MS = 1200;

export type FormDraftStatus = "idle" | "saving" | "saved" | "error";

export interface FormDraftPayload<T> {
  formId: string;
  savedAt: string; // ISO string
  data: T;
}

export interface UseFormDraftOptions<T extends Record<string, unknown>> {
  formId: string;
  formData: T;
  onRestore?: (data: T) => void;
  disabled?: boolean;
  debounceMs?: number;
}

export function useFormDraft<T extends Record<string, unknown>>({
  formId,
  formData,
  onRestore,
  disabled = false,
  debounceMs = DEFAULT_AUTOSAVE_DEBOUNCE_MS,
}: UseFormDraftOptions<T>) {
  const storageKey = `${DRAFT_PREFIX}${formId}`;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<FormDraftStatus>("idle");
  const [draftTimestamp, setDraftTimestamp] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState<boolean>(false);

  // Verifica rascunho existente no mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: FormDraftPayload<T> = JSON.parse(raw);
        setHasDraft(true);
        setDraftTimestamp(new Date(parsed.savedAt));
      }
    } catch {
      // Ignora erro de JSON malformado
    }
  }, [storageKey]);

  // Salva automaticamente com debounce quando formData mudar
  useEffect(() => {
    if (disabled || !formId) return;

    // Não persiste formulários vazios
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
        const payload: FormDraftPayload<T> = {
          formId,
          savedAt: new Date().toISOString(),
          data: formData,
        };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        setDraftTimestamp(new Date(payload.savedAt));
        setHasDraft(true);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formData, formId, storageKey, disabled, debounceMs]);

  const restoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed: FormDraftPayload<T> = JSON.parse(raw);
      if (onRestore) onRestore(parsed.data);
    } catch {
      // Ignora falha de restauração
    }
  }, [storageKey, onRestore]);

  const discardDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setHasDraft(false);
      setDraftTimestamp(null);
      setSaveStatus("idle");
    } catch {
      // Ignora erro
    }
  }, [storageKey]);

  const clearDraftAfterSubmit = useCallback(() => {
    discardDraft();
  }, [discardDraft]);

  return {
    saveStatus,
    draftTimestamp,
    hasDraft,
    restoreDraft,
    discardDraft,
    clearDraftAfterSubmit,
  };
}

/**
 * Formata o timestamp de salvamento do rascunho de forma humana.
 */
export function formatFormDraftTimestamp(ts: Date | null): string {
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
