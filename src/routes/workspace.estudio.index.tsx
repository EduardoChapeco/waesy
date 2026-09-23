import { createFileRoute, useNavigate, isRedirect } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
 Type,
 Square,
 Image as ImageIcon,
 Palette,
 Award,
 Layers,
 Save,
 Download,
 Play,
 Pause,
 Plus,
 Trash2,
 Copy,
 Undo2,
 Redo2,
 ZoomIn,
 ZoomOut,
 Video,
 Film,
 Music,
 Scissors,
 ArrowLeft,
 Smartphone,
 Check,
 Loader2,
 ChevronRight,
 Maximize2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
 type StudioElement,
 type SlideBackground,
 type StudioAspectRatio,
 STUDIO_DIMENSIONS,
 DEFAULT_TEXT_PROPERTIES,
 DEFAULT_SHAPE_PROPERTIES,
} from "@/types/studio";
import { StudioCanvas } from "@/components/studio/studio-canvas";
import {
 listStudioProjects,
 listStudioTemplates,
 saveStudioProject,
 getStudioProjectById,
 type StudioProjectDTO,
 type StudioTemplateDTO,
} from "@/services/studio.functions";
import { getProductById } from "@/services/admin-catalog.functions";
import { exportElementAsImage } from "@/lib/pdf-export";

export const Route = createFileRoute("/workspace/estudio/")({
 head: () => ({ meta: [{ title: "Waesy Studio — Criação & Vídeo | Workspace Waesy" }] }),
 validateSearch: (search: Record<string, unknown>) => {
 return {
 projectId: search.projectId as string | undefined,
 productId: search.productId as string | undefined,
 mode: (search.mode as "graphic" | "video") || "graphic",
 };
 },
 loader: async () => {
   try {
    // Studio desativado no MVP — apenas platform_admin pode acessar
    const { getUserSession } = await import("@/services/auth.functions");
    const session = await getUserSession().catch(() => null);
    const role = session?.role || session?.user?.user_metadata?.role;
    if (role !== "platform_admin" && role !== "master") {
      const { redirect } = await import("@tanstack/react-router");
      throw redirect({ to: "/workspace" });
    }
    return {};
   } catch (err) {
      if (isRedirect(err)) throw err;
     console.error("[loader:workspace.estudio.index] Unhandled loader error:", err);
     return null as any;
    }
  },
 component: StudioWorkspacePage,
});

function StudioWorkspacePage() {
 const navigate = useNavigate();
 const searchParams = Route.useSearch();

 // Mode: Graphic Studio vs Video Studio
 const [studioMode, setStudioMode] = useState<"graphic" | "video">(searchParams.mode || "graphic");
 const [activeTab, setActiveTab] = useState<"templates" | "text" | "elements" | "media" | "background" | "audio">("templates");

 // Project Meta
 const [projectId, setProjectId] = useState<string | undefined>(searchParams.projectId);
 const [projectTitle, setProjectTitle] = useState("Meu Projeto Studio");
 const [aspectRatio, setAspectRatio] = useState<StudioAspectRatio>("1:1");
 const [zoom, setZoom] = useState(1);
 const [isExporting, setIsExporting] = useState(false);

 // Graphic Canvas State
 const [background, setBackground] = useState<SlideBackground>({
 type: "color",
 value: "#0F172A",
 });
 const [elements, setElements] = useState<StudioElement[]>([
 {
 id: "el-title",
 type: "text",
 layer: 7,
 zIndex: 1,
 position: { x: 50, y: 35 },
 size: { width: 85, height: 20 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 ...DEFAULT_TEXT_PROPERTIES,
 content: "SUPER OFERTA DA SEMANA",
 color: "#FACC15",
 },
 },
 ]);
 const [selectedElementId, setSelectedElementId] = useState<string | null>("el-title");

 // Video Studio State
 const [isPlaying, setIsPlaying] = useState(false);
 const [currentTime, setCurrentTime] = useState(0);
 const [videoDuration, setVideoDuration] = useState(15);
  const [videoTracks, setVideoTracks] = useState([
    { id: "tr-video", name: "Vídeo Principal", type: "video", clips: [{ id: "c1", start: 0, end: 10, duration: 10, name: "Clipe 01.mp4" }] },
    { id: "tr-audio", name: "Trilha Sonora", type: "audio", clips: [{ id: "c2", start: 0, end: 15, duration: 15, name: "Lo-Fi Chill Beat.mp3" }] },
    { id: "tr-text", name: "Texto / Legendas", type: "text", clips: [{ id: "c3", start: 2, end: 7, duration: 5, name: "Legenda Oferta" }] },
  ]);

 const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>("all");

 // Queries
 const { data: templates } = useQuery({
 queryKey: ["studio-templates", studioMode],
 queryFn: () => listStudioTemplates({ data: { template_type: studioMode } }),
 });

 const filteredTemplates = useMemo(() => {
 if (!templates) return [];
 if (selectedTemplateCategory === "all") return templates;
 return templates.filter((t) => t.category === selectedTemplateCategory);
 }, [templates, selectedTemplateCategory]);

 const { data: userProjects, refetch: refetchProjects } = useQuery({
 queryKey: ["studio-projects", studioMode],
 queryFn: () => listStudioProjects({ data: { project_type: studioMode } }),
 });

 // Mutação para salvar projeto
 const saveMutation = useMutation({
 mutationFn: () =>
 saveStudioProject({
 data: {
 id: projectId,
 title: projectTitle,
 project_type: studioMode,
 aspect_ratio: aspectRatio,
 canvas_data:
 studioMode === "graphic"
 ? { background, elements, aspectRatio }
 : { tracks: videoTracks, duration: videoDuration, aspectRatio },
 },
 }),
 onSuccess: (saved) => {
 setProjectId(saved.id);
 refetchProjects();
 toast.success("Projeto salvo com sucesso no banco de dados!");
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao salvar projeto.");
 },
 });

 // Selected element helper
 const selectedElement = useMemo(() => {
 return elements.find((el) => el.id === selectedElementId) || null;
 }, [elements, selectedElementId]);

 const handleAddText = () => {
 const newEl: StudioElement = {
 id: `text-${Date.now()}`,
 type: "text",
 layer: 7,
 zIndex: elements.length + 1,
 position: { x: 50, y: 50 },
 size: { width: 75, height: 15 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 ...DEFAULT_TEXT_PROPERTIES,
 content: "Novo Texto Editável",
 fontSize: 32,
 },
 };
 setElements((prev) => [...prev, newEl]);
 setSelectedElementId(newEl.id);
 toast.success("Texto adicionado ao canvas!");
 };

 const handleAddShape = (shapeType: "rectangle" | "circle" | "badge") => {
 const newEl: StudioElement = {
 id: `shape-${Date.now()}`,
 type: "shape",
 layer: 2,
 zIndex: elements.length + 1,
 position: { x: 50, y: 50 },
 size: { width: 30, height: 30 },
 rotation: 0,
 opacity: 1,
 locked: false,
 visible: true,
 properties: {
 ...DEFAULT_SHAPE_PROPERTIES,
 shapeType,
 fill: shapeType === "badge" ? "#EF4444" : "#3B82F6",
 borderRadius: shapeType === "circle" ? 999 : 16,
 },
 };
 setElements((prev) => [...prev, newEl]);
 setSelectedElementId(newEl.id);
 toast.success("Forma adicionada!");
 };

 const handleApplyTemplate = (template: StudioTemplateDTO) => {
 if (template.canvas_data?.background) {
 setBackground(template.canvas_data.background);
 }
 if (template.canvas_data?.elements) {
 setElements(template.canvas_data.elements);
 }
 if (template.aspect_ratio) {
 setAspectRatio(template.aspect_ratio as StudioAspectRatio);
 }
 setProjectTitle(template.title);
 toast.success(`Template "${template.title}" aplicado!`);
 };

 const handleExport = async () => {
 if (studioMode === "video") {
 toast.info("A renderização de vídeo MP4 no navegador está em processamento.");
 return;
 }
 try {
 setIsExporting(true);
 const safeTitle = projectTitle.toLowerCase().replace(/[^a-z0-9]/g, "_");
 await exportElementAsImage("studio-canvas-stage", `${safeTitle || "arte_studio"}.png`);
 toast.success("Arte exportada com sucesso em PNG de alta definição!");
 } catch (err: any) {
      if (isRedirect(err)) throw err;
 toast.error(err?.message || "Erro ao exportar arte.");
 } finally {
 setIsExporting(false);
 }
 };

 return (
 <div className="fixed inset-0 w-screen h-screen z-50 flex flex-col bg-background text-foreground overflow-hidden font-sans select-none">
 {/* ── 1. HEADER DO ESTÚDIO FULLPAGE: Título + Modos + Salvar/Exportar ── */}
 <header className="h-14 border-b border-border/80 bg-card/95 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20">
 <div className="flex items-center gap-2 sm:gap-3">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => navigate({ to: "/workspace" })}
 className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80"
 title="Voltar ao Workspace"
 >
 <ArrowLeft className="size-4" />
 <span className="hidden sm:inline">Workspace</span>
 </Button>

 <span className="hidden sm:inline text-muted-foreground/50 text-xs">/</span>

 <div className="flex items-center gap-2">
 <Input
 value={projectTitle}
 onChange={(e) => setProjectTitle(e.target.value)}
 className="h-8 px-2 text-xs font-black bg-transparent border-transparent hover:border-border/60 focus:border-border rounded-lg max-w-[180px] sm:max-w-[260px]"
 />
 <Badge variant="outline" className="text-[10px] font-mono uppercase font-bold">
 {studioMode === "graphic" ? "Design Gráfico" : "Vídeo 4K"}
 </Badge>
 </div>

 {/* Switcher de Modo (Design Gráfico vs Vídeo Studio) */}
 <div className="hidden sm:flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/60 ml-2">
 <button
 type="button"
 onClick={() => setStudioMode("graphic")}
 className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
 studioMode === "graphic"
 ? "bg-foreground text-background"
 : "text-muted-foreground hover:text-foreground"
 }`}
 >
 <Palette className="size-3.5" />
 <span>Design Gráfico</span>
 </button>
 <button
 type="button"
 onClick={() => setStudioMode("video")}
 className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
 studioMode === "video"
 ? "bg-foreground text-background"
 : "text-muted-foreground hover:text-foreground"
 }`}
 >
 <Video className="size-3.5" />
 <span>Video Studio</span>
 </button>
 </div>
 </div>

 {/* Ações Direitas (Zoom, Salvar e Exportar) */}
 <div className="flex items-center gap-2">
 {studioMode === "graphic" && (
 <div className="hidden md:flex items-center gap-1 bg-muted/40 px-2 py-0.5 rounded-xl border border-border/60 text-xs font-mono">
 <button
 type="button"
 onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
 className="p-1 hover:text-foreground text-muted-foreground"
 >
 <ZoomOut className="size-3.5" />
 </button>
 <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
 <button
 type="button"
 onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
 className="p-1 hover:text-foreground text-muted-foreground"
 >
 <ZoomIn className="size-3.5" />
 </button>
 </div>
 )}

 <Button
 size="sm"
 variant="outline"
 disabled={saveMutation.isPending}
 onClick={() => saveMutation.mutate()}
 className="h-8 rounded-xl font-bold text-xs gap-1.5"
 >
 {saveMutation.isPending ? (
 <Loader2 className="size-3.5 animate-spin" />
 ) : (
 <Save className="size-3.5" />
 )}
 <span>Salvar</span>
 </Button>

 <Button
 size="sm"
 disabled={isExporting}
 onClick={handleExport}
 className="h-8 rounded-xl font-bold text-xs bg-foreground text-background hover:bg-foreground/90 gap-1.5"
 >
 {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
 <span>{isExporting ? "Exportando..." : "Exportar"}</span>
 </Button>
 </div>
 </header>

 {/* ── 2. CORPO PRINCIPAL DE 3 COLUNAS (TOOLBAR -> VIEWPORT -> INSPECTOR) ── */}
 <div className="flex-1 flex min-h-0 w-full overflow-hidden">
 {/* COLUNA 1: Toolbar Lateral de Ferramentas & Ativos */}
 <div className="w-64 border-r border-border/80 bg-card flex flex-col shrink-0 overflow-y-auto no-scrollbar p-4 space-y-4">
 <div className="flex items-center justify-between border-b border-border/60 pb-2">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
 Ferramentas
 </span>
 </div>

 {/* Seletor de Aspect Ratio */}
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Formato do Canvas</Label>
 <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
 {(["1:1", "4:5", "9:16", "16:9", "1.91:1"] as StudioAspectRatio[]).map((ar) => (
 <button
 key={ar}
 type="button"
 onClick={() => setAspectRatio(ar)}
 className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-all ${
 aspectRatio === ar
 ? "bg-foreground text-background border-foreground"
 : "bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground"
 }`}
 >
 {ar}
 </button>
 ))}
 </div>
 </div>

 {/* Ações de Inserção Gráfica */}
 {studioMode === "graphic" ? (
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Inserir Elementos</Label>
 <Button
 type="button"
 variant="outline"
 onClick={handleAddText}
 className="w-full h-9 rounded-xl font-semibold text-xs justify-start gap-2"
 >
 <Type className="size-4 text-primary" />
 <span>Adicionar Texto</span>
 </Button>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => handleAddShape("rectangle")}
 className="h-9 rounded-xl font-semibold text-xs gap-1.5"
 >
 <Square className="size-3.5 text-info" />
 <span>Retângulo</span>
 </Button>
 <Button
 type="button"
 variant="outline"
 onClick={() => handleAddShape("badge")}
 className="h-9 rounded-xl font-semibold text-xs gap-1.5"
 >
 <Award className="size-3.5 text-primary" />
 <span>Selo / Badge</span>
 </Button>
 </div>
 </div>
 ) : (
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Trilhas de Vídeo</Label>
 <input
 type="file"
 id="studio-video-file-input"
 accept="video/mp4,video/webm"
 className="hidden"
 onChange={(e) => {
 const f = e.target.files?.[0];
 if (f) {
 setVideoTracks((prev) => [
 ...prev,
 {
 id: `track-${Date.now()}`,
 name: f.name.slice(0, 16),
 type: "video",
 clips: [{ id: `clip-${Date.now()}`, name: f.name, start: 0, end: 15, duration: 15 }],
 },
 ]);
 toast.success(`Vídeo "${f.name}" importado para a timeline!`);
 }
 }}
 />
 <input
 type="file"
 id="studio-audio-file-input"
 accept="audio/*"
 className="hidden"
 onChange={(e) => {
 const f = e.target.files?.[0];
 if (f) {
 setVideoTracks((prev) => [
 ...prev,
 {
 id: `track-${Date.now()}`,
 name: f.name.slice(0, 16),
 type: "audio",
 clips: [{ id: `clip-${Date.now()}`, name: f.name, start: 0, end: 15, duration: 15 }],
 },
 ]);
 toast.success(`Áudio "${f.name}" adicionado à trilha sonora!`);
 }
 }}
 />
 <Button
 type="button"
 variant="outline"
 onClick={() => document.getElementById('studio-video-file-input')?.click()}
 className="w-full h-9 rounded-xl font-semibold text-xs justify-start gap-2"
 >
 <Film className="size-4 text-primary" />
 <span>Importar Vídeo (MP4)</span>
 </Button>
 <Button
 type="button"
 variant="outline"
 onClick={() => document.getElementById('studio-audio-file-input')?.click()}
 className="w-full h-9 rounded-xl font-semibold text-xs justify-start gap-2"
 >
 <Music className="size-4 text-emerald-500" />
 <span>Adicionar Áudio</span>
 </Button>
 </div>
 )}

 {/* Templates Oficiais do Banco de Dados */}
 <div className="space-y-2 pt-2 border-t border-border/60">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold text-foreground">Modelos Prontos</Label>
 <span className="text-[10px] font-mono text-muted-foreground">{filteredTemplates.length} disponíveis</span>
 </div>

 {/* Filtro Rápido por Nicho */}
 <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
 {[
 { id: "all", label: "Todos" },
 { id: "veiculos", label: "Veículos" },
 { id: "imoveis", label: "Imóveis" },
 { id: "gastronomia", label: "Gastro" },
 { id: "turismo", label: "Turismo" },
 ].map((cat) => (
 <button
 key={cat.id}
 type="button"
 onClick={() => setSelectedTemplateCategory(cat.id)}
 className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${
 selectedTemplateCategory === cat.id
 ? "bg-primary text-primary-foreground"
 : "bg-muted/60 text-muted-foreground hover:text-foreground"
 }`}
 >
 {cat.label}
 </button>
 ))}
 </div>

 <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar pr-1">
 {filteredTemplates.map((tpl) => (
 <div
 key={tpl.id}
 onClick={() => handleApplyTemplate(tpl)}
 className="p-2.5 rounded-xl border border-border/70 bg-card hover:bg-muted/50 cursor-pointer transition-all space-y-1"
 >
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground truncate">{tpl.title}</span>
 <Badge variant="secondary" className="text-[9px] font-mono uppercase">
 {tpl.aspect_ratio}
 </Badge>
 </div>
 <span className="text-[10px] text-muted-foreground uppercase font-semibold">
 {tpl.category}
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* COLUNA 2: Canvas Central / Video Player Viewport */}
 <div className="flex-1 flex flex-col min-h-0 bg-muted/20 relative overflow-hidden">
 {studioMode === "graphic" ? (
 <div className="flex-1 flex items-center justify-center overflow-auto p-4">
 <StudioCanvas
 aspectRatio={aspectRatio}
 background={background}
 elements={elements}
 selectedElementId={selectedElementId}
 onSelectElement={setSelectedElementId}
 onUpdateElementPosition={(id: string, pos: { x: number; y: number }) => {
 setElements((prev) =>
 prev.map((el) => (el.id === id ? { ...el, position: pos } : el)),
 );
 }}
 zoom={zoom}
 />
 </div>
 ) : (
 <div className="flex-1 flex flex-col min-h-0">
 {/* Player de Vídeo */}
 <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950">
 <div
 className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center"
 style={{
 width: aspectRatio === "9:16" ? "320px" : "540px",
 height: aspectRatio === "9:16" ? "560px" : "300px",
 }}
 >
 <Film className="size-12 text-zinc-600 mb-2" />
 <p className="text-xs font-mono text-zinc-400">Vídeo Preview (4K Canvas)</p>
 <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-md p-2 rounded-xl flex items-center justify-between text-xs font-mono text-white">
 <span>{currentTime.toFixed(1)}s</span>
 <span>/ {videoDuration}s</span>
 </div>
 </div>
 </div>

 {/* Multi-Track Timeline */}
 <div className="h-48 border-t border-border/80 bg-card p-4 flex flex-col justify-between shrink-0">
 <div className="flex items-center justify-between pb-2 border-b border-border/60">
 <div className="flex items-center gap-2">
 <Button
 size="icon"
 variant="outline"
 onClick={() => setIsPlaying(!isPlaying)}
 className="size-8 rounded-xl font-bold"
 >
 {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
 </Button>
 <span className="text-xs font-mono font-bold text-foreground">
 00:{currentTime.toString().padStart(2, "0")} / 00:{videoDuration}
 </span>
 </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setVideoTracks((prev) =>
                  prev.map((tr, idx) => {
                    if (idx === 0 && tr.clips.length > 0) {
                      const first = tr.clips[0];
                      const splitTime = Math.max(1, Math.min(currentTime, first.duration - 1));
                      return {
                        ...tr,
                        clips: [
                          { id: `${first.id}-a`, name: `${first.name} (P1)`, start: first.start, end: first.start + splitTime, duration: splitTime },
                          { id: `${first.id}-b`, name: `${first.name} (P2)`, start: first.start + splitTime, end: first.end, duration: Math.max(1, first.duration - splitTime) },
                        ],
                      };
                    }
                    return tr;
                  })
                );
                toast.success(`Trilha dividida aos ${currentTime.toFixed(1)}s`);
              }}
              className="h-8 text-xs gap-1.5"
            >
              <Scissors className="size-3.5" />
              <span>Dividir (Split)</span>
            </Button>
 </div>

 {/* Trilhas Visuais */}
 <div className="space-y-1.5 overflow-y-auto no-scrollbar py-1">
 {videoTracks.map((tr) => (
 <div
 key={tr.id}
 className="h-8 rounded-xl bg-muted/40 border border-border/40 px-3 flex items-center justify-between text-xs"
 >
 <span className="font-bold text-foreground">{tr.name}</span>
 <div className="flex-1 mx-4 h-5 rounded-lg bg-primary/20 border border-primary/40 flex items-center px-2 text-[10px] font-mono text-primary truncate">
 {tr.clips[0]?.name || "Trilha vazia"}
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 </div>

 {/* COLUNA 3: Painel Inspector de Propriedades (Contextual) */}
 <div className="w-72 border-l border-border/80 bg-card flex flex-col shrink-0 overflow-y-auto no-scrollbar p-4 space-y-4">
 <div className="flex items-center justify-between border-b border-border/60 pb-2">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
 Propriedades
 </span>
 {selectedElement && (
 <Button
 variant="ghost"
 size="icon"
 onClick={() => {
 setElements((prev) => prev.filter((el) => el.id !== selectedElementId));
 setSelectedElementId(null);
 toast.success("Elemento removido.");
 }}
 className="size-7 text-destructive hover:bg-destructive/10"
 title="Excluir Elemento"
 >
 <Trash2 className="size-3.5" />
 </Button>
 )}
 </div>

 {selectedElement ? (
 <div className="space-y-4">
 {/* Edição de Texto */}
 {selectedElement.type === "text" && (
 <>
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Conteúdo do Texto</Label>
 <Input
 value={(selectedElement.properties as any).content || ""}
 onChange={(e) => {
 const val = e.target.value;
 setElements((prev) =>
 prev.map((el) =>
 el.id === selectedElement.id
 ? { ...el, properties: { ...el.properties, content: val } }
 : el,
 ),
 );
 }}
 className="h-9 rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <div className="flex justify-between text-xs">
 <Label className="font-bold text-foreground">Tamanho da Fonte</Label>
 <span className="font-mono text-muted-foreground">
 {(selectedElement.properties as any).fontSize || 36}px
 </span>
 </div>
 <Slider
 value={[(selectedElement.properties as any).fontSize || 36]}
 min={14}
 max={96}
 step={2}
 onValueChange={([val]) => {
 setElements((prev) =>
 prev.map((el) =>
 el.id === selectedElement.id
 ? { ...el, properties: { ...el.properties, fontSize: val } }
 : el,
 ),
 );
 }}
 />
 </div>

 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Cor do Texto</Label>
 <div className="flex items-center gap-2">
 <input
 type="color"
 value={(selectedElement.properties as any).color || "#FFFFFF"}
 onChange={(e) => {
 const col = e.target.value;
 setElements((prev) =>
 prev.map((el) =>
 el.id === selectedElement.id
 ? { ...el, properties: { ...el.properties, color: col } }
 : el,
 ),
 );
 }}
 className="size-8 rounded-lg border border-border cursor-pointer bg-transparent"
 />
 <span className="text-xs font-mono">{(selectedElement.properties as any).color || "#FFFFFF"}</span>
 </div>
 </div>
 </>
 )}

 {/* Edição de Formas */}
 {selectedElement.type === "shape" && (
 <div className="space-y-1.5">
 <Label className="text-xs font-bold text-foreground">Cor de Preenchimento</Label>
 <div className="flex items-center gap-2">
 <input
 type="color"
 value={(selectedElement.properties as any).fill || "#3B82F6"}
 onChange={(e) => {
 const col = e.target.value;
 setElements((prev) =>
 prev.map((el) =>
 el.id === selectedElement.id
 ? { ...el, properties: { ...el.properties, fill: col } }
 : el,
 ),
 );
 }}
 className="size-8 rounded-lg border border-border cursor-pointer bg-transparent"
 />
 <span className="text-xs font-mono">{(selectedElement.properties as any).fill}</span>
 </div>
 </div>
 )}

 {/* Rotação & Opacidade */}
 <div className="space-y-1.5 pt-2 border-t border-border/60">
 <div className="flex justify-between text-xs">
 <Label className="font-bold text-foreground">Opacidade</Label>
 <span className="font-mono text-muted-foreground">
 {Math.round(selectedElement.opacity * 100)}%
 </span>
 </div>
 <Slider
 value={[selectedElement.opacity * 100]}
 min={10}
 max={100}
 step={5}
 onValueChange={([val]) => {
 setElements((prev) =>
 prev.map((el) =>
 el.id === selectedElement.id ? { ...el, opacity: val / 100 } : el,
 ),
 );
 }}
 />
 </div>
 </div>
 ) : (
 <div className="py-12 text-center space-y-2 text-muted-foreground">
 <Layers className="size-8 mx-auto opacity-40" />
 <p className="text-xs font-medium">Nenhum elemento selecionado</p>
 <p className="text-[11px] text-muted-foreground">
 Clique em um texto ou forma no canvas para editar suas propriedades.
 </p>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
