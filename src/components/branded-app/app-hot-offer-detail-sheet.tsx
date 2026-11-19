import { useState } from "react";
import {
  Building2,
  Calendar,
  Car,
  CheckCircle2,
  CreditCard,
  Flame,
  MapPin,
  MessageCircle,
  Plane,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Users,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBrlFromCents, type HotOfferDTO } from "@/lib/tourism/hot-offer-sanitizer";
import { cn } from "@/lib/utils";

interface AppHotOfferDetailSheetProps {
  offer: HotOfferDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  storeWhatsapp?: string | null;
  onRequestCustomization?: (payload: {
    offer: HotOfferDTO;
    adultsCount: number;
    childrenCount: number;
    customNotes: string;
    estimatedTotalCents: number;
  }) => void;
}

export function AppHotOfferDetailSheet({
  offer,
  open,
  onOpenChange,
  storeName,
  storeWhatsapp,
  onRequestCustomization,
}: AppHotOfferDetailSheetProps) {
  const [selectedMediaIdx, setSelectedMediaIdx] = useState(0);
  const [customAdults, setCustomAdults] = useState(offer?.adults_base_count || 2);
  const [customChildren, setCustomChildren] = useState(offer?.children_base_count || 0);
  const [customNotes, setCustomNotes] = useState("");
  const [showCustomForm, setShowCustomForm] = useState(false);

  if (!offer) return null;

  const mediaList =
    offer.media_urls && offer.media_urls.length > 0
      ? offer.media_urls
      : [offer.story_media_url, offer.group_media_url].filter((u): u is string => Boolean(u));
  const activeMedia = mediaList[selectedMediaIdx] || mediaList[0] || null;
  const isVideo = activeMedia ? /\.(mp4|webm|mov)(\?|$)/i.test(activeMedia) : false;

  const baseAdults = Math.max(1, offer.adults_base_count || 2);
  const perAdultCents = Math.round(Math.max(0, offer.price_cents) / baseAdults);
  const simulatedTotalCents =
    customAdults * perAdultCents + Math.round(customChildren * perAdultCents * 0.65);

  const installmentsMax = Math.max(1, offer.installments_max || 10);
  const installmentValueCents = Math.round(simulatedTotalCents / installmentsMax);
  const pixPct = Number(offer.pix_discount_pct ?? 5);
  const pixTotalCents = Math.round(simulatedTotalCents * (1 - pixPct / 100));

  const isHotBlack = offer.badge_kind === "hot_black" || offer.flame_style === "hot_black";

  const handleOpenWhatsAppConsultant = (mode: "direct" | "customized") => {
    if (mode === "customized" && onRequestCustomization) {
      onRequestCustomization({
        offer,
        adultsCount: customAdults,
        childrenCount: customChildren,
        customNotes,
        estimatedTotalCents: simulatedTotalCents,
      });
    }

    const cleanPhone = (storeWhatsapp || "").replace(/\D/g, "");
    if (!cleanPhone) {
      onOpenChange(false);
      return;
    }

    const textLines = [
      `Olá ${storeName}! Vi a oferta *${offer.title}* (${offer.destination_city}) no App.`,
      mode === "customized"
        ? `Gostaria de personalizar para *${customAdults} adulto(s)*${
            customChildren > 0 ? ` e *${customChildren} criança(s)*` : ""
          } (Estimativa: ${formatBrlFromCents(simulatedTotalCents)}).`
        : `Tenho interesse na condição publicada de *${formatBrlFromCents(offer.price_cents)}* (${installmentsMax}x de ${formatBrlFromCents(
            Math.round(offer.price_cents / installmentsMax)
          )}).`,
      customNotes.trim() ? `Observações: ${customNotes.trim()}` : null,
    ].filter(Boolean);

    if (typeof window !== "undefined") {
      const waUrl = `https://wa.me/${cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`}?text=${encodeURIComponent(
        textLines.join("\n")
      )}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="app-hot-offer-detail-sheet"
        className="max-w-3xl max-h-dvh overflow-y-auto p-0 pt-safe-modal bg-background text-foreground z-50"
      >
        {/* Sticky Header inside App Sheet */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <Badge
              variant={isHotBlack ? "default" : "destructive"}
              className="gap-1 px-3 py-1 text-xs font-black uppercase shrink-0"
            >
              <Flame className="size-3.5" />
              {isHotBlack ? "HOT BLACK" : "HOT OFERTA"}
            </Badge>
            <DialogTitle className="text-sm font-bold text-foreground truncate">
              {offer.title}
            </DialogTitle>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar detalhes da oferta"
            className="flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full bg-muted/60 text-foreground hover:bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 pb-32 pb-safe">
          {/* 1. Galeria de Mídia com Aspect Ratio Fixo (Anti-CLS B.32) */}
          {activeMedia ? (
            <div className="space-y-2">
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-muted">
                {isVideo ? (
                  <video
                    src={activeMedia}
                    controls
                    playsInline
                    className="size-full object-cover"
                  />
                ) : (
                  <img
                    src={activeMedia}
                    alt={offer.title}
                    className="size-full object-cover"
                  />
                )}
                {offer.historical_savings_pct && offer.historical_savings_pct >= 5 ? (
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-foreground/90 text-background px-3 py-1 text-xs font-bold">
                    <TrendingDown className="size-3.5 text-warning" />
                    {Math.round(offer.historical_savings_pct)}% abaixo da média histórica
                  </span>
                ) : null}
              </div>

              {mediaList.length > 1 ? (
                <div className="carousel flex items-center gap-2 overflow-x-auto pb-1">
                  {mediaList.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setSelectedMediaIdx(idx)}
                      className={cn(
                        "relative h-14 w-20 shrink-0 overflow-hidden rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-ring",
                        idx === selectedMediaIdx ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"
                      )}
                    >
                      <img src={url} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* 2. Cabeçalho Comercial & Resumo de Preço */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                <MapPin className="size-3.5 text-primary" />
                {offer.destination_city}
              </span>
              {offer.nights_count > 0 ? <span>· {offer.nights_count} diárias</span> : null}
              {offer.departure_date ? (
                <span className="inline-flex items-center gap-1">
                  · <Calendar className="size-3.5" />
                  Saída {offer.departure_date.split("-").reverse().join("/")}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                · <Users className="size-3.5" /> Base {baseAdults} adulto(s)
              </span>
            </div>

            {offer.subtitle ? (
              <p className="text-sm text-muted-foreground">{offer.subtitle}</p>
            ) : null}

            {/* Bloco de Condições Comerciais */}
            <div className="rounded-2xl bg-muted/40 p-4 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="text-xs uppercase font-bold text-muted-foreground block">
                    Parcelamento Sem Juros
                  </span>
                  <p className="text-xl font-black text-foreground">
                    {installmentsMax}x de {formatBrlFromCents(installmentValueCents)}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    Total {formatBrlFromCents(simulatedTotalCents)} para {customAdults} adulto(s)
                    {customChildren > 0 ? ` + ${customChildren} criança(s)` : ""}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-600 block">
                    À vista no PIX ({pixPct}% OFF)
                  </span>
                  <p className="text-base font-black text-emerald-600">
                    {formatBrlFromCents(pixTotalCents)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                <span>
                  Oferta oficial verificada por <strong className="text-foreground">{storeName}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* 3. Voos Inclusos */}
          {Array.isArray(offer.flights) && offer.flights.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Plane className="size-4 text-primary" />
                Trechos Aéreos ({offer.flights.length})
              </h3>
              <div className="space-y-2">
                {offer.flights.map((fl, idx) => (
                  <div
                    key={fl.id || idx}
                    className="rounded-xl bg-muted/30 p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground">
                        {(fl as any).origin_code || fl.origin_iata || fl.origin_city} → {(fl as any).destination_code || fl.destination_iata || fl.destination_city}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        {fl.airline} {fl.flight_number ? `· Voo ${fl.flight_number}` : ""}
                      </span>
                    </div>
                    <div className="text-muted-foreground font-mono">
                      {fl.departure_date || ""} {fl.departure_time || ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* 4. Hospedagem Selecionada */}
          {Array.isArray(offer.hotels) && offer.hotels.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                Hospedagem Selecionada
              </h3>
              <div className="space-y-2">
                {offer.hotels.map((ht, idx) => (
                  <div key={ht.id || idx} className="rounded-xl bg-muted/30 p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-foreground">{ht.hotel_name}</span>
                      {(ht as any).nights || ht.nights_count ? (
                        <Badge variant="secondary" className="text-xs">
                          {(ht as any).nights || ht.nights_count} diárias
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground">
                      {[ht.room_type, (ht as any).meal_plan || ht.board_basis, (ht as any).location || ht.destination].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* 5. Traslados Ordenados Cronologicamente */}
          {Array.isArray(offer.transfers) && offer.transfers.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Car className="size-4 text-primary" />
                Traslados e Receptivo
              </h3>
              <div className="space-y-2">
                {offer.transfers.map((tr, idx) => (
                  <div
                    key={tr.id || idx}
                    className="rounded-xl bg-muted/30 p-3 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-semibold text-foreground">
                      {(tr as any).origin || tr.route || "Aeroporto"} → {(tr as any).destination || tr.route_name || "Hotel"}
                    </span>
                    <span className="text-muted-foreground">
                      {[tr.vehicle_type || tr.vehicle, (tr as any).date, tr.pickup_time].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* 6. Roteiro Dia a Dia */}
          {Array.isArray(offer.itinerary) && offer.itinerary.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                Roteiro Previsto ({offer.itinerary.length} dias)
              </h3>
              <div className="space-y-2">
                {offer.itinerary.map((day, idx) => (
                  <div key={day.id || idx} className="rounded-xl bg-muted/30 p-3 space-y-1 text-xs">
                    <span className="font-bold text-foreground">
                      Dia {day.day_number || idx + 1}: {day.title}
                    </span>
                    {day.description ? (
                      <p className="text-muted-foreground whitespace-pre-line break-words">
                        {day.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* 7. Inclusões */}
          {Array.isArray(offer.inclusions) && offer.inclusions.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" />
                O que está incluso
              </h3>
              <div className="flex flex-wrap gap-2">
                {offer.inclusions.map((item, idx) => (
                  <span
                    key={`${item}-${idx}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-1 text-xs text-foreground"
                  >
                    <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* 8. Simulador & Personalizador Individual */}
          {showCustomForm ? (
            <div className="rounded-2xl bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Personalizar esta Oferta para Minha Viagem
                </span>
                <span className="text-xs font-bold text-primary">
                  Estimativa: {formatBrlFromCents(simulatedTotalCents)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Adultos</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={customAdults}
                    onChange={(e) => setCustomAdults(Math.max(1, Number(e.target.value || 1)))}
                    className="h-11 min-h-11 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Crianças</Label>
                  <Input
                    type="number"
                    min={0}
                    max={8}
                    value={customChildren}
                    onChange={(e) => setCustomChildren(Math.max(0, Number(e.target.value || 0)))}
                    className="h-11 min-h-11 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Preferências (datas alternativas, quarto, idade das crianças)</Label>
                <Input
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Ex: Adicionar 1 criança de 5 anos / quarto triplo"
                  className="h-11 min-h-11 text-xs"
                />
              </div>
              <Button
                type="button"
                onClick={() => handleOpenWhatsAppConsultant("customized")}
                className="w-full h-11 min-h-11 text-xs font-bold gap-2"
              >
                <Sparkles className="size-4" />
                Solicitar Proposta Personalizada Agora
              </Button>
            </div>
          ) : null}
        </div>

        {/* Barra Inferior Fixa (z-30 < DialogOverlay z-50 conforme B.34) */}
        <div className="sticky bottom-0 z-30 flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-background/95 backdrop-blur border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowCustomForm((prev) => !prev)}
            className="h-11 min-h-11 px-4 text-xs font-bold gap-2 flex-1 sm:flex-initial"
          >
            <CreditCard className="size-4" />
            {showCustomForm ? "Ocultar Simulador" : "Personalizar para Mim"}
          </Button>
          <Button
            type="button"
            onClick={() => handleOpenWhatsAppConsultant("direct")}
            className="h-11 min-h-11 px-5 text-xs font-bold gap-2 flex-1 sm:flex-initial"
          >
            <MessageCircle className="size-4" />
            Quero esta Oferta / Falar com Consultor
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
