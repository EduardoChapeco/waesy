import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import {
  MessageSquarePlus,
  Sparkles,
  Tag,
  Users,
  CalendarPlus,
  ClipboardList,
  QrCode,
  X,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickCreateActionItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  contextMatch?: string[];
}

export const CANONICAL_QUICK_CREATE_ACTIONS: QuickCreateActionItem[] = [
  {
    id: "nova-conversa",
    label: "Nova conversa",
    description: "Iniciar chat com contatos ou empresas",
    href: "/conta/conversas",
    icon: MessageSquarePlus,
    contextMatch: ["/conta/conversas", "/chat"],
  },
  {
    id: "publicar-feed",
    label: "Publicar no feed",
    description: "Compartilhar atualização ou foto no mural",
    href: "/feed",
    icon: Sparkles,
    contextMatch: ["/feed", "/mural"],
  },
  {
    id: "anunciar-classificado",
    label: "Anunciar classificado",
    description: "Publicar veículo, imóvel, produto ou serviço",
    href: "/conta/anuncios/novo",
    icon: Tag,
    contextMatch: ["/classificados", "/marketplace", "/ofertas"],
  },
  {
    id: "criar-comunidade",
    label: "Criar comunidade",
    description: "Reunir pessoas, grupos e canais locais",
    href: "/comunidades",
    icon: Users,
    contextMatch: ["/comunidades", "/c/"],
  },
  {
    id: "evento-rapido",
    label: "Evento rápido",
    description: "Agendar encontro, excursão ou lista no chat",
    href: "/conta/conversas?create=event",
    icon: CalendarPlus,
    contextMatch: ["/eventos", "/turismo"],
  },
  {
    id: "formulario-rapido",
    label: "Formulário rápido",
    description: "Coletar inscrições, enquetes ou pedidos",
    href: "/conta/conversas?create=form",
    icon: ClipboardList,
    contextMatch: ["/empregos", "/concursos"],
  },
  {
    id: "link-cobranca",
    label: "Link de cobrança",
    description: "Gerar cobrança Pix ou dividir conta",
    href: "/conta/financas",
    icon: QrCode,
    contextMatch: ["/conta/financas", "/conta/pedidos"],
  },
];

export const QUICK_CREATE_EVENT_NAME = "waesy:open-quick-create";

export function openQuickCreateModal(context?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(QUICK_CREATE_EVENT_NAME, {
      detail: { context: context || window.location.pathname },
    }),
  );
}

export interface GlobalQuickCreateModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GlobalQuickCreateModal({
  open: controlledOpen,
  onOpenChange,
}: GlobalQuickCreateModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeContext, setActiveContext] = useState<string>("");
  const navigate = useNavigate();
  const location = useLocation();

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpen = (next: boolean) => {
    setInternalOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ context?: string }>;
      setActiveContext(customEvent.detail?.context || location.pathname || "/");
      setOpen(true);
    };

    window.addEventListener(QUICK_CREATE_EVENT_NAME, handleOpen);
    return () => window.removeEventListener(QUICK_CREATE_EVENT_NAME, handleOpen);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPath = activeContext || location.pathname || "/";

  const orderedActions = [...CANONICAL_QUICK_CREATE_ACTIONS].sort((a, b) => {
    const aMatches = a.contextMatch?.some((prefix) => currentPath.startsWith(prefix)) ? 1 : 0;
    const bMatches = b.contextMatch?.some((prefix) => currentPath.startsWith(prefix)) ? 1 : 0;
    return bMatches - aMatches;
  });

  const handleSelectAction = (href: string) => {
    setOpen(false);
    if (href.includes("?")) {
      const [path, queryString] = href.split("?");
      const params = Object.fromEntries(new URLSearchParams(queryString).entries());
      navigate({ to: path as any, search: params as any }).catch(() => {
        if (typeof window !== "undefined") window.location.href = href;
      });
    } else {
      navigate({ to: href as any }).catch(() => {
        if (typeof window !== "undefined") window.location.href = href;
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Criar"
      data-testid="global-quick-create-modal"
    >
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Fechar janela"
        onClick={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(false);
        }}
        className="fixed inset-0 bg-foreground/50 backdrop-blur-xs transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      />

      {/* Sheet / Dialog Surface */}
      <div className="relative z-10 w-full sm:max-w-md bg-background text-foreground rounded-t-3xl sm:rounded-2xl border-t sm:border border-border/60 shadow-2xl overflow-hidden pb-safe animate-in slide-in-from-bottom-4 duration-200">
        {/* Handle bar mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-foreground tracking-tight">
            Criar
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="size-11 min-h-11 min-w-11 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Action List */}
        <div className="p-2 divide-y divide-border/30 max-h-96 overflow-y-auto no-scrollbar">
          {orderedActions.map((action, index) => {
            const Icon = action.icon;
            const isContextualMatch =
              index === 0 &&
              action.contextMatch?.some((prefix) => currentPath.startsWith(prefix));

            return (
              <button
                key={action.id}
                type="button"
                onClick={() => handleSelectAction(action.href)}
                data-testid={`quick-create-${action.id}`}
                className={cn(
                  "w-full min-h-14 px-3 py-2 rounded-xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isContextualMatch
                    ? "bg-primary/5 hover:bg-primary/10"
                    : "hover:bg-muted/50 active:bg-muted/80",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "size-11 min-h-11 min-w-11 rounded-xl flex items-center justify-center shrink-0 border",
                      isContextualMatch
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-foreground border-border/50",
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground truncate">
                        {action.label}
                      </span>
                      {isContextualMatch && (
                        <span className="px-2 py-1 rounded-full bg-primary/15 text-primary text-3xs font-bold uppercase tracking-wider leading-none">
                          Sugerido
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground block truncate">
                      {action.description}
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground/60 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
