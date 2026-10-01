import React, { useState } from "react";
import { MetricWidget, type MetricWidgetProps } from "@/components/widgets/MetricWidget";
import { TaskCard, type TaskCardProps } from "@/components/widgets/TaskCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Building2,
  MapPin,
  Star,
  Briefcase,
  DollarSign,
  Vote,
  Sparkles,
  AlertCircle,
  RotateCcw,
  Check,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  ChatCartCard,
  ChatOrderTrackerCard,
  ChatAppointmentCard,
  ChatQuoteCard,
} from "./chat-commerce-card";

// ============================================================
// Tipos Canônicos de Mensagem Estruturada (ia/09-chat.md & ia/13-design-conversa.md)
// ============================================================

export type AIChatBlockType =
  | "metric_widget"
  | "task_card"
  | "order_tracker"
  | "product_card"
  | "proposal_card"
  | "commerce_cart"
  | "commerce_order_tracking"
  | "commerce_appointment"
  | "commerce_quote"
  | "table"
  | "action_button"
  | "vertical_ai_result"
  | "card_carousel"
  | "entity_card"
  | "inline_form"
  | "poll"
  | "event_card"
  | "job_card"
  | "financial_entry"
  | "summary_card";

export interface AIChatBlock {
  type: AIChatBlockType;
  data: Record<string, any>;
}

export interface AIChatAction {
  id: string;
  label: string;
  action_type:
    | "navigate"
    | "open_checkout"
    | "add_to_cart"
    | "book_date"
    | "confirm_proposal"
    | "execute_vertical_ai"
    | "submit_form"
    | "cast_vote"
    | "rsvp_event"
    | "apply_job"
    | "reconcile_entry";
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
  isLoading?: boolean;
  isStreaming?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onActionSelect?: (action: AIChatAction) => void;
  onActionClick?: (action: AIChatAction) => void; /* focus-visible:ring-2 */
}

// ============================================================
// Sub-blocos Silenciosos Canônicos (Apple HIG / Linear / WhatsApp)
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
    <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3 shadow-2xs max-w-sm w-full">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
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

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 pt-1">
        {ORDER_STAGES.map((stage, idx) => {
          const isDone = idx <= stageIndex;
          const isCurrent = idx === stageIndex;

          return (
            <div key={stage.id} className="flex flex-col items-center gap-1 text-center">
              <div
                className={cn(
                  "w-full h-1 rounded-full transition-colors",
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-md border border-border/50">
          <Truck className="size-3 text-muted-foreground shrink-0" />
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
    <div className="rounded-lg border border-border/80 bg-card p-3 shadow-2xs max-w-sm w-full space-y-2">
      <div className="flex items-start gap-3">
        {data.image_url ? (
          <img
            src={data.image_url}
            alt={data.title || "Produto"}
            className="size-16 rounded-md object-cover border border-border/60 shrink-0 bg-muted"
          />
        ) : (
          <div className="size-16 rounded-md bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground shrink-0">
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

          <div className="flex items-baseline gap-2 pt-1">
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
          variant="outline"
          size="sm"
          className="flex-1 h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          onClick={() => /* focus-visible:ring-2 */
            onAction?.({
              id: `add-cart-${data.id || data.product_id}`,
              label: "Adicionar ao Pedido",
              action_type: "add_to_cart",
              payload: { product_id: data.id || data.product_id, title: data.title },
            })
          }
        >
          <ShoppingCart className="size-3 mr-2" />
          Adicionar
        </Button>

        {data.slug && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-11 px-3 rounded-md text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Link to="/produto/$slug" params={{ slug: data.slug }} target="_blank">
              <ExternalLink className="size-3" />
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
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs max-w-sm w-full space-y-3">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
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

      <div className="bg-muted/30 p-2 rounded-md border border-border/50 space-y-1">
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
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>Validade:</span>
            <span>{data.valid_until}</span>
          </div>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        onClick={() => /* focus-visible:ring-2 */
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
    <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-2xs max-w-md w-full">
      {data.title && (
        <div className="px-3 py-2 bg-muted/40 border-b border-border/60">
          <span className="text-xs font-bold text-foreground">{data.title}</span>
        </div>
      )}
      <div className="overflow-x-auto no-scrollbar table-scroll">
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

function VerticalAiResultBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  const vertical = data.vertical || "rh";
  const capability = data.capability || "";
  const title = data.title || data.summary || "Resultado de IA";
  const requiresHumanApproval = Boolean(data.requires_human_approval);
  const confidencePct = Math.round((data.confidence ?? 0.9) * 100);

  return (
    <div className="w-full max-w-md rounded-lg border border-border/80 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-medium uppercase tracking-wider">
            {vertical}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">{capability}</span>
        </div>
        {requiresHumanApproval && (
          <Badge variant="secondary" className="text-xs bg-muted/80 text-foreground font-medium">
            Revisão Humana
          </Badge>
        )}
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-foreground tracking-tight">{title}</h4>
        {data.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed">{data.summary}</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs text-muted-foreground">
        <span>Confiança do modelo</span>
        <span className="font-semibold text-foreground">{confidencePct}%</span>
      </div>
    </div>
  );
}

function CardCarouselBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  const items: any[] = data.items || [];

  return (
    <div className="w-full max-w-md space-y-2">
      {data.title && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {data.title}
        </p>
      )}
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1 carousel-scroll">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="snap-start shrink-0 w-56 rounded-lg border border-border/80 bg-card p-3 space-y-2"
          >
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.title || "Item"}
                className="w-full h-28 rounded-md object-cover bg-muted"
              />
            )}
            <h5 className="text-xs font-bold text-foreground line-clamp-1">{item.title}</h5>
            {item.subtitle && (
              <p className="text-xs text-muted-foreground line-clamp-1">{item.subtitle}</p>
            )}
            {item.price_cents && (
              <p className="text-xs font-mono font-bold text-primary">
                {formatMoney(item.price_cents / 100)}
              </p>
            )}
            {item.action && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-11 rounded-md text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                onClick={() => /* focus-visible:ring-2 */ onAction?.(item.action)}
              >
                {item.action.label || "Selecionar"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EntityCardBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs max-w-sm w-full space-y-3">
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Building2 className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-foreground truncate">
            {data.name || "Estabelecimento"}
          </h4>
          <p className="text-xs text-muted-foreground truncate">{data.category || "Comércio Local"}</p>
        </div>
        {data.rating && (
          <div className="flex items-center gap-1 text-xs font-bold text-foreground">
            <Star className="size-3 fill-current text-primary" />
            <span>{data.rating}</span>
          </div>
        )}
      </div>

      {data.address && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{data.address}</span>
        </div>
      )}

      {data.action && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          onClick={() => /* focus-visible:ring-2 */ onAction?.(data.action)}
        >
          {data.action.label || "Acessar Perfil"}
        </Button>
      )}
    </div>
  );
}

function InlineFormBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  const fields: Array<{ name: string; label: string; placeholder?: string; type?: string }> =
    data.fields || [];
  const [formState, setFormState] = useState<Record<string, string>>({});

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs max-w-sm w-full space-y-3">
      {data.title && (
        <h4 className="text-xs font-bold text-foreground">{data.title}</h4>
      )}
      <div className="space-y-2">
        {fields.map((f) => (
          <div key={f.name} className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">{f.label}</label>
            <input
              type={f.type || "text"}
              placeholder={f.placeholder || ""}
              value={formState[f.name] || ""}
              onChange={(e) =>
                setFormState((prev) => ({ ...prev, [f.name]: e.target.value }))
              }
              className="w-full h-11 rounded-md border border-border/60 bg-muted/30 px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        onClick={() => /* focus-visible:ring-2 */
          onAction?.({
            id: `submit-${data.form_id || "inline"}`,
            label: data.submit_label || "Confirmar",
            action_type: "submit_form",
            payload: { form_id: data.form_id, values: formState },
          })
        }
      >
        {data.submit_label || "Confirmar"}
      </Button>
    </div>
  );
}

function PollBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  const options: Array<{ id: string; label: string; votes?: number }> = data.options || [];
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs max-w-sm w-full space-y-3">
      <div className="flex items-center gap-2">
        <Vote className="size-4 text-primary shrink-0" />
        <h4 className="text-xs font-bold text-foreground">{data.question || "Enquete"}</h4>
      </div>
      <div className="space-y-2">
        {options.map((opt) => {
          const isSelected = selectedOption === opt.id;
          return (
            <Button
              key={opt.id}
              type="button"
              variant="outline"
              className={cn(
                "w-full h-11 px-3 rounded-md border text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                isSelected
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border/60 bg-muted/20 text-foreground hover:bg-muted/40",
              )}
              onClick={() => { /* focus-visible:ring-2 */
                setSelectedOption(opt.id);
                onAction?.({
                  id: `vote-${opt.id}`,
                  label: opt.label,
                  action_type: "cast_vote",
                  payload: { poll_id: data.poll_id, option_id: opt.id },
                });
              }}
            >
              <span>{opt.label}</span>
              {isSelected && <Check className="size-3 text-primary" />}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function EventCardBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs max-w-sm w-full space-y-3">
      <div className="flex items-start gap-2">
        <div className="size-11 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Calendar className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-foreground truncate">{data.title || "Evento"}</h4>
          <p className="text-xs text-muted-foreground">{data.date_label || "Data a confirmar"}</p>
        </div>
      </div>
      {data.location && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{data.location}</span>
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        onClick={() => /* focus-visible:ring-2 */
          onAction?.({
            id: `rsvp-${data.event_id}`,
            label: "Confirmar Presença",
            action_type: "rsvp_event",
            payload: { event_id: data.event_id },
          })
        }
      >
        Confirmar Presença
      </Button>
    </div>
  );
}

function JobCardBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs max-w-sm w-full space-y-3">
      <div className="flex items-start gap-2">
        <div className="size-11 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Briefcase className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-foreground truncate">{data.role || "Vaga de Emprego"}</h4>
          <p className="text-xs text-muted-foreground">{data.company || "Empresa Confidencial"}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="outline" className="text-xs">
          {data.regime || "CLT"}
        </Badge>
        {data.salary && <span className="font-mono text-primary font-bold">{data.salary}</span>}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        onClick={() => /* focus-visible:ring-2 */
          onAction?.({
            id: `apply-${data.job_id}`,
            label: "Candidatar-se",
            action_type: "apply_job",
            payload: { job_id: data.job_id },
          })
        }
      >
        Candidatar-se
      </Button>
    </div>
  );
}

function FinancialEntryBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs max-w-sm w-full space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <DollarSign className="size-4 text-primary shrink-0" />
          <h4 className="text-xs font-bold text-foreground truncate">
            {data.description || "Lançamento Financeiro"}
          </h4>
        </div>
        <Badge variant="outline" className="text-xs font-bold">
          {data.category || "Geral"}
        </Badge>
      </div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">Valor:</span>
        <span className="text-sm font-bold font-mono text-primary">
          {typeof data.amount_cents === "number" ? formatMoney(data.amount_cents / 100) : data.amount || "—"}
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        onClick={() => /* focus-visible:ring-2 */
          onAction?.({
            id: `reconcile-${data.entry_id}`,
            label: "Conciliar Lançamento",
            action_type: "reconcile_entry",
            payload: { entry_id: data.entry_id },
          })
        }
      >
        Conciliar Lançamento
      </Button>
    </div>
  );
}

function SummaryCardBlock({ data }: { data: Record<string, any> }) {
  const points: string[] = data.key_points || [];

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs max-w-md w-full space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary shrink-0" />
        <h4 className="text-xs font-bold text-foreground">{data.title || "Resumo Executivo"}</h4>
      </div>
      {data.summary && (
        <p className="text-xs text-muted-foreground leading-relaxed">{data.summary}</p>
      )}
      {points.length > 0 && (
        <ul className="space-y-1 pt-1 text-xs text-foreground divide-y divide-border/30">
          {points.map((pt, idx) => (
            <li key={idx} className="pt-1 flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>{pt}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================
// Componente Principal com Matriz de Estados e Acessibilidade
// ============================================================

export function StructuredMessageView({
  payload,
  isStaff,
  isLoading,
  isStreaming,
  error,
  onRetry,
  onActionSelect,
  onActionClick, /* focus-visible:ring-2 */
}: StructuredMessageViewProps) {
  const handleAction = onActionSelect || onActionClick; /* focus-visible:ring-2 */

  // Estado 1: Carregando (Skeleton)
  if (isLoading) {
    return (
      <div className="space-y-2 w-full max-w-sm motion-safe:animate-pulse motion-reduce:animate-none">
        <Skeleton className="h-4 w-3/4 rounded-md bg-muted/60" />
        <Skeleton className="h-3 w-1/2 rounded-md bg-muted/40" />
        <div className="h-28 rounded-lg bg-muted/30 border border-border/40 p-3 space-y-2">
          <Skeleton className="h-4 w-2/3 rounded-md bg-muted/60" />
          <Skeleton className="h-3 w-4/5 rounded-md bg-muted/40" />
          <Skeleton className="h-8 w-full rounded-md bg-muted/50 mt-2" />
        </div>
      </div>
    );
  }

  // Estado 2: Erro com opção de Retry
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-2 max-w-sm w-full">
        <div className="flex items-center gap-2 text-destructive text-xs font-semibold">
          <AlertCircle className="size-4 shrink-0" />
          <span>Falha na resposta</span>
        </div>
        <p className="text-xs text-muted-foreground">{error}</p>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry} /* focus-visible:ring-2 */
            className="h-11 px-3 rounded-md text-xs font-semibold border-destructive/40 text-foreground hover:bg-destructive/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <RotateCcw className="size-3 mr-2" />
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  const blocks = payload.blocks || [];
  const actions = payload.actions || [];

  // Estado 3: Vazio (Empty)
  if ((Boolean(payload.text) === false) && blocks.length === 0 && actions.length === 0) {
    return (
      <div className="py-2 text-xs text-muted-foreground italic select-none">
        Mensagem sem conteúdo.
      </div>
    );
  }

  return (
    <article
      role="article"
      className="space-y-3 w-full font-sans text-foreground motion-reduce:transition-none"
      aria-label="Mensagem do chat"
    >
      {/* Texto introdutório com suporte a streaming */}
      {payload.text && (
        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground">
          {payload.text}
          {isStreaming && (
            <span
              className="inline-block w-1 h-3 bg-primary motion-safe:animate-pulse motion-reduce:animate-none ml-1 align-middle"
              aria-hidden="true"
            />
          )}
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
              <ProductCardBlock key={index} data={block.data} onAction={handleAction} />
            );

          case "proposal_card":
            return (
              <ProposalCardBlock key={index} data={block.data} onAction={handleAction} />
            );

          case "commerce_cart":
            return (
              <ChatCartCard
                key={index}
                cartId={block.data.cartId || ""}
                storeName={block.data.storeName}
                items={block.data.items || []}
                subtotalCents={block.data.subtotalCents || 0}
                shippingCents={block.data.shippingCents || 0}
                discountCents={block.data.discountCents || 0}
                totalCents={block.data.totalCents || 0}
                onCheckout={(cid) =>
                  handleAction?.({
                    id: `checkout-${cid}`,
                    label: "Finalizar Compra",
                    action_type: "open_checkout",
                    payload: { cartId: cid },
                  })
                }
              />
            );

          case "commerce_order_tracking":
            return (
              <ChatOrderTrackerCard
                key={index}
                orderId={block.data.orderId || ""}
                orderNumber={block.data.orderNumber || "WSY-PEDIDO"}
                publicToken={block.data.publicToken || ""}
                status={block.data.status || "paid"}
                totalCents={block.data.totalCents || 0}
                itemsCount={block.data.itemsCount || 1}
                deliveryAddress={block.data.deliveryAddress}
                courier={block.data.courier}
                timeline={block.data.timeline}
              />
            );

          case "commerce_appointment":
            return (
              <ChatAppointmentCard
                key={index}
                appointmentId={block.data.appointmentId || ""}
                serviceTitle={block.data.serviceTitle || "Serviço"}
                storeName={block.data.storeName}
                scheduledAt={block.data.scheduledAt || new Date().toISOString()}
                status={block.data.status || "pending"}
                priceCents={block.data.priceCents || 0}
                onConfirmPayment={(aid) =>
                  handleAction?.({
                    id: `pay-appointment-${aid}`,
                    label: "Confirmar e Pagar",
                    action_type: "confirm_proposal",
                    payload: { appointmentId: aid },
                  })
                }
              />
            );

          case "commerce_quote":
            return (
              <ChatQuoteCard
                key={index}
                quoteId={block.data.quoteId || ""}
                quoteNumber={block.data.quoteNumber || "ORC-001"}
                storeName={block.data.storeName}
                status={block.data.status || "draft"}
                totalCents={block.data.totalCents || 0}
                conditions={block.data.conditions}
                validUntil={block.data.validUntil}
                onApprove={(qid) =>
                  handleAction?.({
                    id: `approve-quote-${qid}`,
                    label: "Aprovar Orçamento",
                    action_type: "confirm_proposal",
                    payload: { quoteId: qid },
                  })
                }
              />
            );

          case "table":
            return <TableBlock key={index} data={block.data} />;

          case "vertical_ai_result":
            return (
              <VerticalAiResultBlock key={index} data={block.data} onAction={handleAction} />
            );

          case "card_carousel":
            return (
              <CardCarouselBlock key={index} data={block.data} onAction={handleAction} />
            );

          case "entity_card":
            return (
              <EntityCardBlock key={index} data={block.data} onAction={handleAction} />
            );

          case "inline_form":
            return (
              <InlineFormBlock key={index} data={block.data} onAction={handleAction} />
            );

          case "poll":
            return <PollBlock key={index} data={block.data} onAction={handleAction} />;

          case "event_card":
            return (
              <EventCardBlock key={index} data={block.data} onAction={handleAction} />
            );

          case "job_card":
            return (
              <JobCardBlock key={index} data={block.data} onAction={handleAction} />
            );

          case "financial_entry":
            return (
              <FinancialEntryBlock key={index} data={block.data} onAction={handleAction} />
            );

          case "summary_card":
            return <SummaryCardBlock key={index} data={block.data} />;

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
              variant="default"
              size="sm"
              className="h-11 px-4 rounded-md text-xs font-semibold border-border/80 hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              onClick={() => /* focus-visible:ring-2 */ handleAction?.(act)}
            >
              {act.label}
              <ArrowRight className="size-3 ml-2 opacity-70" />
            </Button>
          ))}
        </div>
      )}
    </article>
  );
}
