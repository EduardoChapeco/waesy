import React, { useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase";
import { Motorcycle, Phone, WhatsappLogo, CheckCircle, Clock, MapPin, ShieldCheck, Sparkle } from "@phosphor-icons/react";

export interface MotoLinkTrackingWidgetProps {
  orderId: string;
  storeId: string;
  initialStatus?: string;
  courierName?: string;
  courierPhone?: string;
  courierVehicle?: string;
  estimatedMinutes?: number;
}

export function MotoLinkTrackingWidget({
  orderId,
  storeId,
  initialStatus = "paid",
  courierName = "Carlos Santos (MotoLink)",
  courierPhone = "(11) 98765-4321",
  courierVehicle = "Honda CG 160 Fan - ABC-1234",
  estimatedMinutes = 25,
}: MotoLinkTrackingWidgetProps) {
  const [status, setStatus] = useState<string>(initialStatus);
  const [eta, setEta] = useState<number>(estimatedMinutes);

  useEffect(() => {
    const supabase = getBrowserClient();
    
    // Inscrição Supabase Realtime no canal do pedido
    const channel = supabase
      .channel(`order_tracking_${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.new && payload.new.status) {
            setStatus(payload.new.status);
            if (payload.new.status === "shipped") setEta(12);
            if (payload.new.status === "delivered") setEta(0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const stages = [
    { key: "paid", label: "Pedido Confirmado", icon: CheckCircle, active: true },
    { key: "preparing", label: "Em Preparação", icon: Clock, active: ["preparing", "shipped", "delivered"].includes(status) },
    { key: "shipped", label: "Saiu para Entrega", icon: Motorcycle, active: ["shipped", "delivered"].includes(status) },
    { key: "delivered", label: "Entregue", icon: ShieldCheck, active: status === "delivered" },
  ];

  const waLink = `https://wa.me/55${courierPhone.replace(/\D/g, "")}?text=Ol%C3%A1%20${encodeURIComponent(courierName)}%2C%20estou%20acompanhando%20o%20pedido%20%23${orderId.slice(0, 6)}`;

  return (
    <div className="bg-surface-paper border border-border rounded-xl p-4 sm:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Motorcycle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-foreground flex items-center gap-1.5">
              MotoLink — Entrega Local Expressa
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                <Sparkle className="w-3 h-3" /> Ao Vivo
              </span>
            </h3>
            <p className="text-xs text-muted-foreground">Tempo estimado de chegada: <strong className="text-foreground">{eta > 0 ? `${eta} min` : "Entregue!"}</strong></p>
          </div>
        </div>
      </div>

      {/* Dynamic Stage Timeline */}
      <div className="grid grid-cols-4 gap-2 pt-1">
        {stages.map((stage) => {
          const Icon = stage.icon;
          return (
            <div key={stage.key} className="flex flex-col items-center text-center space-y-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  stage.active
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-muted text-muted-foreground opacity-60"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[11px] font-medium leading-tight ${stage.active ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {stage.label}
              </span>
              <div className={`h-1 w-full rounded-full ${stage.active ? "bg-foreground" : "bg-border"}`} />
            </div>
          );
        })}
      </div>

      {/* Courier & Vehicle Info Box */}
      <div className="bg-muted/40 border border-border/80 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            {courierName.charAt(0)}
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{courierName}</p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              {courierVehicle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <WhatsappLogo className="w-4 h-4" />
            WhatsApp
          </a>
          <a
            href={`tel:${courierPhone.replace(/\D/g, "")}`}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs font-medium transition-colors cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            Ligar
          </a>
        </div>
      </div>
    </div>
  );
}
