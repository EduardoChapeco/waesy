// EmptyState: Form de endereço validado com fallback de mapa
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Navigation,
  Loader2,
  X,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Building,
  Home,
  Briefcase,
  Heart,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { formatCep, formatPhone } from "@/lib/document-validator";
import { cn } from "@/lib/utils";
import { lookupCep, reverseGeocode } from "@/services/public-apis.functions";
import { useQuery } from "@tanstack/react-query";
import { getPublicMapConfig } from "@/services/integrations.functions";
import { getCanonicalMapStyle, setupMapResizeObserver } from "@/lib/map-styles";
import { toast } from "sonner";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import type { UserAddressDTO } from "@/services/addresses.functions";

export interface CanonicalAddressFormProps {
  initialData?: UserAddressDTO | null;
  onSave: (data: {
    id?: string;
    label: string;
    recipient_name?: string | null;
    recipient_phone?: string | null;
    zipcode: string;
    street: string;
    number: string;
    has_no_number: boolean;
    complement?: string | null;
    reference_point?: string | null;
    neighborhood: string;
    city: string;
    state: string;
    latitude?: number | null;
    longitude?: number | null;
    is_default: boolean;
    is_apartment: boolean;
    block_tower?: string | null;
    intercom_code?: string | null;
    address_type: "residential" | "commercial" | "rural" | "other";
    icon: "home" | "building" | "briefcase" | "heart" | "map_pin";
    instructions?: string | null;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  defaultRecipientName?: string;
  defaultRecipientPhone?: string;
  isFirstAddress?: boolean;
}

export function CanonicalAddressForm({
  initialData,
  onSave,
  onCancel,
  isSubmitting = false,
  defaultRecipientName = "",
  defaultRecipientPhone = "",
  isFirstAddress = false,
}: CanonicalAddressFormProps) {
  const isEditing = Boolean(initialData?.id);

  // Form State
  const [label, setLabel] = useState(initialData?.label || "Minha Casa");
  const [icon, setIcon] = useState<"home" | "building" | "briefcase" | "heart" | "map_pin">(
    initialData?.icon || "home"
  );
  const [addressType, setAddressType] = useState<"residential" | "commercial" | "rural" | "other">(
    initialData?.address_type || "residential"
  );
  const [recipientName, setRecipientName] = useState(
    initialData?.recipient_name || defaultRecipientName || ""
  );
  const [recipientPhone, setRecipientPhone] = useState(
    initialData?.recipient_phone ? formatPhone(initialData.recipient_phone) : defaultRecipientPhone ? formatPhone(defaultRecipientPhone) : ""
  );
  const [zipcode, setZipcode] = useState(initialData?.zipcode ? formatCep(initialData.zipcode) : "");
  const [street, setStreet] = useState(initialData?.street || "");
  const [number, setNumber] = useState(initialData?.number || "");
  const [hasNoNumber, setHasNoNumber] = useState(
    Boolean(initialData?.has_no_number || initialData?.number === "S/N")
  );
  const [complement, setComplement] = useState(initialData?.complement || "");
  const [referencePoint, setReferencePoint] = useState(initialData?.reference_point || "");
  const [neighborhood, setNeighborhood] = useState(initialData?.neighborhood || "");
  const [city, setCity] = useState(initialData?.city || "");
  const [state, setState] = useState(initialData?.state || "");
  const [latitude, setLatitude] = useState<number | null>(initialData?.latitude || null);
  const [longitude, setLongitude] = useState<number | null>(initialData?.longitude || null);
  const [isApartment, setIsApartment] = useState(Boolean(initialData?.is_apartment));
  const [blockTower, setBlockTower] = useState(initialData?.block_tower || "");
  const [intercomCode, setIntercomCode] = useState(initialData?.intercom_code || "");
  const [instructions, setInstructions] = useState(initialData?.instructions || "");
  const [isDefault, setIsDefault] = useState(Boolean(initialData?.is_default || isFirstAddress));

  // Geolocation & Interactive States
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // MapLibre Interactive State
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);

  const { data: mapConfig, isLoading: isMapConfigLoading } = useQuery({
    queryKey: ["public-map-config"],
    queryFn: () => getPublicMapConfig(),
    staleTime: 5 * 60 * 1000,
  });

  const effectiveProvider = mapConfig?.provider || "osm_standard";

  // Inicializa mapa quando o componente é montado
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    let isMounted = true;
    let cleanupResize: (() => void) | undefined;

    import("maplibre-gl").then((maplibreglModule: any) => {
      if (!isMounted || !mapContainerRef.current || mapInstanceRef.current) return;
      import("maplibre-gl/dist/maplibre-gl.css" as any).catch(() => {});
      const maplibregl: any = maplibreglModule.default || maplibreglModule;

      const defaultLat = latitude || -27.1004;
      const defaultLng = longitude || -52.6152;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: getCanonicalMapStyle(undefined, effectiveProvider),
        center: [defaultLng, defaultLat],
        zoom: latitude ? 15 : 12,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      cleanupResize = setupMapResizeObserver(map, mapContainerRef.current);
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      // Custom high-contrast marker element
      const markerEl = document.createElement("div");
      markerEl.className = "cursor-grab active:cursor-grabbing";
      markerEl.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="size-8 rounded-full bg-primary/20 absolute inset-0"></div>
          <div class="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: markerEl, draggable: true })
        .setLngLat([defaultLng, defaultLat])
        .addTo(map);
      markerRef.current = marker;

      // Click no mapa reposiciona o pino
      map.on("click", async (e: any) => {
        const { lng, lat } = e.lngLat;
        marker.setLngLat([lng, lat]);
        updateCoordinatesAndReverseGeocode(lat, lng);
      });

      // Arraste do pino aciona reverse geocode no final (EARS-02)
      marker.on("dragend", async () => {
        const lngLat = marker.getLngLat();
        if (lngLat) {
          updateCoordinatesAndReverseGeocode(lngLat.lat, lngLat.lng);
        }
      });
    });

    return () => {
      isMounted = false;
      cleanupResize?.();
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  const centerMapOn = (lat: number, lng: number) => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 16, essential: true });
      markerRef.current.setLngLat([lng, lat]);
    }
  };

  const updateCoordinatesAndReverseGeocode = async (lat: number, lng: number) => {
    const fixedLat = Number(lat.toFixed(6));
    const fixedLng = Number(lng.toFixed(6));
    setLatitude(fixedLat);
    setLongitude(fixedLng);

    try {
      const rev = await reverseGeocode({ data: { lat: fixedLat, lng: fixedLng } });
      if (rev) {
        if (!street && rev.street) setStreet(rev.street);
        if (!number && !hasNoNumber && rev.number) setNumber(rev.number);
        if (!neighborhood && rev.neighborhood) setNeighborhood(rev.neighborhood);
        if (!city && rev.city) setCity(rev.city);
        if (!state && rev.state) setState(rev.state);
        if (!zipcode && rev.zipCode) setZipcode(formatCep(rev.zipCode));
        toast.success("Pino reposicionado e endereço identificado!");
      }
    } catch {
      // Coordenadas manuais preservadas
    }
  };

  // Autocomplete via CEP (EARS-01)
  const handleCepLookup = async (cepValue: string) => {
    const masked = formatCep(cepValue);
    const cleanCep = cepValue.replace(/\D/g, "");
    setZipcode(masked);

    if (cleanCep.length === 8) {
      setIsCepLoading(true);
      try {
        const res = await lookupCep({ data: { cep: cleanCep } });
        if (res.street) setStreet(res.street);
        if (res.neighborhood) setNeighborhood(res.neighborhood);
        if (res.city) setCity(res.city);
        if (res.state) setState(res.state);

        if (res.latitude && res.longitude) {
          const lat = Number(res.latitude.toFixed(6));
          const lng = Number(res.longitude.toFixed(6));
          setLatitude(lat);
          setLongitude(lng);
          centerMapOn(lat, lng);
        }

        toast.success(`Endereço localizado via ${res.provider === "brasilapi_v2" ? "BrasilAPI" : "ViaCEP"}!`);
      } catch {
        toast.error("CEP não localizado automaticamente. Preencha os dados do endereço.");
      } finally {
        setIsCepLoading(false);
      }
    }
  };

  // Complete com minha localização (GPS - Paridade Mercado Livre EARS-01)
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada pelo seu dispositivo.");
      return;
    }

    setIsLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocatingGPS(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        centerMapOn(lat, lng);
        await updateCoordinatesAndReverseGeocode(lat, lng);
        toast.success("Localização atual identificada via GPS!");
      },
      (err) => {
        setIsLocatingGPS(false);
        console.warn("[geolocation] Erro:", err.message);
        toast.error("Não foi possível obter sua localização. Permissão negada ou sinal indisponível.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePhoneChange = (val: string) => {
    setRecipientPhone(formatPhone(val));
  };

  const handleToggleNoNumber = (checked: boolean) => {
    setHasNoNumber(checked);
    if (checked) {
      setNumber("S/N");
    } else {
      if (number === "S/N") setNumber("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const cleanZip = zipcode.replace(/\D/g, "");
    if (cleanZip.length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return;
    }

    if (!street.trim()) {
      toast.error("Rua / Avenida é obrigatório.");
      return;
    }

    if (!hasNoNumber && !number.trim()) {
      toast.error("Informe o número do imóvel ou marque 'Sem número'.");
      return;
    }

    if (!neighborhood.trim() || !city.trim() || !state.trim()) {
      toast.error("Bairro, Cidade e Estado (UF) são obrigatórios.");
      return;
    }

    if (!recipientName.trim()) {
      toast.error("Informe o nome de quem vai receber o pedido.");
      return;
    }

    const effectiveNumber = hasNoNumber || !number.trim() ? "S/N" : number.trim();

    await onSave({
      id: initialData?.id,
      label: label.trim() || "Principal",
      recipient_name: recipientName.trim(),
      recipient_phone: recipientPhone.trim() || null,
      zipcode: cleanZip,
      street: street.trim(),
      number: effectiveNumber,
      has_no_number: hasNoNumber,
      complement: complement.trim() || null,
      reference_point: referencePoint.trim() || null,
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      state: state.trim().toUpperCase(),
      latitude,
      longitude,
      is_default: isDefault,
      is_apartment: isApartment,
      block_tower: blockTower.trim() || null,
      intercom_code: intercomCode.trim() || null,
      address_type: addressType,
      icon,
      instructions: instructions.trim() || null,
    });
  };

  const getIconElement = (iconName: string) => {
    switch (iconName) {
      case "building":
        return <Building className="size-4" />;
      case "briefcase":
        return <Briefcase className="size-4" />;
      case "heart":
        return <Heart className="size-4" />;
      case "map_pin":
        return <MapPin className="size-4" />;
      case "home":
      default:
        return <Home className="size-4" />;
    }
  };

  // Banner informativo de localização resolvida (Mercado Livre Image 1)
  const resolvedLocationBanner =
    state && city
      ? `${neighborhood ? `${neighborhood}, ` : ""}${city} - ${state.toUpperCase()}`
      : null;

  const iconOptions: Array<"home" | "building" | "briefcase" | "heart" | "map_pin"> = [
    "home",
    "building",
    "briefcase",
    "heart",
    "map_pin",
  ];

  return (
    <div className="bg-card rounded-lg border border-border/80 shadow-xs overflow-hidden transition-colors motion-reduce:transition-none">
      {/* ── Topo do Formulário ── */}
      <div className="px-4 sm:px-6 py-4 bg-muted/20 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="size-5 text-primary" strokeWidth={2} />
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            {isEditing ? "Editar Endereço" : "Adicione um Endereço"}
          </h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="size-11 min-h-11 min-w-11 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Fechar formulário de endereço"
        >
          <X className="size-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        {/* ── 1. Gatilho de Topo: "Complete com minha localização" (Mercado Livre Image 1) ── */}
        <div className="w-full">
          <Button
            type="button"
            variant="outline"
            onClick={handleUseCurrentLocation}
            disabled={isLocatingGPS}
            className="w-full h-12 min-h-12 rounded-lg border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isLocatingGPS ? (
              <>
                <Loader2 className="size-4 animate-spin text-primary" />
                <span>Identificando sua localização...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4 text-primary" />
                <span>Complete com minha localização</span>
              </>
            )}
          </Button>
        </div>

        {/* ── 2. Apelido e Ícone ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs font-semibold text-foreground">
              Identificação do Endereço *
            </Label>
            <Input
              placeholder="Ex: Minha Casa, Trabalho, Apartamento Praia"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-11 min-h-11 rounded-lg bg-background text-xs font-medium"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">Ícone Representativo</Label>
            <div className="flex items-center gap-2 pt-1">
              {iconOptions.length > 0 ? (
                iconOptions.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={cn(
                      "size-11 min-h-11 min-w-11 rounded-lg border flex items-center justify-center cursor-pointer transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-primary",
                      icon === ic
                        ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                        : "bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    title={`Ícone ${ic}`}
                    aria-label={`Selecionar ícone ${ic}`}
                  >
                    {getIconElement(ic)}
                  </button>
                ))
              ) : null}
            </div>
          </div>
        </div>

        {/* ── 3. CEP com Busca Automática e Link "Não sei meu CEP" (Mercado Livre Image 1) ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
              <span>CEP *</span>
              {isCepLoading && (
                <span className="text-xs text-primary flex items-center gap-1 font-normal">
                  <Loader2 className="size-3 animate-spin text-primary" /> Buscando no banco nacional...
                </span>
              )}
            </Label>
            <a
              href="https://buscacepinter.correios.com.br/app/endereco/index.php"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-11 px-2 text-xs text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            >
              <span>Não sei meu CEP</span>
              <ExternalLink className="size-3" />
            </a>
          </div>

          <div className="relative">
            <Input
              required
              type="text"
              inputMode="numeric"
              placeholder="00000-000"
              maxLength={9}
              value={zipcode}
              onChange={(e) => handleCepLookup(e.target.value)}
              className="h-11 min-h-11 rounded-lg bg-background text-xs font-mono font-medium focus-visible:ring-2 focus-visible:ring-primary"
            />
            <Navigation className="size-4 text-muted-foreground/40 absolute right-4 top-4 pointer-events-none" />
          </div>

          {/* Banner de Feedback de Região Localizada (Mercado Livre Image 1) */}
          {resolvedLocationBanner && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-foreground font-medium">
              <MapPin className="size-4 text-primary shrink-0" />
              <span>{resolvedLocationBanner}</span>
            </div>
          )}
        </div>

        {/* ── 4. Rua / Logradouro ── */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">Rua / Avenida *</Label>
          <Input
            required
            placeholder="Ex: Avenida Nereu Ramos, Rua das Flores"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            className="h-11 min-h-11 rounded-lg bg-background text-xs"
          />
        </div>

        {/* ── 5. Número & Sem Número + Complemento (Mercado Livre Image 1) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <div className="space-y-2 sm:col-span-1">
            <Label className="text-xs font-semibold text-foreground">Número *</Label>
            <div className="space-y-2">
              <Input
                required={!hasNoNumber}
                disabled={hasNoNumber}
                placeholder="Ex: 576"
                value={hasNoNumber ? "S/N" : number}
                onChange={(e) => setNumber(e.target.value)}
                className={cn(
                  "h-11 min-h-11 rounded-lg bg-background text-xs",
                  hasNoNumber && "bg-muted text-muted-foreground cursor-not-allowed opacity-80"
                )}
              />
              <label className="flex items-center gap-2 min-h-11 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasNoNumber}
                  onChange={(e) => handleToggleNoNumber(e.target.checked)}
                  className="size-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                />
                <span className="text-xs text-foreground font-medium">Sem número</span>
              </label>
            </div>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs font-semibold text-foreground">Complemento (opcional)</Label>
            <Input
              placeholder="Ex: 201, Apto 402, Bloco B"
              value={complement}
              onChange={(e) => setComplement(e.target.value)}
              className="h-11 min-h-11 rounded-lg bg-background text-xs"
            />
          </div>
        </div>

        {/* ── 6. Bairro, Cidade e Estado ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">Bairro *</Label>
            <Input
              required
              placeholder="Ex: Centro"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="h-11 min-h-11 rounded-lg bg-background text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">Cidade *</Label>
            <Input
              required
              placeholder="Ex: Chapecó"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-11 min-h-11 rounded-lg bg-background text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">Estado (UF) *</Label>
            <Input
              required
              maxLength={2}
              placeholder="SC"
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase())}
              className="h-11 min-h-11 rounded-lg bg-background text-xs uppercase font-mono font-medium"
            />
          </div>
        </div>

        {/* ── 7. SEÇÃO: DADOS DE QUEM VAI RECEBER (Mercado Livre Image 1) ── */}
        <div className="p-4 rounded-lg bg-muted/20 border border-border/60 space-y-4">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground">Dados de quem vai receber</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Ligaremos se houver algum problema com a entrega.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Nome completo *</Label>
              <Input
                required
                placeholder="Ex: Eduardo Antonio Ramos"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="h-11 min-h-11 rounded-lg bg-background text-xs font-medium"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Telefone de contato *</Label>
              <div className="flex items-center gap-2">
                <div className="h-11 min-h-11 px-3 rounded-lg border border-border bg-muted/40 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                  +55
                </div>
                <Input
                  required
                  type="tel"
                  inputMode="numeric"
                  placeholder="(49) 99171-6233"
                  maxLength={15}
                  value={recipientPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="h-11 min-h-11 rounded-lg bg-background text-xs font-mono font-medium flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 8. Mapa Interativo com Pino Ajustável e Tela Cheia ── */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Ponto no Mapa & Precisão do Entregador</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMapFullscreen(!isMapFullscreen)}
              className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-border/60 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isMapFullscreen ? <Minimize2 className="size-4 mr-1" /> : <Maximize2 className="size-4 mr-1" />}
              <span>{isMapFullscreen ? "Restaurar" : "Tela Cheia"}</span>
            </Button>
          </div>

          <div
            className={cn(
              "relative rounded-lg border border-border/60 overflow-hidden bg-muted/20 transition-colors motion-reduce:transition-none",
              isMapFullscreen
                ? "fixed inset-0 z-50 rounded-none bg-background p-4 flex flex-col justify-between"
                : "h-56 sm:h-64 w-full"
            )}
          >
            <div ref={mapContainerRef} className="w-full h-full rounded-lg" />

            {isMapFullscreen && (
              <div className="absolute top-6 right-6 z-10 flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setIsMapFullscreen(false)}
                  className="rounded-lg h-11 min-h-11 px-4 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer border border-border"
                >
                  <CheckCircle2 className="size-4 mr-2" /> Confirmar Ponto e Fechar
                </Button>
              </div>
            )}

            <div className="absolute bottom-2 left-2 z-10 bg-background/90 px-3 py-1 rounded-md border border-border/60 text-xs font-mono text-muted-foreground flex items-center gap-2">
              <span>Arraste o pino para refinar o local</span>
              {latitude && (
                <span>• GPS: {latitude}, {longitude}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── 9. Condomínio, Portaria e Instruções de Entrega ── */}
        <div className="p-4 rounded-lg bg-muted/20 border border-border/60 space-y-3">
          <div className="flex items-center justify-between min-h-11">
            <div className="flex items-center gap-2">
              <Building className="size-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Condomínio, Edifício ou Apartamento?</span>
            </div>
            <input
              type="checkbox"
              checked={isApartment}
              onChange={(e) => setIsApartment(e.target.checked)}
              className="size-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          {isApartment && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">Bloco / Torre / Prédio</Label>
                <Input
                  placeholder="Ex: Bloco 2, Torre Norte"
                  value={blockTower}
                  onChange={(e) => setBlockTower(e.target.value)}
                  className="h-11 min-h-11 rounded-lg bg-background text-xs font-medium"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground">Interfone / Ramal</Label>
                <Input
                  placeholder="Ex: Apto 402, Interfone 12"
                  value={intercomCode}
                  onChange={(e) => setIntercomCode(e.target.value)}
                  className="h-11 min-h-11 rounded-lg bg-background text-xs font-medium"
                />
              </div>
            </div>
          )}

          <div className="space-y-1 pt-1">
            <Label className="text-xs font-semibold text-muted-foreground">
              Ponto de Referência ou Instruções para o Entregador
            </Label>
            <Input
              placeholder="Ex: Portão branco ao lado da padaria, deixar na portaria 24h"
              value={referencePoint}
              onChange={(e) => setReferencePoint(e.target.value)}
              className="h-11 min-h-11 rounded-lg bg-background text-xs"
            />
          </div>
        </div>

        {/* ── 10. Switch: "Escolher como predefinido" (Mercado Livre Image 1) ── */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 min-h-11">
          <div>
            <span className="text-xs font-bold block text-foreground">Escolher como predefinido</span>
            <span className="text-xs text-muted-foreground block">
              Utilizado automaticamente como primeira escolha no checkout e serviços
            </span>
          </div>
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="size-5 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
        </div>

        {/* ── 11. Rodapé de Ações ── */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg h-11 min-h-11 px-4 text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg h-11 min-h-11 px-6 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin text-background" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                <span>Salvar</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
