import React, { useState, useMemo, useEffect } from "react";
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
  CreditCard,
  QrCode,
  Receipt,
  FileSpreadsheet,
  BookOpenCheck,
  RefreshCw,
  Landmark,
  BadgePercent,
  Bed,
  Bath,
  CarFront,
  Ruler,
  CheckCircle2,
  Flame,
  Tag as TagIcon,
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
  TrendingUp,
  Banknote,
  Eye,
  EyeOff,
  Lock,
  Shield,
  Activity,
  Gauge,
  Sparkles,
  Scale,
  Unlock,
} from "lucide-react";
import {
  analyzeCommercialPointPotential,
  auditCnpjWithSimLabs,
  getCommercialPointTelemetry,
  type AcquisitionOpportunityAnalysis,
  type CnpjAuditResult,
  type CommercialPointTelemetryResult,
} from "@/services/market-intelligence.functions";
import { getPublicApiGovernanceSettings } from "@/services/public-apis.functions";
import { signClassifiedNda, checkClassifiedNdaStatus } from "@/services/classifieds.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { FavoriteButton } from "@/components/common/favorite-button";
import { MapLibreCanvas } from "@/components/mobility/maplibre-canvas";
import { resolveClassifiedNiche, getClassifiedFeatureCards, getClassifiedPrimaryCtaLabel } from "@/lib/classifieds/semantics";
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
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "business" | "policies">("overview");
  const [isAllAmenitiesOpen, setIsAllAmenitiesOpen] = useState(false);
  const [isNdaAccepted, setIsNdaAccepted] = useState(false);
  const [isNdaDialogOpen, setIsNdaDialogOpen] = useState(false);
  const [ndaSignerName, setNdaSignerName] = useState(currentProfile?.full_name || "");
  const [ndaSignerEmail, setNdaSignerEmail] = useState(currentProfile?.email || "");
  const [ndaSignerDocument, setNdaSignerDocument] = useState(currentProfile?.document || "");
  const [isSubmittingNda, setIsSubmittingNda] = useState(false);

  // Estados de Telemetria e Inteligência SimLabs (Governança Liga/Desliga no Admin)
  const [isSimLabsEnabled, setIsSimLabsEnabled] = useState(false);
  const [pointTelemetry, setPointTelemetry] = useState<CommercialPointTelemetryResult | null>(null);
  const [simLabsAnalysis, setSimLabsAnalysis] = useState<AcquisitionOpportunityAnalysis | null>(null);
  const [isAnalyzingSimLabs, setIsAnalyzingSimLabs] = useState(false);
  const [isSimLabsDrawerOpen, setIsSimLabsDrawerOpen] = useState(false);
  const [cnpjQueryInput, setCnpjQueryInput] = useState(classified?.attributes?.company_cnpj || "");
  const [cnpjAuditData, setCnpjAuditData] = useState<CnpjAuditResult | null>(null);
  const [isAuditingCnpj, setIsAuditingCnpj] = useState(false);

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
  const attrs = classified?.attributes || {};
  const priceCents = classified?.price_cents || 0;

  // 2.1 Identificação de Negócios / M&A & Sigilo (meuBIZ / Quero Um Negócio)
  const isBusiness =
    classified?.category === "business" ||
    classified?.category === "negocios" ||
    niche.id === "business" ||
    Boolean(attrs.is_business_sale) ||
    Boolean(attrs.niche === "business");

  const requiresNda = Boolean(attrs.requires_nda || attrs.is_confidential);
  const isFinancialMasked = requiresNda && !isNdaAccepted && !isOwner && !canManage;

  const isDonation =
    classified?.category === "donation" ||
    niche.id === "donation" ||
    attrs?.niche === "donation" ||
    (priceCents === 0 && attrs?.niche === "donation");

  // Efeito de Auditoria: Valida se o usuário já possui assinatura de NDA persistida no Supabase
  useEffect(() => {
    if (!classified?.id || !requiresNda) return;
    if (isOwner || canManage) {
      setIsNdaAccepted(true);
      return;
    }
    checkClassifiedNdaStatus({ data: { classifiedId: classified.id } })
      .then((res) => {
        if (res.isSigned) {
          setIsNdaAccepted(true);
        }
      })
      .catch(() => {});
  }, [classified?.id, requiresNda, isOwner, canManage]);

  // Governança: Checa se a telemetria SimLabs está ativada no Admin Master (desativada por padrão)
  useEffect(() => {
    getPublicApiGovernanceSettings()
      .then((gov) => {
        setIsSimLabsEnabled(Boolean(gov?.isSimLabsClassifiedTelemetryActive));
      })
      .catch(() => {
        setIsSimLabsEnabled(false);
      });
  }, []);

  // Telemetria do Ponto Comercial: consulta dados reais se a flag de governança estiver ativa
  useEffect(() => {
    if (!isSimLabsEnabled || !isBusiness) return;
    const address = attrs.address || attrs.street || classified?.location_name || "";
    const city = attrs.city || classified?.location_name || "";
    if (!address && !city && !attrs.point_id) return;

    getCommercialPointTelemetry({
      data: {
        address: address || undefined,
        city: city || undefined,
        pointId: attrs.point_id || undefined,
      },
    })
      .then((res) => {
        if (res?.found) {
          setPointTelemetry(res);
        }
      })
      .catch(() => {});
  }, [isSimLabsEnabled, isBusiness, attrs.address, attrs.street, attrs.city, attrs.point_id, classified?.location_name]);

  const handleSignNda = async () => {
    if (!ndaSignerName.trim() || !ndaSignerEmail.trim() || !ndaSignerDocument.trim()) {
      toast.error("Preencha nome completo, e-mail e CPF/CNPJ para assinar o termo de confidencialidade.");
      return;
    }
    setIsSubmittingNda(true);
    try {
      await signClassifiedNda({
        data: {
          classifiedId: classified.id,
          signerName: ndaSignerName,
          signerEmail: ndaSignerEmail,
          signerDocument: ndaSignerDocument,
        },
      });
      setIsNdaAccepted(true);
      setIsNdaDialogOpen(false);
      toast.success("Termo de confidencialidade assinado com sucesso! Informações financeiras liberadas.");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao assinar termo de sigilo.");
    } finally {
      setIsSubmittingNda(false);
    }
  };

  // 3. Preços e Custos
  const maxInstallments = Math.max(1, Number(classified?.attributes?.max_installments) || 12);
  const cardInterestFree = attrs.card_interest_free !== undefined ? !!attrs.card_interest_free : true;
  const installmentCents = Math.round(priceCents / maxInstallments);

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

  // Custos Imobiliários
  const condoCents = Number(classified?.attributes?.condo_cents) || 0;
  const iptuCents = Number(classified?.attributes?.iptu_cents) || 0;
  const totalMonthlyCents = priceCents + condoCents + iptuCents;

  // 3.1 Métricas Derivadas de Negócios (Zero Layout Shift)
  const monthlyRevenue = Number(attrs.monthly_revenue_cents) || 0;
  const monthlyNetProfit = Number(attrs.monthly_net_profit_cents) || 0;
  const monthlyRent = Number(attrs.monthly_rent_cents) || 0;
  const paybackMonthsStatic = monthlyNetProfit > 0 && priceCents > 0 ? Math.round(priceCents / monthlyNetProfit) : null;
  const occupancyRatioStatic = monthlyRevenue > 0 && monthlyRent > 0 ? Number(((monthlyRent / monthlyRevenue) * 100).toFixed(1)) : null;
  const annualRoiStatic = priceCents > 0 && monthlyNetProfit > 0 ? Math.round(((monthlyNetProfit * 12) / priceCents) * 100) : null;

  // Métricas Consolidadas SimLabs (100% Reais, zero mocks ou fallbacks simulados)
  const attractivenessScore =
    pointTelemetry?.point?.marketAttractivenessScore ??
    simLabsAnalysis?.feasibilityScore ??
    null;

  const paybackMonths =
    simLabsAnalysis?.paybackEstimatedMonths ??
    paybackMonthsStatic ??
    null;

  const occupancyPercent =
    simLabsAnalysis?.occupancyCostRatio !== undefined
      ? Number((simLabsAnalysis.occupancyCostRatio * 100).toFixed(1))
      : occupancyRatioStatic;

  // 3.2 Captação de Investimento & Busca de Sócios
  const isInvestmentOpportunity =
    isBusiness &&
    (attrs.business_type === "busca_socio" ||
      attrs.business_type === "captacao_investimento" ||
      Boolean(attrs.target_investment_cents));
  const targetInvestment = Number(attrs.target_investment_cents) || 0;
  const offeredEquity = attrs.offered_equity_percent;
  const investmentModel = attrs.investment_model;
  const projectStage = attrs.project_stage;
  const useOfFunds = Array.isArray(attrs.use_of_funds) ? attrs.use_of_funds : [];
  const pitchDeckUrl = attrs.pitch_deck_url;

  const handleRunSimLabsAnalysis = async () => {
    setIsAnalyzingSimLabs(true);
    try {
      const res = await analyzeCommercialPointPotential({
        data: {
          businessType: attrs.commercial_point_type || attrs.business_type || "Ponto Comercial",
          segment: attrs.business_segment || attrs.sub_niche || classified?.title || "Comércio Geral",
          askingPriceCents: priceCents || 0,
          monthlyRevenueCents: monthlyRevenue || undefined,
          monthlyNetProfitCents: monthlyNetProfit || undefined,
          monthlyRentCents: monthlyRent || undefined,
          areaSqm: Number(attrs.area_sqm) || undefined,
          city: classified?.location_name || attrs.city || "Chapecó",
        },
      });
      setSimLabsAnalysis(res);
      setIsSimLabsDrawerOpen(true);
      toast.success("Diagnóstico SimLabs IA recalculado com dados reais!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao processar análise com SimLabs IA.");
    } finally {
      setIsAnalyzingSimLabs(false);
    }
  };

  const handleAuditCnpj = async () => {
    const clean = (cnpjQueryInput || attrs.company_cnpj || "").replace(/\D/g, "");
    if (clean.length < 14) {
      toast.error("Informe um CNPJ válido com 14 dígitos.");
      return;
    }
    setIsAuditingCnpj(true);
    try {
      const res = await auditCnpjWithSimLabs({
        data: {
          cnpj: clean,
          companyName: attrs.company_legal_name || classified?.title || "Empresa Auditada",
          tradeName: classified?.title,
          cnaePrincipal: attrs.cnae_principal || "47.11-3-02",
          taxRegime: attrs.tax_regime || "simples_nacional",
          capitalSocialCents: Number(attrs.capital_social_cents) || 5000000,
        },
      });
      setCnpjAuditData(res);
      toast.success("Auditoria cadastral e risco de sucessão concluídos!");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao auditar CNPJ no cadastro federal.");
    } finally {
      setIsAuditingCnpj(false);
    }
  };

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
    const customMessage = isDonation
      ? `Olá! Vi o anúncio de doação "${classified.title}" no Waesy e gostaria de combinar a retirada.`
      : isInvestmentOpportunity
      ? `Olá! Vi o anúncio da sua empresa "${classified.title}" no Waesy sobre captação de investimento/parceria e gostaria de conversar sobre a proposta.`
      : isBusiness
      ? `Olá! Vi o anúncio da sua empresa "${classified.title}" no Waesy e gostaria de mais informações.`
      : `Olá! Vi o anúncio "${classified.title}" no Waesy e gostaria de mais informações. Link: ${window.location.href}`;

    trackAndOpenWhatsApp({
      phone,
      message: customMessage,
      entityType: "classified",
      entityId: classified.id,
      entityTitle: classified.title,
    });
  };

  // 6. Badges Sutis (Padrão Mobg / Airbnb: #F3F4F6, 11px, neutras)
  const subtleBadges = useMemo(() => {
    const list: string[] = [];
    if (classified?.status === "active") list.push("Disponível");
    if (classified?.status === "reserved") list.push("Reservado");

    if (classified?.category === "real_estate") {
      if (classified.deal_type === "venda" || classified.dealType === "venda") list.push("Venda");
      else list.push("Aluguel");
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
      list.push("Viagem");
      if (classified?.attributes?.duration_days) list.push(`${classified.attributes.duration_days} Dias`);
    } else if (classified?.category === "service") {
      list.push("Serviço");
    } else if (classified?.category === "job") {
      list.push("Vagas");
      if (classified?.attributes?.regime) list.push(getRegimeLabel(classified.attributes.regime));
    } else {
      // Semantic Library: showDeliveryBadges: false = proibido mostrar condição Novo/Usado
      // (imóveis, hospedagem, veículos, serviços, agro, turismo, digital, assinaturas, doações, negócios)
      if (niche.showDeliveryBadges !== false) {
        if (classified?.condition === "new") list.push("Novo");
        else if (classified?.condition === "used") list.push("Usado");
      }
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
        cards.push({ icon: Flame, label: "Combustível", value: classified.attributes.fuel });
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
    } else if (classified.category === "service" || niche.id === "service") {
      if (classified.attributes?.professional_council) {
        cards.push({ icon: ShieldCheck, label: "Registro Legal", value: String(classified.attributes.professional_council) });
      }
      if (classified.attributes?.specialty) {
        cards.push({ icon: Briefcase, label: "Especialidade", value: String(classified.attributes.specialty) });
      }
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
    } else if (classified.category === "food" || niche.id === "food") {
      if (classified.attributes?.food_subniche) {
        cards.push({ icon: TagIcon, label: "Culinária", value: String(classified.attributes.food_subniche).toUpperCase() });
      }
      if (classified.attributes?.food_prep_time_minutes) {
        cards.push({ icon: Clock, label: "Tempo Preparo", value: String(classified.attributes.food_prep_time_minutes) });
      }
      if (Array.isArray(classified.attributes?.food_delivery_modes) && classified.attributes.food_delivery_modes.length > 0) {
        cards.push({ icon: Truck, label: "Entrega", value: classified.attributes.food_delivery_modes.includes("delivery_proprio") ? "Delivery Próprio" : "Balcão / Retirada" });
      }
    } else if (classified.category === "digital" || classified.digital_file_url) {
      if (classified.attributes?.file_format) {
        cards.push({ icon: FileCheck, label: "Formato", value: classified.attributes.file_format.toUpperCase() });
      }
      if (classified.attributes?.file_size_bytes) {
        const mb = (classified.attributes.file_size_bytes / (1024 * 1024)).toFixed(1);
        cards.push({ icon: Download, label: "Tamanho", value: `${mb} MB` });
      }
      if (classified.attributes?.version) {
        cards.push({ icon: TagIcon, label: "Versão", value: classified.attributes.version });
      }
      cards.push({ icon: ShieldCheck, label: "Acesso", value: "Download Imediato" });
    } else if (niche.id === "hospitality_stay") {
      if (classified.attributes?.max_guests) {
        cards.push({ icon: Users, label: "Capacidade", value: `Até ${classified.attributes.max_guests} hóspedes` });
      }
      if (classified.attributes?.checkin_time) {
        cards.push({ icon: Clock, label: "Check-in", value: `A partir de ${classified.attributes.checkin_time}` });
      }
      if (classified.attributes?.checkout_time) {
        cards.push({ icon: Clock, label: "Check-out", value: `Até ${classified.attributes.checkout_time}` });
      }
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
      if (classified.attributes?.hotel_included !== undefined) {
        cards.push({ icon: ShieldCheck, label: "Hospedagem", value: classified.attributes.hotel_included ? "Inclusa" : "À parte" });
      }
      if (classified.attributes?.transport_type) {
        cards.push({ icon: CheckCircle2, label: "Transporte", value: String(classified.attributes.transport_type) });
      }
    } else if (isBusiness) {
      if (attrs.monthly_revenue_cents || attrs.monthly_revenue_masked) {
        cards.push({
          icon: TrendingUp,
          label: "Faturamento",
          value: isFinancialMasked ? (attrs.monthly_revenue_masked || "R$ 1***") : (attrs.monthly_revenue_cents ? `${formatMoney(attrs.monthly_revenue_cents)}/mês` : attrs.monthly_revenue_text || "Sob Consulta"),
        });
      }
      if (attrs.net_profit_cents || attrs.net_profit_masked) {
        cards.push({
          icon: Coins,
          label: "Lucro Mensal",
          value: isFinancialMasked ? (attrs.net_profit_masked || "R$ 4***") : (attrs.net_profit_cents ? `${formatMoney(attrs.net_profit_cents)}/mês` : attrs.net_profit_text || "Sob Consulta"),
        });
      }
      if (attrs.foundation_year || attrs.company_age_years) {
        cards.push({
          icon: Calendar,
          label: "Fundação / Idade",
          value: attrs.foundation_year ? String(attrs.foundation_year) : `${attrs.company_age_years} anos`,
        });
      }
      if (attrs.employees_count || attrs.employees_range) {
        cards.push({
          icon: Users,
          label: "Funcionários",
          value: attrs.employees_count ? String(attrs.employees_count) : attrs.employees_range || "Sob consulta",
        });
      }
      if (attrs.area_sqm) {
        cards.push({
          icon: Ruler,
          label: "Área do Ponto",
          value: `${attrs.area_sqm} m²`,
        });
      }
      if (attrs.working_capital_cents) {
        cards.push({
          icon: Banknote,
          label: "Capital de Giro",
          value: formatMoney(attrs.working_capital_cents),
        });
      }
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

  // 10.1 Abas Canônicas de Divulgação Progressiva (Heurística 2)
  const availableTabs = useMemo(() => {
    const list: Array<{ id: "overview" | "specs" | "business" | "policies"; label: string }> = [
      { id: "overview", label: "Visão Geral" },
      { id: "specs", label: "Especificações" },
    ];
    if (isBusiness) {
      list.push({ id: "business", label: "Negócio & Viabilidade" });
    }
    if (houseRules.length > 0 || departureOptions.length > 0 || attrs?.warranty || attrs?.warranty_days) {
      list.push({ id: "policies", label: "Políticas & Regras" });
    }
    return list;
  }, [isBusiness, houseRules.length, departureOptions.length, attrs]);

  // 11. CTA Primário Derivado por Nicho
  const primaryCta = useMemo(() => {
    if (isDonation) {
      return {
        label: "Solicitar Doação",
        action: () => {
          if (classified?.contact_whatsapp || classified?.whatsapp) {
            handleWhatsApp();
          } else if (onOpenProposalModal) {
            onOpenProposalModal();
          } else {
            toast.info("Entre em contato com o doador para combinar a retirada gratuita.");
          }
        },
      };
    }
    if (isInvestmentOpportunity) {
      return {
        label: "Apresentar Proposta de Investimento",
        action: () => {
          if (classified?.contact_whatsapp || classified?.whatsapp) {
            handleWhatsApp();
          } else if (onOpenProposalModal) {
            onOpenProposalModal();
          }
        },
      };
    }
    if (isBusiness) {
      return {
        label: "Tenho Interesse no Negócio",
        action: () => {
          if (classified?.contact_whatsapp || classified?.whatsapp) {
            handleWhatsApp();
          } else if (onOpenProposalModal) {
            onOpenProposalModal();
          }
        },
      };
    }
    if (niche.id === "hospitality_stay" || niche.id === "travel") {
      return {
        label: getClassifiedPrimaryCtaLabel(classified),
        action: () => onOpenBookingModal?.(),
      };
    }
    if (classified?.category === "real_estate") {
      return {
        label: getClassifiedPrimaryCtaLabel(classified),
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
  }, [isDonation, isInvestmentOpportunity, isBusiness, niche, classified, onOpenBookingModal, onOpenProposalModal, onDirectBuy, onDownloadDigital, isBuyingDirect, isDownloadingDigital, priceCents]);

  const isPrivacyHidden = Boolean(
    classified?.hide_location ||
    classified?.attributes?.hide_location ||
    classified?.attributes?.hide_address ||
    classified?.attributes?.location_privacy === "hidden"
  );

  const locationText = isPrivacyHidden
    ? "Localização preservada a pedido do anunciante"
    : (
        classified?.address ||
        classified?.location_name ||
        classified?.location_text ||
        classified?.attributes?.location_name ||
        [
          classified?.neighborhood || classified?.attributes?.neighborhood,
          classified?.city || classified?.attributes?.city,
          classified?.state || classified?.attributes?.state,
        ].filter(Boolean).join(", ") ||
        "Localização sob consulta"
      );

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
          {isOwner && onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-8 px-2.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5 border-border/60 bg-background/60 hover:bg-muted cursor-pointer"
            >
              <Edit3 className="size-3.5" />
              <span>Editar</span>
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
            entityId={classified.id}
            entityType="classified"
            title={classified.title}
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

      {/* ── Seção de Mídia (Mobile: Edge-to-Edge / Desktop: Mosaico Airbnb) ── */}
      <section aria-label="Galeria de Fotos e Vídeos" className="w-full max-w-7xl mx-auto px-0 sm:px-6 mb-4 sm:mb-5">
        {images.length > 0 ? (
          <>
            {/* MOBILE: Carrossel Edge-to-Edge sem bordas laterais (Proporção Natural 4:3) */}
            <div className="sm:hidden relative w-full aspect-[4/3] bg-muted/20 overflow-hidden select-none">
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

            {/* DESKTOP: Mosaico Bento Proporcional (Hero Natural 4:3/16:10 + Companions 2x2) */}
            <div className="hidden sm:block">
              {images.length === 1 ? (
                <div className="w-full aspect-[16/10] max-h-[500px] rounded-2xl overflow-hidden bg-muted/30 border border-border/40 relative group">
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
              ) : images.length === 2 ? (
                <div className="grid grid-cols-2 gap-3 aspect-[16/10] max-h-[500px] rounded-2xl overflow-hidden border border-border/40 bg-muted/20 relative group">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative overflow-hidden bg-muted/30 h-full">
                      {isVideoUrl(img) ? (
                        <video src={img} controls playsInline className="size-full object-contain bg-black/90" />
                      ) : (
                        <img
                          src={img}
                          alt={`${classified.title} - Foto ${idx + 1}`}
                          className="size-full object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-300"
                          onClick={() => setFullscreenImage(img)}
                        />
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFullscreenImage(images[0])}
                    className="absolute bottom-4 right-4 px-3.5 py-2 rounded-xl bg-background/90 hover:bg-background text-foreground text-xs font-semibold backdrop-blur-md border border-border/60 shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Maximize2 className="size-3.5" />
                    <span>Ver as 2 fotos</span>
                  </button>
                </div>
              ) : images.length === 3 ? (
                <div className="grid grid-cols-12 gap-3 aspect-[16/10] max-h-[500px] rounded-2xl overflow-hidden border border-border/40 bg-muted/20 relative group">
                  <div className="col-span-8 relative overflow-hidden bg-muted/30 h-full">
                    {isVideoUrl(images[0]) ? (
                      <video src={images[0]} controls playsInline className="size-full object-contain bg-black/90" />
                    ) : (
                      <img
                        src={images[0]}
                        alt={classified.title}
                        className="size-full object-cover cursor-pointer hover:scale-[1.01] transition-transform duration-300"
                        onClick={() => setFullscreenImage(images[0])}
                      />
                    )}
                  </div>
                  <div className="col-span-4 grid grid-rows-2 gap-3 h-full">
                    {images.slice(1, 3).map((img, idx) => (
                      <div key={idx} className="relative overflow-hidden bg-muted/30 h-full rounded-xl">
                        <img
                          src={img}
                          alt={`${classified.title} - Foto ${idx + 2}`}
                          className="size-full object-cover cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                          onClick={() => setFullscreenImage(img)}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFullscreenImage(images[0])}
                    className="absolute bottom-4 right-4 px-3.5 py-2 rounded-xl bg-background/90 hover:bg-background text-foreground text-xs font-semibold backdrop-blur-md border border-border/60 shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Maximize2 className="size-3.5" />
                    <span>Ver as 3 fotos</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-3 aspect-[16/10] max-h-[500px] rounded-2xl overflow-hidden border border-border/40 bg-muted/20 relative group">
                  {/* Foto Dominante Esquerda (7 colunas de 12 ~ 58% do container) */}
                  <div className="col-span-7 relative overflow-hidden bg-muted/30 h-full">
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

                  {/* Fotos Secundárias Direita (5 colunas de 12 em grade 2x2) */}
                  <div className="col-span-5 grid grid-cols-2 grid-rows-2 gap-2.5 h-full">
                    {images.slice(1, 5).map((img, idx) => (
                      <div key={idx} className="relative overflow-hidden bg-muted/30 h-full rounded-xl">
                        {isVideoUrl(img) ? (
                          <div
                            className="size-full bg-black/80 flex items-center justify-center cursor-pointer relative"
                            onClick={() => setFullscreenImage(img)}
                          >
                            <Play className="size-7 text-white/80" />
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
                  </div>

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
          <div className="w-full aspect-[16/10] max-h-[320px] sm:rounded-2xl bg-muted/30 border border-border/40 flex flex-col items-center justify-center text-muted-foreground">
            <Tag className="size-10 stroke-[1.5] mb-2 opacity-50" />
            <span className="text-xs font-medium">Anúncio sem fotos cadastradas</span>
          </div>
        )}
      </section>

      {/* ── Grid Principal de Conteúdo (Split Layout: 7 colunas Conteúdo / 5 colunas Sticky Card) ── */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 lg:gap-8 items-start">
          {/* ══════════════════════════════════════════════════════════
              COLUNA ESQUERDA: Abas de Alta Densidade e Clean UX (7 cols)
              ══════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            {/* 1. Header de Identidade & Título */}
            <div className="space-y-2">
              {/* Badges Sutis (Soft/Muted - Heurística 1) */}
              <div className="flex flex-wrap items-center gap-1.5">
                {classified?.status && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground">
                    <span className={cn("size-1.5 rounded-full", classified.status === "active" ? "bg-emerald-500" : "bg-amber-500")} />
                    {classified.status === "active" ? "Ativo" : "Pausado"}
                  </span>
                )}
                {subtleBadges.map((badge, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground border border-border/30"
                  >
                    {badge}
                  </span>
                ))}
                {isSimLabsEnabled && isBusiness && (
                  <button
                    type="button"
                    onClick={() => setIsSimLabsDrawerOpen(true)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20 cursor-pointer"
                  >
                    <Sparkles className="size-3 text-primary" />
                    <span>
                      SimLabs {attractivenessScore !== null ? `${attractivenessScore}/100` : "Viabilidade"}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-normal hidden sm:inline">· Due Diligence</span>
                  </button>
                )}
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
                <MapPin className="size-4 shrink-0 text-muted-foreground/70" />
                <span className="truncate">{locationText}</span>
              </div>
            </div>

            {/* Divulgação Progressiva: Barra de Abas Horizontais (Heurística 2) */}
            <div className="flex items-center gap-1.5 border-b border-border/40 pb-2 overflow-x-auto no-scrollbar pt-1">
              {availableTabs.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "h-9 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0",
                      isSelected
                        ? "bg-foreground text-background shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* ABA: VISÃO GERAL */}
            {activeTab === "overview" && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                {/* Destaques Principais (4 Minicards Clean) */}
                {techCards.length > 0 && (
                  <div className="space-y-2.5">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                      Destaques
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {techCards.slice(0, 4).map((card, idx) => {
                        const IconComponent = card.icon;
                        return (
                          <div
                            key={idx}
                            className="rounded-xl p-3 bg-muted/15 border border-border/30 flex flex-col justify-between min-h-[70px]"
                          >
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                              <IconComponent className="size-3.5 shrink-0 text-muted-foreground/70" />
                              <span className="truncate">{card.label}</span>
                            </div>
                            <span className="text-sm font-bold text-foreground font-mono truncate mt-1">
                              {card.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Oportunidade de Investimento & Parceria (quando aplicável) */}
                {isInvestmentOpportunity && (
                  <div className="rounded-2xl border border-primary/25 bg-card p-4 sm:p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-border/30">
                      <div className="flex items-center gap-2">
                        <Coins className="size-4 text-primary" />
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                          Oportunidade de Investimento & Parceria
                        </h2>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-medium border-none text-primary bg-primary/10">
                        {attrs.business_type === "busca_socio" ? "Busca de Sócio" : "Captação de Aporte"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-muted/15 border border-border/30">
                        <span className="text-muted-foreground block text-[11px] mb-0.5">Aporte Solicitado</span>
                        <strong className="text-primary text-base font-bold font-mono block">
                          {targetInvestment > 0 ? formatMoney(targetInvestment) : "A combinar"}
                        </strong>
                      </div>

                      <div className="p-3 rounded-xl bg-muted/15 border border-border/30">
                        <span className="text-muted-foreground block text-[11px] mb-0.5">Participação</span>
                        <strong className="text-foreground text-sm font-bold font-mono block">
                          {offeredEquity || "A combinar"}
                        </strong>
                      </div>

                      {investmentModel && (
                        <div className="p-3 rounded-xl bg-muted/15 border border-border/30">
                          <span className="text-muted-foreground block text-[11px] mb-0.5">Modelo</span>
                          <strong className="text-foreground text-xs font-semibold capitalize block truncate">
                            {investmentModel.replace(/_/g, " ")}
                          </strong>
                        </div>
                      )}

                      {projectStage && (
                        <div className="p-3 rounded-xl bg-muted/15 border border-border/30">
                          <span className="text-muted-foreground block text-[11px] mb-0.5">Estágio</span>
                          <strong className="text-foreground text-xs font-semibold capitalize block truncate">
                            {projectStage.replace(/_/g, " ")}
                          </strong>
                        </div>
                      )}
                    </div>

                    {useOfFunds.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-medium text-muted-foreground block">
                          Destino do Capital:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {useOfFunds.map((fund: string) => (
                            <span
                              key={fund}
                              className="inline-flex items-center text-[11px] px-2.5 py-0.5 rounded-full bg-muted/40 text-foreground gap-1"
                            >
                              <Check className="size-3 text-primary shrink-0" />
                              <span>{fund}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/30">
                      {pitchDeckUrl ? (
                        <a
                          href={pitchDeckUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                          <FileText className="size-3.5" />
                          <span>Ver Apresentação Comercial (PDF) ↗</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          Apresentação detalhada disponível sob contato.
                        </span>
                      )}

                      {(classified?.contact_whatsapp || classified?.whatsapp) && (
                        <Button
                          size="sm"
                          type="button"
                          onClick={handleWhatsApp}
                          className="h-8 px-3.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer shadow-xs gap-1.5"
                        >
                          <MessageCircle className="size-3.5" />
                          <span>Apresentar Proposta</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Descrição Editorial do Anúncio */}
                {classified?.content && (
                  <div className="space-y-2">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                      Sobre o Anúncio
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
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                      >
                        <span>{isDescExpanded ? "Ver menos" : "Ler descrição completa"}</span>
                        <ChevronRight className={cn("size-3.5 transition-transform", isDescExpanded && "-rotate-90")} />
                      </button>
                    )}
                  </div>
                )}

                {/* Comodidades & Diferenciais (Divulgação Progressiva - Heurística 2) */}
                {amenitiesList.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                        O que este item / local oferece
                      </h2>
                      <span className="text-xs text-muted-foreground">
                        {amenitiesList.length} itens informados
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-foreground/90">
                      {amenitiesList.slice(0, 4).map((amenity, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 py-1">
                          <div className="size-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Check className="size-3" />
                          </div>
                          <span className="font-medium truncate">{amenity}</span>
                        </div>
                      ))}
                    </div>
                    {amenitiesList.length > 4 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAllAmenitiesOpen(true)}
                        className="h-9 px-4 rounded-xl text-xs font-semibold border-border/40 hover:bg-muted/40 text-foreground cursor-pointer mt-1"
                      >
                        Mostrar todas as {amenitiesList.length} comodidades
                      </Button>
                    )}
                  </div>
                )}

                {/* Localização & Mapa */}
                <div className="space-y-2.5">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                    Localização
                  </h2>
                  <div className="rounded-2xl border border-border/30 overflow-hidden bg-muted/15 relative aspect-[16/9] sm:h-64 w-full">
                    {classified?.location_lat && classified?.location_lng ? (
                      <MapLibreCanvas
                        center={{
                          lat: Number(classified.location_lat),
                          lng: Number(classified.location_lng),
                        }}
                        markers={[
                          {
                            id: classified.id,
                            lat: Number(classified.location_lat),
                            lng: Number(classified.location_lng),
                            title: classified.title,
                          },
                        ]}
                        zoom={14}
                        className="size-full"
                      />
                    ) : (
                      <div className="size-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground bg-muted/20">
                        <MapPin className="size-8 stroke-[1.5] mb-2 opacity-40" />
                        <span className="text-xs font-medium max-w-sm">{locationText}</span>
                        <span className="text-[11px] text-muted-foreground/60 mt-1">
                          Coordenadas aproximadas para preservação de privacidade.
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0 text-muted-foreground/70" />
                    <span>{locationText}</span>
                  </p>
                </div>

                {/* Perfil do Anunciante */}
                <div className="rounded-2xl border border-border/30 bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="size-11 rounded-full bg-muted/40 text-foreground border border-border/40 flex items-center justify-center font-bold text-sm uppercase shrink-0 overflow-hidden">
                      {author.avatar_url ? (
                        <img src={author.avatar_url} alt={author.full_name || "Anunciante"} className="size-full object-cover" />
                      ) : (
                        <span>{(author.full_name || "A").charAt(0)}</span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {author.full_name || (classified?.store_id ? classified?.store_name : null) || "Anunciante"}
                        </span>
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          Verificado
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Atendimento direto via plataforma
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(classified?.contact_whatsapp || classified?.whatsapp) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleWhatsApp}
                        className="h-9 px-3.5 rounded-xl text-xs font-semibold border-border/40 hover:bg-muted/40"
                      >
                        <MessageCircle className="size-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                        <span>WhatsApp</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Selo de Garantia de Custódia Waesy */}
                <div className="rounded-xl border border-border/30 bg-muted/10 p-3.5 flex items-start gap-3 text-xs text-muted-foreground">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <strong className="text-foreground block text-xs">Proteção e Custódia Waesy</strong>
                    <p className="text-[11px] leading-relaxed">
                      Negociações realizadas na plataforma contam com proteção de valores em conta garantia até a confirmação de entrega do item ou cumprimento dos termos acordados.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ABA: ESPECIFICAÇÕES TÉCNICAS */}
            {activeTab === "specs" && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                {/* Todas as Características Principais */}
                {techCards.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                      Características Principais
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {techCards.map((card, idx) => {
                        const IconComponent = card.icon;
                        return (
                          <div
                            key={idx}
                            className="rounded-xl p-3 bg-muted/15 border border-border/30 flex flex-col justify-between min-h-[70px]"
                          >
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                              <IconComponent className="size-3.5 shrink-0 text-muted-foreground/70" />
                              <span className="truncate">{card.label}</span>
                            </div>
                            <span className="text-sm font-bold text-foreground font-mono truncate mt-1">
                              {card.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Custos e Encargos (Aluguel, Condomínio, IPTU) */}
                {classified?.category === "real_estate" && (condoCents > 0 || iptuCents > 0) && (
                  <div className="rounded-xl border border-border/30 bg-card p-4 space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
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
                    <div className="pt-2 border-t border-border/30 flex items-center justify-between text-xs font-semibold">
                      <span className="text-foreground">Custo Mensal Total Estimado:</span>
                      <span className="text-base font-bold text-foreground font-mono">{formatMoney(totalMonthlyCents)}/mês</span>
                    </div>
                  </div>
                )}

                {/* Instalações e Ponto Comercial */}
                {isBusiness && (attrs.area_sqm || attrs.monthly_rent_cents || attrs.monthly_iptu_cents || attrs.commercial_point_type) && (
                  <div className="rounded-xl border border-border/30 bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Building className="size-4 text-primary" />
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Instalações & Ponto Comercial
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {attrs.commercial_point_type && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Tipo de Ponto</span>
                          <strong className="text-foreground text-sm font-semibold capitalize">{attrs.commercial_point_type}</strong>
                        </div>
                      )}
                      {attrs.area_sqm && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Área do Ponto</span>
                          <strong className="text-foreground text-sm font-mono">{attrs.area_sqm} m²</strong>
                        </div>
                      )}
                      {attrs.monthly_rent_cents !== undefined && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Aluguel do Ponto</span>
                          <strong className="text-foreground text-sm font-mono">
                            {attrs.monthly_rent_cents === 0 ? "Imóvel Próprio / Incluso" : `${formatMoney(attrs.monthly_rent_cents)}/mês`}
                          </strong>
                        </div>
                      )}
                      {attrs.monthly_iptu_cents && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">IPTU Mensal</span>
                          <strong className="text-foreground text-sm font-mono">{formatMoney(attrs.monthly_iptu_cents)}/mês</strong>
                        </div>
                      )}
                      {attrs.monthly_condo_cents && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Condomínio</span>
                          <strong className="text-foreground text-sm font-mono">{formatMoney(attrs.monthly_condo_cents)}/mês</strong>
                        </div>
                      )}
                      {attrs.contract_remaining_years && (
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Contrato Restante</span>
                          <strong className="text-foreground text-sm font-semibold">{attrs.contract_remaining_years} ano(s)</strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Ficha Técnica Completa (Todos os atributos do CMS sem amputação) */}
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
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                        Especificações Adicionais
                      </h2>
                      <div className="border border-border/30 bg-card p-4 rounded-xl space-y-2.5 text-xs">
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
                            <div key={idx} className="flex justify-between items-start border-b border-border/20 pb-2 last:border-0 last:pb-0">
                              <span className="text-muted-foreground mr-4">{label}:</span>
                              <span className="text-foreground font-semibold text-right break-words">{formattedValue}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ABA: NEGÓCIOS & VIABILIDADE */}
            {activeTab === "business" && isBusiness && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                {/* Informações Estratégicas */}
                <div className="rounded-xl border border-border/30 bg-card p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="size-4 text-primary" />
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Informações da Empresa
                      </h2>
                    </div>
                    {requiresNda && (
                      <Badge variant="outline" className={cn("text-[10px] font-medium border-none", isFinancialMasked ? "text-amber-700 dark:text-amber-300 bg-amber-500/10" : "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10")}>
                        {isFinancialMasked ? "Dados sob NDA" : "NDA Assinado"}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-muted/15 border border-border/30">
                      <span className="text-muted-foreground block text-[11px] mb-1">Faturamento Mensal</span>
                      <strong className="text-foreground text-sm font-bold font-mono">
                        {isFinancialMasked ? (attrs.monthly_revenue_masked || "R$ 1***") : (attrs.monthly_revenue_cents ? formatMoney(attrs.monthly_revenue_cents) : attrs.monthly_revenue_text || "Sob consulta")}
                      </strong>
                    </div>

                    <div className="p-3 rounded-xl bg-muted/15 border border-border/30">
                      <span className="text-muted-foreground block text-[11px] mb-1">Lucro Mensal Líquido</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 text-sm font-bold font-mono">
                        {isFinancialMasked ? (attrs.net_profit_masked || "R$ 4***") : (attrs.net_profit_cents ? formatMoney(attrs.net_profit_cents) : attrs.net_profit_text || "Sob consulta")}
                      </strong>
                    </div>

                    {(attrs.working_capital_cents || attrs.working_capital_text) && (
                      <div className="p-3 rounded-xl bg-muted/15 border border-border/30">
                        <span className="text-muted-foreground block text-[11px] mb-1">Capital de Giro</span>
                        <strong className="text-foreground text-sm font-bold font-mono">
                          {attrs.working_capital_cents ? formatMoney(attrs.working_capital_cents) : attrs.working_capital_text}
                        </strong>
                      </div>
                    )}

                    {(attrs.foundation_year || attrs.company_age_years) && (
                      <div className="p-3 rounded-xl bg-muted/15 border border-border/30">
                        <span className="text-muted-foreground block text-[11px] mb-1">Idade da Empresa</span>
                        <strong className="text-foreground text-sm font-semibold">
                          {attrs.foundation_year ? `Fundada em ${attrs.foundation_year}` : `${attrs.company_age_years} anos`}
                        </strong>
                      </div>
                    )}

                    {(attrs.employees_count || attrs.employees_range) && (
                      <div className="p-3 rounded-xl bg-muted/15 border border-border/30">
                        <span className="text-muted-foreground block text-[11px] mb-1">Quadro de Funcionários</span>
                        <strong className="text-foreground text-sm font-semibold">
                          {attrs.employees_count ? `${attrs.employees_count} colaboradores` : attrs.employees_range}
                        </strong>
                      </div>
                    )}

                    {attrs.sale_reason && (
                      <div className="p-3 rounded-xl bg-muted/15 border border-border/30">
                        <span className="text-muted-foreground block text-[11px] mb-1">Motivo da Venda</span>
                        <strong className="text-foreground text-sm font-semibold uppercase truncate block">
                          {attrs.sale_reason}
                        </strong>
                      </div>
                    )}
                  </div>

                  {isFinancialMasked && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
                        <Lock className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Valores detalhados protegidos por Termo de Confidencialidade (NDA).</span>
                      </div>
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => setIsNdaDialogOpen(true)}
                        className="h-8 px-3 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shrink-0 cursor-pointer gap-1.5"
                      >
                        <Unlock className="size-3.5" />
                        <span>Desbloquear Números</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Documentos Confidenciais & DRE Protegidos por NDA (Fase 3 Master Plan) */}
                {attrs.restricted_documents && Array.isArray(attrs.restricted_documents) && attrs.restricted_documents.length > 0 && (
                  <div className="rounded-xl border border-border/30 bg-card p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="size-4 text-amber-600 dark:text-amber-400" />
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                          Documentos Confidenciais & DRE
                        </h2>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] font-medium border-none", isFinancialMasked ? "text-amber-700 bg-amber-500/10" : "text-emerald-700 bg-emerald-500/10")}>
                        {isFinancialMasked ? "Bloqueado por NDA" : "Acesso Liberado"}
                      </Badge>
                    </div>

                    {isFinancialMasked ? (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                          <Lock className="size-4 text-amber-600 shrink-0" />
                          <span>{attrs.restricted_documents.length} arquivo(s) estratégico(s) (DRE, balanços, inventário) sob termo de sigilo.</span>
                        </div>
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => setIsNdaDialogOpen(true)}
                          className="h-8 px-3 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shrink-0 cursor-pointer gap-1.5"
                        >
                          <Unlock className="size-3.5" />
                          <span>Assinar NDA para Baixar</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] text-muted-foreground">
                          Arquivos estratégicos disponibilizados pelo anunciante sob o termo de sigilo assinado.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {attrs.restricted_documents.map((doc: any, idx: number) => (
                            <a
                              key={idx}
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/50 hover:border-primary/50 text-xs transition-colors group cursor-pointer"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="size-4 text-primary shrink-0" />
                                <span className="font-medium text-foreground truncate">{doc.name}</span>
                                {doc.size_bytes && (
                                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                    ({(doc.size_bytes / 1024).toFixed(0)} KB)
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-primary font-semibold flex items-center gap-1 shrink-0 ml-2 group-hover:underline">
                                Baixar <Download className="size-3" />
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Telemetria SimLabs (Exibida SOMENTE quando ativada pelo Admin Master) */}
                {isSimLabsEnabled && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="size-4 text-primary" />
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                          Telemetria & Inteligência de Mercado
                        </h2>
                      </div>
                      <Badge variant="outline" className="text-[10px] border-none bg-primary/10 text-primary font-medium">
                        SimLabs
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-card border border-border/30">
                        <span className="text-muted-foreground block text-[11px] mb-1">Payback Estimado</span>
                        <strong className="text-foreground text-sm font-mono font-bold">
                          {paybackMonths !== null ? `${paybackMonths} meses` : "A calcular"}
                        </strong>
                      </div>

                      <div className="p-3 rounded-xl bg-card border border-border/30">
                        <span className="text-muted-foreground block text-[11px] mb-1">Custo Ocupação</span>
                        <strong className="text-foreground text-sm font-mono font-bold">
                          {occupancyPercent !== null ? `${occupancyPercent}%` : "Incluso / Não inf."}
                        </strong>
                      </div>

                      <div className="p-3 rounded-xl bg-card border border-border/30">
                        <span className="text-muted-foreground block text-[11px] mb-1">ROI Anual</span>
                        <strong className="text-emerald-600 text-sm font-mono font-bold">
                          {annualRoiStatic ? `${annualRoiStatic}% a.a.` : "Sob consulta"}
                        </strong>
                      </div>

                      <div className="p-3 rounded-xl bg-card border border-border/30">
                        <span className="text-muted-foreground block text-[11px] mb-1">Atratividade</span>
                        <strong className="text-primary text-sm font-mono font-bold">
                          {attractivenessScore !== null ? `${attractivenessScore}/100` : "Sob análise"}
                        </strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        type="button"
                        onClick={handleRunSimLabsAnalysis}
                        disabled={isAnalyzingSimLabs}
                        className="h-8 px-3 rounded-lg text-xs font-semibold bg-primary text-primary-foreground cursor-pointer"
                      >
                        <Sparkles className="size-3.5 mr-1.5" />
                        {isAnalyzingSimLabs ? "Recalculando..." : "Recalcular Viabilidade"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => setIsSimLabsDrawerOpen(true)}
                        className="h-8 px-3 rounded-lg text-xs font-semibold border-border/40 bg-card hover:bg-muted/40 cursor-pointer"
                      >
                        <Scale className="size-3.5 mr-1.5 text-muted-foreground" />
                        Dossiê & Auditoria CNPJ
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ABA: POLÍTICAS & REGRAS */}
            {activeTab === "policies" && (
              <div className="space-y-6 animate-in fade-in-50 duration-150">
                {/* Regras da Casa (se houver) */}
                {houseRules.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                      Regras & Políticas da Estadia
                    </h2>
                    <div className="border border-border/30 bg-card p-4 rounded-xl space-y-2 text-xs text-muted-foreground">
                      {houseRules.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-2 py-0.5">
                          <span className="size-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
                          <span>{rule}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Saídas Confirmadas (se houver) */}
                {departureOptions.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                        Saídas Confirmadas Disponíveis
                      </h2>
                      <span className="text-xs text-muted-foreground">{departureOptions.length} datas</span>
                    </div>
                    <div className="space-y-2">
                      {departureOptions.map((dep, idx) => {
                        const statusConfig = DEPARTURE_STATUS_CONFIG[dep.status || "confirmed"] || DEPARTURE_STATUS_CONFIG.confirmed;
                        return (
                          <div
                            key={dep.id || idx}
                            className="rounded-xl border border-border/30 bg-card p-3.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <Calendar className="size-4 text-primary shrink-0" />
                                <strong className="text-foreground text-sm font-semibold">{dep.label || dep.departure_date}</strong>
                                <Badge variant="outline" className="text-[10px] font-medium border-none bg-muted/40 text-muted-foreground">
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
                                className="h-8 px-2.5 text-xs text-primary font-semibold hover:bg-primary/10"
                              >
                                <span>Reservar</span>
                                <ChevronRight className="size-3.5 ml-1" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Meios de Pagamento Aceitos & Condições Comerciais */}
                <div className="rounded-xl border border-border/30 bg-card p-4 sm:p-5 space-y-3.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <CreditCard className="size-4 text-primary" />
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                        Formas de Pagamento & Condições Comerciais
                      </h2>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-medium border-none bg-primary/10 text-primary">
                      Acordo Transparente
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {acceptsPix && (
                      <div className="p-3 rounded-xl bg-muted/15 border border-border/30 flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                          <QrCode className="size-4" />
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
                      <div className="p-3 rounded-xl bg-muted/15 border border-border/30 flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                          <CreditCard className="size-4" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">Cartão de Crédito</p>
                          <p className="text-[11px] text-muted-foreground">
                            {maxInstallments === 1
                              ? "Pagamento à vista"
                              : `Até ${maxInstallments}x ${installmentCents > 0 ? `de ${formatMoney(installmentCents)}` : ""} ${cardInterestFree ? "(sem juros)" : ""}`}
                          </p>
                        </div>
                      </div>
                    )}

                    {acceptsBoleto && (
                      <div className="p-3 rounded-xl bg-muted/15 border border-border/30 flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                          <Receipt className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">Boleto Bancário à Vista</p>
                          <p className="text-[11px] text-muted-foreground">
                            Vencimento em {boletoDueDays} dias úteis
                          </p>
                        </div>
                      </div>
                    )}

                    {acceptsBoletoInstallments && (
                      <div className="p-3 rounded-xl bg-muted/15 border border-border/30 flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="size-4" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">Boleto Parcelado Direto</p>
                          <p className="text-[11px] text-muted-foreground">
                            Até <strong>{maxBoletoInstallments}x</strong> {boletoMinDownPaymentCents ? `(Entrada ${formatMoney(boletoMinDownPaymentCents)})` : "direto com anunciante"}
                          </p>
                        </div>
                      </div>
                    )}

                    {acceptsCarne && (
                      <div className="p-3 rounded-xl bg-muted/15 border border-primary/30 flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <BookOpenCheck className="size-4" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">Carnê Digital da Loja</p>
                          <p className="text-[11px] text-muted-foreground">
                            Até <strong>{maxCarneInstallments}x</strong> {carneGraceDays ? `(1ª parcela em ${carneGraceDays}d)` : ""} direto na Waesy
                          </p>
                        </div>
                      </div>
                    )}

                    {acceptsCash && (
                      <div className="p-3 rounded-xl bg-muted/15 border border-border/30 flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-slate-500/10 text-slate-600 flex items-center justify-center shrink-0">
                          <Banknote className="size-4" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">Dinheiro em Espécie</p>
                          <p className="text-[11px] text-muted-foreground">Pagamento presencial na entrega / retirada</p>
                        </div>
                      </div>
                    )}

                    {acceptsTrade && (
                      <div className="p-3 rounded-xl bg-muted/15 border border-border/30 flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                          <RefreshCw className="size-4" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">Aceita Permuta / Troca</p>
                          <p className="text-[11px] text-muted-foreground">{tradeNotes || "Aceita propostas de troca sob avaliação"}</p>
                        </div>
                      </div>
                    )}

                    {acceptsFinancing && (
                      <div className="p-3 rounded-xl bg-muted/15 border border-border/30 flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                          <Landmark className="size-4" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">Financiamento / Consórcio</p>
                          <p className="text-[11px] text-muted-foreground">{financingNotes || "Suporte bancário e aprovação de crédito"}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Política de Cancelamento / Devolução:</span>
                    <strong className="text-foreground font-semibold">
                      {cancellationPolicy === "flexible"
                        ? "Flexível: Cancelamento grátis até 24h antes"
                        : cancellationPolicy === "moderate"
                        ? "Moderado: Cancelamento com 50% de reembolso"
                        : cancellationPolicy === "strict"
                        ? "Rígido: Não reembolsável após confirmação"
                        : "A combinar diretamente com o anunciante"}
                    </strong>
                  </div>
                </div>

                {/* Termos de Garantia e Custódia */}
                <div className="rounded-xl border border-border/30 bg-card p-4 space-y-2 text-xs">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                    Garantia e Custódia de Pagamento
                  </h2>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    Toda transação realizada por meio da Waesy conta com mediação e custódia segura. O valor pago fica resguardado até a entrega do item ou confirmação dos serviços acordados entre as partes.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════
              COLUNA DIREITA: Card Sticky de Preço & Conversão (Desktop >= 1024px)
              ══════════════════════════════════════════════════════════ */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="sticky top-24 rounded-2xl border border-border/60 bg-card p-6 shadow-xs space-y-6">
              {/* Bloco de Preço */}
              <div className="space-y-1">
                {isDonation ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                        Gratuito (R$ 0)
                      </span>
                      <Badge variant="outline" className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 border-none bg-emerald-500/10">
                        Doação Gratuita
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Item disponibilizado sem custos para a comunidade local.
                    </p>
                  </div>
                ) : isInvestmentOpportunity ? (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Aporte Solicitado
                    </span>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-2xl sm:text-3xl font-extrabold text-primary font-mono">
                        {targetInvestment > 0 ? formatMoney(targetInvestment) : (priceCents > 0 ? formatMoney(priceCents) : "A combinar")}
                      </span>
                      {offeredEquity && (
                        <Badge variant="outline" className="text-[10px] font-medium border-none text-primary bg-primary/10">
                          {offeredEquity}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Oportunidade de investimento e busca de sócios / parceiros.
                    </p>
                  </div>
                ) : (
                  <>
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
                        <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-none bg-muted/40">
                          Aceita Proposta
                        </Badge>
                      )}
                    </div>

                    {priceCents > 0 && maxInstallments > 1 && acceptsCard && (
                      <p className="text-xs text-muted-foreground font-mono">
                        ou até {maxInstallments}x de {formatMoney(installmentCents)} {cardInterestFree ? "sem juros" : ""}
                      </p>
                    )}

                    {/* Pills Rápidos de Condições Comerciais */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {acceptsPix && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          <QrCode className="size-3 text-emerald-600" />
                          PIX {pixDiscountPercent > 0 ? `(${pixDiscountPercent}% off)` : "à vista"}
                        </span>
                      )}
                      {acceptsCard && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                          <CreditCard className="size-3 text-blue-600" />
                          {maxInstallments === 1 ? "Cartão à vista" : `Cartão até ${maxInstallments}x`}
                        </span>
                      )}
                      {acceptsBoleto && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted/60 text-foreground">
                          <Receipt className="size-3 text-muted-foreground" />
                          Boleto à vista
                        </span>
                      )}
                      {acceptsBoletoInstallments && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-200">
                          <FileSpreadsheet className="size-3 text-amber-600" />
                          Boleto até {maxBoletoInstallments}x
                        </span>
                      )}
                      {acceptsCarne && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-primary/10 text-primary">
                          <BookOpenCheck className="size-3 text-primary" />
                          Carnê até {maxCarneInstallments}x
                        </span>
                      )}
                      {acceptsTrade && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                          <RefreshCw className="size-3 text-indigo-600" />
                          Permuta
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Termo de Confidencialidade (NDA) Box no Sticky Card */}
              {isBusiness && requiresNda && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Lock className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Confidencialidade Exigida</span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                    {isNdaAccepted
                      ? "Termo de confidencialidade assinado com sucesso. Dados liberados."
                      : "Esse anunciante exige aceite do termo de confidencialidade para liberar detalhes contábeis."}
                  </p>
                  {!isNdaAccepted && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsNdaDialogOpen(true)}
                      className="w-full h-8 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white cursor-pointer gap-1.5"
                    >
                      <Unlock className="size-3.5" />
                      <span>Assinar Termo (NDA)</span>
                    </Button>
                  )}
                </div>
              )}

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

                {/* Botões Secundários — CTAs derivados por nicho via semantics.ts */}
                <div className="grid grid-cols-2 gap-2">
                  {/* CTA Secundário Canônico por Nicho */}
                  {niche.secondaryActionLabel && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        // Hospedagem/Serviço: abre proposta/agendamento. Imóvel/Veículo: proposta formal.
                        if (niche.id === "hospitality_stay" || niche.id === "travel") {
                          onOpenBookingModal?.();
                        } else if (niche.id === "service") {
                          handleWhatsApp();
                        } else {
                          onOpenProposalModal?.();
                        }
                      }}
                      className="h-10 rounded-xl text-xs font-semibold border-border/60 hover:bg-muted/50 text-foreground"
                    >
                      <Handshake className="size-3.5 mr-1.5" />
                      <span className="truncate">{niche.secondaryActionLabel}</span>
                    </Button>
                  )}

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

                {/* Proteção Waesy (Escrow) — apenas para nichos com allowEscrowGuarantee */}
                {niche.allowEscrowGuarantee && !isDonation && priceCents > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
                    <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300 block">
                        Proteção Waesy disponível
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Pagamento em custódia até confirmar recebimento
                      </span>
                    </div>
                  </div>
                )}

                {/* Botão de Edição Rápida para o Dono do Anúncio */}
                {isOwner && onEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onEdit}
                    className="w-full h-11 rounded-xl text-xs font-bold border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Edit3 className="size-4 text-amber-600" />
                    <span>Editar Anúncio no CMS</span>
                  </Button>
                )}
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
          {isDonation ? (
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                Gratuito (R$ 0)
              </span>
              <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                Doação
              </Badge>
            </div>
          ) : isInvestmentOpportunity ? (
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Aporte Solicitado</span>
              <span className="text-base sm:text-lg font-bold text-foreground font-mono truncate">
                {targetInvestment > 0 ? formatMoney(targetInvestment) : "A combinar"}
              </span>
              {offeredEquity && (
                <span className="text-[10px] text-muted-foreground font-mono truncate">
                  Cotas: {offeredEquity}
                </span>
              )}
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isOwner && onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="h-11 px-3 rounded-xl border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="size-3.5 text-amber-600" />
              <span>Editar</span>
            </Button>
          )}

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
      {/* ── Dialog Termo de Confidencialidade (NDA Digital) ── */}
      <Dialog open={isNdaDialogOpen} onOpenChange={setIsNdaDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
              <Shield className="size-5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Termo de Confidencialidade (NDA Digital)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              O anunciante exige compromisso de sigilo para a revelação de faturamento, lucro líquido e contratos do ponto comercial.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border/50 bg-muted/30 p-3.5 space-y-2 text-xs text-muted-foreground max-h-36 overflow-y-auto">
            <p className="font-semibold text-foreground">
              Compromisso de Sigilo e Não Divulgação:
            </p>
            <p>
              1. O interessado compromete-se a não divulgar nem repassar a terceiros dados contábeis, financeiros ou cadastrais desta oportunidade.
            </p>
            <p>
              2. O aceite é registrado de forma perene no banco de dados com carimbo de tempo, IP e identificação legal.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Nome Completo do Investidor / Representante *</Label>
              <Input
                value={ndaSignerName}
                onChange={(e) => setNdaSignerName(e.target.value)}
                placeholder="Ex: Carlos Eduardo de Almeida"
                className="h-9 rounded-xl text-xs bg-background"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">E-mail Corporativo *</Label>
                <Input
                  type="email"
                  value={ndaSignerEmail}
                  onChange={(e) => setNdaSignerEmail(e.target.value)}
                  placeholder="carlos@empresa.com"
                  className="h-9 rounded-xl text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">CPF ou CNPJ *</Label>
                <Input
                  value={ndaSignerDocument}
                  onChange={(e) => setNdaSignerDocument(e.target.value)}
                  placeholder="000.000.000-00"
                  className="h-9 rounded-xl text-xs bg-background font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNdaDialogOpen(false)}
              className="rounded-xl text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmittingNda}
              onClick={handleSignNda}
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground cursor-pointer"
            >
              {isSubmittingNda ? "Registrando Assinatura..." : "Assinar & Revelar Números"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Modal de Todas as Comodidades (Divulgação Progressiva - Heurística 2) */}
      <Dialog open={isAllAmenitiesOpen} onOpenChange={setIsAllAmenitiesOpen}>
        <DialogContent className="sm:max-w-lg sm:rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">O que este local / anúncio oferece</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Lista completa de {amenitiesList.length} comodidades e diferenciais informados pelo anunciante.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-3">
            {amenitiesList.map((amenity, idx) => (
              <div key={idx} className="flex items-center gap-2.5 py-1 text-xs text-foreground/90">
                <div className="size-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="size-3" />
                </div>
                <span className="font-medium">{amenity}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Drawer Lateral de Due Diligence & Auditoria CNPJ SimLabs (Exibido SOMENTE se ativo no Admin) */}
      <Sheet open={isSimLabsEnabled && isSimLabsDrawerOpen} onOpenChange={setIsSimLabsDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto p-5 sm:p-6 space-y-6">
          <SheetHeader className="border-b border-border/40 pb-4">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="size-5" />
              <Badge variant="outline" className="text-[10px] font-semibold bg-primary/10 text-primary border-none">
                SimLabs Market Intelligence
              </Badge>
            </div>
            <SheetTitle className="text-xl font-bold text-foreground">
              Dossiê de Due Diligence & Viabilidade
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Auditoria cadastral do CNPJ, telemetria de fluxo do ponto comercial e múltiplos de retorno financeiro.
            </SheetDescription>
          </SheetHeader>

          {/* 1. Score Geral & Indicadores de Retorno (Zero mocks) */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="size-5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Score de Atratividade do Ponto
                </span>
              </div>
              <span className="text-lg font-extrabold font-mono text-primary">
                {attractivenessScore !== null ? `${attractivenessScore}/100` : "Sob análise"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-card border border-border/40">
                <span className="text-muted-foreground block text-[11px] mb-1">Payback Estimado</span>
                <strong className="text-foreground text-sm font-mono font-bold">
                  {paybackMonths !== null ? `${paybackMonths} meses` : "A calcular"}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/40">
                <span className="text-muted-foreground block text-[11px] mb-1">Custo de Ocupação</span>
                <div className="flex items-center gap-1.5">
                  <strong className="text-foreground text-sm font-mono font-bold">
                    {occupancyPercent !== null ? `${occupancyPercent}%` : "Incluso / Não inf."}
                  </strong>
                  {occupancyPercent !== null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${occupancyPercent <= 8 ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
                      {occupancyPercent <= 8 ? "Saudável" : "Atenção"}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/40">
                <span className="text-muted-foreground block text-[11px] mb-1">ROI Anual Projetado</span>
                <strong className="text-emerald-600 text-sm font-mono font-bold">
                  {annualRoiStatic ? `${annualRoiStatic}% a.a.` : "Sob consulta"}
                </strong>
              </div>
            </div>

            <Button
              size="sm"
              type="button"
              onClick={handleRunSimLabsAnalysis}
              disabled={isAnalyzingSimLabs}
              className="w-full h-8 rounded-xl text-xs font-semibold bg-primary text-primary-foreground cursor-pointer"
            >
              <Sparkles className="size-3.5 mr-1.5" />
              {isAnalyzingSimLabs ? "Recalculando com IA..." : "Recalcular Viabilidade com Dados Reais do Anúncio"}
            </Button>
          </div>

          {/* 1.1 Diagnóstico Estratégico Real (quando gerado via BFF) */}
          {simLabsAnalysis && (
            <div className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Classificação SimLabs: <strong className="text-primary">{simLabsAnalysis.recommendation}</strong>
                </span>
              </div>
              {simLabsAnalysis.strategicStrengths?.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {simLabsAnalysis.strategicStrengths.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-foreground bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}
              {simLabsAnalysis.riskAlerts?.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {simLabsAnalysis.riskAlerts.map((alert, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg">
                      <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 1.2 Telemetria do Ponto Comercial Físico (se indexado no Supabase) */}
          {pointTelemetry?.found && pointTelemetry.point && (
            <div className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Telemetria do Ponto Físico
                  </h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary">
                  Score {pointTelemetry.point.marketAttractivenessScore}/100
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-muted-foreground">
                <div>
                  <span className="block text-[11px]">Ocupação Atual:</span>
                  <strong className="text-foreground capitalize font-medium">{pointTelemetry.point.occupancyStatus}</strong>
                </div>
                <div>
                  <span className="block text-[11px]">Rotatividade:</span>
                  <strong className="text-foreground font-medium">{pointTelemetry.point.turnoverCount} negócios</strong>
                </div>
                <div>
                  <span className="block text-[11px]">Permanência Média:</span>
                  <strong className="text-foreground font-medium">{pointTelemetry.point.avgPermanenceMonths} meses</strong>
                </div>
              </div>
              {pointTelemetry.turnoverHistory.length > 0 && (
                <div className="pt-2 border-t border-border/30 space-y-1.5">
                  <span className="text-[11px] font-semibold text-foreground block">Histórico de Ocupantes Anteriores:</span>
                  {pointTelemetry.turnoverHistory.slice(0, 3).map((hist) => (
                    <div key={hist.id} className="text-[11px] flex items-center justify-between text-muted-foreground">
                      <span className="text-foreground">{hist.formerCompanyName} ({hist.segment})</span>
                      <span>{hist.durationMonths} meses</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. Auditoria Cadastral do CNPJ (RFB / SimLabs) */}
          <div className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="size-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Auditoria Cadastral de CNPJ & Sucessão
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px] font-medium border-none bg-muted/40 text-muted-foreground">
                Base Federal
              </Badge>
            </div>

            <div className="flex gap-2">
              <Input
                value={cnpjQueryInput}
                onChange={(e) => setCnpjQueryInput(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="h-9 text-xs rounded-xl font-mono bg-background"
              />
              <Button
                size="sm"
                type="button"
                onClick={handleAuditCnpj}
                disabled={isAuditingCnpj}
                className="h-9 px-3.5 rounded-xl text-xs font-semibold bg-foreground text-background shrink-0 cursor-pointer"
              >
                {isAuditingCnpj ? "Consultando..." : "Consultar CNPJ"}
              </Button>
            </div>

            {cnpjAuditData && (
              <div className="p-3.5 rounded-xl bg-muted/15 border border-border/40 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <strong className="text-foreground font-semibold">{cnpjAuditData.companyName}</strong>
                  <Badge variant="outline" className={`text-[10px] font-bold border-none ${cnpjAuditData.riskClassification?.toLowerCase() === 'baixo' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>
                    Risco {cnpjAuditData.riskClassification?.toUpperCase()}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1">
                  <div>CNAE: <span className="text-foreground font-mono">{cnpjAuditData.cnaePrincipal}</span></div>
                  <div>Regime: <span className="text-foreground capitalize">{cnpjAuditData.taxRegime}</span></div>
                  <div>Capital Social: <span className="text-foreground font-mono">{formatMoney(cnpjAuditData.capitalSocialCents)}</span></div>
                  <div>Risco Sucessório: <span className="text-foreground font-bold">{cnpjAuditData.legalRiskScore}/100</span></div>
                </div>
                {cnpjAuditData.aiEvaluationSummary && (
                  <p className="text-[11px] text-muted-foreground pt-1.5 border-t border-border/30">
                    {cnpjAuditData.aiEvaluationSummary}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 3. Instalações e Ponto Comercial */}
          {(attrs.area_sqm || attrs.monthly_rent_cents || attrs.commercial_point_type) && (
            <div className="rounded-2xl border border-border/40 bg-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Building className="size-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Instalações & Ponto Físico
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {attrs.commercial_point_type && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Tipo de Ponto</span>
                    <strong className="text-foreground font-medium capitalize">{attrs.commercial_point_type}</strong>
                  </div>
                )}
                {attrs.area_sqm && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Área Total</span>
                    <strong className="text-foreground font-mono">{attrs.area_sqm} m²</strong>
                  </div>
                )}
                {attrs.monthly_rent_cents !== undefined && (
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Aluguel</span>
                    <strong className="text-foreground font-mono">
                      {attrs.monthly_rent_cents === 0 ? "Próprio / Incluso" : `${formatMoney(attrs.monthly_rent_cents)}/mês`}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. Acesso ao Investidor Qualificado (NDA) */}
          <div className="rounded-2xl border border-border/40 bg-muted/10 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Área do Investidor Qualificado
                </h3>
              </div>
              {requiresNda && (
                <Badge variant="outline" className={cn("text-[10px] font-medium border-none", isFinancialMasked ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300")}>
                  {isFinancialMasked ? "Requer NDA" : "NDA Assinado"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Investidores e compradores qualificados podem ter acesso direto a balanços auditados, demonstrativos de resultados (DRE) e reunião de alinhamento com a assessoria da empresa.
            </p>
            {isFinancialMasked ? (
              <Button
                type="button"
                onClick={() => {
                  setIsSimLabsDrawerOpen(false);
                  setIsNdaDialogOpen(true);
                }}
                className="w-full h-10 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer gap-1.5"
              >
                <Unlock className="size-4" />
                <span>Assinar Termo de Sigilo (NDA) para Liberar Dados</span>
              </Button>
            ) : (
              (classified?.contact_whatsapp || classified?.whatsapp) && (
                <Button
                  type="button"
                  onClick={() => {
                    setIsSimLabsDrawerOpen(false);
                    handleWhatsApp();
                  }}
                  className="w-full h-10 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  <MessageCircle className="size-4 mr-2" />
                  <span>Apresentar Proposta de Aquisição / Parceria</span>
                </Button>
              )
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}