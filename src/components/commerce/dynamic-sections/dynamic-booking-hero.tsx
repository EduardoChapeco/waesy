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
  Clock,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type BookingServiceTab = "packages" | "hotels" | "flights" | "activities" | "cars";

export interface DynamicBookingHeroProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  bgImageUrl?: string;
  defaultOrigin?: string;
  defaultDestination?: string;
  whatsappPhone?: string;
  showBenefitsBar?: boolean;
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
  title = "Sua Próxima Viagem Inesquecível Começa Aqui",
  subtitle = "Pacotes completos, passagens aéreas e resorts exclusivos com a melhor assessoria.",
  badge = "Tarifas Exclusivas de Agência",
  bgImageUrl = "",
  defaultOrigin = "São Paulo, SP",
  defaultDestination = "Maceió, AL",
  whatsappPhone = "",
  showBenefitsBar = true,
  onSearch,
}) => {
  const [activeTab, setActiveTab] = useState<BookingServiceTab>("packages");
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDestination);
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [guests, setGuests] = useState("2 Adultos, 1 Quarto");

  const handleSwapLocations = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
    toast.info("Origem e destino invertidos.");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
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

    const serviceNames: Record<BookingServiceTab, string> = {
      packages: "Pacote Completo (Hotel + Aéreo)",
      hotels: "Hospedagem & Resort",
      flights: "Passagem Aérea",
      activities: "Passeios & Experiências",
      cars: "Aluguel de Veículo",
    };

    const targetPhone = (whatsappPhone || "").replace(/\D/g, "");
    if (targetPhone) {
      const msg = encodeURIComponent(
        `Olá! Gostaria de uma cotação no site para:\n\n*Serviço:* ${serviceNames[activeTab]}\n*Origem:* ${origin}\n*Destino:* ${destination}\n*Ida:* ${departureDate || "A definir"}\n*Volta:* ${returnDate || "A definir"}\n*Viajantes:* ${guests}\n\nPoderiam me enviar os melhores valores disponíveis?`
      );
      window.open(`https://wa.me/${targetPhone}?text=${msg}`, "_blank");
      toast.success("Buscando cotação com a equipe de atendimento...");
    } else {
      toast.success(`Buscando ${serviceNames[activeTab]} para ${destination}...`);
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-background py-8 md:py-16">
      {/* Imagem de Fundo com Overlay Gradiente */}
      <div className="absolute inset-0 z-0">
        {bgImageUrl ? (
          <img
            src={bgImageUrl}
            alt={title}
            className="size-full object-cover object-center"
          />
        ) : (
          <div className="size-full bg-linear-to-b from-primary/15 via-background/80 to-background" />
        )}
        <div className="absolute inset-0 bg-background/85 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Headline Editorial de Cabeçalho */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          {badge && (
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary">
              <Sparkles className="size-3.5" />
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

        {/* ── CARD PRINCIPAL DO WIDGET DE RESERVAS (ESTILO DECOLAR / CVC) ── */}
        <div className="bg-card border border-border/80 rounded-2xl shadow-xl overflow-hidden">
          {/* Abas Superiores de Serviços */}
          <div className="flex items-center overflow-x-auto no-scrollbar border-b border-border/60 bg-muted/30 p-1.5 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("packages")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeTab === "packages"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Luggage className="size-4" />
              <span>Pacotes</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-sm bg-primary-foreground/20 text-primary-foreground">
                Economize
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("hotels")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-primary",
                activeTab === "hotels"
                  ? "bg-primary text-primary-foreground shadow-xs"
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
                "h-11 min-h-11 px-4 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-primary",
                activeTab === "flights"
                  ? "bg-primary text-primary-foreground shadow-xs"
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
                "h-11 min-h-11 px-4 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-primary",
                activeTab === "activities"
                  ? "bg-primary text-primary-foreground shadow-xs"
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
                "h-11 min-h-11 px-4 rounded-xl flex items-center gap-2 text-xs font-bold transition-all shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-primary",
                activeTab === "cars"
                  ? "bg-primary text-primary-foreground shadow-xs"
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
              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" />
                  <span>Origem</span>
                </Label>
                <div className="relative">
                  <Input
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Cidade de partida"
                    className="h-11 min-h-11 pl-3 pr-10 text-xs font-medium rounded-xl border-border/80 bg-muted/20 focus-visible:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={handleSwapLocations}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 size-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Inverter origem e destino"
                  >
                    <ArrowLeftRight className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Campo Destino */}
              <div className="md:col-span-3 space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" />
                  <span>Destino</span>
                </Label>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Para onde você vai?"
                  className="h-11 min-h-11 px-3 text-xs font-medium rounded-xl border-border/80 bg-muted/20 focus-visible:ring-primary"
                />
              </div>

              {/* Campo Datas (Entrada & Saída) */}
              <div className="md:col-span-3 grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 truncate">
                    <Calendar className="size-3.5 text-primary" />
                    <span>Ida / Entrada</span>
                  </Label>
                  <Input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="h-11 min-h-11 px-2 text-xs font-medium rounded-xl border-border/80 bg-muted/20 focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 truncate">
                    <Calendar className="size-3.5 text-primary" />
                    <span>Volta / Saída</span>
                  </Label>
                  <Input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="h-11 min-h-11 px-2 text-xs font-medium rounded-xl border-border/80 bg-muted/20 focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* Campo Viajantes / Quartos */}
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" />
                  <span>Viajantes</span>
                </Label>
                <Input
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  placeholder="Passageiros e quartos"
                  className="h-11 min-h-11 px-3 text-xs font-medium rounded-xl border-border/80 bg-muted/20 focus-visible:ring-primary"
                />
              </div>

              {/* Botão de Ação Buscar */}
              <div className="md:col-span-1">
                <Button
                  type="submit"
                  size="default"
                  className="w-full h-11 min-h-11 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Search className="size-4 shrink-0" />
                  <span className="md:hidden">Buscar</span>
                </Button>
              </div>
            </div>

            {/* Presets de Destinos Rápidos */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2">
              <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
                Mais buscados:
              </span>
              {["Maceió", "Porto Seguro", "Punta Cana", "Rio de Janeiro", "Gramado", "Florianópolis"].map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDestination(preset)}
                    className="h-7 px-2.5 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted text-[11px] font-medium text-foreground transition-colors shrink-0 cursor-pointer"
                  >
                    {preset}
                  </button>
                )
              )}
            </div>
          </form>
        </div>

        {/* ── FAIXA DE BENEFÍCIOS E SEGURANÇA (SUB-HERO) ── */}
        {showBenefitsBar && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-xl border border-border/60 bg-card flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <CreditCard className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-foreground truncate">
                  Parcele em até 12x
                </h4>
                <p className="text-[11px] text-muted-foreground truncate">
                  Pix com desconto especial
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-card flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Tag className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-foreground truncate">
                  Cupons & Benefícios
                </h4>
                <p className="text-[11px] text-muted-foreground truncate">
                  Economia real garantida
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-card flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Headphones className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-foreground truncate">
                  Agente Especialista
                </h4>
                <p className="text-[11px] text-muted-foreground truncate">
                  Suporte VIP e consultoria humana
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-card flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <ShieldCheck className="size-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-foreground truncate">
                  Viagem Garantida
                </h4>
                <p className="text-[11px] text-muted-foreground truncate">
                  Cancelamento flexível e seguro
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
