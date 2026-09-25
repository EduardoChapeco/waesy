/**
 * campaign-draft-card.tsx — Renderizador Dinâmico de Proposta de Anúncio MCP (Dynamic UI Engine)
 * Transforma o JSON estruturado gerado pelo Model Context Protocol diretamente em um
 * Mockup Interativo do Feed do Instagram/Meta Ads com aprovação em 1 toque (Apple HIG Clean Design).
 */

import { useState } from "react";
import {
  ShieldCheck,
  Sliders,
  DollarSign,
  MapPin,
  Users,
  Eye,
  TrendingUp,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  CheckCircle2,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";
import { approveCampaignDraft } from "@/services/mcp-orchestrator.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DynamicRenderableBlock } from "@/types/ad-tech-mcp";

export interface CampaignDraftCardProps {
  block: DynamicRenderableBlock;
  onApproved?: (campaignId: string) => void;
  onDiscard?: () => void;
  className?: string;
}

export function CampaignDraftCard({
  block,
  onApproved,
  onDiscard,
  className,
}: CampaignDraftCardProps) {
  const { payload, metadata } = block;

  // Estados locais para edição interativa de parâmetros antes da aprovação
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  // Parâmetros editáveis
  const [campaignTitle, setCampaignTitle] = useState(payload.campaignTitle);
  const [dailyBudgetCents, setDailyBudgetCents] = useState(payload.budget.dailyCents);
  const [durationDays, setDurationDays] = useState(payload.budget.durationDays);
  const [headline, setHeadline] = useState(payload.creative.headline);
  const [bodyCopy, setBodyCopy] = useState(payload.creative.bodyCopy);
  const [ctaLabel, setCtaLabel] = useState(payload.creative.callToActionLabel);
  const [locationLabel, setLocationLabel] = useState(payload.targeting.locationLabel);
  const [radiusKm, setRadiusKm] = useState(payload.targeting.radiusKm);

  const totalBudgetCents = dailyBudgetCents * durationDays;

  // Handler de aprovação humana com validação server-side
  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const res = await approveCampaignDraft({
        data: {
          campaignTitle,
          platform: payload.platform,
          dailyBudgetCents,
          durationDays,
          targeting: {
            locationLabel,
            radiusKm,
            ageRange: payload.targeting.ageRange,
            interestTags: payload.targeting.interestTags,
          },
          creative: {
            format: payload.creative.format,
            headline,
            bodyCopy,
            callToActionLabel: ctaLabel,
            destinationUrl: payload.creative.destinationUrl,
            recommendedImageUrl: payload.creative.recommendedImageUrl,
            displayUrlText: payload.creative.displayUrlText,
            sponsorHandle: payload.creative.sponsorHandle,
          },
        },
      });

      setIsApproved(true);
      toast.success(res.message || "Campanha aprovada e ativada com sucesso!");
      if (onApproved && res.campaignId) {
        onApproved(res.campaignId);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao aprovar campanha.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isApproved) {
    return (
      <div className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 text-center space-y-3 animate-in fade-in">
        <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="size-6" />
        </div>
        <h4 className="text-sm font-bold text-foreground">Campanha Aprovada & Em Veiculação</h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Os criativos e orçamentos foram autenticados e enviados aos canais de tráfego pago da loja.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden text-foreground space-y-0",
        className
      )}
    >
      {/* ── 1. HEADER DO BLOCO DINÂMICO MCP ── */}
      <div className="p-4 px-5 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">
                Proposta de Campanha Gerada por IA (MCP)
              </span>
              <Badge variant="outline" className="text-[9px] font-mono py-0 px-1.5 h-4">
                {payload.platform === "meta_instagram" ? "Instagram Feed" : "Meta Ads"}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Comando: &quot;{metadata.sourcePrompt}&quot;
            </p>
          </div>
        </div>

        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold w-fit">
          Aguardando Revisão Humana
        </Badge>
      </div>

      {/* ── 2. CORPO DIVIDIDO: MOCKUP DO INSTAGRAM (ESQUERDA) VS TELEMETRIA (DIREITA) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 sm:p-6 items-start">
        {/* COLUNA ESQUERDA: MOCKUP NATIVO INSTAGRAM FEED */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 self-start">
            Mockup em Tempo Real (Feed do Instagram)
          </span>

          <div className="w-full max-w-[340px] rounded-2xl border border-border/90 bg-background shadow-md overflow-hidden text-xs">
            {/* Top Bar do Anúncio Instagram */}
            <div className="p-3 flex items-center justify-between border-b border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[1.5px]">
                  <div className="size-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                    <span className="text-[11px] font-bold text-foreground">
                      {(payload.creative.sponsorHandle || "W")[0].toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground leading-tight">
                    {payload.creative.sponsorHandle || "Sua Loja"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Patrocinado</p>
                </div>
              </div>
              <MoreHorizontal className="size-4 text-muted-foreground cursor-pointer" />
            </div>

            {/* Imagem do Criativo (Aspect Ratio 1:1) */}
            <div className="relative aspect-square w-full bg-muted/40 overflow-hidden">
              <img
                src={payload.creative.recommendedImageUrl}
                alt={headline}
                className="size-full object-cover"
              />
            </div>

            {/* Barra de Ação Patrocinada Instantânea (CTA Bar) */}
            <div className="p-2.5 px-3 bg-muted/60 border-t border-b border-border/40 flex items-center justify-between">
              <span className="font-bold text-xs text-foreground truncate max-w-[200px]">
                {ctaLabel}
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>

            {/* Linha de Engajamento Social (Likes, Comentários, Salvar) */}
            <div className="p-3 pb-1 flex items-center justify-between text-muted-foreground">
              <div className="flex items-center gap-3">
                <Heart className="size-5 hover:text-rose-500 cursor-pointer transition-colors" />
                <MessageCircle className="size-5 hover:text-foreground cursor-pointer transition-colors" />
                <Send className="size-5 hover:text-foreground cursor-pointer transition-colors" />
              </div>
              <Bookmark className="size-5 hover:text-foreground cursor-pointer transition-colors" />
            </div>

            {/* Legenda Autêntica do Anúncio */}
            <div className="p-3 pt-1 space-y-1">
              <p className="text-[11px] leading-relaxed text-foreground">
                <span className="font-bold mr-1.5">{payload.creative.sponsorHandle || "Sua Loja"}</span>
                <span className="font-semibold">{headline}</span> — {bodyCopy}
              </p>
              {payload.creative.displayUrlText && (
                <p className="text-[10px] font-mono text-muted-foreground pt-0.5">
                  🔗 {payload.creative.displayUrlText}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: TELEMETRIA, ESTIMATIVAS & CONTROLES */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <div>
              <h3 className="text-sm font-bold text-foreground">{campaignTitle}</h3>
              <p className="text-xs text-muted-foreground">
                Configurado com base na inteligência de mercado do seu ecossistema.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing((prev) => !prev)}
              className="h-8 text-xs rounded-xl gap-1.5 cursor-pointer"
            >
              <Sliders className="size-3.5" />
              <span>{isEditing ? "Ver Resumo" : "Editar"}</span>
            </Button>
          </div>

          {/* MODO DE EDIÇÃO RÁPIDA (SE ATIVO) */}
          {isEditing ? (
            <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border/70 text-xs">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Título Interno</Label>
                <Input
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="h-8 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Orçamento Diário (R$)</Label>
                  <Input
                    type="number"
                    min={10}
                    value={(dailyBudgetCents / 100).toFixed(2)}
                    onChange={(e) =>
                      setDailyBudgetCents(Math.round(parseFloat(e.target.value) * 100 || 1000))
                    }
                    className="h-8 text-xs font-mono rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Duração (Dias)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={60}
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 7)}
                    className="h-8 text-xs font-mono rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Chamada Principal (Headline)</Label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="h-8 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Texto do Anúncio (Copy)</Label>
                <Textarea
                  value={bodyCopy}
                  onChange={(e) => setBodyCopy(e.target.value)}
                  rows={3}
                  className="text-xs rounded-xl resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Botão de Ação (CTA)</Label>
                  <Input
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value as any)}
                    className="h-8 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Raio Geográfico (Km)</Label>
                  <Input
                    type="number"
                    min={5}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(parseInt(e.target.value, 10) || 25)}
                    className="h-8 text-xs font-mono rounded-xl"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* RESUMO DE ORÇAMENTO & TELEMETRIA SIMLAB */
            <div className="space-y-3">
              {/* Card de Investimento */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Orçamento Diário</p>
                  <p className="text-sm font-black font-mono text-foreground">
                    {formatMoney(dailyBudgetCents)}/dia
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Período de Veiculação</p>
                  <p className="text-sm font-bold text-foreground">{durationDays} dias</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-medium">Total Estimado</p>
                  <p className="text-sm font-black font-mono text-primary">
                    {formatMoney(totalBudgetCents)}
                  </p>
                </div>
              </div>

              {/* Segmentação & Alcance */}
              <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-3.5 text-primary shrink-0" />
                  <span className="font-semibold text-foreground">{locationLabel}</span>
                  <Badge variant="outline" className="text-[10px] py-0">
                    +{radiusKm} km
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="size-3.5 text-primary shrink-0" />
                  <span>
                    Público: {payload.targeting.ageRange[0]} a {payload.targeting.ageRange[1]} anos
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {payload.targeting.interestTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-2 font-normal">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Projeção de Performance Estimada */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Eye className="size-4 text-primary shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Alcance Estimado</p>
                    <p className="font-mono font-bold text-foreground">
                      {payload.targeting.potentialAudienceReach.minDailyImpressions.toLocaleString("pt-BR")}{" "}
                      a{" "}
                      {payload.targeting.potentialAudienceReach.maxDailyImpressions.toLocaleString("pt-BR")}{" "}
                      imp/dia
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">CPA Médio</p>
                  <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ~{formatMoney(payload.targeting.potentialAudienceReach.estimatedCpaCents)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── 3. GOVERNANÇA HUMANA (BOTAO DE APROVAÇÃO E ATIVAÇÃO) ── */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <Button
              type="button"
              onClick={handleApprove}
              disabled={isSubmitting}
              className="w-full sm:flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 cursor-pointer active:scale-95 shadow-sm transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Registrando e Ativando...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  <span>Aprovar & Ativar Campanha</span>
                </>
              )}
            </Button>

            {onDiscard && (
              <Button
                type="button"
                variant="ghost"
                onClick={onDiscard}
                disabled={isSubmitting}
                className="w-full sm:w-auto h-11 px-4 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl cursor-pointer"
              >
                <Trash2 className="size-3.5 mr-1" />
                Descartar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
