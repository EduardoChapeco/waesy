import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Plane,
  Hotel,
  Users,
  MapPin,
  Plus,
  Minus,
  Trash2,
  FileText,
  CreditCard,
  ArrowRight,
  AlertTriangle,
  Settings,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";
import { createTravelProposal } from "@/services/travel-proposal.functions";
import { createAgencyTravelQuote } from "@/services/tourism.functions";
import {
  resolveDestinationGatewayEngine,
  calculateMultiRoomQuoteBreakdown,
  type QuoteRoomConfigInput,
  type OperatorPaymentCampaignRule,
} from "@/services/travel-ecosystem-engines.functions";
import {
  getInfotravelIntegrationStatusFn,
  infotravelSearchPackages,
  type InfoTravelOperatorSlug,
} from "@/services/infotravel";

export interface UniversalQuoteProposalStudioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "standalone_proposal" | "kanban_lead_quote";
  initialLeadId?: string | null;
  initialClientName?: string;
  initialClientPhone?: string;
  initialClientEmail?: string;
  initialDestination?: string;
  sourcePackageTitle?: string;
  onCreated?: (result: { proposalId?: string; quoteId?: string }) => void;
}

const OPERATOR_CAMPAIGNS: OperatorPaymentCampaignRule[] = [
  {
    operatorSlug: "orinter",
    operatorDisplayName: "Orinter Tour & Travel (InfoTravel v1)",
    maxBoletoInstallments: 12,
    boletoMinDownpaymentPct: 20,
    maxCardInstallments: 10,
    pixCashDiscountPct: 5,
  },
  {
    operatorSlug: "incomum",
    operatorDisplayName: "Incomum Operadora (InfoTravel v1)",
    maxBoletoInstallments: 15,
    boletoMinDownpaymentPct: 20,
    maxCardInstallments: 10,
    pixCashDiscountPct: 5,
  },
  {
    operatorSlug: "frt",
    operatorDisplayName: "FRT Operadora · Funpay (InfoTravel v1)",
    maxBoletoInstallments: 12,
    boletoMinDownpaymentPct: 25,
    maxCardInstallments: 10,
    pixCashDiscountPct: 4,
  },
  {
    operatorSlug: "santander",
    operatorDisplayName: "Financiamento Santander + Pix Agência",
    maxBoletoInstallments: 18,
    boletoMinDownpaymentPct: 25,
    maxCardInstallments: 12,
    pixCashDiscountPct: 6,
  },
];

const AVAILABLE_ROOM_ADDONS = [
  { code: "child_seat", label: "Bebê Conforto / Cadeirinha no Transfer", priceCents: 18000 },
  { code: "checked_bag_23", label: "Bagagem Despachada 23kg (Ida e Volta)", priceCents: 29000 },
  { code: "travel_insurance", label: "Seguro Viagem Cobertura Integral", priceCents: 24000 },
  { code: "vip_transfer", label: "Upgrade para Transfer Privativo", priceCents: 35000 },
];

export function UniversalQuoteProposalStudio({
  open,
  onOpenChange,
  mode = "standalone_proposal",
  initialLeadId,
  initialClientName = "",
  initialClientPhone = "",
  initialClientEmail = "",
  initialDestination = "",
  sourcePackageTitle = "",
  onCreated,
}: UniversalQuoteProposalStudioProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [stepTab, setStepTab] = useState<"destino" | "quartos" | "opcoes" | "pagamento">("destino");
  const [quoteSourceMode, setQuoteSourceMode] = useState<"manual_ocr" | "infotravel_api">("manual_ocr");

  // 1. Cliente & Destino
  const [clientName, setClientName] = useState(initialClientName);
  const [clientPhone, setClientPhone] = useState(initialClientPhone);
  const [clientEmail, setClientEmail] = useState(initialClientEmail);
  const [originCity, setOriginCity] = useState("Chapecó (XAP)");
  const [destinationQuery, setDestinationQuery] = useState(initialDestination || "Buenos Aires");
  const [departureDate, setDepartureDate] = useState("2027-01-09");
  const [returnDate, setReturnDate] = useState("2027-01-14");

  useEffect(() => {
    if (open) {
      if (initialClientName) setClientName(initialClientName);
      if (initialClientPhone) setClientPhone(initialClientPhone);
      if (initialClientEmail) setClientEmail(initialClientEmail);
      if (initialDestination) setDestinationQuery(initialDestination);
    }
  }, [open, initialClientName, initialClientPhone, initialClientEmail, initialDestination]);

  // Gateway Regional Automático
  const gatewayResolution = useMemo(
    () => resolveDestinationGatewayEngine(destinationQuery),
    [destinationQuery]
  );

  // 2. Divisão Real por Quartos (Rooming) + Adicionais por Quarto
  const [rooms, setRooms] = useState<QuoteRoomConfigInput[]>([
    {
      roomNumber: 1,
      roomLabel: "Quarto 1 — Casal",
      roomCategory: "Standard Double",
      mealPlan: "Café da Manhã",
      adultsCount: 2,
      childrenCount: 0,
      childrenAges: [],
      baseAdultPriceCents: 391819, // Ex. real Orinter R$ 7.836,38 p/ 2 adultos
      baseChildPriceCents: 185000,
      addons: [],
      payerName: initialClientName || "",
    },
  ]);

  // 3. Opções Comparativas do Bundle (1 a 4 Opções no Mesmo Orçamento)
  const [bundleOptions, setBundleOptions] = useState<
    Array<{
      optionLabel: string;
      hotelName: string;
      airlineDesc: string;
      operatorSlug: string;
      adultPriceCents: number;
      isRecommended: boolean;
    }>
  >([
    {
      optionLabel: "Opção 1 — Seleção Principal",
      hotelName: "560 Hotel Viamonte Buenos Aires",
      airlineDesc: "Voo + Bagagem 23kg + Transfer Regular",
      operatorSlug: "orinter",
      adultPriceCents: 391819,
      isRecommended: true,
    },
  ]);

  // 4. Operadora & Regra de Parcelamento
  const [selectedOperatorSlug, setSelectedOperatorSlug] = useState<string>("orinter");
  const [supplierNetCostPct, setSupplierNetCostPct] = useState<number>(88); // 12% comissão agência
  const [notes, setNotes] = useState("");
  const [infotravelOperatorFilter, setInfotravelOperatorFilter] =
    useState<InfoTravelOperatorSlug>("orinter");
  const [isSearchingInfotravel, setIsSearchingInfotravel] = useState(false);

  const {
    data: infotravelStatus,
    isLoading: isLoadingInfotravelStatus,
    refetch: refetchInfotravelStatus,
  } = useQuery({
    queryKey: ["infotravel-integration-status"],
    queryFn: () => getInfotravelIntegrationStatusFn(),
    enabled: open,
  });

  const isInfotravelConfigured = !isLoadingInfotravelStatus && Boolean(infotravelStatus?.isConfigured);

  const handleSearchInfotravelLive = async () => {
    if (!isInfotravelConfigured) {
      toast.error(
        "Chave da API InfoTravel não configurada. Acesse o Hub de Integrações para ativar.",
      );
      return;
    }
    setIsSearchingInfotravel(true);
    try {
      const packages = await infotravelSearchPackages({
        data: {
          destination: destinationQuery,
          departureDate,
          returnDate,
          adults: rooms.reduce((acc, r) => acc + r.adultsCount, 0),
          childrenAges: rooms.flatMap((r) => r.childrenAges),
          operatorSlug: infotravelOperatorFilter,
        },
      });
      if (!packages || packages.length === 0) {
        toast.info(
          "Nenhuma tarifa ativa retornada pela API InfoTravel para os parâmetros informados.",
        );
        await refetchInfotravelStatus();
        return;
      }
      setBundleOptions(
        packages.slice(0, 4).map((pkg, idx) => ({
          optionLabel: `Opção ${idx + 1} — ${pkg.operatorSlug.toUpperCase()}`,
          hotelName: pkg.hotelName || pkg.packageName,
          airlineDesc: `${pkg.includesFlight ? "Aéreo Incluso" : "Terrestre"} · ${pkg.boardType || "Café da Manhã"}`,
          operatorSlug: pkg.operatorSlug,
          adultPriceCents: Math.round((pkg.priceTotalBrl / 2) * 100),
          isRecommended: idx === 0,
        })),
      );
      toast.success(
        `${packages.length} pacotes reais carregados diretamente da API InfoTravel!`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Erro na comunicação com a API InfoTravel.");
      await refetchInfotravelStatus();
    } finally {
      setIsSearchingInfotravel(false);
    }
  };

  const activeCampaign = useMemo(
    () =>
      OPERATOR_CAMPAIGNS.find((c) => c.operatorSlug === selectedOperatorSlug) ||
      OPERATOR_CAMPAIGNS[0],
    [selectedOperatorSlug]
  );

  const calculation = useMemo(
    () => calculateMultiRoomQuoteBreakdown(rooms, activeCampaign),
    [rooms, activeCampaign]
  );

  const handleAddRoom = () => {
    const nextNum = rooms.length + 1;
    setRooms((prev) => [
      ...prev,
      {
        roomNumber: nextNum,
        roomLabel: `Quarto ${nextNum} — Duplo`,
        roomCategory: "Standard",
        mealPlan: "Café da Manhã",
        adultsCount: 2,
        childrenCount: 0,
        childrenAges: [],
        baseAdultPriceCents: prev[0]?.baseAdultPriceCents || 350000,
        baseChildPriceCents: 180000,
        addons: [],
      },
    ]);
  };

  const handleRemoveRoom = (idx: number) => {
    if (rooms.length <= 1) return;
    setRooms((prev) =>
      prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, roomNumber: i + 1 }))
    );
  };

  const handleToggleAddon = (roomIdx: number, addon: { code: string; label: string; priceCents: number }) => {
    setRooms((prev) =>
      prev.map((r, idx) => {
        if (idx !== roomIdx) return r;
        const exists = r.addons.some((a) => a.code === addon.code);
        return {
          ...r,
          addons: exists ? r.addons.filter((a) => a.code !== addon.code) : [...r.addons, addon],
        };
      })
    );
  };

  const handleAddBundleOption = () => {
    if (bundleOptions.length >= 4) {
      toast.info("O comparativo comporta até 4 opções lado a lado na mesma lâmina.");
      return;
    }
    const nextIdx = bundleOptions.length + 1;
    setBundleOptions((prev) => [
      ...prev,
      {
        optionLabel: `Opção ${nextIdx} — Alternativa Superior`,
        hotelName: `Hotel Categoria Superior (${destinationQuery})`,
        airlineDesc: "Voo + Bagagem + Transfer Privativo",
        operatorSlug: selectedOperatorSlug,
        adultPriceCents: Math.round((rooms[0]?.baseAdultPriceCents || 350000) * 1.15),
        isRecommended: false,
      },
    ]);
  };

  const saveUniversalQuoteMutation = useMutation({
    mutationFn: async (openStudioAfterSave: boolean) => {
      const mainHotel = bundleOptions[0]?.hotelName || `Hospedagem em ${destinationQuery}`;
      const roomSummaryLines = calculation.rooms.map(
        (r) =>
          `• ${r.roomLabel} (${r.adultsCount} ADT${r.childrenCount > 0 ? ` + ${r.childrenCount} CHD` : ""}): ${formatMoney(r.roomTotalCents)}${
            r.addons.length > 0 ? ` [Inclui: ${r.addons.map((a) => a.label).join(", ")}]` : ""
          }`
      );

      const gatewayText = gatewayResolution
        ? `\nLogística de Aeroporto Gateway: Desembarque em ${gatewayResolution.primaryAirportIata} (${gatewayResolution.primaryAirportName}) + ${gatewayResolution.recommendedTransferType.replace("_", " ")} (${gatewayResolution.primaryDistanceKm} km / ${gatewayResolution.primaryTransferDurationMins} min).`
        : "";

      const optionsComparisonText =
        bundleOptions.length > 1
          ? `\nOpções Comparativas no Pacote:\n` +
            bundleOptions
              .map(
                (opt) =>
                  `- ${opt.optionLabel}: ${opt.hotelName} (${opt.airlineDesc}) — ${formatMoney(opt.adultPriceCents)}/adulto`
              )
              .join("\n")
          : "";

      const fullSummary =
        `Cotação Personalizada (${activeCampaign.operatorDisplayName}).\n` +
        `Divisão por Quartos:\n${roomSummaryLines.join("\n")}` +
        gatewayText +
        optionsComparisonText +
        (notes ? `\nObservações: ${notes}` : "");

      // 1. Cria também registro no Kanban de Cotações quando aplicável
      let createdQuoteId: string | undefined;
      if (mode === "kanban_lead_quote" || clientPhone) {
        try {
          const qRes = await createAgencyTravelQuote({
            data: {
              CustomerName: clientName || "Cliente em Atendimento",
              CustomerWhatsapp: clientPhone || "49999999999",
              CustomerEmail: clientEmail || undefined,
              DestinationRaw: destinationQuery,
              OriginCity: originCity,
              DepartureDate: departureDate,
              ReturnDate: returnDate,
              Adults: calculation.totalAdults,
              Children: calculation.totalChildren,
              ChildrenAges: calculation.rooms.flatMap((r) => r.childrenAges),
              TripType: "air_package",
              HotelName: mainHotel,
              QuoteAmountCents: calculation.grandTotalCents,
              AgencyNotes: fullSummary,
            } as any,
          });
          createdQuoteId = (qRes as any)?.id;
        } catch {
          // Segue para criar a Proposta Canônica
        }
      }

      // 2. Cria a Proposta Canônica Unificada (HTML2PDF + Link Web Interativo)
      const propRes = await createTravelProposal({
        data: {
          title: sourcePackageTitle
            ? `${sourcePackageTitle} — ${destinationQuery}`
            : `Proposta ${destinationQuery} (${calculation.rooms.length} Quarto${calculation.rooms.length > 1 ? "s" : ""})`,
          destination_city: destinationQuery,
          destination_country: gatewayResolution?.destinationSlug === "buenos-aires" ? "Argentina" : "Brasil",
          travel_start_date: departureDate || undefined,
          travel_end_date: returnDate || undefined,
          passengers_adults: calculation.totalAdults,
          passengers_children: calculation.totalChildren,
          customer_name: clientName || "Cliente Convidado",
          customer_whatsapp: clientPhone || undefined,
          customer_email: clientEmail || undefined,
          lead_id: initialLeadId || createdQuoteId || undefined,
          canvas_format: "a4-portrait",
          template_theme: "editorial-flat",
          summary: fullSummary,
          flights: [
            {
              id: "fl-ida",
              type: "outbound",
              airline: "Voo Regular",
              flight_number: "CONFIRMADO",
              origin_code: originCity.match(/\(([A-Z]{3})\)/)?.[1] || "XAP",
              origin_city: originCity,
              destination_code: gatewayResolution?.primaryAirportIata || "DEST",
              destination_city: destinationQuery,
              departure_date: departureDate,
              departure_time: "09:10",
              arrival_date: departureDate,
              arrival_time: "14:20",
              baggage: "1 item pessoal + 1 mala de mão 10kg + 1 despachada 23kg",
              stops: 1,
            },
          ],
          hotels: bundleOptions.map((opt, idx) => ({
            id: `ht-${idx + 1}`,
            name: opt.hotelName,
            stars: 4,
            location: destinationQuery,
            check_in: departureDate,
            check_out: returnDate,
            nights: 5,
            room_type: calculation.rooms.map((r) => r.roomLabel).join(" | "),
            board_basis: calculation.rooms[0]?.mealPlan || "Café da Manhã",
            description: `${opt.optionLabel} · ${opt.airlineDesc}`,
            photos: [],
          })),
          pricing: {
            currency: "BRL",
            base_price_cents: calculation.grandBaseCents,
            taxes_cents: calculation.grandAddonsCents,
            discount_cents: 0,
            total_price_cents: calculation.grandTotalCents,
            price_per_person_cents: Math.round(
              calculation.grandTotalCents / Math.max(1, calculation.totalPassengers)
            ),
            installments_max: activeCampaign.maxBoletoInstallments,
            installment_value_cents: calculation.campaignSummary.boletoMonthlyInstallmentCents,
            pix_discount_percent: activeCampaign.pixCashDiscountPct,
            payment_notes:
              `Campanha ${activeCampaign.operatorDisplayName}: ` +
              `Entrada de ${formatMoney(calculation.campaignSummary.boletoDownpaymentCents)} + ` +
              `${activeCampaign.maxBoletoInstallments - 1}x de ${formatMoney(calculation.campaignSummary.boletoMonthlyInstallmentCents)} no Boleto, ` +
              `ou até ${activeCampaign.maxCardInstallments}x de ${formatMoney(calculation.campaignSummary.cardMonthlyInstallmentCents)} no Cartão.`,
            supplier_net_cost_cents: Math.round(
              (calculation.grandTotalCents * supplierNetCostPct) / 100
            ),
          } as any,
          inclusions: [
            "Passagem aérea ida e volta",
            `Hospedagem (${calculation.rooms.length} quarto${calculation.rooms.length > 1 ? "s" : ""}) com ${calculation.rooms[0]?.mealPlan || "Café da Manhã"}`,
            gatewayResolution
              ? `Transfer Aeroporto ${gatewayResolution.primaryAirportIata} / Hotel / Aeroporto`
              : "Transfer Aeroporto / Hotel / Aeroporto",
            ...calculation.rooms.flatMap((r) => r.addons.map((a) => `${r.roomLabel}: ${a.label}`)),
          ],
        } as any,
      });

      return {
        proposalId: propRes?.id,
        quoteId: createdQuoteId,
        openStudioAfterSave,
      };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["agency-travel-quotes"] });
      toast.success("Orçamento e Lâmina HTML2PDF gerados no motor unificado!");
      onOpenChange(false);
      onCreated?.({ proposalId: res.proposalId, quoteId: res.quoteId });
      if (res.openStudioAfterSave && res.proposalId) {
        navigate({ to: "/workspace/turismo/propostas/$id", params: { id: res.proposalId } });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Não foi possível salvar o orçamento unificado.");
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-3xl p-0 flex flex-col bg-background border-l border-border overflow-hidden"
      >
        <SheetHeader className="px-6 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs font-semibold">
                  Motor Unificado · Web + HTML2PDF
                </Badge>
                {sourcePackageTitle && (
                  <Badge variant="outline" className="text-xs">
                    Baseado no Roteiro: {sourcePackageTitle}
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-lg font-bold text-foreground mt-1">
                Gerador Único de Cotação e Proposta Comercial
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Serve tanto ao Kanban de Leads quanto a Orçamentos Avulsos, com divisão por quartos, adicionais e Gateways InfoTravel v1.
              </SheetDescription>
            </div>
          </div>

          {/* Régua Horizontal de Etapas (Invariante B.39) */}
          <div className="tab-list flex flex-nowrap overflow-x-auto no-scrollbar gap-2 pt-3">
            {[
              { id: "destino", label: "1. Cliente & Gateway", icon: MapPin },
              { id: "quartos", label: `2. Quartos & Adicionais (${rooms.length})`, icon: Users },
              { id: "opcoes", label: `3. Opções & InfoTravel (${bundleOptions.length}/4)`, icon: Hotel },
              { id: "pagamento", label: "4. Parcelamento & HTML2PDF", icon: CreditCard },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = stepTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStepTab(tab.id as any)}
                  className={`h-11 min-h-11 px-4 rounded-lg text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </SheetHeader>

        {/* Corpo Rolável */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {stepTab === "destino" && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg border border-border bg-card space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">
                    Identificação do Cliente / Lead (Opcional para Orçamento Avulso)
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {initialLeadId ? "Vinculado ao Kanban" : "Avulso ou Novo Lead"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Nome do Cliente / Pagante</Label>
                    <Input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: Valdecy Pedrozo da Cruz"
                      className="h-11 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">WhatsApp</Label>
                    <Input
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="(49) 99999-9999"
                      className="h-11 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">E-mail</Label>
                    <Input
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      className="h-11 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-card space-y-4">
                <h3 className="text-sm font-bold text-foreground">
                  Rota, Datas e Inteligência de Aeroporto Gateway
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Cidade / Aeroporto de Origem</Label>
                    <Input
                      value={originCity}
                      onChange={(e) => setOriginCity(e.target.value)}
                      placeholder="Ex: Chapecó (XAP)"
                      className="h-11 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">
                      Destino Desejado (Teste: Gramado, Maragogi, Jericoacoara, Buenos Aires)
                    </Label>
                    <Input
                      value={destinationQuery}
                      onChange={(e) => setDestinationQuery(e.target.value)}
                      placeholder="Ex: Gramado, Maragogi, Buenos Aires..."
                      className="h-11 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Data de Ida / Check-in</Label>
                    <Input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="h-11 rounded-lg text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Data de Volta / Check-out</Label>
                    <Input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="h-11 rounded-lg text-sm"
                    />
                  </div>
                </div>

                {/* Card de Inteligência de Aeroporto Gateway Regional */}
                {gatewayResolution && (
                  <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-primary font-bold text-xs">
                        <Plane className="size-4 shrink-0" />
                        <span>
                          {gatewayResolution.hasOwnCommercialAirport
                            ? `Múltiplos Aeroportos Identificados para ${gatewayResolution.destinationName}`
                            : `Rota Híbrida via Aeroporto Gateway Regional (${gatewayResolution.destinationName})`}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs font-mono">
                        Gateway Principal: {gatewayResolution.primaryAirportIata}
                      </Badge>
                    </div>

                    <p className="text-xs text-foreground/90 leading-relaxed break-words">
                      {gatewayResolution.gatewayLogisticsNotes}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-3 rounded-lg bg-background border border-border/60">
                        <span className="text-muted-foreground block">1ª Opção de Desembarque:</span>
                        <span className="font-bold text-foreground">
                          {gatewayResolution.primaryAirportIata} — {gatewayResolution.primaryAirportName}
                        </span>
                        <span className="text-muted-foreground block mt-1">
                          Distância terrestre: {gatewayResolution.primaryDistanceKm} km (~
                          {gatewayResolution.primaryTransferDurationMins} min)
                        </span>
                      </div>
                      {gatewayResolution.secondaryAirportIata && (
                        <div className="p-3 rounded-lg bg-background border border-border/60">
                          <span className="text-muted-foreground block">2ª Opção Regional:</span>
                          <span className="font-bold text-foreground">
                            {gatewayResolution.secondaryAirportIata} —{" "}
                            {gatewayResolution.secondaryAirportName}
                          </span>
                          <span className="text-muted-foreground block mt-1">
                            Distância terrestre: {gatewayResolution.secondaryDistanceKm} km (~
                            {gatewayResolution.secondaryTransferDurationMins} min)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {stepTab === "quartos" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Configuração por Quarto (Rooming) e Adicionais Específicos
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Configure Casal + Criança, Duplo ou Individual e adicione itens exclusivos por quarto (ex: Bebê Conforto).
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddRoom}
                  className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                >
                  <Plus className="size-4" />
                  Adicionar Quarto
                </Button>
              </div>

              {rooms.map((room, idx) => {
                const calcRoom = calculation.rooms[idx];
                return (
                  <div
                    key={room.roomNumber}
                    className="p-4 rounded-lg border border-border bg-card space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-bold">
                          Quarto {room.roomNumber}
                        </Badge>
                        <Input
                          value={room.roomLabel}
                          onChange={(e) =>
                            setRooms((prev) =>
                              prev.map((r, i) =>
                                i === idx ? { ...r, roomLabel: e.target.value } : r
                              )
                            )
                          }
                          className="h-11 w-56 rounded-lg text-xs font-semibold"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">
                            Subtotal do Quarto {room.roomNumber}
                          </span>
                          <span className="text-base font-black text-foreground tabular-nums">
                            {formatMoney(calcRoom?.roomTotalCents || 0)}
                          </span>
                        </div>
                        {rooms.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleRemoveRoom(idx)}
                            className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-destructive cursor-pointer"
                            aria-label={`Remover Quarto ${room.roomNumber}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Adultos no Quarto</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setRooms((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, adultsCount: Math.max(1, r.adultsCount - 1) } : r
                                )
                              )
                            }
                            className="size-11 min-h-11 min-w-11 p-0 rounded-lg cursor-pointer"
                          >
                            <Minus className="size-4" />
                          </Button>
                          <span className="text-sm font-bold w-8 text-center tabular-nums">
                            {room.adultsCount}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setRooms((prev) =>
                                prev.map((r, i) =>
                                  i === idx ? { ...r, adultsCount: Math.min(6, r.adultsCount + 1) } : r
                                )
                              )
                            }
                            className="size-11 min-h-11 min-w-11 p-0 rounded-lg cursor-pointer"
                          >
                            <Plus className="size-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Crianças (CHD)</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setRooms((prev) =>
                                prev.map((r, i) =>
                                  i === idx
                                    ? { ...r, childrenCount: Math.max(0, r.childrenCount - 1) }
                                    : r
                                )
                              )
                            }
                            className="size-11 min-h-11 min-w-11 p-0 rounded-lg cursor-pointer"
                          >
                            <Minus className="size-4" />
                          </Button>
                          <span className="text-sm font-bold w-8 text-center tabular-nums">
                            {room.childrenCount}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              setRooms((prev) =>
                                prev.map((r, i) =>
                                  i === idx
                                    ? {
                                        ...r,
                                        childrenCount: Math.min(4, r.childrenCount + 1),
                                        childrenAges: [...r.childrenAges, 5],
                                      }
                                    : r
                                )
                              )
                            }
                            className="size-11 min-h-11 min-w-11 p-0 rounded-lg cursor-pointer"
                          >
                            <Plus className="size-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Valor Base por Adulto (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={(room.baseAdultPriceCents / 100).toFixed(2)}
                          onChange={(e) => {
                            const val = Math.round((parseFloat(e.target.value) || 0) * 100);
                            setRooms((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, baseAdultPriceCents: val } : r))
                            );
                          }}
                          className="h-11 rounded-lg text-sm font-mono"
                        />
                      </div>
                    </div>

                    {/* Adicionais específicos deste quarto */}
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs font-semibold text-muted-foreground">
                        Adicionais Exclusivos deste Quarto (ex: Bebê Conforto, Bagagem Extra):
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {AVAILABLE_ROOM_ADDONS.map((addon) => {
                          const selected = room.addons.some((a) => a.code === addon.code);
                          return (
                            <button
                              key={addon.code}
                              type="button"
                              onClick={() => handleToggleAddon(idx, addon)}
                              className={`h-11 min-h-11 px-3 rounded-lg border text-left text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                selected
                                  ? "border-primary bg-primary/10 text-foreground font-semibold"
                                  : "border-border bg-background text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span className="break-words leading-tight">{addon.label}</span>
                              <span className="font-mono shrink-0">+{formatMoney(addon.priceCents)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {stepTab === "opcoes" && (
            <div className="space-y-5">
              {/* Separação Estrita: API InfoTravel vs. Cotação Manual / OCR */}
              <div className="p-4 rounded-lg border border-border bg-card space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Fonte da Cotação (Isolamento Estrito API vs. Manual)
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Ofertas da API InfoTravel v1 (Orinter, FRT, Incomum) nunca se misturam com cotações manuais de operadoras sem API.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={quoteSourceMode === "manual_ocr" ? "secondary" : "outline"}
                      onClick={() => setQuoteSourceMode("manual_ocr")}
                      className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Manual / Importação PDF OCR
                    </Button>
                    <Button
                      type="button"
                      variant={quoteSourceMode === "infotravel_api" ? "secondary" : "outline"}
                      onClick={() => setQuoteSourceMode("infotravel_api")}
                      className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Busca Direta InfoTravel v1
                    </Button>
                  </div>
                </div>

                {quoteSourceMode === "infotravel_api" && (
                  <div className="space-y-3">
                    {!isInfotravelConfigured && (
                      <div className="p-4 rounded-lg border border-amber-500/40 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-1" />
                          <div className="space-y-1">
                            <span className="font-bold text-foreground block">
                              API InfoTravel Desconectada (Zero Dados Fakes)
                            </span>
                            <p className="text-muted-foreground leading-relaxed">
                              O cotador InfoTravel permanece bloqueado e sem dados sintéticos até que você cadastre a chave da operadora no Hub de Integrações.
                            </p>
                          </div>
                        </div>
                        <Link
                          to="/workspace/configuracoes/integracoes"
                          onClick={() => onOpenChange(false)}
                          className="h-11 min-h-11 px-4 rounded-lg border border-amber-500/50 bg-background hover:bg-muted text-foreground text-xs font-bold flex items-center gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Settings className="size-4 text-primary" />
                          <span>Configurar Chave no Hub de Integrações</span>
                        </Link>
                      </div>
                    )}

                    <div
                      className={`p-4 rounded-lg border border-border bg-muted/30 space-y-3 text-xs transition-opacity ${
                        !isInfotravelConfigured
                          ? "opacity-50 pointer-events-none select-none"
                          : ""
                      }`}
                      aria-disabled={!isInfotravelConfigured}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-foreground block">
                            Conector Multi-Operadora InfoTravel v1 (Orinter · FRT · Incomum)
                          </span>
                          <span className="text-muted-foreground">
                            Consulta em tempo real `/api/v1/avail/hotel` e `/api/v1/avail/flight` com a chave configurada no Hub.
                          </span>
                        </div>
                        <Badge variant="outline">
                          {isInfotravelConfigured
                            ? `Ativo (${infotravelStatus?.configuredOperators.join(", ")})`
                            : "Desconectado — Requer Chave no Hub"}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={infotravelOperatorFilter}
                          disabled={!isInfotravelConfigured}
                          onChange={(e) =>
                            setInfotravelOperatorFilter(e.target.value as InfoTravelOperatorSlug)
                          }
                          className="h-11 rounded-lg border border-input bg-background px-3 text-xs font-semibold"
                        >
                          <option value="orinter">Operadora: Orinter</option>
                          <option value="frt">Operadora: FRT</option>
                          <option value="incomum">Operadora: Incomum</option>
                          <option value="cativa">Operadora: Cativa</option>
                          <option value="befly">Operadora: BeFly</option>
                          <option value="confianca">Operadora: Confiança</option>
                        </select>

                        <Button
                          type="button"
                          variant="secondary"
                          disabled={!isInfotravelConfigured || isSearchingInfotravel}
                          onClick={handleSearchInfotravelLive}
                          className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer"
                        >
                          <RefreshCw className="size-4" />
                          <span>Consultar Tarifas Reais na Operadora</span>
                        </Button>
                      </div>
                    </div>

                    {infotravelStatus?.recentErrors && infotravelStatus.recentErrors.length > 0 && (
                      <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 space-y-1 text-xs">
                        <span className="font-bold text-destructive block">
                          Logs de Auditoria de Comunicação InfoTravel:
                        </span>
                        {infotravelStatus.recentErrors.slice(0, 3).map((err) => (
                          <div key={err.id} className="text-muted-foreground font-mono">
                            [{new Date(err.createdAt).toLocaleString("pt-BR")}] ({err.operatorSlug}){" "}
                            {err.endpoint}: {err.errorMessage}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bundle de 1 a 4 Opções Lado a Lado */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">
                    Opções do Orçamento Comparativo ({bundleOptions.length} de 4)
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddBundleOption}
                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
                  >
                    <Plus className="size-4" />
                    Adicionar Opção Comparativa
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {bundleOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border border-border bg-card space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={opt.isRecommended ? "secondary" : "outline"} className="text-xs">
                          {opt.optionLabel}
                        </Badge>
                        {bundleOptions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              setBundleOptions((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="size-11 min-h-11 min-w-11 p-0 text-destructive cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Hotel / Resort</Label>
                        <Input
                          value={opt.hotelName}
                          onChange={(e) =>
                            setBundleOptions((prev) =>
                              prev.map((o, i) =>
                                i === idx ? { ...o, hotelName: e.target.value } : o
                              )
                            )
                          }
                          className="h-11 rounded-lg text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Composição Aérea e Serviços</Label>
                        <Input
                          value={opt.airlineDesc}
                          onChange={(e) =>
                            setBundleOptions((prev) =>
                              prev.map((o, i) =>
                                i === idx ? { ...o, airlineDesc: e.target.value } : o
                              )
                            )
                          }
                          className="h-11 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {stepTab === "pagamento" && (
            <div className="space-y-5">
              <div className="p-4 rounded-lg border border-border bg-card space-y-4">
                <h3 className="text-sm font-bold text-foreground">
                  Campanha de Pagamento por Operadora (Boleto até 15x / Cartão até 10x / Pix)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {OPERATOR_CAMPAIGNS.map((camp) => {
                    const active = selectedOperatorSlug === camp.operatorSlug;
                    return (
                      <button
                        key={camp.operatorSlug}
                        type="button"
                        onClick={() => setSelectedOperatorSlug(camp.operatorSlug)}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          active
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background hover:bg-muted/40"
                        }`}
                      >
                        <div className="text-xs font-bold text-foreground">
                          {camp.operatorDisplayName}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Até {camp.maxBoletoInstallments}x no Boleto (Entrada {camp.boletoMinDownpaymentPct}%) ·{" "}
                          {camp.maxCardInstallments}x no Cartão
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Quadro Resumo Consolidado por Quarto + Geral */}
                <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                    <div>
                      <span className="text-xs text-muted-foreground block">
                        Valor Total Consolidado ({calculation.rooms.length} Quarto
                        {calculation.rooms.length > 1 ? "s" : ""} · {calculation.totalPassengers} Passageiros)
                      </span>
                      <span className="text-2xl font-black text-foreground tabular-nums">
                        {formatMoney(calculation.grandTotalCents)}
                      </span>
                    </div>
                    <div className="text-right text-xs space-y-1">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        À vista no Pix ({activeCampaign.pixCashDiscountPct}% desc.):{" "}
                        {formatMoney(calculation.campaignSummary.pixCashTotalCents)}
                      </div>
                      <div className="text-foreground font-semibold">
                        Cartão: {activeCampaign.maxCardInstallments}x de{" "}
                        {formatMoney(calculation.campaignSummary.cardMonthlyInstallmentCents)} sem juros
                      </div>
                      <div className="text-muted-foreground">
                        Boleto ({activeCampaign.maxBoletoInstallments}x): Entrada{" "}
                        {formatMoney(calculation.campaignSummary.boletoDownpaymentCents)} +{" "}
                        {activeCampaign.maxBoletoInstallments - 1}x de{" "}
                        {formatMoney(calculation.campaignSummary.boletoMonthlyInstallmentCents)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-bold text-foreground block">
                      Detalhamento Individual por Quarto:
                    </span>
                    {calculation.rooms.map((r) => (
                      <div
                        key={r.roomNumber}
                        className="flex flex-wrap items-center justify-between gap-2 text-xs p-2 rounded-lg bg-background border border-border/60"
                      >
                        <div>
                          <span className="font-bold text-foreground">{r.roomLabel}</span>
                          <span className="text-muted-foreground ml-2">
                            ({r.adultsCount} ADT{r.childrenCount > 0 ? ` + ${r.childrenCount} CHD` : ""})
                          </span>
                          {r.addons.length > 0 && (
                            <span className="block text-primary mt-1">
                              + {r.addons.map((a) => a.label).join(", ")}
                            </span>
                          )}
                        </div>
                        <div className="text-right font-mono font-bold text-foreground">
                          {formatMoney(r.roomTotalCents)}{" "}
                          <span className="text-muted-foreground font-normal">
                            ({activeCampaign.maxCardInstallments}x de {formatMoney(r.cardInstallmentCents)})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Observações Comerciais e Condições</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Condições de bagagem, regras tarifárias ou observações personalizadas para o cliente..."
                    rows={3}
                    className="rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé Canônico com Ação Primária Única */}
        <div className="px-6 py-4 border-t border-border bg-card flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs">
            <span className="text-muted-foreground block">Total do Orçamento</span>
            <span className="text-base font-black text-foreground tabular-nums">
              {formatMoney(calculation.grandTotalCents)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saveUniversalQuoteMutation.isPending}
              onClick={() => saveUniversalQuoteMutation.mutate(false)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Salvar na Fila
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={saveUniversalQuoteMutation.isPending}
              onClick={() => saveUniversalQuoteMutation.mutate(true)}
              className="h-11 min-h-11 px-5 rounded-lg text-xs font-semibold gap-2 cursor-pointer"
            >
              <FileText className="size-4" />
              <span>Gerar Lâmina Web & HTML2PDF</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
