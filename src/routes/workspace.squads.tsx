import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Users, Bot, ArrowRight, Play, CheckCircle2, ShieldCheck, 
  Coins, Clock, Layers, ChevronRight, AlertCircle, Loader2
} from "lucide-react";
import { toast } from "sonner";

import { 
  listSquads, executeSquad, AISquadDefinitionDTO, SquadRunResultDTO 
} from "@/services/ai-agent-squad-orchestrator.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/workspace/squads")({
  head: () => ({ meta: [{ title: "Squads de Agentes Autônomos | Workspace Waesy" }] }),
  component: SquadsPage,
});

function SquadsPage() {
  const [selectedSquadSlug, setSelectedSquadSlug] = useState<string>("sales_squad");
  const [promptInput, setPromptInput] = useState("Lead interessado em plano empresarial para 3 lojas com orçamento mensal de R$ 5.000");
  const [runResult, setRunResult] = useState<SquadRunResultDTO | null>(null);

  const { data: squads = [], isLoading } = useQuery({
    queryKey: ["ai-squads-list"],
    queryFn: () => listSquads(),
  });

  const selectedSquad = squads.find((s) => s.slug === selectedSquadSlug) || squads[0];

  const executeMutation = useMutation({
    mutationFn: executeSquad,
    onSuccess: (res) => {
      setRunResult(res);
      toast.success(`Squad ${selectedSquad?.name} concluiu todas as etapas!`);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro na execução do squad");
    },
  });

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header com Estilo Apple HIG */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Squads de Agentes Autônomos
            </h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
              Grafo & Handoff v1.0
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Redes colaborativas de agentes especialistas resolvendo fluxos complexos ponta a ponta com supervisão contínua.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/40">
          <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
          <span>Orçamento e arbitragem fiscalizados por Supervisor Central.</span>
        </div>
      </div>

      {/* Seletor de Squads Canônicos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {squads.map((squad) => {
          const isSelected = squad.slug === selectedSquad?.slug;
          return (
            <button
              key={squad.slug}
              onClick={() => {
                setSelectedSquadSlug(squad.slug);
                setRunResult(null);
                if (squad.slug === "sales_squad") {
                  setPromptInput("Lead interessado em plano empresarial para 3 lojas com orçamento mensal de R$ 5.000");
                } else if (squad.slug === "publishing_squad") {
                  setPromptInput("Criar campanha de lançamento de nova coleção de verão com foco no público jovem");
                } else if (squad.slug === "finance_squad") {
                  setPromptInput("Comprovante PIX de R$ 1.250,00 pago pela Fornecedora de Embalagens Brasil LTDA em 28/09/2026");
                }
              }}
              className={`p-4 rounded-lg border text-left transition-all ${
                isSelected
                  ? "bg-card border-primary shadow-sm ring-1 ring-primary/20"
                  : "bg-card/50 border-border/60 hover:border-border hover:bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{squad.name}</span>
                <Badge variant="secondary" className="text-xs font-mono">
                  {squad.members.length} Agentes
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {squad.description}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span>Teto: ${squad.max_cost_budget_usd.toFixed(3)}</span>
                <span>Max: {squad.max_execution_steps} passos</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detalhes do Squad Selecionado & Pipeline de Agentes */}
      {selectedSquad && (
        <div className="space-y-5">
          <div className="bg-card border border-border/60 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Layers className="size-4 text-primary" /> Pipeline de Handoff do Squad
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{selectedSquad.goal}</p>
              </div>
              <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
                Política: {selectedSquad.arbitration_policy}
              </Badge>
            </div>

            {/* Visualizador de Handoff Horizontal */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              {selectedSquad.members.map((member, idx) => (
                <div key={member.agent_slug} className="flex-1 flex flex-col md:flex-row items-center gap-3">
                  <div className="w-full p-4 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">
                        Passo {member.step_order}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {member.agent.role_label}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-xs text-foreground">{member.agent.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {member.handoff_rule}
                    </p>
                  </div>
                  {idx < selectedSquad.members.length - 1 && (
                    <ArrowRight className="size-4 text-muted-foreground/60 shrink-0 hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Console de Execução Interativa */}
          <div className="bg-card border border-border/60 rounded-lg p-6 space-y-4">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <Play className="size-4 text-primary" /> Disparar Execução do Squad
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Entrada Inicial / Contexto do Negócio:
              </label>
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                className="w-full p-3 rounded-lg bg-muted/20 border border-border/60 text-xs min-h-[90px] focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Insira a demanda inicial para o squad processar..."
              />
            </div>

            <div className="flex justify-end">
              <Button
                disabled={executeMutation.isPending || !promptInput.trim()}
                onClick={() =>
                  executeMutation.mutate({
                    data: {
                      squadSlug: selectedSquad.slug,
                      prompt: promptInput,
                    },
                  })
                }
                className="rounded-lg text-xs h-10 px-5"
              >
                {executeMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" /> Processando Grafo...
                  </>
                ) : (
                  <>
                    <Play className="size-4 mr-2" /> Executar Squad com Handoff
                  </>
                )}
              </Button>
            </div>

            {/* Resultado da Execução com Trilha de Auditoria Forense */}
            {runResult && (
              <div className="mt-6 border-t border-border/40 pt-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-500" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Execução Concluída com Sucesso</p>
                      <p className="text-xs text-muted-foreground">Todos os critérios de aceite foram auditados.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                    <span>Custo: <strong className="text-foreground">${runResult.totalCostUsd.toFixed(5)}</strong></span>
                    <span>Tokens: <strong className="text-foreground">{runResult.totalTokens}</strong></span>
                    <span>Tempo: <strong className="text-foreground">{runResult.durationMs}ms</strong></span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-foreground">Registro de Transições (Handoff Log):</h4>
                  {runResult.handoffs.map((h, i) => (
                    <div key={i} className="p-4 rounded-lg border border-border/40 bg-card space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">
                          Etapa {h.stepIndex}: {h.toAgent}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          ${h.costUsd.toFixed(5)} USD | {h.latencyMs}ms
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <strong>Objetivo:</strong> {h.objective}
                      </p>
                      <div className="p-3 rounded-lg bg-muted/40 font-mono text-xs whitespace-pre-wrap max-h-[160px] overflow-y-auto">
                        {h.workCompleted.output}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
