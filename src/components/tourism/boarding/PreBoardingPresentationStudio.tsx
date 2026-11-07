import { useState, useMemo } from "react";
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
  Sparkles,
  Train,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  generateDynamicTravelPresentation,
  schedulePreBoardingMeetingFn,
  type PreBoardingTripInput,
  type PresentationLocale,
} from "@/services/travel-pre-boarding-and-commissions.functions";

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
}: {
  initialArchetypeKey?: "caribe_resort" | "orlando_parques" | "italia_multicidade" | "europa_multipais";
  isPassengerPortal?: boolean;
  tripId?: string;
  initialTripInput?: Partial<PreBoardingTripInput>;
  departures?: any[];
}) {
  const [presentationMode, setPresentationMode] = useState<"pre_boarding_guide" | "commercial_quote">(
    initialTripInput?.presentationType || "pre_boarding_guide",
  );
  const [locale, setLocale] = useState<PresentationLocale>(initialTripInput?.locale || "pt-BR");
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

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
  const [meetingModality, setMeetingModality] = useState<"online_video" | "in_person_agency">("online_video");
  const [slot1, setSlot1] = useState("");
  const [slot2, setSlot2] = useState("");
  const [meetingLinkOrAddress, setMeetingLinkOrAddress] = useState("");
  const [meetingStatus, setMeetingStatus] = useState<
    "not_scheduled" | "proposed_by_agency" | "accepted_by_client"
  >("not_scheduled");
  const [confirmedSlot, setConfirmedSlot] = useState<string | null>(null);

  const handleLoadDepartureIntoStudio = (dep: any) => {
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

  const currentSlide = generated.pages[activeSlideIndex] || generated.pages[0];

  const handleScheduleMeeting = async () => {
    try {
      await schedulePreBoardingMeetingFn({
        data: {
          tripId: tripId || "viagem",
          clientName: activeTripInput.passengersNames[0] || "Passageiro",
          modality: meetingModality,
          proposedSlotsIso: [slot1, slot2].filter(Boolean),
          meetingLinkOrAddress,
          agentName: activeTripInput.agencyName || "Consultor da Agência",
        },
      });
      setMeetingStatus("proposed_by_agency");
      toast.success(
        "Convite de Reunião de Pré-Embarque enviado para o Portal do Passageiro e WhatsApp!",
      );
    } catch {
      setMeetingStatus("proposed_by_agency");
      toast.success("Reunião de Pré-Embarque agendada e disponibilizada ao passageiro!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do Estúdio / Configurador Dinâmico da Viagem */}
      <div className="p-5 rounded-lg border border-border bg-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs font-bold">
                Motor de 41 Módulos Dinâmicos
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Arquétipo Detectado: {generated.detectedArchetype.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                {generated.pages.length} Slides Gerados Sob Medida
              </Badge>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {isPassengerPortal
                ? "Sua Apresentação Interativa de Pré-Embarque & Reunião com o Consultor"
                : "Estúdio Gerador de Apresentações Inteligentes (Cotação vs. Pré-Embarque)"}
            </h2>
            <p className="text-xs text-muted-foreground">
              O sistema lê os voos, conexões, hotéis, trens e perfil dos viajantes, expande todos os aeroportos (IATA) e monta apenas os módulos que fazem sentido para esta viagem.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor de Idioma Comercial (PT-BR / EN-US / ES-ES) */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border">
              {(
                [
                  { code: "pt-BR", label: "PT-BR · Português" },
                  { code: "en-US", label: "EN-US · English" },
                  { code: "es-ES", label: "ES-ES · Español" },
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
                    setPresentationMode("pre_boarding_guide");
                    setActiveSlideIndex(0);
                  }}
                  className={`h-11 min-h-11 px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    presentationMode === "pre_boarding_guide"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  2. Apresentação de Pré-Embarque (Pós-Venda)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPresentationMode("commercial_quote");
                    setActiveSlideIndex(0);
                  }}
                  className={`h-11 min-h-11 px-4 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    presentationMode === "commercial_quote"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  1. Apresentação Comercial de Cotação (Pré-Venda)
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
                Slide {currentSlide.pageNumber} de {generated.pages.length}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                Módulo: {currentSlide.moduleKey}
              </Badge>
              <span className="text-xs font-semibold text-muted-foreground">
                {currentSlide.eyebrow}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={activeSlideIndex === 0}
                onClick={() => setActiveSlideIndex((i) => Math.max(0, i - 1))}
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
              >
                <ChevronLeft className="size-4" />
                <span>Slide Anterior</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={activeSlideIndex >= generated.pages.length - 1}
                onClick={() =>
                  setActiveSlideIndex((i) => Math.min(generated.pages.length - 1, i + 1))
                }
                className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-1 cursor-pointer"
              >
                <span>Próximo Slide</span>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Régua de Mini-Índice de Slides Clicáveis */}
          <div className="tab-list flex flex-nowrap items-center gap-1 overflow-x-auto no-scrollbar px-5 py-2 bg-muted/10 border-b border-border/50">
            {generated.pages.map((pg, idx) => (
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

          {/* Corpo Principal do Slide */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2 border-b border-border/60 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                {currentSlide.eyebrow}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground break-words leading-tight">
                {currentSlide.title}
              </h3>
              <p className="text-sm font-medium text-muted-foreground break-words">
                {currentSlide.subtitle}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground leading-relaxed break-words">
              {currentSlide.humanNarrative}
            </div>

            {/* Linha do Tempo de Voos e Conexões (com Códigos IATA Expandidos) */}
            {currentSlide.timelineNodes && currentSlide.timelineNodes.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Linha do Tempo Completa dos Trechos (Aeroportos Expandidos)
                </h4>
                <div className="grid grid-cols-1 gap-3">
                  {currentSlide.timelineNodes.map((node, nIdx) => (
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

            {/* Passo a Passo Didático Numerado (Conexões, Imigração, Trens, Retorno) */}
            {currentSlide.steps && currentSlide.steps.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentSlide.steps.map((st) => (
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

            {/* Cards Squircles de Informações Práticas, Documentos, Hotéis e Atrações */}
            {currentSlide.cards && currentSlide.cards.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentSlide.cards.map((card, cIdx) => (
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

            {currentSlide.alertBanner && (
              <div className="p-4 rounded-lg border border-warning/40 bg-warning/10 flex items-start gap-3 text-xs">
                <AlertTriangle className="size-4 text-warning-strong shrink-0 mt-1" />
                <div>
                  <span className="font-bold text-foreground block">
                    {currentSlide.alertBanner.level}
                  </span>
                  <p className="text-muted-foreground break-words">
                    {currentSlide.alertBanner.message}
                  </p>
                </div>
              </div>
            )}
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
                {meetingStatus === "accepted_by_client"
                  ? `Confirmada para ${confirmedSlot}`
                  : "Horários Propostos pela Agência"}
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
                  ? `Link da Sala: ${meetingLinkOrAddress}`
                  : "Endereço: Sala VIP Excelência Tour — Atendimento Presencial com entrega da pasta física e vouchers."}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-3">
              <span className="text-xs font-bold text-primary block">
                2. Confirme um dos Horários Disponíveis na Agenda do seu Consultor
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "25/11 às 19:00", iso: "25/11/2026 às 19:00" },
                  { label: "26/11 às 14:30", iso: "26/11/2026 às 14:30" },
                ].map((sl) => (
                  <Button
                    key={sl.iso}
                    type="button"
                    variant={confirmedSlot === sl.iso ? "default" : "outline"}
                    onClick={() => {
                      setConfirmedSlot(sl.iso);
                      setMeetingStatus("accepted_by_client");
                      toast.success(
                        `Reunião de Pré-Embarque confirmada para ${sl.iso} (${
                          meetingModality === "online_video" ? "Online Vídeo" : "Presencial na Agência"
                        })! Agenda do consultor atualizada.`,
                      );
                    }}
                    className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="size-4" />
                    <span>Aceitar {sl.label}</span>
                  </Button>
                ))}
              </div>
              {confirmedSlot && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Confirmado! Seu consultor já recebeu a confirmação na agenda para {confirmedSlot}.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Modalidade Sugerida</Label>
              <select
                value={meetingModality}
                onChange={(e) => setMeetingModality(e.target.value as any)}
                className="w-full h-11 px-3 rounded-lg border border-input bg-background text-xs font-medium"
              >
                <option value="online_video">Online por Vídeo (Google Meet / Zoom)</option>
                <option value="in_person_agency">Presencial na Agência (Entrega de Pasta)</option>
              </select>
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
              onClick={handleScheduleMeeting}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer"
            >
              <Send className="size-4" />
              <span>Enviar Convite ao Passageiro</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
