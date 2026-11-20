import React, { useState } from "react";
import {
  Globe,
  Terminal,
  Layers,
  FileText,
  CheckCircle2,
  Loader2,
  MapPin,
  Instagram,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Camera,
  Phone,
  Mail,
  Palette,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Monitor,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  MagicOnboardingResult,
  OnboardingEvidenceScreenshot,
  OnboardingLiveLog,
} from "@/services/magic-onboarding.functions";

export interface AiLiveExtractionDisplayProps {
  url: string;
  isProcessing: boolean;
  progressPercent?: number;
  logs?: OnboardingLiveLog[];
  screenshots?: OnboardingEvidenceScreenshot[];
  activeSquad?: string;
  completedSquads?: string[];
  liveViewerUrl?: string | null;
  currentBrowsingUrl?: string | null;
  errorMessage?: string | null;
  result?: MagicOnboardingResult | null;
  isApplied?: boolean;
  onApplyResult: (result: MagicOnboardingResult) => void;
  onCancel?: () => void;
  className?: string;
}

const SQUADS = [
  { id: "crawl", label: "Site Oficial", desc: "Varredura & Print", icon: Globe },
  { id: "instagram", label: "Instagram", desc: "Perfil & Print", icon: Instagram },
  { id: "google", label: "Google Meu Negócio", desc: "Maps & Print", icon: MapPin },
  { id: "design", label: "Squad Design", desc: "Logo & Cores", icon: Layers },
  { id: "copy", label: "Squad Copy & Bio", desc: "Voz & Catálogo", icon: FileText },
];

export function AiLiveExtractionDisplay({
  url,
  isProcessing,
  progressPercent = 0,
  logs = [],
  screenshots = [],
  activeSquad = "crawl",
  completedSquads = [],
  liveViewerUrl = null,
  currentBrowsingUrl = null,
  errorMessage = null,
  result,
  isApplied = false,
  onApplyResult,
  onCancel,
  className,
}: AiLiveExtractionDisplayProps) {
  const [showLogs, setShowLogs] = useState(true);
  const [logoLoadError, setLogoLoadError] = useState(false);

  const effectiveLogs = result?.logs?.length ? result.logs : logs;
  const effectiveScreenshots = result?.screenshots?.length ? result.screenshots : screenshots;
  const effectiveLiveViewerUrl = liveViewerUrl || result?.live_viewer_url || null;
  const effectiveProgress = result ? 100 : errorMessage ? Math.max(progressPercent, 0) : Math.max(0, Math.min(100, progressPercent));
  const paletteColors = [
    result?.theme_colors?.primary,
    result?.theme_colors?.secondary,
    result?.theme_colors?.accent,
  ].filter((c): c is string => Boolean(c && /^#[0-9a-fA-F]{3,8}$/.test(c)));

  return (
    <div className={cn("w-full rounded-lg bg-card border border-border/80 overflow-hidden shadow-xs font-sans", className)}>
      {/* ── Topo do Terminal ── */}
      <div className="bg-muted/60 px-4 py-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-destructive/60" />
            <span className="size-2.5 rounded-full bg-warning/60" />
            <span className="size-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <div className="flex items-center gap-2 ml-2 text-xs font-bold text-foreground">
            <Terminal className="size-3.5 text-primary" />
            <span>Terminal de Extração com IA</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-2xs font-mono bg-background text-muted-foreground border-border/80">
            20.000 Tokens
          </Badge>
          {isProcessing && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-primary/10 text-primary text-2xs font-bold">
              <span className="size-1.5 rounded-full bg-primary animate-pulse motion-reduce:animate-none" />
              <span>Ao Vivo</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* ── 5 Etapas Reais do Pipeline ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {SQUADS.map((sq) => {
            const isDone = Boolean(result) || completedSquads.includes(sq.id);
            const isCurrent = isProcessing && !isDone && activeSquad === sq.id;
            return (
              <div
                key={sq.id}
                className={cn(
                  "p-3 rounded-lg border text-left transition-colors duration-200",
                  isDone
                    ? "bg-primary/5 border-primary/20 text-foreground"
                    : isCurrent
                    ? "bg-accent/40 border-primary/40 ring-1 ring-primary/20 text-foreground"
                    : "bg-muted/20 border-border/40 text-muted-foreground opacity-60"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <sq.icon className={cn("size-3.5", isDone || isCurrent ? "text-primary" : "text-muted-foreground")} />
                  {isDone ? (
                    <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="size-3 text-primary animate-spin motion-reduce:animate-none" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                  )}
                </div>
                <p className="text-2xs font-bold truncate leading-tight">{sq.label}</p>
                <p className="text-3xs text-muted-foreground font-mono truncate">{sq.desc}</p>
              </div>
            );
          })}
        </div>

        {/* ── Linha de Progresso Real ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span className="truncate">URL: {url}</span>
            <span className="font-bold text-foreground">
              {errorMessage ? "Erro" : `${effectiveProgress}%`}
            </span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-opacity duration-300 motion-reduce:transition-none rounded-full",
                errorMessage ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${errorMessage ? 100 : effectiveProgress}%` }}
            />
          </div>
        </div>

        {/* ── Erro Real (sem mascarar) ── */}
        {errorMessage && (
          <div role="alert" className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2 text-xs text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-1" />
            <div className="space-y-1 min-w-0">
              <p className="font-semibold">Não foi possível concluir a extração</p>
              <p className="text-2xs break-words">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* ── Navegador ao Vivo da IA (Estilo Lovable / Copilot) ── */}
        {isProcessing && effectiveLiveViewerUrl && (
          <div className="rounded-xl border border-primary/30 bg-background overflow-hidden">
            <div className="bg-muted/60 px-3 py-2 border-b border-border/60 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Monitor className="size-3.5 text-primary shrink-0" />
                <span className="text-2xs font-semibold text-foreground shrink-0">Navegador ao Vivo</span>
                <span className="text-2xs font-mono text-muted-foreground truncate">
                  {currentBrowsingUrl || url}
                </span>
              </div>
              <a
                href={effectiveLiveViewerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-2xs font-semibold text-primary hover:underline shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <span>Expandir</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
            <div className="aspect-video w-full bg-neutral-950 relative">
              <iframe
                src={effectiveLiveViewerUrl}
                title="Navegador ao vivo da IA"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </div>
        )}

        {/* ── Prints Capturados em Tempo Real (Site, Instagram, Google Meu Negócio) ── */}
        {(isProcessing || effectiveScreenshots.length > 0) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Camera className="size-3.5 text-primary" />
                <span>Evidências &amp; Prints Capturados ({effectiveScreenshots.length}/3)</span>
              </div>
              {isProcessing && (
                <span className="text-2xs text-muted-foreground">Atualizando ao vivo</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { key: "site", title: "Site Oficial", icon: Globe },
                { key: "instagram", title: "Instagram", icon: Instagram },
                { key: "google_business", title: "Google Meu Negócio", icon: MapPin },
              ].map((slot) => {
                const shot = effectiveScreenshots.find((s) => s.source === slot.key);
                if (shot) {
                  return (
                    <a
                      key={slot.key}
                      href={shot.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-xl border border-border/80 bg-background overflow-hidden hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="aspect-video w-full bg-muted overflow-hidden relative">
                        <img
                          src={shot.screenshotUrl}
                          alt={`Print ${shot.label}`}
                          className="w-full h-full object-cover object-top"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-3 flex items-center justify-between gap-2 text-2xs">
                        <span className="font-semibold text-foreground truncate">{shot.label}</span>
                        <ExternalLink className="size-3 text-muted-foreground group-hover:text-primary shrink-0" />
                      </div>
                    </a>
                  );
                }

                return (
                  <div
                    key={slot.key}
                    className="rounded-xl border border-dashed border-border/80 bg-muted/20 overflow-hidden"
                  >
                    <div className="aspect-video w-full flex flex-col items-center justify-center gap-2 text-muted-foreground p-3">
                      {isProcessing ? (
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none text-primary" />
                      ) : (
                        <slot.icon className="size-4 opacity-50" />
                      )}
                      <span className="text-2xs font-medium text-center">
                        {isProcessing ? "Capturando..." : "Sem print"}
                      </span>
                    </div>
                    <div className="p-3 border-t border-border/40 text-2xs font-medium text-muted-foreground truncate">
                      {slot.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Console de Logs Reais do Servidor (Retrátil) ── */}
        <div className="rounded-xl border border-border/80 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowLogs((v) => !v)}
            className="w-full px-3 py-2 bg-muted/40 flex items-center justify-between text-2xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-center gap-2">
              <Terminal className="size-3.5 text-primary" />
              <span>Registro de Atividade Real ({effectiveLogs.length})</span>
            </span>
            {showLogs ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
          {showLogs && (
            <div className="bg-neutral-950 text-neutral-200 p-4 font-mono text-xs space-y-2 max-h-40 overflow-y-auto">
              {effectiveLogs.length === 0 && isProcessing && (
                <div className="flex items-center gap-2 text-neutral-400 text-2xs">
                  <Loader2 className="size-3 animate-spin motion-reduce:animate-none shrink-0" />
                  <span>Conectando ao servidor de extração...</span>
                </div>
              )}
              {effectiveLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed text-2xs">
                  <span className="text-neutral-500 shrink-0">[{log.time}]</span>
                  <span
                    className={cn(
                      "font-bold shrink-0",
                      log.status === "error"
                        ? "text-destructive"
                        : log.status === "success"
                        ? "text-emerald-400"
                        : log.status === "warning"
                        ? "text-warning"
                        : "text-primary"
                    )}
                  >
                    &gt;
                  </span>
                  <span className="text-neutral-300 break-words">{log.text}</span>
                </div>
              ))}
              {isProcessing && effectiveLogs.length > 0 && (
                <div className="flex items-center gap-2 text-primary text-2xs animate-pulse motion-reduce:animate-none pt-1">
                  <Loader2 className="size-3 animate-spin motion-reduce:animate-none shrink-0" />
                  <span>Aguardando próxima etapa do servidor...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Cards Visuais de Dados Extraídos (Permanecem Visíveis) ── */}
        {result && (
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-foreground">Dados Extraídos da Empresa</span>
              </div>
              <Badge className="bg-primary text-primary-foreground text-2xs font-bold">
                {isApplied ? "Aplicado no Formulário" : "Pronto para Aplicar"}
              </Badge>
            </div>

            {/* Card 1: Identidade + Logo Real + Paleta de Cores */}
            <div className="bg-card p-4 rounded-xl border border-border/80 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="size-20 rounded-xl border border-border/80 bg-background p-2 flex items-center justify-center shrink-0 overflow-hidden">
                {result.logo_url && !logoLoadError ? (
                  <img
                    src={result.logo_url}
                    alt={`Logo ${result.company_name}`}
                    className="max-w-full max-h-full object-contain"
                    onError={() => setLogoLoadError(true)}
                  />
                ) : (
                  <span className="text-lg font-bold text-primary">
                    {(result.company_name || "W").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground truncate">{result.company_name}</h4>
                  {result.category && (
                    <Badge variant="secondary" className="text-2xs capitalize">
                      {result.category}
                    </Badge>
                  )}
                </div>
                {result.tagline && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{result.tagline}</p>
                )}
                {paletteColors.length > 0 && (
                  <div className="flex items-center gap-2 pt-1">
                    <Palette className="size-3.5 text-muted-foreground shrink-0" />
                    <div className="flex items-center gap-2">
                      {paletteColors.map((color, idx) => (
                        <svg
                          key={`${color}-${idx}`}
                          viewBox="0 0 16 16"
                          className="size-4 rounded-full border border-border/80 shrink-0"
                          role="img"
                          aria-label={color}
                        >
                          <title>{color}</title>
                          <circle cx="8" cy="8" r="8" fill={color} />
                        </svg>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Contatos & Presença Digital */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(result.contact?.whatsapp || result.contact?.phone) && (
                <div className="bg-card p-3 rounded-xl border border-border/60 flex items-center gap-3">
                  <Phone className="size-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="text-2xs text-muted-foreground uppercase font-bold block">Telefone / WhatsApp</span>
                    <span className="font-semibold text-foreground truncate block">
                      {result.contact.whatsapp || result.contact.phone}
                    </span>
                  </div>
                </div>
              )}
              {result.contact?.email && (
                <div className="bg-card p-3 rounded-xl border border-border/60 flex items-center gap-3">
                  <Mail className="size-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="text-2xs text-muted-foreground uppercase font-bold block">E-mail</span>
                    <span className="font-semibold text-foreground truncate block">{result.contact.email}</span>
                  </div>
                </div>
              )}
              {result.instagram_url && (
                <div className="bg-card p-3 rounded-xl border border-border/60 flex items-center gap-3">
                  <Instagram className="size-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="text-2xs text-muted-foreground uppercase font-bold block">Instagram</span>
                    <span className="font-semibold text-foreground truncate block">
                      @{result.instagram_url.split("instagram.com/")[1]?.split("/")[0] || "perfil"}
                    </span>
                  </div>
                </div>
              )}
              {(result.contact?.city || result.contact?.address) && (
                <div className="bg-card p-3 rounded-xl border border-border/60 flex items-center gap-3">
                  <MapPin className="size-4 text-primary shrink-0" />
                  <div className="min-w-0">
                    <span className="text-2xs text-muted-foreground uppercase font-bold block">Localização</span>
                    <span className="font-semibold text-foreground truncate block">
                      {result.contact.city
                        ? `${result.contact.city}${result.contact.state ? `, ${result.contact.state}` : ""}`
                        : result.contact.address}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Card 3: Bio & Tom de Voz */}
            {result.bio && (
              <div className="bg-card p-4 rounded-xl border border-border/60 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-2xs text-muted-foreground uppercase font-bold">Apresentação Extraída</span>
                  {result.brand_dna?.archetype && (
                    <Badge variant="outline" className="text-2xs gap-1">
                      <Sparkles className="size-3 text-primary" />
                      {result.brand_dna.archetype}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line break-words">
                  {result.bio}
                </p>
              </div>
            )}

            {/* Card 4: Produtos / Serviços Detectados */}
            {Array.isArray(result.suggested_products) && result.suggested_products.length > 0 && (
              <div className="bg-card p-4 rounded-xl border border-border/60 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Package className="size-3.5 text-primary" />
                  <span className="text-2xs text-muted-foreground uppercase font-bold">
                    Produtos / Serviços Identificados ({result.suggested_products.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.suggested_products.slice(0, 4).map((prod, i) => (
                    <div key={`${prod.name}-${i}`} className="p-3 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground truncate">{prod.name}</span>
                      <span className="font-mono text-2xs font-bold text-primary shrink-0">
                        {(prod.price_cents / 100).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="h-11 sm:h-9 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Recolher Painel
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => onApplyResult(result)}
                className="h-11 sm:h-9 px-5 rounded-lg font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs active:scale-95 cursor-pointer gap-2"
              >
                <span>{isApplied ? "Reaplicar no Formulário" : "Preencher Formulário"}</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
