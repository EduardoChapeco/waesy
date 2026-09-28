import * as React from "react";
import { useState } from "react";
import { ShieldCheck, Star, Award, Clock, ThumbsUp, MessageSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReputationComplaintModal } from "./reputation-complaint-modal";
import { cn } from "@/lib/utils";

interface ReputationScoreHeaderProps {
 content?: {
 company_name?: string;
 reputation_score?: number;
 reputation_badge?: string;
 total_complaints?: number;
 resolved_percentage?: number;
 would_buy_again_percentage?: number;
 average_response_hours?: number;
 };
 design_tokens?: any;
}

export function ReputationScoreHeader({ content, design_tokens }: ReputationScoreHeaderProps) {
 const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

 const score = content?.reputation_score ?? 9.2;
 const badge = content?.reputation_badge || "Ótimo (RA1000)";
 const total = content?.total_complaints ?? 142;
 const resolved = content?.resolved_percentage ?? 96.5;
 const wouldBuyAgain = content?.would_buy_again_percentage ?? 91.2;
 const responseTime = content?.average_response_hours ?? 3.5;

 return (
 <div className={cn("w-full py-10 px-4 bg-muted/20 border-b border-border/40", design_tokens?.className)}>
 <div className="max-w-5xl mx-auto space-y-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-6 sm:p-8 rounded-2xl border border-border/70 shadow-sm">
 <div className="flex items-center gap-5">
 <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex flex-col items-center justify-center p-2 text-center">
 <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
 {score.toFixed(1)}
 </span>
 <span className="text-[10px] uppercase font-bold text-emerald-600/80 tracking-wider">de 10.0</span>
 </div>

 <div className="space-y-1.5">
 <div className="flex items-center gap-2 flex-wrap">
 <h1 className="text-xl sm:text-2xl font-bold text-foreground">
 {content?.company_name || "Reputação da Empresa"}
 </h1>
 <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs gap-1">
 <ShieldCheck className="w-3.5 h-3.5" />
 Auditada e Verificada
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground">
 Selo de Qualidade: <strong className="text-foreground">{badge}</strong> • Baseado nas avaliações dos últimos 12 meses
 </p>
 </div>
 </div>

 <Button
 size="lg"
 className="min-h-[44px] gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm w-full md:w-auto"
 onClick={() => setIsComplaintModalOpen(true)}
 >
 <AlertCircle className="w-4 h-4" />
 Reclamar Desta Empresa
 </Button>
 </div>

 {/* 4 Cards de Métricas Estilo Reclame Aqui */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
 <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-1">
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
 <span>Índice de Solução</span>
 </div>
 <div className="text-xl sm:text-2xl font-bold text-foreground">{resolved}%</div>
 <div className="text-[10px] text-muted-foreground">Problemas resolvidos</div>
 </div>

 <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-1">
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <Star className="w-3.5 h-3.5 text-amber-500" />
 <span>Voltariam a Fazer Negócio</span>
 </div>
 <div className="text-xl sm:text-2xl font-bold text-foreground">{wouldBuyAgain}%</div>
 <div className="text-[10px] text-muted-foreground">Comprariam novamente</div>
 </div>

 <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-1">
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <Clock className="w-3.5 h-3.5 text-blue-500" />
 <span>Tempo de Resposta</span>
 </div>
 <div className="text-xl sm:text-2xl font-bold text-foreground">{responseTime}h</div>
 <div className="text-[10px] text-muted-foreground">Média de atendimento</div>
 </div>

 <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-1">
 <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
 <MessageSquare className="w-3.5 h-3.5 text-primary" />
 <span>Total Reclamações</span>
 </div>
 <div className="text-xl sm:text-2xl font-bold text-foreground">{total}</div>
 <div className="text-[10px] text-muted-foreground">100% respondidas</div>
 </div>
 </div>
 </div>

 <ReputationComplaintModal
 isOpen={isComplaintModalOpen}
 onClose={() => setIsComplaintModalOpen(false)}
 companyName={content?.company_name || "a Empresa"}
 />
 </div>
 );
}
