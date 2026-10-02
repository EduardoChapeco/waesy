import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Tag, Image as ImageIcon, Plus, Trash2, Pencil, Search, ExternalLink, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SheetPage } from "@/components/ui/sheet-page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listActiveBanners, createBanner, updateBanner, deleteBanner, type BannerDTO, type BannerPlacement } from "@/services/banner.functions";
import { CANONICAL_CITIES } from "@/lib/constants/cities";
import { toast } from "sonner";
import { MediaUploader } from "@/components/ui/media-uploader";
import { DestinationPicker } from "@/components/ui/destination-picker";
import { cn } from "@/lib/utils";

const SearchSchema = z.object({
  placement: z.string().optional(),
});

export const Route = createFileRoute("/admin-master/banners")({
  validateSearch: (search: Record<string, unknown>) => SearchSchema.parse(search),
  head: () => ({ meta: [{ title: "Banners e Vitrines | Admin Master" }] }),
  loader: async () => {
    try {
      const banners = await listActiveBanners({ data: { placement: "all" } }).catch(() => []);
      return { banners: Array.isArray(banners) ? banners : [] };
    } catch (err) {
      console.error("[loader:admin-master.banners] Unhandled loader error:", err);
      return { banners: [] };
    }
  },
  errorComponent: AdminMasterBannersErrorComponent,
  component: AdminMasterBannersPage,
});

function AdminMasterBannersErrorComponent({ error }: { error: any }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center space-y-4">
      <div className="inline-flex size-14 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-1">
        <ImageIcon className="size-7" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">Falha ao Carregar Banners de Anúncios</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Não foi possível sincronizar os banners das vitrines públicas.
        </p>
      </div>
      {error?.message && (
        <pre className="mt-2 rounded-lg bg-muted/40 border border-border/50 p-3 text-[10px] text-muted-foreground overflow-auto max-h-32 text-left font-mono">
          {error.message}
        </pre>
      )}
      <div className="pt-2 flex items-center justify-center gap-3">
        <Button
          variant="default"
          size="sm"
          className="rounded-lg text-xs h-10 px-5 font-bold cursor-pointer"
          onClick={() => window.location.reload()}
        >
          Recarregar Página
        </Button>
      </div>
    </div>
  );
}

export const PLACEMENT_OPTIONS: { id: BannerPlacement; label: string }[] = [
  { id: "all", label: "Todas as Vitrines" },
  { id: "home", label: "Início (Topo/Hero)" },
  { id: "home_middle", label: "Início (Meio do Feed)" },
  { id: "home_footer", label: "Início (Rodapé de Empresas)" },
  { id: "gastronomia", label: "Gastronomia" },
  { id: "mercado", label: "Supermercado" },
  { id: "farmacia", label: "Farmácia" },
  { id: "bebidas", label: "Bebidas" },
  { id: "acougue", label: "Açougue" },
  { id: "moda", label: "Moda" },
  { id: "eletronicos", label: "Eletrônicos" },
  { id: "pet", label: "Pet Shop" },
  { id: "servicos", label: "Serviços" },
  { id: "imoveis", label: "Imóveis" },
  { id: "construcao", label: "Construção" },
  { id: "casa", label: "Casa e Decoração" },
  { id: "beleza", label: "Beleza" },
  { id: "limpeza", label: "Limpeza" },
  { id: "livros", label: "Livros" },
  { id: "noticias", label: "Notícias" },
  { id: "agenda", label: "Agenda" },
  { id: "eventos", label: "Eventos e Shows" },
  { id: "turismo", label: "Turismo" },
  { id: "empregos", label: "Empregos" },
  { id: "classificados", label: "Classificados" },
  { id: "diretorio", label: "Diretório" },
  { id: "mobilidade", label: "Mobilidade" },
  { id: "ofertas", label: "Ofertas" },
];

function AdminMasterBannersPage() {
  const { banners: initialBanners } = ((Route.useLoaderData?.() as any) || {});
  const search = Route.useSearch();
  const router = useRouter();
  const [banners, setBanners] = useState<BannerDTO[]>(initialBanners || []);
  const [selectedPlacementTab, setSelectedPlacementTab] = useState<BannerPlacement>(
    (search.placement as BannerPlacement) || "all"
  );
  const [selectedCityFilter, setSelectedCityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "gif">("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [targetType, setTargetType] = useState<
    "category" | "product" | "hotpage" | "store" | "external_url"
  >("hotpage");
  const [targetUrl, setTargetUrl] = useState("");
  const [placement, setPlacement] = useState<BannerPlacement>("home");
  const [cityFilter, setCityFilter] = useState("all");
  const [badgeText, setBadgeText] = useState("Destaque");
  const [ctaLabel, setCtaLabel] = useState("Conferir");

  // Customization Switches
  const [showOverlay, setShowOverlay] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [showCta, setShowCta] = useState(false);

  const refreshBanners = async () => {
    const updated = await listActiveBanners({ data: { placement: "all" } }).catch(() => []);
    setBanners(updated);
    router.invalidate();
  };

  const handleOpenCreate = (preselectedPlacement?: BannerPlacement) => {
    const targetPlacement =
      preselectedPlacement && preselectedPlacement !== "all"
        ? preselectedPlacement
        : selectedPlacementTab !== "all"
        ? selectedPlacementTab
        : "home";

    setEditingId(null);
    setTitle("");
    setSubtitle("");
    setMediaUrl("");
    setTargetUrl("");
    setPlacement(targetPlacement);
    setCityFilter("all");
    setShowOverlay(false);
    setShowTitle(false);
    setShowDescription(false);
    setShowBadge(false);
    setShowCta(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (banner: BannerDTO) => {
    setEditingId(banner.id);
    setTitle(banner.title || "");
    setSubtitle(banner.subtitle || "");
    setMediaType(banner.media_type || "image");
    setMediaUrl(banner.media_url || "");
    setTargetType(banner.target_type || "hotpage");
    setTargetUrl(banner.target_url || "");
    setPlacement(banner.placement || "home");
    setCityFilter(banner.city_filter || "all");
    setBadgeText(banner.badge_text || "Destaque");
    setCtaLabel(banner.cta_label || "Conferir");
    setShowOverlay(banner.show_overlay === true);
    setShowTitle(banner.show_title === true);
    setShowDescription(banner.show_description === true);
    setShowBadge(banner.show_badge === true);
    setShowCta(banner.show_cta === true);
    setIsModalOpen(true);
  };

  const handleToggleOverlay = async (id: string, newOverlayValue: boolean) => {
    try {
      await updateBanner({
        data: {
          id,
          show_overlay: newOverlayValue,
          show_title: newOverlayValue,
          show_description: newOverlayValue,
          show_badge: newOverlayValue,
          show_cta: newOverlayValue,
        },
      });
      toast.success(newOverlayValue ? "Texto ativado no banner." : "Banner em modo arte limpa.");
      refreshBanners();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atualizar banner.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl.trim()) {
      toast.error("Informe a mídia do banner.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateBanner({
          data: {
            id: editingId,
            title: title || "Banner Oficial",
            subtitle: subtitle || null,
            media_type: mediaType,
            media_url: mediaUrl,
            target_type: targetType,
            target_url: targetUrl || null,
            placement,
            city_filter: cityFilter === "all" ? null : cityFilter,
            badge_text: badgeText || null,
            cta_label: ctaLabel || null,
            show_title: showTitle,
            show_description: showDescription,
            show_overlay: showOverlay,
            show_badge: showBadge,
            show_cta: showCta,
          },
        });
        toast.success("Banner atualizado.");
      } else {
        await createBanner({
          data: {
            title: title || "Banner Oficial",
            subtitle: subtitle || undefined,
            media_type: mediaType,
            media_url: mediaUrl,
            target_type: targetType,
            target_url: targetUrl || undefined,
            placement,
            city_filter: cityFilter === "all" ? null : cityFilter,
            badge_text: badgeText || undefined,
            cta_label: ctaLabel || undefined,
            show_title: showTitle,
            show_description: showDescription,
            show_overlay: showOverlay,
            show_badge: showBadge,
            show_cta: showCta,
            is_active: true,
          },
        });
        toast.success("Banner publicado.");
      }

      setIsModalOpen(false);
      refreshBanners();
    } catch (err: any) {
      toast.error(err?.message || "Falha ao salvar banner.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente remover este banner?")) return;
    try {
      await deleteBanner({ data: { id } });
      toast.success("Banner removido.");
      refreshBanners();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao remover banner.");
    }
  };

  const filteredBanners = banners.filter((b) => {
    const matchesPlacement =
      selectedPlacementTab === "all" ? true : b.placement === selectedPlacementTab;
    const matchesSearch =
      !searchTerm ||
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.placement.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.city_filter && b.city_filter.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (b.target_url && b.target_url.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCity =
      selectedCityFilter === "all"
        ? true
        : selectedCityFilter === "global"
        ? !b.city_filter
        : b.city_filter?.toLowerCase() === selectedCityFilter.toLowerCase();
    return matchesPlacement && matchesSearch && matchesCity;
  });

  const activePlacementInfo = PLACEMENT_OPTIONS.find((p) => p.id === selectedPlacementTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Banners</h1>
            <Badge variant="secondary" className="text-xs font-normal">
              {banners.length}
            </Badge>
          </div>
        </div>

        <Button
          onClick={() => handleOpenCreate()}
          size="sm"
          className="rounded-lg font-medium gap-2 h-9 px-4 cursor-pointer"
        >
          <Plus className="size-4" />
          <span>Novo Banner</span>
        </Button>
      </div>

      {/* Clean Niche Tabs */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {PLACEMENT_OPTIONS.map((opt) => {
            const count =
              opt.id === "all"
                ? banners.length
                : banners.filter((b) => b.placement === opt.id).length;
            const isActive = selectedPlacementTab === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => setSelectedPlacementTab(opt.id)}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer shrink-0 border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground border-border/60"
                )}
              >
                <span>{opt.label}</span>
                <span
                  className={cn(
                    "text-[10px] font-mono",
                    isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Bar: Search + City Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar banners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 rounded-lg bg-card text-xs border-border/60"
          />
        </div>

        {/* Seletor de Filtro de Cidade na Listagem */}
        <div className="flex items-center gap-2">
          <Select value={selectedCityFilter} onValueChange={setSelectedCityFilter}>
            <SelectTrigger className="h-9 w-full sm:w-56 rounded-lg bg-card text-xs border-border/60">
              <SelectValue placeholder="Filtrar por Cidade" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="all">Todas as Cidades</SelectItem>
              <SelectItem value="global">Apenas Globais (Sem Cidade)</SelectItem>
              {CANONICAL_CITIES.map((c) => (
                <SelectItem key={c.id} value={c.name} className="text-xs">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Banners Grid */}
      {filteredBanners.length === 0 ? (
        <div className="py-12 px-6 text-center rounded-lg bg-card/50 border border-border/60 space-y-3">
          <div className="size-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <ImageIcon className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Nenhum banner cadastrado em {activePlacementInfo?.label}
              {selectedCityFilter !== "all" && ` para ${selectedCityFilter}`}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Crie um banner dedicado para esta seção da plataforma.
            </p>
          </div>
          <Button
            onClick={() => handleOpenCreate(selectedPlacementTab)}
            size="sm"
            variant="outline"
            className="rounded-lg text-xs font-medium gap-2"
          >
            <Plus className="size-3.5" /> Adicionar Banner
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBanners.map((banner) => (
            <div
              key={banner.id}
              className="group relative rounded-lg bg-card border border-border/60 overflow-hidden flex flex-col hover:border-primary/40 transition-colors shadow-2xs"
            >
              {/* Media Preview com Escala Proporcional Verdadeira */}
              <div className="relative aspect-[2.35/1] sm:aspect-[2.6/1] md:aspect-21/9 w-full bg-muted overflow-hidden">
                {banner.media_type === "video" ? (
                  <video
                    src={banner.media_url}
                    className="size-full object-cover"
                    muted
                    loop
                    autoPlay
                    playsInline
                  />
                ) : (
                  <div className="relative size-full overflow-hidden">
                    <img
                      src={banner.media_url}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 size-full object-cover blur-xl opacity-35 scale-110 pointer-events-none select-none"
                    />
                    <img
                      src={banner.media_url}
                      alt={banner.title}
                      className="relative size-full object-contain sm:object-cover select-none"
                    />
                  </div>
                )}

                {/* Placement & City Tags */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-2 flex-wrap max-w-[85%]">
                  <span className="bg-black/75 text-white backdrop-blur-md text-[10px] font-mono px-2 py-1 rounded-md border border-white/10">
                    {banner.placement.toUpperCase()}
                  </span>
                  {banner.city_filter ? (
                    <span className="bg-primary text-primary-foreground backdrop-blur-md text-[9px] font-semibold px-2 py-1 rounded-md flex items-center gap-1 shadow-xs">
                      <MapPin className="size-2.5" />
                      {banner.city_filter}
                    </span>
                  ) : (
                    <span className="bg-zinc-800/80 text-zinc-300 text-[9px] font-medium px-2 py-1 rounded-md border border-white/10">
                      Global
                    </span>
                  )}
                  {banner.show_overlay && (
                    <span className="bg-emerald-600/90 text-white text-[9px] font-medium px-2 py-1 rounded-md">
                      Texto Ativo
                    </span>
                  )}
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(banner.id)}
                  className="absolute top-2 right-2 z-10 size-6 rounded-md bg-black/60 hover:bg-destructive text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Remover banner"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>

              {/* Card Footer */}
              <div className="p-4 flex flex-col justify-between gap-3 text-xs flex-1">
                <div>
                  <p className="font-semibold text-foreground truncate">{banner.title}</p>
                  <p className="text-muted-foreground truncate text-[11px] font-mono mt-1">
                    {banner.target_url || "/"}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">Texto:</span>
                    <Switch
                      checked={banner.show_overlay === true}
                      onCheckedChange={(checked) => handleToggleOverlay(banner.id, checked)}
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    {banner.target_url && (
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Ver destino"
                      >
                        <a href={banner.target_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenEdit(banner)}
                      className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Editar"
                    >
                      <Pencil className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Drawer */}
      <SheetPage
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingId ? "Editar Banner" : "Novo Banner"}
        description="Configure a mídia, localidade e direcionamentos do banner."
      >
        <form onSubmit={handleSave} className="space-y-5 p-1">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Vitrine / Nicho</Label>
            <Select value={placement} onValueChange={(v) => setPlacement(v as BannerPlacement)}>
              <SelectTrigger className="h-9 rounded-lg bg-card text-xs">
                <SelectValue placeholder="Selecione o nicho" />
              </SelectTrigger>
              <SelectContent>
                {PLACEMENT_OPTIONS.filter((p) => p.id !== "all").map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seletor de Cidade / Localidade Alvo */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Localidade / Cidade Alvo</Label>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="h-9 rounded-lg bg-card text-xs">
                <SelectValue placeholder="Selecione a cidade do público" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">Todas as Cidades (Global)</SelectItem>
                {CANONICAL_CITIES.map((c) => (
                  <SelectItem key={c.id} value={c.name} className="text-xs">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Banners vinculados a uma cidade são exibidos com prioridade no topo para moradores e visitantes com GPS ou seleção ativa nessa localidade.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Mídia do Banner (Imagem / Vídeo)</Label>
            <MediaUploader
              value={mediaUrl ? [mediaUrl] : []}
              onChange={(urls) => {
                const url = urls[0] || "";
                setMediaUrl(url);
                const isVideo = url.endsWith(".mp4") || url.endsWith(".webm");
                setMediaType(isVideo ? "video" : "image");
              }}
              bucket="banners"
              folder="destaques"
              aspect={21 / 9}
              lockAspect={true}
              maxFiles={1}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Título Interno</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Campanha de Primavera"
              className="h-9 rounded-lg bg-card text-xs"
            />
          </div>

          {/* Seletor Canônico de Destino / Link Helper */}
          <DestinationPicker
            value={targetUrl}
            onChange={setTargetUrl}
            targetType={targetType}
            onTargetTypeChange={setTargetType}
            label="Página de Destino / Link do Banner"
            helperText="Selecione a página do sistema ou digite um link customizado."
          />

          {/* Overlay Text Settings */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">Exibir Textos sobre o Banner</p>
                <p className="text-[11px] text-muted-foreground">Desative para manter a arte 100% limpa.</p>
              </div>
              <Switch checked={showOverlay} onCheckedChange={setShowOverlay} />
            </div>

            {showOverlay && (
              <div className="space-y-3 pt-2 border-t border-border/40 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <Label className="text-[11px]">Subtítulo / Descrição</Label>
                  <Input
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Descrição complementar..."
                    className="h-8 rounded-lg bg-card text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Badge</Label>
                    <Input
                      value={badgeText}
                      onChange={(e) => setBadgeText(e.target.value)}
                      placeholder="Destaque"
                      className="h-8 rounded-lg bg-card text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Texto do Botão (CTA)</Label>
                    <Input
                      value={ctaLabel}
                      onChange={(e) => setCtaLabel(e.target.value)}
                      placeholder="Conferir"
                      className="h-8 rounded-lg bg-card text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="rounded-lg text-xs font-semibold px-4"
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : editingId ? (
                "Atualizar"
              ) : (
                "Publicar"
              )}
            </Button>
          </div>
        </form>
      </SheetPage>
    </div>
  );
}
