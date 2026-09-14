import * as React from "react";
import { X, Sliders, Database, Palette, Layout, Maximize2, Minimize2, Move, Type, Square, Link, CheckCircle2, Layers, Image as ImageIcon, Tag, ExternalLink, FileText, Compass, Zap } from 'lucide-react';
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { MediaUploader } from "@/components/admin/builder/MediaUploader";
import { ColorPicker } from "@/components/admin/builder/ColorPicker";
import { ArrayBuilder } from "@/components/admin/builder/ArrayBuilder";
import { BuilderDockingMatrix, type DockingPosition } from "@/components/admin/builder/builder-docking-matrix";
import type { ExperienceNode } from "@/lib/builder-types";
import { builderRegistry } from "@/lib/builder-registry";

export type InspectorTab = "content" | "connection" | "layout" | "design" | "animation";

export interface BuilderInspectorProps {
 selectedNodeId: string | null;
 selectedNode?: ExperienceNode | any;
 blockManifest?: any;
 inspectorTab: InspectorTab;
 setInspectorTab: (tab: InspectorTab) => void;
 setSelectedNodeId: (id: string | null) => void;
 updateNode: (nodeId: string, section: any, field: string, value: any) => void;
 setNodes: React.Dispatch<React.SetStateAction<any[]>>;
 collections?: any[];
 categories?: any[];
 treeNodes?: any[];
 pages?: any[];
}

function findAncestors(targetId: string, roots: any[], path: any[] = []): any[] | null {
 for (const node of roots) {
 const currentPath = [...path, node];
 if (node.id === targetId) return currentPath;
 if (node.children && node.children.length > 0) {
 const res = findAncestors(targetId, node.children, currentPath);
 if (res) return res;
 }
 }
 return null;
}

function findPrimaryContentChild(node: any): any | null {
 if (!node.children || node.children.length === 0) return null;
 for (const child of node.children) {
 if (child.node_type !== "section" && child.node_type !== "container") {
 return child;
 }
 const deeper = findPrimaryContentChild(child);
 if (deeper) return deeper;
 }
 return node.children[0] || null;
}

export function BuilderInspector({
 selectedNodeId,
 selectedNode,
 blockManifest,
 inspectorTab,
 setInspectorTab,
 setSelectedNodeId,
 updateNode,
 setNodes,
 collections = [],
 categories = [],
 treeNodes = [],
 pages = [],
}: BuilderInspectorProps) {
 const content = selectedNode?.content || {};
 const layout = selectedNode?.layout_rules || {};
 const design = selectedNode?.design_tokens || {};
 const dataBindings = selectedNode?.data_bindings || {};

 const ancestors = React.useMemo(() => {
 if (!selectedNode?.id || !treeNodes) return [];
 return findAncestors(selectedNode.id, treeNodes) || [selectedNode];
 }, [selectedNode?.id, treeNodes]);

 const primaryContentChild = React.useMemo(() => {
 if (!selectedNode || (selectedNode.node_type !== "section" && selectedNode.node_type !== "container")) {
 return null;
 }
 return findPrimaryContentChild(selectedNode);
 }, [selectedNode]);

 if (!selectedNode || !blockManifest) {
 return (
 <aside className="w-80 bg-card border-l border-border/80 flex flex-col flex-none overflow-hidden select-none z-20 shadow-2xs">
 <div className="p-8 flex flex-col items-center justify-center flex-1 text-center space-y-3 text-muted-foreground">
 <div className="size-12 rounded-2xl bg-muted/40 flex items-center justify-center border border-border/60">
 <Sliders className="size-5 text-muted-foreground" />
 </div>
 <div className="space-y-1">
 <h4 className="text-xs font-bold text-foreground">Nenhum bloco selecionado</h4>
 <p className="text-[11px] text-muted-foreground max-w-[200px] leading-relaxed">
 Clique em qualquer seção ou bloco no canvas para editar textos, imagens, layout e dados em tempo real.
 </p>
 </div>
 </div>
 </aside>
 );
 }

 const childManifest = primaryContentChild
 ? (builderRegistry as any)[primaryContentChild.block_type]
 : null;

 const humanizeLabel = (key: string) => {
 return key
 .replace(/_/g, " ")
 .replace(/([A-Z])/g, " $1")
 .replace(/^\w/, (l) => l.toUpperCase())
 .replace("Cents", " (R$)")
 .replace("Url", " (Imagem / Link)")
 .replace("Autoplay", "Reprodução Automática")
 .replace("Interval", "Intervalo de Troca (s)");
 };

 const handleContentChange = (field: string, value: any) => {
 updateNode(selectedNode.id, "content", field, value);
 };

 const handleLayoutChange = (field: string, value: any) => {
 updateNode(selectedNode.id, "layout_rules", field, value);
 };

 const handleDesignChange = (field: string, value: any) => {
 updateNode(selectedNode.id, "design_tokens", field, value);
 };

 const handleBindingChange = (sourceType: string, extra: Record<string, any> = {}) => {
 setNodes((prev: any[]) =>
 prev.map((n) => {
 if (n.id === selectedNode.id) {
 return {
 ...n,
 data_bindings: sourceType === "none" ? {} : { source: sourceType, ...extra },
 };
 }
 return n;
 })
 );
 };

 // Content fields from manifest
 const manifestContentFields =
 blockManifest.inspector?.content ||
 blockManifest.content_fields ||
 (blockManifest.contentSchema ? [] : null);

 // Design fields from manifest if explicitly specified
 const manifestDesignFields = blockManifest.inspector?.design || null;

 return (
 <aside className="w-80 bg-card border-l border-border/80 flex flex-col flex-none overflow-hidden select-none z-20 shadow-2xs">
 {/* ── Topo do Inspetor: Identificação Canônica do Bloco ── */}
 <div className="p-3.5 border-b border-border/70 flex items-center justify-between bg-muted/20">
 <div className="space-y-0.5 min-w-0 pr-2">
 <div className="flex items-center gap-1.5">
 <h3 className="text-xs font-bold text-foreground truncate">
 {blockManifest.name}
 </h3>
 <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
 {selectedNode.block_type}
 </Badge>
 </div>
 <p className="text-[10px] text-muted-foreground line-clamp-1">
 {blockManifest.description || "Propriedades e estilo do bloco."}
 </p>
 </div>

 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => setSelectedNodeId(null)}
 className="size-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
 >
 <X className="size-3.5" />
 </Button>
 </div>

 {/* ── Breadcrumb de Navegação Hierárquica ── */}
 {ancestors.length > 1 && (
 <div className="flex items-center gap-1 px-3 py-1.5 bg-muted/40 border-b border-border/60 text-[10px] text-muted-foreground overflow-x-auto no-scrollbar">
 <Layers className="size-3 shrink-0 text-muted-foreground/80" />
 {ancestors.map((anc, idx) => (
 <React.Fragment key={anc.id}>
 {idx > 0 && <span className="text-muted-foreground/40">/</span>}
 <button
 type="button"
 onClick={() => setSelectedNodeId(anc.id)}
 className={cn(
 "hover:text-primary transition-colors cursor-pointer truncate max-w-[100px]",
 anc.id === selectedNode.id
 ? "font-bold text-foreground underline underline-offset-2 decoration-primary"
 : "text-muted-foreground"
 )}
 title={`Selecionar ${anc.block_type}`}
 >
 {(builderRegistry as any)[anc.block_type]?.name || anc.block_type}
 </button>
 </React.Fragment>
 ))}
 </div>
 )}

 {/* ── Abas do Inspetor (Wix Studio / Editor X Standard) ── */}
 <div className="flex p-1 bg-muted/40 border-b border-border/60 gap-1 text-[11px] font-semibold">
 <button
 type="button"
 onClick={() => setInspectorTab("content")}
 className={cn(
 "flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1",
 inspectorTab === "content"
 ? "bg-background text-foreground font-bold shadow-2xs"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <Sliders className="size-3" />
 <span>Conteúdo</span>
 </button>

 <button
 type="button"
 onClick={() => setInspectorTab("layout")}
 className={cn(
 "flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1",
 inspectorTab === "layout"
 ? "bg-background text-foreground font-bold shadow-2xs"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <Layout className="size-3" />
 <span>Layout</span>
 </button>

 <button
 type="button"
 onClick={() => setInspectorTab("design")}
 className={cn(
 "flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1",
 inspectorTab === "design"
 ? "bg-background text-foreground font-bold shadow-2xs"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <Palette className="size-3" />
 <span>Estilo</span>
 </button>

 <button
 type="button"
 onClick={() => setInspectorTab("animation")}
 className={cn(
 "flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1",
 inspectorTab === "animation"
 ? "bg-background text-foreground font-bold shadow-2xs"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <Sliders className="size-3" />
 <span>Animação</span>
 </button>

 <button
 type="button"
 onClick={() => setInspectorTab("connection")}
 className={cn(
 "flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1",
 inspectorTab === "connection"
 ? "bg-background text-foreground font-bold shadow-2xs"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <Database className="size-3" />
 <span>Dados</span>
 </button>
 </div>

 {/* ── Conteúdo da Aba Ativa ── */}
 <ScrollArea className="flex-1 p-4">
 {/* ── 1. ABA CONTEÚDO (FIELDS DO MANIFEST OU AUTO-GENERATED) ── */}
 {inspectorTab === "content" && (
 <div className="space-y-4 pb-8">
 {/* Atalho Inteligente para Bloco Filho se for Seção ou Container */}
 {primaryContentChild && (
 <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 space-y-2">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-primary flex items-center gap-1.5">
 <Sliders className="size-3.5" />
 Conteúdo da Seção
 </span>
 <Badge variant="outline" className="text-[10px] bg-background">
 {childManifest?.name || primaryContentChild.block_type}
 </Badge>
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Esta seção contém o bloco <strong>{childManifest?.name || primaryContentChild.block_type}</strong>. Clique abaixo para editar títulos, imagens e cupons.
 </p>
 <Button
 type="button"
 size="sm"
 className="w-full h-8 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer shadow-xs"
 onClick={() => setSelectedNodeId(primaryContentChild.id)}
 >
 <Sliders className="size-3.5" />
 <span>Personalizar {childManifest?.name || "Conteúdo"}</span>
 </Button>
 </div>
 )}

 {manifestContentFields && manifestContentFields.length > 0 ? (
 manifestContentFields.map((field: any) => {
 const val = content[field.name] ?? field.defaultValue ?? field.default ?? "";

 // Campo Especial: Código de Cupom de Desconto
 if (field.name === "couponCode") {
 return (
 <div key={field.name} className="space-y-2 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 text-amber-500">
 <Tag className="size-3.5" />
 <span>{field.label || "Código do Cupom"}</span>
 </Label>
 <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-500 font-mono">
 1-Toque
 </Badge>
 </div>
 <Input
 value={val}
 onChange={(e) => handleContentChange(field.name, e.target.value.toUpperCase())}
 className="h-9 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-background border-amber-500/30"
 placeholder={field.placeholder || "EX: RELAMPAGO50"}
 />
 <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
 <span className="text-[10px] text-muted-foreground">Sugestões:</span>
 {["RELAMPAGO50", "PRIMEIRACOMPRA", "FRETEGRATIS", "VIP10"].map((sug) => (
 <button
 key={sug}
 type="button"
 onClick={() => handleContentChange(field.name, sug)}
 className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-background border border-border/80 hover:border-amber-500 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
 >
 {sug}
 </button>
 ))}
 </div>
 </div>
 );
 }

 // Campo Especial: Link de Destino / Hotpage / WhatsApp
 if (
 field.name === "targetLink" ||
 field.name === "buttonLink" ||
 field.name === "link"
 ) {
 return (
 <div key={field.name} className="space-y-2 p-3 rounded-2xl bg-primary/5 border border-primary/20">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 text-primary">
 <Link className="size-3.5" />
 <span>{field.label || "Link de Destino / Hotpage"}</span>
 </Label>
 <Badge variant="outline" className="text-[9px] border-primary/40 text-primary">
 Navegação
 </Badge>
 </div>
 <Input
 value={val}
 onChange={(e) => handleContentChange(field.name, e.target.value)}
 className="h-9 rounded-xl text-xs bg-background"
 placeholder={field.placeholder || "#produtos ou /campanhas"}
 />
 {/* Atalhos Rápidos de Destinos Internos e Hotpages */}
 <div className="space-y-1 pt-1">
 <span className="text-[10px] text-muted-foreground font-medium">Vincular a uma página:</span>
 <div className="flex items-center gap-1.5 flex-wrap">
 <button
 type="button"
 onClick={() => handleContentChange(field.name, "#produtos")}
 className="text-[10px] px-2 py-1 rounded-md bg-background border border-border/80 hover:border-primary text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
 >
 #produtos
 </button>
 {pages && pages.length > 0 ? (
 pages.map((p) => (
 <button
 key={p.id || p.slug}
 type="button"
 onClick={() => handleContentChange(field.name, p.slug === "home" ? "/" : `/${p.slug}`)}
 className="text-[10px] px-2 py-1 rounded-md bg-background border border-border/80 hover:border-primary text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
 >
 /{p.slug}
 </button>
 ))
 ) : (
 <>
 <button
 type="button"
 onClick={() => handleContentChange(field.name, "/campanhas/ofertas")}
 className="text-[10px] px-2 py-1 rounded-md bg-background border border-border/80 hover:border-primary text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
 >
 /campanhas
 </button>
 <button
 type="button"
 onClick={() => handleContentChange(field.name, "/turismo")}
 className="text-[10px] px-2 py-1 rounded-md bg-background border border-border/80 hover:border-primary text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
 >
 /turismo
 </button>
 </>
 )}
 </div>
 </div>
 </div>
 );
 }

 if (field.type === "string" || field.type === "text") {
 return (
 <div key={field.name} className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">
 {field.label || humanizeLabel(field.name)}
 </Label>
 <Input
 value={val}
 onChange={(e) => handleContentChange(field.name, e.target.value)}
 className="h-9 rounded-xl text-xs bg-background"
 placeholder={field.placeholder || ""}
 />
 </div>
 );
 }

 if (field.type === "textarea") {
 return (
 <div key={field.name} className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">
 {field.label || humanizeLabel(field.name)}
 </Label>
 <Textarea
 value={val}
 onChange={(e) => handleContentChange(field.name, e.target.value)}
 className="rounded-xl text-xs min-h-[70px] bg-background"
 placeholder={field.placeholder || ""}
 />
 </div>
 );
 }

 if (field.type === "image" || field.type === "media") {
 return (
 <div key={field.name} className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">
 {field.label || humanizeLabel(field.name)}
 </Label>
 <MediaUploader
 value={val}
 onChange={(url) => handleContentChange(field.name, url)}
 bucket="cms-media"
 />
 </div>
 );
 }

 if (field.type === "color") {
 return (
 <div key={field.name} className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">
 {field.label || humanizeLabel(field.name)}
 </Label>
 <ColorPicker
 value={val || "#09090b"}
 onChange={(c) => handleContentChange(field.name, c)}
 />
 </div>
 );
 }

 if (field.type === "boolean") {
 return (
 <div key={field.name} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/50">
 <Label className="text-xs font-bold text-foreground cursor-pointer">
 {field.label || humanizeLabel(field.name)}
 </Label>
 <Switch
 checked={!!val}
 onCheckedChange={(checked) => handleContentChange(field.name, checked)}
 />
 </div>
 );
 }

 if (field.type === "number") {
 return (
 <div key={field.name} className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">
 {field.label || humanizeLabel(field.name)}
 </Label>
 <Input
 type="number"
 value={val}
 onChange={(e) => handleContentChange(field.name, Number(e.target.value))}
 className="h-9 rounded-xl text-xs font-mono bg-background"
 />
 </div>
 );
 }

 if (field.type === "select" && field.options) {
 return (
 <div key={field.name} className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">
 {field.label || humanizeLabel(field.name)}
 </Label>
 <Select
 value={val || field.options[0]?.value}
 onValueChange={(newVal) => handleContentChange(field.name, newVal)}
 >
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {field.options.map((opt: any) => (
 <SelectItem key={opt.value} value={opt.value} className="text-xs">
 {opt.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 );
 }

 if (field.type === "array") {
 return (
 <div key={field.name} className="space-y-2 pt-1 border-t border-border/50">
 <Label className="text-xs font-bold text-foreground">
 {field.label || humanizeLabel(field.name)}
 </Label>
 <ArrayBuilder
 value={Array.isArray(val) ? val : []}
 onChange={(arr) => handleContentChange(field.name, arr)}
 arrayFields={field.arrayFields || field.array_fields || []}
 label={field.label}
 />
 </div>
 );
 }

 return null;
 })
 ) : (
 /* Fallback para nós com conteúdo dinâmico livre */
 <div className="space-y-3">
 {Object.keys(content).length === 0 && (
 <p className="text-xs text-muted-foreground italic text-center py-4">
 Este bloco utiliza dados dinâmicos do catálogo ou layout automático.
 </p>
 )}
 {Object.entries(content).map(([k, v]) => {
 if (typeof v === "boolean") {
 return (
 <div key={k} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/50">
 <Label className="text-xs font-bold text-foreground">{humanizeLabel(k)}</Label>
 <Switch checked={v} onCheckedChange={(c) => handleContentChange(k, c)} />
 </div>
 );
 }

 if (typeof v === "string" && (k.toLowerCase().includes("image") || k.toLowerCase().includes("cover") || k.toLowerCase().includes("banner"))) {
 return (
 <div key={k} className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">{humanizeLabel(k)}</Label>
 <MediaUploader value={v} onChange={(url) => handleContentChange(k, url)} bucket="cms-media" />
 </div>
 );
 }

 if (typeof v === "string" && v.length > 60) {
 return (
 <div key={k} className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">{humanizeLabel(k)}</Label>
 <Textarea value={v} onChange={(e) => handleContentChange(k, e.target.value)} className="rounded-xl text-xs min-h-[70px] bg-background" />
 </div>
 );
 }

 if (typeof v === "string" || typeof v === "number") {
 return (
 <div key={k} className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">{humanizeLabel(k)}</Label>
 <Input value={v} onChange={(e) => handleContentChange(k, e.target.value)} className="h-9 rounded-xl text-xs bg-background" />
 </div>
 );
 }

 if (Array.isArray(v)) {
 return (
 <div key={k} className="space-y-2 pt-2 border-t border-border/50">
 <Label className="text-xs font-bold text-foreground">{humanizeLabel(k)}</Label>
 <ArrayBuilder
 value={v}
 onChange={(arr) => handleContentChange(k, arr)}
 arrayFields={[
 { name: "title", label: "Título", type: "text" },
 { name: "subtitle", label: "Subtítulo", type: "text" },
 { name: "image_url", label: "Imagem", type: "image" },
 { name: "link", label: "Link", type: "text" },
 ]}
 />
 </div>
 );
 }

 return null;
 })}
 </div>
 )}
 </div>
 )}

 {/* ── 2. ABA LAYOUT, DIMENSÕES & DOCKING ── */}
 {inspectorTab === "layout" && (
 <div className="space-y-5 pb-8">
 <div className="space-y-3 p-3.5 rounded-2xl bg-muted/20 border border-border/60">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground uppercase tracking-wider">
 Dimensões (Size)
 </span>
 <Badge variant="outline" className="text-[10px]">
 {layout.sizingMode || "Fluid %"}
 </Badge>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <button
 type="button"
 onClick={() => handleLayoutChange("sizingMode", "fluid")}
 className={cn(
 "py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer",
 (layout.sizingMode || "fluid") === "fluid"
 ? "bg-primary text-primary-foreground font-bold shadow-2xs border-primary"
 : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
 )}
 >
 Fluido (100%)
 </button>
 <button
 type="button"
 onClick={() => handleLayoutChange("sizingMode", "fixed")}
 className={cn(
 "py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer",
 layout.sizingMode === "fixed"
 ? "bg-primary text-primary-foreground font-bold shadow-2xs border-primary"
 : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
 )}
 >
 Fixo (px)
 </button>
 </div>

 <div className="grid grid-cols-2 gap-2.5 pt-1">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Largura Máx</Label>
 <Select
 value={layout.maxWidth || "full"}
 onValueChange={(val) => handleLayoutChange("maxWidth", val)}
 >
 <SelectTrigger className="h-8 rounded-lg text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="full">100% (Full Width)</SelectItem>
 <SelectItem value="6xl">Padrão Recomendado (max-w-6xl)</SelectItem>
 <SelectItem value="4xl">Médio (max-w-4xl)</SelectItem>
 <SelectItem value="2xl">Compacto (max-w-2xl)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold">Espaçamento Y</Label>
 <Select
 value={layout.paddingY || "md"}
 onValueChange={(val) => handleLayoutChange("paddingY", val)}
 >
 <SelectTrigger className="h-8 rounded-lg text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">Sem Espaço (0px)</SelectItem>
 <SelectItem value="sm">Pequeno (16px)</SelectItem>
 <SelectItem value="md">Médio (32px)</SelectItem>
 <SelectItem value="lg">Amplo (64px)</SelectItem>
 <SelectItem value="xl">Super (96px)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 </div>

 <BuilderDockingMatrix
 value={layout.docking || "center"}
 onChange={(pos) => handleLayoutChange("docking", pos)}
 />
 </div>
 )}

 {/* ── 3. ABA ESTILO & DESIGN (WIX STUDIO CANONICAL) ── */}
 {inspectorTab === "design" && (
 <div className="space-y-4 pb-8">
 {/* Campos Declarados no Manifesto do Bloco (se houver) */}
 {manifestDesignFields && manifestDesignFields.length > 0 && (
 <div className="space-y-3 pb-3 border-b border-border/60">
 <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
 Cores Específicas do Bloco
 </span>
 {manifestDesignFields.map((df: any) => {
 const val = design[df.name] ?? df.default ?? "";
 if (df.type === "color") {
 return (
 <div key={df.name} className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">
 {df.label || humanizeLabel(df.name)}
 </Label>
 <ColorPicker
 value={val || "#ffffff"}
 onChange={(c) => handleDesignChange(df.name, c)}
 />
 </div>
 );
 }
 return null;
 })}
 </div>
 )}

 {/* Controles Universais de Superfície & Cor */}
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Cor de Fundo Principal</Label>
 <ColorPicker
 value={design.backgroundColor || "#ffffff"}
 onChange={(c) => handleDesignChange("backgroundColor", c)}
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Cor do Texto</Label>
 <ColorPicker
 value={design.textColor || "#09090b"}
 onChange={(c) => handleDesignChange("textColor", c)}
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Cor de Destaque (Accent)</Label>
 <ColorPicker
 value={design.accentColor || "#f59e0b"}
 onChange={(c) => handleDesignChange("accentColor", c)}
 />
 </div>

 {/* Configuração de Caixas / Cards Numéricos */}
 <div className="space-y-3 pt-3 border-t border-border/60">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
 Caixas Numéricas & Elementos
 </span>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Fundo das Caixas</Label>
 <ColorPicker
 value={design.boxColor || "#09090b"}
 onChange={(c) => handleDesignChange("boxColor", c)}
 />
 </div>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Cor dos Números / Dígitos</Label>
 <ColorPicker
 value={design.boxTextColor || "#ffffff"}
 onChange={(c) => handleDesignChange("boxTextColor", c)}
 />
 </div>
 </div>

 {/* Raio de Borda (Border Radius) */}
 <div className="space-y-1.5 pt-3 border-t border-border/60">
 <Label className="text-xs font-bold text-foreground">Arredondamento dos Cantos</Label>
 <Select
 value={design.borderRadius || "rounded-2xl"}
 onValueChange={(val) => handleDesignChange("borderRadius", val)}
 >
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="rounded-none">Reto (0px)</SelectItem>
 <SelectItem value="rounded-lg">Suave (8px)</SelectItem>
 <SelectItem value="rounded-2xl">Padrão Recomendado (16px)</SelectItem>
 <SelectItem value="rounded-2xl">Amplo (24px)</SelectItem>
 <SelectItem value="rounded-full">Pílula (Pill)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Imagem de Fundo (Cover) */}
 <div className="space-y-1.5 pt-3 border-t border-border/60">
 <Label className="text-xs font-bold text-foreground">Imagem de Fundo (Cover)</Label>
 <MediaUploader
 value={design.backgroundImage || ""}
 onChange={(url) => handleDesignChange("backgroundImage", url)}
 bucket="cms-media"
 />
 </div>

 {/* Estilo do Papel */}
 <div className="space-y-1.5 pt-3 border-t border-border/60">
 <Label className="text-xs font-bold text-foreground">Estilo do Papel / Fundo</Label>
 <Select
 value={design.surfaceVariant || "default"}
 onValueChange={(val) => handleDesignChange("surfaceVariant", val)}
 >
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="default">Padrão</SelectItem>
 <SelectItem value="none">Transparente</SelectItem>
 <SelectItem value="flat">Flat Sólido</SelectItem>
 <SelectItem value="muted">Muted Suave</SelectItem>
 <SelectItem value="zine">Zine (Rasgado)</SelectItem>
 <SelectItem value="ticket">Ticket (Ingresso)</SelectItem>
 <SelectItem value="journal">Journal (Papel Jornal)</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>
 )}

 {/* ── 4. ABA CONEXÃO DE DADOS (LIVE DATA BINDING) ── */}
 {inspectorTab === "animation" && (
 <div className="space-y-6">
 <div className="space-y-1">
 <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Sliders className="size-3.5 text-primary" />
 Motor de Animações & Scroll (Wix Studio Standard)
 </h4>
 <p className="text-[11px] text-muted-foreground">
 Microinterações fluidas a 60fps com aceleração de hardware e física Apple HIG.
 </p>
 </div>

 {/* Gatilho de Entrada */}
 <div className="space-y-2 p-3 rounded-2xl bg-muted/20 border border-border/50">
 <Label className="text-xs font-semibold">Gatilho de Entrada (Scroll Trigger)</Label>
 <Select
 value={(selectedNode.design_tokens as any)?.animation?.trigger || "fade_up"}
 onValueChange={(val) => {
 const currAnim = (selectedNode.design_tokens as any)?.animation || {};
 updateNode(selectedNode.id, "design_tokens", "animation", { ...currAnim, trigger: val });
 }}
 >
 <SelectTrigger className="h-9 text-xs rounded-xl bg-background">
 <SelectValue placeholder="Selecione uma animação" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">Nenhuma (Estático)</SelectItem>
 <SelectItem value="fade_up">Fade Up (Suave de Baixo)</SelectItem>
 <SelectItem value="zoom_in">Zoom In (Escala Suave)</SelectItem>
 <SelectItem value="slide_left">Slide da Esquerda</SelectItem>
 <SelectItem value="slide_right">Slide da Direita</SelectItem>
 <SelectItem value="parallax">Parallax de Profundidade</SelectItem>
 <SelectItem value="stagger">Staggered Reveal (Em Cascata)</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Duração & Velocidade */}
 <div className="space-y-2 p-3 rounded-2xl bg-muted/20 border border-border/50">
 <Label className="text-xs font-semibold">Velocidade da Transição</Label>
 <div className="grid grid-cols-3 gap-2">
 {[
 { id: "fast", label: "Rápida (0.3s)" },
 { id: "normal", label: "Apple (0.6s)" },
 { id: "slow", label: "Cinemática (1s)" },
 ].map((speed) => {
 const currentSpeed = (selectedNode.design_tokens as any)?.animation?.speed || "normal";
 return (
 <button
 key={speed.id}
 type="button"
 onClick={() => {
 const currAnim = (selectedNode.design_tokens as any)?.animation || {};
 updateNode(selectedNode.id, "design_tokens", "animation", { ...currAnim, speed: speed.id });
 }}
 className={cn(
 "py-2 px-2 rounded-xl text-[11px] font-semibold border transition-all",
 currentSpeed === speed.id
 ? "border-primary bg-primary/10 text-primary"
 : "border-border bg-background text-muted-foreground"
 )}
 >
 {speed.label}
 </button>
 );
 })}
 </div>
 </div>

 {/* Efeitos no Hover */}
 <div className="space-y-2 p-3 rounded-2xl bg-muted/20 border border-border/50">
 <Label className="text-xs font-semibold">Microinteração no Hover (Cursor)</Label>
 <div className="grid grid-cols-2 gap-2">
 {[
 { id: "none", label: "Nenhum" },
 { id: "lift", label: "Elevação 3D (Lift)" },
 { id: "scale", label: "Zoom Sutil (1.02x)" },
 { id: "glow", label: "Brilho Suave (Glow)" },
 ].map((hov) => {
 const currentHov = (selectedNode.design_tokens as any)?.animation?.hover || "none";
 return (
 <button
 key={hov.id}
 type="button"
 onClick={() => {
 const currAnim = (selectedNode.design_tokens as any)?.animation || {};
 updateNode(selectedNode.id, "design_tokens", "animation", { ...currAnim, hover: hov.id });
 }}
 className={cn(
 "py-2 px-3 rounded-xl text-xs font-semibold border text-left transition-all",
 currentHov === hov.id
 ? "border-primary bg-primary/10 text-primary"
 : "border-border bg-background text-muted-foreground"
 )}
 >
 {hov.label}
 </button>
 );
 })}
 </div>
 </div>
 </div>
 )}

 {inspectorTab === "connection" && (
 <div className="space-y-5 pb-8">
 <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 space-y-3">
 <div className="flex items-center gap-2">
 <Database className="size-4 text-primary" />
 <span className="text-xs font-bold text-foreground">Fonte de Dados Dinâmica</span>
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Conecte este bloco ao banco de dados para sincronizar produtos, cupons, hotpages, avaliações ou informações da loja em tempo real.
 </p>

 <div className="space-y-2">
 <Label className="text-xs font-bold">Fonte</Label>
 <Select
 value={dataBindings.source || "none"}
 onValueChange={(val) => handleBindingChange(val)}
 >
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="none">Nenhuma (Conteúdo Manual Estático)</SelectItem>
 <SelectItem value="active_coupon">Cupom Promocional Ativo da Loja</SelectItem>
 <SelectItem value="hotpage_campaign">Hotpage / Campanha de Alta Conversão</SelectItem>
 <SelectItem value="dynamic_products">Produtos Mais Vendidos (Hits)</SelectItem>
 <SelectItem value="latest_products">Últimos Lançamentos</SelectItem>
 <SelectItem value="product_collection">Coleção Específica</SelectItem>
 <SelectItem value="destinations_catalog">Destinos Turísticos & Pacotes</SelectItem>
 <SelectItem value="dynamic_reviews">Avaliações de Clientes (Reviews)</SelectItem>
 <SelectItem value="store_profile">Dados da Loja (Nome, Logo, Capa)</SelectItem>
 <SelectItem value="store_contact">Canais de Contato (WhatsApp / Endereço)</SelectItem>
 <SelectItem value="store_hours">Horários de Funcionamento em Tempo Real</SelectItem>
 <SelectItem value="marketing_banners">Banners Promocionais Cadastrados</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Vínculo 1: Cupom Promocional Ativo */}
 {dataBindings.source === "active_coupon" && (
 <div className="space-y-3 pt-3 border-t border-border/50">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
 <Tag className="size-3.5" />
 <span>Cupom Selecionado</span>
 </Label>
 <Input
 value={dataBindings.coupon_code || content.couponCode || "RELAMPAGO50"}
 onChange={(e) => {
 const code = e.target.value.toUpperCase();
 handleBindingChange("active_coupon", { coupon_code: code });
 handleContentChange("couponCode", code);
 }}
 className="h-9 rounded-xl text-xs font-mono font-bold uppercase tracking-wider bg-background"
 placeholder="EX: RELAMPAGO50"
 />
 </div>
 <p className="text-[10px] text-muted-foreground">
 Ao conectar o cupom, qualquer clique no bloco copiará o código automaticamente.
 </p>
 </div>
 )}

 {/* Vínculo 2: Hotpage / Página de Destino da Campanha */}
 {dataBindings.source === "hotpage_campaign" && (
 <div className="space-y-3 pt-3 border-t border-border/50">
 <div className="space-y-1">
 <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
 <FileText className="size-3.5" />
 <span>Selecione a Hotpage ou Página</span>
 </Label>
 <Select
 value={dataBindings.target_page || content.targetLink || ""}
 onValueChange={(slug) => {
 handleBindingChange("hotpage_campaign", { target_page: slug });
 handleContentChange("targetLink", slug);
 }}
 >
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue placeholder="Escolha a página de destino..." />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="#produtos" className="text-xs">
 Vitrine Principal (#produtos)
 </SelectItem>
 {pages && pages.length > 0 ? (
 pages.map((p) => (
 <SelectItem key={p.id || p.slug} value={p.slug === "home" ? "/" : `/${p.slug}`} className="text-xs">
 {p.title} ({p.slug === "home" ? "/" : `/${p.slug}`})
 </SelectItem>
 ))
 ) : (
 <>
 <SelectItem value="/campanhas/ofertas" className="text-xs">
 Hotpage: Ofertas Relâmpago (/campanhas/ofertas)
 </SelectItem>
 <SelectItem value="/turismo" className="text-xs">
 Página de Turismo (/turismo)
 </SelectItem>
 </>
 )}
 </SelectContent>
 </Select>
 </div>
 <p className="text-[10px] text-muted-foreground">
 O botão de ação principal do bloco direcionará os visitantes diretamente para esta hotpage.
 </p>
 </div>
 )}

 {/* Vínculo 3: Coleção Específica */}
 {dataBindings.source === "product_collection" && (
 <div className="space-y-2 pt-2 border-t border-border/50">
 <Label className="text-xs font-bold">Selecione a Coleção</Label>
 <Select
 value={dataBindings.collection_slug || ""}
 onValueChange={(slug) => handleBindingChange("product_collection", { collection_slug: slug })}
 >
 <SelectTrigger className="h-9 rounded-xl text-xs bg-background">
 <SelectValue placeholder="Selecione uma coleção..." />
 </SelectTrigger>
 <SelectContent>
 {collections.length === 0 ? (
 <SelectItem value="sem-colecao" disabled>Nenhuma coleção cadastrada</SelectItem>
 ) : (
 collections.map((c: any) => (
 <SelectItem key={c.id || c.slug} value={c.slug} className="text-xs">
 {c.title || c.name}
 </SelectItem>
 ))
 )}
 </SelectContent>
 </Select>
 </div>
 )}

 {dataBindings.source && dataBindings.source !== "none" && (
 <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1.5">
 <CheckCircle2 className="size-3.5 shrink-0" />
 <span>Conectado em tempo real com o banco de dados.</span>
 </div>
 )}
 </div>
 </div>
 )}
 </ScrollArea>
 </aside>
 );
}

export default BuilderInspector;
