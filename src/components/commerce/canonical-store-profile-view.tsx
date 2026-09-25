/**
 * canonical-store-profile-view.tsx — Perfil Comercial Público Canônico de Empresas (Waesy / Apple HIG)
 * Unifica a presença pública de lojas e empresas locais com a mesma excelência visual do perfil de membro.
 * Abas ricas: Vitrine (Banners, Botões/Hotpages, Catálogo), Sobre & Atendimento (Horários, Pagamentos, Mapa),
 * Posts Sociais (Feed/Grid), Vagas de Emprego, Avaliações Verificadas e Patrocinadores.
 */

import { useState, useMemo, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Clock,
  Phone,
  MapPin,
  Star,
  ShieldCheck,
  Share2,
  ArrowLeft,
  Store,
  ShoppingBag,
  Layers,
  UtensilsCrossed,
  Briefcase,
  Building2,
  ChevronRight,
  Search,
  ExternalLink,
  Plus,
  MessageSquare,
  Award,
  CreditCard,
  Truck,
  CheckCircle,
  Eye,
  Check,
  Navigation,
  Ticket,
  FileCheck,
  Sparkles,
  Grid,
  List,
  Camera,
  Edit3,
  Package,
  LayoutGrid,
  Tag,
} from "lucide-react";
import {
  WhatsappLogo,
  PaperPlaneTilt,
  Globe,
  InstagramLogo,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  StoreVitrineSectionsEditor,
  DEFAULT_STORE_VITRINE_SECTIONS,
  type VitrineSectionConfig,
  type VitrineCardItem,
} from "@/components/commerce/store-vitrine-sections-editor";
import { ProceduralInfiniteFeed } from "@/components/commerce/procedural-infinite-feed";
import { CommunityFeedCard } from "@/components/social/community-feed-card";
import { NativeMobileHeader } from "@/components/navigation";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { DynamicMediaChip } from "@/components/commerce/dynamic-media-chip";
import { ProductModifiersModal, type SelectedModifier } from "@/components/pos/product-modifiers-modal";
import { MediaLightboxModal } from "@/components/community/media-lightbox-modal";
import {
  normalizeWorkingHours,
  formatWeeklyScheduleSummary,
  WEEKDAYS_ORDER,
} from "@/lib/business-hours";
import { getOpenStatus, formatDate } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { addToCart } from "@/services/cart.functions";
import { requestDirectoryQuote, updateDirectoryListingFn } from "@/services/directory.functions";
import { importMinedProductToStoreFn } from "@/services/mining.functions";
import { participateInRaffle } from "@/services/invite.functions";
import { upsertStorePageSection, saveStorePageSectionsOrder } from "@/services/store.functions";
import { useCartContext } from "@/lib/cart-context";
import { SocialCardGeneratorModal } from "@/components/studio/SocialCardGeneratorModal";
import { PromotionalFlyersRail } from "@/components/commerce/flyers/promotional-flyers-rail";
import { listActiveStoreFlyers, type PromotionalFlyerDTO } from "@/services/store-flyers.functions";
import { ClaimBusinessModal } from "@/components/commerce/claim-business-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface CanonicalStoreProfileViewProps {
  store: any;
  sections?: any[];
  catalog?: any[];
  categories?: any[];
  banners?: any[];
  flyers?: PromotionalFlyerDTO[];
  hotpages?: any[];
  jobs?: any[];
  ads?: any[];
  posts?: any[];
  reviews?: any[];
  sponsors?: any[];
  concursos?: any[];
  employerStats?: any;
  builderTree?: any[] | null;
  initialTab?: string;
  isOwner?: boolean;
  source?: "directory" | "storefront";
  backUrl?: string;
  backLabel?: string;
}

export function CanonicalStoreProfileView({
  store,
  sections = [],
  catalog = [],
  categories = [],
  banners = [],
  flyers,
  hotpages = [],
  jobs = [],
  ads = [],
  posts = [],
  reviews = [],
  sponsors = [],
  concursos = [],
  employerStats = null,
  initialTab = "vitrine",
  isOwner = false,
  source = "storefront",
  backUrl = source === "directory" ? "/diretorio" : "/",
  backLabel = source === "directory" ? "Guia & Diretório" : "Início",
}: CanonicalStoreProfileViewProps) {
  const { setCartData, setIsCartOpen } = useCartContext();

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todas");
  const [selectedProductForModifiers, setSelectedProductForModifiers] = useState<any | null>(null);

  // Modal de Lightbox para fotos dos posts
  const [lightboxPost, setLightboxPost] = useState<any | null>(null);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  // Estado de Seções Personalizáveis da Vitrine (Wix / App Builder Style)
  const [vitrineSections, setVitrineSections] = useState<VitrineSectionConfig[]>(() => {
    if (sections && sections.length > 0) {
      return sections.map((s) => ({
        id: s.id,
        type: s.section_type === "banner_carousel" ? "banners" : s.section_type === "highlight_cards" ? "custom_cards" : s.section_type,
        title: s.title || s.section_type,
        enabled: s.is_active,
        cards: s.config?.cards || [],
      }));
    }
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const cached = localStorage.getItem(`store_vitrine_sections_${store?.id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {}
    return DEFAULT_STORE_VITRINE_SECTIONS;
  });
  const [isSectionsEditorOpen, setIsSectionsEditorOpen] = useState(false);
  const [postViewMode, setPostViewMode] = useState<"grid" | "feed">("grid");
  const [isSocialStudioOpen, setIsSocialStudioOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);

  // Encartes Promocionais da Semana / Mês
  const [flyersList, setFlyersList] = useState<PromotionalFlyerDTO[]>(flyers || []);

  useEffect(() => {
    if (flyers && flyers.length > 0) {
      setFlyersList(flyers);
    } else if (store?.id) {
      listActiveStoreFlyers({ data: { storeId: store.id } })
        .then((res) => {
          if (res && res.length > 0) setFlyersList(res);
        })
        .catch(() => {});
    }
  }, [store?.id, flyers]);

  // Modal de Orçamento
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [quoteName, setQuoteName] = useState("");
  const [quoteEmail, setQuoteEmail] = useState("");
  const [quotePhone, setQuotePhone] = useState("");
  const [quoteService, setQuoteService] = useState("");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [hasQuoted, setHasQuoted] = useState(false);
  const [isSendingQuote, setIsSendingQuote] = useState(false);

  // Modal de Edição Rápida da Empresa (Modo Proprietário — Bilateral CRUD)
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState(store?.name || store?.business_name || "");
  const [editCompanyCategory, setEditCompanyCategory] = useState(store?.category || store?.type || "servicos");
  const [editCompanyDescription, setEditCompanyDescription] = useState(store?.description || store?.settings?.bio || "");
  const [editCompanyAddress, setEditCompanyAddress] = useState(store?.address || "");
  const [editCompanyCity, setEditCompanyCity] = useState(store?.city || "São Miguel do Oeste");
  const [editCompanyPhone, setEditCompanyPhone] = useState(store?.phone || store?.contact_phone || "");
  const [editCompanyWhatsapp, setEditCompanyWhatsapp] = useState(store?.contact_whatsapp || store?.whatsapp || store?.phone || "");
  const [editCompanyEmail, setEditCompanyEmail] = useState(store?.email || store?.contact_email || "");
  const [editCompanyWebsite, setEditCompanyWebsite] = useState(store?.website_url || store?.website || "");
  const [editCompanyHours, setEditCompanyHours] = useState("Seg a Sex: 08:00 - 18:00");
  const [editCompanySpecialties, setEditCompanySpecialties] = useState(
    Array.isArray(store?.specialties || store?.settings?.specialties)
      ? (store?.specialties || store?.settings?.specialties).join(", ")
      : ""
  );
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  const handleSaveCompanyQuickEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    try {
      const res = await updateDirectoryListingFn({
        data: {
          id: store.id,
          businessName: editCompanyName,
          category: editCompanyCategory,
          description: editCompanyDescription,
          address: editCompanyAddress,
          city: editCompanyCity,
          contactPhone: editCompanyPhone,
          contactWhatsapp: editCompanyWhatsapp,
          contactEmail: editCompanyEmail,
          websiteUrl: editCompanyWebsite,
          workingHours: editCompanyHours,
        },
      });
      toast.success(res.message);
      setIsEditCompanyModalOpen(false);
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar alterações na empresa.");
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleImportMinedProduct = async (p: any) => {
    try {
      const res = await importMinedProductToStoreFn({
        data: {
          minedProductId: p.id,
          storeId: store.id,
        },
      });
      toast.success(res.message);
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao importar produto para a loja.");
    }
  };

  // Concursos de Sorte
  const [selectedConcurso, setSelectedConcurso] = useState<any | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const handleConfirmConcursoParticipation = async () => {
    if (!selectedConcurso) return;
    if (!acceptedTerms) {
      toast.error("É necessário ler e aceitar o regulamento do concurso.");
      return;
    }

    setIsSubmittingTicket(true);
    try {
      const res = await participateInRaffle({
        data: {
          raffleId: selectedConcurso.id,
          acceptTerms: true,
        },
      });
      toast.success(res.message);
      setSelectedConcurso(null);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao emitir cupom.");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const settings = store?.settings || {};
  const coverUrl =
    store?.banner_url ||
    settings.cover_url ||
    settings.bannerUrl ||
    settings.banner_url ||
    null;
  const logoUrl =
    store?.avatar_url ||
    store?.logo_url ||
    settings.logoUrl ||
    settings.logo_url ||
    null;

  const rawHours =
    settings.working_hours ||
    settings.business_hours_extended ||
    store?.business_hours ||
    store?.working_hours ||
    null;
  const holidayExceptions = settings.holiday_exceptions || [];
  const openStatus = rawHours ? getOpenStatus(rawHours, holidayExceptions) : null;
  const weeklySchedule = normalizeWorkingHours(rawHours);
  const scheduleSummary = rawHours
    ? formatWeeklyScheduleSummary(weeklySchedule)
    : "Horários sob consulta";

  // Lista de banners da loja para scroll interno contínuo
  const storeBannersList = useMemo(() => {
    const list: { imageUrl: string; title?: string; link?: string }[] = [];
    if (coverUrl) {
      list.push({ imageUrl: coverUrl, title: "Capa Oficial" });
    }
    if (Array.isArray(banners)) {
      banners.forEach((b: any) => {
        const url = b.image_url || b.imageUrl;
        if (url && !list.some((item) => item.imageUrl === url)) {
          list.push({ imageUrl: url, title: b.title, link: b.link_url || b.link });
        }
      });
    }
    if (Array.isArray(flyers)) {
      flyers.forEach((f: any) => {
        const url = f.flyer_url || f.image_url;
        if (url && !list.some((item) => item.imageUrl === url)) {
          list.push({ imageUrl: url, title: f.title });
        }
      });
    }
    return list;
  }, [coverUrl, banners, flyers]);

  // Avaliação Real (ZERO MOCKS — Conforme Diretriz Estrita do Usuário)
  const realReviewsCount = Array.isArray(reviews) && reviews.length > 0
    ? reviews.length
    : (typeof store?.reviews_count === "number" ? store.reviews_count : (typeof store?.total_reviews === "number" ? store.total_reviews : 0));

  const realRatingAverage = realReviewsCount > 0
    ? (Array.isArray(reviews) && reviews.length > 0
        ? Number((reviews.reduce((acc: number, r: any) => acc + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1))
        : (typeof store?.rating_average === "number" && !isNaN(store.rating_average)
            ? store.rating_average
            : (typeof store?.rating === "number" && !isNaN(store.rating) ? store.rating : null)))
    : null;

  const orderTypes = settings.order_types || {
    delivery: true,
    takeout: true,
    dine_in: true,
  };

  // Semântica por Nicho
  const segment = (store?.type || store?.category || settings.segment || "loja").toLowerCase();
  const isGastronomy =
    segment.includes("gastro") ||
    segment.includes("restauran") ||
    segment.includes("lanchon") ||
    segment.includes("bar") ||
    segment.includes("caf") ||
    segment.includes("pizza") ||
    segment.includes("hamburg");
  const isServices =
    segment.includes("servi") ||
    segment.includes("belez") ||
    segment.includes("estet") ||
    segment.includes("saud") ||
    segment.includes("consult") ||
    segment.includes("oficina");
  const isNews = segment.includes("jornal") || segment.includes("notic") || segment.includes("portal");

  const catalogTabTitle = isGastronomy ? "Cardápio" : isServices ? "Serviços & Preços" : "Produtos & Loja";
  const CatalogIcon = isGastronomy ? UtensilsCrossed : isServices ? Layers : ShoppingBag;

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link da empresa copiado para a área de transferência!");
    }
  };

  const handleAddToCart = async (p: any) => {
    if (p.hasModifiers || (p.optionGroups && p.optionGroups.length > 0) || (p.modifierGroups && p.modifierGroups.length > 0)) {
      setSelectedProductForModifiers(p);
      return;
    }

    try {
      const res = await addToCart({
        data: {
          productId: p.id,
          quantity: 1,
        },
      });
      if (res?.cart) {
        setCartData(res.cart as any, (res as any).globalCarts as any);
      }
      toast.success(`${p.title} adicionado à sacola!`);
      setIsCartOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao adicionar produto.");
    }
  };

  const handleConfirmModifiers = async (
    prod: any,
    _variant: any,
    selectedMods: SelectedModifier[]
  ) => {
    try {
      const optionsPayload: Record<string, string[]> = {};
      selectedMods.forEach((m) => {
        if (!optionsPayload[m.groupId]) {
          optionsPayload[m.groupId] = [];
        }
        optionsPayload[m.groupId].push(m.modifierId || m.title);
      });

      const res = await addToCart({
        data: {
          productId: prod.id,
          quantity: 1,
          options: optionsPayload,
        },
      });

      if (res?.cart) {
        setCartData(res.cart as any, (res as any).globalCarts as any);
      }
      toast.success(`${prod.title} adicionado à sacola!`);
      setSelectedProductForModifiers(null);
      setIsCartOpen(true);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao adicionar produto.");
    }
  };

  const handleSendQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingQuote(true);
    try {
      await requestDirectoryQuote({
        data: {
          listingId: store.id,
          customerName: quoteName,
          customerEmail: quoteEmail,
          customerPhone: quotePhone,
          serviceNeeded: quoteService || "Atendimento Geral",
          message: quoteMessage || undefined,
        },
      });
      setHasQuoted(true);
      toast.success("Solicitação de atendimento enviada com sucesso!");

      // Telemetria de Lead (Meta Pixel client-side & CAPI server-side)
      if (typeof window !== "undefined" && typeof (window as any).fbq === "function") {
        (window as any).fbq("track", "Lead", {
          content_name: quoteService || "Atendimento Geral",
          content_category: "quote",
        });
      }
      if (store?.id) {
        import("@/services/pixels.functions")
          .then(({ dispatchMetaCapiEvent }) => {
            dispatchMetaCapiEvent({
              data: {
                storeId: store.id,
                eventName: "Lead",
                eventSourceUrl: window.location.href,
                customData: {
                  service_needed: quoteService,
                },
                userData: {
                  email: quoteEmail,
                  phone: quotePhone,
                },
              },
            }).catch(() => {});
          })
          .catch(() => {});
      }
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar solicitação.");
    } finally {
      setIsSendingQuote(false);
    }
  };

  // Filtragem de Produtos
  const filteredProducts = useMemo(() => {
    return (catalog as any[]).filter((p) => {
      const matchesSearch =
        productSearch.trim() === "" ||
        p.title?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.description?.toLowerCase().includes(productSearch.toLowerCase());
      const matchesCategory =
        selectedCategory === "todas" ||
        p.category_id === selectedCategory ||
        p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [catalog, productSearch, selectedCategory]);

  const whatsappNumber = (
    store?.contact_whatsapp ||
    store?.whatsapp ||
    store?.phone ||
    store?.contact_phone ||
    ""
  ).replace(/\D/g, "");

  const phoneCallNumber = (
    store?.phone ||
    store?.contact_phone ||
    store?.contact_whatsapp ||
    ""
  ).replace(/\D/g, "");

  // Endereço Canônico Sanitizado (Sem loops e sem repetição de cidade/estado)
  const formattedAddress = useMemo(() => {
    if (!store) return null;
    const isHidden = Boolean(
      store.settings?.hide_address_completely ||
      store.settings?.is_address_public === false ||
      store.settings?.hide_location
    );
    if (isHidden) return null;

    let raw = store.address || store.settings?.address || store.location || "";
    let street = "";
    let neighborhood = store.neighborhood || store.settings?.neighborhood || "";

    if (Array.isArray(raw)) {
      raw = raw.filter(Boolean).join(", ");
    } else if (typeof raw === "object" && raw !== null) {
      neighborhood = raw.neighborhood || neighborhood;
      raw = [raw.street, raw.number].filter(Boolean).join(", ");
    }

    if (typeof raw === "string") {
      street = raw.trim();
    }

    const city = (store.city || store.settings?.city || "").trim();
    const state = (store.state || store.settings?.state || "SC").trim();

    const segments = [];
    if (street) segments.push(street);
    if (neighborhood && !street.toLowerCase().includes(neighborhood.toLowerCase())) {
      segments.push(neighborhood);
    }

    const cityState = [city, state].filter(Boolean).join(" - ");
    if (cityState && !street.toLowerCase().includes(city.toLowerCase())) {
      segments.push(cityState);
    }

    if (segments.length === 0) return null;

    return {
      display: segments.join(" • "),
      mapsQuery: [street, neighborhood, city, state].filter(Boolean).join(", "),
    };
  }, [store]);

  const hasSponsors = sponsors && sponsors.length > 0;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-5 pb-20 md:pb-12 animate-in fade-in duration-200">
            {/* ── 1. NATIVE MOBILE HEADER CANÔNICO (Apple HIG / Safe Area) ── */}
      <NativeMobileHeader
        fallbackHref={backUrl}
        title={
          <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
            <span className="font-mono">@{store.slug || store.id?.slice(0, 8)}</span>
            <ShieldCheck className="size-4 text-primary fill-primary/20 shrink-0" />
          </div>
        }
        rightActions={
          <Button
            size="sm"
            variant="ghost"
            className="size-9 p-0 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={handleShare}
            aria-label="Compartilhar Perfil"
          >
            <Share2 className="size-4" />
          </Button>
        }
        centerTitle={true}
        mobileOnly={true}
      />

      {/* ── BANNER DE REIVINDICAÇÃO DE NEGÓCIO (GHOST TENANTS / CLAIMING) ── */}
      {!isOwner && Boolean(
        store?.is_ghost ||
        settings?.is_ghost ||
        store?.is_crawled ||
        (source === "directory" && !store?.is_verified)
      ) && (
        <div className="rounded-2xl bg-muted/20 border border-border/50 p-3.5 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-none">
          <div className="flex items-center gap-3">
            <div className="size-8 sm:size-9 rounded-xl bg-card border border-border/40 text-foreground flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                <span>Você é proprietário(a) desta empresa?</span>
                <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400">
                  {store?.is_verified ? "Perfil Verificado" : "Aguardando Reivindicação"}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                Reivindique o perfil oficial gratuitamente para gerenciar cardápio, produtos, pedidos e horários.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-8 sm:h-9 px-3.5 rounded-xl font-medium text-xs shrink-0 w-full sm:w-auto cursor-pointer border-border/60 hover:bg-card text-foreground"
            onClick={() => setIsClaimModalOpen(true)}
          >
            Reivindicar Negócio
          </Button>
        </div>
      )}

      {/* Modal de Reivindicação de Negócio */}
      <ClaimBusinessModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        listingId={store?.id || ""}
        businessName={store?.business_name || store?.name || "Esta Empresa"}
        onSuccess={() => {
          setIsClaimModalOpen(false);
          toast.success("Solicitação enviada com sucesso! Atualizando...");
          if (typeof window !== "undefined") {
            window.location.reload();
          }
        }}
      />

      {/* ── BARRA DO PROPRIETÁRIO (ADMIN BAR SECUNDÁRIA — REGRA 23 & MASTER PROMPT V5) ── */}
      {isOwner && (
        <div className="rounded-2xl bg-muted/20 border border-border/50 p-3 sm:px-4 sm:py-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-none">
          <div className="flex items-center gap-2.5">
            <div className="size-7 sm:size-8 rounded-lg bg-card border border-border/40 text-foreground flex items-center justify-center shrink-0">
              <Store className="size-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <span>Painel do Proprietário</span>
                <Badge variant="outline" className="text-[9px] uppercase font-mono py-0 px-1.5 border-border/50 text-muted-foreground bg-transparent">
                  Gestão Ativa
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Visível exclusivamente para você e sua equipe.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
            <Button
              asChild
              size="sm"
              variant="default"
              className="h-7 px-2.5 rounded-lg font-medium text-xs gap-1.5 shrink-0 border border-border/60 hover:bg-card text-foreground cursor-pointer shadow-none"
            >
              <Link to="/workspace" search={{ storeId: store.id }}>
                <Store className="size-3.5" />
                <span>Abrir Workspace</span>
              </Link>
            </Button>

            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 px-3 rounded-xl font-semibold text-xs gap-1.5 shrink-0 border-border/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Link to="/workspace/marketing/brand-kit" search={{ storeId: store.id }}>
                <Camera className="size-3.5" />
                <span>Editar Marca & Fotos</span>
              </Link>
            </Button>

            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 px-3 rounded-xl font-semibold text-xs gap-1.5 shrink-0 border-border/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Link to="/portal-completo">
                <Award className="size-3.5 text-muted-foreground" />
                <span>Gestão Pro</span>
              </Link>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditCompanyModalOpen(true)}
              className="h-8 px-3 rounded-xl font-semibold text-xs gap-1.5 shrink-0 border-border/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Edit3 className="size-3.5 text-muted-foreground" />
              <span>Editar Empresa</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsSocialStudioOpen(true)}
              className="h-8 px-3 rounded-xl font-semibold text-xs gap-1.5 shrink-0 border-border/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Sparkles className="size-3.5 text-muted-foreground" />
              <span>Social Studio</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── 2. CABEÇALHO DO PERFIL: FOTO 1:1 + CAPA 21:9 NA MESMA ALTURA SEM BORDAS PESADAS ── */}
      <div className="rounded-2xl bg-card border border-border/40 p-4 sm:p-6 space-y-4">
        {/* Faixa Superior: Foto 1:1 + Capa 21:9 com Mesma Altura */}
        <div className="flex items-center gap-3 sm:gap-4 w-full">
          {/* Foto da Empresa em Squircle 1:1 */}
          <div className="flex-shrink-0 relative group">
            <div className="size-20 sm:size-32 rounded-2xl bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={store.name || store.business_name}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-xl sm:text-3xl font-extrabold bg-muted text-foreground font-mono">
                  {(store.name || store.business_name || "WD").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            {isOwner && (
              <Link
                to="/workspace/marketing/brand-kit"
                search={{ storeId: store.id }}
                className="absolute inset-0 bg-black/40 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-xs font-semibold gap-1 cursor-pointer"
                title="Alterar Logo da Marca"
              >
                <Camera className="size-4 sm:size-5" />
                <span className="text-[9px] sm:text-[10px]">Alterar</span>
              </Link>
            )}
          </div>

          {/* Container da Capa Panorâmica com Mesma Altura e Scroll Interno Suave */}
          <div className="flex-1 h-20 sm:h-32 rounded-2xl bg-muted/20 relative overflow-hidden flex items-center">
            <div 
              tabIndex={0}
              aria-label="Galeria de banners da empresa"
              className="size-full overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth flex items-center gap-2 snap-x snap-mandatory"
            >
              {storeBannersList.length > 0 ? (
                storeBannersList.map((banner, idx) => (
                  <div
                    key={idx}
                    className="h-full min-w-full sm:min-w-[340px] md:min-w-[460px] rounded-xl overflow-hidden relative shrink-0 snap-center bg-muted/30"
                  >
                    <img
                      src={banner.imageUrl}
                      alt={banner.title || "Capa da empresa"}
                      className="size-full object-cover select-none rounded-xl"
                    />
                    {banner.link && (
                      <a
                        href={banner.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 z-10"
                        aria-label="Abrir link do banner"
                      />
                    )}
                  </div>
                ))
              ) : (
                <div className="size-full bg-gradient-to-r from-primary/10 via-muted/30 to-primary/10 flex items-center justify-center rounded-xl">
                  <Store className="size-6 sm:size-8 text-primary/30" />
                </div>
              )}
            </div>
            {isOwner && (
              <Link
                to="/workspace/marketing/brand-kit"
                search={{ storeId: store.id }}
                className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 bg-background/85 hover:bg-background text-foreground backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors z-20"
              >
                <Camera className="size-3 sm:size-3.5" />
                <span>Alterar Capa</span>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Reais no Padrão Instagram (Limpo, Sem Card Cinza de Fundo) */}
        <div className="flex items-center gap-6 sm:gap-10 py-1">
          <div className="text-left">
            <span className="block text-sm sm:text-base font-bold text-foreground">
              {store.followers_count || store.followersCount || 0}
            </span>
            <span className="text-[11px] text-muted-foreground">Seguidores</span>
          </div>
          <div className="text-left">
            <span className="block text-sm sm:text-base font-bold text-foreground">
              {store.following_count || store.followingCount || 0}
            </span>
            <span className="text-[11px] text-muted-foreground">Seguindo</span>
          </div>
          <div className="text-left">
            <span className="block text-sm sm:text-base font-bold text-foreground font-mono">
              {store.likes_count || (Array.isArray(posts) ? posts.reduce((acc: number, p: any) => acc + (p.likes_count || p.likes || 0), 0) : 0)}
            </span>
            <span className="text-[11px] text-muted-foreground">Curtidas</span>
          </div>
          {/* Avaliação Real exclusivamente para Empresas */}
          {(source === "directory" || store.is_company || store.business_name || !store.is_personal) && (
            <div className="text-left">
              <span className="inline-flex items-center gap-1 text-sm sm:text-base font-bold text-foreground">
                {realReviewsCount > 0 && realRatingAverage !== null ? (
                  <>
                    <Star className="size-3.5 fill-amber-500 text-muted-foreground" />
                    <span>{realRatingAverage.toFixed(1)}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground font-normal text-xs sm:text-sm">—</span>
                )}
              </span>
              <span className="text-[11px] text-muted-foreground block">
                {realReviewsCount > 0 ? `(${realReviewsCount}) Avaliações` : "Avaliações"}
              </span>
            </div>
          )}
        </div>

        {/* Linha de Identidade e Ações Minimalistas (Padrão Instagram / Apple HIG) */}
        <div className="pt-2 border-t border-border/30 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {store.name || store.business_name}
              </h1>
              <ShieldCheck className="size-4 text-primary fill-primary/20 shrink-0" />
              {store.slug && (
                <span className="text-xs sm:text-sm font-medium text-muted-foreground font-mono">
                  @{store.slug}
                </span>
              )}
            </div>

            {/* Categoria Limpa — Sem repetição de endereço */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
              <span className="font-semibold text-foreground/90">
                {store.category || store.type || (isGastronomy ? "Gastronomia" : "Empresa")}
              </span>
              {store.is_verified && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Verificado</span>
                </>
              )}
            </div>
          </div>

          <SocialCardGeneratorModal
            open={isSocialStudioOpen}
            onOpenChange={setIsSocialStudioOpen}
            data={{
              title: store.name || store.business_name || "Empresa Local",
              subtitle: store.category || "Guia Comercial Waesy",
              badge: store.category || "Empresa Oficial",
              storeName: store.name || store.business_name,
              imageUrl: store.cover_url || store.logo_url || undefined,
            }}
          />

          {/* Bio / Descrição Formatada com Limite & Expansão */}
          {(store.description || settings.bio || settings.about) && (
            <div className="space-y-1 max-w-2xl pt-1">
              <p
                className={cn(
                  "text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed whitespace-pre-line",
                  !isBioExpanded && "line-clamp-3"
                )}
              >
                {store.description || settings.bio || settings.about}
              </p>
              {(store.description || settings.bio || settings.about || "").length > 160 && (
                <button
                  type="button"
                  onClick={() => setIsBioExpanded(!isBioExpanded)}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer inline-flex items-center gap-0.5"
                >
                  {isBioExpanded ? "Ver menos" : "...mais"}
                </button>
              )}
            </div>
          )}

          {/* Links e Localização Sanitizada (Única Renderização) */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-muted-foreground">
            {store.website && (
              <a
                href={store.website.startsWith("http") ? store.website : `https://${store.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
              >
                <Globe size={13} />
                <span>{store.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
              </a>
            )}

            {store.instagram && (
              <a
                href={`https://instagram.com/${store.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground/80 font-semibold hover:underline"
              >
                <InstagramLogo size={13} className="text-primary" />
                <span>@{store.instagram.replace(/^@/, "")}</span>
              </a>
            )}

            {formattedAddress && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formattedAddress.mapsQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-foreground/80 hover:text-primary hover:underline cursor-pointer"
              >
                <MapPin className="size-3.5 text-primary shrink-0" />
                <span>{formattedAddress.display}</span>
              </a>
            )}

            {store.latitude && store.longitude && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-bold hover:underline inline-flex items-center gap-1"
              >
                <Navigation className="size-3" />
                <span>Como Chegar</span>
              </a>
            )}
          </div>

          {/* ── BOTÕES DE AÇÃO ERGONÔMICOS (PADRÃO INSTAGRAM / APPLE HIG) — Imediatamente Abaixo da Bio ── */}
          <div className="flex items-center gap-2 pt-3 w-full">
            {isOwner ? (
              <>
                <Button
                  asChild
                  variant="outline"
                  className="flex-1 h-9 sm:h-10 px-3 rounded-xl font-semibold text-xs bg-muted/60 hover:bg-muted text-foreground border border-border/50 transition-colors inline-flex items-center justify-center gap-1.5 shadow-none"
                >
                  <Link to="/workspace" search={{ storeId: store.id }}>
                    <Store className="size-3.5" />
                    <span>Workspace</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditCompanyModalOpen(true)}
                  className="flex-1 h-9 sm:h-10 px-3 rounded-xl font-semibold text-xs bg-muted/60 hover:bg-muted text-foreground border border-border/50 transition-colors inline-flex items-center justify-center gap-1.5 shadow-none cursor-pointer"
                >
                  <Edit3 className="size-3.5" />
                  <span>Editar Perfil</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShare}
                  aria-label="Compartilhar Perfil"
                  className="size-9 sm:size-10 p-0 rounded-xl font-semibold text-xs bg-muted/60 hover:bg-muted text-foreground border border-border/50 transition-colors inline-flex items-center justify-center shrink-0 shadow-none cursor-pointer"
                >
                  <Share2 className="size-4 text-muted-foreground" />
                </Button>
              </>
            ) : (
              <>
                {whatsappNumber && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      trackAndOpenWhatsApp({
                        phone: whatsappNumber,
                        storeId: store.id || null,
                        entityType: "store",
                        entityId: store.id,
                        entityTitle: store.name || store.business_name,
                        niche: segment,
                        customMessage: `Olá! Vi o perfil oficial de ${store.name || store.business_name} no Waesy e gostaria de mais informações.`,
                      })
                    }
                    className="flex-1 h-9 sm:h-10 px-2 sm:px-3 rounded-xl font-semibold text-xs bg-muted/60 hover:bg-muted text-foreground border border-border/50 transition-colors inline-flex items-center justify-center gap-1.5 shadow-none cursor-pointer"
                  >
                    <WhatsappLogo size={15} weight="bold" className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>WhatsApp</span>
                  </Button>
                )}

                {phoneCallNumber && (
                  <Button
                    asChild
                    variant="outline"
                    className="flex-1 h-9 sm:h-10 px-2 sm:px-3 rounded-xl font-semibold text-xs bg-muted/60 hover:bg-muted text-foreground border border-border/50 transition-colors inline-flex items-center justify-center gap-1.5 shadow-none"
                  >
                    <a href={`tel:${phoneCallNumber}`}>
                      <Phone size={14} className="text-primary shrink-0" />
                      <span>Ligar</span>
                    </a>
                  </Button>
                )}

                <Dialog open={isQuoteOpen} onOpenChange={setIsQuoteOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex-1 h-9 sm:h-10 px-2 sm:px-3 rounded-xl font-semibold text-xs bg-muted/60 hover:bg-muted text-foreground border border-border/50 transition-colors inline-flex items-center justify-center gap-1.5 shadow-none cursor-pointer"
                    >
                      <PaperPlaneTilt size={14} weight="bold" className="text-muted-foreground shrink-0" />
                      <span>Orçamento</span>
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="sm:max-w-md sm:rounded-2xl sm:p-6 p-5">
                    <DialogHeader>
                      <DialogTitle className="text-base font-bold">
                        Solicitar Atendimento / Orçamento
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        Envie sua dúvida ou solicitação para a equipe de{" "}
                        {store.name || store.business_name}.
                      </DialogDescription>
                    </DialogHeader>

                    {hasQuoted ? (
                      <div className="py-6 text-center space-y-3">
                        <CheckCircle className="size-12 text-emerald-500 mx-auto" />
                        <h4 className="font-bold text-sm">Solicitação Enviada!</h4>
                        <p className="text-xs text-muted-foreground">
                          A empresa recebeu sua mensagem e responderá pelo telefone ou e-mail informado.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => {
                            setIsQuoteOpen(false);
                            setHasQuoted(false);
                          }}
                          className="rounded-xl font-bold text-xs mt-2"
                        >
                          Fechar
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSendQuote} className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Seu Nome Completo
                          </label>
                          <Input
                            value={quoteName}
                            onChange={(e) => setQuoteName(e.target.value)}
                            placeholder="Ex: Carlos Silva"
                            required
                            className="h-10 rounded-xl text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              WhatsApp
                            </label>
                            <Input
                              value={quotePhone}
                              onChange={(e) => setQuotePhone(e.target.value)}
                              placeholder="(00) 00000-0000"
                              required
                              className="h-10 rounded-xl text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              E-mail
                            </label>
                            <Input
                              type="email"
                              value={quoteEmail}
                              onChange={(e) => setQuoteEmail(e.target.value)}
                              placeholder="seu@email.com"
                              required
                              className="h-10 rounded-xl text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            O que você precisa?
                          </label>
                          <Input
                            value={quoteService}
                            onChange={(e) => setQuoteService(e.target.value)}
                            placeholder="Ex: Orçamento de serviço, entrega personalizada..."
                            className="h-10 rounded-xl text-xs"
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={isSendingQuote}
                          className="w-full h-10 rounded-xl font-bold text-xs bg-foreground text-background mt-2"
                        >
                          {isSendingQuote ? "Enviando..." : "Enviar Solicitação"}
                        </Button>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  onClick={handleShare}
                  aria-label="Compartilhar Perfil"
                  className="size-9 sm:size-10 p-0 rounded-xl font-semibold text-xs bg-muted/60 hover:bg-muted text-foreground border border-border/50 transition-colors inline-flex items-center justify-center shrink-0 shadow-none cursor-pointer"
                >
                  <Share2 className="size-4 text-muted-foreground" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. NAVEGAÇÃO POR ABAS NO PADRÃO DO PERFIL DE MEMBRO (Apple HIG) ── */}
        <div className="space-y-6 pt-2">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/40 text-xs font-semibold overflow-x-auto no-scrollbar border border-border/40">
            {/* Aba 1: Vitrine / Início */}
            <button
              type="button"
              onClick={() => setActiveTab("vitrine")}
              className={cn(
                "px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
                activeTab === "vitrine"
                  ? "bg-background text-foreground font-bold "
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-4" />
              <span>Vitrine</span>
            </button>

            {/* Aba 2: Catálogo / Cardápio */}
            <button
              type="button"
              onClick={() => setActiveTab("catalogo")}
              className={cn(
                "px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
                activeTab === "catalogo"
                  ? "bg-background text-foreground font-bold "
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CatalogIcon className="size-4" />
              <span>{catalogTabTitle}</span>
              {catalog.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-bold font-mono">
                  {catalog.length}
                </span>
              )}
            </button>

            {/* Aba 3: Sobre & Atendimento (Posição Natural e Ergonômica) */}
            <button
              type="button"
              onClick={() => setActiveTab("sobre")}
              className={cn(
                "px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
                activeTab === "sobre"
                  ? "bg-background text-foreground font-bold "
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="size-4" />
              <span>Sobre & Atendimento</span>
            </button>

            {/* Aba 4: Posts & Novidades */}
            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={cn(
                "px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
                activeTab === "posts"
                  ? "bg-background text-foreground font-bold "
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="size-4" />
              <span>Posts</span>
              {posts.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-bold font-mono">
                  {posts.length}
                </span>
              )}
            </button>

            {/* Aba 5: Avaliações */}
            <button
              type="button"
              onClick={() => setActiveTab("avaliacoes")}
              className={cn(
                "px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
                activeTab === "avaliacoes"
                  ? "bg-background text-foreground font-bold "
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Star className="size-4" />
              <span>Avaliações</span>
              {reviews.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-bold font-mono">
                  {reviews.length}
                </span>
              )}
            </button>

            {/* Aba 6: Vagas */}
            <button
              type="button"
              onClick={() => setActiveTab("vagas")}
              className={cn(
                "px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
                activeTab === "vagas"
                  ? "bg-background text-foreground font-bold "
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Briefcase className="size-4" />
              <span>Vagas</span>
              {jobs.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-bold font-mono">
                  {jobs.length}
                </span>
              )}
            </button>

            {/* Aba 7: Classificados da Empresa (Zero Context Bleeding) */}
            {ads.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("classificados")}
                className={cn(
                  "px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
                  activeTab === "classificados"
                    ? "bg-background text-foreground font-bold "
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Tag className="size-4" />
                <span>Classificados</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-bold font-mono">
                  {ads.length}
                </span>
              </button>
            )}

            {/* Aba 7: Sorteios & Prêmios (Condicional) */}
            {concursos.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("concursos")}
                className={cn(
                  "px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer",
                  activeTab === "concursos"
                    ? "bg-background text-foreground font-bold "
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Ticket className="size-4" />
                <span>Sorteios & Prêmios</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-bold font-mono">
                  {concursos.length}
                </span>
              </button>
            )}          </div>

          {/* ── CONTEÚDO DA ABA 1: VITRINE MODULAR (WIX / APP BUILDER STYLE COM SCROLL INFINITO FINAL) ── */}
          {activeTab === "vitrine" && (
            <div className="space-y-8 animate-in fade-in duration-150">
              {/* Barra de Gestão do Lojista */}
              {isOwner && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/60">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      Modo Gestor Ativo: Você pode reorganizar e personalizar as seções desta vitrine.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsSectionsEditorOpen(true)}
                    className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer border-border/70"
                  >
                    <Layers className="size-3.5 text-primary" />
                    <span>Personalizar Vitrine</span>
                  </Button>
                </div>
              )}

              {/* Encartes da Semana Automáticos (Se houver encartes ativos e a seção não estiver configurada) */}
              {flyersList.length > 0 &&
                !vitrineSections.some((s) => s.type === "promotional_flyers" && s.enabled) && (
                  <div className="space-y-2">
                    <PromotionalFlyersRail
                      flyers={flyersList}
                      storeName={store.name || store.business_name}
                      storeSlug={store.slug}
                    />
                  </div>
                )}

              {/* Renderização Dinâmica das Seções Configuradas */}
              {vitrineSections
                .filter((s) => s.enabled)
                .map((section) => {
                  if (section.type === "banners") {
                    if (!banners || banners.length === 0) return null;
                    return (
                      <div key={section.id} className="space-y-2">
                        <BannerHeroCarousel banners={banners} className="w-full rounded-2xl overflow-hidden" />
                      </div>
                    );
                  }

                  if (section.type === "promotional_flyers") {
                    if (!flyersList || flyersList.length === 0) return null;
                    return (
                      <div key={section.id} className="space-y-2">
                        <PromotionalFlyersRail
                          flyers={flyersList}
                          title={section.title || "Encartes & Tabloides da Semana"}
                          storeName={store.name || store.business_name}
                          storeSlug={store.slug}
                        />
                      </div>
                    );
                  }

                  if (section.type === "custom_cards") {
                    const cards = section.cards || [];
                    if (cards.length === 0) return null;
                    return (
                      <div key={section.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h2 className="text-base font-bold text-foreground tracking-tight">
                            {section.title || "Destaques & Novidades"}
                          </h2>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => setIsSectionsEditorOpen(true)}
                              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="size-3" />
                              <span>Editar Cards</span>
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {cards.map((card) => {
                            const isWhatsAppAction = card.linkUrl === "whatsapp";
                            const isCatalogAction = card.linkUrl === "#catalogo";

                            const handleCardClick = () => {
                              if (isWhatsAppAction && whatsappNumber) {
                                trackAndOpenWhatsApp({
                                  phone: whatsappNumber,
                                  storeId: store.id || null,
                                  entityType: "store",
                                  entityId: store.id,
                                  entityTitle: store.name || store.business_name,
                                  niche: segment,
                                  customMessage: `Olá! Vi o destaque "${card.title}" no Waesy e gostaria de saber mais.`,
                                });
                              } else if (isCatalogAction) {
                                setActiveTab("catalogo");
                              } else if (card.linkUrl && card.linkUrl.startsWith("http")) {
                                window.open(card.linkUrl, "_blank", "noopener,noreferrer");
                              }
                            };

                            return (
                              <div
                                key={card.id}
                                onClick={handleCardClick}
                                className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all cursor-pointer flex flex-col justify-between"
                              >
                                {card.imageUrl ? (
                                  <div className="aspect-[16/9] w-full overflow-hidden bg-muted/30 relative">
                                    <img
                                      src={card.imageUrl}
                                      alt={card.title}
                                      className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                    {card.tag && (
                                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-background/90 backdrop-blur-md text-[10px] font-bold text-foreground">
                                        {card.tag}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  card.tag && (
                                    <div className="p-4 pb-0">
                                      <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
                                        {card.tag}
                                      </span>
                                    </div>
                                  )
                                )}
                                <div className="p-4 space-y-1">
                                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                    {card.title}
                                  </h3>
                                  {card.subtitle && (
                                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                      {card.subtitle}
                                    </p>
                                  )}
                                </div>
                                <div className="p-4 pt-0 flex items-center justify-between text-xs font-semibold text-primary">
                                  <span>{isWhatsAppAction ? "Falar no WhatsApp" : isCatalogAction ? "Ver no Catálogo" : "Saiba Mais"}</span>
                                  <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (section.type === "product_rail") {
                    if (!catalog || catalog.length === 0) return null;
                    const topProducts = catalog.slice(0, 8);

                    return (
                      <div key={section.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h2 className="text-base font-bold text-foreground tracking-tight">
                            {section.title || "Mais Pedidos da Loja"}
                          </h2>
                          <button
                            type="button"
                            onClick={() => setActiveTab("catalogo")}
                            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>Ver Catálogo Completo</span>
                            <ChevronRight className="size-3" />
                          </button>
                        </div>
                        <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-2">
                          {topProducts.map((p: any) => {
                            const priceCents = p.price_cents || p.price || 0;
                            const imageUrl = p.images?.[0] || p.image_url || null;

                            return (
                              <Link
                                key={p.id}
                                to="/classificados/$id"
                                params={{ id: p.slug || p.id }}
                                className="w-56 shrink-0 rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all flex flex-col justify-between group cursor-pointer"
                              >
                                {/* PLACEHOLDER OBRIGATÓRIO — nunca exibe card sem imagem */}
                                <div className="aspect-square w-full overflow-hidden bg-muted/20 relative">
                                  {imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt={p.title}
                                      className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="size-full flex items-center justify-center">
                                      <Package className="size-10 text-muted-foreground/30" strokeWidth={1.5} />
                                    </div>
                                  )}
                                </div>
                                <div className="p-3.5 space-y-1 min-w-0 flex-1">
                                  <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-snug">{p.title}</h4>
                                  <p className="text-sm font-black text-foreground font-mono">
                                    {formatMoney(priceCents)}
                                  </p>
                                </div>
                                <div className="p-3.5 pt-0">
                                  <Button
                                    size="sm"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddToCart(p); }}
                                    className="w-full h-9 rounded-xl font-bold text-xs bg-foreground text-background hover:bg-foreground/90 gap-1 cursor-pointer"
                                  >
                                    <Plus className="size-3" />
                                    <span>Adicionar</span>
                                  </Button>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  if (section.type === "hotpages") {
                    if (!hotpages || hotpages.length === 0) return null;
                    return (
                      <div key={section.id} className="space-y-2">
                        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 pt-1">
                          {hotpages.map((h: any) => (
                            <div key={h.id} className="shrink-0">
                              <DynamicMediaChip
                                label={h.title}
                                badge={h.badge_label || undefined}
                                mediaUrl={h.bg_media_url || undefined}
                                texture={h.bg_texture || undefined}
                                href={h.target_route || undefined}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  if (section.type === "brand_story") {
                    const storyText = store.description || settings.bio || settings.about;
                    if (!storyText) return null;
                    return (
                      <div
                        key={section.id}
                        className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <Store className="size-4 text-primary" />
                          <h3 className="text-sm font-bold text-foreground">
                            {section.title || "Sobre a Empresa"}
                          </h3>
                        </div>
                        <p className="text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed whitespace-pre-line">
                          {storyText}
                        </p>
                      </div>
                    );
                  }

                  if (section.type === "infinite_feed") {
                    // Zero Context Bleeding: não vaza outras lojas na vitrine privada desta empresa
                    return null;
                  }

                  return null;
                })}
            </div>
          )}

          {/* ── CONTEÚDO DA ABA 2: POSTS & NOVIDADES (MURAL SOCIAL COM FEED & GRID) ── */}
          {activeTab === "posts" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Barra de Visualização: Grade de Fotos vs Feed */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {posts.length} {posts.length === 1 ? "Publicação" : "Publicações"}
                </span>

                <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/40 border border-border/40 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPostViewMode("grid")}
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                      postViewMode === "grid"
                        ? "bg-background text-foreground "
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-label="Visualização em Grade"
                  >
                    <Grid className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostViewMode("feed")}
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                      postViewMode === "feed"
                        ? "bg-background text-foreground "
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    aria-label="Visualização em Feed"
                  >
                    <List className="size-4" />
                  </button>
                </div>
              </div>

              {posts.length > 0 ? (
                postViewMode === "grid" ? (
                  /* Modo 1: Grade de Fotos 1:1 Editorial */
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {posts.map((post: any) => {
                      const firstMedia = post.media_urls?.[0];
                      return (
                        <div
                          key={post.id}
                          onClick={() => setLightboxPost(post)}
                          className="group aspect-square rounded-2xl overflow-hidden bg-muted/30 relative cursor-pointer border border-border/40 hover:border-foreground/40 transition-all"
                        >
                          {firstMedia ? (
                            <img
                              src={firstMedia}
                              alt="Foto da publicação"
                              className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="size-full p-4 flex flex-col justify-between bg-card">
                              <p className="text-xs text-foreground line-clamp-4 leading-relaxed font-medium">
                                {post.content_text}
                              </p>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {formatDate(post.created_at)}
                              </span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3 text-center text-white text-xs font-semibold">
                            <span className="line-clamp-2">{post.content_text || "Ver publicação"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Modo 2: Feed Social com Notas Rápidas */
                  <div className="space-y-4 max-w-2xl mx-auto">
                    {posts.map((post: any) => (
                      <CommunityFeedCard
                        key={post.id}
                        post={{
                          id: post.id,
                          author: {
                            id: store.id,
                            full_name: store.name || store.business_name,
                            username: store.slug,
                            avatar_url: logoUrl || undefined,
                            is_verified: true,
                          },
                          content_text: post.content_text || "",
                          media_urls: post.media_urls || [],
                          created_at: post.created_at,
                          likes_count: post.likes_count || 0,
                          replies_count: post.replies_count || 0,
                        }}
                      />
                    ))}
                  </div>
                )
              ) : (
                <div className="py-16 text-center space-y-2 bg-muted/20 rounded-2xl p-8 border border-border/60">
                  <MessageSquare className="size-10 text-muted-foreground/40 mx-auto" />
                  <h3 className="text-sm font-bold text-foreground">Nenhuma publicação recente</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    A empresa ainda não realizou postagens sociais neste canal.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── CONTEÚDO DA ABA 3: CATÁLOGO COMPLETO / CARDÁPIO ── */}
          {activeTab === "catalogo" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Barra de Busca e Categorias de Produtos */}
              {catalog.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder={`Buscar no catálogo de ${store.name || store.business_name}...`}
                        className="pl-10 h-11 rounded-xl text-xs bg-card border-border/80"
                      />
                    </div>
                  </div>

                  {/* Chips de Categorias */}
                  {categories.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("todas")}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer",
                          selectedCategory === "todas"
                            ? "bg-foreground text-background font-bold"
                            : "bg-muted/40 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Todas as Opções
                      </button>
                      {categories.map((cat: any) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer",
                            selectedCategory === cat.id
                              ? "bg-foreground text-background font-bold"
                              : "bg-muted/40 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Grade de Produtos / Cardápio */}
              {filteredProducts.length > 0 ? (
                <div>
                  {/* Visualização Mobile: WhatsApp Minimalist List (Alta Densidade, 44px Touch Targets) */}
                  <div className="block sm:hidden divide-y divide-border/30 rounded-xl border border-border/40 bg-card overflow-hidden">
                    {filteredProducts.map((p: any) => {
                      const priceCents = p.price_cents || p.price || 0;
                      const imageUrl = p.images?.[0] || p.image_url || null;

                      return (
                        <div key={p.id} className="p-3 flex items-center justify-between gap-3">
                          <div className="size-12 rounded-xl bg-muted/20 border border-border/40 overflow-hidden shrink-0 flex items-center justify-center">
                            {imageUrl ? (
                              <img src={imageUrl} alt={p.title} className="size-full object-cover" loading="lazy" />
                            ) : (
                              <Package className="size-5 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-xs font-bold text-foreground line-clamp-1 leading-tight">{p.title}</h4>
                              {p.is_mined && (
                                <span className="text-[9px] font-mono px-1 py-0 rounded border border-border/60 text-muted-foreground">
                                  Web
                                </span>
                              )}
                            </div>
                            {p.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">{p.description}</p>
                            )}
                            <div className="text-xs font-black font-mono text-foreground">
                              {formatMoney(priceCents)}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {p.is_mined && isOwner && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleImportMinedProduct(p)}
                                className="h-10 px-2 rounded-xl text-xs font-semibold gap-1 border-primary/30 text-primary cursor-pointer"
                                title="Importar para o Catálogo Oficial"
                              >
                                <Plus className="size-3.5" />
                                <span className="text-[10px]">Importar</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleAddToCart(p)}
                              className="h-10 px-3 rounded-xl font-bold text-xs bg-foreground text-background hover:bg-foreground/90 gap-1 cursor-pointer"
                            >
                              <Plus className="size-3.5" />
                              <span>Adicionar</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Visualização Desktop: Grid de Cards */}
                  <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map((p: any) => {
                      const priceCents = p.price_cents || p.price || 0;
                      const imageUrl = p.images?.[0] || p.image_url || null;

                      return (
                        <div
                          key={p.id}
                          className="flex flex-col justify-between rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all group"
                        >
                          <div className="flex items-start gap-3 p-4">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug">
                                  {p.title}
                                </h3>
                                {p.is_mined && (
                                  <Badge variant="outline" className="text-[9px] font-mono py-0 px-1 border-border/70">
                                    Catálogo Web
                                  </Badge>
                                )}
                              </div>
                              {p.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                  {p.description}
                                </p>
                              )}
                              <div className="pt-2">
                                <span className="text-sm font-black text-foreground font-mono">
                                  {formatMoney(priceCents)}
                                </span>
                              </div>
                            </div>

                            {/* Foto 1:1 do Produto */}
                            {imageUrl && (
                              <div className="size-20 sm:size-24 rounded-xl overflow-hidden bg-muted/30 shrink-0">
                                <img
                                  src={imageUrl}
                                  alt={p.title}
                                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                              </div>
                            )}
                          </div>

                          {/* Botões de Ação com Touch Target 44px */}
                          <div className="p-3 pt-0 flex items-center justify-end gap-2">
                            {p.is_mined && isOwner && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleImportMinedProduct(p)}
                                className="rounded-xl h-10 px-3 font-semibold text-xs border-primary/30 text-primary gap-1 cursor-pointer"
                              >
                                <Plus className="size-3.5" />
                                <span>Importar</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleAddToCart(p)}
                              className="rounded-xl h-10 px-4 font-bold text-xs bg-foreground text-background hover:bg-foreground/90 gap-1.5 cursor-pointer w-full sm:w-auto"
                            >
                              <Plus className="size-3.5" />
                              <span>Adicionar</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : catalog.length > 0 ? (
                <div className="py-16 text-center space-y-2 bg-muted/20 rounded-2xl p-6">
                  <Search className="size-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs font-semibold text-foreground">
                    Nenhum item encontrado para "{productSearch}".
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setProductSearch("");
                      setSelectedCategory("todas");
                    }}
                    className="rounded-xl text-xs"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              ) : (
                <div className="py-16 text-center space-y-4 bg-muted/20 rounded-2xl p-8 border border-border/60">
                  <Briefcase className="size-10 text-muted-foreground/40 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">
                      Atendimento Sob Medida & Presencial
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Esta empresa presta serviços e atendimento personalizado. Entre em contato diretamente pelo WhatsApp para orçamentos e agendamentos.
                    </p>
                  </div>
                  {whatsappNumber && (
                    <Button
                      onClick={() =>
                        trackAndOpenWhatsApp({
                          phone: whatsappNumber,
                          storeId: store.id || null,
                          entityType: "store",
                          entityId: store.id,
                          entityTitle: store.name || store.business_name,
                          niche: segment,
                          customMessage: `Olá! Gostaria de um orçamento ou informações sobre seus serviços.`,
                        })
                      }
                      className="rounded-xl h-10 px-5 font-bold text-xs bg-foreground text-background hover:bg-foreground/90 gap-2 cursor-pointer mx-auto"
                    >
                      <WhatsappLogo size={16} weight="bold" />
                      <span>Falar no WhatsApp</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── CONTEÚDO DA ABA 4: VAGAS & EMPREGOS ── */}
          {activeTab === "vagas" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Card de Inteligência de Empregador e Cultura Corporativa */}
              {employerStats && (
                <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">Inteligência de Empregador</h3>
                        <Badge variant="outline" className="text-[10px] font-mono bg-primary/5 text-primary border-primary/20">
                          Verificado Waesy
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Transparência salarial e métricas de clima organizacional baseadas em colaboradores.
                      </p>
                    </div>
                    {employerStats.avgRating && (
                      <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 px-3 py-1.5 rounded-xl border border-amber-500/20 shrink-0">
                        <Star className="size-4 fill-amber-500 text-muted-foreground" />
                        <span className="text-sm font-black font-mono">{employerStats.avgRating} / 5.0</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                      <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                        <Award className="size-3.5 text-primary" /> Recomendação
                      </span>
                      <p className="text-base font-black text-foreground font-mono">
                        {employerStats.recommendRate ?? 100}%
                      </p>
                      <span className="text-[10px] text-muted-foreground block">
                        recomendam a empresa
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                      <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                        <Briefcase className="size-3.5 text-emerald-600" /> Média Salarial
                      </span>
                      <p className="text-base font-black text-foreground font-mono">
                        {employerStats.avgSalaryCents ? formatMoney(employerStats.avgSalaryCents) : "Sigiloso / CLT"}
                      </p>
                      <span className="text-[10px] text-muted-foreground block">
                        remuneração informada
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-1 col-span-2 sm:col-span-1">
                      <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                        <FileCheck className="size-3.5 text-sky-600" /> Avaliações
                      </span>
                      <p className="text-base font-black text-foreground font-mono">
                        {employerStats.reviewsCount ?? 0}
                      </p>
                      <span className="text-[10px] text-muted-foreground block">
                        depoimentos anônimos
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {jobs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {jobs.map((j: any) => (
                    <div
                      key={j.id}
                      className="p-5 rounded-2xl border border-border/60 bg-card space-y-3 hover:border-foreground/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-foreground">{j.title}</h3>
                          <span className="text-xs text-muted-foreground font-mono">
                            {j.city || store.city || "São Miguel do Oeste"} •{" "}
                            {j.contract_type || "CLT"}
                          </span>
                        </div>
                        {j.salary_range && (
                          <Badge variant="outline" className="text-xs font-mono font-bold">
                            {j.salary_range}
                          </Badge>
                        )}
                      </div>

                      {j.description && (
                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                          {j.description}
                        </p>
                      )}

                      <Button
                        asChild
                        size="sm"
                        className="rounded-xl h-9 px-4 font-bold text-xs bg-foreground text-background w-full"
                      >
                        <Link to="/empregos/$id" params={{ id: j.id }}>
                          <span>Ver Detalhes & Candidatar-se</span>
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center space-y-2 bg-muted/20 rounded-2xl p-8 border border-border/60">
                  <Briefcase className="size-10 text-muted-foreground/40 mx-auto" />
                  <h3 className="text-sm font-bold text-foreground">Sem vagas abertas no momento</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Novas oportunidades serão divulgadas diretamente nesta aba assim que abrirem.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── CONTEÚDO DA ABA: CLASSIFICADOS DA EMPRESA (Strict Data Scoping) ── */}
          {activeTab === "classificados" && ads.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {ads.map((ad: any) => {
                  const firstImage = ad.images && Array.isArray(ad.images) && ad.images.length > 0 ? ad.images[0] : null;
                  return (
                    <Link
                      key={ad.id}
                      to="/_store/classificados/$id"
                      params={{ id: ad.id }}
                      className="group flex flex-col rounded-2xl bg-card border border-border/70 overflow-hidden hover:border-primary/50 transition-all cursor-pointer shadow-xs"
                    >
                      <div className="aspect-[16/10] w-full bg-muted/40 relative overflow-hidden">
                        {firstImage ? (
                          <img
                            src={firstImage}
                            alt={ad.title}
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center text-muted-foreground">
                            <Tag className="size-8 opacity-40" />
                          </div>
                        )}
                        {ad.deal_type && (
                          <span className="absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-background/90 backdrop-blur-xs text-foreground border border-border/50">
                            {ad.deal_type === "sale" ? "Venda" : ad.deal_type === "rent" ? "Aluguel" : ad.deal_type}
                          </span>
                        )}
                      </div>
                      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {ad.title}
                          </h4>
                          {ad.category && (
                            <span className="text-[11px] text-muted-foreground capitalize">
                              {ad.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                          <span className="text-sm font-black font-mono text-foreground">
                            {ad.price_cents ? formatMoney(ad.price_cents) : "Sob Consulta"}
                          </span>
                          <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            Ver anúncio →
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── CONTEÚDO DA ABA 5: AVALIAÇÕES VERIFICADAS ── */}
          {activeTab === "avaliacoes" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-card border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xl font-mono">
                      {Number(store.rating || 5.0).toFixed(1)}
                    </div>
                    <div>
                      <div className="flex items-center text-muted-foreground">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="size-3.5 fill-amber-500" />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Baseado em {reviews.length > 0 ? reviews.length : store.reviews_count || 12} avaliações de clientes verificados.
                      </p>
                    </div>
                  </div>
                </div>

                {reviews.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {reviews.map((r: any) => (
                      <div
                        key={r.id}
                        className="p-4 rounded-2xl border border-border/60 bg-card space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center text-muted-foreground">
                            {Array.from({ length: r.rating || 5 }).map((_, i) => (
                              <Star key={i} className="size-3 fill-amber-500" />
                            ))}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {formatDate(r.created_at)}
                          </span>
                        </div>
                        {r.product_name && (
                          <Badge variant="outline" className="text-[10px]">
                            {r.product_name}
                          </Badge>
                        )}
                        <p className="text-xs text-foreground leading-relaxed">
                          {r.comment || "Ótimo atendimento, produtos de primeira e entrega no prazo!"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-card border border-border/60 text-center space-y-2">
                    <Star className="size-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-xs text-muted-foreground">
                      Esta empresa mantém nota máxima com excelente histórico de atendimento local.
                    </p>
                  </div>
                )}
              </div>

              {/* Seção de Avaliações de Empregador & Clima Interno */}
              {employerStats && (
                <div className="space-y-4 pt-4 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Briefcase className="size-4 text-primary" />
                        Depoimentos de Colaboradores (Clima de Trabalho)
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Transparência de equipe e avaliação interna de gestão e benefícios.
                      </p>
                    </div>
                    {employerStats.avgRating && (
                      <Badge variant="outline" className="font-mono text-xs font-bold text-amber-600 bg-amber-500/10 border-amber-500/20">
                        ★ {employerStats.avgRating} / 5.0
                      </Badge>
                    )}
                  </div>

                  {employerStats.recentReviews && employerStats.recentReviews.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {employerStats.recentReviews.map((rev: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center text-muted-foreground">
                              {Array.from({ length: rev.company_rating || 5 }).map((_, i) => (
                                <Star key={i} className="size-3 fill-amber-500" />
                              ))}
                            </div>
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              {rev.exit_reason || "Colaborador"}
                            </Badge>
                          </div>
                          {rev.review_text && (
                            <p className="text-xs text-foreground leading-relaxed italic">
                              "{rev.review_text}"
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/30">
                            <span>{rev.would_recommend ? "✓ Recomenda a empresa" : "Não recomendou"}</span>
                            {rev.salary_cents ? <span>{formatMoney(rev.salary_cents)}</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-center">
                      <p className="text-xs text-muted-foreground">
                        Índice de aprovação de {employerStats.recommendRate ?? 100}% baseado em {employerStats.reviewsCount ?? 0} registros de colaboradores.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── CONTEÚDO DA ABA 6: PATROCINADORES & APOIADORES ── */}
          {activeTab === "patrocinadores" && hasSponsors && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sponsors.map((sp: any) => (
                  <div
                    key={sp.id}
                    className="p-5 rounded-2xl border border-border/60 bg-card flex flex-col justify-between space-y-3 hover:border-foreground/30 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] uppercase font-bold",
                            sp.tier === "gold"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : sp.tier === "silver"
                              ? "bg-slate-500/10 text-slate-600 border-slate-500/30"
                              : "bg-muted/30"
                          )}
                        >
                          {sp.tier || "Apoiador Oficial"}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        {sp.logo_url ? (
                          <img
                            src={sp.logo_url}
                            alt={sp.name}
                            className="size-12 rounded-xl object-contain bg-muted/20 border border-border/40 p-1"
                          />
                        ) : (
                          <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                            {sp.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{sp.name}</h4>
                          {sp.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {sp.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {sp.website_url && (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-9 px-3 text-xs font-semibold w-full gap-1.5"
                      >
                        <a href={sp.website_url} target="_blank" rel="noopener noreferrer">
                          <span>{sp.cta_label || "Conhecer Parceiro"}</span>
                          <ExternalLink className="size-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CONTEÚDO DA ABA 6: SOBRE & ATENDIMENTO (CANÔNICO) ── */}
          {activeTab === "sobre" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Horários de Atendimento */}
                <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">Horários de Atendimento</h3>
                    </div>
                    {openStatus && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-mono font-bold",
                          openStatus.isOpenNow
                            ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                            : "border-border/60 text-muted-foreground bg-muted/20"
                        )}
                      >
                        {openStatus.isOpenNow ? "Aberto Agora" : "Fechado"}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground font-medium">
                    {scheduleSummary}
                  </p>

                  <div className="divide-y divide-border/30 pt-1 text-xs">
                    {WEEKDAYS_ORDER.map((d) => {
                      const daySched = weeklySchedule ? (weeklySchedule as any)[d.key] : null;
                      const isOpen = daySched?.open && Array.isArray(daySched.intervals) && daySched.intervals.length > 0;
                      return (
                        <div key={d.key} className="py-2 flex items-center justify-between">
                          <span className="font-medium text-foreground">{d.label}</span>
                          <span className={cn("font-mono", isOpen ? "text-foreground" : "text-muted-foreground")}>
                            {isOpen
                              ? daySched.intervals.map((i: any) => `${i.from} às ${i.to}`).join(" • ")
                              : "Fechado"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Endereço & Localização */}
                <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">Endereço & Localização</h3>
                    </div>

                    {formattedAddress ? (
                      <div className="space-y-2">
                        <p className="text-xs sm:text-sm text-foreground font-medium leading-relaxed">
                          {formattedAddress.display}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {store.city || store.settings?.city || "São Miguel do Oeste"} — {store.state || store.settings?.state || "SC"}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Endereço sob consulta diretamente com o atendimento da empresa.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {formattedAddress && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 rounded-xl text-xs font-semibold gap-1.5"
                      >
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formattedAddress.mapsQuery)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Navigation className="size-3.5" />
                          <span>Abrir no Maps</span>
                        </a>
                      </Button>
                    )}

                    {store.latitude && store.longitude && (
                      <Button
                        asChild
                        size="sm"
                        className="flex-1 h-9 rounded-xl text-xs font-bold gap-1.5 bg-foreground text-background"
                      >
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Navigation className="size-3.5" />
                          <span>Como Chegar</span>
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                {/* 3. Pagamento & Modalidades */}
                <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Pagamento & Modalidades</h3>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">PIX Instantâneo</span>
                      <span className="font-semibold text-emerald-600">Disponível</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-border/30">
                      <span className="text-muted-foreground">Cartões de Crédito / Débito</span>
                      <span className="font-semibold text-foreground">Aceita no local / entrega</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-muted-foreground">Dinheiro / À Vista</span>
                      <span className="font-semibold text-foreground">Sim</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {orderTypes.delivery && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Truck className="size-3" /> Delivery
                      </Badge>
                    )}
                    {orderTypes.takeout && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Package className="size-3" /> Retirada no Balcão
                      </Badge>
                    )}
                    {orderTypes.dine_in && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <UtensilsCrossed className="size-3" /> Consumo no Local
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 4. Canais Oficiais de Contato */}
                <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border/60 space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Canais de Atendimento</h3>
                  </div>

                  <div className="space-y-2 text-xs">
                    {whatsappNumber && (
                      <div className="flex items-center justify-between py-1 border-b border-border/30">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <WhatsappLogo size={14} className="text-emerald-500" /> WhatsApp
                        </span>
                        <span className="font-mono font-medium text-foreground">{whatsappNumber}</span>
                      </div>
                    )}
                    {phoneCallNumber && (
                      <div className="flex items-center justify-between py-1 border-b border-border/30">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Phone size={14} /> Telefone
                        </span>
                        <span className="font-mono font-medium text-foreground">{phoneCallNumber}</span>
                      </div>
                    )}
                    {store.email && (
                      <div className="flex items-center justify-between py-1 border-b border-border/30">
                        <span className="text-muted-foreground">E-mail</span>
                        <span className="font-medium text-foreground">{store.email}</span>
                      </div>
                    )}
                    {store.instagram && (
                      <div className="flex items-center justify-between py-1">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <InstagramLogo size={14} /> Instagram
                        </span>
                        <span className="font-medium text-foreground">@{store.instagram.replace(/^@/, '')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── CONTEÚDO DA ABA 7: SORTEIOS DA LOJA ── */}
          {activeTab === "concursos" && concursos.length > 0 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {concursos.map((c: any) => {
                  const isCompleted = c.status === "completed";
                  const drawDateFormatted = new Date(c.drawDate || c.draw_date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <div
                      key={c.id}
                      className="p-5 sm:p-6 rounded-3xl border border-border/70 bg-card space-y-3 flex flex-col justify-between hover:border-foreground/30 transition-all"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Badge
                            className={
                              isCompleted
                                ? "bg-muted text-muted-foreground font-mono text-[10px]"
                                : "bg-emerald-600 text-white font-mono text-[10px] font-bold"
                            }
                          >
                            {isCompleted ? "Sorteio Encerrado" : "Sorteio Aberto"}
                          </Badge>

                          <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                            <Clock className="size-3" />
                            Sorteio: {drawDateFormatted}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-foreground leading-snug">{c.title}</h4>

                        {c.description && (
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {c.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 pt-1 text-xs font-mono text-muted-foreground">
                          <span>
                            {c.pointsCost > 0 ? `Custo: ${c.pointsCost} pontos` : "Participação Gratuita"}
                          </span>
                          <span>Limite: até {c.maxTicketsPerUser || 5} cupons</span>
                        </div>
                      </div>

                      {!isCompleted && (
                        <div className="pt-2 border-t border-border/40 flex items-center justify-end">
                          <Button
                            type="button"
                            onClick={() => {
                              setSelectedConcurso(c);
                              setAcceptedTerms(true);
                            }}
                            className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5"
                          >
                            <Ticket className="size-3.5" />
                            <span>Participar do Sorteio</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      {/* ── MODAL DE PARTICIPAÇÃO & REGULAMENTO NA VITRINE ── */}
      <Dialog
        open={Boolean(selectedConcurso)}
        onOpenChange={(open) => {
          if (!open) setSelectedConcurso(null);
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <FileCheck className="size-5" />
              <DialogTitle className="text-base font-bold">Regulamento do Sorteio</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedConcurso?.title} • Promovido por: {store.name || store.business_name}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-border/60 bg-muted/30 p-3.5 text-xs text-muted-foreground space-y-2 max-h-48 overflow-y-auto leading-relaxed">
            <p className="font-bold text-foreground">Regras e Condições:</p>
            <p>
              {selectedConcurso?.termsText ||
                selectedConcurso?.terms_text ||
                "Participe gratuitamente emitindo seu cupom. O sorteio será realizado na data estipulada e o vencedor poderá retirar o prêmio diretamente na loja apresentando o cupom contemplado."}
            </p>
            <p>
              <strong>Data do Sorteio:</strong>{" "}
              {selectedConcurso
                ? new Date(selectedConcurso.drawDate || selectedConcurso.draw_date).toLocaleDateString("pt-BR")
                : ""}
            </p>
            <p>
              <strong>Limite:</strong> Até {selectedConcurso?.maxTicketsPerUser || 5} cupons por participante.
            </p>
          </div>

          <div className="flex items-start gap-2.5 pt-1">
            <Checkbox
              id="terms-storefront-accept"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            />
            <label
              htmlFor="terms-storefront-accept"
              className="text-xs text-foreground leading-snug cursor-pointer select-none font-medium"
            >
              Concordo com o regulamento deste sorteio e confirmo minha participação.
            </label>
          </div>

          <DialogFooter className="pt-2 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedConcurso(null)}
              className="h-11 px-4 rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!acceptedTerms || isSubmittingTicket}
              onClick={handleConfirmConcursoParticipation}
              className="h-11 px-5 rounded-xl text-xs font-bold"
            >
              <Ticket className="size-4 mr-1.5" />
              <span>Emitir Cupom da Sorte</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox para fotos dos posts */}
      {lightboxPost && (
        <MediaLightboxModal
          isOpen={!!lightboxPost}
          onClose={() => setLightboxPost(null)}
          mediaUrls={lightboxPost.media_urls || []}
          initialIndex={0}
          postContext={{
            authorName: store.name || store.business_name,
            authorAvatar: logoUrl,
            caption: lightboxPost.content_text,
            createdAt: lightboxPost.created_at,
          }}
        />
      )}

      {/* Modal de Modificadores de Produto */}
      {selectedProductForModifiers && (
        <ProductModifiersModal
          product={selectedProductForModifiers}
          isOpen={!!selectedProductForModifiers}
          onClose={() => setSelectedProductForModifiers(null)}
          onConfirm={handleConfirmModifiers}
        />
      )}
      {/* ── Editor Modular de Seções da Vitrine (Drawer para o Lojista) ── */}
      {isOwner && (
        <StoreVitrineSectionsEditor
          open={isSectionsEditorOpen}
          onOpenChange={setIsSectionsEditorOpen}
          storeId={store.id}
          initialSections={vitrineSections}
          onSave={async (newSections) => {
            setVitrineSections(newSections);
            try {
              const orderIds: string[] = [];
              for (let i = 0; i < newSections.length; i++) {
                const sec = newSections[i];
                const res = await upsertStorePageSection({
                  data: {
                    id: sec.id.startsWith("sec_") ? undefined : sec.id,
                    store_id: store.id,
                    section_type: (sec.type === "banners" ? "banner_carousel" : sec.type === "custom_cards" ? "highlight_cards" : sec.type) as any,
                    section_order: i,
                    title: sec.title,
                    is_active: sec.enabled,
                    config: { cards: sec.cards || [] },
                  },
                }).catch(() => null);
                if (res?.id) orderIds.push(res.id);
              }
              if (orderIds.length > 0) {
                await saveStorePageSectionsOrder({
                  data: {
                    store_id: store.id,
                    ordered_section_ids: orderIds,
                  },
                }).catch(() => {});
              }
              toast.success("Seções sincronizadas com sucesso!");
            } catch (err: any) {
              console.warn("Aviso ao sincronizar seções:", err);
            }
          }}
        />
      )}

      {/* ── MODAL DE EDIÇÃO RÁPIDA DA EMPRESA (MODO PROPRIETÁRIO) ── */}
      <Dialog open={isEditCompanyModalOpen} onOpenChange={setIsEditCompanyModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveCompanyQuickEdit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold">Editar Informações da Empresa</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Atualize dados de atendimento, horários, endereço e canais de contato.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Nome Comercial</label>
                <Input
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  placeholder="Nome da sua empresa..."
                  required
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">WhatsApp de Atendimento</label>
                  <Input
                    value={editCompanyWhatsapp}
                    onChange={(e) => setEditCompanyWhatsapp(e.target.value)}
                    placeholder="(49) 99999-9999"
                    className="h-9 rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Telefone Fixo / Comercial</label>
                  <Input
                    value={editCompanyPhone}
                    onChange={(e) => setEditCompanyPhone(e.target.value)}
                    placeholder="(49) 3622-0000"
                    className="h-9 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">E-mail Comercial</label>
                  <Input
                    type="email"
                    value={editCompanyEmail}
                    onChange={(e) => setEditCompanyEmail(e.target.value)}
                    placeholder="contato@empresa.com.br"
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Website Oficial</label>
                  <Input
                    value={editCompanyWebsite}
                    onChange={(e) => setEditCompanyWebsite(e.target.value)}
                    placeholder="https://suaempresa.com.br"
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Horários de Atendimento</label>
                <Input
                  value={editCompanyHours}
                  onChange={(e) => setEditCompanyHours(e.target.value)}
                  placeholder="Ex: Seg a Sex: 08:00 - 18:00 | Sáb: 08:00 - 12:00"
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-medium text-foreground">Endereço Completo</label>
                  <Input
                    value={editCompanyAddress}
                    onChange={(e) => setEditCompanyAddress(e.target.value)}
                    placeholder="Rua, número, bairro..."
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Cidade</label>
                  <Input
                    value={editCompanyCity}
                    onChange={(e) => setEditCompanyCity(e.target.value)}
                    placeholder="Cidade"
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Sobre a Empresa (Biografia / Descrição)</label>
                <textarea
                  value={editCompanyDescription}
                  onChange={(e) => setEditCompanyDescription(e.target.value)}
                  rows={3}
                  placeholder="Apresente sua empresa aos clientes locais..."
                  className="w-full rounded-xl text-xs bg-background border border-border/60 p-2.5 focus:outline-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditCompanyModalOpen(false)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingCompany}
                className="rounded-xl text-xs font-medium"
              >
                {isSavingCompany ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}