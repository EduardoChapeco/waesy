import * as React from "react";
import { Award, ShieldCheck, HeartHandshake, CheckCircle2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReputationBadgesStripProps {
 content?: {
 badges?: Array<{ title: string; desc: string; icon?: string }>;
 };
 design_tokens?: any;
}

export function ReputationBadgesStrip({ content, design_tokens }: ReputationBadgesStripProps) {
 const badges = content?.badges || [
 { title: "Selo RA1000", desc: "Excelência máxima comprovada em atendimento ao consumidor." },
 { title: "Empresa 100% Verificada", desc: "CNPJ e quadro societário auditados pelo Waesy Trust Center." },
 { title: "Atendimento Humanizado", desc: "Sem robôs em looping: atendentes reais prontos para resolver." },
 { title: "Transparência Total", desc: "Todas as ocorrências registradas em blockchain e banco público." },
 ];

 return (
 <div className={cn("w-full max-w-5xl mx-auto py-6 px-4", design_tokens?.className)}>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {badges.map((b, i) => (
 <div key={i} className="p-4 rounded-lg border border-border/60 bg-card/60 flex items-start gap-3 shadow-xs">
 <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
 <Award className="w-4 h-4" />
 </div>
 <div className="space-y-1">
 <h4 className="font-semibold text-xs text-foreground">{b.title}</h4>
 <p className="text-[11px] text-muted-foreground leading-snug">{b.desc}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}
