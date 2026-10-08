import * as React from "react";
import { useState } from "react";
import { ShieldCheck, Star, MessageSquare, AlertCircle, ThumbsUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReputationComplaintModal } from "./reputation-complaint-modal";
import { cn } from "@/lib/utils";

interface ReputationScoreHeaderProps {
 content?: {
 company_name?: string;
	 reputation_score?: number;
	 reputation_badge?: string;
	 provenance_status?: "observed_verified" | "user_reported" | "legacy_unverified";
 total_complaints?: number;
 resolved_percentage?: number;
 would_buy_again_percentage?: number;
 average_response_hours?: number;
 };
 design_tokens?: any;
}

export function ReputationScoreHeader({ content, design_tokens }: ReputationScoreHeaderProps) {
 const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);

	 const verified = content?.provenance_status === "observed_verified";
	 const score = verified ? content?.reputation_score ?? null : null;
	 const badge = verified ? content?.reputation_badge || "Sem classificação" : "Não verificado";
	 const total = verified ? content?.total_complaints ?? null : null;
	 const resolved = verified ? content?.resolved_percentage ?? null : null;
	 const wouldBuyAgain = verified ? content?.would_buy_again_percentage ?? null : null;
	 const responseTime = verified ? content?.average_response_hours ?? null : null;

 return (
 <div className={cn("w-full py-10 px-4 bg-muted/20 border-b border-border/40", design_tokens?.className)}>
 <div className="max-w-5xl mx-auto space-y-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card p-6 sm:p-8 rounded-lg border border-border/70 shadow-sm">
 <div className="flex items-center gap-5">
 <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-emerald-500/10 border-2 border-emerald-500/30 flex flex-col items-center justify-center p-2 text-center">
	 <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
	 {score === null ? "—" : score.toFixed(1)}
 </span>
 <span className="text-[10px] uppercase font-bold text-emerald-600/80 tracking-wider">de 10.0</span>
 </div>

 <div className="space-y-2">
 <div className="flex items-center gap-2 flex-wrap">
 <h1 className="text-xl sm:text-2xl font-bold text-foreground">
 {content?.company_name || "Reputação da Empresa"}
 </h1>
	 <Badge variant="outline" className="text-muted-foreground border-border text-xs gap-1">
	 <ShieldCheck className="w-3.5 h-3.5" />
	 {verified ? "Fonte observada" : "Dados não verificados"}
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground">
	 Indicadores só são exibidos com fonte e método rastreáveis. Classificação: <strong className="text-foreground">{badge}</strong>
 </p>
 </div>
 </div>

 <Button
 size="lg"
 className="min-h-11 gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm w-full md:w-auto"
 onClick={() => setIsComplaintModalOpen(true)}
 >
 <AlertCircle className="w-4 h-4" />
 Reclamar Desta Empresa
 </Button>
 </div>

 {/* 4 Cards de Métricas Estilo Reclame Aqui */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
 <span>Índice de Solução</span>
 </div>
	 <div className="text-xl sm:text-2xl font-bold text-foreground">{resolved === null ? "Sem dados" : `${resolved}%`}</div>
	 <div className="text-[10px] text-muted-foreground">Taxa não é presumida</div>
 </div>

 <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <Star className="w-3.5 h-3.5 text-amber-500" />
 <span>Voltariam a Fazer Negócio</span>
 </div>
	 <div className="text-xl sm:text-2xl font-bold text-foreground">{wouldBuyAgain === null ? "Sem dados" : `${wouldBuyAgain}%`}</div>
	 <div className="text-[10px] text-muted-foreground">Recompra não é presumida</div>
 </div>

 <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <Clock className="w-3.5 h-3.5 text-blue-500" />
 <span>Tempo de Resposta</span>
 </div>
	 <div className="text-xl sm:text-2xl font-bold text-foreground">{responseTime === null ? "Sem dados" : `${responseTime}h`}</div>
	 <div className="text-[10px] text-muted-foreground">Tempo não é presumido</div>
 </div>

 <div className="p-4 rounded-lg border border-border/60 bg-card space-y-1">
 <div className="flex items-center gap-2 text-xs text-muted-foreground">
 <MessageSquare className="w-3.5 h-3.5 text-primary" />
 <span>Total Reclamações</span>
 </div>
	 <div className="text-xl sm:text-2xl font-bold text-foreground">{total ?? "Sem dados"}</div>
	 <div className="text-[10px] text-muted-foreground">Contagem não verificada</div>
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
