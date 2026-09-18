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
} from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
  SquaresFour,
  ListDashes,
  Flame,
  ArrowRight,
  WhatsappLogo,
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
import {
  DiscoveryControlBar,
  type ViewModeType,
  type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
import { formatMoney } from "@/lib/money";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { getPublicClassifieds, trackClassifiedWhatsAppClick } from "@/services/classifieds.functions";
import { CANONICAL_CITIES } from "@/lib/constants/cities";
import { resolveClassifiedNiche } from "@/lib/classifieds/semantics";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";

function getClassifiedCover(item: any): string | null {
  if (!item) return null;
  return (
    (item.images && item.images[0]) ||
    (item.photos && item.photos[0]) ||
    item.image_url ||
    item.media?.[0] ||
    item.cover_image ||
    null
  );
}

function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);
}

export const Route = createFileRoute("/_store/classificados/")({
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
    title: "Imóveis & Moradia",
    slug: "real_estate",
    cover_image_url: "",
    badge_label: "Venda & Aluguel",
    show_title: false,
    show_overlay: false,
  },
  {
    id: "hp-class-2",
    title: "Hospedagem por Temporada",
    slug: "real_estate_temporada",
    cover_image_url: "",
    badge_label: "Diária & Temporada",
    show_title: false,
    show_overlay: false,
  },
  {
    id: "hp-class-3",
    title: "Veículos & Autos",
    slug: "vehicle",
    cover_image_url: "",
    badge_label: "Carros & Motos",
    show_title: false,
    show_overlay: false,
  },
  {
    id: "hp-class-4",
    title: "Desapegos & Tech",
    slug: "sale",
    cover_image_url: "",
    badge_label: "Eletrônicos",
    show_title: false,
    show_overlay: false,
  },
];

const CLASSIFIED_CHIPS: FilterChipOption[] = [
  { id: "todos", label: "Todos", emoji: "🏷️", icon: Tag },
  { id: "real_estate", label: "Imóveis & Moradia", emoji: "🏠", icon: Home },
  { id: "vehicle", label: "Veículos & Autos", emoji: "🚗", icon: CarIcon },
  { id: "travel", label: "Turismo & Viagens", emoji: "✈️", icon: Plane },
  { id: "food", label: "Gastronomia Artesanal", emoji: "🍲", icon: Utensils },
  { id: "sale", label: "Desapegos & Tech", emoji: "💻", icon: LaptopIcon },
  { id: "digital", label: "Produtos Digitais", emoji: "📁", icon: FileText },
  { id: "service", label: "Serviços & B2B", emoji: "🛠️", icon: WrenchIcon },
  { id: "donation", label: "Doações Solidárias", emoji: "🎁", icon: Gift },
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

function ClassifiedsMasterPage() {
  const { banners, hotpages, classifieds: initialClassifieds } = Route.useLoaderData();
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [selectedDealType, setSelectedDealType] = useState("todos");
  const [selectedCity, setSelectedCity] = useState("todos");
  const [selectedDelivery, setSelectedDelivery] = useState<"todos" | "local" | "shipping">("todos");
  const [onlyInstallments, setOnlyInstallments] = useState(false);
  const [onlyTrade, setOnlyTrade] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewModeType>("feed");

  // Facetas Especializadas de Imóveis
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Facetas Especializadas de Veículos
  const [vehicleGearbox, setVehicleGearbox] = useState<string>("todos");
  const [vehicleFuel, setVehicleFuel] = useState<string>("todos");
  const [onlySingleOwner, setOnlySingleOwner] = useState(false);

  // Faceta de Produtos Digitais
  const [onlyInstantDigital, setOnlyInstantDigital] = useState(false);
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
            selectedCategory !== "food"
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
    <div className="w-full space-y-6 pb-20">
        {/* 1. Banners Contextuais no Topo da Área de Conteúdo */}
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

        {/* 3. Barra de Busca e Controle de Visualização */}
        <DiscoveryControlBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar carro, casa, chalé, notebook, serviço..."
          categories={CLASSIFIED_CHIPS}
          activeCategory={selectedCategory}
          onSelectCategory={(id) => {
            setSelectedCategory(id);
            if (id !== "real_estate") setSelectedDealType("todos");
          }}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          allowedViewModes={["grid", "list", "feed"]}
          fastFilters={[
            {
              id: "boosted",
              label: "Destaques",
              icon: Flame,
              active: onlyBoosted,
              onToggle: () => setOnlyBoosted(!onlyBoosted),
            },
            {
              id: "trade",
              label: "Aceita Troca",
              active: onlyTrade,
              onToggle: () => setOnlyTrade(!onlyTrade),
            },
            {
              id: "card",
              label: "Cartão",
              active: onlyInstallments,
              onToggle: () => setOnlyInstallments(!onlyInstallments),
            },
          ]}
        />

        {/* ── BARRA DE FILTROS CONTEXTUAIS POR NICHO NO MOBILE (Apple HIG & 3 Toques) ── */}
        <div className="space-y-2 pt-0.5">
          {/* Linha de Ação Rápida + Pílulas Contextuais por Nicho */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {/* Botão Gatilho da Sheet de Filtros Completos */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMobileFilterSheetOpen(true)}
              className="rounded-full h-9 px-3.5 text-xs gap-1.5 font-bold shrink-0 border-border/70 bg-card hover:bg-muted/50 cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="size-3.5" />
              <span>Filtros</span>
              {(selectedCity !== "todos" || onlyTrade || onlyInstallments || onlyBoosted || selectedAmenities.length > 0 || vehicleGearbox !== "todos" || selectedSubcategory !== "todos") && (
                <span className="size-2 rounded-full bg-primary" />
              )}
            </Button>

            {/* Pílula: Apenas Destaques */}
            <button
              type="button"
              onClick={() => setOnlyBoosted(!onlyBoosted)}
              className={`h-9 px-3 rounded-full text-xs font-bold shrink-0 cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 ${
                onlyBoosted
                  ? "bg-amber-500 text-black shadow-xs font-bold"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
              }`}
            >
              <Flame size={13} weight={onlyBoosted ? "fill" : "bold"} />
              <span>Destaques</span>
            </button>

            {/* Pílulas Contextuais: IMÓVEIS & HOSPEDAGEM */}
            {selectedCategory === "real_estate" && (
              <>
                {REAL_ESTATE_DEAL_TYPES.map((dt) => {
                  const isSelected = selectedDealType === dt.id;
                  return (
                    <button
                      key={dt.id}
                      type="button"
                      onClick={() => setSelectedDealType(dt.id)}
                      className={`h-9 px-3 rounded-full text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-95 ${
                        isSelected
                          ? "bg-foreground text-background font-bold shadow-xs"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      }`}
                    >
                      {dt.label}
                    </button>
                  );
                })}
                {REAL_ESTATE_FACETS.map((facet) => {
                  const isChecked = selectedAmenities.includes(facet.id);
                  return (
                    <button
                      key={facet.id}
                      type="button"
                      onClick={() => toggleAmenity(facet.id)}
                      className={`h-9 px-3 rounded-full text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-95 flex items-center gap-1 ${
                        isChecked
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      }`}
                    >
                      <span>{facet.label}</span>
                      {isChecked && <Check className="size-3" />}
                    </button>
                  );
                })}
              </>
            )}

            {/* Pílulas Contextuais: VEÍCULOS & AUTOS */}
            {selectedCategory === "vehicle" && (
              <>
                {VEHICLE_GEARBOX_OPTIONS.map((opt) => {
                  const isSelected = vehicleGearbox === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setVehicleGearbox(opt.id)}
                      className={`h-9 px-3 rounded-full text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-95 ${
                        isSelected
                          ? "bg-foreground text-background font-bold shadow-xs"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
                {VEHICLE_FUEL_OPTIONS.slice(1).map((opt) => {
                  const isSelected = vehicleFuel === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setVehicleFuel(isSelected ? "todos" : opt.id)}
                      className={`h-9 px-3 rounded-full text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-95 ${
                        isSelected
                          ? "bg-foreground text-background font-bold shadow-xs"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setOnlySingleOwner(!onlySingleOwner)}
                  className={`h-9 px-3 rounded-full text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-95 ${
                    onlySingleOwner
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                  }`}
                >
                  Único Dono
                </button>
              </>
            )}

            {/* Pílulas Contextuais: DESAPEGOS & TECH */}
            {selectedCategory === "sale" && (
              <>
                {DESAPEGO_SUB_OPTIONS.map((opt) => {
                  const isSelected = selectedSubcategory === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedSubcategory(opt.id)}
                      className={`h-9 px-3 rounded-full text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-95 ${
                        isSelected
                          ? "bg-foreground text-background font-bold shadow-xs"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setOnlyTrade(!onlyTrade)}
                  className={`h-9 px-3 rounded-full text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-95 ${
                    onlyTrade
                      ? "bg-foreground text-background font-bold shadow-xs"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                  }`}
                >
                  Aceita Troca
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyInstallments(!onlyInstallments)}
                  className={`h-9 px-3 rounded-full text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-95 ${
                    onlyInstallments
                      ? "bg-foreground text-background font-bold shadow-xs"
                      : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                  }`}
                >
                  Parcela no Cartão
                </button>
              </>
            )}

            {/* Pílulas Contextuais: SERVIÇOS */}
            {selectedCategory === "service" && (
              <>
                {SERVICE_MODALITY_OPTIONS.map((opt) => {
                  const isSelected = selectedServiceModality === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedServiceModality(opt.id)}
                      className={`h-9 px-3 rounded-full text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-95 ${
                        isSelected
                          ? "bg-foreground text-background font-bold shadow-xs"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </>
            )}

            {/* Pílulas Contextuais: VAGAS */}
            {(selectedCategory === "job" || selectedCategory === "job_offer") && (
              <>
                {JOB_REGIME_OPTIONS.map((opt) => {
                  const isSelected = selectedJobRegime === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedJobRegime(opt.id)}
                      className={`h-9 px-3 rounded-full text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-95 ${
                        isSelected
                          ? "bg-foreground text-background font-bold shadow-xs"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </>
            )}

            {/* Pílulas Contextuais: DIGITAIS */}
            {selectedCategory === "digital" && (
              <button
                type="button"
                onClick={() => setOnlyInstantDigital(!onlyInstantDigital)}
                className={`h-9 px-3 rounded-full text-xs font-medium shrink-0 cursor-pointer transition-all active:scale-95 ${
                  onlyInstantDigital
                    ? "bg-primary text-white font-bold shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border/40"
                }`}
              >
                Download Imediato
              </button>
            )}
          </div>

          {/* Linha de Cidades Rápidas */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => setSelectedCity("todos")}
              className={`h-8 px-2.5 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer ${
                selectedCity === "todos"
                  ? "bg-foreground text-background font-bold"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              Todas Cidades
            </button>
            {CANONICAL_CITIES.slice(0, 6).map((city) => {
              const isSelected = selectedCity === city.name;
              return (
                <button
                  key={city.id}
                  type="button"
                  onClick={() => setSelectedCity(isSelected ? "todos" : city.name)}
                  className={`h-8 px-2.5 rounded-lg text-xs font-mono transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-foreground text-background font-bold"
                      : "bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {city.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── MODAL FULL DE FILTROS AVANÇADOS (MOBILE) ── */}
        <Dialog open={mobileFilterSheetOpen} onOpenChange={setMobileFilterSheetOpen}>
          <DialogContent className="max-w-md rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/40">
              <DialogTitle className="text-base font-bold">Filtros</DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
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
                }}
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
              >
                Limpar Todos
              </Button>
            </DialogHeader>

            {/* Seções de Filtro em Cards Limpos */}
            <div className="space-y-4 text-xs">
              {/* Cidades */}
              <div className="space-y-2">
                <span className="font-bold font-mono uppercase text-muted-foreground block text-[10px] tracking-wider">
                  Cidade / Região
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCity("todos")}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs cursor-pointer ${
                      selectedCity === "todos"
                        ? "bg-foreground text-background font-bold"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Todas
                  </button>
                  {CANONICAL_CITIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCity(selectedCity === c.name ? "todos" : c.name)}
                      className={`px-3 py-1.5 rounded-xl font-mono text-xs cursor-pointer ${
                        selectedCity === c.name
                          ? "bg-foreground text-background font-bold"
                          : "bg-muted/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condições Comerciais */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <span className="font-bold font-mono uppercase text-muted-foreground block text-[10px] tracking-wider">
                  Condições
                </span>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sheet-boosted" className="text-xs cursor-pointer">
                      Apenas Destaques
                    </Label>
                    <Switch
                      id="sheet-boosted"
                      checked={onlyBoosted}
                      onCheckedChange={setOnlyBoosted}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sheet-trade" className="text-xs cursor-pointer">
                      Aceita Troca
                    </Label>
                    <Switch
                      id="sheet-trade"
                      checked={onlyTrade}
                      onCheckedChange={setOnlyTrade}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sheet-card" className="text-xs cursor-pointer">
                      Parcela no Cartão
                    </Label>
                    <Switch
                      id="sheet-card"
                      checked={onlyInstallments}
                      onCheckedChange={setOnlyInstallments}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Botão Fixo de Aplicação */}
            <div className="pt-2 border-t border-border/40">
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
                  className="group flex flex-col sm:flex-row items-stretch justify-between rounded-2xl border border-border/60 bg-card hover:border-foreground/30 hover:shadow-xs transition-all overflow-hidden p-0 w-full"
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
                      <Badge className="bg-background/95 backdrop-blur-md text-foreground font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md">
                        {itemNiche.shortLabel}
                      </Badge>
                      {(item.is_boosted || item.attributes?.is_boosted) && (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
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
                          {isAluguel && <span className="text-[10px] font-normal text-muted-foreground">/mês</span>}
                          {isTemporada && <span className="text-[10px] font-normal text-muted-foreground">/dia</span>}
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
                            className="h-8 px-2.5 rounded-xl text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
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
            {["real_estate", "vehicle", "sale", "service"].map((catKey) => {
              const catItems = filtered.filter((i: any) => i.category === catKey);
              if (catItems.length === 0) return null;

              const catTitle =
                catKey === "real_estate"
                  ? "Imóveis & Moradia"
                  : catKey === "vehicle"
                  ? "Veículos & Autos"
                  : catKey === "sale"
                  ? "Desapegos & Tech"
                  : "Serviços & B2B";

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
                    const targetPhone = item.contact_whatsapp || item.whatsapp || item.profiles?.phone;

                    return (
                      <div key={item.id} className="w-72 sm:w-80 shrink-0 h-full flex flex-col">
                        <div className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 hover:shadow-md transition-all flex flex-col justify-between h-full">
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
                              <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
                                {item.deal_type && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] uppercase font-mono font-bold px-2 py-0.5 bg-background/90 text-foreground backdrop-blur-md border border-border/40 rounded-md shadow-2xs"
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
                                  {isAluguel && <span className="text-[10px] font-normal text-muted-foreground">/mês</span>}
                                  {isTemporada && <span className="text-[10px] font-normal text-muted-foreground">/dia</span>}
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
                                className="h-8 px-2.5 rounded-xl text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
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
                  className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-foreground/30 hover:shadow-md transition-all flex flex-col justify-between h-full"
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
                        <Badge className="bg-background/95 backdrop-blur-md text-foreground font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg border border-border/40 shadow-xs">
                          {itemNiche.shortLabel}
                        </Badge>
                        {item.deal_type && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 bg-background/90 text-foreground backdrop-blur-md border border-border/40 rounded-md shadow-2xs"
                          >
                            {isTemporada ? "Temporada" : isAluguel ? "Aluguel" : "Venda"}
                          </Badge>
                        )}
                        {(item.is_boosted || item.attributes?.is_boosted) && (
                          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                            Destaque
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 space-y-2 flex-1 flex flex-col justify-between min-h-0">
                      <div>
                        <span className="text-xl sm:text-2xl font-black text-foreground font-mono block">
                          {formatMoney(item.price_cents || 0)}
                          {isAluguel && <span className="text-xs font-normal text-muted-foreground">/mês</span>}
                          {isTemporada && <span className="text-xs font-normal text-muted-foreground">/dia</span>}
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
                        className="h-8 px-2.5 rounded-xl text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
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
