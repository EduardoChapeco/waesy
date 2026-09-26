import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Hotel,
  Plus,
  Search,
  Award,
  MapPin,
  Utensils,
  Phone,
  Globe,
  Camera,
  Edit2,
  Trash2,
  Check,
  Building,
  ExternalLink,
  ShieldCheck,
  Zap,
  Coffee,
  Waves,
  HeartHandshake,
  Compass,
  Copy,
  Eye,
  BedDouble,
  Users,
  Maximize2,
  Info,
  Clock,
  Dog,
  Ban,
  LayoutGrid,
  Table as TableIcon,
  Navigation,
  CheckCircle2,
  X,
  UploadCloud,
  Building2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet, type MetricCardItem } from "@/components/workspace/workspace-dashboard-sheet";
import { ImageUpload } from "@/components/ui/image-upload";
import { toast } from "sonner";
import {
 listHotelsBank,
 createHotel,
 updateHotel,
 deleteHotel,
 duplicateHotel,
 listDestinations,
 type HotelBankDTO,
 type DestinationDTO,
 type HotelRoomCategory,
 type HotelPolicies,
 type HotelStructure,
 type HotelRestaurant,
} from "@/services/travel-catalog.functions";
import { getStoreSettings } from "@/services/store.functions";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import { CANONICAL_DESTINATIONS, type CanonicalDestination } from "@/lib/destinations-catalog";
import { FAMOUS_HOTEL_PRESETS, RESORT_AMENITY_OPTIONS, type HotelPreset } from "@/lib/hotel-presets";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/turismo/hoteis")({
  head: () => ({ meta: [{ title: "Hotéis | Workspace Waesy" }] }),
 loader: async () => {
   try {
 const [hotels, destinations, store] = await Promise.all([
 listHotelsBank().catch(() => []),
 listDestinations().catch(() => []),
 getStoreSettings().catch(() => null),
 ]);
 return { hotels: hotels || [], destinations: destinations || [], store };
   } catch (err) {
     console.error("[loader:workspace.turismo.hoteis] Unhandled error:", err);
     return { hotels: null, destinations: null, store: null };
   }
 },
 component: WorkspaceHotelsPage,
});

function WorkspaceHotelsPage() {
 const { hotels: initialHotels, destinations = [], store } = ((Route.useLoaderData?.() as any) || {});
 const queryClient = useQueryClient();

 // Estados de Filtros e Visualização
 const [search, setSearch] = useState("");
 const [selectedDestination, setSelectedDestination] = useState<string>("all");
 const [selectedRegime, setSelectedRegime] = useState<string>("all");
 const [selectedStars, setSelectedStars] = useState<string>("all");
 const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

 // Modais
 const [isSheetOpen, setIsSheetOpen] = useState(false);
 const [editingHotel, setEditingHotel] = useState<HotelBankDTO | null>(null);
 const [previewHotel, setPreviewHotel] = useState<HotelBankDTO | null>(null);
 const [isMetricsOpen, setIsMetricsOpen] = useState(false);
 const [sheetTab, setSheetTab] = useState<string>("dados");

 // Form State Modular
 const [formData, setFormData] = useState<{
 name: string;
 destination_id: string;
 city: string;
 state: string;
 country: string;
 stars: number;
 regime_options: string[];
 description: string;
 cover_photo_url: string;
 photos: string[];
 website: string;
 phone: string;
 internal_rating: number;
 address: string;
 airport_distance: string;
 google_maps_url: string;
 location_lat: number | null;
 location_lng: number | null;
 max_installments: number;
 badges: string[];
 bio_bullets: string[];
 room_categories: HotelRoomCategory[];
 policies: HotelPolicies;
 structure: HotelStructure;
 }>({
 name: "",
 destination_id: "",
 city: "",
 state: "",
 country: "Brasil",
 stars: 4,
 regime_options: ["All Inclusive"],
 description: "",
 cover_photo_url: "",
 photos: [],
 website: "",
 phone: "",
 internal_rating: 4.8,
 address: "",
 airport_distance: "",
 google_maps_url: "",
 location_lat: null,
 location_lng: null,
 max_installments: 12,
 badges: ["Eco-friendly", "Pé na Areia"],
 bio_bullets: [
 "🌴 Paraíso ecológico beira-mar integrado à natureza",
 "🍹 All Inclusive: todas as refeições, snacks e bebidas inclusas",
 "🛏️ Acomodação Deluxe Casal",
 ],
 room_categories: [],
 policies: {
 check_in_time: "15:00",
 check_out_time: "12:00",
 children_policy: "Até 2 crianças até 12 anos grátis",
 pet_friendly: false,
 pet_policy: "",
 cancellation_policy: "Cancelamento gratuito até 7 dias antes",
 voltage: "220V",
 accessibility_pcd: true,
 smoking_policy: "100% não fumante nas acomodações",
 },
 structure: {
 pools_count: 2,
 beach_setup: "Pé na areia com cadeiras e espreguiçadeiras inclusas",
 kids_club: true,
 kids_club_details: "Monitores para crianças a partir de 4 anos",
 spa: false,
 spa_brand: "",
 gym: true,
 sports: ["Beach Tennis"],
 restaurants: [],
 },
 });

 // Auxiliares de input rápido
 const [newBadge, setNewBadge] = useState("");
 const [newBullet, setNewBullet] = useState("");
 const [newPhotoUrl, setNewPhotoUrl] = useState("");
 const [newRestaurant, setNewRestaurant] = useState({ name: "", cuisine: "", regime: "Incluso" });

 const { data: hotels = initialHotels, refetch } = useQuery({
 queryKey: ["workspace_hotels_bank", selectedDestination],
 queryFn: () =>
   listHotelsBank({
     data: {
       destination_id: selectedDestination === "all" ? undefined : selectedDestination,
     },
   }),
 initialData: initialHotels,
 });

 // Mutações BFF
 const createMut = useMutation({
 mutationFn: (payload: any) => createHotel({ data: payload }),
 onSuccess: () => {
 toast.success("Hotel cadastrado com sucesso no banco!");
 setIsSheetOpen(false);
 resetForm();
 refetch();
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao salvar hotel."),
 });

 const updateMut = useMutation({
 mutationFn: (payload: any) => updateHotel({ data: payload }),
 onSuccess: () => {
 toast.success("Hotel atualizado com sucesso!");
 setIsSheetOpen(false);
 resetForm();
 refetch();
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao atualizar hotel."),
 });

 const duplicateMut = useMutation({
 mutationFn: (id: string) => duplicateHotel({ data: { id } }),
 onSuccess: (dup) => {
 toast.success(`Hotel "${dup.name}" clonado com sucesso!`);
 refetch();
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao duplicar hotel."),
 });

 const deleteMut = useMutation({
 mutationFn: (id: string) => deleteHotel({ data: { id } }),
 onSuccess: () => {
 toast.success("Hotel removido do banco.");
 refetch();
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao remover hotel."),
 });

 const resetForm = () => {
 setEditingHotel(null);
 setSheetTab("dados");
 setFormData({
 name: "",
 destination_id: "",
 city: "",
 state: "",
 country: "Brasil",
 stars: 4,
 regime_options: ["All Inclusive"],
 description: "",
 cover_photo_url: "",
 photos: [],
 website: "",
 phone: "",
 internal_rating: 4.8,
 address: "",
 airport_distance: "",
 google_maps_url: "",
 location_lat: null,
 location_lng: null,
 max_installments: 12,
 badges: ["Eco-friendly", "Pé na Areia"],
 bio_bullets: [
 "🌴 Paraíso ecológico beira-mar integrado à natureza",
 "🍹 All Inclusive: todas as refeições, snacks e bebidas inclusas",
 "🛏️ Acomodação Deluxe Casal",
 ],
 room_categories: [],
 policies: {
 check_in_time: "15:00",
 check_out_time: "12:00",
 children_policy: "Até 2 crianças até 12 anos grátis",
 pet_friendly: false,
 pet_policy: "",
 cancellation_policy: "Cancelamento gratuito até 7 dias antes",
 voltage: "220V",
 accessibility_pcd: true,
 smoking_policy: "100% não fumante nas acomodações",
 },
 structure: {
 pools_count: 2,
 beach_setup: "Pé na areia com cadeiras e espreguiçadeiras inclusas",
 kids_club: true,
 kids_club_details: "Monitores para crianças a partir de 4 anos",
 spa: false,
 spa_brand: "",
 gym: true,
 sports: ["Beach Tennis"],
 restaurants: [],
 },
 });
 };

 const handleOpenCreate = () => {
 resetForm();
 setIsSheetOpen(true);
 };

 const handleOpenEdit = (hotel: HotelBankDTO) => {
 setEditingHotel(hotel);
 setSheetTab("dados");
 setFormData({
 name: hotel.name,
 destination_id: hotel.destination_id || "",
 city: hotel.city,
 state: hotel.state || "",
 country: hotel.country || "Brasil",
 stars: hotel.stars || 4,
 regime_options: hotel.regime_options || [],
 description: hotel.description || "",
 cover_photo_url: hotel.cover_photo_url || "",
 photos: hotel.photos || [],
 website: hotel.website || "",
 phone: hotel.phone || "",
 internal_rating: hotel.internal_rating ?? 0,
 address: hotel.address || "",
 airport_distance: hotel.airport_distance || "",
 google_maps_url: hotel.google_maps_url || "",
 location_lat: hotel.location_lat ?? null,
 location_lng: hotel.location_lng ?? null,
 max_installments: hotel.max_installments ?? 1,
 badges: hotel.badges || [],
 bio_bullets: hotel.bio_bullets || [],
 room_categories: hotel.room_categories || [],
 policies: {
 check_in_time: hotel.policies?.check_in_time || "15:00",
 check_out_time: hotel.policies?.check_out_time || "12:00",
 children_policy: hotel.policies?.children_policy || "Até 2 crianças até 12 anos grátis",
 pet_friendly: hotel.policies?.pet_friendly || false,
 pet_policy: hotel.policies?.pet_policy || "",
 cancellation_policy: hotel.policies?.cancellation_policy || "Cancelamento gratuito até 7 dias antes",
 voltage: hotel.policies?.voltage || "220V",
 accessibility_pcd: hotel.policies?.accessibility_pcd ?? true,
 smoking_policy: hotel.policies?.smoking_policy || "100% não fumante nas acomodações",
 },
 structure: {
 pools_count: hotel.structure?.pools_count ?? 2,
 beach_setup: hotel.structure?.beach_setup || "Pé na areia com serviço de praia",
 kids_club: hotel.structure?.kids_club ?? true,
 kids_club_details: hotel.structure?.kids_club_details || "Monitores especializados",
 spa: hotel.structure?.spa ?? false,
 spa_brand: hotel.structure?.spa_brand || "",
 gym: hotel.structure?.gym ?? true,
 sports: hotel.structure?.sports || ["Beach Tennis"],
 restaurants: hotel.structure?.restaurants || [],
 },
 });
 setIsSheetOpen(true);
 };

 const handleApplyPreset = (preset: HotelPreset) => {
 const matchedDest = destinations.find(
 (d: DestinationDTO) =>
 d.name.toLowerCase().includes(preset.city.toLowerCase()) ||
 preset.name.toLowerCase().includes(d.name.toLowerCase())
 );

 setFormData({
 name: preset.name,
 destination_id: matchedDest?.id || "",
 city: preset.city,
 state: preset.state,
 country: preset.country,
 stars: preset.stars,
 regime_options: preset.regime_options,
 description: preset.description,
 cover_photo_url: preset.cover_photo_url,
 photos: preset.photos || [preset.cover_photo_url],
 website: preset.website,
 phone: preset.phone,
 internal_rating: preset.internal_rating,
 address: preset.address,
 airport_distance: preset.airport_distance,
 google_maps_url: preset.google_maps_url,
 location_lat: null,
 location_lng: null,
 max_installments: 12,
 badges: preset.badges,
 bio_bullets: preset.bio_bullets,
 room_categories: preset.room_categories || [],
 policies: preset.policies || {
 check_in_time: "15:00",
 check_out_time: "12:00",
 children_policy: "Até 2 crianças até 12 anos grátis",
 pet_friendly: false,
 pet_policy: "",
 cancellation_policy: "Cancelamento gratuito até 7 dias antes",
 voltage: "220V",
 accessibility_pcd: true,
 smoking_policy: "100% não fumante",
 },
 structure: preset.structure || {
 pools_count: 3,
 beach_setup: "Pé na areia",
 kids_club: true,
 kids_club_details: "Monitores infantis",
 spa: true,
 spa_brand: "Spa",
 gym: true,
 sports: ["Beach Tennis"],
 restaurants: [],
 },
 });
 toast.success(`Preset de "${preset.name}" aplicado com acomodações, fotos e políticas reais!`);
 };

 const handleSelectCanonicalDestination = (dest: CanonicalDestination) => {
 const matchedDest = destinations.find(
 (d: DestinationDTO) =>
 d.name.toLowerCase().includes(dest.city.toLowerCase()) ||
 d.iata_gateway === dest.iata
 );

 setFormData((prev) => ({
 ...prev,
 city: dest.city,
 state: dest.state,
 country: dest.country,
 destination_id: matchedDest?.id || prev.destination_id,
 airport_distance: `Aeroporto Gateway: ${dest.iata} (${dest.city})`,
 bio_bullets: [
 `🌴 Localizado no destino paradisíaco de ${dest.name}`,
 `✈️ Aeroporto Gateway mais próximo: ${dest.iata} (${dest.city})`,
 `☀️ Melhor época para visitação: ${dest.bestSeason}`,
 ],
 }));
 toast.success(`Destino "${dest.name}" selecionado! Cidade, estado e gateway IATA preenchidos.`);
 };

 const toggleAmenityBadge = (amenity: string) => {
 if (formData.badges.includes(amenity)) {
 setFormData((prev) => ({
 ...prev,
 badges: prev.badges.filter((b) => b !== amenity),
 }));
 } else {
 setFormData((prev) => ({
 ...prev,
 badges: [...prev.badges, amenity],
 }));
 }
 };

 // Handlers de Quartos / Acomodações
 const handleAddRoomCategory = () => {
 const nextIdx = formData.room_categories.length + 1;
 const newRoom: HotelRoomCategory = {
 id: `room_${Date.now()}_${nextIdx}`,
 name: `Nova Categoria ${nextIdx}`,
 description: "Acomodação confortável com ar-condicionado, frigobar e varanda privativa.",
 capacity_adults: 2,
 capacity_children: 1,
 max_guests: 3,
 bedding: "1 Cama King-Size ou 2 Camas Casal",
 size_m2: 35,
 daily_rate_reference_cents: 120000,
 amenities: ["Ar Split", "Smart TV", "Frigobar", "Wi-Fi Grátis", "Varanda com Rede"],
 cover_photo_url: formData.cover_photo_url || "",
 photos: [],
 };
 setFormData({
 ...formData,
 room_categories: [...formData.room_categories, newRoom],
 });
 toast.success("Nova categoria de acomodação adicionada!");
 };

 const handleUpdateRoomCategory = (roomId: string, patch: Partial<HotelRoomCategory>) => {
 setFormData({
 ...formData,
 room_categories: formData.room_categories.map((r) => (r.id === roomId ? { ...r, ...patch } : r)),
 });
 };

 const handleRemoveRoomCategory = (roomId: string) => {
 setFormData({
 ...formData,
 room_categories: formData.room_categories.filter((r) => r.id !== roomId),
 });
 };

 // Handlers de Galeria
 const handleAddPhoto = () => {
 if (!newPhotoUrl.trim()) return;
 if (!formData.photos.includes(newPhotoUrl.trim())) {
 setFormData({ ...formData, photos: [...formData.photos, newPhotoUrl.trim()] });
 }
 setNewPhotoUrl("");
 };

 const handleRemovePhoto = (idx: number) => {
 setFormData({ ...formData, photos: formData.photos.filter((_, i) => i !== idx) });
 };

 // Handlers de Restaurantes
 const handleAddRestaurant = () => {
 if (!newRestaurant.name.trim()) return;
 const currentRest = formData.structure.restaurants || [];
 setFormData({
 ...formData,
 structure: {
 ...formData.structure,
 restaurants: [...currentRest, { ...newRestaurant }],
 },
 });
 setNewRestaurant({ name: "", cuisine: "", regime: "Incluso" });
 };

 const handleRemoveRestaurant = (idx: number) => {
 const currentRest = formData.structure.restaurants || [];
 setFormData({
 ...formData,
 structure: {
 ...formData.structure,
 restaurants: currentRest.filter((_, i) => i !== idx),
 },
 });
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!formData.name.trim() || !formData.city.trim()) {
 toast.error("Nome e cidade do hotel são obrigatórios.");
 return;
 }

 const payload = {
 ...formData,
 destination_id: formData.destination_id || undefined,
 };

 if (editingHotel) {
 updateMut.mutate({ id: editingHotel.id, ...payload });
 } else {
 createMut.mutate(payload);
 }
 };

 // Filtragem Inteligente
 const filtered = useMemo(() => {
 return hotels.filter((h: HotelBankDTO) => {
 // Busca texto
 if (search.trim()) {
 const term = search.toLowerCase();
 const matchesText =
 h.name.toLowerCase().includes(term) ||
 h.city.toLowerCase().includes(term) ||
 h.state?.toLowerCase().includes(term) ||
 h.destination_name?.toLowerCase().includes(term) ||
 h.badges?.some((b) => b.toLowerCase().includes(term));
 if (!matchesText) return false;
 }
 // Filtro Regime
 if (selectedRegime !== "all") {
 const hasRegime = h.regime_options?.some((r) =>
 r.toLowerCase().includes(selectedRegime.toLowerCase())
 );
 if (!hasRegime) return false;
 }
 // Filtro Estrelas
 if (selectedStars !== "all") {
 if (h.stars !== Number(selectedStars)) return false;
 }
 return true;
 });
 }, [hotels, search, selectedRegime, selectedStars]);

 // Métricas do Banco de Hospedagens
 const totalHotels = hotels.length;
 const allInclusiveCount = hotels.filter((h: HotelBankDTO) =>
 h.regime_options?.some((r) => r.toLowerCase().includes("all inclusive"))
 ).length;
 const fiveStarsCount = hotels.filter((h: HotelBankDTO) => (h.stars || 0) >= 5).length;
 const averageRating =
    totalHotels > 0
      ? (hotels.reduce((acc: number, h: HotelBankDTO) => acc + (h.internal_rating || 0), 0) / (hotels.filter(h => (h.internal_rating || 0) > 0).length || 1)).toFixed(1)
      : "5.0";
  const dashboardMetrics: MetricCardItem[] = useMemo(() => [
    {
      title: "Hospedagens no Banco",
      value: totalHotels,
      description: "Cadastros estruturados",
      icon: Hotel,
      color: "blue",
    },
    {
      title: "Resorts All Inclusive",
      value: allInclusiveCount,
      description: "Gastronomia & Lazer ilimitados",
      icon: Utensils,
      color: "amber",
    },
    {
      title: "5 Estrelas (Luxo)",
      value: fiveStarsCount,
      description: "Hotelaria premium de alto padrão",
      icon: Award,
      color: "purple",
    },
    {
      title: "Satisfação Média",
      value: `${averageRating} / 5.0`,
      description: "Classificação da curadoria",
      icon: ShieldCheck,
      color: "emerald",
    },
  ], [totalHotels, allInclusiveCount, fiveStarsCount, averageRating]);

 return (
 <NicheOperationalGuard
 targetNiche="tourism"
 toolTitle="Hotéis e Resorts"
 toolDescription="Catálogo de hospedagens, redes hoteleiras e resorts com acomodações estruturadas, fotos, comodidades, políticas e tarifas base para pacotes e propostas."
 store={store}
 >
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-4 md:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
        <WorkspaceCanonicalToolbar
          viewModes={[
            { id: "grid", label: "Cards", icon: LayoutGrid },
            { id: "table", label: "Tabela", icon: TableIcon },
          ]}
          activeViewMode={viewMode}
          onViewModeChange={(m) => setViewMode(m as any)}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por hotel, resort, cidade, estado..."
          filters={[
            ...(destinations.length > 0
              ? [
                  {
                    id: "destination",
                    label: "Destino",
                    value: selectedDestination,
                    options: [
                      { label: "Todos os Destinos", value: "all" },
                      ...destinations.map((d: DestinationDTO) => ({
                        label: `${d.name} (${d.country})`,
                        value: d.id,
                      })),
                    ],
                    onChange: setSelectedDestination,
                  },
                ]
              : []),
            {
              id: "regime",
              label: "Regime",
              value: selectedRegime,
              options: [
                { label: "Todos os Regimes", value: "all" },
                { label: "🍹 All Inclusive", value: "all inclusive" },
                { label: "🍽️ Pensão Completa", value: "pensão completa" },
                { label: "☕ Meia Pensão", value: "meia pensão" },
                { label: "🥐 Café da Manhã", value: "café da manhã" },
              ],
              onChange: setSelectedRegime,
            },
            {
              id: "stars",
              label: "Estrelas",
              value: selectedStars,
              options: [
                { label: "Todas Estrelas", value: "all" },
                { label: "★★★★★ 5 Estrelas", value: "5" },
                { label: "★★★★☆ 4 Estrelas", value: "4" },
                { label: "★★★☆☆ 3 Estrelas", value: "3" },
              ],
              onChange: setSelectedStars,
            },
          ]}
          onMetricsClick={() => setIsMetricsOpen(true)}
          metricsBadge={totalHotels > 0 ? `${totalHotels} Hotéis` : undefined}
          primaryAction={{
            label: "Novo Hotel",
            icon: Plus,
            onClick: handleOpenCreate,
          }}
        />

        <WorkspaceDashboardSheet
          title="Telemetria de Hospedagens"
          open={isMetricsOpen}
          onOpenChange={setIsMetricsOpen}
          items={dashboardMetrics}
        />

 {/* ── CONTEÚDO PRINCIPAL (GRID OU TABELA) ── */}
 {filtered.length === 0 ? (
 <div className="p-8 sm:p-12 text-center rounded-2xl bg-card border border-border/60 space-y-4">
 <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
 <Hotel className="size-7" />
 </div>
 <div className="space-y-1">
 <h3 className="text-base font-bold text-foreground">Nenhum hotel encontrado no banco</h3>
 <p className="text-xs text-muted-foreground max-w-md mx-auto">
 Cadastre os resorts parceiros ou utilize nossos presets de 1 toque (Nannai, Salinas, Pratagy, Colline de France, etc.) com acomodações e fotos de alta resolução.
 </p>
 </div>
 <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
 <Button onClick={handleOpenCreate} size="default" className="h-11 sm:h-9 px-5 rounded-xl font-bold bg-primary text-primary-foreground cursor-pointer shadow-xs">
 <Plus className="size-4 mr-1.5" />
 Cadastrar Hotel do Zero
 </Button>
 <Button
 onClick={() => {
 handleOpenCreate();
 handleApplyPreset(FAMOUS_HOTEL_PRESETS[0]);
 }}
 size="default"
 variant="outline"
 className="h-11 sm:h-9 px-5 rounded-xl font-medium cursor-pointer"
 >
 <Zap className="size-4 mr-1.5 text-amber-500" />
 Importar Nannai Muro Alto (Preset Completo)
 </Button>
 </div>
 </div>
 ) : viewMode === "grid" ? (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
 {filtered.map((hotel: HotelBankDTO) => {
 const roomsCount = hotel.room_categories?.length || 0;
 const photosCount = (hotel.photos?.length || 0) + (hotel.cover_photo_url ? 1 : 0);

 return (
 <div
 key={hotel.id}
 className="bg-card rounded-2xl overflow-hidden border border-border/70 hover:border-primary/40 transition-all group flex flex-col shadow-2xs hover:shadow-sm"
 >
 {/* Foto de Capa & Badges */}
 <div className="relative aspect-[16/9] w-full bg-muted/30 overflow-hidden">
 {hotel.cover_photo_url ? (
 <img
 src={hotel.cover_photo_url}
 alt={hotel.name}
 className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
 />
 ) : (
 <div className="size-full flex flex-col items-center justify-center text-muted-foreground/40 gap-1.5">
 <Camera className="size-8 stroke-[1.2]" />
 <span className="text-[10px]">Sem foto de capa</span>
 </div>
 )}
 <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

 {/* Top Badges */}
 <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
 <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold font-mono tracking-wide">
 {hotel.stars || 4} Estrelas
 </span>

 <div className="flex items-center gap-1.5">
 {photosCount > 1 && (
 <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold flex items-center gap-1">
 <Camera className="size-3" />
 <span>{photosCount} fotos</span>
 </span>
 )}
 <Badge className="bg-emerald-600 text-white font-semibold text-[10px] border-none shadow-xs">
 {hotel.internal_rating ? `Nota ${hotel.internal_rating}` : "Novo"}
 </Badge>
 </div>
 </div>

 {/* Bottom Info on Capa */}
 <div className="absolute bottom-3 left-3 right-3 text-white space-y-0.5">
 <h4 className="text-base font-bold drop-shadow-sm truncate">{hotel.name}</h4>
 <p className="text-xs text-white/80 truncate flex items-center gap-1">
 <MapPin className="size-3 shrink-0 text-primary-foreground/90" />
 <span>
 {hotel.city}, {hotel.state || hotel.country}
 </span>
 {hotel.destination_name && <span className="opacity-80">• ({hotel.destination_name})</span>}
 </p>
 </div>
 </div>

 {/* Informações Comerciais & Acomodações */}
 <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
 <div className="space-y-2.5 text-xs">
 {/* Regimes & Categorias de Quarto */}
 <div className="flex flex-wrap items-center gap-1.5">
 {hotel.regime_options.map((regime, i) => (
 <span
 key={i}
 className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold"
 >
 {regime}
 </span>
 ))}
 {roomsCount > 0 ? (
 <span className="px-2 py-0.5 rounded-lg bg-muted text-foreground text-[10px] font-semibold flex items-center gap-1 border border-border/50">
 <BedDouble className="size-3 text-muted-foreground" />
 <span>{roomsCount} {roomsCount === 1 ? "quarto" : "quartos"}</span>
 </span>
 ) : (
 <span className="px-2 py-0.5 rounded-lg bg-muted/50 text-muted-foreground text-[10px] italic">
 Sem quartos estruturados
 </span>
 )}
 </div>

 {/* Badges & Comodidades */}
 {hotel.badges && hotel.badges.length > 0 && (
 <div className="flex flex-wrap gap-1">
 {hotel.badges.slice(0, 3).map((b, i) => (
 <span
 key={i}
 className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] border border-border/50 font-medium"
 >
 {b}
 </span>
 ))}
 {hotel.badges.length > 3 && (
 <span className="text-[10px] text-muted-foreground self-center">
 +{hotel.badges.length - 3}
 </span>
 )}
 </div>
 )}

 {/* Localização & Aeroporto */}
 {hotel.airport_distance && (
 <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate pt-0.5">
 <Navigation className="size-3 text-primary shrink-0" />
 <span>{hotel.airport_distance}</span>
 </p>
 )}

 {/* Bullets de Venda */}
 {hotel.bio_bullets && hotel.bio_bullets.length > 0 && (
 <div className="space-y-1 pt-1.5 text-[11px] text-muted-foreground border-t border-border/40">
 {hotel.bio_bullets.slice(0, 2).map((bullet, i) => (
 <p key={i} className="truncate">
 {bullet}
 </p>
 ))}
 </div>
 )}
 </div>

 {/* Ações do Card */}
 <div className="pt-3 border-t border-border/40 flex items-center justify-between">
 <div className="flex items-center gap-1.5 sm:gap-1">
 <Button
 type="button"
 variant="secondary"
 onClick={() => setPreviewHotel(hotel)}
 className="h-11 sm:h-8 px-3.5 sm:px-3 rounded-xl text-xs gap-1.5 font-bold cursor-pointer"
 title="Visualizar Raio-X Completo do Hotel"
 >
 <Eye className="size-4 sm:size-3.5" />
 <span>Raio-X</span>
 </Button>

 <Button
 type="button"
 variant="outline"
 onClick={() => handleOpenEdit(hotel)}
 className="h-11 sm:h-8 px-3.5 sm:px-3 rounded-xl text-xs gap-1 font-bold cursor-pointer"
 >
 <Edit2 className="size-4 sm:size-3" />
 <span>Editar</span>
 </Button>

 <Button
 type="button"
 size="icon"
 variant="ghost"
 onClick={() => duplicateMut.mutate(hotel.id)}
 className="size-11 sm:size-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
 title="Duplicar Hotel"
 >
 <Copy className="size-4 sm:size-3.5" />
 </Button>
 </div>

 <CrudActionsMenu
                    entityName="Hotel"
                    onEdit={() => handleOpenEditor(hotel)}
                    onDuplicate={() => handleDuplicate(hotel)}
                    onView={() => setPreviewModalHotel(hotel)}
                    onDelete={async () => {
                      await deleteMut.mutateAsync(hotel.id);
                    }}
                    deleteConfirmTitle={`Excluir hotel "${hotel.name}"?`}
                    deleteConfirmDescription="Esta ação removerá permanentemente o hotel, seus quartos e tarifas cadastradas."
                  />
 </div>
 </div>
 </div>
 );
 })}
 </div>
 ) : (
 /* ── MODO TABELA OPERACIONAL ── */
 <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-2xs">
 <div className="overflow-x-auto no-scrollbar">
 <table className="w-full text-left text-xs">
 <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-semibold">
 <tr>
 <th className="p-3">Hotel / Resort</th>
 <th className="p-3">Localização</th>
 <th className="p-3">Estrelas</th>
 <th className="p-3">Regime</th>
 <th className="p-3">Acomodações</th>
 <th className="p-3">Políticas</th>
 <th className="p-3 text-right">Ações</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/40">
 {filtered.map((hotel: HotelBankDTO) => (
 <tr key={hotel.id} className="hover:bg-muted/20 transition-colors">
 <td className="p-3">
 <div className="flex items-center gap-3">
 {hotel.cover_photo_url ? (
                        <img
                          src={hotel.cover_photo_url}
                          alt={hotel.name}
                          className="size-10 rounded-lg object-cover shrink-0 border border-border/60"
                        />
                      ) : (
                        <div className="size-10 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 border border-border/60 text-muted-foreground">
                          <Building2 className="size-4" />
                        </div>
                      )}
 <div>
 <p className="font-bold text-foreground hover:text-primary transition-colors cursor-pointer" onClick={() => setPreviewHotel(hotel)}>
 {hotel.name}
 </p>
 <p className="text-[11px] text-muted-foreground truncate max-w-xs">
 {hotel.airport_distance || hotel.address || "Sem endereço cadastrado"}
 </p>
 </div>
 </div>
 </td>
 <td className="p-3 whitespace-nowrap">
 <span className="font-medium text-foreground">{hotel.city}</span>
 <span className="text-muted-foreground ml-1">({hotel.state || hotel.country})</span>
 </td>
 <td className="p-3 whitespace-nowrap">
 <div className="flex items-center gap-0.5 text-amber-500 font-bold">
 <span>{hotel.stars}★</span>
 {(hotel.internal_rating || 0) > 0 ? <span className="text-muted-foreground text-[10px] font-normal ml-1">({hotel.internal_rating})</span> : null}
 </div>
 </td>
 <td className="p-3">
 <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold whitespace-nowrap">
 {hotel.regime_options?.[0] || "Padrão"}
 </span>
 </td>
 <td className="p-3 whitespace-nowrap">
 <span className="font-mono text-xs font-semibold">
 {hotel.room_categories?.length || 0} tipos
 </span>
 </td>
 <td className="p-3 text-[11px] text-muted-foreground whitespace-nowrap">
 <span>Check-in: {hotel.policies?.check_in_time || "15:00"}</span>
 <span className="mx-1">•</span>
 <span>{hotel.policies?.pet_friendly ? "🐶 Pet Friendly" : "🚫 Sem Pet"}</span>
 </td>
 <td className="p-3 text-right whitespace-nowrap">
 <div className="flex items-center justify-end gap-1">
 <Button
 size="icon"
 variant="ghost"
 onClick={() => setPreviewHotel(hotel)}
 className="size-9 sm:size-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
 title="Raio-X do Hotel"
 >
 <Eye className="size-4 sm:size-3.5" />
 </Button>
 <Button
 size="icon"
 variant="ghost"
 onClick={() => handleOpenEdit(hotel)}
 className="size-9 sm:size-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
 title="Editar"
 >
 <Edit2 className="size-4 sm:size-3.5" />
 </Button>
 <Button
 size="icon"
 variant="ghost"
 onClick={() => duplicateMut.mutate(hotel.id)}
 className="size-9 sm:size-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
 title="Duplicar"
 >
 <Copy className="size-4 sm:size-3.5" />
 </Button>
 <CrudActionsMenu
                    entityName="Hotel"
                    onEdit={() => handleOpenEditor(hotel)}
                    onDuplicate={() => handleDuplicate(hotel)}
                    onView={() => setPreviewModalHotel(hotel)}
                    onDelete={async () => {
                      await deleteMut.mutateAsync(hotel.id);
                    }}
                    deleteConfirmTitle={`Excluir hotel "${hotel.name}"?`}
                    deleteConfirmDescription="Esta ação removerá permanentemente o hotel, seus quartos e tarifas cadastradas."
                  />
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 )}

 {/* ── SHEET RAIO-X DO HOTEL & RESORT (TRUTHFUL PREVIEW LATERAL) ── */}
 <Sheet open={!!previewHotel} onOpenChange={(open) => !open && setPreviewHotel(null)}>
 <SheetContent side="right" size="wide" className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] max-h-screen overflow-y-auto no-scrollbar p-0 bg-card border-l border-border/80">
 {previewHotel && (
 <div className="space-y-4">
 {/* Header com Foto de Capa Panorâmica */}
 <div className="relative aspect-[21/9] w-full bg-muted/40 overflow-hidden">
 {previewHotel.cover_photo_url ? (
                    <img
                      src={previewHotel.cover_photo_url}
                      alt={previewHotel.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full flex flex-col items-center justify-center bg-muted/60 text-muted-foreground gap-2">
                      <Building2 className="size-8 text-muted-foreground/60" />
                      <span className="text-xs font-medium">Sem foto de capa cadastrada</span>
                    </div>
                  )}
 <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
 <div className="absolute bottom-4 left-5 right-5 text-white">
 <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
 <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white font-mono text-[10px]">
 {previewHotel.stars || 4} Estrelas
 </span>
 {(previewHotel.internal_rating || 0) > 0 ? <span className="text-white/80 font-normal ml-1">Nota {previewHotel.internal_rating} / 5.0</span> : null}
 </div>
 <h2 className="text-xl font-bold">{previewHotel.name}</h2>
 <p className="text-xs text-white/80 flex items-center gap-1">
 <MapPin className="size-3 text-primary-foreground" />
 <span>{previewHotel.address || `${previewHotel.city}, ${previewHotel.state || previewHotel.country}`}</span>
 </p>
 </div>
 </div>

 <div className="p-5 space-y-5 text-xs">
 {/* Regimes e Badges */}
 <div className="flex flex-wrap items-center gap-1.5">
 {previewHotel.regime_options.map((regime, i) => (
 <Badge key={i} className="bg-primary text-primary-foreground font-bold text-[11px]">
 {regime}
 </Badge>
 ))}
 {previewHotel.badges?.map((b, i) => (
 <span key={i} className="px-2.5 py-1 rounded-full bg-muted text-foreground border border-border/60 text-[10px] font-semibold">
 {b}
 </span>
 ))}
 </div>

 {/* Galeria de Fotos */}
 {previewHotel.photos && previewHotel.photos.length > 0 && (
 <div className="space-y-2">
 <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
 <Camera className="size-3.5 text-primary" />
 <span>Galeria de Fotos do Hotel ({previewHotel.photos.length})</span>
 </h4>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
 {previewHotel.photos.map((p, idx) => (
 <div key={idx} className="aspect-[4/3] rounded-xl overflow-hidden border border-border/60 bg-muted/40">
 <img src={p} alt={`Foto ${idx + 1}`} className="size-full object-cover hover:scale-105 transition-transform" />
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Categorias de Acomodação (Room Types) */}
 <div className="space-y-2.5">
 <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
 <BedDouble className="size-3.5 text-primary" />
 <span>Categorias de Acomodação ({previewHotel.room_categories?.length || 0})</span>
 </h4>
 {previewHotel.room_categories && previewHotel.room_categories.length > 0 ? (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {previewHotel.room_categories.map((room) => (
 <div key={room.id} className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-2">
 {room.cover_photo_url && (
 <div className="aspect-[16/9] rounded-lg overflow-hidden border border-border/40">
 <img src={room.cover_photo_url} alt={room.name} className="size-full object-cover" />
 </div>
 )}
 <div>
 <div className="flex items-center justify-between font-bold text-foreground">
 <span>{room.name}</span>
 {room.daily_rate_reference_cents ? (
 <span className="text-primary font-mono text-xs">
 R$ {(room.daily_rate_reference_cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/dia
 </span>
 ) : null}
 </div>
 <p className="text-[11px] text-muted-foreground mt-0.5">{room.description}</p>
 </div>
 <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground pt-1 border-t border-border/40 font-medium">
 {room.bedding && <span>🛏️ {room.bedding}</span>}
 {room.size_m2 && <span>📐 {room.size_m2}m²</span>}
 <span>👥 Até {room.max_guests || room.capacity_adults} hóspedes</span>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-muted-foreground italic">Nenhum quarto estruturado cadastrado ainda.</p>
 )}
 </div>

 {/* Políticas de Hospedagem */}
 <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
 <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
 <Clock className="size-3.5 text-primary" />
 <span>Políticas & Condições de Estadia</span>
 </h4>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
 <div>
 <span className="text-muted-foreground block font-medium">Check-in / Check-out:</span>
 <span className="font-semibold text-foreground">
 {previewHotel.policies?.check_in_time || "15:00"} às {previewHotel.policies?.check_out_time || "12:00"}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground block font-medium">Crianças:</span>
 <span className="font-semibold text-foreground">
 {previewHotel.policies?.children_policy || "Sob consulta"}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground block font-medium">Animais (Pet):</span>
 <span className="font-semibold text-foreground">
 {previewHotel.policies?.pet_friendly ? "🐶 Sim (Pet Friendly)" : "🚫 Proibido"}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground block font-medium">Cancelamento:</span>
 <span className="font-semibold text-foreground">
 {previewHotel.policies?.cancellation_policy || "Consulte as regras"}
 </span>
 </div>
 <div>
 <span className="text-muted-foreground block font-medium">Voltagem:</span>
 <span className="font-semibold text-foreground">{previewHotel.policies?.voltage || "220V"}</span>
 </div>
 <div>
 <span className="text-muted-foreground block font-medium">Acessibilidade PCD:</span>
 <span className="font-semibold text-foreground">
 {previewHotel.policies?.accessibility_pcd ? "♿ Acessível" : "Parcial"}
 </span>
 </div>
 </div>
 </div>

 {/* Ações do Modal */}
 <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setPreviewHotel(null);
 handleOpenEdit(previewHotel);
 }}
 className="rounded-xl font-semibold gap-1.5"
 >
 <Edit2 className="size-3.5" />
 <span>Editar Hotel no Banco</span>
 </Button>
 <Button
 size="sm"
 onClick={() => setPreviewHotel(null)}
 className="rounded-xl font-semibold"
 >
 Fechar
 </Button>
 </div>
 </div>
 </div>
 )}
 </SheetContent>
 </Sheet>

 {/* ── SHEET MODULAR DE CADASTRO / EDIÇÃO ENTERPRISE (6 ABAS) ── */}
 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
 <SheetContent className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl overflow-y-auto no-scrollbar p-0 flex flex-col gap-0 bg-card">
 <SheetHeader className="p-5 border-b border-border/60 bg-muted/20 text-left shrink-0">
 <div className="flex items-center justify-between">
 <div>
 <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
 <Hotel className="size-4 text-primary" />
 <span>{editingHotel ? "Editar Hotel / Resort" : "Novo Hotel no Banco de Hospedagens"}</span>
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground mt-0.5">
 Cadastre com acomodações estruturadas, fotos, políticas e comodidades para auto-preenchimento instantâneo em propostas TravelOS.
 </SheetDescription>
 </div>
 </div>

 {/* Presets Rápidos de 1-Toque */}
 <div className="mt-3 pt-3 border-t border-border/50">
 <div className="flex items-center justify-between mb-1.5">
 <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
 <Zap className="size-3 text-amber-500" />
 <span>Preencher com Preset de Resort Famoso (1 Toque):</span>
 </span>
 </div>
 <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
 {FAMOUS_HOTEL_PRESETS.map((preset) => (
 <button
 key={preset.id}
 type="button"
 onClick={() => handleApplyPreset(preset)}
 className="px-2.5 py-1 rounded-lg bg-background border border-border/70 hover:border-primary/50 text-[11px] font-semibold text-foreground whitespace-nowrap cursor-pointer transition-colors"
 >
 ⚡ {preset.name.split(" ")[0]} {preset.name.split(" ")[1]}
 </button>
 ))}
 </div>
 </div>
 </SheetHeader>

 <Tabs value={sheetTab} onValueChange={setSheetTab} className="flex-1 flex flex-col">
 <div className="px-5 pt-3 border-b border-border/60 bg-muted/10 shrink-0 overflow-x-auto no-scrollbar">
 <TabsList className="bg-transparent border-b-0 h-9 p-0 gap-4">
 <TabsTrigger
 value="dados"
 className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2 text-xs font-bold"
 >
 1. Dados & Localização
 </TabsTrigger>
 <TabsTrigger
 value="galeria"
 className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2 text-xs font-bold"
 >
 2. Galeria & Capa ({formData.photos.length})
 </TabsTrigger>
 <TabsTrigger
 value="quartos"
 className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2 text-xs font-bold"
 >
 3. Acomodações ({formData.room_categories.length})
 </TabsTrigger>
 <TabsTrigger
 value="estrutura"
 className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2 text-xs font-bold"
 >
 4. Lazer & Gastronomia
 </TabsTrigger>
 <TabsTrigger
 value="politicas"
 className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2 text-xs font-bold"
 >
 5. Políticas & Regras
 </TabsTrigger>
 <TabsTrigger
 value="editorial"
 className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-1 pb-2 text-xs font-bold"
 >
 6. Editorial de Venda
 </TabsTrigger>
 </TabsList>
 </div>

 <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between">
 <div className="p-5 flex-1 space-y-4 text-xs">
 {/* ── ABA 1: DADOS GERAIS & LOCALIZAÇÃO ── */}
 <TabsContent value="dados" className="space-y-4 m-0">
 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Nome do Hotel / Resort *</Label>
 <Input
 value={formData.name}
 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
 placeholder="Ex: Nannai Muro Alto Resort & Spa, Salinas Maragogi, Hotel Fasano"
 className="h-10 rounded-xl bg-background"
 required
 />
 </div>

 {/* Atalho de Destinos Canônicos */}
 <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border/60">
 <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
 <Compass className="size-3 text-primary" />
 <span>Vincular a Destino Oficial (Preenche Cidade/Estado e IATA):</span>
 </Label>
 <div className="flex flex-wrap gap-1 pt-1">
 {CANONICAL_DESTINATIONS.slice(0, 8).map((cd) => (
 <button
 key={cd.id}
 type="button"
 onClick={() => handleSelectCanonicalDestination(cd)}
 className="px-2 py-0.5 rounded-md bg-background text-[11px] border border-border/60 hover:border-primary/50 text-foreground cursor-pointer transition-colors"
 >
 {cd.city} ({cd.iata})
 </button>
 ))}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Cidade *</Label>
 <Input
 value={formData.city}
 onChange={(e) => setFormData({ ...formData, city: e.target.value })}
 placeholder="Ex: Porto de Galinhas, Maceió"
 className="h-10 rounded-xl bg-background"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Estado</Label>
 <Input
 value={formData.state}
 onChange={(e) => setFormData({ ...formData, state: e.target.value })}
 placeholder="Ex: PE, AL, RS, BA"
 className="h-10 rounded-xl bg-background"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">País</Label>
 <Input
 value={formData.country}
 onChange={(e) => setFormData({ ...formData, country: e.target.value })}
 placeholder="Ex: Brasil, México"
 className="h-10 rounded-xl bg-background"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Endereço Completo & Bairro</Label>
 <Input
 value={formData.address}
 onChange={(e) => setFormData({ ...formData, address: e.target.value })}
 placeholder="Ex: Rodovia PE-09, Km 03 - Muro Alto"
 className="h-10 rounded-xl bg-background"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Distância do Aeroporto Gateway</Label>
 <Input
 value={formData.airport_distance}
 onChange={(e) => setFormData({ ...formData, airport_distance: e.target.value })}
 placeholder="Ex: 45 min do Aeroporto de Recife (REC)"
 className="h-10 rounded-xl bg-background"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Classificação (Estrelas)</Label>
 <Select
 value={String(formData.stars)}
 onValueChange={(val) => setFormData({ ...formData, stars: Number(val) })}
 >
 <SelectTrigger className="h-10 rounded-xl bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="5">★★★★★ 5 Estrelas (Luxo)</SelectItem>
 <SelectItem value="4">★★★★☆ 4 Estrelas (Superior)</SelectItem>
 <SelectItem value="3">★★★☆☆ 3 Estrelas (Conforto)</SelectItem>
 <SelectItem value="2">★★☆☆☆ 2 Estrelas (Econômico)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Regime Alimentar Principal</Label>
 <Select
 value={formData.regime_options[0] || "All Inclusive"}
 onValueChange={(val) => setFormData({ ...formData, regime_options: [val] })}
 >
 <SelectTrigger className="h-10 rounded-xl bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="All Inclusive">🍹 All Inclusive (Bebidas & Comidas)</SelectItem>
 <SelectItem value="Pensão Completa">🍽️ Pensão Completa (Café, Almoço e Jantar)</SelectItem>
 <SelectItem value="Meia Pensão">☕ Meia Pensão (Café e Jantar)</SelectItem>
 <SelectItem value="Café da Manhã">🥐 Café da Manhã Incluso</SelectItem>
 <SelectItem value="Apenas Hospedagem">🏨 Apenas Hospedagem (Sem Refeições)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Site Oficial do Hotel</Label>
 <Input
 value={formData.website}
 onChange={(e) => setFormData({ ...formData, website: e.target.value })}
 placeholder="https://hotel.com.br"
 className="h-10 rounded-xl bg-background"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Telefone / Central de Reservas</Label>
 <Input
 value={formData.phone}
 onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
 placeholder="(81) 3552-0000"
 className="h-10 rounded-xl bg-background"
 />
 </div>
 </div>
 
            {/* Coordenadas GPS (wttr.in e Mapas Reais) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground">Latitude GPS (ex: -8.4988)</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.location_lat ?? ""}
                  onChange={(e) => setFormData({ ...formData, location_lat: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="-8.4988000"
                  className="h-10 rounded-xl bg-background font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-foreground">Longitude GPS (ex: -34.9982)</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.location_lng ?? ""}
                  onChange={(e) => setFormData({ ...formData, location_lng: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="-34.9982000"
                  className="h-10 rounded-xl bg-background font-mono text-xs"
                />
              </div>
            </div>

            {/* Parcelamento Máximo (1-24x) */}
            <div className="space-y-2 p-3.5 rounded-xl bg-muted/20 border border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold text-foreground block">Parcelamento Máximo no Pacote</Label>
                  <span className="text-[11px] text-muted-foreground">Configuração de parcelamento para a vitrine e propostas</span>
                </div>
                <span className="text-xs font-mono font-bold text-primary">{formData.max_installments}x sem juros</span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={formData.max_installments}
                  onChange={(e) => setFormData({ ...formData, max_installments: parseInt(e.target.value, 10) || 1 })}
                  className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                />
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={formData.max_installments}
                  onChange={(e) => setFormData({ ...formData, max_installments: Math.min(24, Math.max(1, parseInt(e.target.value, 10) || 1)) })}
                  className="w-16 h-9 text-center font-mono text-xs rounded-xl bg-background"
                />
              </div>
            </div>
          </TabsContent>

 {/* ── ABA 2: GALERIA DE FOTOS & CAPA ── */}
 <TabsContent value="galeria" className="space-y-4 m-0">
 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Foto de Capa Principal (Panorâmica 16:9)</Label>
 <ImageUpload
 value={formData.cover_photo_url}
 onChange={(url) => setFormData({ ...formData, cover_photo_url: url })}
 onRemove={() => setFormData({ ...formData, cover_photo_url: "" })}
 bucket="cms-media"
 aspectPreset="widescreen"
 helperText="Envie a foto de destaque do hotel ou resort (16:9 em alta resolução)"
 />
 </div>

 <div className="space-y-2 pt-3 border-t border-border/50">
 <Label className="font-semibold text-foreground flex items-center justify-between">
 <span>Galeria Multi-Fotos (Piscinas, Praia, Restaurantes, Suítes)</span>
 <span className="text-muted-foreground text-[11px]">{formData.photos.length} fotos salvas</span>
 </Label>

 <div className="flex items-center gap-2">
 <Input
 value={newPhotoUrl}
 onChange={(e) => setNewPhotoUrl(e.target.value)}
 onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPhoto())}
 placeholder="Cole a URL da foto (Unsplash ou CDN) ou envie abaixo..."
 className="h-9 rounded-xl text-xs bg-background flex-1"
 />
 <Button type="button" size="sm" variant="outline" onClick={handleAddPhoto} className="rounded-xl h-9">
 + Adicionar URL
 </Button>
 </div>

 {formData.photos.length > 0 && (
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
 {formData.photos.map((url, idx) => (
 <div key={idx} className="relative aspect-[4/3] rounded-xl overflow-hidden border border-border/60 group bg-muted/30">
 <img src={url} alt={`Foto ${idx + 1}`} className="size-full object-cover" />
 <button
 type="button"
 onClick={() => handleRemovePhoto(idx)}
 className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
 >
 <X className="size-3.5" />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 </TabsContent>

 {/* ── ABA 3: CATEGORIAS DE ACOMODAÇÃO (ROOM TYPES) ── */}
 <TabsContent value="quartos" className="space-y-4 m-0">
 <div className="flex items-center justify-between">
 <div>
 <h4 className="font-bold text-foreground text-xs">Tipos de Quarto & Suítes Cadastrados</h4>
 <p className="text-[11px] text-muted-foreground">
 Essas categorias aparecem para seleção imediata no Studio de Propostas.
 </p>
 </div>
 <Button
 type="button"
 size="sm"
 onClick={handleAddRoomCategory}
 className="rounded-xl font-semibold gap-1.5 h-8 bg-primary text-primary-foreground"
 >
 <Plus className="size-3.5" />
 <span>Adicionar Quarto</span>
 </Button>
 </div>

 {formData.room_categories.length === 0 ? (
 <div className="p-8 text-center rounded-2xl bg-muted/20 border border-dashed border-border/70 space-y-2">
 <BedDouble className="size-8 text-muted-foreground mx-auto" />
 <p className="font-bold text-foreground text-xs">Nenhuma categoria de quarto cadastrada</p>
 <p className="text-muted-foreground text-[11px] max-w-sm mx-auto">
 Adicione quartos (ex: Bangalô Master, Apartamento Luxo, Suíte Família) com suas capacidades e comodidades.
 </p>
 <Button type="button" size="sm" variant="outline" onClick={handleAddRoomCategory} className="rounded-xl mt-2">
 + Criar Primeira Categoria
 </Button>
 </div>
 ) : (
 <div className="space-y-3">
 {formData.room_categories.map((room, idx) => (
 <div key={room.id} className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
 <div className="flex items-center justify-between">
 <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
 <BedDouble className="size-3.5 text-primary" />
 <span>Categoria #{idx + 1}</span>
 </span>
 <Button
 type="button"
 size="sm"
 variant="ghost"
 onClick={() => handleRemoveRoomCategory(room.id)}
 className="size-7 p-0 rounded-lg text-destructive hover:bg-destructive/10"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 <div className="space-y-1">
 <Label className="text-[10px] font-semibold text-foreground">Nome do Quarto / Suíte *</Label>
 <Input
 value={room.name}
 onChange={(e) => handleUpdateRoomCategory(room.id, { name: e.target.value })}
 placeholder="Ex: Bangalô Master Frente Mar"
 className="h-8 rounded-lg bg-background text-xs"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-[10px] font-semibold text-foreground">Configuração de Camas</Label>
 <Input
 value={room.bedding || ""}
 onChange={(e) => handleUpdateRoomCategory(room.id, { bedding: e.target.value })}
 placeholder="Ex: 1 Cama King-Size + 1 Sofá Cama"
 className="h-8 rounded-lg bg-background text-xs"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
 <div className="space-y-1">
 <Label className="text-[10px] font-semibold text-foreground">Adultos</Label>
 <Input
 type="number"
 min={1}
 max={10}
 value={room.capacity_adults}
 onChange={(e) => handleUpdateRoomCategory(room.id, { capacity_adults: Number(e.target.value) })}
 className="h-8 rounded-lg bg-background text-xs"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[10px] font-semibold text-foreground">Crianças</Label>
 <Input
 type="number"
 min={0}
 max={10}
 value={room.capacity_children}
 onChange={(e) => handleUpdateRoomCategory(room.id, { capacity_children: Number(e.target.value) })}
 className="h-8 rounded-lg bg-background text-xs"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[10px] font-semibold text-foreground">Área (m²)</Label>
 <Input
 type="number"
 min={10}
 value={room.size_m2 || ""}
 onChange={(e) => handleUpdateRoomCategory(room.id, { size_m2: Number(e.target.value) })}
 placeholder="Ex: 45"
 className="h-8 rounded-lg bg-background text-xs"
 />
 </div>
 </div>

 <div className="space-y-1">
 <Label className="text-[10px] font-semibold text-foreground">Descrição da Acomodação</Label>
 <Input
 value={room.description || ""}
 onChange={(e) => handleUpdateRoomCategory(room.id, { description: e.target.value })}
 placeholder="Ex: Vista panorâmica para o mar, varanda privativa com rede e banheira."
 className="h-8 rounded-lg bg-background text-xs"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-[10px] font-semibold text-foreground">Foto do Quarto</Label>
 <ImageUpload
 value={room.cover_photo_url || ""}
 onChange={(url) => handleUpdateRoomCategory(room.id, { cover_photo_url: url })}
 onRemove={() => handleUpdateRoomCategory(room.id, { cover_photo_url: "" })}
 bucket="destination-media"
 aspectPreset="widescreen"
 helperText="Upload da foto do quarto"
 />
 </div>
 </div>
 ))}
 </div>
 )}
 </TabsContent>

 {/* ── ABA 4: ESTRUTURA, LAZER & GASTRONOMIA ── */}
 <TabsContent value="estrutura" className="space-y-4 m-0">
 <div className="space-y-2">
 <Label className="font-semibold text-foreground">Comodidades & Lazer do Resort (Clique para Ativar):</Label>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
 {RESORT_AMENITY_OPTIONS.map((opt) => {
 const isActive = formData.badges.includes(opt);
 return (
 <button
 key={opt}
 type="button"
 onClick={() => toggleAmenityBadge(opt)}
 className={cn(
 "p-2.5 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer flex items-center justify-between",
 isActive
 ? "bg-primary/10 text-primary border-primary shadow-xs"
 : "bg-background text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/30"
 )}
 >
 <span>{opt}</span>
 {isActive && <Check className="size-3.5 text-primary shrink-0" />}
 </button>
 );
 })}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Estrutura de Praia</Label>
 <Input
 value={formData.structure.beach_setup || ""}
 onChange={(e) =>
 setFormData({
 ...formData,
 structure: { ...formData.structure, beach_setup: e.target.value },
 })
 }
 placeholder="Ex: Pé na areia com garçom, toalhas e quiosques privativos"
 className="h-10 rounded-xl bg-background"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Recreação & Kids Club</Label>
 <Input
 value={formData.structure.kids_club_details || ""}
 onChange={(e) =>
 setFormData({
 ...formData,
 structure: { ...formData.structure, kids_club_details: e.target.value },
 })
 }
 placeholder="Ex: Monitores das 09h às 22h para crianças a partir de 4 anos"
 className="h-10 rounded-xl bg-background"
 />
 </div>
 </div>

 <div className="space-y-2 pt-2 border-t border-border/50">
 <Label className="font-semibold text-foreground">Restaurantes Temáticos do Hotel</Label>
 <div className="flex items-center gap-2">
 <Input
 value={newRestaurant.name}
 onChange={(e) => setNewRestaurant({ ...newRestaurant, name: e.target.value })}
 placeholder="Nome do restaurante (Ex: Restaurante Francês Le Bistro)..."
 className="h-9 rounded-xl text-xs bg-background flex-1"
 />
 <Input
 value={newRestaurant.cuisine}
 onChange={(e) => setNewRestaurant({ ...newRestaurant, cuisine: e.target.value })}
 placeholder="Culinária (Ex: Frutos do Mar)..."
 className="h-9 rounded-xl text-xs bg-background w-36"
 />
 <Button type="button" size="sm" variant="outline" onClick={handleAddRestaurant} className="rounded-xl h-9">
 + Adicionar
 </Button>
 </div>

 {formData.structure.restaurants && formData.structure.restaurants.length > 0 && (
 <div className="space-y-1.5 pt-1">
 {formData.structure.restaurants.map((rest, idx) => (
 <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-muted/40 border border-border/50 text-xs">
 <div>
 <span className="font-bold text-foreground">{rest.name}</span>
 <span className="text-muted-foreground ml-2">({rest.cuisine || "Internacional"})</span>
 </div>
 <button
 type="button"
 onClick={() => handleRemoveRestaurant(idx)}
 className="text-destructive hover:underline text-[11px] cursor-pointer"
 >
 Remover
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 </TabsContent>

 {/* ── ABA 5: POLÍTICAS DE HOSPEDAGEM ── */}
 <TabsContent value="politicas" className="space-y-4 m-0">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Horário de Check-in</Label>
 <Input
 value={formData.policies.check_in_time || "15:00"}
 onChange={(e) =>
 setFormData({
 ...formData,
 policies: { ...formData.policies, check_in_time: e.target.value },
 })
 }
 placeholder="15:00"
 className="h-10 rounded-xl bg-background"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Horário de Check-out</Label>
 <Input
 value={formData.policies.check_out_time || "12:00"}
 onChange={(e) =>
 setFormData({
 ...formData,
 policies: { ...formData.policies, check_out_time: e.target.value },
 })
 }
 placeholder="12:00"
 className="h-10 rounded-xl bg-background"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Política de Crianças</Label>
 <Input
 value={formData.policies.children_policy || ""}
 onChange={(e) =>
 setFormData({
 ...formData,
 policies: { ...formData.policies, children_policy: e.target.value },
 })
 }
 placeholder="Ex: Até 2 crianças de até 12 anos grátis na mesma acomodação dos pais"
 className="h-10 rounded-xl bg-background"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Política de Cancelamento & Reembolso</Label>
 <Input
 value={formData.policies.cancellation_policy || ""}
 onChange={(e) =>
 setFormData({
 ...formData,
 policies: { ...formData.policies, cancellation_policy: e.target.value },
 })
 }
 placeholder="Ex: Cancelamento gratuito até 7 dias antes do check-in"
 className="h-10 rounded-xl bg-background"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Voltagem Elétrica</Label>
 <Select
 value={formData.policies.voltage || "220V"}
 onValueChange={(val) =>
 setFormData({
 ...formData,
 policies: { ...formData.policies, voltage: val },
 })
 }
 >
 <SelectTrigger className="h-10 rounded-xl bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="220V">220V</SelectItem>
 <SelectItem value="110V">110V</SelectItem>
 <SelectItem value="Bivolt">Bivolt (110V e 220V)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Aceita Animais (Pet Friendly)?</Label>
 <Select
 value={formData.policies.pet_friendly ? "sim" : "nao"}
 onValueChange={(val) =>
 setFormData({
 ...formData,
 policies: { ...formData.policies, pet_friendly: val === "sim" },
 })
 }
 >
 <SelectTrigger className="h-10 rounded-xl bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="sim">🐶 Sim, Pet Friendly</SelectItem>
 <SelectItem value="nao">🚫 Não aceita animais</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 </TabsContent>

 {/* ── ABA 6: EDITORIAL & DESTAQUES DE VENDA ── */}
 <TabsContent value="editorial" className="space-y-4 m-0">
 <div className="space-y-1.5">
 <Label className="font-semibold text-foreground">Descrição Editorial do Hotel</Label>
 <Textarea
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 placeholder="Escreva sobre a atmosfera, arquitetura, restaurantes e diferenciais para encantar o cliente na lâmina de proposta..."
 className="h-24 rounded-xl bg-background text-xs resize-none"
 />
 </div>

 <div className="space-y-2">
 <Label className="font-semibold text-foreground">
 Destaques em Bullets (Auto-preenchem a lâmina da proposta)
 </Label>
 <div className="space-y-1.5">
 {formData.bio_bullets.map((bullet, idx) => (
 <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 text-xs border border-border/50">
 <span className="flex-1 text-foreground font-medium">{bullet}</span>
 <button
 type="button"
 onClick={() =>
 setFormData({
 ...formData,
 bio_bullets: formData.bio_bullets.filter((_, i) => i !== idx),
 })
 }
 className="size-8 sm:size-5 text-muted-foreground hover:text-destructive flex items-center justify-center cursor-pointer rounded-lg"
 >
 ×
 </button>
 </div>
 ))}
 </div>

 <div className="flex items-center gap-2 pt-1">
 <Input
 value={newBullet}
 onChange={(e) => setNewBullet(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 if (newBullet.trim()) {
 setFormData({
 ...formData,
 bio_bullets: [...formData.bio_bullets, newBullet.trim()],
 });
 setNewBullet("");
 }
 }
 }}
 placeholder="Adicionar bullet persuasivo (Ex: 🌴 Piscinas naturais com bar molhado)..."
 className="h-11 sm:h-9 rounded-xl text-xs bg-background flex-1"
 />
 <Button
 type="button"
 variant="outline"
 onClick={() => {
 if (newBullet.trim()) {
 setFormData({
 ...formData,
 bio_bullets: [...formData.bio_bullets, newBullet.trim()],
 });
 setNewBullet("");
 }
 }}
 className="h-11 sm:h-9 px-4 rounded-xl text-xs font-semibold cursor-pointer shrink-0"
 >
 + Adicionar
 </Button>
 </div>
 </div>
 </TabsContent>
 </div>

 <SheetFooter className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2 shrink-0">
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsSheetOpen(false)}
 className="h-11 sm:h-9 px-4 rounded-xl font-semibold cursor-pointer"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={createMut.isPending || updateMut.isPending}
 className="rounded-xl font-bold bg-primary text-primary-foreground min-w-32"
 >
 {createMut.isPending || updateMut.isPending ? "Salvando..." : "Salvar Hotel no Banco"}
 </Button>
 </SheetFooter>
 </form>
 </Tabs>
 </SheetContent>
 </Sheet>
 </div>
 </NicheOperationalGuard>
 );
}
