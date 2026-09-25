import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { parseUniversalDocumentOCR } from "@/services/multimodal-ocr.functions";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  Plane,
  Building2,
  Calendar,
  DollarSign,
  Send,
  MapPin,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  Layers,
  Copy,
  Tag,
  Check,
  Compass,
  CreditCard,
  QrCode,
  Users,
  Sparkles,
  Eye,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createTravelProposal } from "@/services/travel-proposal.functions";
import { listHotelsBank } from "@/services/travel-catalog.functions";

interface LeadVisualProposalSheetProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    fullName?: string;
    email?: string | null;
    phone?: string | null;
    destination?: string | null;
    estimated_value_cents?: number;
    passenger_count?: number;
    cover_image?: string | null;
    cover_image_url?: string | null;
  } | null;
  storeId?: string;
  onSuccess?: () => void;
}

const COMMON_TAGS = [
  "Transfer In/Out Aeroporto ↔ Hotel",
  "Seguro Viagem Cobertura Completa",
  "City Tour Histórico no Destino",
  "Passeio Náutico / Escuna",
  "Ingressos para Parques Temáticos",
  "Bagagem Despachada 23kg",
];

export function LeadVisualProposalSheet({
  isOpen,
  onClose,
  lead,
  storeId,
  onSuccess,
}: LeadVisualProposalSheetProps) {
  const [destinationCity, setDestinationCity] = useState(lead?.destination || "Cancún");
  const [destinationCountry, setDestinationCountry] = useState("México");
  const [startDate, setStartDate] = useState(new Date(Date.now() + 86400000 * 30).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000 * 37).toISOString().split("T")[0]);
  const [passengerCount, setPassengerCount] = useState(lead?.passenger_count || 2);
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(
    lead?.cover_image || ""
  );

  // Voo
  const [hasFlight, setHasFlight] = useState(true);
  const [airline, setAirline] = useState("LATAM Airlines");
  const [flightOrigin, setFlightOrigin] = useState("GRU (São Paulo)");
  const [flightDest, setFlightDest] = useState("CUN (Cancún)");

  // Hotel & Autocomplete
  const [hasHotel, setHasHotel] = useState(true);
  const [hotelName, setHotelName] = useState("Grand Palladium Costa Mujeres Resort & Spa");
  const [roomType, setRoomType] = useState("Junior Suite All Inclusive");
  const [hotelSearchOpen, setHotelSearchOpen] = useState(false);

  // Consulta do Banco Real de Hotéis
  const { data: hotelSuggestions = [] } = useQuery({
    queryKey: ["hotels-bank-lead-proposal", hotelName],
    queryFn: () => listHotelsBank({ data: { search: hotelName.trim() } }),
    enabled: hotelName.trim().length >= 2,
    staleTime: 30_000,
  });

  // Atrativos e Transfers
  const [selectedTours, setSelectedTours] = useState<string[]>([
    "Transfer In/Out Aeroporto ↔ Hotel",
    "Seguro Viagem Cobertura Completa",
  ]);

  const toggleTourTag = (tag: string) => {
    setSelectedTours((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Preço & Pagamento
  const initialBaseCents = lead?.estimated_value_cents || 850000;
  const [basePriceCents, setBasePriceCents] = useState(initialBaseCents);
  const [boardingTaxCents, setBoardingTaxCents] = useState(48000);
  const [paymentTerms, setPaymentTerms] = useState("Entrada de 20% + saldo em até 10x sem juros no cartão.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdProposalToken, setCreatedProposalToken] = useState<string | null>(null);
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const ocrFileInputRef = useRef<HTMLInputElement | null>(null);

  // 🔄 Auto-binding: Sincroniza dados do CRM Lead instantaneamente sem digitação dupla
  useEffect(() => {
    if (lead && isOpen) {
      if (lead.destination) {
        setDestinationCity(lead.destination);
        setFlightDest(lead.destination);
      }
      if (lead.passenger_count && lead.passenger_count > 0) {
        setPassengerCount(lead.passenger_count);
      }
      if (lead.estimated_value_cents && lead.estimated_value_cents > 0) {
        setBasePriceCents(lead.estimated_value_cents);
      }
      const cover = lead.cover_image || lead.cover_image_url;
      if (cover) {
        setCoverPhotoUrl(cover);
      }
    }
  }, [lead, isOpen]);

  const handleOcrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningOcr(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = (event.target?.result as string)?.split(",")[1];
          if (!base64Data) throw new Error("Falha ao ler arquivo.");

          const res = await parseUniversalDocumentOCR({
            data: {
              base64Data,
              mimeType: file.type || "image/jpeg",
              nicheHint: "tourism",
            },
          });

          if (res.destinationCity) setDestinationCity(res.destinationCity);
          if (res.dates?.departure) setStartDate(res.dates.departure);
          if (res.dates?.return) setEndDate(res.dates.return);
          if (res.participants && res.participants.length > 0) setPassengerCount(res.participants.length);
          if (res.flightSegments && res.flightSegments.length > 0) {
            setHasFlight(true);
            const first = res.flightSegments[0];
            if (first.airline) setAirline(first.airline);
            if (first.origin) setFlightOrigin(first.origin);
            if (first.destination) setFlightDest(first.destination);
          }
          if (res.hotel?.name) {
            setHasHotel(true);
            setHotelName(res.hotel.name);
          }
          if (res.financials?.totalCents && res.financials.totalCents > 0) {
            setBasePriceCents(res.financials.totalCents);
          }
          toast.success("Dados da cotação extraídos com sucesso via OCR!");
        } catch (ocrErr: any) {
          toast.error(ocrErr?.message || "Erro ao processar OCR do documento.");
        } finally {
          setIsScanningOcr(false);
          if (ocrFileInputRef.current) ocrFileInputRef.current.value = "";
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsScanningOcr(false);
      toast.error(err?.message || "Erro ao carregar arquivo.");
    }
  };

  // Simulador dinâmico de parcelas
  const totalPrice = basePriceCents + boardingTaxCents;
  const pCount = Math.max(1, passengerCount);
  const perPersonCents = Math.round(totalPrice / pCount);
  const installment10xCents = Math.round(totalPrice / 10);
  const pixDiscountCents = Math.round(totalPrice * 0.95);

  const handleGenerateProposal = async () => {
    setIsSubmitting(true);
    try {
      const res = await createTravelProposal({
        data: {
          title: `Proposta: ${destinationCity || "Viagem Exclusiva"} (${lead?.fullName || "Cliente Especial"})`,
          clientName: lead?.fullName || "Cliente Especial",
          clientEmail: lead?.email || undefined,
          clientWhatsapp: lead?.phone || "49998887777",
          clientPhone: lead?.phone || "49998887777",
          destinationCity,
          destinationCountry,
          startDate,
          endDate,
          travelStartDate: startDate,
          travelEndDate: endDate,
          paxCount: passengerCount,
          adultsCount: passengerCount,
          coverPhotoUrl,
          leadId: lead?.id,
          pricing: {
            currency: "BRL",
            base_price_cents: basePriceCents,
            boarding_tax_cents: boardingTaxCents,
            total_price_cents: totalPrice,
            total_cents: totalPrice,
            payment_terms: paymentTerms,
            installments_options: [
              {
                installments_count: 1,
                installment_value_cents: pixDiscountCents,
                method: "pix",
                has_interest: false,
              },
              {
                installments_count: 10,
                installment_value_cents: installment10xCents,
                method: "credit_card",
                has_interest: false,
              },
            ],
          },
          itinerary: [
            {
              day_number: 1,
              title: "Chegada e Check-in no Resort",
              description: "Recepção VIP no aeroporto e transfer privativo para o hotel.",
            },
            {
              day_number: 2,
              title: "Dia Livre All-Inclusive & Praia",
              description: "Aproveite a gastronomia internacional e piscinas do resort.",
            },
          ],
          flights: hasFlight
            ? [
                {
                  type: "round_trip",
                  airline,
                  origin: flightOrigin,
                  destination: flightDest,
                  cabin_class: "economy",
                },
              ]
            : [],
          hotels: hasHotel
            ? [
                {
                  hotel_name: hotelName,
                  room_type: roomType,
                  board_basis: "all_inclusive",
                },
              ]
            : [],
          transfers: selectedTours
            .filter((t) => t.toLowerCase().includes("transfer"))
            .map((t) => ({ title: t })),
          tours: selectedTours
            .filter((t) => !t.toLowerCase().includes("transfer"))
            .map((t) => ({ title: t, description: "Serviço incluído na proposta" })),
        },
      });

      setCreatedProposalToken(res.publicToken);
      toast.success("Proposta visual gerada com sucesso!");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      const msg =
        typeof err?.message === "string" && err.message.startsWith("[{")
          ? "Verifique os dados da proposta."
          : err?.message || "Erro ao emitir proposta comercial.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        size="wide"
        className="w-full sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl overflow-y-auto max-h-[94dvh]"
      >
        <SheetHeader className="pb-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FileText className="size-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-foreground">
                  Emitir Proposta Visual para {lead?.fullName || "Lead"}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Gere uma lâmina interativa de alta conversão para WhatsApp ou e-mail.
                </SheetDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isScanningOcr}
                onClick={() => ocrFileInputRef.current?.click()}
                className="h-8 rounded-xl text-xs font-semibold gap-1.5 border-border/80 bg-background hover:bg-muted text-foreground cursor-pointer"
              >
                {isScanningOcr ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                    <span>Lendo OCR...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5 text-primary" />
                    <span>Importar Cotação (OCR)</span>
                  </>
                )}
              </Button>
              <input
                ref={ocrFileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleOcrFileUpload}
              />
            </div>
          </div>
        </SheetHeader>

        {createdProposalToken ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-12" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Proposta Gerada com Sucesso!</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                A lâmina interativa já está disponível online e conectada ao CRM.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={() => window.open(`/proposta/${createdProposalToken}`, "_blank")}
                className="rounded-xl gap-2 font-bold min-h-[44px]"
              >
                <ExternalLink className="size-4" /> Visualizar Lâmina
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/proposta/${createdProposalToken}`
                  );
                  toast.success("Link copiado para o WhatsApp!");
                }}
                className="rounded-xl gap-2 min-h-[44px]"
              >
                <Copy className="size-4" /> Copiar Link do Cliente
              </Button>
              <Button
                variant="outline"
                onClick={() => setCreatedProposalToken(null)}
                className="rounded-xl min-h-[44px]"
              >
                Criar Outra
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-4 items-start">
            {/* ── LIVE PREVIEW LATERAL (SPLIT-SCREEN EDITOR) ── */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-0 order-2 lg:order-1">
              <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-sm space-y-4 overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Preview em Tempo Real
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    PDF / WhatsApp
                  </Badge>
                </div>

                {/* Banner / Foto de Capa */}
                <div className="relative h-44 rounded-xl overflow-hidden bg-muted/60 border border-border/60">
                  {coverPhotoUrl ? (
                    <img
                      src={coverPhotoUrl}
                      alt={destinationCity}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/5 to-muted flex items-center justify-center">
                      <MapPin className="size-10 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-3.5 text-white">
                    <Badge className="w-fit text-[10px] bg-primary text-primary-foreground mb-1">
                      {destinationCountry || "Destino Exclusivo"}
                    </Badge>
                    <h4 className="text-lg font-black tracking-tight leading-tight">
                      {destinationCity || "Cotação Personalizada"}
                    </h4>
                    <p className="text-[11px] text-white/80">
                      Preparado para {lead?.fullName || "Cliente Especial"}
                    </p>
                  </div>
                </div>

                {/* Resumo de Datas e Pax */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center gap-2">
                    <Calendar className="size-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground font-medium">Período</p>
                      <p className="font-semibold text-foreground truncate">
                        {startDate ? new Date(startDate + "T12:00:00").toLocaleDateString("pt-BR") : "A definir"} - {endDate ? new Date(endDate + "T12:00:00").toLocaleDateString("pt-BR") : "A definir"}
                      </p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center gap-2">
                    <Users className="size-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground font-medium">Viajantes</p>
                      <p className="font-semibold text-foreground">
                        {pCount} {pCount === 1 ? "passageiro" : "passageiros"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Voo & Hotel */}
                <div className="space-y-2 text-xs">
                  {hasFlight && (
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Plane className="size-3.5 text-primary shrink-0" />
                        <span className="font-medium text-foreground">{airline}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{flightOrigin} ➔ {flightDest}</span>
                    </div>
                  )}
                  {hasHotel && (
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="size-3.5 text-primary shrink-0" />
                        <span className="font-medium text-foreground truncate">{hotelName}</span>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">{roomType}</Badge>
                    </div>
                  )}
                </div>

                {/* Inclusões selecionadas */}
                {selectedTours.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Inclusões
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTours.map((tour) => (
                        <Badge key={tour} variant="secondary" className="text-[10px] font-normal py-0.5 px-2">
                          ✓ {tour}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preço Total & Condições */}
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold text-foreground">Total da Proposta</span>
                    <span className="text-xl font-black font-mono text-primary">
                      R$ {(totalPrice / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Por passageiro ({pCount} pax)</span>
                    <span className="font-mono font-semibold text-foreground">
                      R$ {(perPersonCents / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-primary/10 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                      PIX (5% off): <span className="font-bold font-mono">R$ {(pixDiscountCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="text-right text-muted-foreground">
                      Cartão: <span className="font-bold text-foreground font-mono">10x R$ {(installment10xCents / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CONTROLES DO FORMULÁRIO (COLUNA DIREITA) ── */}
            <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
            {/* ── 1. Destino & Apresentação ── */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                1. Destino & Apresentação
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">Cidade / Destino</Label>
                  <Input
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    className="h-10 rounded-xl min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">País</Label>
                  <Input
                    value={destinationCountry}
                    onChange={(e) => setDestinationCountry(e.target.value)}
                    className="h-10 rounded-xl min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">Data Início</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 rounded-xl min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">Data Fim</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 rounded-xl min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">Passageiros (Pax)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(parseInt(e.target.value, 10) || 1)}
                    className="h-10 rounded-xl min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* ── 2. Voos e Hospedagem (Banco Oficial) ── */}
            <div className="space-y-3 pt-2 border-t border-border/80">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                2. Aéreo & Hospedagem
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Voo */}
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                      <Plane className="size-4" /> Voo Comercial
                    </div>
                    <Badge variant="outline" className="text-[10px]">Ida e Volta</Badge>
                  </div>
                  <Input
                    placeholder="Cia Aérea (LATAM, GOL, Azul...)"
                    value={airline}
                    onChange={(e) => setAirline(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                  <Input
                    placeholder="Trecho Origem ➔ Destino"
                    value={`${flightOrigin} ➔ ${flightDest}`}
                    onChange={(e) => {
                      const parts = e.target.value.split("➔");
                      setFlightOrigin(parts[0]?.trim() || "");
                      setFlightDest(parts[1]?.trim() || "");
                    }}
                    className="h-9 text-xs rounded-lg font-mono"
                  />
                </div>

                {/* Hotel com Autocomplete Real do Banco de Hotéis */}
                <div className="p-3.5 rounded-xl border border-border bg-card space-y-2.5 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <Building2 className="size-4" /> Hotel & Resort (Banco de Hotéis)
                    </div>
                    {hasHotel && (
                      <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600">
                        Ativo
                      </Badge>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Buscar no Banco de Hotéis..."
                      value={hotelName}
                      onChange={(e) => {
                        setHotelName(e.target.value);
                        setHotelSearchOpen(true);
                      }}
                      onFocus={() => setHotelSearchOpen(true)}
                      className="h-9 text-xs rounded-lg"
                    />
                    {hotelSearchOpen && hotelSuggestions.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 top-10 bg-popover border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto p-1 text-xs space-y-1">
                        {hotelSuggestions.slice(0, 6).map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => {
                              setHotelName(h.name);
                              if (h.city) setDestinationCity(h.city);
                              if (h.room_categories?.[0]?.name) {
                                setRoomType(h.room_categories[0].name);
                              }
                              setHotelSearchOpen(false);
                              toast.success(`Hotel "${h.name}" selecionado do banco!`);
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <div>
                              <p className="font-bold text-foreground text-xs">{h.name}</p>
                              <p className="text-[10px] text-muted-foreground">{h.city}, {h.state || h.country} {h.stars ? `• ${h.stars}★` : ""}</p>
                            </div>
                            <Badge variant="outline" className="text-[9px] font-mono">
                              {h.regime_options?.[0] || "All Inclusive"}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input
                    placeholder="Tipo de Acomodação (ex: Suíte Master)"
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* ── 3. Transfers, Passeios e Inclusões Rápidas ── */}
            <div className="space-y-3 pt-2 border-t border-border/80">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                  3. Transfers & Atrativos Inclusos (1 Toque)
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {selectedTours.length} selecionado(s)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_TAGS.map((tag) => {
                  const isSelected = selectedTours.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTourTag(tag)}
                      className={`text-xs px-2.5 py-1 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/70"
                      }`}
                    >
                      {isSelected ? <Check className="size-3" /> : <Plus className="size-3" />}
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 4. Valores & Simulador Dinâmico de Parcelas ── */}
            <div className="space-y-3 pt-2 border-t border-border/80">
              <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
                4. Valores & Condições de Pagamento
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">Valor Base do Pacote (R$)</Label>
                  <Input
                    type="number"
                    value={(basePriceCents / 100).toFixed(2)}
                    onChange={(e) => setBasePriceCents(Math.round(parseFloat(e.target.value) * 100 || 0))}
                    className="h-10 font-mono font-bold rounded-xl min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">Taxas de Embarque (R$)</Label>
                  <Input
                    type="number"
                    value={(boardingTaxCents / 100).toFixed(2)}
                    onChange={(e) => setBoardingTaxCents(Math.round(parseFloat(e.target.value) * 100 || 0))}
                    className="h-10 font-mono rounded-xl min-h-[44px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-medium">Condições de Pagamento</Label>
                <Input
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="h-10 text-xs rounded-xl min-h-[44px]"
                />
              </div>

              {/* Card Simulador de Condições & Parcelamento Dinâmico */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-muted-foreground">Valor Total da Proposta</p>
                    <p className="text-xl font-black font-mono text-primary">
                      R$ {(totalPrice / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">Por Passageiro ({pCount} pax)</p>
                    <p className="text-sm font-bold font-mono text-foreground">
                      R$ {(perPersonCents / 100).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px]">
                  <div className="p-2.5 rounded-xl bg-background border border-border/60 flex items-center gap-2">
                    <QrCode className="size-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-foreground">PIX (5% off):</span>
                      <p className="font-mono text-emerald-600 font-bold">
                        R$ {(pixDiscountCents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-background border border-border/60 flex items-center gap-2">
                    <CreditCard className="size-4 text-primary shrink-0" />
                    <div>
                      <span className="font-bold text-foreground">Cartão 10x s/ juros:</span>
                      <p className="font-mono text-foreground font-bold">
                        10x de R$ {(installment10xCents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        <SheetFooter className="gap-2 sm:gap-0 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="rounded-xl min-h-[44px] cursor-pointer">
            Fechar
          </Button>
          {!createdProposalToken && (
            <Button
              onClick={handleGenerateProposal}
              disabled={isSubmitting}
              className="rounded-xl min-h-[44px] gap-2 bg-primary text-primary-foreground font-bold cursor-pointer"
            >
              <Send className="size-4" />
              {isSubmitting ? "Emitindo..." : "Emitir Proposta Oficial"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
