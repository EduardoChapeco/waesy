import * as React from "react";
import { useState } from "react";
import {
  Hotel,
  Plane,
  Star,
  MapPin,
  Wifi,
  Coffee,
  Clock,
  Ban,
  Car,
  Compass,
  Plus,
  Check,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Layers,
  ArrowRight,
  Maximize2,
  Navigation,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface TravelProductDetailProps {
  hotelName?: string;
  destinationCity?: string;
  starsCount?: number;
  reviewScore?: number;
  reviewCount?: number;
  mainPhotoUrl?: string;
  galleryPhotos?: string[];
  nightsCount?: number;
  departureFlightText?: string;
  returnFlightText?: string;
  amenities?: string[];
  description?: string;
  neighborhoodPoints?: Array<{ name: string; distance: string }>;
  pricePerPersonCents?: number;
  totalPriceCents?: number;
  savedAmountCents?: number;
  roomType?: string;
  whatsappPhone?: string;
  onBookClick?: () => void;
}

export const TravelProductDetail: React.FC<TravelProductDetailProps> = ({
  hotelName = "",
  destinationCity = "",
  starsCount,
  reviewScore,
  reviewCount,
  mainPhotoUrl = "",
  galleryPhotos = [],
  nightsCount,
  departureFlightText,
  returnFlightText,
  amenities = [],
  description = "",
  neighborhoodPoints = [],
  pricePerPersonCents = 0,
  totalPriceCents = 0,
  savedAmountCents = 0,
  roomType = "Quarto Standard Casal (Café Incluso)",
  whatsappPhone = "",
  onBookClick,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleBook = () => {
    if (onBookClick) {
      onBookClick();
      return;
    }
    const cleanPhone = (whatsappPhone || "").replace(/\D/g, "");
    if (cleanPhone) {
      const msg = encodeURIComponent(
        `Olá! Gostaria de reservar o pacote *${hotelName}* (${destinationCity}) com ${nightsCount} noites por ${formatMoney(totalPriceCents)}.`
      );
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
    } else {
      toast.success("Iniciando fluxo de reserva...");
    }
  };

  return (
    <div className="w-full bg-background space-y-6 py-4 sm:py-8">
      {/* ── 1. BARRA DE RESUMO SUPERIOR DA RESERVA (ESTILO DECOLAR DETALHES) ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg border-0 bg-card p-3 sm:p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Box Hospedagem */}
          <div className="md:col-span-4 flex items-center gap-3 min-w-0 border-b md:border-b-0 md:border-r border-border/60 pb-3 md:pb-0 md:pr-4">
            <div className="size-14 rounded-lg overflow-hidden bg-muted shrink-0 border border-border/60">
              <img src={mainPhotoUrl} alt={hotelName} className="size-full object-cover" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                Café da manhã incluso
              </span>
              <h3 className="text-xs font-bold text-foreground truncate">{hotelName}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="font-bold text-foreground">{(reviewScore ?? 5).toFixed(1)}</span>
                <span>/ 5</span>
                <span>• {nightsCount} noites</span>
              </div>
            </div>
          </div>

          {/* Box Voo */}
          <div className="md:col-span-4 space-y-1 min-w-0 border-b md:border-b-0 md:border-r border-border/60 pb-3 md:pb-0 md:pr-4 text-xs">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Plane className="size-3.5 text-primary" />
              <span>Voos Inclusos</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{departureFlightText}</p>
            <p className="text-xs text-muted-foreground truncate">{returnFlightText}</p>
          </div>

          {/* Box Preço & Botão Comprar */}
          <div className="md:col-span-4 flex items-center justify-between gap-3">
            <div className="space-y-1">
              {savedAmountCents > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2 py-1"
                >
                  Economize {formatMoney(savedAmountCents)}
                </Badge>
              )}
              <div className="text-xs text-muted-foreground">
                Por pessoa: <strong className="text-foreground">{formatMoney(pricePerPersonCents)}</strong>
              </div>
              <div className="text-xs text-muted-foreground">
                Total 2 pessoas: {formatMoney(totalPriceCents)}
              </div>
            </div>

            <Button
              type="button"
              onClick={handleBook}
              className="h-11 min-h-11 px-6 rounded-lg text-xs font-black bg-primary text-primary-foreground hover:bg-primary/90 transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
            >
              Comprar
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. GALERIA MASONRY DE FOTOS ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        /* design-lint-ignore DL-02 reason:"Altura panorâmica de 280px mobile e 420px desktop para galeria de fotos de hotel" expiry:"2027-12-31" */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-[280px] sm:h-[420px] rounded-lg overflow-hidden border border-border/80 relative">
          {/* Foto Principal Esquerda (7 colunas) */}
          <div className="md:col-span-7 h-full relative group cursor-pointer overflow-hidden">
            <img
              src={mainPhotoUrl}
              alt={hotelName}
              className="size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
            />
            {/* design-lint-ignore DL-08 reason:"Scrim fotográfico sobre galeria de hotel per B.32" expiry:"2027-12-31" */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Grid Miniaturas Direita (5 colunas) */}
          <div className="hidden md:grid md:col-span-5 grid-rows-3 gap-3 h-full">
            {galleryPhotos.slice(0, 3).map((photo, idx) => (
              <div key={idx} className="relative group cursor-pointer overflow-hidden rounded-lg">
                <img
                  src={photo}
                  alt={`Foto ${idx + 1}`}
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
                />
              </div>
            ))}
          </div>

          {/* Botão Flutuante Ver Galeria */}
          <div className="absolute bottom-3 right-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSelectedImage(mainPhotoUrl || galleryPhotos[0] || null)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold bg-background hover:bg-muted text-foreground border border-border/60 gap-2 cursor-pointer transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Maximize2 className="size-3.5" />
              <span>Ver todas as fotos</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── 3. COLUNAS 70% / 30% (DETALHES + STICKY SIDEBAR) ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna de Conteúdo (8 colunas ~ 70%) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Header com Nome, Estrelas e Mapa */}
            <div className="space-y-2">
              {typeof starsCount === "number" && starsCount > 0 ? (
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: starsCount }).map((_, i) => (
                    <Star key={i} className="size-4 fill-amber-500" />
                  ))}
                </div>
              ) : null}
              <h1 className="text-xl sm:text-3xl font-black text-foreground tracking-tight">
                {hotelName}
              </h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-4 text-primary shrink-0" />
                <span>{destinationCity}</span>
                <button
                  type="button"
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationCity || hotelName)}`, "_blank", "noopener,noreferrer")}
                  className="font-bold text-primary hover:underline cursor-pointer ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                >
                  Ver no mapa
                </button>
              </div>
            </div>

            {/* Score de Avaliação Real (Omitido se não houver reviews reais — Invariante B.33) */}
            {typeof reviewScore === "number" &&
            reviewScore > 0 &&
            typeof reviewCount === "number" &&
            reviewCount > 0 ? (
              <div className="p-4 rounded-lg border border-border/70 bg-card flex items-center gap-4">
                <div className="size-12 rounded-lg bg-primary text-primary-foreground font-black text-lg flex items-center justify-center shrink-0">
                  {reviewScore.toFixed(1)}
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">Avaliações Verificadas</h4>
                  <p className="text-xs text-muted-foreground">
                    Com base em {reviewCount} avaliações reais de viajantes
                  </p>
                </div>
              </div>
            ) : null}

            {/* A Hospedagem Oferece (Comodidades) */}
            <div className="space-y-3 pt-2">
              <h3 className="text-base font-bold text-foreground">A hospedagem oferece</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {amenities.map((amenity, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-border/60 bg-muted/20 flex items-center gap-2 text-xs text-foreground font-medium"
                  >
                    <Check className="size-4 text-emerald-500 shrink-0" />
                    <span className="truncate">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Conheça um pouco mais */}
            <div className="space-y-2 pt-2">
              <h3 className="text-base font-bold text-foreground">Conheça um pouco mais</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>

            {/* Explore a Vizinhança */}
            <div className="space-y-3 pt-2">
              <h3 className="text-base font-bold text-foreground">Explore a vizinhança</h3>
              <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
                {neighborhoodPoints.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 border-b last:border-b-0 border-border/40"
                  >
                    <div className="flex items-center gap-2">
                      <Navigation className="size-3.5 text-primary" />
                      <span className="font-medium text-foreground">{point.name}</span>
                    </div>
                    <span className="text-muted-foreground font-mono">{point.distance}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna Sticky Sidebar (4 colunas ~ 30%) */}
          <div className="lg:col-span-4 sticky top-24 space-y-4">
            <div className="rounded-lg border-0 bg-card p-5 space-y-4">
              {savedAmountCents > 0 && (
                <div className="inline-block">
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2 py-1"
                  >
                    Economize {formatMoney(savedAmountCents)}
                  </Badge>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium block">
                  {roomType}
                </span>
                <div className="text-2xl font-black text-foreground">
                  {formatMoney(pricePerPersonCents)}
                </div>
                <span className="text-xs text-muted-foreground block">
                  Preço por pessoa • Total 2 pessoas {formatMoney(totalPriceCents)}
                </span>
                <span className="text-xs text-muted-foreground block">
                  Taxas e impostos inclusos
                </span>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleBook}
                  className="w-full h-11 min-h-11 rounded-lg text-xs font-black bg-primary text-primary-foreground hover:bg-primary/90 transition-colors motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Ver Quartos & Reservar
                </Button>
              </div>

              <div className="pt-2 border-t border-border/60 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                  <span>Reserva segura com confirmação imediata</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-primary shrink-0" />
                  <span>Cancelamento flexível disponível</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Ampliação de Foto */}
      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Foto ampliada da acomodação"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Escape') setSelectedImage(null); }}
          className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          onClick={() => setSelectedImage(null)}
        >
          <div /* design-lint-ignore DL-15 reason:"Conteiner nao interativo; onClick apenas isola propagacao de evento" expiry:"2027-12-31" */
            className="relative max-w-4xl max-h-screen overflow-hidden rounded-lg bg-card border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* design-lint-ignore DL-02 reason:"Teto de visualização de 80vh para modal de foto de hotel" expiry:"2027-12-31" */}
            <img src={selectedImage} alt={hotelName} className="w-full h-auto object-contain max-h-[80vh]" />
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 size-11 flex items-center justify-center bg-background/80 hover:bg-background text-foreground rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              aria-label="Fechar galeria"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Export alias for compatibility with builder registry
export const TravelProductDetailSection = TravelProductDetail;

