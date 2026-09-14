import { useState } from "react";
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
        className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] overflow-y-auto"
      >
        <SheetHeader className="pb-4 border-b border-border">
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
          <div className="space-y-6 py-4">
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
