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
  AlertCircle,
  RotateCcw,
  Check,
  Car,
  Bike,
  Zap,
  Scale,
  Plane,
  Hotel,
  MessageCircle,
  Phone,
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
  | "summary_card"
  | "places_carousel"
  | "mobility_quote"
  | "travel_itinerary"
  | "legal_triage"
  | "food_modifier_selector"
  | "creative_ad_preview";

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
    | "reconcile_entry"
    | "call_ride"
    | "open_place"
    | "request_travel_quote"
    | "submit_legal_demand"
    | "publish_ad";
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
            {item.description && (
              <p className="text-xs text-muted-foreground/90 leading-relaxed line-clamp-2">
                {item.description}
              </p>
            )}
            {item.location && (
              <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1">
                <MapPin className="size-3 shrink-0" />
                {item.location}
              </p>
            )}
            {item.price_cents && (
              <p className="text-xs font-mono font-bold text-primary">
                {formatMoney(item.price_cents / 100)}
              </p>
            )}
            {item.source_table && (
              <p className="text-2xs text-muted-foreground/70 uppercase tracking-wider">
                Conteúdo publicado na plataforma
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
        <FileText className="size-4 text-primary shrink-0" />
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

function PlacesCarouselBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  const items: any[] = data.places || data.items || [];

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border/80 bg-card p-4 text-center max-w-sm w-full space-y-1">
        <Building2 className="size-6 text-muted-foreground mx-auto" />
        <p className="text-xs font-semibold text-foreground">Nenhum estabelecimento encontrado</p>
        <p className="text-2xs text-muted-foreground">Tente buscar por outra categoria ou regiao.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Building2 className="size-3.5 text-primary" />
          <span>{data.title || "Estabelecimentos Encontrados"}</span>
        </p>
        <span className="text-2xs text-muted-foreground font-mono">{items.length} locais</span>
      </div>

      <div className="carousel flex gap-3 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-2">
        {items.map((place, idx) => {
          const isOpen = place.is_open ?? true;
          const distanceKm = typeof place.distance_km === "number" ? `${place.distance_km.toFixed(1)} km` : place.distance || null;

          return (
            <div
              key={place.id || idx}
              className="snap-start shrink-0 w-64 rounded-lg border border-border/80 bg-card p-3 space-y-3 shadow-2xs hover:border-border transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2">
                {place.avatar_url || place.banner_url || place.image_url ? (
                  <img
                    src={place.avatar_url || place.banner_url || place.image_url}
                    alt={place.name || place.business_name || "Estabelecimento"}
                    className="w-full h-28 rounded-md object-cover bg-muted border border-border/40"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-28 rounded-md bg-muted/60 border border-border/40 flex items-center justify-center text-muted-foreground">
                    <Building2 className="size-8" />
                  </div>
                )}

                <div>
                  <div className="flex items-start justify-between gap-1">
                    <h5 className="text-xs font-bold text-foreground line-clamp-1">
                      {place.name || place.business_name}
                    </h5>
                    {place.rating && (
                      <span className="flex items-center gap-1 text-2xs font-bold text-foreground shrink-0">
                        <Star className="size-3 fill-current text-primary" />
                        {Number(place.rating).toFixed(1)}
                      </span>
                    )}
                  </div>

                  <p className="text-2xs text-muted-foreground truncate">{place.category || "Comercio Local"}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-2xs">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-2xs font-semibold px-2 py-1 border",
                      isOpen
                        ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
                        : "border-border/60 text-muted-foreground bg-muted/40"
                    )}
                  >
                    {isOpen ? "Aberto Agora" : "Fechado"}
                  </Badge>

                  {distanceKm && (
                    <span className="flex items-center gap-1 text-muted-foreground font-mono">
                      <MapPin className="size-3 text-primary shrink-0" />
                      {distanceKm}
                    </span>
                  )}
                </div>

                {place.address && (
                  <p className="text-2xs text-muted-foreground line-clamp-1" title={place.address}>
                    {place.address}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 h-11 rounded-md text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  onClick={() => /* focus-visible:ring-2 */
                    onAction?.({
                      id: `place-open-${place.id || place.slug || idx}`,
                      label: "Ver Perfil",
                      action_type: "open_place",
                      payload: { placeId: place.id, slug: place.slug, storeId: place.store_id },
                    })
                  }
                >
                  Ver Perfil
                </Button>

                {(place.contact_whatsapp || place.phone) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-11 px-3 rounded-md text-xs font-semibold border border-border/40 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    onClick={() => { /* focus-visible:ring-2 */
                      const num = (place.contact_whatsapp || place.phone || "").replace(/\D/g, "");
                      if (num) {
                        window.open(`https://wa.me/55${num}`, "_blank", "noopener,noreferrer");
                      }
                    }}
                    title="Conversar no WhatsApp"
                    aria-label="Abrir conversa no WhatsApp"
                  >
                    <MessageCircle className="size-4 text-emerald-500" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MobilityQuoteBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  const quotes: any[] = data.quotes || [];
  const origin = data.origin_address || "Origem";
  const destination = data.destination_address || "Destino";
  const distanceKm = data.distance_km || 0;
  const [selectedType, setSelectedType] = useState<string>(quotes[0]?.service_type || "ride_moto");

  const selectedQuote = quotes.find((q) => q.service_type === selectedType) || quotes[0];

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case "ride_moto":
        return Bike;
      case "ride_car":
        return Car;
      case "delivery_express":
        return Zap;
      case "freight_van":
      case "moving_truck":
        return Truck;
      default:
        return Car;
    }
  };

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs max-w-sm w-full space-y-3">
      {/* Cabecalho da Rota */}
      <div className="border-b border-border/60 pb-2 space-y-2">
        <div className="flex items-center justify-between text-2xs uppercase tracking-wider font-semibold text-muted-foreground">
          <span>Mobilidade & Entregas</span>
          {distanceKm > 0 && <span className="font-mono">{distanceKm} km</span>}
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <div className="size-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">{origin}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground font-medium">
            <div className="size-2 rounded-full bg-primary shrink-0" />
            <span className="truncate">{destination}</span>
          </div>
        </div>
      </div>

      {/* Selecao de Modais */}
      <div className="space-y-2">
        {quotes.map((q) => {
          const isSelected = selectedType === q.service_type;
          const IconComponent = getVehicleIcon(q.service_type);

          return (
            <button /* focus-visible:ring-2 */
              key={q.service_type}
              type="button"
              onClick={() => setSelectedType(q.service_type)} /* focus-visible:ring-2 */
              className={cn(
                "w-full h-12 px-3 rounded-md border text-left text-xs flex items-center justify-between transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                isSelected
                  ? "border-primary bg-primary/10 text-foreground font-semibold"
                  : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn("size-7 rounded-md flex items-center justify-center shrink-0", isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                  <IconComponent className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold truncate text-foreground">{q.label || q.service_type}</p>
                  <p className="text-2xs text-muted-foreground truncate">{q.duration_minutes ? `~${q.duration_minutes} min` : q.description}</p>
                </div>
              </div>

              <span className="font-mono font-bold text-sm text-primary shrink-0 ml-2">
                {typeof q.estimated_price_cents === "number" ? formatMoney(q.estimated_price_cents / 100) : "Sob consulta"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Acao Primaria de Chamada */}
      {selectedQuote && (
        <Button
          type="button"
          size="sm"
          className="w-full h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          onClick={() => /* focus-visible:ring-2 */
            onAction?.({
              id: `call-ride-${selectedQuote.service_type}`,
              label: `Chamar ${selectedQuote.label || "Corrida"}`,
              action_type: "call_ride",
              payload: {
                service_type: selectedQuote.service_type,
                origin_address: origin,
                destination_address: destination,
                distance_km: distanceKm,
                estimated_price_cents: selectedQuote.estimated_price_cents,
              },
            })
          }
        >
          <span>Chamar {selectedQuote.label}</span>
          <ArrowRight className="size-4 ml-2" />
        </Button>
      )}
    </div>
  );
}

function TravelItineraryBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  const days: Array<{ day: number; title: string; activities: string[] }> = data.days || [];
  const destination = data.destination || "Destino Turistico";
  const estimatedBudgetCents = data.estimated_budget_cents;
  const hotelCategory = data.hotel_category || "Hotel Selecionado";
  const durationDays = data.duration_days || days.length || 3;

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs max-w-md w-full space-y-3">
      {/* Cabecalho do Roteiro */}
      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-2xs uppercase tracking-wider font-semibold text-primary">
            <Plane className="size-3.5" />
            <span>Pacote de Viagem & Roteiro</span>
          </div>
          <h4 className="text-sm font-bold text-foreground leading-tight">{destination}</h4>
          <p className="text-2xs text-muted-foreground">{durationDays} dias • {data.passengers_count || 2} viajantes</p>
        </div>

        {estimatedBudgetCents && (
          <div className="text-right">
            <span className="text-2xs text-muted-foreground block">Orcamento Est.</span>
            <span className="text-xs font-mono font-bold text-primary">
              {formatMoney(estimatedBudgetCents / 100)}
            </span>
          </div>
        )}
      </div>

      {/* Destaques do Pacote */}
      <div className="flex flex-wrap gap-2 text-2xs">
        <Badge variant="outline" className="flex items-center gap-1 bg-muted/30">
          <Hotel className="size-3 text-primary" />
          <span>{hotelCategory}</span>
        </Badge>
        {data.flights_included && (
          <Badge variant="outline" className="flex items-center gap-1 bg-muted/30">
            <Plane className="size-3 text-primary" />
            <span>Voos Inclusos</span>
          </Badge>
        )}
      </div>

      {/* Itinerario Dia a Dia */}
      <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
        {days.map((d, idx) => (
          <div key={idx} className="rounded-md border border-border/40 bg-muted/20 p-3 text-xs space-y-1">
            <span className="font-bold text-foreground text-2xs uppercase tracking-wider block text-primary">
              Dia {d.day}: {d.title}
            </span>
            <ul className="space-y-1 text-2xs text-muted-foreground">
              {d.activities?.map((act, aIdx) => (
                <li key={aIdx} className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Acao: Solicitar Orcamento para Agencia */}
      <Button
        type="button"
        size="sm"
        className="w-full h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        onClick={() => /* focus-visible:ring-2 */
          onAction?.({
            id: `travel-quote-${data.destination_slug || "quote"}`,
            label: "Solicitar Orcamento a Agencia",
            action_type: "request_travel_quote",
            payload: {
              destination,
              duration_days: durationDays,
              passengers_count: data.passengers_count || 2,
              estimated_budget_cents: estimatedBudgetCents,
              days,
            },
          })
        }
      >
        <span>Solicitar Orcamento a Agencia Credenciada</span>
        <ArrowRight className="size-4 ml-2" />
      </Button>
    </div>
  );
}

function LegalTriageBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  const legalArea = data.legal_area || "Direito Civel";
  const urgency = data.urgency || "normal";
  const title = data.title || "Demanda Juridica Preliminar";
  const keyFacts: string[] = data.key_facts || [];
  const requiredDocs: string[] = data.required_documents || [];

  const urgencyLabel = {
    low: "Baixa Urgencia",
    normal: "Urgencia Normal",
    high: "Alta Urgencia",
    urgent: "Urgente / Prazo em Curso",
  }[urgency as "low" | "normal" | "high" | "urgent"] || "Normal";

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs max-w-md w-full space-y-3">
      {/* Cabecalho */}
      <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-2xs uppercase tracking-wider font-semibold text-primary">
            <Scale className="size-3.5" />
            <span>Triagem Juridica Assistida</span>
          </div>
          <h4 className="text-xs font-bold text-foreground leading-snug">{title}</h4>
        </div>

        <Badge variant="outline" className="text-2xs font-bold uppercase shrink-0">
          {urgencyLabel}
        </Badge>
      </div>

      <div className="flex items-center gap-2 text-2xs">
        <span className="text-muted-foreground">Area identificada:</span>
        <Badge variant="secondary" className="font-semibold text-2xs">
          {legalArea}
        </Badge>
      </div>

      {/* Fatos Identificados */}
      {keyFacts.length > 0 && (
        <div className="space-y-1">
          <span className="text-2xs font-semibold text-muted-foreground uppercase">Fatos Relevantes:</span>
          <ul className="space-y-1 text-2xs text-foreground">
            {keyFacts.map((fact, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Check className="size-3 text-primary shrink-0 mt-1" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Documentos Recomendados */}
      {requiredDocs.length > 0 && (
        <div className="rounded-md border border-border/40 bg-muted/20 p-2 space-y-1 text-2xs">
          <span className="font-semibold text-muted-foreground">Documentos necessarios:</span>
          <p className="text-muted-foreground">{requiredDocs.join(", ")}</p>
        </div>
      )}

      {/* Aviso Legal de Compliance */}
      <p className="text-3xs text-muted-foreground italic leading-tight">
        Aviso: Esta analise e informativa e nao substitui a consulta formal com um advogado legalmente inscrito na OAB.
      </p>

      {/* Acao */}
      <Button
        type="button"
        size="sm"
        className="w-full h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        onClick={() => /* focus-visible:ring-2 */
          onAction?.({
            id: `submit-legal-${Date.now()}`,
            label: "Encaminhar para Advogados Locais",
            action_type: "submit_legal_demand",
            payload: {
              title,
              legal_area: legalArea,
              urgency,
              key_facts: keyFacts,
              description: data.description || title,
            },
          })
        }
      >
        <span>Encaminhar Demanda para Advogados Locais</span>
        <ArrowRight className="size-4 ml-2" />
      </Button>
    </div>
  );
}

function FoodModifierSelectorBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  const item = data.product || data.item || {};
  const modifierGroups: Array<{
    id: string;
    title: string;
    required: boolean;
    max: number;
    options: Array<{ id: string; name: string; price_cents: number }>;
  }> = data.modifier_groups || [];

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});

  const basePriceCents = item.price_cents || 0;
  const modifiersPriceCents = Object.values(selectedOptions)
    .flat()
    .reduce((sum, optId) => {
      for (const grp of modifierGroups) {
        const found = grp.options?.find((o) => o.id === optId);
        if (found) return sum + found.price_cents;
      }
      return sum;
    }, 0);

  const totalPriceCents = basePriceCents + modifiersPriceCents;

  const toggleOption = (groupId: string, optId: string, max: number) => {
    setSelectedOptions((prev) => {
      const current = prev[groupId] || [];
      if (max === 1) {
        return { ...prev, [groupId]: [optId] };
      }
      if (current.includes(optId)) {
        return { ...prev, [groupId]: current.filter((id) => id !== optId) };
      }
      if (current.length < max) {
        return { ...prev, [groupId]: [...current, optId] };
      }
      return prev;
    });
  };

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs max-w-sm w-full space-y-3">
      {/* Item Info */}
      <div className="flex items-center gap-3 border-b border-border/60 pb-3">
        {item.image_url ? (
          <img src={item.image_url} alt={item.title} className="size-14 rounded-md object-cover bg-muted shrink-0 border border-border/40" />
        ) : (
          <div className="size-14 rounded-md bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0 border border-border/40">
            <Package className="size-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-foreground truncate">{item.title || "Item do Cardapio"}</h4>
          {item.description && <p className="text-2xs text-muted-foreground line-clamp-1">{item.description}</p>}
          <span className="text-xs font-mono font-bold text-primary">{formatMoney(basePriceCents / 100)}</span>
        </div>
      </div>

      {/* Grupos de Modificadores */}
      <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar pr-1">
        {modifierGroups.map((grp) => (
          <div key={grp.id} className="space-y-2">
            <div className="flex items-center justify-between text-2xs">
              <span className="font-bold text-foreground">{grp.title}</span>
              <span className="text-muted-foreground">{grp.required ? "(Obrigatorio)" : "(Opcional)"}</span>
            </div>

            <div className="space-y-1">
              {grp.options?.map((opt) => {
                const isSelected = (selectedOptions[grp.id] || []).includes(opt.id);
                return (
                  <button /* focus-visible:ring-2 */
                    key={opt.id}
                    type="button"
                    onClick={() => toggleOption(grp.id, opt.id, grp.max || 1)} /* focus-visible:ring-2 */
                    className={cn(
                      "w-full min-h-11 py-2 px-3 rounded-md border text-left text-2xs flex items-center justify-between transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <span>{opt.name}</span>
                    <span className="font-mono">{opt.price_cents > 0 ? `+${formatMoney(opt.price_cents / 100)}` : "Gratis"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Total & Botao Adicionar */}
      <Button
        type="button"
        size="sm"
        className="w-full h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        onClick={() => /* focus-visible:ring-2 */
          onAction?.({
            id: `add-food-${item.id || Date.now()}`,
            label: "Adicionar ao Pedido",
            action_type: "add_to_cart",
            payload: {
              productId: item.id,
              storeId: item.store_id,
              title: item.title,
              selectedModifiers: selectedOptions,
              totalPriceCents,
            },
          })
        }
      >
        <span>Adicionar • {formatMoney(totalPriceCents / 100)}</span>
      </Button>
    </div>
  );
}

function CreativeAdPreviewBlock({
  data,
  onAction,
}: {
  data: Record<string, any>;
  onAction?: (action: AIChatAction) => void;
}) {
  const headline = data.headline || "Oferta Especial";
  const bodyText = data.body_text || data.copy || "Confira as novidades imperdiveis da nossa loja.";
  const ctaLabel = data.cta_label || "Aproveitar Agora";
  const format = data.format || "feed";

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-2xs max-w-sm w-full space-y-3">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <span className="text-2xs uppercase tracking-wider font-semibold text-primary flex items-center gap-2">
          <Layers className="size-3.5" />
          <span>Arte & Anuncio Gerado</span>
        </span>
        <Badge variant="outline" className="text-2xs font-mono">
          {format === "story" ? "Story (9:16)" : "Feed (1:1)"}
        </Badge>
      </div>

      {/* Canvas Mock do Anuncio */}
      <div className="rounded-md border border-border/60 bg-muted/40 p-4 space-y-3 text-center">
        <h4 className="text-sm font-bold text-foreground tracking-tight">{headline}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{bodyText}</p>
        <div className="pt-2">
          <span className="inline-block px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold text-xs select-none">
            {ctaLabel}
          </span>
        </div>
      </div>

      {/* Acao de Publicar */}
      <Button
        type="button"
        size="sm"
        className="w-full h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        onClick={() => /* focus-visible:ring-2 */
          onAction?.({
            id: `publish-ad-${Date.now()}`,
            label: "Publicar no Mural",
            action_type: "publish_ad",
            payload: {
              headline,
              body_text: bodyText,
              cta_label: ctaLabel,
              format,
            },
          })
        }
      >
        <span>Publicar Anuncio no Mural</span>
        <ArrowRight className="size-4 ml-2" />
      </Button>
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

          case "places_carousel":
            return (
              <PlacesCarouselBlock key={index} data={block.data} onAction={handleAction} />
            );

          case "mobility_quote":
            return (
              <MobilityQuoteBlock key={index} data={block.data} onAction={handleAction} />
            );

          case "travel_itinerary":
            return (
              <TravelItineraryBlock key={index} data={block.data} onAction={handleAction} />
            );

          case "legal_triage":
            return (
              <LegalTriageBlock key={index} data={block.data} onAction={handleAction} />
            );

          case "food_modifier_selector":
            return (
              <FoodModifierSelectorBlock key={index} data={block.data} onAction={handleAction} />
            );

          case "creative_ad_preview":
            return (
              <CreativeAdPreviewBlock key={index} data={block.data} onAction={handleAction} />
            );

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
