import React from "react";
import {
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  FileText,
  DollarSign,
  Package,
  Wrench,
  GraduationCap,
  ClipboardList,
  ShoppingCart,
  ChevronRight,
  Flame,
} from "lucide-react";
import { type KanbanCardVariant } from "@/services/kanban-config.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface UniversalKanbanCardProps {
  id: string;
  variant?: KanbanCardVariant;
  title: string;
  subtitle?: string;
  description?: string;
  valueCents?: number;
  priority?: "low" | "medium" | "high" | "urgent";
  slaMinutes?: number;
  elapsedMinutes?: number;
  assigneeName?: string;
  assigneeAvatar?: string;
  checklistTotal?: number;
  checklistDone?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  onSelect?: () => void;
  onAdvance?: () => void;
  advanceLabel?: string;
  className?: string;
}

export function UniversalKanbanCard({
  variant = "standard",
  title,
  subtitle,
  description,
  valueCents,
  priority,
  slaMinutes,
  elapsedMinutes,
  assigneeName,
  checklistTotal,
  checklistDone,
  tags = [],
  metadata = {},
  onSelect,
  onAdvance,
  advanceLabel,
  className,
}: UniversalKanbanCardProps) {
  const isOverdue = slaMinutes && elapsedMinutes && elapsedMinutes > slaMinutes;
  const isWarningSla =
    slaMinutes && elapsedMinutes && elapsedMinutes > slaMinutes * 0.75 && !isOverdue;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={cn(
        "rounded-2xl bg-card p-4 text-left transition-colors cursor-pointer select-none space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {/* ── 1. CABEÇALHO DO CARD ── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          {subtitle && (
            <span className="text-3xs uppercase font-mono font-bold tracking-wider text-muted-foreground block line-clamp-2 text-anti-truncate">
              {subtitle}
            </span>
          )}
          <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-2">
            {title}
          </h4>
        </div>

        {/* Badges de Destaque conforme a Variante */}
        {variant === "kds" && elapsedMinutes !== undefined && (
          <Badge
            variant="secondary"
            className={cn(
              "font-mono text-3xs font-bold shrink-0 gap-1 border",
              isOverdue
                ? "bg-red-100 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800"
                : isWarningSla
                ? "bg-muted text-warning-strong border-border"
                : "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800"
            )}
          >
            <Clock className="size-3" />
            <span>{elapsedMinutes}m</span>
          </Badge>
        )}

        {priority && variant !== "kds" && (
          <Badge
            variant="secondary"
            className={cn(
              "text-3xs font-semibold shrink-0 uppercase tracking-wide border",
              priority === "urgent" && "bg-red-100 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800",
              priority === "high" && "bg-muted text-warning-strong border-border",
              priority === "medium" && "bg-muted text-muted-foreground border-border",
              priority === "low" && "bg-muted text-muted-foreground border-border"
            )}
          >
            {priority === "urgent"
              ? "Urgente"
              : priority === "high"
              ? "Alta"
              : priority === "medium"
              ? "Média"
              : "Baixa"}
          </Badge>
        )}
      </div>

      {/* ── 2. CONTEÚDO ESPECÍFICO POR VARIANTE ── */}
      {/* KDS Cozinha: Comanda, Mesa e Itens */}
      {variant === "kds" && metadata.items && Array.isArray(metadata.items) && (
        <div className="rounded-xl bg-muted p-3 space-y-1 text-2xs font-mono">
          {metadata.items.map((item: any, idx: number) => (
            <div key={idx} className="flex items-start justify-between gap-2 text-foreground">
              <span className="line-clamp-2 text-anti-truncate">
                <strong className="text-primary">{item.quantity || 1}x</strong> {item.name}
              </span>
              {item.notes && (
                <span className="text-3xs text-muted-foreground line-clamp-2 text-anti-truncate max-w-24">
                  {item.notes}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ordem de Serviço (Oficina): Placa, Veículo e Mecânico */}
      {variant === "service_order" && (metadata.vehicle || metadata.plate) && (
        <div className="rounded-xl bg-muted p-3 space-y-1 text-2xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground">{metadata.vehicle}</span>
            {metadata.plate && (
              <span className="font-mono text-3xs font-bold uppercase px-2 py-1 rounded-md bg-card">
                {metadata.plate}
              </span>
            )}
          </div>
          {metadata.diagnostic && (
            <p className="text-muted-foreground text-3xs line-clamp-2 text-anti-truncate">
              {metadata.diagnostic}
            </p>
          )}
        </div>
      )}

      {/* RH Recrutamento: Vaga e Pontuação de Match */}
      {variant === "hr_talent" && (
        <div className="flex items-center justify-between text-2xs">
          <span className="text-muted-foreground line-clamp-2 text-anti-truncate">{metadata.role || "Candidato"}</span>
          {metadata.matchScore !== undefined && (
            <span className="font-mono font-bold text-primary text-3xs">
              {metadata.matchScore}% match
            </span>
          )}
        </div>
      )}

      {/* RH Onboarding: Documentos e ASO */}
      {variant === "hr_onboarding" && metadata.docsStatus && (
        <div className="rounded-xl bg-muted p-3 text-3xs text-muted-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span>Documentação Admissional</span>
            <span className="font-mono font-bold text-foreground">{metadata.docsStatus}</span>
          </div>
        </div>
      )}

      {/* Compras: Fornecedor e Pedido */}
      {variant === "purchasing" && metadata.supplier && (
        <div className="flex items-center justify-between text-2xs text-muted-foreground">
          <span className="line-clamp-2 text-anti-truncate">Fornecedor: <strong className="text-foreground">{metadata.supplier}</strong></span>
          {metadata.poNumber && <span className="font-mono text-3xs">OC #{metadata.poNumber}</span>}
        </div>
      )}

      {/* Descrição curta se fornecida */}
      {description && variant === "standard" && (
        <p className="text-2xs text-muted-foreground line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}

      {/* ── 3. METADADOS INFERIORES: VALOR, CHECKLIST E RESPONSÁVEL ── */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-2xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {valueCents !== undefined && valueCents > 0 && (
            <span className="font-bold font-mono text-foreground">
              {formatMoney(valueCents)}
            </span>
          )}

          {checklistTotal !== undefined && checklistTotal > 0 && (
            <div className="flex items-center gap-1 font-mono text-3xs">
              <CheckCircle2 className="size-3 text-primary" />
              <span>
                {checklistDone || 0}/{checklistTotal}
              </span>
            </div>
          )}
        </div>

        {assigneeName && (
          <div className="flex items-center gap-1 text-3xs font-medium text-foreground truncate max-w-28">
            <User className="size-3 text-muted-foreground shrink-0" />
            <span className="truncate">{assigneeName}</span>
          </div>
        )}
      </div>

      {/* ── 4. BOTÃO RÁPIDO DE AVANÇO SE FORNECIDO ── */}
      {onAdvance && (
        <Button
          type="button"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onAdvance();
          }}
          className="w-full h-11 min-h-11 rounded-lg text-xs font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>{advanceLabel || "Avançar Etapa"}</span>
          <ChevronRight className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
