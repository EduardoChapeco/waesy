import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bot, CheckCircle2, Loader2, ShieldCheck, Sliders, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getStoreAiAutomationConfigFn,
  saveStoreAiAutomationConfigFn,
  type StoreAiAutomationConfig,
} from "@/services/chat.functions";
import { listSkillsForNiche } from "@/lib/ai/niche-agent-engine";

const MODE_OPTIONS: Array<{ value: StoreAiAutomationConfig["mode"]; label: string; summary: string }> = [
  { value: "disabled", label: "Desativado", summary: "IA não responde nem gera sugestões automáticas" },
  { value: "assisted", label: "Copiloto", summary: "Sugere respostas e sondagem para o atendente aprovar" },
  { value: "sandbox", label: "Sandbox", summary: "Responde automaticamente apenas números autorizados" },
  { value: "autonomous", label: "Autônomo", summary: "SDR 24h com humanização, opt-out e transbordo" },
];

export function AiAutonomousAgentsConfigPanel() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nicheId, setNicheId] = useState("general");
  const [config, setConfig] = useState<StoreAiAutomationConfig>({
    mode: "disabled",
    enabled_agents: [],
    sandbox_allowed_phones: [],
    max_consecutive_turns: 6,
    cooldown_seconds: 10,
    humanize_chunks: true,
    voice_replies_enabled: false,
  });
  const [sandboxPhonesText, setSandboxPhonesText] = useState("");

  useEffect(() => {
    let active = true;
    getStoreAiAutomationConfigFn()
      .then((res) => {
        if (!active) return;
        setNicheId(res.nicheId || "general");
        setConfig(res.config);
        setSandboxPhonesText((res.config.sandbox_allowed_phones || []).join(", "));
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : "Erro ao carregar automação IA.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const availableSkills = listSkillsForNiche(nicheId);

  const toggleSkill = (slug: string) => {
    setConfig((prev) => {
      const exists = prev.enabled_agents.includes(slug);
      return {
        ...prev,
        enabled_agents: exists
          ? prev.enabled_agents.filter((s) => s !== slug)
          : [...prev.enabled_agents, slug],
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedPhones = sandboxPhonesText
        .split(/[,;\n]+/)
        .map((p) => p.replace(/\D/g, "").trim())
        .filter((p) => p.length >= 8);
      const payload: StoreAiAutomationConfig = {
        ...config,
        sandbox_allowed_phones: parsedPhones,
      };
      const res = await saveStoreAiAutomationConfigFn({ data: payload });
      setConfig(res.config);
      toast.success("Motor de IA WhatsApp atualizado.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar configuração.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="h-5 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="h-16 rounded-lg bg-muted animate-pulse" />
          <div className="h-16 rounded-lg bg-muted animate-pulse" />
          <div className="h-16 rounded-lg bg-muted animate-pulse" />
          <div className="h-16 rounded-lg bg-muted animate-pulse" />
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 space-y-2">
        <p className="text-sm font-semibold text-foreground">Automação WhatsApp IA indisponível</p>
        <p className="text-xs text-muted-foreground">{loadError}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Agentes WhatsApp IA</h2>
            <Badge variant="outline" className="text-xs uppercase">{nicheId}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Modo de operação, skills por nicho, humanização e guarda de turnos
          </p>
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-11 min-h-11 px-5 rounded-lg font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {saving ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 className="size-4" />}
          <span>{saving ? "Salvando..." : "Salvar Automação"}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MODE_OPTIONS.map((opt) => {
          const active = config.mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, mode: opt.value }))}
              className={`min-h-11 text-left rounded-lg border p-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                {active && <ShieldCheck className="size-4 text-primary shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{opt.summary}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sliders className="size-4 text-primary" />
            Skills Especialistas Ativas
          </h3>
          <span className="text-xs text-muted-foreground">
            {config.enabled_agents.length === 0 ? "Todas habilitadas" : `${config.enabled_agents.length} selecionadas`}
          </span>
        </div>
        {availableSkills.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma skill cadastrada para este nicho.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {availableSkills.map((skill) => {
              const selected = config.enabled_agents.length === 0 || config.enabled_agents.includes(skill.slug);
              return (
                <button
                  key={skill.slug}
                  type="button"
                  onClick={() => toggleSkill(skill.slug)}
                  className={`min-h-11 text-left rounded-lg border p-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    selected ? "border-primary/60 bg-primary/5" : "border-border bg-background opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">{skill.name}</span>
                    <Badge variant={selected ? "default" : "outline"} className="text-xs shrink-0">
                      {skill.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{skill.objective}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground" htmlFor="ai-max-turns">
            Máx. turnos consecutivos
          </label>
          <Input
            id="ai-max-turns"
            type="number"
            min={1}
            max={30}
            value={config.max_consecutive_turns}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                max_consecutive_turns: Math.min(30, Math.max(1, Number(e.target.value) || 6)),
              }))
            }
            className="h-11"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground" htmlFor="ai-cooldown">
            Cooldown anti-rajada (s)
          </label>
          <Input
            id="ai-cooldown"
            type="number"
            min={0}
            max={300}
            value={config.cooldown_seconds}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                cooldown_seconds: Math.min(300, Math.max(0, Number(e.target.value) || 10)),
              }))
            }
            className="h-11"
          />
        </div>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 min-h-11 px-3 rounded-lg border border-border cursor-pointer">
            <input
              type="checkbox"
              checked={config.humanize_chunks}
              onChange={(e) => setConfig((prev) => ({ ...prev, humanize_chunks: e.target.checked }))}
              className="size-4 rounded border-input"
            />
            <span className="text-xs font-medium text-foreground">Fragmentar respostas (humanização)</span>
          </label>
          <label className="flex items-center gap-2 min-h-11 px-3 rounded-lg border border-border cursor-pointer">
            <input
              type="checkbox"
              checked={config.voice_replies_enabled}
              onChange={(e) => setConfig((prev) => ({ ...prev, voice_replies_enabled: e.target.checked }))}
              className="size-4 rounded border-input"
            />
            <Volume2 className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Respostas em áudio (TTS)</span>
          </label>
        </div>
      </div>

      {config.mode === "sandbox" && (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground" htmlFor="ai-sandbox-phones">
            Telefones liberados no Sandbox (separados por vírgula)
          </label>
          <Input
            id="ai-sandbox-phones"
            value={sandboxPhonesText}
            onChange={(e) => setSandboxPhonesText(e.target.value)}
            placeholder="5549999998888, 5511988887777"
            className="h-11 font-mono text-xs"
          />
        </div>
      )}
    </section>
  );
}
