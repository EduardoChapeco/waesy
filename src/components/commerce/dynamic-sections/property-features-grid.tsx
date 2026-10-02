import * as React from "react";
import { Home, Maximize2, Bed, Bath, Car, Check, Calendar, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";

export interface PropertyFeature {
 areaM2?: number;
 bedrooms?: number;
 suites?: number;
 bathrooms?: number;
 parkingSpots?: number;
 condoFeeCents?: number;
 iptuCents?: number;
 priceCents?: number;
 propertyType?: string;
 amenities?: string[];
 whatsappNumber?: string;
}

export interface PropertyFeaturesGridProps {
 title?: string;
 subtitle?: string;
 features?: PropertyFeature;
 storeData?: any;
 onScheduleClick?: () => void;
}

export function PropertyFeaturesGridSection({
 title = "Ficha Técnica do Imóvel",
 subtitle = "Todos os detalhes estruturais e diferenciais de acabamento.",
 features = {
 areaM2: 142,
 bedrooms: 3,
 suites: 2,
 bathrooms: 3,
 parkingSpots: 2,
 condoFeeCents: 65000,
 iptuCents: 18000,
 priceCents: 98000000,
 propertyType: "Apartamento de Alto Padrão",
 amenities: [
 "Varanda Gourmet com Churrasqueira",
 "Piscina Aquecida",
 "Academia Completa",
 "Portaria 24 Horas",
 "Piso em Porcelanato 90x90",
 "Fechadura Digital",
 ],
 },
 storeData,
 onScheduleClick,
}: PropertyFeaturesGridProps) {
 const formatPrice = (cents?: number) => {
 if (!cents) return "-";
 return new Intl.NumberFormat("pt-BR", {
 style: "currency",
 currency: "BRL",
 maximumFractionDigits: 0,
 }).format(cents / 100);
 };

 const handleWhatsApp = () => {
 const rawNumber = storeData?.phone || features.whatsappNumber || "";
 const cleanNumber = rawNumber.replace(/\D/g, "");
 const intlNumber = cleanNumber.length <= 11 && cleanNumber.length > 0 ? `55${cleanNumber}` : cleanNumber;

 if (!intlNumber) {
 toast.error("O contato de WhatsApp não está configurado para este imóvel.");
 return;
 }

 const msg = encodeURIComponent(
 `Olá! Tenho interesse no imóvel "${title}". Gostaria de agendar uma visita e tirar dúvidas sobre a ficha técnica.`
 );
 window.open(`https://wa.me/${intlNumber}?text=${msg}`, "_blank");
 };

 return (
 <section className="py-12 bg-background w-full">
 <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
 <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/60 pb-6">
 <div className="space-y-2">
 <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase">
 <Home className="size-3.5 text-primary" />
 <span>{features.propertyType || "Imóvel"}</span>
 </div>
 <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h2>
 {subtitle && <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
 </div>

 <div className="text-left sm:text-right">
 <span className="text-xs text-muted-foreground block">Valor de Venda</span>
 <span className="text-2xl sm:text-3xl font-bold text-foreground font-mono">
 {formatPrice(features.priceCents)}
 </span>
 </div>
 </div>

 {/* Grade de 4 Pilares Estruturais */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
 <div className="p-4 rounded-lg border border-border/80 bg-card text-center space-y-1 shadow-2xs">
 <Maximize2 className="size-5 mx-auto text-primary" />
 <span className="text-xl font-bold text-foreground font-mono block">
 {features.areaM2 || 0} m²
 </span>
 <span className="text-[11px] text-muted-foreground">Área Privativa</span>
 </div>

 <div className="p-4 rounded-lg border border-border/80 bg-card text-center space-y-1 shadow-2xs">
 <Bed className="size-5 mx-auto text-primary" />
 <span className="text-xl font-bold text-foreground font-mono block">
 {features.bedrooms || 0} ({features.suites || 0} Suítes)
 </span>
 <span className="text-[11px] text-muted-foreground">Dormitórios</span>
 </div>

 <div className="p-4 rounded-lg border border-border/80 bg-card text-center space-y-1 shadow-2xs">
 <Bath className="size-5 mx-auto text-primary" />
 <span className="text-xl font-bold text-foreground font-mono block">
 {features.bathrooms || 0}
 </span>
 <span className="text-[11px] text-muted-foreground">Banheiros</span>
 </div>

 <div className="p-4 rounded-lg border border-border/80 bg-card text-center space-y-1 shadow-2xs">
 <Car className="size-5 mx-auto text-primary" />
 <span className="text-xl font-bold text-foreground font-mono block">
 {features.parkingSpots || 0}
 </span>
 <span className="text-[11px] text-muted-foreground">Vagas de Garagem</span>
 </div>
 </div>

 {/* Diferenciais e Lazer */}
 {features.amenities && features.amenities.length > 0 && (
 <div className="p-6 rounded-lg border border-border/80 bg-card space-y-4 shadow-2xs">
 <h3 className="text-sm font-bold text-foreground">Diferenciais e Infraestrutura</h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
 {features.amenities.map((item, idx) => (
 <div key={idx} className="flex items-center gap-2 text-xs text-foreground/90">
 <Check className="size-3.5 text-primary shrink-0" />
 <span>{item}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Botão de Agendamento */}
 <div className="flex items-center justify-center gap-3 pt-2">
 <Button
 type="button"
 size="lg"
 onClick={handleWhatsApp}
 className="rounded-lg font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer gap-2 h-11 px-6"
 >
 <MessageSquare className="size-4" />
 <span>Agendar Visita no WhatsApp</span>
 </Button>
 </div>
 </div>
 </section>
 );
}
