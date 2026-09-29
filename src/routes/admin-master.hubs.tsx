import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Plus, Trash2, Edit2, UploadCloud, CheckCircle2, Eye, EyeOff, Layers, ArrowUpDown, Image as ImageIcon, Check, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SheetPage } from "@/components/ui/sheet-page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { listAllAdminHubs, saveAdminHub, deleteAdminHub, toggleAdminHubStatus } from "@/services/admin-hubs.functions";
import { uploadAdminMedia } from "@/services/storage.functions";
import type { HotpageDTO, HotpageModule } from "@/services/hotpage.functions";

export const Route = createFileRoute("/admin-master/hubs")({
 head: () => ({ meta: [{ title: "Hubs Globais | Admin Master" }] }),
  loader: async () => {
    try {
      const hubs = await listAllAdminHubs().catch(() => []);
      return { hubs: hubs || [] };
    } catch (err) {
      console.error("[loader:admin-master.hubs] Unhandled loader error:", err);
      return { hubs: [] };
    }
  },
 component: AdminMasterHubsPage,
});

const MODULES: { id: HotpageModule; label: string; emoji: string }[] = [
 { id: "all", label: "Todos os Módulos", emoji: "🌐" },
 { id: "home", label: "Início (Home)", emoji: "🏠" },
 { id: "gastronomia", label: "Gastronomia e Delivery", emoji: "🍽️" },
 { id: "mercado", label: "Supermercado e Hortifrúti", emoji: "🛒" },
 { id: "farmacia", label: "Farmácia e Saúde", emoji: "💊" },
 { id: "bebidas", label: "Bebidas e Adega", emoji: "🍻" },
 { id: "acougue", label: "Açougue e Carnes", emoji: "🥩" },
 { id: "moda", label: "Moda e Vestuário", emoji: "👗" },
 { id: "eletronicos", label: "Eletrônicos e Tech", emoji: "📱" },
 { id: "pet", label: "Pet Shop", emoji: "🐾" },
 { id: "servicos", label: "Serviços e Profissionais", emoji: "💼" },
 { id: "imoveis", label: "Imóveis e Locação", emoji: "🏢" },
 { id: "construcao", label: "Construção e Reforma", emoji: "🔨" },
 { id: "casa", label: "Casa e Decoração", emoji: "🛋️" },
 { id: "beleza", label: "Beleza e Estética", emoji: "✂️" },
 { id: "limpeza", label: "Limpeza e Utilidades", emoji: "🧹" },
 { id: "livros", label: "Livros e Papelaria", emoji: "📚" },
 { id: "feed", label: "Feed", emoji: "📡" },
 { id: "noticias", label: "Notícias", emoji: "📰" },
 { id: "eventos", label: "Eventos", emoji: "🎟️" },
 { id: "agenda", label: "Agenda", emoji: "📅" },
 { id: "afiliados", label: "Afiliados", emoji: "🎯" },
 { id: "turismo", label: "Turismo e Hospedagem", emoji: "✈️" },
 { id: "empregos", label: "Empregos", emoji: "💼" },
 { id: "classificados", label: "Classificados", emoji: "🏷️" },
 { id: "diretorio", label: "Places (Lista Telefônica)", emoji: "🧭" },
 { id: "mobilidade", label: "Mobilidade Urbana", emoji: "🚗" },
 { id: "ofertas", label: "Ofertas e Promoções", emoji: "⚡" },
];

function AdminMasterHubsPage() {
  const loaderData = (Route.useLoaderData() as any) || {};
  const initialHubs = loaderData.hubs || [];
  const router = useRouter();
  const [hubs, setHubs] = useState<HotpageDTO[]>(initialHubs);
 const [selectedModule, setSelectedModule] = useState<string>("all");
 const [searchQuery, setSearchQuery] = useState("");

 // Edit Modal State
 const [isOpen, setIsOpen] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const [editingHub, setEditingHub] = useState<Partial<HotpageDTO> | null>(null);

 // Upload States
 const [isUploadingIcon, setIsUploadingIcon] = useState(false);
 const [isUploadingCover, setIsUploadingCover] = useState(false);
 const iconInputRef = useRef<HTMLInputElement>(null);
 const coverInputRef = useRef<HTMLInputElement>(null);

 const filteredHubs = hubs.filter((h) => {
 const matchesModule = selectedModule === "all" || h.module === selectedModule;
 const matchesSearch =
 !searchQuery ||
 h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
 h.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
 (h.badge_label && h.badge_label.toLowerCase().includes(searchQuery.toLowerCase()));
 return matchesModule && matchesSearch;
 });

 const handleOpenNew = () => {
 setEditingHub({
 slug: "",
 title: "",
 badge_label: "",
 description: "",
 module: selectedModule === "all" ? "home" : (selectedModule as HotpageModule),
 sort_order: (hubs.length + 1) * 10,
 show_title: true,
 show_description: true,
 show_overlay: true,
 show_badge: true,
 is_active: true,
 icon_url: "",
 custom_icon_url: "",
 cover_image_url: "",
 });
 setIsOpen(true);
 };

 const handleOpenEdit = (hub: HotpageDTO) => {
 setEditingHub({ ...hub });
 setIsOpen(true);
 };

 const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 setIsUploadingIcon(true);
 try {
 const reader = new FileReader();
 reader.onload = async () => {
 const base64 = reader.result as string;
 const res = await uploadAdminMedia({
 data: {
 fileName: file.name,
 fileType: file.type || "image/png",
 base64Data: base64,
 folder: "category-icons",
 },
 });
 setEditingHub((prev) => (prev ? { ...prev, custom_icon_url: res.url, icon_url: res.url } : null));
 toast.success("Ícone enviado com sucesso!");
 };
 reader.readAsDataURL(file);
 } catch (err: any) {
 toast.error(err.message || "Erro ao fazer upload do ícone.");
 } finally {
 setIsUploadingIcon(false);
 }
 };

 const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 setIsUploadingCover(true);
 try {
 const reader = new FileReader();
 reader.onload = async () => {
 const base64 = reader.result as string;
 const res = await uploadAdminMedia({
 data: {
 fileName: file.name,
 fileType: file.type || "image/jpeg",
 base64Data: base64,
 folder: "hub-covers",
 },
 });
 setEditingHub((prev) => (prev ? { ...prev, cover_image_url: res.url } : null));
 toast.success("Capa do hub enviada com sucesso!");
 };
 reader.readAsDataURL(file);
 } catch (err: any) {
 toast.error(err.message || "Erro ao fazer upload da capa.");
 } finally {
 setIsUploadingCover(false);
 }
 };

 const handleSave = async () => {
 if (!editingHub?.title || !editingHub?.slug) {
 toast.error("Título e Slug são obrigatórios.");
 return;
 }

 setIsSaving(true);
 try {
 const saved = await saveAdminHub({
 data: {
 id: editingHub.id,
 slug: editingHub.slug,
 title: editingHub.title,
 badge_label: editingHub.badge_label || null,
 description: editingHub.description || null,
 cover_image_url: editingHub.cover_image_url || null,
 icon_name: editingHub.icon_name || null,
 icon_url: editingHub.custom_icon_url || editingHub.icon_url || null,
 custom_icon_url: editingHub.custom_icon_url || editingHub.icon_url || null,
 module: (editingHub.module as any) || "home",
 sort_order: Number(editingHub.sort_order || 0),
 show_title: !!editingHub.show_title,
 show_description: !!editingHub.show_description,
 show_overlay: editingHub.show_overlay !== false,
 show_badge: editingHub.show_badge !== false,
 is_active: editingHub.is_active !== false,
 },
 });

 toast.success("Categoria global salva com sucesso!");
 setIsOpen(false);
 router.invalidate();
 const updatedList = await listAllAdminHubs();
 setHubs(updatedList);
 } catch (err: any) {
 toast.error(err.message || "Erro ao salvar categoria global.");
 } finally {
 setIsSaving(false);
 }
 };

 const handleToggleStatus = async (hub: HotpageDTO) => {
 try {
 const newStatus = !hub.is_active;
 await toggleAdminHubStatus({ data: { id: hub.id, is_active: newStatus } });
 setHubs((prev) => prev.map((h) => (h.id === hub.id ? { ...h, is_active: newStatus } : h)));
 toast.success(newStatus ? "Categoria ativada!" : "Categoria desativada.");
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao alterar status.");
 }
 };

 const handleDelete = async (id: string, title: string) => {
 if (!confirm(`Tem certeza que deseja remover a categoria global "${title}"?`)) return;

 try {
 await deleteAdminHub({ data: { id } });
 setHubs((prev) => prev.filter((h) => h.id !== id));
 toast.success("Categoria removida com sucesso.");
 router.invalidate();
 } catch (err: any) {
 toast.error(err.message || "Erro ao remover categoria.");
 }
 };

 return (
 <div className="space-y-6">
 {/* ── 1. Top Bar com Título e Ação ── */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
 <div>
 <div className="flex items-center gap-2">
 <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase bg-primary text-primary-foreground">
 Governança Global
 </span>
 </div>
 <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
 Hubs Verticais e Categorias Globais
 </h1>
 <p className="text-xs text-muted-foreground mt-1">
 Taxonomia de categorias e botões de atalho da rede
 </p>
 </div>

 <Button
 onClick={handleOpenNew}
 className="h-11 px-5 rounded-xl font-medium text-xs bg-foreground text-background hover:bg-foreground/90 shrink-0 shadow-xs"
 >
 <Plus className="size-4 mr-2" />
 Nova Categoria Global
 </Button>
 </div>

 {/* ── 2. Filtro por Módulo & Busca ── */}
 <div className="space-y-3">
 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 ">
 {MODULES.map((m) => (
 <button
 key={m.id}
 onClick={() => setSelectedModule(m.id)}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer flex items-center gap-1.5 ${
 selectedModule === m.id
 ? "bg-foreground text-background border-foreground font-bold "
 : "bg-card text-muted-foreground border-border hover:bg-muted/70 hover:text-foreground"
 }`}
 >
 <span>{m.emoji}</span>
 <span>{m.label}</span>
 </button>
 ))}
 </div>

 <div className="flex items-center gap-3">
 <Input
 placeholder="Filtrar por nome, slug ou tag..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="max-w-md h-10 rounded-xl bg-card border-border text-xs"
 />
 <span className="text-xs text-muted-foreground font-mono">
 {filteredHubs.length} de {hubs.length} categorias
 </span>
 </div>
 </div>

 {/* ── 3. Lista de Categorias & Cards ── */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {filteredHubs.map((hub) => (
 <div
 key={hub.id}
 className="p-5 rounded-2xl bg-card space-y-4 flex flex-col justify-between hover:border-foreground/20 transition-all group"
 >
 <div className="space-y-3">
 {/* Header com Ícone e Status */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="size-11 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
 {hub.custom_icon_url || hub.icon_url ? (
 <img
 src={hub.custom_icon_url || hub.icon_url!}
 alt={hub.title}
 className="size-8 object-contain"
 onError={(e) => {
 e.currentTarget.style.display = "none";
 }}
 />
 ) : (
 <Tag className="size-5 text-muted-foreground/50" />
 )}
 </div>
 <div>
 <h3 className="text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
 {hub.title}
 </h3>
 <span className="text-[11px] font-mono text-muted-foreground">
 /{hub.module}/{hub.slug}
 </span>
 </div>
 </div>

 <button
 type="button"
 onClick={() => handleToggleStatus(hub)}
 className={`size-8 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
 hub.is_active
 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
 : "bg-muted border-border text-muted-foreground/40"
 }`}
 title={hub.is_active ? "Ativo (clique para pausar)" : "Pausado (clique para ativar)"}
 >
 {hub.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
 </button>
 </div>

 {/* Preview de Capa (se houver) */}
 {hub.cover_image_url && (
 <div className="relative aspect-16/9 rounded-xl overflow-hidden bg-muted ">
 <img
 src={hub.cover_image_url}
 alt={hub.title}
 className="size-full object-cover"
 onError={(e) => {
 e.currentTarget.style.display = "none";
 }}
 />
 {hub.badge_label && (
 <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-black/60 backdrop-blur-md text-white border border-white/20">
 {hub.badge_label}
 </span>
 )}
 </div>
 )}

 {hub.description && (
 <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
 {hub.description}
 </p>
 )}
 </div>

 {/* Ações de Edição e Ordenação */}
 <div className="pt-3 flex items-center justify-between text-xs">
 <span className="font-mono text-muted-foreground">Ordem: #{hub.sort_order}</span>
 <div className="flex items-center gap-1.5">
 <Button
 size="sm"
 variant="outline"
 onClick={() => handleOpenEdit(hub)}
 className="h-8 px-3 rounded-lg border-border text-xs font-semibold"
 >
 <Edit2 className="size-3.5 mr-1" /> Editar
 </Button>
 <Button
 size="sm"
 variant="ghost"
 onClick={() => handleDelete(hub.id, hub.title)}
 className="h-8 px-2 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 </div>
 ))}
 </div>

 {/* ── Modal de Criação / Edição de Categoria Global ── */}
 <Dialog open={isOpen} onOpenChange={setIsOpen}>
 <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar sm:rounded-2xl">
 <DialogHeader>
 <DialogTitle className="text-lg font-bold">
 {editingHub?.id ? "Editar Categoria Global" : "Nova Categoria Global"}
 </DialogTitle>
 </DialogHeader>

 {editingHub && (
 <div className="space-y-4 py-2">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs">Módulo da Plataforma *</Label>
 <Select
 value={editingHub.module || "home"}
 onValueChange={(val) => setEditingHub({ ...editingHub, module: val as HotpageModule })}
 >
 <SelectTrigger className="rounded-xl h-10 text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {MODULES.filter((m) => m.id !== "all").map((m) => (
 <SelectItem key={m.id} value={m.id} className="text-xs">
 {m.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs">Slug (URL) *</Label>
 <Input
 placeholder="ex: gastronomia, eletronicos"
 value={editingHub.slug || ""}
 onChange={(e) => setEditingHub({ ...editingHub, slug: e.target.value })}
 className="rounded-xl h-10 text-xs"
 />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <Label className="text-xs">Título de Exibição *</Label>
 <Input
 placeholder="ex: Gastronomia & Delivery"
 value={editingHub.title || ""}
 onChange={(e) => setEditingHub({ ...editingHub, title: e.target.value })}
 className="rounded-xl h-10 text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs">Badge / Tag Promocional</Label>
 <Input
 placeholder="ex: Até 40% OFF, Sabor Local"
 value={editingHub.badge_label || ""}
 onChange={(e) => setEditingHub({ ...editingHub, badge_label: e.target.value })}
 className="rounded-xl h-10 text-xs"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs">Descrição Curta</Label>
 <Input
 placeholder="ex: Pizzas, lanches, cafés especiais e pratos locais."
 value={editingHub.description || ""}
 onChange={(e) => setEditingHub({ ...editingHub, description: e.target.value })}
 className="rounded-xl h-10 text-xs"
 />
 </div>

 {/* Upload de Ícone Customizado */}
 <div className="p-4 rounded-2xl bg-muted/20 space-y-3">
 <Label className="text-xs font-bold flex items-center gap-2">
 <ImageIcon className="size-4 text-primary" />
 Ícone Customizado da Categoria (PNG / SVG Transparente)
 </Label>
 <div className="flex items-center gap-3">
 <div className="size-14 rounded-xl bg-card flex items-center justify-center overflow-hidden shrink-0">
 {editingHub.custom_icon_url || editingHub.icon_url ? (
 <img
 src={editingHub.custom_icon_url || editingHub.icon_url!}
 alt="Preview"
 className="size-10 object-contain"
 />
 ) : (
 <Tag className="size-6 text-muted-foreground/40" />
 )}
 </div>
 <div className="flex-1 space-y-1.5">
 <input
 ref={iconInputRef}
 type="file"
 accept="image/*"
 onChange={handleIconUpload}
 className="hidden"
 />
 <Button
 type="button"
 variant="outline"
 size="sm"
 disabled={isUploadingIcon}
 onClick={() => iconInputRef.current?.click()}
 className="rounded-xl text-xs font-semibold border-border"
 >
 <UploadCloud className="size-3.5 mr-1.5" />
 {isUploadingIcon ? "Enviando..." : "Fazer Upload do Ícone"}
 </Button>
 <p className="text-[11px] text-muted-foreground">
 Recomendado: PNG com fundo transparente ou SVG, 128x128px.
 </p>
 </div>
 </div>
 </div>

 {/* Upload de Capa / Banner Panorâmico */}
 <div className="p-4 rounded-2xl bg-muted/20 space-y-3">
 <Label className="text-xs font-bold flex items-center gap-2">
 <ImageIcon className="size-4 text-primary" />
 Foto de Capa do Hub (Hero Card / Carrossel)
 </Label>
 <div className="space-y-2">
 {editingHub.cover_image_url && (
 <div className="relative aspect-16/9 rounded-xl overflow-hidden bg-muted ">
 <img
 src={editingHub.cover_image_url}
 alt="Capa"
 className="size-full object-cover"
 />
 </div>
 )}
 <input
 ref={coverInputRef}
 type="file"
 accept="image/*"
 onChange={handleCoverUpload}
 className="hidden"
 />
 <Button
 type="button"
 variant="outline"
 size="sm"
 disabled={isUploadingCover}
 onClick={() => coverInputRef.current?.click()}
 className="rounded-xl text-xs font-semibold border-border"
 >
 <UploadCloud className="size-3.5 mr-1.5" />
 {isUploadingCover ? "Enviando..." : "Fazer Upload da Capa"}
 </Button>
 </div>
 </div>

 {/* Ordem e Opções de Exibição */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
 <div className="space-y-1.5">
 <Label className="text-xs">Ordem de Exibição</Label>
 <Input
 type="number"
 value={editingHub.sort_order ?? 0}
 onChange={(e) => setEditingHub({ ...editingHub, sort_order: Number(e.target.value) })}
 className="rounded-xl h-10 text-xs font-mono"
 />
 </div>

 <div className="flex items-center justify-between p-3 rounded-xl bg-card">
 <div>
 <Label className="text-xs font-bold block">Status Ativo</Label>
 <span className="text-[10px] text-muted-foreground">Visível no app</span>
 </div>
 <Switch
 checked={editingHub.is_active !== false}
 onCheckedChange={(val) => setEditingHub({ ...editingHub, is_active: val })}
 />
 </div>
 </div>
 </div>
 )}

 <DialogFooter className="gap-2 pt-3 ">
 <Button
 variant="outline"
 onClick={() => setIsOpen(false)}
 className="rounded-xl text-xs font-bold border-border"
 >
 Cancelar
 </Button>
 <Button
 onClick={handleSave}
 disabled={isSaving}
 className="rounded-xl text-xs font-bold bg-foreground text-background hover:bg-foreground/90"
 >
 {isSaving ? "Salvando..." : "Salvar Categoria"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
