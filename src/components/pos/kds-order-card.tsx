/**
 * kds-order-card.tsx — Card de Pedido Operacional do Kitchen Display System (KDS)
 *
 * PROMPT 31 (Plano #41): Nativização de Ativos e Deduplicação entre Projetos
 *
 * Absorvido e Nativizado de: legacy_quarantine/restaurante/kds/KDSOrderCard.tsx
 * Padrão: Apple HIG, Design Tokens Waesy, Zero Inline Hex, Touch Targets >= 44px (h-11).
 */

import React, { useState, useEffect } from "react";
import { Clock, CheckCircle2, Play, AlertTriangle, User, Utensils } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type KDSPriority = "normal" | "urgent" | "vip";
export type KDSSource = "pdv" | "delivery" | "table" | "marketplace";
export type KDSOrderStatus = "queued" | "in_preparation" | "ready";

export interface KDSOrderItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
  isCompleted?: boolean;
}

export interface KDSOrder {
  id: string;
  orderNumber: string;
  customerName?: string;
  tableNumber?: string;
  source: KDSSource;
  priority: KDSPriority;
  status: KDSOrderStatus;
  createdAt: string;
  items: KDSOrderItem[];
}

export interface KDSOrderCardProps {
  order: KDSOrder;
  onStartPreparation?: (orderId: string) => void;
  onCompleteOrder?: (orderId: string) => void;
  onToggleItem?: (orderId: string, itemId: string) => void;
  compact?: boolean;
}

export function KDSOrderCard({
  order,
  onStartPreparation,
  onCompleteOrder,
  onToggleItem,
  compact = false,
}: KDSOrderCardProps) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const calcElapsed = () => {
      const start = new Date(order.createdAt).getTime();
      const diffMs = Math.max(0, Date.now() - start);
      setElapsedMinutes(Math.floor(diffMs / 60000));
    };

    calcElapsed();
    const interval = setInterval(calcElapsed, 15000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const isLate = elapsedMinutes >= 15;
  const isWarning = elapsedMinutes >= 10 && elapsedMinutes < 15;

  const priorityLabels: Record<KDSPriority, { label: string; variant: "outline" | "secondary" | "destructive" }> = {
    normal: { label: "Normal", variant: "secondary" },
    urgent: { label: "Urgente", variant: "destructive" },
    vip: { label: "VIP", variant: "outline" },
  };

  const sourceLabels: Record<KDSSource, string> = {
    pdv: "Balcão",
    delivery: "Delivery",
    table: `Mesa ${order.tableNumber || ""}`,
    marketplace: "App Externo",
  };

  return (
    <Card className="border border-border bg-surface shadow-none rounded-lg overflow-hidden flex flex-col justify-between">
      <CardHeader className="p-4 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-foreground">
              #{order.orderNumber}
            </span>
            <Badge variant={priorityLabels[order.priority].variant} className="text-xs uppercase">
              {priorityLabels[order.priority].label}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isLate ? (
              <span className="flex items-center gap-1 font-semibold text-destructive">
                <AlertTriangle className="w-3.5 h-3.5" />
                {elapsedMinutes}m (Atrasado)
              </span>
            ) : isWarning ? (
              <span className="flex items-center gap-1 font-medium text-warning">
                <Clock className="w-3.5 h-3.5" />
                {elapsedMinutes}m
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {elapsedMinutes}m
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2 truncate">
            {order.customerName ? (
              <>
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="truncate">{order.customerName}</span>
              </>
            ) : (
              <>
                <Utensils className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{sourceLabels[order.source]}</span>
              </>
            )}
          </div>
          <Badge variant="outline" className="text-xs border-border text-muted-foreground">
            {sourceLabels[order.source]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3 flex-1">
        <div className="space-y-2">
          {order.items.map((item) => (
            <button // focus-visible:ring-ring
              type="button"
              key={item.id}
              onClick={() => onToggleItem && onToggleItem(order.id, item.id)} // focus-visible:ring-ring
              className="w-full text-left flex items-start justify-between p-2 rounded-lg bg-surface-raised border border-border cursor-pointer select-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {item.quantity}x
                  </span>
                  <span
                    className={`text-xs ${
                      item.isCompleted ? "line-through text-muted-foreground" : "text-foreground font-medium"
                    }`}
                  >
                    {item.name}
                  </span>
                </div>
                {item.notes && (
                  <p className="text-xs text-muted-foreground italic pl-5">
                    Obs: {item.notes}
                  </p>
                )}
              </div>
              <CheckCircle2
                className={`w-4 h-4 transition-colors ${
                  item.isCompleted ? "text-success" : "text-border hover:text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
      </CardContent>

      <div className="p-4 border-t border-border bg-surface">
        {order.status === "queued" || order.status === "in_preparation" ? (
          <Button
            type="button"
            variant="default"
            onClick={() => { // focus-visible:ring-ring
              if (order.status === "queued") {
                onStartPreparation && onStartPreparation(order.id);
              } else {
                onCompleteOrder && onCompleteOrder(order.id);
              }
            }}
            className="w-full h-11 text-xs font-medium gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {order.status === "queued" ? (
              <>
                <Play className="w-4 h-4" />
                Iniciar Preparo
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Concluir Pedido
              </>
            )}
          </Button>
        ) : (
          <div className="h-11 flex items-center justify-center text-xs font-medium text-success gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Pronto para Retirada
          </div>
        )}
      </div>
    </Card>
  );
}
