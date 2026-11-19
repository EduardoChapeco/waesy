import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Layers,
  Palette,
  BarChart3,
  ShieldCheck,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Copy,
  CheckCircle2,
  Eye,
  EyeOff,
  Store,
  LayoutTemplate,
  RefreshCw,
  BookOpen,
  Link2,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { ErrorState } from "@/components/state/states";
import { BrandedAppDeviceStage } from "@/components/branded-app/branded-app-device-stage";
import { BrandedAppTelemetryPanel } from "@/components/branded-app/studio/branded-app-telemetry-panel";
import { BrandedAppIdentityDomainPanel } from "@/components/branded-app/studio/branded-app-identity-domain-panel";
import { SITE_BUILDER_BLOCKS } from "@/components/builder/registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { type AppIconBundleUrls } from "@/components/ui/image-upload";
import { PwaLegalDisclaimer } from "@/components/pwa/PwaLegalDisclaimer";
import {
  getWorkspaceBrandedAppSetupFn,
  saveBrandedAppConfigAndSectionsFn,
} from "@/services/branded-app.functions";
import { getPwaTelemetryMetrics } from "@/services/pwa.functions";
import { TOKEN_HEX } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type {
  AppEntryAnimation,
  AppNavTabConfig,
  AppNavTabKind,
  AppSectionLayoutMode,
  AppSectionSourceType,
  BrandedAppNicheFeatures,
  BrandedAppRuntimeBundleDTO,
  BrandedAppSectionDTO,
  BrandedAppSectionType,
  BrandedAppTemplateId,
} from "@/types/branded-app";

const TAB_KIND_LABELS: Record<AppNavTabConfig["kind"], string> = {
  home: "Início",
  catalog: "Catálogo",
  quoter: "Cotação API",
  corporate: "Corporativo",
  forms: "Formulários",
  client_portal: "Área do Cliente",
  field_rep: "Representante / Vendas",
  omni_match: "OmniMatch / Tinder",
  about: "Sobre & Contato",
  custom_section: "Seção Extra",
  external_url: "Link Externo",
};

const TEMPLATE_OPTIONS: Array<{ id: BrandedAppTemplateId; label: string; summary: string }> = [
  {
    id: "tourism_cvc",
    label: "Turismo & Agência (Modelo CVC)",
    summary: "Menu aéreo/pacotes/hotéis/ônibus, cotador direto na API, botão corporativo e vitrine de roteiros.",
  },
  {
    id: "delivery_ifood",
    label: "Delivery & Cardápio (Modelo iFood)",
    summary: "Banners, categorias horizontais, cardápio em lista e personalização de adicionais.",
  },
  {
    id: "events_sympla",
    label: "Eventos & Ingressos (Modelo Sympla)",
    summary: "Capa do organizador, agenda de eventos, lotes de ingressos e informações do local.",
  },
  {
    id: "services_agenda",
    label: "Serviços & Agenda",
    summary: "Catálogo de serviços, horários disponíveis, formulários de avaliação e portal do cliente.",
  },
  {
    id: "ecommerce_retail",
    label: "Loja & E-commerce",
    summary: "Vitrine em grade, coleções de produtos, busca rápida e sacola integrada.",
  },
  {
    id: "standard_catalog",
    label: "Catálogo Digital Padrão",
    summary: "Layout direto e limpo conectado automaticamente ao seu catálogo.",
  },
];

const SECTION_TYPE_OPTIONS: Array<{ value: BrandedAppSectionType; label: string }> = [
  { value: "product_rail", label: "Vitrine de Produtos / Itens" },
  { value: "featured_services", label: "Serviços & Agendamentos" },
  { value: "category_items", label: "Itens de uma Categoria" },
  { value: "collection_items", label: "Itens de uma Coleção" },
  { value: "infinite_feed", label: "Catálogo com Scroll Infinito" },
  { value: "banner_carousel", label: "Carrossel de Banners" },
  { value: "highlight_cards", label: "Cards Editoriais / Destaques" },
  { value: "lead_form", label: "Formulário de Captura (Lead)" },
  { value: "survey_form", label: "Pesquisa / Enquete no App" },
  { value: "tourism_cvc_dock", label: "Barra Rápida de Viagens" },
  { value: "travel_api_quoter", label: "Cotador Direto na API (Turismo)" },
  { value: "corporate_travel_cta", label: "Botão Viagens Corporativas" },
  { value: "events_rail", label: "Agenda de Eventos" },
  { value: "delivery_menu", label: "Cardápio Completo (Delivery)" },
  { value: "promotional_flyers", label: "Encartes e Tabloides" },
  { value: "contact_hours", label: "Sobre, Horários & Como Chegar" },
  { value: "omni_block", label: "Bloco Avançado do Omni Builder" },
  { value: "omni_document", label: "Página Completa do Omni Builder" },
  { value: "jobs_board", label: "Mural de Vagas da Empresa" },
  { value: "reviews_showcase", label: "Avaliações Verificadas" },
  { value: "custom_domain_cta", label: "Banner/CTA de Acesso Oficial" },
];

const LAYOUT_MODE_OPTIONS: Array<{ value: AppSectionLayoutMode; label: string }> = [
  { value: "carousel", label: "Carrossel Horizontal" },
  { value: "grid", label: "Grade (Grid)" },
  { value: "list", label: "Lista Compacta" },
  { value: "bento", label: "Mosaico Destaque (Bento)" },
  { value: "infinite", label: "Scroll Infinito" },
];

function buildStarterTemplateData(
  storeId: string,
  templateId: BrandedAppTemplateId,
  features: BrandedAppNicheFeatures,
): { tabs: AppNavTabConfig[]; sections: BrandedAppSectionDTO[] } {
  const catalogLabel =
    templateId === "tourism_cvc"
      ? "Pacotes"
      : templateId === "delivery_ifood"
        ? "Cardápio"
        : templateId === "events_sympla"
          ? "Eventos"
          : templateId === "services_agenda"
            ? "Serviços"
            : "Catálogo";

  const tabs: AppNavTabConfig[] = [
    { id: "home", label: "Início", icon: "Home", kind: "home", enabled: true, order: 0, show_in_bottom_nav: true },
    { id: "catalogo", label: catalogLabel, icon: "LayoutGrid", kind: "catalog", enabled: true, order: 1, show_in_bottom_nav: true },
  ];

  if (templateId === "tourism_cvc") {
    tabs.push({
      id: "cotar",
      label: "Cotar API",
      icon: "Search",
      kind: "quoter",
      enabled: features.enableApiQuoter !== false,
      order: 2,
      show_in_bottom_nav: true,
    });
    tabs.push({
      id: "corporativo",
      label: "Corporativo",
      icon: "Briefcase",
      kind: "corporate",
      enabled: features.enableCorporateTravel !== false,
      order: 3,
      show_in_bottom_nav: false,
    });
  }

  tabs.push({
    id: "formularios",
    label: "Formulários",
    icon: "ClipboardText",
    kind: "forms",
    enabled: false,
    order: 4,
    show_in_bottom_nav: false,
  });
  tabs.push({
    id: "minha_area",
    label: "Minha Área",
    icon: "User",
    kind: "client_portal",
    enabled: features.enableClientPortal !== false,
    order: 5,
    show_in_bottom_nav: true,
  });
  tabs.push({
    id: "omnimatch",
    label: "Match",
    icon: "Flame",
    kind: "omni_match",
    enabled: true,
    order: 6,
    show_in_bottom_nav: true,
  });
  tabs.push({
    id: "empresa",
    label: "Empresa",
    icon: "Info",
    kind: "about",
    enabled: true,
    order: 7,
    show_in_bottom_nav: true,
  });

  const sections: BrandedAppSectionDTO[] = [];
  if (templateId === "tourism_cvc") {
    sections.push(
      {
        id: `tpl-${Date.now()}-1`,
        store_id: storeId,
        section_type: "tourism_cvc_dock",
        section_order: 0,
        title: "Serviços de Viagem",
        is_active: true,
        layout_mode: "carousel",
        source_type: "tourism",
        tab_id: "home",
        items_limit: 9,
        config: {},
      },
      {
        id: `tpl-${Date.now()}-2`,
        store_id: storeId,
        section_type: "travel_api_quoter",
        section_order: 1,
        title: "Pesquisar & Cotar na Hora",
        is_active: features.enableApiQuoter !== false,
        layout_mode: "grid",
        source_type: "api_quoter",
        tab_id: "home",
        items_limit: 6,
        config: {},
      },
      {
        id: `tpl-${Date.now()}-3`,
        store_id: storeId,
        section_type: "corporate_travel_cta",
        section_order: 2,
        title: "Viagens Corporativas",
        is_active: features.enableCorporateTravel !== false,
        layout_mode: "list",
        source_type: "corporate_cta",
        tab_id: "home",
        items_limit: 1,
        config: { ctaLabel: features.corporateAppLabel || "Acessar Viagens Corporativas" },
      },
    );
  } else if (templateId === "events_sympla") {
    sections.push({
      id: `tpl-${Date.now()}-1`,
      store_id: storeId,
      section_type: "events_rail",
      section_order: 0,
      title: "Próximos Eventos",
      is_active: true,
      layout_mode: "grid",
      source_type: "events",
      tab_id: "home",
      items_limit: 12,
      config: {},
    });
  } else if (templateId === "services_agenda") {
    sections.push({
      id: `tpl-${Date.now()}-1`,
      store_id: storeId,
      section_type: "featured_services",
      section_order: 0,
      title: "Serviços & Agendamentos",
      is_active: true,
      layout_mode: "grid",
      source_type: "services",
      tab_id: "home",
      items_limit: 12,
      config: {},
    });
  } else {
    sections.push({
      id: `tpl-${Date.now()}-1`,
      store_id: storeId,
      section_type: "banner_carousel",
      section_order: 0,
      title: "Destaques",
      is_active: true,
      layout_mode: "carousel",
      source_type: "all",
      tab_id: "home",
      items_limit: 6,
      config: {},
    });
    sections.push({
      id: `tpl-${Date.now()}-2`,
      store_id: storeId,
      section_type: templateId === "delivery_ifood" ? "delivery_menu" : "product_rail",
      section_order: 1,
      title: templateId === "delivery_ifood" ? "Cardápio Digital" : "Mais Procurados",
      is_active: true,
      layout_mode: templateId === "delivery_ifood" ? "list" : "carousel",
      source_type: "featured",
      tab_id: "home",
      items_limit: 12,
      config: {},
    });
  }

  sections.push({
    id: `tpl-${Date.now()}-inf`,
    store_id: storeId,
    section_type: "infinite_feed",
    section_order: sections.length,
    title: "Explorar Tudo",
    is_active: true,
    layout_mode: "infinite",
    source_type:
      templateId === "tourism_cvc"
        ? "tourism"
        : templateId === "events_sympla"
          ? "events"
          : templateId === "services_agenda"
            ? "services"
            : "all",
    tab_id: "home",
    items_limit: 12,
    config: {},
  });

  return { tabs, sections };
}

export interface BrandedAppWorkspaceEditorProps {
  initialTab?: "template" | "sections" | "identity" | "telemetry" | "governance";
}

export function BrandedAppWorkspaceEditor({
  initialTab = "template",
}: BrandedAppWorkspaceEditorProps = {}) {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "template" | "sections" | "identity" | "telemetry" | "governance"
  >(initialTab);
  const [previewMode, setPreviewMode] = useState<"app" | "splash">("app");
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const [syncBrandKit, setSyncBrandKit] = useState(false);

  const { data: setup, isLoading, isError, refetch } = useQuery({
    queryKey: ["workspace-branded-app-setup"],
    queryFn: () => getWorkspaceBrandedAppSetupFn({}),
  });

  const {
    data: telemetry,
    isLoading: telemetryLoading,
    isError: telemetryError,
    refetch: refetchTelemetry,
  } = useQuery({
    queryKey: ["store-pwa-telemetry"],
    queryFn: () => getPwaTelemetryMetrics(),
  });

  // Form states
  const [appName, setAppName] = useState("Meu App Oficial");
  const [shortName, setShortName] = useState("App");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState<BrandedAppTemplateId>("standard_catalog");
  const [isAppEnabled, setIsAppEnabled] = useState(true);
  const [publishToMarketplace, setPublishToMarketplace] = useState(true);
  const [themeColor, setThemeColor] = useState<string>(TOKEN_HEX.neutral900);
  const [backgroundColor, setBackgroundColor] = useState<string>(TOKEN_HEX.white);
  const [logoSquareUrl, setLogoSquareUrl] = useState<string | null>(null);
  const [icon192Url, setIcon192Url] = useState<string | null>(null);
  const [icon512Url, setIcon512Url] = useState<string | null>(null);
  const [maskableIcon512Url, setMaskableIcon512Url] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [entryAnimation, setEntryAnimation] = useState<AppEntryAnimation>("pulse");
  const [displayMode, setDisplayMode] = useState<"standalone" | "fullscreen" | "minimal-ui" | "browser">("standalone");
  const [customDomain, setCustomDomain] = useState("");
  const [customDomainStatus, setCustomDomainStatus] = useState("pending_dns");
  const [omniPageId, setOmniPageId] = useState<string | null>(null);
  const [allowCustomerSelfSignup, setAllowCustomerSelfSignup] = useState(true);
  const [cityTargetingEnabled, setCityTargetingEnabled] = useState(false);
  const [nicheFeatures, setNicheFeatures] = useState<BrandedAppNicheFeatures>({
    enableApiQuoter: true,
    enableCorporateTravel: true,
    enableClientPortal: true,
    enableInstallPrompt: true,
  });
  const [navigationTabs, setNavigationTabs] = useState<AppNavTabConfig[]>([]);
  const [sections, setSections] = useState<BrandedAppSectionDTO[]>([]);
  const [legalAccepted, setLegalAccepted] = useState(true);

  useEffect(() => {
    if (!setup) return;
    const { store, appConfig, sections: dbSections } = setup;
    setAppName(appConfig.app_name || store?.name || "Meu App");
    setShortName(appConfig.short_name || (store?.name || "App").slice(0, 16));
    setDescription(appConfig.description || "");
    setTemplateId(appConfig.template_id);
    setIsAppEnabled(appConfig.is_app_enabled);
    setPublishToMarketplace(store?.waesy_marketplace_enabled !== false);
    setThemeColor(appConfig.theme_color || TOKEN_HEX.neutral900);
    setBackgroundColor(appConfig.background_color || TOKEN_HEX.white);
    setLogoSquareUrl(appConfig.logo_square_url || store?.logo_url || null);
    setIcon192Url(appConfig.icon_192_url || store?.logo_url || null);
    setIcon512Url(appConfig.icon_512_url || store?.logo_url || null);
    setMaskableIcon512Url(appConfig.maskable_icon_512_url || null);
    setCoverUrl(appConfig.cover_url || store?.banner_url || null);
    setEntryAnimation(appConfig.entry_animation || "pulse");
    setDisplayMode(appConfig.display_mode || "standalone");
    setCustomDomain(appConfig.custom_domain || store?.custom_domain || "");
    setCustomDomainStatus(appConfig.custom_domain_status || "pending_dns");
    setOmniPageId(appConfig.omni_page_id || null);
    setAllowCustomerSelfSignup(appConfig.allow_customer_self_signup !== false);
    setCityTargetingEnabled(Boolean(appConfig.city_targeting_enabled));
    setNicheFeatures(appConfig.niche_features || {});
    setNavigationTabs(appConfig.navigation_tabs || []);
    setSections(dbSections || []);
  }, [setup]);

  const { mutate: saveAll, isPending: isSaving } = useMutation({
    mutationFn: saveBrandedAppConfigAndSectionsFn,
    onSuccess: (res) => {
      toast.success(
        `App Oficial publicado e sincronizado (versão ${res.cacheVersion})! Os clientes recebem as mudanças automaticamente.`,
      );
      queryClient.invalidateQueries({ queryKey: ["workspace-branded-app-setup"] });
      if (setup?.store?.slug) {
        queryClient.invalidateQueries({ queryKey: ["branded-app", setup.store.slug] });
      }
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar configurações do App.");
    },
  });

  const handleSave = () => {
    saveAll({
      data: {
        storeId: setup?.store?.id,
        appName: appName.trim() || "Meu App",
        shortName: shortName.trim() || "App",
        description: description.trim() || null,
        templateId,
        isAppEnabled,
        isPublished: true,
        publishToMarketplace,
        themeColor,
        backgroundColor,
        logoSquareUrl,
        icon192Url,
        icon512Url,
        maskableIcon512Url,
        coverUrl,
        splashImageUrl: logoSquareUrl,
        entryAnimation,
        displayMode,
        orientation: "portrait",
        customDomain: customDomain.trim() || null,
        customDomainStatus: customDomainStatus.trim() || "pending_dns",
        omniPageId: omniPageId || null,
        allowCustomerSelfSignup,
        cityTargetingEnabled,
        navigationTabs,
        nicheFeatures,
        syncBrandKit,
        settings: setup?.appConfig?.settings || {},
        sections: sections.map((s, idx) => ({
          id: s.id,
          section_type: s.section_type,
          section_order: idx,
          title: s.title,
          is_active: s.is_active,
          layout_mode: s.layout_mode,
          source_type: s.source_type,
          source_id: s.source_id ?? null,
          tab_id: s.tab_id || "home",
          city_filter: s.city_filter ?? null,
          items_limit: s.items_limit || 12,
          config: s.config || {},
        })),
      },
    });
  };

  const handleIconBundleUploaded = (urls: AppIconBundleUrls) => {
    setLogoSquareUrl(urls.logoSquareUrl);
    setIcon192Url(urls.icon192Url);
    setIcon512Url(urls.icon512Url);
    setMaskableIcon512Url(urls.maskable512Url);
    toast.success("Logo proporcionalizada nos tamanhos 192px, 512px e Maskable!");
  };

  const handleApplyTemplatePreset = () => {
    if (!setup?.store?.id) return;
    const starter = buildStarterTemplateData(setup.store.id, templateId, nicheFeatures);
    setNavigationTabs(starter.tabs);
    setSections(starter.sections);
    toast.success("Abas e seções padrão do modelo carregadas. Clique em Publicar para aplicar.");
  };

  const handleAddSection = () => {
    if (!setup?.store?.id) return;
    setSections((prev) => [
      ...prev,
      {
        id: `new-sec-${Date.now()}`,
        store_id: setup.store.id,
        section_type: "product_rail",
        section_order: prev.length,
        title: "Nova Seção no App",
        is_active: true,
        layout_mode: "carousel",
        source_type: "all",
        source_id: null,
        tab_id: "home",
        items_limit: 12,
        config: {},
      },
    ]);
  };

  const moveSection = (index: number, delta: -1 | 1) => {
    setSections((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[target];
      copy[target] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveTab = (index: number, delta: -1 | 1) => {
    setNavigationTabs((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[target];
      copy[target] = copy[index];
      copy[index] = temp;
      return copy.map((t, idx) => ({ ...t, order: idx }));
    });
  };

  const handlePullFromBrandKit = () => {
    const kit = setup?.brandKit;
    if (!kit) {
      toast.error("Configure seu Brand Kit antes de importar a identidade.");
      return;
    }
    if (kit.primaryColor) setThemeColor(kit.primaryColor);
    if (kit.backgroundColor) setBackgroundColor(kit.backgroundColor);
    const brandLogo = kit.iconUrl || kit.mainLogoUrl || null;
    if (brandLogo) {
      setLogoSquareUrl(brandLogo);
      setIcon192Url(brandLogo);
      setIcon512Url(brandLogo);
    }
    if (kit.coverUrl && !coverUrl) {
      setCoverUrl(kit.coverUrl);
    }
    toast.success("Cores, tipografia e logo importadas do Brand Kit! Salve para sincronizar.");
  };

  const livePreviewBundle = useMemo<BrandedAppRuntimeBundleDTO | null>(() => {
    if (!setup?.store || !setup?.appConfig) return null;
    const storeRow = setup.store as Record<string, any>;
    return {
      store: {
        id: storeRow.id,
        name: storeRow.name,
        slug: storeRow.slug,
        description: description || storeRow.description || null,
        phone: storeRow.phone || null,
        whatsapp: storeRow.whatsapp || null,
        email: storeRow.email || null,
        address: storeRow.address || null,
        city: storeRow.city || null,
        state: storeRow.state || null,
        latitude: storeRow.latitude ?? null,
        longitude: storeRow.longitude ?? null,
        logo_url: storeRow.logo_url || null,
        banner_url: storeRow.banner_url || null,
        category: storeRow.category || null,
        primary_niche_id: storeRow.primary_niche_id || null,
        is_verified: Boolean(storeRow.is_verified),
        waesy_marketplace_enabled: publishToMarketplace,
        publish_to_marketplace: publishToMarketplace,
        custom_domain: customDomain || null,
        cnpj: storeRow.cnpj || null,
        website: storeRow.website || null,
        instagram: storeRow.instagram || null,
        ai_knowledge_base: null,
        ai_sales_agent_enabled: storeRow.ai_sales_agent_enabled !== false,
        payment_instructions: storeRow.payment_instructions || null,
        has_pix_key: Boolean(storeRow.pix_key),
        settings: storeRow.settings || {},
      },
      brandKit: setup.brandKit || null,
      appConfig: {
        ...setup.appConfig,
        app_name: appName,
        short_name: shortName,
        description,
        template_id: templateId,
        is_app_enabled: isAppEnabled,
        theme_color: themeColor,
        background_color: backgroundColor,
        logo_square_url: logoSquareUrl,
        icon_192_url: icon192Url,
        icon_512_url: icon512Url,
        maskable_icon_512_url: maskableIcon512Url,
        cover_url: coverUrl,
        entry_animation: entryAnimation,
        display_mode: displayMode,
        custom_domain: customDomain || null,
        custom_domain_status: customDomainStatus || "pending_dns",
        omni_page_id: omniPageId || null,
        allow_customer_self_signup: allowCustomerSelfSignup,
        city_targeting_enabled: cityTargetingEnabled,
        navigation_tabs: navigationTabs,
        niche_features: nicheFeatures,
      },
      sections: sections.map((s, idx) => ({ ...s, section_order: idx })),
      categories: setup.categories || [],
      collections: (setup.collections || []).map((c: any) => ({
        id: String(c.id),
        name: String(c.name || ""),
        slug: String(c.slug || ""),
        description: c.description ?? null,
        cover_url: c.cover_url ?? null,
        product_ids: Array.isArray(c.product_ids) ? c.product_ids : [],
      })),
      products: setup.previewData?.products || [],
      services: setup.previewData?.services || [],
      bookingResources: [],
      classifieds: setup.previewData?.classifieds || [],
      tourismItems: setup.previewData?.tourismItems || [],
      events: setup.previewData?.events || [],
      banners: setup.previewData?.banners || [],
      flyers: [],
      jobs: [],
      reviews: [],
      posts: [],
      leadForms: setup.forms || [],
      omniDocuments: setup.omniDocuments || [],
    };
  }, [
    setup,
    appName,
    shortName,
    description,
    templateId,
    isAppEnabled,
    publishToMarketplace,
    themeColor,
    backgroundColor,
    logoSquareUrl,
    icon192Url,
    icon512Url,
    maskableIcon512Url,
    coverUrl,
    entryAnimation,
    displayMode,
    customDomain,
    customDomainStatus,
    omniPageId,
    allowCustomerSelfSignup,
    cityTargetingEnabled,
    navigationTabs,
    nicheFeatures,
    sections,
  ]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !setup) {
    return (
      <ErrorState
        title="Não foi possível carregar o configurador do App"
        description="Tente recarregar suas configurações da loja e do catálogo."
        onRetry={() => refetch()}
      />
    );
  }

  const storeSlug = setup?.store?.slug || "";
  const publicAppPath = `/app/${storeSlug}`;
  const fullAppUrl =
    typeof window !== "undefined" ? `${window.location.origin}${publicAppPath}` : publicAppPath;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="App Oficial & Catálogo PWA"
        description="Configure seu aplicativo padronizado por nicho, edite abas e seções em tempo real e gere ícones proporcionais sem duplicar conteúdo."
      >
        <div className="flex flex-wrap items-center gap-2">
          {storeSlug && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(fullAppUrl);
                  toast.success("Link do App Oficial copiado!");
                }}
                className="h-11 min-h-11 rounded-xl text-xs font-semibold gap-2 cursor-pointer"
              >
                <Copy className="size-4" />
                <span>Copiar Link</span>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 min-h-11 rounded-xl text-xs font-semibold gap-2"
              >
                <Link to="/app/$slug" params={{ slug: storeSlug }}>
                  <ExternalLink className="size-4" />
                  <span>Abrir App</span>
                </Link>
              </Button>
            </>
          )}
          <Button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="h-11 min-h-11 px-5 rounded-xl text-xs font-bold gap-2 cursor-pointer"
          >
            <CheckCircle2 className="size-4" />
            <span>{isSaving ? "Publicando..." : "Salvar e Sincronizar App"}</span>
          </Button>
        </div>
      </PageHeader>

      {/* Sub-navegação do Editor */}
      <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar border-b border-border pb-3">
        {(
          [
            { id: "template", label: "Modelo & Canais", icon: Store },
            { id: "sections", label: "Abas & Seções do App", icon: Layers },
            { id: "identity", label: "Logo Proporcional & Splash", icon: Palette },
            { id: "telemetry", label: "Instalações PWA", icon: BarChart3 },
            { id: "governance", label: "Termos PWA", icon: ShieldCheck },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "h-11 min-h-11 px-4 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-foreground hover:bg-muted",
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ABA 1: MODELO ENGESSADO POR NICHO & CANAIS */}
      {activeTab === "template" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            {/* Ativação de Canais Separados */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-extrabold text-foreground">
                1. Canais Ativos da Empresa
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      App Oficial Próprio (/app/{storeSlug})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Catálogo PWA padrão instalável com suas próprias abas
                    </p>
                  </div>
                  <Switch checked={isAppEnabled} onCheckedChange={setIsAppEnabled} />
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Perfil no Marketplace Waesy (/loja/{storeSlug})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Exibir sua empresa para clientes do ecossistema Waesy
                    </p>
                  </div>
                  <Switch
                    checked={publishToMarketplace}
                    onCheckedChange={setPublishToMarketplace}
                  />
                </div>
              </div>
            </div>

            {/* Conexões Bidirecionais com o Ecossistema da Empresa */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                    <Link2 className="size-4 text-primary" />
                    <span>2. Conexões Bidirecionais do Sistema</span>
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Seu App consome automaticamente sua marca, inteligência artificial e catálogos em tempo real.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Brand Kit */}
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-foreground flex items-center gap-2">
                      <Palette className="size-4 text-primary" />
                      <span>Brand Kit Oficial</span>
                    </span>
                    {setup.brandKit?.primaryColor ? (
                      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          style={{ "--dyn-bg": setup.brandKit.primaryColor } as React.CSSProperties}
                          className="size-4 rounded-full border border-border waesy-dyn-bg shrink-0"
                        />
                        <span>Conectado</span>
                      </span>
                    ) : (
                      <Badge variant="outline">Padrão</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {setup.brandKit?.archetype
                      ? `Identidade ${setup.brandKit.archetype}${setup.brandKit.headingFont ? ` · ${setup.brandKit.headingFont.split(",")[0]}` : ""}`
                      : "Importe cores, tipografia e logotipo oficial do Brand Kit com 1 clique."}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePullFromBrandKit}
                      disabled={!setup.brandKit}
                      className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
                    >
                      <RefreshCw className="size-4" />
                      <span>Puxar do Brand Kit</span>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      className="h-11 min-h-11 rounded-xl text-xs font-semibold"
                    >
                      <Link to="/workspace/marketing/brand-kit">Editar Brand Kit</Link>
                    </Button>
                  </div>
                  <label className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 cursor-pointer">
                    <span className="text-xs text-muted-foreground">
                      Espelhar cor e logo no Brand Kit ao salvar
                    </span>
                    <Switch checked={syncBrandKit} onCheckedChange={setSyncBrandKit} />
                  </label>
                </div>

                {/* Base de Conhecimento IA */}
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-foreground flex items-center gap-2">
                        <BookOpen className="size-4 text-primary" />
                        <span>Base de Conhecimento (IA)</span>
                      </span>
                      <Badge variant={setup.knowledgeBaseChars > 0 ? "secondary" : "outline"}>
                        {setup.knowledgeBaseChars > 0 ? "Ativa" : "Vazia"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {setup.knowledgeBaseChars > 0
                        ? `${setup.knowledgeBaseChars} caracteres de regras, entregas e diferenciais respondendo dúvidas no App.`
                        : "Cadastre regras da empresa para o chat de IA atender seus clientes dentro do App."}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                    <span className="text-xs text-muted-foreground">
                      {setup.store?.pix_key ? "PIX configurado" : "Pagamento via Checkout"}
                    </span>
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 min-h-11 rounded-xl text-xs font-bold"
                    >
                      <Link to="/workspace/configuracoes/inteligencia-artificial">
                        Treinar Base IA
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Catálogos e Módulos Alimentando o App */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-foreground flex items-center gap-2">
                    <Package className="size-4 text-primary" />
                    <span>Módulos Alimentando seu App Automaticamente</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="ghost" className="h-11 min-h-11 px-3 text-xs font-semibold">
                      <Link to="/workspace/catalogo">Catálogo</Link>
                    </Button>
                    <Button asChild variant="ghost" className="h-11 min-h-11 px-3 text-xs font-semibold">
                      <Link to="/workspace/agenda">Agenda</Link>
                    </Button>
                    <Button asChild variant="ghost" className="h-11 min-h-11 px-3 text-xs font-semibold">
                      <Link to="/workspace/eventos">Eventos</Link>
                    </Button>
                    <Button asChild variant="ghost" className="h-11 min-h-11 px-3 text-xs font-semibold">
                      <Link to="/workspace/marketing/formularios">Formulários</Link>
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Produtos: {setup.counts?.products ?? 0}</Badge>
                  <Badge variant="outline">Serviços: {setup.counts?.services ?? 0}</Badge>
                  <Badge variant="outline">Pacotes: {setup.counts?.tourism ?? 0}</Badge>
                  <Badge variant="outline">Eventos: {setup.counts?.events ?? 0}</Badge>
                  <Badge variant="outline">Portfólio: {setup.counts?.classifieds ?? 0}</Badge>
                  <Badge variant="outline">Formulários: {setup.counts?.forms ?? 0}</Badge>
                </div>
              </div>
            </div>

            {/* Escolha do Modelo Padronizado do Nicho */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-extrabold text-foreground">
                    3. Modelo Padronizado do Nicho
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Layout testado e pronto para venda — personalize apenas o que importa ou aplique a estrutura padrão.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleApplyTemplatePreset}
                  className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer shrink-0"
                >
                  <RefreshCw className="size-4" />
                  <span>Aplicar Estrutura Padrão</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TEMPLATE_OPTIONS.map((tpl) => {
                  const selected = templateId === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTemplateId(tpl.id)}
                      className={cn(
                        "p-4 rounded-xl border text-left space-y-2 cursor-pointer transition-colors min-h-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-foreground">{tpl.label}</span>
                        {selected && <Badge>Selecionado</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tpl.summary}</p>
                    </button>
                  );
                })}
              </div>

              {/* Recursos do Nicho */}
              {templateId === "tourism_cvc" && (
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                  <h3 className="text-xs font-extrabold text-foreground">
                    Recursos Específicos de Turismo
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-card border border-border">
                      <span className="text-xs font-semibold">Cotação Direta na API (GDS/Wooba)</span>
                      <Switch
                        checked={nicheFeatures.enableApiQuoter !== false}
                        onCheckedChange={(v) =>
                          setNicheFeatures((prev) => ({ ...prev, enableApiQuoter: v }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-card border border-border">
                      <span className="text-xs font-semibold">Botão Viagens Corporativas</span>
                      <Switch
                        checked={nicheFeatures.enableCorporateTravel !== false}
                        onCheckedChange={(v) =>
                          setNicheFeatures((prev) => ({ ...prev, enableCorporateTravel: v }))
                        }
                      />
                    </div>
                  </div>
                  {nicheFeatures.enableCorporateTravel !== false && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">Texto do Botão Corporativo</Label>
                        <Input
                          value={nicheFeatures.corporateAppLabel || ""}
                          onChange={(e) =>
                            setNicheFeatures((prev) => ({
                              ...prev,
                              corporateAppLabel: e.target.value,
                            }))
                          }
                          placeholder="Acessar Viagens Corporativas"
                          className="h-11 min-h-11 rounded-xl text-xs bg-card"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">
                          Link Externo do App Corporativo (opcional)
                        </Label>
                        <Input
                          value={nicheFeatures.corporateAppUrl || ""}
                          onChange={(e) =>
                            setNicheFeatures((prev) => ({
                              ...prev,
                              corporateAppUrl: e.target.value,
                            }))
                          }
                          placeholder="Deixe vazio para abrir o hub corporativo integrado"
                          className="h-11 min-h-11 rounded-xl text-xs bg-card"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/20 border border-border">
                  <span className="text-xs font-semibold">Aba Minha Área (Pedidos, Contratos, Carnês)</span>
                  <Switch
                    checked={nicheFeatures.enableClientPortal !== false}
                    onCheckedChange={(v) =>
                      setNicheFeatures((prev) => ({ ...prev, enableClientPortal: v }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-muted/20 border border-border">
                  <span className="text-xs font-semibold">Exibir Drawer de Instalação do App</span>
                  <Switch
                    checked={nicheFeatures.enableInstallPrompt !== false}
                    onCheckedChange={(v) =>
                      setNicheFeatures((prev) => ({ ...prev, enableInstallPrompt: v }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Nota para Modo Avançado Omni Builder */}
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-bold text-foreground flex items-center gap-2">
                  <LayoutTemplate className="size-4 text-primary" />
                  <span>Deseja criar páginas com layout 100% livre bloco a bloco?</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Para experiências sob medida fora do App Padrão, utilize o Construtor Avançado (Omni Builder).
                </p>
              </div>
              <Button asChild variant="outline" className="h-11 min-h-11 rounded-xl text-xs font-bold shrink-0">
                <Link to="/workspace/builder" search={{ doc: undefined }}>
                  Abrir Construtor Avançado
                </Link>
              </Button>
            </div>
          </div>

          {/* Coluna Direita: Simulador Isolado Iframe + postMessage + Kit QR */}
          <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
            <BrandedAppDeviceStage
              slug={storeSlug}
              cacheVersion={setup?.appConfig?.cache_version || 1}
              liveBundle={livePreviewBundle}
              previewMode={previewMode}
              onPreviewModeChange={setPreviewMode}
              previewDevice={previewDevice}
              onPreviewDeviceChange={setPreviewDevice}
              appUrl={
                customDomain.trim() && customDomainStatus === "active"
                  ? `https://${customDomain.trim()}`
                  : fullAppUrl
              }
              customDomainStatus={customDomainStatus}
              cityTargetingEnabled={cityTargetingEnabled}
            />
          </div>
        </div>
      )}

      {/* ABA 2: EDITOR DE ABAS E SEÇÕES */}
      {activeTab === "sections" && (
        <div className="space-y-6">
          {/* Menu de Abas Editável */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-extrabold text-foreground">
                  Menu de Abas do Aplicativo
                </h2>
                <p className="text-xs text-muted-foreground">
                  Renomeie abas, ative ou desative, e escolha quais aparecem no menu inferior do celular.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setNavigationTabs((prev) => [
                    ...prev,
                    {
                      id: `tab-${Date.now()}`,
                      label: "Nova Aba",
                      icon: "LayoutGrid",
                      kind: "custom_section",
                      enabled: true,
                      order: prev.length,
                      show_in_bottom_nav: false,
                    },
                  ])
                }
                className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Adicionar Aba</span>
              </Button>
            </div>

            <div className="space-y-2">
              {navigationTabs.map((tab, idx) => (
                <div
                  key={tab.id}
                  className="p-3 rounded-xl border border-border bg-background flex flex-wrap items-center gap-3"
                >
                  <Switch
                    checked={tab.enabled !== false}
                    onCheckedChange={(v) =>
                      setNavigationTabs((prev) =>
                        prev.map((t) => (t.id === tab.id ? { ...t, enabled: v } : t)),
                      )
                    }
                  />
                  <Input
                    value={tab.label}
                    onChange={(e) =>
                      setNavigationTabs((prev) =>
                        prev.map((t) => (t.id === tab.id ? { ...t, label: e.target.value } : t)),
                      )
                    }
                    className="h-11 min-h-11 w-44 rounded-xl text-xs font-semibold"
                  />
                  <div className="w-48">
                    <Select
                      value={tab.kind}
                      onValueChange={(val: AppNavTabKind) =>
                        setNavigationTabs((prev) =>
                          prev.map((t) =>
                            t.id === tab.id
                              ? {
                                  ...t,
                                  kind: val,
                                  icon:
                                    val === "omni_match"
                                      ? "Flame"
                                      : val === "home"
                                        ? "Home"
                                        : val === "catalog"
                                          ? "LayoutGrid"
                                          : val === "quoter"
                                            ? "Search"
                                            : val === "corporate"
                                              ? "Briefcase"
                                              : val === "forms"
                                                ? "ClipboardText"
                                                : val === "client_portal"
                                                  ? "User"
                                                  : val === "about"
                                                    ? "Info"
                                                    : t.icon,
                                }
                              : t,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TAB_KIND_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground ml-auto cursor-pointer">
                    <Switch
                      checked={tab.show_in_bottom_nav !== false}
                      onCheckedChange={(v) =>
                        setNavigationTabs((prev) =>
                          prev.map((t) =>
                            t.id === tab.id ? { ...t, show_in_bottom_nav: v } : t,
                          ),
                        )
                      }
                    />
                    <span>Barra Inferior Mobile</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => moveTab(idx, -1)}
                      disabled={idx === 0}
                      className="size-11 min-h-11 min-w-11 p-0"
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => moveTab(idx, 1)}
                      disabled={idx === navigationTabs.length - 1}
                      className="size-11 min-h-11 min-w-11 p-0"
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seções da Tela */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-extrabold text-foreground">
                  Seções do App (Carrossel, Grid ou Scroll Infinito)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Vincule seções a categorias, coleções ou formulários e defina como cada bloco é exibido.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAddSection}
                className="h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Nova Seção</span>
              </Button>
            </div>

            <div className="space-y-3">
              {sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  className="p-4 rounded-xl border border-border bg-background space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={sec.is_active ? "default" : "outline"}
                        onClick={() =>
                          setSections((prev) =>
                            prev.map((s) =>
                              s.id === sec.id ? { ...s, is_active: !s.is_active } : s,
                            ),
                          )
                        }
                        className="h-11 min-h-11 px-3 rounded-xl text-xs font-bold gap-2 cursor-pointer"
                      >
                        {sec.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                        <span>{sec.is_active ? "Ativa" : "Oculta"}</span>
                      </Button>
                      <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={idx === 0}
                        onClick={() => moveSection(idx, -1)}
                        className="size-11 min-h-11 min-w-11 p-0"
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={idx === sections.length - 1}
                        onClick={() => moveSection(idx, 1)}
                        className="size-11 min-h-11 min-w-11 p-0"
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setSections((prev) => prev.filter((s) => s.id !== sec.id))
                        }
                        className="size-11 min-h-11 min-w-11 p-0 text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Título da Seção</Label>
                      <Input
                        value={sec.title || ""}
                        onChange={(e) =>
                          setSections((prev) =>
                            prev.map((s) => (s.id === sec.id ? { ...s, title: e.target.value } : s)),
                          )
                        }
                        className="h-11 min-h-11 rounded-xl text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Tipo de Bloco</Label>
                      <Select
                        value={sec.section_type}
                        onValueChange={(val) =>
                          setSections((prev) =>
                            prev.map((s) =>
                              s.id === sec.id
                                ? { ...s, section_type: val as BrandedAppSectionType }
                                : s,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTION_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Formato Visual</Label>
                      <Select
                        value={sec.layout_mode}
                        onValueChange={(val) =>
                          setSections((prev) =>
                            prev.map((s) =>
                              s.id === sec.id
                                ? { ...s, layout_mode: val as AppSectionLayoutMode }
                                : s,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LAYOUT_MODE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Exibir na Aba</Label>
                      <Select
                        value={sec.tab_id || "home"}
                        onValueChange={(val) =>
                          setSections((prev) =>
                            prev.map((s) => (s.id === sec.id ? { ...s, tab_id: val } : s)),
                          )
                        }
                      >
                        <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {navigationTabs.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Vínculo com Fonte Real (Categoria / Coleção / Formulário) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Origem dos Dados</Label>
                      <Select
                        value={sec.source_type}
                        onValueChange={(val) =>
                          setSections((prev) =>
                            prev.map((s) =>
                              s.id === sec.id
                                ? { ...s, source_type: val as AppSectionSourceType, source_id: null }
                                : s,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todo o Catálogo</SelectItem>
                          <SelectItem value="featured">Destaques</SelectItem>
                          <SelectItem value="offers">Em Oferta</SelectItem>
                          <SelectItem value="category">Categoria Específica</SelectItem>
                          <SelectItem value="collection">Coleção Específica</SelectItem>
                          <SelectItem value="services">Serviços & Agenda</SelectItem>
                          <SelectItem value="tourism">Pacotes de Turismo</SelectItem>
                          <SelectItem value="events">Eventos</SelectItem>
                          <SelectItem value="classifieds">Portfólio / Veículos / Imóveis</SelectItem>
                          <SelectItem value="form">Formulário / Pesquisa</SelectItem>
                          <SelectItem value="api_quoter">API Cotação Turismo</SelectItem>
                          <SelectItem value="corporate_cta">Link Corporativo</SelectItem>
                          <SelectItem value="omni">Omni Builder (Página/Bloco)</SelectItem>
                          <SelectItem value="jobs">Mural de Vagas</SelectItem>
                          <SelectItem value="reviews">Avaliações Verificadas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Cidade Alvo (Opcional)</Label>
                      <Input
                        value={sec.city_filter || ""}
                        onChange={(e) =>
                          setSections((prev) =>
                            prev.map((s) =>
                              s.id === sec.id ? { ...s, city_filter: e.target.value || null } : s,
                            ),
                          )
                        }
                        placeholder="Ex: Chapecó, Floripa (vazio = todas)"
                        className="h-11 min-h-11 rounded-xl text-xs"
                      />
                    </div>

                    {sec.source_type === "category" && (
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">Selecionar Categoria</Label>
                        <Select
                          value={sec.source_id || ""}
                          onValueChange={(val) =>
                            setSections((prev) =>
                              prev.map((s) => (s.id === sec.id ? { ...s, source_id: val } : s)),
                            )
                          }
                        >
                          <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                            <SelectValue placeholder="Escolha a categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {(setup?.categories || []).map((c: any) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {sec.source_type === "collection" && (
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">Selecionar Coleção</Label>
                        <Select
                          value={sec.source_id || ""}
                          onValueChange={(val) =>
                            setSections((prev) =>
                              prev.map((s) => (s.id === sec.id ? { ...s, source_id: val } : s)),
                            )
                          }
                        >
                          <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                            <SelectValue placeholder="Escolha a coleção" />
                          </SelectTrigger>
                          <SelectContent>
                            {(setup?.collections || []).map((col: any) => (
                              <SelectItem key={col.id} value={col.id}>
                                {col.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {(sec.source_type === "form" ||
                      sec.section_type === "lead_form" ||
                      sec.section_type === "survey_form") && (
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">Selecionar Formulário / Pesquisa</Label>
                        <Select
                          value={sec.source_id || ""}
                          onValueChange={(val) =>
                            setSections((prev) =>
                              prev.map((s) => (s.id === sec.id ? { ...s, source_id: val } : s)),
                            )
                          }
                        >
                          <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                            <SelectValue placeholder="Escolha um formulário ativo" />
                          </SelectTrigger>
                          <SelectContent>
                            {(setup?.forms || []).map((f: any) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {sec.section_type === "omni_document" && (
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">Página Publicada do Omni Builder</Label>
                        <Select
                          value={sec.source_id || String(sec.config?.omni_document_id || "")}
                          onValueChange={(val) =>
                            setSections((prev) =>
                              prev.map((s) =>
                                s.id === sec.id
                                  ? {
                                      ...s,
                                      source_type: "omni",
                                      source_id: val,
                                      config: { ...(s.config || {}), omni_document_id: val },
                                    }
                                  : s,
                              ),
                            )
                          }
                        >
                          <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                            <SelectValue placeholder="Escolha uma página do Omni Builder" />
                          </SelectTrigger>
                          <SelectContent>
                            {(setup?.omniDocuments || []).map((doc) => (
                              <SelectItem key={doc.id} value={doc.id}>
                                {doc.title} ({doc.slug || "página"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {sec.section_type === "omni_block" && (
                      <div className="space-y-1">
                        <Label className="text-xs font-bold">Bloco Canônico do Omni Builder</Label>
                        <Select
                          value={String(sec.config?.omni_block_id || sec.source_id || "")}
                          onValueChange={(val) =>
                            setSections((prev) =>
                              prev.map((s) =>
                                s.id === sec.id
                                  ? {
                                      ...s,
                                      source_type: "omni",
                                      source_id: val,
                                      config: { ...(s.config || {}), omni_block_id: val },
                                    }
                                  : s,
                              ),
                            )
                          }
                        >
                          <SelectTrigger className="h-11 min-h-11 rounded-xl text-xs">
                            <SelectValue placeholder="Selecione um bloco visual" />
                          </SelectTrigger>
                          <SelectContent>
                            {SITE_BUILDER_BLOCKS.slice(0, 60).map((blk) => (
                              <SelectItem key={blk.id} value={blk.id}>
                                {blk.name} ({blk.category})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: IDENTIDADE, LOGO PROPORCIONAL & DOMÍNIO PRÓPRIO */}
      {activeTab === "identity" && (
        <BrandedAppIdentityDomainPanel
          storeId={setup.store.id}
          storeSlug={storeSlug}
          storeName={setup.store.name || appName}
          appName={appName}
          onAppNameChange={setAppName}
          shortName={shortName}
          onShortNameChange={setShortName}
          description={description}
          onDescriptionChange={setDescription}
          themeColor={themeColor}
          onThemeColorChange={setThemeColor}
          backgroundColor={backgroundColor}
          onBackgroundColorChange={setBackgroundColor}
          logoSquareUrl={logoSquareUrl}
          onLogoSquareUrlChange={setLogoSquareUrl}
          coverUrl={coverUrl}
          onCoverUrlChange={setCoverUrl}
          onIconBundleUploaded={handleIconBundleUploaded}
          entryAnimation={entryAnimation}
          onEntryAnimationChange={setEntryAnimation}
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          customDomain={customDomain}
          onCustomDomainChange={setCustomDomain}
          customDomainStatus={customDomainStatus}
          onCustomDomainStatusChange={setCustomDomainStatus}
          omniPageId={omniPageId}
          onOmniPageIdChange={setOmniPageId}
          omniDocuments={setup.omniDocuments || []}
          allowCustomerSelfSignup={allowCustomerSelfSignup}
          onAllowCustomerSelfSignupChange={setAllowCustomerSelfSignup}
          cityTargetingEnabled={cityTargetingEnabled}
          onCityTargetingEnabledChange={setCityTargetingEnabled}
        />
      )}

      {/* ABA 4: TELEMETRIA & KIT QR */}
      {activeTab === "telemetry" && (
        <BrandedAppTelemetryPanel
          telemetry={telemetry}
          isLoading={telemetryLoading}
          isError={telemetryError}
          onRetry={() => refetchTelemetry()}
          appUrl={
            customDomain.trim() && customDomainStatus === "active"
              ? `https://${customDomain.trim()}`
              : fullAppUrl
          }
          storeName={setup?.store?.name || appName}
        />
      )}

      {/* ABA 5: GOVERNANÇA */}
      {activeTab === "governance" && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <PwaLegalDisclaimer
            storeName={setup?.store?.name || appName}
            checked={legalAccepted}
            onCheckedChange={setLegalAccepted}
          />
        </div>
      )}
    </div>
  );
}
