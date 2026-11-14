import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Clock,
  Layers,
  MessageSquare,
  Smartphone,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AtendimentoSubmoduleKey =
  | "overview"
  | "whatsapp"
  | "filas"
  | "atendentes"
  | "horarios";

const SUBMODULE_TABS: Array<{
  key: AtendimentoSubmoduleKey;
  label: string;
  to: string;
  icon: typeof BarChart3;
}> = [
  {
    key: "overview",
    label: "Visão Geral & BI",
    to: "/workspace/atendimento",
    icon: BarChart3,
  },
  {
    key: "whatsapp",
    label: "Canais WhatsApp",
    to: "/workspace/atendimento/whatsapp",
    icon: Smartphone,
  },
  {
    key: "filas",
    label: "Filas & Setores",
    to: "/workspace/atendimento/filas",
    icon: Layers,
  },
  {
    key: "atendentes",
    label: "Atendentes",
    to: "/workspace/atendimento/atendentes",
    icon: Users,
  },
  {
    key: "horarios",
    label: "Horários & Mensagens",
    to: "/workspace/atendimento/horarios",
    icon: Clock,
  },
];

export interface AtendimentoSubmoduleHeaderProps {
  activeKey: AtendimentoSubmoduleKey;
  title: string;
  subtitle?: string;
  /** Quando falso, omite o botão primário de Chat (para páginas que já possuem outro CTA primário soberano). */
  showPrimaryChatCta?: boolean;
  rightSlot?: React.ReactNode;
}

export function AtendimentoSubmoduleHeader({
  activeKey,
  title,
  subtitle,
  showPrimaryChatCta = true,
  rightSlot,
}: AtendimentoSubmoduleHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {rightSlot}
          {showPrimaryChatCta ? (
            <Link
              to={"/workspace/atendimento/chat" as any}
              className="px-3 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MessageSquare className="size-3.5" />
              <span>Abrir Chat Ao Vivo</span>
            </Link>
          ) : (
            <Link
              to={"/workspace/atendimento/chat" as any}
              className="px-3 py-1 rounded-lg border border-border/70 bg-card hover:bg-muted/60 text-foreground text-xs font-medium inline-flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MessageSquare className="size-3.5" />
              <span>Chat Ao Vivo</span>
            </Link>
          )}
        </div>
      </div>

      <nav
        aria-label="Submódulos de Atendimento"
        className="flex flex-wrap items-center gap-1 border-b border-border/60 pb-2"
      >
        {SUBMODULE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeKey;
          return (
            <Link
              key={tab.key}
              to={tab.to as any}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-2 shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive
                  ? "bg-muted text-foreground font-semibold border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
