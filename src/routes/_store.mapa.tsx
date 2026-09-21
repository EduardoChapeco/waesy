import { Tag } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
 MapPin,
 MagnifyingGlass,
 X,
 Plus,
 NavigationArrow,
 Broadcast,
 CaretLeft,
 CaretRight,
 Compass,
 ShareNetwork,
 Crosshair,
 BeerBottle,
 Coffee,
 Tree,
 MusicNotes,
 Clock,
 Heart,
 Camera,
 ArrowLeft,
 CaretUp,
 CaretDown,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMomentsMap } from "@/services/social.functions";
import { formatRelativeTime } from "@/lib/datetime";
import { MapLibreCanvas, type MapMarkerItem } from "@/components/mobility/maplibre-canvas";
import { PublishMomentModal } from "@/components/community/publish-moment-modal";
import { MomentDetailDrawer } from "@/components/community/moment-detail-drawer";
import { useMasterLocation } from "@/components/location/location-master-pill";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/mapa")({
 head: () => ({
 meta: [
 { title: "Mapa Interativo da Cidade" },
 {
 name: "description",
 content: "Descubra lugares, eventos, vibes e moments ao vivo na sua região.",
 },
 ],
 }),
 loader: async () => {
   try {
 const data = await getMomentsMap({ data: {} }).catch(() => ({
 moments: [],
 places: [],
 events: [],
 }));
 return { mapData: data };
   } catch (err) {
     console.error("[loader:_store.mapa] Unhandled error:", err);
     return { mapData: null };
   }
 },
 component: FullscreenMapaPage,
});

const VIBE_FILTERS = [
 { id: "all", label: "Todos", icon: Tag },
 { id: "live", label: "Ao Vivo", icon: Broadcast },
 { id: "mesa_aberta", label: "Mesas & Contas", icon: BeerBottle },
 { id: "cafe_trabalho", label: "Café & Trabalho", icon: Coffee },
 { id: "parque_esporte", label: "Parques & Treino", icon: Tree },
 { id: "encontro_musica", label: "Música & Cultura", icon: MusicNotes },
];

function FullscreenMapaPage() {
 const { mapData: initialMapData } = ((Route.useLoaderData?.() as any) || {});
 const { location } = useMasterLocation();
 const [activeVibe, setActiveVibe] = useState("all");
 const [searchQuery, setSearchQuery] = useState("");
 const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
 const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
 const [isExpandedMobile, setIsExpandedMobile] = useState(false);
 const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(() => ({
 lat: location.lat || -26.7264,
 lng: location.lng || -53.5186,
 }));
 const [mapZoom, setMapZoom] = useState(13.5);

 const { data: mapData, refetch } = useQuery({
 queryKey: ["moments-map", activeVibe],
 queryFn: () => getMomentsMap({ data: {} }),
 initialData: initialMapData,
 staleTime: 15_000,
 });

 const moments = mapData?.moments || [];
 const places = mapData?.places || [];
 const events = mapData?.events || [];

 const filteredMoments = useMemo(() => {
 return moments.filter((m: any) => {
 if (activeVibe === "live" && !m.is_live) return false;
 if (activeVibe === "mesa_aberta" && !m.is_bill_split_open) return false;
 if (
 (activeVibe === "cafe_trabalho" ||
 activeVibe === "parque_esporte" ||
 activeVibe === "encontro_musica") &&
 m.metadata?.vibe !== activeVibe
 ) {
 const sub = (m.subtitle || "").toLowerCase();
 const title = (m.title || "").toLowerCase();
 if (activeVibe === "cafe_trabalho" && !sub.includes("café") && !sub.includes("trabalh") && !title.includes("café")) return false;
 if (activeVibe === "parque_esporte" && !sub.includes("parque") && !sub.includes("treino") && !sub.includes("corrida") && !sub.includes("sol")) return false;
 if (activeVibe === "encontro_musica" && !sub.includes("feira") && !sub.includes("música") && !sub.includes("show") && !sub.includes("pet")) return false;
 }

 if (!searchQuery.trim()) return true;
 const q = searchQuery.toLowerCase().trim();
 return (
 m.title?.toLowerCase().includes(q) ||
 m.subtitle?.toLowerCase().includes(q) ||
 m.author_name?.toLowerCase().includes(q)
 );
 });
 }, [moments, activeVibe, searchQuery]);

 const mapMarkers = useMemo<MapMarkerItem[]>(() => {
 const list: MapMarkerItem[] = [];

 filteredMoments.forEach((m: any) => {
 if (m.lat && m.lng) {
 list.push({
 id: m.id,
 lat: Number(m.lat),
 lng: Number(m.lng),
 title: m.title || "Momento ao Vivo",
 kind: "moment",
 avatar_url: m.avatar_url,
 image_url: m.image_url,
 });
 }
 });

 if (activeVibe === "all") {
 places.slice(0, 8).forEach((p: any) => {
 if (p.lat && p.lng) {
 list.push({
 id: p.id,
 lat: Number(p.lat),
 lng: Number(p.lng),
 title: p.title,
 kind: "place",
 category: p.category,
 });
 }
 });
 }

 return list;
 }, [filteredMoments, places, activeVibe]);

 const selectedMoment = useMemo(() => {
 if (!selectedItemId) return null;
 return moments.find((m: any) => m.id === selectedItemId) || null;
 }, [moments, selectedItemId]);

 const handleSelectMoment = useCallback((moment: any) => {
 setSelectedItemId(moment.id);
 if (moment.lat && moment.lng) {
 setMapCenter({ lat: Number(moment.lat), lng: Number(moment.lng) });
 setMapZoom(15.5);
 }
 }, []);

 const handleLocateMe = useCallback(() => {
 if (typeof navigator !== "undefined" && navigator.geolocation) {
 navigator.geolocation.getCurrentPosition(
 (pos) => {
 setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
 setMapZoom(15);
 toast.success("Mapa centralizado na sua localização!");
 },
 () => {
 toast.error("Não foi possível obter sua localização atual.");
 },
 { enableHighAccuracy: true, timeout: 8000 }
 );
 }
 }, []);

 return (
 <div className="relative w-full h-[100dvh] overflow-hidden bg-background">
 {/* ── 1. MAPA MAPLIBRE FULL-SCREEN (BACKGROUND LAYER 100% INSET-0) ── */}
 <div className="absolute inset-0 size-full z-0">
 <MapLibreCanvas
 center={mapCenter}
 zoom={mapZoom}
 markers={mapMarkers}
 onMarkerClick={(id) => {
 const match = moments.find((m: any) => m.id === id);
 if (match) handleSelectMoment(match);
 }}
 className="size-full"
 />
 </div>

 {/* ── 2. CONTROLES FLUTUANTES SUPERIORES (GLASSMORPHISM) ── */}
 <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
 <Link
 to="/"
 className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-card/90 backdrop-blur-md text-xs font-bold text-foreground hover:bg-card active:scale-95 transition-all cursor-pointer"
 >
 <ArrowLeft size={16} weight="bold" />
 <span className="hidden sm:inline">Início</span>
 </Link>

 <div className="flex items-center gap-2 pointer-events-auto">
 <Button
 size="sm"
 onClick={handleLocateMe}
 className="size-9 rounded-2xl p-0 bg-card/90 backdrop-blur-md text-foreground hover:bg-card active:scale-95 transition-all cursor-pointer"
 title="Minha Localização"
 aria-label="Minha Localização"
 >
 <Crosshair size={18} weight="bold" className="text-primary" />
 </Button>

 <Button
 size="sm"
 onClick={() => setIsPublishModalOpen(true)}
 className="h-9 px-3.5 rounded-2xl font-bold text-xs gap-1.5 active:scale-95 transition-all cursor-pointer"
 >
 <Plus size={14} weight="bold" />
 <span>Publicar</span>
 </Button>
 </div>
 </div>

 {/* ── 3. BOTTOM SHEET FLUTUANTE DE MOMENTOS (ESTILO GOOGLE MAPS / UBER) ── */}
 <div
 className={cn(
 "absolute z-30 transition-all duration-300 ease-out",
        /* Mobile: Bottom Sheet ancorado embaixo */
        "bottom-0 left-0 right-0 rounded-t-3xl border-t border-x sm:border bg-card flex flex-col shadow-xs",
        isExpandedMobile ? "h-[85vh]" : "h-[36vh]",
 /* Desktop: Sidebar flutuante à esquerda */
 "sm:bottom-4 sm:top-16 sm:left-4 sm:right-auto sm:w-[400px] sm:h-auto sm:max-h-none sm:rounded-2xl"
 )}
 >
 {/* Drag Handle Mobile */}
 <div
 onClick={() => setIsExpandedMobile(!isExpandedMobile)}
 className="w-full flex sm:hidden items-center justify-center pt-2.5 pb-1 cursor-pointer select-none"
 >
 <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
 </div>

 {/* Cabeçalho do Drawer */}
 <div className="p-3.5 sm:p-4 pb-2 space-y-2.5 shrink-0">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="size-2 rounded-full bg-destructive animate-ping" />
 <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
 Moments Ao Vivo • {location.city && location.city.toLowerCase() !== "global" ? location.city : "Região"}
 </h2>
 </div>

 <button
 type="button"
 onClick={() => setIsExpandedMobile(!isExpandedMobile)}
 className="sm:hidden text-muted-foreground p-1"
 >
 {isExpandedMobile ? <CaretDown size={16} /> : <CaretUp size={16} />}
 </button>
 </div>

 {/* Campo de Busca */}
 <div className="relative">
 <MagnifyingGlass
 size={15}
 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
 />
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Buscar momentos, pessoas, rolês..."
 className="pl-8 pr-7 h-8 rounded-xl bg-background/80 border-border text-xs"
 />
 {searchQuery && (
 <button
 type="button"
 onClick={() => setSearchQuery("")}
 className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <X size={12} />
 </button>
 )}
 </div>

 {/* Filtros de Vibe */}
 <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar ">
 {VIBE_FILTERS.map((f) => {
 const isSelected = activeVibe === f.id;
 const Icon = f.icon;
 return (
 <button
 key={f.id}
 type="button"
 onClick={() => setActiveVibe(f.id)}
 className={cn(
 "h-7 px-2.5 rounded-xl text-[11px] font-bold shrink-0 transition-all border cursor-pointer flex items-center gap-1.5",
 isSelected
 ? "bg-primary/10 text-primary border-primary/30 font-bold"
 : "bg-background/80 border-border/80 text-muted-foreground hover:text-foreground"
 )}
 >
 <Icon size={12} weight={isSelected ? "bold" : "regular"} />
 <span>{f.label}</span>
 </button>
 );
 })}
 </div>
 </div>

 {/* ── CARD DETALHADO DO MOMENTO SELECIONADO ── */}
 {selectedMoment ? (
 <div className="p-3 shrink-0 ">
 <MomentDetailDrawer
 moment={selectedMoment}
 onClose={() => setSelectedItemId(null)}
 />
 </div>
 ) : null}

 {/* ── LISTA VERTICAL DE MOMENTOS (ROLAGEM SUAVE INDEPENDENTE) ── */}
 <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2.5">
 {filteredMoments.length === 0 ? (
 <div className="py-8 text-center text-muted-foreground text-xs space-y-2">
 <Camera className="size-6 mx-auto opacity-30 text-primary" />
 <p className="font-bold text-foreground">Nenhum momento ao vivo nessa vibe</p>
 <Button
 size="sm"
 onClick={() => setIsPublishModalOpen(true)}
 className="rounded-xl font-bold text-xs h-8 px-4"
 >
 + Publicar Meu Momento
 </Button>
 </div>
 ) : (
 filteredMoments.map((m: any) => {
 const isSelected = selectedItemId === m.id;
 return (
 <button
 key={m.id}
 type="button"
 onClick={() => handleSelectMoment(m)}
 className={cn(
 "w-full p-2.5 rounded-2xl text-left transition-all border flex items-start gap-3 cursor-pointer",
 isSelected
 ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary "
 : "bg-card border-border/70 hover:bg-muted/40 text-foreground "
 )}
 >
 {/* Foto do Momento */}
 <div className="relative size-12 rounded-xl overflow-hidden bg-muted shrink-0">
 {m.image_url ? (
 <img src={m.image_url} alt={m.title} className="size-full object-cover" />
 ) : (
 <div className="size-full flex items-center justify-center text-muted-foreground">
 <Camera size={16} />
 </div>
 )}
 {m.is_live && (
 <div className="absolute top-1 left-1 size-1.5 rounded-full bg-destructive animate-ping" />
 )}
 </div>

 {/* Informações da Pessoa & Atividade */}
 <div className="min-w-0 flex-1 space-y-0.5">
 <div className="flex items-center justify-between gap-1">
 <span className="text-[11px] font-bold text-foreground truncate">
 {m.author_name || "Membro Waesy"}
 </span>
 <span className="text-[9px] text-muted-foreground font-mono shrink-0">
 {formatRelativeTime(m.created_at || new Date().toISOString())}
 </span>
 </div>

 <h4 className="text-xs font-bold text-foreground line-clamp-1">
 {m.title || "Atividade ao Vivo"}
 </h4>
 <p className="text-[10px] text-muted-foreground line-clamp-1">
 {m.subtitle || m.content_text}
 </p>
 </div>
 </button>
 );
 })
 )}
 </div>
 </div>

 <PublishMomentModal
 open={isPublishModalOpen}
 onOpenChange={setIsPublishModalOpen}
 onSuccess={() => refetch()}
 />
 </div>
 );
}
