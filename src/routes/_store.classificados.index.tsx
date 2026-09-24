import {
  Tag,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Check,
  Home,
  Car as CarIcon,
  Laptop as LaptopIcon,
  Wrench as WrenchIcon,
  Plane,
  Utensils,
  Gift,
  Briefcase,
  Lock,
} from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MagnifyingGlass,
  MapPin,
  Clock,
  Plus,
  Bed,
  Car,
  Ruler,
  Users,
  Truck,
  CreditCard,
  ArrowsLeftRight,
  Rows,
  SquaresFour,
  ListDashes,
  Flame,
  ArrowRight,
  WhatsappLogo,
  X,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SlidersHorizontal } from "lucide-react";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import { type ViewModeType, type FilterChipOption } from "@/components/commerce/discovery-control-bar";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { getPublicClassifieds, trackClassifiedWhatsAppClick } from "@/services/classifieds.functions";
import { CANONICAL_CITIES } from "@/lib/constants/cities";
import { resolveClassifiedNiche } from "@/lib/classifieds/semantics";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";

function getClassifiedCover(item: any): string | null {
  if (!item) return null;
  const imgs = item.images || item.media_urls || item.photos;
  if (Array.isArray(imgs) && imgs.length > 0) return imgs[0];
  if (typeof item.cover_image === "string" && item.cover_image) return item.cover_image;
  return null;
}

function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);
}

export const Route = createFileRoute("/_store/classificados/")({
  validateSearch: (search: Record<string, unknown>): {
    category?: string;
    dealType?: string;
    search?: string;
    subniche?: string;
    ponto?: string;
  } => ({
    category: typeof search.category === "string" ? search.category : undefined,
    dealType: typeof search.dealType === "string" ? search.dealType : undefined,
    search: typeof search.search === "string" ? search.search : undefined,
    subniche: typeof search.subniche === "string" ? search.subniche : undefined,
    ponto: typeof search.ponto === "string" ? search.ponto : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Classificados, Imóveis & Desapegos | Waesy" },
      {
        name: "description",
        content:
          "Compre, alugue imóveis, reserve hospedagens por temporada, veículos e serviços na sua região.",
      },
    ],
  }),
  loader: async () => {
    try {
      const [banners, hotpages, classifieds] = await Promise.all([
        listActiveBanners({ data: { placement: "classificados" } }).catch(() => []),
        listHotpages({ data: { module: "classificados" } }).catch(() => []),
        getPublicClassifieds({ data: {} }).catch(() => []),
      ]);

      return {
        banners: banners || [],
        hotpages: hotpages || [],
        classifieds: classifieds || [],
      };
    } catch (err) {
      console.warn("[classificados] Loader fallback acionado:", err);
      return { banners: [], hotpages: [], classifieds: [] };
    }
  },
  component: ClassifiedsMasterPage,
});

const CLASSIFIEDS_HOTPAGES = [
  {
    id: "hp-class-1",
    title: "Imóveis",
    slug: "real_estate",
    cover_image_url: "",
    badge_label: "Imóveis",
    show_title: false,
    show_overlay: false,
  },
  {
    id: "hp-class-2",
    title: "Hospedagem",
    slug: "real_estate_temporada",
    cover_image_url: "",
    badge_label: "Diária & Temporada",
    show_title: false,
    show_overlay: false,
  },
  {
    id: "hp-class-3",
    title: "Veículos",
    slug: "vehicle",
    cover_image_url: "",
    badge_label: "Veículos",
    show_title: false,
    show_overlay: false,
  },
  {
    id: "hp-class-4",
    title: "Desapego",
    slug: "sale",
    cover_image_url: "",
    badge_label: "Usados",
    show_title: false,
    show_overlay: false,
  },
];

const CLASSIFIED_CHIPS: FilterChipOption[] = [
  { id: "todos", label: "Todos", emoji: "🏷️", icon: Tag },
  { id: "real_estate", label: "Imóveis", emoji: "🏠", icon: Home },
  { id: "vehicle", label: "Veículos", emoji: "🚗", icon: CarIcon },
  { id: "business", label: "Negócios", emoji: "💼", icon: Briefcase },
  { id: "travel", label: "Viagens", emoji: "✈️", icon: Plane },
  { id: "food", label: "Gastronomia", emoji: "🍲", icon: Utensils },
  { id: "sale", label: "Desapego", emoji: "💻", icon: LaptopIcon },
  { id: "digital", label: "Digitais", emoji: "📁", icon: FileText },
  { id: "service", label: "Serviços", emoji: "🛠️", icon: WrenchIcon },
  { id: "donation", label: "Doações", emoji: "🎁", icon: Gift },
];

const REAL_ESTATE_DEAL_TYPES = [
  { id: "todos", label: "Todos Imóveis" },
  { id: "aluguel", label: "Aluguel Mensal" },
  { id: "venda", label: "Comprar / Venda" },
  { id: "temporada", label: "Hospedagem & Temporada" },
];

const REAL_ESTATE_FACETS = [
  { id: "furnished", label: "Mobiliado" },
  { id: "garage", label: "Garagem / Vaga" },
  { id: "pool", label: "Piscina" },
  { id: "air_conditioning", label: "Ar Condicionado" },
];

const VEHICLE_GEARBOX_OPTIONS = [
  { id: "todos", label: "Todos Câmbios" },
  { id: "automatic", label: "Automático" },
  { id: "manual", label: "Manual" },
];

const VEHICLE_FUEL_OPTIONS = [
  { id: "todos", label: "Todos Combustíveis" },
  { id: "flex", label: "Flex" },
  { id: "gasolina", label: "Gasolina" },
  { id: "eletrico", label: "Elétrico / Híbrido" },
  { id: "diesel", label: "Diesel" },
];


const DESAPEGO_SUB_OPTIONS = [
  { id: "todos", label: "Todos Desapegos" },
  { id: "smartphones", label: "Smartphones" },
  { id: "computadores", label: "Notebooks & PCs" },
  { id: "moveis", label: "Móveis" },
  { id: "eletrodomesticos", label: "Eletrodomésticos" },
  { id: "games", label: "Games" },
  { id: "moda_brecho", label: "Roupas & Calçados" },
];

const SERVICE_MODALITY_OPTIONS = [
  { id: "todos", label: "Todas Modalidades" },
  { id: "presencial", label: "Presencial" },
  { id: "domicilio", label: "A Domicílio" },
  { id: "remoto", label: "Online / Remoto" },
];

const JOB_REGIME_OPTIONS = [
  { id: "todos", label: "Todos Regimes" },
  { id: "CLT", label: "CLT" },
  { id: "PJ", label: "PJ / Freelancer" },
  { id: "Estágio", label: "Estágio" },
  { id: "remoto", label: "Home Office" },
];

const BUSINESS_REVENUE_OPTIONS = [
  { id: "todos", label: "Qualquer Faturamento" },
  { id: "under_50k", label: "Até R$ 50k/mês" },
  { id: "50k_150k", label: "R$ 50k - R$ 150k" },
  { id: "150k_500k", label: "R$ 150k - R$ 500k" },
  { id: "over_500k", label: "R$ 500k+/mês" },
];

const BUSINESS_POINT_OPTIONS = [
  { id: "todos", label: "Todos os Pontos" },
  { id: "rua", label: "Loja de Rua" },
  { id: "shopping", label: "Shopping / Galeria" },
  { id: "gastronomico", label: "Ponto Gastronômico" },
  { id: "galpao", label: "Galpão / Indústria" },
  { id: "quiosque", label: "Quiosque" },
  { id: "sala", label: "Sala Comercial" },
];

const FOOD_SUBNICHE_OPTIONS = [
  { id: "todos", label: "Toda Gastronomia" },
  { id: "pizzaria", label: "🍕 Pizzaria" },
  { id: "hamburgueria", label: "🍔 Hamburgueria" },
  { id: "confeitaria", label: "🎂 Doces & Bolos" },
  { id: "marmitaria", label: "🍱 Marmitaria" },
  { id: "cafe", label: "☕ Cafeteria" },
  { id: "padaria", label: "🥖 Panificação" },
  { id: "artesanal", label: "🧀 Queijos & Vinhos" },
];

const BUSINESS_GOAL_OPTIONS = [
  { id: "todos", label: "Todos os Negócios" },
  { id: "venda", label: "Empresas à Venda" },
  { id: "ponto", label: "Pontos Comerciais" },
  { id: "investimento", label: "Investimento & Sócios" },
];

const SERVICE_AUDIENCE_OPTIONS = [
  { id: "todos", label: "Todos os Serviços" },
  { id: "pessoa", label: "Para Você (Pessoas)" },
  { id: "empresa", label: "Para Empresas (CNPJ)" },
];

const SERVICE_SUBNICHE_OPTIONS = [
  { id: "todos", label: "Todas Áreas" },
  { id: "oab", label: "⚖️ Jurídico" },
  { id: "crea", label: "📐 Engenharia" },
  { id: "crm", label: "🩺 Saúde" },
  { id: "crc", label: "📊 Contabilidade" },
  { id: "tech", label: "💻 Tecnologia" },
];

function ClassifiedsMasterPage() {
  const { banners, hotpages, classifieds: initialClassifieds } = Route.useLoaderData();
  const searchParams = Route.useSearch();

  const initialCategory = (() => {
    const raw = searchParams.category?.toLowerCase();
    if (!raw) return "todos";
    if (raw === "negocios" || raw === "negocio" || raw === "business" || raw === "m&a") return "business";
    if (raw === "doacoes" || raw === "doacao" || raw === "donation") return "donation";
    if (raw === "gastronomia" || raw === "food") return "food";
    if (raw === "imoveis" || raw === "real_estate") return "real_estate";
    if (raw === "veiculos" || raw === "vehicle") return "vehicle";
    if (raw === "servicos" || raw === "service") return "service";
    if (raw === "turismo" || raw === "travel") return "travel";
    return raw;
  })();

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedDealType, setSelectedDealType] = useState(searchParams.dealType || "todos");
  const [selectedCity, setSelectedCity] = useState("todos");
  const [selectedDelivery, setSelectedDelivery] = useState<"todos" | "local" | "shipping">("todos");
  const [onlyInstallments, setOnlyInstallments] = useState(false);
  const [onlyTrade, setOnlyTrade] = useState(false);
  const [search, setSearch] = useState(searchParams.search || "");
  const [viewMode, setViewMode] = useState<ViewModeType>("feed");

  // Facetas Especializadas de Imóveis
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Facetas Especializadas de Veículos
  const [vehicleGearbox, setVehicleGearbox] = useState<string>("todos");
  const [vehicleFuel, setVehicleFuel] = useState<string>("todos");
  const [onlySingleOwner, setOnlySingleOwner] = useState(false);

  // Facetas Especializadas de Negócios
  const [businessGoal, setBusinessGoal] = useState<string>("todos");
  const [businessPointType, setBusinessPointType] = useState<string>(searchParams.ponto || "todos");
  const [businessRevenueRange, setBusinessRevenueRange] = useState<string>("todos");
  const [onlyBusinessWithNda, setOnlyBusinessWithNda] = useState<boolean>(false);

  // Facetas Especializadas de Gastronomia & Serviços
  const [serviceAudience, setServiceAudience] = useState<string>("todos");
  const [foodSubniche, setFoodSubniche] = useState<string>(searchParams.subniche || "todos");
  const [serviceSubniche, setServiceSubniche] = useState<string>("todos");

  // Faceta de Produtos Digitais
  const [onlyInstantDigital, setOnlyInstantDigital] = useState(false);

  // Chips de categoria enriquecidos dinamicamente pelo CMS (Admin Master /botoes)
  const dynamicCategoryChips = useMemo(() => {
    return CLASSIFIED_CHIPS.map((chip) => {
      const match = (hotpages || []).find((h: any) =>
        h.slug === chip.id ||
        h.slug === `classificados-${chip.id}` ||
        h.target_route?.includes(`category=${chip.id}`) ||
        h.title?.toLowerCase() === chip.label.toLowerCase()
      );
      return {
        ...chip,
        label: match?.title || chip.label,
        customIconUrl: match?.custom_icon_url || null,
        bgMediaUrl: match?.bg_media_url || match?.cover_image_url || null,
        textColor: match?.text_color || null,
        isActive: match ? match.is_active !== false : true,
      };
    }).filter((c) => c.isActive !== false);
  }, [hotpages]);
  // Facetas Especializadas de Desapego, Serviços e Vagas
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("todos");
  const [selectedServiceModality, setSelectedServiceModality] = useState<string>("todos");
  const [selectedJobRegime, setSelectedJobRegime] = useState<string>("todos");
  const [onlyBoosted, setOnlyBoosted] = useState<boolean>(false);
  const [mobileFilterSheetOpen, setMobileFilterSheetOpen] = useState<boolean>(false);

  const toggleAmenity = (id: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCity !== "todos") count++;
    if (onlyBoosted) count++;
    if (onlyTrade) count++;
    if (onlyInstallments) count++;
    if (selectedDelivery !== "todos") count++;
    if (selectedDealType !== "todos") count++;
    if (selectedAmenities.length > 0) count += selectedAmenities.length;
    if (vehicleGearbox !== "todos") count++;
    if (vehicleFuel !== "todos") count++;
    if (onlySingleOwner) count++;
    if (selectedSubcategory !== "todos") count++;
    if (selectedServiceModality !== "todos") count++;
    if (selectedJobRegime !== "todos") count++;
    if (businessGoal !== "todos") count++;
    if (businessPointType !== "todos") count++;
    if (foodSubniche !== "todos") count++;
    if (serviceAudience !== "todos") count++;
    if (serviceSubniche !== "todos") count++;
    if (onlyInstantDigital) count++;
    return count;
  }, [
    selectedCity,
    onlyBoosted,
    onlyTrade,
    onlyInstallments,
    selectedDelivery,
    selectedDealType,
    selectedAmenities,
    vehicleGearbox,
    vehicleFuel,
    onlySingleOwner,
    selectedSubcategory,
    selectedServiceModality,
    selectedJobRegime,
    businessGoal,
    businessPointType,
    foodSubniche,
    serviceAudience,
    serviceSubniche,
    onlyInstantDigital,
  ]);

  const handleClearAllFilters = () => {
    setSelectedCity("todos");
    setSelectedDealType("todos");
    setSelectedAmenities([]);
    setVehicleGearbox("todos");
    setVehicleFuel("todos");
    setOnlySingleOwner(false);
    setSelectedSubcategory("todos");
    setSelectedServiceModality("todos");
    setSelectedJobRegime("todos");
    setOnlyTrade(false);
    setOnlyInstallments(false);
    setOnlyBoosted(false);
    setSelectedDelivery("todos");
    setBusinessGoal("todos");
    setBusinessPointType("todos");
    setFoodSubniche("todos");
    setServiceAudience("todos");
    setServiceSubniche("todos");
    setOnlyInstantDigital(false);
  };

  const { data: classifieds } = useQuery({
    queryKey: ["classifieds-master-list", selectedCategory, selectedDealType, search],
    queryFn: () =>
      getPublicClassifieds({
        data: {
          category:
            selectedCategory !== "todos" &&
            selectedCategory !== "digital" &&
            selectedCategory !== "donation" &&
            selectedCategory !== "travel" &&
            selectedCategory !== "food" &&
            selectedCategory !== "business"
              ? selectedCategory
              : undefined,
          dealType: selectedCategory === "real_estate" && selectedDealType !== "todos" ? selectedDealType : undefined,
          search: search || undefined,
        },
      }),
    initialData: initialClassifieds,
  });

  const filtered = (classifieds || []).filter((item: any) => {
    // Tratamento de Categoria e Nichos Polimórficos
    if (selectedCategory === "digital") {
      const isDigital = item.is_digital || item.category === "digital" || item.attributes?.is_digital;
      if (!isDigital) return false;
    } else if (selectedCategory === "donation") {
      const isDonation = item.is_free_donation || item.price_cents === 0 || item.attributes?.is_free_donation;
      if (!isDonation) return false;
    } else if (selectedCategory === "business") {
      const isBiz =
        item.category === "business" ||
        item.category === "negocios" ||
        item.category === "negocio" ||
        Boolean(item.attributes?.is_business_sale) ||
        item.attributes?.niche === "business";
      if (!isBiz) return false;

      if (businessGoal !== "todos") {
        const bType = String(item.attributes?.business_type || "").toLowerCase();
        const hasInv = Boolean(item.attributes?.target_investment_cents || item.attributes?.investment_model);
        if (businessGoal === "venda") {
          if (bType !== "venda_total" && bType !== "cotas" && bType !== "franquia") return false;
        } else if (businessGoal === "ponto") {
          if (bType !== "repasse_ponto") return false;
        } else if (businessGoal === "investimento") {
          if (bType !== "busca_socio" && bType !== "captacao_investimento" && !hasInv) return false;
        }
      }

      if (businessPointType !== "todos") {
        const pt = (item.attributes?.commercial_point_type || "").toLowerCase();
        if (!pt.includes(businessPointType.toLowerCase())) return false;
      }

      if (businessRevenueRange !== "todos") {
        const rev = Number(item.attributes?.monthly_revenue_cents) || 0;
        if (businessRevenueRange === "under_50k" && rev > 5000000) return false;
        if (businessRevenueRange === "50k_150k" && (rev < 5000000 || rev > 15000000)) return false;
        if (businessRevenueRange === "150k_500k" && (rev < 15000000 || rev > 50000000)) return false;
        if (businessRevenueRange === "over_500k" && rev < 50000000) return false;
      }

      if (onlyBusinessWithNda) {
        const reqNda = Boolean(item.attributes?.requires_nda || item.attributes?.is_confidential);
        if (!reqNda) return false;
      }
    } else if (selectedCategory === "travel") {
      const isTravel =
        item.category === "travel" ||
        item.category === "viagem" ||
        item.category === "tourism" ||
        item.attributes?.niche_category === "travel";
      if (!isTravel) return false;
    } else if (selectedCategory === "food") {
      const isFood =
        item.category === "food" ||
        item.category === "gastronomia" ||
        item.attributes?.niche_category === "food";
      if (!isFood) return false;

      if (foodSubniche !== "todos") {
        const sub = (item.attributes?.food_subniche || item.attributes?.subniche || "").toLowerCase();
        if (!sub.includes(foodSubniche.toLowerCase())) return false;
      }
    } else if (selectedCategory === "service") {
      const isService =
        item.category === "service" ||
        item.category === "servicos" ||
        item.category === "servico";
      if (!isService) return false;

      if (serviceAudience !== "todos") {
        const aud = (item.attributes?.audience || item.attributes?.target_audience || "").toLowerCase();
        const isB2B = Boolean(item.attributes?.is_b2b || aud === "b2b" || aud === "empresa" || aud === "cnpj");
        if (serviceAudience === "empresa" && !isB2B) return false;
        if (serviceAudience === "pessoa" && isB2B) return false;
      }

      if (serviceSubniche !== "todos") {
        const sub = (item.attributes?.service_subniche || item.attributes?.professional_council || "").toLowerCase();
        if (!sub.includes(serviceSubniche.toLowerCase())) return false;
      }
    } else if (selectedCategory !== "todos" && item.category !== selectedCategory) {
      return false;
    }

    if (selectedCategory === "real_estate" && selectedDealType !== "todos") {
      if (item.deal_type !== selectedDealType) return false;
    }

    // Filtro Facetado de Imóveis (Mobiliado, Garagem, Piscina, Ar Condicionado)
    if (selectedCategory === "real_estate" && selectedAmenities.length > 0) {
      const rawAmenities = item.amenities || item.attributes?.amenities || [];
      const itemAmenities = Array.isArray(rawAmenities)
        ? rawAmenities.map((a: any) => String(a).toLowerCase())
        : [String(rawAmenities).toLowerCase()];
      
      const contentLower = `${item.title || ""} ${item.content || ""}`.toLowerCase();

      const hasAll = selectedAmenities.every((amenity) => {
        if (amenity === "furnished") {
          return itemAmenities.includes("furnished") || itemAmenities.includes("mobiliado") || contentLower.includes("mobiliado");
        }
        if (amenity === "garage") {
          return itemAmenities.includes("garage") || itemAmenities.includes("garagem") || itemAmenities.includes("vaga") || contentLower.includes("garagem") || contentLower.includes("vaga");
        }
        if (amenity === "pool") {
          return itemAmenities.includes("pool") || itemAmenities.includes("piscina") || contentLower.includes("piscina");
        }
        if (amenity === "air_conditioning") {
          return itemAmenities.includes("air_conditioning") || itemAmenities.includes("ar condicionado") || contentLower.includes("ar condicionado") || contentLower.includes("ar-condicionado");
        }
        return true;
      });

      if (!hasAll) return false;
    }

    // Filtro Facetado de Veículos (Câmbio, Combustível, Único Dono)
    if (selectedCategory === "vehicle") {
      if (vehicleGearbox !== "todos") {
        const trans = String(item.attributes?.transmission || item.attributes?.gearbox || "").toLowerCase();
        if (!trans.includes(vehicleGearbox.toLowerCase())) return false;
      }
      if (vehicleFuel !== "todos") {
        const fuel = String(item.attributes?.fuel_type || item.attributes?.fuel || "").toLowerCase();
        if (!fuel.includes(vehicleFuel.toLowerCase())) return false;
      }
      if (onlySingleOwner) {
        const isSingle = !!(item.attributes?.single_owner || item.attributes?.unico_dono);
        if (!isSingle) return false;
      }
    }

    // Cidade
    if (selectedCity !== "todos") {
      const city = item.location_name || item.location_text || "";
      if (!city.toLowerCase().includes(selectedCity.toLowerCase())) return false;
    }

    // Entrega / Retirada
    if (selectedDelivery === "local") {
      const mode = item.attributes?.delivery_mode || item.delivery_mode;
      if (mode !== "local_delivery" && mode !== "both") return false;
    } else if (selectedDelivery === "shipping") {
      const mode = item.attributes?.delivery_mode || item.delivery_mode;
      if (mode !== "national_shipping" && mode !== "both") return false;
    }

    // Condições Comerciais
    if (onlyInstallments) {
      const acceptsCard = item.attributes?.accepts_card ?? item.accepts_card;
      const maxInst = item.attributes?.max_installments ?? item.max_installments;
      if (!acceptsCard || (maxInst && maxInst <= 1)) return false;
    }
    if (onlyTrade) {
      const acceptsTrade = item.attributes?.accepts_trade ?? item.accepts_trade;
      if (!acceptsTrade) return false;
    }
    if (onlyInstantDigital) {
      const isDig = item.is_digital || item.category === "digital" || item.attributes?.is_digital;
      if (!isDig) return false;
    }

    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-6 space-y-4 pb-24">
        {/* ── NÍVEL 1 & NÍVEL 2: TOOLBAR CONSOLIDADA DE 2 NÍVEIS (APPLE & AIRBNB STANDARD) ── */}
        <div className="sticky top-0 lg:static z-20 bg-background lg:bg-transparent px-0 pt-1 pb-2 space-y-2 border-b border-border/40 lg:border-b-0">
          {/* NÍVEL 1: A Barra de Ação Principal (Tudo na mesma linha) */}
          <div className="flex items-center gap-2 w-full">
            {/* Search Input (Barra de busca ocupando a maior parte do espaço) */}
            <div className="relative flex-1 min-w-0">
              <MagnifyingGlass
                size={16}
                weight="bold"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar imóveis, carros, serviços, vagas, desapegos..."
                className="h-10 sm:h-11 pl-9.5 pr-8 rounded-xl bg-card border-border/70 text-xs sm:text-sm placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-primary w-full"
                aria-label="Buscar nos classificados"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-colors cursor-pointer"
                  aria-label="Limpar busca"
                >
                  <X size={14} weight="bold" />
                </button>
              )}
            </div>

            {/* Botão de Filtros Avançados */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setMobileFilterSheetOpen(true)}
              className={cn(
                "h-10 sm:h-11 px-3 sm:px-3.5 rounded-xl border border-border/70 text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-all active:scale-95",
                activeFiltersCount > 0
                  ? "bg-primary/10 border-primary/40 text-primary font-bold"
                  : "bg-card hover:bg-muted/50 text-foreground"
              )}
              title="Filtros Avançados"
              aria-label="Abrir filtros avançados"
            >
              <SlidersHorizontal className="size-4 shrink-0" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            {/* Toggles de Visualização (Feed vs. Grade vs. Lista) */}
            <div className="flex items-center p-1 rounded-xl bg-muted/40 border border-border/50 shrink-0 h-10 sm:h-11">
              <button
                type="button"
                onClick={() => setViewMode("feed")}
                className={cn(
                  "h-full px-2 sm:px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center",
                  viewMode === "feed"
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Modo Feed / Trilhos"
                aria-label="Feed"
              >
                <Rows size={16} weight={viewMode === "feed" ? "fill" : "bold"} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "h-full px-2 sm:px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center",
                  viewMode === "grid"
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Modo Grade"
                aria-label="Grade"
              >
                <SquaresFour size={16} weight={viewMode === "grid" ? "fill" : "bold"} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "h-full px-2 sm:px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center",
                  viewMode === "list"
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Modo Lista"
                aria-label="Lista"
              >
                <ListDashes size={16} weight={viewMode === "list" ? "fill" : "bold"} />
              </button>
            </div>

            {/* Botão de Anunciar / Publicar (Acesso Direto ao Fluxo) */}
            <Button
              asChild
              className="h-10 sm:h-11 px-3 sm:px-4 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold text-xs sm:text-sm shrink-0 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Link to="/conta/classificados/novo">
                <Plus size={16} weight="bold" />
                <span className="hidden sm:inline">Anunciar</span>
              </Link>
            </Button>
          </div>

          {/* NÍVEL 2: Navegação de Categorias (Clean Tabs Dinâmicas do CMS - Padrão Botão Grande) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 w-full focus:outline-none">
            {dynamicCategoryChips.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    if (cat.id !== "real_estate") setSelectedDealType("todos");
                  }}
                  className={cn(
                    "h-10 sm:h-11 px-3.5 sm:px-4 rounded-xl border text-xs sm:text-sm font-semibold shrink-0 flex items-center gap-2 transition-all cursor-pointer select-none active:scale-98",
                    isActive
                      ? "bg-foreground text-background border-foreground font-bold"
                      : "bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground border-border/70"
                  )}
                  style={(cat as any).textColor ? { color: (cat as any).textColor } : undefined}
                >
                  {(cat as any).customIconUrl ? (
                    <img src={(cat as any).customIconUrl} alt="" className="size-4 object-contain shrink-0" />
                  ) : Icon ? (
                    <Icon className={cn("size-4 shrink-0", isActive ? "text-background" : "text-muted-foreground/80 group-hover:text-foreground")} />
                  ) : null}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. Banners Contextuais */}
        {banners && banners.length > 0 && (
          <section aria-label="Banners de Classificados">
            <BannerHeroCarousel banners={banners} />
          </section>
        )}

        {/* 2. Hotpages Horizontal Rail */}
        {(hotpages?.length > 0 || CLASSIFIEDS_HOTPAGES.length > 0) && (
          <section aria-label="Destaques de Classificados">
            <HotpagesRail
              hotpages={(hotpages && hotpages.length > 0 ? hotpages : CLASSIFIEDS_HOTPAGES) as any}
              activeSlug={selectedCategory}
              onSelect={(slug) => {
                if (slug === "real_estate_temporada") {
                  setSelectedCategory("real_estate");
                  setSelectedDealType("temporada");
                } else {
                  setSelectedCategory(slug);
                  setSelectedDealType("todos");
                }
              }}
            />
          </section>
        )}

        {/* ── MODAL FULL DE FILTROS AVANÇADOS (PROGRESSIVE DISCLOSURE) ── */}
        <Dialog open={mobileFilterSheetOpen} onOpenChange={setMobileFilterSheetOpen}>
          <DialogContent className="max-w-lg rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-primary" />
                <DialogTitle className="text-base font-bold">Filtros Avançados</DialogTitle>
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                    {activeFiltersCount} ativo{activeFiltersCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              {activeFiltersCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAllFilters}
                  className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                >
                  Limpar Todos
                </Button>
              )}
            </DialogHeader>

            {/* Seções de Filtro em Cards Limpos */}
            <div className="space-y-4 text-xs">
              {/* 1. Cidades */}
              <div className="space-y-2">
                <span className="font-bold font-mono uppercase text-muted-foreground block text-[10px] tracking-wider">
                  Cidade / Região
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCity("todos")}
                    className={cn(
                      "px-3 py-1.5 rounded-xl font-mono text-xs cursor-pointer transition-all",
                      selectedCity === "todos"
                        ? "bg-foreground text-background font-bold"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                    )}
                  >
                    Todas
                  </button>
                  {CANONICAL_CITIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCity(selectedCity === c.name ? "todos" : c.name)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl font-mono text-xs cursor-pointer transition-all",
                        selectedCity === c.name
                          ? "bg-foreground text-background font-bold"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Condições Comerciais */}
              <div className="space-y-2.5 pt-2 border-t border-border/40">
                <span className="font-bold font-mono uppercase text-muted-foreground block text-[10px] tracking-wider">
                  Condições Comerciais
                </span>
                <div className="space-y-2.5 bg-muted/20 p-3 rounded-xl border border-border/40">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sheet-boosted" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <Flame className="size-3.5 text-amber-500" />
                      <span>Apenas Destaques</span>
                    </Label>
                    <Switch
                      id="sheet-boosted"
                      checked={onlyBoosted}
                      onCheckedChange={setOnlyBoosted}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sheet-trade" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <ArrowsLeftRight className="size-3.5 text-muted-foreground" />
                      <span>Aceita Troca</span>
                    </Label>
                    <Switch
                      id="sheet-trade"
                      checked={onlyTrade}
                      onCheckedChange={setOnlyTrade}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sheet-card" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <CreditCard className="size-3.5 text-muted-foreground" />
                      <span>Parcelamento no Cartão</span>
                    </Label>
                    <Switch
                      id="sheet-card"
                      checked={onlyInstallments}
                      onCheckedChange={setOnlyInstallments}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Modalidade de Entrega */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <span className="font-bold font-mono uppercase text-muted-foreground block text-[10px] tracking-wider">
                  Modalidade de Entrega
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "todos", label: "Todas" },
                    { id: "local", label: "Retirada Local / Balcão" },
                    { id: "shipping", label: "Envio Nacional / Correios" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedDelivery(m.id as any)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all",
                        selectedDelivery === m.id
                          ? "bg-foreground text-background font-bold"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Filtros Específicos por Categoria */}
              {/* IMÓVEIS */}
              {selectedCategory === "real_estate" && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <span className="font-bold font-mono uppercase text-muted-foreground block text-[10px] tracking-wider">
                    Opções de Imóveis & Hospedagem
                  </span>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Finalidade</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {REAL_ESTATE_DEAL_TYPES.map((dt) => (
                        <button
                          key={dt.id}
                          type="button"
                          onClick={() => setSelectedDealType(dt.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all",
                            selectedDealType === dt.id
                              ? "bg-foreground text-background font-bold"
                              : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                          )}
                        >
                          {dt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Comodidades</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {REAL_ESTATE_FACETS.map((facet) => {
                        const isChecked = selectedAmenities.includes(facet.id);
                        return (
                          <button
                            key={facet.id}
                            type="button"
                            onClick={() => toggleAmenity(facet.id)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all flex items-center gap-1",
                              isChecked
                                ? "bg-primary text-primary-foreground font-bold"
                                : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                            )}
                          >
                            <span>{facet.label}</span>
                            {isChecked && <Check className="size-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* VEÍCULOS */}
              {selectedCategory === "vehicle" && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <span className="font-bold font-mono uppercase text-muted-foreground block text-[10px] tracking-wider">
                    Opções de Veículos
                  </span>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Câmbio</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {VEHICLE_GEARBOX_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setVehicleGearbox(opt.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all",
                            vehicleGearbox === opt.id
                              ? "bg-foreground text-background font-bold"
                              : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Combustível</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {VEHICLE_FUEL_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setVehicleFuel(opt.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all",
                            vehicleFuel === opt.id
                              ? "bg-foreground text-background font-bold"
                              : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-muted/20 p-3 rounded-xl border border-border/40">
                    <Label htmlFor="sheet-single-owner" className="text-xs cursor-pointer">
                      Apenas Único Dono
                    </Label>
                    <Switch
                      id="sheet-single-owner"
                      checked={onlySingleOwner}
                      onCheckedChange={setOnlySingleOwner}
                    />
                  </div>
                </div>
              )}

              {/* DESAPEGOS */}
              {selectedCategory === "sale" && (
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <span className="font-bold font-mono uppercase text-muted-foreground block text-[10px] tracking-wider">
                    Subcategorias de Desapego
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DESAPEGO_SUB_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedSubcategory(opt.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all",
                          selectedSubcategory === opt.id
                            ? "bg-foreground text-background font-bold"
                            : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* GASTRONOMIA */}
              {selectedCategory === "food" && (
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <span className="font-bold font-mono uppercase text-muted-foreground block text-[10px] tracking-wider">
                    Especialidade Gastronômica
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {FOOD_SUBNICHE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFoodSubniche(opt.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all",
                          foodSubniche === opt.id
                            ? "bg-foreground text-background font-bold"
                            : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SERVIÇOS */}
              {selectedCategory === "service" && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <span className="font-bold font-mono uppercase text-muted-foreground block text-[10px] tracking-wider">
                    Opções de Serviços
                  </span>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Público-Alvo</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {SERVICE_AUDIENCE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setServiceAudience(opt.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all",
                            serviceAudience === opt.id
                              ? "bg-foreground text-background font-bold"
                              : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Área de Atuação</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {SERVICE_SUBNICHE_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setServiceSubniche(opt.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all",
                            serviceSubniche === opt.id
                              ? "bg-primary text-primary-foreground font-bold"
                              : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Modalidade</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {SERVICE_MODALITY_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedServiceModality(opt.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all",
                            selectedServiceModality === opt.id
                              ? "bg-foreground text-background font-bold"
                              : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* NEGÓCIOS & M&A */}
              {selectedCategory === "business" && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <span className="font-bold font-mono uppercase text-muted-foreground block text-[10px] tracking-wider">
                    Opções de Negócios & M&A
                  </span>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Objetivo</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {BUSINESS_GOAL_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setBusinessGoal(opt.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all",
                            businessGoal === opt.id
                              ? "bg-foreground text-background font-bold"
                              : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-muted-foreground">Tipo de Ponto Comercial</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {BUSINESS_POINT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setBusinessPointType(opt.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all",
                            businessPointType === opt.id
                              ? "bg-foreground text-background font-bold"
                              : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-muted/20 p-3 rounded-xl border border-border/40">
                    <Label htmlFor="sheet-nda" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <Lock className="size-3.5 text-muted-foreground" />
                      <span>Apenas com Sigilo / NDA Assinado</span>
                    </Label>
                    <Switch
                      id="sheet-nda"
                      checked={onlyBusinessWithNda}
                      onCheckedChange={setOnlyBusinessWithNda}
                    />
                  </div>
                </div>
              )}

              {/* VAGAS */}
              {(selectedCategory === "job" || selectedCategory === "job_offer") && (
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <span className="font-bold font-mono uppercase text-muted-foreground block text-[10px] tracking-wider">
                    Regime de Contratação
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {JOB_REGIME_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedJobRegime(opt.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-all",
                          selectedJobRegime === opt.id
                            ? "bg-foreground text-background font-bold"
                            : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PRODUTOS DIGITAIS */}
              {selectedCategory === "digital" && (
                <div className="pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between bg-muted/20 p-3 rounded-xl border border-border/40">
                    <Label htmlFor="sheet-instant-digital" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <FileText className="size-3.5 text-muted-foreground" />
                      <span>Download Imediato</span>
                    </Label>
                    <Switch
                      id="sheet-instant-digital"
                      checked={onlyInstantDigital}
                      onCheckedChange={setOnlyInstantDigital}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé Fixo da Modal */}
            <div className="pt-3 border-t border-border/40">
              <Button
                type="button"
                onClick={() => setMobileFilterSheetOpen(false)}
                className="w-full h-11 rounded-xl font-bold text-xs bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-sm"
              >
                Ver {filtered.length} {filtered.length === 1 ? "Anúncio" : "Anúncios"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 4. Lista / Grade / Feed de Anúncios */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-card rounded-2xl border border-border/60 p-8">
            <Home className="size-10 text-muted-foreground/40 mx-auto" />
            <h2 className="text-sm font-bold text-foreground">
              Nenhum anúncio encontrado com estes filtros
            </h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Tente alterar os termos da busca ou selecionar outra categoria.
            </p>
            <div className="pt-2">
              <Button asChild size="sm" className="rounded-xl h-9 px-4 text-xs font-semibold gap-1.5 bg-foreground text-background hover:bg-foreground/90 cursor-pointer">
                <Link to="/conta/classificados/novo">
                  <Plus size={14} weight="bold" />
                  <span>Publicar Anúncio</span>
                </Link>
              </Button>
            </div>
          </div>
        ) : viewMode === "list" ? (
          /* ── MODO LISTA ── */
          <section className="flex flex-col space-y-3 w-full">
            {filtered.map((item: any) => {
              const img = getClassifiedCover(item);
              const isTemporada = item.deal_type === "temporada";
              const isAluguel = item.deal_type === "aluguel";
              const itemNiche = resolveClassifiedNiche(item);
              const targetPhone = item.contact_whatsapp || item.whatsapp || item.profiles?.phone;

              return (
                <div
                  key={item.id}
                  className="group flex flex-col sm:flex-row items-stretch justify-between rounded-2xl border border-border/60 bg-card hover:border-foreground/30 transition-all overflow-hidden p-0 w-full"
                >
                  <Link
                    to="/classificados/$id"
                    params={{ id: item.id }}
                    className="relative w-full sm:w-60 md:w-72 h-48 sm:h-auto min-h-[160px] overflow-hidden bg-muted/40 shrink-0 flex items-center justify-center cursor-pointer"
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={item.title}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="size-full bg-muted/40 flex items-center justify-center">
                        <Tag size={28} className="text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap z-10">
                      <Badge className="bg-background/95 text-foreground font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md">
                        {itemNiche.shortLabel}
                      </Badge>
                      {(item.is_boosted || item.attributes?.is_boosted) && (
                        <Badge variant="outline" className="border-border/60 text-foreground font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                          Destaque
                        </Badge>
                      )}
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-between space-y-3">
                    <Link to="/classificados/$id" params={{ id: item.id }} className="space-y-1.5 block cursor-pointer">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(item.attributes?.accepts_trade || item.accepts_trade) && (
                          <Badge variant="secondary" className="text-[9px] font-mono px-1.5 py-0 rounded-md">
                            Aceita Troca
                          </Badge>
                        )}
                        {(item.attributes?.accepts_card || item.accepts_card) && (
                          <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 rounded-md">
                            Cartão até {item.attributes?.max_installments || 12}x
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>

                      <div className="flex items-baseline gap-2 pt-0.5">
                        <span className="text-lg sm:text-xl font-black text-foreground font-mono">
                          {formatMoney(item.price_cents || 0)}
                          {(itemNiche.priceSuffix || (isAluguel ? " /mês" : isTemporada ? " /diária" : "")) && (
                            <span className="text-[10px] font-normal text-muted-foreground ml-1">
                              {itemNiche.priceSuffix || (isAluguel ? "/mês" : "/diária")}
                            </span>
                          )}
                        </span>
                      </div>
                    </Link>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono truncate">
                        <MapPin size={12} weight="bold" className="shrink-0 text-primary" />
                        <span className="truncate">{item.location_name || item.location_text || "Regional"}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {targetPhone && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              trackClassifiedWhatsAppClick({ data: { adId: item.id } }).catch(() => {});
                                trackAndOpenWhatsApp(targetPhone, `Olá! Vi o anúncio "${item.title}" no Waesy e gostaria de saber mais.`, {
                                classifiedId: item.id,
                                classifiedTitle: item.title,
                              });
                            }}
                            className="h-8 px-2.5 rounded-xl text-xs gap-1.5 text-foreground border-border/50 hover:bg-muted/40 cursor-pointer"
                          >
                            <WhatsappLogo size={15} weight="fill" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </Button>
                        )}

                        <Button
                          asChild
                          size="sm"
                          className="h-8 px-3 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 transition-all cursor-pointer"
                        >
                          <Link to="/classificados/$id" params={{ id: item.id }}>
                            <span>Ver Detalhes</span>
                            <ArrowRight size={13} className="ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        ) : viewMode === "feed" ? (
          /* ── MODO FEED (Trilhos Horizontais de Categorias com Cards Amplos) ── */
          <section className="space-y-10">
            {(selectedCategory === "todos"
              ? ["travel", "real_estate", "vehicle", "business", "food", "sale", "service", "digital", "donation"]
              : [selectedCategory]
            ).map((catKey) => {
              const catItems = filtered.filter((i: any) => {
                if (i.category === catKey) return true;
                if (catKey === "travel" && (i.category === "viagem" || i.category === "tourism" || i.attributes?.niche_category === "travel")) return true;
                if (catKey === "food" && (i.category === "gastronomia" || i.attributes?.niche_category === "food")) return true;
                if (catKey === "digital" && (i.is_digital || i.attributes?.is_digital)) return true;
                return false;
              });
              if (catItems.length === 0) return null;

              const catTitle =
                catKey === "travel"
                  ? "Viagens & Turismo"
                  : catKey === "real_estate"
                  ? "Imóveis"
                  : catKey === "vehicle"
                  ? "Veículos"
                  : catKey === "business"
                  ? "Negócios"
                  : catKey === "food"
                  ? "Gastronomia & Restaurantes"
                  : catKey === "sale"
                  ? "Desapego"
                  : catKey === "digital"
                  ? "Produtos Digitais"
                  : catKey === "donation"
                  ? "Doações"
                  : "Serviços";

              return (
                <HorizontalRail
                  key={catKey}
                  title={catTitle}
                  hideHeader={true}
                  actionLabel="Ver todos"
                  onAction={() => {
                    setSelectedCategory(catKey);
                    setViewMode("grid");
                  }}
                >
                  {catItems.map((item: any) => {
                    const img = getClassifiedCover(item);
                    const isTemporada = item.deal_type === "temporada";
                    const isAluguel = item.deal_type === "aluguel";
                    const itemNiche = resolveClassifiedNiche(item);
                    const targetPhone = item.contact_whatsapp || item.whatsapp || item.profiles?.phone;

                    return (
                      <div key={item.id} className="w-72 sm:w-80 shrink-0 h-full flex flex-col">
                        <div className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all flex flex-col justify-between h-full">
                          <Link
                            to="/classificados/$id"
                            params={{ id: item.id }}
                            className="flex-1 flex flex-col cursor-pointer min-h-0"
                          >
                            <div className="relative aspect-16/10 w-full overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
                              {img ? (
                                <img
                                  src={img}
                                  alt={item.title}
                                  className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="size-full bg-muted/40 flex items-center justify-center">
                                  <Tag size={28} className="text-muted-foreground/30" />
                                </div>
                              )}
                              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap z-10">
                                <Badge className="bg-background/95 text-foreground font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md border border-border/40">
                                  {itemNiche.shortLabel}
                                </Badge>
                                {item.deal_type && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 bg-background/90 text-foreground border border-border/40 rounded-md"
                                  >
                                    {isTemporada ? "Temporada" : isAluguel ? "Aluguel" : "Venda"}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between min-h-0">
                              <div>
                                <span className="text-lg sm:text-xl font-black text-foreground font-mono block">
                                  {formatMoney(item.price_cents || 0)}
                                  {(itemNiche.priceSuffix || (isAluguel ? " /mês" : isTemporada ? " /diária" : "")) && (
                                    <span className="text-[10px] font-normal text-muted-foreground ml-1">
                                      {itemNiche.priceSuffix || (isAluguel ? "/mês" : "/diária")}
                                    </span>
                                  )}
                                </span>

                                <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-tight group-hover:underline mt-1 h-9 overflow-hidden">
                                  {item.title}
                                </h3>
                              </div>

                              <div className="pt-2 text-[11px] text-muted-foreground font-mono flex items-center justify-between h-4">
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin size={11} weight="bold" className="shrink-0 text-primary" />
                                  <span className="truncate">{item.location_name || item.location_text || "Regional"}</span>
                                </span>
                              </div>
                            </div>
                          </Link>

                          {/* Quick Actions no Feed */}
                          <div className="px-4 pb-3 pt-1 flex items-center gap-2 border-t border-border/40">
                            {targetPhone && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  trackClassifiedWhatsAppClick({ data: { adId: item.id } }).catch(() => {});
                                trackAndOpenWhatsApp(targetPhone, `Olá! Vi o anúncio "${item.title}" no Waesy e gostaria de falar com você.`, {
                                    classifiedId: item.id,
                                    classifiedTitle: item.title,
                                  });
                                }}
                                className="h-8 px-2.5 rounded-xl text-xs gap-1 text-foreground border-border/50 hover:bg-muted/40 cursor-pointer"
                                title="Chamar no WhatsApp"
                              >
                                <WhatsappLogo size={15} weight="fill" />
                                <span className="hidden sm:inline">WhatsApp</span>
                              </Button>
                            )}

                            <Button
                              asChild
                              size="sm"
                              className="flex-1 h-8 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 transition-all cursor-pointer"
                            >
                              <Link to="/classificados/$id" params={{ id: item.id }}>
                                <span>Ver Anúncio</span>
                                <ArrowRight size={13} className="ml-1" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </HorizontalRail>
              );
            })}
          </section>
        ) : (
          /* ── MODO GRADE (Cards Grandes, Imersivos e com Ações Rápidas) ── */
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6 items-stretch">
            {filtered.map((item: any) => {
              const img = getClassifiedCover(item);
              const isTemporada = item.deal_type === "temporada";
              const isAluguel = item.deal_type === "aluguel";
              const itemNiche = resolveClassifiedNiche(item);
              const targetPhone = item.contact_whatsapp || item.whatsapp || item.profiles?.phone;

              return (
                <div
                  key={item.id}
                  className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-all flex flex-col justify-between h-full"
                >
                  <Link
                    to="/classificados/$id"
                    params={{ id: item.id }}
                    className="flex-1 flex flex-col cursor-pointer min-h-0"
                  >
                    <div className="relative aspect-16/10 w-full overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
                      {img ? (
                        <img
                          src={img}
                          alt={item.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-full bg-muted/40 flex items-center justify-center">
                          <Tag size={28} className="text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap z-10">
                        <Badge className="bg-background/95 text-foreground font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg border border-border/40">
                          {itemNiche.shortLabel}
                        </Badge>
                        {item.deal_type && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 bg-background/90 text-foreground border border-border/40 rounded-md"
                          >
                            {isTemporada ? "Temporada" : isAluguel ? "Aluguel" : "Venda"}
                          </Badge>
                        )}
                        {(item.is_boosted || item.attributes?.is_boosted) && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                            Destaque
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 space-y-2 flex-1 flex flex-col justify-between min-h-0">
                      <div>
                        <span className="text-xl sm:text-2xl font-black text-foreground font-mono block">
                          {formatMoney(item.price_cents || 0)}
                          {(itemNiche.priceSuffix || (isAluguel ? " /mês" : isTemporada ? " /diária" : "")) && (
                            <span className="text-xs font-normal text-muted-foreground ml-1">
                              {itemNiche.priceSuffix || (isAluguel ? "/mês" : "/diária")}
                            </span>
                          )}
                        </span>

                        <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors mt-1 h-11 sm:h-12 overflow-hidden">
                          {item.title}
                        </h3>
                      </div>

                      <div className="pt-2 text-xs text-muted-foreground font-mono flex items-center justify-between h-4">
                        <span className="flex items-center gap-1.5 truncate">
                          <MapPin size={13} weight="bold" className="shrink-0 text-primary" />
                          <span className="truncate">{item.location_name || item.location_text || "Regional"}</span>
</span>
                      </div>
                    </div>
                  </Link>

                  {/* Ações Rápidas do Card */}
                  <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center gap-2">
                    {targetPhone && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          trackClassifiedWhatsAppClick({ data: { adId: item.id } }).catch(() => {});
                                trackAndOpenWhatsApp(targetPhone, `Olá! Vi o anúncio "${item.title}" no Waesy e gostaria de falar com você.`, {
                            classifiedId: item.id,
                            classifiedTitle: item.title,
                          });
                        }}
                        className="h-8 px-2.5 rounded-xl text-xs gap-1 border-border/50 text-foreground hover:bg-muted/50 cursor-pointer"
                        title="Chamar no WhatsApp"
                      >
                        <WhatsappLogo size={15} weight="fill" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </Button>
                    )}

                    <Button
                      asChild
                      size="sm"
                      className="flex-1 h-8 rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90 transition-all cursor-pointer"
                    >
                      <Link to="/classificados/$id" params={{ id: item.id }}>
                        <span>Ver Anúncio</span>
                        <ArrowRight size={13} className="ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </section>
        )}
    </div>
  );
}
