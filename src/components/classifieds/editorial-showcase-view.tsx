import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Grid,
  Building2,
  Calendar,
  Compass,
  ArrowLeft,
  Share2,
  CheckCircle2,
  Plane,
  MapPin,
  MessageCircle,
  Maximize2,
  Edit3,
  Settings,
  CreditCard,
  QrCode,
  Truck,
  ShieldCheck,
  Sparkles,
  Clock,
  Utensils,
  Car,
  Home as HomeIcon,
  Briefcase,
  Wrench,
  FileArchive,
  Tag,
  BadgePercent,
  Check,
  Info,
  ExternalLink,
  ChevronRight,
  Handshake,
  Landmark,
  Coins,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { registerClassifiedLead } from "@/services/company-mvp.functions";
import { MapLibreCanvas } from "@/components/mobility/maplibre-canvas";
import { FavoriteButton } from "@/components/common/favorite-button";
import { cn } from "@/lib/utils";
import { TravelBookingDossierModal } from "./travel-booking-dossier-modal";
import { WeatherWidget } from "./weather-widget";

export interface EditorialShowcaseViewProps {
  classified: any;
  isOwner?: boolean;
  onOpenBookingModal?: () => void;
  onOpenProposalModal?: () => void;
  onEditClassified?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Disclaimers Canônicos de Valores Flutuantes & Demonstrativos
// ─────────────────────────────────────────────────────────────────────────────
const DISCLAIMER_LABELS: Record<string, string> = {
  demonstrative: "Valor ilustrativo / demonstrativo — proposta final emitida sob consulta conforme especificações.",
  subject_to_availability: "Preço e disponibilidade sujeitos a alteração e confirmação de estoque sem aviso prévio.",
  seasonal: "Tarifa promocional válida para baixa temporada e dias úteis.",
  exchange_rate: "Valores sujeitos a flutuação cambial, taxas governamentais e tarifas dinâmicas.",
  custom: "Consulte condições comerciais atualizadas diretamente com o anunciante.",
};

export function EditorialShowcaseView({
  classified,
  isOwner = false,
  onOpenBookingModal,
  onOpenProposalModal,
  onEditClassified,
}: EditorialShowcaseViewProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"grid" | "resort" | "itinerary" | "explore">("grid");
  const [activeStoryModal, setActiveStoryModal] = useState<any | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isBookingDossierOpen, setIsBookingDossierOpen] = useState(false);

  const attrs = classified?.attributes || {};
  const nicheId = String(attrs.niche || classified?.category || "viagem").toLowerCase();

  const images: string[] =
    (Array.isArray(classified?.images) && classified.images.length > 0 ? classified.images : null) ||
    (Array.isArray(classified?.photos) && classified.photos.length > 0 ? classified.photos : null) ||
    (Array.isArray(classified?.media) && classified.media.length > 0 ? classified.media : null) ||
    [];

  // ── Modalidade de Preço & Dinamismo ──────────────────────────────────────────
  const pricingType: string = attrs.pricing_type || (classified?.negotiable ? "fixed" : "fixed");
  const priceDisclaimerKey: string = attrs.price_disclaimer || "none";
  const customDisclaimer: string = attrs.custom_disclaimer || "";
  const priceMinCents: number | undefined = attrs.price_min_cents;
  const priceMaxCents: number | undefined = attrs.price_max_cents;

  const disclaimerText =
    priceDisclaimerKey === "custom" && customDisclaimer
      ? customDisclaimer
      : DISCLAIMER_LABELS[priceDisclaimerKey] || null;

  // ── Regras de Pagamento ───────────────────────────────────────────────────
  const priceCents = classified?.price_cents || 0;
  const maxInstallments = Math.max(1, Number(attrs.max_installments) || 1);
  const installmentCents =
    priceCents > 0 && maxInstallments > 1
      ? Math.round(priceCents / maxInstallments)
      : priceCents;

  const acceptsPix = attrs.accepts_pix !== undefined ? !!attrs.accepts_pix : true;
  const pixDiscountPercent = Number(attrs.pix_discount_percent) || 0;
  const acceptsCard = attrs.accepts_card !== undefined ? !!attrs.accepts_card : true;
  const acceptsCash = attrs.accepts_cash !== undefined ? !!attrs.accepts_cash : true;
  const acceptsTrade = attrs.accepts_trade !== undefined ? !!attrs.accepts_trade : !!classified?.accepts_trade;
  const tradeNotes = attrs.trade_notes || "";
  const acceptsFinancing = !!attrs.accepts_financing;
  const cancellationPolicy = attrs.cancellation_policy || "flexible";

  // ── Destaques e Diferenciais ──────────────────────────────────────────────
  const storyHighlights = Array.isArray(attrs.story_highlights) ? attrs.story_highlights : [];
  const bioBullets: string[] = Array.isArray(attrs.bio_bullets) ? attrs.bio_bullets : [];
  const flightDetails = attrs.flight_details || null;
  const itineraryDays = Array.isArray(attrs.itinerary_days) ? attrs.itinerary_days : [];

  const destinationCity: string =
    attrs.destination_city ||
    classified?.city ||
    (typeof classified?.location_name === "string" ? classified.location_name.split(",")[0].trim() : "");

  // ── Estatísticas do Topo (Polimórficas por Nicho) ──────────────────────────
  const getHeaderStats = () => {
    if (nicheId.includes("viag") || nicheId.includes("travel") || nicheId.includes("tour")) {
      return [
        { label: "Duração", val: attrs.duration_text || "—" },
        { label: "Regime", val: attrs.meal_plan || "—" },
        { label: "Hóspedes", val: attrs.guests_text || "—" },
      ];
    }
    if (nicheId.includes("alim") || nicheId.includes("gastro") || nicheId.includes("restaurante")) {
      return [
        { label: "Preparo", val: attrs.prep_time || "Pronta entrega" },
        { label: "Cardápio", val: attrs.meal_type ? attrs.meal_type.replace(/_/g, " ") : "Artesanal" },
        { label: "Entrega", val: Array.isArray(attrs.service_modes) && attrs.service_modes.includes("motolink") ? "Delivery" : "Retirada" },
      ];
    }
    if (nicheId.includes("hosped") || nicheId.includes("temporada")) {
      return [
        { label: "Tipo", val: attrs.property_type || "Chalé" },
        { label: "Hóspedes", val: `${attrs.max_guests || 1} máx.` },
        { label: "Quartos", val: `${attrs.bedrooms || 1} qto(s)` },
      ];
    }
    if (nicheId.includes("imov") || nicheId.includes("real_estate")) {
      return [
        { label: "Área", val: attrs.area_sqm ? `${attrs.area_sqm} m²` : "—" },
        { label: "Quartos", val: `${attrs.bedrooms || "—"} qtos` },
        { label: "Vagas", val: `${attrs.parking_spots || "—"} vg(s)` },
      ];
    }
    if (nicheId.includes("veic") || nicheId.includes("car") || nicheId.includes("auto")) {
      return [
        { label: "Ano", val: attrs.year_model ? `${attrs.year_fab || ""}/${attrs.year_model}` : "—" },
        { label: "Km", val: attrs.mileage_km ? `${attrs.mileage_km} km` : "Zero Km" },
        { label: "Câmbio", val: attrs.transmission || "Automático" },
      ];
    }
    if (nicheId.includes("serv") || nicheId.includes("prof")) {
      return [
        { label: "Modalidade", val: attrs.modality === "remoto" ? "Online / Remoto" : "Presencial" },
        { label: "Região", val: attrs.service_area || "Local" },
        { label: "Garantia", val: "Com Nota" },
      ];
    }
    if (nicheId.includes("equip")) {
      return [
        { label: "Período", val: attrs.equipment_period === "evento" ? "Por Evento" : "Por Diária" },
        { label: "Caução", val: attrs.deposit_cents ? formatMoney(attrs.deposit_cents) : "Sem Caução" },
        { label: "Estado", val: "Revisado" },
      ];
    }
    if (nicheId.includes("digit")) {
      return [
        { label: "Formato", val: attrs.digital_file_type || "Digital" },
        { label: "Downloads", val: `${attrs.digital_download_limit || "Ilimitados"}` },
        { label: "Acesso", val: "Imediato" },
      ];
    }
    return [
      { label: "Condição", val: attrs.item_condition ? attrs.item_condition.replace(/_/g, " ") : "Excelente" },
      { label: "Garantia", val: attrs.item_warranty || "Testado" },
      { label: "Negociação", val: classified?.negotiable ? "Sim" : "Fixa" },
    ];
  };

  const headerStats = getHeaderStats();

  // ── Labels das 4 Abas Semânticas ──────────────────────────────────────────
  const getTabLabels = () => {
    if (nicheId.includes("alim") || nicheId.includes("gastro")) {
      return { tab2: "Cardápio", tab3: "Detalhes", tab4: "Retirada & Pagto" };
    }
    if (nicheId.includes("hosped")) {
      return { tab2: "Acomodação", tab3: "Regras & Comodidades", tab4: "Local & Diárias" };
    }
    if (nicheId.includes("imov")) {
      return { tab2: "Ficha do Imóvel", tab3: "Condomínio & Lazer", tab4: "Bairro & Proposta" };
    }
    if (nicheId.includes("veic")) {
      return { tab2: "Ficha Técnica", tab3: "Opcionais & Laudo", tab4: "Test-Drive & Financiamento" };
    }
    if (nicheId.includes("serv")) {
      return { tab2: "Sobre o Serviço", tab3: "Etapas & Prazos", tab4: "Orçamento & Pagto" };
    }
    if (nicheId.includes("equip")) {
      return { tab2: "Equipamento", tab3: "Itens Inclusos", tab4: "Locação & Retirada" };
    }
    if (nicheId.includes("digit")) {
      return { tab2: "Conteúdo", tab3: "O que está incluso", tab4: "Acesso & Pagto" };
    }
    return { tab2: "Especificações", tab3: "Diferenciais", tab4: "Condições Comerciais" };
  };

  const tabLabels = getTabLabels();

  // ── CTA Text do Botão Primário ─────────────────────────────────────────────
  const getPrimaryCtaLabel = () => {
    if (nicheId.includes("viag") || nicheId.includes("tour")) return "Reservar Pacote";
    if (nicheId.includes("alim") || nicheId.includes("gastro")) return "Fazer Pedido / Reserva";
    if (nicheId.includes("hosped")) return "Consultar Datas & Reservar";
    if (nicheId.includes("imov")) return "Agendar Visita ao Imóvel";
    if (nicheId.includes("veic")) return "Agendar Test-Drive / Proposta";
    if (nicheId.includes("serv")) return "Solicitar Orçamento";
    if (nicheId.includes("equip")) return "Solicitar Locação";
    if (nicheId.includes("digit")) return "Comprar & Baixar";
    return "Comprar / Falar com Vendedor";
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.share) {
      navigator.share({
        title: classified.title,
        text: classified.content?.slice(0, 100),
        url: window.location.href,
      }).catch(() => {});
    } else if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copiado para a área de transferência!");
    }
  };

  const handleOpenAction = async () => {
    if (classified?.id) {
      try {
        registerClassifiedLead({
          data: {
            classifiedId: classified.id,
            proposedPriceCents: priceCents,
            message: `Ação primária no anúncio "${classified.title}". Modalidade: ${pricingType}. Valor: ${formatMoney(priceCents)}`,
          },
        }).catch(() => {});
      } catch {}
    }

    if (onOpenBookingModal) {
      onOpenBookingModal();
      return;
    }

    if (nicheId.includes("viag") || nicheId.includes("tour")) {
      setIsBookingDossierOpen(true);
    } else if (onOpenProposalModal) {
      onOpenProposalModal();
    } else {
      handleWhatsAppDirect();
    }
  };

  const handleWhatsAppDirect = async () => {
    if (!classified?.contact_whatsapp && !classified?.whatsapp) return;
    const phone = classified.contact_whatsapp || classified.whatsapp;
    if (classified.id) {
      try {
        registerClassifiedLead({
          data: {
            classifiedId: classified.id,
            proposedPriceCents: priceCents,
            message: `Contato direto via WhatsApp na Vitrine Imersiva para "${classified.title}"`,
          },
        }).catch(() => {});
      } catch {}
    }

    let priceMsg = "";
    if (pricingType === "on_quote") {
      priceMsg = "(Sob Consulta)";
    } else if (pricingType === "starting_at") {
      priceMsg = `(A partir de ${formatMoney(priceCents)})`;
    } else if (pricingType === "price_range" && priceMinCents && priceMaxCents) {
      priceMsg = `(${formatMoney(priceMinCents)} a ${formatMoney(priceMaxCents)})`;
    } else if (priceCents > 0) {
      priceMsg = maxInstallments > 1 ? `(${maxInstallments}x de ${formatMoney(installmentCents)})` : `(${formatMoney(priceCents)})`;
    }

    await trackAndOpenWhatsApp({
      phone,
      entityType: "classified",
      entityId: classified.id,
      entityTitle: classified.title,
      customMessage: `Olá! Vi o anúncio "${classified.title}" no Waesy ${priceMsg} e gostaria de mais informações!`,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-28 font-sans select-none">
      {/* ── Top Bar Fixo de Navegação ── */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/40 px-3 py-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate({ to: "/classificados" })}
          className="p-2 -ml-1 text-foreground hover:bg-muted rounded-full transition-colors active:scale-95"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </button>

        <div className="flex items-center gap-2 max-w-[200px] truncate">
          <span className="font-extrabold text-xs tracking-tight text-foreground truncate">
            {classified.title || "Vitrine Imersiva"}
          </span>
          <span className="size-2 rounded-full bg-emerald-500 shrink-0" title="Online" />
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleShare}
            className="p-2 text-foreground hover:bg-muted rounded-full transition-colors active:scale-95"
            aria-label="Compartilhar"
          >
            <Share2 className="size-4.5" />
          </button>
          {classified.id && (
            <FavoriteButton
              entityId={classified.id}
              entityType="classified"
              title={classified.title}
              className="size-9"
            />
          )}
        </div>
      </div>

      {/* ── Painel de Controle do Proprietário (Owner Edit Controls) ── */}
      {isOwner && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
            <Settings className="size-4 shrink-0" />
            <span>Modo Proprietário: Visualização da Vitrine Imersiva.</span>
          </div>
          {onEditClassified && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEditClassified}
              className="h-8 rounded-full border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 font-bold shrink-0"
            >
              <Edit3 className="size-3.5 mr-1.5" />
              Editar Anúncio
            </Button>
          )}
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* ── Header Editorial (Avatar Circular com Story Ring Gradiente + Estatísticas) ── */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative shrink-0">
            <div className="size-20 sm:size-22 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-md">
              {images[0] ? (
                <img
                  src={images[0]}
                  alt={classified.title}
                  className="size-full rounded-full object-cover border-2 border-background"
                />
              ) : (
                <div className="size-full rounded-full bg-muted flex items-center justify-center border-2 border-background">
                  <Sparkles className="size-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 size-5.5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs border-2 border-background">
              <CheckCircle2 className="size-3.5 fill-white text-blue-500" />
            </div>
          </div>

          {/* Estatísticas em 3 Colunas Canônicas (Polimórficas) */}
          <div className="flex-1 grid grid-cols-3 gap-1 text-center divide-x divide-border/30">
            {headerStats.map((stat, i) => (
              <div key={i} className={`flex flex-col ${i > 0 ? "pl-1" : ""}`}>
                <span className="font-display font-extrabold text-sm sm:text-base text-foreground tracking-tight truncate px-1 capitalize">
                  {stat.val || "—"}
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Título, Subtítulo & Bullets ── */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight leading-snug">
              {classified.title || "Sem título"}
            </h1>
            {classified.location_name && (
              <Badge variant="outline" className="text-[10px] gap-1 py-0.5 bg-muted/30">
                <MapPin className="size-2.5 text-primary" />
                <span>{classified.location_name}</span>
              </Badge>
            )}
          </div>

          {/* Bullets de Diferenciais Contextuais */}
          {bioBullets.length > 0 ? (
            <ul className="space-y-1 pt-1">
              {bioBullets.map((bullet, idx) => (
                <li key={idx} className="text-xs text-foreground/90 flex items-start gap-1.5 font-medium">
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : (
            classified.content && (
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {classified.content}
              </p>
            )
          )}
        </div>

        {/* ── Destaques Visuais ── */}
        {storyHighlights.length > 0 && (
          <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-2 -mx-1 px-1">
            {storyHighlights.map((hl: any, index: number) => (
              <button
                key={hl.id || index}
                type="button"
                onClick={() => setActiveStoryModal(hl)}
                className="flex flex-col items-center gap-1.5 shrink-0 group active:scale-95 transition-all"
              >
                <div className="size-15 sm:size-16 rounded-full p-[2px] bg-border hover:bg-gradient-to-tr hover:from-amber-500 hover:via-rose-500 hover:to-purple-600 transition-all">
                  <img
                    src={hl.image || images[0]}
                    alt={hl.title}
                    className="size-full rounded-full object-cover border border-background"
                  />
                </div>
                <span className="text-[11px] font-medium text-foreground tracking-tight max-w-[64px] truncate">
                  {hl.title}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* ── Abas Canônicas (Fotos, Ficha Técnica, Aprofundamento, Explore/Pagamento) ── */}
        <div className="border-t border-border/40 pt-1">
          <div className="grid grid-cols-4 border-b border-border/40">
            <button
              type="button"
              onClick={() => setActiveTab("grid")}
              className={cn(
                "py-3 flex items-center justify-center border-b-2 transition-colors",
                activeTab === "grid"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              aria-label="Galeria de Fotos"
            >
              <Grid className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("resort")}
              className={cn(
                "py-3 flex items-center justify-center border-b-2 transition-colors",
                activeTab === "resort"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              aria-label={tabLabels.tab2}
            >
              <Building2 className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("itinerary")}
              className={cn(
                "py-3 flex items-center justify-center border-b-2 transition-colors",
                activeTab === "itinerary"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              aria-label={tabLabels.tab3}
            >
              <Calendar className="size-5" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("explore")}
              className={cn(
                "py-3 flex items-center justify-center border-b-2 transition-colors",
                activeTab === "explore"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              aria-label={tabLabels.tab4}
            >
              <Compass className="size-5" />
            </button>
          </div>

          {/* ── Aba 1: Grid de Fotos ── */}
          {activeTab === "grid" && (
            <div className="pt-3">
              {images.length > 0 ? (
                <div className="grid grid-cols-3 gap-1 rounded-xl overflow-hidden">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFullscreenImage(img)}
                      className="relative aspect-square bg-muted overflow-hidden group cursor-pointer"
                    >
                      <img
                        src={img}
                        alt={`Foto ${i + 1}`}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="size-4 text-white drop-shadow-md" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Nenhuma foto cadastrada para este anúncio.
                </div>
              )}
            </div>
          )}

          {/* ── Aba 2: Ficha Técnica & Especificações do Nicho ── */}
          {activeTab === "resort" && (
            <div className="pt-4 space-y-4">
              {/* Card de Preço & Condição Principal */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                    Condição Comercial
                  </span>
                  <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                    {pricingType === "starting_at" ? "A partir de" : pricingType === "on_quote" ? "Sob Cotação" : "Tarifa Direta"}
                  </Badge>
                </div>

                <div className="flex items-baseline gap-2">
                  {pricingType === "on_quote" ? (
                    <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight font-display">
                      Sob Consulta
                    </span>
                  ) : pricingType === "free" ? (
                    <span className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight font-display">
                      Gratuito (Doação)
                    </span>
                  ) : pricingType === "exchange_only" ? (
                    <span className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight font-display">
                      Somente Troca / Permuta
                    </span>
                  ) : pricingType === "price_range" && priceMinCents && priceMaxCents ? (
                    <span className="text-xl sm:text-2xl font-black text-foreground tracking-tight font-display">
                      {formatMoney(priceMinCents)} a {formatMoney(priceMaxCents)}
                    </span>
                  ) : priceCents > 0 ? (
                    <>
                      {pricingType === "starting_at" && (
                        <span className="text-xs text-muted-foreground font-semibold">A partir de</span>
                      )}
                      <span className="text-2xl font-black text-foreground tracking-tight font-display">
                        {maxInstallments > 1 ? `${maxInstallments}x ${formatMoney(installmentCents)}` : formatMoney(priceCents)}
                      </span>
                      {maxInstallments > 1 && (
                        <span className="text-xs text-muted-foreground font-medium">sem juros</span>
                      )}
                    </>
                  ) : (
                    <span className="text-lg font-bold text-foreground">Consulte Valores</span>
                  )}
                </div>

                {/* Disclaimer legal em destaque */}
                {disclaimerText && (
                  <p className="text-[11px] text-muted-foreground flex items-start gap-1 pt-0.5">
                    <Info className="size-3 text-primary shrink-0 mt-0.5" />
                    <span>{disclaimerText}</span>
                  </p>
                )}
              </div>

              {/* Especificações por Nicho */}
              {nicheId.includes("hosped") && (
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2.5 text-xs">
                  <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">Hospedagem</h4>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Check-in: <strong className="text-foreground">{attrs.checkin_time || "14:00"}</strong></div>
                    <div>Check-out: <strong className="text-foreground">{attrs.checkout_time || "11:00"}</strong></div>
                    <div>Hóspedes: <strong className="text-foreground">{attrs.max_guests || 1} máx.</strong></div>
                    <div>Taxa de limpeza: <strong className="text-foreground">{attrs.cleaning_fee_cents ? formatMoney(attrs.cleaning_fee_cents) : "Inclusa"}</strong></div>
                  </div>
                </div>
              )}

              {nicheId.includes("imov") && (
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2.5 text-xs">
                  <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">Imóvel</h4>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Finalidade: <strong className="text-foreground capitalize">{attrs.deal_type || "Venda"}</strong></div>
                    <div>Área: <strong className="text-foreground">{attrs.area_sqm ? `${attrs.area_sqm} m²` : "—"}</strong></div>
                    <div>Quartos: <strong className="text-foreground">{attrs.bedrooms || "—"} ({attrs.suites || 0} suítes)</strong></div>
                    <div>Vagas de Garagem: <strong className="text-foreground">{attrs.parking_spots || "—"}</strong></div>
                    <div>Condomínio: <strong className="text-foreground">{attrs.condo_cents ? formatMoney(attrs.condo_cents) : "Isento"}</strong></div>
                    <div>IPTU: <strong className="text-foreground">{attrs.iptu_cents ? formatMoney(attrs.iptu_cents) : "Isento"}</strong></div>
                  </div>
                </div>
              )}

              {nicheId.includes("veic") && (
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2.5 text-xs">
                  <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">Veículo</h4>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Marca/Modelo: <strong className="text-foreground">{attrs.brand} {attrs.model}</strong></div>
                    <div>Ano Fab/Mod: <strong className="text-foreground">{attrs.year_fab || "—"}/{attrs.year_model || "—"}</strong></div>
                    <div>Quilometragem: <strong className="text-foreground">{attrs.mileage_km ? `${attrs.mileage_km} km` : "Zero Km"}</strong></div>
                    <div>Câmbio: <strong className="text-foreground">{attrs.transmission || "Automático"}</strong></div>
                    <div>Combustível: <strong className="text-foreground">{attrs.fuel_type || "Flex"}</strong></div>
                    <div>Cor: <strong className="text-foreground">{attrs.color || "—"}</strong></div>
                  </div>
                </div>
              )}

              {/* Descrição Completa */}
              {classified.content && (
                <div className="space-y-1.5 text-xs text-foreground/80 leading-relaxed bg-muted/20 p-4 rounded-2xl border border-border/30">
                  <h3 className="font-bold text-foreground text-sm">Sobre</h3>
                  <p className="whitespace-pre-line">{classified.content}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Aba 3: Conteúdo / Aprofundamento / Roteiro ── */}
          {activeTab === "itinerary" && (
            <div className="pt-4 space-y-4">
              {itineraryDays.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-border">
                  {itineraryDays.map((item: any, idx: number) => (
                    <div key={idx} className="relative space-y-2">
                      <div className="absolute -left-6 top-0.5 size-5 rounded-full bg-background border-2 border-foreground flex items-center justify-center text-[10px] font-bold text-foreground">
                        {item.day_number || idx + 1}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-xs sm:text-sm text-foreground tracking-tight">
                            {item.title}
                          </h4>
                          {item.date && (
                            <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                              {item.date}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        {item.image && (
                          <div className="pt-1.5">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-36 object-cover rounded-xl border border-border/40"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Fallback semântico para outros nichos: lista de comodidades ou diferenciais */
                <div className="space-y-3">
                  {Array.isArray(attrs.amenities) && attrs.amenities.length > 0 && (
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2">
                      <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">Comodidades</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {attrs.amenities.map((a: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs font-medium bg-background">
                            ✓ {a}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {bioBullets.length > 0 && (
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2">
                      <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">Destaques</h4>
                      <div className="space-y-1.5">
                        {bioBullets.map((b, i) => (
                          <p key={i} className="text-xs text-foreground font-medium flex items-center gap-1.5">
                            <span>{b}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {!attrs.amenities?.length && !bioBullets.length && (
                    <div className="py-12 text-center text-xs text-muted-foreground">
                      Nenhum roteiro ou diferencial detalhado cadastrado.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Aba 4: Explore, Condições Comerciais & Pagamento ── */}
          {activeTab === "explore" && (
            <div className="pt-4 space-y-4">
              {/* Card Completo de Regras de Pagamento */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-3">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                  <CreditCard className="size-4 text-primary" />
                  <span>Formas de Pagamento & Condições</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  {acceptsPix && (
                    <div className="p-2.5 rounded-xl bg-background border border-border/50 flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                        <QrCode className="size-4.5" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">PIX à Vista</p>
                        <p className="text-[11px] text-muted-foreground">
                          {pixDiscountPercent > 0 ? `${pixDiscountPercent}% de desconto imediato` : "Aprovação instantânea"}
                        </p>
                      </div>
                    </div>
                  )}

                  {acceptsCard && (
                    <div className="p-2.5 rounded-xl bg-background border border-border/50 flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <CreditCard className="size-4.5" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">Cartão de Crédito</p>
                        <p className="text-[11px] text-muted-foreground">
                          Em até <strong>{maxInstallments}x</strong> {installmentCents > 0 ? `de ${formatMoney(installmentCents)}` : ""}
                        </p>
                      </div>
                    </div>
                  )}

                  {acceptsCash && (
                    <div className="p-2.5 rounded-xl bg-background border border-border/50 flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                        <Coins className="size-4.5" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">Dinheiro em Espécie</p>
                        <p className="text-[11px] text-muted-foreground">Pagamento presencial na retirada</p>
                      </div>
                    </div>
                  )}

                  {acceptsTrade && (
                    <div className="p-2.5 rounded-xl bg-background border border-border/50 flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                        <Handshake className="size-4.5" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">Aceita Permuta / Troca</p>
                        <p className="text-[11px] text-muted-foreground">
                          {tradeNotes || "Aceita propostas de troca por outros itens"}
                        </p>
                      </div>
                    </div>
                  )}

                  {acceptsFinancing && (
                    <div className="p-2.5 rounded-xl bg-background border border-border/50 flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                        <Landmark className="size-4.5" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">Financiamento / Consórcio</p>
                        <p className="text-[11px] text-muted-foreground">Suporte bancário e aprovação de crédito</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Política de Cancelamento */}
                <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Política de Cancelamento:</span>
                  <span className="font-bold text-foreground capitalize">{cancellationPolicy}</span>
                </div>
              </div>

              {/* Card de Voo (apenas nicho viagem) */}
              {flightDetails && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-xl bg-foreground text-background flex items-center justify-center">
                        <Plane className="size-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-foreground">Como chegar</h4>
                        {flightDetails.duration_text && (
                          <p className="text-[11px] text-muted-foreground">{flightDetails.duration_text}</p>
                        )}
                      </div>
                    </div>
                    {flightDetails.price_text && (
                      <span className="font-extrabold text-sm text-foreground font-display">
                        {flightDetails.price_text}
                      </span>
                    )}
                  </div>
                  {flightDetails.origin_text && (
                    <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                      {flightDetails.origin_text}
                    </p>
                  )}
                </div>
              )}

              {/* Clima Real via wttr.in */}
              {destinationCity ? (
                <WeatherWidget city={destinationCity} />
              ) : null}

              {/* Mapa Interativo */}
              {classified.location_lat && classified.location_lng ? (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <MapPin className="size-4 text-primary" />
                    <span>Localização</span>
                  </h4>
                  <div className="h-56 w-full rounded-2xl overflow-hidden border border-border/40 relative">
                    <MapLibreCanvas
                      center={{
                        lat: classified.location_lat,
                        lng: classified.location_lng,
                      }}
                      zoom={13}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ── Barra Inferior Flutuante Fixa (Sticky Thumb Zone Bar) ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/60 p-3 max-w-xl mx-auto flex items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-col min-w-0">
          {pricingType === "on_quote" ? (
            <span className="text-sm sm:text-base font-black text-foreground tracking-tight">Sob Consulta</span>
          ) : pricingType === "free" ? (
            <span className="text-sm sm:text-base font-black text-emerald-600 tracking-tight">Gratuito</span>
          ) : pricingType === "exchange_only" ? (
            <span className="text-sm sm:text-base font-black text-amber-600 tracking-tight">Somente Troca</span>
          ) : priceCents > 0 ? (
            <>
              <div className="flex items-baseline gap-1.5">
                {pricingType === "starting_at" && (
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">A partir</span>
                )}
                {maxInstallments > 1 ? (
                  <>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      {maxInstallments}x
                    </span>
                    <span className="text-base sm:text-lg font-black text-foreground tracking-tight font-display truncate">
                      {formatMoney(installmentCents)}
                    </span>
                  </>
                ) : (
                  <span className="text-base sm:text-lg font-black text-foreground tracking-tight font-display truncate">
                    {formatMoney(priceCents)}
                  </span>
                )}
              </div>
              <span className="text-[10.5px] text-muted-foreground truncate">
                {maxInstallments > 1 ? `Total: ${formatMoney(priceCents)}` : "À vista"}
              </span>
            </>
          ) : (
            <span className="text-xs font-bold text-foreground">Consulte Valores</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(classified?.contact_whatsapp || classified?.whatsapp) && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleWhatsAppDirect}
              className="size-11 rounded-full border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Falar no WhatsApp"
            >
              <MessageCircle className="size-5" />
            </Button>
          )}

          <Button
            onClick={handleOpenAction}
            className="h-11 px-5 sm:px-6 rounded-full bg-foreground text-background hover:bg-foreground/90 font-extrabold text-xs tracking-tight shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            {getPrimaryCtaLabel()}
          </Button>
        </div>
      </div>

      {/* ── Modal de Story Individual ── */}
      {activeStoryModal && (
        <Dialog open={!!activeStoryModal} onOpenChange={() => setActiveStoryModal(null)}>
          <DialogContent className="max-w-sm p-4 rounded-2xl bg-background/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-foreground">
                {activeStoryModal.title}
              </DialogTitle>
            </DialogHeader>
            <div className="pt-2">
              <img
                src={activeStoryModal.image || images[0]}
                alt={activeStoryModal.title}
                className="w-full h-80 object-cover rounded-xl"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Modal de Imagem em Tela Cheia ── */}
      {fullscreenImage && (
        <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
          <DialogContent className="max-w-2xl p-2 bg-black/95 border-none">
            <img
              src={fullscreenImage}
              alt="Ampliação"
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* ── Modal de Informações do Anúncio ── */}
      <TravelBookingDossierModal
        open={isBookingDossierOpen}
        onOpenChange={setIsBookingDossierOpen}
        classified={classified}
      />
    </div>
  );
}


// ── Retrocompatibilidade Canônica ───────────────────────────────────────────
export const InstagramTravelView = EditorialShowcaseView;
export type InstagramTravelViewProps = EditorialShowcaseViewProps;
