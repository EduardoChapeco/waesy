import * as React from "react";
import { useState } from "react";
import { CheckCircle2, Clock, ThumbsUp, Building2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const complaints = content?.complaints || [];
  const filtered = complaints.filter((complaint) => {
    if (filter === "resolved") return complaint.status === "resolved";
    if (filter === "open") return complaint.status !== "resolved";
    return true;
  });

  return (
    <div className={cn("w-full max-w-5xl mx-auto py-8 px-4", design_tokens?.className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">Manifestações públicas</h3>
          <p className="text-xs text-muted-foreground">Registros conectados ao perfil; ausência de itens não significa ausência de manifestações.</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border border-border/50">
          <button onClick={() => setFilter("all")} className={cn("px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-9", filter === "all" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground")}>
            Registros ({complaints.length})
          </button>
          <button onClick={() => setFilter("resolved")} className={cn("px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-9", filter === "resolved" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground")}>
            Resolvidos
          </button>
          <button onClick={() => setFilter("open")} className={cn("px-3 py-2 rounded-lg text-xs font-medium transition-all min-h-9", filter === "open" ? "bg-card text-foreground shadow-xs font-semibold" : "text-muted-foreground")}>
            Em aberto
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="rounded-lg border border-border/60 bg-card p-5 text-sm text-muted-foreground">
            {complaints.length === 0 ? "Nenhum registro de reclamação foi conectado a este bloco." : "Nenhum registro corresponde ao filtro selecionado."}
          </p>
        ) : filtered.map((item) => {
          const date = new Date(item.created_at);
          const dateLabel = Number.isNaN(date.getTime()) ? "Data não informada" : date.toLocaleDateString("pt-BR");
          return (
            <div key={item.id} className="p-5 sm:p-6 rounded-lg border border-border/60 bg-card shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-muted-foreground">{item.protocol}</span>
                  {item.status === "resolved" ? (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Resolvido</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Em atendimento</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{dateLabel}</span>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-sm sm:text-base text-foreground">{item.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1 pt-1"><User className="w-3 h-3" /> {item.consumer_name_masked}</div>
              </div>
              {item.company_reply && (
                <div className="p-4 rounded-lg bg-muted/40 border-l-4 border-primary space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground"><Building2 className="w-3.5 h-3.5 text-primary" /> Resposta da empresa registrada:</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.company_reply}</p>
                  {item.consumer_rating != null && <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1 flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> Avaliação registrada: {item.consumer_rating}/10</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
