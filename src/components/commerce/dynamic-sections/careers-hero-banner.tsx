import * as React from "react";
import { Briefcase, Users, HeartHandshake, Layers, ArrowDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CareersHeroBannerProps {
 content?: {
 title?: string;
 subtitle?: string;
 description?: string;
 company_name?: string;
 culture_highlights?: Array<{ icon?: string; title: string; desc: string }>;
 };
 design_tokens?: any;
}

export function CareersHeroBanner({ content, design_tokens }: CareersHeroBannerProps) {
 const highlights = content?.culture_highlights || [
 { title: "Cultura Humanizada", desc: "Ambiente colaborativo focado no bem-estar e crescimento mútuo." },
 { title: "Inovação Contínua", desc: "Autonomia para criar, testar e implementar soluções de impacto." },
 { title: "Benefícios Flexíveis", desc: "Planos pensados para as necessidades reais do seu dia a dia." },
 ];

 return (
 <div className={cn("w-full py-16 px-4 bg-muted/20 border-b border-border/40", design_tokens?.className)}>
 <div className="max-w-5xl mx-auto text-center space-y-6">
 <Badge variant="outline" className="px-4 py-1 text-xs gap-2 border-primary/30 text-primary bg-primary/10 mx-auto">
 <Layers className="w-3.5 h-3.5" />
 {content?.company_name ? `Trabalhe Conosco na ${content.company_name}` : "Trabalhe Conosco"}
 </Badge>

 <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground max-w-3xl mx-auto leading-tight">
 {content?.title || "Construa o Futuro Junto Conosco"}
 </h1>

 <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
 {content?.subtitle || "Conectamos talentos excepcionais a desafios transformadores. Conheça nossas oportunidades abertas."}
 </p>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 text-left">
 {highlights.map((h, i) => (
 <div key={i} className="p-5 rounded-lg border border-border/60 bg-card shadow-sm space-y-2">
 <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
 <Users className="w-4 h-4" />
 </div>
 <h3 className="font-semibold text-sm text-foreground">{h.title}</h3>
 <p className="text-xs text-muted-foreground leading-relaxed">{h.desc}</p>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
