import { useState, useEffect } from "react";
import { MapPin, Store, Compass, Users, ShieldCheck, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useMasterLocation, resolveGeoCoordinates, type LocationState } from "./location-master-pill";
import { toast } from "sonner";

export function GeolocationPermissionSheet() {
 const [open, setOpen] = useState(false);
 const [isVerifying, setIsVerifying] = useState(false);
 const [showLocationInPosts, setShowLocationInPosts] = useState(true);
 const [filterContentByRegion, setFilterContentByRegion] = useState(true);

 const { updateLocation } = useMasterLocation();

 useEffect(() => {
 if (typeof window === "undefined") return;

 // Se já foi concedido ou dispensado, não abre a sheet
 const hasGranted = localStorage.getItem("waesy_geo_permission_granted");
 const hasDismissed = localStorage.getItem("waesy_geo_permission_dismissed");

 if (hasGranted === "true" || hasDismissed === "true") {
 return;
 }

 // Abre o banner/modal suavemente após 1s
 const timer = setTimeout(() => {
 setOpen(true);
 }, 1000);

 return () => clearTimeout(timer);
 }, []);

 const handleDismiss = () => {
 if (typeof window !== "undefined") {
 localStorage.setItem("waesy_geo_permission_dismissed", "true");
 document.cookie = "waesy_geo_dismissed=true; path=/; max-age=31536000; SameSite=Lax";
 }
 setOpen(false);
 };

 const handleAllowLocation = () => {
 if (typeof navigator === "undefined" || !navigator.geolocation) {
 toast.error("Seu navegador não suporta geolocalização automática.");
 handleDismiss();
 return;
 }

 setIsVerifying(true);
 if (typeof window !== "undefined") {
 localStorage.setItem("waesy_geo_permission_granted", "true");
 localStorage.setItem("waesy_show_location_posts", String(showLocationInPosts));
 localStorage.setItem("waesy_filter_region", String(filterContentByRegion));
 document.cookie = "waesy_geo_granted=true; path=/; max-age=31536000; SameSite=Lax";
 }

 const onSheetPosSuccess = async (pos: GeolocationPosition) => {
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
 localStorage.removeItem("waesy_geo_permission_dismissed");
 localStorage.setItem("waesy_geo_permission_granted", "true");
 }
 toast.success(`Localização ativada: ${resolved.city}${resolved.state ? ` - ${resolved.state}` : ""}`);
 } catch {
 const fallbackLoc: LocationState = {
 city: "Minha Localização",
 state: "",
 lat: latitude,
 lng: longitude,
 source: "gps",
 };
 updateLocation(fallbackLoc);
 toast.success("Localização GPS sincronizada com sucesso!");
 } finally {
 setIsVerifying(false);
 setOpen(false);
 }
 };

 navigator.geolocation.getCurrentPosition(
 onSheetPosSuccess,
 () => {
 navigator.geolocation.getCurrentPosition(
 onSheetPosSuccess,
 (err) => {
 setIsVerifying(false);
 toast.info("Não foi possível obter coordenadas de GPS no momento. Você pode escolher sua cidade no menu superior.");
 setOpen(false);
 },
 { timeout: 15000, enableHighAccuracy: true }
 );
 },
 { timeout: 15000, enableHighAccuracy: true, maximumAge: 60000 }
 );
 };

 return (
 <Sheet open={open} onOpenChange={(val) => !val && handleDismiss()}>
 <SheetContent
 side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-6 flex flex-col justify-between overflow-y-auto no-scrollbar bg-card text-foreground border-border/60 sm:rounded-l-lg rounded-none"
 >
 <div className="space-y-6">
 {/* Header com Ícone de Pin */}
 <SheetHeader className="text-left space-y-3 p-0">
 <div className="size-14 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
 <MapPin className="size-7 animate-pulse" />
 </div>

 <div className="space-y-1">
 <SheetTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
 Ativar Localização
 </SheetTitle>
 <SheetDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
 Para mostrar conteúdo, negócios e pessoas próximas a você, precisamos da sua
 localização.
 </SheetDescription>
 </div>
 </SheetHeader>

 {/* Lista de Benefícios (Print 2) */}
 <div className="space-y-4 py-1">
 <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/40">
 <div className="size-8 rounded-lg bg-background text-primary flex items-center justify-center shrink-0 shadow-xs">
 <Store className="size-4" />
 </div>
 <div>
 <h4 className="text-xs font-bold text-foreground">Mostrar negócios e eventos próximos</h4>
 <p className="text-[11px] text-muted-foreground">
 Encontre lojas, delivery e atrações no seu bairro.
 </p>
 </div>
 </div>

 <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/40">
 <div className="size-8 rounded-lg bg-background text-amber-500 flex items-center justify-center shrink-0 shadow-xs">
 <Compass className="size-4" />
 </div>
 <div>
 <h4 className="text-xs font-bold text-foreground">Personalizar seu feed local</h4>
 <p className="text-[11px] text-muted-foreground">
 Receba ofertas e novidades mais relevantes para você.
 </p>
 </div>
 </div>

 <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/40">
 <div className="size-8 rounded-lg bg-background text-info flex items-center justify-center shrink-0 shadow-xs">
 <Users className="size-4" />
 </div>
 <div>
 <h4 className="text-xs font-bold text-foreground">Conectar com a sua comunidade</h4>
 <p className="text-[11px] text-muted-foreground">
 Interaja em classificados e no mural comunitário.
 </p>
 </div>
 </div>
 </div>

 {/* Switches de Preferência (Print 2) */}
 <div className="space-y-3 pt-2 border-t border-border/50">
 <div className="flex items-center justify-between gap-3 p-1">
 <label htmlFor="geo-post-toggle" className="text-xs font-semibold text-foreground cursor-pointer">
 Mostrar localização em posts
 </label>
 <Switch
 id="geo-post-toggle"
 checked={showLocationInPosts}
 onCheckedChange={setShowLocationInPosts}
 />
 </div>

 <div className="flex items-center justify-between gap-3 p-1">
 <label htmlFor="geo-filter-toggle" className="text-xs font-semibold text-foreground cursor-pointer">
 Filtrar conteúdo por região
 </label>
 <Switch
 id="geo-filter-toggle"
 checked={filterContentByRegion}
 onCheckedChange={setFilterContentByRegion}
 />
 </div>
 </div>

 {/* Aviso de Privacidade */}
 <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/20 border border-border/30 text-[11px] text-muted-foreground">
 <ShieldCheck className="size-4 text-emerald-500 shrink-0 mt-1" />
 <span>
 Sua privacidade é importante. Você pode alterar ou desativar isso a qualquer momento.
 </span>
 </div>
 </div>

 {/* Rodapé de Ações (44px touch targets) */}
 <div className="pt-6 space-y-2">
 <Button
 type="button"
 disabled={isVerifying}
 onClick={handleAllowLocation}
 className="w-full h-11 rounded-lg font-bold text-xs gap-2 cursor-pointer bg-foreground text-background hover:bg-foreground/90 transition-all active:scale-[0.98]"
 >
 {isVerifying ? (
 <>
 <Loader2 className="size-4 animate-spin" />
 <span>Verificando localização...</span>
 </>
 ) : (
 <>
 <MapPin className="size-4" />
 <span>Permitir Localização</span>
 </>
 )}
 </Button>

 <Button
 type="button"
 variant="ghost"
 onClick={handleDismiss}
 disabled={isVerifying}
 className="w-full h-10 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
 >
 Agora Não
 </Button>
 </div>
 </SheetContent>
 </Sheet>
 );
}
