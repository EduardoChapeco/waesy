/**
 * ============================================================================
 * Waesy Platform — InAppNumericKeypad.tsx (Anti-Jank In-App Keypad)
 * ============================================================================
 * Teclado numérico in-app projetado para entrada financeira de alta ergonomia:
 * - Elimina 100% da distorção de viewport provocada pelo teclado virtual do iOS/Android (CLS = 0.00).
 * - Modela o padrão ATM/Bancário brasileiro: digitação direta em centavos (R$ 0,00 -> R$ 0,05 -> R$ 1,50).
 * - Teclas com alvos amplos (h-14 min-h-14) no polegar ergonômico.
 * - Feedback háptico suave (navigator.vibrate) e anéis de foco para navegação assistiva.
 * ============================================================================
 */

import React from "react";
import { Delete, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InAppNumericKeypadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
  className?: string;
  disabled?: boolean;
}

export function InAppNumericKeypad({
  onDigit,
  onBackspace,
  onClear,
  className,
  disabled = false,
}: InAppNumericKeypadProps) {
  const triggerHaptic = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(8);
      } catch {
        // Ignora silenciosamente se o dispositivo não suportar
      }
    }
  };

  const handlePress = (digit: string) => {
    if (disabled) return;
    triggerHaptic();
    onDigit(digit);
  };

  const handleBackspace = () => {
    if (disabled) return;
    triggerHaptic();
    onBackspace();
  };

  const handleClear = () => {
    if (disabled) return;
    triggerHaptic();
    onClear?.();
  };

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["clear", "0", "backspace"],
  ];

  return (
    <div
      className={cn(
        "w-full max-w-sm mx-auto select-none space-y-2 p-1",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {keys.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid grid-cols-3 gap-2">
          {row.map((k) => {
            if (k === "clear") {
              return (
                <button
                  key="key-clear"
                  type="button"
                  onClick={handleClear}
                  aria-label="Limpar valor"
                  className="h-14 min-h-14 rounded-2xl border border-transparent hover:border-border/60 hover:bg-muted/40 active:bg-muted/80 active:scale-95 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Limpar
                </button>
              );
            }

            if (k === "backspace") {
              return (
                <button
                  key="key-backspace"
                  type="button"
                  onClick={handleBackspace}
                  aria-label="Apagar dígito"
                  className="h-14 min-h-14 rounded-2xl border border-transparent hover:border-border/60 hover:bg-muted/40 active:bg-muted/80 active:scale-95 text-foreground flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Delete className="size-6 text-foreground/80" />
                </button>
              );
            }

            return (
              <button
                key={`key-${k}`}
                type="button"
                onClick={() => handlePress(k)}
                aria-label={`Dígito ${k}`}
                className="h-14 min-h-14 rounded-2xl border border-border/50 bg-card hover:bg-muted/40 active:bg-muted/80 active:scale-95 shadow-xs text-xl font-bold font-mono text-foreground flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {k}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
