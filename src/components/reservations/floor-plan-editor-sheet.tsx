/**
 * floor-plan-editor-sheet.tsx — Editor da Planta do Salão de Mesas 2D (Gastronomia)
 * Permite ao restaurante personalizar suas mesas, capacidade, formatos e layout.
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { LayoutGrid, Plus, Trash2, Armchair, CheckCircle2, Columns } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { saveStoreFloorPlan, DEFAULT_CANONICAL_TABLES } from "@/services/reservations.functions";

export interface SalonTable {
 id: string;
 label: string;
 seats: number;
 col: number;
 row: number;
 shape: "square" | "round" | "wide";
}

interface FloorPlanEditorSheetProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 currentTables: SalonTable[];
 onSaveSuccess: () => void;
}

export function FloorPlanEditorSheet({
 open,
 onOpenChange,
 currentTables,
 onSaveSuccess,
}: FloorPlanEditorSheetProps) {
 const [tables, setTables] = useState<SalonTable[]>([]);
 const [gridCols, setGridCols] = useState(4);
 const [gridRows, setGridRows] = useState(3);
 const [isSaving, setIsSaving] = useState(false);

 useEffect(() => {
 if (open) {
 setTables(
 currentTables && currentTables.length > 0
 ? JSON.parse(JSON.stringify(currentTables))
 : JSON.parse(JSON.stringify(DEFAULT_CANONICAL_TABLES))
 );
 }
 }, [open, currentTables]);

 const handleAddTable = () => {
 const nextNum = tables.length + 1;
 const pad = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
 const newTable: SalonTable = {
 id: `t_${Date.now()}`,
 label: `Mesa ${pad}`,
 seats: 4,
 col: (tables.length % gridCols) + 1,
 row: Math.floor(tables.length / gridCols) + 1,
 shape: "square",
 };
 setTables((prev) => [...prev, newTable]);
 };

 const handleRemoveTable = (id: string) => {
 if (tables.length <= 1) {
 toast.error("O salão deve ter ao menos 1 mesa cadastrada.");
 return;
 }
 setTables((prev) => prev.filter((t) => t.id !== id));
 };

 const handleUpdateTable = (id: string, updates: Partial<SalonTable>) => {
 setTables((prev) =>
 prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
 );
 };

 const handleSave = async () => {
 setIsSaving(true);
 try {
 await saveStoreFloorPlan({
 data: {
 name: "Salão Principal",
 grid_cols: gridCols,
 grid_rows: gridRows,
 tables,
 },
 });

 toast.success("Planta do salão salva com sucesso!");
 onSaveSuccess();
 onOpenChange(false);
 } catch (err: any) {
 toast.error(err.message || "Erro ao salvar planta do salão.");
 } finally {
 setIsSaving(false);
 }
 };

 const handleResetDefaults = () => {
 setTables(JSON.parse(JSON.stringify(DEFAULT_CANONICAL_TABLES)));
 toast.info("Layout restaurado para os 12 lugares padrão.");
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent
 side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col justify-between"
 >
 <SheetHeader className="p-6 border-b border-border/80">
 <div className="flex items-center gap-2 text-xs font-bold font-mono text-primary uppercase tracking-wider">
 <LayoutGrid className="size-4" />
 <span>Gestão do Salão • Mesas 2D</span>
 </div>
 <SheetTitle className="text-base font-bold text-foreground">
 Planta do Salão
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 Configure as mesas disponíveis, quantidade de assentos e formato para reservas e pedidos.
 </SheetDescription>
 </SheetHeader>

 <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
 {/* Barra de Ações Rápidas & Total de Lugares */}
 <div className="p-4 rounded-2xl bg-muted/30 border border-border/70 flex items-center justify-between">
 <div>
 <p className="text-xs font-bold text-foreground">
 {tables.length} mesas cadastradas
 </p>
 <p className="text-[11px] text-muted-foreground font-mono">
 Capacidade: {tables.reduce((acc, t) => acc + (t.seats || 0), 0)} lugares
 </p>
 </div>
 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleResetDefaults}
 className="h-8 px-2.5 rounded-lg text-xs font-semibold"
 >
 Padrão
 </Button>
 <Button
 type="button"
 size="sm"
 onClick={handleAddTable}
 className="h-8 px-3 rounded-lg bg-primary text-primary-foreground font-bold text-xs gap-1 shadow-2xs"
 >
 <Plus className="size-3.5" />
 <span>Adicionar Mesa</span>
 </Button>
 </div>
 </div>

 {/* Lista de Mesas Configuráveis */}
 <div className="space-y-3">
 {tables.map((t, index) => (
 <div
 key={t.id}
 className="p-3.5 rounded-2xl border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
 >
 <div className="flex items-center gap-3 w-full sm:w-auto">
 <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
 <Armchair className="size-4" />
 </div>
 <div className="flex-1 sm:w-36">
 <Input
 value={t.label}
 onChange={(e) =>
 handleUpdateTable(t.id, { label: e.target.value })
 }
 placeholder="Ex: Mesa 01"
 className="h-9 rounded-xl bg-background font-bold text-xs"
 />
 </div>
 </div>

 <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
 {/* Lugares */}
 <div className="flex items-center gap-1.5">
 <span className="text-[10px] text-muted-foreground font-mono uppercase font-bold">
 Lugares:
 </span>
 <Input
 type="number"
 min={1}
 max={50}
 value={t.seats}
 onChange={(e) =>
 handleUpdateTable(t.id, {
 seats: parseInt(e.target.value, 10) || 2,
 })
 }
 className="h-9 w-16 rounded-xl bg-background text-center font-mono text-xs font-bold"
 />
 </div>

 {/* Formato da Mesa */}
 <select
 value={t.shape}
 onChange={(e) =>
 handleUpdateTable(t.id, { shape: e.target.value as any })
 }
 className="h-9 rounded-xl border border-border bg-background px-2.5 text-xs font-semibold focus:ring-1 focus:ring-primary outline-none"
 >
 <option value="square">Quadrada</option>
 <option value="round">Redonda</option>
 <option value="wide">Comprida (Varanda)</option>
 </select>

 {/* Excluir Mesa */}
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => handleRemoveTable(t.id)}
 className="size-9 p-0 text-muted-foreground hover:text-destructive rounded-xl"
 >
 <Trash2 className="size-4" />
 </Button>
 </div>
 </div>
 ))}
 </div>
 </div>

 <SheetFooter className="p-6 border-t border-border/80 flex sm:flex-row gap-2 justify-end">
 <Button
 type="button"
 variant="outline"
 onClick={() => onOpenChange(false)}
 className="h-11 px-5 rounded-xl text-xs font-bold"
 >
 Cancelar
 </Button>
 <Button
 type="button"
 disabled={isSaving}
 onClick={handleSave}
 className="h-11 px-6 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs gap-2"
 >
 <CheckCircle2 className="size-4" />
 <span>{isSaving ? "Salvando..." : "Salvar Planta do Salão"}</span>
 </Button>
 </SheetFooter>
 </SheetContent>
 </Sheet>
 );
}
