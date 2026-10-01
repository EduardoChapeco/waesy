import React from "react";
import { MetricWidget, type MetricWidgetProps } from "@/components/widgets/MetricWidget";
import { TaskCard, type TaskCardProps } from "@/components/widgets/TaskCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  Package,
  CheckCircle2,
  Clock,
  Truck,
  ArrowRight,
  ExternalLink,
  ShoppingCart,
  FileText,
  Calendar,
  Layers,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

// ============================================================
// Tipos Canônicos de Mensagem Estruturada (ia/09-chat.md)
// ============================================================

export type AIChatBlockType =
  | "metric_widget"
  | "task_card"
  | "order_tracker"
  | "product_card"
  | "proposal_card"
  | "table"
  | "action_button";

export interface AIChatBlock {
  type: AIChatBlockType;
  data: Record<string, any>;
}

export interface AIChatAction {
  id: string;
  label: string;
  action_type: "navigate" | "open_checkout" | "add_to_cart" | "book_date" | "confirm_proposal";
  payload: Record<string, any>;
}

export interface StructuredMessagePayload {
  text?: string;
  blocks?: AIChatBlock[];
  actions?: AIChatAction[];
  telemetry?: {
    latency_ms: number;
    tokens_used: number;
    model: string;
  };
}

export interface StructuredMessageViewProps {
  payload: StructuredMessagePayload;
  isStaff?: boolean;
  onActionClick?: (action: AIChatAction) => void;
}

// ============================================================
// Sub-blocos Silenciosos Canônicos (Apple HIG / WhatsApp Design)
// ============================================================

const ORDER_STAGES = [
  { id: "received", label: "Recebido" },
  { id: "confirmed", label: "Confirmado" },
  { id: "preparing", label: "Em Preparo" },
  { id: "dispatched", label: "Em Rota" },
  { id: "delivered", label: "Entregue" },
] as const;

function OrderTrackerBlock({ data }: { data: Record<string, any> }) {
  const currentStage = data.current_stage || "received";
  const stageIndex = Math.max(
    0,
    ORDER_STAGES.findIndex((s) => s.id === currentStage),
  );

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-3.5 space-y-3 shadow-2xs max-w-sm w-full">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Package className="size-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground truncate">
              Pedido #{data.order_id ? String(data.order_id).slice(0, 8) : "—"}
            </p>
            {data.total_cents && (
              <p className="text-xs font-mono font-semibold text-primary">
                {formatMoney(data.total_cents / 100)}
              </p>
            )}
          </div>
        </div>

        <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider">
          {ORDER_STAGES[stageIndex]?.label || currentStage}
        </Badge>
      </div>

      {/* Linha de Progresso Visual das 5 Etapas */}
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        {ORDER_STAGES.map((stage, idx) => {
          const isDone = idx <= stageIndex;
          const isCurrent = idx === stageIndex;

          return (
            <div key={stage.id} className="flex flex-col items-center gap-1 text-center">
              <div
                className={cn(
                  "w-full h-1.5 rounded-full transition-colors",
                  isDone ? "bg-primary" : "bg-muted",
                  isCurrent && "ring-2 ring-primary/30",
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium truncate w-full",
                  isCurrent ? "font-bold text-foreground" : "text-muted-foreground",
                )}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {data.delivery_address && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 p-2 rounded-xl border border-border/50">
          <Truck className="size-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{data.delivery_address}</span>
        </div>
      )}
    </div>
  );
}

function ProductCardBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-3 shadow-2xs max-w-sm w-full space-y-2.5">
      <div className="flex items-start gap-3">
        {data.image_url ? (
          <img
            src={data.image_url}
            alt={data.title || "Produto"}
            className="size-16 rounded-xl object-cover border border-border/60 shrink-0 bg-muted"
          />
        ) : (
          <div className="size-16 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground shrink-0">
            <Package className="size-6" />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-1">
          <h4 className="text-xs font-bold text-foreground leading-snug line-clamp-2">
            {data.title || "Produto do Catálogo"}
          </h4>

          {data.category && (
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {data.category}
            </p>
          )}

          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-sm font-bold font-mono text-primary">
              {typeof data.price_cents === "number"
                ? formatMoney(data.price_cents / 100)
                : typeof data.price === "number"
                ? formatMoney(data.price)
                : "Consulte"}
            </span>

            {data.in_stock === false && (
              <Badge variant="secondary" className="text-xs">
                Esgotado
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
        <Button
          type="button"
          variant="default"
          size="sm"
          className="flex-1 h-11 rounded-xl text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          onClick={() =>
            onAction?.({
              id: `add-cart-${data.id || data.product_id}`,
              label: "Adicionar ao Pedido",
              action_type: "add_to_cart",
              payload: { product_id: data.id || data.product_id, title: data.title },
            })
          }
        >
          <ShoppingCart className="size-3.5 mr-1.5" />
          Adicionar
        </Button>

        {data.slug && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-11 px-3 rounded-xl text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Link to="/produto/$slug" params={{ slug: data.slug }} target="_blank">
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function ProposalCardBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs max-w-sm w-full space-y-3">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground truncate">
              {data.title || "Proposta Comercial"}
            </h4>
            <p className="text-xs text-muted-foreground">
              Proposta #{data.proposal_id ? String(data.proposal_id).slice(0, 8) : "—"}
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs font-bold">
          {data.status || "Ativa"}
        </Badge>
      </div>

      <div className="bg-muted/30 p-2.5 rounded-xl border border-border/50 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Valor Total:</span>
          <span className="font-bold font-mono text-primary text-sm">
            {typeof data.total_cents === "number"
              ? formatMoney(data.total_cents / 100)
              : data.total || "—"}
          </span>
        </div>

        {data.installments && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Condição:</span>
            <span>{data.installments}</span>
          </div>
        )}

        {data.valid_until && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
            <span>Validade:</span>
            <span>{data.valid_until}</span>
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="default"
        className="w-full h-11 rounded-xl text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        onClick={() =>
          onAction?.({
            id: `accept-prop-${data.proposal_id}`,
            label: "Aceitar Proposta",
            action_type: "confirm_proposal",
            payload: { proposal_id: data.proposal_id },
          })
        }
      >
        Aceitar Proposta
      </Button>
    </div>
  );
}

function TableBlock({ data }: { data: Record<string, any> }) {
  const headers: string[] = data.headers || [];
  const rows: Array<Array<string | number>> = data.rows || [];

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs max-w-md w-full">
      {data.title && (
        <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
          <span className="text-xs font-bold text-foreground">{data.title}</span>
        </div>
      )}
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-left text-xs">
          {headers.length > 0 && (
            <thead className="bg-muted/30 border-b border-border/60 text-muted-foreground font-semibold text-xs">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-border/40">
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-muted/20">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="px-3 py-2 text-foreground font-mono text-xs">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// Componente Principal
// ============================================================

export function StructuredMessageView({
  payload,
  isStaff,
  onActionClick,
}: StructuredMessageViewProps) {
  const blocks = payload.blocks || [];
  const actions = payload.actions || [];

  return (
    <div className="space-y-3 w-full">
      {/* Texto introdutório se houver */}
      {payload.text && (
        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground">
          {payload.text}
        </p>
      )}

      {/* Renderização Sequencial dos Blocos Estruturados */}
      {blocks.map((block, index) => {
        switch (block.type) {
          case "metric_widget":
            return (
              <div key={index} className="max-w-xs w-full">
                <MetricWidget {...(block.data as MetricWidgetProps)} />
              </div>
            );

          case "task_card":
            return (
              <div key={index} className="max-w-xs w-full">
                <TaskCard {...(block.data as TaskCardProps)} />
              </div>
            );

          case "order_tracker":
            return <OrderTrackerBlock key={index} data={block.data} />;

          case "product_card":
            return (
              <ProductCardBlock key={index} data={block.data} onAction={onActionClick} />
            );

          case "proposal_card":
            return (
              <ProposalCardBlock key={index} data={block.data} onAction={onActionClick} />
            );

          case "table":
            return <TableBlock key={index} data={block.data} />;

          default:
            return null;
        }
      })}

      {/* Ações Tipadas Interativas na Base da Mensagem */}
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {actions.map((act) => (
            <Button
              key={act.id}
              type="button"
              variant="outline"
              size="sm"
              className="h-11 px-4 rounded-xl text-xs font-semibold border-border/80 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              onClick={() => onActionClick?.(act)}
            >
              {act.label}
              <ArrowRight className="size-3.5 ml-1.5 opacity-70" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
