import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
 ArrowLeft,
 Save,
 Undo,
 Redo,
 ListOrdered,
 Layers,
 Users,
 Bus,
 ShieldCheck,
 Ban,
 CheckCircle2,
 SlidersHorizontal,
 BookmarkPlus,
 Info,
} from "lucide-react";

import { PageHeader } from "@/components/commerce/page-header";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { getStoreSettings } from "@/services/store.functions";
import {
 getVehicleLayout,
 updateVehicleLayout,
 generateDefaultBusSeatMap,
 type SeatCell,
 type SeatElementType,
 type SeatCategory,
} from "@/services/vehicle-layouts.functions";

export const Route = createFileRoute("/workspace/turismo/frota/$id")({
 head: () => ({ meta: [{ title: "Editor de Assentos 2D | Frota & Turismo | Workspace Waesy" }] }),
 loader: async ({ params }: { params: { id: string } }) => {
   try {
 const store = await getStoreSettings().catch(() => null);
 const storeId = store?.id || "";
 const layout = storeId
 ? await getVehicleLayout({ data: { store_id: storeId, layout_id: params.id } }).catch(
 () => null
 )
 : null;
 return {
 store,
 layout,
 };
   } catch (err) {
     console.error("[loader:workspace.turismo.frota.$id] Unhandled loader error:", err);
     return { store: null, layout: null };
   }
 },
 component: VehicleLayoutEditorPage,
});

const TOOL_OPTIONS: Array<{
 type: SeatElementType;
 label: string;
 badgeColor: string;
}> = [
 { type: "seat", label: "Poltrona", badgeColor: "bg-primary text-primary-foreground" },
 { type: "aisle", label: "Corredor", badgeColor: "bg-muted text-muted-foreground" },
 { type: "wc", label: "Banheiro (WC)", badgeColor: "bg-amber-500 text-white" },
 { type: "door", label: "Porta", badgeColor: "bg-emerald-500 text-white" },
 { type: "driver", label: "Motorista", badgeColor: "bg-indigo-500 text-white" },
 { type: "guide", label: "Guia", badgeColor: "bg-purple-500 text-white" },
 { type: "stairs", label: "Escada", badgeColor: "bg-slate-500 text-white" },
 { type: "empty", label: "Vazio", badgeColor: "bg-background text-muted-foreground border" },
];

const CATEGORY_OPTIONS: Array<{
 key: SeatCategory;
 label: string;
 dotColor: string;
}> = [
 { key: "executivo", label: "Executivo", dotColor: "bg-primary" },
 { key: "semi_leito", label: "Semi-Leito", dotColor: "bg-emerald-500" },
 { key: "leito", label: "Leito", dotColor: "bg-indigo-500" },
 { key: "leito_cama", label: "Leito Cama", dotColor: "bg-amber-500" },
 { key: "convencional", label: "Convencional", dotColor: "bg-slate-500" },
];

function VehicleLayoutEditorPage() {
 const { store, layout } = (Route.useLoaderData as any)();
 const router = useRouter();
 const storeId = store?.id || "";

 const [name, setName] = useState(layout?.name || "");
 const [rows, setRows] = useState(layout?.rows || 12);
 const [cols, setCols] = useState(layout?.cols || 5);
 const [isDoubleDecker, setIsDoubleDecker] = useState<boolean>(layout?.is_double_decker || false);
 const [activeDeck, setActiveDeck] = useState<number>(1);
 const [activeTool, setActiveTool] = useState<SeatElementType>("seat");
 const [activeCategory, setActiveCategory] = useState<SeatCategory>("executivo");
 const [saving, setSaving] = useState(false);

 // Modal de edição detalhada de assento
 const [selectedSeat, setSelectedSeat] = useState<SeatCell | null>(null);
 const [seatLabel, setSeatLabel] = useState("");
 const [seatCategory, setSeatCategory] = useState<SeatCategory>("executivo");
 const [seatStatus, setSeatStatus] = useState<"available" | "blocked" | "accessible">("available");

 // Modal de presets
 const [presetModalOpen, setPresetModalOpen] = useState(false);

 // Mapa de assentos
 const [seatMap, setSeatMap] = useState<SeatCell[]>(layout?.seat_map || []);

 // Pilha de Histórico para Undo/Redo
 const [history, setHistory] = useState<SeatCell[][]>([layout?.seat_map || []]);
 const [historyIndex, setHistoryIndex] = useState(0);

 // Contagem de poltronas
 const totalSeats = useMemo(() => {
 return seatMap.filter((c) => c.type === "seat").length;
 }, [seatMap]);

 const deck1SeatsCount = useMemo(() => {
 return seatMap.filter((c) => c.type === "seat" && c.deck === 1).length;
 }, [seatMap]);

 const deck2SeatsCount = useMemo(() => {
 return seatMap.filter((c) => c.type === "seat" && c.deck === 2).length;
 }, [seatMap]);

 if (!layout) {
 return (
 <div className="p-8 text-center space-y-3">
 <p className="text-sm text-muted-foreground">Modelo de veículo não encontrado.</p>
 <Button asChild variant="outline">
 <Link to={"/workspace/turismo/frota" as any}>Voltar para a Frota</Link>
 </Button>
 </div>
 );
 }

 const pushHistory = (newMap: SeatCell[]) => {
 const updatedHistory = history.slice(0, historyIndex + 1);
 updatedHistory.push(newMap);
 setHistory(updatedHistory);
 setHistoryIndex(updatedHistory.length - 1);
 };

 const handleUndo = () => {
 if (historyIndex > 0) {
 const prev = history[historyIndex - 1];
 setSeatMap(prev);
 setHistoryIndex(historyIndex - 1);
 }
 };

 const handleRedo = () => {
 if (historyIndex < history.length - 1) {
 const next = history[historyIndex + 1];
 setSeatMap(next);
 setHistoryIndex(historyIndex + 1);
 }
 };

 // Clicar em uma célula do grid
 const handleCellClick = (r: number, c: number, e: React.MouseEvent) => {
 const existingIndex = seatMap.findIndex(
 (cell) => cell.r === r && cell.c === c && cell.deck === activeDeck
 );

 // Se pressionar Shift ou Alt ou se for clique em poltrona existente com ferramenta 'seat', abre detalhes
 if (existingIndex >= 0 && seatMap[existingIndex].type === "seat" && (e.shiftKey || e.altKey)) {
 const seat = seatMap[existingIndex];
 setSelectedSeat(seat);
 setSeatLabel(seat.label);
 setSeatCategory(seat.category || "executivo");
 setSeatStatus(seat.status || "available");
 return;
 }

 let nextMap = [...seatMap];

 if (existingIndex >= 0) {
 const current = nextMap[existingIndex];

 if (current.type === activeTool && activeTool === "seat") {
 // Se clicar com a mesma ferramenta 'seat', cicla a categoria
 const catOrder: SeatCategory[] = ["executivo", "semi_leito", "leito", "leito_cama", "convencional"];
 const curIdx = catOrder.indexOf(current.category || "executivo");
 const nextCat = catOrder[(curIdx + 1) % catOrder.length];
 nextMap[existingIndex] = {
 ...current,
 category: nextCat,
 };
 } else {
 // Altera elemento
 let newLabel = current.label;
 if (activeTool === "seat" && !newLabel) {
 newLabel = String(totalSeats + 1).padStart(2, "0");
 } else if (activeTool === "wc") newLabel = "WC";
 else if (activeTool === "door") newLabel = "Porta";
 else if (activeTool === "driver") newLabel = "Motorista";
 else if (activeTool === "guide") newLabel = "Guia";
 else if (activeTool === "stairs") newLabel = "Escada";
 else if (activeTool === "aisle" || activeTool === "empty") newLabel = "";

 nextMap[existingIndex] = {
 r,
 c,
 type: activeTool,
 label: newLabel,
 deck: activeDeck,
 category: activeTool === "seat" ? activeCategory : undefined,
 status: activeTool === "seat" ? "available" : undefined,
 };
 }
 } else {
 // Cria nova célula
 let newLabel = "";
 if (activeTool === "seat") newLabel = String(totalSeats + 1).padStart(2, "0");
 else if (activeTool === "wc") newLabel = "WC";
 else if (activeTool === "door") newLabel = "Porta";
 else if (activeTool === "driver") newLabel = "Motorista";
 else if (activeTool === "guide") newLabel = "Guia";
 else if (activeTool === "stairs") newLabel = "Escada";

 nextMap.push({
 r,
 c,
 type: activeTool,
 label: newLabel,
 deck: activeDeck,
 category: activeTool === "seat" ? activeCategory : undefined,
 status: activeTool === "seat" ? "available" : undefined,
 });
 }

 setSeatMap(nextMap);
 pushHistory(nextMap);
 };

 // Salvar detalhes do assento selecionado
 const handleSaveSeatDetail = () => {
 if (!selectedSeat) return;

 const nextMap = seatMap.map((cell) => {
 if (cell.r === selectedSeat.r && cell.c === selectedSeat.c && cell.deck === selectedSeat.deck) {
 return {
 ...cell,
 label: seatLabel.trim() || cell.label,
 category: seatCategory,
 status: seatStatus,
 };
 }
 return cell;
 });

 setSeatMap(nextMap);
 pushHistory(nextMap);
 setSelectedSeat(null);
 toast.success(`Poltrona ${seatLabel} configurada!`);
 };

 // Renumeração Sequencial Automática
 const handleAutoRenumber = () => {
 let seatNumber = 1;
 const nextMap = seatMap.map((cell) => {
 if (cell.type === "seat") {
 const label = String(seatNumber).padStart(2, "0");
 seatNumber++;
 return { ...cell, label };
 }
 return cell;
 });

 setSeatMap(nextMap);
 pushHistory(nextMap);
 toast.success(`${seatNumber - 1} poltronas renumeradas sequencialmente!`);
 };

 // Aplicar Preset de Ônibus
 const handleApplyPreset = (presetType: "exec_46" | "semi_42" | "dd_60" | "micro_28") => {
 let newRows = 12;
 let newCols = 5;
 let isDD = false;

 if (presetType === "exec_46") {
 newRows = 12;
 newCols = 5;
 isDD = false;
 } else if (presetType === "semi_42") {
 newRows = 11;
 newCols = 5;
 isDD = false;
 } else if (presetType === "dd_60") {
 newRows = 12;
 newCols = 5;
 isDD = true;
 } else if (presetType === "micro_28") {
 newRows = 8;
 newCols = 4;
 isDD = false;
 }

 const generated = generateDefaultBusSeatMap(newRows, newCols, isDD);
 setRows(newRows);
 setCols(newCols);
 setIsDoubleDecker(isDD);
 setSeatMap(generated);
 pushHistory(generated);
 setPresetModalOpen(false);
 toast.success("Planta de veículo aplicada com sucesso!");
 };

 // Salvar no Banco Supabase
 const handleSave = async () => {
 try {
 setSaving(true);
 await updateVehicleLayout({
 data: {
 store_id: storeId,
 layout_id: layout.id,
 name: name.trim(),
 rows,
 cols,
 is_double_decker: isDoubleDecker,
 seat_map: seatMap,
 },
 });
 toast.success("Layout de frota salvo com sucesso no banco!");
 router.invalidate();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao salvar layout");
 } finally {
 setSaving(false);
 }
 };

 return (
 <div className="w-full space-y-6 animate-in fade-in duration-200">
 {/* ── 1. Top Bar & Ações (Apple HIG Elevado) ── */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/60">
 <div className="flex items-center gap-3">
 <NativeBackButton fallbackHref="/workspace/turismo/frota" />

 <div>
 <div className="flex items-center gap-2">
 <Input
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="h-8 font-bold text-base sm:text-lg border-transparent hover:border-border focus:border-primary px-2 rounded-lg"
 />
 <Badge variant="outline" className="text-[11px] font-mono shrink-0">
 {totalSeats} assentos
 </Badge>
 {isDoubleDecker && (
 <Badge variant="secondary" className="text-[10px] font-semibold uppercase shrink-0">
 Double Decker (2 Pisos)
 </Badge>
 )}
 </div>
 <p className="text-xs text-muted-foreground px-2">
 {isDoubleDecker
 ? `Piso 1: ${deck1SeatsCount} assentos | Piso 2: ${deck2SeatsCount} assentos`
 : "Clique nas células para editar ou use Shift+Clique para propriedades avançadas."}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-2">
 {/* Histórico */}
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={handleUndo}
 disabled={historyIndex <= 0}
 className="size-9 rounded-xl cursor-pointer"
 title="Desfazer"
 >
 <Undo className="size-3.5" />
 </Button>
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={handleRedo}
 disabled={historyIndex >= history.length - 1}
 className="size-9 rounded-xl cursor-pointer"
 title="Refazer"
 >
 <Redo className="size-3.5" />
 </Button>

 {/* Presets Rápidos */}
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setPresetModalOpen(true)}
 className="h-9 px-3 rounded-xl text-xs gap-1.5 cursor-pointer"
 >
 <BookmarkPlus className="size-3.5 text-primary" /> Modelos Prontos
 </Button>

 {/* Renumerar */}
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleAutoRenumber}
 className="h-9 px-3 rounded-xl text-xs gap-1.5 cursor-pointer"
 >
 <ListOrdered className="size-3.5 text-primary" /> Renumerar
 </Button>

 {/* Salvar */}
 <Button
 type="button"
 onClick={handleSave}
 disabled={saving}
 className="h-9 px-4 rounded-xl text-xs font-bold gap-2 cursor-pointer bg-primary text-primary-foreground shadow-xs"
 >
 <Save className="size-3.5" /> {saving ? "Salvando..." : "Salvar Mapa"}
 </Button>
 </div>
 </div>

 {/* ── 2. Paleta de Ferramentas & Categorias de Assento ── */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {/* Ferramentas de Pintura */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2.5">
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
 Ferramenta de Pintura
 </span>
 {isDoubleDecker && (
 <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60">
 <button
 type="button"
 onClick={() => setActiveDeck(1)}
 className={cn(
 "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
 activeDeck === 1
 ? "bg-primary text-primary-foreground shadow-2xs"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 Piso 1 (Inferior)
 </button>
 <button
 type="button"
 onClick={() => setActiveDeck(2)}
 className={cn(
 "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
 activeDeck === 2
 ? "bg-primary text-primary-foreground shadow-2xs"
 : "text-muted-foreground hover:text-foreground"
 )}
 >
 Piso 2 (Superior)
 </button>
 </div>
 )}
 </div>

 <div className="flex flex-wrap items-center gap-1.5">
 {TOOL_OPTIONS.map((tool) => {
 const isSelected = activeTool === tool.type;
 return (
 <button
 key={tool.type}
 type="button"
 onClick={() => setActiveTool(tool.type)}
 className={cn(
 "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5",
 isSelected
 ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-2xs"
 : "border-border/70 bg-background text-foreground hover:bg-muted/50"
 )}
 >
 <span
 className={cn(
 "size-2.5 rounded-full inline-block",
 tool.type === "seat" && "bg-primary",
 tool.type === "aisle" && "bg-muted-foreground/40",
 tool.type === "wc" && "bg-amber-500",
 tool.type === "door" && "bg-emerald-500",
 tool.type === "driver" && "bg-indigo-500",
 tool.type === "guide" && "bg-purple-500",
 tool.type === "stairs" && "bg-slate-500",
 tool.type === "empty" && "border border-border"
 )}
 />
 {tool.label}
 </button>
 );
 })}
 </div>
 </div>

 {/* Categorias de Poltrona */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-2.5">
 <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
 Categoria Ativa para Novas Poltronas
 </span>
 <div className="flex flex-wrap items-center gap-1.5">
 {CATEGORY_OPTIONS.map((cat) => {
 const isSelected = activeCategory === cat.key;
 return (
 <button
 key={cat.key}
 type="button"
 onClick={() => setActiveCategory(cat.key)}
 className={cn(
 "px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5",
 isSelected
 ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-2xs"
 : "border-border/70 bg-background text-foreground hover:bg-muted/50"
 )}
 >
 <span className={cn("size-2 rounded-full", cat.dotColor)} />
 {cat.label}
 </button>
 );
 })}
 </div>
 </div>
 </div>

 {/* ── 3. Chassi Virtual do Veículo 2D (Apple Grade) ── */}
 <div className="flex flex-col items-center justify-center p-6 sm:p-10 rounded-2xl bg-muted/20 border border-border/70 overflow-x-auto no-scrollbar">
 <div className="text-xs font-mono text-muted-foreground mb-4 flex items-center gap-2">
 <Info className="size-3.5" />
 <span>
 {isDoubleDecker
 ? `Visualizando Piso ${activeDeck} · Clique nas células para pintar. Shift+Clique para propriedades.`
 : "Clique nas células para alternar. Shift+Clique em um assento para propriedades."}
 </span>
 </div>

 {/* Carroceria do Ônibus */}
 <div className="relative w-fit rounded-[40px] border-4 border-foreground/30 bg-card p-6 sm:p-8 shadow-sm flex flex-col items-center space-y-4 min-w-[300px]">
 {/* Para-brisa Dianteiro */}
 <div className="w-full h-9 rounded-t-3xl bg-sky-500/10 border-2 border-sky-500/30 flex items-center justify-center text-[10px] font-mono font-bold text-sky-600 uppercase tracking-widest">
 Frente / Para-brisa {isDoubleDecker ? `(Piso ${activeDeck})` : ""}
 </div>

 {/* Matriz de Assentos */}
 <div
 className="grid gap-2.5"
 style={{
 gridTemplateColumns: `repeat(${cols}, minmax(44px, 52px))`,
 }}
 >
 {Array.from({ length: rows }).map((_, r) =>
 Array.from({ length: cols }).map((_, c) => {
 const cell = seatMap.find(
 (item) => item.r === r && item.c === c && item.deck === activeDeck
 );
 const cellType: SeatElementType = cell?.type || "empty";
 const isAccessible = cell?.status === "accessible";
 const isBlocked = cell?.status === "blocked";

 return (
 <button
 key={`${r}-${c}`}
 type="button"
 onClick={(e) => handleCellClick(r, c, e)}
 title={`Linha ${r + 1}, Coluna ${c + 1}: ${cell?.label || cellType} (${cell?.category || ""})`}
 className={cn(
 "size-11 sm:size-12 rounded-xl flex flex-col items-center justify-center font-bold text-xs transition-all cursor-pointer select-none active:scale-95",
 // Estilização por Tipo
 cellType === "seat" &&
 !isAccessible &&
 !isBlocked &&
 (cell?.category === "leito_cama"
 ? "bg-amber-500 text-white border-amber-600 shadow-xs"
 : cell?.category === "leito"
 ? "bg-indigo-600 text-white border-indigo-700 shadow-xs"
 : cell?.category === "semi_leito"
 ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
 : "bg-primary text-primary-foreground border-primary shadow-xs"),
 cellType === "seat" &&
 isAccessible &&
 "bg-cyan-500 text-white border-cyan-600 shadow-xs ring-2 ring-cyan-300",
 cellType === "seat" &&
 isBlocked &&
 "bg-slate-400 text-slate-800 border-slate-500 opacity-60",
 cellType === "aisle" &&
 "bg-muted/30 border border-dashed border-border/60 text-muted-foreground/30 hover:bg-muted/60",
 cellType === "wc" &&
 "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-mono text-[11px]",
 cellType === "door" &&
 "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-[10px]",
 cellType === "driver" &&
 "bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/40 text-[10px]",
 cellType === "guide" &&
 "bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 text-[10px]",
 cellType === "stairs" &&
 "bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/40 text-[10px]",
 cellType === "empty" &&
 "border border-border/40 bg-background/50 hover:border-primary/40 text-transparent hover:text-muted-foreground text-[10px]"
 )}
 >
 {cellType === "seat" ? (
 <>
 <span className="font-mono text-xs leading-none">{cell?.label || `${r + 1}`}</span>
 <span className="text-[8px] opacity-80 uppercase tracking-tighter mt-0.5">
 {isAccessible ? "PCD" : isBlocked ? "BLQ" : cell?.category ? cell.category.substring(0, 4) : "EXEC"}
 </span>
 </>
 ) : cellType === "aisle" ? (
 <span className="text-[9px]">·</span>
 ) : (
 cell?.label || cellType
 )}
 </button>
 );
 })
 )}
 </div>

 {/* Traseira do Ônibus */}
 <div className="w-full h-5 rounded-b-2xl bg-muted/60 border-t border-border flex items-center justify-center text-[9px] font-mono text-muted-foreground uppercase tracking-wider">
 Traseira do Veículo
 </div>
 </div>
 </div>

 {/* ── Sheet de Detalhes da Poltrona (Shift+Clique) ── */}
 <Sheet open={!!selectedSeat} onOpenChange={(open) => !open && setSelectedSeat(null)}>
 <SheetContent
   side="right"
   size="wide"
   className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] md:max-w-2xl lg:max-w-[70vw] xl:max-w-[70vw] p-6 flex flex-col justify-between overflow-y-auto"
 >
 <div>
 <SheetHeader>
 <SheetTitle className="text-base font-bold">Configurar Poltrona</SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 Ajuste o número de identificação, categoria de conforto e status especial.
 </SheetDescription>
 </SheetHeader>

 <div className="space-y-4 py-4 text-xs">
 <div>
 <label className="text-xs font-semibold text-foreground">Identificação / Número</label>
 <Input
 value={seatLabel}
 onChange={(e) => setSeatLabel(e.target.value)}
 className="mt-1 font-mono rounded-xl h-9"
 placeholder="Ex: 01, 02, 14A..."
 />
 </div>

 <div>
 <label className="text-xs font-semibold text-foreground">Categoria de Conforto</label>
 <select
 value={seatCategory}
 onChange={(e) => setSeatCategory(e.target.value as any)}
 className="w-full h-9 mt-1 px-3 rounded-xl border border-border bg-background text-xs font-semibold"
 >
 {CATEGORY_OPTIONS.map((c) => (
 <option key={c.key} value={c.key}>
 {c.label}
 </option>
 ))}
 </select>
 </div>

 <div>
 <label className="text-xs font-semibold text-foreground">Status / Acessibilidade</label>
 <select
 value={seatStatus}
 onChange={(e) => setSeatStatus(e.target.value as any)}
 className="w-full h-9 mt-1 px-3 rounded-xl border border-border bg-background text-xs font-semibold"
 >
 <option value="available">Disponível para Venda</option>
 <option value="accessible">Acessível / PCD (Prioritário)</option>
 <option value="blocked">Bloqueado / Reservado para Staff</option>
 </select>
 </div>
 </div>
 </div>

 <SheetFooter className="pt-4 border-t border-border/60">
 <Button variant="outline" onClick={() => setSelectedSeat(null)} className="rounded-xl text-xs font-bold">
 Cancelar
 </Button>
 <Button onClick={handleSaveSeatDetail} className="rounded-xl text-xs font-bold">
 Confirmar
 </Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>

 {/* ── Sheet de Presets Prontos de Ônibus ── */}
 <Sheet open={presetModalOpen} onOpenChange={setPresetModalOpen}>
 <SheetContent side="right" size="wide" className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-6 flex flex-col justify-between overflow-y-auto">
 <div>
 <SheetHeader>
 <SheetTitle className="text-base font-bold">Modelos Prontos de Frota</SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 Selecione um layout padronizado de acordo com o chassi e carroceria do veículo.
 </SheetDescription>
 </SheetHeader>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
 <button
 type="button"
 onClick={() => handleApplyPreset("exec_46")}
 className="p-4 rounded-2xl border border-border hover:border-primary text-left transition-all hover:bg-muted/40 cursor-pointer space-y-1"
 >
 <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
 <Bus className="size-4 text-primary" /> 46L Executivo
 </div>
 <p className="text-xs text-muted-foreground">
 Piso Único · 12 fileiras · WC traseiro e porta dianteira.
 </p>
 </button>

 <button
 type="button"
 onClick={() => handleApplyPreset("semi_42")}
 className="p-4 rounded-2xl border border-border hover:border-primary text-left transition-all hover:bg-muted/40 cursor-pointer space-y-1"
 >
 <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
 <Bus className="size-4 text-emerald-500" /> 42L Semi-Leito
 </div>
 <p className="text-xs text-muted-foreground">
 Piso Único · 11 fileiras com maior espaço entre poltronas.
 </p>
 </button>

 <button
 type="button"
 onClick={() => handleApplyPreset("dd_60")}
 className="p-4 rounded-2xl border border-border hover:border-primary text-left transition-all hover:bg-muted/40 cursor-pointer space-y-1 sm:col-span-2"
 >
 <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
 <Layers className="size-4 text-amber-500" /> 60L Double Decker (G8 DD)
 </div>
 <p className="text-xs text-muted-foreground">
 2 Pisos · Piso 1: 12 Leito Cama VIP + WC + Escada · Piso 2: 48 Semi-Leito Panorâmico.
 </p>
 </button>

 <button
 type="button"
 onClick={() => handleApplyPreset("micro_28")}
 className="p-4 rounded-2xl border border-border hover:border-primary text-left transition-all hover:bg-muted/40 cursor-pointer space-y-1 sm:col-span-2"
 >
 <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
 <Bus className="size-4 text-indigo-500" /> 28L Micro-ônibus
 </div>
 <p className="text-xs text-muted-foreground">
 Configuração compacta 8 fileiras x 4 colunas para transfers e passeios rápidos.
 </p>
 </button>
 </div>
 </div>

 <SheetFooter className="pt-4 border-t border-border/60">
 <Button variant="outline" onClick={() => setPresetModalOpen(false)} className="rounded-xl text-xs font-bold">
 Fechar
 </Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>
 </div>
 );
}
