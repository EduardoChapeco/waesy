import * as React from "react";
import { Plane, FileCheck, Ship, Shield, Ticket, Building, DollarSign, Bus, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { recordWhatsAppLead } from "@/services/whatsapp-leads.functions";
import { toast } from "sonner";

export interface TourismServicesGridProps {
 title?: string;
 subtitle?: string;
 whatsappPhone?: string;
 storeData?: any;
 services?: Array<{
 title: string;
 desc?: string;
 description?: string;
 badge?: string;
 icon?: any;
 }>;
 products?: any[];
 resolvedProducts?: any[];
}

export const TourismServicesGrid: React.FC<TourismServicesGridProps> = ({
 title = "Nossas Especialidades em Turismo",
 subtitle = "Assessoria completa para que sua única preocupação seja fazer as malas.",
 whatsappPhone,
 storeData,
 services,
 products,
 resolvedProducts,
}) => {
 const effectiveProducts = products || resolvedProducts;

 const effectiveServices = React.useMemo(() => {
 if (services && services.length > 0) return services;
 if (effectiveProducts && effectiveProducts.length > 0) {
 return effectiveProducts.slice(0, 8).map((p: any) => ({
 title: p.title || p.name,
 desc: p.description || p.short_description || "",
 badge: p.is_featured ? "Destaque" : undefined,
 icon: Plane,
 }));
 }
 return [];
 }, [services, effectiveProducts]);

 const handleServiceClick = (serviceTitle: string) => {
 const rawNumber = storeData?.phone || whatsappPhone || "";
 const cleanNumber = rawNumber.replace(/\D/g, "");
 const intlNumber = cleanNumber.length <= 11 && cleanNumber.length > 0 ? `55${cleanNumber}` : cleanNumber;

 if (!intlNumber) {
 toast.error("O contato de WhatsApp não está configurado para esta agência.");
 return;
 }

 const msg = encodeURIComponent(`Olá! Gostaria de mais informações sobre o serviço de *${serviceTitle}*.`);

 // Grava o lead no banco de dados para rastreabilidade no Workspace
 recordWhatsAppLead({
 data: {
 entity_type: "tourism",
 phone_target: intlNumber,
 entity_title: `Serviço de Turismo: ${serviceTitle}`,
 metadata: {
 notes: `Lead originado do grid de especialidades na vitrine`,
 },
 device_type: typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop",
 },
 }).catch(() => null);

 window.open(`https://wa.me/${intlNumber}?text=${msg}`, "_blank");
 };

 if (effectiveServices.length === 0) {
 return null;
 }

 return (
 <div className="w-full py-12 md:py-16 bg-background">
 <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-8">
 <div className="text-center max-w-2xl mx-auto space-y-2">
 <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
 {title}
 </h2>
 <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
 {subtitle}
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {effectiveServices.map((srv, idx) => {
 const Icon = srv.icon || Plane;
 return (
 <div
 key={idx}
 onClick={() => handleServiceClick(srv.title)}
 className="group p-5 rounded-lg bg-card border border-border/70 hover:border-sky-500/60 transition-all cursor-pointer hover:shadow-md flex flex-col justify-between space-y-4"
 >
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <div className="size-10 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
 <Icon className="size-5" />
 </div>
 <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-muted text-muted-foreground border border-border/50">
 {srv.badge}
 </span>
 </div>

 <h3 className="text-sm font-bold text-foreground group-hover:text-sky-600 transition-colors">
 {srv.title}
 </h3>

 <p className="text-xs text-muted-foreground leading-relaxed">
 {srv.desc}
 </p>
 </div>

 <div className="flex items-center text-[11px] font-bold text-sky-600 gap-1 pt-2 border-t border-border/40">
 <span>Consultar Opções</span>
 <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
};

export default TourismServicesGrid;
