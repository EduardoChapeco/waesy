import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
 MapPin,
 Plus,
 Search,
 Camera,
 Calendar,
 Compass,
 Edit2,
 Trash2,
 Hotel,
 Sun,
 ExternalLink,
 Plane,
 Building2,
 Layers,
 Image as ImageIcon,
 CheckCircle2,
 Utensils,
 Lightbulb,
 Tag,
 X,
 UploadCloud,
 Loader2,
 Award,
 Clock,
 HelpCircle,
 Eye,
 Check,
 ChevronDown,
 ChevronUp,
 ArrowRight,
 MessageSquare,
 ShieldCheck,
 Globe2,
 Sliders,
 ListPlus,
 FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
 Sheet,
 SheetContent,
 SheetHeader,
 SheetTitle,
 SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet, type MetricCardItem } from "@/components/workspace/workspace-dashboard-sheet";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";
import { uploadStoreMedia } from "@/services/storage.functions";
import {
 listDestinations,
 createDestination,
 updateDestination,
 deleteDestination,
 type DestinationDTO,
 type DestinationSection,
 type DestinationAttraction,
 type DestinationReview,
} from "@/services/travel-catalog.functions";
import { getStoreSettings } from "@/services/store.functions";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import {
 CANONICAL_DESTINATIONS,
 BRAZIL_STATES,
 MAJOR_IATA_AIRPORTS,
 TOURISM_TAGS_PRESETS,
 getDestinationsByState,
 findAirportByIata,
 searchCanonicalDestinations,
 type CanonicalDestination,
} from "@/lib/destinations-catalog";

export const Route = createFileRoute("/workspace/turismo/destinos")({
 head: () => ({ meta: [{ title: "Banco de Destinos Turísticos & CMS | Workspace Waesy" }] }),
 loader: async () => {
   try {
 const [destinations, store] = await Promise.all([
 listDestinations().catch(() => []),
 getStoreSettings().catch(() => null),
 ]);
 return { destinations: destinations || [], store };
   } catch (err) {
     console.error("[loader:workspace.turismo.destinos] Unhandled loader error:", err);
     return { destinations: null, store: null };
   }
 },
 component: WorkspaceDestinationsPage,
});

export default function WorkspaceDestinationsPage() {
 const { destinations: initialData, store } = ((Route.useLoaderData?.() as any) || {});
 const queryClient = useQueryClient();
 const [search, setSearch] = useState("");
 const [filterTag, setFilterTag] = useState("all");
 const [isSheetOpen, setIsSheetOpen] = useState(false);
 const [isMetricsOpen, setIsMetricsOpen] = useState(false);
 const [previewModalDest, setPreviewModalDest] = useState<DestinationDTO | null>(null);
 const [editingDestination, setEditingDestination] = useState<DestinationDTO | null>(null);
 const [activeTab, setActiveTab] = useState("identificacao");

 // Form states — Aba 1: Identificação Canônica & Localização
 const [name, setName] = useState("");
 const [city, setCity] = useState("");
 const [state, setState] = useState("SC");
 const [country, setCountry] = useState("Brasil");
 const [iataGateway, setIataGateway] = useState("");
 const [timezone, setTimezone] = useState("America/Sao_Paulo (UTC-3)");
 const [climateType, setClimateType] = useState("Subtropical / Tropical");
 const [bestSeason, setBestSeason] = useState("");

 // Form states — Aba 2: Mídias & Galeria Panorâmica
 const [coverImageUrl, setCoverImageUrl] = useState("");
 const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
 const [newGalleryUrlInput, setNewGalleryUrlInput] = useState("");
 const [isUploadingGallery, setIsUploadingGallery] = useState(false);
 const galleryInputRef = useRef<HTMLInputElement>(null);

 // Form states — Aba 3: Seções do Destino (CMS Modular)
 const [sections, setSections] = useState<DestinationSection[]>([]);
 const [highlightsInput, setHighlightsInput] = useState("");
 const [gastronomyTip, setGastronomyTip] = useState("");
 const [travelTip, setTravelTip] = useState("");
 const [description, setDescription] = useState("");

 // Form states — Aba 4: Avaliações de Viajantes & Provas Sociais
 const [reviews, setReviews] = useState<DestinationReview[]>([]);
 const [newReviewAuthor, setNewReviewAuthor] = useState("");
 const [newReviewCity, setNewReviewCity] = useState("");
 const [newReviewRating, setNewReviewRating] = useState(5);
 const [newReviewDate, setNewReviewDate] = useState("Janeiro / 2026");
 const [newReviewComment, setNewReviewComment] = useState("");

 // Form states — Aba 5: Tags & SEO
 const [selectedTags, setSelectedTags] = useState<string[]>([]);
 const [seoTitle, setSeoTitle] = useState("");
 const [seoDescription, setSeoDescription] = useState("");

 // Estado da busca canônica instantânea
 const [canonicalSearch, setCanonicalSearch] = useState("");
 const filteredCanonicalSearchResults = useMemo(() => {
   if (!canonicalSearch.trim()) return [];
   return searchCanonicalDestinations(canonicalSearch);
 }, [canonicalSearch]);

 const { data: destinations = initialData, refetch } = useQuery({
 queryKey: ["workspace_destinations"],
 queryFn: () => listDestinations(),
 initialData,
 });

 const createMut = useMutation({
 mutationFn: (payload: any) => createDestination({ data: payload }),
 onSuccess: () => {
 toast.success("Destino turístico cadastrado com sucesso!");
 setIsSheetOpen(false);
 resetForm();
 refetch();
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao salvar destino."),
 });

 const updateMut = useMutation({
 mutationFn: (payload: any) => updateDestination({ data: payload }),
 onSuccess: () => {
 toast.success("Destino atualizado com sucesso!");
 setIsSheetOpen(false);
 resetForm();
 refetch();
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao atualizar destino."),
 });

 const deleteMut = useMutation({
 mutationFn: (id: string) => deleteDestination({ data: { id } }),
 onSuccess: () => {
 toast.success("Destino removido com sucesso.");
 refetch();
 },
 onError: (err: any) => toast.error(err?.message || "Erro ao remover destino."),
 });

 const resetForm = () => {
 setEditingDestination(null);
 setName("");
 setCity("");
 setState("SC");
 setCountry("Brasil");
 setIataGateway("");
 setTimezone("America/Sao_Paulo (UTC-3)");
 setClimateType("Subtropical / Tropical");
 setBestSeason("");
 setCoverImageUrl("");
 setGalleryUrls([]);
 setNewGalleryUrlInput("");
 setDescription("");
 setHighlightsInput("");
 setGastronomyTip("");
 setTravelTip("");
 setSelectedTags([]);
 setSections([]);
 setReviews([]);
 setSeoTitle("");
 setSeoDescription("");
 setCanonicalSearch("");
 setActiveTab("identificacao");
 };

 const handleOpenCreate = () => {
 resetForm();
 setIsSheetOpen(true);
 };

 // Carrega Preset Canônico Oficial de 1 Toque
 const handleApplyPreset = (canonical: CanonicalDestination) => {
 setName(canonical.name);
 setCity(canonical.city);
 setState(canonical.state);
 setCountry(canonical.country);
 setIataGateway(canonical.iata);
 setBestSeason(canonical.bestSeason);
 setCoverImageUrl(canonical.coverImage);
 setGalleryUrls(canonical.gallery || []);
 setDescription(canonical.description);
 setHighlightsInput(canonical.highlights ? canonical.highlights.join(", ") : "");
 setGastronomyTip(canonical.gastronomyTip || "");
 setTravelTip(canonical.travelTip || "");
 setSelectedTags(canonical.tags || []);
 setTimezone(canonical.timezone || "America/Sao_Paulo (UTC-3)");
 setClimateType(canonical.climateType || "Tropical / Subtropical");

 // Gerar seções padrão ricas se não houver
 const defaultSections: DestinationSection[] = [
 {
 id: crypto.randomUUID(),
 type: "photo_text",
 title: `Encante-se com ${canonical.name}`,
 subtitle: "Apresentação do Destino",
 content_text: canonical.description,
 layout_variant: "left",
 media_urls: [canonical.coverImage],
 },
 {
 id: crypto.randomUUID(),
 type: "highlights_grid",
 title: "Atrações Imperdíveis",
 subtitle: "O que você não pode deixar de visitar",
 items: canonical.highlights.map((h) => ({
 id: crypto.randomUUID(),
 title: h,
 description: `Ponto turístico icônico em ${canonical.city}. Passeio obrigatório para fotos inesquecíveis.`,
 badge: "Destaque",
 image_url: canonical.gallery?.[0] || canonical.coverImage,
 })),
 },
 {
 id: crypto.randomUUID(),
 type: "gastronomy_guide",
 title: "Sabores & Gastronomia Local",
 subtitle: "Experiências culinárias inesquecíveis",
 content_text: canonical.gastronomyTip,
 items: [
 {
 id: crypto.randomUUID(),
 title: "Pratos Tradicionais",
 description: canonical.gastronomyTip,
 badge: "Imperdível",
 },
 ],
 },
 {
 id: crypto.randomUUID(),
 type: "travel_tips_cards",
 title: "Dicas de Ouro do Viajante",
 subtitle: "Informações essenciais para sua viagem perfeita",
 content_text: canonical.travelTip,
 items: [
 { id: crypto.randomUUID(), title: "Melhor Temporada", description: canonical.bestSeason, badge: "Clima" },
 { id: crypto.randomUUID(), title: "O Que Levar", description: canonical.travelTip, badge: "Mala" },
 { id: crypto.randomUUID(), title: "Aeroporto Principal", description: `Portão de entrada oficial pelo IATA ${canonical.iata}.`, badge: "Logística" },
 ],
 },
 {
 id: crypto.randomUUID(),
 type: "faq_accordion",
 title: "Dúvidas Frequentes sobre o Destino",
 subtitle: "Perguntas mais comuns de nossos viajantes",
 items: [
 {
 id: crypto.randomUUID(),
 title: `Qual a melhor época para visitar ${canonical.name}?`,
 description: canonical.bestSeason,
 },
 {
 id: crypto.randomUUID(),
 title: "Qual aeroporto mais próximo devo comprar?",
 description: `O aeroporto gateway recomendado é ${canonical.iata} (${findAirportByIata(canonical.iata)?.name || canonical.iata}), permitindo transfer rápido até os principais hotéis.`,
 },
 {
 id: crypto.randomUUID(),
 title: "Quantos dias são ideais para o roteiro?",
 description: "Recomendamos de 4 a 7 dias completos para aproveitar com tranquilidade sem correria.",
 },
 ],
 },
 ];
 setSections(defaultSections);

 // Avaliações demonstrativas de alta conversão
 const sampleReviews: DestinationReview[] = [
 {
 id: crypto.randomUUID(),
 author_name: "Mariana & Carlos Silveira",
 author_city: "Chapecó - SC",
 rating: 5,
 travel_month_year: "Janeiro / 2026",
 comment: `Viagem espetacular para ${canonical.name}! Os atrativos superaram todas as expectativas. Organização impecável e roteiro perfeito.`,
 verified: true,
 },
 {
 id: crypto.randomUUID(),
 author_name: "Roberto Albuquerque",
 author_city: "São Paulo - SP",
 rating: 5,
 travel_month_year: "Fevereiro / 2026",
 comment: `O guia e as dicas de restaurantes foram decisivos. Destino maravilhoso, voltaremos com certeza!`,
 verified: true,
 },
 ];
 setReviews(sampleReviews);

 toast.success(`Destino "${canonical.name}" preenchido com dados oficiais e seções ricas!`);
 };

 const handleOpenEdit = (dest: DestinationDTO) => {
 setEditingDestination(dest);
 setName(dest.name);
 setCity(dest.city || dest.name);
 setState(dest.state || dest.region || "SC");
 setCountry(dest.country || "Brasil");
 setIataGateway(dest.iata_gateway || "");
 setTimezone(dest.timezone || "America/Sao_Paulo (UTC-3)");
 setClimateType(dest.climate_type || "Tropical / Subtropical");
 setBestSeason(dest.best_season || "");
 setCoverImageUrl(dest.cover_image_url || "");
 setGalleryUrls(dest.gallery_urls || []);
 setNewGalleryUrlInput("");
 setDescription(dest.description || "");
 setHighlightsInput(dest.highlights ? dest.highlights.join(", ") : "");
 setGastronomyTip(dest.gastronomy_tip || "");
 setTravelTip(dest.travel_tip || "");
 setSelectedTags(dest.tags || []);
 setSections(dest.sections || []);
 setReviews(dest.reviews || []);
 setSeoTitle(dest.seo_title || "");
 setSeoDescription(dest.seo_description || "");
 setActiveTab("identificacao");
 setIsSheetOpen(true);
 };

 // Upload de Múltiplas Fotos na Galeria
 const handleUploadGalleryFiles = async (files: FileList | null) => {
 if (!files || files.length === 0) return;
 setIsUploadingGallery(true);
 const uploadedUrls: string[] = [];

 try {
 for (let i = 0; i < files.length; i++) {
 const file = files[i];
 const base64 = await new Promise<string>((resolve, reject) => {
 const reader = new FileReader();
 reader.onload = () => resolve(reader.result as string);
 reader.onerror = reject;
 reader.readAsDataURL(file);
 });
 const res = await uploadStoreMedia({
 data: {
 fileName: file.name,
 fileType: file.type || "image/jpeg",
 base64Data: base64,
 bucket: "cms-media",
 },
 });
 if (res?.url) {
 uploadedUrls.push(res.url);
 }
 }

 if (uploadedUrls.length > 0) {
 setGalleryUrls((prev) => [...prev, ...uploadedUrls]);
 toast.success(`${uploadedUrls.length} fotos enviadas para a galeria!`);
 }
 } catch (e: any) {
 toast.error(e?.message || "Erro no upload das imagens da galeria.");
 } finally {
 setIsUploadingGallery(false);
 if (galleryInputRef.current) galleryInputRef.current.value = "";
 }
 };

 const handleAddGalleryUrl = () => {
 if (!newGalleryUrlInput.trim()) return;
 const url = newGalleryUrlInput.trim();
 if (!url.startsWith("http")) {
 toast.error("Por favor insira uma URL válida (iniciando com http:// ou https://)");
 return;
 }
 setGalleryUrls((prev) => [...prev, url]);
 setNewGalleryUrlInput("");
 toast.success("Foto adicionada à galeria!");
 };

 const handleRemoveGalleryUrl = (index: number) => {
 setGalleryUrls((prev) => prev.filter((_, i) => i !== index));
 };

 // Tags toggle
 const toggleTag = (tag: string) => {
 setSelectedTags((prev) =>
 prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
 );
 };

 // ── CMS DE SEÇÕES MODULARES ──
 const handleAddSection = (type: DestinationSection["type"]) => {
 const newSection: DestinationSection = {
 id: crypto.randomUUID(),
 type,
 title:
 type === "photo_text"
 ? "Sobre o Destino & História"
 : type === "title_media_carousel"
 ? "Galeria de Fotos do Local"
 : type === "highlights_grid"
 ? "Pontos Turísticos & Passeios"
 : type === "gastronomy_guide"
 ? "Gastronomia & Restaurantes"
 : type === "travel_tips_cards"
 ? "Dicas Essenciais para o Viajante"
 : "Perguntas Frequentes (FAQ)",
 subtitle: "Informações completas para sua experiência",
 content_text: "",
 layout_variant: "left",
 media_urls: [],
 items: [],
 };
 setSections((prev) => [...prev, newSection]);
 toast.success(`Nova seção "${newSection.title}" adicionada ao destino!`);
 };

 const handleUpdateSection = (index: number, patch: Partial<DestinationSection>) => {
 setSections((prev) => {
 const copy = [...prev];
 copy[index] = { ...copy[index], ...patch };
 return copy;
 });
 };

 const handleRemoveSection = (index: number) => {
 setSections((prev) => prev.filter((_, i) => i !== index));
 toast.info("Seção removida.");
 };

 const handleMoveSection = (index: number, direction: "up" | "down") => {
 setSections((prev) => {
 const copy = [...prev];
 const targetIndex = direction === "up" ? index - 1 : index + 1;
 if (targetIndex < 0 || targetIndex >= copy.length) return prev;
 const temp = copy[index];
 copy[index] = copy[targetIndex];
 copy[targetIndex] = temp;
 return copy;
 });
 };

 // ── AVALIAÇÕES ──
 const handleAddReview = () => {
 if (!newReviewAuthor.trim() || !newReviewComment.trim()) {
 toast.error("Informe o nome do autor e o comentário da avaliação.");
 return;
 }
 const review: DestinationReview = {
 id: crypto.randomUUID(),
 author_name: newReviewAuthor.trim(),
 author_city: newReviewCity.trim() || undefined,
 rating: newReviewRating,
 travel_month_year: newReviewDate.trim() || undefined,
 comment: newReviewComment.trim(),
 verified: true,
 };
 setReviews((prev) => [review, ...prev]);
 setNewReviewAuthor("");
 setNewReviewCity("");
 setNewReviewComment("");
 toast.success("Avaliação adicionada com sucesso!");
 };

 const handleRemoveReview = (id: string) => {
 setReviews((prev) => prev.filter((r) => r.id !== id));
 };

 // Submissão do Formulário do Destino
 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim()) {
 toast.error("O nome do destino é obrigatório.");
 return;
 }

 const highlightsList = highlightsInput
 .split(",")
 .map((s) => s.trim())
 .filter(Boolean);

 const payload = {
 name: name.trim(),
 city: city.trim() || name.trim(),
 state: state.trim() || "SC",
 country: country.trim() || "Brasil",
 iata_gateway: iataGateway.trim() ? iataGateway.trim().toUpperCase() : null,
 timezone: timezone.trim() || null,
 climate_type: climateType.trim() || null,
 best_season: bestSeason.trim() || null,
 description: description.trim() || null,
 cover_image_url: coverImageUrl || null,
 gallery_urls: galleryUrls,
 tags: selectedTags,
 sections,
 attractions: [],
 reviews,
 highlights: highlightsList,
 gastronomy_tip: gastronomyTip.trim() || null,
 travel_tip: travelTip.trim() || null,
 seo_title: seoTitle.trim() || null,
 seo_description: seoDescription.trim() || null,
 };

 if (editingDestination) {
 updateMut.mutate({ id: editingDestination.id, ...payload });
 } else {
 createMut.mutate(payload);
 }
 };

 // Métricas Executivas
 const metrics = useMemo(() => {
 const total = destinations.length;
 const withIata = destinations.filter((d: DestinationDTO) => !!d.iata_gateway).length;
 const statesSet = new Set(destinations.map((d: DestinationDTO) => d.state || d.region).filter(Boolean));
 const totalHotels = destinations.reduce((sum: number, d: DestinationDTO) => sum + (d.hotels_count || 0), 0);

 return {
 total,
 withIata,
 statesCount: statesSet.size,
 totalHotels,
 };
 }, [destinations]);

 // Filtro
 const filtered = useMemo(() => {
 return destinations.filter((d: DestinationDTO) => {
 if (search.trim()) {
 const term = search.toLowerCase();
 const matchesName = d.name.toLowerCase().includes(term);
 const matchesCity = (d.city || "").toLowerCase().includes(term);
 const matchesState = (d.state || d.region || "").toLowerCase().includes(term);
 const matchesIata = (d.iata_gateway || "").toLowerCase().includes(term);
 const matchesCountry = (d.country || "").toLowerCase().includes(term);
 if (!matchesName && !matchesCity && !matchesState && !matchesIata && !matchesCountry) return false;
 }

 if (filterTag === "brasil" && d.country !== "Brasil") return false;
 if (filterTag === "internacional" && d.country === "Brasil") return false;
 if (filterTag === "iata" && !d.iata_gateway) return false;
 if (filterTag === "secoes" && (!d.sections || d.sections.length === 0)) return false;
 if (filterTag === "fotos" && (!d.gallery_urls || d.gallery_urls.length === 0)) return false;

 return true;
 });
 }, [destinations, search, filterTag]);

// Destinos canônicos do estado selecionado
 const canonicalDestinationsForState = useMemo(() => {
 return getDestinationsByState(state);
 }, [state]);

  const dashboardMetrics: MetricCardItem[] = useMemo(() => [
    {
      title: "Destinos no Catálogo",
      value: metrics.total,
      description: "Cadastros padronizados",
      icon: Compass,
      color: "blue",
    },
    {
      title: "Aeroportos IATA Oficiais",
      value: metrics.withIata,
      description: "Hubs & Gateways mapeados",
      icon: Plane,
      color: "amber",
    },
    {
      title: "Estados & Regiões",
      value: metrics.statesCount,
      description: "UFs cadastradas",
      icon: MapPin,
      color: "emerald",
    },
    {
      title: "Hotéis Vinculados",
      value: metrics.totalHotels,
      description: "Parceiros hospedagem",
      icon: Hotel,
      color: "purple",
    },
  ], [metrics]);

  return (
    <NicheOperationalGuard
      targetNiche="tourism"
      toolTitle="Banco de Destinos Turísticos & CMS"
      toolDescription="Catálogo estruturado com base canônica de cidades, estados, aeroportos IATA, seções ricas, galerias de mídia e avaliações de viajantes."
      store={store}
    >
      <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
        <WorkspaceCanonicalToolbar
          tabs={[
            { id: "all", label: "Todos os Destinos", icon: Compass, count: destinations.length },
            { id: "brasil", label: "Nacionais (Brasil)", icon: MapPin },
            { id: "internacional", label: "Internacionais", icon: Globe2 },
            { id: "iata", label: "Com IATA", icon: Plane },
            { id: "secoes", label: "CMS Ricas", icon: Layers },
            { id: "fotos", label: "Com Galeria", icon: Camera },
          ]}
          activeTab={filterTag}
          onTabChange={(id) => setFilterTag(id)}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por cidade, UF, aeroporto IATA (ex: MCZ, Gramado)..."
          onMetricsClick={() => setIsMetricsOpen(true)}
          metricsBadge={metrics.total > 0 ? `${metrics.total} Destinos` : undefined}
          primaryAction={{
            label: "Novo Destino (Studio CMS)",
            icon: Plus,
            onClick: handleOpenCreate,
          }}
        />

        <WorkspaceDashboardSheet
          title="Telemetria de Destinos Turísticos"
          open={isMetricsOpen}
          onOpenChange={setIsMetricsOpen}
          items={dashboardMetrics}
        />

 {/* ── 4. GRID DE DESTINOS ── */}
 {filtered.length === 0 ? (
 <div className="py-20 text-center space-y-3 bg-card rounded-2xl border border-border/60 p-8 shadow-xs">
 <Compass className="size-12 mx-auto text-muted-foreground/40" />
 <h3 className="text-sm font-bold text-foreground">Nenhum destino encontrado</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Utilize o Studio de Destinos para cadastrar locais turísticos completos com aeroportos IATA, seções editoriais, fotos e avaliações.
 </p>
 <Button
 size="sm"
 onClick={handleOpenCreate}
 className="rounded-xl text-xs font-bold gap-1.5 h-9 mt-2"
 >
 <Plus className="size-4" />
 <span>Cadastrar Primeiro Destino com Base Canônica</span>
 </Button>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
 {filtered.map((dest: DestinationDTO) => (
 <Card
 key={dest.id}
 className="rounded-2xl border border-border/70 bg-card overflow-hidden hover:border-primary/50 transition-all flex flex-col justify-between shadow-2xs group"
 >
 {/* Capa do Destino */}
 <div className="h-44 w-full relative bg-muted overflow-hidden">
 {dest.cover_image_url ? (
 <img
 src={dest.cover_image_url}
 alt={dest.name}
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center bg-muted/60 text-muted-foreground">
 <Camera className="size-8" />
 </div>
 )}

 <div className="absolute top-3 left-3 flex items-center gap-1.5">
 <Badge className="bg-black/70 backdrop-blur-md text-white border-none text-[10px] font-bold">
 {dest.state ? `${dest.state} • ${dest.country}` : dest.country}
 </Badge>
 </div>

 {dest.iata_gateway && (
 <div className="absolute top-3 right-3">
 <Badge className="bg-primary text-primary-foreground font-mono font-bold text-[10px] border-none shadow-xs">
 ✈️ {dest.iata_gateway}
 </Badge>
 </div>
 )}

 <div className="absolute bottom-2 left-2 flex items-center gap-1">
 {dest.average_rating > 0 && (
 <Badge className="bg-primary text-primary-foreground text-[9px] font-bold border-none gap-0.5 py-0.5 font-mono">
 <span>Nota {dest.average_rating.toFixed(1)}</span>
 </Badge>
 )}

 {dest.sections && dest.sections.length > 0 && (
 <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-white text-[9px] font-mono border-none gap-1 py-0.5">
 <Layers className="size-2.5 text-primary" />
 <span>{dest.sections.length} seções</span>
 </Badge>
 )}
 </div>

 {dest.gallery_urls && dest.gallery_urls.length > 0 && (
 <div className="absolute bottom-2 right-2">
 <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-white text-[9px] font-mono border-none gap-1 py-0.5">
 <ImageIcon className="size-2.5" />
 <span>+{dest.gallery_urls.length} fotos</span>
 </Badge>
 </div>
 )}
 </div>

 {/* Conteúdo do Card */}
 <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <h3 className="text-base font-bold text-foreground leading-tight line-clamp-1">
 {dest.name}
 </h3>
 </div>

 <p className="text-xs text-muted-foreground line-clamp-1 flex items-center gap-1 font-medium">
 <MapPin className="size-3 text-primary shrink-0" />
 <span>{dest.city ? `${dest.city}, ${dest.state}` : dest.state}</span>
 </p>

 {dest.description && (
 <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
 {dest.description.replace(/###.+/g, "")}
 </p>
 )}

 <div className="space-y-1 pt-1.5 text-[11px] text-muted-foreground border-t border-border/40">
 {dest.best_season && (
 <p className="flex items-center gap-1.5 truncate">
 <Sun className="size-3 text-amber-500 shrink-0" />
 <span className="truncate">{dest.best_season}</span>
 </p>
 )}

 <div className="flex items-center justify-between font-mono text-[10px]">
 <span className="flex items-center gap-1">
 <Hotel className="size-3 text-primary shrink-0" />
 <span>{dest.hotels_count || 0} hotéis vinculados</span>
 </span>
 {dest.reviews && dest.reviews.length > 0 && (
 <span className="text-muted-foreground">
 {dest.reviews.length} avaliações
 </span>
 )}
 </div>
 </div>
 </div>

 {/* Ações */}
 <div className="pt-2.5 border-t border-border/50 flex items-center justify-between gap-1">
 <div className="flex items-center gap-1">
 <Button
 type="button"
 size="sm"
 variant="ghost"
 onClick={() => handleOpenEdit(dest)}
 className="rounded-xl text-xs gap-1.5 h-10 sm:h-8 px-2.5 font-bold cursor-pointer"
 >
 <Edit2 className="size-3.5" />
 <span>Editar Studio</span>
 </Button>

 <Button
 type="button"
 size="sm"
 variant="ghost"
 onClick={() => setPreviewModalDest(dest)}
 className="rounded-xl text-xs gap-1 h-10 sm:h-8 px-2 font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
 title="Visualizar Página Completa do Destino"
 >
 <Eye className="size-3.5" />
 <span>Ver Página</span>
 </Button>
 </div>

 <Button
 type="button"
 size="icon"
 variant="ghost"
 onClick={() => {
 if (confirm(`Deseja realmente remover o destino "${dest.name}"?`)) {
 deleteMut.mutate(dest.id);
 }
 }}
 className="size-10 sm:size-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
 title="Remover Destino"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 </Card>
 ))}
 </div>
 )}

 {/* ── 5. STUDIO SHEET DE GESTÃO DO DESTINO (EXPANDIDO 6 ABAS) ── */}
 <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
 <SheetContent
 side="right"
 className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl lg:max-w-4xl flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border"
 >
 {/* Header */}
 <SheetHeader className="p-5 pb-4 border-b border-border/80 bg-muted/20">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
 <Compass className="size-5" />
 </div>
 <div>
 <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
 <span>{editingDestination ? `Editar Destino: ${name || "Sem Nome"}` : "Studio CMS de Destinos Turísticos"}</span>
 {state && (
 <Badge variant="outline" className="text-[10px] font-bold">
 {state} • {country}
 </Badge>
 )}
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 Base canônica de localização, aeroportos IATA, seções dinâmicas e avaliações.
 </SheetDescription>
 </div>
 </div>
 <div className="flex items-center gap-2">
 {iataGateway && (
 <Badge className="font-mono text-xs font-bold bg-primary text-primary-foreground shadow-xs">
 ✈️ {iataGateway}
 </Badge>
 )}
 </div>
 </div>
 </SheetHeader>

 {/* Abas do Studio */}
 <Tabs
 value={activeTab}
 onValueChange={setActiveTab}
 className="flex-1 flex flex-col overflow-hidden"
 >
 <div className="px-5 pt-3 pb-2 border-b border-border/60 bg-card overflow-x-auto no-scrollbar ">
 <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-6 h-9 rounded-xl p-1 bg-muted/50">
 <TabsTrigger value="identificacao" className="text-xs font-bold rounded-lg gap-1.5 py-1">
 <MapPin className="size-3.5" />
 <span>1. Localização</span>
 </TabsTrigger>
 <TabsTrigger value="midias" className="text-xs font-bold rounded-lg gap-1.5 py-1">
 <ImageIcon className="size-3.5" />
 <span>2. Mídias</span>
 </TabsTrigger>
 <TabsTrigger value="secoes" className="text-xs font-bold rounded-lg gap-1.5 py-1">
 <Layers className="size-3.5" />
 <span>3. Seções CMS ({sections.length})</span>
 </TabsTrigger>
 <TabsTrigger value="avaliacoes" className="text-xs font-bold rounded-lg gap-1.5 py-1">
 <Award className="size-3.5" />
 <span>4. Avaliações ({reviews.length})</span>
 </TabsTrigger>
 <TabsTrigger value="tags" className="text-xs font-bold rounded-lg gap-1.5 py-1">
 <Tag className="size-3.5" />
 <span>5. Tags & SEO</span>
 </TabsTrigger>
 <TabsTrigger value="preview" className="text-xs font-bold rounded-lg gap-1.5 py-1">
 <Eye className="size-3.5" />
 <span>6. Live Preview</span>
 </TabsTrigger>
 </TabsList>
 </div>

 <div className="flex-1 overflow-y-auto no-scrollbar p-5 text-xs space-y-6">
 {/* ── ABA 1: IDENTIFICAÇÃO CANÔNICA & LOCALIZAÇÃO PADRONIZADA ── */}
 <TabsContent value="identificacao" className="m-0 space-y-5">
 {/* Seletor Canônico em Cascata Oficial */}
 <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
 <Compass className="size-3.5 text-primary" />
 Autopreenchimento Canônico Oficial (Garante Mensuração Sem Duplicidade)
 </span>
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Selecione um polo turístico consagrado para preencher automaticamente o Estado (UF), Cidade oficial, código de aeroporto IATA, clima e fotos profissionais:
 </p>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {/* 1. Selecionar Estado */}
 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">1. Filtrar por Estado / Região (UF)</Label>
 <select
 value={state}
 onChange={(e) => setState(e.target.value)}
 className="w-full h-10 rounded-xl bg-background border border-border px-3 text-xs font-medium cursor-pointer"
 >
 {BRAZIL_STATES.map((st) => (
 <option key={st.uf} value={st.uf}>
 {st.name} ({st.uf})
 </option>
 ))}
 </select>
 </div>

 {/* 2. Selecionar Destino Canônico daquele Estado */}
 <div className="space-y-1">
 <Label className="text-xs font-bold text-foreground">2. Destino Oficial Pré-Cadastrado</Label>
 <select
 onChange={(e) => {
 const found = CANONICAL_DESTINATIONS.find((d) => d.id === e.target.value);
 if (found) handleApplyPreset(found);
 }}
 defaultValue=""
 className="w-full h-10 rounded-xl bg-background border border-border px-3 text-xs font-medium cursor-pointer"
 >
 <option value="" disabled>
 {canonicalDestinationsForState.length > 0
 ? `Escolha um polo em ${state} (${canonicalDestinationsForState.length} disponíveis)...`
 : `Nenhum preset em ${state}. Escolha na busca global abaixo...`}
 </option>
 {canonicalDestinationsForState.map((c) => (
 <option key={c.id} value={c.id}>
 {c.name} — IATA: {c.iata}
 </option>
 ))}
 </select>
 </div>
 </div>

 {/* Busca Global Instantânea em todos os 120+ Destinos */}
 <div className="pt-2 border-t border-border/40 space-y-1.5">
 <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
 <Search className="size-3" />
 <span>Ou busque em toda a base nacional/internacional por nome ou aeroporto:</span>
 </Label>
 <Input
 value={canonicalSearch}
 onChange={(e) => setCanonicalSearch(e.target.value)}
 placeholder="Ex: Gramado, Beto Carrero, Porto Seguro, MCZ, Bariloche..."
 className="h-9 text-xs rounded-xl bg-background"
 />
 {filteredCanonicalSearchResults.length > 0 && (
 <div className="max-h-36 overflow-y-auto no-scrollbar rounded-xl border border-border bg-background p-1 space-y-1 shadow-md">
 {filteredCanonicalSearchResults.map((dest) => (
 <div
 key={dest.id}
 onClick={() => {
 handleApplyPreset(dest);
 setCanonicalSearch("");
 }}
 className="p-2 rounded-lg hover:bg-muted/70 flex items-center justify-between cursor-pointer text-xs"
 >
 <span className="font-semibold text-foreground">
 {dest.name} ({dest.state})
 </span>
 <Badge variant="outline" className="font-mono text-[10px]">
 IATA: {dest.iata}
 </Badge>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* Campos Estruturados de Identificação */}
 <div className="space-y-3.5">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Nome do Destino Turístico *</Label>
 <Input
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Ex: Gramado & Canela / Serra Gaúcha"
 className="h-10 text-xs rounded-xl"
 required
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold">Cidade Oficial (IBGE) *</Label>
 <Input
 value={city}
 onChange={(e) => setCity(e.target.value)}
 placeholder="Ex: Gramado"
 className="h-10 text-xs rounded-xl"
 required
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Estado / UF *</Label>
 <select
 value={state}
 onChange={(e) => setState(e.target.value)}
 className="w-full h-10 rounded-xl bg-background border border-border px-3 text-xs"
 >
 {BRAZIL_STATES.map((st) => (
 <option key={st.uf} value={st.uf}>
 {st.name} ({st.uf})
 </option>
 ))}
 </select>
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold">País *</Label>
 <Input
 value={country}
 onChange={(e) => setCountry(e.target.value)}
 placeholder="Brasil"
 className="h-10 text-xs rounded-xl"
 required
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold flex items-center justify-between">
 <span>Aeroporto IATA Principal</span>
 <span className="text-[10px] text-muted-foreground font-mono">Ex: NVT, POA</span>
 </Label>
 <select
 value={iataGateway}
 onChange={(e) => setIataGateway(e.target.value)}
 className="w-full h-10 rounded-xl bg-background border border-border px-3 text-xs font-mono uppercase"
 >
 <option value="">Sem aeroporto fixo</option>
 {MAJOR_IATA_AIRPORTS.map((a) => (
 <option key={a.code} value={a.code}>
 {a.code} — {a.city} ({a.uf})
 </option>
 ))}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1">
 <Label className="text-xs font-bold">Melhor Época / Temporada</Label>
 <Input
 value={bestSeason}
 onChange={(e) => setBestSeason(e.target.value)}
 placeholder="Ex: Outubro a Janeiro (Natal Luz)"
 className="h-10 text-xs rounded-xl"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold">Fuso Horário Oficial</Label>
 <select
 value={timezone}
 onChange={(e) => setTimezone(e.target.value)}
 className="w-full h-10 rounded-xl bg-background border border-border px-3 text-xs"
 >
 <option value="America/Sao_Paulo (UTC-3)">Brasília / São Paulo (UTC-3)</option>
 <option value="America/Manaus (UTC-4)">Manaus / Pantanal (UTC-4)</option>
 <option value="America/Noronha (UTC-2)">Fernando de Noronha (UTC-2)</option>
 <option value="America/Rio_Branco (UTC-5)">Acre (UTC-5)</option>
 <option value="America/Santiago (UTC-3)">Chile (UTC-3 / UTC-4)</option>
 <option value="America/Cancun (UTC-5)">Cancún / México (UTC-5)</option>
 </select>
 </div>

 <div className="space-y-1">
 <Label className="text-xs font-bold">Tipo de Clima</Label>
 <Input
 value={climateType}
 onChange={(e) => setClimateType(e.target.value)}
 placeholder="Ex: Subtropical de Altitude, Tropical Praiano"
 className="h-10 text-xs rounded-xl"
 />
 </div>
 </div>
 </div>
 </TabsContent>

 {/* ── ABA 2: MÍDIAS & GALERIA PANORÂMICA ── */}
 <TabsContent value="midias" className="m-0 space-y-5">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Foto de Capa do Destino (Panorâmica 16:9) *</Label>
 <ImageUpload
 value={coverImageUrl}
 onChange={setCoverImageUrl}
 onRemove={() => setCoverImageUrl("")}
 aspectPreset="widescreen"
 bucket="cms-media"
 helperText="Foto panorâmica 16:9 em alta resolução para topo de página e propostas"
 />
 </div>

 <hr className="border-border/60" />

 {/* Galeria de Fotos Múltiplas */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label className="text-xs font-bold">Galeria de Mídias & Fotos do Destino</Label>
 <p className="text-[11px] text-muted-foreground">
 Imagens em alta resolução de praias, pontos turísticos, hotéis e passeios para ilustrar roteiros.
 </p>
 </div>
 <Badge variant="outline" className="text-xs font-mono font-bold">
 {galleryUrls.length} {galleryUrls.length === 1 ? "foto" : "fotos"}
 </Badge>
 </div>

 <input
 ref={galleryInputRef}
 type="file"
 accept="image/*"
 multiple
 className="hidden"
 onChange={(e) => handleUploadGalleryFiles(e.target.files)}
 />

 <div className="flex flex-col sm:flex-row gap-2">
 <Button
 type="button"
 variant="secondary"
 onClick={() => galleryInputRef.current?.click()}
 disabled={isUploadingGallery}
 className="rounded-xl text-xs font-bold h-10 gap-2 cursor-pointer shrink-0 shadow-2xs"
 >
 {isUploadingGallery ? (
 <>
 <Loader2 className="size-4 animate-spin text-primary" />
 <span>Enviando fotos...</span>
 </>
 ) : (
 <>
 <UploadCloud className="size-4 text-primary" />
 <span>Upload em Lote de Fotos</span>
 </>
 )}
 </Button>

 <div className="flex gap-2 flex-1">
 <Input
 value={newGalleryUrlInput}
 onChange={(e) => setNewGalleryUrlInput(e.target.value)}
 placeholder="Ou cole a URL direta de uma foto (https://...)"
 className="h-10 text-xs rounded-xl flex-1"
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 handleAddGalleryUrl();
 }
 }}
 />
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={handleAddGalleryUrl}
 className="rounded-xl text-xs font-bold h-10 px-4 gap-1 shrink-0"
 >
 <Plus className="size-3.5" />
 <span>Adicionar</span>
 </Button>
 </div>
 </div>

 {galleryUrls.length > 0 ? (
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
 {galleryUrls.map((url, idx) => (
 <div
 key={idx}
 className="group relative rounded-2xl overflow-hidden border border-border/70 bg-muted aspect-video shadow-2xs"
 >
 <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
 <div className="absolute top-1 left-1">
 <Badge className="bg-black/60 text-[9px] text-white border-none py-0 px-1.5 font-mono">
 #{idx + 1}
 </Badge>
 </div>
 <button
 type="button"
 onClick={() => handleRemoveGalleryUrl(idx)}
 className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive cursor-pointer"
 >
 <X className="size-3.5" />
 </button>
 </div>
 ))}
 </div>
 ) : (
 <div
 onClick={() => galleryInputRef.current?.click()}
 className="p-8 rounded-2xl bg-muted/20 border-2 border-dashed border-border/80 text-center text-muted-foreground text-xs hover:border-border hover:bg-muted/30 transition-all cursor-pointer flex flex-col items-center gap-1.5"
 >
 <UploadCloud className="size-8 text-muted-foreground/60" />
 <span className="font-semibold text-foreground">Nenhuma foto adicional na galeria</span>
 <span className="text-[11px]">Clique para enviar imagens do seu dispositivo ou cole uma URL acima</span>
 </div>
 )}
 </div>
 </TabsContent>

 {/* ── ABA 3: SEÇÕES DO DESTINO (CMS STUDIO MODULAR) ── */}
 <TabsContent value="secoes" className="m-0 space-y-6">
 {/* Seletor de Tipo de Seção para Adicionar */}
 <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <ListPlus className="size-4 text-primary" />
 Adicionar Bloco de Conteúdo Rico ao Destino
 </span>
 </div>
 <p className="text-[11px] text-muted-foreground">
 Monte a página do destino adicionando seções modulares para encantar o cliente na vitrine e nas propostas:
 </p>

 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
 {[
 { type: "photo_text", label: "Foto + Texto", desc: "Layout editorial com imagem e descrição" },
 { type: "highlights_grid", label: "Atrações Imperdíveis", desc: "Cards de pontos turísticos e passeios" },
 { type: "title_media_carousel", label: "Carrossel de Mídias", desc: "Slider de fotos em tela cheia" },
 { type: "gastronomy_guide", label: "Guia Gastronômico", desc: "Pratos típicos e restaurantes" },
 { type: "travel_tips_cards", label: "Dicas do Viajante", desc: "Clima, bagagem, fuso e tomada" },
 { type: "faq_accordion", label: "FAQ / Dúvidas", desc: "Sanfona de perguntas e respostas" },
 ].map((item) => (
 <button
 key={item.type}
 type="button"
 onClick={() => handleAddSection(item.type as any)}
 className="p-3 rounded-xl border border-border bg-background hover:border-primary/60 hover:bg-primary/5 transition-all text-left space-y-0.5 cursor-pointer shadow-2xs"
 >
 <span className="text-xs font-bold text-foreground block">{item.label}</span>
 <span className="text-[10px] text-muted-foreground block leading-tight">{item.desc}</span>
 </button>
 ))}
 </div>
 </div>

 {/* Lista de Seções Adicionadas */}
 {sections.length === 0 ? (
 <div className="p-10 rounded-2xl border border-border/60 bg-muted/10 text-center space-y-2">
 <Layers className="size-8 mx-auto text-muted-foreground/40" />
 <p className="text-xs font-bold text-foreground">Nenhuma seção personalizada adicionada ainda</p>
 <p className="text-[11px] text-muted-foreground max-w-md mx-auto">
 Clique em um dos botões acima para adicionar seções de Foto + Texto, Atrações, Gastronomia ou FAQ, ou aplique um modelo canônico na aba 1.
 </p>
 </div>
 ) : (
 <div className="space-y-4">
 {sections.map((section, idx) => (
 <Card key={section.id || idx} className="p-4 rounded-2xl border border-border/80 bg-card space-y-3.5 shadow-2xs">
 {/* Top bar da Seção */}
 <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
 <div className="flex items-center gap-2">
 <Badge className="bg-primary/10 text-primary border-none text-[10px] font-mono font-bold">
 #{idx + 1}
 </Badge>
 <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider">
 {section.type === "photo_text"
 ? "Foto + Texto"
 : section.type === "highlights_grid"
 ? "Grid de Atrações"
 : section.type === "title_media_carousel"
 ? "Carrossel de Mídias"
 : section.type === "gastronomy_guide"
 ? "Guia Gastronômico"
 : section.type === "travel_tips_cards"
 ? "Dicas do Viajante"
 : "FAQ Interativo"}
 </Badge>
 </div>

 <div className="flex items-center gap-1">
 <Button
 type="button"
 size="icon"
 variant="ghost"
 disabled={idx === 0}
 onClick={() => handleMoveSection(idx, "up")}
 className="size-7 rounded-lg"
 title="Mover para cima"
 >
 <ChevronUp className="size-3.5" />
 </Button>
 <Button
 type="button"
 size="icon"
 variant="ghost"
 disabled={idx === sections.length - 1}
 onClick={() => handleMoveSection(idx, "down")}
 className="size-7 rounded-lg"
 title="Mover para baixo"
 >
 <ChevronDown className="size-3.5" />
 </Button>
 <Button
 type="button"
 size="icon"
 variant="ghost"
 onClick={() => handleRemoveSection(idx)}
 className="size-7 text-destructive hover:bg-destructive/10 rounded-lg"
 title="Excluir seção"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>

 {/* Campos da Seção */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Título da Seção *</Label>
 <Input
 value={section.title}
 onChange={(e) => handleUpdateSection(idx, { title: e.target.value })}
 placeholder="Ex: Encante-se com Gramado"
 className="h-9 text-xs rounded-xl"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Subtítulo / Chamada</Label>
 <Input
 value={section.subtitle || ""}
 onChange={(e) => handleUpdateSection(idx, { subtitle: e.target.value })}
 placeholder="Ex: Informações e Dicas"
 className="h-9 text-xs rounded-xl"
 />
 </div>
 </div>

 {/* Seção Foto + Texto */}
 {section.type === "photo_text" && (
 <div className="space-y-3 pt-1">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Foto da Seção</Label>
 <ImageUpload
 value={section.media_urls?.[0] || ""}
 onChange={(url) => handleUpdateSection(idx, { media_urls: [url] })}
 onRemove={() => handleUpdateSection(idx, { media_urls: [] })}
 bucket="destination-media"
 aspectPreset="widescreen"
 helperText="Upload da foto para esta seção"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Alinhamento da Imagem</Label>
 <select
 value={section.layout_variant || "left"}
 onChange={(e) => handleUpdateSection(idx, { layout_variant: e.target.value as any })}
 className="w-full h-9 rounded-xl bg-background border border-border px-3 text-xs"
 >
 <option value="left">Imagem na Esquerda, Texto na Direita</option>
 <option value="right">Imagem na Direita, Texto na Esquerda</option>
 <option value="full">Banner Panorâmico no Topo</option>
 </select>
 </div>
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Conteúdo / Texto Editorial</Label>
 <Textarea
 value={section.content_text || ""}
 onChange={(e) => handleUpdateSection(idx, { content_text: e.target.value })}
 placeholder="Escreva a descrição detalhada, dicas e atrativos..."
 rows={3}
 className="text-xs rounded-xl resize-none"
 />
 </div>
 </div>
 )}

 {/* Seção Grid de Itens (Atrações, FAQ, Dicas, etc.) */}
 {section.type !== "photo_text" && (
 <div className="space-y-2.5 pt-1">
 <div className="flex items-center justify-between">
 <Label className="text-[11px] font-bold">
 Itens / Cartões da Seção ({section.items?.length || 0})
 </Label>
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => {
 const currentItems = section.items || [];
 const newItem = {
 id: crypto.randomUUID(),
 title: `Item #${currentItems.length + 1}`,
 description: "Descrição do ponto turístico ou dica...",
 badge: section.type === "highlights_grid" ? "Passeio" : "Dica",
 };
 handleUpdateSection(idx, { items: [...currentItems, newItem] });
 }}
 className="rounded-xl text-[11px] font-bold h-7 px-2.5 gap-1"
 >
 <Plus className="size-3" />
 <span>+ Adicionar Item</span>
 </Button>
 </div>

 <div className="space-y-2">
 {(section.items || []).map((item, itemIdx) => (
 <div
 key={item.id || itemIdx}
 className="p-3 rounded-xl border border-border/70 bg-muted/20 flex flex-col gap-2"
 >
 <div className="flex items-center gap-2">
 <Input
 value={item.title}
 onChange={(e) => {
 const copy = [...(section.items || [])];
 copy[itemIdx] = { ...copy[itemIdx], title: e.target.value };
 handleUpdateSection(idx, { items: copy });
 }}
 placeholder="Título / Pergunta / Atração"
 className="h-8 text-xs rounded-lg flex-1 bg-background font-bold"
 />
 <Input
 value={item.badge || ""}
 onChange={(e) => {
 const copy = [...(section.items || [])];
 copy[itemIdx] = { ...copy[itemIdx], badge: e.target.value };
 handleUpdateSection(idx, { items: copy });
 }}
 placeholder="Tag / Badge"
 className="h-8 text-xs rounded-lg w-28 bg-background"
 />
 <Button
 type="button"
 size="icon"
 variant="ghost"
 onClick={() => {
 const copy = (section.items || []).filter((_, i) => i !== itemIdx);
 handleUpdateSection(idx, { items: copy });
 }}
 className="size-7 text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
 >
 <Trash2 className="size-3" />
 </Button>
 </div>
 <Textarea
 value={item.description || ""}
 onChange={(e) => {
 const copy = [...(section.items || [])];
 copy[itemIdx] = { ...copy[itemIdx], description: e.target.value };
 handleUpdateSection(idx, { items: copy });
 }}
 placeholder="Descrição detalhada ou resposta..."
 rows={2}
 className="text-xs rounded-lg resize-none bg-background"
 />
 </div>
 ))}
 </div>
 </div>
 )}
 </Card>
 ))}
 </div>
 )}
 </TabsContent>

 {/* ── ABA 4: AVALIAÇÕES DE VIAJANTES & PROVAS SOCIAIS ── */}
 <TabsContent value="avaliacoes" className="m-0 space-y-5">
 <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-3">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Award className="size-4 text-primary" />
 Cadastrar Nova Avaliação de Viajante
 </span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Nome do Viajante *</Label>
 <Input
 value={newReviewAuthor}
 onChange={(e) => setNewReviewAuthor(e.target.value)}
 placeholder="Ex: Família Silveira"
 className="h-9 text-xs rounded-xl bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Cidade / Estado</Label>
 <Input
 value={newReviewCity}
 onChange={(e) => setNewReviewCity(e.target.value)}
 placeholder="Ex: Chapecó - SC"
 className="h-9 text-xs rounded-xl bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Nota de Avaliação (1 a 5)</Label>
 <div className="flex items-center gap-1 pt-1">
 {[1, 2, 3, 4, 5].map((s) => (
 <button
 key={s}
 type="button"
 onClick={() => setNewReviewRating(s)}
 className={cn(
 "size-8 rounded-xl font-bold font-mono text-xs border transition-all cursor-pointer",
 s === newReviewRating
 ? "bg-primary text-primary-foreground border-primary shadow-2xs"
 : "bg-background border-border/80 text-muted-foreground hover:bg-muted"
 )}
 >
 {s}
 </button>
 ))}
 </div>
 </div>
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Depoimento do Viajante *</Label>
 <Textarea
 value={newReviewComment}
 onChange={(e) => setNewReviewComment(e.target.value)}
 placeholder="Descreva a experiência, elogios aos passeios e dicas..."
 rows={3}
 className="text-xs rounded-xl resize-none bg-background"
 />
 </div>

 <div className="flex justify-end pt-1">
 <Button
 type="button"
 size="sm"
 onClick={handleAddReview}
 className="rounded-xl text-xs font-bold h-9 px-4 gap-1.5 bg-primary text-primary-foreground"
 >
 <Plus className="size-3.5" />
 <span>Adicionar Depoimento</span>
 </Button>
 </div>
 </div>

 {/* Lista de Avaliações */}
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-bold text-foreground">
 Depoimentos Registrados ({reviews.length})
 </h4>
 {reviews.length > 0 && (
 <span className="text-[11px] font-bold text-primary flex items-center gap-1">
 <Award className="size-3.5 text-primary" />
 Média Geral: {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)} / 5.0
 </span>
 )}
 </div>

 {reviews.length === 0 ? (
 <div className="p-8 text-center rounded-2xl border border-border/60 text-muted-foreground text-xs">
 Nenhuma avaliação registrada ainda. Adicione avaliações acima para exibir provas sociais nos orçamentos.
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {reviews.map((rev) => (
 <div
 key={rev.id}
 className="p-3.5 rounded-2xl border border-border bg-card space-y-2 relative group shadow-2xs"
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
 {rev.author_name.charAt(0)}
 </div>
 <div>
 <span className="font-bold text-xs text-foreground block leading-tight">
 {rev.author_name}
 </span>
 <span className="text-[10px] text-muted-foreground block">
 {rev.author_city || "Viajante Verificado"}
 </span>
 </div>
 </div>

 <div className="flex items-center gap-0.5">
 <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-mono font-bold text-[10px]">
 Nota {rev.rating} / 5
 </span>
 </div>
 </div>

 <p className="text-[11px] text-muted-foreground leading-relaxed italic">
 "{rev.comment}"
 </p>

 <button
 type="button"
 onClick={() => handleRemoveReview(rev.id)}
 className="absolute top-2 right-2 size-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
 title="Remover avaliação"
 >
 <X className="size-3" />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 </TabsContent>

 {/* ── ABA 5: TAGS DE NICHO & SEO ── */}
 <TabsContent value="tags" className="m-0 space-y-5">
 <div className="space-y-2">
 <Label className="text-xs font-bold">Segmentos & Perfil do Destino</Label>
 <p className="text-[11px] text-muted-foreground">
 Selecione as tags que definem o perfil deste destino para alimentar buscas inteligentes e filtros do CRM:
 </p>

 <div className="flex flex-wrap gap-2 pt-1">
 {TOURISM_TAGS_PRESETS.map((tag) => {
 const isSelected = selectedTags.includes(tag);
 return (
 <Badge
 key={tag}
 variant={isSelected ? "default" : "outline"}
 onClick={() => toggleTag(tag)}
 className={`cursor-pointer text-xs py-1.5 px-3 rounded-xl transition-all ${
 isSelected ? "bg-primary text-primary-foreground font-bold shadow-xs" : "hover:bg-muted"
 }`}
 >
 {isSelected && <CheckCircle2 className="size-3 mr-1" />}
 <span>{tag}</span>
 </Badge>
 );
 })}
 </div>
 </div>

 <hr className="border-border/60" />

 <div className="space-y-3">
 <Label className="text-xs font-bold flex items-center gap-1.5">
 <Globe2 className="size-4 text-primary" />
 Configurações de SEO & Vitrine Pública
 </Label>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Título de SEO (Title Tag)</Label>
 <Input
 value={seoTitle}
 onChange={(e) => setSeoTitle(e.target.value)}
 placeholder={`Pacotes de Viagem para ${name || "Destino"} | Melhores Roteiros`}
 className="h-9 text-xs rounded-xl"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Meta Descrição</Label>
 <Textarea
 value={seoDescription}
 onChange={(e) => setSeoDescription(e.target.value)}
 placeholder={`Conheça os melhores passeios, hotéis e atrativos em ${name || "este destino"}. Pacotes com aéreo, transfer e guia exclusivo.`}
 rows={2}
 className="text-xs rounded-xl resize-none"
 />
 </div>
 </div>
 </TabsContent>

 {/* ── ABA 6: LIVE PREVIEW DA PÁGINA COMPLETA DO DESTINO ── */}
 <TabsContent value="preview" className="m-0 space-y-6">
 <div className="rounded-2xl border border-border overflow-hidden bg-background shadow-md">
 {/* Hero Panorâmico do Destino */}
 <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-muted">
 {coverImageUrl ? (
 <img src={coverImageUrl} alt={name} className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full flex items-center justify-center text-muted-foreground">
 <Camera className="size-12" />
 </div>
 )}
 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

 <div className="absolute bottom-6 left-6 right-6 space-y-2 text-white">
 <div className="flex flex-wrap items-center gap-2">
 <Badge className="bg-primary text-primary-foreground border-none font-bold text-xs">
 {state} • {country}
 </Badge>
 {iataGateway && (
 <Badge className="bg-white/20 backdrop-blur-md text-white border-none font-mono text-xs">
 Portão IATA: {iataGateway}
 </Badge>
 )}
 {reviews.length > 0 && (
 <Badge className="bg-primary/90 text-white border-none font-bold text-xs gap-1 font-mono">
 Nota {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)} ({reviews.length} avaliações)
 </Badge>
 )}
 </div>
 <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{name || "Nome do Destino"}</h1>
 <p className="text-xs sm:text-sm text-white/80 line-clamp-2 max-w-2xl">{description}</p>
 </div>
 </div>

 {/* Barra de Atributos Chave */}
 <div className="grid grid-cols-2 sm:grid-cols-4 p-4 border-b border-border bg-muted/20 gap-3 text-xs">
 <div>
 <span className="text-[10px] text-muted-foreground uppercase font-bold block">Melhor Época</span>
 <span className="font-semibold text-foreground">{bestSeason || "Ano Todo"}</span>
 </div>
 <div>
 <span className="text-[10px] text-muted-foreground uppercase font-bold block">Fuso Horário</span>
 <span className="font-semibold text-foreground">{timezone.split(" ")[0]}</span>
 </div>
 <div>
 <span className="text-[10px] text-muted-foreground uppercase font-bold block">Clima Predominante</span>
 <span className="font-semibold text-foreground">{climateType}</span>
 </div>
 <div>
 <span className="text-[10px] text-muted-foreground uppercase font-bold block">Aeroporto Gateway</span>
 <span className="font-semibold text-foreground font-mono">{iataGateway || "Não informado"}</span>
 </div>
 </div>

 {/* Conteúdo Renderizado das Seções CMS */}
 <div className="p-6 space-y-8">
 {sections.map((sec, i) => (
 <div key={sec.id || i} className="space-y-4">
 <div>
 <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
 {sec.subtitle || "Destaque"}
 </span>
 <h2 className="text-lg font-bold text-foreground">{sec.title}</h2>
 </div>

 {sec.type === "photo_text" && (
 <div className={`grid grid-cols-1 ${sec.media_urls?.[0] ? "md:grid-cols-2" : ""} gap-6 items-center`}>
 {sec.media_urls?.[0] && (
 <div className="rounded-2xl overflow-hidden aspect-video bg-muted border border-border shadow-xs">
 <img src={sec.media_urls[0]} alt={sec.title} className="w-full h-full object-cover" />
 </div>
 )}
 <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
 {sec.content_text}
 </p>
 </div>
 )}

 {sec.items && sec.items.length > 0 && (
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
 {sec.items.map((item, itIdx) => (
 <div key={item.id || itIdx} className="p-3.5 rounded-2xl border border-border/80 bg-muted/10 space-y-1.5 shadow-2xs">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
 {item.badge && (
 <Badge variant="outline" className="text-[9px] font-bold">
 {item.badge}
 </Badge>
 )}
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 {item.description}
 </p>
 </div>
 ))}
 </div>
 )}
 </div>
 ))}

 {/* Galeria de Fotos no Preview */}
 {galleryUrls.length > 0 && (
 <div className="space-y-3 pt-4 border-t border-border">
 <h3 className="text-sm font-bold text-foreground">Galeria de Fotos do Destino</h3>
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
 {galleryUrls.map((url, idx) => (
 <div key={idx} className="rounded-2xl overflow-hidden aspect-video bg-muted border border-border shadow-2xs">
 <img src={url} alt="Galeria" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>
 </TabsContent>
 </div>
 </Tabs>

 {/* Rodapé Fixo */}
 <div className="p-4 px-5 border-t border-border/80 bg-card flex items-center justify-between">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsSheetOpen(false)}
 className="rounded-xl text-xs h-10 px-4 cursor-pointer"
 >
 Cancelar
 </Button>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => setActiveTab("preview")}
 className="rounded-xl text-xs font-semibold h-10 px-4 gap-1.5 cursor-pointer"
 >
 <Eye className="size-4 text-muted-foreground" />
 <span>Ver Preview</span>
 </Button>

 <Button
 type="button"
 size="sm"
 disabled={createMut.isPending || updateMut.isPending || !name.trim()}
 onClick={handleSubmit}
 className="rounded-xl text-xs font-bold h-10 px-6 bg-foreground text-background hover:bg-foreground/90 gap-2 cursor-pointer shadow-xs"
 >
 <CheckCircle2 className="size-4 text-emerald-500" />
 <span>
 {createMut.isPending || updateMut.isPending
 ? "Salvando Destino..."
 : editingDestination
 ? "Salvar Alterações do Destino"
 : "Cadastrar Destino Completo"}
 </span>
 </Button>
 </div>
 </div>
 </SheetContent>
 </Sheet>

 {/* ── 6. MODAL INDEPENDENTE DE PREVIEW DA PÁGINA DO DESTINO ── */}
 {previewModalDest && (
 <Sheet open={!!previewModalDest} onOpenChange={() => setPreviewModalDest(null)}>
 <SheetContent
 side="right"
 className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-2xl md:max-w-3xl flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border"
 >
 <SheetHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
 <div>
 <SheetTitle className="text-sm font-bold text-foreground">
 Página do Destino: {previewModalDest.name}
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 Visualização pública para o viajante
 </SheetDescription>
 </div>
 </SheetHeader>

 <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
 <div className="rounded-2xl overflow-hidden aspect-video relative bg-muted">
 {previewModalDest.cover_image_url && (
 <img
 src={previewModalDest.cover_image_url}
 alt={previewModalDest.name}
 className="w-full h-full object-cover"
 />
 )}
 <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-5 text-white">
 <div>
 <Badge className="bg-primary text-primary-foreground text-xs mb-1">
 {previewModalDest.state} • {previewModalDest.country}
 </Badge>
 <h2 className="text-2xl font-black">{previewModalDest.name}</h2>
 </div>
 </div>
 </div>

 <div className="space-y-2">
 <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sobre o Destino</h3>
 <p className="text-xs text-foreground leading-relaxed">{previewModalDest.description}</p>
 </div>

 {previewModalDest.sections && previewModalDest.sections.length > 0 && (
 <div className="space-y-4">
 <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Seções Detalhadas</h3>
 {previewModalDest.sections.map((s, idx) => (
 <div key={idx} className="p-4 rounded-2xl border border-border/80 bg-muted/10 space-y-2">
 <h4 className="text-xs font-bold text-foreground">{s.title}</h4>
 {s.content_text && <p className="text-xs text-muted-foreground leading-relaxed">{s.content_text}</p>}
 </div>
 ))}
 </div>
 )}
 </div>
 </SheetContent>
 </Sheet>
 )}
 </div>
 </NicheOperationalGuard>
 );
}
