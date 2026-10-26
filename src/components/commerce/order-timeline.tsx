import React from "react";
import { CheckCircle2, Clock, Package, Truck, MapPin, XCircle, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/datetime";

interface OrderTimelineProps {
  status: string;
  events?: Array<{
    id: string;
    event_type: string;
    from_status?: string;
    to_status?: string;
    note?: string;
    created_at: string;
  }>;
  shippingMethod?: string;
}

interface StepConfig {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}

export function OrderTimeline({ status, events = [], shippingMethod = "delivery" }: OrderTimelineProps) {
  const isPickup = shippingMethod === "pickup";

  const STEPS: StepConfig[] = [
    {
      key: "created",
      title: "Pedido Realizado",
      subtitle: "Aguardando confirmação",
      icon: Clock,
    },
    {
      key: "paid",
      title: "Confirmado",
      subtitle: "Pagamento aprovado",
      icon: CheckCircle2,
    },
    {
      key: "processing",
      title: "Em Preparação",
      subtitle: "Separando produtos",
      icon: Package,
    },
    {
      key: isPickup ? "ready_for_pickup" : "shipped",
      title: isPickup ? "Pronto para Retirada" : "A Caminho",
      subtitle: isPickup ? "Disponível no balcão" : "Com transportador/motoboy",
      icon: isPickup ? MapPin : Truck,
    },
    {
      key: "delivered",
      title: isPickup ? "Retirado" : "Entregue",
      subtitle: "Pedido finalizado com sucesso",
      icon: CheckCircle2,
    },
  ];

  // Map current status to step index (0 to 4)
  const getStepIndex = (st: string): number => {
    switch (st) {
      case "draft":
      case "awaiting_payment":
        return 0;
      case "payment_processing":
      case "paid":
        return 1;
      case "processing":
        return 2;
      case "ready_for_pickup":
      case "shipped":
        return 3;
      case "delivered":
      case "completed":
        return 4;
      default:
        return -1;
    }
  };

  const isCancelled = ["cancelled", "payment_failed", "returned"].includes(status);
  const currentStepIdx = getStepIndex(status);

  // Group events by destination status to show actual recorded timestamps
  const eventTimestamps: Record<string, string> = {};
  for (const ev of events) {
    if (ev.to_status) {
      eventTimestamps[ev.to_status] = ev.created_at;
    }
    if (ev.event_type === "order_created" || ev.event_type === "created") {
      eventTimestamps["created"] = ev.created_at;
    }
  }

  if (isCancelled) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 sm:p-5 text-foreground space-y-2">
        <div className="flex items-center gap-2 text-destructive font-bold text-sm">
          <XCircle className="size-4 shrink-0" />
          <span>Pedido Cancelado</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Este pedido foi cancelado. Se houve pagamento, o estorno foi provisionado conforme as diretrizes da plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 sm:p-5 text-foreground space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Clock className="size-4 text-primary" />
          Acompanhamento em Tempo Real
        </h3>
        <span className="text-2xs font-mono text-muted-foreground animate-pulse motion-reduce:animate-none">
          Sincronizado
        </span>
      </div>

      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-[11px] sm:before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
        {STEPS.map((step, idx) => {
          const isDone = currentStepIdx > idx;
          const isCurrent = currentStepIdx === idx;
          const isPending = currentStepIdx < idx;
          const StepIcon = step.icon;

          const recordedAt =
            eventTimestamps[step.key] ||
            (idx === 0 && events[0]?.created_at) ||
            null;

          return (
            <div key={step.key} className="relative group">
              {/* Node Icon on Timeline */}
              <div
                className={`absolute -left-6 sm:-left-8 top-0.5 size-6 sm:size-7 rounded-full flex items-center justify-center border-2 transition-colors duration-200 ${
                  isDone
                    ? "bg-primary border-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-background border-primary text-primary ring-4 ring-primary/20 animate-pulse motion-reduce:animate-none"
                    : "bg-muted/40 border-border/60 text-muted-foreground/50"
                }`}
              >
                <StepIcon className="size-3 sm:size-3.5" strokeWidth={2.5} />
              </div>

              {/* Step Info */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-xs font-bold ${
                      isCurrent
                        ? "text-primary"
                        : isDone
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </p>
                  {recordedAt && (
                    <span className="text-2xs font-mono text-muted-foreground">
                      {formatDate(recordedAt)}
                    </span>
                  )}
                </div>
                <p className="text-2xs text-muted-foreground leading-relaxed">
                  {step.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
