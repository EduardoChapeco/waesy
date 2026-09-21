import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Tag, Plus,
 Trash2,
 Loader2,
 Eye,
 Pencil,
 ArrowRight,
 Shield,
 Layers,
 Image as ImageIcon, } from "lucide-react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SheetPage } from "@/components/ui/sheet-page";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import {
 listHotpages,
 saveHotpage,
 deleteHotpage,
 type HotpageDTO,
 type HotpageModule,
} from "@/services/hotpage.functions";
import { getStoreSettings } from "@/services/store.functions";
import { getUserSession } from "@/services/auth.functions";
import { toast } from "sonner";
import { MediaUploader } from "@/components/ui/media-uploader";
import { DynamicMediaChip } from "@/components/commerce/dynamic-media-chip";
import { DestinationPicker } from "@/components/ui/destination-picker";

export const Route = createFileRoute("/workspace/marketing/hotpages")({
 head: () => ({ meta: [{ title: "Destaques & Hotpages da Loja | Workspace" }] }),
 loader: async () => {
   try {
 const [store, session] = await Promise.all([
 getStoreSettings().catch(() => null),
 getUserSession().catch(() => null),
 ]);
 const initialModule = (store?.settings?.segment || store?.segment || store?.type || "home") as HotpageModule;
 const hotpages = await listHotpages({ data: { module: initialModule } }).catch(() => []);
 return { hotpages, session, store, initialModule };
    } catch (err) {
      console.error("[loader:workspace.marketing.hotpages] Unhandled loader error:", err);
      return { hotpages: [], session: null, store: null, initialModule: "home" };
    }
  },
 component: WorkspaceStoreHotpagesPage,
});

function WorkspaceStoreHotpagesPage() {
 const { hotpages: initialHotpages, session, store, initialModule } = ((Route.useLoaderData?.() as any) || {});
 const [hotpages, setHotpages] = useState<HotpageDTO[]>(initialHotpages || []);
 const [selectedModuleFilter, setSelectedModuleFilter] = useState<HotpageModule>(initialModule || "home");
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [isSubmitting, setIsSubmitting] = useState(false);

 const [title, setTitle] = useState("");
 const [slug, setSlug] = useState("");
 const [badgeLabel, setBadgeLabel] = useState("");
 const [targetRoute, setTargetRoute] = useState("");
 const [module, setModule] = useState<HotpageModule>(initialModule || "home");
 const [bgMediaType, setBgMediaType] = useState<"none" | "image" | "video" | "gif">("none");
 const [bgMediaUrl, setBgMediaUrl] = useState("");
 const [bgTexture, setBgTexture] = useState<"none" | "noise" | "dots" | "grid" | "mesh" | "glass">("none");
 const [bgOverlayOpacity, setBgOverlayOpacity] = useState(40);
 const [showTitle, setShowTitle] = useState(true);
 const [showBadge, setShowBadge] = useState(true);
 const [showShadow, setShowShadow] = useState(false);
 const [textColor, setTextColor] = useState("");

 const isPlatformAdmin = session?.role === "platform_admin";

 const refreshList = async (mod: HotpageModule = selectedModuleFilter) => {
 const updated = await listHotpages({ data: { module: mod } }).catch(() => []);
 setHotpages(updated);
 };

 const handleModuleFilterChange = async (mod: HotpageModule) => {
 setSelectedModuleFilter(mod);
 await refreshList(mod);
 };

 const handleOpenCreate = () => {
 setEditingId(null);
 setTitle("");
 setSlug(`destaque-${Date.now()}`);
 setBadgeLabel("Novidade");
 setTargetRoute("/perfil-da-loja");
 setModule(selectedModuleFilter);
 setBgMediaType("none");
 setBgMediaUrl("");
 setBgTexture("none");
    setBgOverlayOpacity(40);
    setShowTitle(true);
    setShowBadge(true);
    setShowShadow(false);
    setTextColor("");
    setIsModalOpen(true);
  };

 const handleOpenEdit = (h: HotpageDTO) => {
 setEditingId(h.id);
 setTitle(h.title);
 setSlug(h.slug);
 setBadgeLabel(h.badge_label || "");
 setTargetRoute(h.target_route || "");
 setModule((h.module as HotpageModule) || selectedModuleFilter);
 setBgMediaType(h.bg_media_type || "none");
 setBgMediaUrl(h.bg_media_url || "");
 setBgTexture(h.bg_texture || "none");
    setBgOverlayOpacity(h.bg_overlay_opacity ?? 40);
    setShowTitle(h.show_title !== false);
    setShowBadge(h.show_badge !== false);
    setShowShadow(h.show_shadow === true);
    setTextColor(h.text_color || "");
    setIsModalOpen(true);
  };

 const handleSave = async () => {
 if (!title.trim()) {
 toast.error("O título do destaque é obrigatório.");
 return;
 }

 setIsSubmitting(true);
 try {
 await saveHotpage({
 data: {
 id: editingId || undefined,
 slug: slug.trim() || `hotpage-${Date.now()}`,
 title: title.trim(),
 badge_label: badgeLabel.trim() || undefined,
 target_route: targetRoute.trim() || undefined,
 bg_media_type: bgMediaType,
 bg_media_url: bgMediaUrl || undefined,
 bg_texture: bgTexture,
        bg_overlay_opacity: bgOverlayOpacity,
        show_title: showTitle,
        show_badge: showBadge,
        show_shadow: showShadow,
        text_color: textColor.trim() || undefined,
        module,
        is_active: true,
        sort_order: 0,
      },
    });

 toast.success(editingId ? "Destaque atualizado!" : "Destaque criado com sucesso!");
 setIsModalOpen(false);
 await refreshList();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao salvar destaque.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleDelete = async (id: string) => {
 if (!confirm("Deseja realmente remover este destaque?")) return;
 try {
 await deleteHotpage({ data: { id } });
 toast.success("Destaque removido.");
 await refreshList();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao excluir destaque.");
 }
 };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 {/* ── PageHeader Canônico Clean ── */}
 <PageHeader
 eyebrow="Vitrine & Divulgação"
 title="Destaques & Hotpages"
 actions={
 <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
 <Select
 value={selectedModuleFilter}
 onValueChange={(val: any) => handleModuleFilterChange(val)}
 >
 <SelectTrigger className="w-full sm:w-[200px] rounded-xl text-sm h-11 bg-background shadow-2xs">
 <SelectValue placeholder="Filtrar por vitrine" />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="home">Home / Perfil da Loja</SelectItem>
 <SelectItem value="gastronomia">Gastronomia</SelectItem>
 <SelectItem value="mercado">Supermercados</SelectItem>
 <SelectItem value="moda">Moda & Vestuário</SelectItem>
 <SelectItem value="turismo">Turismo</SelectItem>
 <SelectItem value="pet">Pet Shop</SelectItem>
 <SelectItem value="beleza">Beleza</SelectItem>
 <SelectItem value="servicos">Serviços</SelectItem>
 <SelectItem value="imoveis">Imóveis</SelectItem>
 <SelectItem value="eventos">Eventos</SelectItem>
 <SelectItem value="all">Todas as Vitrines</SelectItem>
 </SelectContent>
 </Select>

 <Button
 onClick={handleOpenCreate}
 className="rounded-xl font-bold text-sm h-11 px-5 bg-primary text-primary-foreground gap-2 shadow-xs cursor-pointer"
 >
 <Plus className="size-4" />
 <span>Novo Destaque</span>
 </Button>
 </div>
 }
 />

 {/* ── Grade de Destaques ou Empty State ── */}
 {hotpages.length === 0 ? (
 <div className="py-16 text-center space-y-4 border border-dashed border-border/70 rounded-2xl bg-card/40">
 <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
 <Layers className="size-7" />
 </div>
 <div className="space-y-1.5">
 <h3 className="text-base font-bold text-foreground">Nenhum destaque cadastrado</h3>
 <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
 Adicione cartões especiais para promover combos, lançamentos ou seções exclusivas no seu perfil.
 </p>
 </div>
 <Button onClick={handleOpenCreate} className="rounded-xl text-sm font-bold h-11 px-6 shadow-xs cursor-pointer">
 <Plus className="size-4 mr-1.5" />
 Criar Primeiro Destaque
 </Button>
 </div>
 ) : (
 <div className="flex flex-col gap-3.5 sm:grid sm:grid-cols-2 lg:grid-cols-3">
 {hotpages.map((h) => (
 <div
 key={h.id}
 className="p-4 sm:p-5 rounded-2xl bg-card border border-border/70 space-y-3.5 shadow-2xs flex flex-col justify-between"
 >
 <div className="space-y-2.5">
 <div className="flex items-center justify-between">
 <Badge variant="outline" className="text-xs font-mono font-bold px-2 py-0.5">
 {h.badge_label || "Card"}
 </Badge>
 <span className="text-[11px] text-muted-foreground font-mono">
 {h.bg_texture !== "none" ? `Textura: ${h.bg_texture}` : "Padrão"}
 </span>
 </div>

 <h3 className="text-base font-bold text-foreground line-clamp-1">{h.title}</h3>
 <p className="text-xs text-muted-foreground truncate">{h.target_route || "/loja"}</p>

 {/* Mini Preview do Chip */}
 <div className="pt-2">
                <DynamicMediaChip
                  label={h.title}
                  badge={h.badge_label || undefined}
                  bg_media_type={h.bg_media_type || undefined}
                  bg_media_url={h.bg_media_url || undefined}
                  bg_texture={h.bg_texture as any || undefined}
                  bg_overlay_opacity={h.bg_overlay_opacity ?? undefined}
                  show_shadow={h.show_shadow}
                  text_color={h.text_color}
                  to={h.target_route || undefined}
                />
 </div>
 </div>

 <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
 <Button
 onClick={() => handleOpenEdit(h)}
 variant="outline"
 className="h-10 px-3.5 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
 >
 <Pencil className="size-3.5" /> Editar
 </Button>
 <Button
 onClick={() => handleDelete(h.id)}
 variant="ghost"
 className="h-10 px-3 rounded-xl text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
 >
 <Trash2 className="size-4" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Drawer Lateral de Criação/Edição com Live Preview */}
 <SheetPage
 open={isModalOpen}
 onOpenChange={setIsModalOpen}
 title={editingId ? "Editar Destaque" : "Novo Destaque da Loja"}
 description="Personalize o texto, mídia de fundo e destino do card."
 >
 <div className="space-y-5 p-1 pb-16">
 {/* Live Preview */}
 <div className="space-y-1.5 p-3 rounded-2xl bg-muted/20 border border-border/50">
 <span className="text-[11px] font-bold text-muted-foreground">Pré-Visualização em Tempo Real</span>
              <DynamicMediaChip
                label={title || "Nome do Destaque"}
                badge={badgeLabel || undefined}
                bg_media_type={bgMediaType}
                bg_media_url={bgMediaUrl || undefined}
                bg_texture={bgTexture as any}
                bg_overlay_opacity={bgOverlayOpacity}
                show_shadow={showShadow}
                text_color={textColor || undefined}
              />
 </div>

 <div className="space-y-2">
 <Label className="text-xs sm:text-sm font-semibold">Título do Destaque *</Label>
 <Input
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="Ex: Combo Família ou Oferta do Dia"
 className="rounded-xl text-sm h-11 bg-background"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs sm:text-sm font-semibold">Badge / Tag de Destaque</Label>
 <Input
 value={badgeLabel}
 onChange={(e) => setBadgeLabel(e.target.value)}
 placeholder="Ex: 20% OFF, Novo, Combo Especial"
 className="rounded-xl text-sm h-11 bg-background"
 />
 </div>

 {/* Seletor Canônico de Destino da Página / Link */}
 <DestinationPicker
 value={targetRoute}
 onChange={(url) => setTargetRoute(url)}
 label="Página / Rota de Destino"
 helperText="Escolha a página interna ou informe uma URL externa para este destaque."
 />

 {/* Módulo / Vitrine de Exibição */}
 <div className="space-y-2">
 <Label className="text-xs sm:text-sm font-semibold">Vitrine / Módulo de Exibição</Label>
 <Select value={module} onValueChange={(val: any) => setModule(val)}>
 <SelectTrigger className="rounded-xl text-sm h-11 bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="home">Página Inicial / Perfil da Loja (Home)</SelectItem>
 <SelectItem value="gastronomia">Gastronomia / Restaurantes</SelectItem>
 <SelectItem value="mercado">Supermercados & Empórios</SelectItem>
 <SelectItem value="moda">Moda & Vestuário</SelectItem>
 <SelectItem value="turismo">Turismo & Viagens</SelectItem>
 <SelectItem value="pet">Pet Shop & Veterinária</SelectItem>
 <SelectItem value="beleza">Beleza & Estética</SelectItem>
 <SelectItem value="servicos">Serviços Profissionais</SelectItem>
 <SelectItem value="casa">Casa & Decoração</SelectItem>
 <SelectItem value="eletronicos">Eletrônicos & Tecnologia</SelectItem>
 <SelectItem value="construcao">Construção & Reformas</SelectItem>
 <SelectItem value="imoveis">Imóveis & Locação</SelectItem>
 <SelectItem value="eventos">Eventos & Ingressos</SelectItem>
 <SelectItem value="all">Todas as Vitrines (Global)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Mídia de Fundo */}
 <div className="space-y-2 pt-2 border-t border-border/30">
 <Label className="text-xs sm:text-sm font-semibold">Tipo de Mídia de Fundo</Label>
 <Select
 value={bgMediaType}
 onValueChange={(val: any) => setBgMediaType(val)}
 >
 <SelectTrigger className="rounded-xl text-sm h-11 bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="none">Nenhuma (Cor padrão)</SelectItem>
 <SelectItem value="image">Imagem</SelectItem>
 <SelectItem value="video">Vídeo MP4</SelectItem>
 <SelectItem value="gif">GIF Animado</SelectItem>
 </SelectContent>
 </Select>

 {bgMediaType !== "none" && (
 <div className="space-y-2 pt-1">
 <Label className="text-xs sm:text-sm font-semibold">Upload de Mídia ou URL</Label>
 <MediaUploader
 value={bgMediaUrl ? [bgMediaUrl] : []}
 onChange={(urls) => setBgMediaUrl(urls[0] || "")}
 bucket="cms-media"
 folder="botoes"
 aspect={16 / 9}
 lockAspect={true}
 maxFiles={1}
 />
 </div>
 )}
 </div>

 {/* Textura */}
 <div className="space-y-2">
 <Label className="text-xs sm:text-sm font-semibold">Textura Visual</Label>
 <Select
 value={bgTexture}
 onValueChange={(val: any) => setBgTexture(val)}
 >
 <SelectTrigger className="rounded-xl text-sm h-11 bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="none">Sem Textura</SelectItem>
 <SelectItem value="noise">Noise Gradiente Suave</SelectItem>
 <SelectItem value="dots">Pontilhismo (Dots)</SelectItem>
 <SelectItem value="grid">Grid Técnico</SelectItem>
 <SelectItem value="mesh">Mesh Gradient</SelectItem>
 <SelectItem value="glass">Glassmorphism</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Switches de Exibição */}
 <div className="space-y-3 pt-2 border-t border-border/30">
 <div className="flex items-center justify-between">
 <Label className="text-xs sm:text-sm font-semibold">Exibir Título</Label>
 <Switch checked={showTitle} onCheckedChange={setShowTitle} />
 </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm font-semibold">Exibir Badge</Label>
              <Switch checked={showBadge} onCheckedChange={setShowBadge} />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <Label className="text-xs sm:text-sm font-semibold">Sombra no Card / Texto</Label>
                <p className="text-[11px] text-muted-foreground">Realça contraste sobre imagens claras</p>
              </div>
              <Switch checked={showShadow} onCheckedChange={setShowShadow} />
            </div>
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs sm:text-sm font-semibold">Cor do Texto (Opcional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  placeholder="Ex: #FFFFFF ou #000000"
                  className="rounded-xl text-sm h-11 bg-background font-mono"
                />
                {textColor && (
                  <div
                    className="size-9 rounded-xl border border-border shrink-0 shadow-xs"
                    style={{ backgroundColor: textColor }}
                  />
                )}
              </div>
            </div>
          </div>

 <div className="pt-5 flex items-center justify-end gap-2.5">
 <Button
 onClick={() => setIsModalOpen(false)}
 variant="outline"
 className="h-11 px-5 rounded-xl text-sm font-medium cursor-pointer"
 >
 Cancelar
 </Button>
 <Button
 onClick={handleSave}
 disabled={isSubmitting}
 className="h-11 px-6 rounded-xl text-sm font-bold bg-primary text-primary-foreground min-w-[120px] shadow-xs cursor-pointer"
 >
 {isSubmitting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : "Salvar Destaque"}
 </Button>
 </div>
 </div>
 </SheetPage>
 </div>
 );
}
