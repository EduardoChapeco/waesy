import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ShoppingCart,
  Package,
  Calendar,
  FileText,
  Truck,
  Phone,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

// ==============================================================================
// 1. Tipos Canônicos de Propriedades dos Cards de Comércio
// ==============================================================================

export interface ChatCartCardProps {
  cartId: string;
  storeName?: string;
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unitPriceCents: number;
    totalPriceCents: number;
  }>;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  onUpdateQuantity?: (cartItemId: string, newQty: number) => void;
  onCheckout?: (cartId: string) => void;
}

export interface ChatOrderTrackerCardProps {
  orderId: string;
  orderNumber: string;
  publicToken: string;
  status: string;
  totalCents: number;
  itemsCount: number;
  deliveryAddress?: string;
  courier?: {
    name: string;
    vehicle?: string;
    phone?: string;
  };
  timeline?: Array<{
    id: string;
    eventType: string;
    note: string;
    createdAt: string;
  }>;
}

export interface ChatAppointmentCardProps {
  appointmentId: string;
  serviceTitle: string;
  storeName?: string;
  scheduledAt: string;
  status: string;
  priceCents: number;
  guestName?: string;
  onConfirmPayment?: (appointmentId: string) => void;
}

export interface ChatQuoteCardProps {
  quoteId: string;
  quoteNumber: string;
  storeName?: string;
  status: string;
  totalCents: number;
  conditions?: string;
  validUntil?: string;
  onApprove?: (quoteId: string) => void;
}

// ==============================================================================
// 2. Card de Carrinho Interativo (Chat Cart)
// ==============================================================================

export const ChatCartCard: React.FC<ChatCartCardProps> = ({
  cartId,
  storeName = "Loja Parceira",
  items,
  subtotalCents,
  shippingCents,
  discountCents,
  totalCents,
  onUpdateQuantity,
  onCheckout,
}) => {
  const hasItems = items.length > 0;

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3 w-full max-w-sm">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShoppingCart className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground truncate max-w-44">
              {storeName}
            </h4>
            <p className="text-xs text-muted-foreground">Carrinho Ativo</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs font-mono">
          {items.length} {items.length === 1 ? "item" : "itens"}
        </Badge>
      </div>

      {hasItems ? (
        <div className="space-y-2 py-1">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 text-xs py-1 border-b border-border/30 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">{item.title}</p>
                <p className="text-muted-foreground font-mono">
                  {formatMoney(item.unitPriceCents / 100)} cada
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Diminuir quantidade"
                  className="h-11 w-11 p-0 rounded-md cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  onClick={() => /* focus-visible:ring-2 */ onUpdateQuantity?.(item.id, item.quantity - 1)}
                >
                  {item.quantity === 1 ? (
                    <Trash2 className="size-3 text-muted-foreground" />
                  ) : (
                    <Minus className="size-3 text-muted-foreground" />
                  )}
                </Button>

                <span className="w-6 text-center font-mono font-bold text-foreground">
                  {item.quantity}
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Aumentar quantidade"
                  className="h-11 w-11 p-0 rounded-md cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  onClick={() => /* focus-visible:ring-2 */ onUpdateQuantity?.(item.id, item.quantity + 1)}
                >
                  <Plus className="size-3 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-4 text-center text-xs text-muted-foreground">
          Seu carrinho está vazio
        </div>
      )}

      <div className="space-y-1 pt-2 border-t border-border/50 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-mono">{formatMoney(subtotalCents / 100)}</span>
        </div>
        {shippingCents > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Frete Estimado</span>
            <span className="font-mono">{formatMoney(shippingCents / 100)}</span>
          </div>
        )}
        {discountCents > 0 && (
          <div className="flex justify-between text-primary">
            <span>Desconto</span>
            <span className="font-mono">-{formatMoney(discountCents / 100)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-border/30">
          <span>Total</span>
          <span className="font-mono text-primary">{formatMoney(totalCents / 100)}</span>
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="button"
          disabled={Boolean(hasItems) === false}
          className="w-full h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          onClick={() => /* focus-visible:ring-2 */ onCheckout?.(cartId)}
        >
          Finalizar Compra
        </Button>
      </div>
    </div>
  );
};

// ==============================================================================
// 3. Card de Rastreio Soberano de Pedido (Order Tracker)
// ==============================================================================

const ORDER_STEPS = [
  { id: "pending", label: "Recebido" },
  { id: "paid", label: "Confirmado" },
  { id: "preparing", label: "Preparando" },
  { id: "in_transit", label: "A Caminho" },
  { id: "delivered", label: "Entregue" },
];

export const ChatOrderTrackerCard: React.FC<ChatOrderTrackerCardProps> = ({
  orderId,
  orderNumber,
  status,
  totalCents,
  itemsCount,
  deliveryAddress,
  courier,
  timeline = [],
}) => {
  const getStepIndex = (st: string) => {
    switch (st.toLowerCase()) {
      case "pending":
        return 0;
      case "paid":
        return 1;
      case "preparing":
      case "processing":
        return 2;
      case "shipped":
      case "in_transit":
      case "dispatched":
        return 3;
      case "delivered":
      case "completed":
        return 4;
      default:
        return 1;
    }
  };

  const currentIndex = getStepIndex(status);

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3 w-full max-w-sm">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Package className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              {orderNumber}
            </h4>
            <p className="text-xs font-mono text-muted-foreground">
              {itemsCount} {itemsCount === 1 ? "item" : "itens"} · {formatMoney(totalCents / 100)}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs uppercase font-semibold">
          {ORDER_STEPS[currentIndex]?.label || status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 pt-1">
        {ORDER_STEPS.map((step, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step.id} className="flex flex-col items-center gap-1 text-center">
              <div
                className={cn(
                  "w-full h-1 rounded-full transition-colors",
                  isDone ? "bg-primary" : "bg-muted",
                  isCurrent && "ring-2 ring-primary/30",
                )}
              />
              <span
                className={cn(
                  "text-xs truncate w-full",
                  isCurrent ? "font-bold text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {Boolean(deliveryAddress) && (
        <div className="flex items-start gap-2 p-2 rounded-md bg-muted/30 border border-border/50 text-xs">
          <Truck className="size-3 text-muted-foreground shrink-0 mt-1" />
          <span className="text-muted-foreground line-clamp-2">{deliveryAddress}</span>
        </div>
      )}

      {Boolean(courier) && (
        <div className="flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/20 text-xs">
          <div>
            <p className="font-semibold text-foreground">{courier?.name}</p>
            <p className="text-muted-foreground">{courier?.vehicle || "MotoLink Entregas"}</p>
          </div>
          {Boolean(courier?.phone) && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-11 px-3 rounded-md text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <a href={`tel:${courier?.phone}`}>
                <Phone className="size-3 mr-1" />
                Ligar
              </a>
            </Button>
          )}
        </div>
      )}

      {timeline.length > 0 && (
        <div className="space-y-1 pt-1 text-xs">
          <p className="font-semibold text-foreground text-xs uppercase tracking-wider">
            Últimas Atualizações
          </p>
          <div className="space-y-1">
            {timeline.slice(-2).map((ev) => (
              <div key={ev.id} className="flex items-start gap-1 text-muted-foreground">
                <Clock className="size-3 shrink-0 mt-1" />
                <span className="truncate">{ev.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-border/50">
        <Button
          asChild
          variant="outline"
          className="w-full h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <Link to="/conta/pedidos/$id" params={{ id: orderId }}>
            <ExternalLink className="size-3 mr-2" />
            Abrir Pedido Completo
          </Link>
        </Button>
      </div>
    </div>
  );
};

// ==============================================================================
// 4. Card de Agendamento de Serviço (Appointment)
// ==============================================================================

export const ChatAppointmentCard: React.FC<ChatAppointmentCardProps> = ({
  appointmentId,
  serviceTitle,
  storeName = "Profissional Parceiro",
  scheduledAt,
  status,
  priceCents,
  onConfirmPayment,
}) => {
  const dateFormatted = new Date(scheduledAt).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const isConfirmed = status === "confirmed" || status === "completed";

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3 w-full max-w-sm">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Calendar className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground truncate max-w-44">
              {serviceTitle}
            </h4>
            <p className="text-xs text-muted-foreground">{storeName}</p>
          </div>
        </div>
        <Badge
          variant={isConfirmed ? "default" : "outline"}
          className="text-xs font-semibold"
        >
          {isConfirmed ? "Confirmado" : "Aguardando"}
        </Badge>
      </div>

      <div className="space-y-1 text-xs py-1">
        <div className="flex justify-between text-muted-foreground">
          <span>Horário Marcado</span>
          <span className="font-semibold text-foreground">{dateFormatted}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Valor do Serviço</span>
          <span className="font-mono font-bold text-primary">
            {formatMoney(priceCents / 100)}
          </span>
        </div>
      </div>

      {Boolean(isConfirmed) === false && (
        <div className="pt-2 border-t border-border/50">
          <Button
            type="button"
            className="w-full h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            onClick={() => /* focus-visible:ring-2 */ onConfirmPayment?.(appointmentId)}
          >
            Confirmar e Pagar Agora
          </Button>
        </div>
      )}
    </div>
  );
};

// ==============================================================================
// 5. Card de Orçamento e Cotação (Quote)
// ==============================================================================

export const ChatQuoteCard: React.FC<ChatQuoteCardProps> = ({
  quoteId,
  quoteNumber,
  storeName = "Especialista Parceiro",
  status,
  totalCents,
  conditions,
  validUntil,
  onApprove,
}) => {
  const isApproved = status === "accepted" || status === "approved";
  const validUntilFormatted = validUntil
    ? new Date(validUntil).toLocaleDateString("pt-BR")
    : undefined;

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 space-y-3 w-full max-w-sm">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              {quoteNumber}
            </h4>
            <p className="text-xs text-muted-foreground">{storeName}</p>
          </div>
        </div>
        <Badge
          variant={isApproved ? "default" : "outline"}
          className="text-xs uppercase font-semibold"
        >
          {isApproved ? "Aprovado" : status}
        </Badge>
      </div>

      {Boolean(conditions) && (
        <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/20 p-2 rounded-md border border-border/40">
          {conditions}
        </p>
      )}

      <div className="space-y-1 text-xs py-1">
        <div className="flex justify-between font-bold text-sm text-foreground">
          <span>Valor Estimado</span>
          <span className="font-mono text-primary">{formatMoney(totalCents / 100)}</span>
        </div>
        {Boolean(validUntilFormatted) && (
          <div className="flex justify-between text-muted-foreground text-xs">
            <span>Válido até</span>
            <span>{validUntilFormatted}</span>
          </div>
        )}
      </div>

      {Boolean(isApproved) === false && (
        <div className="pt-2 border-t border-border/50">
          <Button
            type="button"
            className="w-full h-11 rounded-md text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            onClick={() => /* focus-visible:ring-2 */ onApprove?.(quoteId)}
          >
            Aprovar Orçamento
          </Button>
        </div>
      )}
    </div>
  );
};
