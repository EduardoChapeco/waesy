import { useState, useMemo, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Plane,
  Building2,
  Users,
  MapPin,
  Plus,
  Minus,
  Trash2,
  FileText,
  CreditCard,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Send,
  Upload,
  CheckCircle2,
  Calendar,
  Sparkles,
  ExternalLink,
  Tag,
  Check,
  Eye,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";
import { createTravelProposal, type TravelProposalDTO } from "@/services/travel-proposal.functions";
import { createAgencyTravelQuote } from "@/services/tourism.functions";
import { listHotelsBank } from "@/services/travel-catalog.functions";
import { parseUniversalDocumentOCR } from "@/services/multimodal-ocr.functions";
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
import { ProposalShareWhatsappModal } from "@/components/tourism/studio/proposal-share-whatsapp-modal";

export interface UnifiedProposalWorkspaceLead {
  id: string;
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  destination?: string | null;
  estimated_value_cents?: number;
  passenger_count?: number;
  cover_image?: string | null;
  cover_image_url?: string | null;
}

export interface UnifiedProposalWorkspaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "standalone_proposal" | "kanban_lead_quote";
  lead?: UnifiedProposalWorkspaceLead | null;
  initialLeadId?: string | null;
  initialClientName?: string;
  initialClientPhone?: string;
  initialClientEmail?: string;
  initialDestination?: string;
  sourcePackageTitle?: string;
  onCreated?: (result: { proposalId?: string; quoteId?: string; proposal?: TravelProposalDTO }) => void;
}

export const CANONICAL_OPERATOR_CAMPAIGNS: OperatorPaymentCampaignRule[] = [
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
    operatorDisplayName: "FRT Operadora (InfoTravel v1)",
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

export const CANONICAL_ROOM_ADDONS = [
  { code: "child_seat", label: "Bebê Conforto / Cadeirinha no Transfer", priceCents: 18000 },
  { code: "checked_bag_23", label: "Bagagem Despachada 23kg (Ida e Volta)", priceCents: 29000 },
  { code: "travel_insurance", label: "Seguro Viagem Cobertura Integral", priceCents: 24000 },
  { code: "vip_transfer", label: "Upgrade para Transfer Privativo", priceCents: 35000 },
];

export const COMMON_INCLUSIONS_TAGS = [
  "Transfer In/Out Aeroporto ↔ Hotel",
  "Seguro Viagem Cobertura Completa",
  "City Tour Histórico no Destino",
  "Passeio Náutico / Escuna",
  "Ingressos para Parques Temáticos",
  "Bagagem Despachada 23kg",
];

export function UnifiedProposalWorkspace({
  open,
  onOpenChange,
  mode = "standalone_proposal",
  lead,
  initialLeadId,
  initialClientName = "",
  initialClientPhone = "",
  initialClientEmail = "",
  initialDestination = "",
  sourcePackageTitle = "",
  onCreated,
}: UnifiedProposalWorkspaceProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ocrFileInputRef = useRef<HTMLInputElement | null>(null);

  const [stepTab, setStepTab] = useState<"destino" | "quartos" | "opcoes" | "pagamento">("destino");
  const [quoteSourceMode, setQuoteSourceMode] = useState<"manual_ocr" | "infotravel_api">("manual_ocr");

  // Dados do Lead / Cliente
  const effectiveLeadId = lead?.id || initialLeadId || "";
  const [clientName, setClientName] = useState(lead?.fullName || initialClientName);
  const [clientPhone, setClientPhone] = useState(lead?.phone || initialClientPhone);
  const [clientEmail, setClientEmail] = useState(lead?.email || initialClientEmail);
  const [originCity, setOriginCity] = useState("Chapecó (XAP)");
  const [destinationQuery, setDestinationQuery] = useState(lead?.destination || initialDestination || "Buenos Aires");
  const [departureDate, setDepartureDate] = useState("2027-01-09");
  const [returnDate, setReturnDate] = useState("2027-01-14");

  // Autocomplete do Banco de Hotéis
  const [hotelQuery, setHotelQuery] = useState("");
  const [isHotelDropdownOpen, setIsHotelDropdownOpen] = useState(false);

  const { data: hotelSuggestions = [] } = useQuery({
    queryKey: ["hotels-bank-suggestions", hotelQuery],
    queryFn: () => listHotelsBank({ data: { search: hotelQuery.trim() } }),
    enabled: hotelQuery.trim().length >= 2,
    staleTime: 30_000,
  });

  // Tags Rápidas de Inclusões
  const [selectedInclusions, setSelectedInclusions] = useState<string[]>([
    "Transfer In/Out Aeroporto ↔ Hotel",
    "Seguro Viagem Cobertura Completa",
    "Bagagem Despachada 23kg",
  ]);

  const toggleInclusionTag = (tag: string) => {
    setSelectedInclusions((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // OCR Multimodal
  const [isScanningOcr, setIsScanningOcr] = useState(false);

  // Auto-binding quando o lead muda
  useEffect(() => {
    if (open) {
      if (lead) {
        if (lead.fullName) setClientName(lead.fullName);
        if (lead.phone) setClientPhone(lead.phone);
        if (lead.email) setClientEmail(lead.email);
        if (lead.destination) setDestinationQuery(lead.destination);
      } else {
        if (initialClientName) setClientName(initialClientName);
        if (initialClientPhone) setClientPhone(initialClientPhone);
        if (initialClientEmail) setClientEmail(initialClientEmail);
        if (initialDestination) setDestinationQuery(initialDestination);
      }
    }
  }, [open, lead, initialClientName, initialClientPhone, initialClientEmail, initialDestination]);

  // Gateway Regional
  const gatewayResolution = useMemo(
    () => resolveDestinationGatewayEngine(destinationQuery),
    [destinationQuery]
  );

  // Divisão Real por Quartos
  const [rooms, setRooms] = useState<QuoteRoomConfigInput[]>([
    {
      roomNumber: 1,
      roomLabel: "Quarto 1 — Casal",
      roomCategory: "Standard Double",
      mealPlan: "Café da Manhã",
      adultsCount: lead?.passenger_count ? Math.max(1, lead.passenger_count) : 2,
      childrenCount: 0,
      childrenAges: [],
      baseAdultPriceCents: lead?.estimated_value_cents ? Math.round(lead.estimated_value_cents / 2) : 391819,
      baseChildPriceCents: 185000,
      addons: [],
      payerName: lead?.fullName || initialClientName || "",
    },
  ]);

  // Opções Comparativas do Bundle
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
      hotelName: "Hotel Central Recomendado",
      airlineDesc: "Voo + Bagagem 23kg + Transfer Regular",
      operatorSlug: "orinter",
      adultPriceCents: lead?.estimated_value_cents ? Math.round(lead.estimated_value_cents / 2) : 391819,
      isRecommended: true,
    },
  ]);

  // Operadora & Regras
  const [selectedOperatorSlug, setSelectedOperatorSlug] = useState<string>("orinter");
  const [supplierNetCostPct, setSupplierNetCostPct] = useState<number>(88);
  const [notes, setNotes] = useState("");
  const [infotravelOperatorFilter, setInfotravelOperatorFilter] = useState<InfoTravelOperatorSlug>("orinter");
  const [isSearchingInfotravel, setIsSearchingInfotravel] = useState(false);

  // Pós-salvamento: Modal de WhatsApp
  const [createdProposalForWhatsapp, setCreatedProposalForWhatsapp] = useState<TravelProposalDTO | null>(null);

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

  const activeCampaign = useMemo(
    () =>
      CANONICAL_OPERATOR_CAMPAIGNS.find((c) => c.operatorSlug === selectedOperatorSlug) ||
      CANONICAL_OPERATOR_CAMPAIGNS[0],
    [selectedOperatorSlug]
  );

  const calculation = useMemo(
    () => calculateMultiRoomQuoteBreakdown(rooms, activeCampaign),
    [rooms, activeCampaign]
  );

  // Manipulação de Quartos
  const handleAddRoom = () => {
    const nextRoomNumber = rooms.length + 1;
    setRooms((prev) => [
      ...prev,
      {
        roomNumber: nextRoomNumber,
        roomLabel: `Quarto ${nextRoomNumber} — Duplo`,
        roomCategory: "Standard Double",
        mealPlan: "Café da Manhã",
        adultsCount: 2,
        childrenCount: 0,
        childrenAges: [],
        baseAdultPriceCents: rooms[0]?.baseAdultPriceCents || 391819,
        baseChildPriceCents: rooms[0]?.baseChildPriceCents || 185000,
        addons: [],
        payerName: "",
      },
    ]);
  };

  const handleRemoveRoom = (roomNumber: number) => {
    if (rooms.length <= 1) {
      toast.info("A proposta deve conter no mínimo 1 quarto.");
      return;
    }
    setRooms((prev) => prev.filter((r) => r.roomNumber !== roomNumber));
  };

  const handleUpdateRoom = (roomNumber: number, patch: Partial<QuoteRoomConfigInput>) => {
    setRooms((prev) =>
      prev.map((r) => (r.roomNumber === roomNumber ? { ...r, ...patch } : r))
    );
  };

  const handleToggleRoomAddon = (
    roomNumber: number,
    addon: { code: string; label: string; priceCents: number }
  ) => {
    setRooms((prev) =>
      prev.map((r) => {
        if (r.roomNumber !== roomNumber) return r;
        const exists = r.addons.some((a) => a.code === addon.code);
        const newAddons = exists
          ? r.addons.filter((a) => a.code !== addon.code)
          : [...r.addons, addon];
        return { ...r, addons: newAddons };
      })
    );
  };

  // OCR de Documentos / Orçamentos
  const handleOcrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningOcr(true);
    const toastId = toast.loading("Lendo documento da operadora via OCR...");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];
          const result = await parseUniversalDocumentOCR({
            data: {
              files: [
                {
                  base64: base64Data,
                  name: file.name,
                  mimeType: (file.type as any) || "application/pdf",
                },
              ],
              nicheHint: "tourism",
            },
          });

          if (result) {
            if (result.destinationCity) {
              setDestinationQuery(result.destinationCity);
            }
            if (result.clientName && !clientName) {
              setClientName(result.clientName);
            }
            if (result.clientPhone && !clientPhone) {
              setClientPhone(result.clientPhone);
            }
            if (result.dates?.departure) {
              setDepartureDate(result.dates.departure);
            }
            if (result.dates?.return) {
              setReturnDate(result.dates.return);
            }
            if (result.financials?.totalCents && result.financials.totalCents > 0) {
              const perAdultCents = Math.round(result.financials.totalCents / 2);
              setRooms((prev) =>
                prev.map((r, i) =>
                  i === 0 ? { ...r, baseAdultPriceCents: perAdultCents } : r
                )
              );
              setBundleOptions((prev) =>
                prev.map((opt, i) =>
                  i === 0
                    ? {
                        ...opt,
                        hotelName: result.companyName || opt.hotelName,
                        adultPriceCents: perAdultCents,
                      }
                    : opt
                )
              );
            }
            toast.success("Dados do documento extraídos com sucesso!", { id: toastId });
          } else {
            toast.info("Não foi possível identificar dados estruturados no arquivo.", { id: toastId });
          }
        } catch (innerErr: any) {
          toast.error(innerErr?.message || "Erro no processamento do OCR.", { id: toastId });
        } finally {
          setIsScanningOcr(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsScanningOcr(false);
      toast.error("Falha ao carregar arquivo para OCR.", { id: toastId });
    }
  };

  // Busca InfoTravel Ao Vivo
  const handleSearchInfotravelLive = async () => {
    if (!isInfotravelConfigured) {
      toast.error(
        "Chave da API InfoTravel não configurada. Acesse as Integrações para ativar."
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
        toast.info("Nenhuma tarifa ativa retornada pela API InfoTravel.");
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
        }))
      );
      toast.success(`${packages.length} pacotes carregados diretamente da API InfoTravel!`);
    } catch (err: any) {
      toast.error(err?.message || "Erro na comunicação com a API InfoTravel.");
      await refetchInfotravelStatus();
    } finally {
      setIsSearchingInfotravel(false);
    }
  };

  // Mutação para Salvar a Proposta Canônica
  const saveProposalMutation = useMutation({
    mutationFn: async ({ openStudioAfterSave }: { openStudioAfterSave: boolean }) => {
      const mainHotel = bundleOptions[0]?.hotelName || `Hospedagem em ${destinationQuery}`;
      const roomSummaryLines = calculation.rooms.map(
        (r) =>
          `• ${r.roomLabel} (${r.adultsCount} Adultos${r.childrenCount > 0 ? ` + ${r.childrenCount} Crianças` : ""}): ${formatMoney(r.roomTotalCents)}${
            r.addons.length > 0 ? ` [Inclui: ${r.addons.map((a) => a.label).join(", ")}]` : ""
          }`
      );

      const gatewayText = gatewayResolution
        ? `\nLogística Regional de Aeroporto Gateway: Desembarque em ${gatewayResolution.primaryAirportIata} (${gatewayResolution.primaryAirportName}) + ${gatewayResolution.recommendedTransferType.replace("_", " ")} (${gatewayResolution.primaryDistanceKm} km / ${gatewayResolution.primaryTransferDurationMins} min).`
        : "";

      const optionsComparisonText =
        bundleOptions.length > 1
          ? `\nOpções Comparativas:\n` +
            bundleOptions
              .map(
                (opt) =>
                  `- ${opt.optionLabel}: ${opt.hotelName} (${opt.airlineDesc}) — ${formatMoney(opt.adultPriceCents)}/adulto`
              )
              .join("\n")
          : "";

      const inclusionsText = `\nItens Inclusos:\n${selectedInclusions.map((inc) => `✓ ${inc}`).join("\n")}`;

      const fullSummary =
        `Proposta de Viagem (${activeCampaign.operatorDisplayName}).\n` +
        `Divisão por Quartos:\n${roomSummaryLines.join("\n")}` +
        inclusionsText +
        gatewayText +
        optionsComparisonText +
        (notes ? `\nObservações: ${notes}` : "");

      // Cria cotação no CRM se houver telefone
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
          // Continua para salvar a proposta
        }
      }

      // Salva a proposta canônica
      const propRes = await createTravelProposal({
        data: {
          title: sourcePackageTitle
            ? `${sourcePackageTitle} — ${destinationQuery}`
            : `Proposta ${destinationQuery} (${calculation.rooms.length} Quarto${calculation.rooms.length > 1 ? "s" : ""})`,
          destinationCity: destinationQuery,
          travelStartDate: departureDate || undefined,
          travelEndDate: returnDate || undefined,
          adultsCount: calculation.totalAdults,
          childrenCount: calculation.totalChildren,
          clientName: clientName || "Cliente Convidado",
          clientWhatsapp: clientPhone || undefined,
          clientEmail: clientEmail || undefined,
          leadId: effectiveLeadId && effectiveLeadId.length === 36 ? effectiveLeadId : undefined,
          canvasFormat: "a4-portrait",
          templateTheme: "editorial-flat",
          initialNotes: fullSummary,
          flights: [
            {
              id: "fl-ida",
              type: "outbound",
              airline: "Voo Regular Confirmado",
              flight_number: "G3 / LA",
              origin_code: originCity.match(/\(([A-Z]{3})\)/)?.[1] || "XAP",
              origin_city: originCity,
              destination_code: gatewayResolution?.primaryAirportIata || "DEST",
              destination_city: destinationQuery,
              departure_date: departureDate,
              departure_time: "09:00",
              arrival_date: departureDate,
              arrival_time: "14:30",
              baggage: "1 item pessoal + 1 mala de mão 10kg + bagagem despachada conforme contrato",
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
          includes: selectedInclusions,
          excludes: [
            "Despesas de caráter pessoal (frigobar, lavanderia e telefonemas)",
            "Taxas turísticas municipais e governamentais cobradas diretamente no check-in",
          ],
        },
      });

      return {
        proposal: propRes,
        quoteId: createdQuoteId,
        openStudioAfterSave,
      };
    },
    onSuccess: (res) => {
      toast.success("Proposta criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["agency-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-crm-leads"] });
      queryClient.invalidateQueries({ queryKey: ["agency-quotes"] });

      if (onCreated) {
        onCreated({
          proposalId: res.proposal?.id,
          quoteId: res.quoteId,
          proposal: res.proposal as any,
        });
      }

      if (res.openStudioAfterSave && res.proposal?.id) {
        navigate({
          to: "/workspace/turismo/propostas/$id",
          params: { id: res.proposal.id },
        });
      } else {
        // Abre o modal de compartilhamento WhatsApp
        setCreatedProposalForWhatsapp(res.proposal as any);
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar proposta.");
    },
  });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-0 flex flex-col h-full bg-background border-l border-border/60">
          {/* Cabeçalho */}
          <SheetHeader className="p-4 sm:p-6 border-b border-border/40 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-4" />
                </span>
                <div>
                  <SheetTitle className="text-base sm:text-lg font-bold text-foreground">
                    Construtor Unificado de Propostas
                  </SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Cotação multi-quartos, campanhas de operadoras e exportação em 1 clique
                  </SheetDescription>
                </div>
              </div>

              {/* Gatilho OCR Rápido */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={ocrFileInputRef}
                  onChange={handleOcrFileUpload}
                  accept="application/pdf,image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => ocrFileInputRef.current?.click()}
                  disabled={isScanningOcr}
                  className="h-11 min-h-11 px-3 text-xs gap-2 font-medium"
                  title="Importar proposta ou voucher de operadora via OCR"
                >
                  {isScanningOcr ? (
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                  ) : (
                    <Upload className="size-3.5 text-primary" />
                  )}
                  <span>{isScanningOcr ? "Lendo..." : "Importar OCR"}</span>
                </Button>
              </div>
            </div>

            {/* Abas do Fluxo Canônico */}
            <div className="flex items-center gap-1 mt-4 overflow-x-auto no-scrollbar border-b border-border/30 pb-2">
              <button
                type="button"
                onClick={() => setStepTab("destino")}
                className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  stepTab === "destino"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <MapPin className="size-3.5" />
                <span>1. Destino & Datas</span>
              </button>

              <button
                type="button"
                onClick={() => setStepTab("quartos")}
                className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  stepTab === "quartos"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Building2 className="size-3.5" />
                <span>2. Quartos & Ocupação ({rooms.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setStepTab("opcoes")}
                className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  stepTab === "opcoes"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <Tag className="size-3.5" />
                <span>3. Inclusões & Hotéis</span>
              </button>

              <button
                type="button"
                onClick={() => setStepTab("pagamento")}
                className={`h-11 min-h-11 px-4 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  stepTab === "pagamento"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <CreditCard className="size-3.5" />
                <span>4. Condições & Operadora</span>
              </button>
            </div>
          </SheetHeader>

          {/* Conteúdo com Rolagem */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* ETAPA 1: DESTINO & DATAS */}
            {stepTab === "destino" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Nome do Passageiro Principal / Lead</Label>
                    <Input
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">WhatsApp com DDD</Label>
                    <Input
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Ex: 49999998888"
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Origem do Voo</Label>
                    <Input
                      value={originCity}
                      onChange={(e) => setOriginCity(e.target.value)}
                      placeholder="Ex: Chapecó (XAP) ou Florianópolis (FLN)"
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Cidade / Destino</Label>
                    <Input
                      value={destinationQuery}
                      onChange={(e) => setDestinationQuery(e.target.value)}
                      placeholder="Ex: Buenos Aires, Maceió, Santiago..."
                      className="h-11 min-h-11 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Data de Embarque (Ida)</Label>
                    <Input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Data de Retorno (Volta)</Label>
                    <Input
                      type="date"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {gatewayResolution && (
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/60 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Plane className="size-3.5 text-primary" />
                      <span>Aeroporto de Desembarque Recomendado:</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {gatewayResolution.primaryAirportIata} — {gatewayResolution.primaryAirportName}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Conexão terrestre recomendada: {gatewayResolution.recommendedTransferType.replace("_", " ")} ({gatewayResolution.primaryDistanceKm} km / ~{gatewayResolution.primaryTransferDurationMins} min).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ETAPA 2: QUARTOS & OCUPAÇÃO */}
            {stepTab === "quartos" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    Configuração de Quartos ({rooms.length})
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddRoom}
                    className="h-11 min-h-11 px-3 text-xs gap-1.5 font-medium"
                  >
                    <Plus className="size-3.5" />
                    <span>Adicionar Quarto</span>
                  </Button>
                </div>

                {rooms.map((room) => (
                  <div
                    key={room.roomNumber}
                    className="p-4 rounded-lg border border-border/60 bg-card space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-border/30 pb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-primary" />
                        <Input
                          value={room.roomLabel}
                          onChange={(e) =>
                            handleUpdateRoom(room.roomNumber, { roomLabel: e.target.value })
                          }
                          className="h-9 text-xs font-semibold max-w-[200px]"
                        />
                      </div>

                      {rooms.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRoom(room.roomNumber)}
                          className="size-9 p-0 text-muted-foreground hover:text-destructive"
                          title="Remover quarto"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <Label className="text-xs text-muted-foreground">Adultos</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleUpdateRoom(room.roomNumber, {
                                adultsCount: Math.max(1, room.adultsCount - 1),
                              })
                            }
                            className="size-9 p-0"
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="font-bold text-foreground w-6 text-center">
                            {room.adultsCount}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleUpdateRoom(room.roomNumber, {
                                adultsCount: room.adultsCount + 1,
                              })
                            }
                            className="size-9 p-0"
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Crianças (0-11a)</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newCount = Math.max(0, room.childrenCount - 1);
                              handleUpdateRoom(room.roomNumber, {
                                childrenCount: newCount,
                                childrenAges: room.childrenAges.slice(0, newCount),
                              });
                            }}
                            className="size-9 p-0"
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="font-bold text-foreground w-6 text-center">
                            {room.childrenCount}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newCount = room.childrenCount + 1;
                              handleUpdateRoom(room.roomNumber, {
                                childrenCount: newCount,
                                childrenAges: [...room.childrenAges, 5],
                              });
                            }}
                            className="size-9 p-0"
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Tarifa Adulto (R$)</Label>
                        <Input
                          type="number"
                          value={Math.round(room.baseAdultPriceCents / 100)}
                          onChange={(e) =>
                            handleUpdateRoom(room.roomNumber, {
                              baseAdultPriceCents: Math.round(Number(e.target.value) * 100),
                            })
                          }
                          className="h-9 mt-1 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Tarifa Criança (R$)</Label>
                        <Input
                          type="number"
                          value={Math.round(room.baseChildPriceCents / 100)}
                          onChange={(e) =>
                            handleUpdateRoom(room.roomNumber, {
                              baseChildPriceCents: Math.round(Number(e.target.value) * 100),
                            })
                          }
                          className="h-9 mt-1 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Add-ons Opcionais do Quarto */}
                    <div className="pt-2 border-t border-border/20">
                      <Label className="text-xs text-muted-foreground">Adicionais Opcionais para este Quarto:</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                        {CANONICAL_ROOM_ADDONS.map((addon) => {
                          const isChecked = room.addons.some((a) => a.code === addon.code);
                          return (
                            <button
                              key={addon.code}
                              type="button"
                              onClick={() => handleToggleRoomAddon(room.roomNumber, addon)}
                              className={`h-11 min-h-11 px-3 rounded-lg border text-xs text-left flex items-center justify-between gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                isChecked
                                  ? "bg-primary/10 border-primary text-foreground font-semibold"
                                  : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                              }`}
                            >
                              <span className="truncate">{addon.label}</span>
                              <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                                +{formatMoney(addon.priceCents)}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ETAPA 3: INCLUSÕES & HOTÉIS */}
            {stepTab === "opcoes" && (
              <div className="space-y-4">
                {/* Autocomplete de Hotéis */}
                <div className="space-y-1.5 relative">
                  <Label className="text-xs font-medium text-foreground">Buscar no Banco de Hotéis Parceiros</Label>
                  <Input
                    value={hotelQuery}
                    onChange={(e) => {
                      setHotelQuery(e.target.value);
                      setIsHotelDropdownOpen(true);
                    }}
                    onFocus={() => setIsHotelDropdownOpen(true)}
                    placeholder="Digite o nome do hotel para autocompletar..."
                    className="h-11 min-h-11 rounded-lg text-xs"
                  />

                  {isHotelDropdownOpen && hotelSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                      {hotelSuggestions.map((h: any) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            setBundleOptions((prev) =>
                              prev.map((opt, i) =>
                                i === 0 ? { ...opt, hotelName: h.name } : opt
                              )
                            );
                            setHotelQuery(h.name);
                            setIsHotelDropdownOpen(false);
                            toast.success(`Hotel "${h.name}" selecionado!`);
                          }}
                          className="w-full h-11 min-h-11 px-3 text-xs text-left hover:bg-muted/60 flex items-center justify-between border-b border-border/20 last:border-0"
                        >
                          <span className="font-semibold text-foreground truncate">{h.name}</span>
                          <span className="text-[11px] text-muted-foreground">{h.city} · {h.stars}★</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Opções Comparativas do Pacote */}
                <div className="space-y-3">
                  <Label className="text-xs font-medium text-foreground">Hotel / Opções do Pacote:</Label>
                  {bundleOptions.map((opt, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-border/60 bg-card space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <Input
                          value={opt.optionLabel}
                          onChange={(e) =>
                            setBundleOptions((prev) =>
                              prev.map((o, i) => (i === idx ? { ...o, optionLabel: e.target.value } : o))
                            )
                          }
                          className="h-9 font-semibold text-xs max-w-[220px]"
                        />
                        <Badge variant="outline" className="text-xs font-mono">
                          {formatMoney(opt.adultPriceCents)}/adulto
                        </Badge>
                      </div>

                      <Input
                        value={opt.hotelName}
                        onChange={(e) =>
                          setBundleOptions((prev) =>
                            prev.map((o, i) => (i === idx ? { ...o, hotelName: e.target.value } : o))
                          )
                        }
                        placeholder="Nome do Hotel / Pousada"
                        className="h-11 min-h-11 text-xs"
                      />
                    </div>
                  ))}
                </div>

                {/* Tags de Inclusões */}
                <div className="space-y-2 pt-2 border-t border-border/20">
                  <Label className="text-xs font-medium text-foreground">Itens Inclusos no Pacote (Clique para ativar):</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_INCLUSIONS_TAGS.map((tag) => {
                      const isSelected = selectedInclusions.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleInclusionTag(tag)}
                          className={`h-11 min-h-11 px-3 rounded-lg text-xs font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          {isSelected && <Check className="size-3" />}
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 4: CONDIÇÕES & OPERADORA */}
            {stepTab === "pagamento" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Regra Comercial da Operadora / Fornecedor</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {CANONICAL_OPERATOR_CAMPAIGNS.map((camp) => (
                      <button
                        key={camp.operatorSlug}
                        type="button"
                        onClick={() => setSelectedOperatorSlug(camp.operatorSlug)}
                        className={`p-3 rounded-lg border text-xs text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          selectedOperatorSlug === camp.operatorSlug
                            ? "bg-primary/10 border-primary text-foreground font-semibold"
                            : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <div className="font-bold text-foreground">{camp.operatorDisplayName}</div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Até {camp.maxBoletoInstallments}x no Boleto ({camp.boletoMinDownpaymentPct}% entrada) ou {camp.maxCardInstallments}x no Cartão · {camp.pixCashDiscountPct}% desc. Pix
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Comissão da Agência (%)</Label>
                    <Input
                      type="number"
                      value={100 - supplierNetCostPct}
                      onChange={(e) => setSupplierNetCostPct(100 - Number(e.target.value))}
                      className="h-11 min-h-11 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Observações / Condições Especiais</Label>
                    <Input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: Cotação sujeita a disponibilidade tarifária"
                      className="h-11 min-h-11 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Resumo Financeiro Consolidado */}
                <div className="p-4 rounded-lg bg-card border border-border/60 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="text-xs font-bold text-foreground">Resumo Consolidado da Proposta</span>
                    <Badge variant="outline" className="text-xs font-mono text-primary border-primary/30">
                      {calculation.totalPassengers} passageiros ({calculation.totalAdults} ADT + {calculation.totalChildren} CHD)
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Tarifa Base</span>
                      <span className="font-bold text-foreground">{formatMoney(calculation.grandBaseCents)}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Adicionais</span>
                      <span className="font-bold text-foreground">{formatMoney(calculation.grandAddonsCents)}</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[11px]">Total da Venda</span>
                      <span className="text-sm font-extrabold text-primary">{formatMoney(calculation.grandTotalCents)}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded bg-muted/40 border border-border/40 text-[11px] text-muted-foreground space-y-1">
                    <div>
                      <strong className="text-foreground">Opção Boleto:</strong> Entrada de {formatMoney(calculation.campaignSummary.boletoDownpaymentCents)} + {activeCampaign.maxBoletoInstallments - 1}x de {formatMoney(calculation.campaignSummary.boletoMonthlyInstallmentCents)}
                    </div>
                    <div>
                      <strong className="text-foreground">Opção Cartão:</strong> Até {activeCampaign.maxCardInstallments}x de {formatMoney(calculation.campaignSummary.cardMonthlyInstallmentCents)}
                    </div>
                    <div>
                      <strong className="text-foreground">À Vista no Pix:</strong> {formatMoney(Math.round(calculation.grandTotalCents * (1 - activeCampaign.pixCashDiscountPct / 100)))} ({activeCampaign.pixCashDiscountPct}% off)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rodapé de Ações com Toque 44px */}
          <SheetFooter className="p-4 sm:p-6 border-t border-border/40 shrink-0 bg-background flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {stepTab !== "destino" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (stepTab === "pagamento") setStepTab("opcoes");
                    else if (stepTab === "opcoes") setStepTab("quartos");
                    else if (stepTab === "quartos") setStepTab("destino");
                  }}
                  className="h-11 min-h-11 px-4 text-xs font-medium"
                >
                  Voltar
                </Button>
              )}

              {stepTab !== "pagamento" && (
                <Button
                  type="button"
                  onClick={() => {
                    if (stepTab === "destino") setStepTab("quartos");
                    else if (stepTab === "quartos") setStepTab("opcoes");
                    else if (stepTab === "opcoes") setStepTab("pagamento");
                  }}
                  className="h-11 min-h-11 px-4 text-xs font-semibold gap-1.5"
                >
                  <span>Próximo</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => saveProposalMutation.mutate({ openStudioAfterSave: false })}
                disabled={saveProposalMutation.isPending}
                className="h-11 min-h-11 px-4 text-xs font-medium gap-2"
              >
                {saveProposalMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5 text-primary" />
                )}
                <span>Salvar & WhatsApp</span>
              </Button>

              <Button
                type="button"
                onClick={() => saveProposalMutation.mutate({ openStudioAfterSave: true })}
                disabled={saveProposalMutation.isPending}
                className="h-11 min-h-11 px-4 text-xs font-bold gap-2 bg-primary text-primary-foreground"
              >
                {saveProposalMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Eye className="size-3.5" />
                )}
                <span>Salvar & Abrir Studio</span>
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Modal de Disparo WhatsApp Integrado */}
      {createdProposalForWhatsapp && (
        <ProposalShareWhatsappModal
          isOpen={Boolean(createdProposalForWhatsapp)}
          onClose={() => {
            setCreatedProposalForWhatsapp(null);
            onOpenChange(false);
          }}
          proposal={createdProposalForWhatsapp}
        />
      )}
    </>
  );
}
