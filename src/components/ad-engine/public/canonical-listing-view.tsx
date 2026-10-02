import React, { useState } from "react";
// EmptyState: listagens de embarques e miniaturas vazias prevenidas (empty)
import {
  Calendar,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Share2,
  Heart,
  Phone,
  MessageCircle,
  Truck,
  CreditCard,
  Percent,
  SlidersHorizontal,
  Info,
  ChevronRight,
  ExternalLink,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CurrencyField } from "@/components/ui/currency-field";
import type { UnifiedListing, UnifiedNiche } from "@/types/unified-ad-engine";
import { NICHE_TAXONOMY_REGISTRY } from "@/lib/ad-engine/niche-taxonomy-manifest";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface CanonicalListingViewProps {
  listing: Partial<UnifiedListing>;
  isOwner?: boolean;
  isPreviewMode?: boolean;
  onEditClick?: () => void;
  onPurchase?: (options?: any) => void;
  onBookingSubmit?: (bookingData: any) => Promise<void>;
  onContactLead?: (channel: "whatsapp" | "phone" | "chat") => Promise<void>;
  className?: string;
}

export function CanonicalListingView({
  listing,
  isOwner = false,
  isPreviewMode = false,
  onEditClick,
  onPurchase,
  onBookingSubmit,
  onContactLead,
  className,
}: CanonicalListingViewProps) {
  const niche = (listing.niche || "retail") as UnifiedNiche;
  const nicheConfig = NICHE_TAXONOMY_REGISTRY[niche];

  const commercial = (listing as any).commercial || { price_cents: listing.price_cents ?? 0 };
  const media = (listing as any).media || { media_urls: listing.media_urls ?? [], cover_url: listing.cover_url ?? "" };
  const images: string[] = (media.media_urls?.length ? media.media_urls : media.cover_url ? [media.cover_url] : []).filter(Boolean);
  const [selectedImage, setSelectedImage] = useState(0);

  const priceCents = commercial.price_cents ?? 0;
  const compareAtCents = commercial.compare_at_cents;
  const maxInstallments = commercial.max_installments ?? 1;
  const feeFreeInstallments = commercial.fee_free_installments ?? 1;
  const pixDiscount = commercial.pix_discount_percent ?? 0;
  const depositPercent = commercial.deposit_percent;

  const isTourism = niche === "tourism";
  const isServices = niche === "services";

  // Booking modal for Tourism / Services (F28)
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDeparture, setSelectedDeparture] = useState<any>(listing.departures?.[0] || null);
  const [ticketCount, setTicketCount] = useState(1);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Inclusions and Exclusions (F17, O01, O05)
  const inclusions = listing.inclusions || [];
  const exclusions = listing.exclusions || [];

  const handleLeadAction = async (channel: "whatsapp" | "phone" | "chat") => {
    if (isPreviewMode) return;
    if (onContactLead) {
      await onContactLead(channel);
    }
    const phone = listing.contact_channels?.whatsapp || listing.contact_channels?.phone;
    if (channel === "whatsapp" && phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      const msg = encodeURIComponent(`Olá! Vi o anúncio "${listing.title}" no Waesy e gostaria de mais informações.`);
      window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
    }
  };

  const handleBookingConfirm = async () => {
    if (isPreviewMode) {
      setIsBookingOpen(false);
      return;
    }
    setIsSubmittingBooking(true);
    try {
      if (onBookingSubmit) {
        await onBookingSubmit({
          listingId: listing.id,
          departure: selectedDeparture,
          quantity: ticketCount,
          totalPriceCents: (selectedDeparture?.price_cents || priceCents) * ticketCount,
          depositCents: depositPercent ? Math.round(((selectedDeparture?.price_cents || priceCents) * ticketCount * depositPercent) / 100) : 0,
        });
      }
      setIsBookingOpen(false);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <div className={cn("w-full bg-background text-foreground min-h-screen pb-24", className)}>
      {/* ── Barra de Modo Proprietário (F27, O09: Não empurra o layout, posição contida) ── */}
      {isOwner && (
        <aside aria-label="Aviso de Modo Proprietário" className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <span className="size-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>
              <strong>Modo Proprietário:</strong> Você está visualizando seu anúncio publicado.
            </span>
          </div>
          {onEditClick && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEditClick}
              className="h-11 rounded-lg text-2xs font-semibold gap-1 border-amber-500/30 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <Edit3 className="size-4" />
              <span>Editar</span>
            </Button>
          )}
        </aside>
      )}

      {/* ── Container Principal Responsivo (320px a 1280px) ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-6">
        {/* Breadcrumb & Identificação Superior */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-2xs font-normal">
              {nicheConfig?.label || niche}
            </Badge>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-48 sm:max-w-md">
              {listing.title || "Sem Título"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
              <Share2 className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
              <Heart className="size-4" />
            </Button>
          </div>
        </div>

        {/* ── Grade 2 Colunas: Mídia (Esquerda) vs Comercial/Ação (Direita) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Coluna Esquerda: Galeria & Fotos (7 Colunas) */}
          <div className="lg:col-span-7 space-y-3">
            {/* Foto Principal */}
            <div className="aspect-4/3 sm:aspect-16/10 rounded-lg overflow-hidden bg-muted/40 border border-border/60 relative">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage] || images[0]}
                  alt={listing.title || "Foto do anúncio"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                  <p className="text-xs font-semibold">Sem fotos cadastradas</p>
                </div>
              )}

              {/* Badges de Destaque */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <Badge className="bg-background/90 text-foreground backdrop-blur-xs text-2xs font-semibold">
                  {nicheConfig?.label || "Anúncio"}
                </Badge>
                {listing.status === "draft" && (
                  <Badge variant="secondary" className="text-2xs">
                    Rascunho
                  </Badge>
                )}
              </div>
            </div>

            {/* Miniaturas de Navegação (Sem estado falso / O07 eliminado) */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {images.map((img: string, idx: number) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={cn(
                      "size-16 sm:size-20 rounded-lg border-2 overflow-hidden shrink-0 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                      selectedImage === idx
                        ? "border-primary ring-2 ring-primary/20 scale-105"
                        : "border-border/60 opacity-70 hover:opacity-100"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Coluna Direita: Preço, Condições & Checkout (5 Colunas) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-card rounded-lg p-5 border border-border/60 space-y-4">
              {/* Título & Marca */}
              <div className="space-y-1">
                {listing.brand && (
                  <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">
                    {listing.brand}
                  </span>
                )}
                <h1 className="text-xl sm:text-2xl font-black text-foreground leading-tight">
                  {listing.title || "Título do Anúncio"}
                </h1>
                {listing.location_data?.city && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground pt-0.5">
                    <MapPin className="size-4 text-primary shrink-0" />
                    <span>{listing.location_data.city}, {listing.location_data.state || "SC"}</span>
                  </div>
                )}
              </div>

              {/* Bloco de Preço Canônico (Dono Único - F18) */}
              <div className="p-4 rounded-lg bg-muted/40 border border-border/40 space-y-1">
                {compareAtCents && compareAtCents > priceCents && (
                  <span className="text-xs text-muted-foreground line-through block font-mono">
                    {formatMoney(compareAtCents)}
                  </span>
                )}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-foreground font-mono">
                    {formatMoney(priceCents)}
                  </span>
                  {isTourism && (
                    <span className="text-xs text-muted-foreground font-normal">/ por pessoa</span>
                  )}
                </div>

                {/* Parcelamento e PIX */}
                <div className="pt-1 text-xs text-muted-foreground space-y-0.5">
                  {maxInstallments > 1 ? (
                    <p>
                      Em até <strong className="text-foreground">{maxInstallments}x</strong> de{" "}
                      <strong className="text-foreground">{formatMoney(Math.round(priceCents / maxInstallments))}</strong>
                      {feeFreeInstallments > 1 && ` (${feeFreeInstallments}x sem juros)`}
                    </p>
                  ) : (
                    <p>À vista</p>
                  )}
                  {pixDiscount > 0 && (
                    <p className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Percent className="size-4" />
                      <span>{pixDiscount}% de desconto via PIX ({formatMoney(Math.round(priceCents * (1 - pixDiscount / 100)))})</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Sinal de Reserva (Se Turismo / Eventos) */}
              {isTourism && depositPercent && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary shrink-0" />
                  <div>
                    <span className="font-semibold text-foreground">Garantia com Sinal de {depositPercent}%: </span>
                    <span className="text-primary font-bold font-mono">
                      {formatMoney(Math.round((priceCents * depositPercent) / 100))}
                    </span>
                    <span className="text-muted-foreground block text-2xs mt-0.5">
                      Restante quitado até {commercial.balance_due_days || 10} dias antes da viagem.
                    </span>
                  </div>
                </div>
              )}

              {/* Botões de Ação Transacional (F28 / R07: Se for preview, mostra simulação segura) */}
              <div className="space-y-3 pt-2">
                {isPreviewMode ? (
                  <div className="p-3 rounded-lg bg-muted/60 border border-border/40 text-center space-y-1">
                    <Badge variant="outline" className="text-2xs font-semibold">
                      Modo Simulação do Preview
                    </Badge>
                    <p className="text-2xs text-muted-foreground">
                      Botões transacionais operam de verdade quando visualizados pelos clientes na vitrine pública.
                    </p>
                  </div>
                ) : isTourism ? (
                  <Button
                    type="button"
                    onClick={() => setIsBookingOpen(true)}
                    className="w-full h-11 rounded-lg text-sm font-bold bg-primary text-primary-foreground gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <Calendar className="size-4" />
                    <span>Reservar Vaga no Pacote</span>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={onPurchase}
                    className="w-full h-11 rounded-lg text-sm font-bold bg-primary text-primary-foreground gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <Truck className="size-4" />
                    <span>Comprar Agora</span>
                  </Button>
                )}

                {/* Contato via WhatsApp / Lead CRM (F29) */}
                {listing.contact_channels?.whatsapp && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleLeadAction("whatsapp")}
                    className="w-full h-11 rounded-lg text-xs font-semibold gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <MessageCircle className="size-4" />
                    <span>Tirar Dúvidas no WhatsApp</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Seção Inferior: Detalhes, Escopo, Inclusos & Termos ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 pt-4">
          <div className="lg:col-span-8 space-y-6">
            {/* Descrição Detalhada */}
            {listing.description && (
              <div className="bg-card rounded-lg p-5 border border-border/60 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Sobre este {isTourism ? "Pacote / Roteiro" : "Item"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Inclusos e Exclusos (F17, O01, O05: Sem placeholder, sem '0 Inclusos') */}
            {(inclusions.length > 0 || exclusions.length > 0) && (
              <div className="bg-card rounded-lg p-5 border border-border/60 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  O que está incluso e o que não está
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {inclusions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-2xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                        Incluso no Valor
                      </span>
                      <ul className="space-y-2 text-xs text-foreground">
                        {inclusions.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {exclusions.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-2xs font-bold text-destructive uppercase tracking-wider block">
                        Não Incluso
                      </span>
                      <ul className="space-y-2 text-xs text-muted-foreground">
                        {exclusions.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <XCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Datas de Saídas e Embarques (Se Turismo) */}
            {isTourism && listing.departures && listing.departures.length > 0 && (
              <div className="bg-card rounded-lg p-5 border border-border/60 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Próximas Saídas Confirmadas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {listing.departures.map((dep: any, idx: number) => (
                    <div key={dep.id || idx} className="p-3 rounded-lg border border-border/60 bg-muted/20 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span>{dep.date_start ? new Date(dep.date_start).toLocaleDateString("pt-BR") : "Data a definir"}</span>
                        <Badge variant="outline" className="text-2xs">
                          {dep.available_spots || 0} vagas
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-2xs">
                        Embarque: {dep.boarding_location || "Central"}
                      </p>
                      <p className="text-foreground font-mono font-bold text-xs pt-1">
                        {formatMoney(dep.price_cents || priceCents)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Modal de Reserva de Vaga em Turismo (F28) ── */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-md rounded-lg bg-card border border-border/80 p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground">
              Reserva de Pacote / Excursão
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione a data de saída e a quantidade de passageiros para garantir sua reserva.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            {listing.departures && listing.departures.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Data de Saída</label>
                <div className="space-y-2">
                  {listing.departures.map((dep: any, idx: number) => (
                    <button
                      key={dep.id || idx}
                      type="button"
                      onClick={() => setSelectedDeparture(dep)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-lg border text-xs text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                        selectedDeparture?.id === dep.id
                          ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                          : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <div>
                        <span className="font-bold text-foreground block">
                          {dep.date_start ? new Date(dep.date_start).toLocaleDateString("pt-BR") : "Saída"}
                        </span>
                        <span className="text-2xs text-muted-foreground">{dep.boarding_location}</span>
                      </div>
                      <span className="font-mono font-bold text-foreground">
                        {formatMoney(dep.price_cents || priceCents)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Passageiros / Vagas</label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={ticketCount <= 1}
                  onClick={() => setTicketCount((c) => Math.max(1, c - 1))}
                  className="h-11 w-11 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  -
                </Button>
                <span className="font-bold text-sm font-mono w-8 text-center">{ticketCount}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={ticketCount >= 10}
                  onClick={() => setTicketCount((c) => c + 1)}
                  className="h-11 w-11 rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  +
                </Button>
              </div>
            </div>

            {/* Resumo Financeiro da Reserva */}
            <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-xs space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Valor Total ({ticketCount}x):</span>
                <span className="font-mono font-bold text-foreground">
                  {formatMoney((selectedDeparture?.price_cents || priceCents) * ticketCount)}
                </span>
              </div>
              {depositPercent && (
                <div className="flex justify-between text-primary font-semibold">
                  <span>Sinal para Reserva ({depositPercent}%):</span>
                  <span className="font-mono font-bold">
                    {formatMoney(Math.round(((selectedDeparture?.price_cents || priceCents) * ticketCount * depositPercent) / 100))}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBookingOpen(false)}
              className="h-11 rounded-lg text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSubmittingBooking}
              onClick={handleBookingConfirm}
              className="h-11 rounded-lg text-xs font-bold gap-2 px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <CheckCircle2 className="size-4" />
              <span>Confirmar Reserva</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
