import React, { useState, useEffect, useRef } from "react";
import type { Map, Marker } from "maplibre-gl";
import { getCanonicalMapStyle, setupMapResizeObserver } from "@/lib/map-styles";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
 MapPin,
 Search,
 Loader2,
 Navigation,
 CheckCircle2,
 EyeOff,
 Eye,
 Store,
 Bike,
 Home,
 Wrench,
 Globe,
 Sliders,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredLocation } from "@/components/location/location-master-pill";
import { useQuery } from "@tanstack/react-query";
import { getPublicMapConfig } from "@/services/integrations.functions";
import { toast } from "sonner";

export type BusinessModelType =
 | "physical_and_delivery"
 | "delivery_only"
 | "home_office"
 | "service_at_client"
 | "digital_only";

export interface BusinessLocationData {
 businessModel: BusinessModelType;
 isAddressPublic: boolean;
 zipCode: string;
 street: string;
 number: string;
 complement: string;
 neighborhood: string;
 city: string;
 state: string;
 fullAddress: string;
 latitude?: number | null;
 longitude?: number | null;
 serviceRadiusKm: number;
 coverageCities: string[];
}

export interface BusinessLocationPickerProps {
 value: BusinessLocationData;
 onChange: (data: BusinessLocationData) => void;
 segment?: string;
 className?: string;
}

export function getBusinessModelsForSegment(segment?: string): Array<{
 id: BusinessModelType;
 title: string;
 desc: string;
 icon: any;
 defaultPublic: boolean;
}> {
 const seg = (segment || "").toLowerCase();

 // 1. Turismo, Viagens, Hotelaria, Passeios & Eventos
 if (
 seg.includes("turismo") ||
 seg.includes("tourism") ||
 seg.includes("viag") ||
 seg.includes("passeio") ||
 seg.includes("hotel") ||
 seg.includes("resort")
 ) {
 return [
 {
 id: "physical_and_delivery",
 title: "Agência / Escritório Físico",
 desc: "Atendimento presencial ao público para montagem de roteiros, pacotes e reservas.",
 icon: Store,
 defaultPublic: true,
 },
 {
 id: "digital_only",
 title: "Atendimento 100% Online",
 desc: "Consultoria e vendas via WhatsApp, videochamada e emissão digital de vouchers.",
 icon: Globe,
 defaultPublic: false,
 },
 {
 id: "service_at_client",
 title: "Atendimento Personalizado / Concierge",
 desc: "Atendimento sob medida no hotel, aeroporto ou endereço do cliente.",
 icon: Wrench,
 defaultPublic: false,
 },
 {
 id: "home_office",
 title: "Consultor Independente / Home Office",
 desc: "Operação remota a partir de casa. O endereço residencial é protegido.",
 icon: Home,
 defaultPublic: false,
 },
 ];
 }

 // 2. Serviços Especializados, Saúde, Estética, Barbearia, Advocacia
 if (
 seg.includes("servic") ||
 seg.includes("beleza") ||
 seg.includes("estetica") ||
 seg.includes("barbearia") ||
 seg.includes("saude") ||
 seg.includes("advoc") ||
 seg.includes("consultoria")
 ) {
 return [
 {
 id: "physical_and_delivery",
 title: "Espaço / Consultório Físico",
 desc: "Atendimento presencial no consultório, clínica, estúdio ou escritório.",
 icon: Store,
 defaultPublic: true,
 },
 {
 id: "service_at_client",
 title: "Atendimento em Domicílio / No Local",
 desc: "Profissionais que realizam o atendimento na residência ou empresa do cliente.",
 icon: Wrench,
 defaultPublic: false,
 },
 {
 id: "digital_only",
 title: "Atendimento 100% Online / Remoto",
 desc: "Consultorias, mentorias e serviços realizados integralmente via internet.",
 icon: Globe,
 defaultPublic: false,
 },
 {
 id: "home_office",
 title: "Ateliê / Home Studio Privado",
 desc: "Atendimento exclusivo com hora marcada e endereço exato protegido.",
 icon: Home,
 defaultPublic: false,
 },
 ];
 }

 // 3. Imóveis, Locação & Temporada
 if (seg.includes("imov") || seg.includes("real_estate") || seg.includes("aluguel")) {
 return [
 {
 id: "physical_and_delivery",
 title: "Imobiliária / Escritório de Vendas",
 desc: "Espaço físico aberto para recepção de compradores, locatários e investidores.",
 icon: Store,
 defaultPublic: true,
 },
 {
 id: "service_at_client",
 title: "Corretor em Campo / Visitas Externas",
 desc: "Atendimento direto nos imóveis com visitas agendadas com clientes.",
 icon: Wrench,
 defaultPublic: false,
 },
 {
 id: "digital_only",
 title: "Intermediação 100% Digital",
 desc: "Plataforma digital de captação e consultoria de imóveis.",
 icon: Globe,
 defaultPublic: false,
 },
 ];
 }

 // 4. Padrão: Gastronomia, Mercado, Hortifrúti, Varejo & Delivery
 return [
 {
 id: "physical_and_delivery",
 title: "Loja Física com Atendimento",
 desc: "Balcão ou salão aberto ao público para visitas e compras presenciais, além de entregas.",
 icon: Store,
 defaultPublic: true,
 },
 {
 id: "delivery_only",
 title: "Apenas Delivery / Retirada",
 desc: "Dark Kitchen, ateliê fechado ou centro de distribuição sem atendimento presencial.",
 icon: Bike,
 defaultPublic: false,
 },
 {
 id: "home_office",
 title: "Produção Artesanal / Residencial",
 desc: "Vendas ou produção a partir de casa. O endereço exato é preservado e não publicado.",
 icon: Home,
 defaultPublic: false,
 },
 {
 id: "digital_only",
 title: "E-commerce 100% Digital",
 desc: "Loja online sem atendimento local físico, com envio para todo o país.",
 icon: Globe,
 defaultPublic: false,
 },
 ];
}

export function BusinessLocationPicker({
 value,
 onChange,
 segment,
 className = "",
}: BusinessLocationPickerProps) {
 const models = getBusinessModelsForSegment(segment);
 const [isSearchingCep, setIsSearchingCep] = useState(false);
 const [isGeocoding, setIsGeocoding] = useState(false);
 const [isGettingGps, setIsGettingGps] = useState(false);
 const [newCoverageCity, setNewCoverageCity] = useState("");
 const { data: mapConfig } = useQuery({
   queryKey: ["public-map-config"],
   queryFn: () => getPublicMapConfig(),
   staleTime: 5 * 60 * 1000,
 });

 const mapContainer = useRef<HTMLDivElement>(null);
 const map = useRef<Map | null>(null);
 const marker = useRef<Marker | null>(null);

 // Inicialização do Mapa (SSR Safe & Dynamic Import)
 useEffect(() => {
   if (!mapContainer.current || map.current) return;
   let isMounted = true;
   let cleanupResize: (() => void) | undefined;

   // Coordenadas dinâmicas (Localização do usuário ou valor atual)
   const stored = typeof window !== "undefined" ? getStoredLocation() : null;
   const initialLat = value.latitude || stored?.lat || -27.1004;
   const initialLng = value.longitude || stored?.lng || -52.6152;

   const effectiveProvider = mapConfig?.provider || "osm_standard";

   import("maplibre-gl").then((maplibreglModule) => {
     if (!isMounted || !mapContainer.current || map.current) return;
     const maplibregl = (maplibreglModule as any).default || maplibreglModule;

     try {
       const mapInstance = new maplibregl.Map({
         container: mapContainer.current,
         style: getCanonicalMapStyle(undefined, effectiveProvider),
         center: [initialLng, initialLat],
         zoom: value.latitude ? 16 : 13,
         attributionControl: false,
       });
       map.current = mapInstance;

       cleanupResize = setupMapResizeObserver(mapInstance, mapContainer.current);

       mapInstance.addControl(
         new maplibregl.AttributionControl({ compact: true }),
         "bottom-right"
       );
       mapInstance.addControl(new maplibregl.NavigationControl(), "top-right");

       // Marcador arrastável personalizado
       const markerEl = document.createElement("div");
       markerEl.className = "cursor-grab active:cursor-grabbing";
       markerEl.innerHTML = `
         <div class="relative flex items-center justify-center">
           <div class="size-10 rounded-full bg-primary/20 animate-ping absolute inset-0"></div>
           <div class="size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-2 border-white">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
           </div>
         </div>
       `;

       const markerInstance = new maplibregl.Marker({ element: markerEl, draggable: true })
         .setLngLat([initialLng, initialLat])
         .addTo(mapInstance);
       marker.current = markerInstance;

       // Evento de arraste do pino (Ajuste fino de latitude/longitude)
       markerInstance.on("dragend", async () => {
         const lngLat = markerInstance.getLngLat();
         if (lngLat) {
           onChange({
             ...value,
             latitude: Number(lngLat.lat.toFixed(6)),
             longitude: Number(lngLat.lng.toFixed(6)),
           });
           toast.success("Ponto no mapa ajustado com precisão!");
         }
       });
     } catch (err) {
       console.warn("[BusinessLocationPicker] Erro ao instanciar mapa:", err);
     }
   });

   return () => {
     isMounted = false;
     cleanupResize?.();
     map.current?.remove();
     map.current = null;
   };
 }, []);

 // Atualiza centro do mapa quando coordenadas mudam externamente
 const updateMapPosition = (lat: number, lng: number) => {
 if (map.current && marker.current) {
 map.current.flyTo({ center: [lng, lat], zoom: 16, essential: true });
 marker.current.setLngLat([lng, lat]);
 }
 };

 // 1. Busca de CEP automática via ViaCEP
 const handleCepBlur = async () => {
 const cleanCep = value.zipCode.replace(/\D/g, "");
 if (cleanCep.length !== 8) return;

 setIsSearchingCep(true);
 try {
 const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
 const data = await res.json();

 if (!data.erro) {
 const updatedStreet = data.logradouro || value.street;
 const updatedNeighborhood = data.bairro || value.neighborhood;
 const updatedCity = data.localidade || value.city;
 const updatedState = data.uf || value.state;

 const updatedFull = `${updatedStreet}, ${value.number || "S/N"} - ${updatedNeighborhood}, ${updatedCity} - ${updatedState}`;

 const updatedData: BusinessLocationData = {
 ...value,
 street: updatedStreet,
 neighborhood: updatedNeighborhood,
 city: updatedCity,
 state: updatedState,
 fullAddress: updatedFull,
 };

 onChange(updatedData);
 toast.success(`Endereço localizado: ${updatedCity} - ${updatedState}`);

 // Tenta geocodificar automaticamente
 geocodeAddress(updatedFull, updatedCity, updatedState);
 } else {
 toast.error("CEP não encontrado. Preencha o endereço manualmente.");
 }
 } catch (e) {
 console.error("Erro ao buscar CEP:", e);
 } finally {
 setIsSearchingCep(false);
 }
 };

 // 2. Geocodificação de Endereço Real no OpenStreetMap / Nominatim
 const geocodeAddress = async (addr: string, cityName?: string, stateUf?: string) => {
 if (!addr.trim()) return;
 setIsGeocoding(true);

 try {
 const query = `${addr}, ${cityName || value.city}, ${stateUf || value.state}, Brasil`;
 const res = await fetch(
 `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
 );
 const data = await res.json();

 if (data && data.length > 0) {
 const lat = parseFloat(data[0].lat);
 const lng = parseFloat(data[0].lon);

 onChange({
 ...value,
 latitude: Number(lat.toFixed(6)),
 longitude: Number(lng.toFixed(6)),
 });

 updateMapPosition(lat, lng);
 toast.success("Localização fixada no mapa com sucesso!");
 }
 } catch (e) {
 console.error("Erro na geocodificação:", e);
 } finally {
 setIsGeocoding(false);
 }
 };

 // 3. Capturar Localização Atual do Dispositivo (GPS)
 const handleGetGps = () => {
 if (!navigator.geolocation) {
 toast.error("Geolocalização não suportada pelo seu navegador.");
 return;
 }

 setIsGettingGps(true);
 navigator.geolocation.getCurrentPosition(
 async (pos) => {
 const lat = Number(pos.coords.latitude.toFixed(6));
 const lng = Number(pos.coords.longitude.toFixed(6));

 onChange({
 ...value,
 latitude: lat,
 longitude: lng,
 });

 updateMapPosition(lat, lng);
 setIsGettingGps(false);
 toast.success("Localização capturada pelo GPS com sucesso!");

 // Reverse Geocoding para preencher rua/bairro caso vazio
 try {
 const revRes = await fetch(
 `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
 );
 const revData = await revRes.json();
 if (revData?.address) {
 const addr = revData.address;
 onChange({
 ...value,
 latitude: lat,
 longitude: lng,
 street: value.street || addr.road || "",
 neighborhood: value.neighborhood || addr.suburb || addr.neighbourhood || "",
 city: value.city || addr.city || addr.town || addr.municipality || "",
 state: value.state || addr.state || "",
 zipCode: value.zipCode || addr.postcode || "",
 });
 }
 } catch {
 // Silent fallback
 }
 },
 (err) => {
 setIsGettingGps(false);
 toast.error("Não foi possível obter a localização do GPS: " + err.message);
 },
 { enableHighAccuracy: true, timeout: 10000 }
 );
 };

 const handleModelSelect = (model: BusinessModelType) => {
 const selected = models.find((m: any) => m.id === model);
 onChange({
 ...value,
 businessModel: model,
 isAddressPublic: selected?.defaultPublic ?? true,
 });
 };

 const handleAddCoverageCity = () => {
 if (!newCoverageCity.trim()) return;
 if (value.coverageCities.includes(newCoverageCity.trim())) {
 toast.error("Esta cidade já foi adicionada.");
 return;
 }
 onChange({
 ...value,
 coverageCities: [...value.coverageCities, newCoverageCity.trim()],
 });
 setNewCoverageCity("");
 };

 const handleRemoveCoverageCity = (cityToRemove: string) => {
 onChange({
 ...value,
 coverageCities: value.coverageCities.filter((c) => c !== cityToRemove),
 });
 };

 return (
 <div className={cn("space-y-6 w-full text-foreground", className)}>
 {/* ── 1. SELEÇÃO DO MODELO DE ATENDIMENTO & PRESENÇA ── */}
 <div className="space-y-3">
 <Label className="text-xs font-bold text-foreground block">
 Como funciona o atendimento do seu negócio? *
 </Label>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 {models.map((model) => {
 const isSelected = value.businessModel === model.id;
 const Icon = model.icon;

 return (
 <button
 key={model.id}
 type="button"
 onClick={() => handleModelSelect(model.id)}
 className={cn(
 "flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer select-none",
 isSelected
 ? "bg-primary/5 border-primary ring-1 ring-primary shadow-xs"
 : "bg-card border-border/80 hover:border-foreground/30 hover:bg-muted/40"
 )}
 >
 <div
 className={cn(
 "size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
 isSelected
 ? "bg-primary text-primary-foreground"
 : "bg-muted text-muted-foreground"
 )}
 >
 <Icon className="size-4" />
 </div>
 <div className="space-y-0.5 min-w-0">
 <span className="text-xs font-bold text-foreground block leading-tight">
 {model.title}
 </span>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 {model.desc}
 </p>
 </div>
 </button>
 );
 })}
 </div>
 </div>

 {/* ── 2. CONTROLE DE PRIVACIDADE DO ENDEREÇO ── */}
 <div className="p-4 rounded-2xl bg-card border border-border/80 flex items-center justify-between gap-4 shadow-xs">
 <div className="space-y-0.5 min-w-0">
 <div className="flex items-center gap-2">
 {value.isAddressPublic ? (
 <Eye className="size-4 text-primary shrink-0" />
 ) : (
 <EyeOff className="size-4 text-amber-500 shrink-0" />
 )}
 <span className="text-xs font-bold text-foreground">
 {value.isAddressPublic
 ? "Endereço Completo Visível Publicamente"
 : "Endereço Protegido (Privado)"}
 </span>
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 {value.isAddressPublic
 ? "O endereço completo com rua e número será exibido na sua vitrine para clientes irem até você."
 : "Recomendado para Home Office / Dark Kitchens. Apenas seu Bairro, Cidade e Região Atendida serão exibidos."}
 </p>
 </div>
 <Switch
 checked={value.isAddressPublic}
 onCheckedChange={(checked) => onChange({ ...value, isAddressPublic: checked })}
 />
 </div>

 {/* ── 3. FORMULÁRIO DE ENDEREÇO ESTRUTURADO (COM CEP E AUTOPREENCHIMENTO) ── */}
 <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/80">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <MapPin className="size-4 text-primary" />
 <span className="text-xs font-bold text-foreground">
 Endereço Base da Empresa / Ponto Operacional *
 </span>
 </div>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleGetGps}
 disabled={isGettingGps}
 className="h-8 rounded-xl text-xs gap-1.5 font-medium border-border/70"
 >
 {isGettingGps ? (
 <Loader2 className="size-3.5 animate-spin" />
 ) : (
 <Navigation className="size-3.5 text-primary" />
 )}
 <span>Usar GPS Atual</span>
 </Button>
 </div>

 {/* Linha 1: CEP + Cidade + Estado */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
 <span>CEP *</span>
 {isSearchingCep && (
 <span className="text-[10px] text-primary flex items-center gap-1 font-mono">
 <Loader2 className="size-2.5 animate-spin" /> Buscando...
 </span>
 )}
 </Label>
 <div className="relative">
 <Input
 value={value.zipCode}
 onChange={(e) => {
 let v = e.target.value.replace(/\D/g, "");
 if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5, 8)}`;
 onChange({ ...value, zipCode: v });
 }}
 onBlur={handleCepBlur}
 placeholder="89800-000"
 maxLength={9}
 className="h-10 rounded-xl bg-card text-xs font-mono"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground">Cidade *</Label>
 <Input
 value={value.city}
 onChange={(e) => onChange({ ...value, city: e.target.value })}
 placeholder="Ex: Chapecó"
 className="h-10 rounded-xl bg-card text-xs font-medium"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground">Estado (UF) *</Label>
 <Input
 value={value.state}
 onChange={(e) => onChange({ ...value, state: e.target.value.toUpperCase() })}
 placeholder="SC"
 maxLength={2}
 className="h-10 rounded-xl bg-card text-xs uppercase font-bold"
 />
 </div>
 </div>

 {/* Linha 2: Rua + Número + Complemento */}
 <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
 <div className="sm:col-span-6 space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground">
 Rua / Logradouro *
 </Label>
 <Input
 value={value.street}
 onChange={(e) => onChange({ ...value, street: e.target.value })}
 placeholder="Ex: Av. Getúlio Vargas"
 className="h-10 rounded-xl bg-card text-xs"
 />
 </div>

 <div className="sm:col-span-2 space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground">Número *</Label>
 <Input
 value={value.number}
 onChange={(e) => onChange({ ...value, number: e.target.value })}
 placeholder="1200"
 className="h-10 rounded-xl bg-card text-xs font-mono"
 />
 </div>

 <div className="sm:col-span-4 space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground">Complemento</Label>
 <Input
 value={value.complement}
 onChange={(e) => onChange({ ...value, complement: e.target.value })}
 placeholder="Sala 302, Bloco B..."
 className="h-10 rounded-xl bg-card text-xs"
 />
 </div>
 </div>

 {/* Linha 3: Bairro + Botão de Localizar no Mapa */}
 <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
 <div className="sm:col-span-8 space-y-1.5">
 <Label className="text-xs font-medium text-muted-foreground">Bairro *</Label>
 <Input
 value={value.neighborhood}
 onChange={(e) => onChange({ ...value, neighborhood: e.target.value })}
 placeholder="Ex: Centro, Efapi, Passo dos Fortes..."
 className="h-10 rounded-xl bg-card text-xs"
 />
 </div>

 <div className="sm:col-span-4">
 <Button
 type="button"
 variant="secondary"
 onClick={() => {
 const full = `${value.street} ${value.number}, ${value.neighborhood}, ${value.city} - ${value.state}`;
 geocodeAddress(full);
 }}
 disabled={isGeocoding || !value.street}
 className="w-full h-10 rounded-xl text-xs font-bold gap-1.5 bg-card border border-border/80 hover:bg-muted"
 >
 {isGeocoding ? (
 <Loader2 className="size-3.5 animate-spin" />
 ) : (
 <Search className="size-3.5 text-primary" />
 )}
 <span>Localizar no Mapa</span>
 </Button>
 </div>
 </div>

 {/* ── 4. MAPA INTERATIVO (MAPLIBRE / OPENSTREETMAP) COM PIN ARRASTÁVEL ── */}
 <div className="space-y-2 pt-2">
 <div className="flex items-center justify-between text-xs">
 <span className="font-bold text-foreground flex items-center gap-1.5">
 <CheckCircle2 className="size-3.5 text-emerald-500" />
 Ponto Exato no Mapa (Arraste o pino para ajustar a porta da loja)
 </span>
 {value.latitude && value.longitude && (
 <span className="font-mono text-[10px] text-muted-foreground">
 {value.latitude}, {value.longitude}
 </span>
 )}
 </div>

 <div className="relative w-full h-[220px] rounded-2xl overflow-hidden border border-border/80 bg-muted/40 shadow-xs">
 <div ref={mapContainer} className="size-full" />
 {!value.latitude && (
 <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center p-4 text-center z-10 pointer-events-none">
 <p className="text-xs font-medium text-muted-foreground bg-card p-3 rounded-xl border border-border/80 shadow-xs max-w-xs">
 Digite seu CEP ou endereço e clique em <strong>Localizar no Mapa</strong> para fixar o ponto exato de entrega.
 </p>
 </div>
 )}
 </div>
 </div>
 </div>

 {/* ── 5. REGIÃO ATENDIDA & RAIO DE COBERTURA EM KM ── */}
 <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 space-y-4 shadow-xs">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Sliders className="size-3.5 text-primary" />
 Raio de Atendimento & Região de Entrega
 </span>
 <p className="text-[11px] text-muted-foreground">
 Define o alcance máximo onde seus produtos e serviços aparecem nas buscas e filtros locais.
 </p>
 </div>
 <Badge variant="outline" className="text-xs font-mono font-bold">
 {value.serviceRadiusKm > 0 ? `Até ${value.serviceRadiusKm} km` : "Sem limite (Nacional)"}
 </Badge>
 </div>

 {/* Slider de Raio em KM */}
 <div className="space-y-2">
 <div className="flex items-center justify-between text-xs text-muted-foreground">
 <span>Vizinhança (3 km)</span>
 <span>Toda a Cidade (15 km)</span>
 <span>Região Metropolitana (40 km)</span>
 <span>Sem Limite (100+ km)</span>
 </div>
 <input
 type="range"
 min={0}
 max={100}
 step={5}
 value={value.serviceRadiusKm}
 onChange={(e) => onChange({ ...value, serviceRadiusKm: Number(e.target.value) })}
 className="w-full accent-primary cursor-pointer h-2 bg-muted rounded-lg"
 />
 </div>

 {/* Cidades e Polos Atendidos */}
 <div className="space-y-2 pt-2 border-t border-border/60">
 <Label className="text-xs font-medium text-muted-foreground">
 Cidades / Polos Regionais Atendidos
 </Label>
 <div className="flex gap-2">
 <Input
 value={newCoverageCity}
 onChange={(e) => setNewCoverageCity(e.target.value)}
 placeholder="Adicionar outra cidade atendida (Ex: Xanxerê, Xaxim, SMO)..."
 className="h-9 rounded-xl bg-background text-xs"
 onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCoverageCity())}
 />
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleAddCoverageCity}
 className="h-9 rounded-xl text-xs font-bold px-4 shrink-0"
 >
 Adicionar
 </Button>
 </div>

 <div className="flex flex-wrap gap-1.5 pt-1">
 <Badge className="bg-primary/10 text-primary border-primary/20 text-[11px] font-bold">
 {value.city || "Cidade Base"} (Sede)
 </Badge>
 {value.coverageCities.map((c) => (
 <Badge
 key={c}
 variant="secondary"
 className="text-[11px] font-medium gap-1.5 pr-1.5 pl-2.5"
 >
 <span>{c}</span>
 <button
 type="button"
 onClick={() => handleRemoveCoverageCity(c)}
 className="size-3.5 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground"
 >
 ×
 </button>
 </Badge>
 ))}
 </div>
 </div>
 </div>
 </div>
 );
}
