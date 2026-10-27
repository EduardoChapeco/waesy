import { useRef, useState } from "react";
import { toast } from "sonner";
import { Globe, Loader2, Save, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getWebAgentSettings, saveWebAgentSettings, webAgentStepFn, type WebAgentStepResult } from "@/services/web-agent.functions";
import { useEffect } from "react";
import type { AgentStepRecord } from "@/lib/web-agent/agent-core";

type Phase = "idle" | "running" | "done" | "error" | "stopped";

const OUTCOME_LABEL: Record<AgentStepRecord["outcome"], string> = {
  ok: "Lido",
  blocked: "Bloqueado",
  error: "Falha",
  finished: "Concluído",
};

export function WebAgentPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hosts, setHosts] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [maxSteps, setMaxSteps] = useState(6);

  const [goal, setGoal] = useState("");
  const [startUrl, setStartUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [steps, setSteps] = useState<AgentStepRecord[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    let alive = true;
    getWebAgentSettings()
      .then((s) => {
        if (!alive) return;
        setHosts(s.allowedHosts.join("\n"));
        setMaxSteps(s.maxSteps);
      })
      .catch((err) => alive && setLoadError(err instanceof Error ? err.message : "Falha ao carregar."))
      .finally(() => alive && setIsLoading(false));
    return () => {
      alive = false;
      stopRef.current = true;
    };
  }, []);

  const saveHosts = async () => {
    setIsSaving(true);
    try {
      const res = await saveWebAgentSettings({ data: { allowedHosts: hosts.split(/[\n,]+/).map((h) => h.trim()).filter(Boolean) } });
      setHosts(res.allowedHosts.join("\n"));
      toast.success("Domínios salvos.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const run = async () => {
    if (goal.trim().length < 3 || !startUrl.trim()) {
      toast.error("Informe objetivo e URL inicial.");
      return;
    }
    stopRef.current = false;
    setPhase("running");
    setSteps([]);
    setAnswer(null);
    setError(null);

    let history: AgentStepRecord[] = [];
    let currentUrl: string | undefined;
    try {
      for (let i = 0; i < maxSteps; i++) {
        if (stopRef.current) {
          setPhase("stopped");
          return;
        }
        const res = (await webAgentStepFn({ data: { goal: goal.trim(), startUrl: startUrl.trim(), currentUrl, history } })) as WebAgentStepResult;
        history = [...history, res.step];
        setSteps(history);
        if (res.error) {
          setError(res.error);
          setPhase("error");
          return;
        }
        if (res.done) {
          setAnswer(res.answer || "Sem resposta.");
          setPhase("done");
          return;
        }
        currentUrl = res.currentUrl;
      }
      setError("Limite de passos atingido sem resposta.");
      setPhase("error");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao executar.");
      setPhase("error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
        <span>Carregando</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <p role="alert" className="p-6 rounded-lg border border-destructive/40 text-sm text-destructive">
        {loadError}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-lg border border-border/70 space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Globe className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Agente de Pesquisa Web</h3>
            <p className="text-xs text-muted-foreground mt-1">Lê páginas com a pool gratuita. O site inicial é sempre permitido.</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent-hosts">Domínios extras permitidos</Label>
          <Textarea id="agent-hosts" rows={3} placeholder="um por linha, ex.: google.com" value={hosts} onChange={(e) => setHosts(e.target.value)} />
        </div>
        <Button type="button" variant="outline" onClick={saveHosts} isLoading={isSaving}>
          <Save /> Salvar domínios
        </Button>
      </div>

      <div className="p-6 rounded-lg border border-border/70 space-y-4">
        <h3 className="text-base font-bold text-foreground">Executar tarefa</h3>
        <div className="space-y-2">
          <Label htmlFor="agent-url">URL inicial</Label>
          <Input id="agent-url" className="h-11" inputMode="url" placeholder="https://site.com.br" value={startUrl} onChange={(e) => setStartUrl(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent-goal">Objetivo</Label>
          <Textarea id="agent-goal" rows={3} placeholder="Ex.: encontre telefone e horário de funcionamento" value={goal} onChange={(e) => setGoal(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={run} disabled={phase === "running"}>
            {phase === "running" ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Globe />} Executar
          </Button>
          {phase === "running" && (
            <Button type="button" variant="outline" onClick={() => (stopRef.current = true)}>
              <Square /> Parar
            </Button>
          )}
        </div>

        {steps.length > 0 && (
          <ol className="space-y-2" aria-label="Passos do agente">
            {steps.map((s) => (
              <li key={s.index} className="text-sm text-foreground break-words">
                <span className="font-semibold">{s.index + 1}. {OUTCOME_LABEL[s.outcome]}</span>
                {s.url ? <span className="text-muted-foreground"> {s.url}</span> : null}
                {s.detail ? <span className="text-muted-foreground"> ({s.detail})</span> : null}
              </li>
            ))}
          </ol>
        )}
        {phase === "stopped" && <p role="status" className="text-sm text-muted-foreground">Execução interrompida.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {answer && <p role="status" className="text-sm text-foreground whitespace-pre-line break-words">{answer}</p>}
      </div>
    </div>
  );
}
