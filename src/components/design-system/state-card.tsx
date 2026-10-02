import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DesignSystemStateMode } from "./design-system-types";

interface StateCardProps {
  title: string;
  state: Exclude<DesignSystemStateMode, "all">;
  children: React.ReactNode;
  className?: string;
}

const STATE_CONFIG = {
  ready: {
    label: "Dados Prontos",
    variant: "default" as const,
  },
  loading: {
    label: "Carregamento",
    variant: "secondary" as const,
  },
  empty: {
    label: "Vazio",
    variant: "outline" as const,
  },
  error: {
    label: "Erro",
    variant: "destructive" as const,
  },
};

export function StateCard({ title, state, children, className }: StateCardProps) {
  const config = STATE_CONFIG[state];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <Badge variant={config.variant} className="text-xs">
          {config.label}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col justify-center">{children}</div>
    </div>
  );
}
