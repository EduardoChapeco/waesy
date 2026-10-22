/**
 * travel-promo-flyer-modal.tsx — Estúdio Imersivo Excelência Tour (Offer Intake, Story 9:16, Liquid Glass & WhatsApp Publisher)
 * Arquitetura Split-Screen Fullscreen | Resolução Definitiva de CORS | Auto-Binding de Anúncio
 * Em conformidade estrita com Master Prompt V32, Blueprint Excelência Tour e AGENTS.md
 */

import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Download,
  ImagePlus,
  Star,
  Palette,
  Check,
  Loader2,
  ArrowLeft,
  Sliders,
  Type,
  ImageIcon,
  ShieldCheck,
  Maximize2,
  Dices,
  Sparkles,
  Film,
  Copy,
  MessageCircle,
  Wand2,
  Building2,
  AlertTriangle,
} from "lucide-react";
import {
  TravelPromoArtboard,
  type TravelPromoData,
  type PromoAspectRatio,
} from "./travel-promo-artboard";
import { uploadClassifiedMedia } from "@/lib/classifieds/upload-classified-media";
import { convertToCorsSafeDataUri, preloadImage } from "@/lib/canvas/cors-safe-image";
import { formatMoney } from "@/lib/money";
import {
  getAllSocialTemplates,
  getDefaultTemplateForNiche,
  getNextTemplateInNiche,
  getDynamicCTAsForNiche,
  getNextCTAOption,
} from "@/components/social-templates";
import {
  type GlassMaterial,
  type GlassPresetId,
  getGlassPreset,
  normalizeGlassMaterial,
} from "@/lib/travel/liquid-glass-engine";
import {
  type PriceBasis,
  CANONICAL_PAYMENT_CAMPAIGNS,
  formatOccupancyAndBasisSummary,
  generateWhatsAppOfferCopy,
  parseRawQuoteToTravelOffer,
  resolveHotelCatalogMatch,
  selectStoryInclusions,
} from "@/lib/travel/excelencia-offer-engine";

export interface TravelPromoFlyerModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
  onClose?: () => void;
  initialData?: {
    title?: string;
    destination?: string;
    datesText?: string | null;
    inclusions?: string[];
    priceCents?: number | null;
    maxInstallments?: number;
    installmentCents?: number | null;
    pricingMode?: "per_person" | "total_package";
    backgroundImageUrl?: string | null;
    promoBadge?: string;
    storeName?: string;
    templateId?: string;
    niche?: string;
    hotelName?: string | null;
    mealPlan?: string | null;
    originCity?: string | null;
    adults?: number;
    children?: number;
    publicOfferUrl?: string;
  };
  niche?: string;
  destinationTitle?: string;
  destinationCity?: string;
  datesText?: string | null;
  inclusions?: string[];
  priceCents?: number | null;
  installments?: number;
  backgroundImageUrl?: string | null;
  storeName?: string;
  publicOfferUrl?: string;
  onAttachToClassified?: (imageUrl: string) => void;
  onApplyImageToClassified?: (imageUrl: string) => void;
  onApplyExtractedOffer?: (offerData: {
    title: string;
    destinationCity: string;
    datesText: string;
    hotelName?: string;
    mealPlan?: string;
    inclusions: string[];
    priceCents: number | null;
    installments: number;
    adults: number;
    children: number;
  }) => void;
}

export function TravelPromoFlyerModal({
  open,
  onOpenChange,
  isOpen,
  onClose,
  initialData,
  niche: propNiche,
  destinationTitle,
  destinationCity,
  datesText: propDatesText,
  inclusions: propInclusions,
  priceCents: propPriceCents,
  installments: propInstallments,
  backgroundImageUrl: propBackgroundImageUrl,
  storeName: propStoreName,
  publicOfferUrl: propPublicOfferUrl,
  onAttachToClassified,
  onApplyImageToClassified,
  onApplyExtractedOffer,
}: TravelPromoFlyerModalProps) {
  const effectiveNiche = propNiche || initialData?.niche || "turismo";
  const isModalOpen = open !== undefined ? open : (isOpen ?? false);
  const handleModalClose = (val: boolean) => {
    if (onOpenChange) onOpenChange(val);
    if (!val && onClose) onClose();
  };
  const attachCallback = onAttachToClassified || onApplyImageToClassified;

  // Auto-binding prioritário dos dados do anúncio aberto
  const resolvedInitialTitle =
    destinationTitle || initialData?.title || "PUNTA CANA";
  const resolvedInitialCity =
    destinationCity || initialData?.destination || resolvedInitialTitle;
  const resolvedInitialDates =
    propDatesText !== undefined ? propDatesText : (initialData?.datesText || "19 a 24 de agosto");
  const resolvedInitialInclusions =
    propInclusions || initialData?.inclusions || [];
  const resolvedInitialPrice =
    propPriceCents !== undefined && propPriceCents !== null
      ? propPriceCents
      : (initialData?.priceCents ?? null);
  const resolvedInitialInstallments =
    propInstallments || initialData?.maxInstallments || 15;
  const resolvedInitialBg =
    propBackgroundImageUrl || initialData?.backgroundImageUrl || "/brand-logo.png";
  const resolvedStoreName =
    propStoreName || initialData?.storeName || "Excelência Tour";

  // Estados de edição do Flyer / StoryDocument
  const [templateId, setTemplateId] = useState<string>(
    () => initialData?.templateId || "travel_editorial"
  );
  const [aspectRatio, setAspectRatio] = useState<PromoAspectRatio>("9:16");

  const availableCTAs = useMemo(() => {
    return getDynamicCTAsForNiche(
      effectiveNiche || (templateId.startsWith("imoveis") ? "imoveis" : "turismo")
    );
  }, [effectiveNiche, templateId]);

  const [ctaLabel, setCtaLabel] = useState<string>(() => availableCTAs[0] || "Garantir Vaga");

  const [themeGradient, setThemeGradient] = useState<
    | "ocean_blue"
    | "sunset_amber"
    | "emerald_nature"
    | "midnight_luxury"
    | "caribbean_turquoise"
    | "nordic_snow"
  >("ocean_blue");
  const [promoBadge, setPromoBadge] = useState<string>(
    initialData?.promoBadge ?? ""
  );
  const [title, setTitle] = useState(resolvedInitialTitle);
  const [destination, setDestination] = useState(resolvedInitialCity);
  const [datesText, setDatesText] = useState(resolvedInitialDates || "");
  const [inclusionsText, setInclusionsText] = useState(
    resolvedInitialInclusions.join(", ")
  );
  const [priceCents, setPriceCents] = useState<number | null>(resolvedInitialPrice);
  const [maxInstallments, setMaxInstallments] = useState<number>(
    resolvedInitialInstallments
  );
  const [installmentOverrideCents, setInstallmentOverrideCents] = useState<number | null>(
    initialData?.installmentCents ?? null
  );
  const [pricingMode, setPricingMode] = useState<"per_person" | "total_package">(
    initialData?.pricingMode || "per_person"
  );
  const [priceBasis, setPriceBasis] = useState<PriceBasis>(
    initialData?.pricingMode === "total_package" ? "total_package" : "per_person"
  );
  const [adultsCount, setAdultsCount] = useState<number>(initialData?.adults || 2);
  const [childrenCount, setChildrenCount] = useState<number>(initialData?.children || 0);
  const [childAgesText, setChildAgesText] = useState<string>("");
  const [hotelNameInput, setHotelNameInput] = useState<string>(
    initialData?.hotelName || ""
  );
  const [mealPlanInput, setMealPlanInput] = useState<string>(
    initialData?.mealPlan || ""
  );
  const [originCityInput, setOriginCityInput] = useState<string>(
    initialData?.originCity || "Chapecó"
  );
  const [paymentMethodsLabel, setPaymentMethodsLabel] = useState<string>(
    "no boleto e cartão"
  );
  const [storeNameValue, setStoreNameValue] = useState(resolvedStoreName);
  const [bgImageUrl, setBgImageUrl] = useState<string>(resolvedInitialBg);

  // Estados de Liquid Glass & Node Overrides
  const [glassMaterial, setGlassMaterial] = useState<GlassMaterial>(() =>
    getGlassPreset("saved_offer_glass")
  );
  const [titleFontSizeOverride, setTitleFontSizeOverride] = useState<number | undefined>(
    undefined
  );
  const [titleOffsetY, setTitleOffsetY] = useState<number>(0);
  const [priceCardOffsetY, setPriceCardOffsetY] = useState<number>(0);
  const [priceCardScale, setPriceCardScale] = useState<number>(1);
  const [photoObjectPositionY, setPhotoObjectPositionY] = useState<number>(55);

  // Estados do Intake / AI Command Bar / WhatsApp Publisher
  const [rawQuoteInput, setRawQuoteInput] = useState<string>("");
  const [aiEditCommand, setAiEditCommand] = useState<string>("");
  const [includeFlightTimesWa, setIncludeFlightTimesWa] = useState<boolean>(false);
  const [isSameDayClosingWa, setIsSameDayClosingWa] = useState<boolean>(true);
  const [offerExpiresAtIso, setOfferExpiresAtIso] = useState<string>(() =>
    new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
  );

  // Estados de segurança CORS e conversão para Data URI
  const [safeBgDataUri, setSafeBgDataUri] = useState<string>(resolvedInitialBg);
  const [isConvertingImage, setIsConvertingImage] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isSavingToAd, setIsSavingToAd] = useState<boolean>(false);

  const previewWrapperRef = useRef<HTMLDivElement>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 600,
    height: 700,
  });
  const [activeTab, setActiveTab] = useState<string>("template");
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState<boolean>(false);
  const [isAnimatedPreview, setIsAnimatedPreview] = useState<boolean>(false);

  // Sincronização quando propriedades externas mudam
  useEffect(() => {
    if (destinationTitle) setTitle(destinationTitle);
  }, [destinationTitle]);

  useEffect(() => {
    if (destinationCity) setDestination(destinationCity);
  }, [destinationCity]);

  useEffect(() => {
    if (propDatesText !== undefined) setDatesText(propDatesText || "");
  }, [propDatesText]);

  useEffect(() => {
    if (propInclusions) setInclusionsText(propInclusions.join(", "));
  }, [propInclusions]);

  useEffect(() => {
    if (propPriceCents !== undefined && propPriceCents !== null) setPriceCents(propPriceCents);
  }, [propPriceCents]);

  useEffect(() => {
    if (propInstallments) setMaxInstallments(propInstallments);
  }, [propInstallments]);

  useEffect(() => {
    if (propBackgroundImageUrl) setBgImageUrl(propBackgroundImageUrl);
  }, [propBackgroundImageUrl]);

  useEffect(() => {
    if (propStoreName) setStoreNameValue(propStoreName);
  }, [propStoreName]);

  // Conversão Proativa para Data URI (Blindagem contra CORS)
  useEffect(() => {
    let isMounted = true;
    async function prepareSafeImage() {
      if (!bgImageUrl) return;
      setIsConvertingImage(true);
      try {
        const safeUri = await convertToCorsSafeDataUri(bgImageUrl);
        if (isMounted) {
          setSafeBgDataUri(safeUri);
          await preloadImage(safeUri);
        }
      } catch (err) {
        console.warn("[SocialEngine] Aviso na conversão CORS da imagem:", err);
      } finally {
        if (isMounted) setIsConvertingImage(false);
      }
    }

    prepareSafeImage();
    return () => {
      isMounted = false;
    };
  }, [bgImageUrl]);

  // Medição da área de preview para cálculo do scale responsivo (Auto-Fit)
  useEffect(() => {
    if (!previewWrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });

    observer.observe(previewWrapperRef.current);
    return () => observer.disconnect();
  }, []);

  const artDimensions = useMemo(() => {
    switch (aspectRatio) {
      case "4:5":
        return { width: 1080, height: 1350 };
      case "1:1":
        return { width: 1080, height: 1080 };
      case "9:16":
      default:
        return { width: 1080, height: 1920 };
    }
  }, [aspectRatio]);

  const previewScale = useMemo(() => {
    const paddingX = 48;
    const paddingY = 48;
    const maxAvailableW = Math.max(containerSize.width - paddingX, 240);
    const maxAvailableH = Math.max(containerSize.height - paddingY, 240);

    const scaleW = maxAvailableW / artDimensions.width;
    const scaleH = maxAvailableH / artDimensions.height;

    return Math.min(scaleW, scaleH, 0.48);
  }, [containerSize, artDimensions]);

  // Resolução do Hotel no Catálogo Central
  const hotelCatalogMatch = useMemo(() => {
    return resolveHotelCatalogMatch(hotelNameInput, destination || title);
  }, [hotelNameInput, destination, title]);

  const parsedChildAges = useMemo(() => {
    return childAgesText
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 17);
  }, [childAgesText]);

  const occupancySummary = useMemo(() => {
    return formatOccupancyAndBasisSummary(
      {
        adults: adultsCount,
        children: childrenCount,
        infants: 0,
        childAges: parsedChildAges,
        labelMode:
          adultsCount === 1 && childrenCount === 0
            ? "single"
            : adultsCount === 2 && childrenCount === 0
            ? "couple"
            : childrenCount > 0
            ? "family"
            : "group",
      },
      [
        {
          roomIndex: 1,
          roomTypeLabel:
            adultsCount === 1
              ? "Apartamento Single"
              : adultsCount === 2
              ? "Apartamento Duplo"
              : "Apartamento Familiar",
          adults: adultsCount,
          children: childrenCount,
          childAges: parsedChildAges,
        },
      ],
      priceBasis
    );
  }, [adultsCount, childrenCount, parsedChildAges, priceBasis]);

  // Seleção Inteligente de 2 a 4 Inclusões com Telemetria de Decisão
  const storyInclusionSelection = useMemo(() => {
    const manualList = inclusionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    return selectStoryInclusions({
      hasAirfare:
        manualList.some(
          (i) =>
            i.toLowerCase().includes("aéreo") ||
            i.toLowerCase().includes("aereo") ||
            i.toLowerCase().includes("voo")
        ) || Boolean(originCityInput),
      originCity: originCityInput,
      hasHotel: Boolean(hotelNameInput || mealPlanInput),
      hotelName: hotelCatalogMatch.entity?.canonicalName || hotelNameInput,
      mealPlan: mealPlanInput || null,
      hasTransfer: manualList.some(
        (i) =>
          i.toLowerCase().includes("traslado") ||
          i.toLowerCase().includes("transfer")
      ),
      extraInclusions: manualList,
    });
  }, [
    inclusionsText,
    originCityInput,
    hotelNameInput,
    mealPlanInput,
    hotelCatalogMatch.entity,
  ]);

  const parsedInclusions = useMemo(() => {
    const manual = inclusionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (manual.length > 0) return manual.slice(0, 4);
    return storyInclusionSelection.selectedInclusions.map((i) => i.label);
  }, [inclusionsText, storyInclusionSelection.selectedInclusions]);

  const effectiveInstallmentCents = useMemo(() => {
    if (installmentOverrideCents && installmentOverrideCents > 0) {
      return installmentOverrideCents;
    }
    if (priceCents !== null && maxInstallments > 0) {
      return Math.round(priceCents / maxInstallments);
    }
    return null;
  }, [installmentOverrideCents, priceCents, maxInstallments]);

  const publicOfferUrl = useMemo(() => {
    if (propPublicOfferUrl) return propPublicOfferUrl;
    if (initialData?.publicOfferUrl) return initialData.publicOfferUrl;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://waesy.app";
    const slug = (title || "oferta")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-");
    return `${origin}/turismo?oferta=${slug}`;
  }, [propPublicOfferUrl, initialData?.publicOfferUrl, title]);

  // Gerador de Copy WhatsApp Sincronizado (Omitindo horários de voo por padrão + Regra estrita "HOJE")
  const whatsappOfferText = useMemo(() => {
    return generateWhatsAppOfferCopy({
      destinationTitle: title,
      datesDisplayText: datesText,
      originCity: originCityInput || null,
      hasAirfare: parsedInclusions.some(
        (i) =>
          i.toLowerCase().includes("aéreo") ||
          i.toLowerCase().includes("aereo") ||
          i.toLowerCase().includes("voo")
      ),
      includeFlightTimes: includeFlightTimesWa,
      hotelName: hotelCatalogMatch.entity?.canonicalName || hotelNameInput || null,
      mealPlanLabel: mealPlanInput || null,
      hasTransfer: parsedInclusions.some(
        (i) =>
          i.toLowerCase().includes("traslado") ||
          i.toLowerCase().includes("transfer")
      ),
      installmentCount: maxInstallments,
      installmentCents: effectiveInstallmentCents || 0,
      totalPriceCents: priceCents,
      priceBasisLabel: occupancySummary.priceBasisLabel,
      occupancySummaryLabel: occupancySummary.occupancySummaryLabel,
      paymentMethodsLabel: paymentMethodsLabel.replace(
        "no boleto e cartão",
        "no boleto ou cartão"
      ),
      expiresAt: offerExpiresAtIso,
      isSameDayClosingOnly: isSameDayClosingWa,
      publicOfferUrl,
    });
  }, [
    title,
    datesText,
    originCityInput,
    parsedInclusions,
    includeFlightTimesWa,
    hotelCatalogMatch.entity,
    hotelNameInput,
    mealPlanInput,
    maxInstallments,
    effectiveInstallmentCents,
    priceCents,
    occupancySummary,
    paymentMethodsLabel,
    offerExpiresAtIso,
    isSameDayClosingWa,
    publicOfferUrl,
  ]);

  const promoData: TravelPromoData = {
    title,
    destination,
    datesText,
    inclusions: parsedInclusions,
    priceCents,
    maxInstallments,
    installmentCents: effectiveInstallmentCents,
    pricingMode,
    priceBasisLabel: occupancySummary.priceBasisLabel,
    occupancySummaryLabel: occupancySummary.occupancySummaryLabel,
    paymentMethodsLabel,
    backgroundImageUrl: safeBgDataUri || bgImageUrl,
    aspectRatio,
    themeGradient,
    promoBadge: promoBadge || undefined,
    storeName: storeNameValue,
    templateId,
    ctaLabel,
    glassMaterial,
    titleFontSizeOverride,
    titleOffsetY,
    priceCardOffsetY,
    priceCardScale,
    photoObjectPositionY,
  };

  const handleShuffleLayout = () => {
    const next = getNextTemplateInNiche(templateId, effectiveNiche);
    setTemplateId(next.id);
    toast.info(`Layout alternado para: ${next.name}`);
  };

  const handleCycleCTA = () => {
    const next = getNextCTAOption(
      ctaLabel,
      effectiveNiche || (templateId.startsWith("imoveis") ? "imoveis" : "turismo")
    );
    setCtaLabel(next);
    toast.success(`CTA alterado para: "${next}"`);
  };

  // Compilador de Cotação Colada -> TravelOffer Canônico
  const handleExtractFromRawQuote = () => {
    if (!rawQuoteInput.trim()) {
      toast.error("Cole o texto da cotação ou descreva o pacote para extrair.");
      return;
    }

    const offer = parseRawQuoteToTravelOffer({
      rawText: rawQuoteInput,
      destinationTitle: title,
      destinationCity: destination,
      originCity: originCityInput,
      datesDisplayText: datesText,
      hotelName: hotelNameInput || undefined,
      mealPlan: mealPlanInput || undefined,
      backgroundImageUrl: bgImageUrl,
      publicOfferUrl,
    });

    setTitle(offer.destination.title);
    setDestination(offer.destination.city);
    if (offer.dates.displayRangeText) setDatesText(offer.dates.displayRangeText);
    if (offer.hotels[0]?.hotelName) setHotelNameInput(offer.hotels[0].hotelName);
    if (offer.hotels[0]?.mealPlanLabel) setMealPlanInput(offer.hotels[0].mealPlanLabel);
    setAdultsCount(offer.party.adults);
    setChildrenCount(offer.party.children);
    if (offer.party.childAges.length > 0) {
      setChildAgesText(offer.party.childAges.join(", "));
    }
    setPriceBasis(offer.pricing.priceBasis);
    setPricingMode(
      offer.pricing.priceBasis === "total_package" ? "total_package" : "per_person"
    );
    setMaxInstallments(offer.paymentTermsSnapshot.installmentCount);
    setInstallmentOverrideCents(offer.paymentTermsSnapshot.installmentAmountCents);
    setPriceCents(offer.paymentTermsSnapshot.totalAmountCents);
    setInclusionsText(offer.inclusions.join(", "));

    if (onApplyExtractedOffer) {
      onApplyExtractedOffer({
        title: offer.destination.title,
        destinationCity: offer.destination.city,
        datesText: offer.dates.displayRangeText,
        hotelName: offer.hotels[0]?.hotelName,
        mealPlan: offer.hotels[0]?.mealPlanLabel || undefined,
        inclusions: offer.inclusions,
        priceCents: offer.paymentTermsSnapshot.totalAmountCents,
        installments: offer.paymentTermsSnapshot.installmentCount,
        adults: offer.party.adults,
        children: offer.party.children,
      });
    }

    toast.success("Cotação reconciliada no motor Excelência Tour!");
  };

  // Aplicação de Comando de Edição em Linguagem Natural no Story
  const handleRunStoryAiCommand = () => {
    const cmd = aiEditCommand.trim().toLowerCase();
    if (!cmd) return;

    if (cmd.includes("título") || cmd.includes("titulo")) {
      if (cmd.includes("aumentar") || cmd.includes("maior")) {
        setTitleFontSizeOverride((prev) => Math.min(156, (prev || 110) + 14));
        toast.success("Título aumentado no Story.");
      } else if (cmd.includes("diminuir") || cmd.includes("menor")) {
        setTitleFontSizeOverride((prev) => Math.max(54, (prev || 110) - 14));
        toast.success("Título reduzido no Story.");
      }
    }

    if (cmd.includes("caixa") || cmd.includes("valor") || cmd.includes("preço")) {
      if (cmd.includes("diminuir") || cmd.includes("menor")) {
        setPriceCardScale((prev) => Number(Math.max(0.75, prev - 0.1).toFixed(2)));
        toast.success("Caixa de valor reduzida.");
      } else if (cmd.includes("aumentar") || cmd.includes("maior")) {
        setPriceCardScale((prev) => Number(Math.min(1.2, prev + 0.1).toFixed(2)));
        toast.success("Caixa de valor ampliada.");
      }
      if (cmd.includes("subir")) {
        setPriceCardOffsetY((prev) => prev - 32);
        toast.success("Caixa de valor movida para cima.");
      } else if (cmd.includes("descer")) {
        setPriceCardOffsetY((prev) => prev + 32);
        toast.success("Caixa de valor movida para baixo.");
      }
    }

    if (cmd.includes("foto") || cmd.includes("fundo")) {
      if (cmd.includes("subir")) {
        setPhotoObjectPositionY((prev) => Math.max(0, prev - 15));
        toast.success("Enquadramento da foto ajustado para cima.");
      } else if (cmd.includes("descer")) {
        setPhotoObjectPositionY((prev) => Math.min(100, prev + 15));
        toast.success("Enquadramento da foto ajustado para baixo.");
      }
    }

    if (cmd.includes("vidro") || cmd.includes("fosco") || cmd.includes("glass")) {
      if (cmd.includes("heavy") || cmd.includes("muito fosco")) {
        setGlassMaterial(getGlassPreset("heavy_frost"));
        toast.success("Preset Heavy Frost aplicado.");
      } else if (cmd.includes("escuro") || cmd.includes("dark")) {
        setGlassMaterial(getGlassPreset("dark_glass"));
        toast.success("Preset Dark Glass aplicado.");
      } else if (cmd.includes("mais fosco")) {
        setGlassMaterial((prev) =>
          normalizeGlassMaterial({
            ...prev,
            optics: { ...prev.optics, frost: Math.min(100, prev.optics.frost + 25) },
          })
        );
        toast.success("Frost do vidro intensificado.");
      }
    }

    const instMatch = cmd.match(/(\d{1,2})\s*x/i);
    if (instMatch) {
      const targetCount = parseInt(instMatch[1], 10);
      if (targetCount >= 1 && targetCount <= 24) {
        const currentTotal =
          priceCents ||
          (effectiveInstallmentCents ? effectiveInstallmentCents * maxInstallments : 0);
        setMaxInstallments(targetCount);
        if (currentTotal > 0) {
          setPriceCents(currentTotal);
          setInstallmentOverrideCents(Math.round(currentTotal / targetCount));
        }
        toast.success(`Parcelamento recalculado para ${targetCount}x mantendo o total.`);
      }
    }

    if (cmd.includes("para 2 adultos")) {
      setPriceBasis("per_family");
      setAdultsCount(2);
      setChildrenCount(0);
      toast.success("Rótulo alterado para 'Para 2 adultos'.");
    } else if (cmd.includes("por casal")) {
      setPriceBasis("per_couple");
      toast.success("Rótulo alterado para 'Por casal'.");
    } else if (cmd.includes("por pessoa")) {
      setPriceBasis("per_person");
      toast.success("Rótulo alterado para 'Por pessoa'.");
    }

    setAiEditCommand("");
  };

  // Renderizador offscreen com html2canvas e garantia de CORS
  const generateBlobFromCanvas = useCallback(async (): Promise<Blob> => {
    let resolvedDataUri = safeBgDataUri;
    if (
      !resolvedDataUri ||
      (!resolvedDataUri.startsWith("data:") && !resolvedDataUri.startsWith("blob:"))
    ) {
      resolvedDataUri = await convertToCorsSafeDataUri(bgImageUrl);
      setSafeBgDataUri(resolvedDataUri);
    }
    await preloadImage(resolvedDataUri);

    await new Promise((resolve) => setTimeout(resolve, 60));

    const el = document.getElementById("travel-promo-canvas-artboard");
    if (!el) throw new Error("Elemento de arte promocional não encontrado no DOM.");

    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#0a192f",
      logging: false,
      imageTimeout: 15000,
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Falha ao converter canvas em arquivo PNG."));
      }, "image/png");
    });
  }, [safeBgDataUri, bgImageUrl]);

  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);

  const handleDownloadVideo = async () => {
    setIsExportingVideo(true);
    try {
      let resolvedDataUri = safeBgDataUri;
      if (
        !resolvedDataUri ||
        (!resolvedDataUri.startsWith("data:") && !resolvedDataUri.startsWith("blob:"))
      ) {
        resolvedDataUri = await convertToCorsSafeDataUri(bgImageUrl);
        setSafeBgDataUri(resolvedDataUri);
      }
      await preloadImage(resolvedDataUri);

      const el = document.getElementById("travel-promo-canvas-artboard");
      if (!el) throw new Error("Elemento de arte promocional não encontrado.");

      const html2canvas = (await import("html2canvas")).default;
      const baseCanvas = await html2canvas(el, {
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#0a192f",
        logging: false,
      });

      const videoWidth = baseCanvas.width;
      const videoHeight = baseCanvas.height;
      const animCanvas = document.createElement("canvas");
      animCanvas.width = videoWidth;
      animCanvas.height = videoHeight;
      const ctx = animCanvas.getContext("2d");
      if (!ctx) throw new Error("Falha ao inicializar contexto 2D de vídeo.");

      const stream = animCanvas.captureStream(30);
      const mimeType = MediaRecorder.isTypeSupported("video/mp4")
        ? "video/mp4"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 5000000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const videoPromise = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          const videoBlob = new Blob(chunks, { type: mimeType });
          resolve(videoBlob);
        };
        recorder.onerror = reject;
      });

      recorder.start();

      const totalFrames = 90;
      for (let frame = 0; frame < totalFrames; frame++) {
        const progress = frame / totalFrames;
        const zoom = 1 + progress * 0.05;
        const alpha = Math.min(progress * 4, 1);

        ctx.fillStyle = "#070b12";
        ctx.fillRect(0, 0, videoWidth, videoHeight);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(videoWidth / 2, videoHeight / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-videoWidth / 2, -videoHeight / 2);
        ctx.drawImage(baseCanvas, 0, 0);
        ctx.restore();

        const pulseAlpha = 0.3 + 0.2 * Math.sin(progress * Math.PI * 4);
        ctx.fillStyle = `rgba(255, 215, 0, ${pulseAlpha})`;
        ctx.fillRect(0, videoHeight - 8, videoWidth * progress, 8);

        await new Promise((r) => setTimeout(r, 33));
      }

      recorder.stop();
      const videoBlob = await videoPromise;

      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement("a");
      a.href = url;
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      a.download = `storie-video-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Mini-vídeo animado gerado e exportado com sucesso!");
    } catch (err: any) {
      console.error("[SocialEngine] Erro ao gerar vídeo:", err);
      toast.error("Erro na renderização do vídeo: " + (err?.message || "Tente novamente"));
    } finally {
      setIsExportingVideo(false);
    }
  };

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const blob = await generateBlobFromCanvas();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flyer-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${aspectRatio.replace(":", "x")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Story promocional exportado em Ultra HD com sucesso!");
    } catch (err: any) {
      console.error("[SocialEngine] Erro ao baixar flyer:", err);
      toast.error("Erro ao gerar imagem: " + (err?.message || "Tente novamente"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToClassified = async () => {
    if (!attachCallback) {
      handleDownload();
      return;
    }

    setIsSavingToAd(true);
    try {
      const blob = await generateBlobFromCanvas();
      const file = new File([blob], `flyer-${Date.now()}.png`, { type: "image/png" });
      const uploadedUrl = await uploadClassifiedMedia(file, "classifieds");
      attachCallback(uploadedUrl);
      toast.success("Story promocional anexado à galeria do anúncio!");
      handleModalClose(false);
    } catch (err: any) {
      console.error("[SocialEngine] Erro ao salvar flyer no anúncio:", err);
      toast.error("Erro ao anexar imagem ao anúncio.");
    } finally {
      setIsSavingToAd(false);
    }
  };

  const handleCustomImageUploaded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setBgImageUrl(event.target.result);
        setSafeBgDataUri(event.target.result);
        toast.success("Imagem de fundo carregada com sucesso!");
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isModalOpen) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={handleModalClose}>
      <DialogContent
        size="screen"
        className="p-0 border-0 rounded-none bg-background flex flex-col overflow-hidden outline-none [&>button]:hidden z-50"
      >
        {/* ── 1. Top Bar Estúdio (Piso 44px h-11 min-h-11) ── */}
        <header className="min-h-14 px-3 sm:px-6 py-2 border-b border-border/80 bg-card/95 backdrop-blur-md flex items-center justify-between z-20 shrink-0 select-none">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleModalClose(false)}
              className="size-11 min-h-11 min-w-11 rounded-lg hover:bg-muted shrink-0 cursor-pointer focus-visible:ring-2"
              title="Fechar Estúdio"
              aria-label="Fechar Estúdio"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">
                  Estúdio Excelência Tour
                </h2>
                <Badge variant="outline" className="hidden sm:inline-flex text-xs font-mono">
                  {aspectRatio === "9:16"
                    ? "Story 9:16"
                    : aspectRatio === "4:5"
                    ? "Feed 4:5"
                    : "Quadrado 1:1"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                1080×1920 • Liquid Glass Engine • Copy WhatsApp & Link Público
              </p>
            </div>
          </div>

          {/* Seletor Central Rápido de Proporção (Desktop) */}
          <div className="hidden md:flex items-center bg-muted/60 p-1 rounded-lg border border-border/60">
            {(["9:16", "4:5", "1:1"] as PromoAspectRatio[]).map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAspectRatio(ratio)}
                className={`h-11 min-h-11 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  aspectRatio === ratio
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {ratio === "9:16" ? "Story 9:16" : ratio === "4:5" ? "Feed 4:5" : "Quadrado 1:1"}
              </button>
            ))}
          </div>

          {/* Ações Primárias da Top Bar */}
          <div className="flex items-center gap-2">
            {isConvertingImage && (
              <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>Otimizando...</span>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShuffleLayout}
              className="h-11 min-h-11 px-3 rounded-lg text-xs gap-2 font-semibold cursor-pointer border-border/80 hover:bg-primary/10 hover:text-primary transition-colors focus-visible:ring-2"
              title="Alternar entre templates do mesmo nicho"
            >
              <Dices className="size-4 text-amber-500" />
              <span className="hidden sm:inline">Trocar Layout</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMobileControlsOpen(!isMobileControlsOpen)}
              className="lg:hidden h-11 min-h-11 px-3 rounded-lg text-xs gap-2 focus-visible:ring-2"
            >
              <Sliders className="size-4" />
              <span>Ajustes</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadVideo}
              disabled={isExportingVideo}
              className="h-11 min-h-11 px-3 sm:px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer border-amber-500/30 hover:bg-amber-500/10 text-amber-500 hover:text-amber-400 focus-visible:ring-2"
              title="Gerar e baixar vídeo animado de 3s (Stories/Reels)"
            >
              {isExportingVideo ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Film className="size-4" />
              )}
              <span className="hidden sm:inline">Vídeo 3s</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isExporting}
              className="h-11 min-h-11 px-3 sm:px-4 rounded-lg text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2"
            >
              {isExporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              <span className="hidden sm:inline">Baixar PNG</span>
              <span className="sm:hidden">PNG</span>
            </Button>

            {attachCallback && (
              <Button
                type="button"
                size="sm"
                onClick={handleSaveToClassified}
                disabled={isSavingToAd}
                className="h-11 min-h-11 px-3 sm:px-4 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground cursor-pointer focus-visible:ring-2"
              >
                {isSavingToAd ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                <span className="hidden sm:inline">Usar no Anúncio</span>
                <span className="sm:hidden">Salvar</span>
              </Button>
            )}
          </div>
        </header>

        {/* ── 2. Split-Screen Studio Body ── */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
          {/* ── Coluna Esquerda/Central: O Canvas de Arte 1080×1920 + Barra IA ── */}
          <div
            ref={previewWrapperRef}
            style={{ backgroundColor: "rgb(7, 11, 18)" }}
            className="flex-1 min-h-0 flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-hidden select-none"
          >
            {/* Container escalado responsivamente sem cortes */}
            <div
              style={{
                width: `${artDimensions.width * previewScale}px`,
                height: `${artDimensions.height * previewScale}px`,
                backgroundColor: "rgb(10, 25, 47)",
              }}
              className="relative rounded-lg border border-white/10 transition-transform duration-150 overflow-hidden"
            >
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                  width: `${artDimensions.width}px`,
                  height: `${artDimensions.height}px`,
                }}
              >
                <TravelPromoArtboard data={promoData} isAnimated={isAnimatedPreview} />
              </div>
            </div>

            {/* Barra Inferior de Comando IA Direto sobre o Story (Sec. 13) */}
            <div className="mt-4 w-full max-w-xl flex items-center gap-2 bg-card/95 backdrop-blur-md p-2 rounded-lg border border-border/80 z-20">
              <Wand2 className="size-4 text-primary shrink-0 ml-2" />
              <Input
                value={aiEditCommand}
                onChange={(e) => setAiEditCommand(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleRunStoryAiCommand();
                  }
                }}
                placeholder="Comando IA (ex: 'Aumentar o título', 'Trocar para 12x', 'Deixar o vidro mais fosco')..."
                className="h-11 min-h-11 text-xs bg-background border-border/60 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRunStoryAiCommand}
                className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold cursor-pointer focus-visible:ring-2"
              >
                Aplicar IA
              </Button>
            </div>
          </div>

          {/* ── Coluna Direita: Painel Bidirecional (Desktop Inspector / Mobile Sheet) ── */}
          <aside
            className={`w-full lg:w-96 shrink-0 border-t lg:border-t-0 lg:border-l border-border/80 bg-card flex flex-col z-10 transition-transform duration-200 ${
              isMobileControlsOpen
                ? "h-96 max-sm:fixed max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:pb-safe"
                : "max-lg:hidden h-full"
            }`}
          >
            <div className="p-4 border-b border-border/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sliders className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Inspector do Pacote & Story
                </span>
              </div>
              {isMobileControlsOpen && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMobileControlsOpen(false)}
                  className="lg:hidden text-xs h-11 min-h-11 px-3"
                >
                  Fechar
                </Button>
              )}
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex-1 flex flex-col min-h-0"
            >
              <div className="px-3 pt-2 shrink-0">
                <TabsList className="flex flex-nowrap overflow-x-auto no-scrollbar h-11 rounded-lg bg-muted/60 p-1 gap-1">
                  <TabsTrigger
                    value="template"
                    className="h-9 px-3 text-xs font-semibold gap-1 shrink-0"
                  >
                    <Maximize2 className="size-3" />
                    <span>Layout</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="textos"
                    className="h-9 px-3 text-xs font-semibold gap-1 shrink-0"
                  >
                    <Type className="size-3" />
                    <span>Oferta</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="vidro"
                    className="h-9 px-3 text-xs font-semibold gap-1 shrink-0"
                  >
                    <Sparkles className="size-3" />
                    <span>Liquid Glass</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="whatsapp"
                    className="h-9 px-3 text-xs font-semibold gap-1 shrink-0"
                  >
                    <MessageCircle className="size-3" />
                    <span>WhatsApp</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="imagem"
                    className="h-9 px-3 text-xs font-semibold gap-1 shrink-0"
                  >
                    <ImageIcon className="size-3" />
                    <span>Mídia</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                {/* ── TAB 1: Layout & Template ── */}
                <TabsContent
                  value="template"
                  className="space-y-4 m-0 focus-visible:outline-none"
                >
                  {/* Intake Rápido por Texto Colado */}
                  <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Wand2 className="size-4 text-primary" />
                      <span>Intake Rápido de Cotação (Colar Texto)</span>
                    </Label>
                    <Textarea
                      value={rawQuoteInput}
                      onChange={(e) => setRawQuoteInput(e.target.value)}
                      rows={3}
                      placeholder="Ex: Punta Cana 19 a 24 de agosto, Occidental Punta Cana All Inclusive, 2 adultos, 15x de R$ 284 no boleto e cartão..."
                      className="text-xs rounded-lg bg-background resize-none"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleExtractFromRawQuote}
                      className="w-full h-11 min-h-11 rounded-lg text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 cursor-pointer focus-visible:ring-2"
                    >
                      Extrair & Preencher Story
                    </Button>
                  </div>

                  {/* Modelo de Template */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-2">
                        <Star className="size-4 text-primary" />
                        <span>Modelo Visual</span>
                      </Label>
                      <button
                        type="button"
                        onClick={handleShuffleLayout}
                        className="h-11 min-h-11 px-2 text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer focus-visible:ring-2 rounded-lg"
                      >
                        <Dices className="size-4 text-amber-500" />
                        <span>Sortear</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {getAllSocialTemplates()
                        .filter((t) => t.niche === "turismo" || t.id === templateId)
                        .map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTemplateId(t.id)}
                            className={`min-h-11 p-3 rounded-lg border text-left transition-colors cursor-pointer flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              templateId === t.id
                                ? "border-primary bg-primary/10 text-foreground font-semibold"
                                : "border-border/70 bg-card hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            <div
                              className={`size-3 rounded-full mt-1 shrink-0 ${
                                templateId === t.id ? "bg-primary" : "bg-muted-foreground/30"
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-foreground flex items-center justify-between">
                                <span className="truncate">{t.name}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {t.description}
                              </p>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Paleta Atmosférica Superior */}
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <Label className="text-xs font-semibold flex items-center gap-2">
                      <Palette className="size-4 text-primary" />
                      <span>Paleta Atmosférica do Topo</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "ocean_blue", label: "Oceano (Arte Salva)" },
                        { id: "caribbean_turquoise", label: "Caribe Turquesa" },
                        { id: "sunset_amber", label: "Pôr do Sol" },
                        { id: "emerald_nature", label: "Natureza" },
                        { id: "midnight_luxury", label: "Midnight" },
                        { id: "nordic_snow", label: "Inverno / Neve" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setThemeGradient(t.id as any)}
                          className={`h-11 min-h-11 flex items-center gap-2 px-3 rounded-lg border text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            themeGradient === t.id
                              ? "border-primary bg-primary/10 text-foreground font-semibold"
                              : "border-border/70 bg-card hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          <span className="truncate">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* ── TAB 2: Oferta, Viajantes, Hotel & Parcelamento ── */}
                <TabsContent
                  value="textos"
                  className="space-y-4 m-0 focus-visible:outline-none"
                >
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">
                      Título do Destino (Auto Text-Fit + Sombra Duplicada)
                    </Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: PUNTA CANA ou RECIFE + PORTO DE GALINHAS"
                      className="h-11 min-h-11 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Período / Datas</Label>
                      <Input
                        value={datesText}
                        onChange={(e) => setDatesText(e.target.value)}
                        placeholder="19 a 24 de agosto"
                        className="h-11 min-h-11 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Saída (Origem)</Label>
                      <Input
                        value={originCityInput}
                        onChange={(e) => setOriginCityInput(e.target.value)}
                        placeholder="Chapecó"
                        className="h-11 min-h-11 text-xs"
                      />
                    </div>
                  </div>

                  {/* Hotel / Resort Catalog Resolver */}
                  <div className="pt-2 border-t border-border/50 space-y-2">
                    <Label className="text-xs font-semibold flex items-center gap-2">
                      <Building2 className="size-4 text-primary" />
                      <span>Hotel / Resort (Catálogo Central)</span>
                    </Label>
                    <Input
                      value={hotelNameInput}
                      onChange={(e) => setHotelNameInput(e.target.value)}
                      placeholder="Ex: Occidental P. Cana, Vila Galé Cumbuco..."
                      className="h-11 min-h-11 text-xs"
                    />
                    {hotelCatalogMatch.entity && (
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Match Catálogo: {hotelCatalogMatch.entity.canonicalName} (
                          {Math.round(hotelCatalogMatch.confidence * 100)}%)
                        </span>
                      </div>
                    )}
                    {!hotelCatalogMatch.matched &&
                      hotelCatalogMatch.candidates.length > 0 && (
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1 text-xs">
                          <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="size-3" />
                            Sugestão do catálogo:
                          </span>
                          {hotelCatalogMatch.candidates.slice(0, 2).map((cand) => (
                            <button
                              key={cand.entity.id}
                              type="button"
                              onClick={() => {
                                setHotelNameInput(cand.entity.canonicalName);
                                if (
                                  cand.entity.defaultMealPlans[0] &&
                                  !mealPlanInput
                                ) {
                                  setMealPlanInput(cand.entity.defaultMealPlans[0]);
                                }
                              }}
                              className="w-full h-11 min-h-11 px-2 rounded-lg bg-background border border-border/60 text-left font-medium hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              Usar {cand.entity.canonicalName}
                            </button>
                          ))}
                        </div>
                      )}

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">
                        Regime Alimentar Confirmado (Nunca inventado)
                      </Label>
                      <select
                        value={mealPlanInput}
                        onChange={(e) => setMealPlanInput(e.target.value)}
                        className="w-full h-11 min-h-11 px-3 rounded-lg border border-input bg-background text-xs"
                      >
                        <option value="">Não informado na cotação</option>
                        <option value="All Inclusive">All Inclusive</option>
                        <option value="Café da Manhã">Café da Manhã</option>
                        <option value="Meia Pensão">Meia Pensão</option>
                        <option value="Pensão Completa">Pensão Completa</option>
                        <option value="Só Hospedagem">Só Hospedagem (Sem Café)</option>
                      </select>
                    </div>
                  </div>

                  {/* Viajantes & Base Tarifária (Sec. 5) */}
                  <div className="pt-2 border-t border-border/50 space-y-2">
                    <Label className="text-xs font-semibold">
                      Viajantes, Ocupação & Base do Preço
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Adultos</Label>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={adultsCount}
                          onChange={(e) =>
                            setAdultsCount(Math.max(1, Number(e.target.value) || 1))
                          }
                          className="h-11 min-h-11 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Crianças</Label>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          value={childrenCount}
                          onChange={(e) =>
                            setChildrenCount(Math.max(0, Number(e.target.value) || 0))
                          }
                          className="h-11 min-h-11 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Idades (ex: 8,11)
                        </Label>
                        <Input
                          value={childAgesText}
                          onChange={(e) => setChildAgesText(e.target.value)}
                          placeholder="8, 11"
                          className="h-11 min-h-11 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Base Tarifária Exibida no Card
                      </Label>
                      <select
                        value={priceBasis}
                        onChange={(e) => {
                          const nextBasis = e.target.value as PriceBasis;
                          setPriceBasis(nextBasis);
                          setPricingMode(
                            nextBasis === "total_package"
                              ? "total_package"
                              : "per_person"
                          );
                        }}
                        className="w-full h-11 min-h-11 px-3 rounded-lg border border-input bg-background text-xs font-semibold"
                      >
                        <option value="per_person">Por pessoa</option>
                        <option value="per_couple">Por casal</option>
                        <option value="per_family">Para a família (Adultos + Crianças)</option>
                        <option value="per_room">Por quarto / apartamento</option>
                        <option value="total_package">Total do pacote fechado</option>
                      </select>
                    </div>
                  </div>

                  {/* Campanha de Parcelamento (10x, 12x, 15x, 16x) */}
                  <div className="pt-2 border-t border-border/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        Campanha de Parcelamento
                      </Label>
                      <span className="text-xs font-bold text-primary font-mono">
                        {effectiveInstallmentCents !== null
                          ? `${maxInstallments}x de ${formatMoney(
                              effectiveInstallmentCents
                            )}`
                          : "Sob consulta"}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[10, 12, 15, 16].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => {
                            const currentTotal =
                              priceCents ||
                              (effectiveInstallmentCents
                                ? effectiveInstallmentCents * maxInstallments
                                : 0);
                            setMaxInstallments(cnt);
                            if (currentTotal > 0) {
                              setPriceCents(currentTotal);
                              setInstallmentOverrideCents(
                                Math.round(currentTotal / cnt)
                              );
                            }
                          }}
                          className={`h-11 min-h-11 rounded-lg border text-xs font-bold font-mono cursor-pointer focus-visible:ring-2 ${
                            maxInstallments === cnt
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border/70 bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {cnt}x
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Parcela (centavos)
                        </Label>
                        <Input
                          type="number"
                          value={installmentOverrideCents ?? ""}
                          onChange={(e) => {
                            const val =
                              e.target.value === "" ? null : Number(e.target.value);
                            setInstallmentOverrideCents(val);
                            if (val !== null && maxInstallments > 0) {
                              setPriceCents(val * maxInstallments);
                            }
                          }}
                          placeholder="28400 (= R$ 284)"
                          className="h-11 min-h-11 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Total (centavos)
                        </Label>
                        <Input
                          type="number"
                          value={priceCents ?? ""}
                          onChange={(e) => {
                            const val =
                              e.target.value === "" ? null : Number(e.target.value);
                            setPriceCents(val);
                            if (val !== null && maxInstallments > 0) {
                              setInstallmentOverrideCents(
                                Math.round(val / maxInstallments)
                              );
                            }
                          }}
                          className="h-11 min-h-11 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Meios de Pagamento no Card
                      </Label>
                      <Input
                        value={paymentMethodsLabel}
                        onChange={(e) => setPaymentMethodsLabel(e.target.value)}
                        placeholder="no boleto e cartão"
                        className="h-11 min-h-11 text-xs"
                      />
                    </div>
                  </div>

                  {/* Inclusões (2 a 4 itens) */}
                  <div className="pt-2 border-t border-border/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        Inclusões do Story (2 a 4 itens)
                      </Label>
                      <span className="text-xs text-muted-foreground font-mono">
                        {parsedInclusions.length}/4
                      </span>
                    </div>
                    <Input
                      value={inclusionsText}
                      onChange={(e) => setInclusionsText(e.target.value)}
                      placeholder="Aéreos desde Chapecó, Resort All Inclusive, Traslados ao aeroporto"
                      className="h-11 min-h-11 text-xs"
                    />
                  </div>
                </TabsContent>

                {/* ── TAB 3: Liquid / Frosted Glass Controls (Sec. 14–19) ── */}
                <TabsContent
                  value="vidro"
                  className="space-y-4 m-0 focus-visible:outline-none"
                >
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">
                      Presets de Vidro (Figma / Excelência Tour)
                    </Label>
                    <div className="grid grid-cols-1 gap-2">
                      {(
                        [
                          {
                            id: "saved_offer_glass",
                            label: "Saved Offer Glass (Arte Salva — Fill 19%)",
                          },
                          {
                            id: "heavy_frost",
                            label: "Heavy Frost (Preset A — Frost 80 / Refraction 90)",
                          },
                          {
                            id: "dark_glass",
                            label: "Dark Glass + Noise (Preset B — Depth 56 / Splay 45)",
                          },
                          {
                            id: "clear_lens",
                            label: "Clear Lens (Alta Refração Óptica)",
                          },
                          {
                            id: "subtle_glass",
                            label: "Subtle Glass (Discreto)",
                          },
                        ] as { id: GlassPresetId; label: string }[]
                      ).map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setGlassMaterial(getGlassPreset(preset.id))}
                          className={`h-11 min-h-11 px-3 rounded-lg border text-left text-xs font-semibold transition-colors cursor-pointer focus-visible:ring-2 ${
                            glassMaterial.presetId === preset.id
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border/70 bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Controles Individuais de Óptica e Vidro */}
                  <div className="space-y-3 pt-2 border-t border-border/50">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Frost / Desfoque</span>
                        <span className="font-mono">{glassMaterial.optics.frost}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={glassMaterial.optics.frost}
                        onChange={(e) =>
                          setGlassMaterial((prev) =>
                            normalizeGlassMaterial({
                              ...prev,
                              optics: {
                                ...prev.optics,
                                frost: Number(e.target.value),
                              },
                            })
                          )
                        }
                        className="w-full h-11 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Refração Óptica (Refraction)</span>
                        <span className="font-mono">
                          {glassMaterial.optics.refraction}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={glassMaterial.optics.refraction}
                        onChange={(e) =>
                          setGlassMaterial((prev) =>
                            normalizeGlassMaterial({
                              ...prev,
                              optics: {
                                ...prev.optics,
                                refraction: Number(e.target.value),
                              },
                            })
                          )
                        }
                        className="w-full h-11 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Profundidade (Depth)</span>
                        <span className="font-mono">{glassMaterial.optics.depth}</span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={100}
                        value={glassMaterial.optics.depth}
                        onChange={(e) =>
                          setGlassMaterial((prev) =>
                            normalizeGlassMaterial({
                              ...prev,
                              optics: {
                                ...prev.optics,
                                depth: Number(e.target.value),
                              },
                            })
                          )
                        }
                        className="w-full h-11 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Dispersão Cromática (Dispersion)</span>
                        <span className="font-mono">
                          {glassMaterial.optics.dispersion}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={glassMaterial.optics.dispersion}
                        onChange={(e) =>
                          setGlassMaterial((prev) =>
                            normalizeGlassMaterial({
                              ...prev,
                              optics: {
                                ...prev.optics,
                                dispersion: Number(e.target.value),
                              },
                            })
                          )
                        }
                        className="w-full h-11 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Opacidade de Preenchimento (Fill)</span>
                        <span className="font-mono">
                          {Math.round(glassMaterial.fill.opacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={5}
                        max={85}
                        value={Math.round(glassMaterial.fill.opacity * 100)}
                        onChange={(e) =>
                          setGlassMaterial((prev) =>
                            normalizeGlassMaterial({
                              ...prev,
                              fill: {
                                ...prev.fill,
                                opacity: Number(e.target.value) / 100,
                              },
                            })
                          )
                        }
                        className="w-full h-11 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Ângulo da Luz Especular</span>
                        <span className="font-mono">
                          {glassMaterial.optics.lightAngleDeg}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        value={glassMaterial.optics.lightAngleDeg}
                        onChange={(e) =>
                          setGlassMaterial((prev) =>
                            normalizeGlassMaterial({
                              ...prev,
                              optics: {
                                ...prev.optics,
                                lightAngleDeg: Number(e.target.value),
                              },
                            })
                          )
                        }
                        className="w-full h-11 cursor-pointer"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* ── TAB 4: WhatsApp Publisher & Validade 24h (Sec. 21 & 22) ── */}
                <TabsContent
                  value="whatsapp"
                  className="space-y-4 m-0 focus-visible:outline-none"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">
                        Resumo WhatsApp + Link Público
                      </Label>
                      <Badge variant="outline" className="text-xs font-mono">
                        Validade 24h
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsSameDayClosingWa((p) => !p)}
                        className={`h-11 min-h-11 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer focus-visible:ring-2 ${
                          isSameDayClosingWa
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/70 bg-background text-muted-foreground"
                        }`}
                      >
                        <span>Regra "Fechamento HOJE" (Mesmo Dia)</span>
                        <span>{isSameDayClosingWa ? "Ativa" : "Desativada"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIncludeFlightTimesWa((p) => !p)}
                        className={`h-11 min-h-11 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer focus-visible:ring-2 ${
                          includeFlightTimesWa
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border/70 bg-background text-muted-foreground"
                        }`}
                      >
                        <span>Horários de Voo no WhatsApp</span>
                        <span>
                          {includeFlightTimesWa ? "Incluídos" : "Omitidos (Padrão)"}
                        </span>
                      </button>
                    </div>

                    <Textarea
                      value={whatsappOfferText}
                      readOnly
                      rows={10}
                      className="font-mono text-xs rounded-lg bg-muted/20 resize-none p-3"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(whatsappOfferText);
                          toast.success("Resumo WhatsApp copiado!");
                        }}
                        className="h-11 min-h-11 rounded-lg text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2"
                      >
                        <Copy className="size-4" />
                        <span>Copiar Texto</span>
                      </Button>

                      <Button
                        type="button"
                        onClick={() => {
                          const waUrl = `https://wa.me/?text=${encodeURIComponent(
                            whatsappOfferText
                          )}`;
                          window.open(waUrl, "_blank");
                        }}
                        className="h-11 min-h-11 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2"
                      >
                        <MessageCircle className="size-4" />
                        <span>Abrir WhatsApp</span>
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* ── TAB 5: Mídia & Fundo (Blindado contra CORS) ── */}
                <TabsContent
                  value="imagem"
                  className="space-y-4 m-0 focus-visible:outline-none"
                >
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Foto de Fundo Realista</Label>

                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border/80 bg-muted/40">
                      <img
                        src={safeBgDataUri || bgImageUrl}
                        alt="Preview de Fundo"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                        <span className="text-xs text-white/90 font-mono truncate">
                          {bgImageUrl.startsWith("data:")
                            ? "Imagem local carregada"
                            : bgImageUrl}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <Label className="text-xs text-muted-foreground">URL da Imagem</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={bgImageUrl}
                          onChange={(e) => setBgImageUrl(e.target.value)}
                          placeholder="https://exemplo.com/foto.jpg"
                          className="h-11 min-h-11 text-xs font-mono flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileUploadInputRef.current?.click()}
                          className="h-11 min-h-11 text-xs gap-1 rounded-lg shrink-0 cursor-pointer focus-visible:ring-2"
                        >
                          <ImagePlus className="size-4" />
                          <span>Upload</span>
                        </Button>
                        <input
                          ref={fileUploadInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCustomImageUploaded}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-xs">
                        <span>Enquadramento Vertical da Foto</span>
                        <span className="font-mono">{photoObjectPositionY}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={photoObjectPositionY}
                        onChange={(e) => setPhotoObjectPositionY(Number(e.target.value))}
                        className="w-full h-11 cursor-pointer"
                      />
                    </div>

                    <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-start gap-2 text-xs">
                      <ShieldCheck className="size-4 text-emerald-500 shrink-0 mt-1" />
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground text-xs">
                          Proteção Anti-CORS Ativa
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          A imagem externa é convertida para Base64 antes da exportação,
                          eliminando bloqueios de rede.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-border/50">
                    <Label className="text-xs font-semibold">
                      Nome da Agência / Loja
                    </Label>
                    <Input
                      value={storeNameValue}
                      onChange={(e) => setStoreNameValue(e.target.value)}
                      placeholder="Excelência Tour"
                      className="h-11 min-h-11 text-xs"
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
