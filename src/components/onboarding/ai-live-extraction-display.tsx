import React, { useState, useEffect } from "react";
import {
  Globe,
  Terminal,
  Cpu,
  Layers,
  FileText,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Search,
  Zap,
  ArrowRight,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MagicOnboardingResult } from "@/services/magic-onboarding.functions";

export interface AiLiveExtractionDisplayProps {
  url: string;
  isProcessing: boolean;
  progressPercent?: number;
  result?: MagicOnboardingResult | null;
  onApplyResult: (result: MagicOnboardingResult) => void;
  onCancel?: () => void;
  className?: string;
}

const SQUADS = [
  { id: "crawl", label: "Varredura & Scraper", desc: "Firecrawl & Steel.dev", icon: Globe },
  { id: "design", label: "Squad Design", desc: "Cores & Identidade", icon: Layers },
  { id: "copy", label: "Squad Copywriter", desc: "Bio, Voz & Tagline", icon: FileText },
  { id: "pr", label: "Squad PR & Reputação", desc: "Posicionamento & UVP", icon: ShieldCheck },
  { id: "biz", label: "Squad Estratégia", desc: "Modelo & Mercado", icon: Cpu },
];

export function AiLiveExtractionDisplay({
  url,
  isProcessing,
  progressPercent = 0,
  result,
  onApplyResult,
  onCancel,
  className,
}: AiLiveExtractionDisplayProps) {
  const [terminalLogs, setTerminalLogs] = useState<Array<{ id: string; time: string; text: string; squad?: string }>>([]);
  const [activeSquadIdx, setActiveSquadIdx] = useState(0);

  useEffect(() => {
    if (!isProcessing && !result) {
      setTerminalLogs([]);
      setActiveSquadIdx(0);
      return;
    }

    const domain = (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, "");
      } catch {
        return url;
      }
    })();

    const initialTime = new Date().toLocaleTimeString("pt-BR", { hour12: false });
    setTerminalLogs([
      { id: "log-1", time: initialTime, text: `Iniciando extração inteligente para: ${domain}`, squad: "crawl" },
    ]);

    const timer1 = setTimeout(() => {
      const now = new Date().toLocaleTimeString("pt-BR", { hour12: false });
      setTerminalLogs((prev) => [
        ...prev,
        { id: "log-2", time: now, text: "Navegador soberano (Steel / Firecrawl) inicializado...", squad: "crawl" },
      ]);
      setActiveSquadIdx(1);
    }, 1200);

    const timer2 = setTimeout(() => {
      const now = new Date().toLocaleTimeString("pt-BR", { hour12: false });
      setTerminalLogs((prev) => [
        ...prev,
        { id: "log-3", time: now, text: "Metadados públicos e layout capturados com sucesso.", squad: "crawl" },
        { id: "log-4", time: now, text: "Squads de Design e Copy ativados em paralelo.", squad: "design" },
      ]);
      setActiveSquadIdx(2);
    }, 2800);

    const timer3 = setTimeout(() => {
      const now = new Date().toLocaleTimeString("pt-BR", { hour12: false });
      setTerminalLogs((prev) => [
        ...prev,
        { id: "log-5", time: now, text: "Análise semântica de nicho e conciliação de 5 personas...", squad: "biz" },
      ]);
      setActiveSquadIdx(3);
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isProcessing, url, result]);

  // Se o resultado estiver pronto, adiciona log de conclusão
  useEffect(() => {
    if (result) {
      const now = new Date().toLocaleTimeString("pt-BR", { hour12: false });
      setTerminalLogs((prev) => [
        ...prev,
        {
          id: `log-done-${Date.now()}`,
          time: now,
          text: `Extração concluída: ${result.company_name} (${result.category})`,
          squad: "biz",
        },
      ]);
      setActiveSquadIdx(4);
    }
  }, [result]);

  return (
    <div className={cn("w-full rounded-lg bg-card border border-border/80 overflow-hidden shadow-xs font-sans", className)}>
      {/* ── Topo do Terminal ── */}
      <div className="bg-muted/60 px-4 py-2.5 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-destructive/60" />
            <span className="size-2.5 rounded-full bg-amber-500/60" />
            <span className="size-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <div className="flex items-center gap-1.5 ml-2 text-xs font-bold text-foreground">
            <Terminal className="size-3.5 text-primary" />
            <span>Terminal de Extração com IA</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] font-mono bg-background text-muted-foreground border-border/80">
            20.000 Tokens
          </Badge>
          {isProcessing && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span>Ao Vivo</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* ── 5 Squads Grid Visual ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {SQUADS.map((sq, i) => {
            const isDone = Boolean(result) || i < activeSquadIdx;
            const isCurrent = isProcessing && i === activeSquadIdx;
            return (
              <div
                key={sq.id}
                className={cn(
                  "p-2.5 rounded-lg border text-left transition-all",
                  isDone
                    ? "bg-primary/5 border-primary/20 text-foreground"
                    : isCurrent
                    ? "bg-accent/40 border-primary/40 ring-1 ring-primary/20 text-foreground"
                    : "bg-muted/20 border-border/40 text-muted-foreground opacity-60"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <sq.icon className={cn("size-3.5", isDone || isCurrent ? "text-primary" : "text-muted-foreground")} />
                  {isDone ? (
                    <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="size-3 text-primary animate-spin" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                  )}
                </div>
                <p className="text-[11px] font-bold truncate leading-tight">{sq.label}</p>
                <p className="text-[9px] text-muted-foreground font-mono truncate">{sq.desc}</p>
              </div>
            );
          })}
        </div>

        {/* ── Linha de Progresso ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span className="truncate">URL: {url}</span>
            <span className="font-bold text-foreground">
              {result ? "100%" : `${Math.max(progressPercent, activeSquadIdx * 25)}%`}
            </span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${result ? 100 : Math.max(progressPercent, (activeSquadIdx + 1) * 20)}%` }}
            />
          </div>
        </div>

        {/* ── Console de Logs Animado ── */}
        <div className="rounded-lg bg-neutral-950 text-neutral-200 p-3.5 font-mono text-xs space-y-1.5 max-h-40 overflow-y-auto border border-neutral-800">
          {terminalLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed text-[11px]">
              <span className="text-neutral-500 shrink-0">[{log.time}]</span>
              <span className="text-primary font-bold shrink-0">&gt;</span>
              <span className="text-neutral-300 break-words">{log.text}</span>
            </div>
          ))}
          {isProcessing && (
            <div className="flex items-center gap-2 text-primary text-[11px] animate-pulse pt-1">
              <Loader2 className="size-3 animate-spin shrink-0" />
              <span>Processando dados em tempo real...</span>
            </div>
          )}
        </div>

        {/* ── Card de Resultado Mapeado ── */}
        {result && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-3 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-foreground">Dados Reconhecidos com Sucesso</span>
              </div>
              <Badge className="bg-primary text-primary-foreground text-[10px] font-bold">
                Pronto para Aplicar
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-card p-2.5 rounded-lg border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Empresa</span>
                <span className="font-bold text-foreground truncate block">{result.company_name}</span>
              </div>
              <div className="bg-card p-2.5 rounded-lg border border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Categoria</span>
                <span className="font-bold text-foreground capitalize truncate block">{result.category}</span>
              </div>
              {result.contact?.city && (
                <div className="bg-card p-2.5 rounded-lg border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Localização</span>
                  <span className="font-bold text-foreground truncate block">
                    {result.contact.city}, {result.contact.state || "SC"}
                  </span>
                </div>
              )}
              {result.contact?.whatsapp && (
                <div className="bg-card p-2.5 rounded-lg border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">WhatsApp</span>
                  <span className="font-bold text-foreground truncate block">{result.contact.whatsapp}</span>
                </div>
              )}
            </div>

            {result.bio && (
              <div className="bg-card p-2.5 rounded-lg border border-border/60 text-xs text-muted-foreground">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">Apresentação</span>
                <p className="line-clamp-2 leading-relaxed">{result.bio}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="h-9 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Fechar
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => onApplyResult(result)}
                className="h-11 sm:h-9 px-5 rounded-lg font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs active:scale-95 cursor-pointer gap-1.5"
              >
                <span>Preencher Formulário</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
