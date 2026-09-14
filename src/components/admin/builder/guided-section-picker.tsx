import * as React from "react";
import { useState } from "react";
import { X, Search, Plus, Layers, LayoutTemplate, ArrowRight } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAllTemplates, getTemplatesByCategory } from "@/lib/section-templates";
import type { SectionTemplate } from "@/lib/builder-types";

export interface GuidedSectionPickerProps {
 isOpen: boolean;
 onClose: () => void;
 onSelectTemplate: (template: SectionTemplate) => void;
}

const CATEGORIES = [
 { id: "all", label: "Todas as Seções" },
 { id: "commerce", label: "Vitrine & Vendas" },
 { id: "content", label: "Conteúdo & Mídia" },
 { id: "marketing", label: "Conversão & Prova Social" },
];

export function GuidedSectionPicker({
 isOpen,
 onClose,
 onSelectTemplate,
}: GuidedSectionPickerProps) {
 const [activeCategory, setActiveCategory] = useState("all");
 const [search, setSearch] = useState("");

 if (!isOpen) return null;

 const templates =
 activeCategory === "all" ? getAllTemplates() : getTemplatesByCategory(activeCategory);

 const filteredTemplates = templates.filter(
 (t: any) =>
 t.name.toLowerCase().includes(search.toLowerCase()) ||
 t.description.toLowerCase().includes(search.toLowerCase()),
 );

 return (
 <div className="fixed inset-0 z-50 flex items-stretch select-none animate-in fade-in duration-200">
 {/* Backdrop transparente / suave */}
 <div
 className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
 onClick={onClose}
 />

 {/* Painel Lateral Deslizante (Wix Studio / Framer Add Elements Panel) */}
 <div className="relative z-50 w-full max-w-xl bg-card border-r border-border shadow-2xl flex flex-col h-full overflow-hidden animate-in slide-in-from-left duration-300">
 {/* Cabeçalho do Drawer */}
 <div className="p-5 border-b border-border/70 flex items-center justify-between bg-muted/20">
 <div className="flex items-center gap-2.5">
 <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
 <LayoutTemplate className="size-5" />
 </div>
 <div>
 <h3 className="text-base font-bold text-foreground">Catálogo de Seções Prontas</h3>
 <p className="text-xs text-muted-foreground">
 Clique para inserir uma seção completa com design profissional.
 </p>
 </div>
 </div>
 <Button
 variant="ghost"
 size="icon"
 onClick={onClose}
 className="size-8 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
 >
 <X className="size-4" />
 </Button>
 </div>

 {/* Busca e Categorias */}
 <div className="p-4 border-b border-border/60 space-y-3 bg-muted/10">
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
 <Input
 placeholder="Buscar seção (ex: Banners, Carrossel, Shop the Look...)"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="h-10 pl-9 rounded-xl bg-background text-xs border-border/80"
 />
 </div>

 <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
 {CATEGORIES.map((cat) => (
 <button
 key={cat.id}
 type="button"
 onClick={() => setActiveCategory(cat.id)}
 className={cn(
 "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
 activeCategory === cat.id
 ? "bg-primary text-primary-foreground font-bold shadow-2xs"
 : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
 )}
 >
 {cat.label}
 </button>
 ))}
 </div>
 </div>

 {/* Lista de Seções com Preview Visual */}
 <ScrollArea className="flex-1 p-4">
 {filteredTemplates.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-2 text-center">
 <LayoutTemplate className="size-8 text-muted-foreground/40" />
 <p className="text-xs font-semibold">Nenhuma seção encontrada com este termo.</p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pb-8">
 {filteredTemplates.map((template: any) => (
 <div
 key={template.id}
 onClick={() => {
 onSelectTemplate(template);
 onClose();
 }}
 className="group p-4 rounded-2xl bg-muted/30 hover:bg-muted/60 border border-border/60 hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between space-y-3"
 >
 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
 {template.name}
 </h4>
 <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-medium">
 {template.category}
 </Badge>
 </div>
 <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
 {template.description}
 </p>
 </div>

 <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-semibold text-primary">
 <span>Inserir na Página</span>
 <Plus className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
 </div>
 </div>
 ))}
 </div>
 )}
 </ScrollArea>
 </div>
 </div>
 );
}
