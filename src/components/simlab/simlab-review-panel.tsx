import { useState } from "react";
import { AlertTriangle, Brain, Loader2, MessageSquare, Play } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ObservedExperimentPanel } from "@/components/simlab/observed-experiment-panel";
import { runSimLabResearch } from "@/services/simlab.functions";
import type { SimLabPersonaResponse, SimLabStatisticalSynthesis } from "@/types/simlab";

type SimlabReviewPanelProps = {
  storeId?: string;
  onRefresh?: () => void;
};

export function SimlabReviewPanel({ storeId, onRefresh }: SimlabReviewPanelProps) {
  const [offerTitle, setOfferTitle] = useState("");
  const [offerObjective, setOfferObjective] = useState("");
  const [testPrice, setTestPrice] = useState("");
  const [profileCount, setProfileCount] = useState("5");
  const [isRunning, setIsRunning] = useState(false);
  const [synthesis, setSynthesis] = useState<SimLabStatisticalSynthesis | null>(null);
  const [responses, setResponses] = useState<SimLabPersonaResponse[]>([]);

  const handleRun = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!storeId) {
      toast.error("Selecione um workspace antes de iniciar a exploração.");
      return;
    }
    if (!offerTitle.trim() || !offerObjective.trim() || isRunning) return;
    const parsedPrice = testPrice.trim() ? Number(testPrice) : undefined;
    if (parsedPrice !== undefined && (!Number.isFinite(parsedPrice) || parsedPrice <= 0)) {
      toast.error("Informe um preço positivo ou deixe o campo vazio.");
      return;
    }

    setIsRunning(true);
    try {
      const result = await runSimLabResearch({
        data: {
          storeId,
          title: offerTitle.trim(),
          objective: offerObjective.trim(),
          simulated_personas_count: Number(profileCount),
          ...(parsedPrice === undefined ? {} : { testPriceBrl: parsedPrice }),
        },
      });
      setSynthesis(result.synthesis);
      setResponses(result.responses);
      toast.success("Exploração qualitativa concluída", {
        description: "Respostas de personagens sintéticos; nenhuma previsão de vendas foi calculada.",
      });
      onRefresh?.();
    } catch (error) {
      toast.error("Falha ao executar a exploração", {
        description: error instanceof Error ? error.message : "Erro inesperado.",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const reset = () => {
    setSynthesis(null);
    setResponses([]);
  };

  return (
    <div className="rounded-lg border border-border/80 bg-card p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-2">
          <Badge variant="outline" className="text-[10px]">SimLab · exploração qualitativa sintética</Badge>
          <h3 className="text-base font-bold text-foreground">Explorar uma hipótese comercial</h3>
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
            A IA gera reações hipotéticas de perfis sintéticos curados. Isso não substitui entrevistas, survey ou teste randomizado e não calcula probabilidade de compra.
          </p>
        </div>
        {synthesis && <Button size="sm" variant="outline" onClick={reset}>Nova exploração</Button>}
      </div>

      {!synthesis ? (
        <form onSubmit={(event) => void handleRun(event)} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold text-foreground">Oferta, produto ou proposta</label>
              <Input value={offerTitle} onChange={(event) => setOfferTitle(event.target.value)} placeholder="Descreva o que pretende testar" required />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Preço (opcional)</label>
              <Input type="number" min="0.01" step="0.01" value={testPrice} onChange={(event) => setTestPrice(event.target.value)} placeholder="R$" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">Hipótese e contexto</label>
            <Textarea value={offerObjective} onChange={(event) => setOfferObjective(event.target.value)} placeholder="Público pretendido, região, oferta e o que ainda é incerto" className="min-h-[88px] resize-y" required />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Perfis curados a consultar (máximo 50)</label>
              <Input type="number" min="1" max="50" value={profileCount} onChange={(event) => setProfileCount(event.target.value)} required />
            </div>
            <Button type="submit" disabled={isRunning || !storeId} className="gap-2">
              {isRunning ? <><Loader2 className="size-4 animate-spin" />Gerando respostas…</> : <><Play className="size-4" />Explorar qualitativamente</>}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-2"><Brain className="mt-1 size-4 text-primary" /><div>
              <h4 className="text-xs font-bold text-foreground">Resultado exploratório — sem previsão ou veredito comercial</h4>
              <p className="mt-1 text-xs text-muted-foreground">{synthesis.methodology}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{String(synthesis.provenance?.provider || "Provedor não informado")} · modelo {String(synthesis.provenance?.model || "não informado")} · {responses.length} respostas sintéticas.</p>
            </div></div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border/70 p-4 space-y-2">
              <h4 className="text-xs font-bold">Aspectos favoráveis mencionados</h4>
              {synthesis.top_3_buying_triggers.length ? synthesis.top_3_buying_triggers.map((item, index) => <p key={index} className="text-xs text-muted-foreground">• {item}</p>) : <p className="text-xs text-muted-foreground">Nenhum tema favorável foi retornado.</p>}
            </div>
            <div className="rounded-lg border border-border/70 p-4 space-y-2">
              <h4 className="text-xs font-bold">Fricções mencionadas</h4>
              {synthesis.top_3_friction_barriers.length ? synthesis.top_3_friction_barriers.map((item, index) => <p key={index} className="text-xs text-muted-foreground">• {item}</p>) : <p className="text-xs text-muted-foreground">Nenhuma fricção foi retornada.</p>}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-xs font-bold"><MessageSquare className="size-4 text-primary" />Respostas geradas por IA</h4>
            {responses.map((response) => (
              <article key={response.id} className="rounded-lg border border-border/70 bg-background p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold">{response.archetype?.display_name || response.archetype_code || "Perfil sintético"}</span>
                  <Badge variant="outline" className="text-[10px]">Sintético · não é respondente real</Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{response.verbatim_reaction || "Resposta indisponível."}</p>
                {response.provenance?.unknowns && Array.isArray(response.provenance.unknowns) && response.provenance.unknowns.length > 0 && <p className="text-[10px] text-muted-foreground">Desconhecidos: {(response.provenance.unknowns as string[]).join("; ")}</p>}
              </article>
            ))}
          </div>

          <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[10px] text-amber-700 dark:text-amber-300">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>{synthesis.limitations?.join(" ") || "Perfis sintéticos não são amostra representativa; valide com participantes e resultados observados."}</span>
          </div>
          <ObservedExperimentPanel storeId={storeId || ""} experimentId={synthesis.experiment_id} />
        </div>
      )}
    </div>
  );
}
