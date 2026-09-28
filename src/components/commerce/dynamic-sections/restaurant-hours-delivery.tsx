import * as React from "react";
import { Clock, Truck, MapPin, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface RestaurantHoursDeliveryProps {
 title?: string;
 openingHours?: { days: string; hours: string }[];
 deliveryRadiusKm?: number;
 deliveryFeeCents?: number;
 freeDeliveryThresholdCents?: number;
 estimatedTimeMin?: string;
 address?: string;
 storeData?: any;
}

export function RestaurantHoursDeliverySection({
 title = "Horários de Atendimento & Entrega",
 openingHours,
 deliveryRadiusKm,
 deliveryFeeCents,
 freeDeliveryThresholdCents,
 estimatedTimeMin,
 address,
 storeData,
}: RestaurantHoursDeliveryProps) {
 const activeAddress =
 address ||
 storeData?.address ||
 (storeData?.city ? `${storeData.city} — ${storeData.state || "SC"}` : "Consulte nosso balcão");
 const activeRadiusKm =
 deliveryRadiusKm ??
 storeData?.settings?.service_radius_km ??
 storeData?.service_radius_km ??
 10;
 const activeEstimatedTime =
 estimatedTimeMin ||
 (storeData?.settings?.avg_delivery_minutes
 ? `${storeData.settings.avg_delivery_minutes} min`
 : "30-50 min");

 const activeFreeDeliveryThreshold =
 freeDeliveryThresholdCents ??
 storeData?.settings?.free_delivery_threshold_cents ??
 storeData?.free_delivery_threshold_cents;

 const activeOpeningHours = React.useMemo(() => {
 if (openingHours && openingHours.length > 0) return openingHours;
 if (storeData?.working_hours && typeof storeData.working_hours === "object") {
 const entries = Object.entries(storeData.working_hours);
 if (entries.length > 0) {
 return entries.map(([day, val]: [string, any]) => ({
 days: day.charAt(0).toUpperCase() + day.slice(1),
 hours:
 val?.open && val?.close
 ? `${val.open} às ${val.close}`
 : val?.closed
 ? "Fechado"
 : "A consultar",
 }));
 }
 }
 return [
 { days: "Atendimento", hours: "Consulte nossos horários no balcão ou WhatsApp" },
 ];
 }, [openingHours, storeData]);

 const formatPrice = (cents: number) => {
 return new Intl.NumberFormat("pt-BR", {
 style: "currency",
 currency: "BRL",
 }).format(cents / 100);
 };

 return (
 <section className="py-12 bg-background w-full">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
 <div className="text-center max-w-xl mx-auto space-y-1.5">
 <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground border-border/80">
 Operação
 </Badge>
 <h2 className="text-2xl font-bold text-foreground tracking-tight">{title}</h2>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Card 1: Horários de Cozinha */}
 <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-3 shadow-2xs">
 <div className="flex items-center gap-2 text-foreground font-bold text-sm">
 <Clock className="size-4 text-primary" />
 <span>Horários da Cozinha</span>
 </div>
 <div className="space-y-2 text-xs">
 {activeOpeningHours.map((h, idx) => (
 <div key={idx} className="flex items-center justify-between border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
 <span className="text-muted-foreground">{h.days}</span>
 <span className="font-semibold text-foreground font-mono">{h.hours}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Card 2: Delivery & Prazos */}
 <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-3 shadow-2xs">
 <div className="flex items-center gap-2 text-foreground font-bold text-sm">
 <Truck className="size-4 text-primary" />
 <span>Prazos e Taxas de Entrega</span>
 </div>
 <div className="space-y-2 text-xs">
 <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
 <span className="text-muted-foreground">Tempo Médio:</span>
 <span className="font-semibold text-foreground font-mono">{activeEstimatedTime}</span>
 </div>
 <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
 <span className="text-muted-foreground">Raio de Atendimento:</span>
 <span className="font-semibold text-foreground font-mono">Até {activeRadiusKm} km</span>
 </div>
 {activeFreeDeliveryThreshold ? (
 <div className="flex items-center justify-between">
 <span className="text-muted-foreground">Frete Grátis a partir de:</span>
 <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
 {formatPrice(activeFreeDeliveryThreshold)}
 </span>
 </div>
 ) : (
 <div className="flex items-center justify-between">
 <span className="text-muted-foreground">Taxa de Entrega:</span>
 <span className="font-semibold text-foreground font-mono">Calculada no checkout</span>
 </div>
 )}
 </div>
 </div>

 {/* Card 3: Retirada no Balcão / Endereço */}
 <div className="p-5 rounded-2xl border border-border/80 bg-card space-y-3 shadow-2xs">
 <div className="flex items-center gap-2 text-foreground font-bold text-sm">
 <MapPin className="size-4 text-primary" />
 <span>Retirada e Local</span>
 </div>
 <p className="text-xs text-muted-foreground leading-relaxed">
 Você também pode fazer seu pedido online e retirar no balcão sem fila e sem custo de entrega.
 </p>
 <div className="p-2.5 rounded-xl bg-muted/50 border border-border/60 text-xs font-semibold text-foreground truncate">
 {activeAddress}
 </div>
 </div>
 </div>
 </div>
 </section>
 );
}
