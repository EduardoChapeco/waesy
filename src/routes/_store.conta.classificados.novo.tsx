import { createFileRoute, useNavigate, useSearch, Link, redirect } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useRef, useCallback, lazy } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tag, Car, Home as HomeIcon, Tractor, Briefcase, Wrench, Sliders, ArrowLeft, ChevronRight, Eye, EyeOff, Edit3, ImagePlus, MapPin, MessageCircle, ShieldCheck, Check, Loader2, Phone, FileText, DollarSign, Layers, ChevronLeft, Building, Building2, Key, Truck, Package, CreditCard, QrCode, RefreshCw, Banknote, DownloadCloud, FileArchive, Search, Utensils, Plane, Thermometer, CreditCard as CreditCardIcon, PlusCircle, Coins, Wand2, Bot, BadgePercent, Landmark, Info, Trash2, Plus, Bus, Ship, Train, Navigation, Route as RouteIcon, Users, Calendar, Clock, ChevronDown, ChevronUp, X, CheckCircle, GraduationCap, Award, SlidersHorizontal, Store as StoreIcon, Star, Lock, ShieldAlert, FileSpreadsheet, Receipt, BookOpenCheck, Zap, Apple, Flame, Croissant, Milk, Wine, Palette, Ticket, Mic, Coffee, HelpCircle, Compass, Camera, ExternalLink, Film } from 'lucide-react';
import type { StoryHighlight } from "@/components/classifieds/story-highlight-uploader";
import type { ItineraryDay } from "@/components/classifieds/itinerary-day-editor";
import type { CopilotScope, CopilotWorkingDraft, EditorialFieldKey } from "@/lib/classifieds/ai-writing-copilot";
import type {
  EventTicketTier,
  EventScheduleItem,
  EventSpeaker,
  EventSponsor,
  EventSurvey,
  EventPollOptionNormalized,
} from "@/components/classifieds/event-classified-showcase-view";

const StoryHighlightUploader = lazy(() =>
  import("@/components/classifieds/story-highlight-uploader").then((m) => ({ default: m.StoryHighlightUploader })),
);
const EditorialShowcaseView = lazy(() =>
  import("@/components/classifieds/editorial-showcase-view").then((m) => ({ default: m.EditorialShowcaseView })),
);
const AiWritingCopilotSheet = lazy(() =>
  import("@/components/classifieds/ai-writing-copilot-sheet").then((m) => ({ default: m.AiWritingCopilotSheet })),
);
const UniversalClassifiedShowcase = lazy(() =>
  import("@/components/classifieds/universal-classified-showcase").then((m) => ({ default: m.UniversalClassifiedShowcase })),
);
const ConvenienceShowcaseView = lazy(() =>
  import("@/components/classifieds/convenience-showcase-view").then((m) => ({ default: m.ConvenienceShowcaseView })),
);
const TravelPromoFlyerModal = lazy(() =>
  import("@/components/tourism/promotional-flyer/travel-promo-flyer-modal").then((m) => ({ default: m.TravelPromoFlyerModal })),
);
const FipeVehicleSelector = lazy(() =>
  import("@/components/classifieds/fipe-vehicle-selector").then((m) => ({ default: m.FipeVehicleSelector })),
);
const DigitalFileDropzone = lazy(() =>
  import("@/components/classifieds/digital-file-dropzone").then((m) => ({ default: m.DigitalFileDropzone })),
);
import { uploadClassifiedMedia, uploadClassifiedDocument } from "@/lib/classifieds/upload-classified-media";
import type { DepartureOption } from "@/lib/classifieds/canonical-airports";
import { SeoGeoOptimizationPanel, type SeoGeoMetadata } from "@/components/seo";
import { cn } from "@/lib/utils";
import { ClassifiedTemplateStyle, ClassifiedDisplayMode, CivilInquiryQuestion, CivilInquiryConfig } from "@/types/unified-ad-engine";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { PhoneField } from "@/components/ui/phone-field";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaUploader } from "@/components/ui/media-uploader";
import { ChoiceCard } from "@/components/ui/choice-card";
import { SquircleCard } from "@/components/ui/squircle-card";
import { CityCombobox, type StructuredLocationValue } from "@/components/ui/city-combobox";
import { resolveStorageMediaUrl } from "@/lib/classifieds/storage-media";
import { upsertClassified, getPublicClassifiedById, refineClassifiedWithAI } from "@/services/classifieds.functions";
import { getMyStoresList } from "@/services/store.functions";
import { getProfile, getUserSession } from "@/services/auth.functions";
import { listStoreLeadForms } from "@/services/lead-forms.functions";
import { RouteErrorFallback } from "@/components/state/route-error-fallback";
import { ClassifiedMediaSection } from "@/components/classifieds/classified-media-section";
import { ClassifiedLocationSection } from "@/components/classifieds/classified-location-section";
import { ClassifiedEventSection } from "@/components/classifieds/creator/sections/classified-event-section";
import { ClassifiedGrocerySection } from "@/components/classifieds/creator/sections/classified-grocery-section";
import { ClassifiedPaymentMethodsSection } from "@/components/classifieds/creator/sections/classified-payment-methods-section";
import { ClassifiedTravelSection } from "@/components/classifieds/creator/sections/classified-travel-section";
import { CreateTypePicker } from "@/components/classifieds/creator/create-type-picker";
import {
  type NicheDefinition,
  type TravelLodging,
  type ClassifiedNicheType,
  NICHE_CARDS,
  DESAPEGO_TAXONOMY,
  CANONICAL_LODGING_AMENITIES,
} from "@/components/classifieds/creator/niche-cards";
import { analyzeCommercialPointPotential, auditCnpjWithSimLabs } from "@/services/market-intelligence.functions";
import { lookupCnpj } from "@/services/public-apis.functions";
import { CANONICAL_VEHICLE_BRANDS, CANONICAL_TRANSMISSIONS, CANONICAL_FUELS, CANONICAL_VEHICLE_COLORS, CANONICAL_VEHICLE_OPTIONS, CANONICAL_VEHICLE_PROVENANCE, CANONICAL_GOODS_SEGMENTS, CANONICAL_ITEM_CONDITIONS, CANONICAL_SMARTPHONE_BRANDS, CANONICAL_COMPUTER_TYPES, CANONICAL_COMPUTER_BRANDS, CANONICAL_PROCESSORS, CANONICAL_RAM_OPTIONS, CANONICAL_STORAGE_OPTIONS, CANONICAL_APPLIANCE_TYPES, CANONICAL_APPLIANCE_BRANDS, CANONICAL_VOLTAGES, CANONICAL_GAME_CONSOLES, CANONICAL_FASHION_CATEGORIES, CANONICAL_FASHION_SIZES, CANONICAL_FOOD_SUBNICHES, CANONICAL_SERVICE_SUBNICHES, CANONICAL_BUSINESS_TYPES, CANONICAL_BUSINESS_SEGMENTS, CANONICAL_SALE_REASONS, CANONICAL_EMPLOYEES_RANGES, CANONICAL_COMMERCIAL_POINT_TYPES, CANONICAL_INVESTMENT_MODELS, CANONICAL_PROJECT_STAGES, CANONICAL_USE_OF_FUNDS, CANONICAL_GROCERY_DEPARTMENTS, CANONICAL_UNIT_TYPES, CANONICAL_STORAGE_TEMPERATURES, CANONICAL_MEAT_CUT_OPTIONS, CANONICAL_BAKERY_PREP_OPTIONS, GroceryFreshPricing, GroceryRipenessConfig, ProgressiveDiscountTier, OrderBumpOffer, RipenessStage, DEFAULT_RIPENESS_LABELS, getDefaultClassifiedTemplateForNiche, getAllowedClassifiedTemplatesForNiche, resolveCompatibleClassifiedTemplate } from "@/lib/classifieds/canonical-taxonomy";
import { CANONICAL_EDUCATION_LEVELS, CANONICAL_EXPERIENCE_LEVELS, CANONICAL_JOB_REGIMES, CANONICAL_WORKPLACE_MODELS, CANONICAL_WORK_SCHEDULES, CANONICAL_SALARY_RANGES, CANONICAL_JOB_BENEFITS, SUGGESTED_JOB_SKILLS, getEducationLabel, getExperienceLabel, getRegimeLabel, getWorkplaceModelLabel } from "@/lib/classifieds/canonical-hiring";
import { resolveClassifiedNiche, getNicheDefaultInquiryConfig, isNichePaymentApplicable } from "@/lib/classifieds/semantics";
import { z } from "zod";

const ClassifiedSearchSchema = z.object({
  tipo: z.string().optional(),
  niche: z.string().optional(),
  sub: z.string().optional(),
  editId: z.string().optional(),
  storeId: z.string().optional(),
});

export const Route = createFileRoute("/_store/conta/classificados/novo")({
  validateSearch: ClassifiedSearchSchema,
  head: () => ({ meta: [{ title: "Criar Classificado | Waesy" }] }),
  beforeLoad: async ({ location }) => {
    const session = await getUserSession().catch(() => null);
    if (!session) {
      throw redirect({
        to: "/entrar",
        search: { returnUrl: location.pathname + (location.searchStr || "") },
      });
    }
  },
  errorComponent: ContaClassificadoNovoErrorComponent,
  component: NovoClassificadoPage,
});

function ContaClassificadoNovoErrorComponent({ error, reset }: { error: unknown; reset?: () => void }) {
  return (
    <RouteErrorFallback
      error={error}
      reset={reset}
      icon={Tag}
      title="Falha ao Carregar Formulário de Anúncio"
      description="Não foi possível preparar o assistente de publicação no momento."
      secondaryHref="/conta/classificados"
      secondaryLabel="Voltar aos Anúncios"
      showErrorDetails
    />
  );
}

export { type TravelLodging, DESAPEGO_TAXONOMY, CANONICAL_LODGING_AMENITIES };

function NovoClassificadoPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const rawSearchType = (search?.tipo || search?.niche)?.toLowerCase();
  const selectedType = (
    rawSearchType === "event" || rawSearchType === "evento" || rawSearchType === "eventos" || rawSearchType === "show"
      ? "evento"
      : rawSearchType === "travel" || rawSearchType === "viagem" || rawSearchType === "turismo"
      ? "viagem"
      : rawSearchType === "job" || rawSearchType === "vaga" || rawSearchType === "vagas" || rawSearchType === "emprego"
      ? "vaga"
      : search?.tipo || search?.niche
  ) as ClassifiedNicheType | undefined;
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
            const parsed = JSON.parse(saved);
            const savedNiche = parsed?.attributes?.niche || parsed?.category;
            // Se o usuário navegou explicitamente com ?tipo=x e o prefill é incompatível, descarta prefill residual
            if (selectedType && savedNiche && savedNiche !== selectedType && savedNiche !== "goods") {
              sessionStorage.removeItem("waesy_ai_prefill");
              setInitialData(null);
            } else {
              setInitialData(parsed);
            }
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
      const rawNiche = initialData.attributes?.niche || "";
      const normalizeNiche = (id?: string) => {
        if (!id) return undefined;
        const s = id.toLowerCase();
        if (s === "business" || s === "negocio" || s === "negocios") return "negocio";
        if (s === "food" || s === "gastronomia" || s === "alimentacao") return "gastronomia";
        if (s === "travel" || s === "viagem" || s === "turismo") return "viagem";
        if (s === "equipment" || s === "equipamento" || s === "equipamentos") return "equipamento";
        if (s === "donation" || s === "doacao" || s === "doacoes") return "doacao";
        if (s === "job" || s === "vaga" || s === "vagas" || s === "emprego") return "vaga";
        if (s === "agri" || s === "agro" || s === "maquinario") return "agro";
        if (s === "pharmacy" || s === "farmacia") return "farmacia";
        if (s === "real_estate" || s === "imovel" || s === "imoveis") return "imovel";
        if (s === "vehicle" || s === "veiculo" || s === "veiculos") return "veiculo";
        if (s === "goods" || s === "desapego" || s === "produtos") return "desapego";
        if (s === "digital" || s === "infoproduto") return "digital";
        if (s === "hospitality" || s === "hospitality_stay" || s === "hospedagem" || s === "temporada") return "hospedagem";
        if (s === "service" || s === "servico" || s === "servicos") return "servico";
        if (s === "subscription" || s === "assinatura" || s === "assinaturas") return "assinatura";
        if (s === "pharmacy" || s === "farmacia") return "farmacia";
        if (s === "market" || s === "mercado") return "mercado";
        if (s === "event" || s === "evento" || s === "eventos" || s === "show") return "evento";
        return s;
      };

      const normalizedSaved = normalizeNiche(rawNiche);
      if (normalizedSaved) {
        const found = NICHE_CARDS.find((n) => n.id === normalizedSaved);
        if (found) return found;
      }

      if (initialData.category === "event" || initialData.attributes?.niche === "evento") {
        return NICHE_CARDS.find((n) => n.id === "evento");
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
      if (initialData.category === "food" || initialData.category === "gastronomia") {
        return NICHE_CARDS.find((n) => n.id === "gastronomia");
      }
      if (initialData.category === "business" || initialData.category === "negocio" || initialData.attributes?.is_business_sale) {
        return NICHE_CARDS.find((n) => n.id === "negocio");
      }
      if (initialData.category === "pharmacy" || initialData.category === "farmacia") {
        return NICHE_CARDS.find((n) => n.id === "farmacia");
      }
      if (initialData.category === "market" || initialData.category === "mercado") {
        return NICHE_CARDS.find((n) => n.id === "mercado");
      }
      if (initialData.category === "sale") {
        return initialData.is_digital || initialData.digital_file_url
          ? NICHE_CARDS.find((n) => n.id === "digital")
          : NICHE_CARDS.find((n) => n.id === "desapego");
      }

      // Fallback semântico canonizado
      try {
        const semantic = resolveClassifiedNiche(initialData);
        const mappedId = normalizeNiche(semantic.id);
        if (mappedId) {
          const found = NICHE_CARDS.find((n) => n.id === mappedId);
          if (found) return found;
        }
      } catch (e) {
        // Fallback pass-through
      }
    }
    return undefined;
  }, [selectedType, initialData]);

  if (isLoadingEdit) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-200">
        <div className="space-y-2">
          <Skeleton className="h-11 min-h-11 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="flex justify-end gap-3">
          <Skeleton className="h-11 w-32 rounded-lg" />
          <Skeleton className="h-11 w-40 rounded-lg" />
        </div>
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
            location_name: listing.location || "",
            negotiable: true,
            attributes: {
              ...(listing.attributes || {}),
              niche: resolvedNiche,
              subcategory: resolvedSub,
              pricing_type: listing.price_cents ? "fixed" : "free",
              delivery_type: listing.delivery_type || "pickup",
              search_tags: listing.search_tags || [],
              seo_meta_tags: listing.seo_meta_tags || [],
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

// CreateTypePicker extraído para @/components/classifieds/creator/create-type-picker.tsx

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
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

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
  // Estados para Nicho: Agro & Maquinário
  const [agriHoursUsed, setAgriHoursUsed] = useState(initialData?.attributes?.hours_used || initialData?.attributes?.horimetro || "");
  const [agriTraction, setAgriTraction] = useState(initialData?.attributes?.traction || initialData?.attributes?.tracao || "4x4");
  const [agriImplementType, setAgriImplementType] = useState(initialData?.attributes?.implement_type || "Trator");
  const [agriYearFab, setAgriYearFab] = useState(initialData?.attributes?.year_fab || "");
  const [agriPowerCv, setAgriPowerCv] = useState(initialData?.attributes?.power_cv || "");
  const [agriCabinType, setAgriCabinType] = useState(initialData?.attributes?.cabin_type || "cabin");

  // Estados para Nicho: Farmácia & Saúde
  const [pharmacySubNiche, setPharmacySubNiche] = useState(initialData?.attributes?.subniche || "Medicamento");
  const [pharmacyRetentionPrescription, setPharmacyRetentionPrescription] = useState<boolean>(initialData?.attributes?.retention_prescription ?? false);
  const [pharmacyActiveIngredient, setPharmacyActiveIngredient] = useState(initialData?.attributes?.active_ingredient || "");
  const [pharmacyManufacturer, setPharmacyManufacturer] = useState(initialData?.attributes?.manufacturer || "");
  const [pharmacyAnvisaRegistry, setPharmacyAnvisaRegistry] = useState(initialData?.attributes?.anvisa_registry || "");

 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isUploadingMedia, setIsUploadingMedia] = useState(false);

 // Common Form States
 const [title, setTitle] = useState(initialData?.title || "");
 const [description, setDescription] = useState(
   initialData?.content || initialData?.description || ""
 );
  const [copilotModalOpen, setCopilotModalOpen] = useState(false);
  const [copilotInitialScope, setCopilotInitialScope] = useState<CopilotScope>("all_editorial_fields");
  const [editorialTags, setEditorialTags] = useState<string[]>(() =>
    Array.isArray(initialData?.attributes?.tags) ? initialData.attributes.tags : []
  );
  const [editorialSummary, setEditorialSummary] = useState<string>(() =>
    typeof initialData?.attributes?.summary === "string"
      ? initialData.attributes.summary
      : Array.isArray(initialData?.attributes?.bio_bullets)
        ? initialData.attributes.bio_bullets.join("\n")
        : ""
  );

  const [seoGeo, setSeoGeo] = useState<SeoGeoMetadata>({
    seoTitle: initialData?.attributes?.seo_title || initialData?.title || "",
    seoDescription: initialData?.attributes?.seo_description || initialData?.attributes?.summary || "",
    keywords: Array.isArray(initialData?.attributes?.tags) ? initialData.attributes.tags : [],
    latitude: initialData?.latitude ?? null,
    longitude: initialData?.longitude ?? null,
    neighborhood: initialData?.neighborhood || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    allowAiIndexing: initialData?.attributes?.allow_ai_indexing ?? true,
  });

  const buildCurrentNicheContext = () => {
    const ctx: Record<string, any> = {};
    if (priceCents) ctx["price"] = formatMoney(priceCents);
    if (locationName) ctx["location_name"] = locationName;
    if (structuredLoc?.city) ctx["city"] = structuredLoc.city;
    if (structuredLoc?.neighborhood) ctx["neighborhood"] = structuredLoc.neighborhood;
    if (niche.id === "veiculo") {
      if (vehicleBrand) ctx["brand"] = vehicleBrand;
      if (vehicleModel) ctx["model"] = vehicleModel;
      if (vehicleVersion) ctx["version"] = vehicleVersion;
      if (vehicleYearModel) ctx["year"] = vehicleYearModel;
      if (vehicleYearFab) ctx["year_fab"] = vehicleYearFab;
      if (vehicleKm) ctx["mileage"] = `${vehicleKm} km`;
      if (vehicleTransmission) ctx["transmission"] = vehicleTransmission;
      if (vehicleFuel) ctx["fuel"] = vehicleFuel;
      if (vehicleColor) ctx["color"] = vehicleColor;
      if (vehicleFeatures?.length) ctx["features"] = vehicleFeatures;
    } else if (niche.id === "imovel") {
      ctx["transaction_type"] = reDealType === "aluguel" ? "Locação" : "Venda";
      if (rePropertyType) ctx["property_type"] = rePropertyType;
      if (reAreaSqm) ctx["area_sqm"] = `${reAreaSqm}m²`;
      if (reBedrooms) ctx["bedrooms"] = reBedrooms;
      if (reSuites) ctx["suites"] = reSuites;
      if (reParking) ctx["parking_spaces"] = reParking;
      if (reCondoCents) ctx["condo_fee"] = formatMoney(reCondoCents);
      if (reIptuCents) ctx["iptu"] = formatMoney(reIptuCents);
      if (reAmenities?.length) ctx["amenities"] = reAmenities;
    } else if (niche.id === "viagem") {
      if (travelDestinationCity) ctx["destination"] = travelDestinationCity;
      if (travelDuration) ctx["duration_days"] = travelDuration;
      if (travelMealPlan) ctx["meal_plan"] = travelMealPlan;
      if (travelGuests) ctx["guests"] = travelGuests;
      if (travelTransportType) ctx["transport"] = travelTransportType === "flight" ? "Aéreo" : travelTransportType === "bus" ? "Rodoviário" : travelTransportType;
      if (travelDepartureCity) ctx["departure_location"] = travelDepartureCity;
      if (travelDepartureDate) ctx["departure_date"] = travelDepartureDate;
      if (travelReturnDate) ctx["return_date"] = travelReturnDate;
      if (travelStoryHighlights?.length) ctx["highlights"] = travelStoryHighlights.map((s) => s.title);
      if (travelItineraryDays?.length) {
        ctx["itinerary"] = travelItineraryDays.map((d) => `Dia ${d.day_number}: ${d.title}`).join("; ");
      }
    } else if (niche.id === "evento") {
      if (eventDate) ctx["event_date"] = eventDate;
      if (eventStartTime) ctx["start_time"] = eventStartTime;
      if (eventVenueName) ctx["venue_name"] = eventVenueName;
      if (eventSpeakers?.length) ctx["lineup"] = eventSpeakers.map((s) => s.name).join(", ");
      if (eventTicketTiers?.length) ctx["ticket_tiers"] = eventTicketTiers.map((t) => `${t.name}: ${formatMoney(t.price_cents)}`).join(", ");
    } else if (niche.id === "hospedagem") {
      if (hospPropertyType) ctx["property_type"] = hospPropertyType;
      if (hospGuests) ctx["max_guests"] = hospGuests;
      if (hospBedrooms) ctx["bedrooms"] = hospBedrooms;
      if (hospCheckinTime) ctx["check_in"] = hospCheckinTime;
      if (hospCheckoutTime) ctx["check_out"] = hospCheckoutTime;
      if (hospCleaningFeeCents) ctx["cleaning_fee"] = formatMoney(hospCleaningFeeCents);
      if (hospAmenities?.length) ctx["amenities"] = hospAmenities;
    } else if (niche.id === "servico") {
      if (serviceArea) ctx["service_type"] = serviceArea;
      if (serviceModality) ctx["attendance_mode"] = serviceModality === "remoto" ? "Online / Remoto" : serviceModality === "domicilio" ? "A Domicílio" : "Presencial";
      if (serviceDuration) ctx["duration"] = `${serviceDuration} minutos`;
      if (serviceSpecialty) ctx["specialty"] = serviceSpecialty;
      if (serviceProfessionalCouncil) ctx["council"] = serviceProfessionalCouncil;
    } else if (niche.id === "vaga") {
      if (jobRole) ctx["job_role"] = jobRole;
      if (jobMinEducation) ctx["education"] = jobMinEducation;
      if (jobExperienceLevel) ctx["seniority"] = jobExperienceLevel;
      if (jobModel) ctx["work_model"] = jobModel;
      if (jobRegime) ctx["contract_type"] = jobRegime;
      if (jobSalaryRange) ctx["salary_range"] = jobSalaryRange;
    } else if (niche.id === "desapego") {
      if (itemCondition) ctx["condition"] = itemCondition;
      if (phoneBrand) ctx["brand"] = phoneBrand;
      if (phoneModel) ctx["model"] = phoneModel;
      if (itemWarranty) ctx["warranty"] = itemWarranty;
    } else if (niche.id === "mercado" || niche.id === "gastronomia") {
      if (convenienceBrand) ctx["brand"] = convenienceBrand;
      if (convenienceVolume) ctx["portion_size"] = convenienceVolume;
      if (convenienceTemp && convenienceTemp !== "none") ctx["beverage_temperature"] = convenienceTemp;
      if (deliveryEstimateText) ctx["delivery_estimate"] = deliveryEstimateText;
    } else if (niche.id === "assinatura") {
      if (billingCycle) ctx["billing_cycle"] = billingCycle;
      if (recurringFeatures?.length) ctx["included_items"] = recurringFeatures;
    }
    return ctx;
  };

  const handleOpenCopilot = (targetScope: CopilotScope = "all_editorial_fields") => {
    setCopilotInitialScope(targetScope);
    setCopilotModalOpen(true);
  };

  const handleApplyCopilotDraft = (
    patched: CopilotWorkingDraft,
    appliedFields: EditorialFieldKey[]
  ) => {
    if (appliedFields.includes("title") && patched.title.trim()) {
      setTitle(patched.title.trim());
    }
    if (appliedFields.includes("description") && patched.description.trim()) {
      setDescription(patched.description.trim());
    }
    if (appliedFields.includes("summary")) {
      setEditorialSummary(patched.summary.trim());
      if (niche.id === "viagem" && patched.summary.trim()) {
        const bullets = patched.summary
          .split(/\r?\n/)
          .map((line) => line.replace(/^[•\-*]\s*/, "").trim())
          .filter(Boolean);
        if (bullets.length > 0) {
          setTravelBioBullets(bullets);
        }
      }
    }
    if (appliedFields.includes("tags")) {
      setEditorialTags(patched.tags);
    }
    toast.success("Alterações do Copilot aplicadas ao anúncio.");
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

  // FASE 1: Lifecycle & Regras de Validade e Estoque
  const [validityDays, setValidityDays] = useState<30 | 60 | 90>(
    (initialData?.attributes?.validity_days as any) || 30
  );
  const [stockLimit, setStockLimit] = useState<string>(
    initialData?.stock_limit != null ? String(initialData.stock_limit) : ""
  );
  const [offerLimit, setOfferLimit] = useState<string>(
    initialData?.offer_limit != null ? String(initialData.offer_limit) : ""
  );
  const [locationName, setLocationName] = useState(
    initialData?.location_name || initialData?.location || ""
  );
  const [structuredLoc, setStructuredLoc] = useState<StructuredLocationValue | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [feedMedia, setFeedMedia] = useState<string[]>([]);
  const [pixKeyType, setPixKeyType] = useState<string>("cpf_cnpj");
  const [pixKey, setPixKey] = useState<string>("");
  const [pixReceiverName, setPixReceiverName] = useState<string>("");
  const [paymentLink, setPaymentLink] = useState<string>("");
  const [paymentInstructions, setPaymentInstructions] = useState<string>("");
  const [activePreviewImage, setActivePreviewImage] = useState(0);

  // Vínculo com Formulário de Captura de Leads / Landing Page
  const [selectedFormId, setSelectedFormId] = useState<string | null>(
    initialData?.form_id || initialData?.attributes?.form_id || null
  );

  const effectiveStoreId = selectedStoreId || userStores[0]?.id || null;
  const { data: storeForms = [] } = useQuery({
    queryKey: ["store-lead-forms-selector", effectiveStoreId],
    queryFn: () => listStoreLeadForms({ data: { storeId: effectiveStoreId } }),
    enabled: !!effectiveStoreId,
  });

  // Template de Exibição (Catálogo Canônico + Compatibilidade por Nicho)
  const defaultNicheTemplateStyle = useMemo<ClassifiedTemplateStyle>(() => {
    return getDefaultClassifiedTemplateForNiche(niche.id);
  }, [niche.id]);

  const allowedTemplatesForNiche = useMemo(() => {
    return getAllowedClassifiedTemplatesForNiche(niche.id);
  }, [niche.id]);

  const [templateStyle, setTemplateStyle] = useState<ClassifiedTemplateStyle>(() =>
    resolveCompatibleClassifiedTemplate(
      niche.id,
      (initialData?.attributes?.template_style || initialData?.template_style) as string | undefined
    )
  );

  const prevNicheIdRef = useRef<string>(niche.id);
  useEffect(() => {
    if (prevNicheIdRef.current !== niche.id) {
      const prevDefault = getDefaultClassifiedTemplateForNiche(prevNicheIdRef.current);
      prevNicheIdRef.current = niche.id;
      setTemplateStyle((prev) =>
        resolveCompatibleClassifiedTemplate(
          niche.id,
          prev === prevDefault ? undefined : prev
        )
      );
    }
  }, [niche.id]);

  const [displayMode, setDisplayMode] = useState<ClassifiedDisplayMode>(
    (initialData?.attributes?.display_mode as ClassifiedDisplayMode) || "tabs"
  );
  const [isTemplateStyleOpen, setIsTemplateStyleOpen] = useState(true);

  // Qualificação de Leads & SDR IA (Para Anunciantes Civis / Pessoa Física)
  const defaultNicheInquiry = useMemo(() => {
    return getNicheDefaultInquiryConfig(niche.id, { acceptsTrade: niche.id === "veiculo" });
  }, [niche.id]);

  const [civilInquiryEnabled, setCivilInquiryEnabled] = useState<boolean>(
    initialData?.attributes?.inquiry_config?.enabled ?? false
  );
  const [civilInquiryTitle, setCivilInquiryTitle] = useState<string>(
    initialData?.attributes?.inquiry_config?.title || defaultNicheInquiry.title
  );
  const [civilInquirySubtitle, setCivilInquirySubtitle] = useState<string>(
    initialData?.attributes?.inquiry_config?.subtitle || defaultNicheInquiry.subtitle
  );
  const [civilInquiryActivateSdr, setCivilInquiryActivateSdr] = useState<boolean>(
    initialData?.attributes?.inquiry_config?.activate_sdr_ai ?? true
  );
  const [civilInquiryQuestions, setCivilInquiryQuestions] = useState<CivilInquiryQuestion[]>(
    initialData?.attributes?.inquiry_config?.questions || defaultNicheInquiry.questions
  );
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"text" | "select" | "currency" | "textarea">("text");

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
  const [travelVisibilityMode, setTravelVisibilityMode] = useState<"public" | "unlisted" | "private">(
    (initialData?.attributes?.visibility_mode as "public" | "unlisted" | "private") || "public"
  );
  const [travelIsCustomQuote, setTravelIsCustomQuote] = useState<boolean>(
    Boolean(initialData?.attributes?.is_custom_quote)
  );
  const [travelAdultsCount, setTravelAdultsCount] = useState<number>(
    Number(initialData?.attributes?.passenger_composition?.adults ?? 2)
  );
  const [travelChildrenCount, setTravelChildrenCount] = useState<number>(
    Number(initialData?.attributes?.passenger_composition?.children ?? 0)
  );
  const [travelChildrenMaxAge, setTravelChildrenMaxAge] = useState<number>(
    Number(initialData?.attributes?.passenger_composition?.children_max_age ?? 12)
  );
  const [travelBaggagePersonalItem, setTravelBaggagePersonalItem] = useState<boolean>(
    initialData?.attributes?.flight_details?.baggage?.personal_item ?? true
  );
  const [travelBaggageCarryOn, setTravelBaggageCarryOn] = useState<boolean>(
    initialData?.attributes?.flight_details?.baggage?.carry_on ?? true
  );
  const [travelBaggageChecked, setTravelBaggageChecked] = useState<number>(
    Number(initialData?.attributes?.flight_details?.baggage?.checked_bags ?? 0)
  );
  const [travelConnectionCity, setTravelConnectionCity] = useState<string>(
    initialData?.attributes?.flight_details?.connection_city || ""
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
  const [travelStoryHighlights, setTravelStoryHighlights] = useState<StoryHighlight[]>(
    initialData?.attributes?.story_highlights || []
  );
  const [travelItineraryDays, setTravelItineraryDays] = useState<ItineraryDay[]>(
    initialData?.attributes?.itinerary_days || initialData?.attributes?.itinerary || []
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

  // ── Hospedagens da Viagem (Hotéis / Resorts / Pousadas) ──
  const [travelLodgings, setTravelLodgings] = useState<TravelLodging[]>(() => {
    if (Array.isArray(initialData?.attributes?.lodgings) && initialData.attributes.lodgings.length > 0) {
      return initialData.attributes.lodgings;
    }
    if (Array.isArray(initialData?.attributes?.hotels) && initialData.attributes.hotels.length > 0) {
      return initialData.attributes.hotels;
    }
    if (initialData?.attributes?.hotel_name) {
      return [{
        id: crypto.randomUUID(),
        name: initialData.attributes.hotel_name,
        type: "hotel",
        city: initialData.attributes.destination_city || "",
        regime: initialData.attributes.meal_plan || "Café da Manhã",
        description: initialData.attributes.hotel_description || "",
        amenities: initialData.attributes.hotel_amenities || [],
        address: initialData.attributes.hotel_address || "",
        stars: initialData.attributes.hotel_stars || 4,
        checkin_time: initialData.attributes.checkin_time || "14:00",
        checkout_time: initialData.attributes.checkout_time || "11:00",
      }];
    }
    return [];
  });

  const handleAddTravelLodging = () => {
    const newLodging: TravelLodging = {
      id: crypto.randomUUID(),
      name: "",
      type: "hotel",
      stars: 4,
      city: travelDestinationCity || "",
      regime: travelMealPlan || "Café da Manhã",
      amenities: [],
      photos: [],
      checkin_time: "14:00",
      checkout_time: "11:00",
    };
    setTravelLodgings((prev) => [...prev, newLodging]);
  };

  const handleUpdateTravelLodging = (id: string, patch: Partial<TravelLodging>) => {
    setTravelLodgings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  };

  const handleRemoveTravelLodging = (id: string) => {
    setTravelLodgings((prev) => prev.filter((l) => l.id !== id));
  };

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

    // ── Estúdio Excelência Tour (Story 9:16 + Liquid Glass + WhatsApp Intake) ──
  const [travelStudioOpen, setTravelStudioOpen] = useState(false);

  const handleApplyExtractedTravelOffer = (offer: {
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
  }) => {
    if (offer.title?.trim()) {
      setTitle(offer.title.trim());
    }
    if (offer.destinationCity?.trim()) {
      setTravelDestinationCity(offer.destinationCity.trim());
    }
    if (offer.datesText?.trim()) {
      setTravelDates(offer.datesText.trim());
    }
    if (offer.mealPlan?.trim()) {
      setTravelMealPlan(offer.mealPlan.trim());
    }
    if (offer.priceCents && offer.priceCents > 0) {
      setPriceCents(offer.priceCents);
    }
    if (offer.installments && offer.installments > 0) {
      setMaxInstallments(offer.installments);
    }
    if (offer.adults) {
      setTravelAdultsCount(offer.adults);
    }
    if (offer.children !== undefined) {
      setTravelChildrenCount(offer.children);
    }
    if (offer.inclusions && offer.inclusions.length > 0) {
      setTravelBioBullets(offer.inclusions.filter(Boolean));
    }
    if (offer.hotelName?.trim()) {
      setTravelLodgings((prev) => {
        if (prev.length > 0) {
          return prev.map((l, idx) =>
            idx === 0
              ? {
                  ...l,
                  name: offer.hotelName!.trim(),
                  regime: offer.mealPlan?.trim() || l.regime,
                  city: offer.destinationCity?.trim() || l.city,
                }
              : l
          );
        }
        return [
          {
            id: crypto.randomUUID(),
            name: offer.hotelName!.trim(),
            type: "hotel",
            stars: 4,
            city: offer.destinationCity?.trim() || travelDestinationCity || "",
            regime: offer.mealPlan?.trim() || travelMealPlan || "Café da Manhã",
            amenities: [],
            photos: [],
            checkin_time: "14:00",
            checkout_time: "11:00",
          },
        ];
      });
    }
    toast.success("Dados estruturados da cotação sincronizados com o anúncio!");
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
  const [vehicleFipeCode, setVehicleFipeCode] = useState("");
  const [vehicleFipePriceCents, setVehicleFipePriceCents] = useState<number | undefined>(undefined);
  const [vehicleFipeReferenceMonth, setVehicleFipeReferenceMonth] = useState("");
  const [vehicleFipeDeltaPercent, setVehicleFipeDeltaPercent] = useState<number | undefined>(undefined);

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
  const [trialDays, setTrialDays] = useState<number | undefined>(
    initialData?.trial_days ?? undefined
  );
  const [recurringFeatures, setRecurringFeatures] = useState<string[]>(() => {
    if (Array.isArray(initialData?.recurring_features) && initialData.recurring_features.length > 0) {
      return initialData.recurring_features;
    }
    return [];
  });
  const [newFeatureInput, setNewFeatureInput] = useState("");

  // Specialized: Formas de Pagamento & Cancelamento (Zero Hardcoded)
  const isPaymentAllowed = isNichePaymentApplicable(niche.id);
  const [acceptsPix, setAcceptsPix] = useState(
    isPaymentAllowed ? (initialData?.attributes?.accepts_pix ?? true) : false
  );
  const [acceptsCard, setAcceptsCard] = useState(
    isPaymentAllowed ? (initialData?.attributes?.accepts_card ?? false) : false
  );
  const [maxInstallments, setMaxInstallments] = useState(
    initialData?.attributes?.max_installments ?? 12
  );
  const [cardInterestFree, setCardInterestFree] = useState(true);
  const [acceptsBoleto, setAcceptsBoleto] = useState(
    isPaymentAllowed ? Boolean(initialData?.attributes?.accepts_boleto) : false
  );
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
  const [acceptsCash, setAcceptsCash] = useState(
    isPaymentAllowed && niche.id !== "digital" ? (initialData?.attributes?.accepts_cash ?? true) : false
  );
  const [acceptsTrade, setAcceptsTrade] = useState(
    isPaymentAllowed && niche.id !== "digital" ? Boolean(initialData?.attributes?.accepts_trade) : false
  );
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
    initialData?.attributes?.delivery_estimate || ""
  );
  const [groceryDeliveryFeeCents, setGroceryDeliveryFeeCents] = useState<number>(
    Number(initialData?.attributes?.delivery_fee_cents) || 0
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
    Number(initialData?.attributes?.grocery_fresh_pricing?.avg_piece_weight_grams) || 0
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

  // Specialized: Eventos, Shows, Congressos & Ingressos
  const [eventDate, setEventDate] = useState<string>(
    initialData?.attributes?.event_date || initialData?.event_date || ""
  );
  const [eventEndDate, setEventEndDate] = useState<string>(
    initialData?.attributes?.end_date || initialData?.end_date || ""
  );
  const [eventStartTime, setEventStartTime] = useState<string>(
    initialData?.attributes?.start_time || "09:00"
  );
  const [eventEndTime, setEventEndTime] = useState<string>(
    initialData?.attributes?.end_time || ""
  );
  const [eventGatesOpenTime, setEventGatesOpenTime] = useState<string>(
    initialData?.attributes?.gates_open_time || ""
  );
  const [eventVenueName, setEventVenueName] = useState<string>(
    initialData?.attributes?.venue_name || ""
  );
  const [eventVenueAddress, setEventVenueAddress] = useState<string>(
    initialData?.attributes?.venue_address || ""
  );
  const [eventAgeRating, setEventAgeRating] = useState<string>(
    initialData?.attributes?.age_rating || "Livre"
  );
  const [eventVisibility, setEventVisibility] = useState<"public" | "unlisted">(
    initialData?.visibility === "unlisted" || initialData?.attributes?.visibility === "unlisted"
      ? "unlisted"
      : "public"
  );
  const [eventVideoUrl, setEventVideoUrl] = useState<string>(
    initialData?.attributes?.video_url || ""
  );
  const [eventBannerUrl, setEventBannerUrl] = useState<string>(
    initialData?.attributes?.banner_image_url || ""
  );
  const [eventTicketTiers, setEventTicketTiers] = useState<any[]>(
    Array.isArray(initialData?.attributes?.ticket_tiers) ? initialData.attributes.ticket_tiers : []
  );
  const [eventSchedule, setEventSchedule] = useState<any[]>(
    Array.isArray(initialData?.attributes?.schedule) ? initialData.attributes.schedule : []
  );
  const [eventSpeakers, setEventSpeakers] = useState<any[]>(
    Array.isArray(initialData?.attributes?.speakers) ? initialData.attributes.speakers : []
  );
  const [eventSponsors, setEventSponsors] = useState<any[]>(
    Array.isArray(initialData?.attributes?.sponsors) ? initialData.attributes.sponsors : []
  );
  const [eventSurveys, setEventSurveys] = useState<EventSurvey[]>(
    Array.isArray(initialData?.attributes?.surveys) ? initialData.attributes.surveys : []
  );
  const [eventRefundPolicy, setEventRefundPolicy] = useState<string>(
    initialData?.attributes?.policies?.refund_policy || ""
  );
  const [eventHalfPricePolicy, setEventHalfPricePolicy] = useState<string>(
    initialData?.attributes?.policies?.half_price_policy || ""
  );
  const [eventAccessibilityInfo, setEventAccessibilityInfo] = useState<string>(
    initialData?.attributes?.policies?.accessibility_info || ""
  );
  const [eventParkingInfo, setEventParkingInfo] = useState<string>(
    initialData?.attributes?.policies?.parking_info || ""
  );

  // Story 9:16, Anfitrião Luma e App PWA
  const [eventStoryUrl, setEventStoryUrl] = useState<string>(
    initialData?.attributes?.story_url || ""
  );
  const [eventStoryAutoOpen, setEventStoryAutoOpen] = useState<boolean>(
    initialData?.attributes?.story_auto_open ?? false
  );
  const [eventHostName, setEventHostName] = useState<string>(
    initialData?.attributes?.host_name || ""
  );
  const [eventHostAvatarUrl, setEventHostAvatarUrl] = useState<string>(
    initialData?.attributes?.host_avatar_url || ""
  );
  const [eventHostPhone, setEventHostPhone] = useState<string>(
    initialData?.attributes?.host_phone || ""
  );
  const [eventHostRole, setEventHostRole] = useState<string>(
    initialData?.attributes?.host_role || "Organizador Principal"
  );
  const [eventHostEntityType, setEventHostEntityType] = useState<"ORGANIZATION" | "PERSON">(
    initialData?.attributes?.host_entity_type === "PERSON" ? "PERSON" : "ORGANIZATION"
  );
  const [eventTimezone, setEventTimezone] = useState<string>(
    initialData?.attributes?.timezone || "America/Sao_Paulo"
  );
  const [eventOrganizers, setEventOrganizers] = useState<
    Array<{
      id: string;
      name: string;
      role: "ORGANIZER" | "CO_ORGANIZER" | "REALIZER" | "SUPPORTER";
      entity_type: "ORGANIZATION" | "PERSON";
      avatar_url?: string;
    }>
  >(Array.isArray(initialData?.attributes?.organizers) ? initialData.attributes.organizers : []);
  const [eventAccessPoints, setEventAccessPoints] = useState<
    Array<{
      id: string;
      label: string;
      type: "main_venue" | "accreditation" | "parking" | "vip_entrance" | "pcd_access" | "other";
      address?: string;
      instructions?: string;
    }>
  >(
    Array.isArray(initialData?.attributes?.access_points)
      ? initialData.attributes.access_points
      : []
  );
  const [eventPwaEnabled, setEventPwaEnabled] = useState<boolean>(
    initialData?.attributes?.pwa_enabled ?? false
  );

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
    if (Array.isArray(initialData.images) && initialData.images.length > 0) {
      setImages(initialData.images.filter(Boolean).map((img: string) => resolveStorageMediaUrl(img, "post-media")));
    } else if (Array.isArray(initialData.photos) && initialData.photos.length > 0) {
      setImages(initialData.photos.filter(Boolean).map((img: string) => resolveStorageMediaUrl(img, "post-media")));
    } else if (Array.isArray(initialData.attributes?.gallery_images) && initialData.attributes.gallery_images.length > 0) {
      setImages(initialData.attributes.gallery_images.filter(Boolean).map((img: string) => resolveStorageMediaUrl(img, "post-media")));
    } else if (initialData.attributes?.banner_image_url) {
      setImages([resolveStorageMediaUrl(initialData.attributes.banner_image_url, "post-media")]);
    } else if (initialData.image_url) {
      setImages([resolveStorageMediaUrl(initialData.image_url, "post-media")]);
    }
    if (Array.isArray(initialData.feed_media) && initialData.feed_media.length > 0) {
      setFeedMedia(initialData.feed_media.filter(Boolean).map((m: string) => resolveStorageMediaUrl(m, "post-media")));
    } else if (Array.isArray(initialData.attributes?.feed_media) && initialData.attributes.feed_media.length > 0) {
      setFeedMedia(initialData.attributes.feed_media.filter(Boolean).map((m: string) => resolveStorageMediaUrl(m, "post-media")));
    } else if (Array.isArray(initialData.attributes?.feed_images) && initialData.attributes.feed_images.length > 0) {
      setFeedMedia(initialData.attributes.feed_images.filter(Boolean).map((m: string) => resolveStorageMediaUrl(m, "post-media")));
    }

    const loadedPs = initialData.payment_settings || initialData.attributes?.payment_settings;
    if (loadedPs) {
      if (loadedPs.pix_key) setPixKey(loadedPs.pix_key);
      if (loadedPs.pix_key_type) setPixKeyType(loadedPs.pix_key_type);
      if (loadedPs.pix_receiver_name) setPixReceiverName(loadedPs.pix_receiver_name);
      if (loadedPs.payment_link) setPaymentLink(loadedPs.payment_link);
      if (loadedPs.payment_instructions) setPaymentInstructions(loadedPs.payment_instructions);
    }


    if (initialData.attributes) {
      if (initialData.attributes.template_style) {
        setTemplateStyle(initialData.attributes.template_style as ClassifiedTemplateStyle);
      }
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
      if (Array.isArray(initialData.attributes.itinerary_days)) {
        setTravelItineraryDays(initialData.attributes.itinerary_days);
      } else if (Array.isArray(initialData.attributes.itinerary)) {
        setTravelItineraryDays(initialData.attributes.itinerary);
      }
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
      if (Array.isArray(initialData.attributes.lodgings) && initialData.attributes.lodgings.length > 0) {
        setTravelLodgings(initialData.attributes.lodgings);
      } else if (Array.isArray(initialData.attributes.hotels) && initialData.attributes.hotels.length > 0) {
        setTravelLodgings(initialData.attributes.hotels);
      } else if (initialData.attributes.hotel_name) {
        setTravelLodgings([{
          id: crypto.randomUUID(),
          name: initialData.attributes.hotel_name,
          type: "hotel",
          stars: initialData.attributes.hotel_stars || 4,
          city: initialData.attributes.destination_city || "",
          address: initialData.attributes.hotel_address || "",
          description: initialData.attributes.hotel_description || "",
          regime: initialData.attributes.meal_plan || "Café da Manhã",
          amenities: Array.isArray(initialData.attributes.hotel_amenities) ? initialData.attributes.hotel_amenities : [],
          photos: Array.isArray(initialData.attributes.hotel_photos) ? initialData.attributes.hotel_photos : [],
          checkin_time: "14:00",
          checkout_time: "11:00",
        }]);
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

      // Eventos, Shows & Congressos
      if (initialData.attributes.event_date) setEventDate(initialData.attributes.event_date);
      if (initialData.attributes.end_date) setEventEndDate(initialData.attributes.end_date);
      if (initialData.attributes.start_time) setEventStartTime(initialData.attributes.start_time);
      if (initialData.attributes.end_time) setEventEndTime(initialData.attributes.end_time);
      if (initialData.attributes.gates_open_time) setEventGatesOpenTime(initialData.attributes.gates_open_time);
      if (initialData.attributes.venue_name) setEventVenueName(initialData.attributes.venue_name);
      if (initialData.attributes.venue_address) setEventVenueAddress(initialData.attributes.venue_address);
      if (initialData.attributes.age_rating) setEventAgeRating(initialData.attributes.age_rating);
      if (initialData.attributes.visibility) setEventVisibility(initialData.attributes.visibility);
      if (initialData.attributes.video_url) setEventVideoUrl(initialData.attributes.video_url);
      if (initialData.attributes.banner_image_url) setEventBannerUrl(initialData.attributes.banner_image_url);
      if (Array.isArray(initialData.attributes.ticket_tiers)) setEventTicketTiers(initialData.attributes.ticket_tiers);
      if (Array.isArray(initialData.attributes.schedule)) setEventSchedule(initialData.attributes.schedule);
      if (Array.isArray(initialData.attributes.speakers)) setEventSpeakers(initialData.attributes.speakers);
      if (Array.isArray(initialData.attributes.sponsors)) setEventSponsors(initialData.attributes.sponsors);
      if (Array.isArray(initialData.attributes.surveys)) setEventSurveys(initialData.attributes.surveys);
      if (initialData.attributes.policies) {
        if (initialData.attributes.policies.refund_policy) setEventRefundPolicy(initialData.attributes.policies.refund_policy);
        if (initialData.attributes.policies.half_price_policy) setEventHalfPricePolicy(initialData.attributes.policies.half_price_policy);
        if (initialData.attributes.policies.accessibility_info) setEventAccessibilityInfo(initialData.attributes.policies.accessibility_info);
        if (initialData.attributes.policies.parking_info) setEventParkingInfo(initialData.attributes.policies.parking_info);
      }
      if (initialData.attributes.story_url) setEventStoryUrl(initialData.attributes.story_url);
      if (initialData.attributes.story_auto_open !== undefined) setEventStoryAutoOpen(!!initialData.attributes.story_auto_open);
      if (initialData.attributes.host_name) setEventHostName(initialData.attributes.host_name);
      if (initialData.attributes.host_avatar_url) setEventHostAvatarUrl(initialData.attributes.host_avatar_url);
      if (initialData.attributes.host_phone) setEventHostPhone(initialData.attributes.host_phone);
      if (initialData.attributes.host_role) setEventHostRole(initialData.attributes.host_role);
      if (initialData.attributes.pwa_enabled !== undefined) setEventPwaEnabled(!!initialData.attributes.pwa_enabled);

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
      if (initialData.attributes.fipe_code) setVehicleFipeCode(initialData.attributes.fipe_code);
      if (initialData.attributes.fipe_price_cents) setVehicleFipePriceCents(Number(initialData.attributes.fipe_price_cents));
      if (initialData.attributes.fipe_reference_month) setVehicleFipeReferenceMonth(initialData.attributes.fipe_reference_month);
      if (initialData.attributes.fipe_delta_percent !== undefined) setVehicleFipeDeltaPercent(Number(initialData.attributes.fipe_delta_percent));
    }

    // Agronegócio: reidrata campos quando initialData chega de forma assíncrona (modo edição).
    if ((initialData.category === "agri" || initialData.category === "agro") && initialData.attributes) {
      const a = initialData.attributes;
      const hours = a.hours_used ?? a.horimetro;
      const traction = a.traction ?? a.tracao;
      if (hours !== undefined && hours !== null) setAgriHoursUsed(String(hours));
      if (traction !== undefined && traction !== null) setAgriTraction(String(traction));
      if (a.implement_type !== undefined && a.implement_type !== null) setAgriImplementType(String(a.implement_type));
      if (a.year_fab !== undefined && a.year_fab !== null) setAgriYearFab(String(a.year_fab));
      if (a.power_cv !== undefined && a.power_cv !== null) setAgriPowerCv(String(a.power_cv));
      if (a.cabin_type !== undefined && a.cabin_type !== null) setAgriCabinType(String(a.cabin_type));
    }

    // Farmácia: idem; retention_prescription=false precisa ser preservado.
    if ((initialData.category === "pharmacy" || initialData.category === "farmacia") && initialData.attributes) {
      const a = initialData.attributes;
      if (a.subniche !== undefined && a.subniche !== null) setPharmacySubNiche(String(a.subniche));
      if (a.retention_prescription !== undefined && a.retention_prescription !== null) setPharmacyRetentionPrescription(Boolean(a.retention_prescription));
      if (a.active_ingredient !== undefined && a.active_ingredient !== null) setPharmacyActiveIngredient(String(a.active_ingredient));
      if (a.manufacturer !== undefined && a.manufacturer !== null) setPharmacyManufacturer(String(a.manufacturer));
      if (a.anvisa_registry !== undefined && a.anvisa_registry !== null) setPharmacyAnvisaRegistry(String(a.anvisa_registry));
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
    if (!userProfile?.id) {
      toast.info("Identifique-se para publicar seu anúncio com segurança.");
      navigate({
        to: "/entrar",
        search: { returnUrl: "/conta/classificados/novo" },
      });
      return;
    }
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
        max_boleto_installments: acceptsBoletoInstallments ? Number(maxBoletoInstallments) || 1 : undefined,
        boleto_min_down_payment_cents: acceptsBoletoInstallments ? boletoMinDownPaymentCents : undefined,
        boleto_notes: acceptsBoletoInstallments ? boletoNotes.trim() : undefined,
        accepts_carne: acceptsCarne,
        max_carne_installments: acceptsCarne ? Number(maxCarneInstallments) || 1 : undefined,
        carne_grace_days: acceptsCarne ? carneGraceDays : undefined,
        carne_min_down_payment_cents: acceptsCarne ? carneMinDownPaymentCents : undefined,
        carne_notes: acceptsCarne ? carneNotes.trim() : undefined,
        accepts_cash: isPaymentAllowed && niche.id !== "digital" ? acceptsCash : false,
        accepts_trade: isPaymentAllowed && niche.id !== "digital" ? acceptsTrade : false,
        trade_notes: acceptsTrade ? tradeNotes.trim() : undefined,
        accepts_financing: acceptsFinancing,
        financing_notes: acceptsFinancing ? financingNotes.trim() : undefined,
        payment_rules: {
          accepts_pix: acceptsPix,
          pix_discount_percent: acceptsPix ? Number(pixDiscountPercent) || 0 : 0,
          accepts_card: acceptsCard,
          max_installments: acceptsCard ? Number(maxInstallments) || 1 : 1,
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
        accepted_payment_methods: isPaymentAllowed
          ? [
              ...(acceptsPix ? ["pix"] : []),
              ...(acceptsCard ? ["cartao_credito"] : []),
              ...(acceptsBoleto ? ["boleto"] : []),
              ...(acceptsBoletoInstallments ? ["boleto_parcelado"] : []),
              ...(acceptsCarne ? ["carne_digital"] : []),
              ...(acceptsCash ? ["dinheiro"] : []),
              ...(acceptsTrade ? ["permuta"] : []),
              ...(acceptsFinancing ? ["financiamento"] : []),
            ]
          : [],
        installments_available: isPaymentAllowed ? (acceptsCard || acceptsBoletoInstallments || acceptsCarne) : false,
        cancellation_policy: cancellationPolicy,
        max_installments: acceptsCard ? Number(maxInstallments) || 1 : (acceptsCarne ? Number(maxCarneInstallments) || 1 : (acceptsBoletoInstallments ? Number(maxBoletoInstallments) || 1 : 1)),
        free_shipping_local: niche.id === "desapego" ? freeShippingLocal : false,
        template_style: templateStyle,
        tags: editorialTags.length > 0 ? editorialTags : undefined,
        summary: editorialSummary.trim() || undefined,
        display_mode: displayMode,
        inquiry_config: {
          enabled: civilInquiryEnabled,
          title: civilInquiryTitle,
          subtitle: civilInquirySubtitle,
          activate_sdr_ai: civilInquiryActivateSdr,
          questions: civilInquiryQuestions,
        },
        ...(niche.id === "viagem"
          ? {
              story_highlights: travelStoryHighlights,
              itinerary_days: travelItineraryDays,
              bio_bullets: travelBioBullets.map((b) => b.trim()).filter(Boolean),
            }
          : {}),
      };

      if (niche.id === "mercado" || niche.id === "gastronomia" || templateStyle === "conveniencia") {
        attributes.volume = convenienceVolume || undefined;
        attributes.temperature = convenienceTemp;
        attributes.is_alcoholic = isAlcoholic;
        attributes.brand = convenienceBrand || undefined;
        attributes.delivery_estimate = deliveryEstimateText;
        attributes.ready_delivery = readyDelivery;
      }

      if (niche.id === "viagem") {
        attributes.duration_text = travelDuration;
        attributes.meal_plan = travelMealPlan;
        attributes.guests_text = travelGuests || `${travelAdultsCount} Adulto${travelAdultsCount > 1 ? "s" : ""}${travelChildrenCount > 0 ? ` + ${travelChildrenCount} Criança${travelChildrenCount > 1 ? "s" : ""} (até ${travelChildrenMaxAge} anos)` : ""}`;
        attributes.dates_text = travelDates;
        attributes.destination_city = travelDestinationCity;
        attributes.departure_date = travelDepartureDate;
        attributes.return_date = travelReturnDate;
        attributes.max_installments = maxInstallments;
        attributes.bio_bullets = travelBioBullets.map((b) => b.trim()).filter(Boolean);
        attributes.departure_options = travelDepartureOptions;
        attributes.visibility_mode = travelVisibilityMode;
        attributes.is_custom_quote = travelIsCustomQuote;
        attributes.passenger_composition = {
          adults: Math.max(1, Number(travelAdultsCount) || 1),
          children: Math.max(0, Number(travelChildrenCount) || 0),
          children_max_age: Math.max(1, Number(travelChildrenMaxAge) || 12),
        };
        attributes.flight_details = {
          transport_type: travelTransportType,
          // Aéreo
          departure_iata: travelDepartureIATA,
          arrival_iata: travelArrivalIATA,
          airline: travelAirline,
          connections: travelConnections,
          connection_city: travelConnectionCity || undefined,
          departure_time: travelDepartureTime,
          arrival_time: travelArrivalTime,
          price_text: travelFlightPrice,
          duration_text: travelFlightDuration,
          baggage: {
            personal_item: travelBaggagePersonalItem,
            carry_on: travelBaggageCarryOn,
            checked_bags: Math.max(0, Number(travelBaggageChecked) || 0),
          },
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
        const validTravelLodgings = travelLodgings.filter((l) => l.name.trim() !== "");
        attributes.lodgings = validTravelLodgings;
        attributes.hotels = validTravelLodgings;
        if (validTravelLodgings.length > 0) {
          attributes.hotel_name = validTravelLodgings[0].name;
          attributes.hotel_description = validTravelLodgings[0].description;
          attributes.hotel_address = validTravelLodgings[0].address;
          attributes.hotel_stars = validTravelLodgings[0].stars;
          attributes.hotel_amenities = validTravelLodgings[0].amenities;
          attributes.hotel_photos = validTravelLodgings[0].photos;
          attributes.hotel_images = validTravelLodgings[0].photos;
        }
      } else if (niche.id === "equipamento") {
        attributes.equipment_period = equipmentPeriod;
        attributes.deposit_cents = equipmentDepositCents || 0;
      } else if (niche.id === "doacao") {
        attributes.is_donation = true;
      } else if (niche.id === "evento") {
        attributes.niche = "evento";
        attributes.timezone = eventTimezone || "America/Sao_Paulo";
        attributes.event_date = eventDate;
        attributes.end_date = eventEndDate || undefined;
        attributes.start_time = eventStartTime;
        attributes.end_time = eventEndTime || undefined;
        attributes.gates_open_time = eventGatesOpenTime || undefined;
        attributes.venue_name = eventVenueName;
        attributes.venue_address = eventVenueAddress;
        attributes.city = (structuredLoc?.city || (locationName ? locationName.split(",")[0].trim() : undefined)) || undefined;
        attributes.state = (structuredLoc?.state || (locationName ? locationName.split("-")[1]?.trim() : undefined)) || undefined;
        attributes.age_rating = eventAgeRating;
        attributes.visibility = eventVisibility;
        attributes.video_url = eventVideoUrl || undefined;
        attributes.banner_image_url = eventBannerUrl || undefined;
        attributes.gallery_images = images;
        attributes.story_url = eventStoryUrl.trim() || undefined;
        attributes.story_auto_open = eventStoryAutoOpen;
        attributes.pwa_enabled = eventPwaEnabled;
        attributes.host_name = eventHostName.trim() || undefined;
        attributes.host_avatar_url = eventHostAvatarUrl.trim() || undefined;
        attributes.host_phone = eventHostPhone.trim() || whatsapp.trim() || undefined;
        attributes.host_role = eventHostRole.trim() || undefined;
        attributes.host_entity_type = eventHostEntityType;
        attributes.organizers = eventOrganizers;
        attributes.access_points = eventAccessPoints;
        attributes.ticket_tiers = eventTicketTiers.map((t: any) => {
          const resolvedCents =
            typeof t.price_cents === "number" && (t.price_cents > 0 || !t.price)
              ? t.price_cents
              : Math.round((Number(t.price) || 0) * 100);
          return {
            ...t,
            price_cents: resolvedCents,
            price: resolvedCents / 100,
            external_url: t.purchase_url || t.external_url || undefined,
            purchase_url: t.purchase_url || t.external_url || undefined,
          };
        });
        attributes.schedule = eventSchedule.map((item: any) => ({
          ...item,
          stage_or_room: item.stage || item.stage_or_room || undefined,
          stage: item.stage || item.stage_or_room || undefined,
        }));
        attributes.speakers = eventSpeakers.map((sp: any) => ({
          ...sp,
          photo_url: sp.avatar_url || sp.photo_url || undefined,
          avatar_url: sp.avatar_url || sp.photo_url || undefined,
          social_link: sp.social_url || sp.social_link || undefined,
          social_url: sp.social_url || sp.social_link || undefined,
        }));
        attributes.sponsors = eventSponsors;
        attributes.surveys = eventSurveys;
        attributes.policies = {
          refund_policy: eventRefundPolicy || undefined,
          half_price_policy: eventHalfPricePolicy || undefined,
          accessibility_info: eventAccessibilityInfo || undefined,
          parking_info: eventParkingInfo || undefined,
        };
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
        if (vehicleFipeCode) attributes.fipe_code = vehicleFipeCode;
        if (vehicleFipePriceCents) attributes.fipe_price_cents = vehicleFipePriceCents;
        if (vehicleFipeReferenceMonth) attributes.fipe_reference_month = vehicleFipeReferenceMonth;
        if (vehicleFipeDeltaPercent !== undefined) attributes.fipe_delta_percent = vehicleFipeDeltaPercent;
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
        attributes.template_style = templateStyle || "conveniencia";
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
          price_per_kg_cents: groceryPricePerKgCents || null,
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
      } else if (niche.id === "agro") {
        attributes.niche = "agri";
        attributes.hours_used = agriHoursUsed ? parseInt(agriHoursUsed) : undefined;
        attributes.horimetro = agriHoursUsed ? parseInt(agriHoursUsed) : undefined;
        attributes.traction = agriTraction;
        attributes.tracao = agriTraction;
        attributes.implement_type = agriImplementType;
        attributes.year_fab = agriYearFab ? parseInt(agriYearFab) : undefined;
        attributes.power_cv = agriPowerCv ? parseInt(agriPowerCv) : undefined;
        attributes.cabin_type = agriCabinType;
      } else if (niche.id === "farmacia") {
        attributes.niche = "pharmacy";
        attributes.subniche = pharmacySubNiche;
        attributes.retention_prescription = pharmacyRetentionPrescription;
        attributes.active_ingredient = pharmacyActiveIngredient;
        attributes.manufacturer = pharmacyManufacturer;
        attributes.anvisa_registry = pharmacyAnvisaRegistry;
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
      if (niche.id === "evento") resolvedCategory = "event";
      if (niche.id === "agro") resolvedCategory = "sale";
      if (niche.id === "farmacia") resolvedCategory = "sale";

      const res = await upsertClassified({
        data: {
          id: editId || undefined,
          category: resolvedCategory as any,
          title: title.trim(),
          pricing_model: niche.id === "assinatura" ? "recurring" : pricingModel,
          billing_cycle: niche.id === "assinatura" ? billingCycle : undefined,
          setup_fee_cents: niche.id === "assinatura" ? setupFeeCents ?? undefined : undefined,
          trial_days: niche.id === "assinatura" ? trialDays ?? undefined : undefined,
          recurring_features: niche.id === "assinatura" && recurringFeatures.length > 0 ? recurringFeatures : undefined,
          accepts_card: isPaymentAllowed ? acceptsCard : false,
          max_installments: isPaymentAllowed && acceptsCard ? parseInt(String(maxInstallments)) || 1 : undefined,
          accepts_trade: isPaymentAllowed ? acceptsTrade : false,
          accepted_payment_methods: isPaymentAllowed
            ? [
                ...(acceptsPix ? ["pix"] : []),
                ...(acceptsCard ? ["cartao_credito"] : []),
                ...(acceptsBoleto ? ["boleto"] : []),
                ...(acceptsBoletoInstallments ? ["boleto_parcelado"] : []),
                ...(acceptsCarne ? ["carne_digital"] : []),
                ...(acceptsCash ? ["dinheiro"] : []),
                ...(acceptsTrade ? ["permuta"] : []),
                ...(acceptsFinancing ? ["financiamento"] : []),
              ]
            : [],
          installments_available: isPaymentAllowed ? (acceptsCard || acceptsBoletoInstallments || acceptsCarne) : false,
          cancellation_policy: cancellationPolicy,
          store_id: selectedStoreId || undefined,
          sub_category: niche.id === "desapego" ? desapegoCategory : undefined,
          validity_days: validityDays,
          stock_limit: stockLimit ? parseInt(stockLimit) : undefined,
          offer_limit: offerLimit ? parseInt(offerLimit) : undefined,
          content: description.trim(),
          ai_instructions: aiInstructions.trim() || undefined,
          ai_agent_enabled: aiAgentEnabled,
          max_discount_pct: maxDiscountPct,
          feed_media: feedMedia,
          feed_images: feedMedia,
          payment_settings: isPaymentAllowed ? {
            pix_key: pixKey.trim(),
            pix_key_type: pixKeyType,
            pix_receiver_name: pixReceiverName.trim(),
            payment_link: paymentLink.trim(),
            payment_instructions: paymentInstructions.trim(),
          } : undefined,
          price_cents:
            niche.id === "evento"
              ? (eventTicketTiers.length > 0
                  ? Math.min(
                      ...eventTicketTiers.map((t: any) => {
                        const c =
                          typeof t.price_cents === "number" && (t.price_cents > 0 || !t.price)
                            ? t.price_cents
                            : Math.round((Number(t.price) || 0) * 100);
                        return c >= 0 ? c : 0;
                      })
                    )
                  : 0)
              : pricingType === "free" || niche.id === "doacao"
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
          form_id: selectedFormId || undefined,
          status: "active",
          visibility: niche.id === "evento" ? eventVisibility : travelVisibilityMode === "unlisted" ? "unlisted" : "public",
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
          queryClient.invalidateQueries({ queryKey: ["public-events-marketplace"] }),
          queryClient.invalidateQueries({ queryKey: ["agenda-public-events"] }),
        ]).catch(() => null);
        navigate({ to: "/classificados/$id", params: { id: editId } });
      } else {
        toast.success("Anúncio publicado com sucesso!");
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["classifieds-master-list"] }),
          queryClient.invalidateQueries({ queryKey: ["classifieds"] }),
          queryClient.invalidateQueries({ queryKey: ["public-events-marketplace"] }),
          queryClient.invalidateQueries({ queryKey: ["agenda-public-events"] }),
        ]).catch(() => null);
        navigate({ to: "/classificados/$id", params: { id: res.id } });
      }
    } catch (err: any) {
      console.error("Erro ao publicar classificado:", err);
      if (err?.message === "Unauthorized") {
        toast.info("Identifique-se para publicar seu anúncio.");
        navigate({
          to: "/entrar",
          search: { returnUrl: "/conta/classificados/novo" },
        });
      } else {
        toast.error(err?.message || "Erro ao publicar anúncio.");
      }
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
        if (niche.id === "evento") resolvedCategory = "event";

        await upsertClassified({
          data: {
            id: editId || undefined,
            category: resolvedCategory as any,
            title: title.trim(),
            content: description.trim() || "Rascunho em preenchimento...",
            status: "draft",
            images,
            price_cents:
              niche.id === "evento"
                ? (eventTicketTiers.length > 0
                    ? Math.min(
                        ...eventTicketTiers.map((t: any) => {
                          const c =
                            typeof t.price_cents === "number" && (t.price_cents > 0 || !t.price)
                              ? t.price_cents
                              : Math.round((Number(t.price) || 0) * 100);
                          return c >= 0 ? c : 0;
                        })
                      )
                    : 0)
                : (priceCents ?? null),
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
      niche.id === "evento"
        ? (eventTicketTiers.length > 0
            ? Math.min(
                ...eventTicketTiers.map((t: any) => {
                  const c =
                    typeof t.price_cents === "number" && (t.price_cents > 0 || !t.price)
                      ? t.price_cents
                      : Math.round((Number(t.price) || 0) * 100);
                  return c >= 0 ? c : 0;
                })
              )
            : 0)
        : pricingType === "free" || niche.id === "doacao"
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
      images: (images || []).map((img) => resolveStorageMediaUrl(img, "post-media")),
      feed_media: (feedMedia || []).map((m) => resolveStorageMediaUrl(m, "post-media")),
      feed_images: (feedMedia || []).map((m) => resolveStorageMediaUrl(m, "post-media")),
      payment_settings: {
        pix_key: pixKey.trim(),
        pix_key_type: pixKeyType,
        pix_receiver_name: pixReceiverName.trim(),
        payment_link: paymentLink.trim(),
        payment_instructions: paymentInstructions.trim(),
      },
      photos: (images || []).map((img) => resolveStorageMediaUrl(img, "post-media")),
      media: (images || []).map((img) => resolveStorageMediaUrl(img, "post-media")),
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
      category: niche.id === "evento" ? "event" : niche.id,
      attributes: {
        niche: niche.id === "negocio" ? "business" : niche.id,
        template_style: templateStyle,
        display_mode: displayMode,
        event_date: eventDate,
        end_date: eventEndDate,
        start_time: eventStartTime,
        end_time: eventEndTime,
        gates_open_time: eventGatesOpenTime,
        venue_name: eventVenueName,
        venue_address: eventVenueAddress,
        age_rating: eventAgeRating,
        visibility: eventVisibility,
        video_url: eventVideoUrl,
        banner_image_url: eventBannerUrl || images?.[0],
        ticket_tiers: eventTicketTiers,
        schedule: eventSchedule,
        speakers: eventSpeakers,
        sponsors: eventSponsors,
        surveys: eventSurveys,
        policies: {
          refund_policy: eventRefundPolicy,
          half_price_policy: eventHalfPricePolicy,
          accessibility_info: eventAccessibilityInfo,
          parking_info: eventParkingInfo,
        },
        story_url: eventStoryUrl,
        story_auto_open: eventStoryAutoOpen,
        host_name: eventHostName,
        host_avatar_url: eventHostAvatarUrl,
        host_phone: eventHostPhone,
        host_role: eventHostRole,
        host_entity_type: eventHostEntityType,
        timezone: eventTimezone,
        organizers: eventOrganizers,
        access_points: eventAccessPoints,
        gallery_images: images,
        pwa_enabled: eventPwaEnabled,
        inquiry_config: {
          enabled: civilInquiryEnabled,
          title: civilInquiryTitle,
          subtitle: civilInquirySubtitle,
          activate_sdr_ai: civilInquiryActivateSdr,
          questions: civilInquiryQuestions,
        },
        volume: convenienceVolume,
        temperature: convenienceTemp,
        is_alcoholic: isAlcoholic,
        brand: convenienceBrand || (niche.id === "mercado" ? groceryBrand : vehicleBrand),
        delivery_estimate: deliveryEstimateText,
        ready_delivery: readyDelivery,
        pricing_type: pricingType,
        price_min_cents: pricingType === "price_range" || pricingType === "starting_at" ? priceMinCents : undefined,
        price_max_cents: pricingType === "price_range" ? priceMaxCents : undefined,
        price_disclaimer: priceDisclaimer,
        custom_disclaimer: customDisclaimer,
        accepts_pix: acceptsPix,
        pix_discount_percent: pixDiscountPercent,
        accepts_card: acceptsCard,
        max_installments: acceptsCard ? Number(maxInstallments) || 1 : 1,
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
        ...(niche.id === "viagem"
          ? {
              destination_city: travelDestinationCity || locationName || "Chapecó",
              departure_date: travelDepartureDate || undefined,
              return_date: travelReturnDate || undefined,
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
              lodgings: travelLodgings.filter((l) => l.name.trim() !== ""),
              hotels: travelLodgings.filter((l) => l.name.trim() !== ""),
              hotel_name: travelLodgings[0]?.name || undefined,
              hotel_description: travelLodgings[0]?.description || undefined,
              hotel_address: travelLodgings[0]?.address || undefined,
              hotel_stars: travelLodgings[0]?.stars || undefined,
              hotel_amenities: travelLodgings[0]?.amenities || undefined,
            }
          : {}),
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
        storage_temp: groceryTemperature,
        manufacturer: groceryBrand,
        barcode_ean: groceryBarcodeEan,
        ingredients: groceryIngredients,
        contains_gluten: groceryContainsGluten,
        contains_lactose: groceryContainsLactose,
        is_organic: groceryIsOrganic,
        prep_options: groceryPrepOptions,
        delivery_fee_cents: groceryDeliveryFeeCents,
        grocery_fresh_pricing: grocerySupportsFreshPricing ? {
          supports_fresh_pricing: true,
          default_pricing_mode: groceryDefaultPricingMode,
          avg_piece_weight_grams: groceryAvgPieceWeightGrams,
          price_per_kg_cents: groceryPricePerKgCents || null,
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

  const handleOpenLivePreview = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("waesy_preview_payload", JSON.stringify(livePreviewClassified));
        const previewUrl = `/classificados/${editId || "preview-live"}?preview=true`;
        const win = window.open(previewUrl, "_blank");
        if (!win) {
          setIsPreviewModalOpen(true);
        }
      } catch {
        setIsPreviewModalOpen(true);
      }
    }
  }, [editId, livePreviewClassified]);

 return (
 <div className="space-y-4">
 {/* ── Topbar Operacional Compacta & Sticky no Mobile ────────── */}
      <div className="sticky top-0 z-30 bg-background border-b border-border -mx-4 px-4 py-2 sm:mx-0 sm:px-0 sm:py-0 sm:static sm:border-0 sm:bg-transparent flex items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-lg size-11 min-size-11 font-bold text-muted-foreground hover:text-foreground shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-5 sm:size-4" />
          </Button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-muted-foreground text-xs">/</span>
            <Badge variant="outline" className="text-xs font-semibold gap-2">
              <niche.icon className="size-4 text-primary" />
              <span>{niche.title}</span>
            </Badge>
          </div>
        </div>

        {/* Ações Globais: Visualizar Prévia Real e Publicar / Salvar */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenLivePreview}
            className="rounded-lg text-xs font-bold gap-2 border-border/80 hover:bg-muted h-11 min-h-11 px-3 sm:px-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-foreground"
          >
            <Eye className="size-4 text-primary shrink-0" />
            <span>Visualizar Prévia</span>
          </Button>

          <Button
            onClick={handlePublish}
            disabled={isSubmitting || isUploadingMedia}
            size="sm"
            className="rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground h-11 min-h-11 px-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
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

      {/* ── 5-Step Adaptive Stepper Tracker (Media-First & Snap-X V121) ── */}
      <div className="w-full bg-card rounded-lg border border-border/60 p-2 sm:p-2">
        <div className="flex overflow-x-auto carousel snap-x snap-mandatory scrollbar-none gap-1 sm:grid sm:grid-cols-2 sm:grid-cols-5 sm:gap-2">
          {[
            { step: 1, label: "Categoria", short: "Categoria" },
            { step: 2, label: "Fotos e Mídia", short: "Mídia" },
            { step: 3, label: "Informações", short: "Info" },
            {
              step: 4,
              label:
                niche.id === "evento"
                  ? "Ingressos e Lotes"
                  : niche.id === "vaga"
                  ? "Remuneração"
                  : niche.id === "doacao"
                  ? "Disponibilidade"
                  : "Preço e Pagamento",
              short:
                niche.id === "evento"
                  ? "Ingressos"
                  : niche.id === "vaga"
                  ? "Salário"
                  : niche.id === "doacao"
                  ? "Doação"
                  : "Preço",
            },
            { step: 5, label: "Visualizar Prévia", short: "Prévia" },
          ].map((s) => {
            const isCurrent = currentStep === s.step;
            const isPast = currentStep > s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  if (s.step === 1) onBack();
                  else if (s.step === 5) handleOpenLivePreview();
                  else setCurrentStep(s.step as any);
                }}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 px-3 sm:px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-center shrink-0 snap-center min-w-20 sm:min-w-0",
                  isCurrent
                    ? "bg-primary text-primary-foreground font-bold"
                    : isPast
                    ? "bg-muted/50 text-foreground hover:bg-muted"
                    : "text-muted-foreground hover:bg-muted/30 opacity-70"
                )}
              >
                <span
                  className={cn(
                    "size-5 rounded-full flex items-center justify-center text-xs font-mono shrink-0",
                    isCurrent
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : isPast
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isPast ? "" : s.step}
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
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
          <span className="text-muted-foreground">
            Rascunho não finalizado encontrado (Etapa {draftInfo.step} de 5).
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="font-bold text-primary hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Restaurar
            </button>
            <span className="text-muted-foreground/40">•</span>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* ── Barra de Score de Qualidade (Silenciosa & Informativa) ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-lg bg-card border border-border/60 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs text-muted-foreground/75 font-bold text-muted-foreground uppercase tracking-wider shrink-0">
            Qualidade
          </span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden max-w-xs">
            <div
              className={cn(
                "h-full rounded-full transition-colors duration-300",
                qualityScore >= 80 ? "bg-emerald-500" : qualityScore >= 50 ? "bg-warning" : "bg-primary"
              )}
              style={{ width: `${qualityScore}%` }}
            />
          </div>
          <span className="font-mono font-bold text-foreground text-xs text-muted-foreground/75 shrink-0">{qualityScore}%</span>
        </div>
        <span className="text-xs text-muted-foreground/75 text-muted-foreground truncate hidden sm:inline">
          {qualityScore >= 80 ? "Excelente · Pronto para publicar" : qualityScore >= 50 ? "Bom · Adicione fotos e dados para 100%" : "Básico · Preencha mais campos"}
        </span>
      </div>

        {/* Formulário de Edição Unificado & Confortável (Sem Mockup Embutido) */}
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <div className="space-y-6">
            {/* Section 1: Mídias do Anúncio (Capa de Topo & Mural do Feed da Cidade) */}
            <ClassifiedMediaSection
              images={images}
              feedMedia={feedMedia}
              onImagesChange={setImages}
              onFeedMediaChange={setFeedMedia}
              onUploadingStateChange={setIsUploadingMedia}
            />

            {/* Section 2: Informações Básicas (Design Silencioso V121) */}
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-3 border-b border-border">
                <FileText className="size-4 text-primary shrink-0" />
                <span>Informações Gerais</span>
              </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-foreground font-medium">Título do Anúncio *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenCopilot("title")}
                  className="h-11 min-h-11 px-3 text-xs font-semibold text-foreground hover:bg-muted gap-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <FileText className="size-4" />
                  <span>Sugerir título</span>
                </Button>
              </div>
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
                    : niche.id === "evento"
                    ? "Ex: Festival de Inverno 2026 - Música & Gastronomia"
                    : "Ex: iPhone 15 Pro Max 256GB Impecável na Caixa"
                }
                className="h-11 rounded-lg text-xs bg-background font-medium"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-foreground font-medium">Descrição Completa *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenCopilot("all_editorial_fields")}
                  className="h-11 min-h-11 px-3 text-xs font-semibold text-foreground hover:bg-muted gap-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Wand2 className="size-4" />
                  <span>Refinar com Copilot</span>
                </Button>
              </div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder={
                  niche.id === "hospedagem"
                    ? "Descreva a atmosfera do espaço, comodidades, localização, distâncias de pontos turísticos e regras de convivência..."
                    : niche.id === "evento"
                    ? "Descreva a programação, atrações principais, estrutura do evento, classificação e orientações aos participantes..."
                    : "Descreva todos os detalhes, histórico, diferenciais e informações importantes..."
                }
                className="rounded-lg text-xs bg-background resize-y leading-relaxed"
              />
              {editorialTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-medium text-muted-foreground">Tags ativas:</span>
                  {editorialTags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      #{t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Motor de Precificação Dinâmica & Avisos */}
            {niche.id !== "evento" ? (
              <div className="space-y-3 pt-1 border-t border-border/40">
              <div className="space-y-2">
                <Label className="text-xs text-foreground font-semibold">
                  Modalidade de Preço
                </Label>
                <Select value={pricingType} onValueChange={(v: any) => setPricingType(v)}>
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {niche.id === "vaga" ? (
                      <>
                        <SelectItem value="fixed">Salário Fixo Mensal (R$)</SelectItem>
                        <SelectItem value="starting_at">A partir de... (Piso Salarial)</SelectItem>
                        <SelectItem value="price_range">Faixa Salarial (Mínimo e Máximo)</SelectItem>
                        <SelectItem value="on_quote">A Combinar / A Negociar na Entrevista</SelectItem>
                      </>
                    ) : niche.id === "doacao" ? (
                      <SelectItem value="free">Gratuito / Doação Solidária (R$ 0)</SelectItem>
                    ) : (
                      <>
                        <SelectItem value="fixed">Preço Fixo Definido (R$)</SelectItem>
                        <SelectItem value="starting_at">A partir de... (Preço Inicial)</SelectItem>
                        <SelectItem value="price_range">Faixa de Preço (Mínimo e Máximo)</SelectItem>
                        <SelectItem value="on_quote">Sob Orçamento / Cotação Personalizada</SelectItem>
                        <SelectItem value="exchange_only">Troca / Permuta Direta (Sem valor)</SelectItem>
                        <SelectItem value="free">Gratuito / Doação Solidária (R$ 0)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {pricingType === "fixed" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
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
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-2 flex items-end">
                    <div
                      className="flex items-center gap-2 h-11 px-3 rounded-lg bg-background border border-border/60 hover:bg-muted/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full"
                      onClick={() => setNegotiable(!negotiable)}
                    >
                      <Checkbox
                        id="neg-check"
                        checked={negotiable}
                        onCheckedChange={(c) => setNegotiable(!!c)}
                      />
                      <Label
                        htmlFor="neg-check"
                        className="text-xs text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-medium select-none"
                      >
                        Aceita Propostas / Negociável
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {/* FASE 1: Lifecycle & Regras de Validade e Estoque */}
              <div className="p-4 rounded-lg border border-border/60 bg-muted/20 space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-primary shrink-0" />
                    <span className="text-xs font-bold text-foreground">Validade do Anúncio (Obrigatório)</span>
                  </div>
                  <div className="flex items-center gap-2 bg-background p-1 rounded-lg border border-border/50">
                    {([30, 60, 90] as const).map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setValidityDays(days)}
                        className={`px-3 py-2 text-xs text-muted-foreground/75 font-bold rounded-md min-h-11 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          validityDays === days
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {days} dias
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground/75 font-semibold text-muted-foreground">
                      Limite de Pedidos / Oferta (Opcional)
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Ex: 5 pedidos"
                      value={offerLimit}
                      onChange={(e) => setOfferLimit(e.target.value)}
                      className="h-11 min-h-11 rounded-lg text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground/75 font-semibold text-muted-foreground">
                      Estoque Físico Disponível (Opcional)
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Ex: 10 unidades"
                      value={stockLimit}
                      onChange={(e) => setStockLimit(e.target.value)}
                      className="h-11 min-h-11 rounded-lg text-xs bg-background"
                    />
                  </div>
                </div>
              </div>

              {pricingType === "starting_at" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-medium">A partir de (R$) *</Label>
                    <CurrencyField
                      value={priceMinCents}
                      onChange={(v) => {
                        setPriceMinCents(v);
                        if (v && !priceCents) setPriceCents(v);
                      }}
                      placeholder="0,00"
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-2 flex items-end">
                    <div
                      className="flex items-center gap-2 h-11 px-3 rounded-lg bg-background border border-border/60 hover:bg-muted/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full"
                      onClick={() => setNegotiable(!negotiable)}
                    >
                      <Checkbox
                        id="neg-check-start"
                        checked={negotiable}
                        onCheckedChange={(c) => setNegotiable(!!c)}
                      />
                      <Label
                        htmlFor="neg-check-start"
                        className="text-xs text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-medium select-none"
                      >
                        Sujeito a orçamento final
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {pricingType === "price_range" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-medium">Preço Mínimo (R$) *</Label>
                    <CurrencyField
                      value={priceMinCents}
                      onChange={(v) => {
                        setPriceMinCents(v);
                        if (v && !priceCents) setPriceCents(v);
                      }}
                      placeholder="0,00"
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-medium">Preço Máximo (R$) *</Label>
                    <CurrencyField
                      value={priceMaxCents}
                      onChange={setPriceMaxCents}
                      placeholder="0,00"
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>
                </div>
              )}

              {pricingType === "on_quote" && (
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 text-warning-strong  text-xs">
                  <p className="font-semibold flex items-center gap-2">
                    <Coins className="size-4 shrink-0" />
                    <span>Preço sob Orçamento / Cotação</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/75 opacity-90">
                    O anúncio exibirá "Sob Consulta" na vitrine pública e convidará os clientes a solicitarem cotação personalizada via WhatsApp.
                  </p>
                </div>
              )}

              {pricingType === "exchange_only" && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs">
                  <p className="font-semibold flex items-center gap-2">
                    <RefreshCw className="size-4 shrink-0" />
                    <span>Permuta / Troca Direta</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/75 opacity-90">
                    O anúncio será classificado como troca direta. Especifique na seção de pagamento o que você aceita em contrapartida.
                  </p>
                </div>
              )}

              {pricingType === "free" && (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
                  <p className="font-semibold flex items-center gap-2">
                    <Tag className="size-4 shrink-0" />
                    <span>Gratuito / Doação Solidária (R$ 0)</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/75 opacity-90">
                    Este item ou serviço será oferecido gratuitamente para a comunidade local.
                  </p>
                </div>
              )}

              {/* Aviso Legal / Disclaimer sobre o Valor */}
              <div className="space-y-2 pt-1">
                <Label className="text-xs text-foreground font-medium">
                  Aviso sobre Valores / Flutuação
                </Label>
                <Select value={priceDisclaimer} onValueChange={setPriceDisclaimer}>
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
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
                    className="h-11 min-h-11 rounded-lg text-xs bg-background mt-2"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3 mt-4">
              <Ticket className="size-5 text-primary shrink-0 mt-1" />
              <div className="space-y-1 text-xs">
                <p className="font-bold text-foreground">Precificação Direta nos Ingressos e Lotes</p>
                <p className="text-muted-foreground leading-relaxed">
                  Eventos não utilizam preço geral no topo do anúncio. Seus valores são cadastrados individualmente por lote e tipo de ingresso na Seção 3. O menor valor ativo será exibido na capa como &quot;A partir de R$...&quot; (ou Entrada Franca se gratuito).
                </p>
              </div>
            </div>
          )}
        </div>

            {/* Seção 3: Especificações Técnicas do Anúncio */}
            {/* Viagens, Turismo & Resorts */}
            {niche.id === "viagem" && (
              <ClassifiedTravelSection
                onOpenTravelStudio={() => setTravelStudioOpen(true)}
                travelVisibilityMode={travelVisibilityMode}
                onTravelVisibilityModeChange={setTravelVisibilityMode}
                travelIsCustomQuote={travelIsCustomQuote}
                onTravelIsCustomQuoteChange={setTravelIsCustomQuote}
                travelAdultsCount={travelAdultsCount}
                onTravelAdultsCountChange={setTravelAdultsCount}
                travelChildrenCount={travelChildrenCount}
                onTravelChildrenCountChange={setTravelChildrenCount}
                travelChildrenMaxAge={travelChildrenMaxAge}
                onTravelChildrenMaxAgeChange={setTravelChildrenMaxAge}
                travelDuration={travelDuration}
                onTravelDurationChange={setTravelDuration}
                travelMealPlan={travelMealPlan}
                onTravelMealPlanChange={setTravelMealPlan}
                travelGuests={travelGuests}
                onTravelGuestsChange={setTravelGuests}
                travelDates={travelDates}
                onTravelDatesChange={setTravelDates}
                travelDestinationCity={travelDestinationCity}
                onTravelDestinationCityChange={setTravelDestinationCity}
                travelDepartureDate={travelDepartureDate}
                onTravelDepartureDateChange={setTravelDepartureDate}
                travelReturnDate={travelReturnDate}
                onTravelReturnDateChange={setTravelReturnDate}
                travelTransportType={travelTransportType}
                onTravelTransportTypeChange={setTravelTransportType}
                travelDepartureIATA={travelDepartureIATA}
                onTravelDepartureIATAChange={setTravelDepartureIATA}
                travelArrivalIATA={travelArrivalIATA}
                onTravelArrivalIATAChange={setTravelArrivalIATA}
                travelAirline={travelAirline}
                onTravelAirlineChange={setTravelAirline}
                travelConnections={travelConnections}
                onTravelConnectionsChange={setTravelConnections}
                travelConnectionCity={travelConnectionCity}
                onTravelConnectionCityChange={setTravelConnectionCity}
                travelDepartureTime={travelDepartureTime}
                onTravelDepartureTimeChange={setTravelDepartureTime}
                travelArrivalTime={travelArrivalTime}
                onTravelArrivalTimeChange={setTravelArrivalTime}
                travelFlightPrice={travelFlightPrice}
                onTravelFlightPriceChange={setTravelFlightPrice}
                travelFlightDuration={travelFlightDuration}
                onTravelFlightDurationChange={setTravelFlightDuration}
                travelBaggagePersonalItem={travelBaggagePersonalItem}
                onTravelBaggagePersonalItemChange={setTravelBaggagePersonalItem}
                travelBaggageCarryOn={travelBaggageCarryOn}
                onTravelBaggageCarryOnChange={setTravelBaggageCarryOn}
                travelBaggageChecked={travelBaggageChecked}
                onTravelBaggageCheckedChange={setTravelBaggageChecked}
                travelBusCategory={travelBusCategory}
                onTravelBusCategoryChange={setTravelBusCategory}
                travelBusCompany={travelBusCompany}
                onTravelBusCompanyChange={setTravelBusCompany}
                travelDepartureCity={travelDepartureCity}
                onTravelDepartureCityChange={setTravelDepartureCity}
                travelMeetingPoint={travelMeetingPoint}
                onTravelMeetingPointChange={setTravelMeetingPoint}
                travelReturnDepartureTime={travelReturnDepartureTime}
                onTravelReturnDepartureTimeChange={setTravelReturnDepartureTime}
                travelBoardingGatewayInput={travelBoardingGatewayInput}
                onTravelBoardingGatewayInputChange={setTravelBoardingGatewayInput}
                travelBoardingGateways={travelBoardingGateways}
                onAddGateway={handleAddGateway}
                onRemoveGateway={handleRemoveGateway}
                travelGuideService={travelGuideService}
                onTravelGuideServiceChange={setTravelGuideService}
                travelComboFromIATA={travelComboFromIATA}
                onTravelComboFromIATAChange={setTravelComboFromIATA}
                travelComboToIATA={travelComboToIATA}
                onTravelComboToIATAChange={setTravelComboToIATA}
                travelComboAirline={travelComboAirline}
                onTravelComboAirlineChange={setTravelComboAirline}
                travelComboFlightPrice={travelComboFlightPrice}
                onTravelComboFlightPriceChange={setTravelComboFlightPrice}
                travelTransferVehicle={travelTransferVehicle}
                onTravelTransferVehicleChange={setTravelTransferVehicle}
                travelTransferDuration={travelTransferDuration}
                onTravelTransferDurationChange={setTravelTransferDuration}
                travelTransferFrom={travelTransferFrom}
                onTravelTransferFromChange={setTravelTransferFrom}
                travelTransferTo={travelTransferTo}
                onTravelTransferToChange={setTravelTransferTo}
                travelTransferTime={travelTransferTime}
                onTravelTransferTimeChange={setTravelTransferTime}
                travelComboNotes={travelComboNotes}
                onTravelComboNotesChange={setTravelComboNotes}
                travelShipName={travelShipName}
                onTravelShipNameChange={setTravelShipName}
                travelCruiseLine={travelCruiseLine}
                onTravelCruiseLineChange={setTravelCruiseLine}
                travelCabinCategory={travelCabinCategory}
                onTravelCabinCategoryChange={setTravelCabinCategory}
                travelEmbarkationPort={travelEmbarkationPort}
                onTravelEmbarkationPortChange={setTravelEmbarkationPort}
                travelDepartureOptions={travelDepartureOptions}
                onAddDeparture={handleAddDeparture}
                onUpdateDeparture={handleUpdateDeparture}
                onRemoveDeparture={handleRemoveDeparture}
                travelBioBullets={travelBioBullets}
                onTravelBioBulletsChange={setTravelBioBullets}
                onAddTravelBullet={handleAddTravelBullet}
                onUpdateTravelBullet={handleUpdateTravelBullet}
                onMoveTravelBullet={handleMoveTravelBullet}
                onRemoveTravelBullet={handleRemoveTravelBullet}
                travelLodgings={travelLodgings}
                onAddTravelLodging={handleAddTravelLodging}
                onUpdateTravelLodging={handleUpdateTravelLodging}
                onRemoveTravelLodging={handleRemoveTravelLodging}
                travelStoryHighlights={travelStoryHighlights}
                onTravelStoryHighlightsChange={setTravelStoryHighlights}
                travelItineraryDays={travelItineraryDays}
                onTravelItineraryDaysChange={setTravelItineraryDays}
              />
            )}

            {/* Eventos, Festivais & Congressos */}
            {niche.id === "evento" && (
              <ClassifiedEventSection
                eventDate={eventDate}
                onEventDateChange={setEventDate}
                eventEndDate={eventEndDate}
                onEventEndDateChange={setEventEndDate}
                eventStartTime={eventStartTime}
                onEventStartTimeChange={setEventStartTime}
                eventEndTime={eventEndTime}
                onEventEndTimeChange={setEventEndTime}
                eventGatesOpenTime={eventGatesOpenTime}
                onEventGatesOpenTimeChange={setEventGatesOpenTime}
                eventAgeRating={eventAgeRating}
                onEventAgeRatingChange={setEventAgeRating}
                eventVisibility={eventVisibility}
                onEventVisibilityChange={setEventVisibility}
                eventVenueName={eventVenueName}
                onEventVenueNameChange={setEventVenueName}
                eventVenueAddress={eventVenueAddress}
                onEventVenueAddressChange={setEventVenueAddress}
                eventParkingInfo={eventParkingInfo}
                onEventParkingInfoChange={setEventParkingInfo}
                eventHostName={eventHostName}
                onEventHostNameChange={setEventHostName}
                eventHostRole={eventHostRole}
                onEventHostRoleChange={setEventHostRole}
                eventHostEntityType={eventHostEntityType}
                onEventHostEntityTypeChange={setEventHostEntityType}
                eventHostAvatarUrl={eventHostAvatarUrl}
                onEventHostAvatarUrlChange={setEventHostAvatarUrl}
                eventHostPhone={eventHostPhone}
                onEventHostPhoneChange={setEventHostPhone}
                eventStoryUrl={eventStoryUrl}
                onEventStoryUrlChange={setEventStoryUrl}
                eventStoryAutoOpen={eventStoryAutoOpen}
                onEventStoryAutoOpenChange={setEventStoryAutoOpen}
                eventPwaEnabled={eventPwaEnabled}
                onEventPwaEnabledChange={setEventPwaEnabled}
                eventTicketTiers={eventTicketTiers}
                onEventTicketTiersChange={setEventTicketTiers}
                eventSchedule={eventSchedule}
                onEventScheduleChange={setEventSchedule}
                eventSpeakers={eventSpeakers}
                onEventSpeakersChange={setEventSpeakers}
                eventSponsors={eventSponsors}
                onEventSponsorsChange={setEventSponsors}
                eventSurveys={eventSurveys}
                onEventSurveysChange={setEventSurveys}
                eventRefundPolicy={eventRefundPolicy}
                onEventRefundPolicyChange={setEventRefundPolicy}
                eventHalfPricePolicy={eventHalfPricePolicy}
                onEventHalfPricePolicyChange={setEventHalfPricePolicy}
                eventAccessibilityInfo={eventAccessibilityInfo}
                onEventAccessibilityInfoChange={setEventAccessibilityInfo}
              />
            )}

            {/* Destaques Visuais em Vitrine Imersiva */}
            {niche.id !== "viagem" && (templateStyle === "editorial" || (templateStyle as string) === "instagram") && (
              <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    <ImagePlus className="size-4 text-primary shrink-0" />
                    <span>Destaques Visuais</span>
                  </div>
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
              <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    <Wrench className="size-4 text-primary shrink-0" />
                    <span>Equipamento</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
                    Aluguel / Eventos
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-medium">Período Base</Label>
                    <Select value={equipmentPeriod} onValueChange={(v: any) => setEquipmentPeriod(v)}>
                      <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diaria">Por Diária (24h)</SelectItem>
                        <SelectItem value="evento">Por Evento (Fim de Semana)</SelectItem>
                        <SelectItem value="semanal">Semanal (7 Dias)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-medium">Valor do Caução / Garantia (R$)</Label>
                    <CurrencyField
                      value={equipmentDepositCents}
                      onChange={setEquipmentDepositCents}
                      placeholder="0,00"
                      className="h-11 rounded-lg text-xs bg-background"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Hospedagem & Temporada */}
            {niche.id === "hospedagem" && (
              <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    <Key className="size-4 text-primary shrink-0" />
                    <span>Hospedagem</span>
 </div>
 <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
 Temporada / Diária
 </Badge>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Tipo de Estadia</Label>
 <Select value={hospPropertyType} onValueChange={setHospPropertyType}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
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

 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Modalidade de Check-in</Label>
 <Select value={hospCheckinType} onValueChange={(v: any) => setHospCheckinType(v)}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="self_checkin"> Self Check-in (Fechadura Eletrônica / Cofre)</SelectItem>
 <SelectItem value="presential"> Check-in Presencial com o Anfitrião</SelectItem>
 <SelectItem value="front_desk"> Portaria / Recepção 24h</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground/75 text-muted-foreground">Hóspedes Máx.</Label>
 <Input
 value={hospGuests}
 onChange={(e) => setHospGuests(e.target.value)}
 placeholder="4"
 className="h-11 rounded-lg text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground/75 text-muted-foreground">Quartos</Label>
 <Input
 value={hospBedrooms}
 onChange={(e) => setHospBedrooms(e.target.value)}
 placeholder="1"
 className="h-11 rounded-lg text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground/75 text-muted-foreground">Banheiros</Label>
 <Input
 value={hospBathrooms}
 onChange={(e) => setHospBathrooms(e.target.value)}
 placeholder="1"
 className="h-11 rounded-lg text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground/75 text-muted-foreground">Taxa de Limpeza (R$)</Label>
 <CurrencyField
 value={hospCleaningFeeCents}
 onChange={setHospCleaningFeeCents}
 placeholder="0,00"
 className="h-11 rounded-lg text-xs bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground/75 text-muted-foreground">Horário Check-in</Label>
 <Input
 value={hospCheckinTime}
 onChange={(e) => setHospCheckinTime(e.target.value)}
 placeholder="14:00"
 className="h-11 rounded-lg text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground/75 text-muted-foreground">Horário Check-out</Label>
 <Input
 value={hospCheckoutTime}
 onChange={(e) => setHospCheckoutTime(e.target.value)}
 placeholder="11:00"
 className="h-11 rounded-lg text-xs bg-background font-mono"
 />
 </div>
 </div>

              {/* Comodidades Selecionáveis em Sub-Card com Borda Mínima */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground tracking-tight">Comodidades Disponíveis</Label>
                  <span className="text-xs text-muted-foreground font-mono">{hospAmenities.length} selecionada(s)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-1 sm:grid-cols-3 gap-2">
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
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors min-h-11 ${
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
                    className="h-11 min-h-11 rounded-lg text-xs bg-background flex-1"
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
                    className="h-11 min-h-11 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    + Adicionar
                  </Button>
                </div>
              </div>

              {/* Regras da Casa em Sub-Card com Borda Mínima */}
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground tracking-tight">Regras da Hospedagem</Label>
                  <span className="text-xs text-muted-foreground font-mono">{hospRules.length} ativa(s)</span>
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
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors min-h-11 ${
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
              <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-3 border-b border-border/40">
                  <HomeIcon className="size-4 text-primary shrink-0" />
                  <span>Imóvel</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Operação</Label>
 <Select value={reDealType} onValueChange={(v: any) => setReDealType(v)}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="aluguel">Aluguel Mensal</SelectItem>
 <SelectItem value="venda">Venda</SelectItem>
 <SelectItem value="temporada">Temporada</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Tipo de Imóvel</Label>
 <Input
 value={rePropertyType}
 onChange={(e) => setRePropertyType(e.target.value)}
 placeholder="Apartamento, Casa, etc."
 className="h-11 rounded-lg text-xs bg-background"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground/75 text-muted-foreground">Área Útil (m²)</Label>
 <Input
 value={reAreaSqm}
 onChange={(e) => setReAreaSqm(e.target.value)}
 placeholder="75"
 className="h-11 rounded-lg text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground/75 text-muted-foreground">Quartos</Label>
 <Input
 value={reBedrooms}
 onChange={(e) => setReBedrooms(e.target.value)}
 placeholder="2"
 className="h-11 rounded-lg text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground/75 text-muted-foreground">Vagas Garagem</Label>
 <Input
 value={reParking}
 onChange={(e) => setReParking(e.target.value)}
 placeholder="1"
 className="h-11 rounded-lg text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground/75 text-muted-foreground">Condomínio (R$)</Label>
 <CurrencyField
 value={reCondoCents}
 onChange={setReCondoCents}
 placeholder="0,00"
 className="h-11 rounded-lg text-xs bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground/75 text-muted-foreground">IPTU Mensal (R$)</Label>
 <CurrencyField
 value={reIptuCents}
 onChange={setReIptuCents}
 placeholder="0,00"
 className="h-11 rounded-lg text-xs bg-background"
 />
 </div>
 </div>

 {/* Comodidades & Diferenciais do Imóvel */}
 <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3 pt-2">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-semibold text-foreground tracking-tight">Comodidades e Infraestrutura do Imóvel</Label>
 <span className="text-xs text-muted-foreground font-mono">{reAmenities.length} selecionada(s)</span>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-1 sm:grid-cols-3 gap-2">
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
 className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors min-h-11 ${
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
 className="h-11 min-h-11 rounded-lg text-xs bg-background flex-1"
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
 className="h-11 min-h-11 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
 >
 + Adicionar
 </Button>
 </div>
 </div>
 </div>
 )}

 {/* Veículo */}
              {niche.id === "veiculo" && (
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Car className="size-4 text-primary" />
 <span>Veículo</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Marca *</Label>
 <Input
 value={vehicleBrand}
 onChange={(e) => setVehicleBrand(e.target.value)}
 placeholder="Ex: Honda, Toyota, VW"
 className="h-11 rounded-lg text-xs bg-background"
 />
 </div>
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Modelo *</Label>
 <Input
 value={vehicleModel}
 onChange={(e) => setVehicleModel(e.target.value)}
 placeholder="Ex: Civic, Corolla, Golf"
 className="h-11 rounded-lg text-xs bg-background"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground/75 text-muted-foreground">Ano Fab.</Label>
 <Input
 value={vehicleYearFab}
 onChange={(e) => setVehicleYearFab(e.target.value)}
 placeholder="2021"
 className="h-11 rounded-lg text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground/75 text-muted-foreground">Ano Mod.</Label>
 <Input
 value={vehicleYearModel}
 onChange={(e) => setVehicleYearModel(e.target.value)}
 placeholder="2022"
 className="h-11 rounded-lg text-xs bg-background font-mono"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-xs text-muted-foreground/75 text-muted-foreground">Km Atual</Label>
 <Input
 value={vehicleKm}
 onChange={(e) => setVehicleKm(e.target.value)}
 placeholder="45.000"
 className="h-11 rounded-lg text-xs bg-background font-mono"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Câmbio</Label>
 <Select value={vehicleTransmission} onValueChange={setVehicleTransmission}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="Manual">Manual</SelectItem>
 <SelectItem value="Automático">Automático</SelectItem>
 <SelectItem value="CVT">CVT</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Combustível</Label>
 <Select value={vehicleFuel} onValueChange={setVehicleFuel}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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

 {/* Consulta e Referência Tabela FIPE */}
 <FipeVehicleSelector
 currentBrand={vehicleBrand}
 currentModel={vehicleModel}
 currentYearModel={vehicleYearModel}
 currentFuel={vehicleFuel}
 currentPriceCents={priceCents || 0}
 initialFipeCode={vehicleFipeCode}
 initialFipePriceCents={vehicleFipePriceCents}
 onSelectVehicle={(data) => {
 if (data.brand) setVehicleBrand(data.brand);
 if (data.model) setVehicleModel(data.model);
 if (data.yearModel) setVehicleYearModel(data.yearModel);
 if (data.fuel) setVehicleFuel(data.fuel);
 if (data.fipeCode) setVehicleFipeCode(data.fipeCode);
 if (data.fipePriceCents) setVehicleFipePriceCents(data.fipePriceCents);
 if (data.referenceMonth) setVehicleFipeReferenceMonth(data.referenceMonth);
 if (data.fipeDeltaPercent !== undefined) setVehicleFipeDeltaPercent(data.fipeDeltaPercent);
 }}
 />

 {/* Opcionais & Diferenciais do Veículo */}
 <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3 pt-2">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-semibold text-foreground tracking-tight">Opcionais e Diferenciais do Veículo</Label>
 <span className="text-xs text-muted-foreground font-mono">{vehicleFeatures.length} selecionado(s)</span>
 </div>
 <div className="grid grid-cols-2 sm:grid-cols-1 sm:grid-cols-3 gap-2">
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
 className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors min-h-11 ${
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
                        className="h-11 min-h-11 rounded-lg text-xs bg-background flex-1"
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
                        className="h-11 min-h-11 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        + Adicionar
                      </Button>
                    </div>
                  </div>

                  {/* Procedência & Histórico do Veículo */}
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground tracking-tight">Procedência e Histórico</Label>
                      <span className="text-xs text-muted-foreground font-mono">{vehicleProvenance.length} selecionado(s)</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-1 sm:grid-cols-3 gap-2">
                      {CANONICAL_VEHICLE_PROVENANCE.map((prov) => {
                        const active = vehicleProvenance.includes(prov);
                        return (
                          <div
                            key={prov}
                            onClick={() => toggleItem(vehicleProvenance, setVehicleProvenance, prov)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors min-h-11 ${
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
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                    <Wrench className="size-4 text-primary" />
                    <span>Parâmetros do Serviço</span>
                  </div>

                  {/* Sub-nicho Canônico Especializado com Smart Cascade Pills */}
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-medium">Especialidade Profissional *</Label>
                    <div className="flex flex-wrap gap-2">
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
                              "h-11 min-h-11 px-3 rounded-lg text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors active:scale-95 border flex items-center gap-2",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary font-bold "
                                : "bg-background text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/40"
                            )}
                          >
                            <span>{sub.label}</span>
                            <span className="text-xs opacity-75 font-mono">({sub.councilName})</span>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/20 border border-border/60">
                        <div className="space-y-2">
                          <Label className="text-xs text-foreground font-medium flex items-center gap-2">
                            <ShieldCheck className="size-4 text-primary" />
                            <span>{matchedSub.councilFieldLabel}</span>
                          </Label>
                          <Input
                            value={serviceProfessionalCouncil}
                            onChange={(e) => setServiceProfessionalCouncil(e.target.value)}
                            placeholder={matchedSub.councilPlaceholder}
                            className="h-11 rounded-lg text-xs bg-background font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-foreground font-medium">Especialidade Principal</Label>
                          <Select value={serviceSpecialty} onValueChange={setServiceSpecialty}>
                            <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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
                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-medium">Modalidade de Atendimento</Label>
                      <Select value={serviceModality} onValueChange={(v: any) => setServiceModality(v)}>
                        <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="presencial">Presencial no Local do Cliente</SelectItem>
                          <SelectItem value="domicilio">Atendimento a Domicílio</SelectItem>
                          <SelectItem value="remoto">Remoto / Online</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-medium">Tipo de Cobrança</Label>
                      <Select value={servicePricingType} onValueChange={(v: any) => setServicePricingType(v)}>
                        <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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
                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-medium">Área de Cobertura / Região</Label>
                      <Input
                        value={serviceArea}
                        onChange={(e) => setServiceArea(e.target.value)}
                        placeholder="Ex: Chapecó e raio de até 50km"
                        className="h-11 rounded-lg text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-medium">Tempo Médio / Estimativa</Label>
                      <Input
                        value={serviceDuration}
                        onChange={(e) => setServiceDuration(e.target.value)}
                        placeholder="Ex: 2 a 4 horas / 1 dia útil"
                        className="h-11 rounded-lg text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground tracking-tight">Diferenciais do Profissional</Label>
                      <span className="text-xs text-muted-foreground font-mono">{reAmenities.length} selecionado(s)</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-1 sm:grid-cols-3 gap-2">
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
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors min-h-11 ${
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
                        className="h-11 min-h-11 rounded-lg text-xs bg-background flex-1"
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
                        className="h-11 min-h-11 rounded-lg text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        + Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Gastronomia & Delivery Especializado */}
              {niche.id === "gastronomia" && (
                <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <Utensils className="size-4 text-primary" />
                      <span>Parâmetros Gastronômicos</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold text-primary">
                      Culinária e Balcão
                    </Badge>
                  </div>

                  {/* Smart Cascade Pills para Gastronomia */}
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-medium">Especialidade Gastronômica *</Label>
                    <div className="flex flex-wrap gap-2">
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
                              "h-11 min-h-11 px-3 rounded-lg text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors active:scale-95 border flex items-center gap-2",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary font-bold "
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
                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-medium">Tempo Médio de Preparo</Label>
                      <Input
                        value={foodPrepTime}
                        onChange={(e) => setFoodPrepTime(e.target.value)}
                        placeholder="Ex: 20-35 min"
                        className="h-11 rounded-lg text-xs bg-background"
                      />
                    </div>
                  </div>

                  {/* Canais de Atendimento & Entrega */}
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground tracking-tight">Canais de Atendimento e Entrega</Label>
                      <span className="text-xs text-muted-foreground font-mono">{foodDeliveryModes.length} ativo(s)</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                              "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors min-h-11",
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
                      <div className="p-3 bg-muted/30 border border-border/40 rounded-lg space-y-2">
                        <span className="text-xs text-muted-foreground/75 font-semibold text-muted-foreground block">Exemplos populares em {matched.label}:</span>
                        <div className="flex flex-wrap gap-2">
                          {matched.suggestedItems.map((item) => (
                            <span key={item} className="text-xs bg-background border border-border/60 px-2 py-1 rounded-md text-foreground">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Conveniência, Bebidas & Mercado Especializado */}
              {((niche.id as string) === "mercado" || templateStyle === "conveniencia") && (
                <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <Zap className="size-4 text-emerald-600" />
                      <span>Parâmetros de Conveniência</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                      Pronta Entrega
                    </Badge>
                  </div>

                  {/* Volume / Medida */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-foreground font-medium">Volume / Embalagem *</Label>
                      <span className="text-xs text-muted-foreground font-mono">Ex: 1L, 350ml, 500g</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["350ml", "473ml", "600ml", "1L", "1.5L", "2L", "500g", "1kg", "Pack 6 un", "Unidade"].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setConvenienceVolume(v)}
                          className={cn(
                            "h-11 min-h-11 px-4 rounded-lg text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors border",
                            convenienceVolume === v
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/60"
                          )}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={convenienceVolume}
                      onChange={(e) => setConvenienceVolume(e.target.value)}
                      placeholder="Ou digite o volume/tamanho (ex: Garrafa 1 Litro)"
                      className="h-11 min-h-11 rounded-lg text-xs bg-background"
                    />
                  </div>

                  {/* Temperatura / Conservação */}
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-medium">Temperatura / Conservação</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "gelada", label: " Gelada", desc: "Pronta p/ consumo" },
                        { id: "ambiente", label: " Ambiente", desc: "Prateleira / Bar" },
                        { id: "congelado", label: "️ Congelado", desc: "Freezer / Gelo" },
                        { id: "fresco", label: " Fresco", desc: "Hortifrúti / Padaria" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setConvenienceTemp(t.id as any)}
                          className={cn(
                            "p-2 rounded-lg border text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors",
                            convenienceTemp === t.id
                              ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/30"
                              : "bg-background border-border/60 text-muted-foreground hover:bg-muted/30"
                          )}
                        >
                          <p className="text-xs font-bold text-foreground">{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Restrição Alcoólica / 18+ */}
                  <div className="p-4 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="conv-alcoholic" className="text-xs font-semibold text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-2">
                        <span>Contém Álcool (Bebida Alcoólica +18)</span>
                      </Label>
                      <p className="text-xs text-muted-foreground/75 text-muted-foreground">
                        Exibe aviso obrigatório de proibição de venda para menores de 18 anos.
                      </p>
                    </div>
                    <Switch
                      id="conv-alcoholic"
                      checked={isAlcoholic}
                      onCheckedChange={setIsAlcoholic}
                    />
                  </div>

                  {/* Marca & Tempo de Despacho */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground">Marca / Fabricante</Label>
                      <Input
                        value={convenienceBrand}
                        onChange={(e) => setConvenienceBrand(e.target.value)}
                        placeholder="Ex: Mansão Maromba, Ambev, Coca-Cola..."
                        className="h-11 min-h-11 rounded-lg text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground">Previsão de Entrega</Label>
                      <Input
                        value={deliveryEstimateText}
                        onChange={(e) => setDeliveryEstimateText(e.target.value)}
                        placeholder="Ex: 35-50 min (MotoLink Express)"
                        className="h-11 min-h-11 rounded-lg text-xs bg-background font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mercado, Perecíveis, Açougue & Conveniência */}
              {/* Supermercado & Hortifrúti */}
              {niche.id === "mercado" && (
                <ClassifiedGrocerySection
                  groceryDepartment={groceryDepartment}
                  onGroceryDepartmentChange={setGroceryDepartment}
                  grocerySubCategory={grocerySubCategory}
                  onGrocerySubCategoryChange={setGrocerySubCategory}
                  groceryUnitType={groceryUnitType}
                  onGroceryUnitTypeChange={setGroceryUnitType}
                  groceryEstimatedWeightPerUnit={groceryEstimatedWeightPerUnit}
                  onGroceryEstimatedWeightPerUnitChange={setGroceryEstimatedWeightPerUnit}
                  groceryPrepOptions={groceryPrepOptions}
                  onGroceryPrepOptionsChange={setGroceryPrepOptions}
                  groceryBrand={groceryBrand}
                  onGroceryBrandChange={setGroceryBrand}
                  groceryBarcodeEan={groceryBarcodeEan}
                  onGroceryBarcodeEanChange={setGroceryBarcodeEan}
                  groceryTemperature={groceryTemperature}
                  onGroceryTemperatureChange={setGroceryTemperature}
                  groceryIsAlcoholic={groceryIsAlcoholic}
                  onGroceryIsAlcoholicChange={setGroceryIsAlcoholic}
                  groceryContainsGluten={groceryContainsGluten}
                  onGroceryContainsGlutenChange={setGroceryContainsGluten}
                  groceryContainsLactose={groceryContainsLactose}
                  onGroceryContainsLactoseChange={setGroceryContainsLactose}
                  groceryIsOrganic={groceryIsOrganic}
                  onGroceryIsOrganicChange={setGroceryIsOrganic}
                  groceryIngredients={groceryIngredients}
                  onGroceryIngredientsChange={setGroceryIngredients}
                  groceryDeliveryEstimate={groceryDeliveryEstimate}
                  onGroceryDeliveryEstimateChange={setGroceryDeliveryEstimate}
                  groceryDeliveryFeeCents={groceryDeliveryFeeCents}
                  onGroceryDeliveryFeeCentsChange={setGroceryDeliveryFeeCents}
                  grocerySupportsFreshPricing={grocerySupportsFreshPricing}
                  onGrocerySupportsFreshPricingChange={setGrocerySupportsFreshPricing}
                  groceryDefaultPricingMode={groceryDefaultPricingMode}
                  onGroceryDefaultPricingModeChange={setGroceryDefaultPricingMode}
                  groceryAvgPieceWeightGrams={groceryAvgPieceWeightGrams}
                  onGroceryAvgPieceWeightGramsChange={setGroceryAvgPieceWeightGrams}
                  groceryPricePerKgCents={groceryPricePerKgCents}
                  onGroceryPricePerKgCentsChange={setGroceryPricePerKgCents}
                  groceryRipenessEnabled={groceryRipenessEnabled}
                  onGroceryRipenessEnabledChange={setGroceryRipenessEnabled}
                  groceryProgressiveDiscountsEnabled={groceryProgressiveDiscountsEnabled}
                  onGroceryProgressiveDiscountsEnabledChange={setGroceryProgressiveDiscountsEnabled}
                  groceryDiscountTiers={groceryDiscountTiers}
                  onGroceryDiscountTiersChange={setGroceryDiscountTiers}
                  groceryOrderBumpEnabled={groceryOrderBumpEnabled}
                  onGroceryOrderBumpEnabledChange={setGroceryOrderBumpEnabled}
                  groceryOrderBumpTitle={groceryOrderBumpTitle}
                  onGroceryOrderBumpTitleChange={setGroceryOrderBumpTitle}
                  groceryOrderBumpBadge={groceryOrderBumpBadge}
                  onGroceryOrderBumpBadgeChange={setGroceryOrderBumpBadge}
                  groceryOrderBumpSpecialPriceCents={groceryOrderBumpSpecialPriceCents}
                  onGroceryOrderBumpSpecialPriceCentsChange={setGroceryOrderBumpSpecialPriceCents}
                  groceryOrderBumpOriginalPriceCents={groceryOrderBumpOriginalPriceCents}
                  onGroceryOrderBumpOriginalPriceCentsChange={setGroceryOrderBumpOriginalPriceCents}
                />
              )}

              {/* Agronegócio & Maquinário Pesado */}
              {niche.id === "agro" && (
                <div className="bg-card rounded-lg p-4 sm:p-5 space-y-5 border border-border/60">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <Tractor className="size-4 text-primary" />
                      <span>Ficha Técnica do Maquinário</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                      Agronegócio
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-semibold">Tipo de Maquinário / Equipamento *</Label>
                      <Select value={agriImplementType} onValueChange={setAgriImplementType}>
                        <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium focus-visible:ring-2 focus-visible:ring-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Trator">Trator Agrícola</SelectItem>
                          <SelectItem value="Colheitadeira">Colheitadeira</SelectItem>
                          <SelectItem value="Plantadeira">Plantadeira / Semeadeira</SelectItem>
                          <SelectItem value="Pulverizador">Pulverizador Autopropelido</SelectItem>
                          <SelectItem value="Implemento">Implemento (Grade, Arado, Subsolador)</SelectItem>
                          <SelectItem value="Caminhao_Agro">Caminhão / Reboque Graneleiro</SelectItem>
                          <SelectItem value="Insumo">Insumos / Nutrição / Sementes</SelectItem>
                          <SelectItem value="Outro_Agro">Outro Maquinário Agro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-semibold">Horímetro (Horas de Uso)</Label>
                      <Input
                        type="number"
                        value={agriHoursUsed}
                        onChange={(e) => setAgriHoursUsed(e.target.value)}
                        placeholder="Ex: 1850"
                        className="h-11 rounded-lg text-xs bg-background font-mono focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-semibold">Tração</Label>
                      <Select value={agriTraction} onValueChange={setAgriTraction}>
                        <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium focus-visible:ring-2 focus-visible:ring-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4x4">Tração 4x4 Integral</SelectItem>
                          <SelectItem value="4x2">Tração 4x2</SelectItem>
                          <SelectItem value="esteira">Esteiras de Borracha / Metal</SelectItem>
                          <SelectItem value="articulado">Articulado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-semibold">Potência do Motor (CV)</Label>
                      <Input
                        type="number"
                        value={agriPowerCv}
                        onChange={(e) => setAgriPowerCv(e.target.value)}
                        placeholder="Ex: 110"
                        className="h-11 rounded-lg text-xs bg-background font-mono focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-semibold">Ano de Fabricação</Label>
                      <Input
                        type="number"
                        value={agriYearFab}
                        onChange={(e) => setAgriYearFab(e.target.value)}
                        placeholder="Ex: 2021"
                        className="h-11 rounded-lg text-xs bg-background font-mono focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-semibold">Tipo de Cabine</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAgriCabinType("cabin")}
                        className={cn(
                          "h-11 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                          agriCabinType === "cabin"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-foreground hover:bg-muted"
                        )}
                      >
                        Cabinado com Ar Condicionado
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgriCabinType("open")}
                        className={cn(
                          "h-11 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                          agriCabinType === "open"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-foreground hover:bg-muted"
                        )}
                      >
                        Plataformado / Aberto
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Farmácia, Saúde & Bem-Estar */}
              {niche.id === "farmacia" && (
                <div className="bg-card rounded-lg p-4 sm:p-5 space-y-5 border border-border/60">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <StoreIcon className="size-4 text-primary" />
                      <span>Ficha Técnica Farmacêutica</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold text-teal-600 dark:text-teal-400 border-teal-500/30 bg-teal-500/10">
                      Saúde & Farmácia
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-semibold">Linha / Segmento *</Label>
                      <Select value={pharmacySubNiche} onValueChange={setPharmacySubNiche}>
                        <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium focus-visible:ring-2 focus-visible:ring-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Medicamento">Medicamento / Farmacêutico</SelectItem>
                          <SelectItem value="Suplemento">Suplemento & Vitaminas</SelectItem>
                          <SelectItem value="Dermocosmetico">Dermocosmético & Pele</SelectItem>
                          <SelectItem value="Higiene_Cuidados">Higiene & Cuidados Pessoais</SelectItem>
                          <SelectItem value="Ortopedia_Primeiros_Socorros">Ortopedia & Primeiros Socorros</SelectItem>
                          <SelectItem value="Bebe_Infantil">Mamãe & Bebê</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-semibold">Exigência de Receita Médica</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPharmacyRetentionPrescription(false)}
                          className={cn(
                            "h-11 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                            !pharmacyRetentionPrescription
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border text-foreground hover:bg-muted"
                          )}
                        >
                          Venda Livre
                        </button>
                        <button
                          type="button"
                          onClick={() => setPharmacyRetentionPrescription(true)}
                          className={cn(
                            "h-11 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                            pharmacyRetentionPrescription
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border text-foreground hover:bg-muted"
                          )}
                        >
                          Retenção de Receita
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-semibold">Princípio Ativo / Composição</Label>
                      <Input
                        value={pharmacyActiveIngredient}
                        onChange={(e) => setPharmacyActiveIngredient(e.target.value)}
                        placeholder="Ex: Dipirona Monoidratada 500mg, Vitamina C"
                        className="h-11 rounded-lg text-xs bg-background focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-semibold">Laboratório / Fabricante</Label>
                      <Input
                        value={pharmacyManufacturer}
                        onChange={(e) => setPharmacyManufacturer(e.target.value)}
                        placeholder="Ex: EMS, Medley, Eurofarma, Cimed, Bayer"
                        className="h-11 rounded-lg text-xs bg-background focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-semibold">Registro Anvisa / MS</Label>
                    <Input
                      value={pharmacyAnvisaRegistry}
                      onChange={(e) => setPharmacyAnvisaRegistry(e.target.value)}
                      placeholder="Ex: MS 1.0235.0789.001-2"
                      className="h-11 rounded-lg text-xs bg-background font-mono focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>
              )}



              {/* Negócios */}
              {niche.id === "negocio" && (
                <div className="bg-card rounded-lg p-4 sm:p-5 space-y-5 border border-border/60">
                  <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <Briefcase className="size-4 text-primary" />
                      <span>Parâmetros do Negócio</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold text-warning-strong  border-warning/30 bg-warning/10">
                      Negócios
                    </Badge>
                  </div>

                  {/* Sincronização e Auditoria Cadastral por CNPJ (Receita Federal & IA) */}
                  <div className="p-4 sm:p-4 rounded-lg bg-muted/20 border border-border/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                          <Building className="size-4 text-primary" />
                          <span>Buscar Dados Oficiais da Empresa por CNPJ (Opcional)</span>
                        </Label>
                        <p className="text-xs text-muted-foreground/75 text-muted-foreground">
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
                          className="h-11 min-h-11 sm:h-11 rounded-lg text-xs bg-background font-mono"
                          maxLength={18}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleLookupAndAuditCnpj}
                        disabled={isSearchingCnpj || !companyCnpj.trim()}
                        className="h-11 min-h-11 sm:h-11 px-4 rounded-lg text-xs font-bold shrink-0 gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {isSearchingCnpj ? (
                          <>
                            <Loader2 className="size-4 animate-spin motion-reduce:animate-none text-primary" />
                            <span>Auditando...</span>
                          </>
                        ) : (
                          <>
                            <Search className="size-4 text-primary" />
                            <span>Consultar CNPJ</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Feedback visual da Auditoria Cadastral */}
                    {cnpjAuditData && (
                      <div className="p-3 rounded-lg bg-background border border-border/70 space-y-2 animate-in fade-in-50 text-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="size-4 text-emerald-500" />
                            <strong className="text-foreground">{cnpjAuditData.companyName}</strong>
                          </div>
                          <Badge
                            className={cn(
                              "text-xs font-bold px-2 py-1",
                              cnpjAuditData.legalRiskScore < 30
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                : cnpjAuditData.legalRiskScore < 65
                                ? "bg-warning/10 text-warning-strong  border-warning/30"
                                : "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30"
                            )}
                          >
                            Risco Cadastral: {cnpjAuditData.riskClassification} ({cnpjAuditData.legalRiskScore}/100)
                          </Badge>
                        </div>
                        {cnpjAuditData.aiEvaluationSummary && (
                          <p className="text-xs text-muted-foreground/75 text-muted-foreground leading-relaxed">
                            {cnpjAuditData.aiEvaluationSummary}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Smart Cascade Pills para Negócios */}
                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-medium">Modelo da Transação *</Label>
                    <div className="flex flex-wrap gap-2">
                      {CANONICAL_BUSINESS_TYPES.map((type) => {
                        const isSelected = businessType === type.id;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setBusinessType(type.id)}
                            className={cn(
                              "h-11 min-h-11 px-3 rounded-lg text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors active:scale-95 border flex items-center gap-2",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary font-bold "
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

                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-medium">Segmento de Mercado *</Label>
                      <Select value={businessSegment} onValueChange={setBusinessSegment}>
                        <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
                      <div className="flex items-center justify-between pb-1 border-b border-primary/20">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                          <Coins className="size-4" />
                          <span>Parâmetros de Captação</span>
                        </div>
                        <Badge variant="outline" className="text-xs font-bold border-primary/40 text-primary bg-primary/10">
                          Oportunidade de Parceria
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-foreground font-medium">Valor do Aporte Solicitado *</Label>
                          <CurrencyField
                            value={targetInvestmentCents}
                            onChange={setTargetInvestmentCents}
                            placeholder="R$ 100.000,00"
                            className="h-11 rounded-lg text-xs bg-background font-mono font-bold"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-foreground font-medium">Participação / Cotas Ofertadas (%)</Label>
                          <Input
                            value={offeredEquityPercent}
                            onChange={(e) => setOfferedEquityPercent(e.target.value)}
                            placeholder="Ex: 15% ou A Combinar"
                            className="h-11 rounded-lg text-xs bg-background font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-foreground font-medium">Modelo do Investimento / Parceria *</Label>
                          <Select value={investmentModel} onValueChange={setInvestmentModel}>
                            <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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

                        <div className="space-y-2">
                          <Label className="text-xs text-foreground font-medium">Estágio Atual do Negócio *</Label>
                          <Select value={projectStage} onValueChange={setProjectStage}>
                            <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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
                        <div className="flex flex-wrap gap-2">
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
                                  "h-11 min-h-11 px-3 rounded-lg text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors active:scale-95 border",
                                  isSelected
                                    ? "bg-primary text-primary-foreground border-primary font-bold "
                                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                                )}
                              >
                                {fund}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-foreground font-medium">Link do Pitch Deck ou Apresentação do Negócio (PDF, Drive ou Notion)</Label>
                        <Input
                          value={pitchDeckUrl}
                          onChange={(e) => setPitchDeckUrl(e.target.value)}
                          placeholder="https://drive.google.com/... ou link público da apresentação"
                          className="h-11 rounded-lg text-xs bg-background"
                        />
                      </div>
                    </div>
                  )}

                  {/* Grid de Métricas Financeiras Estratégicas */}
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <FileSpreadsheet className="size-4 text-primary" />
                      <span>Demonstrativo Financeiro (DRE Estimado)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-foreground font-medium">Faturamento Médio Mensal</Label>
                        <CurrencyField
                          value={businessMonthlyRevenueCents}
                          onChange={setBusinessMonthlyRevenueCents}
                          placeholder="R$ 150.000,00"
                          className="h-11 rounded-lg text-xs bg-background font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-foreground font-medium">Lucro Líquido Mensal</Label>
                        <CurrencyField
                          value={businessNetProfitCents}
                          onChange={setBusinessNetProfitCents}
                          placeholder="R$ 35.000,00"
                          className="h-11 rounded-lg text-xs bg-background font-mono text-emerald-600 dark:text-emerald-400 font-bold"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-foreground font-medium">Capital de Giro Necessário</Label>
                        <CurrencyField
                          value={businessWorkingCapitalCents}
                          onChange={setBusinessWorkingCapitalCents}
                          placeholder="R$ 40.000,00"
                          className="h-11 rounded-lg text-xs bg-background font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-foreground font-medium">Ano de Fundação da Empresa</Label>
                        <Input
                          value={businessFoundationYear}
                          onChange={(e) => setBusinessFoundationYear(e.target.value)}
                          placeholder="Ex: 2018"
                          className="h-11 rounded-lg text-xs bg-background font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-foreground font-medium">Quadro de Colaboradores</Label>
                        <Select value={businessEmployeesRange} onValueChange={setBusinessEmployeesRange}>
                          <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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

                      <div className="space-y-2">
                        <Label className="text-xs text-foreground font-medium">Motivo da Venda</Label>
                        <Select value={businessSaleReason} onValueChange={setBusinessSaleReason}>
                          <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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
                  <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <Building className="size-4 text-primary" />
                      <span>Ponto Comercial</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-foreground font-medium">Tipo de Ponto Comercial</Label>
                        <Select value={businessPointType} onValueChange={setBusinessPointType}>
                          <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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

                      <div className="space-y-2">
                        <Label className="text-xs text-foreground font-medium">Área Útil do Imóvel (m²)</Label>
                        <Input
                          value={businessAreaSqm}
                          onChange={(e) => setBusinessAreaSqm(e.target.value)}
                          placeholder="Ex: 180"
                          className="h-11 rounded-lg text-xs bg-background font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-foreground font-medium">Tempo Restante de Contrato</Label>
                        <Input
                          value={businessContractRemainingYears}
                          onChange={(e) => setBusinessContractRemainingYears(e.target.value)}
                          placeholder="Ex: 3 anos renováveis"
                          className="h-11 rounded-lg text-xs bg-background"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-foreground font-medium">Valor do Aluguel Mensal</Label>
                        <CurrencyField
                          value={businessMonthlyRentCents}
                          onChange={setBusinessMonthlyRentCents}
                          placeholder="R$ 4.500,00"
                          className="h-11 rounded-lg text-xs bg-background font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-foreground font-medium">IPTU Mensal</Label>
                        <CurrencyField
                          value={businessMonthlyIptuCents}
                          onChange={setBusinessMonthlyIptuCents}
                          placeholder="R$ 380,00"
                          className="h-11 rounded-lg text-xs bg-background font-mono"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-foreground font-medium">Condomínio Mensal</Label>
                        <CurrencyField
                          value={businessMonthlyCondoCents}
                          onChange={setBusinessMonthlyCondoCents}
                          placeholder="R$ 0,00"
                          className="h-11 rounded-lg text-xs bg-background font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Governança de Sigilo & Assessoria M&A */}
                  <div className="p-4 rounded-lg bg-warning/5 border border-warning/20 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="nda-switch" className="text-xs font-bold text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-2">
                          <Lock className="size-4 text-warning-strong " />
                          Exigir Assinatura de NDA Digital
                        </Label>
                        <p className="text-xs text-muted-foreground/75 text-muted-foreground leading-snug">
                          Mascara faturamento e lucro na vitrine pública (`R$ 1***`). Apenas investidores que assinarem o termo terão acesso imediato.
                        </p>
                      </div>
                      <Switch
                        id="nda-switch"
                        checked={businessRequiresNda}
                        onCheckedChange={setBusinessRequiresNda}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-warning/15">
                      <div className="space-y-1">
                        <Label htmlFor="advisor-switch" className="text-xs font-bold text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-2">
                          <ShieldCheck className="size-4 text-primary" />
                          Operação Assessorada por Consultor M&A
                        </Label>
                        <p className="text-xs text-muted-foreground/75 text-muted-foreground leading-snug">
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
                    <div className="pt-3 border-t border-warning/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                            <FileSpreadsheet className="size-4 text-warning-strong " />
                            Documentos Confidenciais e DRE (Acesso Restrito via NDA)
                          </Label>
                          <p className="text-xs text-muted-foreground/75 text-muted-foreground leading-snug">
                            Anexe DRE, balanços, inventário ou contratos em PDF, XLSX ou CSV. Os arquivos só poderão ser baixados por investidores após assinatura digital do termo de sigilo.
                          </p>
                        </div>
                        <label className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
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
                          <span className="inline-flex items-center gap-2 h-11 min-h-11 px-3 rounded-lg text-xs font-semibold bg-warning/15 hover:bg-warning/25 text-warning-strong  border border-warning/30 transition-colors">
                            {isUploadingRestrictedDoc ? (
                              <>
                                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Plus className="size-4" />
                                Anexar Documento
                              </>
                            )}
                          </span>
                        </label>
                      </div>

                      {businessRestrictedDocuments.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {businessRestrictedDocuments.map((doc, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-background border border-border/70 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="size-4 text-warning-strong shrink-0" />
                                <span className="font-medium text-foreground truncate">{doc.name}</span>
                                {doc.size_bytes && (
                                  <span className="text-xs text-muted-foreground font-mono shrink-0">
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
                                className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                aria-label="Remover documento"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Telemetria de Viabilidade & Payback (SimLabs IA) */}
                  <div className="rounded-lg border border-primary/25 bg-primary/5 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                        <Zap className="size-4 text-primary" />
                        <span>Viabilidade Comercial</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAnalyzeCommercialPoint}
                        disabled={isAnalyzingTelemetry}
                        className="h-11 min-h-11 px-3 text-xs font-semibold rounded-lg border-primary/30 text-primary hover:bg-primary/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
                      >
                        {isAnalyzingTelemetry ? (
                          <>
                            <Loader2 className="size-4 mr-2 animate-spin motion-reduce:animate-none" />
                            Calculando com SimLabs...
                          </>
                        ) : (
                          <>
                            <Zap className="size-4 mr-2" />
                            Sugerir Telemetria com SimLabs IA
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground/75 text-muted-foreground leading-snug">
                      O motor SimLabs cruza área em m², custo de aluguel e faturamento estimado para projetar payback, ocupação e score de viabilidade para compradores.
                    </p>

                    {telemetryResult && (
                      <div className="mt-3 p-4 rounded-lg bg-background border border-border/70 space-y-2 animate-in fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded-lg bg-muted/30">
                            <span className="text-xs text-muted-foreground uppercase font-bold block">Score</span>
                            <span className="text-sm font-bold text-primary font-mono">{telemetryResult.viabilityScore}/100</span>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/30">
                            <span className="text-xs text-muted-foreground uppercase font-bold block">Payback</span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">~{telemetryResult.paybackMonthsEstimate} meses</span>
                          </div>
                          <div className="p-2 rounded-lg bg-muted/30">
                            <span className="text-xs text-muted-foreground uppercase font-bold block">Aluguel / Fat.</span>
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
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Tag className="size-4 text-primary" />
 <span>Especificações</span>
 </div>
 
 </div>

 {/* Seletor de Subcategoria de Desapego */}
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Tipo de Item / Segmento</Label>
 <Select value={desapegoCategory} onValueChange={(v: any) => setDesapegoCategory(v)}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="smartphones"> Celulares & Smartphones</SelectItem>
 <SelectItem value="computadores"> Notebooks, PCs & Acessórios</SelectItem>
 <SelectItem value="eletronicos"> Eletrônicos & Som em Geral</SelectItem>
 <SelectItem value="eletrodomesticos"> Eletrodomésticos & Cozinha</SelectItem>
 <SelectItem value="moveis">️ Móveis & Decoração de Ambientes</SelectItem>
 <SelectItem value="moda_brecho"> Brechó de Roupas & Acessórios</SelectItem>
 <SelectItem value="garagem"> Venda de Garagem & Ferramentas</SelectItem>
 <SelectItem value="outros">️ Outros Bens Pessoais</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Seção Específica para Smartphones & Celulares com Seletores Canônicos */}
 {desapegoCategory === "smartphones" && (
 <div className="p-4 rounded-lg bg-muted/20 border border-border/60 space-y-4">
 <div className="text-xs text-muted-foreground/75 font-bold text-primary uppercase tracking-wider">
 Especificações do Aparelho
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Marca do Aparelho</Label>
 <Select value={phoneBrand} onValueChange={(v) => {
 setPhoneBrand(v);
 if (v === "Apple") setPhoneModel("iPhone 15 Pro");
 else if (v === "Samsung") setPhoneModel("Galaxy S24");
 else if (v === "Xiaomi") setPhoneModel("Redmi Note 13 Pro 5G");
 else if (v === "Motorola") setPhoneModel("Edge 50 Ultra");
 }}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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

 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Modelo da Linha</Label>
 <Select value={phoneModel} onValueChange={setPhoneModel}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Armazenamento Interno</Label>
 <Select value={phoneStorage} onValueChange={setPhoneStorage}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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

 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Saúde da Bateria (%)</Label>
 <Input
 type="number"
 min="50"
 max="100"
 value={phoneBatteryHealth}
 onChange={(e) => setPhoneBatteryHealth(e.target.value)}
 placeholder="Ex: 95"
 className="h-11 rounded-lg text-xs bg-background font-mono"
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
 className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
 isSelected
 ? "bg-primary/10 border-primary text-primary"
 : "bg-background border-border text-muted-foreground hover:text-foreground"
 }`}
 >
 {isSelected ? " " : "+ "}
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
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/20 border border-border/60">
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Ambiente do Móvel</Label>
 <Select value={furnitureRoom} onValueChange={setFurnitureRoom}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Material Principal</Label>
 <Select value={furnitureMaterial} onValueChange={setFurnitureMaterial}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/20 border border-border/60">
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Gênero / Faixa</Label>
 <Select value={fashionGender} onValueChange={setFashionGender}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Tamanho da Peça</Label>
 <Select value={fashionSize} onValueChange={setFashionSize}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Estado de Conservação</Label>
 <Select value={itemCondition} onValueChange={(v: any) => setItemCondition(v)}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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

 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Garantia / Procedência</Label>
 <Input
 value={itemWarranty}
 onChange={(e) => setItemWarranty(e.target.value)}
 placeholder="Ex: 3 meses de garantia, NF em mãos"
 className="h-11 rounded-lg text-xs bg-background"
 />
 </div>
 </div>
 </div>
 )}

 {/* Serviço Profissional */}
 {niche.id === "servico" && (
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Wrench className="size-4 text-primary" />
 <span>Atendimento</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Modalidade de Atendimento</Label>
 <Select value={serviceModality} onValueChange={(v: any) => setServiceModality(v)}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="presencial">Presencial no Estabelecimento</SelectItem>
 <SelectItem value="domicilio">Em Domicílio (Atende no Local)</SelectItem>
 <SelectItem value="remoto">100% Remoto / Online</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Região de Atendimento</Label>
 <Input
 value={serviceArea}
 onChange={(e) => setServiceArea(e.target.value)}
 placeholder="Ex: Toda a cidade e região"
 className="h-11 rounded-lg text-xs bg-background"
 />
 </div>
 </div>
 </div>
 )}

 {/* Oportunidade / Vaga Master Padrão Corporativo Waesy */}
 {niche.id === "vaga" && (
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Briefcase className="size-4 text-primary" />
 <span>Parâmetros de Contratação</span>
 </div>
 
 </div>

 {/* Cargo / Título Profissional */}
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Cargo / Ocupação Profissional *</Label>
 <Input
 value={jobRole}
 onChange={(e) => setJobRole(e.target.value)}
 placeholder="Ex: Assistente Administrativo, Desenvolvedor Fullstack, Vendedor"
 className="h-11 rounded-lg text-xs bg-background"
 />
 </div>

 {/* Grid de 2 Colunas: Escolaridade Mínima e Tempo de Experiência Mensuráveis */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <GraduationCap className="size-4 text-primary" />
 <Label className="text-xs text-foreground font-medium">Escolaridade Mínima Exigida *</Label>
 </div>
 <Select value={jobMinEducation} onValueChange={setJobMinEducation}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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

 <div className="space-y-2">
 <div className="flex items-center gap-2">
 <Award className="size-4 text-primary" />
 <Label className="text-xs text-foreground font-medium">Experiência Profissional Mínima *</Label>
 </div>
 <Select value={jobExperienceLevel} onValueChange={setJobExperienceLevel}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Regime de Contratação</Label>
 <Select value={jobRegime} onValueChange={(v: any) => setJobRegime(v)}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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

 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Modelo de Trabalho</Label>
 <Select value={jobModel} onValueChange={(v: any) => setJobModel(v)}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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

 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Jornada de Trabalho</Label>
 <Select value={jobWorkSchedule} onValueChange={setJobWorkSchedule}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Faixa Salarial / Remuneração Estimada</Label>
 <Select value={jobSalaryRange} onValueChange={setJobSalaryRange}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
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
 <span className="text-xs text-muted-foreground/75 text-muted-foreground font-mono">{jobBenefits.length} selecionado(s)</span>
 </div>
 <div className="flex flex-wrap gap-2">
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
 className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
 active
 ? "bg-primary/15 border-primary text-primary font-semibold"
 : "bg-background border-border text-muted-foreground hover:text-foreground"
 }`}
 >
 {active ? " " : "+ "}
 {ben}
 </button>
 );
 })}
 </div>
 </div>

 {/* Habilidades & Competências com Tags Interativas */}
 <div className="space-y-2 pt-2 border-t border-border/40">
 <div className="flex items-center justify-between">
 <Label className="text-xs text-foreground font-medium">Competências e Habilidades Desejadas</Label>
 <span className="text-xs text-muted-foreground/75 text-muted-foreground font-mono">{jobSkills.length} adicionada(s)</span>
 </div>

 {/* Tags Ativas */}
 <div className="flex flex-wrap gap-2 min-h-7">
 {jobSkills.map((sk) => (
 <Badge
 key={sk}
 variant="secondary"
 className="text-xs font-medium pl-3 pr-2 py-1 rounded-lg gap-2 bg-primary/10 text-primary border-primary/20"
 >
 <span>{sk}</span>
 <button
 type="button"
 onClick={() => setJobSkills((prev) => prev.filter((s) => s !== sk))}
 className="hover:text-destructive text-primary/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
 className="h-11 rounded-lg text-xs bg-background"
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
 className="h-11 min-h-11 px-3 rounded-lg text-xs"
 >
 Adicionar
 </Button>
 </div>

 {/* Sugestões Rápidas */}
 <div className="space-y-1 pt-1">
 <span className="text-xs text-muted-foreground block font-medium">Sugestões comuns:</span>
 <div className="flex flex-wrap gap-1">
 {SUGGESTED_JOB_SKILLS.filter((s) => !jobSkills.includes(s)).slice(0, 6).map((sug) => (
 <button
 key={sug}
 type="button"
 onClick={() => setJobSkills((prev) => [...prev, sug])}
 className="px-3 py-2 min-h-11 rounded-md text-xs border border-dashed border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
 className={`p-2 rounded-lg border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex flex-col justify-between ${
 selected
 ? "bg-primary/5 border-primary text-foreground"
 : "bg-background border-border text-muted-foreground"
 }`}
 >
 <div className="flex items-center gap-2">
 <Checkbox checked={selected} />
 <span className="text-xs font-semibold">{method.label}</span>
 </div>
 <span className="text-xs text-muted-foreground mt-1 pl-6">{method.desc}</span>
 </div>
 );
 })}
 </div>
 </div>
                </div>
              )}

 {/* Produto Digital & Downloads */}
 {niche.id === "digital" && (
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <FileArchive className="size-4 text-primary" />
 <span>Arquivo Digital</span>
 </div>
 <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
 Download Imediato
 </Badge>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Tipo de Material Digital</Label>
 <Select value={digitalFileType} onValueChange={setDigitalFileType}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="ebook"> E-book / Livro Digital (PDF/EPUB)</SelectItem>
 <SelectItem value="planilha"> Planilha & Dashboard (Excel/Sheets)</SelectItem>
 <SelectItem value="template"> Template & Arquivo de Design (PSD/FIG/CANVA)</SelectItem>
 <SelectItem value="preset"> Preset & Filtro (Lightroom/Photoshop)</SelectItem>
 <SelectItem value="curso"> Curso / Videoaulas / Treinamento</SelectItem>
 <SelectItem value="ingresso">️ Ingresso / Voucher Digital / Ingresso VIP</SelectItem>
 <SelectItem value="software"> Script / Código / Software / Automação</SelectItem>
 <SelectItem value="audio"> Áudio / Música / Podcast / Efeito Sonoro</SelectItem>
 <SelectItem value="outro"> Outro Conteúdo Digital</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Limite de Downloads por Comprador</Label>
 <Select value={digitalDownloadLimit} onValueChange={setDigitalDownloadLimit}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
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
 <div className="space-y-2 pt-1">
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

 <div className="space-y-2 pt-1">
 <Label className="text-xs text-foreground font-medium">
 Link de Amostra / Prévia Online (Opcional)
 </Label>
 <Input
 value={digitalPreviewUrl}
 onChange={(e) => setDigitalPreviewUrl(e.target.value)}
 placeholder="https://drive.google.com/..., https://notion.so/..., https://youtube.com/..."
 className="h-11 rounded-lg text-xs bg-background font-mono"
 />
 <p className="text-xs text-muted-foreground">
 Se você possui uma degustação, trailer ou página demonstrativa, cole o link aqui.
 </p>
 </div>
 </div>
 )}
 </div>

          {/* Section 3 (Logística de Envio para Bens Físicos) */}
 {niche.id === "desapego" && (
 <div className="space-y-4">
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <Truck className="size-4 text-primary" />
 <span>Logística</span>
 </div>
 <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
 Waesy Express
 </Badge>
 </div>

 <div className="space-y-2">
 <Label className="text-xs text-foreground font-medium">Modalidade de Envio / Retirada</Label>
 <Select value={deliveryMode} onValueChange={(v: any) => setDeliveryMode(v)}>
 <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="both"> Entrega Expressa Waesy & Retirada em Mãos (Recomendado)</SelectItem>
 <SelectItem value="pickup"> Somente Retirada no Local</SelectItem>
 <SelectItem value="local_delivery"> Somente Entrega Local (Motoboy / Frota)</SelectItem>
 <SelectItem value="shipping"> Envio Nacional (Correios / Transportadora)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="flex items-center gap-2 pt-1">
 <Checkbox
 id="free-shipping"
 checked={freeShippingLocal}
 onCheckedChange={(c) => setFreeShippingLocal(!!c)}
 />
 <Label htmlFor="free-shipping" className="text-xs text-foreground font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
 Oferecer frete grátis para entrega local na minha cidade
 </Label>
 </div>
 </div>
 </div>
 )}

 {/* Assinaturas & Mensalidades (Planos Recorrentes) */}
              {niche.id === "assinatura" && (
            <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
                      <RefreshCw className="size-4 text-primary" />
                      <span>Configuração do Plano Recorrente</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-bold text-primary border-primary/30">
                      Mensalidade
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-medium">Ciclo de Cobrança *</Label>
                      <Select value={billingCycle} onValueChange={(v: any) => setBillingCycle(v)}>
                        <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
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

                    <div className="space-y-2">
                      <Label className="text-xs text-foreground font-medium">Taxa de Matrícula / Adesão (R$)</Label>
                      <CurrencyField
                        value={setupFeeCents}
                        onChange={setSetupFeeCents}
                        placeholder="0,00"
                        className="h-11 rounded-lg text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-foreground font-medium">Período de Teste Grátis (Trial)</Label>
                    <Select value={String(trialDays)} onValueChange={(v) => setTrialDays(Number(v))}>
                      <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
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
                        className="h-11 rounded-lg text-xs bg-background"
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
                        className="rounded-lg text-xs h-11 min-h-11 px-3"
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

                    <div className="flex flex-wrap gap-2 pt-1">
                      {recurringFeatures.map((feat, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs px-3 py-1 rounded-lg gap-2 bg-primary/10 text-primary border border-primary/20"
                        >
                          <span> {feat}</span>
                          <button
                            type="button"
                            onClick={() => setRecurringFeatures(recurringFeatures.filter((_, i) => i !== idx))}
                            className="size-11 min-h-11 min-w-11 hover:text-destructive text-primary/70 ml-1 inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                <div className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60">
                  <div className="flex items-center justify-between pb-3 border-b border-border/40">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                      <Award className="size-4 text-primary shrink-0" />
                      <span>Destaques</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-bold">
                      Livre / Opcional
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Adicione os pontos fortes e diferenciais deste item para atrair mais interessados.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddTravelBullet}
                        className="h-11 min-h-11 text-xs font-semibold rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Plus className="size-4" />
                        <span>Adicionar</span>
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {travelBioBullets.map((bullet, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground w-4 text-center shrink-0">
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
                            className="h-11 min-h-11 rounded-lg text-xs bg-background flex-1"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            {travelBioBullets.length > 1 && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveTravelBullet(idx, "up")}
                                  className="h-11 min-h-11 w-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                                  className="h-11 min-h-11 w-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
                              className="h-11 min-h-11 w-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              title={travelBioBullets.length === 1 ? "Limpar campo" : "Remover diferencial"}
                              aria-label="Remover diferencial"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Otimização Universal de SEO, GEO e Indexação Agêntica */}
              <SeoGeoOptimizationPanel
                value={seoGeo}
                onChange={(upd) => {
                  setSeoGeo(upd);
                  if (upd.keywords && upd.keywords.length > 0) {
                    setEditorialTags(upd.keywords);
                  }
                }}
                referenceTitle={title}
                referenceDescription={description}
                referenceAddress={locationName}
              />

              {/* Formas de Pagamento */}
              {isPaymentAllowed && niche.id !== "evento" && (
                <ClassifiedPaymentMethodsSection
                  priceCents={priceCents}
                  acceptsPix={acceptsPix}
                  onAcceptsPixChange={setAcceptsPix}
                  pixDiscountPercent={pixDiscountPercent}
                  onPixDiscountPercentChange={setPixDiscountPercent}
                  acceptsCard={acceptsCard}
                  onAcceptsCardChange={setAcceptsCard}
                  maxInstallments={maxInstallments}
                  onMaxInstallmentsChange={setMaxInstallments}
                  cardInterestFree={cardInterestFree}
                  onCardInterestFreeChange={setCardInterestFree}
                  paymentLink={paymentLink}
                  onPaymentLinkChange={setPaymentLink}
                  acceptsCash={acceptsCash}
                  onAcceptsCashChange={setAcceptsCash}
                  acceptsBoleto={acceptsBoleto}
                  onAcceptsBoletoChange={setAcceptsBoleto}
                  boletoDueDays={boletoDueDays}
                  onBoletoDueDaysChange={setBoletoDueDays}
                  acceptsBoletoInstallments={acceptsBoletoInstallments}
                  onAcceptsBoletoInstallmentsChange={setAcceptsBoletoInstallments}
                  maxBoletoInstallments={maxBoletoInstallments}
                  onMaxBoletoInstallmentsChange={setMaxBoletoInstallments}
                  boletoMinDownPaymentCents={boletoMinDownPaymentCents}
                  onBoletoMinDownPaymentCentsChange={setBoletoMinDownPaymentCents}
                  boletoNotes={boletoNotes}
                  onBoletoNotesChange={setBoletoNotes}
                  acceptsCarne={acceptsCarne}
                  onAcceptsCarneChange={setAcceptsCarne}
                  maxCarneInstallments={maxCarneInstallments}
                  onMaxCarneInstallmentsChange={setMaxCarneInstallments}
                  carneGraceDays={carneGraceDays}
                  onCarneGraceDaysChange={setCarneGraceDays}
                  carneMinDownPaymentCents={carneMinDownPaymentCents}
                  onCarneMinDownPaymentCentsChange={setCarneMinDownPaymentCents}
                  acceptsTrade={acceptsTrade}
                  onAcceptsTradeChange={setAcceptsTrade}
                  tradeNotes={tradeNotes}
                  onTradeNotesChange={setTradeNotes}
                  acceptsFinancing={acceptsFinancing}
                  onAcceptsFinancingChange={setAcceptsFinancing}
                  financingNotes={financingNotes}
                  onFinancingNotesChange={setFinancingNotes}
                  cancellationPolicy={cancellationPolicy}
                  onCancellationPolicyChange={setCancellationPolicy}
                />
              )}

              {/* Seção: Localização */}
              <ClassifiedLocationSection
                locationName={locationName}
                hideLocation={hideLocation}
                onLocationChange={(formatted, struct) => {
                  setLocationName(formatted);
                  if (struct) setStructuredLoc(struct);
                }}
                onHideLocationChange={setHideLocation}
                whatsapp={whatsapp}
                onWhatsappChange={setWhatsapp}
              />

              {/* ── Formulário de Captura de Leads / Landing Page Vinculada (Restrito a Lojas Oficiais) ── */}
              {selectedStoreId ? (
                <div className="rounded-lg border border-border/60 bg-card p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                      <FileText className="size-4 text-primary shrink-0" />
                      <span>Captura de Leads (Loja Oficial)</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
                      CRM Workspace
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Vincule um formulário personalizado para captar contatos qualificados diretamente no seu CRM do Workspace com Registro Rápido e redirecionamento WhatsApp.
                  </p>

                  {storeForms.length > 0 ? (
                    <div className="space-y-2">
                      <Select
                        value={selectedFormId || "none"}
                        onValueChange={(val) => setSelectedFormId(val === "none" ? null : val)}
                      >
                        <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                          <SelectValue placeholder="Selecione um formulário de captura..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum (anúncio sem formulário direto)</SelectItem>
                          {storeForms.map((f: any) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.title} ({f.slug}) • {f.submissions_count || 0} leads
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center justify-between pt-1">
                        {selectedFormId && (
                          <Link
                            to="/f/$slug"
                            params={{ slug: storeForms.find((f: any) => f.id === selectedFormId)?.slug || selectedFormId }}
                            search={{ leadId: undefined, nome: undefined, tel: undefined, email: undefined }}
                            target="_blank"
                            className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                          >
                            <Eye className="size-3" />
                            <span>Ver landing page do formulário</span>
                          </Link>
                        )}
                        <Link
                          to="/workspace/marketing/formularios"
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-auto"
                        >
                          <Plus className="size-3" />
                          <span>Gerenciar Formulários no Workspace</span>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={selectedFormId || ""}
                        onChange={(e) => setSelectedFormId(e.target.value.trim() || null)}
                        placeholder="ID ou Slug do formulário (ex: cotacao-cancun ou UUID)"
                        className="w-full h-11 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Cole o slug ou UUID do formulário</span>
                        <Link
                          to="/workspace/marketing/formularios"
                          className="text-primary hover:underline flex items-center gap-1 font-medium"
                        >
                          <Plus className="size-3" />
                          <span>Criar no Workspace</span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-border/60 bg-card p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                        <FileText className="size-4 text-primary shrink-0" />
                        <span>Qualificação de Leads & SDR IA</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Capte dados de interessados com perguntas estratégicas e ative o SDR IA antes do contato no WhatsApp.
                      </p>
                    </div>
                    <Switch
                      checked={civilInquiryEnabled}
                      onCheckedChange={setCivilInquiryEnabled}
                      aria-label="Ativar Qualificação de Leads"
                    />
                  </div>

                  {civilInquiryEnabled && (
                    <div className="space-y-4 pt-3 border-t border-border/40">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-foreground">Título do Formulário</Label>
                          <Input
                            value={civilInquiryTitle}
                            onChange={(e) => setCivilInquiryTitle(e.target.value)}
                            placeholder="Ex: Tenho Interesse neste Anúncio"
                            className="h-11 min-h-11 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-foreground">Subtítulo / Orientação</Label>
                          <Input
                            value={civilInquirySubtitle}
                            onChange={(e) => setCivilInquirySubtitle(e.target.value)}
                            placeholder="Ex: Responda perguntas rápidas para receber proposta."
                            className="h-11 min-h-11 text-xs"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-muted/20 border border-border/60 rounded-lg flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                            <Bot className="size-4 text-primary" />
                            <span>Ativar Bot SDR IA Após o Envio</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Exibe botão para abrir chat imediato com a IA alimentada pelas respostas do lead.
                          </p>
                        </div>
                        <Switch
                          checked={civilInquiryActivateSdr}
                          onCheckedChange={setCivilInquiryActivateSdr}
                          aria-label="Ativar SDR IA no Formulário"
                        />
                      </div>

                      {/* Lista de Perguntas */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground">Perguntas de Qualificação ({civilInquiryQuestions.length})</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCivilInquiryTitle(defaultNicheInquiry.title);
                              setCivilInquirySubtitle(defaultNicheInquiry.subtitle);
                              setCivilInquiryQuestions(defaultNicheInquiry.questions);
                              toast.success(`Formulário restaurado para o padrão do nicho "${niche.title}"`);
                            }}
                            className="h-11 min-h-11 px-3 text-xs text-primary hover:bg-primary/10 gap-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <RefreshCw className="size-4" />
                            <span>Padrão do Nicho</span>
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {civilInquiryQuestions.map((q, idx) => (
                            <div key={q.id || idx} className="p-3 rounded-lg border border-border/60 bg-background space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-mono text-muted-foreground">{idx + 1}.</span>
                                <Input
                                  value={q.label}
                                  onChange={(e) => {
                                    const next = [...civilInquiryQuestions];
                                    next[idx].label = e.target.value;
                                    setCivilInquiryQuestions(next);
                                  }}
                                  placeholder="Texto da pergunta..."
                                  className="h-11 min-h-11 text-xs flex-1"
                                />
                                <Badge variant="outline" className="text-xs uppercase font-mono">
                                  {q.type}
                                </Badge>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCivilInquiryQuestions(civilInquiryQuestions.filter((_, i) => i !== idx))}
                                  className="h-11 min-h-11 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>

                              {q.type === "select" && (
                                <div className="space-y-1 pl-4 border-l-2 border-border/40">
                                  <span className="text-xs text-muted-foreground">Opções de resposta:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {(q.options || []).map((opt, optIdx) => (
                                      <Badge key={optIdx} variant="secondary" className="text-xs py-1 px-2 gap-1 font-normal">
                                        <span>{opt}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next = [...civilInquiryQuestions];
                                            next[idx].options = (next[idx].options || []).filter((_, oi) => oi !== optIdx);
                                            setCivilInquiryQuestions(next);
                                          }}
                                          className="size-11 min-h-11 min-w-11 text-muted-foreground hover:text-foreground ml-1 inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                        >
                                          ×
                                        </button>
                                      </Badge>
                                    ))}
                                    <input
                                      type="text"
                                      placeholder="+ nova opção (Enter)"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                                          e.preventDefault();
                                          const next = [...civilInquiryQuestions];
                                          next[idx].options = [...(next[idx].options || []), (e.target as HTMLInputElement).value.trim()];
                                          setCivilInquiryQuestions(next);
                                          (e.target as HTMLInputElement).value = "";
                                        }
                                      }}
                                      className="h-11 min-h-11 px-3 text-xs rounded border border-border/60 bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Adicionar nova pergunta */}
                        <div className="flex gap-2 pt-1">
                          <Input
                            value={newQuestionLabel}
                            onChange={(e) => setNewQuestionLabel(e.target.value)}
                            placeholder="Nova pergunta (ex: Qual sua proposta para pagamento?)"
                            className="h-11 min-h-11 text-xs flex-1"
                          />
                          <Select value={newQuestionType} onValueChange={(v: any) => setNewQuestionType(v)}>
                            <SelectTrigger className="w-28 h-11 min-h-11 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto curto</SelectItem>
                              <SelectItem value="textarea">Texto longo</SelectItem>
                              <SelectItem value="select">Múltipla escolha</SelectItem>
                              <SelectItem value="currency">Valor / Moeda</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (!newQuestionLabel.trim()) return;
                              setCivilInquiryQuestions([
                                ...civilInquiryQuestions,
                                {
                                  id: `q_${Date.now()}`,
                                  label: newQuestionLabel.trim(),
                                  type: newQuestionType as any,
                                  options: newQuestionType === "select" ? ["Opção 1", "Opção 2"] : undefined,
                                  required: false,
                                },
                              ]);
                              setNewQuestionLabel("");
                            }}
                            className="h-11 min-h-11 text-xs font-semibold gap-1 px-3"
                          >
                            <Plus className="size-4" />
                            <span>Adicionar</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Seção 6: Agente Vendedor (SDR) — Configuração ── */}
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/[0.03] p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-blue-500/15">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
                    <Bot className="size-4 text-blue-500 shrink-0" />
                    <span>Assistente de Vendas (SDR)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {/* info modal via toast */ toast.info("O Agente SDR é um assistente IA que atende compradores em tempo real, responde dúvidas sobre o produto e ajuda a negociar dentro dos limites que você definir.", { duration: 8000 })}}
                      className="size-11 min-h-11 min-w-11 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Saiba mais sobre o Agente SDR"
                    >
                      <Info className="size-4" />
                    </button>
                    <Switch
                      id="ai-agent-enabled"
                      checked={aiAgentEnabled}
                      onCheckedChange={setAiAgentEnabled}
                    />
                  </div>
                </div>

                {!aiAgentEnabled && (
                  <p className="text-xs text-muted-foreground">
                    Ative o Agente SDR para que compradores possam tirar dúvidas com uma IA em tempo real.
                  </p>
                )}

                {aiAgentEnabled && (
                  <div className="space-y-4">
                    {/* Instruções para a IA (confidencial) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-foreground">
                          Instruções para o Agente (confidencial)
                        </Label>
                        <span className="text-xs font-mono text-muted-foreground tabular-nums">
                          {aiInstructions.length}/1000
                        </span>
                      </div>
                      <textarea
                        value={aiInstructions}
                        onChange={(e) => setAiInstructions(e.target.value.slice(0, 1000))}
                        placeholder="Ex: O produto é novo na caixa. Prioridade para quem pagar à vista. Não revelar que há estoque de outros."
                        className="w-full min-h-20 resize-none rounded-lg border border-border/60 bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                        maxLength={1000}
                        aria-label="Instruções para o agente SDR"
                      />
                      <p className="text-xs text-muted-foreground/75 text-muted-foreground">
                        Estas instruções são confidenciais — o agente nunca as revelará ao comprador.
                      </p>
                    </div>

                    {/* Desconto Máximo (Isolado por Nicho) */}
                    {niche.id === "evento" ? (
                      <div className="space-y-2 p-4 bg-background rounded-lg border border-border/60">
                        <div className="flex items-center gap-2">
                          <BadgePercent className="size-4 text-primary" />
                          <Label className="text-xs font-medium text-foreground">
                            Desconto Automático Desativado
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Preços e lotes de ingressos são definidos individualmente na seção de Ingressos e Lotes. Descontos automáticos via SDR são desativados para preservar as regras de lote do evento.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 p-4 bg-background rounded-lg border border-border/60">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-foreground flex items-center gap-2">
                            <BadgePercent className="size-4 text-primary" />
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
                          className="w-full h-2 rounded-full accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label="Desconto máximo para o agente SDR"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground font-mono">
                          <span>0%</span>
                          <span>10%</span>
                          <span>20%</span>
                          <span>30%</span>
                        </div>
                        {maxDiscountPct === 0 ? (
                          <p className="text-xs text-muted-foreground/75 text-muted-foreground">
                            O agente não poderá negociar desconto algum — defenderá o preço cheio.
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/75 text-warning-strong ">
                            O agente pode conceder até {maxDiscountPct}% de desconto como último recurso. Ele negociará profissionalmente antes de ceder.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Seletor de Design Visual & Modo de Exibição */}
              <div className="bg-card rounded-lg p-4 border border-border/60 space-y-3">
                <button
                  type="button"
                  onClick={() => setIsTemplateStyleOpen(!isTemplateStyleOpen)}
                  className="w-full flex items-center justify-between text-xs font-semibold text-foreground hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-2">
                    <Palette className="size-4 text-primary shrink-0" />
                    <span>Design & Modelo da Página</span>
                    <Badge variant="outline" className="text-xs font-normal uppercase tracking-wider">
                      {templateStyle}
                    </Badge>
                  </div>
                  {isTemplateStyleOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
                {isTemplateStyleOpen && (
                  <div className="mt-3 pt-3 border-t border-border/40 space-y-4">
                    {/* Modo de Exibição: Abas vs Lista Contínua */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground">Estrutura de Leitura</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDisplayMode("tabs")}
                          className={cn(
                            "p-3 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-xs",
                            displayMode === "tabs"
                              ? "border-primary bg-primary/5 ring-1 ring-primary font-bold text-foreground"
                              : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                          )}
                        >
                          <p className="font-semibold text-foreground">Abas de Navegação</p>
                          <p className="text-xs text-muted-foreground mt-1">Seções organizadas por abas</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDisplayMode("continuous_list")}
                          className={cn(
                            "p-3 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-xs",
                            displayMode === "continuous_list"
                              ? "border-primary bg-primary/5 ring-1 ring-primary font-bold text-foreground"
                              : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                          )}
                        >
                          <p className="font-semibold text-foreground">Rolagem Contínua</p>
                          <p className="text-xs text-muted-foreground mt-1">Fluxo vertical unificado</p>
                        </button>
                      </div>
                    </div>

                    {/* Os 6 Templates Canônicos */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground">Modelo Visual do Anúncio</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-1 sm:grid-cols-3 gap-2">
                        {allowedTemplatesForNiche.map((tpl) => (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => setTemplateStyle(tpl.id as any)}
                            className={cn(
                              "p-2 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                              templateStyle === tpl.id
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border/60 hover:bg-muted/40"
                            )}
                          >
                            <p className="text-xs font-bold text-foreground">{tpl.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              {/* Barra Inferior Confortável de Ações do Formulário */}
              <div className="pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenLivePreview}
                  className="w-full sm:w-auto rounded-lg h-11 min-h-11 px-5 text-xs font-bold gap-2 border-border/80 hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-foreground"
                >
                  <Eye className="size-4 text-primary shrink-0" />
                  <span>Visualizar Prévia Real</span>
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSaveDraft}
                    disabled={isSubmitting}
                    className="rounded-lg h-11 min-h-11 px-4 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    Salvar Rascunho
                  </Button>

                  <Button
                    type="button"
                    onClick={handlePublish}
                    disabled={isSubmitting || isUploadingMedia}
                    className="rounded-lg h-11 min-h-11 px-6 text-xs sm:text-sm font-bold bg-primary text-primary-foreground active:scale-98 transition-colors gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                        <span>{editId ? "Salvando..." : "Publicando..."}</span>
                      </>
                    ) : (
                      <>
                        <Check className="size-4 stroke-2" />
                        <span>{editId ? "Salvar Alterações" : "Publicar Anúncio"}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

        {/* Modal Canônico de Prévia Isolada (Mobile & Desktop) */}
        <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
          <DialogContent className="max-w-5xl w-full max-h-screen p-0 flex flex-col overflow-hidden bg-background border-border/80">
            <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border/60 bg-muted/30 flex flex-row items-center justify-between space-y-0 gap-3">
              <div className="flex items-center gap-2">
                <Eye className="size-4 text-primary" />
                <div>
                  <DialogTitle className="text-sm font-bold text-foreground">
                    Prévia do Anúncio
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Visualização em tempo real do anúncio em mobile e desktop
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2 mr-6 sm:mr-8">
                {/* Seletor de Modelo Visual (quando houver mais de 1) */}
                {allowedTemplatesForNiche.length > 1 && (
                  <div className="hidden sm:flex items-center gap-1 bg-background/80 p-1 rounded-lg border border-border/50">
                    {allowedTemplatesForNiche.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setTemplateStyle(tpl.id as any)}
                        className={cn(
                          "px-2 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          templateStyle === tpl.id
                            ? "bg-primary text-primary-foreground font-bold shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Seletor de Dispositivo (Mobile / Desktop) */}
                <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border/50">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      previewDevice === "mobile"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Mobile
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      previewDevice === "desktop"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Desktop
                  </button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      try {
                        sessionStorage.setItem("waesy_preview_payload", JSON.stringify(livePreviewClassified));
                        const previewUrl = editId ? `/classificados/${editId}?preview=true` : `/classificados/preview-live`;
                        window.open(previewUrl, "_blank");
                      } catch {
                        toast.info("Prévia interativa carregada na tela.");
                      }
                    }
                  }}
                  className="hidden md:flex items-center gap-2 h-11 min-h-11 text-xs font-semibold px-3 rounded-lg border-border/70 hover:bg-muted text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                  <span>Nova Aba</span>
                </Button>
              </div>
            </DialogHeader>

            {/* Área com rolagem independente do preview (Contenção CSS anti-leak) */}
            <div className="flex-1 overflow-y-auto bg-muted/20 p-2 sm:p-6 pb-20">
              <div
                data-preview-device={previewDevice}
                className={cn(
                  "transition-colors duration-200 mx-auto",
                  previewDevice === "mobile"
                    ? "w-full max-w-sm rounded-lg border border-border/80 bg-background relative overflow-hidden min-h-96"
                    : "w-full max-w-5xl rounded-lg border border-border/80 bg-background relative overflow-hidden"
                )}
              >
                {templateStyle === "conveniencia" ? (
                  <ConvenienceShowcaseView
                    classified={livePreviewClassified}
                    previewData={{
                      title: title || "Produto de Mercado / Conveniência",
                      description: description,
                      priceCents: priceCents || 0,
                      images: images,
                      locationName: locationName || "São Miguel do Oeste - SC",
                      whatsapp: whatsapp,
                      storeName: selectedStore?.name || "Sua Loja",
                      storeSlug: selectedStore?.slug,
                      storeLogo: selectedStore?.logo_url,
                      authorName: !selectedStore ? (userProfile?.full_name || "Você") : undefined,
                      authorAvatar: !selectedStore ? (userProfile?.avatar_url || undefined) : undefined,
                      authorId: !selectedStore ? userProfile?.id : undefined,
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
                        price_per_kg_cents: groceryPricePerKgCents || undefined,
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
                    isOwner={true}
                    previewDevice={previewDevice}
                    compact={previewDevice === "mobile"}
                    onEdit={() => {
                      setIsPreviewModalOpen(false);
                      setCurrentStep(2);
                    }}
                  />
                ) : niche.id === "viagem" && (templateStyle === "editorial" || (templateStyle as string) === "instagram" || (templateStyle as string) === "instagram_resort" || !templateStyle) ? (
                  <EditorialShowcaseView
                    classified={livePreviewClassified}
                    isOwner={false}
                    previewViewport={previewDevice}
                  />
                ) : (
                  <UniversalClassifiedShowcase
                    classified={livePreviewClassified}
                    previewViewport={previewDevice}
                    isOwner={true}
                    canManage={true}
                    onOpenBookingModal={undefined}
                    onOpenProposalModal={undefined}
                    onEdit={() => {
                      setIsPreviewModalOpen(false);
                      setCurrentStep(2);
                    }}
                  />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      {/* Superfície Editorial Bidirecional do Copilot de Conteúdo */}
      <AiWritingCopilotSheet
        open={copilotModalOpen}
        onOpenChange={setCopilotModalOpen}
        initialScope={copilotInitialScope}
        entityId={editId}
        storeId={selectedStoreId && selectedStoreId !== "civil" ? selectedStoreId : undefined}
        niche={niche.id}
        categoryName={niche.title}
        title={title}
        description={description}
        summary={editorialSummary}
        tags={editorialTags}
        price={priceCents ? formatMoney(priceCents) : undefined}
        city={structuredLoc?.city}
        neighborhood={structuredLoc?.neighborhood}
        attributes={buildCurrentNicheContext()}
        onApplyDraft={handleApplyCopilotDraft}
      />
      {/* Estúdio Excelência Tour (Story 9:16 + Liquid Glass + WhatsApp Intake) */}
      {niche.id === "viagem" && (
        <TravelPromoFlyerModal
          open={travelStudioOpen}
          onOpenChange={setTravelStudioOpen}
          niche={niche.id}
          destinationTitle={title}
          destinationCity={travelDestinationCity}
          datesText={travelDates}
          inclusions={travelBioBullets.filter((b) => b && b.trim())}
          priceCents={priceCents ?? null}
          installments={maxInstallments}
          backgroundImageUrl={images[0] || null}
          storeName={selectedStoreId ? userStores.find((s) => s.id === selectedStoreId)?.name : undefined}
          onAttachToClassified={(imageUrl) => {
            setImages((prev) => [imageUrl, ...prev]);
            toast.success("Story 9:16 exportado e adicionado à galeria de fotos!");
          }}
          onApplyExtractedOffer={handleApplyExtractedTravelOffer}
        />
      )}
 </div>
 );
}
