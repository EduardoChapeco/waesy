import React, { useState, useEffect, useRef } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { Badge } from "./badge";
import { MapPin, Search, Loader2, Zap, Navigation, CheckCircle2 } from "lucide-react";
import type { Map, Marker } from "maplibre-gl";
import { getCanonicalMapStyle, setupMapResizeObserver } from "@/lib/map-styles";
import { lookupCep, parseAddressWithAI, reverseGeocode } from "@/services/public-apis.functions";
import { formatCep } from "@/lib/document-validator";
import { getStoredLocation } from "@/components/location/location-master-pill";
import { useQuery } from "@tanstack/react-query";
import { getPublicMapConfig } from "@/services/integrations.functions";
import { toast } from "sonner";

export interface AddressData {
  text: string;
  lat?: number;
  lng?: number;
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface AddressFieldProps {
  value?: AddressData;
  onChange?: (val: AddressData) => void;
  className?: string;
}

export const AddressField: React.FC<AddressFieldProps> = ({ value, onChange, className = "" }) => {
  const [query, setQuery] = useState(value?.text || "");
  const [cepInput, setCepInput] = useState(value?.cep || "");
  const [loading, setLoading] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [showAiPaste, setShowAiPaste] = useState(false);
  const [aiText, setAiText] = useState("");
  const [isParsingAi, setIsParsingAi] = useState(false);

  const { data: mapConfig } = useQuery({
    queryKey: ["public-map-config"],
    queryFn: () => getPublicMapConfig(),
    staleTime: 5 * 60 * 1000,
  });

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const marker = useRef<Marker | null>(null);

  // Inicializa o mapa com estilo canônico OpenStreetMap / CARTO conforme governança
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    let isMounted = true;
    let cleanupResize: (() => void) | undefined;

    import("maplibre-gl").then((maplibreglModule: any) => {
      if (!isMounted || !mapContainer.current || map.current) return;
      const maplibregl: any = maplibreglModule.default || maplibreglModule;

      const stored = typeof window !== "undefined" ? getStoredLocation() : null;
      const initialLat = value?.lat || stored?.lat || -27.1004;
      const initialLng = value?.lng || stored?.lng || -52.6152;

      const effectiveProvider = mapConfig?.provider || "osm_standard";

      const mapInstance = new maplibregl.Map({
        container: mapContainer.current,
        style: getCanonicalMapStyle(undefined, effectiveProvider),
        center: [initialLng, initialLat],
        zoom: value?.lat ? 15 : 12,
        attributionControl: false,
      });
      map.current = mapInstance;

      cleanupResize = setupMapResizeObserver(mapInstance, mapContainer.current);

      mapInstance.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      // Custom high-contrast marker element
      const markerEl = document.createElement("div");
      markerEl.className = "cursor-grab active:cursor-grabbing";
      markerEl.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="size-8 rounded-full bg-primary/20 animate-ping absolute inset-0"></div>
          <div class="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-2 border-background">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `;

      const markerInstance = new maplibregl.Marker({ element: markerEl, draggable: true })
        .setLngLat([initialLng, initialLat])
        .addTo(mapInstance);
      marker.current = markerInstance;

      // Ao arrastar o pino, aciona reverse geocoding
      markerInstance.on("dragend", async () => {
        const lngLat = markerInstance.getLngLat();
        if (lngLat) {
          const lat = Number(lngLat.lat.toFixed(6));
          const lng = Number(lngLat.lng.toFixed(6));
          try {
            const rev = await reverseGeocode({ data: { lat, lng } });
            const newText = rev.fullAddress || query;
            setQuery(newText);
            onChange?.({
              ...value,
              text: newText,
              lat,
              lng,
              street: rev.street,
              number: rev.number,
              neighborhood: rev.neighborhood,
              city: rev.city,
              state: rev.state,
              cep: rev.zipCode || value?.cep,
            });
            toast.success("Ponto no mapa reposicionado com precisão!");
          } catch {
            onChange?.({ ...value, text: query, lat, lng });
          }
        }
      });
    });

    return () => {
      isMounted = false;
      cleanupResize?.();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const updateMapPosition = (lat: number, lng: number) => {
    if (map.current && marker.current) {
      map.current.flyTo({ center: [lng, lat], zoom: 16, essential: true });
      marker.current.setLngLat([lng, lat]);
    }
  };

  // 1. Autopreenchimento de CEP com BrasilAPI v2 + ViaCEP
  const handleCepLookup = async () => {
    const clean = cepInput.replace(/\D/g, "");
    if (clean.length !== 8) {
      toast.error("Informe um CEP de 8 dígitos.");
      return;
    }

    setIsSearchingCep(true);
    try {
      const res = await lookupCep({ data: { cep: clean } });
      const newText = res.fullAddress;
      setQuery(newText);

      const lat = res.latitude ?? value?.lat;
      const lng = res.longitude ?? value?.lng;

      onChange?.({
        ...value,
        text: newText,
        cep: clean,
        street: res.street,
        neighborhood: res.neighborhood,
        city: res.city,
        state: res.state,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
      });

      if (lat && lng) {
        updateMapPosition(lat, lng);
      }

      toast.success(`Endereço localizado via ${res.provider === "brasilapi_v2" ? "BrasilAPI" : "ViaCEP"}!`);
    } catch (err: any) {
      toast.error(err.message || "CEP não encontrado.");
    } finally {
      setIsSearchingCep(false);
    }
  };

  // 2. Busca por texto livre (Forward Geocode)
  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await parseAddressWithAI({ data: { rawText: query } });
      if (res.latitude && res.longitude) {
        updateMapPosition(res.latitude, res.longitude);
      }

      onChange?.({
        ...value,
        text: res.fullAddress || query,
        cep: res.cep || value?.cep,
        street: res.street,
        number: res.number,
        neighborhood: res.neighborhood,
        city: res.city,
        state: res.state,
        lat: res.latitude ?? undefined,
        lng: res.longitude ?? undefined,
      });

      toast.success("Localização encontrada e fixada no mapa!");
    } catch (e: any) {
      toast.error("Não foi possível geocodificar este endereço.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Autopreenchimento Inteligente por IA (Colar Texto)
  const handleApplyAiAddress = async () => {
    if (!aiText.trim()) return;
    setIsParsingAi(true);
    try {
      const res = await parseAddressWithAI({ data: { rawText: aiText } });
      setQuery(res.fullAddress);
      if (res.cep) setCepInput(res.cep);

      if (res.latitude && res.longitude) {
        updateMapPosition(res.latitude, res.longitude);
      }

      onChange?.({
        ...value,
        text: res.fullAddress,
        cep: res.cep,
        street: res.street,
        number: res.number,
        neighborhood: res.neighborhood,
        city: res.city,
        state: res.state,
        lat: res.latitude ?? undefined,
        lng: res.longitude ?? undefined,
      });

      setShowAiPaste(false);
      setAiText("");
      toast.success("Endereço decomposto e posicionado no mapa com sucesso!");
    } catch (err: any) {
      toast.error("Falha ao analisar endereço por IA.");
    } finally {
      setIsParsingAi(false);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Linha Superior: CEP Autopreenchimento + Ação de IA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="w-full sm:w-44 relative">
          <Input
            value={cepInput}
            onChange={(e) => {
              const formatted = formatCep(e.target.value);
              setCepInput(formatted);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCepLookup())}
            placeholder="CEP 00000-000"
            maxLength={9}
            className="h-10 rounded-xl text-xs font-mono bg-card"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCepLookup}
          disabled={isSearchingCep || !cepInput}
          className="h-10 rounded-xl text-xs font-bold gap-1.5 shrink-0"
        >
          {isSearchingCep ? <Loader2 className="size-3.5 animate-spin" /> : <Navigation className="size-3.5 text-primary" />}
          <span>Buscar CEP</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAiPaste(!showAiPaste)}
          className="h-10 rounded-xl text-xs font-bold gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
        >
          <Zap className="size-3.5 text-amber-500" />
          <span>Colar com IA</span>
        </Button>
      </div>

      {/* Caixa Expansível de Colar Endereço Livre com IA */}
      {showAiPaste && (
        <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-2.5 animate-in fade-in slide-in-from-top-2">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Zap className="size-3.5 text-primary" />
            Autopreenchimento Cirúrgico por IA (Cole o endereço completo)
          </span>
          <div className="flex gap-2">
            <Input
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="Ex: Av. Getúlio Vargas 1200, Centro, Chapecó - SC, CEP 89801-000"
              className="h-9 text-xs bg-background rounded-xl flex-1"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyAiAddress())}
            />
            <Button
              type="button"
              size="sm"
              onClick={handleApplyAiAddress}
              disabled={isParsingAi || !aiText.trim()}
              className="h-9 rounded-xl font-bold text-xs shrink-0"
            >
              {isParsingAi ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              <span>Preencher</span>
            </Button>
          </div>
        </div>
      )}

      {/* Campo Principal de Endereço / Busca */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onChange?.({ ...value, text: e.target.value, lat: value?.lat, lng: value?.lng });
            }}
            placeholder="Endereço, rua, número ou ponto de referência..."
            className="pl-9 h-10 rounded-xl text-xs bg-card"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="h-10 rounded-xl px-4 text-xs font-bold gap-1.5 shrink-0"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5 text-primary" />}
          <span>Localizar</span>
        </Button>
      </div>

      {/* Mapa Real Interativo MapLibre GL (Carto Voyager / OpenStreetMap) */}
      <div className="rounded-2xl overflow-hidden border border-border/70 relative bg-muted/20 shadow-2xs">
        <div ref={mapContainer} className="w-full h-[220px]" />
        {!value?.lat && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-4 text-center z-10 pointer-events-none">
            <p className="text-xs font-medium text-muted-foreground bg-card p-2.5 rounded-xl border border-border/70 shadow-xs max-w-xs">
              Digite seu CEP ou endereço e clique em <strong>Localizar</strong> para fixar o ponto exato no mapa.
            </p>
          </div>
        )}
      </div>

      {/* Coordenadas & Status de Precisão */}
      {value?.lat && value?.lng && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 font-mono">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="size-3" /> Ponto fixado no mapa
          </span>
          <span>
            {value.lat}, {value.lng}
          </span>
        </div>
      )}
    </div>
  );
};
