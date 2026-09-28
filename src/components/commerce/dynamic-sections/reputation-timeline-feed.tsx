import * as React from "react";
import { useState } from "react";
import { MessageSquare, CheckCircle2, Clock, ThumbsUp, Building2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ReputationComplaintItem {
 id: string;
 protocol: string;
 title: string;
 description: string;
 consumer_name_masked: string;
 status: "resolved" | "replied" | "open";
 created_at: string;
 company_reply?: string;
 consumer_rating?: number;
}

interface ReputationTimelineFeedProps {
 content?: {
 complaints?: ReputationComplaintItem[];
 };
 design_tokens?: any;
}

export function ReputationTimelineFeed({ content, design_tokens }: ReputationTimelineFeedProps) {
 const [filter, setFilter] = useState<"all" | "resolved" | "open">("all");

 const complaints: ReputationComplaintItem[] = content?.complaints || [
 {
 id: "rc-1",
 protocol: "#REC-2026-9901",
 title: "Dúvida sobre remarcação de assento em pacote de viagem",
 description: "Precisei alterar a data do meu embarque devido a imprevisto familiar e não estava conseguindo pelo app.",
 consumer_name_masked: "Mariana S. (***.451.208-**)",
 status: "resolved",
 created_at: "2026-09-01T14:20:00Z",
 company_reply: "Olá Mariana! Entramos em contato via WhatsApp e realizamos a remarcação para a data solicitada sem cobrança de taxa.",
 consumer_rating: 10,
 },
 {
 id: "rc-2",
 protocol: "#REC-2026-9874",
 title: "Demora no envio do código de rastreio de equipamento",
 description: "Realizei o pedido há 2 dias e ainda não havia recebido o link de rastreamento da transportadora.",
 consumer_name_masked: "Carlos E. (***.889.312-**)",
 status: "resolved",
 created_at: "2026-08-28T09:10:00Z",
 company_reply: "Olá Carlos! O lote de expedição foi conferido e seu código de rastreio WMS já foi encaminhado no seu e-mail.",
 consumer_rating: 9,
 },
 ];

 const filtered = complaints.filter((c) => {
 if (filter === "resolved") return c.status === "resolved";
 if (filter === "open") return c.status !== "resolved";
 return true;
 });

 return (
 <div className={cn("w-full max-w-5xl mx-auto py-8 px-4", design_tokens?.className)}>
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
 <div>
 <h3 className="text-lg font-bold text-foreground">Manifestações Públicas</h3>
 <p className="text-xs text-muted-foreground">Histórico auditado de reclamações e soluções oficiais.</p>
 </div>

 <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-xl border border-border/50">
 <button
 onClick={() => setFilter("all")}
 className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all min-h-[36px]", filter === "all" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground")}
 >
 Todas ({complaints.length})
 </button>
 <button
 onClick={() => setFilter("resolved")}
 className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all min-h-[36px]", filter === "resolved" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground")}
 >
 Resolvidas
 </button>
 <button
 onClick={() => setFilter("open")}
 className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all min-h-[36px]", filter === "open" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground")}
 >
 Em Aberto
 </button>
 </div>
 </div>

 <div className="space-y-4">
 {filtered.map((item) => (
 <div key={item.id} className="p-5 sm:p-6 rounded-2xl border border-border/60 bg-card shadow-sm space-y-4">
 <div className="flex items-center justify-between gap-2 flex-wrap">
 <div className="flex items-center gap-2">
 <span className="font-mono text-xs font-bold text-muted-foreground">{item.protocol}</span>
 {item.status === "resolved" ? (
 <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs flex items-center gap-1">
 <CheckCircle2 className="w-3 h-3" /> Resolvido
 </Badge>
 ) : (
 <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs flex items-center gap-1">
 <Clock className="w-3 h-3" /> Em Atendimento
 </Badge>
 )}
 </div>
 <span className="text-xs text-muted-foreground">
 {new Date(item.created_at).toLocaleDateString("pt-BR")}
 </span>
 </div>

 {/* Pergunta do Consumidor */}
 <div className="space-y-1.5">
 <h4 className="font-bold text-sm sm:text-base text-foreground">{item.title}</h4>
 <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
 <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1 pt-0.5">
 <User className="w-3 h-3" /> {item.consumer_name_masked}
 </div>
 </div>

 {/* Resposta Oficial da Empresa */}
 {item.company_reply && (
 <div className="p-4 rounded-xl bg-muted/40 border-l-4 border-primary space-y-1.5">
 <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
 <Building2 className="w-3.5 h-3.5 text-primary" />
 Resposta Oficial da Empresa:
 </div>
 <p className="text-xs text-muted-foreground leading-relaxed">
 {item.company_reply}
 </p>
 {item.consumer_rating && (
 <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1 flex items-center gap-1">
 <ThumbsUp className="w-3.5 h-3.5" />
 Avaliação do Consumidor: Nota {item.consumer_rating}/10
 </div>
 )}
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 );
}
