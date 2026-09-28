import { useState } from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Zap, TrendingUp, DollarSign, Users, CheckCircle2, RefreshCw, Loader2, Brain, Layers, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type {
  SimLabStatisticalSynthesis,
  SimLabPersonaResponse,
  VerdictStatus,
} from "@/types/simlab";
import { runSimLabResearch } from "@/services/simlab.functions";

type SimlabReviewPanelProps = {
  storeId?: string;
  onRefresh?: () => void;
};

const getVerdictConfig = (verdict?: VerdictStatus | string) => {
  switch (verdict) {
    case "aprovado_para_veiculacao":
    case "approved":
      return {
        label: "Aprovado para Veiculação",
        variant: "default" as const,
        className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
        icon: ShieldCheck,
      };
    case "revisar_com_ajustes":
    case "revise":
      return {
        label: "Revisar com Ajustes",
        variant: "secondary" as const,
        className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        icon: AlertTriangle,
      };
    case "bloqueado_por_alto_risco":
    case "blocked":
      return {
        label: "Bloqueado por Alto Risco",
        variant: "destructive" as const,
        className: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        icon: ShieldAlert,
      };
    default:
      return {
        label: "Aguardando Auditoria",
        variant: "outline" as const,
        className: "bg-muted text-muted-foreground",
        icon: Brain,
      };
  }
};

export function SimlabReviewPanel({ storeId, onRefresh }: SimlabReviewPanelProps) {
  const [offerTitle, setOfferTitle] = useState("Promoção Especial da Semana");
  const [offerObjective, setOfferObjective] = useState(
    "Testar aceitação de pacote com desconto progressivo e parcelamento no carnê digital para a classe C1/B2."
  );
  const [testPrice, setTestPrice] = useState("89.90");
  const [isRunning, setIsRunning] = useState(false);
  const [synthesis, setSynthesis] = useState<SimLabStatisticalSynthesis | null>(null);
  const [responses, setResponses] = useState<SimLabPersonaResponse[]>([]);

  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim() || isRunning) return;

    setIsRunning(true);
    try {
      const res = await runSimLabResearch({
        data: {
          title: `${offerTitle} (R$ ${testPrice})`,
          objective: offerObjective,
          simulated_personas_count: 12,
        },
      });

      if (res && res.synthesis) {
        setSynthesis(res.synthesis);
        setResponses(res.responses || []);
        toast.success("Auditoria SimLab concluída com sucesso!", {
          description: `Veredito: ${getVerdictConfig(res.synthesis.scientific_verdict).label}`,
        });
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      toast.error("Falha ao rodar auditoria: " + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const verdictCfg = getVerdictConfig(synthesis?.scientific_verdict);
  const VerdictIcon = verdictCfg.icon;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-6 shadow-xs select-none">
      {/* Header do Painel */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono uppercase">
              SimLab V2 • Aaru Discrete Choice
            </Badge>
            {synthesis && (
              <Badge className={`text-xs font-semibold py-0.5 px-2 gap-1 ${verdictCfg.className}`}>
                <VerdictIcon className="size-3" />
                <span>{verdictCfg.label}</span>
              </Badge>
            )}
          </div>
          <h3 className="text-base font-bold text-foreground">
            Auditoria Executiva
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Submeta hipóteses, copys ou preços para estimar taxa de aprovação, NPS sintético e objeções reais da população.
          </p>
        </div>

        {synthesis && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSynthesis(null);
              setResponses([]);
            }}
            className="h-8 rounded-xl text-xs gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            <span>Nova Auditoria</span>
          </Button>
        )}
      </div>

      {/* Formulário de Submissão de Hipótese (quando ainda não auditado) */}
      {!synthesis ? (
        <form onSubmit={handleRunAudit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-foreground">Título da Oferta / Produto</label>
              <Input
                value={offerTitle}
                onChange={(e) => setOfferTitle(e.target.value)}
                placeholder="ex: Curso de Inglês, Hamburguer Artesanal, Viagem Gramado"
                className="h-9 rounded-xl text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Preço Unitário (R$)</label>
              <Input
                value={testPrice}
                onChange={(e) => setTestPrice(e.target.value)}
                placeholder="89.90"
                className="h-9 rounded-xl text-xs font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Hipótese Comercial / Texto de Apoio
            </label>
            <Textarea
              value={offerObjective}
              onChange={(e) => setOfferObjective(e.target.value)}
              placeholder="Descreva a oferta, diferenciais e condições de pagamento..."
              className="min-h-[72px] rounded-xl text-xs resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Users className="size-3.5 text-primary" />
              <span>Bancada Amostral: 12 personas representativas (Classes A a D/E)</span>
            </div>

            <Button
              type="submit"
              disabled={isRunning}
              className="h-9 px-4 rounded-xl text-xs font-bold gap-2"
            >
              {isRunning ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Sintetizando Pareceres...</span>
                </>
              ) : (
                <>
                  <Brain className="size-3.5" />
                  <span>Executar Auditoria Científica</span>
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        /* Painel com Resultados e Métricas Sintetizadas */
        <div className="space-y-6">
          {/* Grade de 4 KPIs Executivos */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Taxa de Aprovação
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {synthesis.overall_approval_rate}%
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({100 - synthesis.overall_approval_rate}% rejeição)
                </span>
              </div>
              <Progress value={synthesis.overall_approval_rate} className="h-1 bg-muted/60" />
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                NPS Sintético
              </span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${
                  synthesis.synthetic_nps >= 50
                    ? "text-emerald-500"
                    : synthesis.synthetic_nps >= 0
                    ? "text-amber-500"
                    : "text-rose-500"
                }`}>
                  {synthesis.synthetic_nps > 0 ? `+${synthesis.synthetic_nps}` : synthesis.synthetic_nps}
                </span>
                <span className="text-[10px] text-muted-foreground">zona de fidelidade</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                McFadden Discrete Choice
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Conversão Estimada (IC 95%)
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-primary">
                  {synthesis.estimated_conversion_range[0]}% - {synthesis.estimated_conversion_range[1]}%
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Intervalo estatístico seguro
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Elasticidade de Preço
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {synthesis.price_elasticity_score.toFixed(2)}
                </span>
                <Badge variant="outline" className="text-[9px]">
                  {synthesis.price_elasticity_score > 1.2 ? "Elástica" : "Inelástica"}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">Sensibilidade ao ticket</p>
            </div>
          </div>

          {/* Gatilhos e Barreiras */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border/70 bg-muted/10 space-y-2.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>Top Gatilhos de Compra Identificados</span>
              </span>
              <ul className="space-y-1.5">
                {synthesis.top_3_buying_triggers.map((trig, i) => (
                  <li key={i} className="text-xs text-foreground/90 flex items-start gap-2">
                    <span className="size-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{trig}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-border/70 bg-muted/10 space-y-2.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-amber-500" />
                <span>Top Barreiras e Objeções a Superar</span>
              </span>
              <ul className="space-y-1.5">
                {synthesis.top_3_friction_barriers.map((barr, i) => (
                  <li key={i} className="text-xs text-foreground/90 flex items-start gap-2">
                    <span className="size-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{barr}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Ações Recomendadas */}
          {synthesis.recommended_actions.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-foreground">
                Recomendações do Conselho Científico
              </span>
              <div className="space-y-2">
                {synthesis.recommended_actions.map((act, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-border/60 bg-muted/10 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-bold text-foreground">{act.title}</p>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {act.description}
                      </p>
                    </div>
                    <Badge
                      variant={
                        act.priority === "alta"
                          ? "destructive"
                          : act.priority === "media"
                          ? "secondary"
                          : "outline"
                      }
                      className="text-[9px] uppercase font-mono shrink-0"
                    >
                      Prioridade {act.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Citações Diretas de Consumidores (Verbatims) */}
          {responses.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Depoimentos dos Agentes Sintéticos ({responses.length})
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Microdados IBGE</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                {responses.slice(0, 6).map((resp) => (
                  <div
                    key={resp.id}
                    className="p-3 rounded-xl border border-border/50 bg-background/60 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {resp.archetype?.display_name || "Agente Amostral"}
                      </span>
                      <Badge variant="outline" className="text-[9px]">
                        {resp.archetype?.abep_social_class || "C1"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground italic leading-snug">
                      "{resp.verbatim_reaction}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
