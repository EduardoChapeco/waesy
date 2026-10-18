import * as React from "react";
import { useState } from "react";
import {
  Luggage,
  Hotel,
  Plane,
  Car,
  ShieldCheck,
  MapPin,
  Calendar,
  Users,
  Search,
  ArrowLeftRight,
  Sparkles,
  CreditCard,
  Headphones,
  Tag,
  Compass,
  Check,
  Loader2,
  ArrowRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import {
  publicTourismAutoServiceSearchFn,
  type PublicTourismAutoServiceItemDTO,
} from "@/services/infotravel";
import { requestTravelQuote } from "@/services/tourism.functions";

export type BookingServiceTab = "packages" | "hotels" | "flights" | "activities" | "cars";

export interface DynamicBookingHeroProps {
  title?: string;
  headline?: string;
  subtitle?: string;
  subheadline?: string;
  badge?: string;
  badgeText?: string;
  bgImageUrl?: string;
  imageUrl?: string;
  defaultOrigin?: string;
  defaultDestination?: string;
  whatsappPhone?: string;
  showBenefitsBar?: boolean;
  storeData?: any;
  onSearch?: (criteria: {
    service: BookingServiceTab;
    origin: string;
    destination: string;
    departureDate: string;
    returnDate: string;
    guests: string;
  }) => void;
}

export const DynamicBookingHero: React.FC<DynamicBookingHeroProps> = ({
  title: rawTitle,
  headline,
  subtitle: rawSubtitle,
  subheadline,
  badge: rawBadge,
  badgeText,
  bgImageUrl: rawBgImageUrl,
  imageUrl,
  defaultOrigin = "São Paulo, SP",
  defaultDestination = "Maceió, AL",
  whatsappPhone = "",
  showBenefitsBar = true,
  storeData,
  onSearch,
}) => {
  const title = rawTitle || headline || "Sua Próxima Viagem Começa Aqui";
  const subtitle =
    rawSubtitle ||
    subheadline ||
    "Pacotes completos, passagens aéreas e resorts exclusivos com cotação online imediata.";
  const badge = rawBadge || badgeText || "Tarifas Exclusivas de Agência";
  const bgImageUrl = rawBgImageUrl || imageUrl || "";
  const [activeTab, setActiveTab] = useState<BookingServiceTab>("packages");
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDestination);
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [guests, setGuests] = useState("2 Adultos, 1 Quarto");

  // Auto-Service Results State
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<PublicTourismAutoServiceItemDTO[]>([]);
  const [isLiveGdsActive, setIsLiveGdsActive] = useState(false);
  const [selectedItemForQuote, setSelectedItemForQuote] = useState<PublicTourismAutoServiceItemDTO | null>(null);
  const [leadName, setLeadName] = useState("");
  const [leadWhatsapp, setLeadWhatsapp] = useState("");
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  const handleSwapLocations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
    toast.info("Origem e destino invertidos.");
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      toast.error("Por favor, informe o destino desejado.");
      return;
    }

    if (onSearch) {
      onSearch({
        service: activeTab,
        origin,
        destination,
        departureDate,
        returnDate,
        guests,
      });
      return;
    }

    setIsSearching(true);
    setSelectedItemForQuote(null);
    try {
      const res = await publicTourismAutoServiceSearchFn({
        data: {
          storeId: storeData?.id || undefined,
          service: activeTab,
          origin: origin.trim(),
          destination: destination.trim(),
          departureDate: departureDate || "",
          returnDate: returnDate || "",
          guests: guests.trim(),
        },
      });
      setSearchResults(res.results || []);
      setIsLiveGdsActive(Boolean(res.infotravelLiveActive));
      setHasSearched(true);
      if ((res.results || []).length > 0) {
        toast.success(`${res.results.length} opções encontradas para ${destination}.`);
      } else {
        toast.info(`Solicite sua cotação personalizada para ${destination} abaixo.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível consultar disponibilidade no momento.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmAutoServiceQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || !leadWhatsapp.trim()) {
      toast.error("Preencha seu nome e WhatsApp para receber a proposta.");
      return;
    }

    setIsSubmittingQuote(true);
    try {
      const tripTypeMap: Record<BookingServiceTab, "air_package" | "hotel_only" | "cruise" | "bus" | "visa_assistance"> = {
        packages: "air_package",
        hotels: "hotel_only",
        flights: "air_package",
        activities: "air_package",
        cars: "air_package",
      };

      const itemNote = selectedItemForQuote
        ? `Item selecionado na vitrine: ${selectedItemForQuote.title} (${selectedItemForQuote.badge || selectedItemForQuote.source}) - ${selectedItemForQuote.priceCents > 0 ? formatMoney(selectedItemForQuote.priceCents) : "Sob medida"} | Viajantes: ${guests}`
        : `Busca Auto-Service Vitrine (${activeTab}) | Viajantes: ${guests}`;

      await requestTravelQuote({
        data: {
          origin_city: origin.trim() || "A definir",
          destination_city: selectedItemForQuote?.destination || destination.trim(),
          departure_date: departureDate || undefined,
          return_date: returnDate || undefined,
          rooms_count: 1,
          adults_count: 2,
          children_count: 0,
          children_ages: [],
          trip_type: tripTypeMap[activeTab],
          flexible_dates: !departureDate,
          contact_name: leadName.trim(),
          contact_whatsapp: leadWhatsapp.trim(),
          special_notes: itemNote,
        },
      });

      toast.success("Cotação registrada! Nossa equipe já recebeu seu pedido.");

      const rawPhone = storeData?.phone || whatsappPhone || "";
      const targetPhone = rawPhone.replace(/\D/g, "");
      if (targetPhone) {
        const msg = encodeURIComponent(
          `Olá! Solicitei reserva/cotação no site:\n\n*Opção:* ${selectedItemForQuote?.title || destination}\n*Origem:* ${origin}\n*Destino:* ${destination}\n*Ida:* ${departureDate || "Flexível"}\n*Volta:* ${returnDate || "Flexível"}\n*Viajantes:* ${guests}\n*Cliente:* ${leadName}`
        );
        window.open(`https://wa.me/${targetPhone}?text=${msg}`, "_blank");
      }

      setSelectedItemForQuote(null);
      setLeadName("");
      setLeadWhatsapp("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar cotação.");
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-background py-8 md:py-16">
      {/* Imagem de Fundo com Overlay */}
      <div className="absolute inset-0 z-0">
        {bgImageUrl ? (
          <img
            src={bgImageUrl}
            alt={title}
            className="size-full object-cover object-center"
          />
        ) : (
          <div className="size-full bg-muted/30" />
        )}
        <div className="absolute inset-0 bg-background/90 backdrop-blur-xs" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Headline Editorial de Cabeçalho */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          {badge && (
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-bold text-primary">
              <Sparkles className="size-4" />
              <span>{badge}</span>
            </div>
          )}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* ── CARD PRINCIPAL DO MOTOR DE BUSCA E AUTO-SERVICE ── */}
        <div className="bg-card border border-border/80 rounded-lg overflow-hidden">
          {/* Abas Superiores de Serviços (Linha Única Contínua B.39) */}
          <div className="flex flex-nowrap items-center overflow-x-auto no-scrollbar border-b border-border/60 bg-muted/30 p-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("packages")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-lg flex items-center gap-2 text-xs font-bold transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeTab === "packages"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Luggage className="size-4" />
              <span>Pacotes</span>
              <span className="text-xs uppercase font-mono px-2 py-0.5 rounded-sm bg-primary-foreground/20 text-primary-foreground">
                Completo
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("hotels")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-lg flex items-center gap-2 text-xs font-bold transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeTab === "hotels"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Hotel className="size-4" />
              <span>Hospedagens</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("flights")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-lg flex items-center gap-2 text-xs font-bold transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeTab === "flights"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Plane className="size-4" />
              <span>Passagens</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("activities")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-lg flex items-center gap-2 text-xs font-bold transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeTab === "activities"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Compass className="size-4" />
              <span>Passeios</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("cars")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-lg flex items-center gap-2 text-xs font-bold transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeTab === "cars"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Car className="size-4" />
              <span>Aluguel de Carros</span>
            </button>
          </div>

          {/* Formulário de Busca e Cotação */}
          <form onSubmit={handleSearchSubmit} className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Campo Origem */}
              <div className="md:col-span-3 space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  <span>Origem</span>
                </Label>
                <div className="relative">
                  <Input
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Cidade de partida"
                    className="h-11 min-h-11 pl-3 pr-12 text-xs font-medium rounded-lg border-border/80 bg-muted/20 focus-visible:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleSwapLocations}
                    className="absolute right-1 top-1/2 -translate-y-1/2 size-9 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    title="Inverter origem e destino"
                  >
                    <ArrowLeftRight className="size-4" />
                  </button>
                </div>
              </div>

              {/* Campo Destino */}
              <div className="md:col-span-3 space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  <span>Destino</span>
                </Label>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Para onde você vai?"
                  className="h-11 min-h-11 px-3 text-xs font-medium rounded-lg border-border/80 bg-muted/20 focus-visible:ring-primary"
                />
              </div>

              {/* Campo Datas (Entrada & Saída) */}
              <div className="md:col-span-3 grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                    <Calendar className="size-4 text-primary" />
                    <span>Ida / Entrada</span>
                  </Label>
                  <Input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="h-11 min-h-11 px-2 text-xs font-medium rounded-lg border-border/80 bg-muted/20 focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                    <Calendar className="size-4 text-primary" />
                    <span>Volta / Saída</span>
                  </Label>
                  <Input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="h-11 min-h-11 px-2 text-xs font-medium rounded-lg border-border/80 bg-muted/20 focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* Campo Viajantes / Quartos */}
              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <span>Viajantes</span>
                </Label>
                <Input
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  placeholder="Passageiros e quartos"
                  className="h-11 min-h-11 px-3 text-xs font-medium rounded-lg border-border/80 bg-muted/20 focus-visible:ring-primary"
                />
              </div>

              {/* Botão de Ação Buscar */}
              <div className="md:col-span-1">
                <Button
                  type="submit"
                  size="default"
                  disabled={isSearching}
                  className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isSearching ? (
                    <Loader2 className="size-4 animate-spin shrink-0" />
                  ) : (
                    <Search className="size-4 shrink-0" />
                  )}
                  <span className="md:hidden">Buscar</span>
                </Button>
              </div>
            </div>

            {/* Presets de Destinos Rápidos */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2">
              <span className="text-xs font-semibold text-muted-foreground shrink-0">
                Mais buscados:
              </span>
              {["Maceió", "Porto Seguro", "Punta Cana", "Rio de Janeiro", "Gramado", "Florianópolis"].map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDestination(preset)}
                    className="h-9 px-3 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-xs font-medium text-foreground transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {preset}
                  </button>
                )
              )}
            </div>
          </form>

          {/* ── PAINEL DE RESULTADOS AUTO-SERVICE (INFOTRAVEL LIVE + CATÁLOGO) ── */}
          {hasSearched && (
            <div className="border-t border-border/60 bg-muted/20 p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">
                    Opções para {destination}
                  </h3>
                  {isLiveGdsActive && (
                    <Badge variant="secondary" className="text-xs font-semibold">
                      InfoTravel GDS Conectado
                    </Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHasSearched(false);
                    setSelectedItemForQuote(null);
                  }}
                  className="h-9 px-3 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="size-4" />
                  <span>Fechar busca</span>
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-xs font-semibold">
                            {item.badge || "Roteiro Verificado"}
                          </Badge>
                          {item.nights && (
                            <span className="text-xs font-medium text-muted-foreground">
                              {item.nights} noites
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-foreground break-words leading-tight">
                          {item.title}
                        </h4>
                        <p className="text-xs text-muted-foreground break-words leading-relaxed">
                          {item.subtitle}
                        </p>
                        {item.includes.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {item.includes.map((inc, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground"
                              >
                                <Check className="size-3 text-primary shrink-0" />
                                <span>{inc}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-xs text-muted-foreground block">
                            {item.priceCents > 0 ? "Valor total estimado" : "Tarifa"}
                          </span>
                          <strong className="text-base font-black text-foreground">
                            {item.priceCents > 0 ? formatMoney(item.priceCents) : "Sob medida"}
                          </strong>
                        </div>
                        <Button
                          type="button"
                          onClick={() => setSelectedItemForQuote(item)}
                          className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <span>Cotar Opção</span>
                          <ArrowRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-border bg-card p-6 text-center space-y-2">
                  <p className="text-sm font-bold text-foreground">
                    Montamos seu roteiro personalizado para {destination}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-lg mx-auto">
                    Informe seu nome e WhatsApp abaixo para receber as tarifas aéreas e de hospedagem diretamente no seu celular.
                  </p>
                </div>
              )}

              {/* Formulário Rápido de Fechamento de Cotação Auto-Service */}
              {(selectedItemForQuote || searchResults.length === 0) && (
                <form
                  onSubmit={handleConfirmAutoServiceQuote}
                  className="rounded-lg border border-primary/30 bg-card p-4 sm:p-5 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        {selectedItemForQuote
                          ? `Receber Proposta Oficial: ${selectedItemForQuote.title}`
                          : `Receber Cotação Oficial para ${destination}`}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Enviaremos o link interativo da proposta com opções de voos, hotéis e parcelamento.
                      </p>
                    </div>
                    {selectedItemForQuote && (
                      <button
                        type="button"
                        onClick={() => setSelectedItemForQuote(null)}
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Trocar opção
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Seu Nome</Label>
                      <Input
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                        placeholder="Nome completo"
                        required
                        className="h-11 min-h-11 text-xs rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Seu WhatsApp com DDD</Label>
                      <Input
                        value={leadWhatsapp}
                        onChange={(e) => setLeadWhatsapp(e.target.value)}
                        placeholder="(11) 99999-9999"
                        required
                        className="h-11 min-h-11 text-xs rounded-lg"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmittingQuote}
                      className="h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer"
                    >
                      {isSubmittingQuote ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ArrowRight className="size-4" />
                      )}
                      <span>Gerar Proposta Agora</span>
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* ── FAIXA DE BENEFÍCIOS E SEGURANÇA (SUB-HERO) ── */}
        {showBenefitsBar && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="p-4 rounded-lg border border-border/60 bg-card flex items-center gap-3">
              <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <CreditCard className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-foreground break-words">
                  Parcele em até 12x
                </h4>
                <p className="text-xs text-muted-foreground break-words">
                  Pix com desconto especial
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border/60 bg-card flex items-center gap-3">
              <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Tag className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-foreground break-words">
                  Tarifas de Operadora
                </h4>
                <p className="text-xs text-muted-foreground break-words">
                  Conexão direta GDS InfoTravel
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border/60 bg-card flex items-center gap-3">
              <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Headphones className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-foreground break-words">
                  Consultoria Humana
                </h4>
                <p className="text-xs text-muted-foreground break-words">
                  Suporte antes e durante a viagem
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border/60 bg-card flex items-center gap-3">
              <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <ShieldCheck className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-foreground break-words">
                  Reserva Protegida
                </h4>
                <p className="text-xs text-muted-foreground break-words">
                  Contrato digital e vouchers oficiais
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

// Export alias for compatibility with builder registry
export const DynamicBookingHeroSection = DynamicBookingHero;
