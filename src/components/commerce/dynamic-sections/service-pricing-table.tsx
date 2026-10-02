import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Check, Layers, Calendar, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ServicePricingTableProps {
 title?: string;
 subtitle?: string;
 products?: any[];
 packages?: {
 name: string;
 description: string;
 price: string;
 period?: string;
 popular?: boolean;
 features: string[];
 buttonText?: string;
 link?: string;
 }[];
}

export const ServicePricingTable: React.FC<ServicePricingTableProps> = ({
 title = "Planos & Tabela de Procedimentos",
 subtitle = "Escolha o pacote ideal para suas necessidades com horários flexíveis e profissionais certificados.",
 products,
 packages,
}) => {
 const activePackages = React.useMemo(() => {
 if (packages && packages.length > 0) return packages;
 if (products && products.length > 0) {
 return products.slice(0, 3).map((p: any, idx: number) => {
 const priceCents = p.price_cents || p.priceCents || (p.price ? Math.round(p.price * 100) : 0);
 const formattedPrice = new Intl.NumberFormat("pt-BR", {
 style: "currency",
 currency: "BRL",
 }).format(priceCents / 100);

 return {
 name: p.title || p.name,
 description: p.description || p.short_description || "Procedimento especializado com atendimento personalizado.",
 price: formattedPrice,
 period: p.food_specs?.preparationTimeMinutes ? `/${p.food_specs.preparationTimeMinutes} min` : "/sessão",
 popular: idx === 1 || !!p.is_featured,
 features: Array.isArray(p.ingredients) && p.ingredients.length > 0
 ? p.ingredients
 : ["Atendimento personalizado", "Profissionais certificados", "Garantia de qualidade"],
 buttonText: "Agendar Horário",
 link: `/agendar?serviceId=${p.id}`,
 };
 });
 }
 return [];
 }, [packages, products]);

 if (activePackages.length === 0) {
 return null;
 }
 return (
 <div className="w-full py-12 md:py-18 bg-muted/20">
 <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-10">
 <div className="text-center max-w-2xl mx-auto space-y-2">
 <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
 {title}
 </h2>
 <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
 {subtitle}
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
 {activePackages.map((pkg, idx) => (
 <div
 key={idx}
 className={cn(
 "rounded-lg p-6 sm:p-8 flex flex-col justify-between transition-all bg-card border",
 pkg.popular
 ? "border-primary shadow-xl ring-2 ring-primary/20 relative scale-102 z-10"
 : "border-border/70 shadow-xs hover:border-border"
 )}
 >
 {pkg.popular && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-sm">
 <Layers className="size-3" />
 <span>Mais Recomendado</span>
 </div>
 )}

 <div className="space-y-4">
 <div className="space-y-1">
 <h3 className="text-lg font-bold text-foreground">{pkg.name}</h3>
 <p className="text-xs text-muted-foreground leading-relaxed">{pkg.description}</p>
 </div>

 <div className="flex items-baseline gap-1 pt-2 pb-4 border-b border-border/50">
 <span className="text-3xl font-extrabold text-foreground">{pkg.price}</span>
 {pkg.period && <span className="text-xs text-muted-foreground font-medium">{pkg.period}</span>}
 </div>

 <div className="space-y-3">
 <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">O que está incluso:</p>
 <ul className="space-y-2">
 {(pkg.features || []).map((feat: string, fIdx: number) => (
 <li key={fIdx} className="flex items-start gap-2 text-xs text-foreground/90">
 <Check className="size-3.5 text-emerald-500 shrink-0 mt-1" />
 <span>{feat}</span>
 </li>
 ))}
 </ul>
 </div>
 </div>

 <Button
 asChild
 className={cn(
 "w-full h-10 mt-6 rounded-lg text-xs font-bold gap-2 cursor-pointer shadow-xs",
 pkg.popular
 ? "bg-primary text-primary-foreground hover:bg-primary/90"
 : "bg-muted hover:bg-muted/80 text-foreground border border-border/70"
 )}
 >
 <Link to={pkg.link || "/agendar"}>
 <Calendar className="size-3.5" />
 <span>{pkg.buttonText || "Agendar Horário"}</span>
 <ArrowRight className="size-3.5" />
 </Link>
 </Button>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
};

export default ServicePricingTable;
