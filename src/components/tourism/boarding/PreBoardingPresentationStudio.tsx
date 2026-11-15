import { useState, useMemo, useEffect } from "react";
import {
  Plane,
  Hotel,
  Calendar,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  Video,
  MapPin,
  Send,
  ShieldCheck,
  AlertTriangle,
  Train,
  Plus,
  Trash2,
  Edit3,
  Download,
  Palette,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  generateDynamicTravelPresentation,
  getPreBoardingMeetingFn,
  respondToPreBoardingMeetingInviteFn,
  schedulePreBoardingMeetingFn,
  type PreBoardingPresentationPage,
  type PreBoardingTripInput,
  type PresentationLocale,
} from "@/services/travel-pre-boarding-and-commissions.functions";
import { DocumentExportMenu } from "@/components/documents/DocumentExportMenu";
import { exportStudioDocument } from "@/lib/documents/document-export";
import {
  BRAND_COLOR_PRESETS,
  resolveProposalCanvasTheme,
} from "@/lib/tourism/proposal-theme-palettes";
import { useWorkspaceStore } from "@/lib/store-context";
import { resolveTenantDocumentIdentity } from "@/lib/documents/document-studio-catalog";

const EMPTY_TRIP_INPUT: PreBoardingTripInput = {
  presentationType: "pre_boarding_guide",
  agencyName: "",
  agencyEmergencyPhone: "",
  tripTitle: "",
  conceptSubtitle: "",
  travelerProfileType: "casal",
  passengersNames: [],
  adultsCount: 2,
  childrenCount: 0,
  startDate: "",
  endDate: "",
  originCity: "",
  destinations: [],
  countries: [],
  flights: [],
  hotels: [],
  hasReceptiveTransfer: false,
  commercialPriceTotalCents: 0,
  commercialPaymentConditions: "",
};

export function PreBoardingPresentationStudio({
  initialArchetypeKey = "caribe_resort",
  isPassengerPortal = false,
  tripId = "",
  initialTripInput,
  departures = [],
  agencyName,
  agencyAddress,
  agencyLogoUrl,
  brandColor,
  visualVariant = "editorial_deck",
}: {
  initialArchetypeKey?: "caribe_resort" | "orlando_parques" | "italia_multicidade" | "europa_multipais";
  isPassengerPortal?: boolean;
  tripId?: string;
  initialTripInput?: Partial<PreBoardingTripInput>;
  departures?: any[];
  agencyName?: string;
  agencyAddress?: string;
  agencyLogoUrl?: string | null;
  brandColor?: string | null;
  visualVariant?: "editorial_deck" | "dark_luxury_deck" | "corporate_pitch_deck";
}) {
  const { currentStore } = useWorkspaceStore();
  const tenantIdentity = useMemo(
    () =>
      resolveTenantDocumentIdentity({
        agency: currentStore,
        storeSettings: currentStore,
        overrideCompanyName: agencyName || initialTripInput?.agencyName,
        overrideLogoUrl: agencyLogoUrl,
        overrideBrandColor: brandColor,
      }),
    [currentStore, agencyName, initialTripInput?.agencyName, agencyLogoUrl, brandColor],
  );

  const [presentationMode, setPresentationMode] = useState<"pre_boarding_guide" | "commercial_quote">(
    initialTripInput?.presentationType || "pre_boarding_guide",
  );
  const [locale, setLocale] = useState<PresentationLocale>(initialTripInput?.locale || "pt-BR");
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [viewAllSlides, setViewAllSlides] = useState(false);
  const [activeVisualStyle, setActiveVisualStyle] = useState<
    "editorial_deck" | "dark_luxury_deck" | "corporate_pitch_deck"
  >(visualVariant);
  const [selectedBrandColor, setSelectedBrandColor] = useState<string>(
    brandColor || tenantIdentity.brandColor || BRAND_COLOR_PRESETS[0]?.value || "",
  );
  const [logoFailed, setLogoFailed] = useState(false);
  const [isSlideEditorOpen, setIsSlideEditorOpen] = useState(!isPassengerPortal);
  const [slideOverrides, setSlideOverrides] = useState<Record<number, Partial<PreBoardingPresentationPage>>>({});
  const [customSlides, setCustomSlides] = useState<PreBoardingPresentationPage[]>([]);
  const [deletedSlideNumbers, setDeletedSlideNumbers] = useState<number[]>([]);

  useEffect(() => {
    if (brandColor) setSelectedBrandColor(brandColor);
    else if (tenantIdentity.brandColor && !selectedBrandColor) {
      setSelectedBrandColor(tenantIdentity.brandColor);
    }
  }, [brandColor, tenantIdentity.brandColor, selectedBrandColor]);

  useEffect(() => {
    setLogoFailed(false);
  }, [agencyLogoUrl, tenantIdentity.logoUrl]);

  // Estado configurável pelo agente ou alimentado pela viagem real
  const [customTitle, setCustomTitle] = useState(initialTripInput?.tripTitle || "");
  const [customOriginCity, setCustomOriginCity] = useState(initialTripInput?.originCity || "");
  const [customDestination, setCustomDestination] = useState(initialTripInput?.destinations?.[0] || "");
  const [customCountry, setCustomCountry] = useState(initialTripInput?.countries?.[0] || "");
  const [customStartDate, setCustomStartDate] = useState(initialTripInput?.startDate || "");
  const [customEndDate, setCustomEndDate] = useState(initialTripInput?.endDate || "");
  const [customPassengerName, setCustomPassengerName] = useState(initialTripInput?.passengersNames?.[0] || "");
  const [customAirline, setCustomAirline] = useState(initialTripInput?.flights?.[0]?.airline || "");
  const [customFlightNumber, setCustomFlightNumber] = useState(initialTripInput?.flights?.[0]?.flightNumber || "");
  const [customOriginIata, setCustomOriginIata] = useState(initialTripInput?.flights?.[0]?.originIata || "");
  const [customDestIata, setCustomDestIata] = useState(initialTripInput?.flights?.[0]?.destinationIata || "");
  const [customHotelName, setCustomHotelName] = useState(initialTripInput?.hotels?.[0]?.name || "");
  const [customMealPlan, setCustomMealPlan] = useState(initialTripInput?.hotels?.[0]?.mealPlan || "");

  // Agendamento de reunião de pré-embarque
  const [selectedTripId, setSelectedTripId] = useState(tripId || "");
  const [presentationId, setPresentationId] = useState<string | null>(null);
  const [meetingModality, setMeetingModality] = useState<"online_video" | "in_person_agency">("online_video");
  const [slot1, setSlot1] = useState("");
  const [slot2, setSlot2] = useState("");
  const [proposedSlots, setProposedSlots] = useState<string[]>([]);
  const [meetingLinkOrAddress, setMeetingLinkOrAddress] = useState(agencyAddress || "");
  const [meetingStatus, setMeetingStatus] = useState<
    "not_scheduled" | "proposed_by_agency" | "accepted_by_client" | "reschedule_requested" | "completed"
  >("not_scheduled");
  const [confirmedSlot, setConfirmedSlot] = useState<string | null>(null);
  const [isSchedulingMeeting, setIsSchedulingMeeting] = useState(false);
  const [isConfirmingSlot, setIsConfirmingSlot] = useState(false);

  useEffect(() => {
    setSelectedTripId(tripId || "");
  }, [tripId]);

  useEffect(() => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!selectedTripId || !uuidRegex.test(selectedTripId)) return;
    let active = true;
    getPreBoardingMeetingFn({ data: { tripId: selectedTripId } })
      .then((res) => {
        if (!active || !res?.found || !res.meeting) return;
        setPresentationId(res.meeting.presentationId);
        setMeetingStatus(res.meeting.meetingStatus);
        setMeetingModality(res.meeting.modality);
        setProposedSlots(res.meeting.proposedSlotsIso || []);
        setConfirmedSlot(res.meeting.confirmedSlotIso);
        if (res.meeting.meetingLinkOrAddress) {
          setMeetingLinkOrAddress(res.meeting.meetingLinkOrAddress);
        }
      })
      .catch(() => {
        // Sem agenda prévia disponível para esta viagem ainda
      });
    return () => {
      active = false;
    };
  }, [selectedTripId]);

  const handleLoadDepartureIntoStudio = (dep: any) => {
    if (typeof dep?.id === "string" && dep.id) {
      setSelectedTripId(dep.id);
    }
    setCustomTitle(`Guia de Pré-Embarque — ${dep.destination || ""}`);
    setCustomDestination(dep.destination || "");
    setCustomPassengerName(dep.client_name || "");
    setCustomStartDate(dep.departure_date ? new Date(dep.departure_date).toLocaleDateString("pt-BR") : "");
    setCustomEndDate(dep.return_date ? new Date(dep.return_date).toLocaleDateString("pt-BR") : "");
    setCustomAirline(dep.airline_code || "");
    setCustomFlightNumber(dep.flight_number || "");
    setCustomHotelName(dep.hotel_name || "");
    setActiveSlideIndex(0);
    toast.success(`Dados do embarque de ${dep.client_name || "passageiro"} carregados no estúdio!`);
  };

  const activeTripInput: PreBoardingTripInput = useMemo(() => {
    const mergedFlights =
      initialTripInput?.flights && initialTripInput.flights.length > 0 && !customAirline && !customOriginIata
        ? initialTripInput.flights
        : customAirline || customFlightNumber || customOriginIata || customDestIata
          ? [
              {
                direction: "ida" as const,
                date: customStartDate || "",
                airline: customAirline || "Companhia Aérea",
                flightNumber: customFlightNumber || "",
                originIata: customOriginIata || "",
                destinationIata: customDestIata || "",
                departureTime: "",
                arrivalTime: "",
                durationText: "",
                sameTicket: true,
              },
            ]
          : [];

    const mergedHotels =
      initialTripInput?.hotels && initialTripInput.hotels.length > 0 && !customHotelName
        ? initialTripInput.hotels
        : customHotelName
          ? [
              {
                name: customHotelName,
                city: customDestination || "",
                mealPlan: customMealPlan || "Conforme reserva",
              },
            ]
          : [];

    return {
      ...EMPTY_TRIP_INPUT,
      ...initialTripInput,
      presentationType: presentationMode,
      locale,
      tripTitle: customTitle || initialTripInput?.tripTitle || (customDestination ? `Guia de Pré-Embarque — ${customDestination}` : "Guia Oficial de Pré-Embarque"),
      conceptSubtitle: initialTripInput?.conceptSubtitle || customDestination || "Roteiro Personalizado",
      originCity: customOriginCity || initialTripInput?.originCity || "",
      destinations: customDestination ? [customDestination] : initialTripInput?.destinations || [],
      countries: customCountry ? [customCountry] : initialTripInput?.countries || [],
      startDate: customStartDate || initialTripInput?.startDate || "",
      endDate: customEndDate || initialTripInput?.endDate || "",
      passengersNames: customPassengerName
        ? [customPassengerName]
        : initialTripInput?.passengersNames || [],
      flights: mergedFlights,
      hotels: mergedHotels,
    };
  }, [
    initialTripInput,
    presentationMode,
    locale,
    customTitle,
    customOriginCity,
    customDestination,
    customCountry,
    customStartDate,
    customEndDate,
    customPassengerName,
    customAirline,
    customFlightNumber,
    customOriginIata,
    customDestIata,
    customHotelName,
    customMealPlan,
  ]);

  const generated = useMemo(
    () => generateDynamicTravelPresentation(activeTripInput),
    [activeTripInput],
  );

  const resolvedAgencyName =
    agencyName || tenantIdentity.companyName || activeTripInput.agencyName || "Agência Organizadora";
  const resolvedLogoUrl =
    !logoFailed && (agencyLogoUrl || tenantIdentity.logoUrl)
      ? agencyLogoUrl || tenantIdentity.logoUrl
      : null;

  const brandTheme = useMemo(
    () =>
      resolveProposalCanvasTheme({
        templateTheme:
          activeVisualStyle === "dark_luxury_deck"
            ? "dark-premium"
            : activeVisualStyle === "corporate_pitch_deck"
              ? "executivo-b2b"
              : "editorial-flat",
        brandColor: selectedBrandColor || tenantIdentity.brandColor || undefined,
      }),
    [activeVisualStyle, selectedBrandColor, tenantIdentity.brandColor],
  );

  const effectivePages = useMemo<PreBoardingPresentationPage[]>(() => {
    const base = generated.pages
      .filter((pg) => !deletedSlideNumbers.includes(pg.pageNumber))
      .map((pg) => {
        const ov = slideOverrides[pg.pageNumber];
        if (!ov) return pg;
        return {
          ...pg,
          ...ov,
          cards: ov.cards ?? pg.cards,
          steps: ov.steps ?? pg.steps,
        };
      });
    return [...base, ...customSlides].map((pg, idx) => ({
      ...pg,
      pageNumber: idx + 1,
    }));
  }, [generated.pages, deletedSlideNumbers, slideOverrides, customSlides]);

  const deckMarkdown = useMemo(() => {
    return effectivePages
      .map((pg) => {
        const parts: string[] = [
          `# ${pg.pageNumber}. ${pg.title}`,
          pg.subtitle ? `**${pg.subtitle}**` : "",
          pg.humanNarrative || "",
        ];
        if (pg.timelineNodes?.length) {
          parts.push(
            "## Cronograma & Voos\n" +
              pg.timelineNodes
                .map((n) => `- **${n.timeOrPlace}** — ${n.iataExpanded}: ${n.instruction}`)
                .join("\n"),
          );
        }
        if (pg.cards?.length) {
          parts.push(
            "## Informações Essenciais\n| Item | Detalhe | Orientação |\n| :--- | :--- | :--- |\n" +
              pg.cards
                .map((c) => `| ${c.label} | ${c.value} | ${c.practicalExplanation} |`)
                .join("\n"),
          );
        }
        if (pg.steps?.length) {
          parts.push(
            "## Passo a Passo\n" +
              pg.steps
                .map((s) => `${s.stepNumber}. **${s.title}**: ${s.explanation}`)
                .join("\n"),
          );
        }
        return parts.filter(Boolean).join("\n\n");
      })
      .join("\n\n---\n\n");
  }, [effectivePages]);

  const currentSlide = effectivePages[activeSlideIndex] || effectivePages[0];

  const handleUpdateCurrentSlide = (patch: Partial<PreBoardingPresentationPage>) => {
    if (!currentSlide) return;
    const baseMatch = generated.pages.find(
      (pg) => pg.moduleKey === currentSlide.moduleKey && pg.pageNumber === currentSlide.pageNumber,
    );
    const customIndex = customSlides.findIndex(
      (cs) => cs.moduleKey === currentSlide.moduleKey && cs.title === currentSlide.title,
    );
    if (customIndex >= 0 && !baseMatch) {
      setCustomSlides((prev) =>
        prev.map((cs, idx) => (idx === customIndex ? { ...cs, ...patch } : cs)),
      );
      return;
    }
    const targetKey = baseMatch ? baseMatch.pageNumber : currentSlide.pageNumber;
    setSlideOverrides((prev) => ({
      ...prev,
      [targetKey]: {
        ...(prev[targetKey] || {}),
        ...patch,
      },
    }));
  };

  const handleAddCustomSlide = () => {
    const nextNum = effectivePages.length + 1;
    const newSlide: PreBoardingPresentationPage = {
      pageNumber: nextNum,
      moduleKey: `custom_slide_${Date.now()}`,
      eyebrow: `${resolvedAgencyName} • Destaque Personalizado`,
      title: `Novo Tópico da Apresentação #${nextNum}`,
      subtitle: "Personalize o título, narrativa e cartões informativos deste slide",
      humanNarrative:
        "Adicione aqui observações exclusivas, diferenciais do pacote, roteiro especial ou condições negociadas com o cliente.",
      cards: [
        {
          label: "Destaque Principal",
          value: "Experiência Exclusiva",
          practicalExplanation: "Detalhe o benefício ou serviço incluído neste módulo.",
          badge: "Incluso",
        },
        {
          label: "Atendimento & Suporte",
          value: resolvedAgencyName,
          practicalExplanation:
            tenantIdentity.phone || tenantIdentity.email || "Acompanhamento dedicado.",
          badge: "VIP",
        },
      ],
    };
    setCustomSlides((prev) => [...prev, newSlide]);
    setActiveSlideIndex(effectivePages.length);
    setIsSlideEditorOpen(true);
    toast.success("Novo slide adicionado à apresentação!");
  };

  const handleDeleteCurrentSlide = () => {
    if (!currentSlide || effectivePages.length <= 1) {
      toast.error("A apresentação deve manter ao menos 1 slide ativo.");
      return;
    }
    const customIdx = customSlides.findIndex((cs) => cs.moduleKey === currentSlide.moduleKey);
    if (customIdx >= 0) {
      setCustomSlides((prev) => prev.filter((_, idx) => idx !== customIdx));
    } else {
      const orig = generated.pages.find((pg) => pg.moduleKey === currentSlide.moduleKey);
      if (orig) {
        setDeletedSlideNumbers((prev) => [...prev, orig.pageNumber]);
      }
    }
    setActiveSlideIndex((prev) => Math.max(0, prev - 1));
    toast.success("Slide removido da apresentação.");
  };

  const handleResetSlides = () => {
    setSlideOverrides({});
    setCustomSlides([]);
    setDeletedSlideNumbers([]);
    setActiveSlideIndex(0);
    toast.success("Slides restaurados para a estrutura original!");
  };

  const handleQuickDownloadPdf = async () => {
    await exportStudioDocument("pdf", {
      filenameBase: `${activeTripInput.tripTitle || "apresentacao"}-${locale}`,
      title: activeTripInput.tripTitle || "Apresentação Executiva",
      subtitle: `${activeTripInput.destinations[0] || ""} · ${effectivePages.length} Slides`,
      agencyName: resolvedAgencyName,
      elementId: "presentation-active-slide-canvas",
      deckSelector: viewAllSlides ? ".presentation-page" : undefined,
      markdownContent: deckMarkdown,
      pageFormat: "presentation-169",
    });
  };

  const handleScheduleMeeting = async () => {
    const rawSlots = [slot1, slot2].map((s) => s.trim()).filter(Boolean);
    if (rawSlots.length === 0) {
      toast.error("Informe ao menos uma data e horário para propor a reunião de pré-embarque.");
      return;
    }

    const locationOrUrl =
      meetingLinkOrAddress.trim() ||
      (meetingModality === "in_person_agency" ? (agencyAddress || "").trim() : "");

    if (!locationOrUrl || locationOrUrl.length < 3) {
      toast.error(
        meetingModality === "online_video"
          ? "Informe o link da videochamada (Google Meet ou Zoom)."
          : "Informe o endereço presencial da agência para a reunião.",
      );
      return;
    }

    setIsSchedulingMeeting(true);
    try {
      const isoSlots = rawSlots.map((raw) => {
        const dt = new Date(raw);
        if (Number.isNaN(dt.getTime())) {
          throw new Error("Data ou horário inválido selecionado.");
        }
        return dt.toISOString();
      });

      const res = await schedulePreBoardingMeetingFn({
        data: {
          presentationId: presentationId || undefined,
          storeId: currentStore?.id || undefined,
          tripId: selectedTripId || undefined,
          presentationTitle: activeTripInput.tripTitle || undefined,
          clientName: activeTripInput.passengersNames[0] || "Passageiro",
          modality: meetingModality,
          proposedSlotsIso: isoSlots,
          meetingLinkOrAddress: locationOrUrl,
          agentName: activeTripInput.agencyName || resolvedAgencyName,
        },
      });
      setPresentationId(res.presentationId);
      setProposedSlots(res.proposedSlotsIso);
      setMeetingStatus("proposed_by_agency");
      toast.success(
        "Convite de Reunião de Pré-Embarque gravado e enviado para o Portal do Passageiro!",
      );
    } catch (err: any) {
      toast.error(
        err?.message || "Não foi possível gravar o agendamento da reunião de pré-embarque.",
      );
    } finally {
      setIsSchedulingMeeting(false);
    }
  };

  const handleConfirmPassengerSlot = async (slotIso: string) => {
    if (!selectedTripId && !presentationId) {
      toast.error("Convite de apresentação ainda não vinculado a esta viagem.");
      return;
    }
    setIsConfirmingSlot(true);
    try {
      const res = await respondToPreBoardingMeetingInviteFn({
        data: {
          presentationId: presentationId || undefined,
          tripId: selectedTripId || presentationId || "",
          acceptedSlotIso: slotIso,
          modality: meetingModality,
        },
      });
      setPresentationId(res.presentationId);
      setConfirmedSlot(res.confirmedSlotIso);
      setMeetingStatus("accepted_by_client");
      toast.success(
        `Reunião de Pré-Embarque confirmada para ${new Date(res.confirmedSlotIso).toLocaleString("pt-BR")}!`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível confirmar o horário selecionado.");
    } finally {
      setIsConfirmingSlot(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Estúdio / Configurador Dinâmico da Viagem */}
      <div className="p-5 rounded-lg border border-border bg-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            {resolvedLogoUrl ? (
              <img
                src={resolvedLogoUrl}
                alt={resolvedAgencyName}
                onError={() => setLogoFailed(true)}
                className="size-12 rounded-lg object-contain border border-border bg-background p-1 shrink-0"
              />
            ) : (
              <div
                className="size-12 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 waesy-dyn-bg waesy-dyn-fg"
                style={
                  {
                    "--dyn-bg": brandTheme.brandAccent,
                    "--dyn-fg": brandTheme.brandFg,
                  } as React.CSSProperties
                }
              >
                <span>{resolvedAgencyName.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="text-xs font-bold">
                  Brand Kit: {resolvedAgencyName}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Arquétipo: {generated.detectedArchetype.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs font-mono">
                  {effectivePages.length} Slides Editáveis
                </Badge>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                {isPassengerPortal
                  ? "Sua Apresentação Interativa de Pré-Embarque & Reunião com o Consultor"
                  : "Builder de Apresentações Comerciais & Guias de Pré-Embarque"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isPassengerPortal
                  ? `Preparado por ${resolvedAgencyName} com informações oficiais dos seus voos, hospedagem e destino.`
                  : "Escolha o template visual, aplique o Brand Kit com a logo da empresa, edite cada slide em tempo real e baixe em PDF ou outros formatos."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="default"
              onClick={handleQuickDownloadPdf}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Download className="size-4" />
              <span>Baixar PDF</span>
            </Button>
            <DocumentExportMenu
              filenameBase={`${activeTripInput.tripTitle || "apresentacao"}-${locale}`}
              title={activeTripInput.tripTitle || "Apresentação Executiva de Viagem"}
              subtitle={`${activeTripInput.destinations[0] || ""} · ${effectivePages.length} Slides`}
              agencyName={resolvedAgencyName}
              elementId="presentation-active-slide-canvas"
              deckSelector={viewAllSlides ? ".presentation-page" : undefined}
              markdownContent={deckMarkdown}
              pageFormat="presentation-169"
              label="Mais Formatos"
              variant="outline"
            />
          </div>
        </div>

        {/* Seletor de Templates Visuais, Brand Kit e Idioma */}
        <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">
              <Palette className="size-3.5 text-primary" />
              <span>Template Visual:</span>
            </span>
            {(
              [
                { id: "editorial_deck", label: "Editorial Clean 16:9" },
                { id: "dark_luxury_deck", label: "Luxury Dark 16:9" },
                { id: "corporate_pitch_deck", label: "Corporativo Brand Kit" },
              ] as const
            ).map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setActiveVisualStyle(tpl.id)}
                className={cn(
                  "h-11 min-h-11 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeVisualStyle === tpl.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {tpl.label}
              </button>
            ))}

            {!isPassengerPortal && (
              <div className="flex items-center gap-2 pl-2 border-l border-border">
                <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                  Cor da Marca:
                </span>
                {BRAND_COLOR_PRESETS.slice(0, 5).map((sw) => (
                  <button
                    key={sw.id}
                    type="button"
                    title={sw.label}
                    aria-label={`Cor da marca ${sw.label}`}
                    onClick={() => setSelectedBrandColor(sw.value)}
                    className={cn(
                      "size-11 rounded-lg border flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selectedBrandColor === sw.value
                        ? "border-foreground ring-2 ring-primary/30"
                        : "border-border/60",
                    )}
                  >
                    <span
                      className="size-5 rounded-full border border-border/40 waesy-dyn-bg"
                      style={{ "--dyn-bg": sw.value } as React.CSSProperties}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Idioma Comercial (PT-BR / EN-US / ES-ES) */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border">
              {(
                [
                  { code: "pt-BR", label: "PT-BR" },
                  { code: "en-US", label: "EN-US" },
                  { code: "es-ES", label: "ES-ES" },
                ] as const
              ).map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLocale(lang.code)}
                  className={`h-11 min-h-11 px-3 rounded-md text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    locale === lang.code
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {!isPassengerPortal && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPresentationMode("commercial_quote");
                    setActiveSlideIndex(0);
                  }}
                  className={`h-11 min-h-11 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    presentationMode === "commercial_quote"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Modo Comercial (Pré-Venda)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPresentationMode("pre_boarding_guide");
                    setActiveSlideIndex(0);
                  }}
                  className={`h-11 min-h-11 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    presentationMode === "pre_boarding_guide"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Guia Pré-Embarque (Pós-Venda)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Seletor de Embarques Reais da Agência + Campos Configuráveis (Zero Hardcode) */}
        {!isPassengerPortal && (
          <div className="pt-3 border-t border-border/60 space-y-3">
            {departures && departures.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Carregar de Embarque Real:</span>
                {departures.slice(0, 8).map((dep: any) => (
                  <button
                    key={dep.id}
                    type="button"
                    onClick={() => handleLoadDepartureIntoStudio(dep)}
                    className="h-11 min-h-11 px-3 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {dep.client_name} · {dep.destination}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Passageiro Principal</Label>
                <Input
                  value={customPassengerName}
                  onChange={(e) => setCustomPassengerName(e.target.value)}
                  placeholder="Nome do passageiro"
                  className="h-11 min-h-11 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cidade de Origem</Label>
                <Input
                  value={customOriginCity}
                  onChange={(e) => setCustomOriginCity(e.target.value)}
                  placeholder="Cidade de saída"
                  className="h-11 min-h-11 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Destino Principal</Label>
                <Input
                  value={customDestination}
                  onChange={(e) => setCustomDestination(e.target.value)}
                  placeholder="Cidade ou destino"
                  className="h-11 min-h-11 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">País de Destino</Label>
                <Input
                  value={customCountry}
                  onChange={(e) => setCustomCountry(e.target.value)}
                  placeholder="País"
                  className="h-11 min-h-11 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data de Ida</Label>
                <Input
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="h-11 min-h-11 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Data de Retorno</Label>
                <Input
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  placeholder="DD/MM/AAAA"
                  className="h-11 min-h-11 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Cia Aérea & Nº Voo</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    value={customAirline}
                    onChange={(e) => setCustomAirline(e.target.value)}
                    placeholder="Cia Aérea"
                    className="h-11 min-h-11 text-xs"
                  />
                  <Input
                    value={customFlightNumber}
                    onChange={(e) => setCustomFlightNumber(e.target.value)}
                    placeholder="Nº Voo"
                    className="h-11 min-h-11 text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Aeroportos IATA (Origem / Destino)</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    value={customOriginIata}
                    onChange={(e) => setCustomOriginIata(e.target.value.toUpperCase())}
                    placeholder="IATA Origem"
                    maxLength={4}
                    className="h-11 min-h-11 text-xs font-mono uppercase"
                  />
                  <Input
                    value={customDestIata}
                    onChange={(e) => setCustomDestIata(e.target.value.toUpperCase())}
                    placeholder="IATA Destino"
                    maxLength={4}
                    className="h-11 min-h-11 text-xs font-mono uppercase"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Hotel / Hospedagem Confirmada</Label>
                <Input
                  value={customHotelName}
                  onChange={(e) => setCustomHotelName(e.target.value)}
                  placeholder="Nome do hotel ou resort"
                  className="h-11 min-h-11 text-xs mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Regime de Alimentação</Label>
                <Input
                  value={customMealPlan}
                  onChange={(e) => setCustomMealPlan(e.target.value)}
                  placeholder="Café da manhã, Meia Pensão, All-Inclusive..."
                  className="h-11 min-h-11 text-xs mt-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Palco do Slide Ativo (Visual Limpo Apple HIG — Zero Truncate) */}
      {currentSlide && (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Barra de Navegação de Slides */}
          <div className="px-5 py-3 bg-muted/30 border-b border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-mono">
                Slide {currentSlide.pageNumber} de {effectivePages.length}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                Módulo: {currentSlide.moduleKey}
              </Badge>
              <span className="text-xs font-semibold text-muted-foreground">
                {currentSlide.eyebrow}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isPassengerPortal && (
                <>
                  <Button
                    type="button"
                    variant={isSlideEditorOpen ? "secondary" : "outline"}
                    onClick={() => setIsSlideEditorOpen((v) => !v)}
                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Edit3 className="size-3.5" />
                    <span>{isSlideEditorOpen ? "Ocultar Editor" : "Editar Slide"}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCustomSlide}
                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Plus className="size-3.5" />
                    <span>Novo Slide</span>
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant={viewAllSlides ? "secondary" : "outline"}
                onClick={() => setViewAllSlides((v) => !v)}
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>{viewAllSlides ? "Modo Slide Único" : `Ver Todos (${effectivePages.length})`}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={viewAllSlides || activeSlideIndex === 0}
                onClick={() => setActiveSlideIndex((i) => Math.max(0, i - 1))}
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline">Slide Anterior</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={viewAllSlides || activeSlideIndex >= effectivePages.length - 1}
                onClick={() =>
                  setActiveSlideIndex((i) => Math.min(effectivePages.length - 1, i + 1))
                }
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="hidden sm:inline">Próximo Slide</span>
                <ChevronRight className="size-4" />
              </Button>
              <DocumentExportMenu
                filenameBase={`${activeTripInput.tripTitle || "apresentacao"}-${locale}`}
                title={activeTripInput.tripTitle || "Apresentação Executiva de Viagem"}
                subtitle={`${activeTripInput.destinations[0] || ""} · ${effectivePages.length} Slides`}
                agencyName={resolvedAgencyName}
                elementId="presentation-active-slide-canvas"
                deckSelector={viewAllSlides ? ".presentation-page" : undefined}
                markdownContent={deckMarkdown}
                pageFormat="presentation-169"
                label="Exportar"
                variant="outline"
              />
            </div>
          </div>

          {/* Régua de Mini-Índice de Slides Clicáveis */}
          <div className="tab-list flex flex-nowrap items-center gap-1 overflow-x-auto no-scrollbar px-5 py-2 bg-muted/10 border-b border-border/50">
            {effectivePages.map((pg, idx) => (
              <button
                key={`${pg.moduleKey}-${idx}`}
                type="button"
                onClick={() => setActiveSlideIndex(idx)}
                className={`h-11 min-h-11 px-3 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  idx === activeSlideIndex
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {idx + 1}. {pg.title.slice(0, 28)}
              </button>
            ))}
          </div>

          {/* Editor em Tempo Real do Slide Ativo */}
          {!isPassengerPortal && isSlideEditorOpen && (
            <div className="p-5 bg-muted/20 border-b border-border space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-2xs">
                    Editor do Slide {currentSlide.pageNumber}
                  </Badge>
                  <span className="text-xs font-semibold text-foreground">
                    Edite textos, narrativa e cartões deste slide em tempo real
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const nextCards = [
                        ...(currentSlide.cards || []),
                        {
                          label: "Novo Item",
                          value: "Destaque ou Valor",
                          practicalExplanation: "Explicação prática para o cliente.",
                          badge: "Incluso" as const,
                        },
                      ];
                      handleUpdateCurrentSlide({ cards: nextCards });
                    }}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-2"
                  >
                    <Plus className="size-3.5" />
                    <span>Adicionar Card</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDeleteCurrentSlide}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Excluir Slide</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResetSlides}
                    className="h-11 min-h-11 px-3 text-xs font-semibold gap-2"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Restaurar Padrão</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Chapéu / Categoria (Eyebrow)</Label>
                  <Input
                    value={currentSlide.eyebrow}
                    onChange={(e) => handleUpdateCurrentSlide({ eyebrow: e.target.value })}
                    className="h-11 min-h-11 text-xs mt-1 bg-background"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Título Principal do Slide</Label>
                  <Input
                    value={currentSlide.title}
                    onChange={(e) => handleUpdateCurrentSlide({ title: e.target.value })}
                    className="h-11 min-h-11 text-xs mt-1 bg-background font-bold"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Subtítulo do Slide</Label>
                  <Input
                    value={currentSlide.subtitle}
                    onChange={(e) => handleUpdateCurrentSlide({ subtitle: e.target.value })}
                    className="h-11 min-h-11 text-xs mt-1 bg-background"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Narrativa / Explicação Consultiva</Label>
                <Textarea
                  value={currentSlide.humanNarrative}
                  onChange={(e) => handleUpdateCurrentSlide({ humanNarrative: e.target.value })}
                  rows={2}
                  className="text-xs mt-1 bg-background"
                />
              </div>

              {currentSlide.cards && currentSlide.cards.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                  {currentSlide.cards.map((card, cIdx) => (
                    <div
                      key={cIdx}
                      className="p-3 rounded-lg border border-border bg-background space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Input
                          value={card.label}
                          onChange={(e) => {
                            const updated = (currentSlide.cards || []).map((c, i) =>
                              i === cIdx ? { ...c, label: e.target.value } : c,
                            );
                            handleUpdateCurrentSlide({ cards: updated });
                          }}
                          placeholder="Rótulo do card"
                          className="h-11 min-h-11 text-xs font-bold"
                        />
                        <Input
                          value={card.value}
                          onChange={(e) => {
                            const updated = (currentSlide.cards || []).map((c, i) =>
                              i === cIdx ? { ...c, value: e.target.value } : c,
                            );
                            handleUpdateCurrentSlide({ cards: updated });
                          }}
                          placeholder="Valor / Destaque"
                          className="h-11 min-h-11 text-xs"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Remover card do slide"
                          onClick={() => {
                            const updated = (currentSlide.cards || []).filter((_, i) => i !== cIdx);
                            handleUpdateCurrentSlide({ cards: updated });
                          }}
                          className="size-11 shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <Input
                        value={card.practicalExplanation}
                        onChange={(e) => {
                          const updated = (currentSlide.cards || []).map((c, i) =>
                            i === cIdx ? { ...c, practicalExplanation: e.target.value } : c,
                          );
                          handleUpdateCurrentSlide({ cards: updated });
                        }}
                        placeholder="Explicação detalhada do card"
                        className="h-11 min-h-11 text-xs text-muted-foreground"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Corpo Principal do Slide / Deck Completo */}
          <div id="presentation-active-slide-canvas" className="space-y-6 bg-card">
            {(viewAllSlides ? effectivePages : [currentSlide]).map((slide, slideIdx) => (
              <div
                key={`${slide.moduleKey}-${slide.pageNumber}-${slideIdx}`}
                className={cn(
                  "presentation-page p-6 sm:p-8 space-y-6 waesy-dyn-bg waesy-dyn-fg",
                  slideIdx > 0 && "border-t border-border",
                )}
                style={
                  {
                    "--dyn-bg": brandTheme.canvasBg,
                    "--dyn-fg": brandTheme.ink,
                    "--dyn-bdr": brandTheme.border,
                  } as React.CSSProperties
                }
              >
                {/* Cabeçalho Institucional Brand Kit com Logo da Empresa em Todo Slide */}
                <div
                  className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b waesy-dyn-bdr"
                  style={{ "--dyn-bdr": brandTheme.border } as React.CSSProperties}
                >
                  <div className="flex items-center gap-3">
                    {resolvedLogoUrl ? (
                      <img
                        src={resolvedLogoUrl}
                        alt={resolvedAgencyName}
                        onError={() => setLogoFailed(true)}
                        className="h-11 max-w-36 object-contain rounded-md bg-card px-2 py-1 border border-border/40 shrink-0"
                      />
                    ) : (
                      <div
                        className="h-11 px-3 rounded-md flex items-center justify-center font-bold text-xs tracking-wider uppercase shrink-0 waesy-dyn-bg waesy-dyn-fg"
                        style={
                          {
                            "--dyn-bg": brandTheme.brandAccent,
                            "--dyn-fg": brandTheme.brandFg,
                          } as React.CSSProperties
                        }
                      >
                        <span>{resolvedAgencyName}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-xs font-bold block">{resolvedAgencyName}</span>
                      <span className="text-2xs opacity-75 block">
                        {[
                          tenantIdentity.registryCode,
                          tenantIdentity.phone,
                          tenantIdentity.email,
                        ]
                          .filter(Boolean)
                          .join(" • ") ||
                          agencyAddress ||
                          "Apresentação Oficial Personalizada"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-3 py-1 rounded-full text-2xs font-bold uppercase tracking-wider waesy-dyn-bg waesy-dyn-fg"
                      style={
                        {
                          "--dyn-bg": brandTheme.brandSoft,
                          "--dyn-fg": brandTheme.ink,
                        } as React.CSSProperties
                      }
                    >
                      {slide.eyebrow}
                    </span>
                    <span className="text-xs font-mono opacity-75">
                      Slide {slide.pageNumber} / {effectivePages.length}
                    </span>
                  </div>
                </div>

                <div
                  className="space-y-2 border-b pb-4 waesy-dyn-bdr"
                  style={{ "--dyn-bdr": brandTheme.border } as React.CSSProperties}
                >
                  <h3 className="text-xl sm:text-2xl font-bold break-words leading-tight">
                    {slide.title}
                  </h3>
                  <p className="text-sm font-medium opacity-80 break-words">
                    {slide.subtitle}
                  </p>
                </div>

                <div
                  className="p-4 rounded-lg border text-sm leading-relaxed break-words waesy-dyn-bg waesy-dyn-bdr"
                  style={
                    {
                      "--dyn-bg": brandTheme.surfaceCard,
                      "--dyn-bdr": brandTheme.border,
                    } as React.CSSProperties
                  }
                >
                  {slide.humanNarrative}
                </div>

                {slide.timelineNodes && slide.timelineNodes.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Linha do Tempo Completa dos Trechos (Aeroportos Expandidos)
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {slide.timelineNodes.map((node, nIdx) => (
                        <div
                          key={nIdx}
                          className="p-4 rounded-lg border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-primary">
                              <Plane className="size-4 shrink-0" />
                              <span>{node.timeOrPlace}</span>
                            </div>
                            <p className="text-sm font-bold text-foreground break-words">
                              {node.iataExpanded}
                            </p>
                            <p className="text-xs text-muted-foreground break-words">
                              {node.instruction}
                            </p>
                          </div>
                          {node.durationOrWait && (
                            <Badge variant="secondary" className="text-xs font-mono shrink-0">
                              {node.durationOrWait}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {slide.steps && slide.steps.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {slide.steps.map((st) => (
                      <div
                        key={st.stepNumber}
                        className="p-4 rounded-lg border border-border bg-muted/20 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-bold">
                            Passo {st.stepNumber}
                          </span>
                          {st.badge && (
                            <Badge
                              variant={st.badge === "OBRIGATÓRIO" ? "secondary" : "outline"}
                              className="text-xs font-bold"
                            >
                              {st.badge}
                            </Badge>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-foreground break-words">{st.title}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed break-words">
                          {st.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {slide.cards && slide.cards.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {slide.cards.map((card, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-4 rounded-lg border border-border bg-muted/15 space-y-2 flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary break-words">
                              {card.label}
                            </span>
                            {card.badge && (
                              <Badge
                                variant={card.badge === "OBRIGATÓRIO" ? "secondary" : "outline"}
                                className="text-xs shrink-0"
                              >
                                {card.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-bold text-foreground break-words leading-snug">
                            {card.value}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed break-words pt-1 border-t border-border/40">
                          {card.practicalExplanation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {slide.alertBanner && (
                  <div className="p-4 rounded-lg border border-warning/40 bg-warning/10 flex items-start gap-3 text-xs">
                    <AlertTriangle className="size-4 text-warning-strong shrink-0 mt-1" />
                    <div>
                      <span className="font-bold text-foreground block">
                        {slide.alertBanner.level}
                      </span>
                      <p className="text-muted-foreground break-words">
                        {slide.alertBanner.message}
                      </p>
                    </div>
                  </div>
                )}

                {/* Rodapé Institucional do Slide */}
                <div
                  className="pt-4 border-t flex flex-wrap items-center justify-between gap-2 text-2xs opacity-75 waesy-dyn-bdr"
                  style={{ "--dyn-bdr": brandTheme.border } as React.CSSProperties}
                >
                  <span>
                    {resolvedAgencyName} • {activeTripInput.tripTitle || "Apresentação Executiva"}
                  </span>
                  <span>
                    {[tenantIdentity.phone, tenantIdentity.email, tenantIdentity.website]
                      .filter(Boolean)
                      .join(" • ") || "Emitido via Waesy Studio"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bloco de Agendamento Bidirecional da Reunião de Pré-Embarque (Online ou Presencial) */}
      <div className="p-5 rounded-lg border border-border bg-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-bold">
                Alinhamento Humano Pré-Viagem
              </Badge>
              <Badge
                variant={meetingStatus === "accepted_by_client" ? "secondary" : "outline"}
                className="text-xs"
              >
                {meetingStatus === "accepted_by_client" && confirmedSlot
                  ? `Confirmada para ${new Date(confirmedSlot).toLocaleString("pt-BR")}`
                  : meetingStatus === "proposed_by_agency"
                    ? "Horários Propostos pela Agência"
                    : "Aguardando Agendamento"}
              </Badge>
            </div>
            <h3 className="text-base font-bold text-foreground mt-1">
              Reunião de Pré-Embarque (Online por Vídeo ou Presencial na Agência)
            </h3>
            <p className="text-xs text-muted-foreground">
              {isPassengerPortal
                ? "Escolha abaixo o melhor horário e modalidade para passarmos juntos por todos os detalhes do seu embarque."
                : "Agende a apresentação de pré-embarque com o passageiro. Ao aceitar no Portal do Viajante, o compromisso entra automaticamente na agenda do agente."}
            </p>
          </div>
        </div>

        {isPassengerPortal ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
              <span className="text-xs font-bold text-primary block">
                1. Escolha a Modalidade Preferida
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMeetingModality("online_video")}
                  className={`h-11 min-h-11 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    meetingModality === "online_video"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  <Video className="size-4" />
                  <span>Online por Vídeo (Google Meet)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingModality("in_person_agency")}
                  className={`h-11 min-h-11 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    meetingModality === "in_person_agency"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-foreground"
                  }`}
                >
                  <MapPin className="size-4" />
                  <span>Presencial na Agência (Com Café)</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground break-words">
                {meetingModality === "online_video"
                  ? `Link da Sala: ${meetingLinkOrAddress || "A definir com o consultor"}`
                  : `Endereço: ${meetingLinkOrAddress || agencyAddress || `${resolvedAgencyName} — Atendimento Presencial.`}`}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
              <span className="text-xs font-bold text-primary block">
                2. Confirme um dos Horários Propostos pelo seu Consultor
              </span>
              {proposedSlots.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {proposedSlots.map((slotIso) => {
                    const formattedLabel = new Date(slotIso).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    });
                    return (
                      <Button
                        key={slotIso}
                        type="button"
                        disabled={isConfirmingSlot}
                        variant={confirmedSlot === slotIso ? "default" : "outline"}
                        onClick={() => handleConfirmPassengerSlot(slotIso)}
                        className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="size-4" />
                        <span>
                          {isConfirmingSlot ? "Confirmando..." : `Aceitar ${formattedLabel}`}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nenhum horário foi proposto pela agência até o momento. Solicite ao consultor.
                </p>
              )}
              {confirmedSlot && (
                <p className="text-xs font-semibold text-success">
                  Confirmado! Agenda atualizada para {new Date(confirmedSlot).toLocaleString("pt-BR")}.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Modalidade Sugerida</Label>
              <select
                value={meetingModality}
                onChange={(e) => setMeetingModality(e.target.value as "online_video" | "in_person_agency")}
                className="w-full h-11 px-3 rounded-lg border border-input bg-background text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="online_video">Online por Vídeo (Google Meet / Zoom)</option>
                <option value="in_person_agency">Presencial na Agência (Entrega de Pasta)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">
                {meetingModality === "online_video" ? "Link da Videochamada" : "Endereço da Agência"}
              </Label>
              <Input
                type="text"
                value={meetingLinkOrAddress}
                onChange={(e) => setMeetingLinkOrAddress(e.target.value)}
                placeholder={
                  meetingModality === "online_video"
                    ? "https://meet.google.com/..."
                    : "Rua, número e complemento"
                }
                className="h-11 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Opção de Horário 1</Label>
              <Input
                type="datetime-local"
                value={slot1}
                onChange={(e) => setSlot1(e.target.value)}
                className="h-11 text-xs rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Opção de Horário 2</Label>
              <Input
                type="datetime-local"
                value={slot2}
                onChange={(e) => setSlot2(e.target.value)}
                className="h-11 text-xs rounded-lg"
              />
            </div>
            <Button
              type="button"
              disabled={isSchedulingMeeting}
              onClick={handleScheduleMeeting}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer"
            >
              <Send className="size-4" />
              <span>
                {isSchedulingMeeting ? "Salvando convite..." : "Enviar Convite ao Passageiro"}
              </span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
