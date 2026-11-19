import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  House,
  SquaresFour,
  MagnifyingGlass,
  Briefcase,
  ClipboardText,
  UserCircle,
  Info,
  ShoppingBag,
  ShareNetwork,
  ShieldCheck,
  MapPin,
  Storefront,
  ArrowSquareOut,
  Ticket,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/state/states";
import { CartSheet } from "@/components/commerce/cart-sheet";
import { ProductModifiersModal, type SelectedModifier } from "@/components/pos/product-modifiers-modal";
import { ProductAiSdrChat } from "@/components/commerce/product-ai-sdr-chat";
import { TicketPurchaseModal } from "@/components/eventos/ticket-purchase-modal";
import { TravelQuoteModal } from "@/components/tourism/travel-quote-modal";
import { TourismHeroBanner } from "@/components/tourism/tourism-hero-banner";
import { TourismDynamicSearchPanel } from "@/components/tourism/tourism-dynamic-search-panel";
import { CorporateVollConciergeView } from "@/components/tourism/corporate-voll-concierge-view";
import { LeadFormRenderer } from "@/components/leads/lead-form-renderer";
import { EventHorizontalCard } from "@/components/events/EventHorizontalCard";
import { AppInstallDrawer } from "@/components/branded-app/app-install-drawer";
import {
  AppSectionsRenderer,
  BrandedProductItemCard,
  ClassifiedPortfolioCard,
  ServiceBookingCard,
} from "@/components/branded-app/app-sections-renderer";
import { AppClientPortalTab } from "@/components/branded-app/app-client-portal-tab";
import { AppCompanyInfoTab } from "@/components/branded-app/app-company-info-tab";
import { AppServiceBookingSheet } from "@/components/branded-app/app-service-booking-sheet";
import { AppProductDetailDrawer } from "@/components/branded-app/app-product-detail-drawer";
import {
  AppItemDetailDrawer,
  type BrandedAppInspectedEntity,
} from "@/components/branded-app/app-item-detail-drawer";
import { StoreAnalyticsInjector } from "@/components/analytics/StoreAnalyticsInjector";
import { HotFlameAvatar } from "@/components/branded-app/hot-flame-avatar";
import { AppHotOfferDetailSheet } from "@/components/branded-app/app-hot-offer-detail-sheet";
import { AdvancedStoryViewer } from "@/components/stories/advanced-story-viewer";
import { getPublicHotOfferByIdFn } from "@/services/hot-offers.functions";
import { getClientStorePortalSummaryFn } from "@/services/branded-app.functions";
import { resolveCommercialOperatingModel } from "@/lib/niches/niche-ssot";
import type { HotOfferDTO, HotFlameStyle } from "@/lib/tourism/hot-offer-sanitizer";
import { Flame } from "lucide-react";
import { OmniMatchDeckView } from "@/components/branded-app/omni-match-deck-view";
import { getMatchDeckBatchFn } from "@/services/match-engine.functions";
import { formatMoney } from "@/lib/money";
import { TOKEN_HEX } from "@/lib/design-tokens";
import { addToCart } from "@/services/cart.functions";
import { useCartContext } from "@/lib/cart-context";
import { cn } from "@/lib/utils";
import type {
  AppNavTabConfig,
  BrandedAppRuntimeBundleDTO,
} from "@/types/branded-app";

export interface BrandedAppShellProps {
  bundle: BrandedAppRuntimeBundleDTO;
  isPreview?: boolean;
  controlledTabId?: string;
  onTabChange?: (tabId: string) => void;
  controlledCity?: string | null;
}

function renderTabIcon(kind: AppNavTabConfig["kind"], className?: string) {
  switch (kind) {
    case "home":
      return <House className={className} weight="bold" />;
    case "catalog":
      return <SquaresFour className={className} weight="bold" />;
    case "quoter":
      return <MagnifyingGlass className={className} weight="bold" />;
    case "corporate":
      return <Briefcase className={className} weight="bold" />;
    case "forms":
      return <ClipboardText className={className} weight="bold" />;
    case "client_portal":
      return <UserCircle className={className} weight="bold" />;
    case "about":
      return <Info className={className} weight="bold" />;
    case "field_rep":
      return <Briefcase className={className} weight="bold" />;
    case "omni_match":
      return <Flame className={className} />;
    default:
      return <SquaresFour className={className} weight="bold" />;
  }
}

export function BrandedAppShell({
  bundle,
  isPreview = false,
  controlledTabId,
  onTabChange,
  controlledCity,
}: BrandedAppShellProps) {
  const { store, appConfig, sections, categories, leadForms } = bundle;
  const { globalCarts, setCartData, setIsCartOpen } = useCartContext();

  const urlAccessParams = useMemo(() => {
    if (isPreview || typeof window === "undefined") {
      return { token: null as string | null, code: null as string | null };
    }
    const qs = new URLSearchParams(window.location.search);
    const token = (qs.get("token") || qs.get("magic_token") || "").trim() || null;
    const code = (qs.get("codigo") || qs.get("code") || "").trim() || null;
    return { token, code };
  }, [isPreview]);

  const storageKey = `waesy_app_portal_token:${store.id}`;
  const [portalAccessToken] = useState<string | null>(() => {
    if (urlAccessParams.token?.trim()) return urlAccessParams.token.trim();
    if (typeof window !== "undefined") {
      try {
        return sessionStorage.getItem(storageKey) || null;
      } catch {}
    }
    return null;
  });

  const { data: portalClient } = useQuery({
    queryKey: ["client-store-portal", store.id, portalAccessToken || "session"],
    queryFn: () =>
      getClientStorePortalSummaryFn({
        data: { storeId: store.id, accessToken: portalAccessToken || undefined },
      }),
    staleTime: 1000 * 60,
  });

  const commercialModel = useMemo(
    () => resolveCommercialOperatingModel(store.settings),
    [store.settings],
  );

  const isB2BGated = useMemo(() => {
    if (commercialModel === "distribuidora_b2b_rota") return true;
    if (store.settings?.is_b2b_distributor) return true;
    return (bundle.collections || []).some(
      (c: any) => c.visibility_scope === "b2b_restricted",
    );
  }, [commercialModel, store.settings, bundle.collections]);

  const isAuthenticatedClient = Boolean(portalClient?.authenticated);
  const clientPriceTableName = portalClient?.assignedPriceTable?.name || null;
  const isFieldRep = Boolean(
    portalClient?.staffRole &&
      ["owner", "admin", "manager", "seller"].includes(portalClient.staffRole),
  );

  const activeTabs = useMemo(() => {
    const rawTabs =
      Array.isArray(appConfig.navigation_tabs) && appConfig.navigation_tabs.length > 0
        ? [...appConfig.navigation_tabs]
        : [
            { id: "home", label: "Início", icon: "Home", kind: "home" as const, enabled: true, order: 0, show_in_bottom_nav: true },
            { id: "catalogo", label: "Catálogo", icon: "LayoutGrid", kind: "catalog" as const, enabled: true, order: 1, show_in_bottom_nav: true },
            { id: "minha_area", label: "Minha Área", icon: "User", kind: "client_portal" as const, enabled: true, order: 2, show_in_bottom_nav: true },
            { id: "empresa", label: "Empresa", icon: "Info", kind: "about" as const, enabled: true, order: 3, show_in_bottom_nav: true },
          ];

    if (isFieldRep && !rawTabs.some((t) => t.kind === "field_rep" || t.id === "campo")) {
      rawTabs.push({
        id: "campo",
        label: "Modo Campo",
        icon: "Briefcase",
        kind: "field_rep" as const,
        enabled: true,
        order: 99,
        show_in_bottom_nav: true,
      });
    }

    return rawTabs
      .filter((t) => t.enabled !== false)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }, [appConfig.navigation_tabs, isFieldRep]);

  const bottomTabs = useMemo(
    () => activeTabs.filter((t) => t.show_in_bottom_nav !== false).slice(0, 5),
    [activeTabs],
  );

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    if (!isPreview && typeof window !== "undefined") {
      const qs = new URLSearchParams(window.location.search);
      const requestedTab = qs.get("tab")?.trim().toLowerCase();
      if (requestedTab) {
        const directMatch = activeTabs.find((t) => t.id.toLowerCase() === requestedTab);
        if (directMatch) return directMatch.id;
        const aliasMap: Record<string, AppNavTabConfig["kind"]> = {
          inicio: "home",
          home: "home",
          catalogo: "catalog",
          catalog: "catalog",
          produtos: "catalog",
          servicos: "catalog",
          cotar: "quoter",
          quoter: "quoter",
          corporativo: "corporate",
          corporate: "corporate",
          formularios: "forms",
          forms: "forms",
          conta: "client_portal",
          portal: "client_portal",
          minha_area: "client_portal",
          empresa: "about",
          sobre: "about",
          match: "omni_match",
          omnimatch: "omni_match",
          descobrir: "omni_match",
        };
        const targetKind = aliasMap[requestedTab];
        const kindMatch = targetKind ? activeTabs.find((t) => t.kind === targetKind) : undefined;
        if (kindMatch) return kindMatch.id;
      }
      if (qs.get("token") || qs.get("magic_token") || qs.get("codigo") || qs.get("code")) {
        const portalTab = activeTabs.find((t) => t.kind === "client_portal");
        if (portalTab) return portalTab.id;
      }
    }
    return activeTabs[0]?.id || "home";
  });

  const activeTab = useMemo(
    () => activeTabs.find((t) => t.id === activeTabId) || activeTabs[0],
    [activeTabs, activeTabId],
  );
  const [tourismChannel, setTourismChannel] = useState<string>("pacotes");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategoryId, setCatalogCategoryId] = useState<string>("todas");
  const [selectedFormId, setSelectedFormId] = useState<string>(leadForms[0]?.id || "");
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteDestination, setQuoteDestination] = useState("");
  const [quotePrefill, setQuotePrefill] = useState<any | null>(null);
  const [modifierProduct, setModifierProduct] = useState<any | null>(null);
  const [inspectedProduct, setInspectedProduct] = useState<any | null>(null);
  const [inspectedEntity, setInspectedEntity] = useState<BrandedAppInspectedEntity | null>(null);
  const [inspectedJob, setInspectedJob] = useState<any | null>(null);
  const [bookingService, setBookingService] = useState<any | null>(null);
  const [ticketModalState, setTicketModalState] = useState<{ event: any; lot: any } | null>(null);
  const [visitorCity, setVisitorCity] = useState<string | null>(() => {
    if (controlledCity !== undefined) return controlledCity;
    if (typeof window !== "undefined") {
      const qsCity = new URLSearchParams(window.location.search).get("city")?.trim();
      if (qsCity) return qsCity;
      try {
        const storedGeo = window.localStorage.getItem("waesy_client_geo");
        if (storedGeo) {
          const parsed = JSON.parse(storedGeo);
          if (parsed?.city) return String(parsed.city);
        }
      } catch {}
    }
    return null;
  });

  const storeStories = useMemo(() => bundle.stories || [], [bundle.stories]);
  const storeHotOffers = useMemo(() => bundle.hotOffers || [], [bundle.hotOffers]);

  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [selectedHotOffer, setSelectedHotOffer] = useState<HotOfferDTO | null>(null);
  const [isOfferSheetOpen, setIsOfferSheetOpen] = useState(false);

  const [visitorSessionId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        let sid = localStorage.getItem("waesy_visitor_session_id");
        if (!sid) {
          sid = "vs_" + Math.random().toString(36).substring(2, 12) + "_" + Date.now().toString(36);
          localStorage.setItem("waesy_visitor_session_id", sid);
        }
        return sid;
      } catch {}
    }
    return "vs_temp_" + Date.now().toString(36);
  });

  const { data: matchBatch } = useQuery({
    queryKey: ["omni-match-batch", store.id, visitorSessionId],
    queryFn: () =>
      getMatchDeckBatchFn({
        data: {
          storeSlug: store.slug,
          visitorSessionId,
          limit: 15,
        },
      }),
    enabled: activeTab?.kind === "omni_match",
    staleTime: 1000 * 60 * 5,
  });

  const storyGroups = useMemo<any[]>(() => {
    if (storeStories.length === 0) return [];
    return [
      {
        groupId: `store-${store.id}`,
        entityType: "store" as const,
        entityId: store.id,
        entityName: store.name,
        entityAvatarUrl: appConfig.logo_square_url || store.logo_url || null,
        isFollowing: false,
        isOfficialAmbassador: false,
        isSponsored: false,
        niche: store.primary_niche_id || "tourism",
        hasUnseenStories: false,
        store_id: store.id,
        store_name: store.name,
        store_avatar_url: appConfig.logo_square_url || store.logo_url || null,
        store_slug: store.slug,
        stories: storeStories.map((s: any) => ({
          id: s.id,
          store_id: store.id,
          author_profile_id: s.author_profile_id || null,
          creator_id: s.creator_id || null,
          media_url: s.media_url,
          link_url: s.link_url || null,
          link_cta: s.link_label || "Ver Descrição da Oferta",
          story_kind: s.story_kind || "standard",
          hot_offer_id: s.hot_offer_id || null,
          source_proposal_id: s.source_proposal_id || null,
          offer_badge_label: s.offer_badge_label || null,
          offer_price_cents: s.offer_price_cents != null ? Number(s.offer_price_cents) : null,
          flame_style: s.flame_style || "pixel_fire",
          duration_seconds: s.duration_seconds || 8,
          is_long_format: Boolean(s.is_long_format),
          niche: store.primary_niche_id || "tourism",
          hashtags: [],
        })),
      },
    ];
  }, [storeStories, store.id, store.name, store.slug, store.logo_url, store.primary_niche_id, appConfig.logo_square_url]);

  const hasHotOfferStory = useMemo(
    () => storeStories.some((s: any) => s.story_kind === "hot_offer" || s.story_kind === "hot_black" || s.hot_offer_id),
    [storeStories]
  );

  const activeFlameStyle: HotFlameStyle = useMemo(() => {
    const custom = storeStories.find((s: any) => s.flame_style)?.flame_style;
    if (custom) return custom as HotFlameStyle;
    return hasHotOfferStory ? "pixel_fire" : "instagram_ring";
  }, [storeStories, hasHotOfferStory]);

  const handleOpenInternalOffer = useCallback(
    async (offerIdOrSlug: string) => {
      const trimmed = (offerIdOrSlug || "").trim();
      if (!trimmed) return;
      const foundLocal = storeHotOffers.find(
        (o: any) => o.id === trimmed || o.slug === trimmed
      );
      if (foundLocal) {
        setSelectedHotOffer(foundLocal as HotOfferDTO);
        setIsOfferSheetOpen(true);
        return;
      }
      try {
        const fetched = await getPublicHotOfferByIdFn({
          data: {
            storeSlug: store.slug,
            offerIdOrSlug: trimmed,
          },
        });
        if (fetched) {
          setSelectedHotOffer(fetched);
          setIsOfferSheetOpen(true);
        }
      } catch {
        // Fallback
      }
    },
    [storeHotOffers, store.slug]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const qsOffer = new URLSearchParams(window.location.search).get("offer")?.trim();
    if (qsOffer) {
      void handleOpenInternalOffer(qsOffer);
    }
  }, [handleOpenInternalOffer]);

  useEffect(() => {
    if (controlledTabId) {
      setActiveTabId(controlledTabId);
    }
  }, [controlledTabId]);

  useEffect(() => {
    if (controlledCity !== undefined) {
      setVisitorCity(controlledCity);
    }
  }, [controlledCity]);

  const effectiveCity = controlledCity !== undefined ? controlledCity : (appConfig.city_targeting_enabled ? visitorCity : null);

  const availableCatalogTypes = useMemo(() => {
    const types: Array<{ id: "products" | "services" | "tourism" | "events" | "classifieds"; label: string; count: number }> = [];
    if ((bundle.products || []).length > 0) {
      types.push({ id: "products", label: "Produtos", count: bundle.products.length });
    }
    if ((bundle.services || []).length > 0) {
      types.push({ id: "services", label: "Serviços", count: bundle.services.length });
    }
    if ((bundle.tourismItems || []).length > 0) {
      types.push({ id: "tourism", label: "Pacotes", count: bundle.tourismItems.length });
    }
    if ((bundle.events || []).length > 0) {
      types.push({ id: "events", label: "Eventos", count: bundle.events.length });
    }
    if ((bundle.classifieds || []).length > 0) {
      types.push({ id: "classifieds", label: "Portfólio", count: bundle.classifieds.length });
    }
    return types;
  }, [bundle.products, bundle.services, bundle.tourismItems, bundle.events, bundle.classifieds]);

  const [catalogEntityKind, setCatalogEntityKind] = useState<
    "products" | "services" | "tourism" | "events" | "classifieds"
  >(() => {
    if (appConfig.template_id === "services_agenda" && (bundle.services || []).length > 0) return "services";
    if (appConfig.template_id === "tourism_cvc" && (bundle.tourismItems || []).length > 0 && (bundle.products || []).length === 0) return "tourism";
    if (appConfig.template_id === "events_sympla" && (bundle.events || []).length > 0 && (bundle.products || []).length === 0) return "events";
    return availableCatalogTypes[0]?.id || "products";
  });

  useEffect(() => {
    if (availableCatalogTypes.length === 0) return;
    const exists = availableCatalogTypes.some((t) => t.id === catalogEntityKind);
    if (!exists) {
      setCatalogEntityKind(availableCatalogTypes[0].id);
    }
  }, [availableCatalogTypes, catalogEntityKind]);

  const storeCartItemsCount = useMemo(() => {
    const sc = (globalCarts || []).find((c) => c.storeId === store.id);
    if (!sc?.items) return 0;
    return sc.items.reduce((acc, it) => acc + Number(it.qty || 1), 0);
  }, [globalCarts, store.id]);

  const coverUrl = appConfig.cover_url || store.banner_url;
  const squareLogo = appConfig.logo_square_url || store.logo_url;
  const themeColor = appConfig.theme_color || bundle.brandKit?.primaryColor || TOKEN_HEX.neutral900;

  const headingFont = bundle.brandKit?.headingFont?.trim() || "";
  const bodyFont = bundle.brandKit?.bodyFont?.trim() || "";

  useEffect(() => {
    if (typeof document === "undefined") return;
    const families = [headingFont, bodyFont]
      .map((f) => f.split(",")[0].replace(/['"]/g, "").trim())
      .filter((f) => f.length > 0 && f.toLowerCase() !== "inter" && f.toLowerCase() !== "sans-serif" && f.toLowerCase() !== "serif");
    const uniqueFamilies = Array.from(new Set(families));
    if (uniqueFamilies.length === 0) return;
    const linkId = "waesy-branded-app-brand-fonts";
    let linkEl = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!linkEl) {
      linkEl = document.createElement("link");
      linkEl.id = linkId;
      linkEl.rel = "stylesheet";
      document.head.appendChild(linkEl);
    }
    const qs = uniqueFamilies
      .map((fam) => `family=${fam.replace(/\s+/g, "+")}:wght@400;600;700;800`)
      .join("&");
    const fontUrl = `https://fonts.googleapis.com/css2?${qs}&display=swap`;
    if (linkEl.href !== fontUrl) {
      linkEl.href = fontUrl;
    }
  }, [headingFont, bodyFont]);

  const appFontVars = useMemo(() => {
    const vars: Record<string, string> = {};
    if (headingFont) vars["--brand-heading-font"] = headingFont;
    if (bodyFont) vars["--brand-body-font"] = bodyFont;
    return vars as React.CSSProperties;
  }, [headingFont, bodyFont]);

  const handleShareApp = async () => {
    const shareUrl =
      typeof window !== "undefined" ? `${window.location.origin}/app/${store.slug}` : `/app/${store.slug}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: appConfig.app_name,
          text: `Acesse o App Oficial de ${store.name}`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fallback clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link do App copiado!");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const handleTabClick = (tab: AppNavTabConfig) => {
    if (tab.kind === "external_url" && tab.target_url) {
      window.open(tab.target_url, "_blank", "noopener,noreferrer");
      return;
    }
    setActiveTabId(tab.id);
    onTabChange?.(tab.id);
    if (tab.target_category_id) {
      setCatalogCategoryId(tab.target_category_id);
    }
    if (tab.target_form_id) {
      setSelectedFormId(tab.target_form_id);
    }
  };

  const handleConfirmModifiers = async (
    product: any,
    variant: any,
    selectedModifiers: SelectedModifier[],
    notes?: string,
  ) => {
    try {
      const groupedOptions: Record<string, string[]> = {};
      for (const mod of selectedModifiers) {
        if (!groupedOptions[mod.groupId]) groupedOptions[mod.groupId] = [];
        groupedOptions[mod.groupId].push(mod.modifierId);
      }
      if (notes?.trim()) {
        groupedOptions._notes = [notes.trim()];
      }
      const res = await addToCart({
        data: {
          productId: product.id,
          variantId: variant?.id,
          quantity: 1,
          options: Object.keys(groupedOptions).length > 0 ? groupedOptions : undefined,
        },
      });
      if ((res as any)?.status === "error") {
        toast.error((res as any)?.message || "Erro ao adicionar item ao carrinho.");
        return;
      }
      if ((res as any)?.cart) {
        setCartData((res as any).cart);
        setIsCartOpen(true);
      }
      setModifierProduct(null);
      toast.success("Adicionado à sacola!");
    } catch {
      toast.error("Erro ao adicionar item ao carrinho.");
    }
  };

  const filteredCatalogProducts = useMemo(() => {
    return (bundle.products || []).filter((p: any) => {
      const catOk =
        catalogCategoryId === "todas" || String(p.category_id || "") === String(catalogCategoryId);
      const q = catalogSearch.trim().toLowerCase();
      const searchOk =
        !q ||
        String(p.title || "").toLowerCase().includes(q) ||
        String(p.description || "").toLowerCase().includes(q);
      return catOk && searchOk;
    });
  }, [bundle.products, catalogCategoryId, catalogSearch]);

  const homeHasTourismBanner =
    activeTab?.kind === "home" && appConfig.template_id === "tourism_cvc";

  return (
    <div
      style={appFontVars}
      className="min-h-screen bg-background text-foreground flex flex-col waesy-app-font-shell"
    >
      {!isPreview && (
        <StoreAnalyticsInjector
          storeId={store.id}
          storeSettings={store.settings}
          pageContext={inspectedProduct || inspectedEntity ? "product" : "home"}
          productData={
            inspectedProduct
              ? {
                  id: String(inspectedProduct.id),
                  name: String(inspectedProduct.title || ""),
                  priceCents: Math.round(Number(inspectedProduct.price_cents || inspectedProduct.priceCents || 0)),
                  category: inspectedProduct.category_id ? String(inspectedProduct.category_id) : undefined,
                }
              : inspectedEntity?.item
                ? {
                    id: String(inspectedEntity.item.id),
                    name: String(inspectedEntity.item.title || ""),
                    priceCents: Math.round(
                      Number(
                        inspectedEntity.item.price_cents ||
                          inspectedEntity.item.price_min_cents ||
                          0,
                      ),
                    ),
                    category: inspectedEntity.kind,
                  }
                : undefined
          }
        />
      )}
      {/* 1. Cabeçalho Padrão App (Capa + Logo Proporcionalizada + Menu Tabs) */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border safe-top">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <HotFlameAvatar
              logoUrl={squareLogo}
              storeName={store.name}
              activeStoriesCount={storeStories.length}
              hasHotOfferStory={hasHotOfferStory}
              flameStyle={activeFlameStyle}
              onClick={() => {
                if (storeStories.length > 0) setIsStoryViewerOpen(true);
              }}
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-foreground truncate">
                  {appConfig.app_name || store.name}
                </h1>
                {store.is_verified && (
                  <ShieldCheck className="size-4 text-primary shrink-0" weight="fill" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                {store.city && (
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="size-3 shrink-0" />
                    <span>
                      {store.city}
                      {store.state ? `, ${store.state}` : ""}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {storeHotOffers.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedHotOffer(storeHotOffers[0] as HotOfferDTO);
                  setIsOfferSheetOpen(true);
                }}
                className="h-11 min-h-11 px-3 rounded-full text-xs font-bold gap-2 border-warning/50 bg-warning/10 text-foreground hover:bg-warning/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
              >
                <Flame className="size-4 text-warning shrink-0" />
                <span className="hidden sm:inline">Ofertas Quentes</span>
                <span className="font-mono text-xs">({storeHotOffers.length})</span>
              </Button>
            )}
            {!isPreview && (
              <AppInstallDrawer
                storeId={store.id}
                appName={appConfig.app_name}
                shortName={appConfig.short_name}
                logoUrl={squareLogo}
                themeColor={themeColor}
                enablePrompt={appConfig.niche_features.enableInstallPrompt !== false}
              />
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleShareApp}
              aria-label="Compartilhar link do aplicativo"
              className="size-11 min-h-11 min-w-11 p-0 rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ShareNetwork className="size-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCartOpen(true)}
              aria-label="Abrir sacola de compras"
              className="h-11 min-h-11 px-3 rounded-full gap-2 relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ShoppingBag className="size-4" />
              <span className="text-xs font-bold font-mono">{storeCartItemsCount}</span>
            </Button>

            {storeCartItemsCount > 0 && !isPreview && (
              <Link
                to="/checkout"
                search={{ store: store.id, app: (appConfig as any)?.slug || store.slug } as any}
                style={{ "--dyn-bg": themeColor } as React.CSSProperties}
                className="hidden sm:inline-flex h-11 min-h-11 px-4 rounded-full waesy-dyn-bg text-neutral-50 text-xs font-bold items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>Finalizar</span>
              </Link>
            )}
          </div>
        </div>

        {/* Menu Tabs Padronizado Editável */}
        <nav
          aria-label="Abas do aplicativo"
          className="max-w-6xl mx-auto px-3 sm:px-6 flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar py-2 border-t border-border/60"
        >
          {activeTabs.map((tab) => {
            const isSelected = activeTab?.id === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabClick(tab)}
                style={isSelected ? ({ "--dyn-bg": themeColor } as React.CSSProperties) : undefined}
                className={cn(
                  "h-11 min-h-11 px-4 rounded-full text-xs font-bold flex items-center gap-2 shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isSelected
                    ? "waesy-dyn-bg text-neutral-50"
                    : "bg-muted/60 text-foreground hover:bg-muted",
                )}
              >
                {renderTabIcon(tab.kind, "size-4 shrink-0")}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* 2. Conteúdo Principal da Aba Ativa */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-5 pb-32 safe-area-bottom space-y-6">
        {/* Banner/Hero Padrão na Home quando aplicável */}
        {activeTab?.kind === "home" && (
          homeHasTourismBanner ? (
            <TourismHeroBanner
              banner={bundle.banners[0] || (coverUrl ? { id: "cover", title: store.name, subtitle: appConfig.description || "", media_url: coverUrl } as any : null)}
              storeName={store.name}
              storeLogoUrl={squareLogo}
              badgeLabel="App Oficial"
              backTo={undefined}
              onOpenQuote={(dest) => {
                setQuoteDestination(dest || "");
                setQuoteModalOpen(true);
              }}
            />
          ) : coverUrl && !sections.some((s) => s.tab_id === "home" && s.section_type === "banner_carousel" && s.is_active) ? (
            <div className="aspect-21/9 sm:aspect-4/1 w-full rounded-2xl overflow-hidden border border-border bg-muted">
              <img src={coverUrl} alt={store.name} className="size-full object-cover" />
            </div>
          ) : null
        )}

        {/* Roteamento por Tipo de Aba */}
        {activeTab?.kind === "home" && (
          <AppSectionsRenderer
            bundle={bundle}
            sections={sections}
            activeTabId="home"
            activeCity={effectiveCity}
            activeTourismChannel={tourismChannel}
            onTourismChannelChange={setTourismChannel}
            onOpenQuote={(dest, prefill) => {
              setQuoteDestination(dest || "");
              setQuotePrefill(prefill || null);
              setQuoteModalOpen(true);
            }}
            onSelectProductForModifiers={(p) => setModifierProduct(p)}
            onInspectProduct={(p) => setInspectedProduct(p)}
            onInspectTourismItem={(item) => setInspectedEntity({ kind: "tourism", item })}
            onInspectClassifiedItem={(item) => setInspectedEntity({ kind: "classified", item })}
            onInspectEventItem={(item) => setInspectedEntity({ kind: "event", item })}
            onInspectJob={(job) => {
              setInspectedJob(job);
              const aboutTab = activeTabs.find((t) => t.kind === "about");
              if (aboutTab) setActiveTabId(aboutTab.id);
            }}
            onBookService={(svc) => setBookingService(svc)}
            onBuyEventTicket={(ev, lot) => setTicketModalState({ event: ev, lot })}
            onNavigateTab={setActiveTabId}
            isB2BGated={isB2BGated}
            isAuthenticatedClient={isAuthenticatedClient}
            clientPriceTableName={clientPriceTableName}
            onRequireAuth={() => {
              const portalTab = activeTabs.find((t) => t.kind === "client_portal");
              if (portalTab) setActiveTabId(portalTab.id);
            }}
          />
        )}

        {activeTab?.kind === "catalog" && (
          <div className="space-y-6">
            {isB2BGated && !isAuthenticatedClient && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Catálogo Comercial B2B Restrito</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Esta distribuidora opera com tabelas de preços exclusivas para empresas e clientes cadastrados.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    const portalTab = activeTabs.find((t) => t.kind === "client_portal");
                    if (portalTab) setActiveTabId(portalTab.id);
                  }}
                  className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                >
                  Acessar Área do Cliente
                </Button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                  {activeTab.label}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Explore os itens oficiais cadastrados por {store.name}
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <MagnifyingGlass className="size-4 text-muted-foreground absolute left-3 top-3.5" />
                <Input
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Buscar por nome ou detalhe..."
                  aria-label="Filtrar catálogo"
                  className="h-11 min-h-11 pl-9 rounded-xl text-xs bg-card"
                />
              </div>
            </div>

            {availableCatalogTypes.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar pb-1">
                {availableCatalogTypes.map((ct) => (
                  <button
                    key={ct.id}
                    type="button"
                    onClick={() => setCatalogEntityKind(ct.id)}
                    className={cn(
                      "h-11 min-h-11 px-4 rounded-full text-xs font-bold shrink-0 border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      catalogEntityKind === ct.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border",
                    )}
                  >
                    {ct.label} ({ct.count})
                  </button>
                ))}
              </div>
            )}

            {catalogEntityKind === "products" && categories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => setCatalogCategoryId("todas")}
                  className={cn(
                    "h-11 min-h-11 px-4 rounded-full text-xs font-bold shrink-0 border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    catalogCategoryId === "todas"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border",
                  )}
                >
                  Todas ({bundle.products.length})
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCatalogCategoryId(c.id)}
                    className={cn(
                      "h-11 min-h-11 px-4 rounded-full text-xs font-bold shrink-0 border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      catalogCategoryId === c.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {catalogEntityKind === "services" && (bundle.services || []).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(bundle.services || [])
                  .filter((svc: any) =>
                    !catalogSearch.trim() ||
                    String(svc.title || "").toLowerCase().includes(catalogSearch.trim().toLowerCase()),
                  )
                  .map((svc: any) => (
                    <ServiceBookingCard
                      key={svc.id}
                      service={svc}
                      onBook={(s) => setBookingService(s)}
                    />
                  ))}
              </div>
            ) : catalogEntityKind === "tourism" && (bundle.tourismItems || []).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(bundle.tourismItems || [])
                  .filter((t: any) =>
                    !catalogSearch.trim() ||
                    String(t.title || "").toLowerCase().includes(catalogSearch.trim().toLowerCase()) ||
                    String(t.destination || "").toLowerCase().includes(catalogSearch.trim().toLowerCase()),
                  )
                  .map((item: any) => (
                    <article
                      key={item.id}
                      className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col justify-between h-full"
                    >
                      <button
                        type="button"
                        onClick={() => setInspectedEntity({ kind: "tourism", item })}
                        className="block text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="aspect-4/3 w-full bg-muted overflow-hidden">
                          {(item.cover_url || item.image_url) && (
                            <img
                              src={item.cover_url || item.image_url}
                              alt={item.title}
                              className="size-full object-cover"
                              loading="lazy"
                            />
                          )}
                        </div>
                        <div className="p-4 space-y-1">
                          <h3 className="text-sm font-bold text-foreground line-clamp-2 break-words">{item.title}</h3>
                          {item.destination && (
                            <p className="text-xs text-muted-foreground break-words">{item.destination}</p>
                          )}
                          {Number(item.price_cents || 0) > 0 && (
                            <p className="text-base font-black font-mono tabular-nums text-primary">
                              {formatMoney(Number(item.price_cents))}
                            </p>
                          )}
                        </div>
                      </button>
                      <div className="p-4 pt-0 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setInspectedEntity({ kind: "tourism", item })}
                          className="flex-1 h-11 min-h-11 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Ver Pacote
                        </Button>
                        <Button
                          type="button"
                          onClick={() => {
                            setQuoteDestination(item.destination || item.title);
                            setQuoteModalOpen(true);
                          }}
                          className="h-11 min-h-11 px-4 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Cotar
                        </Button>
                      </div>
                    </article>
                  ))}
              </div>
            ) : catalogEntityKind === "classifieds" && (bundle.classifieds || []).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(bundle.classifieds || [])
                  .filter((cls: any) =>
                    !catalogSearch.trim() ||
                    String(cls.title || "").toLowerCase().includes(catalogSearch.trim().toLowerCase()),
                  )
                  .map((cls: any) => (
                    <ClassifiedPortfolioCard
                      key={cls.id}
                      item={cls}
                      onInspect={(it) => setInspectedEntity({ kind: "classified", item: it })}
                    />
                  ))}
              </div>
            ) : catalogEntityKind === "events" && (bundle.events || []).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(bundle.events || []).map((ev: any) => {
                  const lots = Array.isArray(ev.ticket_lots) ? ev.ticket_lots : [];
                  const firstLot =
                    lots.find(
                      (l: any) =>
                        l.status !== "closed" &&
                        ((l.capacity || 0) === 0 || (l.sold_count || 0) < l.capacity),
                    ) || lots[0] || null;
                  return (
                    <div key={ev.id} className="space-y-2">
                      <EventHorizontalCard
                        id={ev.id}
                        title={ev.title}
                        eventDate={ev.event_date}
                        location={ev.location}
                        venue={ev.venue || ev.venue_name}
                        coverImage={ev.cover_image || ev.cover_image_url}
                        priceCents={ev.price_min_cents ?? ev.min_price_cents}
                        isFree={Boolean(ev.is_free)}
                        onSelect={() => setInspectedEntity({ kind: "event", item: ev })}
                      />
                      {firstLot && (
                        <Button
                          type="button"
                          onClick={() => setTicketModalState({ event: ev, lot: firstLot })}
                          className="w-full h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
                        >
                          <Ticket className="size-4" />
                          <span>Garantir Ingresso</span>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : filteredCatalogProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredCatalogProducts.map((p: any) => (
                  <BrandedProductItemCard
                    key={p.id}
                    product={p}
                    storeName={store.name}
                    onSelectWithModifiers={(prod) => setModifierProduct(prod)}
                    onInspectProduct={(prod) => setInspectedProduct(prod)}
                    isB2BGated={isB2BGated}
                    isAuthenticatedClient={isAuthenticatedClient}
                    clientPriceTableName={clientPriceTableName}
                    onRequireAuth={() => {
                      const portalTab = activeTabs.find((t) => t.kind === "client_portal");
                      if (portalTab) setActiveTabId(portalTab.id);
                    }}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhum item encontrado neste filtro"
                description="Altere a busca ou escolha outra categoria."
              />
            )}

            {sections.some((s) => s.tab_id === activeTab.id && s.is_active) && (
              <AppSectionsRenderer
                bundle={bundle}
                sections={sections}
                activeTabId={activeTab.id}
                activeCity={effectiveCity}
                onOpenQuote={(dest) => {
                  setQuoteDestination(dest || "");
                  setQuoteModalOpen(true);
                }}
                onSelectProductForModifiers={(p) => setModifierProduct(p)}
                onInspectProduct={(p) => setInspectedProduct(p)}
                onInspectTourismItem={(item) => setInspectedEntity({ kind: "tourism", item })}
                onInspectClassifiedItem={(item) => setInspectedEntity({ kind: "classified", item })}
                onInspectEventItem={(item) => setInspectedEntity({ kind: "event", item })}
                onBookService={(svc) => setBookingService(svc)}
                onBuyEventTicket={(ev, lot) => setTicketModalState({ event: ev, lot })}
                onNavigateTab={setActiveTabId}
                isB2BGated={isB2BGated}
                isAuthenticatedClient={isAuthenticatedClient}
                clientPriceTableName={clientPriceTableName}
                onRequireAuth={() => {
                  const portalTab = activeTabs.find((t) => t.kind === "client_portal");
                  if (portalTab) setActiveTabId(portalTab.id);
                }}
              />
            )}
          </div>
        )}

        {activeTab?.kind === "quoter" && (
          <div className="space-y-6">
            <TourismDynamicSearchPanel
              activeChannel={tourismChannel === "todos" ? "pacotes" : tourismChannel}
              onChannelChange={setTourismChannel}
              onOpenQuote={(dest, prefill) => {
                setQuoteDestination(dest || "");
                setQuotePrefill(prefill || null);
                setQuoteModalOpen(true);
              }}
              storeId={store.id}
              agencyName={store.name}
              showCorporateTab={appConfig.niche_features.enableCorporateTravel !== false}
              onCorporateAction={() => {
                const corpTab = activeTabs.find((t) => t.kind === "corporate");
                if (corpTab) setActiveTabId(corpTab.id);
              }}
            />
          </div>
        )}

        {activeTab?.kind === "corporate" && (
          <CorporateVollConciergeView
            agencyName={store.name}
            agencyId={store.id}
            whatsappNumber={store.whatsapp?.replace(/\D/g, "") || undefined}
            corporatePortalUrl={appConfig.niche_features.corporateAppUrl || undefined}
            corporatePortalLabel={appConfig.niche_features.corporateAppLabel || undefined}
          />
        )}

        {activeTab?.kind === "forms" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-foreground tracking-tight">
                {activeTab.label}
              </h2>
              <p className="text-xs text-muted-foreground">
                Preencha formulários, pesquisas ou solicite orçamento direto com {store.name}.
              </p>
            </div>

            {leadForms.length === 0 ? (
              <EmptyState
                title="Nenhum formulário publicado"
                description="Quando a empresa publicar formulários ou pesquisas, eles aparecerão aqui."
              />
            ) : (
              <div className="space-y-4">
                {leadForms.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar pb-1">
                    {leadForms.map((f: any) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFormId(f.id)}
                        className={cn(
                          "h-11 min-h-11 px-4 rounded-full text-xs font-bold border shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selectedFormId === f.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground border-border",
                        )}
                      >
                        {f.title}
                      </button>
                    ))}
                  </div>
                )}

                {(() => {
                  const activeForm =
                    leadForms.find((f: any) => f.id === selectedFormId) || leadForms[0];
                  if (!activeForm) return null;
                  return (
                    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
                      <LeadFormRenderer
                        form={activeForm}
                        fields={activeForm.fields || []}
                        isStandalone={false}
                      />
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab?.kind === "field_rep" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <Briefcase className="size-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-foreground">Modo Representante de Campo</h2>
                  <p className="text-xs text-muted-foreground">
                    Acesso operacional autenticado para vendedores e equipe comercial da distribuidora.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button asChild className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2">
                  <Link to="/workspace/crm">
                    <MapPin className="size-4" />
                    <span>Abrir Rotas & Clientes (CRM)</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2">
                  <Link to="/workspace">
                    <Storefront className="size-4" />
                    <span>Painel da Loja (Workspace)</span>
                  </Link>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground">Ações Rápidas de Campo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                  <p className="text-xs font-bold text-foreground">Check-in de Visita com GPS</p>
                  <p className="text-2xs text-muted-foreground">
                    Valide sua presença no raio de 200m do estabelecimento do cliente com auditoria automática.
                  </p>
                  <Button asChild variant="secondary" className="w-full h-11 min-h-11 rounded-xl text-xs font-bold">
                    <Link to="/workspace/crm">Iniciar Check-in no CRM</Link>
                  </Button>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                  <p className="text-xs font-bold text-foreground">Emitir Pedido com Tabela do Cliente</p>
                  <p className="text-2xs text-muted-foreground">
                    Lançamento de pedido B2B aplicando automaticamente descontos e tabela de preço vinculada.
                  </p>
                  <Button
                    type="button"
                    onClick={() => {
                      const catTab = activeTabs.find((t) => t.kind === "catalog");
                      if (catTab) setActiveTabId(catTab.id);
                    }}
                    className="w-full h-11 min-h-11 rounded-xl text-xs font-bold"
                  >
                    Navegar pelo Catálogo B2B
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab?.kind === "client_portal" && (
          <AppClientPortalTab
            storeId={store.id}
            storeSlug={store.slug}
            storeName={store.name}
            templateId={appConfig.template_id}
            initialAccessToken={urlAccessParams.token}
            initialClientCode={urlAccessParams.code}
            storeWhatsapp={store.whatsapp || store.phone || null}
            allowSelfSignup={appConfig.allow_customer_self_signup !== false}
          />
        )}

        {activeTab?.kind === "about" && (
          <AppCompanyInfoTab
            store={store}
            jobs={bundle.jobs}
            reviews={bundle.reviews}
            initialSelectedJob={inspectedJob}
            onClearSelectedJob={() => setInspectedJob(null)}
          />
        )}

        {activeTab?.kind === "omni_match" && (
          <div className="py-2">
            <OmniMatchDeckView
              storeId={store.id}
              storeName={store.name}
              storeSlug={store.slug}
              cards={matchBatch?.cards || []}
              visitorSessionId={visitorSessionId}
              whatsappNumber={store.whatsapp || store.phone || undefined}
              accentColor={themeColor}
            />
          </div>
        )}

        {activeTab?.kind === "custom_section" && (
          <div className="space-y-6">
            {activeTab.target_url && (
              <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-foreground">{activeTab.label}</span>
                <Button asChild className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2">
                  <a href={activeTab.target_url} target="_blank" rel="noopener noreferrer">
                    <span>Abrir</span>
                    <ArrowSquareOut className="size-4" />
                  </a>
                </Button>
              </div>
            )}
            <AppSectionsRenderer
              bundle={bundle}
              sections={sections}
              activeTabId={activeTab.id}
              activeCity={effectiveCity}
              onOpenQuote={(dest) => {
                setQuoteDestination(dest || "");
                setQuoteModalOpen(true);
              }}
              onSelectProductForModifiers={(p) => setModifierProduct(p)}
              onInspectProduct={(p) => setInspectedProduct(p)}
              onInspectTourismItem={(item) => setInspectedEntity({ kind: "tourism", item })}
              onInspectClassifiedItem={(item) => setInspectedEntity({ kind: "classified", item })}
              onInspectEventItem={(item) => setInspectedEntity({ kind: "event", item })}
              onBookService={(svc) => setBookingService(svc)}
              onBuyEventTicket={(ev, lot) => setTicketModalState({ event: ev, lot })}
              onNavigateTab={setActiveTabId}
            />
          </div>
        )}
      </main>

      {/* 3. Barra de Navegação Inferior Mobile Nativa (z-30 < z-50 overlays) */}
      {bottomTabs.length > 0 && (
        <nav
          aria-label="Navegação inferior do aplicativo"
          className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border safe-area-bottom"
        >
          <div className="flex items-center justify-around px-1 py-2">
            {bottomTabs.map((tab) => {
              const isSelected = activeTab?.id === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabClick(tab)}
                  className={cn(
                    "min-h-11 flex-1 px-2 py-1 rounded-xl flex flex-col items-center justify-center gap-1 text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected ? "text-primary font-extrabold" : "text-muted-foreground font-medium",
                  )}
                >
                  {renderTabIcon(tab.kind, "size-5 shrink-0")}
                  <span className="truncate max-w-20">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* 4. Overlays Integrados */}
      {!isPreview && (
        <CartSheet
          storeId={store.id}
          appSlug={(appConfig as any)?.slug || store.slug}
          onNavigateToCatalog={() => {
            const catTab = activeTabs.find((t) => t.kind === "catalog");
            if (catTab) setActiveTabId(catTab.id);
          }}
        />
      )}

      {!isPreview && store.ai_sales_agent_enabled !== false && (
        <ProductAiSdrChat
          storeId={store.id}
          storeName={store.name}
          itemTitle={appConfig.app_name || store.name}
          niche={store.primary_niche_id || undefined}
          triggerVariant="floating"
        />
      )}

      <AppProductDetailDrawer
        open={Boolean(inspectedProduct)}
        onOpenChange={(open) => {
          if (!open) setInspectedProduct(null);
        }}
        product={inspectedProduct}
        store={store}
        onRequestModifiers={(prod) => setModifierProduct(prod)}
      />

      <AppItemDetailDrawer
        open={Boolean(inspectedEntity)}
        onOpenChange={(open) => {
          if (!open) setInspectedEntity(null);
        }}
        entity={inspectedEntity}
        store={store}
        onOpenQuote={(dest) => {
          setQuoteDestination(dest || "");
          setQuoteModalOpen(true);
        }}
        onBuyEventTicket={(ev, lot) => setTicketModalState({ event: ev, lot })}
      />

      <AppServiceBookingSheet
        open={Boolean(bookingService)}
        onOpenChange={(open) => {
          if (!open) setBookingService(null);
        }}
        storeId={store.id}
        service={bookingService}
        resources={bundle.bookingResources || []}
      />

      {ticketModalState && (
        <TicketPurchaseModal
          open={Boolean(ticketModalState)}
          onOpenChange={(open) => {
            if (!open) setTicketModalState(null);
          }}
          event={ticketModalState.event}
          lot={ticketModalState.lot}
        />
      )}

      <ProductModifiersModal
        open={Boolean(modifierProduct)}
        onOpenChange={(open) => {
          if (!open) setModifierProduct(null);
        }}
        product={modifierProduct}
        store={store}
        onConfirm={handleConfirmModifiers}
      />

      <TravelQuoteModal
        open={quoteModalOpen}
        onOpenChange={(open) => {
          setQuoteModalOpen(open);
          if (!open) setQuotePrefill(null);
        }}
        defaultDestination={quoteDestination}
        prefill={quotePrefill}
        storeId={store.id}
        storeName={store.name}
      />

      {storyGroups.length > 0 && isStoryViewerOpen && (
        <AdvancedStoryViewer
          groups={storyGroups}
          isOpen={isStoryViewerOpen}
          onClose={() => setIsStoryViewerOpen(false)}
          onOpenInternalOffer={handleOpenInternalOffer}
        />
      )}

      <AppHotOfferDetailSheet
        offer={selectedHotOffer}
        open={isOfferSheetOpen}
        onOpenChange={(open) => {
          setIsOfferSheetOpen(open);
          if (!open) setSelectedHotOffer(null);
        }}
        storeName={store.name}
        storeWhatsapp={store.whatsapp || store.phone}
      />
    </div>
  );
}
