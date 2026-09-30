import * as React from "react";
import { ShieldCheck, Truck, Lock, RotateCcw, CreditCard, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustBadge {
 icon: string;
 title: string;
 description?: string;
 subtitle?: string; // backwards compatibility
}

interface TrustBadgesProps {
 content?: {
 badges?: TrustBadge[];
 };
 design_tokens?: any;
}

export function TrustBadges({ content, design_tokens }: TrustBadgesProps) {
 const badges = content?.badges || [
 { icon: "shield", title: "Atendimento Local", description: "Comércio e serviços da sua cidade" },
 { icon: "truck", title: "Frete Expresso", description: "Entrega rápida para todo Brasil" },
 { icon: "return", title: "Troca Fácil", description: "1ª troca grátis em até 7 dias" },
 { icon: "award", title: "Lojas Verificadas", description: "Identidade comercial cadastrada" },
 ];

 const getIcon = (iconName: string) => {
 if (!iconName) return <ShieldCheck className="w-8 h-8 @md:w-10 @md:h-10 text-primary" />;
 if (iconName.startsWith("http") || iconName.startsWith("/")) {
 return (
 <img src={iconName} alt="Badge" className="w-8 h-8 @md:w-10 @md:h-10 object-contain" />
 );
 }
 switch (iconName) {
 case "shield":
 return <ShieldCheck className="w-8 h-8 @md:w-10 @md:h-10 text-primary" />;
 case "truck":
 return <Truck className="w-8 h-8 @md:w-10 @md:h-10 text-primary" />;
 case "lock":
 return <Lock className="w-8 h-8 @md:w-10 @md:h-10 text-primary" />;
 case "return":
 return <RotateCcw className="w-8 h-8 @md:w-10 @md:h-10 text-primary" />;
 case "card":
 return <CreditCard className="w-8 h-8 @md:w-10 @md:h-10 text-primary" />;
 case "award":
 return <Award className="w-8 h-8 @md:w-10 @md:h-10 text-primary" />;
 default:
 return <ShieldCheck className="w-8 h-8 @md:w-10 @md:h-10 text-primary" />;
 }
 };

 return (
 <div
 className={cn(
 "w-full grid grid-cols-2 @md:grid-cols-4 gap-6 py-12 px-4 border-y border-border/30 bg-muted/30 backdrop-blur-sm",
 design_tokens?.className,
 )}
 style={{
 backgroundColor: design_tokens?.backgroundColor,
 color: design_tokens?.textColor,
 }}
 >
 {(badges || []).map((badge, idx) => (
 <div
 key={idx}
 className="group flex flex-col items-center text-center gap-4 transition-transform duration-300 hover:-translate-y-1"
 >
 <div className="p-4 bg-background group-hover: transition-shadow duration-300 group-hover:border-primary/20">
 {getIcon(badge.icon)}
 </div>
 <div>
 <h4 className="font-bold text-[15px] tracking-tight text-foreground">{badge.title}</h4>
 {(badge.description || badge.subtitle) && (
 <p className="text-[13px] leading-relaxed text-muted-foreground mt-1.5">
 {badge.description || badge.subtitle}
 </p>
 )}
 </div>
 </div>
 ))}
 </div>
 );
}
