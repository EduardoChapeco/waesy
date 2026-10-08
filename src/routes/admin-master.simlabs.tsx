import { createFileRoute } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import { AlertTriangle, Brain, ChartBar, Play, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStoreSettings } from "@/services/store.functions";
import { listSimLabPersonas, listResearchSessions, createSimLabPersona, runSimLabResearch } from "@/services/simlab.functions";

export const Route = createFileRoute("/admin-master/simlabs")({
  head: () => ({ meta: [{ title: "SimLab — Personas Sintéticas e Experimentos | Waesy" }] }),
  loader: async () => {
    const store = await getStoreSettings().catch(() => null);
    const [personas, sessions] = await Promise.all([
      listSimLabPersonas().catch(() => []),
      listResearchSessions().catch(() => []),
    ]);
    return { personas, sessions, storeId: store?.id || "" };
  },
  component: AdminSimLabsPage,
});

function AdminSimLabsPage() {
  const { personas = [], sessions = [], storeId = "" } = (Route.useLoaderData?.() as any) || {};
  const [activeTab, setActiveTab] = useState<"sessions" | "personas" | "new_sim">("sessions");
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [personasCount, setPersonasCount] = useState("5");

  const [name, setName] = useState("");
  const [socialClass, setSocialClass] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [occupation, setOccupation] = useState("");
  const [medianIncome, setMedianIncome] = useState("");
  const [profileDescription, setProfileDescription] = useState("");

  const handleRunSimulation = (event: React.FormEvent) => {
    event.preventDefault();
    if (!storeId) return toast.error("Nenhum workspace ativo foi identificado.");
    if (!title.trim() || !objective.trim()) return;
    startTransition(async () => {
      try {
        const result = await runSimLabResearch({
          data: {
            storeId,
            title: title.trim(),
            objective: objective.trim(),
            simulated_personas_count: Number(personasCount),
          },
        });
        toast.success("Exploração qualitativa concluída", {
          description: `Foram geradas ${result.responsesCount} respostas hipotéticas; não é previsão de vendas.`,
        });
        setTitle("");
        setObjective("");
        setActiveTab("sessions");
        window.location.reload();
      } catch (error) {
        toast.error("Não foi possível executar o SimLab", { description: error instanceof Error ? error.message : "Erro inesperado." });
      }
    });
  };

  const handleCreatePersona = (event: React.FormEvent) => {
    event.preventDefault();
    if (!storeId) return toast.error("Nenhum workspace ativo foi identificado.");
    startTransition(async () => {
      try {
        await createSimLabPersona({
          data: {
            storeId,
            name: name.trim(),
            socialClass: socialClass as "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "D_E",
            age: Number(age),
            city: city.trim(),
            state: state.trim().toUpperCase(),
            occupation: occupation.trim(),
            medianIncomeBrl: medianIncome.trim() ? Number(medianIncome) : null,
            prompt_persona: profileDescription.trim(),
            habits: [],
          },
        });
        toast.success("Perfil sintético salvo no workspace", { description: "Calibração: não validada. Nenhum dado de pessoa real foi criado." });
        setName("");
        setSocialClass("");
        setAge("");
        setCity("");
        setState("");
        setOccupation("");
        setMedianIncome("");
        setProfileDescription("");
        window.location.reload();
      } catch (error) {
        toast.error("Não foi possível criar o perfil", { description: error instanceof Error ? error.message : "Erro inesperado." });
      }
    });
  };

  return (
    <div className="min-h-[100dvh] bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Brain className="size-6" /></div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SimLab</h1>
              <p className="text-xs text-muted-foreground">Exploração qualitativa sintética + análise de resultados observados</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">Workspace: {storeId ? "ativo" : "não identificado"}</p>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b border-border/60 pb-3">
          {([
            ["sessions", `Histórico (${sessions.length})`, ChartBar],
            ["personas", `Perfis (${personas.length})`, Users],
            ["new_sim", "Nova exploração", Play],
          ] as const).map(([tab, label, Icon]) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`h-10 shrink-0 rounded-lg px-4 text-xs font-semibold ${activeTab === tab ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"}`}>
              <Icon className="mr-2 inline size-4" />{label}
            </button>
          ))}
        </nav>

        {activeTab === "sessions" && (
          <section className="space-y-4">
            {!sessions.length ? <div className="rounded-lg border border-border p-8 text-center text-xs text-muted-foreground">Nenhuma execução registrada neste workspace.</div> : sessions.map((session: any) => (
              <article key={session.id} className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><Badge variant="outline">{session.evidence_level === "exploratory_synthetic" ? "Exploração sintética" : "Legado · origem não verificada"}</Badge><h2 className="mt-2 text-sm font-bold">{session.title}</h2><p className="text-xs text-muted-foreground">{session.objective}</p></div>
                  <Badge variant={session.status === "completed" ? "secondary" : "outline"}>{session.status}</Badge>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-muted-foreground">{session.summary_insight}</div>
                {session.execution_results?.length > 0 && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{session.execution_results.map((item: any, index: number) => <div key={index} className="rounded-lg border border-border/60 p-3 space-y-2"><div className="flex items-center justify-between gap-2"><strong className="text-xs">{item.persona_name}</strong><Badge variant="outline" className="text-[10px]">{item.response_origin === "llm_synthetic" ? "IA · sintético" : "origem desconhecida"}</Badge></div><p className="text-xs text-muted-foreground">{item.feedback}</p></div>)}</div>}
              </article>
            ))}
          </section>
        )}

        {activeTab === "personas" && (
          <section className="space-y-5">
            <form onSubmit={handleCreatePersona} className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
              <div><h2 className="text-sm font-bold">Criar perfil sintético privado</h2><p className="mt-1 text-xs text-muted-foreground">A descrição e os atributos são premissas fornecidas por você; o perfil não representa uma pessoa real e não é calibrado automaticamente.</p></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Nome fictício"><input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} /></Field>
                <Field label="Classe ABEP informada"><select value={socialClass} onChange={(event) => setSocialClass(event.target.value)} required><option value="">Selecione…</option>{["A1", "A2", "B1", "B2", "C1", "C2", "D_E"].map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
                <Field label="Idade"><input type="number" min="18" max="100" value={age} onChange={(event) => setAge(event.target.value)} required /></Field>
                <Field label="Cidade"><input value={city} onChange={(event) => setCity(event.target.value)} required maxLength={120} /></Field>
                <Field label="UF"><input value={state} onChange={(event) => setState(event.target.value.toUpperCase())} required minLength={2} maxLength={2} placeholder="SC" /></Field>
                <Field label="Ocupação (informada)"><input value={occupation} onChange={(event) => setOccupation(event.target.value)} required maxLength={160} /></Field>
                <Field label="Renda mensal (opcional)"><input type="number" min="0" step="0.01" value={medianIncome} onChange={(event) => setMedianIncome(event.target.value)} placeholder="Deixe vazio se desconhecida" /></Field>
              </div>
              <div className="space-y-2"><label className="text-xs font-semibold">Descrição para o modelo</label><textarea value={profileDescription} onChange={(event) => setProfileDescription(event.target.value)} required minLength={10} maxLength={2000} rows={4} className="w-full rounded-lg border border-input bg-background p-3 text-xs" placeholder="Preferências, contexto e comportamento hipotético; indique o que é suposição." /></div>
              <Button type="submit" disabled={isPending || !storeId} className="gap-2"><Plus className="size-4" />Salvar perfil não calibrado</Button>
            </form>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {personas.map((persona: any) => <article key={persona.id} className="rounded-lg border border-border/80 bg-card p-4 space-y-3"><div className="flex items-start justify-between gap-2"><div><h3 className="text-sm font-bold">{persona.display_name}</h3><p className="text-xs text-muted-foreground">{persona.code}</p></div><Badge variant="outline" className="text-[10px]">{persona.calibration_status || "desconhecida"}</Badge></div><p className="text-xs text-muted-foreground">{persona.region} · {persona.age_range_label} · Classe informada {persona.abep_social_class} · Renda {persona.median_income_brl == null ? "desconhecida" : `R$ ${persona.median_income_brl}`}</p><p className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground">{persona.bio || "Sem descrição adicional."}</p></article>)}
            </div>
          </section>
        )}

        {activeTab === "new_sim" && (
          <section className="rounded-lg border border-border/80 bg-card p-5 space-y-4">
            <div><h2 className="text-sm font-bold">Nova exploração qualitativa</h2><p className="mt-1 text-xs text-muted-foreground">Gera comentários hipotéticos de perfis sintéticos. Não produz intenção percentual, conversão, NPS, elasticidade ou recomendação automática de investimento.</p></div>
            <form onSubmit={handleRunSimulation} className="space-y-4">
              <Field label="Título do experimento"><input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} placeholder="Ex.: mensagem de lançamento da nova oferta" /></Field>
              <div className="space-y-2"><label className="text-xs font-semibold">Hipótese, descrição e contexto</label><textarea value={objective} onChange={(event) => setObjective(event.target.value)} rows={4} required maxLength={4000} className="w-full rounded-lg border border-input bg-background p-3 text-xs" placeholder="Descreva o produto, a mensagem, a região pretendida e o que deseja explorar qualitativamente." /></div>
              <Field label="Perfis curados a consultar (não é amostra probabilística)"><select value={personasCount} onChange={(event) => setPersonasCount(event.target.value)}>{[3, 5, 10, 12, 20, 50].map((count) => <option key={count} value={count}>{count} perfis sintéticos</option>)}</select></Field>
              <Button type="submit" disabled={isPending || !storeId} className="gap-2"><Play className="size-4" />{isPending ? "Gerando reações…" : "Executar exploração"}</Button>
              {!storeId && <p className="flex items-center gap-2 text-xs text-amber-600"><AlertTriangle className="size-4" />Sem workspace ativo; execução desabilitada.</p>}
            </form>
          </section>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><label className="text-xs font-semibold">{label}</label><div className="[&_input]:h-10 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-input [&_input]:bg-background [&_input]:px-3 [&_input]:text-xs [&_select]:h-10 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-input [&_select]:bg-background [&_select]:px-3 [&_select]:text-xs">{children}</div></div>;
}
