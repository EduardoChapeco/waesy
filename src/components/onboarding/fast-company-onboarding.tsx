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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { fastRegisterCompany } from "@/services/company-mvp.functions";
import { setTenantContext } from "@/services/identity.functions";
import { setClientContextCookies } from "@/lib/context-auth";
import { ImageUpload } from "@/components/ui/image-upload";
import { CityCombobox } from "@/components/ui/city-combobox";
import { generateSlug } from "@/lib/slug-utils";
import { useMasterLocation, getStoredLocation } from "@/components/location/location-master-pill";
import { executeMagicOnboarding, type MagicOnboardingResult } from "@/services/magic-onboarding.functions";
import { AiLiveExtractionDisplay } from "@/components/onboarding/ai-live-extraction-display";
import { lookupCep, lookupCnpj, reverseGeocode } from "@/services/public-apis.functions";
import { formatCep, formatCnpj, cleanDocument } from "@/lib/document-validator";
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
    id: "saude",
    label: "Saúde e Beleza",
    niche: "services",
    icon: HeartPulse,
    description: "Salões de beleza, barbearias, academias, studios e clínicas",
  },
  {
    id: "automotivo",
    label: "Veículos e Oficinas",
    niche: "vehicles",
    icon: Car,
    description: "Lava-rápidos, oficinas mecânicas e revenda de veículos",
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
  onSuccess?: (storeId: string) => void;
}

export function FastCompanyOnboarding({ userId, onSuccess }: FastCompanyOnboardingProps = {}) {
  const navigate = useNavigate();

  const { location: masterLoc } = useMasterLocation();
  const detectedCity = masterLoc?.city && masterLoc.city.toLowerCase() !== "global" ? masterLoc.city : "";
  const detectedState = masterLoc?.state || "SC";

  // 1. Identificação Básica
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);

  // 2. Segmento & Nicho
  const [category, setCategory] = useState("events");

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
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");

  // 5. Identidade Visual
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  // Estados de Controle & IA
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiUrlInput, setAiUrlInput] = useState("");
  const [isExtractingAi, setIsExtractingAi] = useState(false);
  const [aiResult, setAiResult] = useState<MagicOnboardingResult | null>(null);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [showAiDisplay, setShowAiDisplay] = useState(false);

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
          <div class="size-8 rounded-full bg-primary/20 animate-ping absolute inset-0"></div>
          <div class="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xs border-2 border-background">
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
        setPhone(res.phone);
      }
      if (res.address?.street) setStreet(res.address.street);
      if (res.address?.number) setNumber(res.address.number);
      if (res.address?.complement) setComplement(res.address.complement);
      if (res.address?.neighborhood) setNeighborhood(res.address.neighborhood);
      if (res.address?.city) setCity(res.address.city);
      if (res.address?.state) setState(res.address.state);
      if (res.address?.cep) {
        setCep(formatCep(res.address.cep));
      }
      if (res.address?.latitude && res.address?.longitude) {
        setLatitude(Number(res.address.latitude));
        setLongitude(Number(res.address.longitude));
        updateMapCenter(Number(res.address.latitude), Number(res.address.longitude));
      }

      toast.success("Dados da empresa importados da Receita Federal!");
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
    setShowAiDisplay(true);
    setIsExtractingAi(true);
    setAiResult(null);

    try {
      toast.loading("Minerando dados do link informado...", { id: "ai-extract" });
      const res = await executeMagicOnboarding({
        data: { url: formattedUrl },
      });

      if (res?.result) {
        setAiResult(res.result);
        if (res.result.job_id) {
          setAiJobId(res.result.job_id);
        }
        toast.success("Dados minerados com sucesso!", { id: "ai-extract" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Falha na extração de dados.", { id: "ai-extract" });
    } finally {
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

    if (aiUrlInput) {
      if (aiUrlInput.includes("instagram.com")) {
        const handle = aiUrlInput.split("instagram.com/")[1]?.split("/")[0]?.split("?")[0];
        if (handle) setInstagram(`@${handle}`);
      } else {
        setWebsite(aiUrlInput);
      }
    }

    setShowAiDisplay(false);
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

      const res = await fastRegisterCompany({
        data: {
          name: name.trim(),
          category,
          niche: selectedCatObj.niche,
          phone: phone.trim(),
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
        },
      });

      if (res?.success) {
        toast.success("Empresa cadastrada e ativada no Workspace!");
        const resolvedStore = res.store;
        const resolvedStoreId = resolvedStore?.id || (res as any).storeId;

        // 1. Sincroniza cookies canônicos no cliente
        if (resolvedStoreId) {
          setClientContextCookies({ context: "store", storeId: resolvedStoreId });
          await setTenantContext({ data: { store_id: resolvedStoreId } }).catch(() => null);
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start motion-reduce:transition-none">
      {/* Coluna Esquerda: Formulário de Entrada Ágil Estruturado (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="space-y-2">
          <Badge variant="outline" className="text-xs font-bold gap-2 border-primary/30 text-primary bg-primary/5">
            <Zap className="size-3.5" />
            <span>Cadastro Rápido de Presença Comercial</span>
          </Badge>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Cadastrar Novo Negócio
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Cadastre sua empresa, selecione o segmento comercial e ative suas ferramentas de vendas, eventos ou serviços no ecossistema Waesy.
          </p>
        </div>

        {/* ── Bloco Assistente de Preenchimento com IA (Opcional & Recolhível) ── */}
        <div className="rounded-lg bg-card border border-border/80 shadow-2xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAiAssistant((prev) => !prev)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors cursor-pointer min-h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Zap className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Preencher dados automaticamente com IA via link
                </span>
                <span className="text-xs text-muted-foreground block">
                  Cole o site ou Instagram da sua empresa para preencher nome, bio e contatos em 1 clique
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
            <div className="p-4 pt-1 border-t border-border/40 space-y-3 bg-muted/10">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative w-full">
                  <Globe className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={aiUrlInput}
                    onChange={(e) => setAiUrlInput(e.target.value)}
                    placeholder="https://seusite.com.br ou @seuinstagram"
                    className="h-11 min-h-11 pl-9 rounded-lg text-xs"
                    disabled={isExtractingAi}
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => handleStartAiExtraction()}
                  disabled={isExtractingAi || !aiUrlInput.trim()}
                  className="w-full sm:w-auto h-11 min-h-11 px-5 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs shrink-0 cursor-pointer gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {isExtractingAi ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Minerando...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="size-3.5" />
                      <span>Extrair com IA</span>
                    </>
                  )}
                </Button>
              </div>

              {showAiDisplay && (
                <AiLiveExtractionDisplay
                  url={aiUrlInput}
                  isProcessing={isExtractingAi}
                  result={aiResult}
                  onApplyResult={handleApplyAiResult}
                  onCancel={() => setShowAiDisplay(false)}
                />
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 rounded-lg bg-card border border-border/80 shadow-2xs space-y-6">
          {/* ── ETAPA 1: IDENTIFICAÇÃO COMERCIAL ── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Building2 className="size-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                1. Identificação Comercial
              </h3>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Nome Fantasia da Empresa *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Prime Eventos, Serra Sol Turismo, Restaurante Central..."
                className="h-11 min-h-11 rounded-lg text-xs sm:text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>

            {/* CNPJ Opcional com Auto-preenchimento */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>CNPJ (Opcional)</span>
                <span className="text-xs font-normal text-muted-foreground">Preenchimento automático via Receita</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  className="h-11 min-h-11 rounded-lg text-xs font-mono focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  maxLength={18}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLookupCnpj}
                  disabled={isSearchingCnpj || cleanDocument(cnpj).length !== 14}
                  className="h-11 min-h-11 px-4 text-xs font-bold shrink-0 gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                >
                  {isSearchingCnpj ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Search className="size-3.5" />
                  )}
                  <span>Buscar CNPJ</span>
                </Button>
              </div>
            </div>
          </div>

          {/* ── ETAPA 2: SEGMENTO & NICHO DE ATUAÇÃO ── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Ticket className="size-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                2. Segmento & Nicho de Atuação *
              </h3>
            </div>

            <p className="text-xs text-muted-foreground">
              Selecione o segmento principal para ativar o menu e as ferramentas correspondentes no Workspace:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {QUICK_CATEGORIES.map((c) => {
                const Icon = c.icon;
                const isSelected = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      "p-3 rounded-lg border text-left transition-colors flex items-start gap-3 cursor-pointer min-h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      isSelected
                        ? "border-primary bg-primary/5 text-foreground shadow-xs ring-1 ring-primary"
                        : "border-border/60 bg-background/50 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "size-9 rounded-lg flex items-center justify-center shrink-0 mt-1",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold block text-foreground truncate">{c.label}</span>
                      <span className="text-xs text-muted-foreground line-clamp-1 leading-tight">
                        {c.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── ETAPA 3: LOCALIZAÇÃO & ENDEREÇO ESTRUTURADO (100% CONECTADO) ── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <MapPin className="size-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                3. Endereço & Localização no Mapa *
              </h3>
            </div>

            {/* CEP com Busca Automática */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6 space-y-2">
                <label className="text-xs font-bold text-foreground">CEP Comercial</label>
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
                    className="h-11 min-h-11 rounded-lg text-xs font-mono focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    maxLength={9}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleLookupCep()}
                    disabled={isSearchingCep || cep.replace(/\D/g, "").length !== 8}
                    className="h-11 min-h-11 px-3 text-xs font-bold shrink-0 gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                  >
                    {isSearchingCep ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
                    <span>Buscar CEP</span>
                  </Button>
                </div>
              </div>

              {/* Cidade e Estado Canônicos */}
              <div className="sm:col-span-6 space-y-2">
                <label className="text-xs font-bold text-foreground">Cidade de Atuação *</label>
                <CityCombobox
                  value={city && state ? `${city} - ${state}` : city}
                  onChange={(formatted, structured) => {
                    if (structured?.city) setCity(structured.city);
                    if (structured?.state) setState(structured.state);
                  }}
                />
              </div>
            </div>

            {/* Logradouro (Rua/Avenida) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Logradouro (Rua, Avenida, Praça)</label>
              <Input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Ex: Av. Getúlio Vargas, Rua Marechal Deodoro..."
                className="h-11 min-h-11 rounded-lg text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {/* Número, Complemento e Bairro */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4 space-y-2">
                <label className="text-xs font-bold text-foreground">Número *</label>
                <Input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Ex: 120 ou S/N"
                  className="h-11 min-h-11 rounded-lg text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="sm:col-span-4 space-y-2">
                <label className="text-xs font-bold text-foreground">Complemento</label>
                <Input
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Ex: Sala 402, Bloco B"
                  className="h-11 min-h-11 rounded-lg text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div className="sm:col-span-4 space-y-2">
                <label className="text-xs font-bold text-foreground">Bairro</label>
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Ex: Centro, Jardim..."
                  className="h-11 min-h-11 rounded-lg text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>

            {/* Mini Mapa Interativo com Marcador Arrastável */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-2">
                  <MapPin className="size-3.5 text-primary" />
                  <span>Ponto no Mapa (Arraste o marcador para ajuste fino)</span>
                </label>
                {latitude && longitude && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </span>
                )}
              </div>
              <div className="h-44 sm:h-52 w-full rounded-lg border border-border/70 overflow-hidden relative shadow-2xs">
                <div ref={mapContainer} className="size-full" />
              </div>
            </div>
          </div>

          {/* ── ETAPA 4: CANAIS DE ATENDIMENTO & BIO ── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Phone className="size-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                4. Atendimento & Apresentação
              </h3>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Phone className="size-3.5 text-primary" />
                <span>WhatsApp Comercial de Atendimento *</span>
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(49) 99999-9999"
                className="h-11 min-h-11 rounded-lg text-xs sm:text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Apresentação / Bio da Empresa</label>
                <span className="text-xs text-muted-foreground font-mono">{bio.length}/600</span>
              </div>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Descreva suas especialidades, diferenciais, horário de atendimento ou principais atrações/serviços..."
                className="min-h-20 rounded-lg text-xs resize-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                  className="h-11 min-h-11 rounded-lg text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                  className="h-11 min-h-11 rounded-lg text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </div>
          </div>

          {/* ── ETAPA 5: IDENTIDADE VISUAL (OPCIONAL) ── */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 border-b border-border/40 pb-2">
              <Store className="size-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                5. Identidade Visual (Opcional)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Logotipo (1:1)</label>
                <ImageUpload
                  value={logoUrl}
                  onChange={setLogoUrl}
                  bucket="avatars"
                  aspectPreset="square"
                  helperText="Upload da logo quadrada (1:1)"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Capa do Perfil (21:9)</label>
                <ImageUpload
                  value={bannerUrl}
                  onChange={setBannerUrl}
                  bucket="store-assets"
                  aspectPreset="banner"
                  helperText="Upload da capa panorâmica (21:9)"
                />
              </div>
            </div>
          </div>

          {/* Botão de Finalização Canônico */}
          <div className="pt-4 border-t border-border/50">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 min-h-12 rounded-lg text-xs sm:text-sm font-black gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-2xs active:scale-95 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
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
        <div className="p-4 bg-muted/40 rounded-lg border border-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="size-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Prévia Real do Perfil Comercial</span>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            Ao Vivo
          </Badge>
        </div>

        {/* Card do Perfil Público Canônico */}
        <div className="rounded-lg border border-border/60 bg-card overflow-hidden shadow-2xs space-y-0">
          <div className="p-4 bg-card border-b border-border/40">
            <div className="flex items-center gap-3 w-full">
              {/* Logo Squircle 1:1 */}
              <div className="size-16 sm:size-20 rounded-lg border-2 border-border/60 bg-background overflow-hidden flex items-center justify-center shadow-2xs shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={name || "Logo"} className="size-full object-cover select-none" />
                ) : (
                  <div className="size-full bg-foreground text-background flex items-center justify-center font-black text-xl select-none">
                    {name ? name.charAt(0).toUpperCase() : "E"}
                  </div>
                )}
              </div>

              {/* Capa Panorâmica Canônica 21:9 ao lado */}
              <div className="flex-1 min-w-0 aspect-video rounded-lg bg-muted relative overflow-hidden flex items-center border border-border/40">
                {bannerUrl ? (
                  <img src={bannerUrl} alt="Capa da empresa" className="size-full object-cover select-none" />
                ) : (
                  <div className="size-full bg-muted flex items-center justify-center p-2 text-center">
                    <Store className="size-6 text-primary/30" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2">
                  <Badge className="bg-foreground text-background border-border/40 text-xs font-bold gap-1">
                    <CatIcon className="size-2.5" />
                    <span>{selectedCat.label}</span>
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Dados da Loja */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base text-foreground tracking-tight truncate">
                    {name || "Nome da Sua Empresa"}
                  </h3>
                  <ShieldCheck className="size-3.5 text-primary" />
                </div>
                <span className="text-xs font-mono text-muted-foreground block truncate">
                  @{cleanSlug}
                </span>
              </div>

              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold gap-1 shrink-0">
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
              <span className="text-xs font-mono text-muted-foreground">
                {phone || "(49) 99999-9999"}
              </span>
              <div className="px-3 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-xs">
                WhatsApp
              </div>
            </div>

            {/* Abas da Vitrine Canônica */}
            <div className="pt-1 flex items-center gap-4 text-xs font-semibold text-muted-foreground border-t border-border/30">
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
            <span>Perfil Oficial no Diretório e Guia</span>
          </p>
          <p className="text-2xs leading-relaxed">
            Assim que você concluir, sua empresa aparecerá na vitrine pública com link oficial (<code className="text-foreground font-mono">waesy.com.br/loja/{cleanSlug}</code>) e integração direta com o WhatsApp comercial e painel de gestão.
          </p>
        </div>
      </div>
    </div>
  );
}
