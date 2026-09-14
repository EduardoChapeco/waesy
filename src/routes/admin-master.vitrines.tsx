import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Plus, Trash2, Pencil, ArrowUp, ArrowDown, Layout, Sliders, Layers, Store, Tag, Shuffle, Eye, CheckCircle2, Grid } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from "@/components/ui/dialog";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
 listAllSurfaces,
 listSurfaceSections,
 upsertSurfaceSection,
 deleteSurfaceSection,
 reorderSurfaceSections,
 type SurfaceSectionDTO,
 type SurfaceSectionType,
 type SurfaceDataSource,
 type SurfaceRankingStrategy,
 type SurfaceLayoutVariant,
 type MarketplaceSurfaceDTO,
} from "@/services/surface-cms.functions";

const SearchSchema = z.object({
 surface: z.string().optional(),
});

export const Route = createFileRoute("/admin-master/vitrines")({
 validateSearch: (search: Record<string, unknown>) => SearchSchema.parse(search),
 head: () => ({ meta: [{ title: "Vitrines & Seções CMS | Admin Master" }] }),
 loader: async () => {
   try {
 const surfaces = await listAllSurfaces().catch(() => []);
 return { surfaces };
   } catch (err) {
     console.error("[loader:admin-master.vitrines] Unhandled loader error:", err);
     return { surfaces: null };
   }
 },
 component: AdminMasterVitrinesPage,
});

const SECTION_TYPE_OPTIONS: Array<{ id: SurfaceSectionType; label: string; icon: any }> = [
 { id: "product_rail", label: "Trilho de Produtos (Carrossel)", icon: Tag },
 { id: "flash_deal_rail", label: "Trilho de Ofertas Relâmpago", icon: Tag },
 { id: "store_rail", label: "Trilho de Lojas & Estabelecimentos", icon: Store },
 { id: "grid_4col", label: "Grade de 4 Colunas (Grid)", icon: Grid },
 { id: "bento_grid", label: "Bento Grid (1 Destaque + 2 Médios)", icon: Layout },
 { id: "banner_single_21_9", label: "Banner Único Panorâmico (21:9)", icon: Layout },
 { id: "banner_duo_16_9", label: "Banners Duplos Lado a Lado (16:9)", icon: Grid },
 { id: "custom_buttons_rail", label: "Trilho de Botões / Atalhos Customizados", icon: Sliders },
];

const DATA_SOURCE_OPTIONS: Array<{ id: SurfaceDataSource; label: string }> = [
 { id: "all_products", label: "Todos os Produtos do Nicho" },
 { id: "flash_deals", label: "Produtos com Desconto / Promoção" },
 { id: "stores", label: "Lojas e Estabelecimentos Parceiros" },
 { id: "top_sellers", label: "Mais Vendidos & Populares" },
 { id: "banners", label: "Banners da Plataforma" },
 { id: "custom_buttons", label: "Botões & Atalhos Rápidos" },
];

const RANKING_OPTIONS: Array<{ id: SurfaceRankingStrategy; label: string; desc: string }> = [
 { id: "random_shuffle", label: "🎲 Randomização Rotativa (Shuffle)", desc: "Embaralha itens para visibilidade justa" },
 { id: "discount", label: "🏷️ Maior Desconto Percentual", desc: "Prioriza os maiores descontos" },
 { id: "popularity", label: "⭐ Mais Vendidos & Avaliados", desc: "Baseado em volume de pedidos" },
 { id: "recency", label: "⏱️ Mais Recentes (Novidades)", desc: "Cadastrados recentemente" },
 { id: "curated_fixed", label: "📌 Ordem Fixa Manual", desc: "Respeita a ordem exata do painel" },
];

const LAYOUT_OPTIONS: Array<{ id: SurfaceLayoutVariant; label: string }> = [
 { id: "rail_standard", label: "Trilho com Snap Scroll (Padrão)" },
 { id: "rail_compact", label: "Trilho Compacto para Lojas" },
 { id: "grid_4col", label: "Grade Completa de 4 Colunas" },
 { id: "grid_2col", label: "Grade Compacta de 2 Colunas" },
 { id: "bento_3", label: "Composição Bento Box (3 Itens)" },
 { id: "banner_21_9", label: "Banner Panorâmico 21:9" },
 { id: "banner_16_9_duo", label: "Grade de Banners 16:9 Duplos" },
 { id: "buttons_rail", label: "Trilho de Botões / Chips" },
];

function AdminMasterVitrinesPage() {
 const { surfaces } = ((Route.useLoaderData?.() as any) || {});
 const search = Route.useSearch();
 const router = useRouter();
 const [selectedSurfaceSlug, setSelectedSurfaceSlug] = useState(search.surface || "home");
 const [sections, setSections] = useState<SurfaceSectionDTO[]>([]);
 const [isLoading, setIsLoading] = useState(false);
 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [editingSection, setEditingSection] = useState<SurfaceSectionDTO | null>(null);

 // Form State
 const [title, setTitle] = useState("");
 const [subtitle, setSubtitle] = useState("");
 const [badgeTag, setBadgeTag] = useState("");
 const [type, setType] = useState<SurfaceSectionType>("product_rail");
 const [dataSource, setDataSource] = useState<SurfaceDataSource>("all_products");
 const [rankingStrategy, setRankingStrategy] = useState<SurfaceRankingStrategy>("random_shuffle");
 const [layoutVariant, setLayoutVariant] = useState<SurfaceLayoutVariant>("rail_standard");
 const [itemLimit, setItemLimit] = useState(12);
 const [isActive, setIsActive] = useState(true);
 const [isSubmitting, setIsSubmitting] = useState(false);

 // Carrega seções da superfície selecionada
 const fetchSections = async (slug: string) => {
 setIsLoading(true);
 try {
 const res = await listSurfaceSections({ data: { surfaceSlug: slug } });
 setSections(res.sections || []);
 } catch (err: any) {
 toast.error(err.message || "Erro ao carregar seções da vitrine.");
 } finally {
 setIsLoading(false);
 }
 };

 // Atualiza ao trocar de aba
 const handleSelectSurface = (slug: string) => {
 setSelectedSurfaceSlug(slug);
 fetchSections(slug);
 };

 // Carregamento inicial
 useState(() => {
 fetchSections(selectedSurfaceSlug);
 });

 const activeSurface = surfaces.find((s: any) => s.slug === selectedSurfaceSlug) || surfaces[0];

 const handleOpenNewDialog = () => {
 setEditingSection(null);
 setTitle("");
 setSubtitle("");
 setBadgeTag("");
 setType("product_rail");
 setDataSource("all_products");
 setRankingStrategy("random_shuffle");
 setLayoutVariant("rail_standard");
 setItemLimit(12);
 setIsActive(true);
 setIsDialogOpen(true);
 };

 const handleOpenEditDialog = (sec: SurfaceSectionDTO) => {
 setEditingSection(sec);
 setTitle(sec.title);
 setSubtitle(sec.subtitle || "");
 setBadgeTag(sec.badge_tag || "");
 setType(sec.type);
 setDataSource(sec.data_source);
 setRankingStrategy(sec.ranking_strategy);
 setLayoutVariant(sec.layout_variant);
 setItemLimit(sec.item_limit || 12);
 setIsActive(sec.is_active);
 setIsDialogOpen(true);
 };

 const handleSaveSection = async () => {
 if (!title.trim()) {
 toast.error("O título da seção é obrigatório.");
 return;
 }
 if (!activeSurface) return;

 setIsSubmitting(true);
 try {
 await upsertSurfaceSection({
 data: {
 id: editingSection?.id,
 surface_id: activeSurface.id,
 title,
 subtitle: subtitle.trim() || null,
 badge_tag: badgeTag.trim() || null,
 type,
 data_source: dataSource,
 ranking_strategy: rankingStrategy,
 layout_variant: layoutVariant,
 item_limit: itemLimit,
 sort_order: editingSection ? editingSection.sort_order : sections.length + 1,
 is_active: isActive,
 },
 });

 toast.success(editingSection ? "Seção atualizada com sucesso!" : "Nova seção adicionada!");
 setIsDialogOpen(false);
 fetchSections(selectedSurfaceSlug);
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao salvar seção.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleDeleteSection = async (id: string) => {
 if (!confirm("Tem certeza que deseja remover esta seção da vitrine?")) return;
 try {
 await deleteSurfaceSection({ data: { sectionId: id } });
 toast.success("Seção removida!");
 setSections((prev) => prev.filter((s) => s.id !== id));
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao excluir seção.");
 }
 };

 const handleMove = async (index: number, direction: "up" | "down") => {
 if (!activeSurface) return;
 const targetIndex = direction === "up" ? index - 1 : index + 1;
 if (targetIndex < 0 || targetIndex >= sections.length) return;

 const newSections = [...sections];
 const [moved] = newSections.splice(index, 1);
 newSections.splice(targetIndex, 0, moved);

 setSections(newSections);

 try {
 await reorderSurfaceSections({
 data: {
 surfaceId: activeSurface.id,
 sectionIds: newSections.map((s) => s.id),
 },
 });
 toast.success("Ordem atualizada!");
 router.invalidate();
 } catch (err: any) {
 toast.error("Erro ao reordenar seções.");
 fetchSections(selectedSurfaceSlug);
 }
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
 <div>
 <h1 className="text-xl font-bold tracking-tight text-foreground">
 Vitrines & Seções
 </h1>
 </div>

 <Button
 onClick={handleOpenNewDialog}
 size="sm"
 className="h-9 px-4 rounded-xl gap-1.5 font-semibold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
 >
 <Plus className="size-4" />
 <span>Nova Seção</span>
 </Button>
 </div>

 {/* Seletor Horizontal de Superfícies / Mercados */}
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-border/30">
 {surfaces.map((s: any) => {
 const isSelected = selectedSurfaceSlug === s.slug;
 return (
 <button
 key={s.slug}
 onClick={() => handleSelectSurface(s.slug)}
 className={`h-8 px-3 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
 isSelected
 ? "bg-primary text-primary-foreground shadow-2xs font-bold"
 : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border/50"
 }`}
 >
 {s.title}
 </button>
 );
 })}
 </div>

 {/* Lista de Seções da Superfície Ativa */}
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
 Superfície: <strong className="text-foreground">{activeSurface?.title}</strong>
 </span>
 <Badge variant="outline" className="text-[10px] uppercase font-mono">
 {sections.length} {sections.length === 1 ? "seção ativa" : "seções ativas"}
 </Badge>
 </div>
 </div>

 {isLoading ? (
 <div className="p-12 text-center text-xs text-muted-foreground">Carregando seções da vitrine...</div>
 ) : sections.length === 0 ? (
 <div className="p-12 border border-dashed border-border rounded-2xl text-center space-y-3 bg-card/30">
 <Layout className="size-8 text-muted-foreground/40 mx-auto" />
 <p className="text-xs text-muted-foreground font-medium">Nenhuma seção configurada para esta vitrine.</p>
 <Button onClick={handleOpenNewDialog} size="sm" variant="outline" className="h-8 rounded-xl text-xs font-bold">
 Criar Primeira Seção
 </Button>
 </div>
 ) : (
 <div className="space-y-2.5">
 {sections.map((sec, index) => {
 const typeConfig = SECTION_TYPE_OPTIONS.find((t) => t.id === sec.type);
 const rankingConfig = RANKING_OPTIONS.find((r) => r.id === sec.ranking_strategy);
 const Icon = typeConfig?.icon || Tag;

 return (
 <div
 key={sec.id}
 className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card ${
 sec.is_active ? "border-border/80 shadow-2xs" : "border-border/40 opacity-60 bg-muted/20"
 }`}
 >
 <div className="flex items-start sm:items-center gap-3 min-w-0">
 <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
 <Icon className="size-5" />
 </div>

 <div className="min-w-0 space-y-1">
 <div className="flex items-center gap-2 flex-wrap">
 <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">
 {sec.title}
 </h3>
 {sec.badge_tag && (
 <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
 {sec.badge_tag}
 </span>
 )}
 {!sec.is_active && (
 <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-muted text-muted-foreground">
 Inativa
 </span>
 )}
 </div>

 <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
 <span>{typeConfig?.label}</span>
 <span>•</span>
 <span className="font-semibold text-foreground/80">{rankingConfig?.label}</span>
 <span>•</span>
 <span>Limite: {sec.item_limit} itens</span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
 {/* Botões de Reordenação */}
 <Button
 size="icon"
 variant="ghost"
 disabled={index === 0}
 onClick={() => handleMove(index, "up")}
 className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
 title="Mover para cima"
 >
 <ArrowUp className="size-3.5" />
 </Button>
 <Button
 size="icon"
 variant="ghost"
 disabled={index === sections.length - 1}
 onClick={() => handleMove(index, "down")}
 className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-30"
 title="Mover para baixo"
 >
 <ArrowDown className="size-3.5" />
 </Button>

 <Button
 size="icon"
 variant="outline"
 onClick={() => handleOpenEditDialog(sec)}
 className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer border-border/60"
 title="Editar Seção"
 >
 <Pencil className="size-3.5" />
 </Button>

 <Button
 size="icon"
 variant="ghost"
 onClick={() => handleDeleteSection(sec.id)}
 className="size-8 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
 title="Excluir Seção"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>

 {/* Dialog de Criação / Edição de Seção */}
 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
 <DialogContent className="sm:max-w-md sm:w-full sm:rounded-2xl">
 <DialogHeader>
 <DialogTitle className="text-base font-bold">
 {editingSection ? "Editar Seção da Vitrine" : "Nova Seção Modular"}
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Configure o tipo de grade, a fonte de dados e a estratégia de randomização.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto no-scrollbar pr-1">
 {/* Live Truthful Preview */}
 <div className="p-3 bg-muted/30 rounded-xl border border-border/70 space-y-2">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
 <Eye className="size-3.5 text-primary" />
 Pré-visualização da Seção
 </span>

 {type === "banner_single_21_9" ? (
 <div className="aspect-21/9 w-full rounded-xl bg-card border border-border/80 flex flex-col justify-end p-2.5 relative overflow-hidden shadow-xs">
 <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
 <span className="relative z-10 text-[9px] font-mono font-bold text-primary uppercase">BANNER 21:9</span>
 <p className="relative z-10 text-xs font-bold text-white truncate">{title || "Banner Panorâmico"}</p>
 </div>
 ) : type === "banner_duo_16_9" ? (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 <div className="aspect-16/9 rounded-xl bg-card border border-border/80 flex items-end p-2 relative overflow-hidden">
 <span className="text-[9px] font-bold text-white z-10">Banner 1 (16:9)</span>
 </div>
 <div className="aspect-16/9 rounded-xl bg-card border border-border/80 flex items-end p-2 relative overflow-hidden">
 <span className="text-[9px] font-bold text-white z-10">Banner 2 (16:9)</span>
 </div>
 </div>
 ) : type === "custom_buttons_rail" ? (
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
 <div className="px-3 py-1.5 rounded-xl bg-card border border-border/80 text-[11px] font-bold flex items-center gap-1.5 shadow-xs">
 <Layers className="size-3 text-primary" />
 <span>{title || "Atalho Rápido"}</span>
 </div>
 <div className="px-3 py-1.5 rounded-xl bg-card border border-border/80 text-[11px] font-bold flex items-center gap-1.5 shadow-xs opacity-60">
 <span>Ofertas</span>
 </div>
 </div>
 ) : type === "store_rail" ? (
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
 <div className="w-28 p-2 rounded-xl bg-card border border-border/80 space-y-1">
 <div className="size-6 rounded-full bg-muted" />
 <div className="h-2 w-16 bg-foreground/20 rounded" />
 <div className="h-1.5 w-10 bg-muted-foreground/30 rounded" />
 </div>
 <div className="w-28 p-2 rounded-xl bg-card border border-border/80 space-y-1 opacity-50">
 <div className="size-6 rounded-full bg-muted" />
 <div className="h-2 w-16 bg-foreground/20 rounded" />
 </div>
 </div>
 ) : (
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
 <div className="w-24 p-2 rounded-xl bg-card border border-border/80 space-y-1.5 shadow-xs">
 <div className="aspect-square w-full rounded-lg bg-muted" />
 <div className="h-2 w-16 bg-foreground/20 rounded" />
 <div className="h-2 w-10 bg-primary/40 rounded font-bold" />
 </div>
 <div className="w-24 p-2 rounded-xl bg-card border border-border/80 space-y-1.5 shadow-xs opacity-60">
 <div className="aspect-square w-full rounded-lg bg-muted" />
 <div className="h-2 w-16 bg-foreground/20 rounded" />
 </div>
 </div>
 )}
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Título da Seção *</Label>
 <Input
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 placeholder="Ex: Ofertas Relâmpago, Mais Pedidos, Banners Especiais..."
 className="h-9 text-xs rounded-xl"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Subtítulo Opcional</Label>
 <Input
 value={subtitle}
 onChange={(e) => setSubtitle(e.target.value)}
 placeholder="Ex: Descontos especiais com entrega rápida"
 className="h-9 text-xs rounded-xl"
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Tipo de Seção</Label>
 <Select
 value={type}
 onValueChange={(v: any) => {
 setType(v);
 if (v === "banner_single_21_9") {
 setLayoutVariant("banner_21_9");
 setDataSource("banners");
 } else if (v === "banner_duo_16_9") {
 setLayoutVariant("banner_16_9_duo");
 setDataSource("banners");
 } else if (v === "custom_buttons_rail") {
 setLayoutVariant("buttons_rail");
 setDataSource("custom_buttons");
 } else if (v === "store_rail") {
 setLayoutVariant("rail_compact");
 setDataSource("stores");
 }
 }}
 >
 <SelectTrigger className="h-9 text-xs rounded-xl">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {SECTION_TYPE_OPTIONS.map((opt) => (
 <SelectItem key={opt.id} value={opt.id} className="text-xs">
 {opt.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Fonte de Dados</Label>
 <Select value={dataSource} onValueChange={(v: any) => setDataSource(v)}>
 <SelectTrigger className="h-9 text-xs rounded-xl">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {DATA_SOURCE_OPTIONS.map((opt) => (
 <SelectItem key={opt.id} value={opt.id} className="text-xs">
 {opt.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Estratégia de Ranqueamento / Randomização</Label>
 <Select value={rankingStrategy} onValueChange={(v: any) => setRankingStrategy(v)}>
 <SelectTrigger className="h-9 text-xs rounded-xl">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {RANKING_OPTIONS.map((opt) => (
 <SelectItem key={opt.id} value={opt.id} className="text-xs">
 {opt.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Layout / Grid</Label>
 <Select value={layoutVariant} onValueChange={(v: any) => setLayoutVariant(v)}>
 <SelectTrigger className="h-9 text-xs rounded-xl">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {LAYOUT_OPTIONS.map((opt) => (
 <SelectItem key={opt.id} value={opt.id} className="text-xs">
 {opt.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Limite de Itens</Label>
 <Input
 type="number"
 min={1}
 max={40}
 value={itemLimit}
 onChange={(e) => setItemLimit(Number(e.target.value))}
 className="h-9 text-xs rounded-xl"
 />
 </div>
 </div>

 <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border/60">
 <div>
 <span className="text-xs font-bold text-foreground block">Seção Ativa</span>
 <span className="text-[10px] text-muted-foreground">Exibir na vitrine pública imediatamente</span>
 </div>
 <Switch checked={isActive} onCheckedChange={setIsActive} />
 </div>
 </div>

 <DialogFooter>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setIsDialogOpen(false)}
 className="h-9 rounded-xl text-xs"
 >
 Cancelar
 </Button>
 <Button
 size="sm"
 disabled={isSubmitting}
 onClick={handleSaveSection}
 className="h-9 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
 >
 {isSubmitting ? "Salvando..." : "Salvar Seção"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
