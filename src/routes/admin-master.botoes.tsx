import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { z } from "zod";
import { Plus, Trash2, Pencil, Sliders, Image as ImageIcon, Eye, SlidersHorizontal, Tag, CheckCircle2, LayoutGrid, Layers, ArrowUpRight, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MediaUploader } from "@/components/ui/media-uploader";
import { SheetPage } from "@/components/ui/sheet-page";
import {
 listHotpages,
 createHotpage,
 updateHotpage,
 deleteHotpage,
 syncDefaultHotpages,
 type HotpageDTO,
 type HotpageModule,
 type HotpageTemplateType,
} from "@/services/hotpage.functions";
import { DestinationPicker } from "@/components/ui/destination-picker";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DynamicMediaChip } from "@/components/commerce/dynamic-media-chip";

type MainSectionTab = "hero_module" | "category_hub" | "editorial_card";

const MODULE_TABS: Array<{ id: HotpageModule; label: string }> = [
 { id: "all", label: "Todas as Páginas" },
 { id: "home", label: "Início (Home)" },
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
 { id: "casa", label: "Casa" },
 { id: "beleza", label: "Beleza" },
 { id: "limpeza", label: "Limpeza" },
 { id: "livros", label: "Livros" },
 { id: "feed", label: "Feed" },
 { id: "noticias", label: "Notícias" },
 { id: "eventos", label: "Eventos" },
 { id: "agenda", label: "Agenda" },
 { id: "afiliados", label: "Afiliados" },
 { id: "turismo", label: "Turismo" },
 { id: "empregos", label: "Empregos" },
 { id: "classificados", label: "Classificados" },
 { id: "diretorio", label: "Places (Lista Telefônica)" },
 { id: "mobilidade", label: "Mobilidade" },
 { id: "ofertas", label: "Ofertas Relâmpago" },
];

export const Route = createFileRoute("/admin-master/botoes")({
 validateSearch: z.object({
 tab: z.enum(["hero_module", "category_hub", "editorial_card"]).optional(),
 module: z.string().optional(),
 }),
 head: () => ({ meta: [{ title: "Cards Herói, Chips & Hotpages | Admin Master" }] }),
 loader: async () => {
   try {
 const hotpages = await listHotpages({ data: { module: "all" } }).catch(() => []);
 return { hotpages };
   } catch (err) {
     console.error("[loader:admin-master.botoes] Unhandled loader error:", err);
     return { hotpages: null };
   }
 },
 component: AdminMasterHotpagesPage,
});

function AdminMasterHotpagesPage() {
 const { hotpages: initialHotpages } = ((Route.useLoaderData?.() as any) || {});
 const search = Route.useSearch();
 const router = useRouter();
 const [hotpages, setHotpages] = useState<HotpageDTO[]>(initialHotpages || []);
 
 // Aba principal de tipo arquitetural
 const [activeMainTab, setActiveMainTab] = useState<MainSectionTab>(
 (search.tab as MainSectionTab) || "hero_module"
 );

 // Sub-filtro de módulo
 const [selectedModuleTab, setSelectedModuleTab] = useState<HotpageModule>(
 (search.module as HotpageModule) || "all"
 );

 const [isSheetOpen, setIsSheetOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);

 // Form States
 const [title, setTitle] = useState("");
 const [slug, setSlug] = useState("");
 const [targetRoute, setTargetRoute] = useState("");
 const [badgeLabel, setBadgeLabel] = useState("");
 const [heroStatBadge, setHeroStatBadge] = useState("");
 const [heroSecondaryBadge, setHeroSecondaryBadge] = useState("");
 const [description, setDescription] = useState("");
 const [coverImageUrl, setCoverImageUrl] = useState("");
 const [customIconUrl, setCustomIconUrl] = useState("");
 const [emoji, setEmoji] = useState("");
 const [templateType, setTemplateType] = useState<HotpageTemplateType>("hero_module");
 const [module, setModule] = useState<HotpageModule>("home");
 const [sortOrder, setSortOrder] = useState(0);
 const [showTitle, setShowTitle] = useState(true);
 const [showBadge, setShowBadge] = useState(false);
 const [showOverlay, setShowOverlay] = useState(false);
 const [showShadow, setShowShadow] = useState(false);
 const [bgOverlayOpacity, setBgOverlayOpacity] = useState(30);
 const [bgColor, setBgColor] = useState("#000000");
 const [textColor, setTextColor] = useState("");
 const [isActive, setIsActive] = useState(true);

 // Filtra hotpages de acordo com a aba ativa
 const filteredItems = useMemo(() => {
 return hotpages.filter((item) => {
 let matchesType = false;
 if (activeMainTab === "hero_module") {
 matchesType =
 item.template_type === "hero_module" ||
 (item.module === "home" &&
 item.template_type !== "category_hub" &&
 item.template_type !== "editorial_card");
 } else if (activeMainTab === "category_hub") {
 matchesType = item.template_type === "category_hub";
 } else {
 matchesType =
 item.template_type === "editorial_card" ||
 (item.template_type !== "hero_module" && item.template_type !== "category_hub");
 }

 const matchesModule =
 selectedModuleTab === "all" || item.module === selectedModuleTab;

      return matchesType && (activeMainTab === "hero_module" ? true : matchesModule);
 });
 }, [hotpages, activeMainTab, selectedModuleTab]);

 const resetForm = (forTab: MainSectionTab = activeMainTab) => {
 setEditingId(null);
 setTitle("");
 setSlug("");
 setTargetRoute("");
 setBadgeLabel("");
 setHeroStatBadge("");
 setHeroSecondaryBadge("");
 setDescription("");
 setCoverImageUrl("");
 setCustomIconUrl("");
 setEmoji("");
 setTemplateType(forTab);
 setModule(forTab === "hero_module" ? "home" : selectedModuleTab === "all" ? "home" : selectedModuleTab);
 setSortOrder(0);
 // Defaults por aba — Zero sombra e overlay por padrão
 setShowShadow(false);
 setShowOverlay(false);
 setBgOverlayOpacity(30);
 setBgColor("#000000");
 setTextColor("");
 if (forTab === "hero_module") {
 setShowTitle(true);
 setShowBadge(false);
 } else if (forTab === "category_hub") {
 setShowTitle(true);
 setShowBadge(false);
 } else {
 setShowTitle(true);
 setShowBadge(true);
 }
 setIsActive(true);
 };

 const handleOpenCreate = () => {
 resetForm(activeMainTab);
 setIsSheetOpen(true);
 };

 const handleOpenEdit = (item: HotpageDTO) => {
 setEditingId(item.id);
 setTitle(item.title);
 setSlug(item.slug);
 setTargetRoute(item.target_route || "");
 setBadgeLabel(item.badge_label || "");
 setHeroStatBadge(item.hero_stat_badge || "");
 setHeroSecondaryBadge(item.hero_secondary_badge || "");
 setDescription(item.description || "");
 setCoverImageUrl(item.cover_image_url || (item as any).bg_media_url || "");
 setCustomIconUrl(item.custom_icon_url || item.icon_url || "");
 setEmoji((item as any).emoji || "");
 setTemplateType(item.template_type || activeMainTab);
 setModule(item.module || "home");
 setSortOrder(item.sort_order || 0);
 setShowTitle(item.show_title !== false);
 setShowBadge(item.show_badge === true);
 setShowOverlay(item.show_overlay === true);
 setShowShadow(item.show_shadow === true);
 setBgOverlayOpacity(typeof item.bg_overlay_opacity === "number" ? item.bg_overlay_opacity : 30);
 setBgColor(item.bg_color || "#000000");
 setTextColor((item as any).text_color || "");
 setIsActive(item.is_active !== false);
 setIsSheetOpen(true);
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim() || !slug.trim()) {
 toast.error("Preencha o título e o slug.");
 return;
 }

 setIsSubmitting(true);
 try {
 if (editingId) {
 const updated = await updateHotpage({
 data: {
 id: editingId,
 title,
 slug,
 target_route: targetRoute || (templateType === "category_hub" ? `/${slug.replace(/^chip-/, "")}` : `/destaques/${slug}`),
 template_type: templateType,
 badge_label: badgeLabel || null,
 hero_stat_badge: heroStatBadge || null,
 hero_secondary_badge: heroSecondaryBadge || null,
 description: description || null,
 cover_image_url: coverImageUrl || null,
 custom_icon_url: customIconUrl || null,
 icon_url: customIconUrl || null,
 module,
 sort_order: Number(sortOrder) || 0,
 show_title: showTitle,
 show_badge: showBadge,
 show_overlay: showOverlay,
 show_shadow: showShadow,
 bg_overlay_opacity: bgOverlayOpacity,
 bg_color: bgColor || null,
 text_color: textColor || null,
 is_active: isActive,
 },
 });

 setHotpages((prev) =>
 prev.map((h) =>
 h.id === editingId
 ? {
 ...h,
 ...updated,
 title,
 slug,
 template_type: templateType,
 target_route: targetRoute,
 badge_label: badgeLabel,
 hero_stat_badge: heroStatBadge,
 hero_secondary_badge: heroSecondaryBadge,
 cover_image_url: coverImageUrl,
 custom_icon_url: customIconUrl,
 show_title: showTitle,
 show_badge: showBadge,
 show_overlay: showOverlay,
 show_shadow: showShadow,
 bg_overlay_opacity: bgOverlayOpacity,
 bg_color: bgColor,
 is_active: isActive,
 }
 : h
 )
 );
 toast.success("Item atualizado com sucesso!");
 } else {
 const created = await createHotpage({
 data: {
 title,
 slug,
 target_route: targetRoute || (templateType === "category_hub" ? `/${slug.replace(/^chip-/, "")}` : `/destaques/${slug}`),
 template_type: templateType,
 badge_label: badgeLabel || undefined,
 hero_stat_badge: heroStatBadge || undefined,
 hero_secondary_badge: heroSecondaryBadge || undefined,
 description: description || undefined,
 cover_image_url: coverImageUrl || undefined,
 custom_icon_url: customIconUrl || undefined,
 icon_url: customIconUrl || undefined,
 module,
 sort_order: Number(sortOrder) || 0,
 show_title: showTitle,
 show_badge: showBadge,
 show_overlay: showOverlay,
 show_shadow: showShadow,
 bg_overlay_opacity: bgOverlayOpacity,
 bg_color: bgColor || undefined,
 text_color: textColor || undefined,
 },
 });

 setHotpages((prev) => [created, ...prev]);
 toast.success("Novo item cadastrado!");
 }

 setIsSheetOpen(false);
 resetForm();
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao salvar item.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleDelete = async (id: string) => {
 if (!confirm("Tem certeza que deseja remover este item?")) return;
 try {
 await deleteHotpage({ data: { id } });
 setHotpages((prev) => prev.filter((h) => h.id !== id));
 toast.success("Item excluído com sucesso.");
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao excluir.");
 }
 };

 const handleSyncDefaults = async () => {
 setIsSubmitting(true);
 try {
 const res = await syncDefaultHotpages();
 const updated = await listHotpages({ data: { module: "all" } });
 setHotpages(updated);
 toast.success(
 res.insertedCount > 0
 ? `${res.insertedCount} itens padrão sincronizados com sucesso!`
 : "Padrões oficiais restaurados e sincronizados com sucesso!"
 );
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao sincronizar padrões.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 text-foreground font-sans">
 {/* ── Header Principal com Botão de Sincronização Canônica ── */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
 <div>
 <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
 <span>Hotpages & Destaques</span>
 <Badge variant="outline" className="text-xs">
 {filteredItems.length}
 </Badge>
 </h1>
 </div>

 <div className="flex items-center gap-2">
 <Button
 onClick={handleSyncDefaults}
 disabled={isSubmitting}
 size="sm"
 variant="outline"
 className="h-11 px-4 rounded-xl font-semibold text-xs gap-2 shrink-0 border-border/80 bg-card hover:bg-muted shadow-xs"
 >
 <Sliders className="size-3.5 text-primary" />
 <span>Restaurar Padrões</span>
 </Button>

 <Button
 onClick={handleOpenCreate}
 size="sm"
 className="h-11 px-4 rounded-xl font-semibold text-xs gap-2 bg-primary text-primary-foreground shrink-0 shadow-xs"
 >
 <Plus className="size-3.5" />
 <span>
 {activeMainTab === "hero_module"
 ? "Novo Card"
 : activeMainTab === "category_hub"
 ? "Novo Botão"
 : "Nova Hotpage"}
 </span>
 </Button>
 </div>
 </div>

 {/* ── 3 Abas Principais de Segregação Arquitetural ── */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-muted/40 border border-border/60">
 <button
 onClick={() => setActiveMainTab("hero_module")}
 className={cn(
 "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all",
 activeMainTab === "hero_module"
 ? "bg-background text-foreground shadow-sm border border-border/60"
 : "text-muted-foreground hover:text-foreground hover:bg-background/50"
 )}
 >
 <LayoutGrid className="size-4 text-primary" />
 <span>1. Cards Herói do Topo (Módulos 16:9)</span>
 </button>

 <button
 onClick={() => setActiveMainTab("category_hub")}
 className={cn(
 "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all",
 activeMainTab === "category_hub"
 ? "bg-background text-foreground shadow-sm border border-border/60"
 : "text-muted-foreground hover:text-foreground hover:bg-background/50"
 )}
 >
 <Tag className="size-4 text-primary" />
 <span>2. Botões de Supercategorias (Chips)</span>
 </button>

 <button
 onClick={() => setActiveMainTab("editorial_card")}
 className={cn(
 "flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all",
 activeMainTab === "editorial_card"
 ? "bg-background text-foreground shadow-sm border border-border/60"
 : "text-muted-foreground hover:text-foreground hover:bg-background/50"
 )}
 >
 <Layers className="size-4 text-primary" />
 <span>3. Coleções & Hotpages Editoriais</span>
 </button>
 </div>

 {/* ── Informações Explicativas da Aba Ativa ── */}
 <div className="p-3.5 rounded-2xl bg-card border border-border/60 text-xs text-muted-foreground flex items-center justify-between">
 <div>
 {activeMainTab === "hero_module" && (
 <p>
 <strong className="text-foreground">Cards Herói do Topo (Exclusivo da Home):</strong> Cards 16:9
 panorâmicos representando os 8 grandes módulos do Super App (Classificados, Mercado, Gastronomia, Empregos, etc.).
 São <strong>100% limpos</strong> de textos/badges HTML por padrão — a arte gráfica enviada já contém a identidade visual.
 </p>
 )}
 {activeMainTab === "category_hub" && (
 <p>
 <strong className="text-foreground">Botões de Supercategorias (Continuação):</strong> Fileira de botões (chips)
 logo abaixo dos cards grandes contendo as categorias adicionais (Farmácia, Bebidas, Açougue, Eletrônicos, Moda, Casa, Pet, etc.).
 Permite ícones PNG transparentes 1:1 e rotas diretas.
 </p>
 )}
 {activeMainTab === "editorial_card" && (
 <p>
 <strong className="text-foreground">Coleções & Hotpages Editoriais (Trilho de Hotpages):</strong> Seção temático-sazonal
 posicionada abaixo dos Banners e Stories (ex: "Ofertas Relâmpago", "Almoço Rápido", "Mercado em 15 Min").
 </p>
 )}
 </div>
 </div>

 {/* ── Sub-Filtro por Módulo (Visível principalmente na aba de Hotpages Editoriais) ── */}
        {(activeMainTab === "editorial_card" || activeMainTab === "category_hub") && (
 <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 scrollbar-hide border-b border-border/40">
 {MODULE_TABS.map((tab) => {
 const isSelected = selectedModuleTab === tab.id;
 const count =
 tab.id === "all"
              ? hotpages.filter((h) => h.template_type === activeMainTab).length
              : hotpages.filter((h) => h.template_type === activeMainTab && h.module === tab.id).length;

 return (
 <button
 key={tab.id}
 onClick={() => setSelectedModuleTab(tab.id)}
 className={cn(
 "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5",
 isSelected
 ? "bg-foreground text-background shadow-xs font-bold"
 : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
 )}
 >
 <span>{tab.label}</span>
 <span
 className={cn(
 "text-[11px] px-2 py-0.5 rounded-md font-medium",
 isSelected
 ? "bg-background/20 text-background"
 : "bg-background/80 text-muted-foreground"
 )}
 >
 {count}
 </span>
 </button>
 );
 })}
 </div>
 )}

 {/* ── Grid de Renderização por Tipo de Item ── */}
 {filteredItems.length === 0 ? (
 <div className="p-12 text-center border border-dashed border-border/80 rounded-2xl space-y-3 bg-card">
 <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
 <ImageIcon className="size-6" />
 </div>
 <h3 className="text-sm font-bold text-foreground">Nenhum item nesta seção</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Clique em "Restaurar / Sincronizar Padrões" para carregar os módulos oficiais ou cadastre manualmente.
 </p>
 <div className="flex justify-center gap-2 pt-2">
 <Button
 onClick={handleSyncDefaults}
 size="sm"
 variant="outline"
 className="rounded-xl text-xs font-bold gap-1.5"
 >
 <Sliders className="size-3.5 text-primary" />
 <span>Sincronizar Padrões</span>
 </Button>
 <Button
 onClick={handleOpenCreate}
 size="sm"
 className="rounded-xl text-xs font-bold gap-1.5"
 >
 <Plus className="size-3.5" />
 <span>Cadastrar Novo</span>
 </Button>
 </div>
 </div>
 ) : activeMainTab === "hero_module" ? (
 /* ── GRID ABA 1: CARDS HERÓI 16:9 LIMPOS ── */
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
 {filteredItems.map((item) => (
 <div
 key={item.id}
 className="group relative flex flex-col justify-end aspect-16/9 rounded-2xl sm:rounded-2xl border border-border/80 bg-card overflow-hidden transition-all duration-300 shadow-xs hover:border-foreground/30 hover:shadow-xs"
 >
 {item.cover_image_url ? (
 <img
 src={item.cover_image_url}
 alt={item.title}
 className="absolute inset-0 size-full object-cover group-hover:scale-102 transition-transform duration-500"
 loading="lazy"
 />
 ) : (
 <div className="absolute inset-0 size-full bg-muted flex items-center justify-center text-muted-foreground/40 font-bold text-xs">
 {item.title}
 </div>
 )}

 {/* Se explicitamente habilitado título */}
 {item.show_title && (
 <div className="relative z-10 p-3 bg-linear-to-t from-black/80 via-black/20 to-transparent">
 <p className="text-xs font-bold text-white leading-tight truncate">
 {item.title}
 </p>
 </div>
 )}

 {/* Rota Tag */}
 <div className="absolute bottom-2 left-2 z-20">
 <span className="text-[10px] font-mono font-bold bg-black/75 text-white/90 px-2 py-0.5 rounded-lg border border-white/10 backdrop-blur-xs">
 {item.target_route || `/${item.slug.replace(/^home-/, "")}`}
 </span>
 </div>

 {/* Ações de Hover */}
 <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <div className="bg-background/90 backdrop-blur-md p-0.5 rounded-xl border border-border/80 flex items-center gap-0.5 shadow-sm">
 <Button
 size="sm"
 variant="ghost"
 className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
 onClick={() => handleOpenEdit(item)}
 title="Editar"
 >
 <Pencil className="size-3.5" />
 </Button>
 <Button
 size="sm"
 variant="ghost"
 className="size-7 p-0 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
 onClick={() => handleDelete(item.id)}
 title="Excluir"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 </div>
 ))}
 </div>
 ) : activeMainTab === "category_hub" ? (
 /* ── GRID ABA 2: BOTÕES / CHIPS DE SUPERCATEGORIAS ── */
 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
 {filteredItems.map((item) => (
 <div
 key={item.id}
 className="group relative p-3 rounded-2xl border border-border/80 bg-card hover:border-foreground/30 transition-all flex items-center justify-between gap-2 shadow-xs"
 >
 <div className="flex items-center gap-2.5 min-w-0">
 <div className="size-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 border border-border/40 overflow-hidden">
 {item.custom_icon_url ? (
 <img
 src={item.custom_icon_url}
 alt={item.title}
 className="size-6 object-contain"
 />
 ) : (
 <span className="text-lg font-emoji">{(item as any).emoji || "🏷️"}</span>
 )}
 </div>
 <div className="min-w-0">
 <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
 <p className="text-[10px] font-mono text-muted-foreground truncate">
 {item.target_route || `/${item.slug.replace(/^chip-/, "")}`}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-1 shrink-0">
 <Button
 size="sm"
 variant="ghost"
 className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
 onClick={() => handleOpenEdit(item)}
 >
 <Pencil className="size-3.5" />
 </Button>
 <Button
 size="sm"
 variant="ghost"
 className="size-7 p-0 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
 onClick={() => handleDelete(item.id)}
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 ) : (
 /* ── GRID ABA 3: COLEÇÕES & HOTPAGES EDITORIAIS ── */
 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
 {filteredItems.map((item) => {
 const showTitleOnCard = item.show_title !== false;
 const showBadgeOnCard = item.show_badge !== false && (!!item.badge_label || !!item.hero_stat_badge);
 const showOverlayOnCard = item.show_overlay === true;
 const showShadowOnCard = item.show_shadow === true;
 const overlayColor = item.bg_color || "#000000";
 const overlayOpacity = typeof item.bg_overlay_opacity === "number" ? item.bg_overlay_opacity : 30;

 return (
 <div
 key={item.id}
 className={`group relative flex flex-col justify-end aspect-16/9 rounded-2xl sm:rounded-2xl border border-border/80 bg-card overflow-hidden transition-all duration-300 hover:border-foreground/30 ${showShadowOnCard ? "shadow-xs hover:shadow-xs" : "shadow-xs"}`}
 >
 {item.cover_image_url ? (
 <img
 src={item.cover_image_url}
 alt={item.title}
 className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500"
 loading="lazy"
 />
 ) : (
 <div className="absolute inset-0 size-full bg-muted flex items-center justify-center text-muted-foreground/40">
 <ImageIcon className="size-8" />
 </div>
 )}

 {showOverlayOnCard && (
 <div
 className="absolute inset-0 pointer-events-none"
 style={{
 background: `linear-gradient(to top, ${overlayColor}${Math.round(overlayOpacity * 2.55).toString(16).padStart(2, "0")} 0%, transparent 60%)`,
 }}
 />
 )}

 <div className="relative z-10 p-3 space-y-1.5 text-left w-full">
 {showBadgeOnCard && (
 <div className="flex items-center gap-1.5 flex-wrap">
 {item.badge_label && (
 <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-white/25 backdrop-blur-md text-white border border-white/20">
 {item.badge_label}
 </span>
 )}
 {item.hero_stat_badge && (
 <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider bg-primary text-primary-foreground border border-primary/30">
 {item.hero_stat_badge}
 </span>
 )}
 </div>
 )}

 {showTitleOnCard && item.title && (
 <h3 className="text-xs sm:text-sm font-semibold text-white leading-tight line-clamp-2">
 {item.title}
 </h3>
 )}
 </div>

 <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <div className="bg-background/90 backdrop-blur-md p-0.5 rounded-xl border border-border/80 flex items-center gap-0.5 shadow-sm">
 <Button
 size="sm"
 variant="ghost"
 className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
 onClick={() => handleOpenEdit(item)}
 title="Editar"
 >
 <Pencil className="size-3.5" />
 </Button>
 <Button
 size="sm"
 variant="ghost"
 className="size-7 p-0 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
 onClick={() => handleDelete(item.id)}
 title="Excluir"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* ── Sheet Lateral Adaptativo para Criação / Edição ── */}
 <SheetPage
 open={isSheetOpen}
 onOpenChange={setIsSheetOpen}
 title={
 editingId
 ? `Editar ${
 templateType === "hero_module"
 ? "Card de Módulo"
 : templateType === "category_hub"
 ? "Botão de Categoria"
 : "Hotpage Editorial"
 }`
 : `Novo ${
 templateType === "hero_module"
 ? "Card de Módulo 16:9"
 : templateType === "category_hub"
 ? "Botão de Categoria"
 : "Hotpage Editorial"
 }`
 }
 description="Configure mídias, ícones transparentes, rotas de destino e visibilidade na vitrine."
 >
 <form onSubmit={handleSubmit} className="space-y-4 p-1 max-h-[85vh] overflow-y-auto no-scrollbar pr-1">
 {/* Pré-visualização ao Vivo */}
 <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 space-y-2">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
 <Eye className="size-3.5 text-primary" />
 Pré-visualização em Tempo Real
 </span>

 {templateType === "category_hub" ? (
 <div className="p-3 rounded-xl bg-card border border-border/80 flex items-center gap-3">
 <div className="size-11 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 border border-border/40 overflow-hidden">
 {customIconUrl ? (
 <img src={customIconUrl} alt="Preview" className="size-7 object-contain" />
 ) : (
 <span className="text-xl font-emoji">{emoji || "🏷️"}</span>
 )}
 </div>
 <div>
 <p className="text-xs font-bold text-foreground">{title || "Nome da Categoria"}</p>
 <p className="text-[10px] font-mono text-muted-foreground">{targetRoute || `/${slug || "rota"}`}</p>
 </div>
 </div>
 ) : (
 <div className={`relative aspect-16/9 rounded-xl overflow-hidden bg-card border border-border/80 ${showShadow ? "shadow-xs" : "shadow-xs"}`}>
 {coverImageUrl ? (
 <img src={coverImageUrl} alt="Preview Capa" className="size-full object-cover" />
 ) : (
 <div className="size-full flex items-center justify-center text-muted-foreground text-xs font-semibold">
 Mídia 16:9 (Alta Definição)
 </div>
 )}

 {showOverlay && (
 <div
 className="absolute inset-0 pointer-events-none"
 style={{
 background: `linear-gradient(to top, ${bgColor || "#000000"}${Math.round(bgOverlayOpacity * 2.55).toString(16).padStart(2, "0")} 0%, transparent 60%)`,
 }}
 />
 )}

 {showBadge && (badgeLabel || heroStatBadge) && (
 <div className="absolute top-2 right-2 flex items-center gap-1">
 {badgeLabel && (
 <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-white/25 backdrop-blur-md text-white px-2 py-0.5 rounded-md border border-white/20 shadow-xs">
 {badgeLabel}
 </span>
 )}
 {heroStatBadge && (
 <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-md border border-primary/30 shadow-xs">
 {heroStatBadge}
 </span>
 )}
 </div>
 )}

 {showTitle && title && (
 <div className="absolute bottom-2.5 left-3 right-3 text-left">
 <p className="text-sm font-bold text-white leading-tight truncate">{title}</p>
 </div>
 )}
 </div>
 )}
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Tipo de Componente *</Label>
 <Select
 value={templateType}
 onValueChange={(val: any) => {
 setTemplateType(val);
 if (val === "hero_module") {
 setShowTitle(false);
 setShowBadge(false);
 setShowOverlay(false);
 }
 }}
 >
 <SelectTrigger className="h-10 rounded-xl bg-card text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="rounded-xl">
 <SelectItem value="hero_module" className="text-xs">
 Card Herói do Topo (Módulo 16:9 Limpo)
 </SelectItem>
 <SelectItem value="category_hub" className="text-xs">
 Botão de Supercategoria (Chip de Continuação)
 </SelectItem>
 <SelectItem value="editorial_card" className="text-xs">
 Coleção & Hotpage Editorial
 </SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Título / Rótulo *</Label>
 <Input
 value={title}
 onChange={(e) => {
 const val = e.target.value;
 setTitle(val);
 if (!editingId && !slug) {
 setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
 }
 }}
 placeholder="Ex: Classificados, Supermercado, Farmácia..."
 className="h-10 rounded-xl bg-card text-xs"
 required
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Slug Identificador (URL) *</Label>
 <Input
 value={slug}
 onChange={(e) => setSlug(e.target.value)}
 placeholder="classificados"
 className="h-10 rounded-xl bg-card text-xs font-mono"
 required
 />
 </div>

 {templateType !== "category_hub" && (
 <div className="space-y-1.5 pt-1">
 <Label className="text-xs font-bold flex items-center justify-between">
 <span>Foto de Capa do Card (16:9) *</span>
 <span className="text-[10px] text-primary font-bold">16:9 Panorâmica</span>
 </Label>
 <MediaUploader
 value={coverImageUrl ? [coverImageUrl] : []}
 onChange={(urls) => setCoverImageUrl(urls[0] || "")}
 bucket="cms-media"
 folder="hotpages"
 aspect={16 / 9}
 lockAspect={true}
 cropShape="rect"
 accept="image"
 maxFiles={1}
 />
 </div>
 )}

 {templateType === "category_hub" && (
 <>
 <div className="space-y-1.5 pt-1">
 <Label className="text-xs font-bold flex items-center justify-between">
 <span>Ícone Personalizado Transparente (1:1)</span>
 <span className="text-[10px] text-muted-foreground">PNG Transparente / SVG</span>
 </Label>
 <MediaUploader
 value={customIconUrl ? [customIconUrl] : []}
 onChange={(urls) => setCustomIconUrl(urls[0] || "")}
 bucket="cms-media"
 folder="hotpages/icons"
 aspect={1 / 1}
 lockAspect={true}
 cropShape="rect"
 accept="image"
 maxFiles={1}
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Emoji de Fallback</Label>
 <Input
 value={emoji}
 onChange={(e) => setEmoji(e.target.value)}
 placeholder="Ex: 💊, 🍕, 🥦, 📱"
 className="h-10 rounded-xl bg-card text-xs"
 />
 </div>
 </>
 )}

 {templateType === "editorial_card" && (
 <div className="p-3 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
 <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
 <Tag className="size-3.5 text-primary" />
 Badges & Tags Promocionais
 </span>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-[11px] font-bold text-muted-foreground">Badge</Label>
 <Input
 value={badgeLabel}
 onChange={(e) => setBadgeLabel(e.target.value)}
 placeholder="Ex: OFERTAS, SABOR"
 className="h-9 rounded-xl bg-card text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-[11px] font-bold text-muted-foreground">Pill de Destaque</Label>
 <Input
 value={heroStatBadge}
 onChange={(e) => setHeroStatBadge(e.target.value)}
 placeholder="Ex: ATÉ 50% OFF"
 className="h-9 rounded-xl bg-card text-xs"
 />
 </div>
 </div>
 </div>
 )}

 <DestinationPicker
 value={targetRoute}
 onChange={(url) => {
 setTargetRoute(url);
 if (!slug) {
 const autoSlug = url.replace(/[^a-zA-Z0-9-]/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
 setSlug(autoSlug || "destaque");
 }
 }}
 label="Página de Destino ao Clicar"
 helperText="Ex: /classificados, /mercado, /gastronomia, /farmacia..."
 />

 <div className="p-3 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
 <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
 <SlidersHorizontal className="size-3.5 text-primary" />
 Configurações de Exibição
 </span>

 <div className="space-y-2.5">
 {/* Título: disponível para todos os tipos */}
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-foreground">Exibir Título no Card</p>
 <p className="text-[10px] text-muted-foreground">Mostra o nome sobre a imagem</p>
 </div>
 <Switch checked={showTitle} onCheckedChange={setShowTitle} />
 </div>

 {/* Sombra Externa: para todos os tipos */}
 <div className="flex items-center justify-between border-t border-border/40 pt-2">
 <div>
 <p className="text-xs font-bold text-foreground">Sombra Externa do Card</p>
 <p className="text-[10px] text-muted-foreground">Box shadow elevada — desativada por padrão</p>
 </div>
 <Switch checked={showShadow} onCheckedChange={setShowShadow} />
 </div>

 {/* Overlay: disponível para todos os tipos */}
 <div className="flex items-center justify-between border-t border-border/40 pt-2">
 <div>
 <p className="text-xs font-bold text-foreground">Overlay sobre a Imagem</p>
 <p className="text-[10px] text-muted-foreground">Degradê de contraste — desativado por padrão</p>
 </div>
 <Switch checked={showOverlay} onCheckedChange={setShowOverlay} />
 </div>

 {/* Controles de Overlay (visíveis somente quando overlay ativado) */}
 {showOverlay && (
 <div className="pl-2 border-l-2 border-primary/30 space-y-3 mt-1">
 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <Label className="text-[11px] font-bold text-muted-foreground">Opacidade do Overlay</Label>
 <span className="text-[11px] font-mono text-primary font-bold">{bgOverlayOpacity}%</span>
 </div>
 <input
 type="range"
 min={0}
 max={100}
 step={5}
 value={bgOverlayOpacity}
 onChange={(e) => setBgOverlayOpacity(Number(e.target.value))}
 className="w-full h-2 rounded-full bg-muted accent-primary cursor-pointer"
 />
 <div className="flex justify-between text-[9px] text-muted-foreground/70 font-mono">
 <span>0% (Transparente)</span>
 <span>100% (Opaco)</span>
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-[11px] font-bold text-muted-foreground">Cor do Overlay</Label>
 <div className="flex items-center gap-2">
 <input
 type="color"
 value={bgColor}
 onChange={(e) => setBgColor(e.target.value)}
 className="size-8 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
 title="Escolher cor do overlay"
 />
 <Input
 value={bgColor}
 onChange={(e) => setBgColor(e.target.value)}
 placeholder="#000000"
 className="h-8 rounded-xl bg-card text-xs font-mono flex-1"
 maxLength={7}
 />
 {/* Paleta rápida */}
 <div className="flex gap-1">
 {["#000000", "#1a1a2e", "#0f3460", "#ffffff"].map((c) => (
 <button
 key={c}
 type="button"
 onClick={() => setBgColor(c)}
 className="size-6 rounded-md border border-border/60 transition-transform hover:scale-110 active:scale-95 shrink-0"
 style={{ backgroundColor: c }}
 title={c}
 />
 ))}
 </div>
 </div>
 </div>
 </div>
 )}

                {/* Cor do Texto — Sempre configurável quando showTitle estiver ativo */}
                {showTitle && (
                  <div className="space-y-1.5 border-t border-border/40 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-muted-foreground">Cor do Título</Label>
                      {textColor && (
                        <button
                          type="button"
                          onClick={() => setTextColor("")}
                          className="text-[10px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        >
                          Restaurar Padrão
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={textColor || "#ffffff"}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="size-8 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                        title="Cor do título"
                      />
                      <Input
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        placeholder="Ex: #ffffff ou #000000"
                        className="h-8 rounded-xl bg-card text-xs font-mono flex-1"
                      />
                      {/* Presets rápidos de cores para o título */}
                      <div className="flex gap-1 shrink-0">
                        {["#ffffff", "#000000", "#f8fafc", "#0f172a"].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setTextColor(c)}
                            className="size-6 rounded-md border border-border/60 transition-transform hover:scale-110 active:scale-95 shrink-0 cursor-pointer"
                            style={{ backgroundColor: c }}
                            title={`Título em ${c}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border/40 pt-2">
                  <div>
                    <p className="text-xs font-bold text-foreground">Item Ativo</p>
                    <p className="text-[10px] text-muted-foreground">Visível para usuários</p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>
            </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold">Ordem de Exibição (Sort Order)</Label>
 <Input
 type="number"
 value={sortOrder}
 onChange={(e) => setSortOrder(Number(e.target.value))}
 placeholder="0"
 className="h-10 rounded-xl bg-card text-xs font-mono"
 />
 </div>

 <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsSheetOpen(false)}
 className="rounded-xl text-xs"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 className="rounded-xl font-bold text-xs min-w-28"
 >
 {isSubmitting ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Item"}
 </Button>
 </div>
 </form>
 </SheetPage>
 </div>
 );
}

