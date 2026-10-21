import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  getUserAddresses,
  saveUserAddress,
  deleteUserAddress,
  UserAddressDTO,
} from "@/services/addresses.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MapPin,
  Star,
  Trash2,
  Plus,
  CheckCircle2,
  Navigation,
  X,
  Loader2,
  Building,
  Home,
  Briefcase,
  Heart,
  Maximize2,
  Minimize2,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { EmptyState } from "@/components/state/states";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { formatCep } from "@/lib/document-validator";
import { cn } from "@/lib/utils";
import { lookupCep, reverseGeocode, parseAddressWithAI } from "@/services/public-apis.functions";
import { useQuery } from "@tanstack/react-query";
import { getPublicMapConfig } from "@/services/integrations.functions";
import { getCanonicalMapStyle, setupMapResizeObserver } from "@/lib/map-styles";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";

export const Route = createFileRoute("/_store/conta/enderecos")({
  head: () => ({ meta: [{ title: "Meus Endereços | Waesy" }] }),
  loader: async () => {
    try {
      return (await getUserAddresses()) || [];
    } catch (err) {
      console.error("[loader:_store.conta.enderecos] Unhandled loader error:", err);
      return [];
    }
  },
  component: AddressesPage,
});

function AddressesPage() {
  const addresses = (Route.useLoaderData() as UserAddressDTO[]) || [];
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    label: "Minha Casa",
    icon: "home" as "home" | "building" | "briefcase" | "heart" | "map_pin",
    address_type: "residential" as "residential" | "commercial" | "rural" | "other",
    recipient_name: "",
    recipient_phone: "",
    zipcode: "",
    street: "",
    number: "",
    complement: "",
    reference_point: "",
    neighborhood: "",
    city: "",
    state: "",
    latitude: null as number | null,
    longitude: null as number | null,
    is_apartment: false,
    block_tower: "",
    intercom_code: "",
    instructions: "",
    is_default: false,
  });

  // MapLibre Interactive State
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);

  const { data: mapConfig } = useQuery({
    queryKey: ["public-map-config"],
    queryFn: () => getPublicMapConfig(),
    staleTime: 5 * 60 * 1000,
  });

  const effectiveProvider = mapConfig?.provider || "osm_standard";

  // Inicializa mapa quando o formulário é aberto
  useEffect(() => {
    if (!isFormOpen || !mapContainerRef.current || mapInstanceRef.current) return;
    let isMounted = true;
    let cleanupResize: (() => void) | undefined;

    import("maplibre-gl").then((maplibreglModule: any) => {
      if (!isMounted || !mapContainerRef.current || mapInstanceRef.current) return;
      import("maplibre-gl/dist/maplibre-gl.css" as any).catch(() => {});
      const maplibregl: any = maplibreglModule.default || maplibreglModule;

      const defaultLat = formData.latitude || -27.1004;
      const defaultLng = formData.longitude || -52.6152;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: getCanonicalMapStyle(undefined, effectiveProvider),
        center: [defaultLng, defaultLat],
        zoom: formData.latitude ? 15 : 12,
        attributionControl: false,
      });
      mapInstanceRef.current = map;

      cleanupResize = setupMapResizeObserver(map, mapContainerRef.current);

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      // Custom marker
      const markerEl = document.createElement("div");
      markerEl.className = "cursor-grab active:cursor-grabbing";
      markerEl.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="size-8 rounded-full bg-primary/20 animate-ping absolute inset-0"></div>
          <div class="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-2 border-background">
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
  }, [isFormOpen]);

  const updateCoordinatesAndReverseGeocode = async (lat: number, lng: number) => {
    const fixedLat = Number(lat.toFixed(6));
    const fixedLng = Number(lng.toFixed(6));
    setFormData((prev) => ({ ...prev, latitude: fixedLat, longitude: fixedLng }));

    try {
      const rev = await reverseGeocode({ data: { lat: fixedLat, lng: fixedLng } });
      if (rev) {
        setFormData((prev) => ({
          ...prev,
          street: prev.street || rev.street,
          number: prev.number || rev.number,
          neighborhood: prev.neighborhood || rev.neighborhood,
          city: prev.city || rev.city,
          state: prev.state || rev.state,
          zipcode: prev.zipcode || (rev.zipCode ? formatCep(rev.zipCode) : prev.zipcode),
        }));
        toast.success("Pino reposicionado e endereço atualizado!");
      }
    } catch {
      // Mantém coordenadas manuais
    }
  };

  const centerMapOn = (lat: number, lng: number) => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo({ center: [lng, lat], zoom: 16, essential: true });
      markerRef.current.setLngLat([lng, lat]);
    }
  };

  // Autocomplete via CEP (EARS-01)
  const handleCepLookup = async (cepValue: string) => {
    const masked = formatCep(cepValue);
    const cleanCep = cepValue.replace(/\D/g, "");
    setFormData((prev) => ({ ...prev, zipcode: masked }));

    if (cleanCep.length === 8) {
      setIsCepLoading(true);
      try {
        const res = await lookupCep({ data: { cep: cleanCep } });
        setFormData((prev) => ({
          ...prev,
          street: res.street || prev.street,
          neighborhood: res.neighborhood || prev.neighborhood,
          city: res.city || prev.city,
          state: res.state || prev.state,
          latitude: res.latitude ?? prev.latitude,
          longitude: res.longitude ?? prev.longitude,
        }));

        if (res.latitude && res.longitude) {
          centerMapOn(res.latitude, res.longitude);
        }

        toast.success(`Endereço localizado via ${res.provider === "brasilapi_v2" ? "BrasilAPI" : "ViaCEP"}!`);
      } catch (e: any) {
        toast.error("CEP não localizado automaticamente. Preencha os dados do endereço.");
      } finally {
        setIsCepLoading(false);
      }
    }
  };

  // Usar localização atual GPS (EARS-02)
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
        toast.error("Não foi possível obter sua localização. Permissão negada ou sinal indisponível.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
      label: "Minha Casa",
      icon: "home",
      address_type: "residential",
      recipient_name: "",
      recipient_phone: "",
      zipcode: "",
      street: "",
      number: "",
      complement: "",
      reference_point: "",
      neighborhood: "",
      city: "",
      state: "",
      latitude: null,
      longitude: null,
      is_apartment: false,
      block_tower: "",
      intercom_code: "",
      instructions: "",
      is_default: addresses.length === 0,
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (addr: UserAddressDTO) => {
    setEditingId(addr.id);
    setFormData({
      label: addr.label || "Principal",
      icon: (addr.icon as any) || "home",
      address_type: (addr.address_type as any) || "residential",
      recipient_name: addr.recipient_name || "",
      recipient_phone: addr.recipient_phone || "",
      zipcode: formatCep(addr.zipcode || ""),
      street: addr.street || "",
      number: addr.number || "",
      complement: addr.complement || "",
      reference_point: addr.reference_point || "",
      neighborhood: addr.neighborhood || "",
      city: addr.city || "",
      state: addr.state || "",
      latitude: addr.latitude || null,
      longitude: addr.longitude || null,
      is_apartment: Boolean(addr.is_apartment),
      block_tower: addr.block_tower || "",
      intercom_code: addr.intercom_code || "",
      instructions: addr.instructions || "",
      is_default: addr.is_default,
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.zipcode || !formData.street || !formData.number || !formData.neighborhood || !formData.city) {
      toast.error("Preencha todos os campos obrigatórios (*).");
      return;
    }

    setIsSubmitting(true);
    try {
      await saveUserAddress({
        data: {
          id: editingId || undefined,
          label: formData.label.trim() || "Principal",
          icon: formData.icon,
          address_type: formData.address_type,
          recipient_name: formData.recipient_name || null,
          recipient_phone: formData.recipient_phone || null,
          zipcode: formData.zipcode,
          street: formData.street,
          number: formData.number,
          complement: formData.complement || null,
          reference_point: formData.reference_point || null,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state.toUpperCase(),
          latitude: formData.latitude,
          longitude: formData.longitude,
          is_apartment: formData.is_apartment,
          block_tower: formData.block_tower || null,
          intercom_code: formData.intercom_code || null,
          instructions: formData.instructions || null,
          is_default: formData.is_default || addresses.length === 0,
        },
      });

      toast.success(editingId ? "Endereço atualizado com sucesso!" : "Novo endereço cadastrado com sucesso!");
      setIsFormOpen(false);
      setEditingId(null);
      router.invalidate();
    } catch (error: unknown) {
      toast.error(
        (error instanceof Error ? error.message : String(error)) || "Erro ao salvar endereço.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUserAddress({ data: { id } });
      toast.success("Endereço excluído com sucesso.");
      router.invalidate();
    } catch {
      toast.error("Erro ao excluir endereço.");
    }
  };

  const handleSetDefault = async (addr: UserAddressDTO) => {
    try {
      await saveUserAddress({
        data: {
          ...addr,
          id: addr.id,
          is_default: true,
          zipcode: addr.zipcode,
          street: addr.street,
          number: addr.number,
          neighborhood: addr.neighborhood,
          city: addr.city,
          state: addr.state,
          address_type: addr.address_type || "residential",
          icon: addr.icon || "home",
        },
      });
      toast.success("Endereço padrão atualizado.");
      router.invalidate();
    } catch {
      toast.error("Erro ao atualizar endereço padrão.");
    }
  };

  const getIconElement = (iconName?: string) => {
    switch (iconName) {
      case "building":
        return <Building className="size-4.5" />;
      case "briefcase":
        return <Briefcase className="size-4.5" />;
      case "heart":
        return <Heart className="size-4.5" />;
      case "map_pin":
        return <MapPin className="size-4.5" />;
      case "home":
      default:
        return <Home className="size-4.5" />;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-safe pb-24 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
      {/* ── 0. Native Mobile Header (<768px) ── */}
      <NativeMobileHeader
        title="Meus Endereços"
        fallbackHref="/conta"
        badge={
          addresses.length > 0 ? (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-1 rounded-full">
              {addresses.length}
            </Badge>
          ) : null
        }
        rightActions={
          !isFormOpen ? (
            <Button
              size="sm"
              onClick={handleOpenNew}
              className="rounded-lg h-11 min-h-11 px-4 text-xs font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus className="size-4" />
              <span>Novo</span>
            </Button>
          ) : undefined
        }
      />

      {/* ── 1. Desktop Inpage Header (>=768px) ── */}
      <div className="hidden md:flex items-center justify-between pb-4 border-b border-border/40">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Meus Endereços</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Gerencie seus endereços para entrega, serviços e faturamento
          </p>
        </div>
        {!isFormOpen && (
          <Button
            onClick={handleOpenNew}
            className="rounded-lg h-11 min-h-11 px-4 text-xs font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="size-4" />
            <span>Novo Endereço</span>
          </Button>
        )}
      </div>

      {/* ── 2. Formulário Estruturado com Mapa Integrado (EARS-01 / EARS-02) ── */}
      {isFormOpen && (
        <div className="bg-card rounded-none sm:rounded-xl border-y sm:border border-border/80 shadow-xs overflow-hidden transition-all animate-in fade-in-50 duration-200">
          <div className="px-4 sm:px-6 py-4 bg-muted/20 border-b border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="size-5 text-primary" strokeWidth={2} />
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                {editingId ? "Editar Endereço" : "Novo Endereço"}
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setIsFormOpen(false);
                setEditingId(null);
              }}
              className="size-11 min-h-11 min-w-11 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            {/* Linha 0: Apelido + Seleção de Ícone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  Identificação do Endereço *
                </label>
                <Input
                  placeholder="Ex: Minha Casa, Escritório Central, Apartamento Praia"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="h-11 rounded-lg bg-background border-border/70 text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Ícone Representativo</label>
                <div className="flex items-center gap-2 pt-0.5">
                  {(["home", "building", "briefcase", "heart", "map_pin"] as const).map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: ic })}
                      className={cn(
                        "size-11 min-h-11 min-w-11 rounded-lg border flex items-center justify-center cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                        formData.icon === ic
                          ? "bg-foreground text-background border-foreground font-bold"
                          : "bg-muted/40 border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      title={`Ícone ${ic}`}
                    >
                      {getIconElement(ic)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Linha 1: CEP com Busca Automática + Botão GPS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>CEP *</span>
                  {isCepLoading && (
                    <span className="text-[10px] text-primary flex items-center gap-1 font-normal">
                      <Loader2 className="size-3 animate-spin" /> Buscando...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Input
                    required
                    type="text"
                    inputMode="numeric"
                    placeholder="00000-000"
                    maxLength={9}
                    value={formData.zipcode}
                    onChange={(e) => handleCepLookup(e.target.value)}
                    className="h-11 rounded-lg bg-background border-border/70 text-xs font-mono focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <Navigation className="size-4 text-muted-foreground/50 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>

              {/* Rua / Logradouro */}
              <div className="space-y-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Rua ou Avenida *</label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocatingGPS}
                    className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {isLocatingGPS ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Navigation className="size-3" />
                    )}
                    <span>Puxar via GPS</span>
                  </button>
                </div>
                <Input
                  required
                  placeholder="Ex: Avenida Brasil, Rua das Flores"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="h-11 rounded-lg bg-background border-border/70 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* Linha 2: Número e Complemento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1 sm:col-span-1">
                <label className="text-xs font-semibold text-foreground">Número *</label>
                <Input
                  required
                  placeholder="Ex: 120"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  className="h-11 rounded-lg bg-background border-border/70 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground">Complemento (Opcional)</label>
                <Input
                  placeholder="Ex: Apto 402, Bloco B, Casa dos Fundos"
                  value={formData.complement}
                  onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                  className="h-11 rounded-lg bg-background border-border/70 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* Linha 3: Bairro, Cidade, Estado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Bairro *</label>
                <Input
                  required
                  placeholder="Ex: Centro"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="h-11 rounded-lg bg-background border-border/70 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Cidade *</label>
                <Input
                  required
                  placeholder="Ex: Chapecó"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="h-11 rounded-lg bg-background border-border/70 text-xs focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Estado (UF) *</label>
                <Input
                  required
                  maxLength={2}
                  placeholder="SC"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  className="h-11 rounded-lg bg-background border-border/70 text-xs uppercase font-mono focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            {/* Linha 4: Mapa Interativo com Pino Ajustável e Fullscreen (EARS-02) */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Ponto no Mapa & Precisão Geográfica</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-border/60 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {isMapFullscreen ? <Minimize2 className="size-3.5 mr-1" /> : <Maximize2 className="size-3.5 mr-1" />}
                    <span>{isMapFullscreen ? "Restaurar" : "Tela Cheia"}</span>
                  </Button>
                </div>
              </div>

              <div
                className={cn(
                  "relative rounded-xl border border-border/60 overflow-hidden bg-muted/20 transition-all",
                  isMapFullscreen
                    ? "fixed inset-0 z-50 rounded-none bg-background p-4 flex flex-col justify-between"
                    : "h-56 sm:h-64 w-full",
                )}
              >
                <div ref={mapContainerRef} className="w-full h-full rounded-lg" />

                {isMapFullscreen && (
                  <div className="absolute top-6 right-6 z-10 flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => setIsMapFullscreen(false)}
                      className="rounded-lg h-11 min-h-11 px-4 text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer shadow-md"
                    >
                      <CheckCircle2 className="size-4 mr-2" /> Confirmar Ponto e Fechar
                    </Button>
                  </div>
                )}

                <div className="absolute bottom-2 left-2 z-10 bg-background/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-border/60 text-[10px] font-mono text-muted-foreground flex items-center gap-2">
                  <span>Arraste o pino para refinar</span>
                  {formData.latitude && (
                    <span>• Lat: {formData.latitude}, Lng: {formData.longitude}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Linha 5: Condomínio, Portaria e Instruções de Entrega (EARS-03) */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="size-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Condomínio, Edifício ou Apartamento?</span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_apartment}
                  onChange={(e) => setFormData({ ...formData, is_apartment: e.target.checked })}
                  className="size-5 rounded-md border-border text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {formData.is_apartment && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Bloco / Torre / Prédio</label>
                    <Input
                      placeholder="Ex: Bloco 2, Torre Norte"
                      value={formData.block_tower}
                      onChange={(e) => setFormData({ ...formData, block_tower: e.target.value })}
                      className="h-11 rounded-lg bg-background text-xs font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Interfone / Ramal de Acesso</label>
                    <Input
                      placeholder="Ex: Interfone 402"
                      value={formData.intercom_code}
                      onChange={(e) => setFormData({ ...formData, intercom_code: e.target.value })}
                      className="h-11 rounded-lg bg-background text-xs font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Ponto de Referência ou Instruções para o Entregador
                </label>
                <Input
                  placeholder="Ex: Portão ao lado da padaria, deixar na portaria 24h"
                  value={formData.reference_point}
                  onChange={(e) => setFormData({ ...formData, reference_point: e.target.value })}
                  className="h-11 rounded-lg bg-background text-xs"
                />
              </div>
            </div>

            {/* Checkbox Endereço Padrão (EARS-04) */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div>
                <span className="text-xs font-bold block text-foreground">Definir como Endereço Padrão</span>
                <span className="text-[11px] text-muted-foreground block">
                  Utilizado automaticamente como primeira escolha no checkout e serviços
                </span>
              </div>
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="size-5 rounded-md border-border text-primary focus:ring-primary cursor-pointer"
              />
            </div>

            {/* Ações de salvamento */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingId(null);
                }}
                className="rounded-lg h-11 min-h-11 px-4 text-xs font-bold cursor-pointer"
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
                    <Loader2 className="size-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    <span>Salvar Endereço</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── 3. Lista de Endereços Salvos (EARS-07 / Bento Grid + Edge-to-Edge) ── */}
      {!isFormOpen && addresses.length === 0 ? (
        <div className="p-4 sm:p-0">
          <EmptyState
            title="Nenhum endereço cadastrado"
            description="Cadastre seu endereço para entregas rápidas, agendamentos e cálculo automático de frete."
            action={
              <Button
                onClick={handleOpenNew}
                className="rounded-lg h-11 min-h-11 px-5 text-xs font-bold gap-2 bg-foreground text-background hover:bg-foreground/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Plus className="size-4" />
                Cadastrar Primeiro Endereço
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Mobile (<640px): Apple HIG Edge-to-Edge Cards */}
          <div className="sm:hidden w-full divide-y divide-border/40 bg-card border-y border-border/60">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={cn(
                  "p-4 flex items-start justify-between gap-3 transition-colors",
                  addr.is_default && "bg-primary/5",
                )}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      "size-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border border-border/40",
                      addr.is_default
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {getIconElement(addr.icon)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-foreground break-words text-wrap leading-tight">
                        {addr.label || "Endereço"}
                      </p>
                      {addr.is_default && (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0 h-4 font-bold">
                          Padrão
                        </Badge>
                      )}
                      {addr.is_apartment && (
                        <Badge variant="outline" className="text-[10px] px-2 py-0 h-4 font-bold text-primary border-primary/30">
                          Apto/Condomínio
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-foreground font-medium break-words text-wrap">
                      {addr.street}, {addr.number}
                    </p>
                    {addr.complement && (
                      <p className="text-[11px] text-muted-foreground break-words text-wrap">{addr.complement}</p>
                    )}
                    {addr.block_tower && (
                      <p className="text-[11px] text-primary font-medium break-words text-wrap">
                        Bloco: {addr.block_tower} {addr.intercom_code ? `• Interfone: ${addr.intercom_code}` : ""}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground break-words text-wrap">
                      {addr.neighborhood} • {addr.city}, {addr.state}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground/80">CEP: {formatCep(addr.zipcode)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(addr)}
                    className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Edit2 className="size-3.5 mr-1" /> Editar
                  </Button>
                  <CrudActionsMenu
                    entityName="Endereço"
                    onDelete={() => handleDelete(addr.id)}
                    deleteConfirmTitle="Excluir endereço?"
                    deleteConfirmDescription={`Remover ${addr.street}, ${addr.number} (${addr.city || "sua localidade"})? Transações passadas permanecerão intactas.`}
                    customActions={[
                      ...(!addr.is_default
                        ? [
                            {
                              id: "set-default",
                              label: "Tornar Padrão",
                              icon: Star,
                              onClick: () => handleSetDefault(addr),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/Tablet (>=640px): Bento Grid 2 Colunas (EARS-07) */}
          <div className="hidden sm:grid grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className={cn(
                  "bg-card rounded-xl border p-5 flex flex-col justify-between gap-4 transition-all shadow-xs hover:border-foreground/20",
                  addr.is_default
                    ? "border-primary/50 ring-1 ring-primary/20"
                    : "border-border/60",
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          "size-10 rounded-xl flex items-center justify-center shrink-0 border border-border/40",
                          addr.is_default
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {getIconElement(addr.icon)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground break-words text-wrap leading-tight">
                            {addr.label || "Endereço"}
                          </p>
                          {addr.is_apartment && (
                            <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30">
                              Apto/Condomínio
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-foreground font-medium break-words text-wrap mt-1">
                          {addr.street}, {addr.number}
                        </p>
                        {addr.complement && (
                          <p className="text-xs text-muted-foreground break-words text-wrap">{addr.complement}</p>
                        )}
                        {addr.block_tower && (
                          <p className="text-[11px] text-primary font-medium break-words text-wrap mt-1">
                            Bloco: {addr.block_tower} {addr.intercom_code ? `• Interfone: ${addr.intercom_code}` : ""}
                          </p>
                        )}
                      </div>
                    </div>

                    {addr.is_default && (
                      <Badge variant="secondary" className="text-xs font-mono font-bold shrink-0">
                        Padrão
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 pl-13 font-mono">
                    <p className="font-sans text-xs text-foreground/80">{addr.neighborhood}</p>
                    <p className="font-sans text-xs text-foreground/80">{addr.city} - {addr.state}</p>
                    <p className="text-[11px] text-muted-foreground/80">CEP: {formatCep(addr.zipcode)}</p>
                    {addr.latitude && (
                      <p className="text-[10px] text-muted-foreground/60">GPS: {addr.latitude}, {addr.longitude}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/40 pl-13">
                  <div>
                    {!addr.is_default && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(addr)}
                        className="h-11 min-h-11 text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer -ml-2 focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Star className="size-3.5" />
                        <span>Tornar Padrão</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(addr)}
                      className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Edit2 className="size-3.5 mr-1" /> Editar
                    </Button>
                    <CrudActionsMenu
                      entityName="Endereço"
                      onDelete={() => handleDelete(addr.id)}
                      deleteConfirmTitle="Excluir endereço?"
                      deleteConfirmDescription={`Remover ${addr.street}, ${addr.number} (${addr.city || "sua localidade"})? Transações passadas permanecerão intactas.`}
                      customActions={[
                        ...(!addr.is_default
                          ? [
                              {
                                id: "set-default",
                                label: "Tornar Padrão",
                                icon: Star,
                                onClick: () => handleSetDefault(addr),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
