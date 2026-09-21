import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tag, Car, Home as HomeIcon, Briefcase, Wrench, Sliders, ArrowLeft, ChevronRight, Eye, EyeOff, Edit3, ImagePlus, MapPin, MessageCircle, ShieldCheck, Check, Loader2, Phone, FileText, DollarSign, Layers, ChevronLeft, Building, Key, Truck, Package, CreditCard, QrCode, RefreshCw, Banknote, DownloadCloud, FileArchive, Search, Utensils, Plane, Thermometer, CreditCard as CreditCardIcon, PlusCircle, Coins, Wand2, Bot, BadgePercent, Landmark, Info, Trash2, Plus, Bus, Ship, Train, Navigation, Route as RouteIcon, Users, Calendar, ChevronDown, ChevronUp, X, CheckCircle, GraduationCap, Award, SlidersHorizontal, Store as StoreIcon, Sparkles, Lock, ShieldAlert, FileSpreadsheet, Receipt, BookOpenCheck, Zap, Apple, Flame, Croissant, Milk, Wine } from 'lucide-react';
import { StoryHighlightUploader, type StoryHighlight } from "@/components/classifieds/story-highlight-uploader";
import { ItineraryDayEditor, type ItineraryDay } from "@/components/classifieds/itinerary-day-editor";
import { WeatherWidget } from "@/components/classifieds/weather-widget";
import { EditorialShowcaseView } from "@/components/classifieds/editorial-showcase-view";
import { UniversalClassifiedShowcase } from "@/components/classifieds/universal-classified-showcase";
import { ConvenienceShowcaseView } from "@/components/classifieds/convenience-showcase-view";
import { uploadClassifiedMedia, uploadClassifiedDocument } from "@/lib/classifieds/upload-classified-media";
import { CANONICAL_AIRPORTS, CANONICAL_AIRLINES, CANONICAL_TRANSPORT_TYPES, CANONICAL_BUS_CATEGORIES, CANONICAL_GUIDE_SERVICES, CANONICAL_TRANSFER_VEHICLES, DEPARTURE_STATUS_CONFIG, airportLabel, type DepartureOption, type DepartureStatus } from "@/lib/classifieds/canonical-airports";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { PhoneField } from "@/components/ui/phone-field";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { MediaUploader } from "@/components/ui/media-uploader";
import { DigitalFileDropzone } from "@/components/classifieds/digital-file-dropzone";
import { ChoiceCard } from "@/components/ui/choice-card";
import { SquircleCard } from "@/components/ui/squircle-card";
import { CityCombobox, type StructuredLocationValue } from "@/components/ui/city-combobox";
import { upsertClassified, getPublicClassifiedById, refineClassifiedWithAI } from "@/services/classifieds.functions";
import { getMyStoresList } from "@/services/store.functions";
import { getProfile } from "@/services/auth.functions";
import { createListingWithAI } from "@/services/ai-sdr.functions";
import { analyzeCommercialPointPotential, auditCnpjWithSimLabs } from "@/services/market-intelligence.functions";
import { lookupCnpj } from "@/services/public-apis.functions";
import {
 CANONICAL_VEHICLE_BRANDS,
 CANONICAL_TRANSMISSIONS,
 CANONICAL_FUELS,
 CANONICAL_VEHICLE_COLORS,
 CANONICAL_VEHICLE_OPTIONS,
 CANONICAL_VEHICLE_PROVENANCE,
 CANONICAL_GOODS_SEGMENTS,
 CANONICAL_ITEM_CONDITIONS,
 CANONICAL_SMARTPHONE_BRANDS,
 CANONICAL_COMPUTER_TYPES,
 CANONICAL_COMPUTER_BRANDS,
 CANONICAL_PROCESSORS,
 CANONICAL_RAM_OPTIONS,
 CANONICAL_STORAGE_OPTIONS,
 CANONICAL_APPLIANCE_TYPES,
 CANONICAL_APPLIANCE_BRANDS,
 CANONICAL_VOLTAGES,
 CANONICAL_GAME_CONSOLES,
 CANONICAL_FASHION_CATEGORIES,
 CANONICAL_FASHION_SIZES,
 CANONICAL_FOOD_SUBNICHES,
 CANONICAL_SERVICE_SUBNICHES,
 CANONICAL_BUSINESS_TYPES,
 CANONICAL_BUSINESS_SEGMENTS,
 CANONICAL_SALE_REASONS,
 CANONICAL_EMPLOYEES_RANGES,
 CANONICAL_COMMERCIAL_POINT_TYPES,
 CANONICAL_INVESTMENT_MODELS,
 CANONICAL_PROJECT_STAGES,
 CANONICAL_USE_OF_FUNDS,
 CANONICAL_GROCERY_DEPARTMENTS,
 CANONICAL_UNIT_TYPES,
 CANONICAL_STORAGE_TEMPERATURES,
 CANONICAL_MEAT_CUT_OPTIONS,
 CANONICAL_BAKERY_PREP_OPTIONS,
 GroceryFreshPricing,
 GroceryRipenessConfig,
 ProgressiveDiscountTier,
 OrderBumpOffer,
 RipenessStage,
 DEFAULT_RIPENESS_LABELS,
} from "@/lib/classifieds/canonical-taxonomy";
import {
 CANONICAL_EDUCATION_LEVELS,
 CANONICAL_EXPERIENCE_LEVELS,
 CANONICAL_JOB_REGIMES,
 CANONICAL_WORKPLACE_MODELS,
 CANONICAL_WORK_SCHEDULES,
 CANONICAL_SALARY_RANGES,
 CANONICAL_JOB_BENEFITS,
 SUGGESTED_JOB_SKILLS,
 getEducationLabel,
 getExperienceLabel,
 getRegimeLabel,
 getWorkplaceModelLabel,
} from "@/lib/classifieds/canonical-hiring";
// (ChevronDown, ChevronUp merged into main lucide import above)
import { z } from "zod";

const ClassifiedSearchSchema = z.object({
  tipo: z.string().optional(),
  sub: z.string().optional(),
  editId: z.string().optional(),
  storeId: z.string().optional(),
});

export const Route = createFileRoute("/_store/conta/classificados/novo")({
 validateSearch: ClassifiedSearchSchema,
 head: () => ({ meta: [{ title: "Criar Classificado | Waesy" }] }),
 component: NovoClassificadoPage,
});

// ─── 1. Taxonomia Canônica de Tipos ────────────
export type ClassifiedNicheType =
  | "viagem"
  | "equipamento"
  | "doacao"
  | "hospedagem"
  | "imovel"
  | "desapego"
  | "digital"
  | "veiculo"
  | "servico"
  | "vaga"
  | "assinatura"
  | "gastronomia"
  | "farmacia"
  | "mercado"
  | "negocio";

interface NicheDefinition {
  id: ClassifiedNicheType;
  canonicalCategory: "sale" | "vehicle" | "real_estate" | "service" | "job" | "travel" | "equipment" | "donation" | "business" | "food";
  title: string;
  subtitle: string;
  description: string;
  icon: any;
  badge: string;
  gradient: string;
}

const NICHE_CARDS: NicheDefinition[] = [
  {
    id: "negocio",
    canonicalCategory: "business",
    title: "Negócios",
    subtitle: "Empresas, pontos comerciais e investimentos",
    description: "Venda integral ou parcial de empresas ativas, repasse de ponto comercial, franquias e captação de sócios ou investimento.",
    icon: Briefcase,
    badge: "Negócios",
    gradient: "from-amber-600/15 via-yellow-600/10 to-transparent",
  },
  {
    id: "desapego",
    canonicalCategory: "sale",
    title: "Desapego",
    subtitle: "Usados, eletrônicos e móveis",
    description: "Eletrônicos, celulares, computadores, instrumentos musicais, moda, móveis e itens com envio.",
    icon: Tag,
    badge: "Envio & Retirada",
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
  },
  {
    id: "veiculo",
    canonicalCategory: "vehicle",
    title: "Veículos",
    subtitle: "Carros, motos e utilitários",
    description: "Carros de passeio, motocicletas, caminhões, utilitários e veículos comerciais.",
    icon: Car,
    badge: "Veículos",
    gradient: "from-amber-500/10 via-orange-500/5 to-transparent",
  },
  {
    id: "imovel",
    canonicalCategory: "real_estate",
    title: "Imóveis",
    subtitle: "Casas, apartamentos e terrenos",
    description:
      "Casas, apartamentos, salas comerciais, galpões, terrenos e locação residencial ou comercial.",
    icon: HomeIcon,
    badge: "Imóveis",
    gradient: "from-blue-500/10 via-indigo-500/5 to-transparent",
  },
  {
    id: "servico",
    canonicalCategory: "service",
    title: "Serviços",
    subtitle: "Profissionais para pessoas e empresas (CNPJ)",
    description: "Trabalhos técnicos, consultorias, serviços domésticos, manutenção e freelancers.",
    icon: Wrench,
    badge: "Serviços",
    gradient: "from-purple-500/10 via-pink-500/5 to-transparent",
  },
  {
    id: "vaga",
    canonicalCategory: "job",
    title: "Vagas de Emprego",
    subtitle: "Oportunidades de trabalho e contratação",
    description:
      "Vagas de emprego, parcerias, estágios e oportunidades profissionais para a comunidade.",
    icon: Briefcase,
    badge: "Vagas",
    gradient: "from-rose-500/10 via-red-500/5 to-transparent",
  },
  {
    id: "digital",
    canonicalCategory: "sale",
    title: "Produtos Digitais",
    subtitle: "Downloads imediatos e infoprodutos",
    description: "Infoprodutos, arquivos para download imediato, templates, artes digitais e materiais educativos.",
    icon: FileArchive,
    badge: "Download Imediato",
    gradient: "from-indigo-500/10 via-purple-500/5 to-transparent",
  },
  {
    id: "hospedagem",
    canonicalCategory: "real_estate",
    title: "Hospedagem",
    subtitle: "Diárias em chalés, pousadas e sítios",
    description:
      "Aluguel por diária, chalés com hidro, cabanas na serra, casas de campo, pousadas e suítes com check-in.",
    icon: Key,
    badge: "Temporada",
    gradient: "from-amber-500/10 via-rose-500/5 to-transparent",
  },
  {
    id: "equipamento",
    canonicalCategory: "equipment",
    title: "Equipamentos",
    subtitle: "Locação de ferramentas e máquinas",
    description: "Locação de caixas de som, iluminação, tendas, mesas, ferramentas e equipamentos para festas e obras.",
    icon: Wrench,
    badge: "Locação",
    gradient: "from-blue-500/10 via-cyan-500/5 to-transparent",
  },
  {
    id: "assinatura",
    canonicalCategory: "service",
    title: "Assinaturas",
    subtitle: "Serviços e pagamentos recorrentes",
    description: "Serviços recorrentes, mensalidades, planos de assinatura e clubes com renovação periódica.",
    icon: RefreshCw,
    badge: "Recorrente",
    gradient: "from-cyan-500/15 via-blue-500/10 to-transparent",
  },
  {
    id: "doacao",
    canonicalCategory: "donation",
    title: "Doações",
    subtitle: "Itens gratuitos para a comunidade",
    description: "Doe móveis, roupas, livros, eletrônicos ou alimentos gratuitamente para a comunidade local.",
    icon: Tag,
    badge: "Gratuito R$ 0",
    gradient: "from-emerald-500/10 via-teal-500/5 to-transparent",
  },
  {
    id: "viagem",
    canonicalCategory: "travel",
    title: "Viagens",
    subtitle: "Pacotes e passeios turísticos",
    description: "Pacotes turísticos, resorts, passeios guiados e roteiros com fotos e programação completa.",
    icon: Key,
    badge: "Turismo",
    gradient: "from-amber-500/15 via-rose-500/10 to-purple-600/10",
  },
  {
    id: "gastronomia",
    canonicalCategory: "food",
    title: "Gastronomia",
    subtitle: "Pratos artesanais e delivery",
    description: "Lanches, pratos prontos, bebidas, sobremesas e serviços de alimentação em geral.",
    icon: Utensils,
    badge: "Cardápio",
    gradient: "from-red-500/15 via-orange-500/10 to-transparent",
  },
  {
    id: "farmacia",
    canonicalCategory: "sale",
    title: "Farmácia",
    subtitle: "Medicamentos e saúde",
    description: "Produtos de saúde, beleza, higiene pessoal e itens de farmácia.",
    icon: StoreIcon,
    badge: "Saúde",
    gradient: "from-teal-500/15 via-emerald-500/10 to-transparent",
  },
  {
    id: "mercado",
    canonicalCategory: "sale",
    title: "Mercado",
    subtitle: "Alimentos e conveniência",
    description: "Itens de mercado, mantimentos, carnes, pães, frutas e conveniência diária.",
    icon: StoreIcon,
    badge: "Mercado",
    gradient: "from-lime-500/15 via-green-500/10 to-transparent",
  },
];

// ─── Taxonomia Canônica Completa de Desapego ───────────────────────────────
export const DESAPEGO_TAXONOMY = [
  { id: "smartphones", label: "Smartphones & Celulares", desc: "iPhones, Samsung Galaxy, Xiaomi e marcas" },
  { id: "computadores", label: "Notebooks & Computadores", desc: "Notebooks Dell, Apple Mac, PCs gamer e tablets" },
  { id: "moveis", label: "Móveis & Decoração", desc: "Sofás, mesas, armários, camas e decoração" },
  { id: "eletrodomesticos", label: "Eletrodomésticos & Cozinha", desc: "Geladeiras, fogões, micro-ondas e lavadoras" },
  { id: "moda_brecho", label: "Roupas & Moda", desc: "Jaquetas, vestidos, camisas e calças" },
  { id: "tenis_calcados", label: "Tênis & Calçados", desc: "Sneakers, tênis esportivos e calçados sociais" },
  { id: "joias_relogios", label: "Joias & Relógios", desc: "Relógios automáticos, anéis e correntes" },
  { id: "eletronicos", label: "Eletrônicos & Som", desc: "TVs, caixas JBL, fones e áudio" },
  { id: "games_consoles", label: "Games & Consoles", desc: "PS5, Xbox, Nintendo Switch e jogos" },
  { id: "instrumentos", label: "Instrumentos Musicais", desc: "Guitarras, violões, teclados e pedais" },
  { id: "esportes_fitness", label: "Esportes & Ciclismo", desc: "Bicicletas, esteiras e artigos esportivos" },
  { id: "bebes_criancas", label: "Bebês & Crianças", desc: "Carrinhos, berços, roupas e brinquedos" },
  { id: "ferramentas", label: "Ferramentas & Garagem", desc: "Furadeiras, serras e oficina" },
  { id: "outros", label: "Outros Desapegos", desc: "Livros, colecionáveis e itens variados" },
];

function NovoClassificadoPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const selectedType = search?.tipo as ClassifiedNicheType | undefined;
  const editId = search?.editId as string | undefined;
  const storeId = search?.storeId as string | undefined;

  const [initialData, setInitialData] = useState<any>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("waesy_ai_prefill");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });
  const [isLoadingEdit, setIsLoadingEdit] = useState<boolean>(!!editId);

  useEffect(() => {
    if (!editId) {
      if (typeof window !== "undefined") {
        try {
          const saved = sessionStorage.getItem("waesy_ai_prefill");
          if (saved) {
            setInitialData(JSON.parse(saved));
            setIsLoadingEdit(false);
            return;
          }
        } catch (e) {}
      }
      setInitialData(null);
      setIsLoadingEdit(false);
      return;
    }

    let isMounted = true;
    setIsLoadingEdit(true);
    getPublicClassifiedById({ data: editId })
      .then((res) => {
        if (!isMounted) return;
        if (res && res.classified) {
          setInitialData(res.classified);
        } else {
          toast.error("Anúncio não encontrado para edição.");
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar anúncio para edição:", err);
        toast.error("Falha ao carregar anúncio.");
      })
      .finally(() => {
        if (isMounted) setIsLoadingEdit(false);
      });

    return () => {
      isMounted = false;
    };
  }, [editId]);

  const activeNiche = useMemo(() => {
    if (selectedType) {
      return NICHE_CARDS.find((n) => n.id === selectedType);
    }
    if (initialData) {
      const savedNiche = initialData.attributes?.niche;
      if (savedNiche) {
        const found = NICHE_CARDS.find((n) => n.id === savedNiche);
        if (found) return found;
      }
      if (initialData.category === "travel") {
        return NICHE_CARDS.find((n) => n.id === "viagem");
      }
      if (initialData.category === "equipment") {
        return NICHE_CARDS.find((n) => n.id === "equipamento");
      }
      if (initialData.category === "donation") {
        return NICHE_CARDS.find((n) => n.id === "doacao");
      }
      if (initialData.category === "real_estate") {
        return initialData.deal_type === "temporada"
          ? NICHE_CARDS.find((n) => n.id === "hospedagem")
          : NICHE_CARDS.find((n) => n.id === "imovel");
      }
      if (initialData.category === "vehicle") {
        return NICHE_CARDS.find((n) => n.id === "veiculo");
      }
      if (initialData.category === "job" || initialData.category === "job_offer") {
        return NICHE_CARDS.find((n) => n.id === "vaga");
      }
      if (initialData.category === "service") {
        return initialData.pricing_model === "recurring" || initialData.attributes?.niche === "assinatura"
          ? NICHE_CARDS.find((n) => n.id === "assinatura")
          : NICHE_CARDS.find((n) => n.id === "servico");
      }
      if (initialData.category === "sale") {
        return initialData.is_digital || initialData.digital_file_url
          ? NICHE_CARDS.find((n) => n.id === "digital")
          : NICHE_CARDS.find((n) => n.id === "desapego");
      }
    }
    return undefined;
  }, [selectedType, initialData]);

  if (isLoadingEdit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-xs font-semibold text-muted-foreground">
          Carregando dados do anúncio para edição...
        </p>
      </div>
    );
  }

  if (!activeNiche) {
    return (
      <CreateTypePicker
        onSelect={(typeId, sub) =>
          navigate({
            to: "/conta/classificados/novo",
            search: { tipo: typeId, sub: sub || undefined, editId: editId || undefined, storeId: storeId || undefined },
          })
        }
        onAiPrefill={(listing) => {
          let resolvedNiche = (listing.niche as ClassifiedNicheType) || "desapego";
          let resolvedSub = listing.subcategory || undefined;

          // Se o nicho retornado não for um card principal (ex: retornou 'eletronicos'), ajusta
          if (!NICHE_CARDS.some(n => n.id === resolvedNiche)) {
            const desapegoItem = DESAPEGO_TAXONOMY.find(d => d.id === resolvedNiche);
            if (desapegoItem) {
              resolvedSub = desapegoItem.id;
              resolvedNiche = "desapego";
            } else if (listing.category === "vehicle") {
              resolvedNiche = "veiculo";
            } else if (listing.category === "real_estate") {
              resolvedNiche = "imovel";
            } else if (listing.category === "service") {
              resolvedNiche = "servico";
            } else if (listing.category === "job") {
              resolvedNiche = "vaga";
            } else if (listing.category === "travel") {
              resolvedNiche = "viagem";
            } else if (listing.category === "equipment") {
              resolvedNiche = "equipamento";
            } else if (listing.category === "donation") {
              resolvedNiche = "doacao";
            } else {
              resolvedNiche = "desapego";
            }
          }

          const prefillPayload = {
            category: listing.category || "sale",
            title: listing.title || "",
            content: listing.content || listing.description || "",
            description: listing.description || listing.content || "",
            price_cents: listing.price_cents ?? undefined,
            negotiable: true,
            attributes: {
              ...(listing.attributes || {}),
              niche: resolvedNiche,
              subcategory: resolvedSub,
              pricing_type: listing.price_cents ? "fixed" : "free",
            },
          };

          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem("waesy_ai_prefill", JSON.stringify(prefillPayload));
            } catch (e) {}
          }

          setInitialData(prefillPayload);
          navigate({
            to: "/conta/classificados/novo",
            search: {
              tipo: resolvedNiche,
              sub: resolvedSub || undefined,
              storeId: storeId || undefined,
            },
          });
        }}
      />
    );
  }

  return (
    <SpecializedClassifiedEditor
      niche={activeNiche}
      initialData={initialData}
      editId={editId}
      storeId={storeId}
      initialSubcategory={search?.sub}
      onBack={() => {
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem("waesy_ai_prefill");
          } catch (e) {}
        }
        setInitialData(null);
        navigate({ to: "/conta/classificados/novo", search: { editId: editId || undefined, storeId: storeId || undefined } });
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMADA 2: CreateTypePicker (Cards Verticais com Scroll Horizontal)
// ─────────────────────────────────────────────────────────────────────────────
function CreateTypePicker({
  onSelect,
  onAiPrefill,
}: {
  onSelect: (typeId: ClassifiedNicheType, sub?: string) => void;
  onAiPrefill?: (listing: any) => void;
}) {
  const [searchFilter, setSearchFilter] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleGenerateWithAi = async () => {
    const trimmed = aiPrompt.trim();
    if (!trimmed) {
      toast.error("Descreva o que você quer anunciar primeiro.");
      return;
    }
    setIsAiGenerating(true);
    toast.loading("A Inteligência Artificial está montando seu anúncio...", { id: "ai-ad" });
    try {
      const res = await createListingWithAI({ data: { prompt: trimmed } });
      if (res?.success && res.listing) {
        toast.success("Anúncio estruturado com IA! Revise os dados.", { id: "ai-ad" });
        if (onAiPrefill) {
          onAiPrefill(res.listing);
        } else {
          onSelect((res.listing.niche as ClassifiedNicheType) || "desapego");
        }
      } else {
        toast.error("Não foi possível gerar os dados. Escolha a categoria abaixo.", { id: "ai-ad" });
      }
    } catch (e: any) {
      console.warn("Erro ao gerar anúncio com IA:", e);
      toast.error(e?.message || "Erro ao conectar com a IA. Escolha a categoria manualmente.", { id: "ai-ad" });
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -300 : 300,
        behavior: "smooth",
      });
    }
  };

  const personalNiches = useMemo(() => {
    const ids = ["desapego", "veiculo", "imovel", "servico", "vaga", "digital", "hospedagem", "equipamento", "doacao", "viagem"];
    if (!searchFilter.trim()) return NICHE_CARDS.filter(n => ids.includes(n.id));
    const q = searchFilter.toLowerCase();
    return NICHE_CARDS.filter(n => ids.includes(n.id) && (n.title.toLowerCase().includes(q) || n.subtitle.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)));
  }, [searchFilter]);

  const businessNiches = useMemo(() => {
    const ids = ["assinatura", "gastronomia", "farmacia", "mercado"];
    if (!searchFilter.trim()) return NICHE_CARDS.filter(n => ids.includes(n.id));
    const q = searchFilter.toLowerCase();
    return NICHE_CARDS.filter(n => ids.includes(n.id) && (n.title.toLowerCase().includes(q) || n.subtitle.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)));
  }, [searchFilter]);

  const filteredDesapegoItems = useMemo(() => {
    if (!searchFilter.trim()) return [];
    const q = searchFilter.toLowerCase();
    return DESAPEGO_TAXONOMY.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.desc.toLowerCase().includes(q)
    );
  }, [searchFilter]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-20 px-1 sm:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Criar Anúncio
          </h1>
          <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
            {NICHE_CARDS.length} Formatos
          </Badge>
        </div>
        <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold h-8 px-3.5 cursor-pointer">
          <Link to="/conta/classificados">Meus Anúncios</Link>
        </Button>
      </div>

      {/* ── Motor de Intenção com IA ── */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-[1px]">
        <div className="relative bg-background rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex-1 w-full relative">
            <Wand2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-primary/70" />
            <Input 
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value.slice(0, 250))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerateWithAi();
                }
              }}
              placeholder="Ex: Quero vender meu iPhone 13 Pro 128GB usado por R$ 3.500" 
              className="pl-10 h-11 rounded-lg text-sm border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/50"
              id="ai-intent-input"
              maxLength={250}
            />
            {aiPrompt.length > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground tabular-nums">
                {aiPrompt.length}/250
              </span>
            )}
          </div>
          <Button 
            type="button" 
            disabled={isAiGenerating}
            onClick={handleGenerateWithAi}
            className="w-full sm:w-auto h-11 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
          >
            {isAiGenerating ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="size-4 mr-2" />
            )}
            {isAiGenerating ? "Gerando..." : "Criar com IA"}
          </Button>
        </div>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder="Ou busque categorias manualmente (ex: Casa, Celular, Serviços)..."
          className="pl-10 h-11 rounded-2xl text-xs sm:text-sm bg-card border-border/60 shadow-sm"
        />
        {searchFilter && (
          <button
            type="button"
            onClick={() => setSearchFilter("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Limpar
          </button>
        )}
      </div>

      {/* ── 2. Trilho de Cards Verticais (Para Você / C2C) ── */}
      {personalNiches.length > 0 && (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Para Você (Comunidade)
          </span>
          <div className="hidden md:flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              className="size-8 rounded-xl border border-border/70 bg-card hover:bg-muted flex items-center justify-center text-foreground transition-colors cursor-pointer"
              title="Rolar para a esquerda"
              aria-label="Rolar para esquerda"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              className="size-8 rounded-xl border border-border/70 bg-card hover:bg-muted flex items-center justify-center text-foreground transition-colors cursor-pointer"
              title="Rolar para a direita"
              aria-label="Rolar para direita"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="relative group/rail">
          {/* Trilho de Scroll Horizontal com Snap */}
          <div
            ref={scrollContainerRef}
            className="flex flex-row gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar py-2 px-0.5 scroll-smooth"
          >
            {personalNiches.map((niche) => {
              const Icon = niche.icon;
              return (
                <button
                  key={niche.id}
                  onClick={() => onSelect(niche.id)}
                  className="w-[260px] sm:w-[280px] min-w-[260px] sm:min-w-[280px] h-[370px] sm:h-[390px] shrink-0 snap-start text-left relative rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 p-5 flex flex-col justify-between overflow-hidden group cursor-pointer"
                >
                  {/* Gradiente Imersivo no Topo do Card */}
                  <div
                    className={`absolute top-0 inset-x-0 h-36 bg-gradient-to-b ${niche.gradient} opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none`}
                  />

                  {/* Topo do Card: Ícone em Squircle + Badge */}
                  <div className="relative z-10 flex items-start justify-between gap-2">
                    <div className="size-13 rounded-2xl bg-background/90 backdrop-blur-md border border-border/70 shadow-xs flex items-center justify-center text-primary group-hover:scale-110 group-hover:border-primary/40 transition-all duration-300">
                      <Icon className="size-6" />
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-background/80 backdrop-blur-md border border-border/60 text-foreground shrink-0"
                    >
                      {niche.badge}
                    </Badge>
                  </div>

                  {/* Meio do Card: Tipografia e Descrição Vertical */}
                  <div className="relative z-10 space-y-1.5 flex-1 flex flex-col justify-center mt-3">
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {niche.title}
                    </h3>
                    <p className="text-xs font-semibold text-primary/90">
                      {niche.subtitle}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {niche.description}
                    </p>
                  </div>

                  {/* Rodapé do Card: Ação com Seta Animada */}
                  <div className="relative z-10 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    <span>Criar Anúncio</span>
                    <div className="size-7 rounded-full bg-muted/80 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:translate-x-1 transition-all">
                      <ChevronRight className="size-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* ── 2.5 Trilho de Cards Verticais (Para Negócios / B2C) ── */}
      {businessNiches.length > 0 && (
      <div className="space-y-3 pt-6 mt-6 border-t border-border/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Para o Seu Negócio (Varejo & Serviços)
          </span>
        </div>

        <div className="relative group/rail2">
          {/* Trilho de Scroll Horizontal com Snap */}
          <div
            className="flex flex-row gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar py-2 px-0.5 scroll-smooth"
          >
            {businessNiches.map((niche) => {
              const Icon = niche.icon;
              return (
                <button
                  key={niche.id}
                  onClick={() => onSelect(niche.id)}
                  className="w-[260px] sm:w-[280px] min-w-[260px] sm:min-w-[280px] h-[370px] sm:h-[390px] shrink-0 snap-start text-left relative rounded-2xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 p-5 flex flex-col justify-between overflow-hidden group cursor-pointer"
                >
                  <div
                    className={`absolute top-0 inset-x-0 h-36 bg-gradient-to-b ${niche.gradient} opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none`}
                  />
                  <div className="relative z-10 flex items-start justify-between gap-2">
                    <div className="size-13 rounded-2xl bg-background/90 backdrop-blur-md border border-border/70 shadow-xs flex items-center justify-center text-primary group-hover:scale-110 group-hover:border-primary/40 transition-all duration-300">
                      <Icon className="size-6" />
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-background/80 backdrop-blur-md border border-border/60 text-foreground shrink-0"
                    >
                      {niche.badge}
                    </Badge>
                  </div>
                  <div className="relative z-10 space-y-1.5 flex-1 flex flex-col justify-center mt-3">
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {niche.title}
                    </h3>
                    <p className="text-xs font-semibold text-primary/90">
                      {niche.subtitle}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {niche.description}
                    </p>
                  </div>
                  <div className="relative z-10 pt-3 border-t border-border/50 flex items-center justify-between text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                    <span>Criar Anúncio</span>
                    <div className="size-7 rounded-full bg-muted/80 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:translate-x-1 transition-all">
                      <ChevronRight className="size-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* ── 3. Categorias Rápidas para Desapego ── */}
      <div className="space-y-2 pt-2 border-t border-border/40">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
          Categorias Populares para Desapego Rápido
        </span>
        <div className="flex flex-wrap gap-1.5">
          {DESAPEGO_TAXONOMY.slice(0, 8).map((cat) => (
            <Badge
              key={cat.id}
              variant="outline"
              onClick={() => onSelect("desapego", cat.id)}
              className="text-xs py-1.5 px-3 rounded-xl gap-1.5 cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
            >
              <span>{cat.label}</span>
            </Badge>
          ))}
        </div>
      </div>

      {filteredDesapegoItems.length > 0 && (
        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
            Itens Específicos Encontrados ({filteredDesapegoItems.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredDesapegoItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect("desapego", item.id)}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/40 text-left transition-all cursor-pointer"
              >
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Tag className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{item.desc}</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMADA 3: Specialized Editor + Live Truthful Preview
// ─────────────────────────────────────────────────────────────────────────────
function SpecializedClassifiedEditor({
  niche,
  onBack,
  initialData,
  editId,
  storeId,
  initialSubcategory,
}: {
  niche: NicheDefinition;
  onBack: () => void;
  initialData?: any;
  editId?: string;
  storeId?: string;
  initialSubcategory?: string;
}) {
  const navigate = useNavigate();
 const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<2 | 3 | 4 | 5>(2);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");

  // Identidade do Anúncio (Perfil Pessoal vs Loja Oficial)
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(
    storeId || initialData?.store_id || null
  );
  const [userStores, setUserStores] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingIdentity, setIsLoadingIdentity] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getMyStoresList().catch(() => []),
      getProfile().catch(() => null),
    ]).then(([stores, prof]) => {
      if (!mounted) return;
      setUserStores(stores || []);
      setUserProfile(prof);
      setIsLoadingIdentity(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedStore = useMemo(() => {
    if (!selectedStoreId) return null;
    return userStores.find((s) => s.id === selectedStoreId) || null;
  }, [selectedStoreId, userStores]);

  const [isCustomCommercialOpen, setIsCustomCommercialOpen] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{ step: number; savedAt: string } | null>(null);
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
 const [jobWorkSchedule, setJobWorkSchedule] = useState("integral_44h");
 const [jobAcceptedMethods, setJobAcceptedMethods] = useState<string[]>([
 "perfil_waesy",
 "upload_cv",
 "whatsapp",
 ]);
 const [customSkillInput, setCustomSkillInput] = useState("");
 const [customHospAmenity, setCustomHospAmenity] = useState("");
 const [customReAmenity, setCustomReAmenity] = useState("");
 const [customVehicleOption, setCustomVehicleOption] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isUploadingMedia, setIsUploadingMedia] = useState(false);

 // Common Form States
 const [title, setTitle] = useState(initialData?.title || "");
 const [description, setDescription] = useState(
   initialData?.content || initialData?.description || ""
 );
 const [isRefiningDescription, setIsRefiningDescription] = useState(false);

 const handleRefineDescriptionWithAI = async () => {
   if (!title.trim() && !description.trim()) {
     toast.error("Preencha ao menos o título ou um resumo da descrição para a IA refinar.");
     return;
   }
   setIsRefiningDescription(true);
   toast.loading("Refinando anúncio com IA...", { id: "ai-refine" });
   try {
     const res = await refineClassifiedWithAI({
       data: {
         title: title.trim(),
         description: description.trim(),
         niche: niche.id,
       },
     });
     if (res.success) {
       if (res.title) setTitle(res.title);
       if (res.description) setDescription(res.description);
       toast.success("Título e descrição aprimorados com sucesso!", { id: "ai-refine" });
     } else {
       toast.error(res.message || "Não foi possível aprimorar no momento.", { id: "ai-refine" });
     }
   } catch (err: any) {
     toast.error(err?.message || "Erro ao conectar com a IA.", { id: "ai-refine" });
   } finally {
     setIsRefiningDescription(false);
   }
 };

 const [aiInstructions, setAiInstructions] = useState("");
 const [aiAgentEnabled, setAiAgentEnabled] = useState<boolean>(
   initialData?.ai_agent_enabled ?? false
 );
 const [maxDiscountPct, setMaxDiscountPct] = useState<number>(
   initialData?.max_discount_pct ?? 0
 );
 const [priceCents, setPriceCents] = useState<number | undefined>(
   initialData?.price_cents ?? undefined
 );
 const [negotiable, setNegotiable] = useState(true);
 const [locationName, setLocationName] = useState("");
 const [structuredLoc, setStructuredLoc] = useState<StructuredLocationValue | null>(null);
 const [whatsapp, setWhatsapp] = useState("");
 const [images, setImages] = useState<string[]>([]);
 const [activePreviewImage, setActivePreviewImage] = useState(0);

  // Template de Exibição (Padrão Comercial vs Vitrine Imersiva / Glamour)
  const [templateStyle, setTemplateStyle] = useState<"standard" | "editorial" | "conveniencia">(
    initialData?.attributes?.template_style === "editorial" || initialData?.attributes?.template_style === "instagram"
      ? "editorial"
      : initialData?.attributes?.template_style === "conveniencia"
      ? "conveniencia"
      : niche.id === "viagem"
      ? "editorial"
      : "standard"
  );

  // ── Motor de Precificação Dinâmica & Avisos ──
  const [pricingType, setPricingType] = useState<
    "fixed" | "starting_at" | "on_quote" | "price_range" | "exchange_only" | "free"
  >(
    initialData?.attributes?.pricing_type || (niche.id === "doacao" ? "free" : "fixed")
  );
  const [priceMinCents, setPriceMinCents] = useState<number | undefined>(
    initialData?.attributes?.price_min_cents ?? undefined
  );
  const [priceMaxCents, setPriceMaxCents] = useState<number | undefined>(
    initialData?.attributes?.price_max_cents ?? undefined
  );
  const [priceDisclaimer, setPriceDisclaimer] = useState<string>(
    initialData?.attributes?.price_disclaimer || "none"
  );
  const [customDisclaimer, setCustomDisclaimer] = useState<string>(
    initialData?.attributes?.custom_disclaimer || ""
  );

  // ── Regras Avançadas de Pagamento ──
  const [pixDiscountPercent, setPixDiscountPercent] = useState<number>(
    initialData?.attributes?.pix_discount_percent ?? (initialData?.attributes?.payment_rules?.pix_discount_percent ?? 0)
  );
  const [tradeNotes, setTradeNotes] = useState<string>(
    initialData?.attributes?.trade_notes ?? (initialData?.attributes?.payment_rules?.trade_notes ?? "")
  );
  const [acceptsFinancing, setAcceptsFinancing] = useState<boolean>(
    initialData?.attributes?.accepts_financing ?? (initialData?.attributes?.payment_rules?.accepts_financing ?? false)
  );
  const [financingNotes, setFinancingNotes] = useState<string>(
    initialData?.attributes?.financing_notes ?? ""
  );

  // Specialized: Viagens, Turismo & Resorts
  const [travelDuration, setTravelDuration] = useState(
    initialData?.attributes?.duration_text || ""
  );
  const [travelMealPlan, setTravelMealPlan] = useState(
    initialData?.attributes?.meal_plan || ""
  );
  const [travelGuests, setTravelGuests] = useState(
    initialData?.attributes?.guests_text || ""
  );
  const [travelDates, setTravelDates] = useState(
    initialData?.attributes?.dates_text || ""
  );

  // ── Novos campos de viagem: Destino e Aeroportos ──
  const [travelDestinationCity, setTravelDestinationCity] = useState(
    initialData?.attributes?.destination_city || initialData?.attributes?.destination || initialData?.attributes?.flight_details?.arrival_city || ""
  );
  const [travelDepartureDate, setTravelDepartureDate] = useState(
    initialData?.attributes?.departure_date || ""
  );
  const [travelReturnDate, setTravelReturnDate] = useState(
    initialData?.attributes?.return_date || ""
  );
  const [travelDepartureIATA, setTravelDepartureIATA] = useState(
    initialData?.attributes?.flight_details?.departure_iata || ""
  );
  const [travelArrivalIATA, setTravelArrivalIATA] = useState(
    initialData?.attributes?.flight_details?.arrival_iata || ""
  );
  const [travelAirline, setTravelAirline] = useState(
    initialData?.attributes?.flight_details?.airline || ""
  );
  const [travelTransportType, setTravelTransportType] = useState(
    initialData?.attributes?.flight_details?.transport_type || "airplane"
  );
  const [travelConnections, setTravelConnections] = useState(
    initialData?.attributes?.flight_details?.connections ?? 0
  );
  const [travelDepartureTime, setTravelDepartureTime] = useState(
    initialData?.attributes?.flight_details?.departure_time || ""
  );
  const [travelArrivalTime, setTravelArrivalTime] = useState(
    initialData?.attributes?.flight_details?.arrival_time || ""
  );
  const [travelMaxInstallments, setTravelMaxInstallments] = useState(
    initialData?.attributes?.max_installments || 12
  );
  const [travelStoryHighlights, setTravelStoryHighlights] = useState<StoryHighlight[]>(
    initialData?.attributes?.story_highlights || []
  );
  const [travelItineraryDays, setTravelItineraryDays] = useState<ItineraryDay[]>(
    initialData?.attributes?.itinerary_days || []
  );

  const [travelFlightPrice, setTravelFlightPrice] = useState(
    initialData?.attributes?.flight_details?.price_text || ""
  );
  const [travelFlightDuration, setTravelFlightDuration] = useState(
    initialData?.attributes?.flight_details?.duration_text || ""
  );

  // ── Transporte Terrestre / Excursão ──
  const [travelBusCategory, setTravelBusCategory] = useState(
    initialData?.attributes?.flight_details?.bus_category || ""
  );
  const [travelBusCompany, setTravelBusCompany] = useState(
    initialData?.attributes?.flight_details?.bus_company || ""
  );
  const [travelDepartureCity, setTravelDepartureCity] = useState(
    initialData?.attributes?.flight_details?.departure_city || initialData?.attributes?.departure_city || ""
  );
  const [travelMeetingPoint, setTravelMeetingPoint] = useState(
    initialData?.attributes?.flight_details?.meeting_point || ""
  );
  const [travelBoardingGatewayInput, setTravelBoardingGatewayInput] = useState("");
  const [travelBoardingGateways, setTravelBoardingGateways] = useState<string[]>(
    initialData?.attributes?.flight_details?.boarding_gateways || []
  );
  const [travelReturnDepartureTime, setTravelReturnDepartureTime] = useState(
    initialData?.attributes?.flight_details?.return_departure_time || ""
  );
  const [travelGuideService, setTravelGuideService] = useState(
    initialData?.attributes?.flight_details?.guide_service || ""
  );

  // ── Multimodal / Combo ──
  const [travelComboFromIATA, setTravelComboFromIATA] = useState(
    initialData?.attributes?.flight_details?.combo_flight_from_iata || ""
  );
  const [travelComboToIATA, setTravelComboToIATA] = useState(
    initialData?.attributes?.flight_details?.combo_flight_to_iata || ""
  );
  const [travelComboAirline, setTravelComboAirline] = useState(
    initialData?.attributes?.flight_details?.combo_airline || ""
  );
  const [travelComboFlightPrice, setTravelComboFlightPrice] = useState(
    initialData?.attributes?.flight_details?.combo_flight_price_text || ""
  );
  const [travelTransferVehicle, setTravelTransferVehicle] = useState(
    initialData?.attributes?.flight_details?.transfer_vehicle || ""
  );
  const [travelTransferFrom, setTravelTransferFrom] = useState(
    initialData?.attributes?.flight_details?.transfer_from || ""
  );
  const [travelTransferTo, setTravelTransferTo] = useState(
    initialData?.attributes?.flight_details?.transfer_to || ""
  );
  const [travelTransferDuration, setTravelTransferDuration] = useState(
    initialData?.attributes?.flight_details?.transfer_duration || ""
  );
  const [travelTransferTime, setTravelTransferTime] = useState(
    initialData?.attributes?.flight_details?.transfer_departure_time || ""
  );
  const [travelComboNotes, setTravelComboNotes] = useState(
    initialData?.attributes?.flight_details?.combo_notes || ""
  );

  // ── Cruzeiro ──
  const [travelShipName, setTravelShipName] = useState(
    initialData?.attributes?.flight_details?.ship_name || ""
  );
  const [travelCruiseLine, setTravelCruiseLine] = useState(
    initialData?.attributes?.flight_details?.cruise_line || ""
  );
  const [travelCabinCategory, setTravelCabinCategory] = useState(
    initialData?.attributes?.flight_details?.cabin_category || ""
  );
  const [travelEmbarkationPort, setTravelEmbarkationPort] = useState(
    initialData?.attributes?.flight_details?.embarkation_port || ""
  );

  // ── Múltiplas Saídas / Datas ──
  const [travelDepartureOptions, setTravelDepartureOptions] = useState<DepartureOption[]>(
    initialData?.attributes?.departure_options || []
  );

  // ── Helpers para gateway tags ──
  const handleAddGateway = () => {
    const v = travelBoardingGatewayInput.trim();
    if (!v || travelBoardingGateways.includes(v)) return;
    setTravelBoardingGateways((prev) => [...prev, v]);
    setTravelBoardingGatewayInput("");
  };
  const handleRemoveGateway = (g: string) =>
    setTravelBoardingGateways((prev) => prev.filter((x) => x !== g));

  // ── Helpers para múltiplas saídas ──
  const handleAddDeparture = () => {
    const newOpt: DepartureOption = {
      id: crypto.randomUUID(),
      departure_date: "",
      return_date: "",
      status: "confirmed",
      label: `Saída ${travelDepartureOptions.length + 1}`,
    };
    setTravelDepartureOptions((prev) => [...prev, newOpt]);
  };
  const handleUpdateDeparture = (id: string, patch: Partial<DepartureOption>) =>
    setTravelDepartureOptions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );
  const handleRemoveDeparture = (id: string) =>
    setTravelDepartureOptions((prev) => prev.filter((d) => d.id !== id));
  const [travelBioBullets, setTravelBioBullets] = useState<string[]>(() => {
    if (Array.isArray(initialData?.attributes?.bio_bullets) && initialData.attributes.bio_bullets.length > 0) {
      return initialData.attributes.bio_bullets;
    }
    return [""]; // Campo livre limpo por padrão, sem fallbacks hardcoded
  });

  const handleAddTravelBullet = () => {
    setTravelBioBullets((prev) => [...prev, ""]);
  };

  const handleUpdateTravelBullet = (index: number, val: string) => {
    setTravelBioBullets((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleRemoveTravelBullet = (index: number) => {
    setTravelBioBullets((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [""] : next;
    });
  };

  const handleMoveTravelBullet = (index: number, direction: "up" | "down") => {
    setTravelBioBullets((prev) => {
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  };

  // Specialized: Aluguel de Equipamentos
  const [equipmentPeriod, setEquipmentPeriod] = useState<"diaria" | "evento" | "semanal">(
    initialData?.attributes?.equipment_period || "diaria"
  );
  const [equipmentDepositCents, setEquipmentDepositCents] = useState<number | undefined>(
    initialData?.attributes?.deposit_cents || undefined
  );

  // Specialized: Hospedagem & Temporada
  const [hospPropertyType, setHospPropertyType] = useState("");
  const [hospGuests, setHospGuests] = useState("");
  const [hospBedrooms, setHospBedrooms] = useState("");
  const [hospBathrooms, setHospBathrooms] = useState("");
  const [hospCleaningFeeCents, setHospCleaningFeeCents] = useState<number | undefined>(undefined);
  const [hospCheckinType, setHospCheckinType] = useState<"self_checkin" | "presential" | "front_desk">("self_checkin");
  const [hospCheckinTime, setHospCheckinTime] = useState("14:00");
  const [hospCheckoutTime, setHospCheckoutTime] = useState("11:00");
  const [hospAmenities, setHospAmenities] = useState<string[]>([]);
  const [hospRules, setHospRules] = useState<string[]>([]);

  // Specialized: Imóvel
  const [reDealType, setReDealType] = useState<"aluguel" | "venda" | "temporada">("aluguel");
  const [rePropertyType, setRePropertyType] = useState("");
  const [reAreaSqm, setReAreaSqm] = useState("");
  const [reBedrooms, setReBedrooms] = useState("");
  const [reSuites, setReSuites] = useState("");
  const [reBathrooms, setReBathrooms] = useState("");
  const [reParking, setReParking] = useState("");
  const [reCondoCents, setReCondoCents] = useState<number | undefined>(undefined);
  const [reIptuCents, setReIptuCents] = useState<number | undefined>(undefined);
  const [reFurnished, setReFurnished] = useState("");
  const [reAmenities, setReAmenities] = useState<string[]>([]);

  // Specialized: Veículo
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleVersion, setVehicleVersion] = useState("");
  const [vehicleYearFab, setVehicleYearFab] = useState("");
  const [vehicleYearModel, setVehicleYearModel] = useState("");
  const [vehicleKm, setVehicleKm] = useState("");
  const [vehicleFuel, setVehicleFuel] = useState("Flex");
  const [vehicleTransmission, setVehicleTransmission] = useState("Automático");
  const [vehicleColor, setVehicleColor] = useState("");
  const [vehicleFeatures, setVehicleFeatures] = useState<string[]>([]);

  // Specialized: Desapego & Itens Gerais
  const [desapegoCategory, setDesapegoCategory] = useState<
    "smartphones" | "computadores" | "eletronicos" | "moveis" | "eletrodomesticos" | "moda_brecho" | "garagem" | "outros"
  >("smartphones");
  const [itemCondition, setItemCondition] = useState<
    "novo" | "usado_excelente" | "usado_bom" | "com_marcas"
  >("usado_excelente");
  const [itemWarranty, setItemWarranty] = useState("");
  // Smartphones contextuais para mensuração
  const [phoneBrand, setPhoneBrand] = useState("");
  const [phoneModel, setPhoneModel] = useState("");
  const [phoneStorage, setPhoneStorage] = useState("");
  const [phoneBatteryHealth, setPhoneBatteryHealth] = useState("");
  const [phoneAccessories, setPhoneAccessories] = useState<string[]>([]);
  // Specialized: Assinaturas & Recorrência
  const [pricingModel, setPricingModel] = useState<"one_time" | "recurring">(
    niche.id === "assinatura" ? "recurring" : "one_time"
  );
  const [billingCycle, setBillingCycle] = useState<"monthly" | "quarterly" | "semiannual" | "yearly">("monthly");
  const [setupFeeCents, setSetupFeeCents] = useState<number | undefined>(undefined);
  const [trialDays, setTrialDays] = useState<number>(0);
  const [recurringFeatures, setRecurringFeatures] = useState<string[]>([
    "Acesso completo ao serviço",
    "Suporte prioritário via WhatsApp",
  ]);
  const [newFeatureInput, setNewFeatureInput] = useState("");

  // Specialized: Formas de Pagamento & Cancelamento (Zero Hardcoded)
  const [acceptsPix, setAcceptsPix] = useState(true);
  const [acceptsCard, setAcceptsCard] = useState(false);
  const [maxInstallments, setMaxInstallments] = useState(12);
  const [cardInterestFree, setCardInterestFree] = useState(true);
  const [acceptsBoleto, setAcceptsBoleto] = useState(false);
  const [boletoDueDays, setBoletoDueDays] = useState(3);
  const [acceptsBoletoInstallments, setAcceptsBoletoInstallments] = useState(false);
  const [maxBoletoInstallments, setMaxBoletoInstallments] = useState(12);
  const [boletoMinDownPaymentCents, setBoletoMinDownPaymentCents] = useState<number | undefined>(undefined);
  const [boletoNotes, setBoletoNotes] = useState("");
  const [acceptsCarne, setAcceptsCarne] = useState(false);
  const [maxCarneInstallments, setMaxCarneInstallments] = useState(12);
  const [carneGraceDays, setCarneGraceDays] = useState(30);
  const [carneMinDownPaymentCents, setCarneMinDownPaymentCents] = useState<number | undefined>(undefined);
  const [carneNotes, setCarneNotes] = useState("");
  const [acceptsCash, setAcceptsCash] = useState(true);
  const [acceptsTrade, setAcceptsTrade] = useState(false);
  const [cancellationPolicy, setCancellationPolicy] = useState<"flexible" | "moderate" | "strict" | "negotiable">("flexible");

  // ── Modo Conveniência & Fast Delivery (Bebidas, Mercado, Lanches) ──
  const [convenienceVolume, setConvenienceVolume] = useState<string>(initialData?.attributes?.volume || "");
  const [convenienceTemp, setConvenienceTemp] = useState<"gelada" | "ambiente" | "congelado" | "fresco" | "none">(
    initialData?.attributes?.temperature || "gelada"
  );
  const [isAlcoholic, setIsAlcoholic] = useState<boolean>(
    initialData?.attributes?.is_alcoholic ?? (niche.id === "mercado")
  );
  const [convenienceBrand, setConvenienceBrand] = useState<string>(
    initialData?.attributes?.brand || ""
  );
  const [deliveryEstimateText, setDeliveryEstimateText] = useState<string>(
    initialData?.attributes?.delivery_estimate || "35-50 min (MotoLink Express)"
  );
  const [readyDelivery, setReadyDelivery] = useState<boolean>(
    initialData?.attributes?.ready_delivery ?? true
  );

  // Computadores Canônicos
  const [computerType, setComputerType] = useState("");
  const [computerBrand, setComputerBrand] = useState("");
  const [computerProcessor, setComputerProcessor] = useState("");
  const [computerRam, setComputerRam] = useState("");
  const [computerStorage, setComputerStorage] = useState("");

  // Eletrodomésticos Canônicos
  const [applianceType, setApplianceType] = useState("");
  const [applianceBrand, setApplianceBrand] = useState("");
  const [applianceVoltage, setApplianceVoltage] = useState("");

  // Games Canônicos
  const [gameConsole, setGameConsole] = useState("");

  // Moda / Brechó Canônico
  const [fashionCategory, setFashionCategory] = useState("Roupas em Geral");
  const [fashionBrand, setFashionBrand] = useState("");

  // Veículo Procedência
  const [vehicleProvenance, setVehicleProvenance] = useState<string[]>([]);

  // Móveis & Brechó
  const [furnitureRoom, setFurnitureRoom] = useState("");
  const [furnitureMaterial, setFurnitureMaterial] = useState("");
  const [fashionGender, setFashionGender] = useState("Unissex");
  const [fashionSize, setFashionSize] = useState("M");

  // Specialized: Oportunidade / Vaga (Microfase 77B)
  const [jobRole, setJobRole] = useState("");
  const [jobModel, setJobModel] = useState<"presencial" | "hibrido" | "remoto">("presencial");
  const [jobRegime, setJobRegime] = useState<"CLT" | "PJ" | "Estágio" | "Freelancer">("CLT");
  const [jobSalaryRange, setJobSalaryRange] = useState("");
  const [jobMinEducation, setJobMinEducation] = useState("Ensino Médio Completo");
  const [jobExperienceLevel, setJobExperienceLevel] = useState("Júnior (1 a 2 anos)");
  const [jobApplicationType, setJobApplicationType] = useState<"perfil_waesy" | "whatsapp" | "email_cv">("perfil_waesy");
  const [jobBenefits, setJobBenefits] = useState<string[]>([]);
  const [jobSkills, setJobSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");

  // Specialized: Logística Avançada & Formas de Pagamento
  const [deliveryMode, setDeliveryMode] = useState<"both" | "pickup" | "local_delivery" | "shipping">("both");
  const [freeShippingLocal, setFreeShippingLocal] = useState(false);

  // Specialized: Serviço
  const [serviceModality, setServiceModality] = useState<"presencial" | "remoto" | "domicilio">(
    "presencial",
  );
  const [serviceArea, setServiceArea] = useState("");
  const [serviceDuration, setServiceDuration] = useState("60");
  const [servicePricingType, setServicePricingType] = useState<"fixo" | "por_hora" | "a_combinar">(
    "fixo",
  );
  const [serviceBookingEnabled, setServiceBookingEnabled] = useState(true);
  const [serviceAvailableDays, setServiceAvailableDays] = useState<string[]>([
    "seg",
    "ter",
    "qua",
    "qui",
    "sex",
  ]);
  const [serviceHoursStart, setServiceHoursStart] = useState("08:00");
  const [serviceHoursEnd, setServiceHoursEnd] = useState("18:00");
  const [serviceDailySlots, setServiceDailySlots] = useState("8");

  // Specialized: Gastronomia & Sub-nichos
  const [foodSubNiche, setFoodSubNiche] = useState<string>(
    initialData?.attributes?.food_subniche || "hamburgueria"
  );
  const [foodPrepTime, setFoodPrepTime] = useState<string>(
    initialData?.attributes?.food_prep_time_minutes || "20-35 min"
  );
  const [foodDeliveryModes, setFoodDeliveryModes] = useState<string[]>(
    initialData?.attributes?.food_delivery_modes || ["delivery_proprio", "retirada_balcao"]
  );

  // Specialized: Mercado, Perecíveis & Conveniência
  const [groceryDepartment, setGroceryDepartment] = useState<string>(
    initialData?.attributes?.grocery_department || "bebidas_adega"
  );
  const [grocerySubCategory, setGrocerySubCategory] = useState<string>(
    initialData?.attributes?.sub_category || ""
  );
  const [groceryUnitType, setGroceryUnitType] = useState<string>(
    initialData?.attributes?.unit_type || "un"
  );
  const [groceryEstimatedWeightPerUnit, setGroceryEstimatedWeightPerUnit] = useState<string>(
    initialData?.attributes?.estimated_weight_per_unit || ""
  );
  const [groceryTemperature, setGroceryTemperature] = useState<string>(
    initialData?.attributes?.temperature || initialData?.attributes?.storage_temp || "ambiente"
  );
  const [groceryBrand, setGroceryBrand] = useState<string>(
    initialData?.attributes?.brand || initialData?.attributes?.manufacturer || ""
  );
  const [groceryBarcodeEan, setGroceryBarcodeEan] = useState<string>(
    initialData?.attributes?.barcode_ean || initialData?.attributes?.ean || ""
  );
  const [groceryIngredients, setGroceryIngredients] = useState<string>(
    initialData?.attributes?.ingredients || ""
  );
  const [groceryIsAlcoholic, setGroceryIsAlcoholic] = useState<boolean>(
    initialData?.attributes?.is_alcoholic ?? false
  );
  const [groceryContainsGluten, setGroceryContainsGluten] = useState<boolean | null>(
    initialData?.attributes?.contains_gluten ?? null
  );
  const [groceryContainsLactose, setGroceryContainsLactose] = useState<boolean | null>(
    initialData?.attributes?.contains_lactose ?? null
  );
  const [groceryIsOrganic, setGroceryIsOrganic] = useState<boolean>(
    initialData?.attributes?.is_organic ?? false
  );
  const [groceryPrepOptions, setGroceryPrepOptions] = useState<string[]>(
    Array.isArray(initialData?.attributes?.prep_options) ? initialData.attributes.prep_options : []
  );
  const [groceryDeliveryEstimate, setGroceryDeliveryEstimate] = useState<string>(
    initialData?.attributes?.delivery_estimate || "30 a 45 min"
  );
  const [groceryDeliveryFeeCents, setGroceryDeliveryFeeCents] = useState<number>(
    Number(initialData?.attributes?.delivery_fee_cents) || 500
  );

  // FASE 1: Hortifrúti Fresco & Maturação
  const [grocerySupportsFreshPricing, setGrocerySupportsFreshPricing] = useState<boolean>(
    initialData?.attributes?.grocery_fresh_pricing?.supports_fresh_pricing ??
    (initialData?.attributes?.grocery_department === "hortifruti" || initialData?.attributes?.unit_type === "kg")
  );
  const [groceryDefaultPricingMode, setGroceryDefaultPricingMode] = useState<"unit" | "weight">(
    initialData?.attributes?.grocery_fresh_pricing?.default_pricing_mode || "unit"
  );
  const [groceryAvgPieceWeightGrams, setGroceryAvgPieceWeightGrams] = useState<number>(
    initialData?.attributes?.grocery_fresh_pricing?.avg_piece_weight_grams || 500
  );
  const [groceryPricePerKgCents, setGroceryPricePerKgCents] = useState<number>(
    initialData?.attributes?.grocery_fresh_pricing?.price_per_kg_cents || 0
  );
  const [groceryRipenessEnabled, setGroceryRipenessEnabled] = useState<boolean>(
    initialData?.attributes?.grocery_ripeness_config?.enabled ??
    (initialData?.attributes?.grocery_department === "hortifruti")
  );
  const [groceryRipenessStages, setGroceryRipenessStages] = useState<RipenessStage[]>(
    initialData?.attributes?.grocery_ripeness_config?.stages || ["menos_maduro", "maduro", "mais_maduro"]
  );

  // FASE 1: Motor de Promoções & Upsell (Gamificação)
  const [groceryDiscountTiers, setGroceryDiscountTiers] = useState<ProgressiveDiscountTier[]>(() => {
    if (Array.isArray(initialData?.attributes?.progressive_discount_tiers) && initialData.attributes.progressive_discount_tiers.length > 0) {
      return initialData.attributes.progressive_discount_tiers;
    }
    return [
      { min_quantity: 2, discount_type: "percentage", discount_value: 10 },
      { min_quantity: 3, discount_type: "percentage", discount_value: 20 },
    ];
  });
  const [groceryProgressiveDiscountsEnabled, setGroceryProgressiveDiscountsEnabled] = useState<boolean>(
    (initialData?.attributes?.progressive_discount_tiers?.length ?? 0) > 0
  );

  // FASE 1: Oferta Relâmpago / Order Bump no Checkout
  const [groceryOrderBumpEnabled, setGroceryOrderBumpEnabled] = useState<boolean>(
    initialData?.attributes?.order_bump_offer?.enabled ?? false
  );
  const [groceryOrderBumpTitle, setGroceryOrderBumpTitle] = useState<string>(
    initialData?.attributes?.order_bump_offer?.target_title || ""
  );
  const [groceryOrderBumpSpecialPriceCents, setGroceryOrderBumpSpecialPriceCents] = useState<number>(
    initialData?.attributes?.order_bump_offer?.special_price_cents || 0
  );
  const [groceryOrderBumpOriginalPriceCents, setGroceryOrderBumpOriginalPriceCents] = useState<number>(
    initialData?.attributes?.order_bump_offer?.original_price_cents || 0
  );
  const [groceryOrderBumpBadge, setGroceryOrderBumpBadge] = useState<string>(
    initialData?.attributes?.order_bump_offer?.badge_text || "Oferta Relâmpago"
  );

  // Specialized: Serviços Especializados & Conselhos
  const [serviceSubNiche, setServiceSubNiche] = useState<string>(
    initialData?.attributes?.service_subniche || "advocacia"
  );
  const [serviceProfessionalCouncil, setServiceProfessionalCouncil] = useState<string>(
    initialData?.attributes?.professional_council || ""
  );
  const [serviceSpecialty, setServiceSpecialty] = useState<string>(
    initialData?.attributes?.specialty || ""
  );

  // Specialized: Negócios, Empresas & M&A (meuBIZ / Quero Um Negócio)
  const [businessType, setBusinessType] = useState<string>(
    initialData?.attributes?.business_type || "venda_total"
  );
  const [businessSegment, setBusinessSegment] = useState<string>(
    initialData?.attributes?.business_segment || CANONICAL_BUSINESS_SEGMENTS[0]
  );
  const [businessMonthlyRevenueCents, setBusinessMonthlyRevenueCents] = useState<number | undefined>(
    initialData?.attributes?.monthly_revenue_cents ?? undefined
  );
  const [businessNetProfitCents, setBusinessNetProfitCents] = useState<number | undefined>(
    initialData?.attributes?.net_profit_cents ?? undefined
  );
  const [businessValuationCents, setBusinessValuationCents] = useState<number | undefined>(
    initialData?.attributes?.valuation_cents ?? undefined
  );
  const [businessWorkingCapitalCents, setBusinessWorkingCapitalCents] = useState<number | undefined>(
    initialData?.attributes?.working_capital_cents ?? undefined
  );
  const [businessFoundationYear, setBusinessFoundationYear] = useState<string>(
    initialData?.attributes?.foundation_year ? String(initialData.attributes.foundation_year) : ""
  );
  const [businessEmployeesRange, setBusinessEmployeesRange] = useState<string>(
    initialData?.attributes?.employees_range || CANONICAL_EMPLOYEES_RANGES[2]
  );
  const [businessSaleReason, setBusinessSaleReason] = useState<string>(
    initialData?.attributes?.sale_reason || CANONICAL_SALE_REASONS[0]
  );
  const [businessPointType, setBusinessPointType] = useState<string>(
    initialData?.attributes?.commercial_point_type || CANONICAL_COMMERCIAL_POINT_TYPES[0]
  );
  const [businessAreaSqm, setBusinessAreaSqm] = useState<string>(
    initialData?.attributes?.area_sqm ? String(initialData.attributes.area_sqm) : ""
  );
  const [businessMonthlyRentCents, setBusinessMonthlyRentCents] = useState<number | undefined>(
    initialData?.attributes?.monthly_rent_cents ?? undefined
  );
  const [businessMonthlyIptuCents, setBusinessMonthlyIptuCents] = useState<number | undefined>(
    initialData?.attributes?.monthly_iptu_cents ?? undefined
  );
  const [businessMonthlyCondoCents, setBusinessMonthlyCondoCents] = useState<number | undefined>(
    initialData?.attributes?.monthly_condo_cents ?? undefined
  );
  const [businessContractRemainingYears, setBusinessContractRemainingYears] = useState<string>(
    initialData?.attributes?.contract_remaining_years || "3 anos"
  );
  const [businessRequiresNda, setBusinessRequiresNda] = useState<boolean>(
    initialData?.attributes?.requires_nda ?? true
  );
  const [businessAdvisorSupported, setBusinessAdvisorSupported] = useState<boolean>(
    initialData?.attributes?.advisor_supported ?? false
  );

  // Specialized: Dados Cadastrais & CNPJ (meuBIZ / Quero Um Negócio)
  const [companyCnpj, setCompanyCnpj] = useState<string>(
    initialData?.attributes?.company_cnpj || ""
  );
  const [companyLegalName, setCompanyLegalName] = useState<string>(
    initialData?.attributes?.company_legal_name || ""
  );
  const [cnaePrincipal, setCnaePrincipal] = useState<string>(
    initialData?.attributes?.cnae_principal || ""
  );
  const [cnaeDescription, setCnaeDescription] = useState<string>(
    initialData?.attributes?.cnae_description || ""
  );
  const [taxRegime, setTaxRegime] = useState<string>(
    initialData?.attributes?.tax_regime || "simples_nacional"
  );
  const [capitalSocialCents, setCapitalSocialCents] = useState<number | undefined>(
    initialData?.attributes?.capital_social_cents ?? undefined
  );
  const [legalRiskScore, setLegalRiskScore] = useState<number | undefined>(
    initialData?.attributes?.legal_risk_score ?? undefined
  );
  const [aiEvaluationSummary, setAiEvaluationSummary] = useState<string>(
    initialData?.attributes?.ai_evaluation_summary || ""
  );
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [cnpjAuditData, setCnpjAuditData] = useState<any | null>(null);

  const handleLookupAndAuditCnpj = async () => {
    const clean = companyCnpj.replace(/\D/g, "");
    if (clean.length !== 14) {
      toast.error("Informe um CNPJ válido com 14 dígitos.");
      return;
    }
    setIsSearchingCnpj(true);
    toast.loading("Consultando dados oficiais na Receita Federal e auditando com IA...", { id: "cnpj-audit" });
    try {
      const [official, audit] = await Promise.all([
        lookupCnpj({ data: { cnpj: clean } }).catch(() => null),
        auditCnpjWithSimLabs({
          data: {
            cnpj: clean,
            companyName: companyLegalName || title || undefined,
            taxRegime: (taxRegime as any) || "simples_nacional",
            capitalSocialCents: capitalSocialCents || 0,
          },
        }).catch(() => null),
      ]);

      if (official) {
        if (!title.trim() && (official.tradeName || official.corporateName)) {
          setTitle(official.tradeName || official.corporateName);
        }
        setCompanyLegalName(official.corporateName || "");
        if (official.openingDate) {
          const year = new Date(official.openingDate).getFullYear();
          if (!isNaN(year)) setBusinessFoundationYear(String(year));
        }
        if (official.capitalSocial) {
          setCapitalSocialCents(Math.round(official.capitalSocial * 100));
        }
        if (official.mainCnae) {
          setCnaePrincipal(String(official.mainCnae.code || ""));
          setCnaeDescription(official.mainCnae.description || "");
        }
        if (official.address) {
          const addr = official.address;
          const formatted = [addr.street, addr.number, addr.neighborhood, addr.city, addr.state].filter(Boolean).join(", ");
          setLocationName(formatted);
        }
      }

      if (audit) {
        setCnpjAuditData(audit);
        setLegalRiskScore(audit.legalRiskScore);
        setAiEvaluationSummary(audit.aiEvaluationSummary);
        if (audit.companyName && !companyLegalName) {
          setCompanyLegalName(audit.companyName);
        }
      }

      toast.success("Dados cadastrais sincronizados e auditoria concluída!", { id: "cnpj-audit" });
    } catch (err: any) {
      toast.error(err?.message || "Falha ao consultar CNPJ.", { id: "cnpj-audit" });
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  // Captação de Investimento & Busca de Sócios
  const [targetInvestmentCents, setTargetInvestmentCents] = useState<number | undefined>(
    initialData?.attributes?.target_investment_cents ?? undefined
  );
  const [offeredEquityPercent, setOfferedEquityPercent] = useState<string>(
    initialData?.attributes?.offered_equity_percent ? String(initialData.attributes.offered_equity_percent) : ""
  );
  const [investmentModel, setInvestmentModel] = useState<string>(
    initialData?.attributes?.investment_model || CANONICAL_INVESTMENT_MODELS[0].id
  );
  const [projectStage, setProjectStage] = useState<string>(
    initialData?.attributes?.project_stage || CANONICAL_PROJECT_STAGES[1].id
  );
  const [useOfFunds, setUseOfFunds] = useState<string[]>(
    Array.isArray(initialData?.attributes?.use_of_funds) ? initialData.attributes.use_of_funds : []
  );
  const [pitchDeckUrl, setPitchDeckUrl] = useState<string>(
    initialData?.attributes?.pitch_deck_url || ""
  );

  // Documentos Restritos & DRE sob NDA (Fase 3)
  const [businessRestrictedDocuments, setBusinessRestrictedDocuments] = useState<
    Array<{ name: string; url: string; size_bytes?: number }>
  >(
    Array.isArray(initialData?.attributes?.restricted_documents)
      ? initialData.attributes.restricted_documents
      : []
  );
  const [isUploadingRestrictedDoc, setIsUploadingRestrictedDoc] = useState(false);

  // Telemetria e Inteligência Comercial SimLabs IA (Zero Mocks)
  const [isAnalyzingTelemetry, setIsAnalyzingTelemetry] = useState(false);
  const [telemetryResult, setTelemetryResult] = useState<{
    paybackMonthsEstimate: number;
    rentToRevenueRatio: number;
    viabilityScore: number;
    summary: string;
  } | null>(
    initialData?.attributes?.telemetry || null
  );

  const handleAnalyzeCommercialPoint = async () => {
    if (!businessMonthlyRentCents && !businessMonthlyRevenueCents) {
      toast.error("Preencha pelo menos o faturamento ou o aluguel mensal para calcular a telemetria.");
      return;
    }
    setIsAnalyzingTelemetry(true);
    try {
      const res = await analyzeCommercialPointPotential({
        data: {
          monthlyRentCents: businessMonthlyRentCents || 0,
          monthlyRevenueCents: businessMonthlyRevenueCents || 0,
          areaSqm: Number(businessAreaSqm) || 100,
          businessType: businessPointType || "ponto_comercial",
          segment: businessSegment || "geral",
          city: structuredLoc?.city || "Chapecó",
        },
      });
      setTelemetryResult({
        paybackMonthsEstimate: res.paybackEstimatedMonths,
        rentToRevenueRatio: res.occupancyCostRatio,
        viabilityScore: res.feasibilityScore,
        summary: res.recommendation,
      });
      toast.success("Telemetria e viabilidade calculadas com sucesso pelo SimLabs IA!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao calcular telemetria comercial.");
    } finally {
      setIsAnalyzingTelemetry(false);
    }
  };

  // Specialized: Produto Digital & Downloads
  const [digitalFileType, setDigitalFileType] = useState("ebook");
  const [digitalFileUrl, setDigitalFileUrl] = useState<string | null>(null);
  const [digitalFileName, setDigitalFileName] = useState<string | null>(null);
  const [digitalFileSize, setDigitalFileSize] = useState<number | null>(null);
  const [digitalDownloadLimit, setDigitalDownloadLimit] = useState("5");
  const [digitalPreviewUrl, setDigitalPreviewUrl] = useState("");

  // Privacidade de Localização
  const [hideLocation, setHideLocation] = useState<boolean>(
    initialData?.attributes?.hide_location ?? initialData?.hide_location ?? false
  );

  // Hydration effect for editing existing classified
  useEffect(() => {
    if (!initialData) return;
    if (initialData.title) setTitle(initialData.title);
    if (initialData.content || initialData.description) setDescription(initialData.content || initialData.description);
    if (initialData.price_cents !== undefined) setPriceCents(initialData.price_cents ?? undefined);
    if (initialData.negotiable !== undefined) setNegotiable(initialData.negotiable);
    if (initialData.location_name || initialData.location_text) setLocationName(initialData.location_name || initialData.location_text);
    if (initialData.delivery_mode) setDeliveryMode(initialData.delivery_mode as any);
    if (initialData.attributes?.delivery_mode) setDeliveryMode(initialData.attributes.delivery_mode as any);
    if (initialData.attributes?.hide_location !== undefined) setHideLocation(!!initialData.attributes.hide_location);
    if (initialData.contact_whatsapp || initialData.whatsapp) setWhatsapp(initialData.contact_whatsapp || initialData.whatsapp);
    if (Array.isArray(initialData.images)) setImages(initialData.images);

    if (initialData.attributes) {
      if (initialData.attributes.template_style) setTemplateStyle(initialData.attributes.template_style === "editorial" || initialData.attributes.template_style === "instagram" ? "editorial" : initialData.attributes.template_style === "conveniencia" ? "conveniencia" : "standard");
      if (initialData.attributes.volume) setConvenienceVolume(initialData.attributes.volume);
      if (initialData.attributes.temperature) setConvenienceTemp(initialData.attributes.temperature);
      if (initialData.attributes.is_alcoholic !== undefined) setIsAlcoholic(!!initialData.attributes.is_alcoholic);
      if (initialData.attributes.brand) setConvenienceBrand(initialData.attributes.brand);
      if (initialData.attributes.delivery_estimate) setDeliveryEstimateText(initialData.attributes.delivery_estimate);
      if (initialData.attributes.ready_delivery !== undefined) setReadyDelivery(!!initialData.attributes.ready_delivery);
      if (initialData.attributes.pricing_type) setPricingType(initialData.attributes.pricing_type);
      if (initialData.attributes.price_min_cents !== undefined) setPriceMinCents(initialData.attributes.price_min_cents);
      if (initialData.attributes.price_max_cents !== undefined) setPriceMaxCents(initialData.attributes.price_max_cents);
      if (initialData.attributes.price_disclaimer) setPriceDisclaimer(initialData.attributes.price_disclaimer);
      if (initialData.attributes.custom_disclaimer) setCustomDisclaimer(initialData.attributes.custom_disclaimer);
      if (initialData.attributes.pix_discount_percent !== undefined) setPixDiscountPercent(initialData.attributes.pix_discount_percent);
      if (initialData.attributes.trade_notes) setTradeNotes(initialData.attributes.trade_notes);
      if (initialData.attributes.accepts_financing !== undefined) setAcceptsFinancing(!!initialData.attributes.accepts_financing);
      if (initialData.attributes.financing_notes) setFinancingNotes(initialData.attributes.financing_notes);
      if (initialData.attributes.accepts_pix !== undefined) setAcceptsPix(!!initialData.attributes.accepts_pix);
      if (initialData.attributes.accepts_card !== undefined) setAcceptsCard(!!initialData.attributes.accepts_card);
      if (initialData.attributes.max_installments) setMaxInstallments(initialData.attributes.max_installments);
      if (initialData.attributes.card_interest_free !== undefined) setCardInterestFree(!!initialData.attributes.card_interest_free);
      if (initialData.attributes.accepts_boleto !== undefined) setAcceptsBoleto(!!initialData.attributes.accepts_boleto);
      if (initialData.attributes.boleto_due_days) setBoletoDueDays(initialData.attributes.boleto_due_days);
      if (initialData.attributes.accepts_boleto_installments !== undefined) setAcceptsBoletoInstallments(!!initialData.attributes.accepts_boleto_installments);
      if (initialData.attributes.max_boleto_installments) setMaxBoletoInstallments(initialData.attributes.max_boleto_installments);
      if (initialData.attributes.boleto_min_down_payment_cents !== undefined) setBoletoMinDownPaymentCents(initialData.attributes.boleto_min_down_payment_cents);
      if (initialData.attributes.boleto_notes) setBoletoNotes(initialData.attributes.boleto_notes);
      if (initialData.attributes.accepts_carne !== undefined) setAcceptsCarne(!!initialData.attributes.accepts_carne);
      if (initialData.attributes.max_carne_installments) setMaxCarneInstallments(initialData.attributes.max_carne_installments);
      if (initialData.attributes.carne_grace_days) setCarneGraceDays(initialData.attributes.carne_grace_days);
      if (initialData.attributes.carne_min_down_payment_cents !== undefined) setCarneMinDownPaymentCents(initialData.attributes.carne_min_down_payment_cents);
      if (initialData.attributes.carne_notes) setCarneNotes(initialData.attributes.carne_notes);
      if (initialData.attributes.accepts_cash !== undefined) setAcceptsCash(!!initialData.attributes.accepts_cash);
      if (initialData.attributes.accepts_trade !== undefined) setAcceptsTrade(!!initialData.attributes.accepts_trade);
      if (initialData.attributes.cancellation_policy) setCancellationPolicy(initialData.attributes.cancellation_policy);
      if (initialData.attributes.city && initialData.attributes.state) {
        setStructuredLoc({
          city: initialData.attributes.city,
          state: initialData.attributes.state,
          neighborhood: initialData.attributes.neighborhood,
          formatted: [initialData.attributes.neighborhood, initialData.attributes.city, initialData.attributes.state].filter(Boolean).join(", "),
        });
      }

      // Viagem
      if (Array.isArray(initialData.attributes.story_highlights)) setTravelStoryHighlights(initialData.attributes.story_highlights);
      if (Array.isArray(initialData.attributes.itinerary_days)) setTravelItineraryDays(initialData.attributes.itinerary_days);
      if (initialData.attributes.destination_city) setTravelDestinationCity(initialData.attributes.destination_city);
      if (initialData.attributes.departure_date) setTravelDepartureDate(initialData.attributes.departure_date);
      if (initialData.attributes.return_date) setTravelReturnDate(initialData.attributes.return_date);
      if (Array.isArray(initialData.attributes.bio_bullets) && initialData.attributes.bio_bullets.length > 0) {
        setTravelBioBullets(initialData.attributes.bio_bullets);
      }
      if (Array.isArray(initialData.attributes.departure_options)) {
        setTravelDepartureOptions(initialData.attributes.departure_options);
      }
      if (initialData.attributes.flight_details) {
        if (initialData.attributes.flight_details.departure_iata) setTravelDepartureIATA(initialData.attributes.flight_details.departure_iata);
        if (initialData.attributes.flight_details.arrival_iata) setTravelArrivalIATA(initialData.attributes.flight_details.arrival_iata);
        if (initialData.attributes.flight_details.airline) setTravelAirline(initialData.attributes.flight_details.airline);
        if (initialData.attributes.flight_details.transport_type) setTravelTransportType(initialData.attributes.flight_details.transport_type);
        if (initialData.attributes.flight_details.connections !== undefined) setTravelConnections(initialData.attributes.flight_details.connections);
        if (initialData.attributes.flight_details.departure_time) setTravelDepartureTime(initialData.attributes.flight_details.departure_time);
        if (initialData.attributes.flight_details.arrival_time) setTravelArrivalTime(initialData.attributes.flight_details.arrival_time);
        if (initialData.attributes.flight_details.price_text) setTravelFlightPrice(initialData.attributes.flight_details.price_text);
        if (initialData.attributes.flight_details.duration_text) setTravelFlightDuration(initialData.attributes.flight_details.duration_text);
        if (Array.isArray(initialData.attributes.flight_details.boarding_gateways)) {
          setTravelBoardingGateways(initialData.attributes.flight_details.boarding_gateways);
        }
      }

      // Equipamento
      if (initialData.attributes.equipment_period) setEquipmentPeriod(initialData.attributes.equipment_period);
      if (initialData.attributes.deposit_cents !== undefined) setEquipmentDepositCents(initialData.attributes.deposit_cents);

      // Digital
      if (initialData.attributes.digital_file_type) setDigitalFileType(initialData.attributes.digital_file_type);
      if (initialData.attributes.digital_file_name) setDigitalFileName(initialData.attributes.digital_file_name);
      if (initialData.attributes.digital_file_size_bytes !== undefined) setDigitalFileSize(initialData.attributes.digital_file_size_bytes);
      if (initialData.attributes.digital_file_url || initialData.digital_file_url) setDigitalFileUrl(initialData.attributes.digital_file_url || initialData.digital_file_url);
      if (initialData.attributes.download_limit !== undefined) setDigitalDownloadLimit(String(initialData.attributes.download_limit));
      if (initialData.attributes.digital_preview_url) setDigitalPreviewUrl(initialData.attributes.digital_preview_url);

      // Serviço
      if (initialData.attributes.modality) setServiceModality(initialData.attributes.modality);
      if (initialData.attributes.service_area) setServiceArea(initialData.attributes.service_area);
      if (initialData.attributes.service_duration_minutes || initialData.attributes.estimated_duration) {
        setServiceDuration(String(initialData.attributes.service_duration_minutes || initialData.attributes.estimated_duration));
      }
      if (initialData.attributes.pricing_type) setServicePricingType(initialData.attributes.pricing_type);
      if (initialData.attributes.booking_enabled !== undefined) setServiceBookingEnabled(!!initialData.attributes.booking_enabled);
      if (Array.isArray(initialData.attributes.available_weekdays)) setServiceAvailableDays(initialData.attributes.available_weekdays);
      if (initialData.attributes.working_hours_start) setServiceHoursStart(initialData.attributes.working_hours_start);
      if (initialData.attributes.working_hours_end) setServiceHoursEnd(initialData.attributes.working_hours_end);
      if (initialData.attributes.available_slots !== undefined) setServiceDailySlots(String(initialData.attributes.available_slots));

      // Vaga
      if (initialData.attributes.role) setJobRole(initialData.attributes.role);
      if (initialData.attributes.work_model) setJobModel(initialData.attributes.work_model);
      if (initialData.attributes.regime) setJobRegime(initialData.attributes.regime);
      if (initialData.attributes.work_schedule) setJobWorkSchedule(initialData.attributes.work_schedule);
      if (initialData.attributes.salary_range) setJobSalaryRange(initialData.attributes.salary_range);
      if (initialData.attributes.min_education) setJobMinEducation(initialData.attributes.min_education);
      if (initialData.attributes.experience_level) setJobExperienceLevel(initialData.attributes.experience_level);
      if (Array.isArray(initialData.attributes.application_methods)) setJobAcceptedMethods(initialData.attributes.application_methods);
      if (Array.isArray(initialData.attributes.benefits)) setJobBenefits(initialData.attributes.benefits);
      if (Array.isArray(initialData.attributes.skills)) setJobSkills(initialData.attributes.skills);

      // Desapego & Bens Físicos
      if (initialData.attributes.warranty) setItemWarranty(initialData.attributes.warranty);
      if (initialData.attributes.brand) {
        setPhoneBrand(initialData.attributes.brand);
        setComputerBrand(initialData.attributes.brand);
        setApplianceBrand(initialData.attributes.brand);
        setFashionBrand(initialData.attributes.brand);
      }
      if (initialData.attributes.model) setPhoneModel(initialData.attributes.model);
      if (initialData.attributes.storage) {
        setPhoneStorage(initialData.attributes.storage);
        setComputerStorage(initialData.attributes.storage);
      }
      if (initialData.attributes.battery_health !== undefined) setPhoneBatteryHealth(String(initialData.attributes.battery_health));
      if (Array.isArray(initialData.attributes.accessories)) setPhoneAccessories(initialData.attributes.accessories);
      if (initialData.attributes.computer_type) setComputerType(initialData.attributes.computer_type);
      if (initialData.attributes.processor) setComputerProcessor(initialData.attributes.processor);
      if (initialData.attributes.ram) setComputerRam(initialData.attributes.ram);
      if (initialData.attributes.appliance_type) setApplianceType(initialData.attributes.appliance_type);
      if (initialData.attributes.voltage) setApplianceVoltage(initialData.attributes.voltage);
      if (initialData.attributes.console) setGameConsole(initialData.attributes.console);
      if (initialData.attributes.room) setFurnitureRoom(initialData.attributes.room);
      if (initialData.attributes.material) setFurnitureMaterial(initialData.attributes.material);
      if (initialData.attributes.fashion_category) setFashionCategory(initialData.attributes.fashion_category);
      if (initialData.attributes.gender) setFashionGender(initialData.attributes.gender);
      if (initialData.attributes.size) setFashionSize(initialData.attributes.size);
      if (Array.isArray(initialData.attributes.provenance)) setVehicleProvenance(initialData.attributes.provenance);

      // Gastronomia
      if (initialData.attributes.food_subniche) setFoodSubNiche(initialData.attributes.food_subniche);
      if (initialData.attributes.food_prep_time_minutes) setFoodPrepTime(initialData.attributes.food_prep_time_minutes);
      if (Array.isArray(initialData.attributes.food_delivery_modes)) setFoodDeliveryModes(initialData.attributes.food_delivery_modes);

      // Mercado, Perecíveis & Conveniência
      if (initialData.attributes.grocery_department) setGroceryDepartment(initialData.attributes.grocery_department);
      if (initialData.attributes.sub_category) setGrocerySubCategory(initialData.attributes.sub_category);
      if (initialData.attributes.unit_type) setGroceryUnitType(initialData.attributes.unit_type);
      if (initialData.attributes.estimated_weight_per_unit) setGroceryEstimatedWeightPerUnit(initialData.attributes.estimated_weight_per_unit);
      if (initialData.attributes.temperature || initialData.attributes.storage_temp) setGroceryTemperature(initialData.attributes.temperature || initialData.attributes.storage_temp);
      if (initialData.attributes.brand || initialData.attributes.manufacturer) setGroceryBrand(initialData.attributes.brand || initialData.attributes.manufacturer);
      if (initialData.attributes.barcode_ean || initialData.attributes.ean) setGroceryBarcodeEan(initialData.attributes.barcode_ean || initialData.attributes.ean);
      if (initialData.attributes.ingredients) setGroceryIngredients(initialData.attributes.ingredients);
      if (initialData.attributes.is_alcoholic !== undefined) setGroceryIsAlcoholic(!!initialData.attributes.is_alcoholic);
      if (initialData.attributes.contains_gluten !== undefined) setGroceryContainsGluten(initialData.attributes.contains_gluten);
      if (initialData.attributes.contains_lactose !== undefined) setGroceryContainsLactose(initialData.attributes.contains_lactose);
      if (initialData.attributes.is_organic !== undefined) setGroceryIsOrganic(!!initialData.attributes.is_organic);
      if (Array.isArray(initialData.attributes.prep_options)) setGroceryPrepOptions(initialData.attributes.prep_options);
      if (initialData.attributes.delivery_estimate) setGroceryDeliveryEstimate(initialData.attributes.delivery_estimate);
      if (initialData.attributes.delivery_fee_cents !== undefined) setGroceryDeliveryFeeCents(Number(initialData.attributes.delivery_fee_cents));

      // Serviços Especializados
      if (initialData.attributes.service_subniche) setServiceSubNiche(initialData.attributes.service_subniche);
      if (initialData.attributes.professional_council) setServiceProfessionalCouncil(initialData.attributes.professional_council);
      if (initialData.attributes.specialty) setServiceSpecialty(initialData.attributes.specialty);

      // Negócios
      if (initialData.attributes.business_type) setBusinessType(initialData.attributes.business_type);
      if (initialData.attributes.business_segment) setBusinessSegment(initialData.attributes.business_segment);
      if (initialData.attributes.monthly_revenue_cents !== undefined) setBusinessMonthlyRevenueCents(initialData.attributes.monthly_revenue_cents);
      if (initialData.attributes.net_profit_cents !== undefined) setBusinessNetProfitCents(initialData.attributes.net_profit_cents);
      if (initialData.attributes.valuation_cents !== undefined) setBusinessValuationCents(initialData.attributes.valuation_cents);
      if (initialData.attributes.working_capital_cents !== undefined) setBusinessWorkingCapitalCents(initialData.attributes.working_capital_cents);
      if (initialData.attributes.foundation_year) setBusinessFoundationYear(String(initialData.attributes.foundation_year));
      if (initialData.attributes.employees_range) setBusinessEmployeesRange(initialData.attributes.employees_range);
      if (initialData.attributes.sale_reason) setBusinessSaleReason(initialData.attributes.sale_reason);
      if (initialData.attributes.commercial_point_type) setBusinessPointType(initialData.attributes.commercial_point_type);
      if (initialData.attributes.area_sqm !== undefined) setBusinessAreaSqm(String(initialData.attributes.area_sqm));
      if (initialData.attributes.monthly_rent_cents !== undefined) setBusinessMonthlyRentCents(initialData.attributes.monthly_rent_cents);
      if (initialData.attributes.monthly_iptu_cents !== undefined) setBusinessMonthlyIptuCents(initialData.attributes.monthly_iptu_cents);
      if (initialData.attributes.monthly_condo_cents !== undefined) setBusinessMonthlyCondoCents(initialData.attributes.monthly_condo_cents);
      if (initialData.attributes.contract_remaining_years) setBusinessContractRemainingYears(initialData.attributes.contract_remaining_years);
      if (initialData.attributes.requires_nda !== undefined) setBusinessRequiresNda(!!initialData.attributes.requires_nda);
      if (initialData.attributes.advisor_supported !== undefined) setBusinessAdvisorSupported(!!initialData.attributes.advisor_supported);
      if (initialData.attributes.target_investment_cents !== undefined) setTargetInvestmentCents(initialData.attributes.target_investment_cents);
      if (initialData.attributes.offered_equity_percent) setOfferedEquityPercent(String(initialData.attributes.offered_equity_percent));
      if (initialData.attributes.investment_model) setInvestmentModel(initialData.attributes.investment_model);
      if (initialData.attributes.project_stage) setProjectStage(initialData.attributes.project_stage);
      if (Array.isArray(initialData.attributes.use_of_funds)) setUseOfFunds(initialData.attributes.use_of_funds);
      if (initialData.attributes.pitch_deck_url) setPitchDeckUrl(initialData.attributes.pitch_deck_url);
      if (Array.isArray(initialData.attributes.restricted_documents)) {
        setBusinessRestrictedDocuments(initialData.attributes.restricted_documents);
      }

      // Logística
      if (initialData.attributes.delivery_mode) setDeliveryMode(initialData.attributes.delivery_mode);
      if (initialData.attributes.free_shipping_local !== undefined) setFreeShippingLocal(!!initialData.attributes.free_shipping_local);
    } else if (initialData.accepts_card !== undefined) {
      setAcceptsCard(!!initialData.accepts_card);
    }

    if (initialData.pricing_model === "recurring" || niche.id === "assinatura") {
      setPricingModel("recurring");
      if (initialData.billing_cycle) setBillingCycle(initialData.billing_cycle);
      if (initialData.setup_fee_cents) setSetupFeeCents(initialData.setup_fee_cents);
      if (initialData.trial_days) setTrialDays(initialData.trial_days);
      if (Array.isArray(initialData.recurring_features)) setRecurringFeatures(initialData.recurring_features);
    }

    if (initialData.category === "real_estate") {
      if (initialData.property_type) {
        setHospPropertyType(initialData.property_type);
        setRePropertyType(initialData.property_type);
      }
      if (initialData.max_guests) setHospGuests(String(initialData.max_guests));
      if (initialData.bedrooms) {
        setHospBedrooms(String(initialData.bedrooms));
        setReBedrooms(String(initialData.bedrooms));
      }
      if (initialData.bathrooms) {
        setHospBathrooms(String(initialData.bathrooms));
        setReBathrooms(String(initialData.bathrooms));
      }
      if (initialData.cleaning_fee_cents) setHospCleaningFeeCents(initialData.cleaning_fee_cents);
      if (initialData.attributes?.checkin_type) setHospCheckinType(initialData.attributes.checkin_type);
      if (initialData.attributes?.checkin_time) setHospCheckinTime(initialData.attributes.checkin_time);
      if (initialData.attributes?.checkout_time) setHospCheckoutTime(initialData.attributes.checkout_time);
      if (Array.isArray(initialData.amenities)) {
        setHospAmenities(initialData.amenities);
        setReAmenities(initialData.amenities);
      }
      if (Array.isArray(initialData.attributes?.rules)) setHospRules(initialData.attributes.rules);
      if (initialData.deal_type) setReDealType(initialData.deal_type);
      if (initialData.area_sqm) setReAreaSqm(String(initialData.area_sqm));
      if (initialData.suites) setReSuites(String(initialData.suites));
      if (initialData.parking_spots) setReParking(String(initialData.parking_spots));
      if (initialData.attributes?.condo_cents) setReCondoCents(initialData.attributes.condo_cents);
      if (initialData.attributes?.iptu_cents) setReIptuCents(initialData.attributes.iptu_cents);
      if (initialData.attributes?.furnished) setReFurnished(initialData.attributes.furnished);
    }

    if (initialData.category === "vehicle" && initialData.attributes) {
      if (initialData.attributes.brand) setVehicleBrand(initialData.attributes.brand);
      if (initialData.attributes.model) setVehicleModel(initialData.attributes.model);
      if (initialData.attributes.version) setVehicleVersion(initialData.attributes.version);
      if (initialData.attributes.year_fab) setVehicleYearFab(String(initialData.attributes.year_fab));
      if (initialData.attributes.year_model) setVehicleYearModel(String(initialData.attributes.year_model));
      if (initialData.attributes.mileage_km) setVehicleKm(String(initialData.attributes.mileage_km));
      if (initialData.attributes.fuel_type) setVehicleFuel(initialData.attributes.fuel_type);
      if (initialData.attributes.transmission) setVehicleTransmission(initialData.attributes.transmission);
      if (initialData.attributes.color) setVehicleColor(initialData.attributes.color);
      if (Array.isArray(initialData.attributes.features)) setVehicleFeatures(initialData.attributes.features);
    }

    if (initialData.sub_category || initialData.attributes?.desapego_subcategory) {
      setDesapegoCategory((initialData.sub_category || initialData.attributes?.desapego_subcategory) as any);
    } else if (initialSubcategory) {
      setDesapegoCategory(initialSubcategory as any);
    }
    if (initialData.condition) setItemCondition(initialData.condition);
  }, [initialData, initialSubcategory]);

  const toggleItem = (list: string[], setList: (l: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((i) => i !== item) : [...list, item]);
  };

  const handlePublish = async () => {
    if (!title.trim() || title.length < 3) {
      toast.error("O título do anúncio deve ter pelo menos 3 caracteres.");
      return;
    }
    if (!description.trim() || description.length < 10) {
      toast.error("A descrição do anúncio deve ter pelo menos 10 caracteres.");
      return;
    }
    if (isUploadingMedia) {
      toast.error("Aguarde o término do envio das fotos antes de publicar.");
      return;
    }
    if (niche.id === "digital" && !digitalFileUrl) {
      toast.error("Por favor, faça o upload do arquivo digital para download antes de publicar.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Monta os atributos dinâmicos específicos da categoria
      const attributes: Record<string, any> = {
        niche: niche.id,
        hide_location: hideLocation,
        hide_address: hideLocation,
        hide_exact_address: hideLocation,
        location_privacy: hideLocation ? "hidden" : "full",
        city: structuredLoc?.city || undefined,
        state: structuredLoc?.state || undefined,
        neighborhood: structuredLoc?.neighborhood || undefined,
        delivery_mode: niche.id === "desapego" ? deliveryMode : niche.id === "digital" ? "digital_download" : undefined,
        pricing_type: pricingType,
        price_min_cents: pricingType === "price_range" || pricingType === "starting_at" ? priceMinCents : undefined,
        price_max_cents: pricingType === "price_range" ? priceMaxCents : undefined,
        price_disclaimer: priceDisclaimer,
        custom_disclaimer: priceDisclaimer === "custom" ? customDisclaimer : undefined,
        accepts_pix: acceptsPix,
        pix_discount_percent: acceptsPix ? Number(pixDiscountPercent) || 0 : undefined,
        accepts_card: acceptsCard,
        card_interest_free: acceptsCard ? cardInterestFree : true,
        accepts_boleto: acceptsBoleto,
        boleto_due_days: acceptsBoleto ? boletoDueDays : undefined,
        accepts_boleto_installments: acceptsBoletoInstallments,
        max_boleto_installments: acceptsBoletoInstallments ? Number(maxBoletoInstallments) || 12 : undefined,
        boleto_min_down_payment_cents: acceptsBoletoInstallments ? boletoMinDownPaymentCents : undefined,
        boleto_notes: acceptsBoletoInstallments ? boletoNotes.trim() : undefined,
        accepts_carne: acceptsCarne,
        max_carne_installments: acceptsCarne ? Number(maxCarneInstallments) || 12 : undefined,
        carne_grace_days: acceptsCarne ? carneGraceDays : undefined,
        carne_min_down_payment_cents: acceptsCarne ? carneMinDownPaymentCents : undefined,
        carne_notes: acceptsCarne ? carneNotes.trim() : undefined,
        accepts_cash: niche.id === "digital" ? false : acceptsCash,
        accepts_trade: niche.id === "digital" ? false : acceptsTrade,
        trade_notes: acceptsTrade ? tradeNotes.trim() : undefined,
        accepts_financing: acceptsFinancing,
        financing_notes: acceptsFinancing ? financingNotes.trim() : undefined,
        payment_rules: {
          accepts_pix: acceptsPix,
          pix_discount_percent: acceptsPix ? Number(pixDiscountPercent) || 0 : 0,
          accepts_card: acceptsCard,
          max_installments: acceptsCard ? Number(maxInstallments) || 12 : 1,
          card_interest_free: cardInterestFree,
          accepts_boleto: acceptsBoleto,
          boleto_due_days: boletoDueDays,
          accepts_boleto_installments: acceptsBoletoInstallments,
          max_boleto_installments: maxBoletoInstallments,
          boleto_min_down_payment_cents: boletoMinDownPaymentCents,
          boleto_notes: boletoNotes,
          accepts_carne: acceptsCarne,
          max_carne_installments: maxCarneInstallments,
          carne_grace_days: carneGraceDays,
          carne_min_down_payment_cents: carneMinDownPaymentCents,
          carne_notes: carneNotes,
          accepts_cash: acceptsCash,
          accepts_trade: acceptsTrade,
          trade_notes: tradeNotes,
          accepts_financing: acceptsFinancing,
          financing_notes: financingNotes,
        },
        accepted_payment_methods: [
          ...(acceptsPix ? ["pix"] : []),
          ...(acceptsCard ? ["cartao_credito"] : []),
          ...(acceptsBoleto ? ["boleto"] : []),
          ...(acceptsBoletoInstallments ? ["boleto_parcelado"] : []),
          ...(acceptsCarne ? ["carne_digital"] : []),
          ...(acceptsCash ? ["dinheiro"] : []),
          ...(acceptsTrade ? ["permuta"] : []),
          ...(acceptsFinancing ? ["financiamento"] : []),
        ],
        installments_available: acceptsCard || acceptsBoletoInstallments || acceptsCarne,
        cancellation_policy: cancellationPolicy,
        max_installments: acceptsCard ? Number(maxInstallments) || 12 : (acceptsCarne ? maxCarneInstallments : (acceptsBoletoInstallments ? maxBoletoInstallments : 1)),
        free_shipping_local: niche.id === "desapego" ? freeShippingLocal : false,
        template_style: templateStyle,
        story_highlights: travelStoryHighlights,
        itinerary_days: travelItineraryDays,
        bio_bullets: travelBioBullets.map((b) => b.trim()).filter(Boolean),
      };

      if (niche.id === "viagem") {
        attributes.duration_text = travelDuration;
        attributes.meal_plan = travelMealPlan;
        attributes.guests_text = travelGuests;
        attributes.dates_text = travelDates;
        attributes.destination_city = travelDestinationCity;
        attributes.departure_date = travelDepartureDate;
        attributes.return_date = travelReturnDate;
        attributes.max_installments = travelMaxInstallments;
        attributes.bio_bullets = travelBioBullets.map((b) => b.trim()).filter(Boolean);
        attributes.departure_options = travelDepartureOptions;
        attributes.flight_details = {
          transport_type: travelTransportType,
          // Aéreo
          departure_iata: travelDepartureIATA,
          arrival_iata: travelArrivalIATA,
          airline: travelAirline,
          connections: travelConnections,
          departure_time: travelDepartureTime,
          arrival_time: travelArrivalTime,
          price_text: travelFlightPrice,
          duration_text: travelFlightDuration,
          // Terrestre / Excursão
          bus_category: travelBusCategory,
          bus_company: travelBusCompany,
          departure_city: travelDepartureCity,
          meeting_point: travelMeetingPoint,
          boarding_gateways: travelBoardingGateways,
          return_departure_time: travelReturnDepartureTime,
          guide_service: travelGuideService,
          // Combo
          combo_flight_from_iata: travelComboFromIATA,
          combo_flight_to_iata: travelComboToIATA,
          combo_airline: travelComboAirline,
          combo_flight_price_text: travelComboFlightPrice,
          transfer_vehicle: travelTransferVehicle,
          transfer_from: travelTransferFrom,
          transfer_to: travelTransferTo,
          transfer_duration: travelTransferDuration,
          transfer_departure_time: travelTransferTime,
          combo_notes: travelComboNotes,
          // Cruzeiro
          ship_name: travelShipName,
          cruise_line: travelCruiseLine,
          cabin_category: travelCabinCategory,
          embarkation_port: travelEmbarkationPort,
        };
      } else if (niche.id === "equipamento") {
        attributes.equipment_period = equipmentPeriod;
        attributes.deposit_cents = equipmentDepositCents || 0;
      } else if (niche.id === "doacao") {
        attributes.is_donation = true;
      }

      if (niche.id === "hospedagem") {
        attributes.deal_type = "temporada";
        attributes.rental_period = "diaria";
        attributes.property_type = hospPropertyType;
        attributes.bedrooms = parseInt(hospBedrooms) || 1;
        attributes.bathrooms = parseInt(hospBathrooms) || 1;
        attributes.max_guests = parseInt(hospGuests) || 1;
        attributes.cleaning_fee_cents = hospCleaningFeeCents ?? null;
        attributes.amenities = hospAmenities;
        attributes.checkin_type = hospCheckinType;
        attributes.checkin_time = hospCheckinTime;
        attributes.checkout_time = hospCheckoutTime;
        attributes.house_rules = hospRules;
      } else if (niche.id === "imovel") {
        attributes.deal_type = reDealType;
        attributes.property_type = rePropertyType;
        attributes.area_sqm = reAreaSqm;
        attributes.bedrooms = reBedrooms;
        attributes.suites = reSuites;
        attributes.bathrooms = reBathrooms;
        attributes.parking_spots = reParking;
        attributes.condo_cents = reCondoCents ?? null;
        attributes.iptu_cents = reIptuCents ?? null;
        attributes.furnished = reFurnished;
        attributes.amenities = reAmenities;
      } else if (niche.id === "veiculo") {
        attributes.brand = vehicleBrand;
        attributes.model = vehicleModel;
        attributes.version = vehicleVersion;
        attributes.year_fab = vehicleYearFab;
        attributes.year_model = vehicleYearModel;
        attributes.mileage_km = vehicleKm;
        attributes.fuel_type = vehicleFuel;
        attributes.transmission = vehicleTransmission;
        attributes.color = vehicleColor;
        attributes.features = vehicleFeatures;
        attributes.provenance = vehicleProvenance;
      } else if (niche.id === "servico") {
        attributes.modality = serviceModality;
        attributes.service_area = serviceArea;
        attributes.estimated_duration = serviceDuration;
        attributes.pricing_type = servicePricingType;
        attributes.booking_enabled = serviceBookingEnabled;
        attributes.available_weekdays = serviceAvailableDays;
        attributes.working_hours_start = serviceHoursStart;
        attributes.working_hours_end = serviceHoursEnd;
        attributes.service_duration_minutes = parseInt(serviceDuration) || 60;
        attributes.available_slots = parseInt(serviceDailySlots) || 8;
        attributes.service_subniche = serviceSubNiche;
        attributes.professional_council = serviceProfessionalCouncil;
        attributes.specialty = serviceSpecialty;
      } else if (niche.id === "digital") {
        attributes.niche = "digital";
        attributes.is_digital = true;
        attributes.digital_file_type = digitalFileType;
        attributes.digital_file_name = digitalFileName;
        attributes.digital_file_size_bytes = digitalFileSize;
        attributes.download_limit = parseInt(digitalDownloadLimit) || 5;
        attributes.digital_preview_url = digitalPreviewUrl.trim() || undefined;
      } else if (niche.id === "desapego") {
        attributes.niche = "desapego";
        attributes.desapego_subcategory = desapegoCategory;
        attributes.condition = itemCondition;
        attributes.warranty = itemWarranty;
        if (desapegoCategory === "smartphones") {
          attributes.brand = phoneBrand;
          attributes.model = phoneModel;
          attributes.storage = phoneStorage;
          attributes.battery_health = phoneBatteryHealth ? parseInt(phoneBatteryHealth) : undefined;
          attributes.accessories = phoneAccessories;
        } else if (desapegoCategory === "computadores") {
          attributes.computer_type = computerType;
          attributes.brand = computerBrand;
          attributes.processor = computerProcessor;
          attributes.ram = computerRam;
          attributes.storage = computerStorage;
        } else if (desapegoCategory === "eletrodomesticos") {
          attributes.appliance_type = applianceType;
          attributes.brand = applianceBrand;
          attributes.voltage = applianceVoltage;
        } else if ((desapegoCategory as string) === "games" || (desapegoCategory as string) === "games_consoles") {
          attributes.console = gameConsole;
        } else if (desapegoCategory === "moveis") {
          attributes.room = furnitureRoom;
          attributes.material = furnitureMaterial;
        } else if (desapegoCategory === "moda_brecho") {
          attributes.fashion_category = fashionCategory;
          attributes.gender = fashionGender;
          attributes.size = fashionSize;
          attributes.brand = fashionBrand;
        }
      } else if (niche.id === "vaga") {
        attributes.niche = "vaga";
        attributes.role = jobRole || title;
        attributes.work_model = jobModel;
        attributes.regime = jobRegime;
        attributes.work_schedule = jobWorkSchedule;
        attributes.salary_range = jobSalaryRange;
        attributes.min_education = jobMinEducation;
        attributes.experience_level = jobExperienceLevel;
        attributes.application_methods = jobAcceptedMethods;
        attributes.benefits = jobBenefits;
        attributes.skills = jobSkills;
      } else if (niche.id === "gastronomia") {
        attributes.niche = "gastronomia";
        attributes.food_subniche = foodSubNiche;
        attributes.food_prep_time_minutes = foodPrepTime;
        attributes.food_delivery_modes = foodDeliveryModes;
      } else if (niche.id === "mercado") {
        attributes.niche = "mercado";
        attributes.template_style = "conveniencia";
        attributes.grocery_department = groceryDepartment;
        attributes.sub_category = grocerySubCategory;
        attributes.unit_type = groceryUnitType;
        attributes.estimated_weight_per_unit = groceryEstimatedWeightPerUnit;
        attributes.temperature = groceryTemperature;
        attributes.storage_temp = groceryTemperature;
        attributes.brand = groceryBrand;
        attributes.manufacturer = groceryBrand;
        attributes.barcode_ean = groceryBarcodeEan;
        attributes.ingredients = groceryIngredients;
        attributes.is_alcoholic = groceryIsAlcoholic;
        attributes.contains_gluten = groceryContainsGluten ?? undefined;
        attributes.contains_lactose = groceryContainsLactose ?? undefined;
        attributes.is_organic = groceryIsOrganic;
        attributes.prep_options = groceryPrepOptions;
        attributes.delivery_estimate = groceryDeliveryEstimate;
        attributes.delivery_fee_cents = groceryDeliveryFeeCents;
        attributes.grocery_fresh_pricing = grocerySupportsFreshPricing ? {
          supports_fresh_pricing: true,
          default_pricing_mode: groceryDefaultPricingMode,
          avg_piece_weight_grams: groceryAvgPieceWeightGrams,
          price_per_kg_cents: groceryPricePerKgCents || ((priceCents || 0) > 0 ? (priceCents || 0) * 2 : 990),
          price_per_unit_cents: priceCents || 0,
        } : undefined;
        attributes.grocery_ripeness_config = groceryRipenessEnabled ? {
          enabled: true,
          stages: groceryRipenessStages,
          default_stage: "maduro",
        } : undefined;
        attributes.progressive_discount_tiers = groceryProgressiveDiscountsEnabled && groceryDiscountTiers.length > 0 ? groceryDiscountTiers : undefined;
        attributes.order_bump_offer = groceryOrderBumpEnabled && groceryOrderBumpTitle.trim() ? {
          enabled: true,
          mode: "manual",
          target_title: groceryOrderBumpTitle.trim(),
          special_price_cents: groceryOrderBumpSpecialPriceCents,
          original_price_cents: groceryOrderBumpOriginalPriceCents,
          badge_text: groceryOrderBumpBadge || "Oferta Relâmpago",
        } : undefined;
      } else if (niche.id === "negocio") {
        attributes.niche = "business";
        attributes.is_business_sale = true;
        attributes.business_type = businessType;
        attributes.business_segment = businessSegment;
        attributes.monthly_revenue_cents = businessMonthlyRevenueCents;
        attributes.net_profit_cents = businessNetProfitCents;
        attributes.valuation_cents = businessValuationCents || priceCents;
        attributes.working_capital_cents = businessWorkingCapitalCents;
        attributes.foundation_year = businessFoundationYear;
        attributes.employees_range = businessEmployeesRange;
        attributes.sale_reason = businessSaleReason;
        attributes.commercial_point_type = businessPointType;
        attributes.area_sqm = businessAreaSqm ? parseInt(businessAreaSqm) : undefined;
        attributes.monthly_rent_cents = businessMonthlyRentCents;
        attributes.monthly_iptu_cents = businessMonthlyIptuCents;
        attributes.monthly_condo_cents = businessMonthlyCondoCents;
        attributes.contract_remaining_years = businessContractRemainingYears;
        attributes.requires_nda = businessRequiresNda;
        attributes.advisor_supported = businessAdvisorSupported;
        attributes.restricted_documents = businessRestrictedDocuments;
        attributes.company_cnpj = companyCnpj ? companyCnpj.replace(/\D/g, "") : undefined;
        attributes.company_legal_name = companyLegalName || undefined;
        attributes.cnae_principal = cnaePrincipal || undefined;
        attributes.cnae_description = cnaeDescription || undefined;
        attributes.tax_regime = taxRegime || undefined;
        attributes.capital_social_cents = capitalSocialCents || undefined;
        attributes.legal_risk_score = legalRiskScore || undefined;
        attributes.ai_evaluation_summary = aiEvaluationSummary || undefined;
        if (telemetryResult) {
          attributes.telemetry = telemetryResult;
        }
      }

      let resolvedCategory = niche.canonicalCategory;
      if (niche.id === "viagem") resolvedCategory = "travel";
      if (niche.id === "equipamento") resolvedCategory = "equipment";
      if (niche.id === "doacao") resolvedCategory = "donation";
      if (niche.id === "negocio") resolvedCategory = "business";
      if (niche.id === "gastronomia") resolvedCategory = "food";

      const res = await upsertClassified({
        data: {
          id: editId || undefined,
          category: resolvedCategory as any,
          title: title.trim(),
          pricing_model: niche.id === "assinatura" ? "recurring" : pricingModel,
          billing_cycle: niche.id === "assinatura" ? billingCycle : undefined,
          setup_fee_cents: setupFeeCents ?? undefined,
          trial_days: trialDays ?? undefined,
          recurring_features: recurringFeatures.length > 0 ? recurringFeatures : undefined,
          accepts_card: acceptsCard,
          max_installments: acceptsCard ? parseInt(String(maxInstallments)) || 1 : undefined,
          accepts_trade: acceptsTrade,
          accepted_payment_methods: [
            ...(acceptsPix ? ["pix"] : []),
            ...(acceptsCard ? ["cartao_credito"] : []),
            ...(acceptsBoleto ? ["boleto"] : []),
            ...(acceptsBoletoInstallments ? ["boleto_parcelado"] : []),
            ...(acceptsCarne ? ["carne_digital"] : []),
            ...(acceptsCash ? ["dinheiro"] : []),
            ...(acceptsTrade ? ["permuta"] : []),
            ...(acceptsFinancing ? ["financiamento"] : []),
          ],
          installments_available: acceptsCard || acceptsBoletoInstallments || acceptsCarne,
          cancellation_policy: cancellationPolicy,
          store_id: selectedStoreId || undefined,
          sub_category: niche.id === "desapego" ? desapegoCategory : undefined,
          content: description.trim(),
          ai_instructions: aiInstructions.trim() || undefined,
          ai_agent_enabled: aiAgentEnabled,
          max_discount_pct: maxDiscountPct,
          price_cents:
            pricingType === "free" || niche.id === "doacao"
              ? 0
              : pricingType === "on_quote" || pricingType === "exchange_only"
              ? null
              : pricingType === "starting_at" || pricingType === "price_range"
              ? (priceMinCents || priceCents || null)
              : (priceCents ?? null),
          deal_type:
            niche.id === "hospedagem"
              ? "temporada"
              : niche.id === "imovel"
              ? reDealType
              : undefined,
          property_type:
            niche.id === "hospedagem"
              ? hospPropertyType
              : niche.id === "imovel"
              ? rePropertyType
              : undefined,
          bedrooms:
            niche.id === "hospedagem"
              ? parseInt(hospBedrooms) || 1
              : niche.id === "imovel"
              ? parseInt(reBedrooms) || undefined
              : undefined,
          bathrooms:
            niche.id === "hospedagem"
              ? parseInt(hospBathrooms) || 1
              : niche.id === "imovel"
              ? parseInt(reBathrooms) || undefined
              : undefined,
          suites: niche.id === "imovel" ? parseInt(reSuites) || undefined : undefined,
          parking_spots: niche.id === "imovel" ? parseInt(reParking) || undefined : undefined,
          area_sqm: niche.id === "imovel" ? parseInt(reAreaSqm) || undefined : undefined,
          amenities:
            niche.id === "hospedagem"
              ? hospAmenities
              : niche.id === "imovel"
              ? reAmenities
              : undefined,
          max_guests: niche.id === "hospedagem" ? parseInt(hospGuests) || 1 : undefined,
          cleaning_fee_cents:
            niche.id === "hospedagem" ? (hospCleaningFeeCents ?? 0) : undefined,
          rental_period: niche.id === "hospedagem" ? "diaria" : undefined,
          is_digital: niche.id === "digital",
          digital_file_url: niche.id === "digital" ? digitalFileUrl : undefined,
          digital_file_name: niche.id === "digital" ? digitalFileName : undefined,
          digital_file_size_bytes: niche.id === "digital" ? digitalFileSize : undefined,
          download_limit: niche.id === "digital" ? (parseInt(digitalDownloadLimit) || 5) : undefined,
          digital_preview_url: niche.id === "digital" ? (digitalPreviewUrl.trim() || undefined) : undefined,
          booking_enabled: niche.id === "servico" ? serviceBookingEnabled : undefined,
          service_duration_minutes: niche.id === "servico" ? (parseInt(serviceDuration) || 60) : undefined,
          available_slots: niche.id === "servico" ? (parseInt(serviceDailySlots) || 8) : undefined,
          available_weekdays: niche.id === "servico" ? serviceAvailableDays : undefined,
          working_hours_start: niche.id === "servico" ? serviceHoursStart : undefined,
          working_hours_end: niche.id === "servico" ? serviceHoursEnd : undefined,
          negotiable,
          whatsapp: whatsapp.trim() || undefined,
          contact_whatsapp: whatsapp.trim() || undefined,
          location_name: locationName.trim() || undefined,
          hide_location: hideLocation,
          images: images,
          attributes,
          status: "active",
        },
      });

      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("waesy_ai_prefill");
        } catch (e) {}
      }

      if (editId) {
        toast.success("Anúncio atualizado com sucesso!");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["classifieds-master-list"] }),
          queryClient.invalidateQueries({ queryKey: ["classifieds"] }),
        ]).catch(() => null);
        navigate({ to: "/classificados/$id", params: { id: editId } });
      } else {
        toast.success("Anúncio publicado com sucesso!");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["classifieds-master-list"] }),
          queryClient.invalidateQueries({ queryKey: ["classifieds"] }),
        ]).catch(() => null);
        navigate({ to: "/classificados/$id", params: { id: res.id } });
      }
    } catch (err: any) {
      console.error("Erro ao publicar classificado:", err);
      toast.error(err?.message || "Erro ao publicar anúncio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Qualidade do Anúncio (Score de 0 a 100%) ──
  const qualityScore = useMemo(() => {
    let score = 0;
    if (title.trim().length >= 8) score += 15;
    if (description.trim().length >= 30) score += 20;
    if (images.length >= 1) score += 15;
    if (images.length >= 3) score += 10;
    if (locationName.trim().length > 0 || structuredLoc?.city) score += 10;
    if (priceCents !== undefined || pricingType === "on_quote" || pricingType === "free" || pricingType === "exchange_only") score += 15;

    // Campos ricos por nicho
    if (niche.id === "veiculo" && (vehicleKm || vehicleYearModel || vehicleTransmission)) score += 15;
    else if (niche.id === "imovel" && (reAreaSqm || reBedrooms || rePropertyType)) score += 15;
    else if (niche.id === "hospedagem" && (hospGuests || hospBedrooms || hospPropertyType)) score += 15;
    else if (niche.id === "viagem" && (travelDuration || travelDestinationCity || travelMealPlan)) score += 15;
    else if (niche.id === "vaga" && (jobRegime || jobModel || jobSalaryRange)) score += 15;
    else if (niche.id === "servico" && (serviceModality || serviceArea)) score += 15;
    else if (niche.id === "desapego" && (itemCondition || desapegoCategory)) score += 15;
    else score += 15;

    return Math.min(100, Math.max(10, score));
  }, [
    title,
    description,
    images.length,
    locationName,
    structuredLoc,
    priceCents,
    pricingType,
    niche.id,
    vehicleKm,
    vehicleYearModel,
    vehicleTransmission,
    reAreaSqm,
    reBedrooms,
    rePropertyType,
    hospGuests,
    hospBedrooms,
    hospPropertyType,
    travelDuration,
    travelDestinationCity,
    travelMealPlan,
    jobRegime,
    jobModel,
    jobSalaryRange,
    serviceModality,
    serviceArea,
    itemCondition,
    desapegoCategory,
  ]);

  // ── Persistência Híbrida de Rascunhos (Drafts) ──
  useEffect(() => {
    if (typeof window !== "undefined" && !editId) {
      try {
        const saved = localStorage.getItem(`waesy_draft_classified_${niche.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.savedAt && parsed.title) {
            setDraftInfo({ step: parsed.step || 2, savedAt: parsed.savedAt });
          }
        }
      } catch {}
    }
  }, [niche.id, editId]);

  const handleRestoreDraft = () => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`waesy_draft_classified_${niche.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.title) setTitle(parsed.title);
          if (parsed.description) setDescription(parsed.description);
          if (parsed.priceCents !== undefined) setPriceCents(parsed.priceCents);
          if (parsed.locationName) setLocationName(parsed.locationName);
          if (Array.isArray(parsed.images) && parsed.images.length > 0) setImages(parsed.images);
          if (parsed.pricingType) setPricingType(parsed.pricingType);
          if (parsed.step && parsed.step >= 2 && parsed.step <= 5) setCurrentStep(parsed.step as any);
          toast.success("Rascunho recuperado com sucesso!");
          setDraftInfo(null);
        }
      } catch {
        toast.error("Não foi possível carregar o rascunho.");
      }
    }
  };

  const handleDiscardDraft = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`waesy_draft_classified_${niche.id}`);
      setDraftInfo(null);
      toast.info("Rascunho descartado.");
    }
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    toast.loading("Salvando rascunho...", { id: "save-draft" });
    try {
      if (typeof window !== "undefined") {
        const draftObj = {
          title,
          description,
          priceCents,
          locationName,
          images,
          pricingType,
          step: currentStep,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(`waesy_draft_classified_${niche.id}`, JSON.stringify(draftObj));
      }

      if (title.trim()) {
        let resolvedCategory = niche.canonicalCategory;
        if (niche.id === "viagem") resolvedCategory = "travel";
        if (niche.id === "equipamento") resolvedCategory = "equipment";
        if (niche.id === "doacao") resolvedCategory = "donation";
        if (niche.id === "negocio") resolvedCategory = "business";
        if (niche.id === "gastronomia") resolvedCategory = "food";

        await upsertClassified({
          data: {
            id: editId || undefined,
            category: resolvedCategory as any,
            title: title.trim(),
            content: description.trim() || "Rascunho em preenchimento...",
            status: "draft",
            images,
            price_cents: priceCents ?? null,
            location_name: locationName.trim() || undefined,
            attributes: {
              draft_step: currentStep,
              niche: niche.id,
              is_store_official: Boolean(selectedStoreId),
            },
            store_id: selectedStoreId || undefined,
          },
        });
      }
      toast.success("Rascunho salvo com sucesso!", { id: "save-draft" });
    } catch (err: any) {
      console.warn("Aviso ao salvar rascunho:", err);
      toast.success("Rascunho salvo no seu navegador!", { id: "save-draft" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedPriceCents = priceCents ?? null;

  const livePreviewClassified = useMemo(() => {
    const computedPriceCents =
      pricingType === "free" || niche.id === "doacao"
        ? 0
        : pricingType === "on_quote" || pricingType === "exchange_only"
        ? null
        : pricingType === "starting_at" || pricingType === "price_range"
        ? (priceMinCents || priceCents || null)
        : (priceCents ?? null);

    const generatedBioBullets =
      niche.id === "viagem"
        ? travelBioBullets.map((b) => b.trim()).filter(Boolean)
        : niche.id === "hospedagem"
        ? [
            hospPropertyType,
            `${hospGuests} hóspedes`,
            `${hospBedrooms} quartos`,
            hospCheckinType === "self_checkin" ? "Self Check-in" : "Check-in Presencial",
          ].filter(Boolean)
        : niche.id === "imovel"
        ? [
            rePropertyType,
            reDealType === "aluguel" ? "Aluguel" : "Venda",
            reAreaSqm ? `${reAreaSqm} m²` : null,
            reBedrooms ? `${reBedrooms} quartos` : null,
          ].filter(Boolean)
        : niche.id === "veiculo"
        ? [
            vehicleBrand && vehicleModel ? `${vehicleBrand} ${vehicleModel}` : null,
            vehicleYearModel ? `Ano ${vehicleYearModel}` : null,
            vehicleKm ? `${vehicleKm} km` : null,
            vehicleTransmission,
          ].filter(Boolean)
        : niche.id === "servico"
        ? [
            serviceArea || niche.title,
            serviceModality,
            serviceDuration ? `Duração: ~${serviceDuration} min` : null,
            serviceBookingEnabled ? "Agendamento Online Ativo" : null,
          ].filter(Boolean)
        : niche.id === "vaga"
        ? [
            jobRole || title,
            jobModel,
            jobRegime,
            jobSalaryRange ? `Faixa: ${jobSalaryRange}` : null,
          ].filter(Boolean)
        : niche.id === "desapego"
        ? [
            itemCondition === "novo"
              ? "Novo / Na Caixa"
              : itemCondition === "usado_excelente"
              ? "Usado - Como Novo"
              : "Usado",
            phoneBrand && desapegoCategory === "smartphones" ? `${phoneBrand} ${phoneModel}` : null,
            deliveryMode === "both"
              ? "Retirada & Entrega Local"
              : deliveryMode === "local_delivery"
              ? "Entrega Expressa"
              : "Retirada no Local",
          ].filter(Boolean)
        : niche.id === "negocio"
        ? [
            CANONICAL_BUSINESS_TYPES.find((b) => b.id === businessType)?.label || "Venda de Empresa",
            businessSegment,
            businessAreaSqm ? `${businessAreaSqm} m²` : null,
            businessRequiresNda ? "Sigilo NDA Ativo" : "Informações Abertas",
          ].filter(Boolean)
        : niche.id === "gastronomia"
        ? [
            CANONICAL_FOOD_SUBNICHES.find((f) => f.id === foodSubNiche)?.label || "Gastronomia",
            foodPrepTime ? `Preparo: ${foodPrepTime}` : null,
            foodDeliveryModes.length > 0 ? `${foodDeliveryModes.length} canais de entrega` : null,
          ].filter(Boolean)
        : [
            niche.title,
            locationName || "Chapecó - SC",
            acceptsPix ? "Aceita PIX" : null,
          ].filter(Boolean);

    return {
      id: initialData?.id || "preview-live",
      title: title || "Título do Anúncio",
      content: description || "",
      description: description || "",
      price_cents: computedPriceCents,
      images: images || [],
      photos: images || [],
      media: images || [],
      city: hideLocation ? "" : (structuredLoc?.city || (locationName ? locationName.split(",")[0].trim() : "Chapecó")),
      neighborhood: hideLocation ? "" : ((locationName && locationName.split("-")[1]?.trim()) || ""),
      location_name: hideLocation ? "" : (locationName || ""),
      location_lat: hideLocation ? null : (structuredLoc?.lat || null),
      location_lng: hideLocation ? null : (structuredLoc?.lng || null),
      contact_whatsapp: whatsapp || "",
      contact_phone: whatsapp || "",
      whatsapp: whatsapp || "",
      contact_name: selectedStore ? selectedStore.name : (userProfile?.full_name || "Você"),
      store_id: selectedStore?.id || null,
      store_name: selectedStore?.name || null,
      store_slug: selectedStore?.slug || null,
      store: selectedStore ? {
        id: selectedStore.id,
        name: selectedStore.name,
        slug: selectedStore.slug,
        logo_url: selectedStore.logo_url,
      } : null,
      profiles: !selectedStore ? {
        id: userProfile?.id || "preview-user",
        full_name: userProfile?.full_name || "Você",
        avatar_url: userProfile?.avatar_url || null,
      } : null,
      negotiable,
      accepts_trade: acceptsTrade,
      category: niche.id,
      attributes: {
        niche: niche.id === "negocio" ? "business" : niche.id,
        template_style: templateStyle,
        pricing_type: pricingType,
        price_min_cents: pricingType === "price_range" || pricingType === "starting_at" ? priceMinCents : undefined,
        price_max_cents: pricingType === "price_range" ? priceMaxCents : undefined,
        price_disclaimer: priceDisclaimer,
        custom_disclaimer: customDisclaimer,
        accepts_pix: acceptsPix,
        pix_discount_percent: pixDiscountPercent,
        accepts_card: acceptsCard,
        max_installments: acceptsCard ? (niche.id === "viagem" ? Number(travelMaxInstallments) || 12 : Number(maxInstallments) || 12) : 1,
        card_interest_free: cardInterestFree,
        accepts_boleto: acceptsBoleto,
        boleto_due_days: boletoDueDays,
        accepts_boleto_installments: acceptsBoletoInstallments,
        max_boleto_installments: maxBoletoInstallments,
        boleto_min_down_payment_cents: boletoMinDownPaymentCents,
        boleto_notes: boletoNotes,
        accepts_carne: acceptsCarne,
        max_carne_installments: maxCarneInstallments,
        carne_grace_days: carneGraceDays,
        carne_min_down_payment_cents: carneMinDownPaymentCents,
        carne_notes: carneNotes,
        accepts_trade: acceptsTrade,
        trade_notes: tradeNotes,
        accepts_financing: acceptsFinancing,
        financing_notes: financingNotes,
        accepts_cash: acceptsCash,
        cancellation_policy: cancellationPolicy,
        destination_city: travelDestinationCity || locationName || "Chapecó",
        duration_text: travelDuration,
        package_duration: travelDuration,
        meal_plan: travelMealPlan,
        guests_text: travelGuests,
        guest_capacity: travelGuests,
        dates_text: travelDates,
        departure_options: travelDepartureOptions,
        flight_details: {
          transport_type: travelTransportType,
          departure_iata: travelDepartureIATA,
          arrival_iata: travelArrivalIATA,
          airline: travelAirline,
          connections: travelConnections,
          departure_time: travelDepartureTime,
          arrival_time: travelArrivalTime,
          price_text: travelFlightPrice,
          duration_text: travelFlightDuration,
          bus_category: travelBusCategory,
          bus_company: travelBusCompany,
          departure_city: travelDepartureCity,
          meeting_point: travelMeetingPoint,
          boarding_gateways: travelBoardingGateways,
          return_departure_time: travelReturnDepartureTime,
          guide_service: travelGuideService,
          combo_flight_from_iata: travelComboFromIATA,
          combo_flight_to_iata: travelComboToIATA,
          combo_airline: travelComboAirline,
          combo_flight_price_text: travelComboFlightPrice,
          transfer_vehicle: travelTransferVehicle,
          transfer_from: travelTransferFrom,
          transfer_to: travelTransferTo,
          transfer_duration: travelTransferDuration,
          transfer_departure_time: travelTransferTime,
          combo_notes: travelComboNotes,
          ship_name: travelShipName,
          cruise_line: travelCruiseLine,
          cabin_category: travelCabinCategory,
          embarkation_port: travelEmbarkationPort,
        },
        story_highlights: travelStoryHighlights,
        itinerary_days: travelItineraryDays,
        bio_bullets: generatedBioBullets,
        // Hospedagem
        deal_type: niche.id === "hospedagem" ? "temporada" : niche.id === "imovel" ? reDealType : undefined,
        rental_period: niche.id === "hospedagem" ? "diaria" : undefined,
        property_type: niche.id === "hospedagem" ? hospPropertyType : niche.id === "imovel" ? rePropertyType : undefined,
        bedrooms: niche.id === "hospedagem" ? parseInt(hospBedrooms) || 1 : niche.id === "imovel" ? parseInt(reBedrooms) || undefined : undefined,
        bathrooms: niche.id === "hospedagem" ? parseInt(hospBathrooms) || 1 : niche.id === "imovel" ? parseInt(reBathrooms) || undefined : undefined,
        max_guests: parseInt(hospGuests) || 1,
        cleaning_fee_cents: hospCleaningFeeCents ?? 0,
        amenities: niche.id === "hospedagem" ? hospAmenities : niche.id === "imovel" ? reAmenities : [],
        checkin_type: hospCheckinType,
        checkin_time: hospCheckinTime,
        checkout_time: hospCheckoutTime,
        house_rules: hospRules,
        // Imóveis
        area_sqm: reAreaSqm,
        suites: reSuites,
        parking_spots: reParking,
        condo_cents: reCondoCents,
        iptu_cents: reIptuCents,
        furnished: reFurnished,
        // Veículos
        brand: niche.id === "mercado" ? groceryBrand : vehicleBrand,
        model: vehicleModel,
        version: vehicleVersion,
        year_fab: vehicleYearFab,
        year_model: vehicleYearModel,
        mileage_km: vehicleKm,
        fuel_type: vehicleFuel,
        transmission: vehicleTransmission,
        color: vehicleColor,
        features: vehicleFeatures,
        // Serviços
        modality: serviceModality,
        service_category: serviceArea || niche.title,
        booking_enabled: serviceBookingEnabled,
        service_duration_minutes: parseInt(serviceDuration) || 60,
        available_slots: parseInt(serviceDailySlots) || 8,
        service_subniche: serviceSubNiche,
        professional_council: serviceProfessionalCouncil,
        specialty: serviceSpecialty,
        // Gastronomia
        food_subniche: foodSubNiche,
        food_prep_time_minutes: foodPrepTime,
        food_delivery_modes: foodDeliveryModes,
        // Mercado & Conveniência
        grocery_department: groceryDepartment,
        sub_category: grocerySubCategory,
        unit_type: groceryUnitType,
        estimated_weight_per_unit: groceryEstimatedWeightPerUnit,
        temperature: groceryTemperature,
        storage_temp: groceryTemperature,
        manufacturer: groceryBrand,
        barcode_ean: groceryBarcodeEan,
        ingredients: groceryIngredients,
        is_alcoholic: groceryIsAlcoholic,
        contains_gluten: groceryContainsGluten,
        contains_lactose: groceryContainsLactose,
        is_organic: groceryIsOrganic,
        prep_options: groceryPrepOptions,
        delivery_estimate: groceryDeliveryEstimate,
        delivery_fee_cents: groceryDeliveryFeeCents,
        grocery_fresh_pricing: grocerySupportsFreshPricing ? {
          supports_fresh_pricing: true,
          default_pricing_mode: groceryDefaultPricingMode,
          avg_piece_weight_grams: groceryAvgPieceWeightGrams,
          price_per_kg_cents: groceryPricePerKgCents || ((priceCents || 0) > 0 ? (priceCents || 0) * 2 : 990),
          price_per_unit_cents: priceCents || 0,
        } : undefined,
        grocery_ripeness_config: groceryRipenessEnabled ? {
          enabled: true,
          stages: groceryRipenessStages,
          default_stage: "maduro",
        } : undefined,
        progressive_discount_tiers: groceryProgressiveDiscountsEnabled && groceryDiscountTiers.length > 0 ? groceryDiscountTiers : undefined,
        order_bump_offer: groceryOrderBumpEnabled && groceryOrderBumpTitle.trim() ? {
          enabled: true,
          mode: "manual",
          target_title: groceryOrderBumpTitle.trim(),
          special_price_cents: groceryOrderBumpSpecialPriceCents,
          original_price_cents: groceryOrderBumpOriginalPriceCents,
          badge_text: groceryOrderBumpBadge || "Oferta Relâmpago",
        } : undefined,
        // Negócios
        is_business_sale: niche.id === "negocio",
        business_type: businessType,
        business_segment: businessSegment,
        monthly_revenue_cents: businessMonthlyRevenueCents,
        net_profit_cents: businessNetProfitCents,
        valuation_cents: businessValuationCents || priceCents,
        working_capital_cents: businessWorkingCapitalCents,
        foundation_year: businessFoundationYear,
        employees_range: businessEmployeesRange,
        sale_reason: businessSaleReason,
        commercial_point_type: businessPointType,
        monthly_rent_cents: businessMonthlyRentCents,
        monthly_iptu_cents: businessMonthlyIptuCents,
        monthly_condo_cents: businessMonthlyCondoCents,
        contract_remaining_years: businessContractRemainingYears,
        requires_nda: businessRequiresNda,
        advisor_supported: businessAdvisorSupported,
        telemetry: telemetryResult,
        // Captação de Investimento / Sócios
        target_investment_cents: (businessType === "busca_socio" || businessType === "captacao_investimento") ? targetInvestmentCents : undefined,
        offered_equity_percent: (businessType === "busca_socio" || businessType === "captacao_investimento") ? offeredEquityPercent : undefined,
        investment_model: (businessType === "busca_socio" || businessType === "captacao_investimento") ? investmentModel : undefined,
        project_stage: (businessType === "busca_socio" || businessType === "captacao_investimento") ? projectStage : undefined,
        use_of_funds: (businessType === "busca_socio" || businessType === "captacao_investimento") ? useOfFunds : undefined,
        pitch_deck_url: (businessType === "busca_socio" || businessType === "captacao_investimento") ? pitchDeckUrl : undefined,
        // Desapego
        condition: itemCondition,
        warranty: itemWarranty,
        delivery_mode: deliveryMode,
        free_shipping_local: freeShippingLocal,
        // Digital
        is_digital: niche.id === "digital",
        digital_file_url: digitalFileUrl,
        digital_file_name: digitalFileName,
        digital_file_size_bytes: digitalFileSize,
      },
    };
  }, [
    initialData?.id,
    title,
    description,
    pricingType,
    priceMinCents,
    priceMaxCents,
    priceCents,
    parsedPriceCents,
    images,
    structuredLoc,
    locationName,
    hideLocation,
    whatsapp,
    negotiable,
    acceptsTrade,
    niche.id,
    niche.title,
    templateStyle,
    priceDisclaimer,
    customDisclaimer,
    acceptsPix,
    pixDiscountPercent,
    acceptsCard,
    travelMaxInstallments,
    maxInstallments,
    tradeNotes,
    acceptsFinancing,
    financingNotes,
    acceptsCash,
    cancellationPolicy,
    travelDestinationCity,
    travelDuration,
    travelMealPlan,
    travelGuests,
    travelDates,
    travelDepartureIATA,
    travelArrivalIATA,
    travelAirline,
    travelTransportType,
    travelConnections,
    travelDepartureTime,
    travelArrivalTime,
    travelFlightPrice,
    travelFlightDuration,
    travelStoryHighlights,
    travelItineraryDays,
    travelBioBullets,
    hospPropertyType,
    hospGuests,
    hospBedrooms,
    hospBathrooms,
    hospCheckinType,
    hospCheckinTime,
    hospCheckoutTime,
    hospCleaningFeeCents,
    hospAmenities,
    hospRules,
    reDealType,
    rePropertyType,
    reAreaSqm,
    reBedrooms,
    reSuites,
    reBathrooms,
    reParking,
    reCondoCents,
    reIptuCents,
    reFurnished,
    reAmenities,
    vehicleBrand,
    vehicleModel,
    vehicleVersion,
    vehicleYearFab,
    vehicleYearModel,
    vehicleKm,
    vehicleFuel,
    vehicleTransmission,
    vehicleColor,
    vehicleFeatures,
    serviceModality,
    serviceArea,
    serviceBookingEnabled,
    serviceDuration,
    serviceDailySlots,
    jobRole,
    jobModel,
    jobRegime,
    jobSalaryRange,
    itemCondition,
    itemWarranty,
    phoneBrand,
    phoneModel,
    desapegoCategory,
    deliveryMode,
    freeShippingLocal,
    digitalFileUrl,
    digitalFileName,
    digitalFileSize,
    targetInvestmentCents,
    offeredEquityPercent,
    investmentModel,
    projectStage,
    useOfFunds,
    pitchDeckUrl,
  ]);

 return (
 <div className="space-y-4">
 {/* ── Topbar Operacional Compacta & Sticky no Mobile ────────── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/60 -mx-3.5 px-3.5 py-2.5 sm:mx-0 sm:px-0 sm:py-0 sm:static sm:border-0 sm:bg-transparent flex items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="rounded-xl text-xs gap-1.5 h-9 font-bold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            <span>Retornar</span>
          </Button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-muted-foreground text-xs">/</span>
            <Badge variant="outline" className="text-xs font-semibold gap-1.5">
              <niche.icon className="size-3.5 text-primary" />
              <span>{niche.title}</span>
            </Badge>
          </div>
        </div>

        {/* Mobile Switcher & Publicar / Salvar Action */}
        <div className="flex items-center gap-2">
          <div className="flex md:hidden bg-muted p-0.5 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMobileTab("edit")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                mobileTab === "edit"
                  ? "bg-card text-foreground font-bold shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                mobileTab === "preview"
                  ? "bg-card text-foreground font-bold shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Prévia ({images.length})
            </button>
          </div>

          <Button
            onClick={handlePublish}
            disabled={isSubmitting || isUploadingMedia}
            size="sm"
            className="rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground h-9 px-4 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>{editId ? "Salvando..." : "Publicando..."}</span>
              </>
            ) : (
              <>
                <Check className="size-4" />
                <span>{editId ? "Salvar Alterações" : "Publicar Anúncio"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── 5-Step Adaptive Stepper Tracker (Apple Clean / Minimalist) ── */}
      <div className="w-full bg-card rounded-2xl border border-border/60 p-2 sm:p-2.5 shadow-2xs">
        <div className="grid grid-cols-5 gap-1 sm:gap-2">
          {[
            { step: 1, label: "Nicho", short: "Nicho" },
            { step: 2, label: "Especificações", short: "Specs" },
            { step: 3, label: "Fotos & Mídia", short: "Mídia" },
            { step: 4, label: "Condições Comerciais", short: "Comercial" },
            { step: 5, label: "Prévia & Publicar", short: "Publicar" },
          ].map((s) => {
            const isCurrent = currentStep === s.step;
            const isPast = currentStep > s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  if (s.step === 1) onBack();
                  else setCurrentStep(s.step as any);
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 px-1 sm:px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center",
                  isCurrent
                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                    : isPast
                    ? "bg-muted/50 text-foreground hover:bg-muted"
                    : "text-muted-foreground hover:bg-muted/30 opacity-70"
                )}
              >
                <span
                  className={cn(
                    "size-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0",
                    isCurrent
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : isPast
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isPast ? "✓" : s.step}
                </span>
                <span className="hidden sm:inline truncate">{s.label}</span>
                <span className="sm:hidden truncate">{s.short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Alerta Discreto de Rascunho Disponível ── */}
      {draftInfo && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs">
          <span className="text-muted-foreground">
            Rascunho não finalizado encontrado (Etapa {draftInfo.step} de 5).
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="font-bold text-primary hover:underline cursor-pointer"
            >
              Restaurar
            </button>
            <span className="text-muted-foreground/40">•</span>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* ── Barra de Score de Qualidade (Silenciosa & Informativa) ── */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-card border border-border/60 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
            Qualidade
          </span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden max-w-xs">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                qualityScore >= 80 ? "bg-emerald-500" : qualityScore >= 50 ? "bg-amber-500" : "bg-primary"
              )}
              style={{ width: `${qualityScore}%` }}
            />
          </div>
          <span className="font-mono font-bold text-foreground text-[11px] shrink-0">{qualityScore}%</span>
        </div>
        <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
          {qualityScore >= 80 ? "Excelente · Pronto para publicar" : qualityScore >= 50 ? "Bom · Adicione fotos e dados para 100%" : "Básico · Preencha mais campos"}
        </span>
      </div>

      {currentStep === 5 ? (
        <div className="space-y-4 max-w-5xl mx-auto">
          {/* Header do Preview com Alternador de Dispositivo sem Emojis */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Visualização do Comprador
              </span>
            </div>

            {/* Alternador Limpo: Mobile vs Desktop (Sem Emojis) */}
            <div className="flex items-center bg-muted p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-colors cursor-pointer",
                  previewDevice === "mobile"
                    ? "bg-card text-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Mobile (390px)
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-colors cursor-pointer",
                  previewDevice === "desktop"
                    ? "bg-card text-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Desktop
              </button>
            </div>
          </div>

          {/* Container da Prévia Real */}
          <div className="flex justify-center">
            <div
              className={cn(
                "w-full transition-all duration-300",
                previewDevice === "mobile"
                  ? "max-w-[390px] border border-border/80 rounded-3xl p-1 bg-background shadow-lg overflow-hidden"
                  : "max-w-5xl"
              )}
            >
              {niche.id === "mercado" || templateStyle === "conveniencia" ? (
                <ConvenienceShowcaseView
                  classified={livePreviewClassified}
                  previewData={{
                    title: title || "Produto de Mercado",
                    description: description,
                    priceCents: priceCents || 0,
                    images: images || [],
                    locationName: locationName || "São Miguel do Oeste e Região",
                    whatsapp,
                    storeName: selectedStore?.name,
                    storeSlug: selectedStore?.slug,
                    storeLogo: selectedStore?.logo_url,
                    authorName: !selectedStore ? (userProfile?.full_name || "Você") : undefined,
                    authorAvatar: !selectedStore ? (userProfile?.avatar_url || undefined) : undefined,
                    authorId: !selectedStore ? userProfile?.id : undefined,
                    volume: convenienceVolume,
                    unitType: groceryUnitType,
                    department: groceryDepartment,
                    temperature: groceryTemperature,
                    isAlcoholic: groceryIsAlcoholic,
                    containsGluten: groceryContainsGluten ?? undefined,
                    containsLactose: groceryContainsLactose ?? undefined,
                    isOrganic: groceryIsOrganic,
                    brand: groceryBrand,
                    barcodeEan: groceryBarcodeEan,
                    ingredients: groceryIngredients,
                    prepOptions: groceryPrepOptions,
                    deliveryEstimate: groceryDeliveryEstimate,
                    deliveryFeeCents: groceryDeliveryFeeCents,
                    readyDelivery: readyDelivery,
                    acceptsPix,
                    pixDiscountPercent,
                    acceptsCard,
                    maxInstallments,
                    cardInterestFree,
                    acceptsCash,
                    groceryFreshPricing: grocerySupportsFreshPricing ? {
                      supports_fresh_pricing: true,
                      default_pricing_mode: groceryDefaultPricingMode,
                      avg_piece_weight_grams: groceryAvgPieceWeightGrams,
                      price_per_kg_cents: groceryPricePerKgCents,
                      price_per_unit_cents: priceCents,
                    } : undefined,
                    groceryRipenessConfig: groceryRipenessEnabled ? {
                      enabled: true,
                      stages: groceryRipenessStages,
                      default_stage: "maduro",
                    } : undefined,
                    progressiveDiscountTiers: groceryProgressiveDiscountsEnabled ? groceryDiscountTiers : undefined,
                    orderBumpOffer: groceryOrderBumpEnabled && groceryOrderBumpTitle.trim() ? {
                      enabled: true,
                      mode: "manual",
                      target_title: groceryOrderBumpTitle.trim(),
                      special_price_cents: groceryOrderBumpSpecialPriceCents,
                      original_price_cents: groceryOrderBumpOriginalPriceCents,
                      badge_text: groceryOrderBumpBadge,
                    } : undefined,
                  }}
                  isOwner={true}
                  onEdit={() => setCurrentStep(2)}
                />
              ) : templateStyle === "editorial" || niche.id === "viagem" ? (
                <EditorialShowcaseView
                  classified={livePreviewClassified}
                  isOwner={true}
                  onOpenBookingModal={() => toast.info("Simulação: Modal de reserva abre aqui.")}
                  onOpenProposalModal={() => toast.info("Simulação: Modal de proposta abre aqui.")}
                  onEditClassified={() => setCurrentStep(2)}
                />
              ) : (
                <UniversalClassifiedShowcase
                  classified={livePreviewClassified}
                  isOwner={true}
                  canManage={true}
                  onOpenBookingModal={() => toast.info("Simulação: Modal de reserva abre aqui.")}
                  onOpenProposalModal={() => toast.info("Simulação: Modal de proposta abre aqui.")}
                  onEdit={() => setCurrentStep(2)}
                />
              )}
            </div>
          </div>

          {/* Sticky Thumb Zone Action Bar no Step 5 */}
          <div className="sticky bottom-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/80 p-3 sm:p-4 -mx-3.5 sm:mx-0 sm:rounded-2xl sm:border flex items-center justify-between gap-3 shadow-lg">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(4)}
              className="rounded-xl h-11 px-4 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="size-4" />
              <span>Ajustar Condições</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSaveDraft}
                disabled={isSubmitting}
                className="rounded-xl h-11 px-3 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Salvar Rascunho
              </Button>

              <Button
                type="button"
                onClick={handlePublish}
                disabled={isSubmitting || isUploadingMedia}
                className="rounded-xl h-11 px-6 text-sm font-bold bg-primary text-primary-foreground shadow-md active:scale-98 transition-all gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Publicando...</span>
                  </>
                ) : (
                  <>
                    <Check className="size-4 stroke-[2.5]" />
                    <span>{editId ? "Salvar Alterações" : "Publicar Anúncio"}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Grid Principal: Editor (42%) + Truthful Preview (58%) ── */
 <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
 {/* Painel Esquerdo: Formulário Especializado com Scroll Dedicado */}
 <aside
 className={`md:col-span-5 space-y-6 ${mobileTab === "edit" ? "block" : "hidden md:block"} `}
 >
          <div className="space-y-6">
 {/* Section 1: Informações Fundamentais */}
 {/* Section 1: Informações Fundamentais */}
          <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-2.5 border-b border-border/40">
              <FileText className="size-4 text-primary shrink-0" />
              <span>Informações Básicas</span>
            </div>

            {/* Seletor de Template Visual (Padrão vs Vitrine Imersiva) */}
            <div className="space-y-1.5 pb-1">
              <Label className="text-xs text-foreground font-semibold">
                Estilo Visual da Página
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateStyle("standard")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    templateStyle === "standard"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <p className="text-xs font-bold text-foreground">Padrão</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Visual limpo
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setTemplateStyle("editorial")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    templateStyle === "editorial" || (templateStyle as string) === "instagram"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border/60 hover:bg-muted/40"
                  }`}
                >
                  <p className="text-xs font-bold text-foreground flex items-center gap-1">
                    <span>Vitrine Imersiva</span>
                    <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Destaques visuais, abas e roteiro
                  </p>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground font-medium">Título do Anúncio *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  niche.id === "hospedagem"
                    ? "Ex: Chalé na Serra com Hidro e Vista Panorâmica"
                    : niche.id === "imovel"
                    ? "Ex: Apartamento 2 Quartos no Centro com Garagem"
                    : niche.id === "veiculo"
                    ? "Ex: Honda Civic 2.0 EXL Automático 2021"
                    : niche.id === "servico"
                    ? "Ex: Manutenção Elétrica Residencial & Comercial"
                    : niche.id === "vaga"
                    ? "Ex: Analista Financeiro Sênior (Híbrido)"
                    : "Ex: iPhone 15 Pro Max 256GB Impecável na Caixa"
                }
                className="h-11 rounded-xl text-xs bg-background font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground font-medium">Descrição Completa *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isRefiningDescription}
                  onClick={handleRefineDescriptionWithAI}
                  className="h-6 px-2 text-[11px] font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1 rounded-lg"
                >
                  <Sparkles className="size-3" />
                  {isRefiningDescription ? "Aprimorando..." : "Refinar com IA"}
                </Button>
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder={
                  niche.id === "hospedagem"
                    ? "Descreva a atmosfera do espaço, comodidades, localização, distâncias de pontos turísticos e regras de convivência..."
                    : "Descreva todos os detalhes, histórico, diferenciais e informações importantes..."
                }
                className="rounded-xl text-xs bg-background resize-none leading-relaxed"
              />
            </div>

            {/* Motor de Precificação Dinâmica & Avisos */}
            <div className="space-y-3 pt-1 border-t border-border/40">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground font-semibold">
                  Modalidade de Preço
                </Label>
                <Select value={pricingType} onValueChange={(v: any) => setPricingType(v)}>
                  <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Preço Fixo Definido (R$)</SelectItem>
                    <SelectItem value="starting_at">A partir de... (Preço Inicial)</SelectItem>
                    <SelectItem value="price_range">Faixa de Preço (Mínimo e Máximo)</SelectItem>
                    <SelectItem value="on_quote">Sob Orçamento / Cotação Personalizada</SelectItem>
                    <SelectItem value="exchange_only">Troca / Permuta Direta (Sem valor)</SelectItem>
                    <SelectItem value="free">Gratuito / Doação Solidária (R$ 0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {pricingType === "fixed" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-medium">
                      {niche.id === "servico"
                        ? "Valor Base (R$) *"
                        : niche.id === "vaga"
                        ? "Salário Proposto (R$) *"
                        : "Valor (R$) *"}
                    </Label>
                    <CurrencyField
                      value={priceCents}
                      onChange={setPriceCents}
                      placeholder="0,00"
                      className="h-11 rounded-xl text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5 flex items-end">
                    <div
                      className="flex items-center gap-2.5 h-11 px-3 rounded-xl bg-background border border-border/60 hover:bg-muted/30 transition-colors cursor-pointer w-full"
                      onClick={() => setNegotiable(!negotiable)}
                    >
                      <Checkbox
                        id="neg-check"
                        checked={negotiable}
                        onCheckedChange={(c) => setNegotiable(!!c)}
                      />
                      <Label
                        htmlFor="neg-check"
                        className="text-xs text-foreground cursor-pointer font-medium select-none"
                      >
                        Aceita Propostas / Negociável
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {pricingType === "starting_at" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-medium">A partir de (R$) *</Label>
                    <CurrencyField
                      value={priceMinCents}
                      onChange={(v) => {
                        setPriceMinCents(v);
                        if (v && !priceCents) setPriceCents(v);
                      }}
                      placeholder="0,00"
                      className="h-11 rounded-xl text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5 flex items-end">
                    <div
                      className="flex items-center gap-2.5 h-11 px-3 rounded-xl bg-background border border-border/60 hover:bg-muted/30 transition-colors cursor-pointer w-full"
                      onClick={() => setNegotiable(!negotiable)}
                    >
                      <Checkbox
                        id="neg-check-start"
                        checked={negotiable}
                        onCheckedChange={(c) => setNegotiable(!!c)}
                      />
                      <Label
                        htmlFor="neg-check-start"
                        className="text-xs text-foreground cursor-pointer font-medium select-none"
                      >
                        Sujeito a orçamento final
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {pricingType === "price_range" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-medium">Preço Mínimo (R$) *</Label>
                    <CurrencyField
                      value={priceMinCents}
                      onChange={(v) => {
                        setPriceMinCents(v);
                        if (v && !priceCents) setPriceCents(v);
                      }}
                      placeholder="0,00"
                      className="h-11 rounded-xl text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-medium">Preço Máximo (R$) *</Label>
                    <CurrencyField
                      value={priceMaxCents}
                      onChange={setPriceMaxCents}
                      placeholder="0,00"
                      className="h-11 rounded-xl text-xs bg-background"
                    />
                  </div>
                </div>
              )}

              {pricingType === "on_quote" && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Coins className="size-4 shrink-0" />
                    <span>Preço sob Orçamento / Cotação</span>
                  </p>
                  <p className="mt-1 text-[11px] opacity-90">
                    O anúncio exibirá "Sob Consulta" na vitrine pública e convidará os clientes a solicitarem cotação personalizada via WhatsApp.
                  </p>
                </div>
              )}

              {pricingType === "exchange_only" && (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">
                  <p className="font-semibold flex items-center gap-1.5">
                    <RefreshCw className="size-4 shrink-0" />
                    <span>Permuta / Troca Direta</span>
                  </p>
                  <p className="mt-1 text-[11px] opacity-90">
                    O anúncio será classificado como troca direta. Especifique na seção de pagamento o que você aceita em contrapartida.
                  </p>
                </div>
              )}

              {pricingType === "free" && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Tag className="size-4 shrink-0" />
                    <span>Gratuito / Doação Solidária (R$ 0)</span>
                  </p>
                  <p className="mt-1 text-[11px] opacity-90">
                    Este item ou serviço será oferecido gratuitamente para a comunidade local.
                  </p>
                </div>
              )}

              {/* Aviso Legal / Disclaimer sobre o Valor */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs text-foreground font-medium">
                  Aviso sobre Valores / Flutuação
                </Label>
                <Select value={priceDisclaimer} onValueChange={setPriceDisclaimer}>
                  <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum aviso adicional</SelectItem>
                    <SelectItem value="demonstrative">Preço ilustrativo / demonstrativo (sob consulta)</SelectItem>
                    <SelectItem value="subject_to_availability">Sujeito à disponibilidade e estoque sem aviso prévio</SelectItem>
                    <SelectItem value="seasonal">Tarifa sazonal válida para baixa temporada / dias úteis</SelectItem>
                    <SelectItem value="exchange_rate">Sujeito a flutuação cambial e taxas governamentais</SelectItem>
                    <SelectItem value="custom">Aviso personalizado por extenso</SelectItem>
                  </SelectContent>
                </Select>
                {priceDisclaimer === "custom" && (
                  <Input
                    value={customDisclaimer}
                    onChange={(e) => setCustomDisclaimer(e.target.value)}
                    placeholder="Escreva o aviso que aparecerá na vitrine pública..."
                    className="h-10 rounded-xl text-xs bg-background mt-1.5"
                  />
                )}
              </div>
            </div>
 </div>

 {/* Seção 2: Especificações Técnicas do Anúncio */}
            {/* Viagens, Turismo & Resorts */}
            {niche.id === "viagem" && (
              <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-6 border border-border/60 shadow-2xs">
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    <Key className="size-4 text-primary shrink-0" />
                    <span>2. Detalhes da Viagem</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                    Vitrine Imersiva
                  </Badge>
                </div>

                {/* 2.1 — Resumo Rápido: Duração, Regime, Hóspedes */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Resumo do Pacote</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-medium">Duração (Ex: 5D / 4N)</Label>
                      <Input
                        value={travelDuration}
                        onChange={(e) => setTravelDuration(e.target.value)}
                        placeholder="5D / 4N"
                        className="h-11 rounded-xl text-xs bg-background font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-medium">Regime</Label>
                      <Select value={travelMealPlan} onValueChange={setTravelMealPlan}>
                        <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All Inclusive">All Inclusive (Tudo Incluso)</SelectItem>
                          <SelectItem value="Pensão Completa">Pensão Completa (Café, Almoço, Jantar)</SelectItem>
                          <SelectItem value="Meia Pensão">Meia Pensão (Café e Jantar)</SelectItem>
                          <SelectItem value="Café da Manhã">Café da Manhã Incluso</SelectItem>
                          <SelectItem value="Só Hospedagem">Só Hospedagem</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-medium">Hóspedes Indicados</Label>
                      <Input
                        value={travelGuests}
                        onChange={(e) => setTravelGuests(e.target.value)}
                        placeholder="Ex: 2 Adultos"
                        className="h-11 rounded-xl text-xs bg-background font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* 2.2 — Datas e Destino */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Datas e Destino</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-medium">Datas (texto livre)</Label>
                      <Input
                        value={travelDates}
                        onChange={(e) => setTravelDates(e.target.value)}
                        placeholder="Ex: 23/10 a 27/10/2026"
                        className="h-11 rounded-xl text-xs bg-background font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-medium">Cidade Destino (para clima real)</Label>
                      <Input
                        value={travelDestinationCity}
                        onChange={(e) => setTravelDestinationCity(e.target.value)}
                        placeholder="Ex: Jericoacoara, CE"
                        className="h-11 rounded-xl text-xs bg-background font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-medium">Data de Saída</Label>
                      <Input
                        type="date"
                        value={travelDepartureDate}
                        onChange={(e) => setTravelDepartureDate(e.target.value)}
                        className="h-11 rounded-xl text-xs bg-background font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-medium">Data de Retorno</Label>
                      <Input
                        type="date"
                        value={travelReturnDate}
                        onChange={(e) => setTravelReturnDate(e.target.value)}
                        className="h-11 rounded-xl text-xs bg-background font-medium"
                      />
                    </div>
                  </div>

                  {/* Preview do clima real via wttr.in */}
                  {travelDestinationCity && (
                    <WeatherWidget city={travelDestinationCity} className="mt-2" />
                  )}
                </div>

                {/* 2.3 — Transporte Adaptativo (Polimórfico) */}
                <div className="space-y-3">
                  {/* Seletor de Modo */}
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <RouteIcon className="size-3.5 text-primary" />
                      Logística de Transporte
                    </p>
                    <Badge variant="outline" className="text-[10px] font-mono text-primary bg-primary/10 border-primary/30">
                      {CANONICAL_TRANSPORT_TYPES.find(t => t.id === travelTransportType)?.label || "Selecione"}
                    </Badge>
                  </div>

                  {/* Chips de seleção de modo — visual, não dropdown */}
                  <div className="flex flex-wrap gap-2">
                    {CANONICAL_TRANSPORT_TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTravelTransportType(t.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer select-none",
                          travelTransportType === t.id
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-background border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* ── AÉREO ── */}
                  {travelTransportType === "airplane" && (
                    <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Plane className="size-3.5" /> Detalhes do Voo
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Aeroporto de Saída (IATA)</Label>
                          <Select value={travelDepartureIATA} onValueChange={setTravelDepartureIATA}>
                            <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                              <SelectValue placeholder="XAP — Chapecó, SC" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {CANONICAL_AIRPORTS.map((a) => (
                                <SelectItem key={a.iata} value={a.iata}>{airportLabel(a)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Aeroporto de Chegada (IATA)</Label>
                          <Select value={travelArrivalIATA} onValueChange={setTravelArrivalIATA}>
                            <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                              <SelectValue placeholder="FOR — Fortaleza, CE" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {CANONICAL_AIRPORTS.map((a) => (
                                <SelectItem key={a.iata} value={a.iata}>{airportLabel(a)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Companhia Aérea</Label>
                          <Select value={travelAirline} onValueChange={setTravelAirline}>
                            <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {CANONICAL_AIRLINES.map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Conexões / Escalas</Label>
                          <Select value={String(travelConnections)} onValueChange={(v) => setTravelConnections(Number(v))}>
                            <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">✈️ Voo Direto (sem escala)</SelectItem>
                              <SelectItem value="1">🔄 1 Conexão</SelectItem>
                              <SelectItem value="2">🔄 2 Conexões</SelectItem>
                              <SelectItem value="3">🔄 3+ Conexões</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Horário Embarque</Label>
                          <Input type="time" value={travelDepartureTime} onChange={(e) => setTravelDepartureTime(e.target.value)} className="h-11 rounded-xl text-xs bg-background font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Horário Chegada (Destino)</Label>
                          <Input type="time" value={travelArrivalTime} onChange={(e) => setTravelArrivalTime(e.target.value)} className="h-11 rounded-xl text-xs bg-background font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Estimativa de Preço do Aéreo</Label>
                          <Input value={travelFlightPrice} onChange={(e) => setTravelFlightPrice(e.target.value)} placeholder="Ex: R$ 1.139+" className="h-11 rounded-xl text-xs bg-background" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Duração do Voo</Label>
                          <Input value={travelFlightDuration} onChange={(e) => setTravelFlightDuration(e.target.value)} placeholder="Ex: 2h 15min" className="h-11 rounded-xl text-xs bg-background" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── TERRESTRE / EXCURSÃO ── */}
                  {travelTransportType === "bus" && (
                    <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Bus className="size-3.5" /> Excursão Rodoviária
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Categoria do Veículo</Label>
                          <Select value={travelBusCategory} onValueChange={setTravelBusCategory}>
                            <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                              <SelectValue placeholder="Selecione o tipo..." />
                            </SelectTrigger>
                            <SelectContent>
                              {CANONICAL_BUS_CATEGORIES.map((b) => (
                                <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Empresa / Fretadora</Label>
                          <Input value={travelBusCompany} onChange={(e) => setTravelBusCompany(e.target.value)} placeholder="Ex: Expresso Itapemirim, Fretur SC..." className="h-11 rounded-xl text-xs bg-background" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Cidade de Saída / Embarque (Origem)</Label>
                          <Input value={travelDepartureCity} onChange={(e) => setTravelDepartureCity(e.target.value)} placeholder="Ex: Chapecó, SC" className="h-11 rounded-xl text-xs bg-background" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Cidade de Destino da Viagem</Label>
                          <Input value={travelDestinationCity} onChange={(e) => setTravelDestinationCity(e.target.value)} placeholder="Ex: Beto Carrero / Penha, SC" className="h-11 rounded-xl text-xs bg-background" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Horário de Embarque (Saída)</Label>
                          <Input type="time" value={travelDepartureTime} onChange={(e) => setTravelDepartureTime(e.target.value)} className="h-11 rounded-xl text-xs bg-background font-mono" />
                        </div>
                        <div className="sm:col-span-2 space-y-1.5">
                          <Label className="text-xs font-medium">Ponto de Encontro / Embarque</Label>
                          <Input value={travelMeetingPoint} onChange={(e) => setTravelMeetingPoint(e.target.value)} placeholder="Ex: Posto Bertaso (Rod. SC-480), Chapecó — 22:00h" className="h-11 rounded-xl text-xs bg-background" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Horário Previsto de Retorno</Label>
                          <Input type="time" value={travelReturnDepartureTime} onChange={(e) => setTravelReturnDepartureTime(e.target.value)} className="h-11 rounded-xl text-xs bg-background font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Tempo Total de Percurso</Label>
                          <Input value={travelFlightDuration} onChange={(e) => setTravelFlightDuration(e.target.value)} placeholder="Ex: 12h (ida), 14h (volta)" className="h-11 rounded-xl text-xs bg-background" />
                        </div>
                      </div>

                      {/* Badges de Meios de Pagamento Aceitos na Prévia */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {acceptsPix && (
                          <Badge variant="secondary" className="text-[10px] font-medium gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                            <QrCode className="size-3 text-emerald-600" />
                            <span>PIX {pixDiscountPercent > 0 ? `(${pixDiscountPercent}% off)` : ""}</span>
                          </Badge>
                        )}
                        {acceptsCard && (
                          <Badge variant="secondary" className="text-[10px] font-medium gap-1 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                            <CreditCard className="size-3 text-blue-600" />
                            <span>Cartão até {maxInstallments}x</span>
                          </Badge>
                        )}
                        {acceptsBoleto && (
                          <Badge variant="secondary" className="text-[10px] font-medium gap-1 bg-muted/60 text-foreground">
                            <Receipt className="size-3 text-muted-foreground" />
                            <span>Boleto à vista</span>
                          </Badge>
                        )}
                        {acceptsBoletoInstallments && (
                          <Badge variant="secondary" className="text-[10px] font-medium gap-1 bg-amber-500/10 text-amber-800 dark:text-amber-200">
                            <FileSpreadsheet className="size-3 text-amber-600" />
                            <span>Boleto até {maxBoletoInstallments}x</span>
                          </Badge>
                        )}
                        {acceptsCarne && (
                          <Badge variant="secondary" className="text-[10px] font-medium gap-1 bg-primary/10 text-primary">
                            <BookOpenCheck className="size-3 text-primary" />
                            <span>Carnê da Loja até {maxCarneInstallments}x</span>
                          </Badge>
                        )}
                        {acceptsCash && (
                          <Badge variant="secondary" className="text-[10px] font-medium gap-1 bg-slate-500/10 text-slate-700 dark:text-slate-300">
                            <Banknote className="size-3 text-slate-600" />
                            <span>Dinheiro</span>
                          </Badge>
                        )}
                        {acceptsTrade && (
                          <Badge variant="secondary" className="text-[10px] font-medium gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            <RefreshCw className="size-3 text-amber-600" />
                            <span>Aceita Troca</span>
                          </Badge>
                        )}
                        {acceptsFinancing && (
                          <Badge variant="secondary" className="text-[10px] font-medium gap-1 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                            <Landmark className="size-3 text-indigo-600" />
                            <span>Financiamento</span>
                          </Badge>
                        )}
                      </div>

                      {/* Embarques na Rota (Gateways) */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Navigation className="size-3.5 text-primary" />
                          Pontos de Embarque na Rota
                        </Label>
                        <p className="text-[10px] text-muted-foreground">Cidades ou paradas onde passageiros embarcam ao longo da rota (em ordem).</p>
                        <div className="flex gap-2">
                          <Input
                            value={travelBoardingGatewayInput}
                            onChange={(e) => setTravelBoardingGatewayInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddGateway(); } }}
                            placeholder="Ex: Xaxim, Xanxerê, Joaçaba..."
                            className="h-9 rounded-xl text-xs bg-background flex-1"
                          />
                          <Button type="button" variant="outline" size="sm" onClick={handleAddGateway} className="h-9 px-3 rounded-xl text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5 cursor-pointer">
                            + Adicionar
                          </Button>
                        </div>
                        {travelBoardingGateways.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {travelBoardingGateways.map((gw) => (
                              <span key={gw} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-medium text-primary">
                                <Navigation className="size-2.5" />
                                {gw}
                                <button type="button" onClick={() => handleRemoveGateway(gw)} className="size-3.5 hover:bg-destructive/20 rounded-full flex items-center justify-center ml-0.5">
                                  <X className="size-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Serviço de Guia */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Serviço de Guia Turístico</Label>
                        <Select value={travelGuideService} onValueChange={setTravelGuideService}>
                          <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                            <SelectValue placeholder="Selecione o serviço de guia..." />
                          </SelectTrigger>
                          <SelectContent>
                            {CANONICAL_GUIDE_SERVICES.map((g) => (
                              <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* ── MULTIMODAL / COMBO ── */}
                  {travelTransportType === "combo" && (
                    <div className="space-y-3">
                      {/* Leg 1: Voo */}
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                          <Plane className="size-3.5" /> Trecho 1 — Voo
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Aeroporto de Origem</Label>
                            <Select value={travelComboFromIATA} onValueChange={setTravelComboFromIATA}>
                              <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                                <SelectValue placeholder="XAP — Chapecó" />
                              </SelectTrigger>
                              <SelectContent className="max-h-72">
                                {CANONICAL_AIRPORTS.map((a) => (
                                  <SelectItem key={a.iata} value={a.iata}>{airportLabel(a)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Aeroporto de Desembarque (Gateway)</Label>
                            <Select value={travelComboToIATA} onValueChange={setTravelComboToIATA}>
                              <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                                <SelectValue placeholder="FOR — Fortaleza" />
                              </SelectTrigger>
                              <SelectContent className="max-h-72">
                                {CANONICAL_AIRPORTS.map((a) => (
                                  <SelectItem key={a.iata} value={a.iata}>{airportLabel(a)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Companhia Aérea</Label>
                            <Select value={travelComboAirline} onValueChange={setTravelComboAirline}>
                              <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                {CANONICAL_AIRLINES.map((a) => (
                                  <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Estimativa do Aéreo</Label>
                            <Input value={travelComboFlightPrice} onChange={(e) => setTravelComboFlightPrice(e.target.value)} placeholder="Ex: R$ 1.139+" className="h-11 rounded-xl text-xs bg-background" />
                          </div>
                        </div>
                      </div>
                      {/* Leg 2: Transfer */}
                      <div className="rounded-2xl border border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/10 p-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <RouteIcon className="size-3.5" /> Trecho 2 — Transfer Terrestre / Marítimo
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Veículo do Transfer</Label>
                            <Select value={travelTransferVehicle} onValueChange={setTravelTransferVehicle}>
                              <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                                <SelectValue placeholder="Ex: 4x4 Hilux, Van..." />
                              </SelectTrigger>
                              <SelectContent>
                                {CANONICAL_TRANSFER_VEHICLES.map((v) => (
                                  <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Duração do Transfer</Label>
                            <Input value={travelTransferDuration} onChange={(e) => setTravelTransferDuration(e.target.value)} placeholder="Ex: 4h, 2h30min" className="h-11 rounded-xl text-xs bg-background" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">De (Ponto de Partida do Transfer)</Label>
                            <Input value={travelTransferFrom} onChange={(e) => setTravelTransferFrom(e.target.value)} placeholder="Ex: Fortaleza (Aeroporto FOR)" className="h-11 rounded-xl text-xs bg-background" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Até (Destino Final)</Label>
                            <Input value={travelTransferTo} onChange={(e) => setTravelTransferTo(e.target.value)} placeholder="Ex: Jericoacoara, CE" className="h-11 rounded-xl text-xs bg-background" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Horário Saída do Transfer</Label>
                            <Input type="time" value={travelTransferTime} onChange={(e) => setTravelTransferTime(e.target.value)} className="h-11 rounded-xl text-xs bg-background font-mono" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Serviço de Guia no Destino</Label>
                            <Select value={travelGuideService} onValueChange={setTravelGuideService}>
                              <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                                <SelectValue placeholder="Serviço de guia..." />
                              </SelectTrigger>
                              <SelectContent>
                                {CANONICAL_GUIDE_SERVICES.map((g) => (
                                  <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-2 space-y-1.5">
                            <Label className="text-xs font-medium">Observações do Roteiro Multimodal</Label>
                            <Input value={travelComboNotes} onChange={(e) => setTravelComboNotes(e.target.value)} placeholder="Ex: Transfer privativo, recomendamos cabine com mochila 30L..." className="h-11 rounded-xl text-xs bg-background" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── CRUZEIRO ── */}
                  {travelTransportType === "cruise" && (
                    <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Ship className="size-3.5" /> Detalhes do Cruzeiro
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Nome do Navio</Label>
                          <Input value={travelShipName} onChange={(e) => setTravelShipName(e.target.value)} placeholder="Ex: MSC Grandiosa" className="h-11 rounded-xl text-xs bg-background" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Armadora / Linha de Cruzeiros</Label>
                          <Input value={travelCruiseLine} onChange={(e) => setTravelCruiseLine(e.target.value)} placeholder="Ex: MSC Cruzeiros, Costa Cruceros..." className="h-11 rounded-xl text-xs bg-background" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Categoria da Cabine</Label>
                          <Input value={travelCabinCategory} onChange={(e) => setTravelCabinCategory(e.target.value)} placeholder="Ex: Cabine Interior, Balcão, Suite" className="h-11 rounded-xl text-xs bg-background" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Porto de Embarque</Label>
                          <Input value={travelEmbarkationPort} onChange={(e) => setTravelEmbarkationPort(e.target.value)} placeholder="Ex: Terminal de Passageiros Santos, SP" className="h-11 rounded-xl text-xs bg-background" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Horário Embarque</Label>
                          <Input type="time" value={travelDepartureTime} onChange={(e) => setTravelDepartureTime(e.target.value)} className="h-11 rounded-xl text-xs bg-background font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Duração da Cruzeiro</Label>
                          <Input value={travelFlightDuration} onChange={(e) => setTravelFlightDuration(e.target.value)} placeholder="Ex: 7 noites, 8 dias" className="h-11 rounded-xl text-xs bg-background" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── TREM ── */}
                  {travelTransportType === "train" && (
                    <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Train className="size-3.5" /> Detalhes do Trem
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Estação de Partida</Label>
                          <Input value={travelMeetingPoint} onChange={(e) => setTravelMeetingPoint(e.target.value)} placeholder="Ex: Estação da Luz — São Paulo, SP" className="h-11 rounded-xl text-xs bg-background" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Horário de Partida</Label>
                          <Input type="time" value={travelDepartureTime} onChange={(e) => setTravelDepartureTime(e.target.value)} className="h-11 rounded-xl text-xs bg-background font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Classe / Categoria</Label>
                          <Input value={travelBusCategory} onChange={(e) => setTravelBusCategory(e.target.value)} placeholder="Ex: Classe Econômica, Primeira Classe..." className="h-11 rounded-xl text-xs bg-background" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Duração do Percurso</Label>
                          <Input value={travelFlightDuration} onChange={(e) => setTravelFlightDuration(e.target.value)} placeholder="Ex: 3h 40min" className="h-11 rounded-xl text-xs bg-background" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── CARRO PRÓPRIO / HOTEL ONLY ── (sem logística de transporte) */}
                  {(travelTransportType === "car" || travelTransportType === "hotel_only") && (
                    <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
                      <p className="text-xs text-muted-foreground">
                        {travelTransportType === "car"
                          ? "🚗 O passageiro viajará de carro próprio ou alugado até o destino. Preencha o roteiro e hospedagem abaixo."
                          : "🏨 Pacote local / hospedagem + passeios. Transporte até o destino por conta do passageiro."}
                      </p>
                      <div className="mt-3 space-y-1.5">
                        <Label className="text-xs font-medium">Ponto de Check-in / Encontro no Destino</Label>
                        <Input value={travelMeetingPoint} onChange={(e) => setTravelMeetingPoint(e.target.value)} placeholder="Ex: Hotel Costa Brava — Recepção — 14:00h" className="h-11 rounded-xl text-xs bg-background" />
                      </div>
                    </div>
                  )}

                  {/* ── MÚLTIPLAS SAÍDAS / DATAS ── */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-primary" />
                        Saídas Confirmadas
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddDeparture}
                        className="h-7 text-xs font-semibold rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
                      >
                        <Plus className="size-3.5" /> Adicionar Saída
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Cadastre múltiplas datas de saída. O cliente verá todas as opções disponíveis no anúncio.</p>

                    {travelDepartureOptions.length === 0 && (
                      <p className="text-[11px] text-muted-foreground py-2 text-center border border-dashed border-border/50 rounded-xl">
                        Nenhuma saída cadastrada — as datas acima serão usadas como saída única.
                      </p>
                    )}

                    <div className="space-y-2">
                      {travelDepartureOptions.map((opt, idx) => (
                        <div key={opt.id} className="rounded-xl border border-border/50 bg-card p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-foreground">Saída {idx + 1}</span>
                            <button type="button" onClick={() => handleRemoveDeparture(opt.id)} className="size-6 rounded-lg text-destructive hover:bg-destructive/10 flex items-center justify-center">
                              <X className="size-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-muted-foreground">Label (Opcional)</label>
                              <input type="text" value={opt.label || ""} onChange={(e) => handleUpdateDeparture(opt.id, { label: e.target.value })} placeholder="Ex: Carnaval 2026" className="w-full h-8 px-2 rounded-lg border border-border/60 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-muted-foreground">Data de Saída</label>
                              <input type="date" value={opt.departure_date} onChange={(e) => handleUpdateDeparture(opt.id, { departure_date: e.target.value })} className="w-full h-8 px-2 rounded-lg border border-border/60 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-muted-foreground">Data de Retorno</label>
                              <input type="date" value={opt.return_date} onChange={(e) => handleUpdateDeparture(opt.id, { return_date: e.target.value })} className="w-full h-8 px-2 rounded-lg border border-border/60 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-muted-foreground">Status</label>
                              <select value={opt.status} onChange={(e) => handleUpdateDeparture(opt.id, { status: e.target.value as DepartureStatus })} className="w-full h-8 px-2 rounded-lg border border-border/60 bg-background text-[11px] focus:outline-none focus:ring-1 focus:ring-primary">
                                {(Object.keys(DEPARTURE_STATUS_CONFIG) as DepartureStatus[]).map((s) => (
                                  <option key={s} value={s}>{DEPARTURE_STATUS_CONFIG[s].icon} {DEPARTURE_STATUS_CONFIG[s].label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-muted-foreground">Horário Embarque</label>
                              <input type="time" value={opt.departure_time || ""} onChange={(e) => handleUpdateDeparture(opt.id, { departure_time: e.target.value })} className="w-full h-8 px-2 rounded-lg border border-border/60 bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-muted-foreground">Vagas Disponíveis</label>
                              <input type="number" min={0} value={opt.available_seats ?? ""} onChange={(e) => handleUpdateDeparture(opt.id, { available_seats: e.target.value ? Number(e.target.value) : undefined })} placeholder="Ex: 42" className="w-full h-8 px-2 rounded-lg border border-border/60 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-medium text-muted-foreground">Observação</label>
                              <input type="text" value={opt.notes || ""} onChange={(e) => handleUpdateDeparture(opt.id, { notes: e.target.value })} placeholder="Ex: Pacote diferenciado" className="w-full h-8 px-2 rounded-lg border border-border/60 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2.4 — Diferenciais (Bio Bullets) */}
                {/* 2.4 — Diferenciais do Pacote (Campos Livres Dinâmicos) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Diferenciais do Pacote
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Campos livres dinâmicos. Adicione quantos diferenciais e benefícios desejar.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTravelBullet}
                      className="h-7 text-xs font-semibold rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>Adicionar</span>
                    </Button>
                  </div>

                  {/* Lista Dinâmica de Campos Livres */}
                  <div className="space-y-2">
                    {travelBioBullets.map((bullet, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground w-4 text-center shrink-0">
                          {idx + 1}.
                        </span>
                        <Input
                          value={bullet}
                          onChange={(e) => handleUpdateTravelBullet(idx, e.target.value)}
                          placeholder={`Diferencial ${idx + 1} (ex: All Inclusive, Voo Incluso, Pé na Areia, Vista Panorâmica...)`}
                          className="h-9 rounded-xl text-xs bg-background flex-1"
                        />
                        <div className="flex items-center gap-0.5 shrink-0">
                          {travelBioBullets.length > 1 && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={idx === 0}
                                onClick={() => handleMoveTravelBullet(idx, "up")}
                                className="h-8 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                                title="Mover para cima"
                                aria-label="Mover para cima"
                              >
                                <ChevronUp className="size-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={idx === travelBioBullets.length - 1}
                                onClick={() => handleMoveTravelBullet(idx, "down")}
                                className="h-8 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                                title="Mover para baixo"
                                aria-label="Mover para baixo"
                              >
                                <ChevronDown className="size-3" />
                              </Button>
                            </>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTravelBullet(idx)}
                            className="h-8 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            title={travelBioBullets.length === 1 ? "Limpar campo" : "Remover diferencial"}
                            aria-label="Remover diferencial"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddTravelBullet}
                      className="w-full h-8 text-xs font-medium border-dashed border-border/70 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary rounded-xl gap-1.5 cursor-pointer mt-1"
                    >
                      <Plus className="size-3.5" />
                      <span>Adicionar outro diferencial</span>
                    </Button>
                  </div>

                  {/* Sugestões Rápidas de Emojis / Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-muted-foreground font-medium">Sugestões rápidas:</span>
                    {[
                      "🌴 All Inclusive",
                      "☕ Café da Manhã Incluso",
                      "✈️ Aéreo Ida e Volta",
                      "🚗 Transfer In/Out",
                      "🏖️ Pé na Areia",
                      "🏊 Piscina Aquecida",
                      "⭐ Suíte com Vista",
                      "🎟️ Ingressos Inclusos",
                      "📶 Wi-Fi Alta Velocidade",
                      "🍹 Open Bar Nacional",
                    ].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => {
                          setTravelBioBullets((prev) => {
                            if (prev.length > 0 && !prev[prev.length - 1].trim()) {
                              const next = [...prev];
                              next[next.length - 1] = sug;
                              return next;
                            }
                            return [...prev, sug];
                          });
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-lg border border-border/60 bg-muted/40 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors cursor-pointer text-muted-foreground"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2.5 — Parcelamento */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-foreground font-medium flex items-center gap-1.5">
                      <CreditCard className="size-3.5 text-primary" />
                      <span>Máximo de Parcelas</span>
                    </Label>
                    <span className="text-xs font-black text-primary font-mono">{travelMaxInstallments}x</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={24}
                    step={1}
                    value={travelMaxInstallments}
                    onChange={(e) => setTravelMaxInstallments(Number(e.target.value))}
                    className="w-full h-2 rounded-full accent-primary cursor-pointer"
                    aria-label="Máximo de parcelas"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>1x</span>
                    <span>6x</span>
                    <span>12x</span>
                    <span>18x</span>
                    <span>24x</span>
                  </div>
                </div>

                {/* 2.6 — Story Highlights */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ImagePlus className="size-3.5 text-primary" />
                    <span>Destaques Visuais</span>
                  </p>
                  <StoryHighlightUploader
                    highlights={travelStoryHighlights}
                    onChange={setTravelStoryHighlights}
                    onUpload={(file) => uploadClassifiedMedia(file, "highlights")}
                    maxHighlights={8}
                  />
                </div>

                {/* 2.7 — Roteiro Dia a Dia */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Roteiro Dia a Dia</p>
                  <ItineraryDayEditor
                    days={travelItineraryDays}
                    onChange={setTravelItineraryDays}
                    onUploadImage={(file) => uploadClassifiedMedia(file, "itinerary")}
                  />
                </div>
              </div>
            )}

            {/* Destaques Visuais em Vitrine Imersiva */}
            {niche.id !== "viagem" && (templateStyle === "editorial" || (templateStyle as string) === "instagram") && (
              <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    <ImagePlus className="size-4 text-primary shrink-0" />
                    <span>Destaques Visuais</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-primary bg-primary/10 border-primary/30">
                    Vitrine Imersiva
                  </Badge>
                </div>
                                <StoryHighlightUploader
                  highlights={travelStoryHighlights}
                  onChange={setTravelStoryHighlights}
                  onUpload={(file) => uploadClassifiedMedia(file, "highlights")}
                  maxHighlights={8}
                />
              </div>
            )}

            {/* Aluguel de Equipamentos */}
            {niche.id === "equipamento" && (
              <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    <Wrench className="size-4 text-primary shrink-0" />
                    <span>2. Equipamento</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                    Aluguel / Eventos
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-medium">Período Base</Label>
                    <Select value={equipmentPeriod} onValueChange={(v: any) => setEquipmentPeriod(v)}>
                      <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diaria">Por Diária (24h)</SelectItem>
                        <SelectItem value="evento">Por Evento (Fim de Semana)</SelectItem>
                        <SelectItem value="semanal">Semanal (7 Dias)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-medium">Valor do Caução / Garantia (R$)</Label>
                    <CurrencyField
                      value={equipmentDepositCents}
                      onChange={setEquipmentDepositCents}
                      placeholder="0,00"
                      className="h-11 rounded-xl text-xs bg-background"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Hospedagem & Temporada */}
            {niche.id === "hospedagem" && (
              <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    <Key className="size-4 text-primary shrink-0" />
 <span>2. Hospedagem</span>
 </div>
 <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
 Temporada / Diária
 </Badge>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Tipo de Estadia</Label>
 <Select value={hospPropertyType} onValueChange={setHospPropertyType}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Chalé / Cabana">Chalé / Cabana na Serra</SelectItem>
 <SelectItem value="Apartamento Inteiro">Apartamento Inteiro</SelectItem>
 <SelectItem value="Casa de Campo / Sítio">Casa de Campo / Sítio</SelectItem>
 <SelectItem value="Casa de Praia">Casa de Praia</SelectItem>
 <SelectItem value="Loft / Studio Moderno">Loft / Studio Moderno</SelectItem>
 <SelectItem value="Quarto Privativo">Quarto Privativo em Residência</SelectItem>
 <SelectItem value="Pousada / Suíte">Pousada / Suíte Master</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Modalidade de Check-in</Label>
 <Select value={hospCheckinType} onValueChange={(v: any) => setHospCheckinType(v)}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="self_checkin">🔑 Self Check-in (Fechadura Eletrônica / Cofre)</SelectItem>
 <SelectItem value="presential">🤝 Check-in Presencial com o Anfitrião</SelectItem>
 <SelectItem value="front_desk">🏢 Portaria / Recepção 24h</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Hóspedes Máx.</Label>
 <Input
 value={hospGuests}
 onChange={(e) => setHospGuests(e.target.value)}
 placeholder="4"
 className="h-11 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Quartos</Label>
 <Input
 value={hospBedrooms}
 onChange={(e) => setHospBedrooms(e.target.value)}
 placeholder="1"
 className="h-11 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Banheiros</Label>
 <Input
 value={hospBathrooms}
 onChange={(e) => setHospBathrooms(e.target.value)}
 placeholder="1"
 className="h-11 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Taxa de Limpeza (R$)</Label>
 <CurrencyField
 value={hospCleaningFeeCents}
 onChange={setHospCleaningFeeCents}
 placeholder="0,00"
 className="h-11 rounded-xl text-xs bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Horário Check-in</Label>
 <Input
 value={hospCheckinTime}
 onChange={(e) => setHospCheckinTime(e.target.value)}
 placeholder="14:00"
 className="h-11 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Horário Check-out</Label>
 <Input
 value={hospCheckoutTime}
 onChange={(e) => setHospCheckoutTime(e.target.value)}
 placeholder="11:00"
 className="h-11 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>

              {/* Comodidades Selecionáveis em Sub-Card com Borda Mínima */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground tracking-tight">Comodidades Disponíveis</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">{hospAmenities.length} selecionada(s)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Array.from(
                    new Set([
                      "Wi-Fi Alta Velocidade",
                      "Ar-condicionado",
                      "Lareira",
                      "Jacuzzi / Hidro",
                      "Cozinha Equipada",
                      "Vista Panorâmica",
                      "Pet Friendly",
                      "Estacionamento Gratuito",
                      "Churrasqueira",
                      "Piscina Privativa",
                      "Roupa de Cama & Banho",
                      "Espaço Home Office",
                      ...hospAmenities,
                    ])
                  ).map((amenity) => {
                    const active = hospAmenities.includes(amenity);
                    return (
                      <div
                        key={amenity}
                        onClick={() => toggleItem(hospAmenities, setHospAmenities, amenity)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition-all min-h-[44px] ${
                          active
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border/50 bg-background text-foreground/80 hover:text-foreground hover:bg-muted/30"
                        }`}
                      >
                        <Checkbox checked={active} />
                        <span className="truncate">{amenity}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={customHospAmenity}
                    onChange={(e) => setCustomHospAmenity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (customHospAmenity.trim() && !hospAmenities.includes(customHospAmenity.trim())) {
                          setHospAmenities([...hospAmenities, customHospAmenity.trim()]);
                          setCustomHospAmenity("");
                        }
                      }
                    }}
                    placeholder="Adicionar outra comodidade ou diferencial..."
                    className="h-9 rounded-xl text-xs bg-background flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (customHospAmenity.trim() && !hospAmenities.includes(customHospAmenity.trim())) {
                        setHospAmenities([...hospAmenities, customHospAmenity.trim()]);
                        setCustomHospAmenity("");
                      }
                    }}
                    className="h-9 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    + Adicionar
                  </Button>
                </div>
              </div>

              {/* Regras da Casa em Sub-Card com Borda Mínima */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground tracking-tight">Regras da Hospedagem</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">{hospRules.length} ativa(s)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Permitido Pets",
                    "Proibido Fumar",
                    "Festas / Eventos Não Permitidos",
                    "Silêncio após às 22h",
                  ].map((rule) => {
                    const active = hospRules.includes(rule);
                    return (
                      <div
                        key={rule}
                        onClick={() => toggleItem(hospRules, setHospRules, rule)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition-all min-h-[44px] ${
                          active
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border/50 bg-background text-foreground/80 hover:text-foreground hover:bg-muted/30"
                        }`}
                      >
                        <Checkbox checked={active} />
                        <span className="truncate">{rule}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
 </div>
 )}

 {/* Imóvel */}
 {niche.id === "imovel" && (
              <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-2.5 border-b border-border/40">
                  <HomeIcon className="size-4 text-primary shrink-0" />
 <span>2. Imóvel</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Operação</Label>
 <Select value={reDealType} onValueChange={(v: any) => setReDealType(v)}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="aluguel">Aluguel Mensal</SelectItem>
 <SelectItem value="venda">Venda</SelectItem>
 <SelectItem value="temporada">Temporada</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Tipo de Imóvel</Label>
 <Input
 value={rePropertyType}
 onChange={(e) => setRePropertyType(e.target.value)}
 placeholder="Apartamento, Casa, etc."
 className="h-11 rounded-xl text-xs bg-background"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Área Útil (m²)</Label>
 <Input
 value={reAreaSqm}
 onChange={(e) => setReAreaSqm(e.target.value)}
 placeholder="75"
 className="h-11 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Quartos</Label>
 <Input
 value={reBedrooms}
 onChange={(e) => setReBedrooms(e.target.value)}
 placeholder="2"
 className="h-11 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Vagas Garagem</Label>
 <Input
 value={reParking}
 onChange={(e) => setReParking(e.target.value)}
 placeholder="1"
 className="h-11 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Condomínio (R$)</Label>
 <CurrencyField
 value={reCondoCents}
 onChange={setReCondoCents}
 placeholder="0,00"
 className="h-11 rounded-xl text-xs bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">IPTU Mensal (R$)</Label>
 <CurrencyField
 value={reIptuCents}
 onChange={setReIptuCents}
 placeholder="0,00"
 className="h-11 rounded-xl text-xs bg-background"
 />
 </div>
 </div>

 {/* Comodidades & Diferenciais do Imóvel */}
 <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-3 pt-2">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-semibold text-foreground tracking-tight">Comodidades & Infraestrutura do Imóvel</Label>
 <span className="text-[10px] text-muted-foreground font-mono">{reAmenities.length} selecionada(s)</span>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
 {Array.from(
 new Set([
 "Varanda Gourmet / Churrasqueira",
 "Piscina Aquecida / Privativa",
 "Portaria 24h & Biometria",
 "Elevador Social & Serviço",
 "Academia Completa / Fitness",
 "Salão de Festas Climatizado",
 "Playground / Brinquedoteca",
 "Espaço Pet / Pet Place",
 "Bicicletário",
 "Energia Solar / Sustentável",
 "Armários Embutidos",
 "Ar-condicionado Split",
 ...reAmenities,
 ])
 ).map((amenity) => {
 const active = reAmenities.includes(amenity);
 return (
 <div
 key={amenity}
 onClick={() => toggleItem(reAmenities, setReAmenities, amenity)}
 className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition-all min-h-[44px] ${
 active
 ? "border-primary bg-primary/10 text-primary font-medium"
 : "border-border/50 bg-background text-foreground/80 hover:text-foreground hover:bg-muted/30"
 }`}
 >
 <Checkbox checked={active} />
 <span className="truncate">{amenity}</span>
 </div>
 );
 })}
 </div>
 <div className="flex items-center gap-2 pt-1">
 <Input
 value={customReAmenity}
 onChange={(e) => setCustomReAmenity(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 if (customReAmenity.trim() && !reAmenities.includes(customReAmenity.trim())) {
 setReAmenities([...reAmenities, customReAmenity.trim()]);
 setCustomReAmenity("");
 }
 }
 }}
 placeholder="Adicionar diferencial do imóvel..."
 className="h-9 rounded-xl text-xs bg-background flex-1"
 />
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => {
 if (customReAmenity.trim() && !reAmenities.includes(customReAmenity.trim())) {
 setReAmenities([...reAmenities, customReAmenity.trim()]);
 setCustomReAmenity("");
 }
 }}
 className="h-9 rounded-xl text-xs font-semibold cursor-pointer"
 >
 + Adicionar
 </Button>
 </div>
 </div>
 </div>
 )}

 {/* Veículo */}
              {niche.id === "veiculo" && (
            <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Car className="size-4 text-primary" />
 <span>2. Veículo</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Marca *</Label>
 <Input
 value={vehicleBrand}
 onChange={(e) => setVehicleBrand(e.target.value)}
 placeholder="Ex: Honda, Toyota, VW"
 className="h-11 rounded-xl text-xs bg-background"
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Modelo *</Label>
 <Input
 value={vehicleModel}
 onChange={(e) => setVehicleModel(e.target.value)}
 placeholder="Ex: Civic, Corolla, Golf"
 className="h-11 rounded-xl text-xs bg-background"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Ano Fab.</Label>
 <Input
 value={vehicleYearFab}
 onChange={(e) => setVehicleYearFab(e.target.value)}
 placeholder="2021"
 className="h-11 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Ano Mod.</Label>
 <Input
 value={vehicleYearModel}
 onChange={(e) => setVehicleYearModel(e.target.value)}
 placeholder="2022"
 className="h-11 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] text-muted-foreground">Km Atual</Label>
 <Input
 value={vehicleKm}
 onChange={(e) => setVehicleKm(e.target.value)}
 placeholder="45.000"
 className="h-11 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Câmbio</Label>
 <Select value={vehicleTransmission} onValueChange={setVehicleTransmission}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Manual">Manual</SelectItem>
 <SelectItem value="Automático">Automático</SelectItem>
 <SelectItem value="CVT">CVT</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Combustível</Label>
 <Select value={vehicleFuel} onValueChange={setVehicleFuel}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Flex">Flex (Álcool/Gasolina)</SelectItem>
 <SelectItem value="Gasolina">Gasolina</SelectItem>
 <SelectItem value="Diesel">Diesel</SelectItem>
 <SelectItem value="Híbrido">Híbrido</SelectItem>
 <SelectItem value="Elétrico">Elétrico</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Opcionais & Diferenciais do Veículo */}
 <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-3 pt-2">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-semibold text-foreground tracking-tight">Opcionais & Diferenciais do Veículo</Label>
 <span className="text-[10px] text-muted-foreground font-mono">{vehicleFeatures.length} selecionado(s)</span>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
 {Array.from(
 new Set([
 ...CANONICAL_VEHICLE_OPTIONS,
 ...vehicleFeatures,
 ])
 ).map((opt) => {
 const active = vehicleFeatures.includes(opt);
 return (
 <div
 key={opt}
 onClick={() => toggleItem(vehicleFeatures, setVehicleFeatures, opt)}
 className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition-all min-h-[44px] ${
 active
 ? "border-primary bg-primary/10 text-primary font-medium"
 : "border-border/50 bg-background text-foreground/80 hover:text-foreground hover:bg-muted/30"
 }`}
 >
 <Checkbox checked={active} />
 <span className="truncate">{opt}</span>
 </div>
 );
 })}
 </div>
 <div className="flex items-center gap-2 pt-1">
 <Input
 value={customVehicleOption}
 onChange={(e) => setCustomVehicleOption(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 if (customVehicleOption.trim() && !vehicleFeatures.includes(customVehicleOption.trim())) {
 setVehicleFeatures([...vehicleFeatures, customVehicleOption.trim()]);
 setCustomVehicleOption("");
 }
 }
 }}
 placeholder="Adicionar outro opcional do veículo (ex: Engate, Vitrificação)..."
                        className="h-9 rounded-xl text-xs bg-background flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (customVehicleOption.trim() && !vehicleFeatures.includes(customVehicleOption.trim())) {
                            setVehicleFeatures([...vehicleFeatures, customVehicleOption.trim()]);
                            setCustomVehicleOption("");
                          }
                        }}
                        className="h-9 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        + Adicionar
                      </Button>
                    </div>
                  </div>

                  {/* Procedência & Histórico do Veículo */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground tracking-tight">Procedência & Histórico</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{vehicleProvenance.length} selecionado(s)</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {CANONICAL_VEHICLE_PROVENANCE.map((prov) => {
                        const active = vehicleProvenance.includes(prov);
                        return (
                          <div
                            key={prov}
                            onClick={() => toggleItem(vehicleProvenance, setVehicleProvenance, prov)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition-all min-h-[44px] ${
                              active
                                ? "border-primary bg-primary/10 text-primary font-medium"
                                : "border-border/50 bg-background text-foreground/80 hover:text-foreground hover:bg-muted/30"
                            }`}
                          >
                            <Checkbox checked={active} />
                            <span className="truncate">{prov}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Serviço Profissional */}
              {niche.id === "servico" && (
            <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                    <Wrench className="size-4 text-primary" />
                    <span>2. Parâmetros do Serviço & Conselho</span>
                  </div>

                  {/* Sub-nicho Canônico Especializado com Smart Cascade Pills */}
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-medium">Segmento / Sub-nicho Profissional *</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {CANONICAL_SERVICE_SUBNICHES.map((sub) => {
                        const isSelected = serviceSubNiche === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setServiceSubNiche(sub.id);
                              if (sub.specialties.length > 0) {
                                setServiceSpecialty(sub.specialties[0]);
                              }
                            }}
                            className={cn(
                              "h-8 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all active:scale-95 border flex items-center gap-1.5",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                                : "bg-background text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/40"
                            )}
                          >
                            <span>{sub.label}</span>
                            <span className="text-[10px] opacity-75 font-mono">({sub.councilName})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Registro em Conselho & Especialidade */}
                  {(() => {
                    const matchedSub = CANONICAL_SERVICE_SUBNICHES.find((s) => s.id === serviceSubNiche);
                    if (!matchedSub) return null;
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/60">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-foreground font-medium flex items-center gap-1.5">
                            <ShieldCheck className="size-3.5 text-primary" />
                            <span>{matchedSub.councilFieldLabel}</span>
                          </Label>
                          <Input
                            value={serviceProfessionalCouncil}
                            onChange={(e) => setServiceProfessionalCouncil(e.target.value)}
                            placeholder={matchedSub.councilPlaceholder}
                            className="h-11 rounded-xl text-xs bg-background font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-foreground font-medium">Especialidade Principal</Label>
                          <Select value={serviceSpecialty} onValueChange={setServiceSpecialty}>
                            <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
                              <SelectValue placeholder="Selecione sua especialidade" />
                            </SelectTrigger>
                            <SelectContent>
                              {matchedSub.specialties.map((spec) => (
                                <SelectItem key={spec} value={spec}>
                                  {spec}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-medium">Modalidade de Atendimento</Label>
                      <Select value={serviceModality} onValueChange={(v: any) => setServiceModality(v)}>
                        <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="presencial">Presencial no Local do Cliente</SelectItem>
                          <SelectItem value="domicilio">Atendimento a Domicílio</SelectItem>
                          <SelectItem value="remoto">Remoto / Online</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-medium">Tipo de Cobrança</Label>
                      <Select value={servicePricingType} onValueChange={(v: any) => setServicePricingType(v)}>
                        <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixo">Preço Fixo</SelectItem>
                          <SelectItem value="por_hora">Por Hora Trabalhada</SelectItem>
                          <SelectItem value="a_combinar">Sob Orçamento Técnico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-medium">Área de Cobertura / Região</Label>
                      <Input
                        value={serviceArea}
                        onChange={(e) => setServiceArea(e.target.value)}
                        placeholder="Ex: Chapecó e raio de até 50km"
                        className="h-11 rounded-xl text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-medium">Tempo Médio / Estimativa</Label>
                      <Input
                        value={serviceDuration}
                        onChange={(e) => setServiceDuration(e.target.value)}
                        placeholder="Ex: 2 a 4 horas / 1 dia útil"
                        className="h-11 rounded-xl text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground tracking-tight">Diferenciais do Profissional</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{reAmenities.length} selecionado(s)</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Array.from(
                        new Set([
                          "Orçamento Gratuito",
                          "Emite Nota Fiscal (PJ)",
                          "Garantia de 90 dias",
                          "Atendimento Emergencial",
                          "Profissional Certificado",
                          "Aceita Cartão & PIX",
                          "Materiais de 1ª Linha Inclusos",
                          "Atendimento aos Finais de Semana",
                          ...reAmenities,
                        ])
                      ).map((diff) => {
                        const active = reAmenities.includes(diff);
                        return (
                          <div
                            key={diff}
                            onClick={() => toggleItem(reAmenities, setReAmenities, diff)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition-all min-h-[44px] ${
                              active
                                ? "border-primary bg-primary/10 text-primary font-medium"
                                : "border-border/50 bg-background text-foreground/80 hover:text-foreground hover:bg-muted/30"
                            }`}
                          >
                            <Checkbox checked={active} />
                            <span className="truncate">{diff}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        value={customReAmenity}
                        onChange={(e) => setCustomReAmenity(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (customReAmenity.trim() && !reAmenities.includes(customReAmenity.trim())) {
                              setReAmenities([...reAmenities, customReAmenity.trim()]);
                              setCustomReAmenity("");
                            }
                          }
                        }}
                        placeholder="Adicionar outro diferencial profissional..."
                        className="h-9 rounded-xl text-xs bg-background flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (customReAmenity.trim() && !reAmenities.includes(customReAmenity.trim())) {
                            setReAmenities([...reAmenities, customReAmenity.trim()]);
                            setCustomReAmenity("");
                          }
                        }}
                        className="h-9 rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        + Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Gastronomia & Delivery Especializado */}
              {niche.id === "gastronomia" && (
                <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <Utensils className="size-4 text-primary" />
                      <span>2. Parâmetros Gastronômicos & Delivery</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold text-primary">
                      Culinária & Balcão
                    </Badge>
                  </div>

                  {/* Smart Cascade Pills para Gastronomia */}
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-medium">Sub-nicho Gastronômico *</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {CANONICAL_FOOD_SUBNICHES.map((food) => {
                        const isSelected = foodSubNiche === food.id;
                        return (
                          <button
                            key={food.id}
                            type="button"
                            onClick={() => {
                              setFoodSubNiche(food.id);
                              if (food.defaultPrepTime) {
                                setFoodPrepTime(food.defaultPrepTime);
                              }
                            }}
                            className={cn(
                              "h-8 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all active:scale-95 border flex items-center gap-1.5",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                                : "bg-background text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/40"
                            )}
                          >
                            <span>{food.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-medium">Tempo Médio de Preparo</Label>
                      <Input
                        value={foodPrepTime}
                        onChange={(e) => setFoodPrepTime(e.target.value)}
                        placeholder="Ex: 20-35 min"
                        className="h-11 rounded-xl text-xs bg-background"
                      />
                    </div>
                  </div>

                  {/* Canais de Atendimento & Entrega */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground tracking-tight">Canais de Atendimento & Entrega</Label>
                      <span className="text-[10px] text-muted-foreground font-mono">{foodDeliveryModes.length} ativo(s)</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: "delivery_proprio", label: "Delivery Próprio" },
                        { id: "motolink", label: "MotoLink / Entrega Flash" },
                        { id: "retirada_balcao", label: "Retirada no Balcão" },
                        { id: "consumo_local", label: "Consumo no Local" },
                      ].map((mode) => {
                        const active = foodDeliveryModes.includes(mode.id);
                        return (
                          <div
                            key={mode.id}
                            onClick={() => {
                              if (active) {
                                setFoodDeliveryModes(foodDeliveryModes.filter((m) => m !== mode.id));
                              } else {
                                setFoodDeliveryModes([...foodDeliveryModes, mode.id]);
                              }
                            }}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-xs cursor-pointer transition-all min-h-[44px]",
                              active
                                ? "border-primary bg-primary/10 text-primary font-medium"
                                : "border-border/50 bg-background text-foreground/80 hover:bg-muted/30"
                            )}
                          >
                            <Checkbox checked={active} />
                            <span className="truncate">{mode.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sugestões do Sub-nicho */}
                  {(() => {
                    const matched = CANONICAL_FOOD_SUBNICHES.find((f) => f.id === foodSubNiche);
                    if (!matched) return null;
                    return (
                      <div className="p-3 bg-muted/30 border border-border/40 rounded-xl space-y-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground block">Exemplos populares em {matched.label}:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {matched.suggestedItems.map((item) => (
                            <span key={item} className="text-[10px] bg-background border border-border/60 px-2 py-0.5 rounded-md text-foreground">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Mercado, Perecíveis, Açougue & Conveniência */}
              {niche.id === "mercado" && (
                <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-5 border border-border/60 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <StoreIcon className="size-4 text-primary" />
                      <span>2. Parâmetros de Mercado, Perecíveis & Conveniência</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                      Varejo Alimentar
                    </Badge>
                  </div>

                  {/* Seleção de Departamento de Supermercado / Mercearia */}
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-semibold flex items-center justify-between">
                      <span>Departamento do Produto *</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Selecione para ajustar atributos</span>
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                      {CANONICAL_GROCERY_DEPARTMENTS.map((dept) => {
                        const isSelected = groceryDepartment === dept.id;
                        return (
                          <button
                            key={dept.id}
                            type="button"
                            onClick={() => {
                              setGroceryDepartment(dept.id);
                              if (dept.defaultTemperature) {
                                setGroceryTemperature(dept.defaultTemperature);
                              }
                              if (dept.subCategories.length > 0) {
                                setGrocerySubCategory(dept.subCategories[0]);
                              }
                            }}
                            className={cn(
                              "p-2 rounded-xl text-xs font-medium text-left border cursor-pointer transition-all flex flex-col gap-0.5",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                                : "bg-background text-foreground/80 border-border/70 hover:bg-muted/30"
                            )}
                          >
                            <span className="truncate">{dept.label}</span>
                            <span className={cn("text-[10px] truncate", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                              {dept.badge}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sub-categoria contextual do departamento */}
                  {(() => {
                    const currentDept = CANONICAL_GROCERY_DEPARTMENTS.find((d) => d.id === groceryDepartment);
                    if (!currentDept || currentDept.subCategories.length === 0) return null;
                    return (
                      <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/40">
                        <Label className="text-xs font-semibold text-foreground">
                          Sub-categoria em {currentDept.label}:
                        </Label>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {currentDept.subCategories.map((sub) => {
                            const isSelected = grocerySubCategory === sub;
                            return (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => setGrocerySubCategory(sub)}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-all",
                                  isSelected
                                    ? "bg-primary/15 border-primary text-primary font-bold"
                                    : "bg-background border-border/60 text-foreground/80 hover:bg-muted/40"
                                )}
                              >
                                {sub}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Unidade de Medida & Fracionamento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-semibold">Unidade de Medida / Precificação *</Label>
                      <div className="flex flex-wrap gap-1">
                        {CANONICAL_UNIT_TYPES.map((u) => {
                          const isSelected = groceryUnitType === u.id;
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => setGroceryUnitType(u.id)}
                              className={cn(
                                "px-2 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-all",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary font-bold"
                                  : "bg-background text-foreground/80 border-border/60 hover:bg-muted/40"
                              )}
                            >
                              {u.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {(groceryUnitType === "kg" || groceryUnitType === "g" || groceryDepartment === "acougue_carnes" || groceryDepartment === "hortifruti") && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-semibold">
                          Peso Médio Estimado por Peça (Opcional)
                        </Label>
                        <Input
                          value={groceryEstimatedWeightPerUnit}
                          onChange={(e) => setGroceryEstimatedWeightPerUnit(e.target.value)}
                          placeholder="Ex: ~1.2kg por peça ou ~500g a bandeja"
                          className="h-11 rounded-xl text-xs bg-background"
                        />
                      </div>
                    )}
                  </div>

                  {/* Opções de Corte / Manipulação para Açougue ou Padaria */}
                  {(groceryDepartment === "acougue_carnes" || groceryDepartment === "padaria_confeitaria" || groceryDepartment === "frios_laticinios") && (
                    <div className="space-y-2 p-3.5 rounded-xl border border-border/50 bg-muted/15">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">
                          Opções de Corte / Preparo para o Cliente
                        </Label>
                        <span className="text-[10px] text-muted-foreground">
                          {groceryPrepOptions.length} selecionada(s)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(groceryDepartment === "acougue_carnes" ? CANONICAL_MEAT_CUT_OPTIONS : CANONICAL_BAKERY_PREP_OPTIONS).map((opt) => {
                          const isSelected = groceryPrepOptions.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setGroceryPrepOptions(groceryPrepOptions.filter((o) => o !== opt));
                                } else {
                                  setGroceryPrepOptions([...groceryPrepOptions, opt]);
                                }
                              }}
                              className={cn(
                                "px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                                  : "bg-background text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/40"
                              )}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Marca / Fabricante & Código EAN */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-semibold">Marca / Fabricante</Label>
                      <Input
                        value={groceryBrand}
                        onChange={(e) => setGroceryBrand(e.target.value)}
                        placeholder="Ex: Ambev, Nestlé, Seara, Friboi, Wickbold..."
                        className="h-11 rounded-xl text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-semibold">Código de Barras (EAN / GTIN)</Label>
                      <Input
                        value={groceryBarcodeEan}
                        onChange={(e) => setGroceryBarcodeEan(e.target.value)}
                        placeholder="Ex: 7891991010832 (Opcional)"
                        className="h-11 rounded-xl text-xs bg-background font-mono"
                      />
                    </div>
                  </div>

                  {/* Temperatura de Armazenamento / Conservação */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-semibold">
                      Conservação / Temperatura
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {CANONICAL_STORAGE_TEMPERATURES.map((temp) => {
                        const isSelected = groceryTemperature === temp.id;
                        return (
                          <button
                            key={temp.id}
                            type="button"
                            onClick={() => setGroceryTemperature(temp.id)}
                            className={cn(
                              "p-2.5 rounded-xl border text-center transition-all cursor-pointer text-xs flex items-center justify-center gap-1.5 min-h-[44px]",
                              isSelected
                                ? "border-primary bg-primary/10 text-primary font-bold"
                                : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <span>{temp.icon}</span>
                            <span className="truncate">{temp.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selos de Saúde, Alérgenos & Restrições */}
                  <div className="p-3.5 rounded-xl border border-border/50 bg-muted/20 space-y-3">
                    <Label className="text-xs font-semibold text-foreground block">
                      Selos de Saúde, Alérgenos & Restrições
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div
                        onClick={() => setGroceryIsAlcoholic(!groceryIsAlcoholic)}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer min-h-[44px]",
                          groceryIsAlcoholic ? "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold" : "border-border/60 bg-background text-muted-foreground"
                        )}
                      >
                        <Checkbox checked={groceryIsAlcoholic} />
                        <span>🔞 Alcoólico (+18)</span>
                      </div>

                      <div
                        onClick={() => setGroceryContainsGluten(groceryContainsGluten === false ? true : false)}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer min-h-[44px]",
                          groceryContainsGluten === false ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold" : "border-border/60 bg-background text-muted-foreground"
                        )}
                      >
                        <Checkbox checked={groceryContainsGluten === false} />
                        <span>🌾 Sem Glúten</span>
                      </div>

                      <div
                        onClick={() => setGroceryContainsLactose(groceryContainsLactose === false ? true : false)}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer min-h-[44px]",
                          groceryContainsLactose === false ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold" : "border-border/60 bg-background text-muted-foreground"
                        )}
                      >
                        <Checkbox checked={groceryContainsLactose === false} />
                        <span>🥛 Sem Lactose</span>
                      </div>

                      <div
                        onClick={() => setGroceryIsOrganic(!groceryIsOrganic)}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer min-h-[44px]",
                          groceryIsOrganic ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold" : "border-border/60 bg-background text-muted-foreground"
                        )}
                      >
                        <Checkbox checked={groceryIsOrganic} />
                        <span>🌱 Orgânico</span>
                      </div>
                    </div>
                  </div>

                  {/* Ingredientes / Composição */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-semibold">
                      Ingredientes / Informações do Rótulo (Opcional)
                    </Label>
                    <Textarea
                      value={groceryIngredients}
                      onChange={(e) => setGroceryIngredients(e.target.value)}
                      placeholder="Ex: Malte, lúpulo, água mineral e levedura. Alérgicos: contém derivados de cevada."
                      className="text-xs bg-background min-h-[60px] rounded-xl"
                    />
                  </div>

                  {/* Parâmetros de Entrega Local da Loja */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-semibold">Tempo Estimado de Entrega</Label>
                      <Input
                        value={groceryDeliveryEstimate}
                        onChange={(e) => setGroceryDeliveryEstimate(e.target.value)}
                        placeholder="Ex: 30 a 45 min"
                        className="h-11 rounded-xl text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-semibold">Taxa Inicial de Entrega (R$)</Label>
                      <CurrencyField
                        value={groceryDeliveryFeeCents}
                        onChange={(val) => setGroceryDeliveryFeeCents(val ?? 0)}
                        className="h-11 rounded-xl text-xs bg-background"
                      />
                    </div>
                  </div>

                  {/* Lógica de Produtos Frescos (Hortifrúti, Peso Variável & Maturação) */}
                  <div className="p-4 rounded-xl border border-border/50 bg-muted/15 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold text-foreground">
                          Hortifrúti & Produtos Frescos (Peso Variável / Maturação)
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Permite ao cliente alternar entre compra por unidade ou peso e escolher o nível de maturação.
                        </p>
                      </div>
                      <Switch
                        checked={grocerySupportsFreshPricing}
                        onCheckedChange={setGrocerySupportsFreshPricing}
                      />
                    </div>

                    {grocerySupportsFreshPricing && (
                      <div className="space-y-3 pt-2 border-t border-border/40">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-foreground font-medium">Modo Padrão de Venda</Label>
                            <Select
                              value={groceryDefaultPricingMode}
                              onValueChange={(v: "unit" | "weight") => setGroceryDefaultPricingMode(v)}
                            >
                              <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unit">Por Unidade (Padrão)</SelectItem>
                                <SelectItem value="weight">Por Peso (Quilo / kg)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs text-foreground font-medium">Peso Médio da Peça (g)</Label>
                            <Input
                              type="number"
                              value={groceryAvgPieceWeightGrams || ""}
                              onChange={(e) => setGroceryAvgPieceWeightGrams(Number(e.target.value) || 0)}
                              placeholder="Ex: 500"
                              className="h-11 rounded-xl text-xs bg-background font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs text-foreground font-medium">Preço por Quilo (R$/kg)</Label>
                            <CurrencyField
                              value={groceryPricePerKgCents}
                              onChange={(val) => setGroceryPricePerKgCents(val ?? 0)}
                              className="h-11 rounded-xl text-xs bg-background font-mono"
                            />
                          </div>
                        </div>

                        {/* Seletor de Nível de Maturação */}
                        <div className="p-3 rounded-lg border border-border/40 bg-background/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-foreground">
                              Habilitar Escolha de Ponto de Maturação
                            </Label>
                            <Switch
                              checked={groceryRipenessEnabled}
                              onCheckedChange={setGroceryRipenessEnabled}
                            />
                          </div>
                          {groceryRipenessEnabled && (
                            <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                              <div className="p-2 rounded-lg border border-border/50 bg-muted/20">
                                <p className="font-bold text-foreground">Menos maduro</p>
                                <p className="text-[10px] text-muted-foreground">Mais firme / consumo na semana</p>
                              </div>
                              <div className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                                <p className="font-bold text-emerald-700 dark:text-emerald-300">Maduro</p>
                                <p className="text-[10px] text-muted-foreground">Ponto ideal / consumo em 1-2 dias</p>
                              </div>
                              <div className="p-2 rounded-lg border border-border/50 bg-muted/20">
                                <p className="font-bold text-foreground">Mais maduro</p>
                                <p className="text-[10px] text-muted-foreground">Bem maduro / consumo imediato</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Motor de Desconto Progressivo (Gamificação - Compre Mais, Pague Menos) */}
                  <div className="p-4 rounded-xl border border-border/50 bg-muted/15 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <BadgePercent className="size-4 text-emerald-600 dark:text-emerald-400" />
                          <span>Desconto Progressivo (Compre Mais, Pague Menos)</span>
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Incentive pedidos maiores com checklist de faixas de desconto que se ativam dinamicamente.
                        </p>
                      </div>
                      <Switch
                        checked={groceryProgressiveDiscountsEnabled}
                        onCheckedChange={setGroceryProgressiveDiscountsEnabled}
                      />
                    </div>

                    {groceryProgressiveDiscountsEnabled && (
                      <div className="space-y-2.5 pt-2 border-t border-border/40">
                        {groceryDiscountTiers.map((tier, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border/50">
                            <div className="w-24 space-y-0.5">
                              <span className="text-[10px] text-muted-foreground block">Mínimo (un)</span>
                              <Input
                                type="number"
                                min={2}
                                value={tier.min_quantity}
                                onChange={(e) => {
                                  const val = Math.max(2, Number(e.target.value) || 2);
                                  const updated = [...groceryDiscountTiers];
                                  updated[idx] = { ...updated[idx], min_quantity: val };
                                  setGroceryDiscountTiers(updated);
                                }}
                                className="h-9 rounded-lg text-xs bg-muted/20 font-mono"
                              />
                            </div>

                            <div className="w-36 space-y-0.5">
                              <span className="text-[10px] text-muted-foreground block">Tipo</span>
                              <Select
                                value={tier.discount_type}
                                onValueChange={(v: "percentage" | "fixed_cents") => {
                                  const updated = [...groceryDiscountTiers];
                                  updated[idx] = { ...updated[idx], discount_type: v };
                                  setGroceryDiscountTiers(updated);
                                }}
                              >
                                <SelectTrigger className="h-9 rounded-lg text-xs bg-muted/20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                                  <SelectItem value="fixed_cents">Valor Fixo (R$)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex-1 space-y-0.5">
                              <span className="text-[10px] text-muted-foreground block">
                                {tier.discount_type === "percentage" ? "Desconto (%)" : "Desconto (R$)"}
                              </span>
                              {tier.discount_type === "percentage" ? (
                                <Input
                                  type="number"
                                  min={1}
                                  max={90}
                                  value={tier.discount_value}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    const updated = [...groceryDiscountTiers];
                                    updated[idx] = { ...updated[idx], discount_value: val };
                                    setGroceryDiscountTiers(updated);
                                  }}
                                  placeholder="10"
                                  className="h-9 rounded-lg text-xs bg-muted/20 font-mono"
                                />
                              ) : (
                                <CurrencyField
                                  value={tier.discount_value}
                                  onChange={(val) => {
                                    const updated = [...groceryDiscountTiers];
                                    updated[idx] = { ...updated[idx], discount_value: val ?? 0 };
                                    setGroceryDiscountTiers(updated);
                                  }}
                                  className="h-9 rounded-lg text-xs bg-muted/20 font-mono"
                                />
                              )}
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setGroceryDiscountTiers(groceryDiscountTiers.filter((_, i) => i !== idx));
                              }}
                              className="size-8 rounded-lg text-muted-foreground hover:text-destructive shrink-0 mt-3"
                              title="Remover faixa"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        ))}

                        {groceryDiscountTiers.length < 4 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const lastTier = groceryDiscountTiers[groceryDiscountTiers.length - 1];
                              const nextMin = lastTier ? lastTier.min_quantity + 1 : 2;
                              setGroceryDiscountTiers([
                                ...groceryDiscountTiers,
                                { min_quantity: nextMin, discount_type: "percentage", discount_value: 15 },
                              ]);
                            }}
                            className="w-full h-8 rounded-lg text-xs font-semibold gap-1.5 border-dashed cursor-pointer"
                          >
                            <Plus className="size-3.5" />
                            <span>Adicionar Nova Faixa de Desconto</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Oferta Relâmpago / Order Bump no Checkout */}
                  <div className="p-4 rounded-xl border border-border/50 bg-muted/15 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Zap className="size-4 text-amber-500 fill-amber-500" />
                          <span>Oferta Relâmpago no Checkout (Order Bump / Venda Cruzada)</span>
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Exibe um card de produto complementar com desconto rápido antes de finalizar o pedido.
                        </p>
                      </div>
                      <Switch
                        checked={groceryOrderBumpEnabled}
                        onCheckedChange={setGroceryOrderBumpEnabled}
                      />
                    </div>

                    {groceryOrderBumpEnabled && (
                      <div className="space-y-3 pt-2 border-t border-border/40">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-foreground font-medium">Nome do Produto em Oferta *</Label>
                            <Input
                              value={groceryOrderBumpTitle}
                              onChange={(e) => setGroceryOrderBumpTitle(e.target.value)}
                              placeholder="Ex: Pizza Calabresa Artesanal ou Maçã Gala 1kg"
                              className="h-11 rounded-xl text-xs bg-background"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs text-foreground font-medium">Selo / Chamada</Label>
                            <Input
                              value={groceryOrderBumpBadge}
                              onChange={(e) => setGroceryOrderBumpBadge(e.target.value)}
                              placeholder="Ex: Oferta Relâmpago ou Aproveite Também"
                              className="h-11 rounded-xl text-xs bg-background"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs text-foreground font-medium">Preço Promocional Especial (R$) *</Label>
                            <CurrencyField
                              value={groceryOrderBumpSpecialPriceCents}
                              onChange={(val) => setGroceryOrderBumpSpecialPriceCents(val ?? 0)}
                              className="h-11 rounded-xl text-xs bg-background font-mono"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs text-foreground font-medium">Preço Original Riscado (R$)</Label>
                            <CurrencyField
                              value={groceryOrderBumpOriginalPriceCents}
                              onChange={(val) => setGroceryOrderBumpOriginalPriceCents(val ?? 0)}
                              className="h-11 rounded-xl text-xs bg-background font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Negócios */}
              {niche.id === "negocio" && (
                <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-5 border border-border/60 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <Briefcase className="size-4 text-primary" />
                      <span>2. Parâmetros do Negócio</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
                      Negócios
                    </Badge>
                  </div>

                  {/* Sincronização e Auditoria Cadastral por CNPJ (Receita Federal & IA) */}
                  <div className="p-3.5 sm:p-4 rounded-xl bg-muted/20 border border-border/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Building className="size-3.5 text-primary" />
                          <span>Buscar Dados Oficiais da Empresa por CNPJ (Opcional)</span>
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Preenche automaticamente razão social, data de fundação, CNAE e calcula auditoria cadastral com IA.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          value={companyCnpj}
                          onChange={(e) => setCompanyCnpj(e.target.value)}
                          placeholder="00.000.000/0000-00"
                          className="h-10 sm:h-11 rounded-xl text-xs bg-background font-mono"
                          maxLength={18}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleLookupAndAuditCnpj}
                        disabled={isSearchingCnpj || !companyCnpj.trim()}
                        className="h-10 sm:h-11 px-3.5 rounded-xl text-xs font-bold shrink-0 gap-1.5 cursor-pointer"
                      >
                        {isSearchingCnpj ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin text-primary" />
                            <span>Auditando...</span>
                          </>
                        ) : (
                          <>
                            <Search className="size-3.5 text-primary" />
                            <span>Consultar CNPJ</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Feedback visual da Auditoria Cadastral */}
                    {cnpjAuditData && (
                      <div className="p-3 rounded-xl bg-background border border-border/70 space-y-2 animate-in fade-in-50 text-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="size-4 text-emerald-500" />
                            <strong className="text-foreground">{cnpjAuditData.companyName}</strong>
                          </div>
                          <Badge
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5",
                              cnpjAuditData.legalRiskScore < 30
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                : cnpjAuditData.legalRiskScore < 65
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
                            )}
                          >
                            Risco Cadastral: {cnpjAuditData.riskClassification} ({cnpjAuditData.legalRiskScore}/100)
                          </Badge>
                        </div>
                        {cnpjAuditData.aiEvaluationSummary && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {cnpjAuditData.aiEvaluationSummary}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Smart Cascade Pills para Negócios */}
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-medium">Modelo da Transação *</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {CANONICAL_BUSINESS_TYPES.map((type) => {
                        const isSelected = businessType === type.id;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setBusinessType(type.id)}
                            className={cn(
                              "h-8 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all active:scale-95 border flex items-center gap-1.5",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                                : "bg-background text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/40"
                            )}
                          >
                            <span>{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">

                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-medium">Segmento de Mercado *</Label>
                      <Select value={businessSegment} onValueChange={setBusinessSegment}>
                        <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CANONICAL_BUSINESS_SEGMENTS.map((seg) => (
                            <SelectItem key={seg} value={seg}>
                              {seg}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Bloco Dedicado: Captação de Investimento & Busca de Sócios */}
                  {(businessType === "busca_socio" || businessType === "captacao_investimento") && (
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4">
                      <div className="flex items-center justify-between pb-1 border-b border-primary/20">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                          <Coins className="size-4" />
                          <span>Parâmetros da Captação de Investimento & Sócios</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold border-primary/40 text-primary bg-primary/10">
                          Oportunidade de Parceria
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-foreground font-medium">Valor do Aporte Solicitado *</Label>
                          <CurrencyField
                            value={targetInvestmentCents}
                            onChange={setTargetInvestmentCents}
                            placeholder="R$ 100.000,00"
                            className="h-11 rounded-xl text-xs bg-background font-mono font-bold"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-foreground font-medium">Participação / Cotas Ofertadas (%)</Label>
                          <Input
                            value={offeredEquityPercent}
                            onChange={(e) => setOfferedEquityPercent(e.target.value)}
                            placeholder="Ex: 15% ou A Combinar"
                            className="h-11 rounded-xl text-xs bg-background font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-foreground font-medium">Modelo do Investimento / Parceria *</Label>
                          <Select value={investmentModel} onValueChange={setInvestmentModel}>
                            <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CANONICAL_INVESTMENT_MODELS.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs text-foreground font-medium">Estágio Atual do Negócio *</Label>
                          <Select value={projectStage} onValueChange={setProjectStage}>
                            <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CANONICAL_PROJECT_STAGES.map((st) => (
                                <SelectItem key={st.id} value={st.id}>
                                  {st.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-foreground font-medium">Destino do Capital / Recursos (onde será investido?)</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {CANONICAL_USE_OF_FUNDS.map((fund) => {
                            const isSelected = useOfFunds.includes(fund);
                            return (
                              <button
                                key={fund}
                                type="button"
                                onClick={() => {
                                  setUseOfFunds((prev) =>
                                    isSelected ? prev.filter((f) => f !== fund) : [...prev, fund]
                                  );
                                }}
                                className={cn(
                                  "h-8 px-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all active:scale-95 border",
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
                                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                                )}
                              >
                                {fund}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-medium">Link do Pitch Deck ou Apresentação do Negócio (PDF, Drive ou Notion)</Label>
                        <Input
                          value={pitchDeckUrl}
                          onChange={(e) => setPitchDeckUrl(e.target.value)}
                          placeholder="https://drive.google.com/... ou link público da apresentação"
                          className="h-11 rounded-xl text-xs bg-background"
                        />
                      </div>
                    </div>
                  )}

                  {/* Grid de Métricas Financeiras Estratégicas */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <FileSpreadsheet className="size-4 text-primary" />
                      <span>Demonstrativo Financeiro (DRE Estimado)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-medium">Faturamento Médio Mensal</Label>
                        <CurrencyField
                          value={businessMonthlyRevenueCents}
                          onChange={setBusinessMonthlyRevenueCents}
                          placeholder="R$ 150.000,00"
                          className="h-11 rounded-xl text-xs bg-background font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-medium">Lucro Líquido Mensal</Label>
                        <CurrencyField
                          value={businessNetProfitCents}
                          onChange={setBusinessNetProfitCents}
                          placeholder="R$ 35.000,00"
                          className="h-11 rounded-xl text-xs bg-background font-mono text-emerald-600 dark:text-emerald-400 font-bold"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-medium">Capital de Giro Necessário</Label>
                        <CurrencyField
                          value={businessWorkingCapitalCents}
                          onChange={setBusinessWorkingCapitalCents}
                          placeholder="R$ 40.000,00"
                          className="h-11 rounded-xl text-xs bg-background font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-medium">Ano de Fundação da Empresa</Label>
                        <Input
                          value={businessFoundationYear}
                          onChange={(e) => setBusinessFoundationYear(e.target.value)}
                          placeholder="Ex: 2018"
                          className="h-11 rounded-xl text-xs bg-background font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-medium">Quadro de Colaboradores</Label>
                        <Select value={businessEmployeesRange} onValueChange={setBusinessEmployeesRange}>
                          <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CANONICAL_EMPLOYEES_RANGES.map((emp) => (
                              <SelectItem key={emp} value={emp}>
                                {emp}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-medium">Motivo da Venda</Label>
                        <Select value={businessSaleReason} onValueChange={setBusinessSaleReason}>
                          <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CANONICAL_SALE_REASONS.map((reason) => (
                              <SelectItem key={reason} value={reason}>
                                {reason}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Instalações Físicas & Ponto Comercial */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <Building className="size-4 text-primary" />
                      <span>Instalações & Ponto Comercial</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-medium">Tipo de Ponto Comercial</Label>
                        <Select value={businessPointType} onValueChange={setBusinessPointType}>
                          <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CANONICAL_COMMERCIAL_POINT_TYPES.map((pt) => (
                              <SelectItem key={pt} value={pt}>
                                {pt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-medium">Área Útil do Imóvel (m²)</Label>
                        <Input
                          value={businessAreaSqm}
                          onChange={(e) => setBusinessAreaSqm(e.target.value)}
                          placeholder="Ex: 180"
                          className="h-11 rounded-xl text-xs bg-background font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-medium">Tempo Restante de Contrato</Label>
                        <Input
                          value={businessContractRemainingYears}
                          onChange={(e) => setBusinessContractRemainingYears(e.target.value)}
                          placeholder="Ex: 3 anos renováveis"
                          className="h-11 rounded-xl text-xs bg-background"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-medium">Valor do Aluguel Mensal</Label>
                        <CurrencyField
                          value={businessMonthlyRentCents}
                          onChange={setBusinessMonthlyRentCents}
                          placeholder="R$ 4.500,00"
                          className="h-11 rounded-xl text-xs bg-background font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-medium">IPTU Mensal</Label>
                        <CurrencyField
                          value={businessMonthlyIptuCents}
                          onChange={setBusinessMonthlyIptuCents}
                          placeholder="R$ 380,00"
                          className="h-11 rounded-xl text-xs bg-background font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-foreground font-medium">Condomínio Mensal</Label>
                        <CurrencyField
                          value={businessMonthlyCondoCents}
                          onChange={setBusinessMonthlyCondoCents}
                          placeholder="R$ 0,00"
                          className="h-11 rounded-xl text-xs bg-background font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Governança de Sigilo & Assessoria M&A */}
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="nda-switch" className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5">
                          <Lock className="size-3.5 text-amber-600 dark:text-amber-400" />
                          Exigir Assinatura de NDA Digital
                        </Label>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Mascara faturamento e lucro na vitrine pública (`R$ 1***`). Apenas investidores que assinarem o termo terão acesso imediato.
                        </p>
                      </div>
                      <Switch
                        id="nda-switch"
                        checked={businessRequiresNda}
                        onCheckedChange={setBusinessRequiresNda}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-amber-500/15">
                      <div className="space-y-0.5">
                        <Label htmlFor="advisor-switch" className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5 text-primary" />
                          Operação Assessorada por Consultor M&A
                        </Label>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Sinaliza aos compradores que a operação possui suporte contábil e jurídico profissional para a transição.
                        </p>
                      </div>
                      <Switch
                        id="advisor-switch"
                        checked={businessAdvisorSupported}
                        onCheckedChange={setBusinessAdvisorSupported}
                      />
                    </div>

                    {/* Uploader de Documentos Restritos & DRE (Fase 3 Master Plan) */}
                    <div className="pt-3 border-t border-amber-500/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <FileSpreadsheet className="size-3.5 text-amber-600 dark:text-amber-400" />
                            Documentos Confidenciais & DRE (Acesso Restrito via NDA)
                          </Label>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            Anexe DRE, balanços, inventário ou contratos em PDF, XLSX ou CSV. Os arquivos só poderão ser baixados por investidores após assinatura digital do termo de sigilo.
                          </p>
                        </div>
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,.xlsx,.xls,.csv,.doc,.docx"
                            className="hidden"
                            disabled={isUploadingRestrictedDoc}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setIsUploadingRestrictedDoc(true);
                              try {
                                const uploaded = await uploadClassifiedDocument(file, "documents");
                                setBusinessRestrictedDocuments((prev) => [...prev, uploaded]);
                                toast.success(`Documento "${file.name}" anexado com sucesso!`);
                              } catch (err: any) {
                                toast.error(err?.message || "Falha ao enviar documento.");
                              } finally {
                                setIsUploadingRestrictedDoc(false);
                                e.target.value = "";
                              }
                            }}
                          />
                          <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-500/30 transition-all">
                            {isUploadingRestrictedDoc ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Plus className="size-3.5" />
                                Anexar Documento
                              </>
                            )}
                          </span>
                        </label>
                      </div>

                      {businessRestrictedDocuments.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {businessRestrictedDocuments.map((doc, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border/70 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="size-4 text-amber-600 shrink-0" />
                                <span className="font-medium text-foreground truncate">{doc.name}</span>
                                {doc.size_bytes && (
                                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                    ({(doc.size_bytes / 1024).toFixed(0)} KB)
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setBusinessRestrictedDocuments((prev) => prev.filter((_, i) => i !== idx));
                                  toast.info("Documento removido.");
                                }}
                                className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer"
                                aria-label="Remover documento"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Telemetria de Viabilidade & Payback (SimLabs IA) */}
                  <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                        <Zap className="size-4 text-primary" />
                        <span>Telemetria de Ponto & Viabilidade Comercial</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAnalyzeCommercialPoint}
                        disabled={isAnalyzingTelemetry}
                        className="h-8 px-3 text-xs font-semibold rounded-xl border-primary/30 text-primary hover:bg-primary/10 cursor-pointer shrink-0"
                      >
                        {isAnalyzingTelemetry ? (
                          <>
                            <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                            Calculando com SimLabs...
                          </>
                        ) : (
                          <>
                            <Zap className="size-3.5 mr-1.5" />
                            Sugerir Telemetria com SimLabs IA
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      O motor SimLabs cruza área em m², custo de aluguel e faturamento estimado para projetar payback, ocupação e score de viabilidade para compradores.
                    </p>

                    {telemetryResult && (
                      <div className="mt-3 p-3.5 rounded-xl bg-background border border-border/70 space-y-2.5 animate-in fade-in">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded-lg bg-muted/30">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Score</span>
                            <span className="text-sm font-bold text-primary font-mono">{telemetryResult.viabilityScore}/100</span>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/30">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Payback</span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">~{telemetryResult.paybackMonthsEstimate} meses</span>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/30">
                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Aluguel / Fat.</span>
                            <span className="text-sm font-bold text-foreground font-mono">{telemetryResult.rentToRevenueRatio}%</span>
                          </div>
                        </div>
                        {telemetryResult.summary && (
                          <p className="text-xs text-muted-foreground italic border-t border-border/40 pt-2">
                            "{telemetryResult.summary}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Desapego & Bens Físicos Avançado (Microfase 77B) */}
 {niche.id === "desapego" && (
            <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Tag className="size-4 text-primary" />
 <span>2. Especificações</span>
 </div>
 
 </div>

 {/* Seletor de Subcategoria de Desapego */}
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Tipo de Item / Segmento</Label>
 <Select value={desapegoCategory} onValueChange={(v: any) => setDesapegoCategory(v)}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="smartphones">📱 Celulares & Smartphones</SelectItem>
 <SelectItem value="computadores">💻 Notebooks, PCs & Acessórios</SelectItem>
 <SelectItem value="eletronicos">📺 Eletrônicos & Som em Geral</SelectItem>
 <SelectItem value="eletrodomesticos">🧊 Eletrodomésticos & Cozinha</SelectItem>
 <SelectItem value="moveis">🛋️ Móveis & Decoração de Ambientes</SelectItem>
 <SelectItem value="moda_brecho">👗 Brechó de Roupas & Acessórios</SelectItem>
 <SelectItem value="garagem">📦 Venda de Garagem & Ferramentas</SelectItem>
 <SelectItem value="outros">🏷️ Outros Bens Pessoais</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Seção Específica para Smartphones & Celulares com Seletores Canônicos */}
 {desapegoCategory === "smartphones" && (
 <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-4">
 <div className="text-[11px] font-bold text-primary uppercase tracking-wider">
 Especificações do Aparelho
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Marca do Aparelho</Label>
 <Select value={phoneBrand} onValueChange={(v) => {
 setPhoneBrand(v);
 if (v === "Apple") setPhoneModel("iPhone 15 Pro");
 else if (v === "Samsung") setPhoneModel("Galaxy S24");
 else if (v === "Xiaomi") setPhoneModel("Redmi Note 13 Pro 5G");
 else if (v === "Motorola") setPhoneModel("Edge 50 Ultra");
 }}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Apple">Apple</SelectItem>
 <SelectItem value="Samsung">Samsung</SelectItem>
 <SelectItem value="Xiaomi">Xiaomi</SelectItem>
 <SelectItem value="Motorola">Motorola</SelectItem>
 <SelectItem value="Outra">Outra Marca</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Modelo da Linha</Label>
 <Select value={phoneModel} onValueChange={setPhoneModel}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {phoneBrand === "Apple" && (
 <>
 <SelectItem value="iPhone 16 Pro Max">iPhone 16 Pro Max</SelectItem>
 <SelectItem value="iPhone 16 Pro">iPhone 16 Pro</SelectItem>
 <SelectItem value="iPhone 16">iPhone 16</SelectItem>
 <SelectItem value="iPhone 15 Pro Max">iPhone 15 Pro Max</SelectItem>
 <SelectItem value="iPhone 15 Pro">iPhone 15 Pro</SelectItem>
 <SelectItem value="iPhone 15">iPhone 15</SelectItem>
 <SelectItem value="iPhone 14 Pro">iPhone 14 Pro</SelectItem>
 <SelectItem value="iPhone 14">iPhone 14</SelectItem>
 <SelectItem value="iPhone 13">iPhone 13</SelectItem>
 <SelectItem value="iPhone 12">iPhone 12</SelectItem>
 <SelectItem value="iPhone 11">iPhone 11</SelectItem>
 </>
 )}
 {phoneBrand === "Samsung" && (
 <>
 <SelectItem value="Galaxy S24 Ultra">Galaxy S24 Ultra</SelectItem>
 <SelectItem value="Galaxy S24+">Galaxy S24+</SelectItem>
 <SelectItem value="Galaxy S24">Galaxy S24</SelectItem>
 <SelectItem value="Galaxy S23 Ultra">Galaxy S23 Ultra</SelectItem>
 <SelectItem value="Galaxy S23">Galaxy S23</SelectItem>
 <SelectItem value="Galaxy Z Fold 5">Galaxy Z Fold 5</SelectItem>
 <SelectItem value="Galaxy Z Flip 5">Galaxy Z Flip 5</SelectItem>
 <SelectItem value="Galaxy A54 5G">Galaxy A54 5G</SelectItem>
 </>
 )}
 {phoneBrand === "Xiaomi" && (
 <>
 <SelectItem value="Xiaomi 14">Xiaomi 14</SelectItem>
 <SelectItem value="Redmi Note 13 Pro 5G">Redmi Note 13 Pro 5G</SelectItem>
 <SelectItem value="Redmi Note 12">Redmi Note 12</SelectItem>
 <SelectItem value="Poco X6 Pro">Poco X6 Pro</SelectItem>
 <SelectItem value="Poco F5">Poco F5</SelectItem>
 </>
 )}
 {phoneBrand === "Motorola" && (
 <>
 <SelectItem value="Edge 50 Ultra">Edge 50 Ultra</SelectItem>
 <SelectItem value="Edge 40 Neo">Edge 40 Neo</SelectItem>
 <SelectItem value="Moto G84 5G">Moto G84 5G</SelectItem>
 <SelectItem value="Moto G54 5G">Moto G54 5G</SelectItem>
 </>
 )}
 {phoneBrand === "Outra" && (
 <SelectItem value="Outro Modelo">Outro Modelo</SelectItem>
 )}
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Armazenamento Interno</Label>
 <Select value={phoneStorage} onValueChange={setPhoneStorage}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="64GB">64 GB</SelectItem>
 <SelectItem value="128GB">128 GB</SelectItem>
 <SelectItem value="256GB">256 GB</SelectItem>
 <SelectItem value="512GB">512 GB</SelectItem>
 <SelectItem value="1TB">1 TB</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Saúde da Bateria (%)</Label>
 <Input
 type="number"
 min="50"
 max="100"
 value={phoneBatteryHealth}
 onChange={(e) => setPhoneBatteryHealth(e.target.value)}
 placeholder="Ex: 95"
 className="h-11 rounded-xl text-xs bg-background font-mono"
 />
 </div>
 </div>

 {/* Acessórios Inclusos */}
 <div className="space-y-2 pt-1">
 <Label className="text-xs text-foreground font-medium">Acessórios Inclusos no Aparelho</Label>
 <div className="flex flex-wrap gap-2">
 {[
 "Carregador Original",
 "Caixa Original",
 "Nota Fiscal",
 "Cabo USB-C",
 "Capinha / Película",
 "Fone de Ouvido",
 ].map((item) => {
 const isSelected = phoneAccessories.includes(item);
 return (
 <button
 key={item}
 type="button"
 onClick={() => {
 setPhoneAccessories((prev) =>
 isSelected ? prev.filter((x) => x !== item) : [...prev, item]
 );
 }}
 className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
 isSelected
 ? "bg-primary/10 border-primary text-primary"
 : "bg-background border-border text-muted-foreground hover:text-foreground"
 }`}
 >
 {isSelected ? "✓ " : "+ "}
 {item}
 </button>
 );
 })}
 </div>
 </div>
 </div>
 )}

 {/* Móveis & Decoração */}
 {desapegoCategory === "moveis" && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-muted/20 border border-border/60">
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Ambiente do Móvel</Label>
 <Select value={furnitureRoom} onValueChange={setFurnitureRoom}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Sala">Sala de Estar / Jantar</SelectItem>
 <SelectItem value="Quarto">Quarto / Closet</SelectItem>
 <SelectItem value="Cozinha">Cozinha / Área Gourmet</SelectItem>
 <SelectItem value="Escritório">Home Office / Escritório</SelectItem>
 <SelectItem value="Varanda">Varanda / Jardim</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Material Principal</Label>
 <Select value={furnitureMaterial} onValueChange={setFurnitureMaterial}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Madeira Maciça">Madeira Maciça</SelectItem>
 <SelectItem value="MDF / MDP">MDF / MDP Laminado</SelectItem>
 <SelectItem value="Metal / Aço">Metal / Aço Industrial</SelectItem>
 <SelectItem value="Estofado / Linho">Estofado / Linho / Veludo</SelectItem>
 <SelectItem value="Vidro / Espelho">Vidro / Espelho</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 )}

 {/* Brechó de Roupas */}
 {desapegoCategory === "moda_brecho" && (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-muted/20 border border-border/60">
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Gênero / Faixa</Label>
 <Select value={fashionGender} onValueChange={setFashionGender}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Feminino">Feminino</SelectItem>
 <SelectItem value="Masculino">Masculino</SelectItem>
 <SelectItem value="Infantil">Infantil / Kids</SelectItem>
 <SelectItem value="Unissex">Unissex</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Tamanho da Peça</Label>
 <Select value={fashionSize} onValueChange={setFashionSize}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="PP">PP / 36</SelectItem>
 <SelectItem value="P">P / 38</SelectItem>
 <SelectItem value="M">M / 40</SelectItem>
 <SelectItem value="G">G / 42</SelectItem>
 <SelectItem value="GG">GG / 44</SelectItem>
 <SelectItem value="XGG">XGG / Plus Size</SelectItem>
 <SelectItem value="Calçado">Calçado (informar no texto)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 )}

 {/* Estado de Conservação Geral */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Estado de Conservação</Label>
 <Select value={itemCondition} onValueChange={(v: any) => setItemCondition(v)}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="novo">Novo / Lacrado na Caixa</SelectItem>
 <SelectItem value="usado_excelente">Usado - Em Estado de Novo</SelectItem>
 <SelectItem value="usado_bom">Usado - Bom Estado de Uso</SelectItem>
 <SelectItem value="com_marcas">Usado - Com Marcas Visíveis</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Garantia / Procedência</Label>
 <Input
 value={itemWarranty}
 onChange={(e) => setItemWarranty(e.target.value)}
 placeholder="Ex: 3 meses de garantia, NF em mãos"
 className="h-11 rounded-xl text-xs bg-background"
 />
 </div>
 </div>
 </div>
 )}

 {/* Serviço Profissional */}
 {niche.id === "servico" && (
            <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Wrench className="size-4 text-primary" />
 <span>2. Atendimento</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Modalidade de Atendimento</Label>
 <Select value={serviceModality} onValueChange={(v: any) => setServiceModality(v)}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="presencial">Presencial no Estabelecimento</SelectItem>
 <SelectItem value="domicilio">Em Domicílio (Atende no Local)</SelectItem>
 <SelectItem value="remoto">100% Remoto / Online</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Região de Atendimento</Label>
 <Input
 value={serviceArea}
 onChange={(e) => setServiceArea(e.target.value)}
 placeholder="Ex: Toda a cidade e região"
 className="h-11 rounded-xl text-xs bg-background"
 />
 </div>
 </div>
 </div>
 )}

 {/* Oportunidade / Vaga Master Padrão Corporativo Waesy */}
 {niche.id === "vaga" && (
            <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Briefcase className="size-4 text-primary" />
 <span>Parâmetros de Contratação & Mensuração</span>
 </div>
 
 </div>

 {/* Cargo / Título Profissional */}
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Cargo / Ocupação Profissional *</Label>
 <Input
 value={jobRole}
 onChange={(e) => setJobRole(e.target.value)}
 placeholder="Ex: Assistente Administrativo, Desenvolvedor Fullstack, Vendedor"
 className="h-11 rounded-xl text-xs bg-background"
 />
 </div>

 {/* Grid de 2 Colunas: Escolaridade Mínima e Tempo de Experiência Mensuráveis */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <div className="flex items-center gap-1.5">
 <GraduationCap className="size-3.5 text-primary" />
 <Label className="text-xs text-foreground font-medium">Escolaridade Mínima Exigida *</Label>
 </div>
 <Select value={jobMinEducation} onValueChange={setJobMinEducation}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {CANONICAL_EDUCATION_LEVELS.map((edu) => (
 <SelectItem key={edu.value} value={edu.value}>
 {edu.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <div className="flex items-center gap-1.5">
 <Award className="size-3.5 text-primary" />
 <Label className="text-xs text-foreground font-medium">Experiência Profissional Mínima *</Label>
 </div>
 <Select value={jobExperienceLevel} onValueChange={setJobExperienceLevel}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {CANONICAL_EXPERIENCE_LEVELS.map((exp) => (
 <SelectItem key={exp.value} value={exp.value}>
 {exp.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Grid de 3 Colunas: Regime, Modelo e Jornada */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Regime de Contratação</Label>
 <Select value={jobRegime} onValueChange={(v: any) => setJobRegime(v)}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {CANONICAL_JOB_REGIMES.map((r) => (
 <SelectItem key={r.value} value={r.value}>
 {r.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Modelo de Trabalho</Label>
 <Select value={jobModel} onValueChange={(v: any) => setJobModel(v)}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {CANONICAL_WORKPLACE_MODELS.map((m) => (
 <SelectItem key={m.value} value={m.value}>
 {m.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Jornada de Trabalho</Label>
 <Select value={jobWorkSchedule} onValueChange={setJobWorkSchedule}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {CANONICAL_WORK_SCHEDULES.map((s) => (
 <SelectItem key={s.value} value={s.value}>
 {s.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Faixa Salarial Mensurável */}
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Faixa Salarial / Remuneração Estimada</Label>
 <Select value={jobSalaryRange} onValueChange={setJobSalaryRange}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {CANONICAL_SALARY_RANGES.map((sal) => (
 <SelectItem key={sal.value} value={sal.value}>
 {sal.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 {/* Benefícios Oferecidos em Tags Clicáveis */}
 <div className="space-y-2 pt-2 border-t border-border/40">
 <div className="flex items-center justify-between">
 <Label className="text-xs text-foreground font-medium">Benefícios Oferecidos pela Empresa</Label>
 <span className="text-[11px] text-muted-foreground font-mono">{jobBenefits.length} selecionado(s)</span>
 </div>
 <div className="flex flex-wrap gap-1.5">
 {CANONICAL_JOB_BENEFITS.map((ben) => {
 const active = jobBenefits.includes(ben);
 return (
 <button
 key={ben}
 type="button"
 onClick={() => {
 setJobBenefits((prev) =>
 active ? prev.filter((b) => b !== ben) : [...prev, ben]
 );
 }}
 className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
 active
 ? "bg-primary/15 border-primary text-primary font-semibold"
 : "bg-background border-border text-muted-foreground hover:text-foreground"
 }`}
 >
 {active ? "✓ " : "+ "}
 {ben}
 </button>
 );
 })}
 </div>
 </div>

 {/* Habilidades & Competências com Tags Interativas */}
 <div className="space-y-2 pt-2 border-t border-border/40">
 <div className="flex items-center justify-between">
 <Label className="text-xs text-foreground font-medium">Competências & Habilidades Desejadas</Label>
 <span className="text-[11px] text-muted-foreground font-mono">{jobSkills.length} adicionada(s)</span>
 </div>

 {/* Tags Ativas */}
 <div className="flex flex-wrap gap-1.5 min-h-7">
 {jobSkills.map((sk) => (
 <Badge
 key={sk}
 variant="secondary"
 className="text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-lg gap-1.5 bg-primary/10 text-primary border-primary/20"
 >
 <span>{sk}</span>
 <button
 type="button"
 onClick={() => setJobSkills((prev) => prev.filter((s) => s !== sk))}
 className="hover:text-destructive text-primary/70 transition-colors cursor-pointer"
 >
 ×
 </button>
 </Badge>
 ))}
 </div>

 {/* Input de Adicionar Nova Habilidade */}
 <div className="flex gap-2 pt-1">
 <Input
 value={customSkillInput}
 onChange={(e) => setCustomSkillInput(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 if (customSkillInput.trim() && !jobSkills.includes(customSkillInput.trim())) {
 setJobSkills((prev) => [...prev, customSkillInput.trim()]);
 setCustomSkillInput("");
 }
 }
 }}
 placeholder="Adicionar habilidade personalizada e pressionar Enter..."
 className="h-11 rounded-xl text-xs bg-background"
 />
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => {
 if (customSkillInput.trim() && !jobSkills.includes(customSkillInput.trim())) {
 setJobSkills((prev) => [...prev, customSkillInput.trim()]);
 setCustomSkillInput("");
 }
 }}
 className="h-9 px-3 rounded-xl text-xs"
 >
 Adicionar
 </Button>
 </div>

 {/* Sugestões Rápidas */}
 <div className="space-y-1 pt-1">
 <span className="text-[10px] text-muted-foreground block font-medium">Sugestões comuns:</span>
 <div className="flex flex-wrap gap-1">
 {SUGGESTED_JOB_SKILLS.filter((s) => !jobSkills.includes(s)).slice(0, 6).map((sug) => (
 <button
 key={sug}
 type="button"
 onClick={() => setJobSkills((prev) => [...prev, sug])}
 className="px-2 py-0.5 rounded-md text-[10px] border border-dashed border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
 >
 + {sug}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Formas de Candidatura Aceitas */}
 <div className="space-y-2 pt-2 border-t border-border/40">
 <Label className="text-xs text-foreground font-medium">Formas de Candidatura Permitidas</Label>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
 {[
 { id: "perfil_waesy", label: "Perfil Profissional Waesy (1-Clique)", desc: "Currículo digital sincronizado" },
 { id: "upload_cv", label: "Upload de Currículo (PDF/DOCX)", desc: "Arquivo anexado direto" },
 { id: "whatsapp", label: "Contato via WhatsApp Oficial", desc: "Triagem imediata por mensagem" },
 ].map((method) => {
 const selected = jobAcceptedMethods.includes(method.id);
 return (
 <div
 key={method.id}
 onClick={() => {
 setJobAcceptedMethods((prev) =>
 selected ? (prev.length > 1 ? prev.filter((m) => m !== method.id) : prev) : [...prev, method.id]
 );
 }}
 className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
 selected
 ? "bg-primary/5 border-primary text-foreground"
 : "bg-background border-border text-muted-foreground"
 }`}
 >
 <div className="flex items-center gap-2">
 <Checkbox checked={selected} />
 <span className="text-xs font-semibold">{method.label}</span>
 </div>
 <span className="text-[10px] text-muted-foreground mt-1 pl-6">{method.desc}</span>
 </div>
 );
 })}
 </div>
 </div>
                </div>
              )}

 {/* Produto Digital & Downloads */}
 {niche.id === "digital" && (
            <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <FileArchive className="size-4 text-primary" />
 <span>2. Arquivo Digital</span>
 </div>
 <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
 Download Imediato
 </Badge>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Tipo de Material Digital</Label>
 <Select value={digitalFileType} onValueChange={setDigitalFileType}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="ebook">📚 E-book / Livro Digital (PDF/EPUB)</SelectItem>
 <SelectItem value="planilha">📊 Planilha & Dashboard (Excel/Sheets)</SelectItem>
 <SelectItem value="template">🎨 Template & Arquivo de Design (PSD/FIG/CANVA)</SelectItem>
 <SelectItem value="preset">📸 Preset & Filtro (Lightroom/Photoshop)</SelectItem>
 <SelectItem value="curso">🎓 Curso / Videoaulas / Treinamento</SelectItem>
 <SelectItem value="ingresso">🎟️ Ingresso / Voucher Digital / Ingresso VIP</SelectItem>
 <SelectItem value="software">💻 Script / Código / Software / Automação</SelectItem>
 <SelectItem value="audio">🎵 Áudio / Música / Podcast / Efeito Sonoro</SelectItem>
 <SelectItem value="outro">📁 Outro Conteúdo Digital</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Limite de Downloads por Comprador</Label>
 <Select value={digitalDownloadLimit} onValueChange={setDigitalDownloadLimit}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="3">3 downloads (Mais seguro)</SelectItem>
 <SelectItem value="5">5 downloads (Recomendado)</SelectItem>
 <SelectItem value="10">10 downloads</SelectItem>
 <SelectItem value="50">50 downloads</SelectItem>
 <SelectItem value="999">Downloads Ilimitados</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 {/* Dropzone de Upload de Arquivo Digital */}
 <div className="space-y-1.5 pt-1">
 <Label className="text-xs text-foreground font-medium">
 Arquivo para Download do Comprador <span className="text-destructive">*</span>
 </Label>
 <DigitalFileDropzone
 value={digitalFileUrl}
 fileName={digitalFileName}
 fileSizeBytes={digitalFileSize}
 onChange={(fileData) => {
 if (fileData) {
 setDigitalFileUrl(fileData.url);
 setDigitalFileName(fileData.name);
 setDigitalFileSize(fileData.sizeBytes);
 } else {
 setDigitalFileUrl(null);
 setDigitalFileName(null);
 setDigitalFileSize(null);
 }
 }}
 />
 </div>

 <div className="space-y-1.5 pt-1">
 <Label className="text-xs text-foreground font-medium">
 Link de Amostra / Prévia Online (Opcional)
 </Label>
 <Input
 value={digitalPreviewUrl}
 onChange={(e) => setDigitalPreviewUrl(e.target.value)}
 placeholder="https://drive.google.com/..., https://notion.so/..., https://youtube.com/..."
 className="h-11 rounded-xl text-xs bg-background font-mono"
 />
 <p className="text-[10px] text-muted-foreground">
 Se você possui uma degustação, trailer ou página demonstrativa, cole o link aqui.
 </p>
 </div>
 </div>
 )}
 </div>

          {/* Section 3 (Logística de Envio para Bens Físicos) */}
 {niche.id === "desapego" && (
 <div className="space-y-4">
            <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Truck className="size-4 text-primary" />
 <span>3. Entrega e Retirada</span>
 </div>
 <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
 Waesy Express
 </Badge>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs text-foreground font-medium">Modalidade de Envio / Retirada</Label>
 <Select value={deliveryMode} onValueChange={(v: any) => setDeliveryMode(v)}>
 <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="both">📦 Entrega Expressa Waesy & Retirada em Mãos (Recomendado)</SelectItem>
 <SelectItem value="pickup">🏠 Somente Retirada no Local</SelectItem>
 <SelectItem value="local_delivery">🛵 Somente Entrega Local (Motoboy / Frota)</SelectItem>
 <SelectItem value="shipping">🚚 Envio Nacional (Correios / Transportadora)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="flex items-center gap-2.5 pt-1">
 <Checkbox
 id="free-shipping"
 checked={freeShippingLocal}
 onCheckedChange={(c) => setFreeShippingLocal(!!c)}
 />
 <Label htmlFor="free-shipping" className="text-xs text-foreground font-medium cursor-pointer">
 Oferecer frete grátis para entrega local na minha cidade
 </Label>
 </div>
 </div>
 </div>
 )}

 {/* Assinaturas & Mensalidades (Planos Recorrentes) */}
              {niche.id === "assinatura" && (
            <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <RefreshCw className="size-4 text-primary" />
                      <span>Configuração do Plano Recorrente</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30">
                      Mensalidade
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-medium">Ciclo de Cobrança *</Label>
                      <Select value={billingCycle} onValueChange={(v: any) => setBillingCycle(v)}>
                        <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Mensal (Todo mês)</SelectItem>
                          <SelectItem value="quarterly">Trimestral (A cada 3 meses)</SelectItem>
                          <SelectItem value="semiannual">Semestral (A cada 6 meses)</SelectItem>
                          <SelectItem value="yearly">Anual (Plano anual com desconto)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground font-medium">Taxa de Matrícula / Adesão (R$)</Label>
                      <CurrencyField
                        value={setupFeeCents}
                        onChange={setSetupFeeCents}
                        placeholder="0,00"
                        className="h-11 rounded-xl text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-medium">Período de Teste Grátis (Trial)</Label>
                    <Select value={String(trialDays)} onValueChange={(v) => setTrialDays(Number(v))}>
                      <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sem teste grátis (Cobrança imediata)</SelectItem>
                        <SelectItem value="7">7 dias grátis para experimentar</SelectItem>
                        <SelectItem value="14">14 dias grátis para experimentar</SelectItem>
                        <SelectItem value="30">30 dias grátis para experimentar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <Label className="text-xs text-foreground font-medium">Benefícios Inclusos no Plano</Label>
                    <div className="flex gap-2">
                      <Input
                        value={newFeatureInput}
                        onChange={(e) => setNewFeatureInput(e.target.value)}
                        placeholder="Ex: Acesso livre às instalações"
                        className="h-11 rounded-xl text-xs bg-background"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (newFeatureInput.trim()) {
                              setRecurringFeatures([...recurringFeatures, newFeatureInput.trim()]);
                              setNewFeatureInput("");
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl text-xs h-10 px-3"
                        onClick={() => {
                          if (newFeatureInput.trim()) {
                            setRecurringFeatures([...recurringFeatures, newFeatureInput.trim()]);
                            setNewFeatureInput("");
                          }
                        }}
                      >
                        Adicionar
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {recurringFeatures.map((feat, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs px-2.5 py-1 rounded-lg gap-1.5 bg-primary/10 text-primary border border-primary/20"
                        >
                          <span>✓ {feat}</span>
                          <button
                            type="button"
                            onClick={() => setRecurringFeatures(recurringFeatures.filter((_, i) => i !== idx))}
                            className="hover:text-destructive text-primary/70 ml-1"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Destaques & Diferenciais Livres (Disponível para todos os outros nichos) */}
              {niche.id !== "viagem" && (
                <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                  <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                      <Award className="size-4 text-primary shrink-0" />
                      <span>Destaques & Diferenciais</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      Livre / Opcional
                    </Badge>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Adicione os pontos fortes e diferenciais deste item para atrair mais interessados.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddTravelBullet}
                        className="h-7 text-xs font-semibold rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        <span>Adicionar</span>
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {travelBioBullets.map((bullet, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-muted-foreground w-4 text-center shrink-0">
                            {idx + 1}.
                          </span>
                          <Input
                            value={bullet}
                            onChange={(e) => handleUpdateTravelBullet(idx, e.target.value)}
                            placeholder={`Destaque ${idx + 1} (ex: ${
                              niche.id === "veiculo"
                                ? "Único Dono, Laudo Aprovado..."
                                : niche.id === "servico"
                                ? "Com Nota Fiscal, Plantão 24h..."
                                : niche.id === "equipamento"
                                ? "Equipamento Revisado, Cabos Inclusos..."
                                : "Original, Nota Fiscal, Impecável..."
                            })`}
                            className="h-9 rounded-xl text-xs bg-background flex-1"
                          />
                          <div className="flex items-center gap-0.5 shrink-0">
                            {travelBioBullets.length > 1 && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveTravelBullet(idx, "up")}
                                  className="h-8 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                                  title="Mover para cima"
                                  aria-label="Mover para cima"
                                >
                                  <ChevronUp className="size-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={idx === travelBioBullets.length - 1}
                                  onClick={() => handleMoveTravelBullet(idx, "down")}
                                  className="h-8 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"
                                  title="Mover para baixo"
                                  aria-label="Mover para baixo"
                                >
                                  <ChevronDown className="size-3" />
                                </Button>
                              </>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTravelBullet(idx)}
                              className="h-8 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title={travelBioBullets.length === 1 ? "Limpar campo" : "Remover diferencial"}
                              aria-label="Remover diferencial"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Formas de Pagamento (LISTA ESTRUTURADA ESPAÇOSA - ZERO TRUNCATION - 1x = À VISTA) */}
              <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    <CreditCard className="size-4 text-primary shrink-0" />
                    <span>Formas de Pagamento Aceitas</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">Ative as opções aceitas</span>
                </div>

                {/* Lista Vertical Espaçosa e Descomplicada */}
                <div className="space-y-3">

                  {/* 1. Pix */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3",
                    acceptsPix
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsPix ? "bg-emerald-600 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <QrCode className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Pix (Pagamento Instantâneo)</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {pixDiscountPercent > 0
                              ? `${pixDiscountPercent}% de desconto à vista imediato`
                              : "Pagamento à vista com confirmação em segundos"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsPix}
                        onCheckedChange={setAcceptsPix}
                        aria-label="Aceitar Pix"
                      />
                    </div>

                    {acceptsPix && (
                      <div className="pt-2 border-t border-border/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <BadgePercent className="size-3.5 text-emerald-600" />
                            <span>Desconto no Pix à Vista</span>
                          </Label>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            {pixDiscountPercent}% OFF
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={30}
                          step={1}
                          value={pixDiscountPercent}
                          onChange={(e) => setPixDiscountPercent(Math.min(30, Math.max(0, Number(e.target.value) || 0)))}
                          className="w-full h-2 rounded-full accent-emerald-600 cursor-pointer"
                          aria-label="Desconto no Pix"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                          <span>0% (Sem desconto)</span>
                          <span>10%</span>
                          <span>20%</span>
                          <span>30%</span>
                        </div>
                        {pixDiscountPercent > 0 && priceCents && priceCents > 0 && (
                          <div className="pt-1 flex items-center justify-between text-xs font-medium">
                            <span className="text-muted-foreground">Economia: {formatMoney(Math.round(priceCents * (pixDiscountPercent / 100)))}</span>
                            <span className="font-bold text-emerald-600">Sai por: {formatMoney(Math.round(priceCents * (1 - pixDiscountPercent / 100)))}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Cartão de Crédito (1x = À Vista, 2x+ = Parcelamento) */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3",
                    acceptsCard
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsCard ? "bg-blue-600 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <CreditCard className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Cartão de Crédito / Débito</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {maxInstallments === 1
                              ? "Cobrança única à vista"
                              : `À vista ou parcelado em até ${maxInstallments}x ${cardInterestFree ? "sem juros" : ""}`}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsCard}
                        onCheckedChange={setAcceptsCard}
                        aria-label="Aceitar Cartão"
                      />
                    </div>

                    {acceptsCard && (
                      <div className="pt-2 border-t border-border/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                            <CreditCard className="size-3.5 text-primary" />
                            <span>Parcelamento Máximo</span>
                          </Label>
                          <span className="text-xs font-black text-primary font-mono bg-primary/10 px-2 py-0.5 rounded-md">
                            {maxInstallments === 1 ? "À vista" : `Até ${maxInstallments}x`}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={24}
                          step={1}
                          value={maxInstallments}
                          onChange={(e) => setMaxInstallments(Number(e.target.value) || 1)}
                          className="w-full h-2 rounded-full accent-primary cursor-pointer"
                          aria-label="Parcelas no Cartão"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                          <span>À vista (1x)</span>
                          <span>2x</span>
                          <span>6x</span>
                          <span>12x</span>
                          <span>18x</span>
                          <span>24x</span>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs">
                          {maxInstallments > 1 ? (
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={cardInterestFree}
                                onCheckedChange={setCardInterestFree}
                                id="card-interest-free"
                              />
                              <Label htmlFor="card-interest-free" className="text-xs font-medium cursor-pointer">
                                Sem juros para o comprador
                              </Label>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Somente à vista (sem parcelas)</span>
                          )}

                          {priceCents && priceCents > 0 && maxInstallments > 1 && (
                            <span className="text-[11px] text-muted-foreground font-mono font-medium">
                              ${maxInstallments}x de <strong>${formatMoney(Math.round(priceCents / maxInstallments))}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Dinheiro em Espécie (Presencial) */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-2",
                    acceptsCash
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsCash ? "bg-slate-700 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <Banknote className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Dinheiro em Espécie (Presencial)</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Pagamento no ato da entrega pelo motoboy ou na retirada no balcão
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsCash}
                        onCheckedChange={setAcceptsCash}
                        aria-label="Aceitar Dinheiro"
                      />
                    </div>
                  </div>

                  {/* 4. Boleto Bancário à Vista */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3",
                    acceptsBoleto
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsBoleto ? "bg-amber-600 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <Receipt className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Boleto Bancário à Vista</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {acceptsBoleto ? `Compensação com vencimento em ${boletoDueDays} dias úteis` : "Emissão de boleto para pagamento em bancos ou lotéricas"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsBoleto}
                        onCheckedChange={setAcceptsBoleto}
                        aria-label="Aceitar Boleto"
                      />
                    </div>

                    {acceptsBoleto && (
                      <div className="pt-2 border-t border-border/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground">Prazo de Vencimento</Label>
                          <span className="text-xs font-mono font-bold text-primary">{boletoDueDays} dias úteis</span>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {[1, 2, 3, 5, 7].map((days) => (
                            <Button
                              key={days}
                              type="button"
                              variant={boletoDueDays === days ? "default" : "outline"}
                              size="sm"
                              onClick={() => setBoletoDueDays(days)}
                              className="h-8 text-xs font-semibold rounded-lg cursor-pointer"
                            >
                              {days}d
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. Boleto Parcelado */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3",
                    acceptsBoletoInstallments
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsBoletoInstallments ? "bg-orange-600 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <FileSpreadsheet className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Boleto Parcelado</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {acceptsBoletoInstallments ? `Parcelamento em até ${maxBoletoInstallments}x direto` : "Parcelamento via boletos mensais emitidos pela loja"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsBoletoInstallments}
                        onCheckedChange={setAcceptsBoletoInstallments}
                        aria-label="Aceitar Boleto Parcelado"
                      />
                    </div>

                    {acceptsBoletoInstallments && (
                      <div className="pt-2 border-t border-border/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-foreground font-semibold">Número de Boletos</Label>
                          <span className="text-xs font-black text-primary font-mono">Até {maxBoletoInstallments}x</span>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={24}
                          step={1}
                          value={maxBoletoInstallments}
                          onChange={(e) => setMaxBoletoInstallments(Number(e.target.value) || 2)}
                          className="w-full h-2 rounded-full accent-primary cursor-pointer"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-foreground">Entrada Mínima (R$)</Label>
                            <CurrencyField
                              value={boletoMinDownPaymentCents}
                              onChange={setBoletoMinDownPaymentCents}
                              placeholder="0,00"
                              className="h-9 text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-foreground">Requisitos</Label>
                            <Input
                              value={boletoNotes}
                              onChange={(e) => setBoletoNotes(e.target.value)}
                              placeholder="Ex: Análise cadastral"
                              className="h-9 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 6. Carnê Digital Waesy */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3",
                    acceptsCarne
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsCarne ? "bg-purple-600 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <BookOpenCheck className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Carnê Digital Waesy</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {acceptsCarne ? `Parcelamento em até ${maxCarneInstallments}x direto no app` : "Emissão de crediário digital com gestão pela plataforma"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsCarne}
                        onCheckedChange={setAcceptsCarne}
                        aria-label="Aceitar Carnê Digital"
                      />
                    </div>

                    {acceptsCarne && (
                      <div className="pt-2 border-t border-border/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-foreground font-semibold">Parcelas no Carnê</Label>
                          <span className="text-xs font-black text-primary font-mono">Até {maxCarneInstallments}x</span>
                        </div>
                        <input
                          type="range"
                          min={2}
                          max={36}
                          step={1}
                          value={maxCarneInstallments}
                          onChange={(e) => setMaxCarneInstallments(Number(e.target.value) || 2)}
                          className="w-full h-2 rounded-full accent-primary cursor-pointer"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-foreground">1º Vencimento</Label>
                            <div className="grid grid-cols-3 gap-1">
                              {[30, 45, 60].map((days) => (
                                <Button
                                  key={days}
                                  type="button"
                                  variant={carneGraceDays === days ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCarneGraceDays(days)}
                                  className="h-8 text-xs font-semibold rounded-lg"
                                >
                                  {days}d
                                </Button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-foreground">Entrada Mínima (R$)</Label>
                            <CurrencyField
                              value={carneMinDownPaymentCents}
                              onChange={setCarneMinDownPaymentCents}
                              placeholder="0,00"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 7. Aceita Troca / Permuta */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3",
                    acceptsTrade
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsTrade ? "bg-amber-600 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <RefreshCw className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Aceita Troca / Permuta</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Aceita propostas de troca por outros itens, veículos ou produtos
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsTrade}
                        onCheckedChange={setAcceptsTrade}
                        aria-label="Aceitar Troca"
                      />
                    </div>

                    {acceptsTrade && (
                      <div className="pt-2 border-t border-border/40 space-y-1">
                        <Label className="text-xs font-semibold text-foreground">O que você aceita na troca?</Label>
                        <Input
                          value={tradeNotes}
                          onChange={(e) => setTradeNotes(e.target.value)}
                          placeholder="Ex: Veículo, moto, eletrônicos ou itens sob avaliação"
                          className="h-9 text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* 8. Financiamento Bancário */}
                  <div className={cn(
                    "p-3.5 sm:p-4 rounded-xl border transition-all space-y-3",
                    acceptsFinancing
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 bg-muted/20 opacity-80"
                  )}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          acceptsFinancing ? "bg-teal-600 text-white shadow-2xs" : "bg-muted text-muted-foreground"
                        )}>
                          <Landmark className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">Financiamento Bancário</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Intermediação com bancos parceiros ou carta de consórcio contemplada
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={acceptsFinancing}
                        onCheckedChange={setAcceptsFinancing}
                        aria-label="Aceitar Financiamento"
                      />
                    </div>

                    {acceptsFinancing && (
                      <div className="pt-2 border-t border-border/40 space-y-1">
                        <Label className="text-xs font-semibold text-foreground">Bancos ou cartas aceitas</Label>
                        <Input
                          value={financingNotes}
                          onChange={(e) => setFinancingNotes(e.target.value)}
                          placeholder="Ex: Santander, BV, Bradesco ou consórcio contemplado"
                          className="h-9 text-xs"
                        />
                      </div>
                    )}
                  </div>

                </div>

                {/* Cancelamento */}
                <div className="space-y-1.5 pt-2 border-t border-border/40">
                  <Label className="text-xs text-foreground font-semibold">Política de Cancelamento</Label>
                  <Select value={cancellationPolicy} onValueChange={(v: any) => setCancellationPolicy(v)}>
                    <SelectTrigger className="h-11 rounded-xl text-xs bg-background font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flexible">Flexível (até 24h antes)</SelectItem>
                      <SelectItem value="moderate">Moderado (50% de reembolso)</SelectItem>
                      <SelectItem value="strict">Rígido (não reembolsável)</SelectItem>
                      <SelectItem value="negotiable">A combinar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Section 3: Fotos & Mídias com Upload Seguro */}
          <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
 <div className="flex items-center justify-between pb-2.5 border-b border-border/40">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <ImagePlus className="size-4 text-primary" />
 <span>4. Fotos e Vídeos</span>
 </div>
 <span className="text-[11px] font-mono text-muted-foreground">
 {images.length} adicionada(s)
 </span>
 </div>

 <MediaUploader
 value={images}
 onChange={setImages}
 onUploadingStateChange={setIsUploadingMedia}
 bucket="post-media"
 folder="classifieds"
 aspect={4 / 3}
 enableCrop={true}
 lockAspect={true}
 maxFiles={8}
 />
 </div>

 {/* Section 4: Localização Padronizada & WhatsApp */}
          <div className="bg-card rounded-2xl p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
 <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-2.5 border-b border-border/40">
 <MapPin className="size-4 text-primary" />
 <span>5. Localização e Contato</span>
 </div>

 <CityCombobox
 value={locationName}
 onChange={(formatted, struct) => {
 setLocationName(formatted);
 if (struct) setStructuredLoc(struct);
 }}
 label="Bairro e Cidade do Anúncio *"
 />

            {/* Controle de Privacidade Total de Endereço (LGPD) */}
            <div className="p-3.5 bg-muted/20 border border-border/70 rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <Label htmlFor="hide-location-toggle" className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-primary" />
                    Ocultar endereço completamente
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Não exibe cidade, bairro nem mapa no anúncio público.
                  </p>
                </div>
                <Switch
                  id="hide-location-toggle"
                  checked={hideLocation}
                  onCheckedChange={setHideLocation}
                />
              </div>
              {hideLocation && (
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
                  <Check className="size-3 shrink-0" />
                  Privacidade total ativa: nenhum dado geográfico ou mapa será exposto.
                </div>
              )}
            </div>

 <div className="space-y-1.5 pt-1">
 <Label className="text-xs text-foreground font-medium">
 WhatsApp para Contato Direto
 </Label>
 <PhoneField
									value={whatsapp}
									onChange={(val) => setWhatsapp(val || "")}
									placeholder="(49) 99999-9999"
									className="h-10 rounded-xl text-xs bg-background"
								/>
 </div>
 </div>

              {/* ── Seção 6: Agente Vendedor (SDR) — Configuração ── */}
              <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.03] p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-blue-500/15">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    <Bot className="size-4 text-blue-500 shrink-0" />
                    <span>6. Agente Vendedor (SDR)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {/* info modal via toast */ toast.info("O Agente SDR é um assistente IA que atende compradores em tempo real, responde dúvidas sobre o produto e ajuda a negociar dentro dos limites que você definir.", { duration: 8000 })}}
                      className="size-6 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
                      aria-label="Saiba mais sobre o Agente SDR"
                    >
                      <Info className="size-3.5" />
                    </button>
                    <Switch
                      id="ai-agent-enabled"
                      checked={aiAgentEnabled}
                      onCheckedChange={setAiAgentEnabled}
                    />
                  </div>
                </div>

                {!aiAgentEnabled && (
                  <p className="text-[12px] text-muted-foreground">
                    Ative o Agente SDR para que compradores possam tirar dúvidas com uma IA em tempo real.
                  </p>
                )}

                {aiAgentEnabled && (
                  <div className="space-y-4">
                    {/* Instruções para a IA (confidencial) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-foreground">
                          Instruções para o Agente (confidencial)
                        </Label>
                        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                          {aiInstructions.length}/1000
                        </span>
                      </div>
                      <textarea
                        value={aiInstructions}
                        onChange={(e) => setAiInstructions(e.target.value.slice(0, 1000))}
                        placeholder="Ex: O produto é novo na caixa. Prioridade para quem pagar à vista. Não revelar que há estoque de outros."
                        className="w-full min-h-[80px] resize-none rounded-xl border border-border/60 bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                        maxLength={1000}
                        aria-label="Instruções para o agente SDR"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Estas instruções são confidenciais — o agente nunca as revelará ao comprador.
                      </p>
                    </div>

                    {/* Desconto Máximo */}
                    <div className="space-y-2 p-3.5 bg-background rounded-xl border border-border/60">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <BadgePercent className="size-3.5 text-primary" />
                          Desconto Máximo Permitido
                        </Label>
                        <span className="text-xs font-bold text-foreground tabular-nums font-mono">
                          {maxDiscountPct === 0 ? "Sem desconto" : `${maxDiscountPct}%`}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={30}
                        step={1}
                        value={maxDiscountPct}
                        onChange={(e) => setMaxDiscountPct(Number(e.target.value))}
                        className="w-full h-2 rounded-full accent-primary cursor-pointer"
                        aria-label="Desconto máximo para o agente SDR"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                        <span>0%</span>
                        <span>10%</span>
                        <span>20%</span>
                        <span>30%</span>
                      </div>
                      {maxDiscountPct === 0 ? (
                        <p className="text-[11px] text-muted-foreground">
                          O agente não poderá negociar desconto algum — defenderá o preço cheio.
                        </p>
                      ) : (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                          O agente pode conceder até {maxDiscountPct}% de desconto como último recurso. Ele negociará profissionalmente antes de ceder.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

 </aside>


 {/* Painel Direito: Live Truthful Preview (Visualização Padrão) */}
 <main
 className={`md:col-span-7 ${mobileTab === "preview" ? "block" : "hidden md:block"} sticky top-0`}
 >
        {templateStyle === "editorial" || (templateStyle as string) === "instagram" ? (
          <div className="bg-card rounded-2xl overflow-hidden border border-border/60 shadow-2xs">
            <div className="bg-muted/40 px-4 py-2 flex items-center justify-between text-xs border-b border-border/40">
              <span className="font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Eye className="size-3.5 text-primary" />
                Prévia ao vivo
              </span>
            </div>
            <div className="max-h-[85vh] overflow-y-auto">
              <EditorialShowcaseView
                classified={livePreviewClassified}
                isOwner={false}
              />
            </div>
          </div>
        ) : niche.id === "mercado" || templateStyle === "conveniencia" ? (
          <div className="bg-card rounded-2xl overflow-hidden border border-border/60 shadow-2xs">
            <div className="bg-muted/40 px-4 py-2 flex items-center justify-between text-xs border-b border-border/40">
              <span className="font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Eye className="size-3.5 text-primary" />
                Prévia ao vivo · Mercado & Perecíveis
              </span>
            </div>
            <div className="max-h-[85vh] overflow-y-auto">
              <ConvenienceShowcaseView
                previewData={{
                  title: title || "Produto de Mercado / Conveniência",
                  description: description,
                  priceCents: priceCents || 0,
                  images: images,
                  locationName: locationName || "São Miguel do Oeste - SC",
                  whatsapp: whatsapp,
                  storeName: "Sua Loja",
                  volume: convenienceVolume,
                  unitType: groceryUnitType,
                  estimatedWeightPerUnit: groceryEstimatedWeightPerUnit,
                  department: CANONICAL_GROCERY_DEPARTMENTS.find((d) => d.id === groceryDepartment)?.label || "Mercado & Varejo",
                  subCategory: grocerySubCategory,
                  temperature: groceryTemperature,
                  isAlcoholic: groceryIsAlcoholic,
                  containsGluten: groceryContainsGluten ?? undefined,
                  containsLactose: groceryContainsLactose ?? undefined,
                  isOrganic: groceryIsOrganic,
                  brand: groceryBrand,
                  barcodeEan: groceryBarcodeEan,
                  ingredients: groceryIngredients,
                  prepOptions: groceryPrepOptions,
                  deliveryEstimate: groceryDeliveryEstimate,
                  deliveryFeeCents: groceryDeliveryFeeCents,
                  acceptsPix,
                  pixDiscountPercent,
                  acceptsCard,
                  maxInstallments,
                  cardInterestFree,
                  acceptsCash,
                  groceryFreshPricing: grocerySupportsFreshPricing ? {
                    supports_fresh_pricing: true,
                    default_pricing_mode: groceryDefaultPricingMode,
                    avg_piece_weight_grams: groceryAvgPieceWeightGrams,
                    price_per_kg_cents: groceryPricePerKgCents || ((priceCents || 0) > 0 ? (priceCents || 0) * 2 : 990),
                    price_per_unit_cents: priceCents || 0,
                  } : undefined,
                  groceryRipenessConfig: groceryRipenessEnabled ? {
                    enabled: true,
                    stages: groceryRipenessStages,
                    default_stage: "maduro",
                  } : undefined,
                  progressiveDiscountTiers: groceryProgressiveDiscountsEnabled && groceryDiscountTiers.length > 0 ? groceryDiscountTiers : undefined,
                  orderBumpOffer: groceryOrderBumpEnabled && groceryOrderBumpTitle.trim() ? {
                    enabled: true,
                    mode: "manual",
                    target_title: groceryOrderBumpTitle.trim(),
                    special_price_cents: groceryOrderBumpSpecialPriceCents,
                    original_price_cents: groceryOrderBumpOriginalPriceCents,
                    badge_text: groceryOrderBumpBadge || "Oferta Relâmpago",
                  } : undefined,
                }}
                isOwner={false}
              />
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl overflow-hidden border border-border/60 shadow-2xs">
            {/* Header da Prévia */}
            <div className="bg-muted/40 px-4 py-2 flex items-center justify-between text-xs border-b border-border/40">
              <span className="font-semibold flex items-center gap-1.5 text-muted-foreground">
                <Eye className="size-3.5 text-primary" />
                Prévia ao vivo
              </span>
            </div>

 <div className="p-4 md:p-6 space-y-6">
 {/* Galeria de Fotos da Prévia */}
 <div className="space-y-2">
 <div className="relative aspect-video rounded-xl overflow-hidden bg-muted/60 flex items-center justify-center">
 {images.length > 0 ? (
 <img
 src={images[activePreviewImage] || images[0]}
 alt="Prévia"
 className="w-full h-full object-cover"
 />
 ) : (
 <div className="flex flex-col items-center gap-2 text-muted-foreground p-6 text-center">
 <ImagePlus className="size-10 stroke-[1.5]" />
 <p className="text-xs">
 Adicione fotos no editor para visualizar a galeria pública
 </p>
 </div>
 )}
 </div>

 {images.length > 1 && (
 <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 ">
 {images.map((img, idx) => (
 <button
 key={idx}
 type="button"
 onClick={() => setActivePreviewImage(idx)}
 className={`size-14 rounded-lg overflow-hidden border shrink-0 transition-all ${
 activePreviewImage === idx
 ? "border-primary ring-2 ring-primary/20"
 : "border-border opacity-70"
 }`}
 >
 <img
 src={img}
 alt={`Thumb ${idx}`}
 className="w-full h-full object-cover"
 />
 </button>
 ))}
 </div>
 )}
 </div>

 {/* Informações Principais */}
 <div className="space-y-3">
 <div className="flex items-center justify-between gap-2">
 <Badge variant="outline" className="text-xs font-semibold">
 {niche.title}
 </Badge>
 {locationName && (
 <span className="text-xs text-muted-foreground flex items-center gap-1">
 <MapPin className="size-3 text-primary" />
 {locationName}
 </span>
 )}
 </div>

 <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
 {title || "Título do Anúncio aparecerá aqui..."}
 </h1>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl font-black text-primary font-mono">
                    {pricingType === "free" || niche.id === "doacao"
                      ? "Gratuito / Doação"
                      : pricingType === "on_quote"
                      ? "Sob Consulta"
                      : pricingType === "exchange_only"
                      ? "Somente Troca / Permuta"
                      : pricingType === "starting_at"
                      ? `A partir de ${formatMoney(priceMinCents || parsedPriceCents || 0)}`
                      : pricingType === "price_range"
                      ? `${formatMoney(priceMinCents || 0)} - ${formatMoney(priceMaxCents || 0)}`
                      : parsedPriceCents
                      ? formatMoney(parsedPriceCents)
                      : "A Combinar"}
                  </span>
                  {niche.id === "hospedagem" && parsedPriceCents && (
                    <span className="text-xs font-semibold text-muted-foreground">/diária</span>
                  )}
                  {niche.id === "imovel" && reDealType === "aluguel" && parsedPriceCents && (
                    <span className="text-xs font-semibold text-muted-foreground">/mês</span>
                  )}
                  {negotiable && pricingType !== "on_quote" && pricingType !== "free" && (
                    <Badge variant="secondary" className="text-[10px]">
                      Aceita Propostas
                    </Badge>
                  )}
                </div>

                {/* Disclaimer de Preço na Prévia Padrão */}
                {priceDisclaimer && priceDisclaimer !== "none" && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                    <Info className="size-3 shrink-0" />
                    <span>
                      {priceDisclaimer === "custom" && customDisclaimer
                        ? customDisclaimer
                        : priceDisclaimer === "demonstrative"
                        ? "Valor ilustrativo / demonstrativo — proposta final emitida sob consulta."
                        : priceDisclaimer === "subject_to_availability"
                        ? "Preço e disponibilidade sujeitos a alteração e confirmação de estoque."
                        : priceDisclaimer === "seasonal"
                        ? "Tarifa promocional válida para baixa temporada e dias úteis."
                        : priceDisclaimer === "exchange_rate"
                        ? "Valores sujeitos a flutuação cambial e taxas governamentais."
                        : "Consulte condições comerciais atualizadas."}
                    </span>
                  </p>
                )}

                {/* Desconto PIX na Prévia Padrão */}
                {acceptsPix && pixDiscountPercent > 0 && parsedPriceCents && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <BadgePercent className="size-3 shrink-0" />
                    <span>
                      <strong>{pixDiscountPercent}% de desconto</strong> no PIX ({formatMoney(Math.round(parsedPriceCents * (1 - pixDiscountPercent / 100)))})
                    </span>
                  </p>
                )}

                {niche.id === "hospedagem" && hospCleaningFeeCents && hospCleaningFeeCents > 0 && (
                  <p className="text-[11px] text-muted-foreground font-medium">
                    + Taxa de Limpeza: <strong className="text-foreground">{formatMoney(hospCleaningFeeCents)}</strong> (taxa única por estadia)
                  </p>
                )}

                {parsedPriceCents && acceptsCard && parseInt(String(maxInstallments)) > 1 && niche.id !== "hospedagem" && (
                  <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                    <CreditCard className="size-3 text-primary" />
                    <span>
                      ou em até <strong>{maxInstallments}x de {formatMoney(Math.round(parsedPriceCents / (parseInt(String(maxInstallments)) || 1)))}</strong>
                    </span>
                  </p>
                )}
              </div>

 {/* Badges Semânticos de Acordo com o Nicho */}
 {niche.id === "hospedagem" && (
 <div className="flex flex-wrap gap-1.5 pt-1">
 <Badge variant="outline" className="text-[10px] font-medium gap-1 bg-muted/40">
 <Key className="size-3 text-primary" />
 <span>
 {hospCheckinType === "self_checkin"
 ? "Self Check-in (Fechadura Eletrônica)"
 : hospCheckinType === "front_desk"
 ? "Portaria 24h"
 : "Check-in Presencial"}
 </span>
 </Badge>
 <Badge variant="outline" className="text-[10px] font-medium gap-1 bg-muted/40">
 <span>{hospGuests} Hóspedes máx.</span>
 </Badge>
 <Badge variant="outline" className="text-[10px] font-medium gap-1 bg-muted/40">
 <span>{hospPropertyType}</span>
 </Badge>
 {acceptsPix && (
 <Badge variant="secondary" className="text-[10px] font-medium gap-1">
 <QrCode className="size-3 text-emerald-600" />
 <span>PIX</span>
 </Badge>
 )}
 {acceptsCard && (
 <Badge variant="secondary" className="text-[10px] font-medium gap-1">
 <CreditCard className="size-3 text-blue-600" />
 <span>Cartão</span>
 </Badge>
 )}
 </div>
 )}

 {niche.id === "desapego" && (
 <div className="flex flex-wrap gap-1.5 pt-1">
 {deliveryMode === "both" && (
 <Badge variant="outline" className="text-[10px] font-medium gap-1 bg-muted/40">
 <Truck className="size-3 text-primary" />
 <span>Retirada & Entrega Local</span>
 </Badge>
 )}
 {deliveryMode === "local_delivery" && (
 <Badge variant="outline" className="text-[10px] font-medium gap-1 bg-muted/40">
 <Truck className="size-3 text-primary" />
 <span>Entrega Waesy Express</span>
 </Badge>
 )}
 {deliveryMode === "pickup" && (
 <Badge variant="outline" className="text-[10px] font-medium gap-1 bg-muted/40">
 <Package className="size-3 text-primary" />
 <span>Somente Retirada</span>
 </Badge>
 )}
 {deliveryMode === "shipping" && (
 <Badge variant="outline" className="text-[10px] font-medium gap-1 bg-muted/40">
 <Truck className="size-3 text-primary" />
 <span>Envio Nacional</span>
 </Badge>
 )}
 <Badge variant="secondary" className="text-[10px] font-medium">
 {itemCondition === "novo"
 ? "Novo / Na Caixa"
 : itemCondition === "usado_excelente"
 ? "Usado - Como Novo"
 : itemCondition === "usado_bom"
 ? "Usado - Bom Estado"
 : "Usado - Com Marcas"}
 </Badge>
 {acceptsPix && (
 <Badge variant="secondary" className="text-[10px] font-medium gap-1">
 <QrCode className="size-3 text-emerald-600" />
 <span>PIX</span>
 </Badge>
 )}
 {acceptsTrade && (
 <Badge variant="secondary" className="text-[10px] font-medium gap-1">
 <RefreshCw className="size-3 text-amber-600" />
 <span>Aceita Troca</span>
 </Badge>
 )}
 </div>
 )}

 {(niche.id === "veiculo" || niche.id === "desapego") && (
 <div className="flex flex-wrap gap-1.5 pt-1">
 {acceptsPix && (
 <Badge variant="secondary" className="text-[10px] font-medium gap-1">
 <QrCode className="size-3 text-emerald-600" />
 <span>PIX</span>
 </Badge>
 )}
 {acceptsCard && (
 <Badge variant="secondary" className="text-[10px] font-medium gap-1">
 <CreditCard className="size-3 text-blue-600" />
 <span>Cartão</span>
 </Badge>
 )}
 {acceptsCash && (
 <Badge variant="secondary" className="text-[10px] font-medium gap-1">
 <Banknote className="size-3 text-slate-600" />
 <span>Dinheiro</span>
 </Badge>
 )}
 </div>
 )}

 <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap pt-2 ">
 {description ||
 "A descrição detalhada do anúncio aparecerá aqui conforme você digita no formulário à esquerda..."}
 </p>
 </div>

 {/* Simulador de Frete & Logística Waesy Express na Prévia (Apenas para Desapego) */}
 {niche.id === "desapego" && (deliveryMode === "both" || deliveryMode === "local_delivery" || deliveryMode === "shipping") && (
 <div className="border border-primary/30 rounded-2xl p-4 bg-primary/5 space-y-2.5">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
 <Truck className="size-4 text-primary" />
 <span>Simulação de Frete & Entrega (Comprador)</span>
 </div>
 <Badge variant="default" className="text-[9px] font-mono bg-primary text-primary-foreground">
 Waesy Express
 </Badge>
 </div>

 <div className="space-y-1.5 text-xs pt-1">
 <div className="flex items-center justify-between p-2 rounded-xl bg-background ">
 <div className="flex items-center gap-2">
 <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
 <Truck className="size-3.5" />
 </div>
 <div>
 <p className="font-semibold text-xs text-foreground">Entrega Expressa Motoboy</p>
 <p className="text-[10px] text-muted-foreground">Chega hoje em até 2 horas</p>
 </div>
 </div>
 <span className="font-bold text-xs text-primary font-mono">
 {freeShippingLocal ? "Grátis" : "R$ 12,00"}
 </span>
 </div>

 <div className="flex items-center justify-between p-2 rounded-xl bg-background ">
 <div className="flex items-center gap-2">
 <div className="size-6 rounded-lg bg-muted flex items-center justify-center text-foreground">
 <Package className="size-3.5" />
 </div>
 <div>
 <p className="font-semibold text-xs text-foreground">Ponto PUDO / Locker Waesy</p>
 <p className="text-[10px] text-muted-foreground">Retire no ponto credenciado</p>
 </div>
 </div>
 <span className="font-bold text-xs text-foreground font-mono">
 R$ 5,00
 </span>
 </div>
 </div>
 </div>
 )}

 {/* Especificações na Prévia */}
 {niche.id === "hospedagem" && (
 <div className="rounded-xl p-4 bg-muted/20 space-y-3">
 <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
 <Key className="size-3.5 text-primary" />
 <span>Detalhes da Estadia & Regras</span>
 </h3>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
 <div>
 <span className="text-muted-foreground block text-[10px]">Tipo</span>
 <span className="font-semibold">{hospPropertyType}</span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px]">Capacidade</span>
 <span className="font-semibold font-mono">{hospGuests} hóspedes</span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px]">Check-in</span>
 <span className="font-semibold font-mono">A partir de {hospCheckinTime}</span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px]">Check-out</span>
 <span className="font-semibold font-mono">Até às {hospCheckoutTime}</span>
 </div>
 </div>
 {hospAmenities.length > 0 && (
 <div className="pt-2 border-t border-border/40">
 <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1.5">
 Comodidades
 </span>
 <div className="flex flex-wrap gap-1">
 {hospAmenities.map((a) => (
 <Badge key={a} variant="outline" className="text-[10px] bg-background">
 {a}
 </Badge>
 ))}
 </div>
 </div>
 )}
 </div>
 )}

 {niche.id === "imovel" && (
 <div className=" rounded-xl p-4 bg-muted/20 space-y-2">
 <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
 Especificações do Imóvel
 </h3>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
 <div>
 <span className="text-muted-foreground block text-[10px]">Finalidade</span>
 <span className="font-semibold capitalize">{reDealType}</span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px]">Área</span>
 <span className="font-semibold font-mono">
 {reAreaSqm ? `${reAreaSqm} m²` : "—"}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px]">Quartos</span>
 <span className="font-semibold font-mono">{reBedrooms || "—"}</span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px]">Vagas</span>
 <span className="font-semibold font-mono">{reParking || "—"}</span>
 </div>
 </div>
 </div>
 )}

 {niche.id === "veiculo" && (
 <div className=" rounded-xl p-4 bg-muted/20 space-y-2">
 <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
 Especificações do Veículo
 </h3>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
 <div>
 <span className="text-muted-foreground block text-[10px]">Marca/Modelo</span>
 <span className="font-semibold">
 {vehicleBrand} {vehicleModel}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px]">Ano</span>
 <span className="font-semibold font-mono">
 {vehicleYearFab || "—"}/{vehicleYearModel || "—"}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px]">Km</span>
 <span className="font-semibold font-mono">
 {vehicleKm ? `${vehicleKm} km` : "—"}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground block text-[10px]">Câmbio</span>
 <span className="font-semibold">{vehicleTransmission}</span>
 </div>
 </div>
 </div>
 )}

 {/* Botão de Contato na Prévia */}
 <div className="pt-2">
 <Button
 type="button"
 disabled
 className="w-full rounded-xl bg-emerald-600 text-white font-bold text-xs gap-2 h-11 opacity-90 cursor-not-allowed"
 >
 <Phone className="size-4" />
 <span>
 {niche.id === "hospedagem"
 ? "Reservar Estadia"
 : niche.id === "imovel"
 ? "Agendar Visita"
 : niche.id === "veiculo"
 ? "Agendar Test Drive"
 : niche.id === "servico"
 ? "Solicitar Orçamento"
 : niche.id === "vaga"
 ? "Candidatar-se"
 : "Falar com Vendedor"}
 </span>
 </Button>
 </div>
 </div>
 </div>
        )}
 </main>
 </div>
      )}
 </div>
 );
}
