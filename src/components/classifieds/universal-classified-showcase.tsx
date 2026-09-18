import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Share2,
  MapPin,
  Check,
  ShieldCheck,
  Tag,
  Building,
  Home as HomeIcon,
  Car,
  Key,
  Calendar,
  Clock,
  Users,
  User,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  X,
  Phone,
  MessageCircle,
  Download,
  Package,
  Truck,
  Bed,
  Bath,
  CarFront,
  Ruler,
  CheckCircle2,
  Sparkles,
  HelpCircle,
  FileCheck,
  Handshake,
  Hotel,
  Briefcase,
  Layers,
  Edit3,
  Smartphone,
  Play,
  FileText,
  AlertCircle,
  Coins,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { FavoriteButton } from "@/components/common/favorite-button";
import { MapLibreCanvas } from "@/components/mobility/maplibre-canvas";
import { resolveClassifiedNiche, getClassifiedFeatureCards } from "@/lib/classifieds/semantics";
import {
  getEducationLabel,
  getExperienceLabel,
  getRegimeLabel,
  getWorkplaceModelLabel,
} from "@/lib/classifieds/canonical-hiring";
import { DEPARTURE_STATUS_CONFIG, type DepartureOption } from "@/lib/classifieds/canonical-airports";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mov") ||
    clean.includes("video")
  );
}

export interface UniversalClassifiedShowcaseProps {
  classified: any;
  isOwner?: boolean;
  canManage?: boolean;
  viewerContext?: string;
  currentProfile?: any;
  onOpenBookingModal?: (selectedDeparture?: any) => void;
  onOpenProposalModal?: () => void;
  onDirectBuy?: () => void;
  onDownloadDigital?: () => void;
  onEdit?: () => void;
  onOpenCompanion?: () => void;
  isBooking?: boolean;
  isBuyingDirect?: boolean;
  isDownloadingDigital?: boolean;
}

export function UniversalClassifiedShowcase({
  classified,
  isOwner = false,
  canManage = false,
  viewerContext = "anonymous",
  currentProfile,
  onOpenBookingModal,
  onOpenProposalModal,
  onDirectBuy,
  onDownloadDigital,
  onEdit,
  onOpenCompanion,
  isBooking = false,
  isBuyingDirect = false,
  isDownloadingDigital = false,
}: UniversalClassifiedShowcaseProps) {
  const navigate = useNavigate();
  const [activeImage, setActiveImage] = useState(0);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // 1. Extração Normalizada de Imagens
  const images: string[] = useMemo(() => {
    if (Array.isArray(classified?.images) && classified.images.length > 0) return classified.images;
    if (Array.isArray(classified?.media) && classified.media.length > 0) return classified.media;
    if (Array.isArray(classified?.media_urls) && classified.media_urls.length > 0) return classified.media_urls;
    return [];
  }, [classified]);

  // 2. Resolução do Nicho & Semântica
  const niche = useMemo(() => resolveClassifiedNiche(classified), [classified]);
  const author = classified?.profiles || {};

  // 3. Preços e Custos
  const priceCents = classified?.price_cents || 0;
  const maxInstallments = Math.max(1, Number(classified?.attributes?.max_installments) || 12);
  const installmentCents = Math.round(priceCents / maxInstallments);

  // Custos Imobiliários
  const condoCents = Number(classified?.attributes?.condo_cents) || 0;
  const iptuCents = Number(classified?.attributes?.iptu_cents) || 0;
  const totalMonthlyCents = priceCents + condoCents + iptuCents;

  // 4. Compartilhamento Nativo
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: classified.title,
          text: `Confira "${classified.title}" no Waesy:`,
          url,
        });
      } catch (e) {
        // Ignorar cancelamento
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link do anúncio copiado para a área de transferência!");
    }
  };

  // 5. Contato WhatsApp
  const handleWhatsApp = () => {
    const phone = classified.contact_whatsapp || classified.whatsapp;
    if (!phone) {
      toast.error("Número de WhatsApp não informado pelo anunciante.");
      return;
    }
    trackAndOpenWhatsApp({
      phone,
      message: `Olá! Vi o anúncio "${classified.title}" no Waesy e gostaria de mais informações. Link: ${window.location.href}`,
      source: "classified_detail",
      metadata: { classifiedId: classified.id },
    });
  };

  // 6. Badges Sutis (Padrão Mobg / Airbnb: #F3F4F6, 11px, neutras)
  const subtleBadges = useMemo(() => {
    const list: string[] = [];
    if (classified?.status === "active") list.push("Disponível");
    if (classified?.status === "reserved") list.push("Reservado");

    if (classified?.category === "real_estate") {
      if (classified.deal_type === "venda" || classified.dealType === "venda") list.push("Venda");
      else list.push("Aluguel Mensal");
      if (classified.attributes?.property_type) list.push(classified.attributes.property_type);
      if (classified.attributes?.furnished) list.push(classified.attributes.furnished);
    } else if (classified?.category === "vehicle") {
      list.push("Veículo");
      if (classified.attributes?.year) list.push(String(classified.attributes.year));
      if (classified.attributes?.transmission) list.push(classified.attributes.transmission);
      if (classified.attributes?.fuel) list.push(classified.attributes.fuel);
    } else if (niche.id === "hospitality_stay") {
      list.push("Temporada");
      if (classified?.attributes?.property_type) list.push(classified.attributes.property_type);
    } else if (niche.id === "travel") {
      list.push("Pacote de Viagem");
      if (classified?.attributes?.duration_days) list.push(`${classified.attributes.duration_days} Dias`);
    } else if (classified?.category === "service") {
      list.push("Serviço Profissional");
    } else if (classified?.category === "job") {
      list.push("Vaga de Emprego");
      if (classified?.attributes?.regime) list.push(getRegimeLabel(classified.attributes.regime));
    } else {
      if (classified?.condition === "new") list.push("Novo / Na Caixa");
      else if (classified?.condition === "used") list.push("Usado");
    }

    if (classified?.negotiable === false) list.push("Valor Fixo");
    return list.slice(0, 4);
  }, [classified, niche]);

  // 7. Minicards de Ficha Técnica (Padrão Mobg)
  const techCards = useMemo(() => {
    const cards: Array<{ icon: any; label: string; value: string }> = [];
    if (!classified) return cards;

    if (classified.category === "real_estate") {
      if (classified.area_sqm) {
        cards.push({ icon: Ruler, label: "Área útil", value: `${classified.area_sqm} m²` });
      }
      if (classified.bedrooms) {
        const suites = classified.attributes?.suites ? ` (${classified.attributes.suites} suíte${classified.attributes.suites > 1 ? "s" : ""})` : "";
        cards.push({ icon: Bed, label: "Quartos", value: `${classified.bedrooms}${suites}` });
      }
      if (classified.bathrooms) {
        cards.push({ icon: Bath, label: "Banheiros", value: String(classified.bathrooms) });
      }
      if (classified.parking_spots) {
        cards.push({ icon: CarFront, label: "Vagas", value: String(classified.parking_spots) });
      }
      if (classified.attributes?.furnished && cards.length < 4) {
        cards.push({ icon: HomeIcon, label: "Mobília", value: classified.attributes.furnished });
      }
    } else if (classified.category === "vehicle") {
      if (classified.attributes?.mileage) {
        cards.push({ icon: Car, label: "Quilometragem", value: `${Number(classified.attributes.mileage).toLocaleString("pt-BR")} km` });
      }
      if (classified.attributes?.year) {
        cards.push({ icon: Calendar, label: "Ano Modelo", value: String(classified.attributes.year) });
      }
      if (classified.attributes?.transmission) {
        cards.push({ icon: Layers, label: "Câmbio", value: classified.attributes.transmission });
      }
      if (classified.attributes?.fuel) {
        cards.push({ icon: Sparkles, label: "Combustível", value: classified.attributes.fuel });
      }
    } else if (classified.category === "job") {
      if (classified.attributes?.regime) {
        cards.push({ icon: Briefcase, label: "Regime", value: getRegimeLabel(classified.attributes.regime) });
      }
      if (classified.attributes?.workplace_model) {
        cards.push({ icon: Building, label: "Modelo", value: getWorkplaceModelLabel(classified.attributes.workplace_model) });
      }
      if (classified.attributes?.experience_level) {
        cards.push({ icon: Clock, label: "Experiência", value: getExperienceLabel(classified.attributes.experience_level) });
      }
      if (classified.attributes?.education_level) {
        cards.push({ icon: FileCheck, label: "Escolaridade", value: getEducationLabel(classified.attributes.education_level) });
      }
    } else if (classified.category === "service") {
      if (classified.attributes?.modality) {
        cards.push({ icon: Briefcase, label: "Atendimento", value: classified.attributes.modality === "remoto" ? "Remoto / Online" : "Presencial" });
      }
      if (classified.attributes?.estimated_time) {
        cards.push({ icon: Clock, label: "Prazo Estimado", value: classified.attributes.estimated_time });
      }
      if (classified.attributes?.warranty_days) {
        cards.push({ icon: ShieldCheck, label: "Garantia", value: `${classified.attributes.warranty_days} dias` });
      }
      cards.push({ icon: Handshake, label: "Orçamento", value: classified.price_cents ? formatMoney(classified.price_cents) : "Sob Consulta" });
    } else if (classified.category === "digital" || classified.digital_file_url) {
      if (classified.attributes?.file_format) {
        cards.push({ icon: FileCheck, label: "Formato", value: classified.attributes.file_format.toUpperCase() });
      }
      if (classified.attributes?.file_size_bytes) {
        const mb = (classified.attributes.file_size_bytes / (1024 * 1024)).toFixed(1);
        cards.push({ icon: Download, label: "Tamanho", value: `${mb} MB` });
      }
      if (classified.attributes?.version) {
        cards.push({ icon: Sparkles, label: "Versão", value: classified.attributes.version });
      }
      cards.push({ icon: ShieldCheck, label: "Acesso", value: "Download Imediato" });
    } else if (niche.id === "hospitality_stay") {
      if (classified.attributes?.max_guests) {
        cards.push({ icon: Users, label: "Capacidade", value: `Até ${classified.attributes.max_guests} hóspedes` });
      }
      cards.push({ icon: Clock, label: "Check-in", value: classified.attributes?.checkin_time || "14:00" });
      cards.push({ icon: Clock, label: "Check-out", value: classified.attributes?.checkout_time || "11:00" });
      if (classified.bedrooms) {
        cards.push({ icon: Bed, label: "Quartos", value: `${classified.bedrooms} quarto(s)` });
      }
    } else if (niche.id === "travel") {
      if (classified.attributes?.duration_days) {
        cards.push({ icon: Calendar, label: "Duração", value: `${classified.attributes.duration_days} Dias` });
      }
      if (classified.attributes?.destination_city) {
        cards.push({ icon: MapPin, label: "Destino", value: classified.attributes.destination_city });
      }
      cards.push({ icon: ShieldCheck, label: "Hospedagem", value: classified.attributes?.hotel_included !== false ? "Inclusa" : "À parte" });
      cards.push({ icon: CheckCircle2, label: "Transporte", value: classified.attributes?.transport_type || "Aéreo/Rodoviário" });
    } else {
      // Produto Físico / Desapego / Geral
      if (classified.condition) {
        cards.push({
          icon: Package,
          label: "Estado",
          value: classified.condition === "new" ? "Novo na caixa" : classified.condition === "refurbished" ? "Revisado" : "Usado",
        });
      }
      if (classified.attributes?.brand) {
        cards.push({ icon: Tag, label: "Marca", value: classified.attributes.brand });
      }
      if (classified.attributes?.warranty) {
        cards.push({ icon: ShieldCheck, label: "Garantia", value: classified.attributes.warranty });
      }
      cards.push({
        icon: Truck,
        label: "Entrega / Retirada",
        value: classified.attributes?.delivery_available ? "Envio disponível" : "Apenas retirada",
      });
    }

    return cards;
  }, [classified, niche]);

  // 8. Comodidades & Facilidades (Lista 2 colunas estilo Airbnb)
  const amenitiesList: string[] = useMemo(() => {
    if (!classified) return [];
    if (Array.isArray(classified.amenities) && classified.amenities.length > 0) return classified.amenities;
    if (Array.isArray(classified.attributes?.amenities) && classified.attributes.amenities.length > 0) return classified.attributes.amenities;
    if (Array.isArray(classified.attributes?.features) && classified.attributes.features.length > 0) return classified.attributes.features;
    return [];
  }, [classified]);

  // 9. Saídas Confirmadas (Para Viagens & Turismo)
  const departureOptions: DepartureOption[] = useMemo(() => {
    if (Array.isArray(classified?.attributes?.departure_options)) {
      return classified.attributes.departure_options;
    }
    return [];
  }, [classified]);

  // 10. Regras da Casa (Para Hospedagem & Temporada)
  const houseRules: string[] = useMemo(() => {
    if (Array.isArray(classified?.attributes?.house_rules)) {
      return classified.attributes.house_rules;
    }
    return [];
  }, [classified]);

  // 11. CTA Primário Derivado por Nicho
  const primaryCta = useMemo(() => {
    if (niche.id === "hospitality_stay" || niche.id === "travel") {
      return {
        label: niche.id === "travel" ? "Reservar Pacote" : "Reservar Diárias",
        action: () => onOpenBookingModal?.(),
      };
    }
    if (classified?.category === "real_estate") {
      return {
        label: "Agendar Visita",
        action: () => onOpenProposalModal?.(),
      };
    }
    if (classified?.digital_file_url || classified?.category === "digital") {
      return {
        label: isDownloadingDigital ? "Baixando..." : "Baixar Arquivo",
        action: () => onDownloadDigital?.(),
      };
    }
    if (onDirectBuy && priceCents > 0) {
      return {
        label: isBuyingDirect ? "Processando..." : "Comprar com Garantia",
        action: () => onDirectBuy?.(),
      };
    }
    return {
      label: "Fazer Proposta",
      action: () => onOpenProposalModal?.(),
    };
  }, [niche, classified, onOpenBookingModal, onOpenProposalModal, onDirectBuy, onDownloadDigital, isBuyingDirect, isDownloadingDigital, priceCents]);

  const locationText = classified?.address || [classified?.neighborhood, classified?.city, classified?.state].filter(Boolean).join(", ") || "Localização sob consulta";

  return (
    <div className="w-full min-h-screen bg-background text-foreground pb-20 lg:pb-12">
      {/* ── Top Bar Minimalista (Voltar + Ações) ── */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between gap-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-9 px-2.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground -ml-2"
        >
          <Link to="/classificados">
            <ArrowLeft className="size-4 mr-1.5" />
            <span>Voltar aos anúncios</span>
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-9 px-3 rounded-xl text-xs font-medium border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
            >
              <Edit3 className="size-3.5 mr-1.5" />
              <span>Editar Anúncio</span>
            </Button>
          )}

          {onOpenCompanion && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCompanion}
              className="h-9 px-3 rounded-xl text-xs font-medium border-border/50 bg-background hover:bg-muted/50 text-foreground hidden sm:flex items-center gap-1.5"
            >
              <Smartphone className="size-3.5 text-primary" />
              <span>Guia Digital 9:16</span>
            </Button>
          )}

          <FavoriteButton
            targetId={classified.id}
            targetType="classified"
            variant="button"
            className="h-9 w-9 rounded-xl border border-border/50 bg-background hover:bg-muted/50 p-0 flex items-center justify-center text-muted-foreground"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="h-9 px-3 rounded-xl text-xs font-medium border-border/50 bg-background hover:bg-muted/50 text-foreground"
          >
            <Share2 className="size-3.5 mr-1.5" />
            <span className="hidden sm:inline">Compartilhar</span>
          </Button>
        </div>
      </div>

      {/* ── Modo Proprietário Banner Sutil (Regra 23) ── */}
      {isOwner && (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 mb-4">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="font-medium">Modo Proprietário: Você está visualizando seu próprio anúncio público.</span>
            </div>
            {onOpenCompanion && (
              <button
                type="button"
                onClick={onOpenCompanion}
                className="text-[11px] font-bold text-amber-900 dark:text-amber-100 hover:underline sm:hidden flex items-center gap-1"
              >
                <Smartphone className="size-3" />
                <span>Guia 9:16</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Seção de Mídia (Mobile: Edge-to-Edge / Desktop: Mosaico Airbnb) ── */}
      <section aria-label="Galeria de Fotos e Vídeos" className="w-full max-w-7xl mx-auto px-0 sm:px-6 mb-4 sm:mb-5">
        {images.length > 0 ? (
          <>
            {/* MOBILE: Carrossel Edge-to-Edge sem bordas laterais */}
            <div className="sm:hidden relative w-full aspect-[16/10] bg-muted/20 overflow-hidden select-none">
              {isVideoUrl(images[activeImage]) ? (
                <video
                  src={images[activeImage]}
                  controls
                  playsInline
                  className="size-full object-contain bg-black/90"
                />
              ) : (
                <img
                  src={images[activeImage]}
                  alt={classified.title}
                  className="size-full object-cover cursor-pointer"
                  onClick={() => setFullscreenImage(images[activeImage])}
                />
              )}
              {images.length > 1 && (
                <>
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] font-mono font-medium">
                    {activeImage + 1} / {images.length}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveImage((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImage((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 size-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm"
                    aria-label="Próxima foto"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </>
              )}
            </div>

            {/* DESKTOP: Mosaico Elegante (1 Principal + 4 Laterais ou Banner Expandido) */}
            <div className="hidden sm:block">
              {images.length === 1 ? (
                <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden bg-muted/30 border border-border/40 relative group">
                  {isVideoUrl(images[0]) ? (
                    <video
                      src={images[0]}
                      controls
                      playsInline
                      className="size-full object-contain bg-black/90"
                    />
                  ) : (
                    <>
                      <img
                        src={images[0]}
                        alt={classified.title}
                        className="size-full object-cover cursor-pointer group-hover:scale-[1.01] transition-transform duration-300"
                        onClick={() => setFullscreenImage(images[0])}
                      />
                      <button
                        type="button"
                        onClick={() => setFullscreenImage(images[0])}
                        className="absolute bottom-4 right-4 px-3 py-1.5 rounded-xl bg-background/80 hover:bg-background text-foreground text-xs font-medium backdrop-blur-md border border-border/50 shadow-xs flex items-center gap-1.5 transition-all"
                      >
                        <Maximize2 className="size-3.5" />
                        <span>Ver em tela cheia</span>
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 aspect-[21/9] rounded-2xl overflow-hidden border border-border/40 bg-muted/20 relative group">
                  {/* Foto Dominante Esquerda (2 colunas) */}
                  <div className="col-span-2 row-span-2 relative overflow-hidden bg-muted/30">
                    {isVideoUrl(images[0]) ? (
                      <video
                        src={images[0]}
                        controls
                        playsInline
                        className="size-full object-contain bg-black/90"
                      />
                    ) : (
                      <img
                        src={images[0]}
                        alt={classified.title}
                        className="size-full object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-300"
                        onClick={() => setFullscreenImage(images[0])}
                      />
                    )}
                  </div>

                  {/* Fotos Secundárias Direita (2 colunas x 2 linhas) */}
                  {images.slice(1, 5).map((img, idx) => (
                    <div key={idx} className="relative overflow-hidden bg-muted/30">
                      {isVideoUrl(img) ? (
                        <div
                          className="size-full bg-black/80 flex items-center justify-center cursor-pointer relative"
                          onClick={() => setFullscreenImage(img)}
                        >
                          <Play className="size-8 text-white/80" />
                        </div>
                      ) : (
                        <img
                          src={img}
                          alt={`${classified.title} - Foto ${idx + 2}`}
                          className="size-full object-cover cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                          onClick={() => setFullscreenImage(img)}
                        />
                      )}
                    </div>
                  ))}

                  {/* Botão Flutuante Mostrar Todas as Fotos */}
                  <button
                    type="button"
                    onClick={() => setFullscreenImage(images[0])}
                    className="absolute bottom-4 right-4 px-3.5 py-2 rounded-xl bg-background/90 hover:bg-background text-foreground text-xs font-semibold backdrop-blur-md border border-border/60 shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Maximize2 className="size-3.5" />
                    <span>Mostrar todas as {images.length} fotos</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full aspect-[21/9] sm:rounded-2xl bg-muted/30 border border-border/40 flex flex-col items-center justify-center text-muted-foreground">
            <Tag className="size-10 stroke-[1.5] mb-2 opacity-50" />
            <span className="text-xs font-medium">Anúncio sem fotos cadastradas</span>
          </div>
        )}
      </section>

      {/* ── Grid Principal de Conteúdo (Split Layout: 7 colunas Conteúdo / 5 colunas Sticky Card) ── */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 items-start">
          {/* ══════════════════════════════════════════════════════════
              COLUNA ESQUERDA: Informações, Ficha, Descrição, Mapa (7 cols)
              ══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6">
            {/* 1. Header de Identidade & Título */}
            <div className="space-y-2">
              {/* Badges Sutis (Padrão Mobg) */}
              <div className="flex flex-wrap items-center gap-1.5">
                {subtleBadges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/40"
                  >
                    {badge}
                  </span>
                ))}
                {classified?.id && (
                  <span className="text-[11px] text-muted-foreground/60 font-mono ml-auto">
                    #{classified.id.slice(0, 6)}
                  </span>
                )}
              </div>

              {/* Título Principal */}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground leading-snug">
                {classified?.title}
              </h1>

              {/* Localização & Subtítulo */}
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0 text-muted-foreground/80" />
                <span className="truncate">{locationText}</span>
              </div>
            </div>

            {/* Divisor Sutil */}
            <div className="h-px w-full bg-border/40" />

            {/* 2. Ficha Técnica (Minicards de Atributos: Mobg Style) */}
            {techCards.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Características Principais
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {techCards.map((card, idx) => {
                    const IconComponent = card.icon;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl p-3 bg-muted/20 border border-border/40 flex flex-col justify-between min-h-[72px]"
                      >
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                          <IconComponent className="size-3.5 shrink-0" />
                          <span className="truncate">{card.label}</span>
                        </div>
                        <span className="text-sm sm:text-base font-bold text-foreground font-mono truncate">
                          {card.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Tabela de Valores e Custos (Quando aplicável a Imóvel ou Locação) */}
            {classified?.category === "real_estate" && (condoCents > 0 || iptuCents > 0) && (
              <div className="rounded-xl border border-border/40 bg-muted/10 p-4 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Composição de Valores & Custos
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Aluguel Base</span>
                    <strong className="text-foreground text-sm font-mono">{formatMoney(priceCents)}/mês</strong>
                  </div>
                  {condoCents > 0 && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Condomínio Estimado</span>
                      <strong className="text-foreground text-sm font-mono">{formatMoney(condoCents)}/mês</strong>
                    </div>
                  )}
                  {iptuCents > 0 && (
                    <div>
                      <span className="text-muted-foreground block text-[11px]">IPTU Mensal</span>
                      <strong className="text-foreground text-sm font-mono">{formatMoney(iptuCents)}/mês</strong>
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground">Custo Mensal Total Estimado:</span>
                  <span className="text-base font-bold text-foreground font-mono">{formatMoney(totalMonthlyCents)}/mês</span>
                </div>
              </div>
            )}

            {/* 4. Descrição Editorial do Anúncio */}
            {classified?.content && (
              <div className="space-y-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Sobre este Anúncio
                </h2>
                <div
                  className={cn(
                    "text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed font-sans transition-all",
                    !isDescExpanded && "line-clamp-6"
                  )}
                >
                  {classified.content}
                </div>
                {classified.content.length > 300 && (
                  <button
                    type="button"
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 pt-1"
                  >
                    <span>{isDescExpanded ? "Ver menos" : "Ler descrição completa"}</span>
                    <ChevronRight className={cn("size-3.5 transition-transform", isDescExpanded && "-rotate-90")} />
                  </button>
                )}
              </div>
            )}

            {/* 4.5 Características Detalhadas (Todos os atributos do CMS não exibidos) */}
            {(() => {
              if (!classified?.attributes) return null;
              const excludeKeys = [
                "condo_cents", "iptu_cents", "property_type", "furnished", "year", "transmission", "fuel", "mileage",
                "regime", "workplace_model", "experience_level", "education_level", "modality", "estimated_time",
                "warranty_days", "file_format", "file_size_bytes", "version", "max_guests", "checkin_time",
                "checkout_time", "duration_days", "destination_city", "hotel_included", "transport_type",
                "brand", "warranty", "delivery_available", "amenities", "features", "departure_options",
                "house_rules", "max_installments"
              ];
              const extraAttributes = Object.entries(classified.attributes).filter(
                ([k, v]) => !excludeKeys.includes(k) && v !== null && v !== undefined && v !== "" && (Array.isArray(v) ? v.length > 0 : true)
              );

              if (extraAttributes.length === 0) return null;

              return (
                <div className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Ficha Técnica Completa
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs border border-border/40 bg-muted/10 p-4 rounded-xl">
                    {extraAttributes.map(([key, value], idx) => {
                      const label = key
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (char) => char.toUpperCase());
                      
                      let formattedValue = "";
                      if (typeof value === "boolean") {
                        formattedValue = value ? "Sim" : "Não";
                      } else if (Array.isArray(value)) {
                        formattedValue = value.join(", ");
                      } else {
                        formattedValue = String(value);
                      }

                      return (
                        <div key={idx} className="flex justify-between items-start border-b border-border/40 pb-2 last:border-0 last:pb-0">
                          <span className="text-muted-foreground mr-4">{label}:</span>
                          <span className="text-foreground font-medium text-right break-words">{formattedValue}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 5. Saídas Confirmadas (Turismo & Viagens) */}
            {departureOptions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Saídas Confirmadas Disponíveis
                  </h2>
                  <span className="text-xs text-primary font-medium">{departureOptions.length} datas</span>
                </div>
                <div className="space-y-2">
                  {departureOptions.map((dep, idx) => {
                    const statusConfig = DEPARTURE_STATUS_CONFIG[dep.status || "confirmed"] || DEPARTURE_STATUS_CONFIG.confirmed;
                    return (
                      <div
                        key={dep.id || idx}
                        className="rounded-xl border border-border/40 bg-muted/15 p-3.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Calendar className="size-4 text-primary shrink-0" />
                            <strong className="text-foreground text-sm font-semibold">
                              {dep.date}
                            </strong>
                            <Badge variant="outline" className={cn("text-[10px] font-bold", statusConfig.badgeClass)}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          {dep.notes && <p className="text-[11px] text-muted-foreground">{dep.notes}</p>}
                        </div>

                        <div className="text-right shrink-0">
                          {dep.price_override_cents && dep.price_override_cents > 0 ? (
                            <div className="font-mono font-bold text-foreground">
                              {formatMoney(dep.price_override_cents)}
                            </div>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onOpenBookingModal?.(dep)}
                            className="h-8 px-2.5 text-xs text-primary font-bold hover:bg-primary/10"
                          >
                            <span>Reservar esta data</span>
                            <ChevronRight className="size-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. Regras da Casa (Hospedagem & Temporada) */}
            {houseRules.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Regras & Políticas da Estadia
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  {houseRules.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2 py-1">
                      <div className="size-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Divisor Sutil */}
            <div className="h-px w-full bg-border/40" />

            {/* 7. Comodidades & Facilidades (Estilo Airbnb: 2 colunas com ícones) */}
            {amenitiesList.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  O que este local / item oferece
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-foreground/90">
                  {amenitiesList.map((amenity, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 py-1.5">
                      <div className="size-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Check className="size-3" />
                      </div>
                      <span className="font-medium">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8. Localização & Mapa (Sem Grid-in-Grid: 100% da Largura, Cantos Arredondados 16px) */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Localização
              </h2>
              <div className="rounded-2xl border border-border/40 overflow-hidden bg-muted/20 relative aspect-[16/9] sm:h-72 w-full">
                {classified?.location_lat && classified?.location_lng ? (
                  <MapLibreCanvas
                    latitude={Number(classified.location_lat)}
                    longitude={Number(classified.location_lng)}
                    zoom={14}
                    className="size-full"
                    markerTitle={classified.title}
                  />
                ) : (
                  <div className="size-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-muted/30">
                    <MapPin className="size-8 stroke-[1.5] mb-2 opacity-50" />
                    <span className="text-xs font-medium max-w-sm">{locationText}</span>
                    <span className="text-[11px] text-muted-foreground/70 mt-1">
                      Coordenadas precisas mantidas em sigilo pelo anunciante para segurança.
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                <span>{locationText}</span>
              </p>
            </div>

            {/* 9. Perfil do Anunciante & Selo de Custódia Waesy */}
            <div className="rounded-2xl border border-border/40 bg-muted/15 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="size-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-base uppercase shrink-0 overflow-hidden">
                  {author.avatar_url ? (
                    <img src={author.avatar_url} alt={author.full_name || "Anunciante"} className="size-full object-cover" />
                  ) : (
                    <span>{(author.full_name || "A").charAt(0)}</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-foreground">
                      {author.full_name || classified?.store_name || "Anunciante da Comunidade"}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 bg-primary/10 text-primary border-primary/25">
                      Verificado
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anunciante na Waesy · Atendimento rápido via plataforma
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {(classified?.contact_whatsapp || classified?.whatsapp) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleWhatsApp}
                    className="h-9 px-3 rounded-xl text-xs font-semibold border-border/60 hover:bg-muted/60"
                  >
                    <MessageCircle className="size-3.5 mr-1.5 text-emerald-500" />
                    <span>WhatsApp</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Selo de Garantia de Custódia Waesy */}
            <div className="rounded-xl border border-border/30 bg-muted/10 p-3.5 flex items-start gap-3 text-xs text-muted-foreground">
              <ShieldCheck className="size-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="text-foreground block text-xs">Intermediação e Custódia Waesy</strong>
                <p className="text-[11px] leading-relaxed">
                  Negociações realizadas pela plataforma contam com proteção de pagamento em conta garantia até a confirmação de entrega ou cumprimento do contrato.
                </p>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
              COLUNA DIREITA: Card Sticky de Preço & Conversão (Desktop >= 1024px)
              ══════════════════════════════════════════════════════════ */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="sticky top-24 rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-6">
              {/* Bloco de Preço */}
              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold text-foreground font-mono">
                      {priceCents > 0 ? formatMoney(priceCents) : "Consulte"}
                    </span>
                    {niche.priceSuffix && (
                      <span className="text-sm font-normal text-muted-foreground">
                        {niche.priceSuffix}
                      </span>
                    )}
                  </div>
                  {classified?.negotiable !== false && priceCents > 0 && (
                    <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border/50">
                      Aceita Proposta
                    </Badge>
                  )}
                </div>

                {priceCents > 0 && maxInstallments > 1 && (
                  <p className="text-xs text-muted-foreground font-mono">
                    ou até {maxInstallments}x de {formatMoney(installmentCents)}
                  </p>
                )}
              </div>

              {/* Tabela Resumo de Custos (Quando aplicável) */}
              {classified?.category === "real_estate" && totalMonthlyCents > priceCents && (
                <div className="rounded-xl bg-muted/20 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Aluguel:</span>
                    <span className="font-mono text-foreground font-medium">{formatMoney(priceCents)}</span>
                  </div>
                  {condoCents > 0 && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Condomínio:</span>
                      <span className="font-mono text-foreground font-medium">{formatMoney(condoCents)}</span>
                    </div>
                  )}
                  {iptuCents > 0 && (
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>IPTU mensal:</span>
                      <span className="font-mono text-foreground font-medium">{formatMoney(iptuCents)}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between font-bold text-foreground">
                    <span>Total mensal:</span>
                    <span className="font-mono text-sm">{formatMoney(totalMonthlyCents)}</span>
                  </div>
                </div>
              )}

              {/* Botão de Ação Primária (44px+ touch target) */}
              <div className="space-y-2.5">
                <Button
                  onClick={primaryCta.action}
                  disabled={isBooking || isBuyingDirect || isDownloadingDigital}
                  className="w-full h-12 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  {primaryCta.label}
                </Button>

                {/* Botões Secundários */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={onOpenProposalModal}
                    className="h-10 rounded-xl text-xs font-semibold border-border/60 hover:bg-muted/50 text-foreground"
                  >
                    <Handshake className="size-3.5 mr-1.5" />
                    <span>Fazer Proposta</span>
                  </Button>

                  {(classified?.contact_whatsapp || classified?.whatsapp) && (
                    <Button
                      variant="outline"
                      onClick={handleWhatsApp}
                      className="h-10 rounded-xl text-xs font-semibold border-border/60 hover:bg-muted/50 text-foreground"
                    >
                      <MessageCircle className="size-3.5 mr-1.5 text-emerald-500" />
                      <span>WhatsApp</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Microcopy de Confiança (Estilo Airbnb) */}
              <p className="text-[11px] text-center text-muted-foreground">
                {niche.id === "hospitality_stay" || niche.id === "travel"
                  ? "Você ainda não será cobrado. O anfitrião revisará sua solicitação."
                  : "Suas propostas são registradas com segurança no seu painel Waesy."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── STICKY BOTTOM ACTION BAR (Mobile Core: Nielsen Norman & Apple HIG) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3 pb-safe flex items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-bold text-foreground font-mono truncate">
              {priceCents > 0 ? formatMoney(priceCents) : "Consulte"}
            </span>
            {niche.priceSuffix && (
              <span className="text-[11px] text-muted-foreground shrink-0">
                {niche.priceSuffix}
              </span>
            )}
          </div>
          {priceCents > 0 && maxInstallments > 1 && (
            <span className="text-[10px] text-muted-foreground font-mono truncate">
              ou até {maxInstallments}x de {formatMoney(installmentCents)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(classified?.contact_whatsapp || classified?.whatsapp) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              className="h-11 w-11 p-0 rounded-xl border-border/60"
              aria-label="Chamar no WhatsApp"
            >
              <MessageCircle className="size-4 text-emerald-500" />
            </Button>
          )}

          <Button
            onClick={primaryCta.action}
            disabled={isBooking || isBuyingDirect || isDownloadingDigital}
            className="h-11 px-5 rounded-xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
          >
            {primaryCta.label}
          </Button>
        </div>
      </div>

      {/* ── Modal de Imagem em Tela Cheia ── */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            type="button"
            onClick={() => setFullscreenImage(null)}
            className="absolute top-4 right-4 z-10 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label="Fechar tela cheia"
          >
            <X className="size-6" />
          </button>
          {isVideoUrl(fullscreenImage) ? (
            <video
              src={fullscreenImage}
              controls
              playsInline
              autoPlay
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={fullscreenImage}
              alt="Tela cheia"
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
