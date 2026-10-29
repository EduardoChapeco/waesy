import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Laptop, Tablet, Smartphone, Undo2, Redo2, LayoutTemplate, ExternalLink, Save, CheckCircle2, Layers, Eye, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface BuilderTopBarProps {
 document: any;
 version: any;
 viewport: "desktop" | "tablet" | "mobile" | "story" | string;
 setViewport: (vp: any) => void;
 undo: () => void;
 redo: () => void;
 canUndo: boolean;
 canRedo: boolean;
 previewUrl?: string | null;
 setIsTemplateModalOpen: (open: boolean) => void;
 handleSave: () => void;
 handlePublish: () => void;
 isSaving: boolean;
 isPublishing: boolean;
 onOpenCodeExplorer?: () => void;
 onOpenAppMarket?: () => void;
}

export function BuilderTopBar({
 document,
 version,
 viewport,
 setViewport,
 undo,
 redo,
 canUndo,
 canRedo,
 previewUrl,
 setIsTemplateModalOpen,
 handleSave,
 handlePublish,
 isSaving,
 isPublishing,
 onOpenCodeExplorer,
 onOpenAppMarket,
}: BuilderTopBarProps) {
 const navigate = useNavigate();

 const handleExit = () => {
 if (document?.document_type === "storefront") {
 navigate({ to: "/workspace/marketing/vitrine" });
 } else if (document?.document_type === "biolink") {
 navigate({ to: "/workspace/cms/bio" });
 } else {
 navigate({ to: "/workspace/cms/paginas" });
 }
 };

 const isStorefront = document?.document_type === "storefront";
 const publicLink = previewUrl || (isStorefront ? "/perfil-da-loja" : `/paginas/${document?.slug || ""}`);

 return (
 <header className="flex-none h-14 bg-card border-b border-border/80 flex items-center justify-between px-4 gap-4 select-none z-30 relative shadow-2xs">
 {/* ── Esquerda: Voltar + Título & Status do Documento ── */}
 <div className="flex items-center gap-3 min-w-0">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={handleExit}
 className="h-9 px-3 rounded-lg text-xs font-semibold gap-2 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
 >
 <ArrowLeft className="size-4" />
 <span className="hidden sm:inline">Voltar</span>
 </Button>

 <div className="h-5 w-px bg-border/80 hidden sm:block shrink-0" />

 <div className="flex flex-col min-w-0">
 <div className="flex items-center gap-2">
 <span className="text-sm font-bold text-foreground truncate max-w-45 sm:max-w-65">
 {document?.title || (isStorefront ? "Vitrine Principal da Loja" : "Página sem Título")}
 </span>
 <Badge
 variant="outline"
 className={cn(
 "text-2xs font-bold px-2 py-0 rounded-md",
 version?.status === "published"
 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
 : "bg-amber-500/10 text-amber-600 border-amber-500/20"
 )}
 >
 {version?.status === "published" ? "Publicada" : "Rascunho"} v{version?.version_number ?? 1}
 </Badge>
 </div>
 <span className="text-2xs text-muted-foreground font-mono hidden sm:inline">
 Slug: /{document?.slug || "home"}
 </span>
 </div>
 </div>

 {/* ── Centro: Seletor de Viewport / Responsividade (Apple HIG) ── */}
 <div className="flex items-center bg-muted/60 p-1 rounded-lg border border-border/60">
 <button
 type="button"
 onClick={() => setViewport("tablet")}
 title="Modo Tablet (768px)"
 className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", 
 "h-8 px-3 rounded-lg flex items-center gap-2 text-xs font-semibold transition-colors duration-200 cursor-pointer",
 viewport === "tablet"
 ? "bg-background text-foreground shadow-2xs font-bold"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <Tablet className="size-3.5" />
 <span className="hidden md:inline">Tablet</span>
 </button>

 <button
 type="button"
 onClick={() => setViewport("desktop")}
 title="Modo Desktop (1440px)"
 className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", 
 "h-8 px-3 rounded-lg flex items-center gap-2 text-xs font-semibold transition-colors duration-200 cursor-pointer",
 viewport === "desktop"
 ? "bg-background text-foreground shadow-2xs font-bold"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <Laptop className="size-3.5" />
 <span className="hidden md:inline">Desktop</span>
 </button>

 <button
 type="button"
 onClick={() => setViewport("mobile")}
 title="Modo Mobile (390px)"
 className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", 
 "h-8 px-3 rounded-lg flex items-center gap-2 text-xs font-semibold transition-colors duration-200 cursor-pointer",
 viewport === "mobile"
 ? "bg-background text-foreground shadow-2xs font-bold"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <Smartphone className="size-3.5" />
 <span className="hidden md:inline">Mobile</span>
 </button>

 <button
 type="button"
 onClick={() => setViewport("native_app")}
 title="Modo App Nativo (PWA / iOS / Android)"
 className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", 
 "h-8 px-3 rounded-lg flex items-center gap-2 text-xs font-semibold transition-colors duration-200 cursor-pointer",
 viewport === "native_app"
 ? "bg-background text-primary shadow-2xs font-bold"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 <Smartphone className="size-3.5 text-primary" />
 <span className="hidden md:inline">App Nativo</span>
 </button>
 </div>

 {/* ── Direita: Histórico, Pré-visualização e Ações de Salvamento ── */}
 <div className="flex items-center gap-2">
 {/* Undo / Redo */}
 <div className="flex items-center bg-muted/40 p-1 rounded-lg border border-border/40 hidden sm:flex">
 <button
 type="button"
 onClick={undo}
 disabled={!canUndo}
 title="Desfazer (Ctrl+Z)"
 className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <Undo2 className="size-4" />
 </button>
 <button
 type="button"
 onClick={redo}
 disabled={!canRedo}
 title="Refazer (Ctrl+Y)"
 className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
 >
 <Redo2 className="size-4" />
 </button>
 </div>

 {/* Omni Apps Market */}
 {onOpenAppMarket && (
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={onOpenAppMarket}
 className="h-9 px-3 rounded-lg text-xs font-semibold gap-2 hidden xl:inline-flex cursor-pointer border-primary/30 text-primary hover:bg-primary/10"
 >
 <LayoutTemplate className="size-3.5" />
 <span>Apps</span>
 </Button>
 )}

 {/* Explorador de Código TanStack */}
 {onOpenCodeExplorer && (
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={onOpenCodeExplorer}
 className="h-9 px-3 rounded-lg text-xs font-semibold gap-2 hidden lg:inline-flex cursor-pointer"
 >
 <ExternalLink className="size-3.5 text-muted-foreground" />
 <span>Código</span>
 </Button>
 )}

 {/* Trocar Tema / Template */}
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsTemplateModalOpen(true)}
 className="h-9 px-3 rounded-lg text-xs font-semibold gap-2 hidden lg:inline-flex cursor-pointer"
 >
 <Layers className="size-3.5 text-primary" />
 <span>Modelos</span>
 </Button>

 {/* Ver Loja Pública */}
 <Button
 asChild
 variant="outline"
 size="sm"
 className="h-9 px-3 rounded-lg text-xs font-semibold gap-2 hidden md:inline-flex cursor-pointer"
 >
 <a href={publicLink} target="_blank" rel="noopener noreferrer">
 <Eye className="size-3.5 text-muted-foreground" />
 <span>Ver</span>
 </a>
 </Button>

 {/* Salvar Rascunho */}
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleSave}
 disabled={isSaving || isPublishing}
 className="h-9 px-4 rounded-lg text-xs font-bold gap-2 cursor-pointer"
 >
 {isSaving ? (
 <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
 ) : (
 <Save className="size-3.5" />
 )}
 <span>{isSaving ? "Salvando..." : "Salvar"}</span>
 </Button>

 {/* Publicar Vitrine */}
 <Button
 type="button"
 size="sm"
 onClick={handlePublish}
 disabled={isPublishing || isSaving}
 className="h-9 px-4 rounded-lg text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
 >
 {isPublishing ? (
 <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
 ) : (
 <CheckCircle2 className="size-3.5" />
 )}
 <span>{isPublishing ? "Publicando..." : "Publicar"}</span>
 </Button>
 </div>
 </header>
 );
}
