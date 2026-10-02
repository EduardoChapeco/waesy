/**
 * admin-master.simlabs.tsx — SimLabs: Laboratório de Personas Sintéticas & IA
 * Simulação de Mercado, Intenção de Compra de Personas e Testes Cognitivos de Produtos.
 * Padrão Apple HIG Silencioso, Anti-Pill e Mobile-First.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { Brain, Users, Play, CheckCircle, Sliders, Plus, ChartBar, Target, Lightbulb } from "@phosphor-icons/react";
import { listSimLabPersonas, listResearchSessions, createSimLabPersona, runSimLabResearch } from "@/services/simlab.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-master/simlabs")({
  head: () => ({ meta: [{ title: "SimLabs e Personas Sintéticas | Waesy" }] }),
  loader: async () => {
    try {
      const [personas, sessions] = await Promise.all([
        listSimLabPersonas().catch(() => []),
        listResearchSessions().catch(() => []),
      ]);
      return { personas, sessions };
    } catch {
      return { personas: [], sessions: [] };
    }
  },
  component: AdminSimLabsPage,
});

function AdminSimLabsPage() {
  const { personas, sessions } = ((Route.useLoaderData?.() as any) || {});
  const [activeTab, setActiveTab] = useState<"sessions" | "personas" | "new_sim">("sessions");
  const [isPending, startTransition] = useTransition();

  // Form Simulação
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [personasCount, setPersonasCount] = useState("5");

  // Form Persona
  const [name, setName] = useState("");
  const [archetype, setArchetype] = useState("");
  const [neighborhood, setNeighborhood] = useState("Centro");
  const [promptPersona, setPromptPersona] = useState("");

  const handleRunSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !objective) return;

    startTransition(async () => {
      try {
        await runSimLabResearch({
          data: {
            title,
            objective,
            simulated_personas_count: parseInt(personasCount) || 5,
          },
        });
        toast.success("Simulação de mercado executada com sucesso!");
        setTitle("");
        setObjective("");
        setActiveTab("sessions");
      } catch (err: any) {
        toast.error(err.message || "Erro ao executar simulação");
      }
    });
  };

  const handleCreatePersona = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !archetype || !promptPersona) return;

    startTransition(async () => {
      try {
        await createSimLabPersona({
          data: {
            name,
            archetype,
            neighborhood,
            prompt_persona: promptPersona,
            habits: ["compras locais", "mobile", "pix"],
          },
        });
        toast.success("Persona sintética criada com sucesso!");
        setName("");
        setArchetype("");
        setPromptPersona("");
        setActiveTab("personas");
      } catch (err: any) {
        toast.error(err.message || "Erro ao criar persona");
      }
    });
  };

  return (
    <div className="min-h-[100dvh] bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header Apple HIG */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Brain className="size-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                SimLabs: Inteligência Sintética
              </h1>
              <p className="text-xs text-muted-foreground">
                Simulações de mercado calibradas com microdados populacionais e testes de elasticidade.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full pb-1">
            <button
              onClick={() => setActiveTab("sessions")}
              className={`rounded-lg px-4 h-11 text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                activeTab === "sessions"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <ChartBar className="mr-2 inline size-4" />
              Pesquisas ({sessions?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("personas")}
              className={`rounded-lg px-4 h-11 text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                activeTab === "personas"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Users className="mr-2 inline size-4" />
              Personas ({personas?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("new_sim")}
              className={`rounded-lg px-4 h-11 text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                activeTab === "new_sim"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Play className="mr-2 inline size-4" />
              Nova Simulação
            </button>
          </div>
        </div>

        {/* Tab 1: Pesquisas e Insights */}
        {activeTab === "sessions" && (
          <div className="space-y-4">
            {(!sessions || sessions.length === 0) ? (
              <div className="rounded-lg border border-border/80 bg-card p-8 sm:p-12 text-center">
                <Brain className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-bold text-foreground">Nenhuma pesquisa simulada executada</p>
                <p className="mt-1 text-xs text-muted-foreground">Inicie uma nova simulação para testar propostas com o conselho sintético.</p>
              </div>
            ) : (
              sessions.map((session: any) => (
                <div key={session.id} className="rounded-lg border border-border/80 bg-card p-5 sm:p-6 space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="rounded-md font-medium text-[11px] px-2 py-1 bg-primary/10 text-primary border border-primary/20">
                        Sessão Preditiva
                      </span>
                      <h2 className="mt-2 text-base sm:text-lg font-bold text-foreground">{session.title}</h2>
                      <p className="text-xs text-muted-foreground">{session.objective}</p>
                    </div>

                    <span className="rounded-md font-medium text-[11px] px-3 py-1 border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 self-start sm:self-auto">
                      Concluída
                    </span>
                  </div>

                  {/* Summary Box */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-xs text-foreground">
                    <div className="flex items-center gap-2 font-bold text-primary mb-1">
                      <Lightbulb className="size-4" />
                      Síntese Preditiva da População Sintética
                    </div>
                    <p className="leading-relaxed text-muted-foreground">{session.summary_insight}</p>
                  </div>

                  {/* Personas Feedback */}
                  {session.execution_results && session.execution_results.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {session.execution_results.map((res: any, idx: number) => (
                        <div key={idx} className="rounded-lg border border-border/80 bg-background p-4 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">{res.persona_name}</span>
                            <span className="rounded-md font-medium text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {res.purchase_intent}% intenção
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-snug">{res.feedback}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Personas */}
        {activeTab === "personas" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(personas || []).map((persona: any) => (
              <div key={persona.id} className="rounded-lg border border-border/80 bg-card p-4 sm:p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Users className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-foreground truncate">{persona.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{persona.archetype}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>Região:</span> <span className="font-medium text-foreground">{persona.neighborhood}</span></div>
                    <div className="flex justify-between"><span>Idade:</span> <span className="font-medium text-foreground">{persona.age_range} anos</span></div>
                    <div className="flex justify-between"><span>Estrato Social:</span> <span className="font-medium text-foreground">Classe {persona.income_level}</span></div>
                  </div>
                </div>

                <p className="mt-3 rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground line-clamp-3 italic border border-border/40">
                  "{persona.prompt_persona}"
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Nova Simulação */}
        {activeTab === "new_sim" && (
          <div className="rounded-lg border border-border/80 bg-card p-5 sm:p-6">
            <h2 className="text-base font-bold text-foreground">Nova Simulação de Mercado</h2>
            <p className="text-xs text-muted-foreground mt-1">
              O esquadrão de personas sintéticas avaliará o apelo da oferta, barreiras de fricção e intenção de compra.
            </p>

            <form onSubmit={handleRunSimulation} className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Título do Experimento</label>
                <input
                  type="text"
                  placeholder="Ex: Lançamento de Combo Noturno com Frete Grátis"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-11 rounded-lg border border-input bg-background px-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Hipótese / Objetivo do Teste</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Validar se consumidores das classes C e D aceitariam pagar R$ 89,90 pelo combo com entrega garantida..."
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Amostragem Demográfica</label>
                <select
                  value={personasCount}
                  onChange={(e) => setPersonasCount(e.target.value)}
                  className="w-full h-11 rounded-lg border border-input bg-background px-4 text-xs text-foreground focus:border-primary focus:outline-none cursor-pointer"
                >
                  <option value="3">3 Personas (Sonda Rápida)</option>
                  <option value="5">5 Personas (Padrão Calibrado)</option>
                  <option value="10">10 Personas (Aprofundado IBGE/ABEP)</option>
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 h-11 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                >
                  <Play className="size-4" />
                  {isPending ? "Simulando Amostra..." : "Executar Experimento IA"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
