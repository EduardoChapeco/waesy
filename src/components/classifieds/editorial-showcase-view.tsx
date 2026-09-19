import React, { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
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
  Star,
  Award,
  HeartHandshake,
  ImagePlus,
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
  Receipt,
  FileSpreadsheet,
  BookOpenCheck,
  ShieldAlert,
  Bus,
  Ship,
  Train,
  Navigation,
  Route as RouteIcon,
  X,
  Users,
  Phone,
  Mail,
  MessageSquare,
  Send,
  Store as StoreIcon,
  User,
  Download,
  Loader2,
  FileText,
  Smartphone,
  Laptop,
  Tv,
  Gamepad2,
  Armchair,
  Shirt,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { registerClassifiedLead } from "@/services/company-mvp.functions";
import { getDigitalDownloadSignedUrl } from "@/services/classifieds.functions";
import {
  getEducationLabel,
  getExperienceLabel,
  getRegimeLabel,
  getWorkplaceModelLabel,
} from "@/lib/classifieds/canonical-hiring";
import { MapLibreCanvas } from "@/components/mobility/maplibre-canvas";
import { FavoriteButton } from "@/components/common/favorite-button";
import { cn } from "@/lib/utils";
import { TravelBookingDossierModal } from "./travel-booking-dossier-modal";
import { WeatherWidget } from "./weather-widget";
import { resolveClassifiedNiche, getClassifiedFeatureCards, getClassifiedPaymentMethods } from "@/lib/classifieds/semantics";
import { CANONICAL_BUS_CATEGORIES, CANONICAL_GUIDE_SERVICES, CANONICAL_TRANSFER_VEHICLES, DEPARTURE_STATUS_CONFIG, type DepartureOption, type DepartureStatus } from "@/lib/classifieds/canonical-airports";


export interface EditorialShowcaseViewProps {
  classified: any;
  isOwner?: boolean;
  onOpenBookingModal?: (selectedDeparture?: DepartureOption) => void;
  onOpenProposalModal?: () => void;
  onEditClassified?: () => void;
  onOpenCompanionCard?: () => void;
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
  onOpenCompanionCard,
}: EditorialShowcaseViewProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"grid" | "resort" | "itinerary" | "explore">("grid");
  const [activeStoryModal, setActiveStoryModal] = useState<any | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [isBookingDossierOpen, setIsBookingDossierOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isInstallmentsModalOpen, setIsInstallmentsModalOpen] = useState(false);
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isDownloadingDigital, setIsDownloadingDigital] = useState(false);

  const handleDownloadDigitalFile = async () => {
    if (!classified?.id) return;
    setIsDownloadingDigital(true);
    try {
      const res = await getDigitalDownloadSignedUrl({
        data: { classifiedId: classified.id },
      });
      if (res?.downloadUrl) {
        window.open(res.downloadUrl, "_blank");
        toast.success(`Download de "${res.fileName}" liberado com sucesso!`);
      } else {
        toast.error("Link de download não disponível no momento.");
      }
    } catch (err: any) {
      console.error("Erro ao baixar arquivo:", err);
      toast.error(err?.message || "Falha ao gerar link de download.");
    } finally {
      setIsDownloadingDigital(false);
    }
  };

  const attrs = classified?.attributes || {};
  const nicheDef = resolveClassifiedNiche(classified);
  const nicheId = String(attrs.niche || nicheDef.id || "goods").toLowerCase();
  const isTravel = nicheId === "travel" || nicheId.includes("viag") || nicheId.includes("tour") || classified?.category === "travel";
  const isHospitality = nicheId === "hospitality_stay" || nicheId.includes("hosped") || nicheId.includes("temporada");
  const isGoods = nicheId === "goods" || nicheId.includes("goods") || nicheId.includes("desapego") || attrs.desapego_subcategory || (!isTravel && !isHospitality && !nicheId.includes("veic") && !nicheId.includes("imov") && !nicheId.includes("serv") && !nicheId.includes("vaga") && !nicheId.includes("food") && !nicheId.includes("doacao") && !nicheId.includes("digit") && !nicheId.includes("assinatura") && !nicheId.includes("equip"));

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
  const cardInterestFree = attrs.card_interest_free !== undefined ? !!attrs.card_interest_free : true;
  const installmentCents =
    priceCents > 0 && maxInstallments > 1
      ? Math.round(priceCents / maxInstallments)
      : priceCents;

  const acceptsPix = attrs.accepts_pix !== undefined ? !!attrs.accepts_pix : true;
  const pixDiscountPercent = Number(attrs.pix_discount_percent) || 0;
  const acceptsCard = attrs.accepts_card !== undefined ? !!attrs.accepts_card : true;
  const acceptsBoleto = !!attrs.accepts_boleto;
  const boletoDueDays = Number(attrs.boleto_due_days) || 3;
  const acceptsBoletoInstallments = !!attrs.accepts_boleto_installments;
  const maxBoletoInstallments = Math.max(1, Number(attrs.max_boleto_installments) || 12);
  const boletoMinDownPaymentCents = attrs.boleto_min_down_payment_cents;
  const boletoNotes = attrs.boleto_notes || "";
  const acceptsCarne = !!attrs.accepts_carne;
  const maxCarneInstallments = Math.max(1, Number(attrs.max_carne_installments) || 12);
  const carneGraceDays = Number(attrs.carne_grace_days) || 30;
  const carneMinDownPaymentCents = attrs.carne_min_down_payment_cents;
  const carneNotes = attrs.carne_notes || "";
  const acceptsCash = attrs.accepts_cash !== undefined ? !!attrs.accepts_cash : true;
  const acceptsTrade = attrs.accepts_trade !== undefined ? !!attrs.accepts_trade : !!classified?.accepts_trade;
  const tradeNotes = attrs.trade_notes || "";
  const acceptsFinancing = !!attrs.accepts_financing;
  const financingNotes = attrs.financing_notes || "";
  const cancellationPolicy = attrs.cancellation_policy || "flexible";

  // ── Anunciante / Loja Parceira / Verificação (Isolamento Estrito Empresa vs Anunciante) ──
  const store = classified?.store;
  const authorProfile = classified?.profiles;
  const isCompany = Boolean(classified?.store_id && store?.id);
  const advertiserName = isCompany ? (store?.name || "Loja Oficial") : (authorProfile?.full_name || "Anunciante");
  const advertiserAvatar = isCompany ? store?.logo_url : authorProfile?.avatar_url;

  // ── Privacidade de Endereço / Localização (LGPD & Anti-Tracking) ──
  const hideLocation = Boolean(
    attrs.hide_location ||
    attrs.hide_address ||
    attrs.location_privacy === "hidden" ||
    authorProfile?.hide_location
  );

  const advertiserCity = hideLocation
    ? null
    : isCompany
    ? (store?.city ? `${store.city}${store.state ? ` • ${store.state}` : ""}` : (classified?.city || "Brasil"))
    : (classified?.location_name || classified?.city || "Brasil");
  const advertiserPhone = classified?.contact_whatsapp || classified?.whatsapp || (isCompany ? store?.phone : authorProfile?.phone);
  const advertiserEmail = classified?.contact_email || (isCompany ? store?.email : null);
  const storeProfileUrl = isCompany
    ? (store?.id ? `/perfil-da-loja?storeId=${store.id}` : store?.slug ? `/perfil-da-loja?slug=${store.slug}` : null)
    : (authorProfile?.id ? `/membro/${authorProfile.id}` : null);

  // ── Parcelamento com ou sem juros ─────────────────────────────────────────
  const installmentsInterestFree = attrs.installments_interest_free !== false;

  // ── Destaques e Diferenciais ──────────────────────────────────────────────
  const storyHighlights = Array.isArray(attrs.story_highlights) ? attrs.story_highlights : [];
  const bioBullets: string[] = Array.isArray(attrs.bio_bullets) ? attrs.bio_bullets : [];
  const flightDetails = attrs.flight_details || null;
  const transportType: string = flightDetails?.transport_type || attrs.transport_type || "airplane";
  const itineraryDays = Array.isArray(attrs.itinerary_days) ? attrs.itinerary_days : [];
  const departureOptions: DepartureOption[] = Array.isArray(attrs.departure_options) ? attrs.departure_options : [];
  const selectedDeparture = departureOptions.find(d => (d.id || "") === selectedDepartureId) || null;

  const destinationCity: string =
    attrs.destination_city ||
    attrs.destination ||
    flightDetails?.arrival_city ||
    flightDetails?.destination ||
    classified?.city ||
    (classified?.location_name ? classified.location_name.split("—")[0].trim().split("-")[0].trim() : "") ||
    "Chapecó";

  // ── Estatísticas do Topo (Polimórficas por Nicho — Zero Fake Fallback) ──
  const getHeaderStats = () => {
    const list: { label: string; val: string }[] = [];

    if (isTravel) {
      if (attrs.duration_text) list.push({ label: "Duração", val: attrs.duration_text });
      if (attrs.meal_plan) list.push({ label: "Regime", val: attrs.meal_plan });
      if (attrs.guests_text || attrs.vacancies_text) list.push({ label: "Vagas", val: attrs.guests_text || attrs.vacancies_text });
      return list;
    }
    if (nicheId.includes("alim") || nicheId.includes("gastro") || nicheId.includes("restaurante")) {
      if (attrs.prep_time) list.push({ label: "Preparo", val: attrs.prep_time });
      if (attrs.meal_type) list.push({ label: "Tipo", val: attrs.meal_type.replace(/_/g, " ") });
      if (Array.isArray(attrs.service_modes) && attrs.service_modes.length > 0) {
        list.push({ label: "Entrega", val: attrs.service_modes.includes("motolink") ? "Delivery" : "Retirada" });
      }
      return list;
    }
    if (nicheId.includes("hosped") || nicheId.includes("temporada")) {
      if (attrs.property_type) list.push({ label: "Tipo", val: attrs.property_type });
      if (attrs.max_guests) list.push({ label: "Hóspedes", val: `${attrs.max_guests} máx.` });
      if (attrs.bedrooms) list.push({ label: "Quartos", val: `${attrs.bedrooms} qto(s)` });
      return list;
    }
    if (nicheId.includes("imov") || nicheId.includes("real_estate")) {
      if (attrs.area_sqm) list.push({ label: "Área", val: `${attrs.area_sqm} m²` });
      if (attrs.bedrooms) list.push({ label: "Quartos", val: `${attrs.bedrooms} qtos` });
      if (attrs.parking_spots) list.push({ label: "Vagas", val: `${attrs.parking_spots} vg(s)` });
      return list;
    }
    if (nicheId.includes("veic") || nicheId.includes("car") || nicheId.includes("auto")) {
      if (attrs.year_model) list.push({ label: "Ano", val: `${attrs.year_fab ? `${attrs.year_fab}/` : ""}${attrs.year_model}` });
      if (attrs.mileage_km) list.push({ label: "Km", val: `${attrs.mileage_km} km` });
      if (attrs.transmission) list.push({ label: "Câmbio", val: attrs.transmission });
      return list;
    }
    if (nicheId.includes("serv") || nicheId.includes("prof")) {
      if (attrs.modality) list.push({ label: "Modalidade", val: attrs.modality === "remoto" ? "Online / Remoto" : "Presencial" });
      if (attrs.service_area) list.push({ label: "Região", val: attrs.service_area });
      if (attrs.estimated_duration) list.push({ label: "Duração", val: `~${attrs.estimated_duration} min` });
      return list;
    }
    if (nicheId.includes("equip")) {
      if (attrs.equipment_period) list.push({ label: "Período", val: attrs.equipment_period === "evento" ? "Por Evento" : "Por Diária" });
      if (attrs.deposit_cents) list.push({ label: "Caução", val: formatMoney(attrs.deposit_cents) });
      return list;
    }
    if (nicheId.includes("digit")) {
      if (attrs.digital_file_type) list.push({ label: "Formato", val: attrs.digital_file_type });
      if (attrs.digital_download_limit) list.push({ label: "Downloads", val: `${attrs.digital_download_limit}` });
      return list;
    }
    if (nicheId.includes("vaga") || nicheId.includes("job")) {
      if (attrs.work_model) list.push({ label: "Modelo", val: attrs.work_model === "remoto" ? "Remoto" : attrs.work_model === "hibrido" ? "Híbrido" : "Presencial" });
      if (attrs.regime) list.push({ label: "Regime", val: attrs.regime });
      if (attrs.salary_range) list.push({ label: "Remuneração", val: attrs.salary_range });
      return list;
    }
    if (nicheId.includes("doacao") || attrs.is_donation) {
      list.push({ label: "Tipo", val: "Doação" });
      if (attrs.condition) list.push({ label: "Condição", val: attrs.condition.replace(/_/g, " ") });
      return list;
    }
    if (nicheId.includes("assinatura") || classified?.pricing_model === "recurring") {
      if (classified?.billing_cycle) {
        list.push({ label: "Ciclo", val: classified.billing_cycle === "yearly" ? "Anual" : classified.billing_cycle === "quarterly" ? "Trimestral" : classified.billing_cycle === "semiannual" ? "Semestral" : "Mensal" });
      }
      if (classified?.setup_fee_cents) list.push({ label: "Adesão", val: formatMoney(classified.setup_fee_cents) });
      if (classified?.trial_days) list.push({ label: "Teste", val: `${classified.trial_days} dias grátis` });
      return list;
    }

    // Desapego / Genérico
    const condition = attrs.condition || attrs.item_condition;
    if (condition) {
      const condLabel = condition === "novo" ? "Novo" : condition === "usado_excelente" ? "Como Novo" : condition === "usado_bom" ? "Bom Estado" : condition.replace(/_/g, " ");
      list.push({ label: "Condição", val: condLabel });
    }
    if (attrs.item_warranty || attrs.warranty) {
      list.push({ label: "Garantia", val: attrs.item_warranty || attrs.warranty });
    }
    if (classified?.negotiable) {
      list.push({ label: "Negociação", val: "Aceita Proposta" });
    }
    return list;
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
    if (nicheId.includes("vaga") || nicheId.includes("job")) {
      return { tab2: "Requisitos & Vaga", tab3: "Benefícios & Skills", tab4: "Candidatura & Detalhes" };
    }
    if (nicheId.includes("doacao") || attrs.is_donation) {
      return { tab2: "Detalhes do Item", tab3: "Regras de Retirada", tab4: "Retirada Solidária" };
    }
    if (nicheId.includes("assinatura") || classified?.pricing_model === "recurring") {
      return { tab2: "Recursos do Plano", tab3: "Vantagens Inclusas", tab4: "Ciclo & Cobrança" };
    }
    if (nicheId.includes("desapego")) {
      return { tab2: "Ficha Técnica", tab3: "Acessórios & Garantia", tab4: "Entrega & Pagamento" };
    }
    return { tab2: "Especificações", tab3: "Diferenciais", tab4: "Condições Comerciais" };
  };

  const tabLabels = getTabLabels();

  // ── CTA Text do Botão Primário ─────────────────────────────────────────────
  const getPrimaryCtaLabel = () => {
    if (isTravel) return "Reservar Pacote";
    if (nicheId.includes("alim") || nicheId.includes("gastro") || nicheId === "food") return "Fazer Pedido";
    if (isHospitality) return "Consultar Datas & Reservar";
    if (nicheId.includes("imov")) return "Agendar Visita ao Imóvel";
    if (nicheId.includes("veic")) return "Agendar Test-Drive / Proposta";
    if (nicheId.includes("serv")) return "Solicitar Orçamento";
    if (nicheId.includes("equip")) return "Solicitar Locação";
    if (nicheId.includes("digit")) return "Comprar & Baixar";
    if (nicheId.includes("vaga") || nicheId.includes("job")) return "Candidatar-se à Vaga";
    if (nicheId.includes("doacao") || attrs.is_donation) return "Quero Receber Doação";
    return classified?.price_cents > 0 ? "Comprar Agora" : "Fazer Proposta";
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
      toast.success("Link copiado para a área de transferência!");
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
      onOpenBookingModal(selectedDeparture || undefined);
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

  const handleEditClick = () => {
    if (onEditClassified) {
      onEditClassified();
    } else if (classified?.id) {
      navigate({ to: "/conta/classificados/novo", search: { editId: classified.id } });
    }
  };

  const handleSendAppMessage = async () => {
    if (!contactMessage.trim()) {
      toast.error("Por favor, digite sua mensagem antes de enviar.");
      return;
    }
    setIsSendingMessage(true);
    try {
      if (classified?.id) {
        await registerClassifiedLead({
          data: {
            classifiedId: classified.id,
            proposedPriceCents: priceCents,
            message: contactMessage.trim(),
          },
        });
      }
      toast.success("Mensagem enviada com sucesso ao anunciante!");
      setContactMessage("");
      setIsContactModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar mensagem");
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-28 font-sans select-none">
      {/* ── Top Bar Fixo de Navegação (Apenas Mobile) ── */}
      <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/40 px-3 py-2.5 flex items-center justify-between">
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
          {/* Lápis de Edição Rápida para o Proprietário (Apple Clean & Direct Action) */}
          {isOwner && (
            <button
              type="button"
              onClick={handleEditClick}
              className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors active:scale-95 cursor-pointer"
              title="Editar Anúncio"
              aria-label="Editar Anúncio"
            >
              <Edit3 className="size-4.5" />
            </button>
          )}

          {onOpenCompanionCard && (
            <button
              type="button"
              onClick={onOpenCompanionCard}
              className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-full transition-colors active:scale-95 cursor-pointer"
              title="Guia Digital 9:16 (WhatsApp)"
              aria-label="Guia Digital 9:16"
            >
              <Smartphone className="size-4.5" />
            </button>
          )}

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

      <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 pt-2 sm:pt-4 space-y-6 animate-in fade-in duration-200">
        {/* ── Modo Proprietário Banner (Regra 23) ── */}
        {isOwner && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="font-bold flex items-center gap-1.5 shrink-0">
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                Modo Proprietário Ativo:
              </span>
              <span>Você está visualizando este anúncio como autor. Ajustes feitos no painel de edição refletem imediatamente aqui.</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleEditClick}
              className="h-7 text-xs rounded-lg border-amber-500/40 hover:bg-amber-500/20 shrink-0 font-medium cursor-pointer"
            >
              ✏️ Editar Anúncio
            </Button>
          </div>
        )}

        {/* ── Desktop Contextual Header / Breadcrumbs (Apenas Desktop) ── */}
        <div className="hidden md:flex items-center justify-between py-2 border-b border-border/40">
          <button
            type="button"
            onClick={() => navigate({ to: "/classificados" })}
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group cursor-pointer"
          >
            <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar aos Classificados</span>
          </button>

          <div className="flex items-center gap-2">
            {isOwner && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEditClick}
                className="h-8 gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/5 font-semibold text-xs cursor-pointer"
              >
                <Edit3 className="size-3.5" />
                <span>Editar Anúncio</span>
              </Button>
            )}
            {onOpenCompanionCard && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenCompanionCard}
                className="h-8 gap-1.5 rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold text-xs cursor-pointer shadow-2xs"
                title="Guia Digital 9:16 e mensagem para WhatsApp"
              >
                <Smartphone className="size-3.5" />
                <span>Guia 9:16</span>
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-8 gap-1.5 rounded-xl text-muted-foreground hover:text-foreground font-semibold text-xs cursor-pointer"
            >
              <Share2 className="size-3.5" />
              <span>Compartilhar</span>
            </Button>
            {classified.id && (
              <FavoriteButton
                entityId={classified.id}
                entityType="classified"
                title={classified.title}
                className="size-8"
              />
            )}
          </div>
        </div>

        {/* ── Banner de Modo Proprietário (Regra 23 do AGENTS.md) ── */}
        {isOwner && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs shadow-2xs">
            <span className="font-semibold flex items-center gap-2">
              <span className="text-base">👑</span>
              <span>Você é o anunciante desta publicação (Modo Proprietário ativo)</span>
            </span>
            <button
              type="button"
              onClick={handleEditClick}
              className="font-bold underline hover:opacity-80 cursor-pointer text-xs shrink-0"
            >
              Editar Detalhes
            </button>
          </div>
        )}

        {/* ── Grid Principal Responsiva (Desktop 2 Colunas Estilo Mercado Livre / Airbnb) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna Esquerda: Mídias, Roteiro & Abas Editoriais (7 colunas no Desktop) */}
          <div className="lg:col-span-7 space-y-5">
            {/* ── Galeria Editorial Proporcional (Hero Natural 16:10 + Miniaturas) ── */}
            {images.length > 0 && (
              <div className="w-full space-y-2">
                <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-muted/30 border border-border/40 group">
                  <img
                    src={images[0]}
                    alt={classified.title}
                    className="size-full object-cover cursor-pointer group-hover:scale-[1.01] transition-transform duration-300"
                    onClick={() => setFullscreenImage(images[0])}
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] font-mono font-medium">
                      {images.length} {images.length === 1 ? "foto" : "fotos"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFullscreenImage(images[0])}
                    className="absolute bottom-3.5 right-3.5 px-3 py-1.5 rounded-xl bg-background/85 hover:bg-background text-foreground text-xs font-semibold backdrop-blur-md border border-border/50 shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <Maximize2 className="size-3.5" />
                    <span>Expandir</span>
                  </button>
                </div>

                {/* Miniaturas de Acesso Rápido */}
                {images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {images.slice(0, 6).map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFullscreenImage(img)}
                        className="relative size-16 sm:size-18 rounded-xl overflow-hidden border border-border/50 bg-muted shrink-0 group cursor-pointer hover:border-primary transition-colors"
                      >
                        <img src={img} alt={`Miniatura ${idx + 1}`} className="size-full object-cover group-hover:scale-105 transition-transform" />
                      </button>
                    ))}
                    {images.length > 6 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("grid")}
                        className="size-16 sm:size-18 rounded-xl border border-dashed border-border/70 flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary text-xs font-bold shrink-0 transition-colors"
                      >
                        <span>+{images.length - 6}</span>
                        <span className="text-[10px] font-normal">fotos</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Estatísticas Canônicas (Chips Semânticos) */}
            {headerStats.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {headerStats.map((stat, i) => (
                  <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/40 border border-border/40 text-xs">
                    <span className="text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">{stat.label}:</span>
                    <strong className="text-foreground font-bold">{stat.val}</strong>
                  </div>
                ))}
              </div>
            )}

        {/* ── Título, Subtítulo & Bullets ── */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight leading-snug">
              {classified.title || "Sem título"}
            </h1>
            {!hideLocation && classified.location_name && (
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

        {/* ── Card do Anunciante / Loja Parceira (Visível no Mobile) ── */}
        <div className="lg:hidden p-3.5 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-between gap-3 transition-colors hover:bg-muted/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-11 rounded-full bg-background border border-border/60 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
              {advertiserAvatar ? (
                <img src={advertiserAvatar} alt={advertiserName} className="size-full object-cover" />
              ) : isCompany ? (
                <StoreIcon className="size-5 text-muted-foreground" />
              ) : (
                <User className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-extrabold text-xs sm:text-sm text-foreground truncate">
                  {advertiserName}
                </span>
                <CheckCircle2 className="size-3.5 text-blue-500 shrink-0" title="Verificado Waesy" />
              </div>
              <span className="text-[11px] text-muted-foreground truncate">
                {advertiserCity ? `${advertiserCity} • ` : ""}{isCompany ? "Loja Oficial" : "Anunciante Verificado"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {storeProfileUrl ? (
              <Button asChild size="sm" variant="outline" className="h-8 px-3 rounded-xl text-xs font-bold border-border/80 hover:bg-background">
                <Link to={storeProfileUrl}>
                  <span>{isCompany ? "Ver Loja" : "Ver Perfil"}</span>
                  <ChevronRight className="size-3 ml-0.5" />
                </Link>
              </Button>
            ) : (
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5">
                Verificado
              </Badge>
            )}
          </div>
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

              {/* Pacote de Viagem & Turismo (Paridade CMS ↔ Vitrine - Regra 19) */}
              {isTravel && (
                <div className="p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/30 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Compass className="size-3.5 text-primary" />
                      <span>Diferenciais & Inclusões do Pacote</span>
                    </h4>
                    {attrs.duration_text && (
                      <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30">
                        {attrs.duration_text}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-muted-foreground">
                    <div>Regime: <strong className="text-foreground">{attrs.meal_plan || "Consulte"}</strong></div>
                    <div>Transporte: <strong className="text-foreground">{transportType === "bus" ? "Ônibus Leito / Terrestre" : transportType === "cruise" ? "Cruzeiro Marítimo" : "Aéreo"}</strong></div>
                    <div>Saída: <strong className="text-foreground">{attrs.departure_date ? formatDate(attrs.departure_date) : attrs.dates_text || "A combinar"}</strong></div>
                    <div>Retorno: <strong className="text-foreground">{attrs.return_date ? formatDate(attrs.return_date) : "Conforme roteiro"}</strong></div>
                    <div>Vagas / Grupo: <strong className="text-foreground">{attrs.guests_text || "Grupo Confirmado"}</strong></div>
                    <div>Cancelamento: <strong className="text-foreground capitalize">{cancellationPolicy === "flexible" ? "Flexível" : cancellationPolicy === "moderate" ? "Moderado" : "Especial de Grupo"}</strong></div>
                  </div>

                  {/* Bullets / Itens Inclusos (bio_bullets ou inclusions) */}
                  {(bioBullets.length > 0 || (Array.isArray(attrs.inclusions) && attrs.inclusions.length > 0)) && (
                    <div className="pt-2.5 border-t border-border/30 space-y-2">
                      <span className="font-bold text-foreground block text-xs">
                        O que está incluso neste pacote:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(bioBullets.length > 0 ? bioBullets : attrs.inclusions).map((item: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-xl bg-background/60 border border-border/30">
                            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span className="text-xs text-foreground/90 font-medium leading-tight">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exclusões (se cadastradas) */}
                  {Array.isArray(attrs.exclusions) && attrs.exclusions.length > 0 && (
                    <div className="pt-2 border-t border-border/30 space-y-1.5">
                      <span className="font-bold text-muted-foreground block text-[11px] uppercase tracking-wider">
                        Não incluso:
                      </span>
                      <ul className="space-y-1">
                        {attrs.exclusions.map((item: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <span className="text-destructive font-bold">✕</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {nicheId.includes("hosped") && (
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">Hospedagem & Estadia</h4>
                    {attrs.property_type && (
                      <Badge variant="outline" className="text-[10px] font-semibold">{attrs.property_type}</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Check-in: <strong className="text-foreground">{attrs.checkin_time || "14:00"}</strong></div>
                    <div>Check-out: <strong className="text-foreground">{attrs.checkout_time || "11:00"}</strong></div>
                    <div>Hóspedes: <strong className="text-foreground">{attrs.max_guests ? `${attrs.max_guests} máx.` : "—"}</strong></div>
                    <div>Taxa de limpeza: <strong className="text-foreground">{attrs.cleaning_fee_cents ? formatMoney(attrs.cleaning_fee_cents) : "Não informada"}</strong></div>
                    {attrs.security_deposit_cents ? (
                      <div>Caução / Garantia: <strong className="text-foreground">{formatMoney(attrs.security_deposit_cents)}</strong></div>
                    ) : null}
                  </div>
                  {attrs.house_rules && (
                    <div className="pt-2 border-t border-border/30 text-[11px]">
                      <span className="font-bold text-foreground block mb-0.5">Regras da Hospedagem:</span>
                      <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{attrs.house_rules}</p>
                    </div>
                  )}
                </div>
              )}

              {nicheId.includes("imov") && (
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">Imóvel</h4>
                    {attrs.property_type && (
                      <Badge variant="outline" className="text-[10px] font-semibold">{attrs.property_type}</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Finalidade: <strong className="text-foreground capitalize">{attrs.deal_type || "—"}</strong></div>
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
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">Veículo</h4>
                    {attrs.version && (
                      <Badge variant="outline" className="text-[10px] font-semibold">{attrs.version}</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Marca/Modelo: <strong className="text-foreground">{attrs.brand || "—"} {attrs.model || ""}</strong></div>
                    <div>Ano Fab/Mod: <strong className="text-foreground">{attrs.year_fab || "—"}/{attrs.year_model || "—"}</strong></div>
                    <div>Quilometragem: <strong className="text-foreground">{attrs.mileage_km !== undefined && attrs.mileage_km !== null ? (attrs.mileage_km === 0 ? "Zero Km" : `${attrs.mileage_km} km`) : "—"}</strong></div>
                    <div>Câmbio: <strong className="text-foreground">{attrs.transmission || "—"}</strong></div>
                    <div>Combustível: <strong className="text-foreground">{attrs.fuel_type || "—"}</strong></div>
                    <div>Cor: <strong className="text-foreground">{attrs.color || "—"}</strong></div>
                    {attrs.doors && <div>Portas: <strong className="text-foreground">{attrs.doors} portas</strong></div>}
                    {attrs.plate_end && <div>Final da Placa: <strong className="text-foreground">{attrs.plate_end}</strong></div>}
                  </div>
                </div>
              )}

              {/* Equipamentos & Locação */}
              {(nicheId.includes("equip") || classified.category === "equipment") && (
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Wrench className="size-3.5 text-primary" />
                      <span>Equipamento & Locação</span>
                    </h4>
                    {attrs.condition && (
                      <Badge variant="outline" className="text-[10px] font-semibold capitalize">
                        {attrs.condition.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Período: <strong className="text-foreground capitalize">{attrs.equipment_period === "evento" ? "Por Evento" : attrs.equipment_period === "semanal" ? "Semanal" : attrs.equipment_period === "mensal" ? "Mensal" : "Por Diária"}</strong></div>
                    <div>Caução: <strong className="text-foreground">{attrs.deposit_cents ? formatMoney(attrs.deposit_cents) : "Sem caução"}</strong></div>
                    <div>Operador Técnico: <strong className="text-foreground">{attrs.operator_included ? "Incluso no valor" : "Não incluso"}</strong></div>
                    <div>Logística: <strong className="text-foreground">{attrs.delivery_available ? "Entrega no local" : "Retirada no balcão"}</strong></div>
                  </div>
                  {Array.isArray(attrs.accessories) && attrs.accessories.length > 0 && (
                    <div className="pt-2 border-t border-border/30">
                      <span className="font-bold text-foreground block mb-1 text-[11px]">Itens & Acessórios Inclusos:</span>
                      <div className="flex flex-wrap gap-1">
                        {attrs.accessories.map((acc: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-[10px] font-medium px-2 py-0.5">
                            ✓ {acc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Produto Digital & Downloads */}
              {(nicheId.includes("digit") || attrs.is_digital || attrs.digital_file_url) && (
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <FileArchive className="size-3.5 text-primary" />
                      <span>Produto Digital & Download</span>
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                      Acesso Instantâneo
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Formato: <strong className="text-foreground uppercase font-mono">{attrs.digital_file_type || "PDF / Arquivo"}</strong></div>
                    <div>Tamanho: <strong className="text-foreground font-mono">{attrs.digital_file_size_bytes ? `${(attrs.digital_file_size_bytes / (1024 * 1024)).toFixed(1)} MB` : attrs.file_size || "Acesso Imediato"}</strong></div>
                    <div>Limite de Downloads: <strong className="text-foreground">{attrs.download_limit || attrs.digital_download_limit ? `${attrs.download_limit || attrs.digital_download_limit} tentativas` : "Ilimitado"}</strong></div>
                    <div>Licença: <strong className="text-emerald-600">Vitalícia</strong></div>
                  </div>
                  {attrs.digital_preview_url && (
                    <div className="pt-1">
                      <a
                        href={attrs.digital_preview_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                      >
                        <ExternalLink className="size-3.5" />
                        <span>Ver Demonstração / Amostra Gratuita</span>
                      </a>
                    </div>
                  )}
                  <div className="pt-2 border-t border-border/30 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">Arquivo criptografado e verificado</span>
                    <Button
                      onClick={handleDownloadDigitalFile}
                      disabled={isDownloadingDigital}
                      size="sm"
                      className="h-8 px-3 rounded-lg font-bold text-xs gap-1.5 bg-primary text-primary-foreground cursor-pointer"
                    >
                      {isDownloadingDigital ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>Baixando...</span>
                        </>
                      ) : (
                        <>
                          <Download className="size-3.5" />
                          <span>Baixar Arquivo</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Serviço Profissional */}
              {(nicheId.includes("serv") || classified.category === "service") && (
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Wrench className="size-3.5 text-primary" />
                      <span>Serviço Profissional & Atendimento</span>
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30">
                      Agendamento Disponível
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Modalidade: <strong className="text-foreground capitalize">{attrs.modality === "domicilio" ? "A Domicílio" : attrs.modality === "remoto" ? "Remoto / Online" : "Presencial"}</strong></div>
                    <div>Cobrança: <strong className="text-foreground capitalize">{attrs.pricing_type === "por_hora" ? "Por Hora" : attrs.pricing_type === "a_combinar" ? "Sob Consulta" : "Preço Fixo"}</strong></div>
                    <div>Duração Média: <strong className="text-foreground">{attrs.service_duration_minutes || attrs.estimated_duration || 60} min</strong></div>
                    <div>Horário: <strong className="text-foreground font-mono">{attrs.working_hours_start || "08:00"} às {attrs.working_hours_end || "18:00"}</strong></div>
                    {attrs.service_area && (
                      <div className="col-span-2">Raio de Atendimento: <strong className="text-foreground">{attrs.service_area}</strong></div>
                    )}
                    {attrs.available_slots !== undefined && (
                      <div className="col-span-2">Capacidade Diária: <strong className="text-foreground font-mono">{attrs.available_slots} atendimentos/dia</strong></div>
                    )}
                  </div>
                </div>
              )}

              {/* Vaga de Emprego & Oportunidade */}
              {(nicheId.includes("vaga") || classified.category === "job") && (
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Briefcase className="size-3.5 text-primary" />
                      <span>Requisitos & Detalhes da Vaga</span>
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30">
                      {attrs.role || classified.title}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Escolaridade: <strong className="text-foreground">{getEducationLabel(attrs.min_education)}</strong></div>
                    <div>Experiência: <strong className="text-foreground">{getExperienceLabel(attrs.experience_level)}</strong></div>
                    <div>Regime: <strong className="text-foreground">{getRegimeLabel(attrs.regime)}</strong></div>
                    <div>Modelo: <strong className="text-foreground">{getWorkplaceModelLabel(attrs.work_model)}</strong></div>
                    {attrs.work_schedule && (
                      <div className="col-span-2">Escala: <strong className="text-foreground">{attrs.work_schedule}</strong></div>
                    )}
                    {attrs.salary_range && (
                      <div className="col-span-2">Faixa Salarial: <strong className="text-foreground">{attrs.salary_range}</strong></div>
                    )}
                  </div>
                </div>
              )}

              {/* Desapego & Bens Físicos */}
              {isGoods && (
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Tag className="size-3.5 text-primary" />
                      <span>Ficha do Produto Físico</span>
                    </h4>
                    {attrs.condition && (
                      <Badge variant="outline" className="text-[10px] font-semibold capitalize">
                        {attrs.condition.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    {attrs.brand && <div>Marca: <strong className="text-foreground">{attrs.brand}</strong></div>}
                    {attrs.model && <div>Modelo: <strong className="text-foreground">{attrs.model}</strong></div>}
                    {attrs.storage && <div>Armazenamento: <strong className="text-foreground">{attrs.storage}</strong></div>}
                    {attrs.battery_health && <div>Saúde da Bateria: <strong className="text-foreground">{attrs.battery_health}%</strong></div>}
                    {attrs.computer_type && <div>Tipo: <strong className="text-foreground">{attrs.computer_type}</strong></div>}
                    {attrs.processor && <div>Processador: <strong className="text-foreground">{attrs.processor}</strong></div>}
                    {attrs.ram && <div>RAM: <strong className="text-foreground">{attrs.ram}</strong></div>}
                    {attrs.voltage && <div>Voltagem: <strong className="text-foreground">{attrs.voltage}</strong></div>}
                    {attrs.console && <div>Console: <strong className="text-foreground">{attrs.console}</strong></div>}
                    {attrs.room && <div>Ambiente: <strong className="text-foreground">{attrs.room}</strong></div>}
                    {attrs.material && <div>Material: <strong className="text-foreground">{attrs.material}</strong></div>}
                    {attrs.size && <div>Tamanho: <strong className="text-foreground">{attrs.size}</strong></div>}
                    {attrs.gender && <div>Gênero: <strong className="text-foreground">{attrs.gender}</strong></div>}
                    {attrs.warranty && <div className="col-span-2">Garantia / Procedência: <strong className="text-foreground">{attrs.warranty}</strong></div>}
                  </div>
                </div>
              )}

              {/* Doação Solidária */}
              {(nicheId.includes("doacao") || attrs.is_donation) && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Star className="size-3.5 text-emerald-600" />
                      <span>Doação Solidária Comunitária</span>
                    </h4>
                    <Badge className="bg-emerald-600 text-white font-bold text-[10px]">
                      Gratuito R$ 0,00
                    </Badge>
                  </div>
                  <p className="text-emerald-700/90 dark:text-emerald-300/80 leading-relaxed text-[11px]">
                    Este item está sendo doado gratuitamente para a comunidade. Combine o local e horário de retirada diretamente com o doador via chat ou WhatsApp.
                  </p>
                  {attrs.condition && (
                    <div className="pt-1 text-muted-foreground">
                      Estado de Conservação: <strong className="text-foreground capitalize">{attrs.condition.replace(/_/g, " ")}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Assinatura & Recorrência */}
              {(nicheId.includes("assinatura") || classified.pricing_model === "recurring") && (
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Award className="size-3.5 text-primary" />
                      <span>Plano & Assinatura Recorrente</span>
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30 capitalize">
                      {classified.billing_cycle === "yearly" ? "Cobrança Anual" : classified.billing_cycle === "quarterly" ? "Cobrança Trimestral" : classified.billing_cycle === "semiannual" ? "Cobrança Semestral" : "Cobrança Mensal"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>Taxa de Adesão: <strong className="text-foreground">{classified.setup_fee_cents ? formatMoney(classified.setup_fee_cents) : "Isenta"}</strong></div>
                    <div>Período de Teste: <strong className="text-foreground">{classified.trial_days ? `${classified.trial_days} dias grátis` : "Sem teste"}</strong></div>
                    <div>Renovação: <strong className="text-foreground">Automática</strong></div>
                    <div>Cancelamento: <strong className="text-foreground">A qualquer momento</strong></div>
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
                <div className="relative pl-7 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-[2px] before:bg-border/80">
                    {itineraryDays.map((item: any, idx: number) => (
                    <div key={idx} className="relative space-y-3">
                      <div className="absolute -left-7 top-0.5 size-7 rounded-full bg-card border-2 border-primary/90 flex items-center justify-center text-xs font-bold text-foreground shadow-xs">
                        {item.day_number || idx + 1}
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-sm sm:text-base text-foreground tracking-tight">
                            {item.title || `Dia ${item.day_number || idx + 1}`}
                          </h4>
                          {item.date && (
                            <span className="text-xs font-mono font-medium text-muted-foreground shrink-0 bg-muted/60 px-2 py-0.5 rounded-md">
                              {item.date}
                            </span>
                          )}
                        </div>
                        {/* Fotos do Dia — suporte a .images[] (novo) ou .image (legado) */}
                        {(() => {
                          const imgs: string[] = Array.isArray(item.images) && item.images.length > 0
                            ? item.images
                            : item.image ? [item.image] : [];
                          if (imgs.length === 0) return null;
                          return (
                            <div className={cn("gap-2 pt-0.5", imgs.length === 1 ? "block" : "grid grid-cols-2")}>
                              {imgs.map((src: string, imgIdx: number) => (
                                <img key={imgIdx} src={src} alt={`${item.title} - foto ${imgIdx + 1}`} className="w-full h-32 sm:h-36 object-cover rounded-xl border border-border/40 shadow-2xs" loading="lazy" />
                              ))}
                            </div>
                          );
                        })()}
                        {item.description && (
                          <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-normal">{item.description}</p>
                        )}
                        {/* Refeições Incluídas */}
                        {Array.isArray(item.meals_included) && item.meals_included.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap pt-0.5">
                            {item.meals_included.map((m: string) => (
                              <span key={m} className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                {m === "breakfast" ? "☕ Café da Manhã" : m === "lunch" ? "🍽️ Almoço" : "🌙 Jantar"}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Hotel/Pousada */}
                        {item.hotel_name && (
                          <p className="text-xs sm:text-sm text-foreground/90 flex items-center gap-1.5">
                            🛏️ <span className="font-semibold text-foreground">{item.hotel_name}</span>
                          </p>
                        )}
                        {/* Transporte do Dia */}
                        {item.transport && (
                          <p className="text-xs sm:text-sm text-foreground/90 flex items-center gap-1.5">
                            🚌 <span className="font-medium">{item.transport}</span>
                          </p>
                        )}
                        {/* Atividades / Tags */}
                        {Array.isArray(item.activities) && item.activities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {item.activities.map((act: string, ai: number) => (
                              <span key={ai} className="text-xs px-2.5 py-0.5 rounded-lg bg-muted border border-border/50 text-foreground/80 font-medium">
                                {act}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Fallback semântico rico para outros nichos: diferenciais, requisitos e vantagens */
                <div className="space-y-3">
                  {/* Benefícios (Vagas) */}
                  {Array.isArray(attrs.benefits) && attrs.benefits.length > 0 && (
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2">
                      <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="size-3.5 text-primary" />
                        <span>Benefícios & Vantagens</span>
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {attrs.benefits.map((b: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs font-semibold px-2.5 py-1 rounded-lg gap-1.5 bg-primary/10 text-primary border-primary/20">
                            ✓ {b}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Habilidades & Competências (Vagas) */}
                  {Array.isArray(attrs.skills) && attrs.skills.length > 0 && (
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2">
                      <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <GraduationCap className="size-3.5 text-primary" />
                        <span>Competências & Habilidades Desejadas</span>
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {attrs.skills.map((s: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs font-medium px-2.5 py-1 rounded-lg">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dias de Atendimento (Serviço) */}
                  {Array.isArray(attrs.available_weekdays) && attrs.available_weekdays.length > 0 && (
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2">
                      <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-primary" />
                        <span>Dias da Semana com Atendimento</span>
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: "seg", label: "Segunda" },
                          { id: "ter", label: "Terça" },
                          { id: "qua", label: "Quarta" },
                          { id: "qui", label: "Quinta" },
                          { id: "sex", label: "Sexta" },
                          { id: "sab", label: "Sábado" },
                          { id: "dom", label: "Domingo" },
                        ].map((day) => {
                          const isAvail = attrs.available_weekdays.includes(day.id);
                          return (
                            <Badge
                              key={day.id}
                              variant={isAvail ? "default" : "outline"}
                              className={`text-xs px-2.5 py-1 rounded-lg ${
                                isAvail ? "bg-primary text-primary-foreground font-semibold" : "opacity-35 line-through"
                              }`}
                            >
                              {day.label}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recursos Inclusos na Assinatura */}
                  {Array.isArray(classified.recurring_features || attrs.recurring_features) &&
                    (classified.recurring_features || attrs.recurring_features).length > 0 && (
                      <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2">
                        <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="size-3.5 text-primary" />
                          <span>Vantagens do Plano</span>
                        </h4>
                        <div className="space-y-1.5">
                          {(classified.recurring_features || attrs.recurring_features).map((feat: string, i: number) => (
                            <p key={i} className="text-xs text-foreground font-medium flex items-center gap-2">
                              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                              <span>{feat}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Opcionais & Diferenciais (Veículo ou Desapego) */}
                  {Array.isArray(attrs.features) && attrs.features.length > 0 && (
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2">
                      <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">Opcionais & Diferenciais</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {attrs.features.map((f: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs font-medium bg-muted">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Procedência (Veículo) */}
                  {Array.isArray(attrs.provenance) && attrs.provenance.length > 0 && (
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2">
                      <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">Procedência & Documentação</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {attrs.provenance.map((p: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs font-medium bg-primary/10 text-primary border-primary/20">
                            ✓ {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comodidades (Hospedagem / Imóvel) */}
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

                  {/* Destaques Livres (Bio Bullets) */}
                  {bioBullets.length > 0 && (
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/30 space-y-2">
                      <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">Destaques</h4>
                      <div className="space-y-1.5">
                        {bioBullets.map((b, i) => (
                          <p key={i} className="text-xs text-foreground font-medium flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-primary shrink-0" />
                            <span>{b}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {!attrs.amenities?.length &&
                    !bioBullets.length &&
                    !attrs.benefits?.length &&
                    !attrs.skills?.length &&
                    !attrs.features?.length &&
                    !attrs.available_weekdays?.length &&
                    !classified.recurring_features?.length && (
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
              {/* Card Específico de Retirada Solidária (Doação) */}
              {(nicheId.includes("doacao") || attrs.is_donation) ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                    <HeartHandshake className="size-4 text-emerald-600" />
                    <span>Condições de Retirada Solidária</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-background border border-border/50 space-y-1">
                      <p className="font-bold text-foreground">Valor: R$ 0,00 (Gratuito)</p>
                      <p className="text-[11px] text-muted-foreground">Proibida a cobrança de qualquer valor pelo item anunciado nesta modalidade.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-background border border-border/50 space-y-1">
                      <p className="font-bold text-foreground">Retirada & Ponto de Encontro</p>
                      <p className="text-[11px] text-muted-foreground">O endereço ou local público seguro é combinado diretamente com o doador via chat ou WhatsApp.</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                    Iniciativa solidária para incentivar a sustentabilidade, doação comunitária e economia circular.
                  </p>
                </div>
              ) : (nicheId.includes("vaga") || classified.category === "job") ? (
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                    <Briefcase className="size-4 text-primary" />
                    <span>Processo Seletivo & Candidatura</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-center">
                    <div className="p-3 rounded-xl bg-background border border-border/50 space-y-1">
                      <span className="text-[10px] text-muted-foreground block">Inscrições</span>
                      <strong className="text-xs font-bold text-emerald-600 block">Abertas</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-background border border-border/50 space-y-1">
                      <span className="text-[10px] text-muted-foreground block">Triagem Média</span>
                      <strong className="text-xs font-bold text-foreground block">Em até 48h</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-background border border-border/50 space-y-1">
                      <span className="text-[10px] text-muted-foreground block">Canal Oficial</span>
                      <strong className="text-xs font-bold text-primary block">Waesy / WhatsApp</strong>
                    </div>
                  </div>
                  {attrs.work_schedule && (
                    <div className="p-3 rounded-xl bg-background border border-border/50 text-xs flex items-center justify-between">
                      <span className="text-muted-foreground">Escala / Turno:</span>
                      <strong className="text-foreground">{attrs.work_schedule}</strong>
                    </div>
                  )}
                </div>
              ) : (nicheId.includes("assinatura") || classified.pricing_model === "recurring") ? (
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-3">
                  <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-wider">
                    <CreditCard className="size-4 text-primary" />
                    <span>Condições do Plano &amp; Assinatura</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="p-3 rounded-xl bg-background border border-border/50 space-y-1">
                      <p className="font-bold text-foreground">Cobrança Periódica</p>
                      <p className="text-[11px] text-muted-foreground">
                        {classified.billing_cycle === "yearly" ? "Renovação Anual" : classified.billing_cycle === "quarterly" ? "Renovação Trimestral" : classified.billing_cycle === "semiannual" ? "Renovação Semestral" : "Renovação Mensal"}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-background border border-border/50 space-y-1">
                      <p className="font-bold text-foreground">Cancelamento Descomplicado</p>
                      <p className="text-[11px] text-muted-foreground">Sem fidelidade obrigatória ou multas abusivas.</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Meios aceitos para assinatura:</span>
                    <span className="font-bold text-foreground">{acceptsCard ? "Cartão de Crédito" : ""}{acceptsCard && acceptsPix ? " e " : ""}{acceptsPix ? "PIX" : ""}</span>
                  </div>
                </div>
              ) : (
                /* Card Completo de Regras de Pagamento Comercial */
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
                            Em até <strong>{maxInstallments}x</strong> {installmentCents > 0 ? `de ${formatMoney(installmentCents)}` : ""} {cardInterestFree ? "(sem juros)" : ""}
                          </p>
                        </div>
                      </div>
                    )}

                    {acceptsBoleto && (
                      <div className="p-2.5 rounded-xl bg-background border border-border/50 flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                          <Receipt className="size-4.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">Boleto à Vista</p>
                          <p className="text-[11px] text-muted-foreground">
                            Vencimento em {boletoDueDays} dias úteis
                          </p>
                        </div>
                      </div>
                    )}

                    {acceptsBoletoInstallments && (
                      <div className="p-2.5 rounded-xl bg-background border border-border/50 flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="size-4.5" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">Boleto Parcelado Direto</p>
                          <p className="text-[11px] text-muted-foreground">
                            Em até <strong>{maxBoletoInstallments}x</strong> {boletoMinDownPaymentCents ? `(Entrada ${formatMoney(boletoMinDownPaymentCents)})` : "direto com anunciante"}
                          </p>
                        </div>
                      </div>
                    )}

                    {acceptsCarne && (
                      <div className="p-2.5 rounded-xl bg-background border border-primary/40 flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <BookOpenCheck className="size-4.5" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">Carnê Digital da Loja</p>
                          <p className="text-[11px] text-muted-foreground">
                            Em até <strong>{maxCarneInstallments}x</strong> {carneGraceDays ? `(1ª parcela em ${carneGraceDays}d)` : ""} direto na Waesy
                          </p>
                        </div>
                      </div>
                    )}

                    {acceptsCash && (
                      <div className="p-2.5 rounded-xl bg-background border border-border/50 flex items-center gap-2.5">
                        <div className="size-8 rounded-lg bg-slate-500/10 text-slate-600 flex items-center justify-center shrink-0">
                          <Coins className="size-4.5" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">Dinheiro em Espécie</p>
                          <p className="text-[11px] text-muted-foreground">Pagamento presencial na entrega / retirada</p>
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
                            {tradeNotes || "Aceita propostas de troca sob avaliação"}
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
                          <p className="text-[11px] text-muted-foreground">{financingNotes || "Suporte bancário e aprovação de crédito"}</p>
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
              )}

              {/* Card de Transporte Polimórfico (Apenas Turismo/Viagens) */}
              {isTravel && flightDetails && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-3">

                  {/* ── AÉREO ── */}
                  {(transportType === "airplane") && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-xl bg-foreground text-background flex items-center justify-center">
                            <Plane className="size-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-foreground">Voo Incluso</h4>
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
                      {(flightDetails.departure_iata || flightDetails.arrival_iata) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono font-bold text-foreground">{flightDetails.departure_iata}</span>
                          <ChevronRight className="size-3.5 shrink-0" />
                          <span className="font-mono font-bold text-foreground">{flightDetails.arrival_iata}</span>
                          {flightDetails.airline && <span className="text-[11px]">• {flightDetails.airline}</span>}
                          {flightDetails.connections === 0 && <span className="text-[11px] text-emerald-600">• Direto</span>}
                          {(flightDetails.connections ?? 0) > 0 && <span className="text-[11px] text-amber-600">• {flightDetails.connections} escala(s)</span>}
                        </div>
                      )}
                      {(flightDetails.departure_time || flightDetails.arrival_time) && (
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          {flightDetails.departure_time && <span>Embarque: <span className="font-mono font-bold text-foreground">{flightDetails.departure_time}</span></span>}
                          {flightDetails.arrival_time && <span>Chegada: <span className="font-mono font-bold text-foreground">{flightDetails.arrival_time}</span></span>}
                        </div>
                      )}
                    </>
                  )}

                  {/* ── TERRESTRE / EXCURSÃO ── */}
                  {transportType === "bus" && (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0 shadow-xs">
                          <Bus className="size-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-foreground">Excursão Terrestre</h4>
                          {flightDetails.duration_text && (
                            <p className="text-xs text-muted-foreground">{flightDetails.duration_text}</p>
                          )}
                        </div>
                        {(() => {
                          const cat = CANONICAL_BUS_CATEGORIES.find(b => b.id === flightDetails.bus_category);
                          return cat ? (
                            <Badge variant="outline" className="ml-auto text-xs font-semibold px-2.5 py-0.5">{cat.label}</Badge>
                          ) : null;
                        })()}
                      </div>
                      {flightDetails.bus_company && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                          <span>Operador / Frota:</span>
                          <span className="text-foreground font-semibold">{flightDetails.bus_company}</span>
                        </p>
                      )}
                      {flightDetails.meeting_point && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border/70 shadow-2xs">
                          <MapPin className="size-4 text-primary mt-0.5 shrink-0" />
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-foreground uppercase tracking-wide">Ponto de Encontro</p>
                            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-medium">{flightDetails.meeting_point}</p>
                          </div>
                        </div>
                      )}
                      {flightDetails.departure_city && !flightDetails.meeting_point && (
                        <p className="text-xs sm:text-sm text-foreground/90 flex items-center gap-1.5">
                          <MapPin className="size-3.5 shrink-0 text-primary" /> Saída de: <span className="font-bold text-foreground">{flightDetails.departure_city}</span>
                          {flightDetails.departure_time && <span className="font-mono font-bold text-primary">• {flightDetails.departure_time}</span>}
                        </p>
                      )}
                      {Array.isArray(flightDetails.boarding_gateways) && flightDetails.boarding_gateways.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-xs font-bold text-foreground uppercase tracking-wider">
                            Embarques na Rota
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {flightDetails.boarding_gateways.map((gw: string, i: number) => (
                              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/25 text-xs font-semibold text-primary">
                                <Navigation className="size-3 shrink-0" />{gw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {flightDetails.guide_service && (() => {
                        const guide = CANONICAL_GUIDE_SERVICES.find(g => g.id === flightDetails.guide_service);
                        return guide ? (
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground/90 pt-0.5">
                            <span className="text-muted-foreground">Acompanhamento:</span>
                            <span className="font-bold text-foreground">{guide.label}</span>
                          </div>
                        ) : null;
                      })()}
                      {flightDetails.return_departure_time && (
                        <p className="text-xs sm:text-sm text-muted-foreground pt-0.5">
                          Retorno previsto: <span className="font-mono font-bold text-foreground">{flightDetails.return_departure_time}</span>
                        </p>
                      )}
                    </>
                  )}

                  {/* ── MULTIMODAL / COMBO ── */}
                  {transportType === "combo" && (
                    <div className="space-y-3">
                      {/* Trecho 1: Voo */}
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-lg bg-foreground text-background flex items-center justify-center shrink-0">
                          <Plane className="size-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-foreground">Voo</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {flightDetails.combo_flight_from_iata}
                            {flightDetails.combo_flight_from_iata && flightDetails.combo_flight_to_iata && " → "}
                            {flightDetails.combo_flight_to_iata}
                            {flightDetails.combo_airline && ` • ${flightDetails.combo_airline}`}
                          </p>
                        </div>
                        {flightDetails.combo_flight_price_text && (
                          <span className="text-xs font-bold text-foreground shrink-0">{flightDetails.combo_flight_price_text}</span>
                        )}
                      </div>
                      {/* Divider */}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="flex-1 h-px bg-border/50" />
                        <RouteIcon className="size-3.5 shrink-0" />
                        <div className="flex-1 h-px bg-border/50" />
                      </div>
                      {/* Trecho 2: Transfer */}
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                          {(() => {
                            const v = flightDetails.transfer_vehicle || "";
                            if (v.includes("barco") || v.includes("lancha")) return <Ship className="size-3.5" />;
                            return <Bus className="size-3.5" />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-foreground">
                            Transfer {flightDetails.transfer_duration ? `(${flightDetails.transfer_duration})` : ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {flightDetails.transfer_from}
                            {flightDetails.transfer_from && flightDetails.transfer_to && " → "}
                            {flightDetails.transfer_to}
                            {(() => {
                              const v = CANONICAL_TRANSFER_VEHICLES.find(x => x.id === flightDetails.transfer_vehicle);
                              return v ? ` • ${v.label}` : "";
                            })()}
                          </p>
                        </div>
                      </div>
                      {flightDetails.guide_service && (() => {
                        const guide = CANONICAL_GUIDE_SERVICES.find(g => g.id === flightDetails.guide_service);
                        return guide ? (
                          <p className="text-[11px] text-muted-foreground">{guide.label}</p>
                        ) : null;
                      })()}
                      {flightDetails.combo_notes && (
                        <p className="text-[11px] text-muted-foreground italic">{flightDetails.combo_notes}</p>
                      )}
                    </div>
                  )}

                  {/* ── CRUZEIRO ── */}
                  {transportType === "cruise" && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-xl bg-foreground text-background flex items-center justify-center">
                          <Ship className="size-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-foreground">{flightDetails.ship_name || "Cruzeiro"}</h4>
                          {flightDetails.cruise_line && <p className="text-[11px] text-muted-foreground">{flightDetails.cruise_line}</p>}
                        </div>
                        {flightDetails.cabin_category && (
                          <Badge variant="outline" className="ml-auto text-[10px]">{flightDetails.cabin_category}</Badge>
                        )}
                      </div>
                      {flightDetails.embarkation_port && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="size-3" /> {flightDetails.embarkation_port}
                        </p>
                      )}
                    </>
                  )}

                  {/* ── CARRO / HOTEL ONLY ── */}
                  {(transportType === "car" || transportType === "hotel_only") && flightDetails.meeting_point && (
                    <div className="flex items-start gap-2">
                      <div className="size-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                        {transportType === "car" ? <Car className="size-3.5" /> : <MapPin className="size-3.5" />}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-foreground">Check-in / Encontro</p>
                        <p className="text-[11px] text-muted-foreground">{flightDetails.meeting_point}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Saídas Confirmadas (Múltiplas Datas - Apenas Turismo/Excursões) */}
              {isTravel && departureOptions.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary" />
                    Saídas Disponíveis
                  </h4>
                  <div className="space-y-2">
                    {departureOptions.map((opt, i) => {
                      const cfg = DEPARTURE_STATUS_CONFIG[opt.status] || DEPARTURE_STATUS_CONFIG.confirmed;
                      const depDate = opt.departure_date ? new Date(opt.departure_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "";
                      const retDate = opt.return_date ? new Date(opt.return_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
                      const optId = opt.id || String(i);
                      const isSelected = selectedDepartureId === optId || (!selectedDepartureId && i === 0);
                      return (
                        <div
                          key={opt.id || i}
                          onClick={() => setSelectedDepartureId(selectedDepartureId === optId ? null : optId)}
                          className={cn(
                            "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-left",
                            isSelected
                              ? "border-primary ring-2 ring-primary/25 bg-primary/5"
                              : "bg-background border-border/50 hover:border-primary/40 hover:bg-muted/30"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="size-3.5 text-primary shrink-0" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                {opt.label && <p className="text-[11px] font-bold text-foreground">{opt.label}</p>}
                                {isSelected && (
                                  <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded-full">
                                    ✓ Selecionada
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                {depDate}{depDate && retDate && " — "}{retDate}
                                {opt.departure_time && <span className="font-mono ml-1">{opt.departure_time}</span>}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {opt.available_seats !== undefined && opt.available_seats > 0 && (
                              <span className="text-[10px] text-muted-foreground">{opt.available_seats} vagas</span>
                            )}
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", cfg.color)}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Clima Real via wttr.in (Exclusivo para Viagens e Hospedagem) */}
              {(isTravel || isHospitality) && destinationCity ? (
                <WeatherWidget city={destinationCity} />
              ) : null}

              {/* Mapa Interativo */}
              {!hideLocation && classified.location_lat && classified.location_lng ? (
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

      {/* Coluna Direita: Box de Preço, Parcelas, Anunciante e CTAs (5 colunas no Desktop) */}
      <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <div className="bg-card rounded-2xl border border-border/70 p-6 sm:p-7 space-y-6 shadow-xs">
            {/* ── 1. Topo & Identificação Editorial ── */}
            <div className="space-y-3">
              {!hideLocation && classified.location_name && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="px-3 py-1 rounded-xl bg-muted/60 text-foreground text-xs font-semibold gap-1.5">
                    <MapPin className="size-3.5 text-primary" />
                    <span>{classified.location_name}</span>
                  </Badge>
                </div>
              )}

              <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-snug tracking-tight">
                {classified.title}
              </h1>
            </div>

            {/* ── 2. Card Financeiro & Precificação Estruturada ── */}
            <div className="p-5 rounded-2xl bg-muted/25 dark:bg-muted/15 border border-border/70 space-y-2.5">
              {pricingType === "starting_at" && (
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider block">
                    A partir de
                  </span>
                  {pixDiscountPercent > 0 && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      -{pixDiscountPercent}% via PIX
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-col">
                {pricingType === "on_quote" ? (
                  <span className="text-2xl sm:text-3xl font-black text-foreground">Sob Consulta</span>
                ) : pricingType === "free" ? (
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600">Gratuito</span>
                ) : pricingType === "exchange_only" ? (
                  <span className="text-2xl sm:text-3xl font-black text-amber-600">Somente Troca</span>
                ) : priceCents > 0 ? (
                  <>
                    {maxInstallments > 1 ? (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-muted-foreground">{maxInstallments}x</span>
                          <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight font-display">
                            {formatMoney(installmentCents)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1.5 border-t border-border/40 mt-1">
                          <span>Total à vista: <strong className="text-foreground">{formatMoney(priceCents)}</strong></span>
                          <span>•</span>
                          <span className={installmentsInterestFree ? "text-emerald-600 font-bold" : "text-primary font-semibold"}>
                            {installmentsInterestFree ? "sem juros" : "no cartão"}
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight font-display">
                        {formatMoney(priceCents)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xl font-bold text-foreground">Consulte Valores</span>
                )}
              </div>
            </div>

            {/* ── 3. Feature Cards Estruturados (Lista Compacta sem Truncamento) ── */}
            {(() => {
              const fCards = getClassifiedFeatureCards(classified);
              if (!fCards || fCards.length === 0) return null;
              return (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Destaques
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {fCards.map((card, idx) => {
                      const Icon = card.icon;
                      return (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-background border border-border/70 flex items-center gap-2.5 shadow-2xs min-w-0"
                        >
                          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex flex-col flex-1">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              {card.title}
                            </span>
                            <span className="text-xs font-bold text-foreground truncate" title={card.value}>
                              {card.value}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── 4. Card do Anunciante Desktop (Isolamento Estrito Pessoa Física vs Empresa) ── */}
            <div className="p-4 rounded-2xl bg-muted/25 border border-border/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-12 rounded-2xl bg-background border border-border/70 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                  {advertiserAvatar ? (
                    <img src={advertiserAvatar} alt={advertiserName} className="size-full object-cover" />
                  ) : isCompany ? (
                    <StoreIcon className="size-6 text-muted-foreground" />
                  ) : (
                    <User className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-black text-sm sm:text-base text-foreground truncate">
                      {advertiserName}
                    </span>
                    <CheckCircle2 className="size-4 text-blue-500 shrink-0" title="Verificado Waesy" />
                  </div>
                  <span className="text-xs text-muted-foreground truncate">
                    {advertiserCity ? `${advertiserCity} • ` : ""}{isCompany ? "Loja Oficial" : "Anunciante"}
                  </span>
                </div>
              </div>

              {storeProfileUrl && (
                <Button asChild size="sm" variant="outline" className="h-9 px-3 rounded-xl text-xs font-bold border-border/80 hover:bg-background shrink-0">
                  <Link to={storeProfileUrl}>
                    <span>{isCompany ? "Ver Loja" : "Ver Perfil"}</span>
                    <ChevronRight className="size-3.5 ml-0.5" />
                  </Link>
                </Button>
              )}
            </div>

            {/* ── 5. Botões de Conversão Primária Desktop ── */}
            <div className="space-y-2.5 pt-1">
              <Button
                onClick={handleOpenAction}
                className="w-full h-12 sm:h-13 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-black text-sm tracking-tight shadow-md active:scale-98 transition-all cursor-pointer"
              >
                {getPrimaryCtaLabel()}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                {advertiserPhone && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleWhatsAppDirect}
                    className="h-11 rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs gap-1.5 cursor-pointer"
                  >
                    <MessageCircle className="size-4" />
                    <span>WhatsApp</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsContactModalOpen(true)}
                  className="h-11 rounded-xl border-border/80 text-foreground hover:bg-muted font-bold text-xs gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="size-4" />
                  <span>Mais Opções</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* ── Barra Inferior Flutuante Fixa (Apenas no Mobile) ── */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/60 shadow-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0 flex-1">
            {pricingType === "on_quote" ? (
              <span className="text-sm sm:text-base font-black text-foreground tracking-tight">Sob Consulta</span>
            ) : pricingType === "free" ? (
              <span className="text-sm sm:text-base font-black text-emerald-600 tracking-tight">Gratuito</span>
            ) : pricingType === "exchange_only" ? (
              <span className="text-sm sm:text-base font-black text-amber-600 tracking-tight">Somente Troca</span>
            ) : priceCents > 0 ? (
              <>
                <div className="flex items-baseline gap-1 min-w-0">
                  {pricingType === "starting_at" && (
                    <span className="text-[9.5px] font-bold text-muted-foreground uppercase shrink-0">A partir</span>
                  )}
                  {maxInstallments > 1 ? (
                    <>
                      <span className="text-[10.5px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
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
                <div className="flex items-center gap-1 text-[10px] sm:text-[10.5px] text-muted-foreground truncate">
                  {maxInstallments > 1 ? (
                    <>
                      <span>Total: {formatMoney(priceCents)}</span>
                      <span>•</span>
                      <span className={installmentsInterestFree ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}>
                        {installmentsInterestFree ? "sem juros" : "no cartão"}
                      </span>
                    </>
                  ) : (
                    <span>À vista</span>
                  )}
                  {pixDiscountPercent > 0 && (
                    <span className="ml-1 text-emerald-600 font-bold bg-emerald-500/10 px-1 py-0.2 rounded text-[9px]">
                      -{pixDiscountPercent}% PIX
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-xs font-bold text-foreground">Consulte Valores</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {advertiserPhone && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleWhatsAppDirect}
                className="size-11 rounded-full border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 active:scale-95 transition-all shrink-0 cursor-pointer"
                title="Falar no WhatsApp"
                aria-label="Falar no WhatsApp"
              >
                <MessageCircle className="size-5" />
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsContactModalOpen(true)}
              className="size-11 rounded-full border-border/80 text-foreground hover:bg-muted active:scale-95 transition-all shrink-0 cursor-pointer"
              title="Mais Opções de Contato"
              aria-label="Mais Opções de Contato"
            >
              <MessageSquare className="size-5" />
            </Button>

            <Button
              onClick={handleOpenAction}
              className="h-11 px-4 sm:px-6 rounded-full bg-foreground text-background hover:bg-foreground/90 font-extrabold text-xs tracking-tight shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              {getPrimaryCtaLabel()}
            </Button>
          </div>
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

      {/* ── Modal de Opções de Contato & Negociação Multi-Canal ── */}
      <Dialog open={isContactModalOpen} onOpenChange={setIsContactModalOpen}>
        <DialogContent className="max-w-md p-5 rounded-3xl bg-background/98 backdrop-blur-xl border border-border/60">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="size-5 text-primary" />
              <span>Canais de Atendimento</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Resumo do Anunciante */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-10 rounded-full bg-background border border-border/60 overflow-hidden shrink-0 flex items-center justify-center">
                  {advertiserAvatar ? (
                    <img src={advertiserAvatar} alt={advertiserName} className="size-full object-cover" />
                  ) : (
                    <StoreIcon className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-xs text-foreground truncate">{advertiserName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{advertiserCity}</p>
                </div>
              </div>
              {storeProfileUrl && (
                <Button asChild size="sm" variant="ghost" className="h-8 text-xs font-bold text-primary">
                  <Link to={storeProfileUrl}>
                    Ver Loja
                  </Link>
                </Button>
              )}
            </div>

            {/* Ações de Contato */}
            <div className="space-y-2">
              {advertiserPhone && (
                <button
                  type="button"
                  onClick={() => {
                    setIsContactModalOpen(false);
                    handleWhatsAppDirect();
                  }}
                  className="w-full p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <MessageCircle className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">WhatsApp Oficial</p>
                      <p className="text-[11px] text-muted-foreground">Conversar direto com resposta rápida</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-emerald-600" />
                </button>
              )}

              {/* Detalhes de Parcelamento */}
              {priceCents > 0 && maxInstallments > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsContactModalOpen(false);
                    setIsInstallmentsModalOpen(true);
                  }}
                  className="w-full p-3 rounded-2xl bg-muted/40 hover:bg-muted/60 border border-border/50 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <CreditCard className="size-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Tabela de Parcelamento</p>
                      <p className="text-[11px] text-muted-foreground">
                        Em até {maxInstallments}x {installmentsInterestFree ? "sem juros" : "no cartão"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Formulário de Mensagem Direta pelo App */}
            <div className="pt-2 border-t border-border/40 space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Send className="size-3.5 text-primary" />
                <span>Mensagem Direta pelo App</span>
              </label>
              <Textarea
                placeholder="Olá! Gostaria de tirar dúvidas ou fazer uma proposta neste anúncio..."
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
              <Button
                type="button"
                onClick={handleSendAppMessage}
                disabled={isSendingMessage || !contactMessage.trim()}
                className="w-full h-10 rounded-xl text-xs font-bold gap-2"
              >
                {isSendingMessage ? "Enviando..." : "Enviar Mensagem ao Anunciante"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal de Detalhamento de Parcelas ── */}
      <Dialog open={isInstallmentsModalOpen} onOpenChange={setIsInstallmentsModalOpen}>
        <DialogContent className="max-w-sm p-5 rounded-3xl bg-background/98 backdrop-blur-xl border border-border/60">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <CreditCard className="size-5 text-primary" />
              <span>Condições de Pagamento</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 text-center">
              <span className="text-[11px] text-muted-foreground font-medium">Valor Total</span>
              <p className="text-xl font-black text-foreground font-display">{formatMoney(priceCents)}</p>
              {pixDiscountPercent > 0 && (
                <p className="text-xs font-bold text-emerald-600 mt-1">
                  PIX: {formatMoney(Math.round(priceCents * (1 - pixDiscountPercent / 100)))} ({pixDiscountPercent}% de desconto)
                </p>
              )}
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto no-scrollbar pr-1 divide-y divide-border/30">
              {Array.from({ length: maxInstallments }, (_, idx) => {
                const num = idx + 1;
                const partCents = Math.round(priceCents / num);
                return (
                  <div key={num} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{num}x de {formatMoney(partCents)}</span>
                    <span className={installmentsInterestFree ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
                      {installmentsInterestFree ? "Sem juros" : "No cartão"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
