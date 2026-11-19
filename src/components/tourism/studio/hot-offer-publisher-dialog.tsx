import { useEffect, useState } from "react";
import {
  Check,
  Crop,
  Flame,
  Globe,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ImageCropperDialog } from "@/components/ui/image-cropper-dialog";
import {
  evaluateProposalHistoricalOfferEligibilityFn,
  promoteProposalOrPackageToHotOfferFn,
  type HotOfferEligibilityEvaluationResult,
} from "@/services/hot-offers.functions";
import {
  formatBrlFromCents,
  scrubLeadPiiFromText,
  type HotFlameStyle,
  type HotOfferBadgeKind,
} from "@/lib/tourism/hot-offer-sanitizer";
import type { TravelProposalDTO } from "@/services/travel-proposal.functions";
import { cn } from "@/lib/utils";

interface HotOfferPublisherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: TravelProposalDTO;
  initialEvaluation?: HotOfferEligibilityEvaluationResult | null;
  onPublishedSuccess?: (result: {
    offerId: string;
    storyId: string | null;
    groupsSentCount: number;
    clientProposalsCount: number;
  }) => void;
}

export function HotOfferPublisherDialog({
  open,
  onOpenChange,
  proposal,
  initialEvaluation,
  onPublishedSuccess,
}: HotOfferPublisherDialogProps) {
  const storeId = proposal.store_id || "";
  const piiContext = {
    clientName: proposal.client_name || proposal.customer_name,
    clientWhatsapp: proposal.client_whatsapp,
    clientEmail: proposal.client_email,
    clientDocument: proposal.client_document,
  };

  const defaultCleanTitle =
    scrubLeadPiiFromText(proposal.title, piiContext) ||
    `Pacote Especial ${proposal.destination_city || "Viagem"}`;
  const defaultCleanSubtitle = scrubLeadPiiFromText(proposal.subtitle, piiContext) || "";

  const [customTitle, setCustomTitle] = useState(defaultCleanTitle);
  const [customSubtitle, setCustomSubtitle] = useState(defaultCleanSubtitle);
  const [badgeKind, setBadgeKind] = useState<HotOfferBadgeKind>("hot_offer");
  const [flameStyle, setFlameStyle] = useState<HotFlameStyle>("pixel_fire");
  const [publishToAppOfferPage, setPublishToAppOfferPage] = useState(true);
  const [publishHotStory, setPublishHotStory] = useState(true);

  const defaultMedia =
    proposal.cover_image_url ||
    proposal.hotels?.[0]?.image_url ||
    proposal.itinerary?.[0]?.image_url ||
    "";
  const [storyMediaUrl, setStoryMediaUrl] = useState<string>(defaultMedia);
  const [groupMediaUrl, setGroupMediaUrl] = useState<string>(defaultMedia);
  const [cropperTarget, setCropperTarget] = useState<"story" | "group" | null>(null);

  const [evaluation, setEvaluation] = useState<HotOfferEligibilityEvaluationResult | null>(
    initialEvaluation || null
  );
  const [isLoadingEval, setIsLoadingEval] = useState(false);
  const [whatsappCopy, setWhatsappCopy] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedLeadKeys, setSelectedLeadKeys] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (!open || !storeId) return;
    setCustomTitle(
      scrubLeadPiiFromText(proposal.title, piiContext) ||
        `Pacote Especial ${proposal.destination_city || "Viagem"}`
    );
    setCustomSubtitle(scrubLeadPiiFromText(proposal.subtitle, piiContext) || "");
    if (!storyMediaUrl && defaultMedia) setStoryMediaUrl(defaultMedia);
    if (!groupMediaUrl && defaultMedia) setGroupMediaUrl(defaultMedia);

    let cancelled = false;
    setIsLoadingEval(true);
    evaluateProposalHistoricalOfferEligibilityFn({
      data: {
        storeId,
        proposalId: proposal.id,
        title: defaultCleanTitle,
        destinationCity: proposal.destination_city || "Destino",
        originCity: proposal.flights?.[0]?.origin_city || null,
        originIata: proposal.flights?.[0]?.origin_iata || (proposal.flights?.[0] as any)?.origin_code || null,
        destinationIata: proposal.flights?.[0]?.destination_iata || (proposal.flights?.[0] as any)?.destination_code || null,
        departureDate: proposal.travel_start_date || null,
        returnDate: proposal.travel_end_date || null,
        adultsCount: Math.max(1, proposal.adults_count || 2),
        totalPriceCents: Math.max(0, Number(proposal.pricing?.total_price_cents || (proposal.pricing as any)?.final_total_cents || 0)),
        installmentsMax: Math.max(1, Number(proposal.pricing?.installments_options?.[0]?.installments_count || (proposal.pricing as any)?.installments_max || 10)),
        hotelHeadline: proposal.hotels?.[0]?.hotel_name || null,
        includesHeadline: proposal.includes || [],
        excludeLeadId: proposal.lead_id || null,
      },
    })
      .then((res) => {
        if (cancelled) return;
        setEvaluation(res);
        setWhatsappCopy(res.suggestedGroupCopy);
        if (
          res.historicalCheck.historicalSavingsPct &&
          res.historicalCheck.historicalSavingsPct >= 15
        ) {
          setBadgeKind("hot_black");
          setFlameStyle("hot_black");
        }
        const autoGroups = res.promoGroups
          .filter((g) => g.group_role === "promo_offers" || g.auto_publish_eligible)
          .map((g) => g.id);
        setSelectedGroupIds(autoGroups);
        const topLeads = res.matchedLeads
          .filter((l) => l.matchScore >= 70 && !l.alreadyProposedRecently)
          .slice(0, 6)
          .map((l) => l.leadId || l.whatsapp || l.fullName);
        setSelectedLeadKeys(topLeads);
      })
      .catch(() => {
        // Non-blocking fallback
      })
      .finally(() => {
        if (!cancelled) setIsLoadingEval(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, storeId, proposal.id]);

  const toggleGroupId = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleLeadKey = (key: string) => {
    setSelectedLeadKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const handlePublishOmnichannel = async () => {
    if (!storeId) {
      toast.error("Agência não identificada na proposta.");
      return;
    }
    setIsPublishing(true);
    try {
      const matchedLeadsPayload = (evaluation?.matchedLeads || [])
        .filter((lead) => {
          const key = lead.leadId || lead.whatsapp || lead.fullName;
          return selectedLeadKeys.includes(key) && Boolean(lead.whatsapp);
        })
        .map((lead) => ({
          leadId: lead.leadId || null,
          fullName: lead.fullName,
          whatsapp: lead.whatsapp || "",
          adultsCount: Math.max(1, lead.childSimulation?.baseOfferAdultsCount || 2),
          childrenCount:
            (lead.childSimulation?.infantsCount || 0) +
            (lead.childSimulation?.chd2to11Count || 0) +
            (lead.childSimulation?.teens12to17Count || 0),
          childrenAges: (lead.childSimulation?.perChildBreakdown || []).map((c) => c.age),
          overridePriceCents: lead.effectiveTotalCents || null,
          customPitchText: lead.suggestedPitchPt,
          sendWhatsAppImmediately: false,
        }));

      const res = await promoteProposalOrPackageToHotOfferFn({
        data: {
          storeId,
          proposalId: proposal.id,
          customTitle: customTitle.trim() || defaultCleanTitle,
          customSubtitle: customSubtitle.trim() || null,
          badgeKind,
          flameStyle,
          storyMediaUrl: storyMediaUrl || null,
          groupMediaUrl: groupMediaUrl || null,
          customWhatsappCopy: whatsappCopy.trim() || null,
          publishToAppOfferPage,
          publishHotStory,
          dispatchGroupIds: selectedGroupIds,
          selectedMatchedLeads: matchedLeadsPayload,
        },
      });

      toast.success(
        `Oferta Pública criada! ${
          res.createdStoryId ? "Hot Story ativo · " : ""
        }${res.groupDispatchSummary.sentCount} grupo(s) · ${
          res.createdClientProposals.length
        } proposta(s) de leads geradas.`
      );

      onPublishedSuccess?.({
        offerId: res.hotOffer.id,
        storyId: res.createdStoryId,
        groupsSentCount: res.groupDispatchSummary.sentCount,
        clientProposalsCount: res.createdClientProposals.length,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao publicar Oferta Quente.");
    } finally {
      setIsPublishing(false);
    }
  };

  const totalPriceCents = Number(proposal.pricing?.total_price_cents || (proposal.pricing as any)?.final_total_cents || 0);
  const savingsPct = evaluation?.historicalCheck?.historicalSavingsPct;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-dvh overflow-y-auto pt-safe-modal">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="gap-2 px-3 py-1 text-xs font-bold">
                <Flame className="size-3.5" />
                Hot Ofertas & Stories
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs font-medium text-emerald-600">
                <ShieldCheck className="size-3.5" />
                Zero-PII Ativo
              </Badge>
              {savingsPct && savingsPct >= 5 ? (
                <Badge variant="secondary" className="gap-1 text-xs font-bold">
                  <TrendingDown className="size-3.5" />
                  {Math.round(savingsPct)}% abaixo da média histórica
                </Badge>
              ) : null}
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Publicar Oferta Pública, Story Hot e Disparo Omnichannel
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Os dados pessoais do cliente original ({proposal.client_name || "Lead"}) foram
              automaticamente removidos. Cada lead selecionado no Radar IA receberá sua própria
              proposta editável vinculada a esta Oferta-Mestre.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* BLOCO 1: Identidade Comercial Sanitizada & Estilo de Chama */}
            <div className="space-y-3 bg-muted/30 p-4 rounded-xl">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  1. Oferta-Mestre Sanitizada ({formatBrlFromCents(totalPriceCents)})
                </span>
                <div className="flex items-center gap-2">
                  <Label htmlFor="toggle-app-page" className="text-xs text-muted-foreground">
                    Publicar no App (/app/{evaluation?.storeSlug || "agencia"})
                  </Label>
                  <Switch
                    id="toggle-app-page"
                    checked={publishToAppOfferPage}
                    onCheckedChange={setPublishToAppOfferPage}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Título Público da Oferta</Label>
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ex: Pacote Porto Seguro All Inclusive"
                    className="h-11 min-h-11 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Subtítulo / Chamada Curta</Label>
                  <Input
                    value={customSubtitle}
                    onChange={(e) => setCustomSubtitle(e.target.value)}
                    placeholder="Ex: Voos + Resort + Traslados inclusos"
                    className="h-11 min-h-11 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Selo de Urgência</Label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: "hot_offer", label: "Hot Oferta" },
                        { id: "hot_black", label: "Hot Black" },
                        { id: "flash", label: "Relâmpago" },
                      ] as const
                    ).map((opt) => (
                      <Button
                        key={opt.id}
                        type="button"
                        size="sm"
                        variant={badgeKind === opt.id ? "default" : "outline"}
                        onClick={() => setBadgeKind(opt.id)}
                        className="h-11 min-h-11 px-3 text-xs font-bold"
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Efeito no Avatar do App</Label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: "pixel_fire", label: "Chama Pixel" },
                        { id: "hot_black", label: "Hot Black" },
                        { id: "instagram_ring", label: "Anel Story" },
                      ] as const
                    ).map((opt) => (
                      <Button
                        key={opt.id}
                        type="button"
                        size="sm"
                        variant={flameStyle === opt.id ? "default" : "outline"}
                        onClick={() => setFlameStyle(opt.id)}
                        className="h-11 min-h-11 px-3 text-xs font-bold"
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* BLOCO 2: Enquadramento Visual Obrigatório (9:16 Story & 1:1/4:5 Grupo) */}
            <div className="space-y-3 bg-muted/30 p-4 rounded-xl">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  2. Enquadramento Visual (Story 9:16 & Card de Grupo 1:1)
                </span>
                <div className="flex items-center gap-2">
                  <Label htmlFor="toggle-hot-story" className="text-xs text-muted-foreground">
                    Ativar Hot Story no App
                  </Label>
                  <Switch
                    id="toggle-hot-story"
                    checked={publishHotStory}
                    onCheckedChange={setPublishHotStory}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between gap-3 bg-background/60 p-3 rounded-lg">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">Capa do Hot Story (9:16)</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {storyMediaUrl ? "Imagem configurada" : "Sem imagem selecionada"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!storyMediaUrl}
                    onClick={() => setCropperTarget("story")}
                    className="h-11 min-h-11 px-3 text-xs font-bold gap-2 shrink-0"
                  >
                    <Crop className="size-3.5" />
                    Enquadrar 9:16
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-3 bg-background/60 p-3 rounded-lg">
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">Card para Grupos (1:1 / 4:5)</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {groupMediaUrl ? "Imagem configurada" : "Sem imagem selecionada"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!groupMediaUrl}
                    onClick={() => setCropperTarget("group")}
                    className="h-11 min-h-11 px-3 text-xs font-bold gap-2 shrink-0"
                  >
                    <Crop className="size-3.5" />
                    Enquadrar 1:1
                  </Button>
                </div>
              </div>
            </div>

            {/* BLOCO 3: Grupos de Ofertas do WhatsApp (Exclui Equipe Interna) */}
            <div className="space-y-3 bg-muted/30 p-4 rounded-xl">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <MessageSquare className="size-3.5 text-primary" />
                  3. Disparo em Grupos de Ofertas ({selectedGroupIds.length} selecionados)
                </span>
                <span className="text-xs text-muted-foreground">
                  Grupos de Equipe Interna são ocultados e bloqueados
                </span>
              </div>

              {isLoadingEval ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  Carregando grupos de ofertas e radar de leads...
                </div>
              ) : evaluation && evaluation.promoGroups.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {evaluation.promoGroups.map((grp) => {
                    const isSelected = selectedGroupIds.includes(grp.id);
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => toggleGroupId(grp.id)}
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
                <p className="text-xs text-muted-foreground">
                  Nenhum grupo classificado para promoções ainda. Você pode classificar seus grupos em
                  Atendimento &gt; Grupos WhatsApp.
                </p>
              )}

              <div className="space-y-2 pt-1">
                <Label className="text-xs font-semibold">
                  Copy Resumida para Grupos (com link rastreado para /app/{evaluation?.storeSlug || "agencia"})
                </Label>
                <Textarea
                  value={whatsappCopy}
                  onChange={(e) => setWhatsappCopy(e.target.value)}
                  rows={5}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            {/* BLOCO 4: Radar IA de Leads Compatíveis (Herança Oferta-Mestre -> Proposta Individual) */}
            <div className="space-y-3 bg-muted/30 p-4 rounded-xl">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Users className="size-3.5 text-primary" />
                  4. Leads Compatíveis no Radar IA ({selectedLeadKeys.length} selecionados)
                </span>
                <span className="text-xs text-muted-foreground">
                  Cria propostas individuais vinculadas à Oferta-Mestre
                </span>
              </div>

              {evaluation && evaluation.matchedLeads.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                  {evaluation.matchedLeads.slice(0, 12).map((lead) => {
                    const key = lead.leadId || lead.whatsapp || lead.fullName;
                    const isSelected = selectedLeadKeys.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleLeadKey(key)}
                        className={cn(
                          "min-h-11 p-3 rounded-lg text-left flex flex-col gap-1 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected
                            ? "bg-primary/15 text-foreground"
                            : "bg-background/70 text-foreground hover:bg-background"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold truncate">{lead.fullName}</span>
                          <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
                            {lead.matchScore}% Match
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.destinationRequested} · {lead.roomsSummary} ·{" "}
                          {formatBrlFromCents(lead.effectiveTotalCents)}
                        </p>
                        {lead.reasons[0] ? (
                          <p className="text-xs text-primary truncate">{lead.reasons[0]}</p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhum lead compatível encontrado para {proposal.destination_city || "este destino"} no
                  momento. A Oferta-Mestre ficará ativa no App e nos Stories para captar novos interessados.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 min-h-11 px-4 text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isPublishing}
              onClick={handlePublishOmnichannel}
              className="h-11 min-h-11 px-5 text-xs font-bold gap-2"
            >
              {isPublishing ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Publicar Oferta, Story Hot & Disparar Selecionados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cropperTarget ? (
        <ImageCropperDialog
          open={Boolean(cropperTarget)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setCropperTarget(null);
          }}
          imageSrc={cropperTarget === "story" ? storyMediaUrl : groupMediaUrl}
          aspect={cropperTarget === "story" ? 9 / 16 : 1}
          title={
            cropperTarget === "story"
              ? "Enquadrar Capa Vertical do Hot Story (9:16)"
              : "Enquadrar Card de Grupo WhatsApp (1:1 / 4:5)"
          }
          onCropCompleteAction={(croppedBase64) => {
            if (cropperTarget === "story") {
              setStoryMediaUrl(croppedBase64);
              toast.success("Enquadramento 9:16 aplicado ao Hot Story!");
            } else {
              setGroupMediaUrl(croppedBase64);
              toast.success("Enquadramento aplicado ao Card de Grupo WhatsApp!");
            }
          }}
        />
      ) : null}
    </>
  );
}
