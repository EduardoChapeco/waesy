import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Building2,
  Phone,
  MapPin,
  Zap,
  ArrowRight,
  ShieldCheck,
  Store,
  CheckCircle2,
  Globe,
  Instagram,
  Plane,
  Utensils,
  Wrench,
  Package,
  Hotel,
  ShoppingBag,
  HeartPulse,
  Car,
  Loader2,
  Search,
  Ticket,
  ChevronDown,
  ChevronUp,
  Scissors,
  Calculator,
  Scale,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { BrandedAppTemplateId } from "@/types/branded-app";
import { fastRegisterCompany } from "@/services/company-mvp.functions";
import { setTenantContext } from "@/services/identity.functions";
import { setClientContextCookies } from "@/lib/context-auth";
import { ImageUpload } from "@/components/ui/image-upload";
import { CityCombobox } from "@/components/ui/city-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatBrazilianCityName, findCityByLabel } from "@/lib/constants/cities";
import { generateSlug } from "@/lib/slug-utils";
import { getUnifiedNicheSpec } from "@/lib/niches/niche-ssot";
import { useMasterLocation, getStoredLocation } from "@/components/location/location-master-pill";
import {
  startMagicOnboardingJob,
  runMagicOnboardingJob,
  getOnboardingJobStatus,
  type MagicOnboardingResult,
  type OnboardingLiveLog,
  type OnboardingEvidenceScreenshot,
  type OnboardingLiveState,
} from "@/services/magic-onboarding.functions";
import { AiLiveExtractionDisplay } from "@/components/onboarding/ai-live-extraction-display";
import { lookupCep, lookupCnpj, reverseGeocode } from "@/services/public-apis.functions";
import { formatCep, formatCnpj, formatPhone, cleanDocument } from "@/lib/document-validator";
import { getCanonicalMapStyle, setupMapResizeObserver } from "@/lib/map-styles";
import type { Map, Marker } from "maplibre-gl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const QUICK_CATEGORIES = [
  {
    id: "events",
    label: "Eventos, Shows e Ingressos",
    niche: "events",
    icon: Ticket,
    description: "Festas, baladas, congressos, feiras e bilheteria de ingressos",
  },
  {
    id: "turismo",
    label: "Viagens e Turismo",
    niche: "tourism",
    icon: Plane,
    description: "Agências, passeios, excursões, roteiros e experiências locais",
  },
  {
    id: "gastronomia",
    label: "Restaurantes e Gastronomia",
    niche: "gastronomy",
    icon: Utensils,
    description: "Bares, hamburguerias, restaurantes, pizzarias e delivery",
  },
  {
    id: "servicos",
    label: "Prestação de Serviços",
    niche: "services",
    icon: Wrench,
    description: "Advocacia, consultorias, reformas, oficinas, estética e suporte",
  },
  {
    id: "hospedagem",
    label: "Pousadas e Hospedagem",
    niche: "tourism",
    icon: Hotel,
    description: "Pousadas, chalés, hotéis e aluguel de imóveis por temporada",
  },
  {
    id: "equipamentos",
    label: "Aluguel de Equipamentos e Eventos",
    niche: "rental_events",
    icon: Package,
    description: "Locação de som, iluminação, palcos, geradores e tendas",
  },
  {
    id: "comercio",
    label: "Comércio e Varejo",
    niche: "retail",
    icon: ShoppingBag,
    description: "Lojas de roupas, calçados, eletrônicos e utilidades",
  },
  {
    id: "salao",
    label: "Salão e Estética",
    niche: "beauty_salon",
    icon: Scissors,
    description: "Agenda de cadeiras, comandas, comissões e pacotes de beleza",
  },
  {
    id: "barbearia",
    label: "Barbearia & Grooming",
    niche: "barbershop",
    icon: Scissors,
    description: "Agendamento por barbeiro, assinaturas de clube e comissões",
  },
  {
    id: "clinica",
    label: "Clínicas, Saúde & Bem-Estar",
    niche: "healthcare",
    icon: HeartPulse,
    description: "Consultórios médicos, odontologia, psicologia, fisioterapia e vet",
  },
  {
    id: "oficina",
    label: "Oficina, Estética Auto & Veículos",
    niche: "automotive",
    icon: Car,
    description: "Ordens de serviço (OS), check-in por placa, peças e revenda",
  },
  {
    id: "contabilidade",
    label: "Contabilidade & Consultoria",
    niche: "accounting",
    icon: Calculator,
    description: "Guias fiscais, OS de rotinas, honorários e certificados",
  },
  {
    id: "advocacia",
    label: "Advocacia & Escritório Jurídico",
    niche: "law_firm",
    icon: Scale,
    description: "Prazos, audiências, contratos digitais e cobrança de honorários",
  },
  {
    id: "outros",
    label: "Outros Negócios Locais",
    niche: "retail",
    icon: Building2,
    description: "Demais ramos comerciais e prestadores autônomos",
  },
];

export interface FastCompanyOnboardingProps {
  userId?: string;
  initialVertical?: string;
  initialSegment?: string;
  initialSku?: string;
  onSuccess?: (storeId: string) => void;
}

function resolveCategoryFromCnae(cnaeCode?: string, cnaeDesc?: string): string | null {
  const code = (cnaeCode || "").replace(/\D/g, "");
  const desc = (cnaeDesc || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (code.startsWith("79") || desc.includes("turismo") || desc.includes("agencia de viag") || desc.includes("operador turistic")) {
    return "turismo";
  }
  if (code.startsWith("55") || desc.includes("hotel") || desc.includes("pousada") || desc.includes("alojamento")) {
    return "hospedagem";
  }
  if (code.startsWith("56") || desc.includes("restaurante") || desc.includes("lanchonete") || desc.includes("aliment") || desc.includes("pizzaria") || desc.includes("hamburgueria")) {
    return "gastronomia";
  }
  if (code.startsWith("90") || code.startsWith("93") || code.startsWith("8230") || desc.includes("evento") || desc.includes("espetaculo") || desc.includes("bilheteria") || desc.includes("ingresso")) {
    return "events";
  }
  if (code.startsWith("7739") || code.startsWith("7729") || (desc.includes("aluguel") && desc.includes("equipamento"))) {
    return "equipamentos";
  }
  if (code.startsWith("9602") || desc.includes("cabeleireiro") || desc.includes("estetica") || desc.includes("beleza")) {
    return desc.includes("barbearia") ? "barbearia" : "salao";
  }
  if (code.startsWith("86") || code.startsWith("75") || desc.includes("medic") || desc.includes("odontolog") || desc.includes("clinica") || desc.includes("psicolog") || desc.includes("veterinar")) {
    return "clinica";
  }
  if (code.startsWith("45") || desc.includes("oficina") || desc.includes("veiculo") || desc.includes("automov") || desc.includes("autopeca")) {
    return "oficina";
  }
  if (code.startsWith("6920") || desc.includes("contabil")) {
    return "contabilidade";
  }
  if (code.startsWith("6911") || desc.includes("advocac") || desc.includes("juridic")) {
    return "advocacia";
  }
  if (code.startsWith("47") || desc.includes("comercio varejista") || desc.includes("loja")) {
    return "comercio";
  }
  if (code.startsWith("62") || code.startsWith("63") || code.startsWith("70") || code.startsWith("71") || code.startsWith("73") || code.startsWith("74") || code.startsWith("85")) {
    return "servicos";
  }
  return null;
}

function resolveInitialQuickCategory(vertical?: string, segment?: string): string {
  const byVertical: Record<string, string> = {
    turis: "turismo",
    tableway: "gastronomia",
    wowbook: "salao",
    passhub: "events",
    lexcloud: "advocacia",
    autocenter: "oficina",
    varejo: "comercio",
    talentlink: "servicos",
    signflow: "servicos",
    omnipage: "servicos",
    talk: "servicos",
    imobiliaria: "servicos",
  };
  if (vertical && byVertical[vertical.toLowerCase()]) {
    return byVertical[vertical.toLowerCase()];
  }
  if (segment) {
    const match = QUICK_CATEGORIES.find((c) => c.niche === segment || c.id === segment);
    if (match) return match.id;
  }
  return "events";
}

export function FastCompanyOnboarding({
  userId,
  initialVertical,
  initialSegment,
  initialSku,
  onSuccess,
}: FastCompanyOnboardingProps = {}) {
  const navigate = useNavigate();

  const { location: masterLoc } = useMasterLocation();
  const detectedCity = masterLoc?.city && masterLoc.city.toLowerCase() !== "global" ? masterLoc.city : "";
  const detectedState = masterLoc?.state || "SC";

  // 1. Identificação Básica
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [detectedCnae, setDetectedCnae] = useState<{ code: string; description: string } | null>(null);

  // 2. Segmento & Nicho
  const [category, setCategory] = useState(() =>
    resolveInitialQuickCategory(initialVertical, initialSegment),
  );

  // 3. Localização Estruturada Completa (100% Conectada)
  const [cep, setCep] = useState("");
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState(detectedCity);
  const [state, setState] = useState(detectedState);
  const [latitude, setLatitude] = useState<number | undefined>(masterLoc.lat || undefined);
  const [longitude, setLongitude] = useState<number | undefined>(masterLoc.lng || undefined);

  // 4. Canais de Atendimento & Bio
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");

  // 5. Identidade Visual
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  // 6. App Oficial Padronizado & Marketplace
  const resolveDefaultTemplate = (catId: string): BrandedAppTemplateId => {
    if (catId === "turismo" || catId === "hoteis" || catId === "hospedagem") return "tourism_cvc";
    if (catId === "gastronomia" || catId === "delivery" || catId === "mercado") return "delivery_ifood";
    if (catId === "events") return "events_sympla";
    if (
      catId === "salao" ||
      catId === "barbearia" ||
      catId === "clinica" ||
      catId === "servicos" ||
      catId === "oficina" ||
      catId === "contabilidade" ||
      catId === "advocacia"
    ) {
      return "services_agenda";
    }
    if (catId === "comercio") return "ecommerce_retail";
    return "standard_catalog";
  };
  const [activateBrandedApp, setActivateBrandedApp] = useState(true);
  const isStandaloneVertical = Boolean(
    initialVertical && initialVertical.toLowerCase() !== "waesy" && initialVertical.toLowerCase() !== "waesy_studio"
  );
  const [waesyMarketplaceEnabled, setWaesyMarketplaceEnabled] = useState(!isStandaloneVertical);
  const [appTemplateId, setAppTemplateId] = useState<BrandedAppTemplateId>(() =>
    resolveDefaultTemplate(resolveInitialQuickCategory(initialVertical, initialSegment)),
  );
  const [enableApiQuoter, setEnableApiQuoter] = useState(true);
  const [enableCorporateTravel, setEnableCorporateTravel] = useState(true);
  const [corporateAppUrl, setCorporateAppUrl] = useState("");

  useEffect(() => {
    setAppTemplateId(resolveDefaultTemplate(category));
  }, [category]);

  // Estados de Controle & IA
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiUrlInput, setAiUrlInput] = useState("");
  const [isExtractingAi, setIsExtractingAi] = useState(false);
  const [aiResult, setAiResult] = useState<MagicOnboardingResult | null>(null);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [showAiDisplay, setShowAiDisplay] = useState(false);
  const [aiLiveLogs, setAiLiveLogs] = useState<OnboardingLiveLog[]>([]);
  const [aiLiveScreenshots, setAiLiveScreenshots] = useState<OnboardingEvidenceScreenshot[]>([]);
  const [aiLiveProgress, setAiLiveProgress] = useState(0);
  const [aiActiveSquad, setAiActiveSquad] = useState("crawl");
  const [aiCompletedSquads, setAiCompletedSquads] = useState<string[]>([]);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);
  const [aiLiveViewerUrl, setAiLiveViewerUrl] = useState<string | null>(null);
  const [aiCurrentBrowsingUrl, setAiCurrentBrowsingUrl] = useState<string | null>(null);
  const [aiApplied, setAiApplied] = useState(false);

  // Referências para o Mini Mapa MapLibre OSM
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const markerInstance = useRef<Marker | null>(null);

  // Inicializa o Mini Mapa
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;
    let isMounted = true;
    let cleanupResize: (() => void) | undefined;

    import("maplibre-gl").then((maplibreglModule: any) => {
      if (!isMounted || !mapContainer.current || mapInstance.current) return;
      import("maplibre-gl/dist/maplibre-gl.css" as any).catch(() => {});
      const maplibregl: any = maplibreglModule.default || maplibreglModule;

      const stored = typeof window !== "undefined" ? getStoredLocation() : null;
      const initialLat = latitude || stored?.lat || -27.1004;
      const initialLng = longitude || stored?.lng || -52.6152;

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: getCanonicalMapStyle(undefined, "osm_standard"),
        center: [initialLng, initialLat],
        zoom: latitude ? 15 : 12,
        attributionControl: false,
      });
      mapInstance.current = map;

      cleanupResize = setupMapResizeObserver(map, mapContainer.current);
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      const markerEl = document.createElement("div");
      markerEl.className = "cursor-grab active:cursor-grabbing";
      markerEl.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="size-8 rounded-full bg-primary/20 animate-ping motion-reduce:animate-none absolute inset-0"></div>
          <div class="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center  border-2 border-background">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: markerEl, draggable: true })
        .setLngLat([initialLng, initialLat])
        .addTo(map);
      markerInstance.current = marker;

      marker.on("dragend", async () => {
        const lngLat = marker.getLngLat();
        if (lngLat) {
          const lat = Number(lngLat.lat.toFixed(6));
          const lng = Number(lngLat.lng.toFixed(6));
          setLatitude(lat);
          setLongitude(lng);

          try {
            const rev = await reverseGeocode({ data: { lat, lng } });
            if (rev.street) setStreet(rev.street);
            if (rev.neighborhood) setNeighborhood(rev.neighborhood);
            if (rev.city) setCity(rev.city);
            if (rev.state) setState(rev.state);
            if (rev.zipCode) setCep(formatCep(rev.zipCode));
            toast.success("Ponto no mapa ajustado!");
          } catch {
            // Silencioso se reverse falhar
          }
        }
      });
    });

    return () => {
      isMounted = false;
      cleanupResize?.();
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  const updateMapCenter = (lat: number, lng: number) => {
    if (mapInstance.current && markerInstance.current) {
      mapInstance.current.flyTo({ center: [lng, lat], zoom: 16, essential: true });
      markerInstance.current.setLngLat([lng, lat]);
    }
  };

  // Busca Automática de CEP
  const handleLookupCep = async (inputCep?: string) => {
    const raw = (inputCep || cep).replace(/\D/g, "");
    if (raw.length !== 8) {
      toast.error("Informe um CEP válido de 8 dígitos.");
      return;
    }

    setIsSearchingCep(true);
    try {
      const res = await lookupCep({ data: { cep: raw } });
      if (res.street) setStreet(res.street);
      if (res.neighborhood) setNeighborhood(res.neighborhood);
      if (res.city) setCity(res.city);
      if (res.state) setState(res.state);
      setCep(formatCep(raw));

      if (res.latitude && res.longitude) {
        setLatitude(Number(res.latitude));
        setLongitude(Number(res.longitude));
        updateMapCenter(Number(res.latitude), Number(res.longitude));
      }

      toast.success("Endereço localizado via CEP com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Não foi possível localizar o CEP.");
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Busca e Auto-enriquecimento de CNPJ
  const handleLookupCnpj = async () => {
    const clean = cleanDocument(cnpj);
    if (clean.length !== 14) {
      toast.error("Informe um CNPJ de 14 dígitos.");
      return;
    }

    setIsSearchingCnpj(true);
    try {
      const res = await lookupCnpj({ data: { cnpj: clean } });
      if (res.tradeName || res.corporateName) {
        setName(res.tradeName || res.corporateName);
      }
      if (res.phone) {
        setPhone(formatPhone(res.phone));
      }
      if (res.email) {
        setEmail(res.email);
      }
      if (res.address?.street) setStreet(res.address.street);
      if (res.address?.number) setNumber(res.address.number);
      if (res.address?.complement) setComplement(res.address.complement);
      if (res.address?.neighborhood) setNeighborhood(formatBrazilianCityName(res.address.neighborhood));

      const resolvedCityName = res.address?.city ? formatBrazilianCityName(String(res.address.city)) : "";
      const resolvedState = res.address?.state ? String(res.address.state).toUpperCase() : "";
      if (resolvedCityName) setCity(resolvedCityName);
      if (resolvedState) setState(resolvedState);

      if (res.address?.cep) {
        setCep(formatCep(String(res.address.cep)));
      }

      if (res.address?.latitude && res.address?.longitude) {
        setLatitude(Number(res.address.latitude));
        setLongitude(Number(res.address.longitude));
        updateMapCenter(Number(res.address.latitude), Number(res.address.longitude));
      } else if (resolvedCityName) {
        const canonicalMatch = findCityByLabel(`${resolvedCityName} - ${resolvedState}`) || findCityByLabel(resolvedCityName);
        if (canonicalMatch?.lat && canonicalMatch?.lng) {
          setLatitude(canonicalMatch.lat);
          setLongitude(canonicalMatch.lng);
          updateMapCenter(canonicalMatch.lat, canonicalMatch.lng);
        }
      }

      if (res.mainCnae?.code || res.mainCnae?.description) {
        const cnaeCode = String(res.mainCnae.code || "");
        const cnaeDesc = String(res.mainCnae.description || "");
        setDetectedCnae({
          code: cnaeCode,
          description: cnaeDesc,
        });
        const mappedCat = resolveCategoryFromCnae(cnaeCode, cnaeDesc);
        if (mappedCat) {
          setCategory(mappedCat);
        }
      }

      toast.success("Dados da empresa e CNAE importados da Receita Federal!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao consultar CNPJ.");
    } finally {
      setIsSearchingCnpj(false);
    }
  };

  // Disparo do Motor de Extração com IA (Firecrawl + Steel)
  const handleStartAiExtraction = async (targetUrlOverride?: string) => {
    const rawTarget = (targetUrlOverride || aiUrlInput || website || instagram || "").trim();
    if (!rawTarget) {
      toast.error("Informe a URL do site ou perfil do Instagram.");
      return;
    }

    let formattedUrl = rawTarget;
    if (formattedUrl.startsWith("@")) {
      formattedUrl = `https://instagram.com/${formattedUrl.slice(1)}`;
    } else if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    setAiUrlInput(formattedUrl);
    setAiResult(null);
    setAiErrorMessage(null);
    setAiLiveLogs([]);
    setAiLiveScreenshots([]);
    setAiLiveProgress(0);
    setAiActiveSquad("crawl");
    setAiCompletedSquads([]);
    setAiLiveViewerUrl(null);
    setAiCurrentBrowsingUrl(formattedUrl);
    setAiApplied(false);
    setIsExtractingAi(true);

    let pollInterval: ReturnType<typeof setInterval> | null = null;

    try {
      toast.loading("Verificando provedor de IA e iniciando extração...", { id: "ai-extract" });

      // 1. Pré-flight real: valida chave de IA ativa ANTES de abrir o terminal de extração
      const { jobId } = await startMagicOnboardingJob({
        data: {
          url: formattedUrl,
          company_name_hint: name || undefined,
          city_hint: city || undefined,
          state_hint: state || undefined,
          instagram_hint: instagram || undefined,
        },
      });

      setAiJobId(jobId);
      setShowAiDisplay(true);
      setAiLiveProgress(5);

      // 2. Polling real no banco (ai_async_jobs) para exibir logs e prints em tempo real
      pollInterval = setInterval(async () => {
        try {
          const job = await getOnboardingJobStatus({ data: { jobId } });
          if (typeof job?.progress_percent === "number") {
            setAiLiveProgress(job.progress_percent);
          }
          const liveState = (job?.result as any)?.live_state as OnboardingLiveState | undefined;
          if (liveState) {
            if (Array.isArray(liveState.logs)) setAiLiveLogs(liveState.logs);
            if (Array.isArray(liveState.screenshots)) setAiLiveScreenshots(liveState.screenshots);
            if (liveState.active_squad) setAiActiveSquad(liveState.active_squad);
            if (Array.isArray(liveState.completed_squads)) setAiCompletedSquads(liveState.completed_squads);
            if (liveState.live_viewer_url) setAiLiveViewerUrl(liveState.live_viewer_url);
            if (liveState.current_browsing_url) setAiCurrentBrowsingUrl(liveState.current_browsing_url);
          }
        } catch {
          // Ignora falha transitória de polling
        }
      }, 1000);

      // 3. Executa o pipeline real (Site + Instagram + Google Meu Negócio + Prints + Concílio de IAs)
      const res = await runMagicOnboardingJob({
        data: {
          jobId,
          url: formattedUrl,
          company_name_hint: name || undefined,
          city_hint: city || undefined,
          state_hint: state || undefined,
          instagram_hint: instagram || undefined,
        },
      });

      if (res?.result) {
        setAiResult(res.result);
        setAiLiveProgress(100);
        if (res.result.logs) setAiLiveLogs(res.result.logs);
        if (res.result.screenshots) setAiLiveScreenshots(res.result.screenshots);
        if (res.result.job_id) {
          setAiJobId(res.result.job_id);
        }
        toast.success("Dados e prints capturados com sucesso!", { id: "ai-extract" });
      }
    } catch (err: any) {
      const msg = err?.message || "Falha na extração de dados.";
      setAiErrorMessage(msg);
      toast.error(msg, { id: "ai-extract" });
    } finally {
      if (pollInterval) clearInterval(pollInterval);
      setIsExtractingAi(false);
    }
  };

  const handleApplyAiResult = (extracted: MagicOnboardingResult) => {
    if (extracted.company_name) setName(extracted.company_name);
    if (extracted.bio) setBio(extracted.bio);
    if (extracted.contact?.whatsapp || extracted.contact?.phone) {
      setPhone(extracted.contact.whatsapp || extracted.contact.phone || phone);
    }
    if (extracted.contact?.city) setCity(extracted.contact.city);
    if (extracted.contact?.state) setState(extracted.contact.state);
    if (extracted.contact?.address) setStreet(extracted.contact.address);

    if (extracted.category) {
      const match = QUICK_CATEGORIES.find(
        (c) => c.id === extracted.category || c.label.toLowerCase().includes(extracted.category.toLowerCase())
      );
      if (match) setCategory(match.id);
    }

    if (extracted.instagram_url) {
      const igHandle = extracted.instagram_url.split("instagram.com/")[1]?.split("/")[0]?.split("?")[0];
      if (igHandle) setInstagram(`@${igHandle}`);
    }
    if (extracted.logo_url) setLogoUrl(extracted.logo_url);
    if (extracted.cover_url) setBannerUrl(extracted.cover_url);

    if (aiUrlInput) {
      if (aiUrlInput.includes("instagram.com")) {
        const handle = aiUrlInput.split("instagram.com/")[1]?.split("/")[0]?.split("?")[0];
        if (handle) setInstagram(`@${handle}`);
      } else {
        setWebsite(aiUrlInput);
      }
    }

    setAiApplied(true);
    toast.success("Dados aplicados ao formulário!");
  };

  // Submissão Segura com Garantia de Alternância de Tenant
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Por favor, informe o nome da sua empresa.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Por favor, informe o WhatsApp comercial de atendimento.");
      return;
    }
    if (!city.trim()) {
      toast.error("Por favor, informe a cidade de atuação.");
      return;
    }

    setIsSubmitting(true);
    try {
      const fullAddress = street
        ? `${street}, ${number || "S/N"}${neighborhood ? ` - ${neighborhood}` : ""}, ${city} - ${state}`
        : city;

      const selectedCatObj = QUICK_CATEGORIES.find((c) => c.id === category) || QUICK_CATEGORIES[0];
      const nicheSpec = getUnifiedNicheSpec(selectedCatObj.niche);

      const res = await fastRegisterCompany({
        data: {
          name: name.trim(),
          category,
          niche: selectedCatObj.niche,
          primary_niche_id: nicheSpec.id,
          vertical_sku: initialSku || nicheSpec.defaultVerticalSku,
          brand_origin: initialVertical || undefined,
          phone: phone.trim(),
          email: email.trim() || undefined,
          city: city.trim(),
          state: state.trim() || "SC",
          address: fullAddress,
          street: street.trim() || undefined,
          number: number.trim() || undefined,
          complement: complement.trim() || undefined,
          neighborhood: neighborhood.trim() || undefined,
          zip_code: cep.replace(/\D/g, "") || undefined,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          bio: bio.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
          bannerUrl: bannerUrl.trim() || undefined,
          website: website.trim() || undefined,
          instagram: instagram.trim() || undefined,
          cnpj: cnpj.replace(/\D/g, "") || undefined,
          onboardingJobId: aiJobId || undefined,
          waesy_marketplace_enabled: waesyMarketplaceEnabled,
          activateBrandedApp,
          appTemplateId,
          appNicheFeatures: {
            enableApiQuoter,
            enableCorporateTravel,
            corporateAppUrl: corporateAppUrl.trim() || undefined,
            enableClientPortal: true,
            enableInstallPrompt: true,
          },
        },
      });

      if (res?.success) {
        toast.success("Empresa cadastrada e ativada no Workspace!");
        const resolvedStore = res.store;
        const resolvedStoreId = resolvedStore?.id || (res as any).storeId;

        // 1. Sincroniza cookies canônicos no cliente
        if (resolvedStoreId) {
          setClientContextCookies({ context: "store", storeId: resolvedStoreId });
          await setTenantContext({ data: { store_id: resolvedStoreId } });
        }

        // 2. Redirecionamento determinístico garantindo o tenant ativo
        if (onSuccess && resolvedStoreId) {
          onSuccess(resolvedStoreId);
        } else {
          window.location.href = resolvedStoreId ? `/workspace?storeId=${resolvedStoreId}` : "/workspace";
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar empresa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCat = QUICK_CATEGORIES.find((c) => c.id === category) || QUICK_CATEGORIES[0];
  const CatIcon = selectedCat.icon;
  const cleanSlug = generateSlug(name || "sua-empresa");
  const formattedAddressPreview = street
    ? `${street}, ${number || "S/N"}${neighborhood ? ` - ${neighborhood}` : ""}`
    : "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Coluna Esquerda: Formulário de Entrada Ágil Estruturado (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="space-y-2">
          <Badge variant="outline" className="text-xs font-medium gap-2 rounded-xl border-primary/30 text-primary bg-primary/5">
            <Zap className="size-4" />
            <span>Cadastro Rápido</span>
          </Badge>
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
            Cadastrar Novo Negócio
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Cadastre sua empresa, selecione o segmento e ative suas ferramentas comerciais.
          </p>
        </div>

        {/* ── Bloco Assistente de Preenchimento por Link (Opcional & Recolhível) ── */}
        <div className="rounded-2xl bg-card border border-border/80 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAiAssistant((prev) => !prev)}
            className="w-full p-4 min-h-11 flex items-center justify-between text-left hover:bg-muted/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Zap className="size-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-foreground block">
                  Preencher dados pelo site ou Instagram
                </span>
                <span className="text-2xs text-muted-foreground block">
                  Informe o endereço público para importar nome, bio e contatos automaticamente
                </span>
              </div>
            </div>
            {showAiAssistant ? (
              <ChevronUp className="size-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground shrink-0" />
            )}
          </button>

          {showAiAssistant && (
            <div className="p-4 pt-2 border-t border-border/40 space-y-3 bg-muted/10">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative w-full">
                  <Globe className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={aiUrlInput}
                    onChange={(e) => setAiUrlInput(e.target.value)}
                    placeholder="https://seusite.com.br ou @seuinstagram"
                    className="h-11 min-h-11 pl-10 rounded-xl text-xs"
                    disabled={isExtractingAi}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => handleStartAiExtraction()}
                  disabled={isExtractingAi || !aiUrlInput.trim()}
                  className="w-full sm:w-auto h-11 min-h-11 px-5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 cursor-pointer gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {isExtractingAi ? (
                    <>
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                      <span>Importando...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="size-4" />
                      <span>Importar Dados</span>
                    </>
                  )}
                </Button>
              </div>

              {showAiDisplay && (
                <AiLiveExtractionDisplay
                  url={aiUrlInput}
                  isProcessing={isExtractingAi}
                  progressPercent={aiLiveProgress}
                  logs={aiLiveLogs}
                  screenshots={aiLiveScreenshots}
                  activeSquad={aiActiveSquad}
                  completedSquads={aiCompletedSquads}
                  liveViewerUrl={aiLiveViewerUrl}
                  currentBrowsingUrl={aiCurrentBrowsingUrl}
                  errorMessage={aiErrorMessage}
                  result={aiResult}
                  isApplied={aiApplied}
                  onApplyResult={handleApplyAiResult}
                  onCancel={() => setShowAiDisplay(false)}
                />
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 rounded-2xl bg-card border border-border/80 space-y-6">
          {/* ── ETAPA 1: IDENTIFICAÇÃO COMERCIAL ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Building2 className="size-4 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                1. Identificação Comercial
              </h3>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Nome Fantasia da Empresa *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Prime Eventos, Serra Sol Turismo, Restaurante Central..."
                className="h-11 min-h-11 rounded-xl text-base md:text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>

            {/* CNPJ Opcional com Auto-preenchimento */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between gap-2">
                <span>CNPJ (Opcional)</span>
                <span className="text-2xs font-normal text-muted-foreground">Consulta Receita</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  className="h-11 min-h-11 rounded-xl text-base md:text-sm font-mono focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  maxLength={18}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLookupCnpj}
                  disabled={isSearchingCnpj || cleanDocument(cnpj).length !== 14}
                  className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold shrink-0 gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                >
                  {isSearchingCnpj ? (
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  <span>Buscar CNPJ</span>
                </Button>
              </div>
            </div>
          </div>

          {/* ── ETAPA 2: SEGMENTO & NICHO DE ATUAÇÃO ── */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
              <div className="flex items-center gap-2">
                <Ticket className="size-4 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  2. Segmento & Nicho de Atuação *
                </h3>
              </div>
              {detectedCnae && (
                <Badge variant="outline" className="text-2xs font-medium rounded-lg border-primary/30 text-primary bg-primary/5">
                  CNAE {detectedCnae.code}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Sistema Vertical / Segmento Principal *
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-12 min-h-11 rounded-xl text-sm font-medium bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-ring">
                  <SelectValue placeholder="Selecione o segmento da sua empresa">
                    <span className="flex items-center gap-3 truncate">
                      <CatIcon className="size-4 text-primary shrink-0" />
                      <span className="font-semibold text-foreground truncate">{selectedCat.label}</span>
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-80 rounded-xl">
                  {QUICK_CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    return (
                      <SelectItem key={c.id} value={c.id} className="py-2 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <Icon className="size-4 text-primary shrink-0 mt-1" />
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-foreground block">{c.label}</span>
                            <span className="text-2xs text-muted-foreground block leading-snug">
                              {c.description}
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-2xs text-muted-foreground leading-relaxed">
                {detectedCnae
                  ? `Identificado via Receita Federal (${detectedCnae.description}). Você pode ajustar manualmente se desejar.`
                  : selectedCat.description}
              </p>
            </div>
          </div>

          {/* ── ETAPA 3: LOCALIZAÇÃO & ENDEREÇO ESTRUTURADO (100% CONECTADO) ── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <MapPin className="size-4 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                3. Endereço & Localização no Mapa *
              </h3>
            </div>

            {/* CEP com Busca Automática */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6 space-y-2">
                <label className="text-xs font-semibold text-foreground">CEP Comercial</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={cep}
                    onChange={(e) => {
                      const formatted = formatCep(e.target.value);
                      setCep(formatted);
                      if (formatted.replace(/\D/g, "").length === 8) {
                        handleLookupCep(formatted);
                      }
                    }}
                    placeholder="00000-000"
                    className="h-11 min-h-11 rounded-xl text-base md:text-sm font-mono focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    maxLength={9}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleLookupCep()}
                    disabled={isSearchingCep || cep.replace(/\D/g, "").length !== 8}
                    className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold shrink-0 gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                  >
                    {isSearchingCep ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <Search className="size-4" />}
                    <span>Buscar CEP</span>
                  </Button>
                </div>
              </div>

              {/* Cidade e Estado Canônicos (sem duplicação de bairro ou label) */}
              <div className="sm:col-span-6 space-y-2">
                <label className="text-xs font-semibold text-foreground">Cidade de Atuação *</label>
                <CityCombobox
                  value={city && state ? `${city} - ${state}` : city}
                  hideLabel
                  hideNeighborhood
                  hideHelperText
                  onChange={(_formatted, structured) => {
                    if (structured?.city) setCity(structured.city);
                    if (structured?.state) setState(structured.state);
                  }}
                />
              </div>
            </div>

            {/* Logradouro (Rua/Avenida) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Logradouro (Rua, Avenida, Praça)</label>
              <Input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Ex: Av. Getúlio Vargas, Rua Marechal Deodoro..."
                className="h-11 min-h-11 rounded-xl text-base md:text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Número, Complemento e Bairro */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4 space-y-2">
                <label className="text-xs font-semibold text-foreground">Número *</label>
                <Input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Ex: 120 ou S/N"
                  className="h-11 min-h-11 rounded-xl text-base md:text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="sm:col-span-4 space-y-2">
                <label className="text-xs font-semibold text-foreground">Complemento</label>
                <Input
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Ex: Sala 402, Bloco B"
                  className="h-11 min-h-11 rounded-xl text-base md:text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="sm:col-span-4 space-y-2">
                <label className="text-xs font-semibold text-foreground">Bairro</label>
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex: Centro, Jardim..."
                  className="h-11 min-h-11 rounded-xl text-base md:text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>

            {/* Mini Mapa Interativo com Marcador Arrastável */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  <span>Ponto no Mapa (arraste para ajustar)</span>
                </label>
                {latitude && longitude && (
                  <span className="text-2xs font-mono text-muted-foreground">
                    {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </span>
                )}
              </div>
              <div className="h-44 sm:h-52 w-full rounded-xl border border-border/70 overflow-hidden relative shadow-2xs">
                <div ref={mapContainer} className="size-full" />
              </div>
            </div>
          </div>

          {/* ── ETAPA 4: CANAIS DE ATENDIMENTO & BIO ── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Phone className="size-4 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                4. Atendimento & Apresentação
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Phone className="size-4 text-primary" />
                  <span>WhatsApp Comercial *</span>
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(49) 99999-9999"
                  className="h-11 min-h-11 rounded-xl text-base md:text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">E-mail Comercial</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@suaempresa.com.br"
                  className="h-11 min-h-11 rounded-xl text-base md:text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Apresentação / Bio da Empresa</label>
                <span className="text-2xs text-muted-foreground font-mono">{bio.length}/600</span>
              </div>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Descreva especialidades, diferenciais ou horário de atendimento..."
                className="min-h-20 rounded-xl text-xs resize-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                maxLength={600}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Globe className="size-3 text-muted-foreground" />
                  <span>Site Oficial</span>
                </label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://suaempresa.com.br"
                  className="h-11 min-h-11 rounded-xl text-base md:text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Instagram className="size-3 text-muted-foreground" />
                  <span>Instagram</span>
                </label>
                <Input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@suaempresa"
                  className="h-11 min-h-11 rounded-xl text-base md:text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>
          </div>

          {/* ── ETAPA 5: IDENTIDADE VISUAL (OPCIONAL) ── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Store className="size-4 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                5. Identidade Visual (Opcional)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
              <div className="sm:col-span-4 space-y-2">
                <label className="text-2xs font-medium text-muted-foreground block">Logotipo (1:1)</label>
                <div className="size-28">
                  <ImageUpload
                    value={logoUrl}
                    onChange={setLogoUrl}
                    onRemove={() => setLogoUrl("")}
                    bucket="avatars"
                    aspectPreset="square"
                    variant="avatar"
                    appLogoMode
                    className="size-full"
                    helperText="Formato quadrado proporcionalizado"
                  />
                </div>
              </div>

              <div className="sm:col-span-8 space-y-2">
                <label className="text-2xs font-medium text-muted-foreground block">Banner / Capa da Vitrine (Opcional)</label>
                <ImageUpload
                  value={bannerUrl}
                  onChange={setBannerUrl}
                  onRemove={() => setBannerUrl("")}
                  bucket="covers"
                  aspectPreset="banner"
                  variant="banner"
                  label="Adicionar Capa"
                  helperText="Proporção 21:9 (Hero da Vitrine / App)"
                />
              </div>
            </div>
          </div>

          {/* ── ETAPA 6: APP OFICIAL & MARKETPLACE ── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Smartphone className="size-4 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                6. App Oficial Padronizado & Marketplace
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">Ativar App Oficial (/app)</p>
                  <p className="text-xs text-muted-foreground">
                    Catálogo PWA padronizado e instalável com layout do seu nicho
                  </p>
                </div>
                <Switch
                  checked={activateBrandedApp}
                  onCheckedChange={setActivateBrandedApp}
                  aria-label="Ativar App Oficial"
                />
              </div>

              <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">Perfil no Marketplace Waesy</p>
                  <p className="text-xs text-muted-foreground">
                    Exibir empresa na rede Waesy (/loja) para descoberta orgânica
                  </p>
                </div>
                <Switch
                  checked={waesyMarketplaceEnabled}
                  onCheckedChange={setWaesyMarketplaceEnabled}
                  aria-label="Publicar perfil no Marketplace Waesy"
                />
              </div>
            </div>

            {activateBrandedApp && (
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-foreground">Modelo Padrão do App</p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: "tourism_cvc", label: "Turismo (Agência / Pacotes)" },
                        { id: "delivery_ifood", label: "Delivery & Cardápio" },
                        { id: "events_sympla", label: "Eventos & Ingressos" },
                        { id: "services_agenda", label: "Serviços & Agenda" },
                        { id: "ecommerce_retail", label: "Loja & E-commerce" },
                        { id: "standard_catalog", label: "Catálogo Padrão" },
                      ] as Array<{ id: BrandedAppTemplateId; label: string }>
                    ).map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setAppTemplateId(tpl.id)}
                        className={`h-11 min-h-11 px-3 rounded-xl text-xs font-semibold border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          appTemplateId === tpl.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {appTemplateId === "tourism_cvc" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-background border border-border/70">
                      <span className="text-xs font-semibold text-foreground">
                        Cotação Direta na API (Voos/Hotéis)
                      </span>
                      <Switch
                        checked={enableApiQuoter}
                        onCheckedChange={setEnableApiQuoter}
                        aria-label="Ativar cotação direta na API"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-background border border-border/70">
                      <span className="text-xs font-semibold text-foreground">
                        Botão Viagens Corporativas
                      </span>
                      <Switch
                        checked={enableCorporateTravel}
                        onCheckedChange={setEnableCorporateTravel}
                        aria-label="Ativar botão de viagens corporativas"
                      />
                    </div>
                    {enableCorporateTravel && (
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Link do App Corporativo (opcional — deixe em branco para usar o portal integrado)
                        </label>
                        <Input
                          value={corporateAppUrl}
                          onChange={(e) => setCorporateAppUrl(e.target.value)}
                          placeholder="https://corporativo.suaagencia.com.br"
                          className="h-11 min-h-11 rounded-xl text-xs bg-background"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Botão de Finalização Canônico */}
          <div className="pt-4 border-t border-border/50">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 min-h-12 rounded-xl text-xs sm:text-sm font-semibold gap-2 bg-foreground text-background hover:bg-foreground/90 active:scale-99 transition-transform duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  <span>Ativando Empresa no Workspace...</span>
                </>
              ) : (
                <>
                  <span>Concluir Cadastro e Acessar Workspace</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Coluna Direita: Live Public Profile Preview (5 cols) */}
      <div className="lg:col-span-5 sticky top-24 space-y-4">
        <div className="p-4 bg-muted/40 rounded-2xl border border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="size-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Prévia do Perfil Comercial</span>
          </div>
          <Badge variant="outline" className="text-2xs font-mono rounded-xl">
            Ao Vivo
          </Badge>
        </div>

        {/* Card do Perfil Público Canônico */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden space-y-0">
          {bannerUrl && (
            <div className="w-full aspect-21/9 bg-muted overflow-hidden border-b border-border/40">
              <img src={bannerUrl} alt="Capa da Empresa" className="size-full object-cover select-none" />
            </div>
          )}
          <div className="p-4 sm:p-5 bg-card border-b border-border/40">
            <div className="flex items-center justify-between gap-4">
              {/* Logo Squircle 1:1 */}
              <div className="size-16 sm:size-20 rounded-xl border-2 border-border/60 bg-background p-2 overflow-hidden flex items-center justify-center shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={name || "Logo"} className="max-w-full max-h-full object-contain select-none" />
                ) : (
                  <div className="size-full bg-foreground text-background flex items-center justify-center font-semibold text-xl select-none">
                    {name ? name.charAt(0).toUpperCase() : "E"}
                  </div>
                )}
              </div>

              {/* Badges de Categoria e Modalidade */}
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-2xs font-medium gap-1 rounded-xl">
                  <CatIcon className="size-3" />
                  <span>{selectedCat.label}</span>
                </Badge>
              </div>
            </div>
          </div>

          {/* Dados da Loja */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base text-foreground tracking-tight truncate">
                    {name || "Nome da Sua Empresa"}
                  </h3>
                  <ShieldCheck className="size-4 text-primary" />
                </div>
                <span className="text-2xs font-mono text-muted-foreground block truncate">
                  @{cleanSlug}
                </span>
              </div>

              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-2xs font-medium gap-1 shrink-0 rounded-xl">
                <ShieldCheck className="size-3" />
                <span>Ativo</span>
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3 text-primary shrink-0" />
              <span>{city || "Cidade"}, {state}</span>
              {formattedAddressPreview && <span className="truncate">• {formattedAddressPreview}</span>}
            </p>

            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {bio || "Apresentação e especialidades da sua empresa divulgadas para toda a comunidade..."}
            </p>

            {/* Ações do Perfil */}
            <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
              <span className="text-2xs font-mono text-muted-foreground">
                {phone || "(49) 99999-9999"}
              </span>
              <div className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-xs">
                WhatsApp
              </div>
            </div>

            {/* Abas da Vitrine Canônica */}
            <div className="pt-1 flex items-center gap-4 text-2xs font-semibold text-muted-foreground border-t border-border/30">
              <span className="text-foreground border-b-2 border-primary pb-1">Vitrine</span>
              <span className="pb-1">Sobre</span>
              <span className="pb-1">Posts</span>
              <span className="pb-1">Avaliações</span>
            </div>
          </div>
        </div>

        {/* Garantia do Sistema */}
        <div className="p-4 rounded-lg bg-muted/20 border border-border/40 space-y-2 text-xs text-muted-foreground">
          <p className="font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span>App Oficial & Perfil no Marketplace</span>
          </p>
          <p className="text-2xs leading-relaxed">
            Ao concluir, seu App Oficial padronizado (<code className="text-foreground font-mono">waesy.com.br/app/{cleanSlug}</code>) e seu Perfil no Marketplace (<code className="text-foreground font-mono">waesy.com.br/loja/{cleanSlug}</code>) serão provisionados com sincronização ao vivo.
          </p>
        </div>
      </div>
    </div>
  );
}
