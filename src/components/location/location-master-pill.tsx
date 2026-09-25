import React, { useState, useEffect, useRef } from "react";
import {
 MapPin,
 Navigation,
 Search,
 X,
 Check,
 Loader2,
 Compass,
 Maximize2,
 Minimize2,
 Crosshair,
 Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
} from "@/components/ui/dialog";
import { findClosestCanonicalCity } from "@/lib/constants/cities";
import { toast } from "sonner";

export interface LocationState {
 city: string;
 state: string;
 lat?: number;
 lng?: number;
 address?: string;
 source: "gps" | "cep" | "manual" | "map_pin" | "default";
}

export const GLOBAL_DEFAULT_LOCATION: LocationState = {
 city: "Global",
 state: "",
 address: "Todas as Regiões",
 source: "default",
};

export function getStoredLocation(): LocationState {
 if (typeof window !== "undefined") {
 const saved = localStorage.getItem("waesy_master_location");
 if (saved) {
 try {
 const parsed = JSON.parse(saved);
 if (parsed && typeof parsed.city === "string") {
 return parsed;
 }
 } catch {
 // ignore
 }
 }
 }
 return GLOBAL_DEFAULT_LOCATION;
}

export async function resolveGeoCoordinates(
 lat: number,
 lng: number
): Promise<{ city: string; state: string; address: string }> {
 // 1. Provedor Canônico Imediato (0ms, offline-first, imune a bloqueios de rede/CORS)
 const closest = findClosestCanonicalCity(lat, lng);
 if (closest && closest.distanceKm !== undefined && closest.distanceKm <= 120) {
 return {
 city: closest.name,
 state: closest.state,
 address: closest.label,
 };
 }

 // 2. Provedor Primário Web: BigDataCloud Client API (suporte nativo pt-BR)
 try {
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), 4000);
 const res = await fetch(
 `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`,
 { signal: controller.signal }
 );
 clearTimeout(timer);
 if (res.ok) {
 const data = await res.json();
 const city = data.city || data.locality || data.principalSubdivision || "";
 const state = (data.principalSubdivisionCode || "").replace("BR-", "") || data.principalSubdivision || "";
 if (city) {
 const fullAddr = `${city}${state ? ` - ${state}` : ""}`;
 return { city, state, address: fullAddr };
 }
 }
 } catch {
 // fallback
 }

 // 3. Fallback Nominatim (OpenStreetMap)
 try {
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), 4000);
 const res = await fetch(
 `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
 { signal: controller.signal, headers: { "Accept-Language": "pt-BR,pt;q=0.9" } }
 );
 clearTimeout(timer);
 if (res.ok) {
 const data = await res.json();
 const addr = data.address || {};
 const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || "";
 const state = addr.state || "";
 if (city) {
 return { city, state, address: `${city}${state ? ` - ${state}` : ""}` };
 }
 }
 } catch {
 // fallback
 }

 // 4. Se nenhuma API externa respondeu, usa a cidade canônica mais próxima existente no banco
 if (closest) {
 return {
 city: closest.name,
 state: closest.state,
 address: closest.label,
 };
 }

 return {
 city: "Localização Atual",
 state: "",
 address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
 };
}

export function syncClientGeoCookie(loc: LocationState) {
  if (typeof document === "undefined" || !loc) return;
  document.cookie = `waesy_city=${encodeURIComponent(loc.city)}; path=/; max-age=31536000; SameSite=Lax`;
  try {
    const geoPayload = encodeURIComponent(JSON.stringify({
      city: loc.city,
      state: loc.state,
      lat: loc.lat,
      lng: loc.lng,
      source: loc.source || "gps",
    }));
    document.cookie = `waesy_client_geo=${geoPayload}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
}

export function useMasterLocation() {
 const [location, setLocation] = useState<LocationState>(GLOBAL_DEFAULT_LOCATION);

 useEffect(() => {
 const stored = getStoredLocation();
 if (
 stored.city &&
 stored.city !== GLOBAL_DEFAULT_LOCATION.city &&
 stored.source !== "default"
 ) {
 setLocation(stored);
      syncClientGeoCookie(stored);
    }

 // Auto-detectar de forma resiliente: se o navegador já possui permissão concedida ou se o usuário
 // já autorizou no Waesy, sincronizar as coordenadas reais imediatamente e NUNCA deixar travado em "Global"
 if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.geolocation) {
 const isGrantedLocally = localStorage.getItem("waesy_geo_permission_granted") === "true";
 const isCurrentlyGlobal = !location || location.city === "Global" || location.source === "default";

 const executeGpsSync = () => {
 navigator.geolocation.getCurrentPosition(
 async (pos) => {
 try {
 const resolved = await resolveGeoCoordinates(pos.coords.latitude, pos.coords.longitude);
 const autoLoc: LocationState = {
 city: resolved.city,
 state: resolved.state,
 lat: pos.coords.latitude,
 lng: pos.coords.longitude,
 address: resolved.address,
 source: "gps",
 };
 setLocation(autoLoc);
 localStorage.setItem("waesy_master_location", JSON.stringify(autoLoc));
 syncClientGeoCookie(autoLoc);
 localStorage.removeItem("waesy_geo_permission_dismissed");
 localStorage.setItem("waesy_geo_permission_granted", "true");
 window.dispatchEvent(new CustomEvent("waesy:location-updated", { detail: autoLoc }));
 } catch {
 // ignore
 }
 },
 () => {},
 { timeout: 10000, enableHighAccuracy: true, maximumAge: 300000 }
 );
 };

 if (isGrantedLocally && isCurrentlyGlobal) {
 executeGpsSync();
 } else if (navigator.permissions && navigator.permissions.query) {
 navigator.permissions
 .query({ name: "geolocation" })
 .then((permissionStatus) => {
 if (permissionStatus.state === "granted" && isCurrentlyGlobal) {
 executeGpsSync();
 }
 })
 .catch(() => {});
 }
 }

 const handleUpdate = (e: any) => {
 if (e.detail) {
 setLocation(e.detail);
 }
 };

 const handleStorage = (e: StorageEvent) => {
 if (e.key === "waesy_master_location" && e.newValue) {
 try {
 setLocation(JSON.parse(e.newValue));
 } catch {
 // ignore
 }
 }
 };

 window.addEventListener("waesy:location-updated", handleUpdate as EventListener);
 window.addEventListener("storage", handleStorage);

 return () => {
 window.removeEventListener("waesy:location-updated", handleUpdate as EventListener);
 window.removeEventListener("storage", handleStorage);
 };
 }, []);

  const updateLocation = (newLoc: LocationState) => {
    setLocation(newLoc);
    if (typeof window !== "undefined") {
      localStorage.setItem("waesy_master_location", JSON.stringify(newLoc));
      syncClientGeoCookie(newLoc);
      window.dispatchEvent(new CustomEvent("waesy:location-updated", { detail: newLoc }));
    }
  };

 return { location, updateLocation };
}

export function LocationMasterPill({ className = "" }: { className?: string }) {
 const { location, updateLocation } = useMasterLocation();
 const [modalOpen, setModalOpen] = useState(false);
 const [isLocating, setIsLocating] = useState(false);
 const [isHolding, setIsHolding] = useState(false);
 const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const isLongPressRef = useRef(false);

 // Trigger GPS Geolocation
 const triggerGeolocation = () => {
 if (!navigator.geolocation) {
 toast.error("Geolocalização não é suportada pelo seu navegador.");
 return;
 }

 setIsLocating(true);
 toast.info("Obtendo sua localização via GPS...");

 const onPosSuccess = async (pos: GeolocationPosition) => {
 const { latitude, longitude } = pos.coords;
 try {
 const resolved = await resolveGeoCoordinates(latitude, longitude);

 const newLoc: LocationState = {
 city: resolved.city,
 state: resolved.state,
 lat: latitude,
 lng: longitude,
 address: resolved.address,
 source: "gps",
 };

 updateLocation(newLoc);
 if (typeof window !== "undefined") {
 localStorage.setItem("waesy_geo_permission_granted", "true");
 document.cookie = "waesy_geo_granted=true; path=/; max-age=31536000; SameSite=Lax";
 }
 toast.success(`Localização ativada: ${resolved.city}${resolved.state ? ` - ${resolved.state}` : ""}`);
 } catch (e) {
 const fallbackLoc: LocationState = {
 city: "Minha Localização",
 state: "",
 lat: latitude,
 lng: longitude,
 source: "gps",
 };
 updateLocation(fallbackLoc);
 toast.success("GPS sincronizado com sucesso!");
 } finally {
 setIsLocating(false);
 }
 };

 // Tenta primeiro em modo rápido (WiFi/Rede Desktop, sem timeout de satélite)
 navigator.geolocation.getCurrentPosition(
 onPosSuccess,
 () => {
 // Fallback para alta precisão (mobile GPS)
 navigator.geolocation.getCurrentPosition(
 onPosSuccess,
 (err) => {
 setIsLocating(false);
 toast.error("Não foi possível obter coordenadas GPS no momento. Você pode escolher sua cidade na lista.");
 },
 { timeout: 15000, enableHighAccuracy: true }
 );
 },
 { timeout: 15000, enableHighAccuracy: true, maximumAge: 60000 }
 );
 };

 const handlePointerDown = () => {
 isLongPressRef.current = false;
 setIsHolding(true);
 holdTimerRef.current = setTimeout(() => {
 isLongPressRef.current = true;
 setIsHolding(false);
 triggerGeolocation();
 }, 600); // 600ms hold to activate GPS
 };

 const handlePointerUp = () => {
 if (holdTimerRef.current) {
 clearTimeout(holdTimerRef.current);
 }
 setIsHolding(false);
 if (!isLongPressRef.current) {
 setModalOpen(true);
 }
 };

 const handlePointerCancel = () => {
 if (holdTimerRef.current) {
 clearTimeout(holdTimerRef.current);
 }
 setIsHolding(false);
 };

 const isGlobal = !location.city || location.city.toLowerCase() === "global";

 return (
 <>
 <button
 onPointerDown={handlePointerDown}
 onPointerUp={handlePointerUp}
 onPointerCancel={handlePointerCancel}
 title="Clique para escolher cidade/CEP/mapa ou segure para ativar GPS"
 className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-8 sm:h-9 rounded-2xl text-[11px] sm:text-xs font-bold transition-all border select-none cursor-pointer shrink-0 ${
 isHolding
 ? "scale-95 bg-primary/20 border-primary text-primary"
 : "bg-muted/60 hover:bg-muted text-foreground border-border/80 hover:border-primary/40"
 } ${className}`}
 >
 {isLocating ? (
 <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
 ) : isGlobal ? (
 <Globe className="size-3.5 text-primary shrink-0" />
 ) : (
 <MapPin className="size-3.5 text-primary shrink-0" />
 )}
 <span className="truncate max-w-[70px] sm:max-w-[130px] lg:max-w-[180px]">
 {isGlobal ? "Global" : `${location.city}${location.state ? ` · ${location.state}` : ""}`}
 </span>
 </button>

 <LocationPickerModal
 open={modalOpen}
 onOpenChange={setModalOpen}
 currentLocation={location}
 onSelectLocation={(loc) => {
 updateLocation(loc);
 setModalOpen(false);
 toast.success(
 loc.city === "Global"
 ? "Modo Global ativado (Todas as Cidades)"
 : `Localidade definida para ${loc.city}`
 );
 }}
 onTriggerGPS={triggerGeolocation}
 />
 </>
 );
}

export function LocationPickerModal({
 open,
 onOpenChange,
 currentLocation,
 onSelectLocation,
 onTriggerGPS,
}: {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 currentLocation: LocationState;
 onSelectLocation: (loc: LocationState) => void;
 onTriggerGPS: () => void;
}) {
 const [activeTab, setActiveTab] = useState<"quick" | "map">("quick");
 const [cep, setCep] = useState("");
 const [isSearchingCep, setIsSearchingCep] = useState(false);

 // Map pin states
 const [pinLat, setPinLat] = useState(currentLocation.lat || -26.7264);
 const [pinLng, setPinLng] = useState(currentLocation.lng || -53.5186);
 const [resolvedAddress, setResolvedAddress] = useState(
 currentLocation.address || "São Miguel do Oeste - SC"
 );
 const [isResolvingPin, setIsResolvingPin] = useState(false);
 const [isMapFullscreen, setIsMapFullscreen] = useState(false);

 const POPULAR_CITIES = [
 { city: "Global", state: "", label: "🌐 Global (Todas as Cidades)", lat: undefined, lng: undefined },
 { city: "São Miguel do Oeste", state: "SC", label: "São Miguel do Oeste - SC", lat: -26.7264, lng: -53.5186 },
 { city: "Chapecó", state: "SC", label: "Chapecó - SC", lat: -27.1004, lng: -52.6152 },
 { city: "Xanxerê", state: "SC", label: "Xanxerê - SC", lat: -26.8747, lng: -52.4036 },
 { city: "Concórdia", state: "SC", label: "Concórdia - SC", lat: -27.2341, lng: -52.0264 },
 { city: "Maravilha", state: "SC", label: "Maravilha - SC", lat: -26.7622, lng: -53.1764 },
 { city: "Pinhalzinho", state: "SC", label: "Pinhalzinho - SC", lat: -26.8458, lng: -52.9933 },
 { city: "Florianópolis", state: "SC", label: "Florianópolis - SC", lat: -27.5954, lng: -48.5480 },
 { city: "Curitiba", state: "PR", label: "Curitiba - PR", lat: -25.4284, lng: -49.2733 },
 { city: "Porto Alegre", state: "RS", label: "Porto Alegre - RS", lat: -30.0346, lng: -51.2177 },
 { city: "São Paulo", state: "SP", label: "São Paulo - SP", lat: -23.5505, lng: -46.6333 },
 ];

 const handleSearchCep = async (e: React.FormEvent) => {
 e.preventDefault();
 const clean = cep.replace(/\D/g, "");
 if (clean.length !== 8) {
 toast.error("Digite um CEP válido com 8 números.");
 return;
 }

 setIsSearchingCep(true);
 try {
 const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
 const data = await res.json();
 if (data.erro) {
 toast.error("CEP não encontrado.");
 return;
 }

 onSelectLocation({
 city: data.localidade,
 state: data.uf,
 address: `${data.logradouro || "Centro"}, ${data.bairro || ""} - ${data.localidade}/${data.uf}`,
 source: "cep",
 });
 } catch {
 toast.error("Falha ao buscar CEP na base postal.");
 } finally {
 setIsSearchingCep(false);
 }
 };

 const resolvePinCoords = async (lat: number, lng: number) => {
 setIsResolvingPin(true);
 try {
 const res = await fetch(
 `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
 { headers: { "User-Agent": "WaesyCommunityCommerce/1.0" } },
 );
 const data = await res.json();
 const city =
 data.address?.city ||
 data.address?.town ||
 data.address?.municipality ||
 data.address?.village ||
 "Local Selecionado";
 const state = data.address?.state_code || data.address?.state || "";
 const addr = data.display_name || `${city}, ${state}`;

 setResolvedAddress(addr);
 return { city, state, address: addr };
 } catch {
 setResolvedAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
 return { city: "Ponto no Mapa", state: "", address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
 } finally {
 setIsResolvingPin(false);
 }
 };

 const handleConfirmMapPin = async () => {
 const geo = await resolvePinCoords(pinLat, pinLng);
 onSelectLocation({
 city: geo.city,
 state: geo.state,
 lat: pinLat,
 lng: pinLng,
 address: geo.address,
 source: "map_pin",
 });
 };

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent
 className={`p-0 overflow-hidden bg-background transition-all duration-300 ${
 isMapFullscreen || activeTab === "map"
 ? "max-w-4xl w-[95vw] h-[85vh] rounded-2xl flex flex-col"
 : "max-w-xl rounded-2xl"
 }`}
 >
 <DialogHeader className="p-5 sm:p-6 pb-3 bg-muted/20 shrink-0">
 <div className="flex items-center justify-between">
 <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-black tracking-tight">
 <MapPin className="size-5 text-primary" />
 <span>Selecione sua Localização</span>
 </DialogTitle>

 {/* Toggle Tabs */}
 <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-xl ">
 <button
 type="button"
 onClick={() => setActiveTab("quick")}
 className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
 activeTab === "quick"
 ? "bg-background text-foreground "
 : "text-muted-foreground hover:text-foreground"
 }`}
 >
 Cidades / CEP
 </button>
 <button
 type="button"
 onClick={() => setActiveTab("map")}
 className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
 activeTab === "map"
 ? "bg-primary text-primary-foreground "
 : "text-muted-foreground hover:text-foreground"
 }`}
 >
 <Compass className="size-3.5" />
 <span>Pin no Mapa</span>
 </button>
 </div>
 </div>
 <DialogDescription className="text-xs text-muted-foreground mt-1">
 Filtre produtos, comércios, eventos e classificados de acordo com a sua região.
 </DialogDescription>
 </DialogHeader>

 {/* TAB 1: QUICK CITIES & CEP */}
 {activeTab === "quick" && (
 <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
 {/* Quick GPS button */}
 <Button
 type="button"
 variant="outline"
 onClick={() => {
 onTriggerGPS();
 onOpenChange(false);
 }}
 className="w-full h-12 rounded-2xl border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs gap-2"
 >
 <Navigation className="size-4" />
 <span>Usar minha localização atual (GPS)</span>
 </Button>

 {/* Search by CEP */}
 <form onSubmit={handleSearchCep} className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Buscar por CEP
 </label>
 <div className="flex gap-2">
 <Input
 placeholder="Ex: 89801-000"
 value={cep}
 onChange={(e) => setCep(e.target.value)}
 maxLength={9}
 className="h-11 rounded-xl bg-card text-sm"
 />
 <Button
 type="submit"
 disabled={isSearchingCep}
 className="h-11 px-5 rounded-xl font-bold bg-primary text-primary-foreground text-xs"
 >
 {isSearchingCep ? <Loader2 className="size-4 animate-spin" /> : "Buscar"}
 </Button>
 </div>
 </form>

 {/* Popular Cities Quick Select */}
 <div className="space-y-2.5">
 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Cidades em Destaque
 </label>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
 {POPULAR_CITIES.map((c) => {
 const isSelected = (currentLocation.city || "Global").toLowerCase() === c.city.toLowerCase();

 return (
 <button
 key={c.city}
 type="button"
 onClick={() =>
 onSelectLocation({
 city: c.city,
 state: c.state,
 lat: c.lat,
 lng: c.lng,
 address: c.city === "Global" ? "Todas as Cidades e Regiões" : `${c.city}${c.state ? ` - ${c.state}` : ""}`,
 source: c.city === "Global" ? "default" : "manual",
 })
 }
 className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
 isSelected
 ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs"
 : "bg-card hover:bg-muted text-foreground border-border/80"
 }`}
 >
 <span className="truncate">
 {c.label || `${c.city}${c.state ? ` - ${c.state}` : ""}`}
 </span>
 {isSelected && <Check className="size-3.5 shrink-0 ml-1" />}
 </button>
 );
 })}
 </div>
 </div>
 </div>
 )}

 {/* TAB 2: INTERACTIVE FULLSCREEN MAP PIN PICKER */}
 {activeTab === "map" && (
 <div className="flex-1 flex flex-col min-h-0 relative">
 {/* Interactive Map Area */}
 <div
 className="flex-1 relative bg-zinc-950 w-full overflow-hidden cursor-crosshair"
 onClick={(e) => {
 const rect = e.currentTarget.getBoundingClientRect();
 const x = (e.clientX - rect.left) / rect.width - 0.5;
 const y = (e.clientY - rect.top) / rect.height - 0.5;
 // Offset latitude and longitude proportionally around Chapecó center
 const newLat = pinLat - y * 0.05;
 const newLng = pinLng + x * 0.05;
 setPinLat(newLat);
 setPinLng(newLng);
 resolvePinCoords(newLat, newLng);
 }}
 >
 {/* Map Tile Background Image */}
 <div
 className="absolute inset-0 size-full opacity-60 bg-cover bg-center pointer-events-none"
 style={{
 backgroundImage: `url('')`,
 }}
 />
 <div className="absolute inset-0 bg-radial from-transparent via-background/40 to-background/90 pointer-events-none" />

 {/* Center Map Pin with Pulse */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none z-20">
 <div className="px-3 py-1 rounded-full bg-foreground text-background text-[11px] font-black mb-1 whitespace-nowrap">
 {isResolvingPin ? "Localizando..." : "📍 Solte o Pin Aqui"}
 </div>
 <div className="relative flex items-center justify-center">
 <MapPin className="size-10 text-primary fill-primary drop- animate-bounce" />
 </div>
 <div className="size-3 bg-black/40 rounded-full blur-[2px] mt-0.5" />
 </div>

 {/* Coordinates Indicator */}
 <div className="absolute top-3 left-3 z-30 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] font-mono text-muted-foreground ">
 Lat: {pinLat.toFixed(5)} · Lng: {pinLng.toFixed(5)}
 </div>

 {/* Fullscreen Map Toggle & Recenter GPS */}
 <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5">
 <Button
 size="sm"
 variant="outline"
 onClick={(e) => {
 e.stopPropagation();
 onTriggerGPS();
 }}
 className="rounded-xl font-bold text-xs bg-background/90 backdrop-blur-md gap-1.5 "
 >
 <Crosshair className="size-3.5 text-primary" />
 <span>GPS Atual</span>
 </Button>
 </div>
 </div>

 {/* Bottom Bar: Resolved Address & Confirm Button */}
 <div className="p-4 sm:p-5 bg-card flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
 <div className="w-full sm:flex-1 space-y-0.5">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Endereço Selecionado
 </span>
 <p className="text-xs sm:text-sm font-bold text-foreground line-clamp-1">
 {resolvedAddress}
 </p>
 </div>

 <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
 <Button
 type="button"
 variant="outline"
 onClick={() => setActiveTab("quick")}
 className="w-1/3 sm:w-auto rounded-xl font-semibold text-xs"
 >
 Voltar
 </Button>
 <Button
 type="button"
 onClick={handleConfirmMapPin}
 disabled={isResolvingPin}
 className="flex-1 sm:flex-none rounded-xl font-bold text-xs bg-primary text-primary-foreground px-6 "
 >
 {isResolvingPin ? (
 <Loader2 className="size-3.5 animate-spin mr-1.5" />
 ) : (
 <Check className="size-3.5 mr-1.5" />
 )}
 <span>Definir Este Ponto</span>
 </Button>
 </div>
 </div>
 </div>
 )}
 </DialogContent>
 </Dialog>
 );
}
