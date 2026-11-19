import React, { useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Crop,
  Flame,
  Globe,
  Loader2,
  MapPin,
  MessageSquare,
  Plane,
  ShieldCheck,
  TrendingDown,
  User,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import {
  executeHotOfferOmnichannelActionFn,
  type HotOfferEligibilityEvaluationResult,
} from "@/services/hot-offers.functions";
import {
  formatBrlFromCents,
  type HotFlameStyle,
  type HotOfferBadgeKind,
  type HotOfferDTO,
} from "@/lib/tourism/hot-offer-sanitizer";
import { cn } from "@/lib/utils";

export interface CopilotHotOfferWorkflowData {
  storeId: string;
  storeSlug?: string;
  proposalId?: string | null;
  initialTitle: string;
  initialSubtitle?: string | null;
  destinationCity: string;
  departureDate?: string | null;
  returnDate?: string | null;
  adultsCount: number;
  totalPriceCents: number;
  installmentsMax?: number;
  hotelHeadline?: string | null;
  includesHeadline?: string[];
  coverImageUrl?: string | null;
  evaluation?: HotOfferEligibilityEvaluationResult | null;
}

export interface CopilotHotOfferWorkflowCardProps {
  data: CopilotHotOfferWorkflowData;
  onCompletedAction?: (result: {
    offer: HotOfferDTO;
    storyId: string | null;
    dispatchedCount: number;
    clientProposalsCount: number;
  }) => void;
}

export function CopilotHotOfferWorkflowCard({
  data,
  onCompletedAction,
}: CopilotHotOfferWorkflowCardProps) {
  const [title, setTitle] = useState(data.initialTitle || `Pacote ${data.destinationCity}`);
  const [subtitle, setSubtitle] = useState(data.initialSubtitle || "");
  const [badgeKind, setBadgeKind] = useState<HotOfferBadgeKind>(
    data.evaluation?.historicalCheck?.historicalSavingsPct &&
      data.evaluation.historicalCheck.historicalSavingsPct >= 15
      ? "hot_black"
      : "hot_offer"
  );
  const [flameStyle, setFlameStyle] = useState<HotFlameStyle>(
    badgeKind === "hot_black" ? "hot_black" : "pixel_fire"
  );

  const [storyMedia, setStoryMedia] = useState(data.coverImageUrl || "");
  const [groupMedia, setGroupMedia] = useState(data.coverImageUrl || "");
  const [cropTarget, setCropTarget] = useState<"story" | "group" | null>(null);

  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(() => {
    return (data.evaluation?.promoGroups || [])
      .filter((g) => g.group_role === "promo_offers" || g.auto_publish_eligible)
      .map((g) => g.id);
  });

  const [selectedLeadKeys, setSelectedLeadKeys] = useState<string[]>(() => {
    return (data.evaluation?.matchedLeads || [])
      .filter((l) => l.matchScore >= 70 && !l.alreadyProposedRecently)
      .slice(0, 8)
      .map((l) => l.leadId || l.whatsapp || l.fullName);
  });

  const [customLeadOverrides, setCustomLeadOverrides] = useState<
    Record<
      string,
      {
        adultsCount?: number;
        childrenCount?: number;
        customNotes?: string;
        overridePriceCents?: number;
      }
    >
  >({});

  const [whatsappCopy, setWhatsappCopy] = useState(
    data.evaluation?.suggestedGroupCopy || ""
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<string | null>(null);

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleLead = (key: string) => {
    setSelectedLeadKeys((prev) =>
      prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key]
    );
  };

  const handleExecuteOmnichannel = async () => {
    if (!data.storeId) {
      toast.error("Loja não identificada para execução da Oferta Quente.");
      return;
    }
    setIsExecuting(true);
    try {
      const selectedLeadsPayload = (data.evaluation?.matchedLeads || [])
        .filter((l) => {
          const key = l.leadId || l.whatsapp || l.fullName;
          return selectedLeadKeys.includes(key) && Boolean(l.whatsapp);
        })
        .map((l) => {
          const key = l.leadId || l.whatsapp || l.fullName;
          const override = customLeadOverrides[key] || {};
          return {
            leadId: l.leadId || null,
            fullName: l.fullName,
            whatsapp: l.whatsapp || "",
            adultsCount: override.adultsCount || l.childSimulation?.baseOfferAdultsCount || 2,
            childrenCount:
              override.childrenCount !== undefined
                ? override.childrenCount
                : (l.childSimulation?.infantsCount || 0) +
                  (l.childSimulation?.chd2to11Count || 0) +
                  (l.childSimulation?.teens12to17Count || 0),
            childrenAges: (l.childSimulation?.perChildBreakdown || []).map((c) => c.age),
            overridePriceCents: override.overridePriceCents || l.effectiveTotalCents || null,
            overrideNotes: override.customNotes || null,
            customPitchText: l.suggestedPitchPt,
            sendWhatsAppImmediately: false,
          };
        });

      const res = await executeHotOfferOmnichannelActionFn({
        data: {
          storeId: data.storeId,
          proposalId: data.proposalId || null,
          customTitle: title.trim(),
          customSubtitle: subtitle.trim() || null,
          destinationCity: data.destinationCity,
          departureDate: data.departureDate || null,
          returnDate: data.returnDate || null,
          adultsCount: data.adultsCount,
          priceCents: data.totalPriceCents,
          installmentsMax: data.installmentsMax || 10,
          badgeKind,
          flameStyle,
          storyMediaUrl: storyMedia || null,
          groupMediaUrl: groupMedia || null,
          customWhatsappCopy: whatsappCopy.trim() || null,
          publishToAppOfferPage: true,
          publishHotStory: true,
          dispatchGroupIds: selectedGroupIds,
          selectedMatchedLeads: selectedLeadsPayload,
        },
      });

      setIsCompleted(true);
      const summaryMsg = `Oferta Quente criada com sucesso! Story Hot ativo no App · ${
        res.groupDispatchSummary.sentCount
      } grupo(s) WhatsApp · ${res.createdClientProposals.length} proposta(s) individuais geradas.`;
      setCompletedSummary(summaryMsg);
      toast.success(summaryMsg);

      onCompletedAction?.({
        offer: res.hotOffer,
        storyId: res.createdStoryId,
        dispatchedCount: res.groupDispatchSummary.sentCount,
        clientProposalsCount: res.createdClientProposals.length,
      });
    } catch (err: any) {
      toast.error(err?.message || "Erro ao executar workflow @oferta.");
    } finally {
      setIsExecuting(false);
    }
  };

  if (isCompleted) {
    return (
      <div
        data-testid="copilot-hot-offer-completed"
        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3"
      >
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>Workflow @oferta Omnichannel Concluído!</span>
        </div>
        <p className="text-xs text-foreground/90">{completedSummary}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="outline" className="gap-1 text-xs">
            <Globe className="size-3.5" />
            Publicado em /app/{data.storeSlug || "agencia"}
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs text-warning">
            <Flame className="size-3.5" />
            Hot Story Aceso
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs text-emerald-600">
            <ShieldCheck className="size-3.5" />
            Herança Isolada por Cliente Ativa
          </Badge>
        </div>
      </div>
    );
  }

  const savingsPct = data.evaluation?.historicalCheck?.historicalSavingsPct;

  return (
    <div
      data-testid="copilot-hot-offer-workflow-card"
      className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-5 text-foreground"
    >
      {/* Header do Card com Selos de Veredito */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="default" className="gap-2 px-3 py-1 text-xs font-black uppercase">
            <Flame className="size-3.5" />
            @oferta Copilot Engine
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs text-emerald-600 font-medium">
            <ShieldCheck className="size-3.5" />
            Zero-PII
          </Badge>
          {savingsPct && savingsPct >= 5 ? (
            <Badge variant="secondary" className="gap-1 text-xs font-bold text-warning">
              <TrendingDown className="size-3.5" />
              {Math.round(savingsPct)}% abaixo da média histórica
            </Badge>
          ) : null}
        </div>
        <span className="text-xs font-mono font-bold text-foreground">
          {formatBrlFromCents(data.totalPriceCents)}
        </span>
      </div>

      {/* BLOCO A: Dados Comerciais Sanitizados */}
      <div className="space-y-3 rounded-xl bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            Bloco A — Oferta-Mestre Pública
          </span>
          <span className="text-xs text-muted-foreground">
            {data.destinationCity} · Base {data.adultsCount} adulto(s)
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Título Comercial da Oferta</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 min-h-11 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Subtítulo / Chamada</Label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Ex: Voos + Hotel + Traslados"
              className="h-11 min-h-11 text-xs"
            />
          </div>
        </div>
      </div>

      {/* BLOCO B: Enquadramento do Hot Story (9:16) */}
      <div className="space-y-3 rounded-xl bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Flame className="size-3.5 text-primary" />
            Bloco B — Hot Story (9:16) no App
          </span>
          <span className="text-xs text-muted-foreground">Aura de Chamas no Avatar</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-background/60 p-3 rounded-lg">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-bold text-foreground">Capa Vertical (Story / Reels)</p>
            <p className="text-xs text-muted-foreground truncate">
              {storyMedia ? "Imagem pronta para 9:16" : "Sem mídia definida"}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!storyMedia}
            onClick={() => setCropTarget("story")}
            className="h-11 min-h-11 px-3 text-xs font-bold gap-2"
          >
            <Crop className="size-3.5" />
            Enquadrar 9:16
          </Button>
        </div>
      </div>

      {/* BLOCO C: Grupos WhatsApp (1:1 / 4:5 + Copy com UTM) */}
      <div className="space-y-3 rounded-xl bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <MessageSquare className="size-3.5 text-primary" />
            Bloco C — Grupos WhatsApp ({selectedGroupIds.length} selecionados)
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={!groupMedia}
            onClick={() => setCropTarget("group")}
            className="h-11 min-h-11 px-3 text-xs font-bold gap-2"
          >
            <Crop className="size-3.5" />
            Enquadrar 1:1
          </Button>
        </div>

        {data.evaluation?.promoGroups && data.evaluation.promoGroups.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.evaluation.promoGroups.map((grp) => {
              const isSelected = selectedGroupIds.includes(grp.id);
              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => toggleGroup(grp.id)}
                  className={cn(
                    "h-11 min-h-11 px-3 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-foreground hover:bg-muted"
                  )}
                >
                  {isSelected ? <Check className="size-3.5" /> : null}
                  <span>{grp.group_name}</span>
                  <span className="text-xs opacity-75">({grp.participants_count})</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum grupo promocional cadastrado.</p>
        )}

        <div className="space-y-1 pt-1">
          <Label className="text-xs">Copy Resumida WhatsApp</Label>
          <Textarea
            value={whatsappCopy}
            onChange={(e) => setWhatsappCopy(e.target.value)}
            rows={4}
            className="text-xs font-mono"
          />
        </div>
      </div>

      {/* BLOCO D: Carrossel Horizontal de Leads Reais do Radar IA */}
      <div className="space-y-3 rounded-xl bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Users className="size-3.5 text-primary" />
            Bloco D — Radar IA de Leads Compatíveis ({selectedLeadKeys.length} selecionados)
          </span>
          <span className="text-xs text-muted-foreground">
            Gera propostas filhas isoladas por cliente
          </span>
        </div>

        {data.evaluation?.matchedLeads && data.evaluation.matchedLeads.length > 0 ? (
          <div className="carousel flex items-stretch gap-3 overflow-x-auto pb-2 scroll-area-carousel no-scrollbar">
            {data.evaluation.matchedLeads.map((lead) => {
              const key = lead.leadId || lead.whatsapp || lead.fullName;
              const isSelected = selectedLeadKeys.includes(key);
              const override = customLeadOverrides[key] || {};
              const currentAdults = override.adultsCount || lead.childSimulation?.baseOfferAdultsCount || 2;
              const currentChildren =
                override.childrenCount !== undefined
                  ? override.childrenCount
                  : (lead.childSimulation?.infantsCount || 0) +
                    (lead.childSimulation?.chd2to11Count || 0) +
                    (lead.childSimulation?.teens12to17Count || 0);

              return (
                <div
                  key={key}
                  className={cn(
                    "w-72 shrink-0 rounded-xl p-3 flex flex-col justify-between gap-3 border transition-colors",
                    isSelected
                      ? "border-primary/60 bg-background"
                      : "border-border/60 bg-background/50 opacity-80"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{lead.fullName}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {lead.whatsapp}
                        </p>
                      </div>
                      <Badge variant={isSelected ? "default" : "secondary"} className="text-xs shrink-0">
                        {lead.matchScore}%
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="truncate">Destino: {lead.destinationRequested}</p>
                      <p className="truncate">Perfil: {lead.roomsSummary}</p>
                      <p className="font-semibold text-foreground">
                        Estimativa: {formatBrlFromCents(lead.effectiveTotalCents)}
                      </p>
                    </div>

                    {lead.reasons[0] ? (
                      <p className="text-xs text-primary line-clamp-2">{lead.reasons[0]}</p>
                    ) : null}

                    {lead.requiresChildRequote ? (
                      <span className="inline-flex items-center gap-1 text-xs text-warning font-medium">
                        <AlertTriangle className="size-3 shrink-0" />
                        Requer confirmação de tarifa infantil
                      </span>
                    ) : null}
                  </div>

                  {/* Personalizador Rápido por Cliente */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between text-xs">
                      <span>Pax: {currentAdults} adt · {currentChildren} chd</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextChildren = currentChildren + 1;
                          setCustomLeadOverrides((prev) => ({
                            ...prev,
                            [key]: {
                              ...prev[key],
                              childrenCount: nextChildren,
                              customNotes: `Adicionada criança de 5 anos`,
                            },
                          }));
                          toast.success(`Adicionada criança para ${lead.fullName}`);
                        }}
                        className="text-xs font-bold text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1"
                      >
                        +1 Criança
                      </button>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      onClick={() => toggleLead(key)}
                      className="w-full h-11 min-h-11 text-xs font-bold"
                    >
                      {isSelected ? "Selecionado p/ Envio" : "Incluir este Lead"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum lead com alta afinidade encontrado.</p>
        )}
      </div>

      {/* Ação Primária de Execução Omnichannel */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-xs text-muted-foreground">
          Criará 1 Oferta-Mestre pública + 1 Story Hot + {selectedGroupIds.length} envio(s) em grupos +{" "}
          {selectedLeadKeys.length} proposta(s) individuais editáveis.
        </div>
        <Button
          type="button"
          disabled={isExecuting}
          onClick={handleExecuteOmnichannel}
          className="h-11 min-h-11 px-6 text-xs font-bold gap-2 shrink-0"
        >
          {isExecuting ? (
            <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
          ) : (
            <Flame className="size-4" />
          )}
          Publicar Oferta, Story Hot & Disparar
        </Button>
      </div>

      {cropTarget ? (
        <ImageCropperDialog
          open={Boolean(cropTarget)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setCropTarget(null);
          }}
          imageSrc={cropTarget === "story" ? storyMedia : groupMedia}
          aspect={cropTarget === "story" ? 9 / 16 : 1}
          title={
            cropTarget === "story"
              ? "Enquadrar Capa Vertical do Hot Story (9:16)"
              : "Enquadrar Card de Grupo WhatsApp (1:1 / 4:5)"
          }
          onCropCompleteAction={(cropped) => {
            if (cropTarget === "story") {
              setStoryMedia(cropped);
              toast.success("Enquadramento 9:16 aplicado!");
            } else {
              setGroupMedia(cropped);
              toast.success("Enquadramento 1:1 aplicado!");
            }
          }}
        />
      ) : null}
    </div>
  );
}
