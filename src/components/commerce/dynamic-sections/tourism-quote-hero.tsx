import * as React from "react";
import { useState } from "react";
import { Plane, Calendar, Users, MapPin, Send, Layers, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { recordWhatsAppLead } from "@/services/whatsapp-leads.functions";
import { requestTravelQuote } from "@/services/tourism.functions";
import { cn } from "@/lib/utils";

export interface TourismQuoteHeroProps {
  title?: string;
  subtitle?: string;
  tagline?: string;
  badge?: string;
  bgImageUrl?: string;
  destinationPresets?: string[];
  whatsappPhone?: string;
  showOverlay?: boolean;
  storeData?: any;
}

export const TourismQuoteHero: React.FC<TourismQuoteHeroProps> = ({
  title = "Sua Próxima Viagem Começa Aqui",
  subtitle = "Roteiros exclusivos, cruzeiros, passagens aéreas e pacotes completos com assessoria especializada.",
  badge = "",
  bgImageUrl = "",
  destinationPresets = [],
  whatsappPhone,
  storeData,
}) => {
  const [destination, setDestination] = useState("");
  const [origin, setOrigin] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [passengers, setPassengers] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim() || !clientPhone.trim()) {
      toast.error("Por favor, preencha o destino e o WhatsApp para receber a cotação.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Registra no Kanban de Cotações da Agência (travel_quote_requests)
      await requestTravelQuote({
        data: {
          origin_city: origin.trim() || "A definir",
          destination_city: destination.trim(),
          departure_date: departureDate.trim() || undefined,
          rooms_count: 1,
          adults_count: 2,
          children_count: 0,
          children_ages: [],
          trip_type: "air_package",
          flexible_dates: true,
          contact_name: clientName.trim() || "Visitante Vitrine",
          contact_whatsapp: clientPhone.trim(),
          special_notes: passengers ? `Viajantes: ${passengers}` : undefined,
        },
      });

      // 2. Registra telemetria de Lead WhatsApp
      await recordWhatsAppLead({
        data: {
          entity_type: "tourism",
          entity_title: `Cotação ${destination} (${passengers || "2 adultos"})`,
          phone_target: clientPhone.trim(),
          device_type: "desktop",
          metadata: { notes: `Nome: ${clientName} | Origem: ${origin} | Data: ${departureDate}` },
        },
      });

      setSubmitted(true);
      toast.success("Solicitação de cotação enviada com sucesso!");

      const rawTarget = storeData?.phone || whatsappPhone || "";
      const cleanPhone = rawTarget.replace(/\D/g, "");
      const targetPhone = cleanPhone.length <= 11 && cleanPhone.length > 0 ? `55${cleanPhone}` : cleanPhone;

      if (targetPhone) {
        const msg = encodeURIComponent(
          `Olá! Solicitei uma cotação no site:\n\nDestino: ${destination}\nOrigem: ${origin}\nData: ${departureDate}\nPassageiros: ${passengers}\nNome: ${clientName}\n\nPoderiam me enviar os detalhes e valores disponíveis?`
        );
        setTimeout(() => {
          window.open(`https://wa.me/${targetPhone}?text=${msg}`, "_blank");
        }, 500);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao solicitar cotação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-background py-12 md:py-20 text-foreground border-b border-border/60">
      {/* Background Image with Semantic Overlay */}
      {bgImageUrl && (
        <div className="absolute inset-0 z-0">
          <img src={bgImageUrl} alt={title} className="size-full object-cover object-center opacity-20" />
          <div className="absolute inset-0 bg-background/85 backdrop-blur-xs" />
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          {/* Coluna Esquerda: Headline & Value Props */}
          <div className="space-y-6 lg:col-span-7">
            {badge && (
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-bold text-primary">
                <Layers className="size-4 text-primary" />
                <span>{badge}</span>
              </div>
            )}

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl leading-tight text-foreground">
              {title}
            </h1>

            <p className="max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
              {subtitle}
            </p>

            {/* Presets Rápidos de Destino */}
            {destinationPresets.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Destinos Mais Procurados:
                </p>
                <div className="flex flex-wrap gap-2">
                  {destinationPresets.map((dest, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setDestination(dest)}
                      className={cn(
                        "h-11 min-h-11 rounded-lg border px-4 text-xs font-medium transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        destination === dest
                          ? "border-primary bg-primary text-primary-foreground font-bold"
                          : "border-border bg-card text-foreground hover:bg-muted"
                      )}
                    >
                      {dest}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Badges de Confiança */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <span>Atendimento Personalizado</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <span>Parcelamento em até 12x</span>
              </div>
            </div>
          </div>

          {/* Coluna Direita: Card de Cotação Instantânea */}
          <div className="lg:col-span-5">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 space-y-1">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Plane className="size-4 text-primary" />
                  <span>Cotação Rápida de Viagem</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Receba opções de hotéis, voos e pacotes personalizados.
                </p>
              </div>

              {submitted ? (
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-6 text-center space-y-3">
                  <CheckCircle2 className="size-10 text-primary mx-auto" />
                  <h4 className="text-sm font-bold text-foreground">Cotação Encaminhada</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Nossos consultores já receberam sua solicitação e estão preparando as melhores tarifas.
                  </p>
                  <Button
                    onClick={() => setSubmitted(false)}
                    variant="outline"
                    size="sm"
                    className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold"
                  >
                    Nova Cotação
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">Para onde você quer viajar?</Label>
                    <div className="relative">
                      <MapPin className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Ex: Gramado, Maceió, Buenos Aires..."
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="pl-10 h-11 min-h-11 rounded-lg bg-background border-border text-xs text-foreground focus-visible:ring-primary"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground">Cidade de Origem</Label>
                      <Input
                        placeholder="Ex: Chapecó, São Paulo"
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        className="h-11 min-h-11 rounded-lg bg-background border-border text-xs text-foreground"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground">Data Prevista</Label>
                      <div className="relative">
                        <Calendar className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Mês ou Data"
                          value={departureDate}
                          onChange={(e) => setDepartureDate(e.target.value)}
                          className="pl-10 h-11 min-h-11 rounded-lg bg-background border-border text-xs text-foreground"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-foreground">Viajantes</Label>
                    <div className="relative">
                      <Users className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Ex: 2 adultos, 1 criança"
                        value={passengers}
                        onChange={(e) => setPassengers(e.target.value)}
                        className="pl-10 h-11 min-h-11 rounded-lg bg-background border-border text-xs text-foreground"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground">Seu Nome</Label>
                      <Input
                        placeholder="Nome completo"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="h-11 min-h-11 rounded-lg bg-background border-border text-xs text-foreground"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground">Seu WhatsApp</Label>
                      <Input
                        placeholder="(49) 99999-9999"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="h-11 min-h-11 rounded-lg bg-background border-border text-xs text-foreground"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 min-h-11 mt-2 rounded-lg text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Send className="size-4" />
                    <span>{isSubmitting ? "Enviando..." : "Solicitar Roteiro e Preços"}</span>
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TourismQuoteHero;
