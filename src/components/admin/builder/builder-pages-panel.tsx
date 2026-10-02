import * as React from "react";
import { useState } from "react";
import { Tag, FileText, Plus, Home, Trash2, Copy, Settings, Globe, Check, ChevronRight, Layers, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface BuilderPageItem {
 id: string;
 title: string;
 slug: string;
 is_home: boolean;
 seo_title?: string;
 seo_description?: string;
}

export interface BuilderPagesPanelProps {
 pages: BuilderPageItem[];
 activePageId: string;
 onSelectPage: (pageId: string) => void;
 onAddPage: (newPage: { title: string; slug: string; is_home: boolean }) => void;
 onDeletePage: (pageId: string) => void;
 onDuplicatePage: (pageId: string) => void;
 onUpdatePageSeo: (pageId: string, seo: { seo_title?: string; seo_description?: string }) => void;
 onClose: () => void;
}

export function BuilderPagesPanel({
 pages,
 activePageId,
 onSelectPage,
 onAddPage,
 onDeletePage,
 onDuplicatePage,
 onUpdatePageSeo,
 onClose,
}: BuilderPagesPanelProps) {
 const [isAdding, setIsAdding] = useState(false);
 const [newTitle, setNewTitle] = useState("");
 const [newSlug, setNewSlug] = useState("");
 const [editingSeoPageId, setEditingSeoPageId] = useState<string | null>(null);
 const [seoTitle, setSeoTitle] = useState("");
 const [seoDesc, setSeoDesc] = useState("");

 const handleCreate = (e: React.FormEvent) => {
 e.preventDefault();
 if (!newTitle.trim()) {
 toast.error("Informe o título da nova página.");
 return;
 }
 const slug = (newSlug.trim() || newTitle.trim())
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/(^-|-$)+/g, "");

 const formattedSlug = slug.startsWith("/") ? slug : `/${slug}`;

 onAddPage({
 title: newTitle.trim(),
 slug: formattedSlug,
 is_home: false,
 });

 setNewTitle("");
 setNewSlug("");
 setIsAdding(false);
 toast.success(`Página "${newTitle}" criada com sucesso!`);
 };

 const startEditSeo = (p: BuilderPageItem) => {
 setEditingSeoPageId(p.id);
 setSeoTitle(p.seo_title || p.title);
 setSeoDesc(p.seo_description || "");
 };

 const saveSeo = (pageId: string) => {
 onUpdatePageSeo(pageId, {
 seo_title: seoTitle.trim(),
 seo_description: seoDesc.trim(),
 });
 setEditingSeoPageId(null);
 toast.success("SEO da página atualizado!");
 };

 return (
 <aside className="w-80 bg-card border-r border-border/80 flex flex-col flex-none overflow-hidden select-none z-20 shadow-2xs animate-in slide-in-from-left duration-200">
 {/* Header */}
 <div className="p-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
 <div className="flex items-center gap-2">
 <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
 <FileText className="size-4" />
 </div>
 <div>
 <h3 className="text-xs font-bold text-foreground">Páginas do Site</h3>
 <p className="text-[10px] text-muted-foreground">
 {pages.length} {pages.length === 1 ? "página cadastrada" : "páginas cadastradas"}
 </p>
 </div>
 </div>

 <Button
 type="button"
 size="sm"
 variant="outline"
 onClick={() => setIsAdding(!isAdding)}
 className="rounded-lg text-xs h-7 px-3 gap-1 font-bold cursor-pointer"
 >
 <Plus className="size-3.5 text-primary" />
 <span>Nova</span>
 </Button>
 </div>

 <ScrollArea className="flex-1 p-3">
 {/* Formulário de Adicionar Página */}
 {isAdding && (
 <form onSubmit={handleCreate} className="p-4 rounded-lg bg-muted/40 border border-primary/30 space-y-3 mb-3 animate-in zoom-in-95 duration-150">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-2">
 <Layers className="size-3.5 text-primary" />
 Criar Nova Página
 </span>
 <button
 type="button"
 onClick={() => setIsAdding(false)}
 className="text-muted-foreground hover:text-foreground text-xs"
 >
 ✕
 </button>
 </div>

 <div className="space-y-1">
 <Label className="text-[10px] font-bold">Título da Página *</Label>
 <Input
 value={newTitle}
 onChange={(e) => {
 setNewTitle(e.target.value);
 if (!newSlug) {
 const auto = e.target.value
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-");
 setNewSlug(`/${auto}`);
 }
 }}
 placeholder="Ex: Sobre Nós, Destinos, Contato"
 className="h-8 text-xs rounded-lg bg-background"
 required
 />
 </div>

 <div className="space-y-1">
 <Label className="text-[10px] font-bold">Caminho / Rota (Slug)</Label>
 <Input
 value={newSlug}
 onChange={(e) => setNewSlug(e.target.value)}
 placeholder="/sobre-nos"
 className="h-8 text-xs rounded-lg font-mono bg-background"
 />
 </div>

 <div className="flex justify-end gap-2 pt-1">
 <Button
 type="button"
 size="sm"
 variant="ghost"
 onClick={() => setIsAdding(false)}
 className="h-7 text-xs rounded-lg"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 size="sm"
 className="h-7 text-xs rounded-lg font-bold bg-primary text-primary-foreground"
 >
 Criar Página
 </Button>
 </div>
 </form>
 )}

 {/* Lista de Páginas */}
 <div className="space-y-2">
 {pages.map((p) => {
 const isActive = p.id === activePageId;
 const isEditingSeo = editingSeoPageId === p.id;

 return (
 <div
 key={p.id}
 className={cn(
 "rounded-lg border transition-all overflow-hidden",
 isActive
 ? "bg-primary/5 border-primary/50 shadow-2xs"
 : "bg-card border-border/70 hover:border-border"
 )}
 >
 <div
 onClick={() => onSelectPage(p.id)}
 className="p-3 flex items-center justify-between cursor-pointer"
 >
 <div className="flex items-center gap-3 min-w-0">
 <div className={cn(
 "size-7 rounded-lg flex items-center justify-center shrink-0",
 p.is_home
 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
 : isActive
 ? "bg-primary text-primary-foreground"
 : "bg-muted text-muted-foreground"
 )}>
 {p.is_home ? <Home className="size-3.5" /> : <FileText className="size-3.5" />}
 </div>

 <div className="min-w-0">
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-foreground truncate block">
 {p.title}
 </span>
 {p.is_home && (
 <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-none text-[9px] py-0 px-1 font-bold">
 Início
 </Badge>
 )}
 </div>
 <span className="text-[10px] text-muted-foreground font-mono block">
 {p.slug}
 </span>
 </div>
 </div>

 <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
 <button
 type="button"
 onClick={() => startEditSeo(p)}
 title="Configurar SEO"
 className="size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
 >
 <Globe className="size-3.5" />
 </button>

 {!p.is_home && (
 <button
 type="button"
 onClick={() => {
 if (confirm(`Deseja realmente remover a página "${p.title}"?`)) {
 onDeletePage(p.id);
 }
 }}
 title="Excluir página"
 className="size-7 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
 >
 <Trash2 className="size-3.5" />
 </button>
 )}
 </div>
 </div>

 {/* Sub-painel de Edição de SEO da Página */}
 {isEditingSeo && (
 <div className="p-3 border-t border-border/60 bg-muted/20 space-y-2 text-xs">
 <span className="text-[10px] font-bold text-foreground block">
 SEO da Página: {p.title}
 </span>
 <div className="space-y-1">
 <Label className="text-[10px] text-muted-foreground">Title Tag (Google)</Label>
 <Input
 value={seoTitle}
 onChange={(e) => setSeoTitle(e.target.value)}
 placeholder="Título para o Google"
 className="h-7 text-xs rounded-lg bg-background"
 />
 </div>
 <div className="space-y-1">
 <Label className="text-[10px] text-muted-foreground">Meta Descrição</Label>
 <Input
 value={seoDesc}
 onChange={(e) => setSeoDesc(e.target.value)}
 placeholder="Breve descrição da página"
 className="h-7 text-xs rounded-lg bg-background"
 />
 </div>
 <div className="flex justify-end gap-1 pt-1">
 <Button
 type="button"
 size="sm"
 variant="ghost"
 onClick={() => setEditingSeoPageId(null)}
 className="h-6 text-[10px] rounded-md"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 size="sm"
 onClick={() => saveSeo(p.id)}
 className="h-6 text-[10px] font-bold rounded-md bg-primary text-primary-foreground"
 >
 Salvar SEO
 </Button>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>
 </ScrollArea>
 </aside>
 );
}
