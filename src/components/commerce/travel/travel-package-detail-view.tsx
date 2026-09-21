import React, { useState } from "react";
import { Plane, Bus, Ship, Anchor, Layers, Hotel, Calendar, Compass, MapPin, Clock, Check, ChevronRight, ExternalLink, MessageCircle, Share2, Sliders, Sun, CloudSun, CloudRain, ShieldCheck, ShieldAlert, Camera, Star, Coffee, Car, Ticket, Users, Utensils, ArrowRight, Info, Luggage, X, Edit3, Navigation } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { TravelPackageData } from "@/types/travel-package";
import { WeatherWidget } from "@/components/classifieds/weather-widget";
import { MapLibreCanvas } from "@/components/mobility/maplibre-canvas";
import {
  CANONICAL_BUS_CATEGORIES,
  CANONICAL_GUIDE_SERVICES,
  DEPARTURE_STATUS_CONFIG,
  type DepartureOption,
} from "@/lib/classifieds/canonical-airports";

interface TravelPackageDetailViewProps {
 packageData?: Partial<TravelPackageData>;
 productTitle: string;
 priceCents: number;
 compareAtCents?: number | null;
 coverImageUrl?: string | null;
 mediaUrls?: string[];
 storeName?: string;
 storePhone?: string;
  onReserveClick?: (selectedDeparture?: DepartureOption) => void;
  isInteractivePreview?: boolean;
  isOwner?: boolean;
  onEditClick?: () => void;
}

export function TravelPackageDetailView({
  packageData,
  productTitle,
  priceCents,
  compareAtCents,
  coverImageUrl,
  mediaUrls = [],
  storeName = "Agência Parceira",
  storePhone = "",
  onReserveClick,
  isInteractivePreview = false,
  isOwner = false,
  onEditClick,
}: TravelPackageDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"destination" | "resort" | "itinerary" | "explore">("destination");
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({ 1: true });
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(null);

 const destination = (packageData?.destination || {}) as any;
 const resort = (packageData?.resort || {}) as any;
 const flightDetails = (packageData?.flight_details || {}) as any;
 // Suporta tanto os IDs canônicos novos ('bus', 'airplane', 'combo', 'cruise', 'car', 'hotel_only')
 // quanto os IDs legado do TravelPackageData ('aereo', 'terrestre', 'misto', 'cruzeiro')
 const rawTransportType = packageData?.transport_type || flightDetails?.transport_type || "aereo";
 // Normaliza para os novos IDs canônicos
 const transportTypeNormMap: Record<string, string> = {
  aereo: "airplane",
  airplane: "airplane",
  terrestre: "bus",
  bus: "bus",
  misto: "combo",
  combo: "combo",
  cruzeiro: "cruise",
  cruise: "cruise",
  car: "car",
  hotel_only: "hotel_only",
 };
 const transportType = transportTypeNormMap[rawTransportType] || rawTransportType;
  const isBus = transportType === "bus" || rawTransportType === "terrestre";
  const isAir = transportType === "airplane" || rawTransportType === "aereo" || !transportType;
  const isCombo = transportType === "combo" || rawTransportType === "misto";
  const isCruise = transportType === "cruise" || rawTransportType === "cruzeiro";
  const isCar = transportType === "car" || transportType === "hotel_only";

  const transportLabel: Record<string, string> = {
    airplane: "✈️ Aéreo",
    bus: "🚌 Terrestre / Excursão",
    combo: "🔄 Multimodal",
    cruise: "🛳️ Cruzeiro",
    car: "🚗 Carro Próprio",
    hotel_only: "🏨 Pacote Local",
  };
  const departureOptions: DepartureOption[] = Array.isArray((packageData as any)?.departure_options)
    ? (packageData as any).departure_options
    : [];

 const inclusions = packageData?.inclusions && packageData.inclusions.length > 0
 ? packageData.inclusions
 : [];

 const exclusions = packageData?.exclusions && packageData.exclusions.length > 0
 ? packageData.exclusions
 : [];

 const itineraryDays = packageData?.itinerary_days && packageData.itinerary_days.length > 0
 ? packageData.itinerary_days
 : [];

 const recommendations = packageData?.recommendations && packageData.recommendations.length > 0
 ? packageData.recommendations
 : [];

 const heroImage =
 coverImageUrl ||
 mediaUrls[0] ||
 "";

 const gallery =
 destination.gallery_urls && destination.gallery_urls.length > 0
 ? destination.gallery_urls
 : mediaUrls.length > 0
 ? mediaUrls
 : heroImage
 ? [heroImage]
 : [];

 // Condições Comerciais Configuradas pelo Gestor (Bilateral)
 const paymentConditions = packageData?.payment_conditions;
 const maxInstallments = paymentConditions?.installments_max ? Math.max(1, paymentConditions.installments_max) : 0;
 const feeFreeInstallments = maxInstallments > 0 ? Math.min(maxInstallments, paymentConditions?.installments_fee_free || maxInstallments) : 0;
 const pixDiscountPercent = paymentConditions?.pix_discount_percent || 0;
 const depositPercent = paymentConditions?.deposit_percent || 0;

 const selectedDeparture = departureOptions.find(d => (d.id || "") === selectedDepartureId) || departureOptions[0] || null;
 const effectivePriceCents = (selectedDeparture?.price_override_cents && selectedDeparture.price_override_cents > 0)
 ? selectedDeparture.price_override_cents
 : priceCents;

 const totalCents = effectivePriceCents > 0 ? effectivePriceCents : 0;
 const isPriceOnQuote = totalCents === 0;
 const installmentCents = maxInstallments > 0 && totalCents > 0 ? Math.round(totalCents / maxInstallments) : 0;
 const formattedTotal = totalCents > 0 ? formatMoney(totalCents) : "Sob Consulta";
 const formattedInstallment = installmentCents > 0 ? formatMoney(installmentCents) : "—";
 const pixTotalCents = pixDiscountPercent > 0 && totalCents > 0 ? Math.round(totalCents * (1 - pixDiscountPercent / 100)) : totalCents;
 const formattedPixTotal = pixTotalCents > 0 ? formatMoney(pixTotalCents) : "—";

 const toggleDay = (day: number) => {
 setExpandedDays((prev) => ({ ...prev, [day]: !prev[day] }));
 };

 const handleBooking = () => {
 if (onReserveClick) {
 onReserveClick(selectedDeparture || undefined);
 return;
 }
 const cleanPhone = storePhone ? storePhone.replace(/\D/g, "") : "";
 const depInfo = selectedDeparture && selectedDeparture.departure_date
 ? ` para a saída de ${new Date(selectedDeparture.departure_date + "T00:00:00").toLocaleDateString("pt-BR")}${selectedDeparture.return_date ? ` até ${new Date(selectedDeparture.return_date + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}`
 : "";
 const paymentDesc = maxInstallments > 0
 ? `(Valor: ${formattedTotal} em até ${maxInstallments}x de ${formattedInstallment})`
 : `(Valor: ${formattedTotal} à vista)`;
 const message = encodeURIComponent(
 totalCents > 0
 ? `Olá! Tenho interesse no pacote *${productTitle}*${depInfo} ${paymentDesc}. Poderiam me enviar mais detalhes de datas e confirmação de reserva?`
 : `Olá! Tenho interesse no pacote *${productTitle}*${depInfo}. Poderiam me enviar mais detalhes de datas, disponibilidade e orçamento?`
 );
 if (cleanPhone) {
 window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
 } else {
 window.open(`https://wa.me/?text=${message}`, "_blank");
 }
 };

 return (
 <div className="w-full bg-background text-foreground flex flex-col min-h-screen relative select-none">
 {/* ── 1. Barra Superior de Abas (Estilo App Nativo de Viagem) ── */}
 <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/70 shadow-2xs">
 <div className="flex items-center justify-between px-4 h-12 max-w-4xl mx-auto w-full">
 <div className="flex items-center gap-2 truncate">
 <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
 Pacote Oficial
 </span>
 <span className="text-xs text-muted-foreground">•</span>
 <span className="text-xs font-semibold text-foreground truncate max-w-[180px] sm:max-w-xs">
 {productTitle}
 </span>
 </div>

        <div className="flex items-center gap-2">
          {resort.duration_text && (
            <span className="text-[11px] font-mono text-muted-foreground border border-border/80 px-2 py-0.5 rounded-full">
              {resort.duration_text}
            </span>
          )}
          {isOwner && onEditClick && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEditClick}
              className="h-7 text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 gap-1.5"
            >
              <Edit3 className="size-3.5" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* ── Painel de Controle do Proprietário (Regra 23: Owner Edit Mode) ── */}
      {isOwner && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
            <Sliders className="size-3.5 shrink-0" />
            <span>Modo Proprietário: Visualização do Pacote Turístico.</span>
          </div>
          {onEditClick && (
            <button
              onClick={onEditClick}
              className="text-amber-600 dark:text-amber-400 hover:underline font-semibold flex items-center gap-1"
            >
              <Edit3 className="size-3" />
              Editar no Gestor
            </button>
          )}
        </div>
      )}

 {/* 4 Abas com Indicador Limpo */}
 <nav className="flex w-full max-w-4xl mx-auto px-2 justify-between border-t border-border/40 text-xs font-semibold">
 <button
 type="button"
 onClick={() => setActiveTab("destination")}
 className={cn(
 "relative flex-1 flex items-center justify-center gap-1.5 py-3 transition-colors cursor-pointer",
 activeTab === "destination"
 ? "text-primary font-bold after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-8 after:h-0.5 after:bg-primary after:rounded-full"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <Camera className="size-3.5" />
 <span>Destino</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveTab("resort")}
 className={cn(
 "relative flex-1 flex items-center justify-center gap-1.5 py-3 transition-colors cursor-pointer",
 activeTab === "resort"
 ? "text-primary font-bold after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-8 after:h-0.5 after:bg-primary after:rounded-full"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <Hotel className="size-3.5" />
 <span>Hospedagem</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveTab("itinerary")}
 className={cn(
 "relative flex-1 flex items-center justify-center gap-1.5 py-3 transition-colors cursor-pointer",
 activeTab === "itinerary"
 ? "text-primary font-bold after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-8 after:h-0.5 after:bg-primary after:rounded-full"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <Calendar className="size-3.5" />
 <span>Roteiro</span>
 </button>

 <button
 type="button"
 onClick={() => setActiveTab("explore")}
 className={cn(
 "relative flex-1 flex items-center justify-center gap-1.5 py-3 transition-colors cursor-pointer",
 activeTab === "explore"
 ? "text-primary font-bold after:content-[''] after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-8 after:h-0.5 after:bg-primary after:rounded-full"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <Compass className="size-3.5" />
 <span>Voos & Mapa</span>
 </button>
 </nav>
 </header>

 {/* ── 2. Conteúdo Principal das Abas ── */}
 <main className="flex-1 pb-32 max-w-4xl mx-auto w-full">
 {/* ── ABA 1: DESTINO ── */}
 {activeTab === "destination" && (
 <div className="flex flex-col w-full space-y-6 animate-in fade-in duration-200">
 {/* Hero Panorâmico com Gradiente Editorial */}
 <div className="relative w-full h-[50vh] min-h-[350px] max-h-[500px] overflow-hidden sm:rounded-b-3xl">
 <img src={heroImage} alt={productTitle} className="absolute inset-0 size-full object-cover" />
 <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
 <div className="absolute bottom-0 left-0 w-full p-5 sm:p-7 flex flex-col justify-end text-white">
 {(destination.country || destination.region || destination.state) && (
 <div className="flex items-center gap-2 mb-1.5">
 {destination.country && (
 <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md uppercase tracking-wider">
 {destination.country}
 </span>
 )}
 {destination.country && (destination.region || destination.state) && (
 <span className="text-xs text-white/80">•</span>
 )}
 {(destination.region || destination.state) && (
 <span className="text-xs text-white/90 font-medium">{destination.region || destination.state}</span>
 )}
 </div>
 )}
 <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight drop-shadow-sm">
 {destination.name || productTitle}
 </h1>
 <p className="text-xs sm:text-sm text-white/85 mt-1 max-w-md line-clamp-2 leading-relaxed">
 {resort.name || "Experiência completa com hospedagem, lazer e atrações locais."}
 </p>
 </div>
 </div>

 {/* Destaques em Círculos Visuais (Apenas se cadastrados) */}
 {((packageData?.story_highlights && packageData.story_highlights.length > 0) || (resort.highlights && resort.highlights.length > 0)) && (
 <section className="w-full pt-1 pb-2 overflow-x-auto no-scrollbar">
 <div className="flex gap-4 px-4 sm:px-6">
 {(packageData?.story_highlights || resort.highlights || []).map((hl: any) => (
 <div key={hl.id} className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group">
 <div className="size-16 sm:size-18 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-400 via-rose-500 to-sky-500 group-hover:scale-105 transition-transform shadow-2xs">
 <div className="size-full rounded-full bg-background p-[2px] overflow-hidden">
 <img src={hl.imageUrl || hl.image} alt={hl.label || hl.title || "Destaque"} className="size-full object-cover rounded-full" />
 </div>
 </div>
 <span className="text-[11px] font-medium text-foreground tracking-tight text-center max-w-[68px] truncate">
 {hl.label || hl.title}
 </span>
 </div>
 ))}
 </div>
 </section>
 )}

 {/* Checklist de Inclusões ("O que inclui") */}
 <section className="px-4 sm:px-6 space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
 <ShieldCheck className="size-4 text-emerald-500" />
 <span>O que está incluso neste pacote</span>
 </h3>
 <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
 {inclusions.length} inclusões
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {inclusions.map((item, idx) => (
 <div
 key={idx}
 className="p-3 rounded-xl bg-card border border-border/70 flex items-center gap-2.5 shadow-2xs"
 >
 <div className="size-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
 <Check className="size-3.5 stroke-[2.5]" />
 </div>
 <span className="text-xs font-semibold text-foreground">{item}</span>
 </div>
 ))}
 </div>
 </section>

 {/* Checklist de Exclusões ("O que NÃO inclui") */}
 {exclusions.length > 0 && (
 <section className="px-4 sm:px-6 space-y-3">
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
 <ShieldAlert className="size-4 text-amber-500" />
 <span>Não incluso (serviços opcionais / à parte)</span>
 </h3>
 <span className="text-[11px] font-mono text-muted-foreground">{exclusions.length} itens</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {exclusions.map((item, idx) => (
 <div
 key={idx}
 className="p-3 rounded-xl bg-muted/30 border border-border/60 flex items-center gap-2.5"
 >
 <div className="size-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
 <X className="size-3.5 stroke-[2.5]" />
 </div>
 <span className="text-xs font-medium text-muted-foreground">{item}</span>
 </div>
 ))}
 </div>
 </section>
 )}

      {/* Datas & Saídas Confirmadas do Pacote (Transparência de Dados) */}
      {departureOptions.length > 0 && (
        <section className="px-4 sm:px-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="size-4 text-primary" />
              <span>Datas & Saídas Disponíveis</span>
            </h3>
            <span className="text-[11px] font-mono text-primary font-semibold">
              {departureOptions.length} opções de embarque
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {departureOptions.map((opt, i) => {
              const cfg = DEPARTURE_STATUS_CONFIG[opt.status] || DEPARTURE_STATUS_CONFIG.confirmed;
              const depDate = opt.departure_date ? new Date(opt.departure_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
              const retDate = opt.return_date ? new Date(opt.return_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
              const optId = opt.id || String(i);
              const isSelected = selectedDepartureId === optId || (!selectedDepartureId && i === 0);
              return (
                <div
                  key={opt.id || i}
                  onClick={() => setSelectedDepartureId(selectedDepartureId === optId ? null : optId)}
                  className={cn(
                    "p-3.5 rounded-xl bg-card border transition-all flex flex-col justify-between gap-2.5 shadow-2xs cursor-pointer text-left",
                    isSelected
                      ? "border-primary ring-2 ring-primary/25 bg-primary/5"
                      : "border-border/70 hover:border-primary/40 hover:bg-muted/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-foreground">
                          {opt.label || `Saída ${i + 1}`}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            ✓ Selecionada
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {depDate}{depDate && retDate && " — "}{retDate}
                      </p>
                      {opt.departure_time && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Embarque: <span className="font-bold text-foreground">{opt.departure_time}</span>
                        </p>
                      )}
                    </div>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0", cfg.color)}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[11px]">
                    <span className="text-muted-foreground">
                      {opt.available_seats !== undefined && opt.available_seats > 0 ? `${opt.available_seats} vagas disponíveis` : "Vagas limitadas"}
                    </span>
                    {opt.price_override_cents && opt.price_override_cents > 0 ? (
                      <span className="font-mono font-bold text-foreground">
                        {formatMoney(opt.price_override_cents)}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

 {/* Informações de Como Chegar & Clima */}
 <section className="px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
 {/* Card de Como Chegar */}
 <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border/70 space-y-2.5 shadow-2xs">
 <div className="flex items-center gap-2 text-foreground">
 <Plane className="size-4 text-primary" />
 <h4 className="text-xs font-bold uppercase tracking-wider">Como Chegar</h4>
 </div>
 <p className="text-xs text-muted-foreground leading-relaxed">
 {destination.flight_summary ||
 "Consulte opções de traslados, conexões aéreas e saídas disponíveis com nossa equipe de consultores."}
 </p>
 <div className="flex items-center gap-1.5 text-xs font-semibold text-primary pt-1">
 <span>Opções com logística garantida</span>
 <ChevronRight className="size-3.5" />
 </div>
 </div>

 {/* Card de Clima Real via wttr.in (Regra 21) */}
 {(destination.name || destination.city) && (
 <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border/70 space-y-2.5 shadow-2xs">
 <div className="flex items-center gap-2 text-foreground">
 <Sun className="size-4 text-amber-500" />
 <h4 className="text-xs font-bold uppercase tracking-wider">Clima no Destino</h4>
 </div>
 <WeatherWidget city={destination.city || destination.name} compact={true} />
 </div>
 )}
 </section>

 {/* Galeria do Destino (Apenas se houver fotos cadastradas) */}
 {gallery.length > 0 && (
 <section className="px-4 sm:px-6 space-y-2.5">
 <div className="flex items-center justify-between">
 <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Galeria do Destino
 </h3>
 <span className="text-[11px] text-muted-foreground font-mono">{gallery.length} fotos</span>
 </div>
 <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden border border-border/50">
 {gallery.slice(0, 6).map((imgUrl: string, i: number) => (
 <div key={i} className="aspect-square bg-muted/40 relative overflow-hidden group">
 <img
 src={imgUrl}
 alt={`Galeria ${i + 1}`}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 </div>
 ))}
 </div>
 </section>
 )}
 </div>
 )}

 {/* ── ABA 2: RESORT & HOSPEDAGEM (PERFIL VISUAL) ── */}
 {activeTab === "resort" && (
 <div className="px-4 sm:px-6 py-4 space-y-6 animate-in fade-in duration-200">
 {/* Header Perfil Visual do Resort */}
 <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 space-y-4 shadow-2xs">
 <div className="flex items-center justify-between gap-4">
 {/* Foto com anel gradiente de viagem */}
 <div className="relative shrink-0">
 <div className="size-20 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-400 via-rose-500 to-sky-500">
 <div className="size-full bg-background rounded-full p-[2px] overflow-hidden">
 <img
 src={resort.cover_image_url || heroImage}
 alt={resort.name || "Resort"}
 className="size-full object-cover rounded-full"
 />
 </div>
 </div>
 <span className="absolute bottom-0 right-0 size-5 bg-sky-500 text-white rounded-full flex items-center justify-center ring-2 ring-background">
 <Check className="size-3 stroke-[3]" />
 </span>
 </div>

 {/* 3 Estatísticas do Pacote */}
 <div className="flex-1 grid grid-cols-3 text-center divide-x divide-border/60">
 <div className="flex flex-col">
 <span className="font-bold text-sm sm:text-base text-foreground">
 {resort.duration_text || "—"}
 </span>
 <span className="text-[10px] text-muted-foreground">Duração</span>
 </div>
 <div className="flex flex-col">
 <span className="font-bold text-sm sm:text-base text-foreground">
 {resort.meal_plan || "—"}
 </span>
 <span className="text-[10px] text-muted-foreground">Regime</span>
 </div>
 <div className="flex flex-col">
 <span className="font-bold text-sm sm:text-base text-foreground">
 {resort.guests_text || "—"}
 </span>
 <span className="text-[10px] text-muted-foreground">Hóspedes</span>
 </div>
 </div>
 </div>

 {/* Informações de Bio */}
 <div className="space-y-1.5 text-xs">
 <div className="flex items-center gap-1.5 font-bold text-foreground">
 <span>{resort.name || productTitle}</span>
 <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 font-semibold">
 Oficial
 </span>
 </div>
 <p className="text-[11px] text-muted-foreground">
 {resort.location || destination.name || ""}
 </p>

 {/* Bullet Points da Hospedagem */}
 <div className="space-y-1 pt-1 text-xs text-foreground/90">
 {resort.bio_bullets && resort.bio_bullets.length > 0
 ? resort.bio_bullets.map((bullet: string, i: number) => (
 <p key={i} className="leading-snug">{bullet}</p>
 ))
 : null}
 </div>

 {/* Badges / Tags */}
 <div className="flex flex-wrap gap-1.5 pt-2">
 {resort.badges && resort.badges.length > 0
 ? resort.badges.map((b: string, i: number) => (
 <span
 key={i}
 className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border/50"
 >
 {b}
 </span>
 ))
 : null}
 </div>
 </div>
 </div>

 {/* Card de Condição Comercial & Preço */}
 <div className="bg-card border border-border/70 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
 <div className="space-y-0.5">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 {totalCents > 0
 ? maxInstallments > 0
 ? feeFreeInstallments >= maxInstallments
 ? "Parcelamento sem juros"
 : `Parcelamento facilitado (${feeFreeInstallments}x sem juros)`
 : "Pagamento à Vista"
 : "Condição Comercial"}
 </span>
 <div className="flex items-baseline gap-1">
 {totalCents > 0 ? (
 maxInstallments > 0 ? (
 <>
 <span className="text-xl font-bold text-foreground">{maxInstallments}x</span>
 <span className="text-sm font-bold text-foreground">{formattedInstallment}</span>
 </>
 ) : (
 <span className="text-xl font-bold text-foreground tracking-tight">{formattedTotal}</span>
 )
 ) : (
 <span className="text-lg font-bold text-foreground">Sob Consulta</span>
 )}
 </div>
 <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
 {totalCents > 0 ? (
 <>
 {maxInstallments > 0 && <span>Total: {formattedTotal}</span>}
 {pixDiscountPercent > 0 && (
 <span className="text-emerald-600 font-semibold">
 {maxInstallments > 0 ? "• " : ""}{formattedPixTotal} à vista no PIX ({pixDiscountPercent}% OFF)
 </span>
 )}
 </>
 ) : (
 <span>Consulte datas e tarifas com os consultores</span>
 )}
 </div>
 </div>
 {depositPercent > 0 ? (
 <span className="text-xs font-mono font-bold text-primary">
 Sinal: {depositPercent}%
 </span>
 ) : totalCents > 0 ? (
 <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
 Melhor Tarifa
 </span>
 ) : null}
 </div>

 {/* Grid 3x3 de Fotos das Acomodações (Apenas se houver fotos) */}
 {gallery.length > 0 && (
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Fotos da Estrutura
 </h4>
 <span className="text-[11px] text-muted-foreground font-mono">{gallery.length} fotos</span>
 </div>
 <div className="grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden border border-border/50">
 {gallery.slice(0, 6).map((imgUrl: string, i: number) => (
 <div key={i} className="aspect-square bg-muted/40 overflow-hidden group">
 <img
 src={imgUrl}
 alt="Resort"
 className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
 />
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {/* ── ABA 3: ROTEIRO DIA A DIA (TIMELINE EXPANSÍVEL) ── */}
 {activeTab === "itinerary" && (
 <div className="px-4 sm:px-6 py-4 space-y-6 animate-in fade-in duration-200">
 <div className="flex items-center justify-between pb-1 border-b border-border/40">
 <div className="space-y-0.5">
 <h3 className="text-sm font-bold text-foreground">Roteiro Completo Dia a Dia</h3>
 <p className="text-xs text-muted-foreground">Programação detalhada das suas férias</p>
 </div>
 <span className="text-xs font-mono text-muted-foreground border border-border/60 px-2 py-0.5 rounded-full">
 {itineraryDays.length} Dias
 </span>
 </div>

 {/* Timeline Vertical Contínua */}
 <div className="relative pl-7 sm:pl-8 space-y-6">
 {/* Linha vertical contínua */}
 <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-border/80 rounded-full" />

 {itineraryDays.map((day) => {
 const isExpanded = !!expandedDays[day.day];

 return (
 <div key={day.id || day.day} className="relative group cursor-pointer" onClick={() => toggleDay(day.day)}>
 {/* Marcador Circular Numerado */}
 <div
 className={cn(
 "absolute -left-7 sm:-left-8 top-0.5 size-6 rounded-full border-2 flex items-center justify-center text-[11px] font-bold z-10 transition-colors",
 isExpanded
 ? "bg-primary border-primary text-primary-foreground"
 : "bg-background border-border text-muted-foreground group-hover:border-primary/60"
 )}
 >
 {day.day}
 </div>

 {/* Conteúdo do Card do Dia */}
 <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/70 hover:border-primary/40 transition-all space-y-2 shadow-2xs">
 <div className="flex items-baseline justify-between gap-2">
 <div className="flex items-center gap-2">
 <h4 className="text-xs sm:text-sm font-bold text-foreground">{day.title}</h4>
 {day.period && (
 <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
 {day.period}
 </span>
 )}
 </div>
 {day.date && <span className="text-[11px] font-mono text-muted-foreground shrink-0">{day.date}</span>}
 </div>

 <p
 className={cn(
 "text-xs text-muted-foreground leading-relaxed transition-all",
 !isExpanded && "line-clamp-2"
 )}
 >
 {day.description}
 </p>

 {/* Imagem do dia (se houver e estiver expandido) */}
 {day.imageUrl && isExpanded && (
 <div className="w-full h-36 sm:h-44 rounded-xl overflow-hidden mt-2 border border-border/50">
 <img src={day.imageUrl} alt={day.title} className="size-full object-cover" />
 </div>
 )}

 <div className="flex items-center justify-between pt-1 text-[11px] text-primary font-semibold">
 <span>{isExpanded ? "Recolher detalhes" : "Ver programação completa"}</span>
 <ChevronRight className={cn("size-3.5 transition-transform", isExpanded && "rotate-90")} />
 </div>
 </div>
 </div>
 );
 })}
 </div>

 {/* Recomendações Próximas (Curadoria de Restaurantes e Praias) */}
 {recommendations.length > 0 && (
 <div className="pt-4 border-t border-border/40 space-y-3">
 <div>
 <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Recomendações Próximas
 </h4>
 <p className="text-[11px] text-muted-foreground">Curadoria gastronômica e pontos de interesse</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {recommendations.map((rec, i) => (
 <div key={rec.id || i} className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center gap-3">
 <div className="size-14 rounded-lg overflow-hidden shrink-0 bg-muted">
 {rec.imageUrl ? (
 <img src={rec.imageUrl} alt={rec.title} className="size-full object-cover" />
 ) : (
 <div className="size-full flex items-center justify-center text-muted-foreground">
 <Utensils className="size-5" />
 </div>
 )}
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex items-center justify-between">
 <h5 className="text-xs font-bold text-foreground truncate">{rec.title}</h5>
 {rec.rating && (
 <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5">
 <Star className="size-3 fill-amber-500" /> {rec.rating}
 </span>
 )}
 </div>
 <p className="text-[10px] text-muted-foreground truncate">{rec.category}</p>
 <p className="text-[10px] text-primary flex items-center gap-1 mt-0.5">
 <MapPin className="size-2.5" /> {rec.distance}
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {/* ── ABA 4: EXPLORE, VOOS E MAPA ── */}
 {activeTab === "explore" && (
 <div className="px-4 sm:px-6 py-4 space-y-4 animate-in fade-in duration-200">
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground">Logística & Como Chegar</h3>
 <p className="text-xs text-muted-foreground">Planeje sua chegada e localize os melhores pontos da região.</p>
 </div>

 {/* Card de Logística Multimodal & Cronograma Detalhado */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-4 shadow-2xs">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 {isBus
 ? "Logística Rodoviária & Horários Garantidos"
 : isCruise
 ? "Logística Marítima & Horários Portuários"
 : isCombo
 ? "Logística Multimodal Integrada"
 : "Logística Aérea & Horários Garantidos"}
 </span>
 <span className="text-[11px] font-mono text-muted-foreground border border-border/60 px-2 py-0.5 rounded-full">
 {isBus
 ? (flightDetails.bus_company || flightDetails.bus_category || "Transporte Terrestre")
 : isCruise
 ? (flightDetails.ship_name || flightDetails.cruise_line || "Cruzeiro Marítimo")
 : isCombo
 ? "Viagem Multimodal"
 : (flightDetails.airline_name || flightDetails.airline_partner || "Voo Incluso")}
 </span>
 </div>

 {/* ─── MODAL 1: AÉREO ─── */}
 {(isAir || isCombo) && (
 <div className="space-y-3">
 {isCombo && (
 <span className="text-xs font-bold text-primary flex items-center gap-1.5">
 <Plane className="size-3.5" /> Trecho Aéreo do Pacote
 </span>
 )}
 
 {/* Voo de Ida */}
 <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Plane className="size-3.5 text-primary" /> Voo de Ida
 {flightDetails.flight_number_out && (
 <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
 {flightDetails.flight_number_out}
 </span>
 )}
 </span>
 {flightDetails.flight_duration && (
 <span className="text-[10px] text-muted-foreground font-mono inline-flex items-center gap-1">
 <Clock className="size-3" /> {flightDetails.flight_duration}
 </span>
 )}
 </div>

 <div className="flex items-center justify-between text-xs pt-1">
 <div>
 <span className="text-[10px] text-muted-foreground block">Origem / Embarque</span>
 <span className="font-bold text-foreground">
 {flightDetails.departure_time_out ? `${flightDetails.departure_time_out} — ` : ""}
 {flightDetails.departure_airport || flightDetails.origin_airport || "Aeroporto de Origem"}
 </span>
 </div>
 <div className="text-right">
 <span className="text-[10px] text-muted-foreground block">Chegada / Pouso</span>
 <span className="font-bold text-foreground">
 {flightDetails.arrival_time_out ? `${flightDetails.arrival_time_out} — ` : ""}
 {flightDetails.destination_airport || flightDetails.destination_iata || "Destino"}
 </span>
 </div>
 </div>
 </div>

 {/* Voo de Volta */}
 {(flightDetails.flight_number_return || flightDetails.departure_time_return) && (
 <div className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Plane className="size-3.5 text-primary rotate-180" /> Voo de Retorno
 {flightDetails.flight_number_return && (
 <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
 {flightDetails.flight_number_return}
 </span>
 )}
 </span>
 </div>

 <div className="flex items-center justify-between text-xs pt-1">
 <div>
 <span className="text-[10px] text-muted-foreground block">Embarque de Volta</span>
 <span className="font-bold text-foreground">
 {flightDetails.departure_time_return ? `${flightDetails.departure_time_return} — ` : ""}
 {flightDetails.destination_airport || flightDetails.destination_iata || "Destino"}
 </span>
 </div>
 <div className="text-right">
 <span className="text-[10px] text-muted-foreground block">Desembarque</span>
 <span className="font-bold text-foreground">
 {flightDetails.arrival_time_return ? `${flightDetails.arrival_time_return} — ` : ""}
 {flightDetails.departure_airport || flightDetails.origin_airport || "Origem"}
 </span>
 </div>
 </div>
 </div>
 )}
 </div>
 )}

 {/* ─── MODAL 2: TERRESTRE (RODOVIÁRIO / ÔNIBUS / EXCURSÃO) ─── */}
 {(isBus || isCombo) && (
 <div className="space-y-3">
 {isCombo && (
 <span className="text-xs font-bold text-primary flex items-center gap-1.5 pt-2">
 <Bus className="size-3.5" /> Trecho Rodoviário do Pacote
 </span>
 )}

 <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Bus className="size-3.5 text-primary" /> Viagem Rodoviária / Excursão
 {flightDetails.bus_company && (
 <span className="text-[11px] font-semibold text-foreground">
 • {flightDetails.bus_company}
 </span>
 )}
 </span>
 {flightDetails.bus_category && (
 <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
 {(() => {
 const cat = CANONICAL_BUS_CATEGORIES.find(b => b.id === flightDetails.bus_category);
 return cat ? cat.label : flightDetails.bus_category;
 })()}
 </span>
 )}
 </div>

 {/* Ponto de Encontro Oficial da Excursão */}
 {flightDetails.meeting_point && (
 <div className="flex items-start gap-2 p-2.5 rounded-xl bg-background border border-border/60">
 <MapPin className="size-3.5 text-primary mt-0.5 shrink-0" />
 <div>
 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Ponto de Encontro / Saída</p>
 <p className="text-xs font-semibold text-foreground leading-relaxed">{flightDetails.meeting_point}</p>
 </div>
 </div>
 )}

 {/* Embarque e Chegada Ida */}
 <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
 <div>
 <span className="text-[10px] text-muted-foreground block">Embarque de Ida</span>
 <span className="font-bold text-foreground">
 {flightDetails.bus_departure_time_out ? `${flightDetails.bus_departure_time_out} — ` : ""}
 {flightDetails.bus_departure_terminal || flightDetails.origin_airport || flightDetails.departure_city || "Terminal de Embarque"}
 </span>
 </div>
 <div className="text-right">
 <span className="text-[10px] text-muted-foreground block">Chegada no Destino</span>
 <span className="font-bold text-foreground">
 {flightDetails.bus_arrival_time_out ? `${flightDetails.bus_arrival_time_out} — ` : ""}
 {flightDetails.bus_arrival_terminal || flightDetails.destination_iata || "Terminal de Chegada"}
 </span>
 </div>
 </div>

 {/* Embarques e Paradas na Rota Rodoviária */}
 {Array.isArray(flightDetails.boarding_gateways) && flightDetails.boarding_gateways.length > 0 && (
 <div className="pt-2 border-t border-border/40">
 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
 Pontos de Embarque na Rota
 </p>
 <div className="flex flex-wrap gap-1.5">
 {flightDetails.boarding_gateways.map((gw: string, i: number) => (
 <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-medium text-primary">
 <Navigation className="size-2.5" />{gw}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* Guia Turístico Cadastur */}
 {flightDetails.guide_service && (() => {
 const guide = CANONICAL_GUIDE_SERVICES.find(g => g.id === flightDetails.guide_service);
 return guide ? (
 <div className="pt-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
 <ShieldCheck className="size-3.5 text-emerald-500 shrink-0" />
 <span>Acompanhamento: <strong className="text-foreground">{guide.label}</strong></span>
 </div>
 ) : null;
 })()}

 {/* Embarque e Chegada Volta */}
 {(flightDetails.bus_departure_time_return || flightDetails.bus_arrival_time_return || flightDetails.return_departure_time) && (
 <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
 <div>
 <span className="text-[10px] text-muted-foreground block">Embarque de Retorno</span>
 <span className="font-bold text-foreground">
 {(flightDetails.bus_departure_time_return || flightDetails.return_departure_time) ? `${flightDetails.bus_departure_time_return || flightDetails.return_departure_time} — ` : ""}
 {flightDetails.bus_arrival_terminal || flightDetails.destination_iata || "Terminal do Destino"}
 </span>
 </div>
 <div className="text-right">
 <span className="text-[10px] text-muted-foreground block">Chegada Final</span>
 <span className="font-bold text-foreground">
 {flightDetails.bus_arrival_time_return ? `${flightDetails.bus_arrival_time_return} — ` : ""}
 {flightDetails.bus_departure_terminal || flightDetails.origin_airport || "Origem"}
 </span>
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {/* ─── MODAL 3: CRUZEIRO MARÍTIMO ─── */}
 {(isCruise || isCombo) && (
 <div className="space-y-3">
 {isCombo && (
 <span className="text-xs font-bold text-primary flex items-center gap-1.5 pt-2">
 <Ship className="size-3.5" /> Trecho de Cruzeiro Marítimo
 </span>
 )}

 <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50 space-y-2.5">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Ship className="size-3.5 text-primary" /> {flightDetails.ship_name || "Navio de Cruzeiro"}
 {flightDetails.cruise_line && (
 <span className="text-[11px] font-normal text-muted-foreground">
 ({flightDetails.cruise_line})
 </span>
 )}
 </span>
 {flightDetails.cabin_category && (
 <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
 {flightDetails.cabin_category}
 </span>
 )}
 </div>

 <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
 <div>
 <span className="text-[10px] text-muted-foreground block">Porto de Embarque</span>
 <span className="font-bold text-foreground">
 {flightDetails.embarkation_port || "Terminal de Passageiros"}
 </span>
 {flightDetails.boarding_checkin_time && (
 <span className="text-[10px] text-primary block">
 Check-in: {flightDetails.boarding_checkin_time}
 </span>
 )}
 </div>
 <div className="text-right">
 <span className="text-[10px] text-muted-foreground block">Partida / Desatracação</span>
 <span className="font-bold text-foreground">
 {flightDetails.ship_departure_time || "A definir pela armadora"}
 </span>
 </div>
 </div>

 {(flightDetails.disembarkation_port || flightDetails.ship_arrival_time) && (
 <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
 <div>
 <span className="text-[10px] text-muted-foreground block">Porto de Desembarque</span>
 <span className="font-bold text-foreground">
 {flightDetails.disembarkation_port || flightDetails.embarkation_port || "Porto de Chegada"}
 </span>
 </div>
 <div className="text-right">
 <span className="text-[10px] text-muted-foreground block">Horário de Desembarque</span>
 <span className="font-bold text-foreground">
 {flightDetails.ship_arrival_time || "Atracação matutina"}
 </span>
 </div>
 </div>
 )}
 </div>
 </div>
 )}

 {/* ─── RESUMO MULTIMODAL MISTO ─── */}
 {transportType === "misto" && flightDetails.mixed_transport_summary && (
 <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground/90 leading-relaxed">
 <span className="font-bold text-primary block mb-1">Roteiro Multimodal Combinado:</span>
 {flightDetails.mixed_transport_summary}
 </div>
 )}

 {/* ─── TRANSFER BILATERAL (COMUM A TODOS) ─── */}
 {(flightDetails.transfer_pickup_time || flightDetails.transfer_return_time) && (
 <div className="p-3 rounded-xl bg-muted/10 border border-border/40 space-y-1.5 text-xs">
 <div className="flex items-center gap-1.5 font-bold text-foreground">
 <Car className="size-3.5 text-primary" />
 <span>Horários do Transfer Bilateral (In / Out)</span>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-0.5">
 {flightDetails.transfer_pickup_time && (
 <div>
 <span className="font-medium text-foreground">Transfer Ida:</span> {flightDetails.transfer_pickup_time}
 </div>
 )}
 {flightDetails.transfer_return_time && (
 <div>
 <span className="font-medium text-foreground">Transfer Volta:</span> {flightDetails.transfer_return_time}
 </div>
 )}
 </div>
 </div>
 )}

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
 <div className="flex items-center gap-1.5 text-muted-foreground">
 <Luggage className="size-3.5 text-primary" />
 <span>
 {isBus
 ? "Bagagem de Bordo + Bagageiro inclusos"
 : isCruise
 ? "Franquia Livre de Bagagens Marítimas"
 : "Bagagem Despachada 23kg inclusa"}
 </span>
 </div>
 <div className="flex items-center gap-1.5 text-muted-foreground">
 <Car className="size-3.5 text-primary" />
 <span>Transfer In/Out Incluso</span>
 </div>
 </div>
 </div>

 {/* Datas & Saídas Confirmadas (Opções Disponíveis de Reserva) */}
 {departureOptions.length > 0 && (
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-3 shadow-2xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Calendar className="size-4 text-primary" />
 <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
 Datas & Saídas Disponíveis
 </h4>
 </div>
 <span className="text-[11px] font-mono text-muted-foreground border border-border/60 px-2 py-0.5 rounded-full">
 {departureOptions.length} opções confirmadas
 </span>
 </div>

 <div className="space-y-2 pt-1">
 {departureOptions.map((opt, i) => {
 const cfg = DEPARTURE_STATUS_CONFIG[opt.status] || DEPARTURE_STATUS_CONFIG.confirmed;
 const depDate = opt.departure_date ? new Date(opt.departure_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
 const retDate = opt.return_date ? new Date(opt.return_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
 const optId = opt.id || String(i);
 const isSelected = selectedDepartureId === optId || (!selectedDepartureId && i === 0);
 return (
 <div
 key={opt.id || i}
 onClick={() => setSelectedDepartureId(selectedDepartureId === optId ? null : optId)}
 className={cn(
 "flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border gap-2 transition-all cursor-pointer text-left",
 isSelected
 ? "border-primary ring-2 ring-primary/25 bg-primary/5"
 : "bg-muted/20 border-border/50 hover:border-primary/40 hover:bg-muted/30"
 )}
 >
 <div className="flex items-start gap-2.5">
 <Calendar className="size-4 text-primary shrink-0 mt-0.5" />
 <div>
 <div className="flex items-center gap-2 flex-wrap">
 <p className="text-xs font-bold text-foreground">
 {opt.label || `Opção de Saída ${i + 1}`}
 </p>
 {isSelected && (
 <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
 ✓ Selecionada
 </span>
 )}
 <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", cfg.color)}>
 {cfg.icon} {cfg.label}
 </span>
 </div>
 <p className="text-[11px] text-muted-foreground mt-0.5">
 {depDate}{depDate && retDate && " — "}{retDate}
 {opt.departure_time && <span className="font-mono ml-1 font-semibold text-foreground">• Saída: {opt.departure_time}</span>}
 </p>
 {opt.notes && (
 <p className="text-[10px] text-muted-foreground italic mt-0.5">{opt.notes}</p>
 )}
 </div>
 </div>

 <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/30">
 {opt.available_seats !== undefined && opt.available_seats > 0 && (
 <span className="text-[11px] font-semibold text-muted-foreground">
 {opt.available_seats} vagas restantes
 </span>
 )}
 {opt.price_override_cents && opt.price_override_cents > 0 ? (
 <span className="font-mono font-bold text-xs text-foreground">
 {formatMoney(opt.price_override_cents)}
 </span>
 ) : null}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* Mapa Interativo ou Localização Oficial */}
 <div className="relative w-full rounded-2xl overflow-hidden border border-border/60 shadow-xs">
 {(destination.lat && destination.lng) || (resort.lat && resort.lng) ? (
 <div className="h-56 sm:h-64 w-full">
 <MapLibreCanvas
 center={{
 lat: Number(destination.lat || resort.lat),
 lng: Number(destination.lng || resort.lng),
 }}
 zoom={13}
 />
 </div>
 ) : (
 <div className="p-6 bg-muted/10 flex flex-col items-center justify-center text-center space-y-1.5 border border-border/50 rounded-2xl">
 <h4 className="text-xs font-bold text-foreground">{destination.name || productTitle}</h4>
 <p className="text-[11px] text-muted-foreground max-w-sm">
 {resort.location || destination.region || "Localização sob consulta com a agência parceira."}
 </p>
 </div>
 )}
 </div>
 </div>
 )}
 </main>

 {/* ── 3. Barra Fixa Inferior de Conversão (Bottom Booking Bar Dinâmica & Bilateral) ── */}
 <footer className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/80 p-3 sm:p-4 shadow-lg pb-safe">
 <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
 <div className="flex flex-col">
 <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
 {resort.guests_text ? `Valor por pacote (${resort.guests_text})` : "Resumo de Valor"}
 </span>
 {totalCents > 0 ? (
 maxInstallments > 0 ? (
 <>
 <div className="flex items-baseline gap-1.5">
 <span className="text-xs font-semibold text-muted-foreground">{maxInstallments}x</span>
 <span className="text-base sm:text-lg font-bold text-foreground tracking-tight">
 {formattedInstallment}
 </span>
 {feeFreeInstallments >= maxInstallments ? (
 <span className="text-[10px] font-medium text-emerald-600">sem juros</span>
 ) : (
 <span className="text-[10px] font-medium text-muted-foreground">({feeFreeInstallments}x sem juros)</span>
 )}
 </div>
 <span className="text-[10px] text-muted-foreground">
 {pixDiscountPercent > 0 ? (
 <>ou <strong className="text-foreground">{formattedPixTotal}</strong> no PIX ({pixDiscountPercent}% off)</>
 ) : (
 <>ou {formattedTotal} à vista</>
 )}
 </span>
 </>
 ) : (
 <>
 <div className="flex items-baseline gap-1.5">
 <span className="text-base sm:text-lg font-bold text-foreground tracking-tight">
 {formattedTotal}
 </span>
 <span className="text-[10px] font-medium text-muted-foreground">à vista</span>
 </div>
 {pixDiscountPercent > 0 && (
 <span className="text-[10px] text-emerald-600 font-medium">
 ou {formattedPixTotal} no PIX ({pixDiscountPercent}% off)
 </span>
 )}
 </>
 )
 ) : (
 <div className="flex items-baseline gap-1.5">
 <span className="text-base sm:text-lg font-bold text-foreground tracking-tight">
 Sob Consulta
 </span>
 <span className="text-[10px] text-muted-foreground">(Consulte disponibilidade)</span>
 </div>
 )}
 </div>

 <Button
 type="button"
 size="lg"
 onClick={handleBooking}
 className="rounded-full px-6 sm:px-8 h-11 text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer flex items-center gap-2"
 >
 <MessageCircle className="size-4" />
 <span>Reservar Pacote</span>
 </Button>
 </div>
 </footer>
 </div>
 );
}
