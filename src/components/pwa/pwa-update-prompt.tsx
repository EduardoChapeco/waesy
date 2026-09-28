/**
 * PwaUpdatePrompt — Seamless Release Protocol (V120)
 *
 * Componente global que escuta o ciclo de vida do Service Worker.
 * Quando um novo SW está "waiting" (nova versão baixada em background),
 * exibe um toast sutil com glassmorphism no canto inferior da tela.
 *
 * Fluxo:
 * 1. O SW (sw.js v5) baixa a nova versão em background silenciosamente.
 * 2. O novo SW entra em estado "waiting" (não quebra a sessão atual).
 * 3. Este componente detecta o evento "waiting" e exibe o toast.
 * 4. Ao clicar "Atualizar", envia postMessage({type:"SKIP_WAITING"}) ao SW.
 * 5. O SW assume controlo, dispara "controllerchange" no __root.tsx.
 * 6. __root.tsx faz window.location.reload() — app nova, sessão preservada.
 *
 * Design: Silent / Glassmorphism — Apple-style, nunca interrompe o utilizador.
 */

import { useState, useEffect, useCallback } from "react";
import { ArrowsClockwise, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface PwaUpdatePromptProps {
  /** Classe extra para posicionamento — padrão: canto inferior esquerdo */
  className?: string;
}

export function PwaUpdatePrompt({ className }: PwaUpdatePromptProps) {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [show, setShow] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    /**
     * Verifica se já há um SW em estado "waiting" no momento da montagem
     * (ex: o utilizador voltou à aba depois de muito tempo e o SW já baixou).
     */
    const checkWaiting = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShow(true);
      }
    };

    /**
     * Escuta o evento "updatefound" em todas as registrações existentes e futuras.
     * Quando o SW encontra uma nova versão, ela entra em "installing" → "installed"
     * (= "waiting"). Nesse ponto mostramos o toast.
     */
    const onUpdateFound = (registration: ServiceWorkerRegistration) => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        // "installed" = download completo, aguardando ativação (waiting state)
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          setWaitingWorker(newWorker);
          setShow(true);
        }
      });
    };

    // Verifica registrações já existentes (e.g. volta de uma aba em background)
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => {
        checkWaiting(reg);
        reg.addEventListener("updatefound", () => onUpdateFound(reg));
      });
    });

    // Escuta novas registrações (caso o SW seja registrado depois)
    const onControllerChange = () => {
      // O controllerchange já é tratado no __root.tsx com reload.
      // Aqui apenas ocultamos o toast se ele ainda estiver visível.
      setShow(false);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const handleUpdate = useCallback(() => {
    if (!waitingWorker) return;
    setIsUpdating(true);
    // Dispara SKIP_WAITING → o SW assume controlo → __root.tsx faz reload.
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    // Fallback: se o controllerchange não disparar em 3s, força o reload.
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }, [waitingWorker]);

  const handleDismiss = useCallback(() => {
    setShow(false);
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Nova versão disponível"
      className={cn(
        // Posicionamento: acima do BottomNav mobile (bottom-20) e livre no desktop (bottom-6)
        "fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-[9999]",
        // Entrada animada
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        className
      )}
    >
      <div
        className={cn(
          // Glassmorphism silencioso — fundo neutro, borda ultra-fina, sombra suave
          "flex items-center gap-3 px-4 py-3 rounded-2xl",
          "bg-background/85 backdrop-blur-xl backdrop-saturate-150",
          "border border-border/60 shadow-lg shadow-black/10",
          "max-w-[calc(100vw-2rem)] sm:max-w-sm w-full sm:w-auto"
        )}
      >
        {/* Ícone de atualização */}
        <div className="shrink-0 size-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <ArrowsClockwise
            size={16}
            weight="bold"
            className={cn("text-primary", isUpdating && "animate-spin")}
          />
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground leading-tight truncate">
            Nova versão disponível
          </p>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Clique para atualizar sem perder dados
          </p>
        </div>

        {/* Botão de Atualizar */}
        <button
          type="button"
          onClick={handleUpdate}
          disabled={isUpdating}
          className={cn(
            "shrink-0 h-8 px-3 rounded-xl text-xs font-bold",
            "bg-primary text-primary-foreground",
            "hover:bg-primary/90 active:scale-95 transition-all cursor-pointer",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {isUpdating ? "Atualizando..." : "Atualizar"}
        </button>

        {/* Dispensar (X) */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dispensar atualização"
          className="shrink-0 size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all cursor-pointer -mr-1"
        >
          <X size={13} weight="bold" />
        </button>
      </div>
    </div>
  );
}
