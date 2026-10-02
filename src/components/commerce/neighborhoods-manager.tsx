import { useState, useMemo } from "react";
import { Search, CheckCheck, XSquare, Plus, Edit2, Trash2, Check, X, DollarSign, MapPin, Layers, Percent, TrendingDown, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { type NeighborhoodPreset } from "@/lib/constants/cities";

export interface NeighborhoodItem {
 id?: string;
 name: string;
 defaultFeeCents: number;
 defaultTimeMinutes?: number;
 active: boolean;
}

interface NeighborhoodsManagerProps {
 cityName?: string;
 value: NeighborhoodItem[];
 onChange: (neighborhoods: NeighborhoodItem[]) => void;
 className?: string;
}

export function NeighborhoodsManager({
 cityName = "Sua Cidade",
 value = [],
 onChange,
 className,
}: NeighborhoodsManagerProps) {
 const [searchQuery, setSearchQuery] = useState("");
 const [isAddingNew, setIsAddingNew] = useState(false);
 const [newNeighborhoodName, setNewNeighborhoodName] = useState("");
 const [newNeighborhoodFee, setNewNeighborhoodFee] = useState<number>(500);

 // Edição inline de nome
 const [editingIndex, setEditingIndex] = useState<number | null>(null);
 const [editingNameValue, setEditingNameValue] = useState("");

 // Aplicação de taxa em lote
 const [bulkFeeInput, setBulkFeeInput] = useState<number | undefined>(undefined);
 const [isBulkFeeOpen, setIsBulkFeeOpen] = useState(false);

 // Contagens
 const totalCount = value.length;
 const activeCount = useMemo(() => value.filter((n) => n.active).length, [value]);

 // Lista filtrada por busca
 const filteredList = useMemo(() => {
 if (!searchQuery.trim()) return value;
 const q = searchQuery.toLowerCase();
 return value.filter((n) => n.name.toLowerCase().includes(q));
 }, [value, searchQuery]);

 // ── AÇÕES EM LOTE ──
 const handleSelectAll = () => {
 const updated = value.map((n) => ({ ...n, active: true }));
 onChange(updated);
 toast.success(`Todos os ${value.length} bairros foram ativados!`);
 };

 const handleDeselectAll = () => {
 const updated = value.map((n) => ({ ...n, active: false }));
 onChange(updated);
 toast.info("Todos os bairros foram desativados.");
 };

 const handleApplyBulkFee = () => {
 if (bulkFeeInput === undefined || isNaN(bulkFeeInput)) {
 toast.error("Informe um valor de taxa válido.");
 return;
 }
 const updated = value.map((n) => (n.active ? { ...n, defaultFeeCents: bulkFeeInput } : n));
 onChange(updated);
 setIsBulkFeeOpen(false);
 toast.success(`Taxa de R$ ${(bulkFeeInput / 100).toFixed(2).replace(".", ",")} aplicada a todos os bairros ativos!`);
 };

 // ── AÇÕES INDIVIDUAIS ──
 const handleToggleActive = (originalIndex: number) => {
 const updated = [...value];
 updated[originalIndex] = {
 ...updated[originalIndex],
 active: !updated[originalIndex].active,
 };
 onChange(updated);
 };

 const handleUpdateFee = (originalIndex: number, feeCents: number) => {
 const updated = [...value];
 updated[originalIndex] = {
 ...updated[originalIndex],
 defaultFeeCents: feeCents,
 };
 onChange(updated);
 };

 const handleStartRename = (originalIndex: number, currentName: string) => {
 setEditingIndex(originalIndex);
 setEditingNameValue(currentName);
 };

 const handleSaveRename = (originalIndex: number) => {
 if (!editingNameValue.trim()) {
 toast.error("O nome do bairro não pode ficar vazio.");
 return;
 }
 const updated = [...value];
 updated[originalIndex] = {
 ...updated[originalIndex],
 name: editingNameValue.trim(),
 };
 onChange(updated);
 setEditingIndex(null);
 toast.success("Nome do bairro atualizado!");
 };

 const handleCancelRename = () => {
 setEditingIndex(null);
 setEditingNameValue("");
 };

 const handleDeleteNeighborhood = (originalIndex: number, name: string) => {
 const updated = value.filter((_, idx) => idx !== originalIndex);
 onChange(updated);
 toast.success(`Bairro "${name}" removido.`);
 };

 const handleAddNewNeighborhood = (e: React.FormEvent) => {
 e.preventDefault();
 if (!newNeighborhoodName.trim()) {
 toast.error("Informe o nome do novo bairro.");
 return;
 }

 if (value.some((n) => n.name.toLowerCase() === newNeighborhoodName.trim().toLowerCase())) {
 toast.error("Já existe um bairro com esse nome.");
 return;
 }

 const newItem: NeighborhoodItem = {
 name: newNeighborhoodName.trim(),
 defaultFeeCents: newNeighborhoodFee || 0,
 defaultTimeMinutes: 35,
 active: true,
 };

 onChange([newItem, ...value]);
 setNewNeighborhoodName("");
 setNewNeighborhoodFee(500);
 setIsAddingNew(false);
 toast.success(`Bairro "${newItem.name}" adicionado com sucesso!`);
 };

 return (
 <div className={cn("space-y-4 select-none", className)}>
 {/* ── HEADER DA FERRAMENTA ── */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
 <div>
 <div className="flex items-center gap-2">
 <Label className="text-xs font-bold text-foreground flex items-center gap-2">
 <MapPin className="size-3.5 text-primary" />
 <span>Bairros Atendidos & Taxas de Entrega ({cityName})</span>
 </Label>
 <Badge variant="outline" className="text-[10px] font-mono bg-card">
 {activeCount} de {totalCount} ativos
 </Badge>
 </div>
 <p className="text-[11px] text-muted-foreground mt-1">
 Defina quais regiões recebem pedidos e configure a taxa de frete cobrada por bairro.
 </p>
 </div>

 <div className="flex items-center gap-2 shrink-0">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsAddingNew((prev) => !prev)}
 className="h-8 rounded-lg text-xs font-bold gap-2"
 >
 <Plus className="size-3.5" />
 <span>Novo Bairro</span>
 </Button>
 </div>
 </div>

 {/* ── FORMULÁRIO EXPANSÍVEL DE NOVO BAIRRO ── */}
 {isAddingNew && (
 <form
 onSubmit={handleAddNewNeighborhood}
 className="p-4 rounded-lg bg-muted/30 border border-primary/30 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200"
 >
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-foreground flex items-center gap-2">
 <Plus className="size-3.5 text-primary" />
 <span>Adicionar Bairro Personalizado</span>
 </span>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 className="size-6 rounded-lg text-muted-foreground hover:text-foreground"
 onClick={() => setIsAddingNew(false)}
 >
 <X className="size-3.5" />
 </Button>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
 <div className="sm:col-span-7 space-y-1">
 <Label className="text-[11px] text-muted-foreground">Nome do Bairro *</Label>
 <Input
 value={newNeighborhoodName}
 onChange={(e) => setNewNeighborhoodName(e.target.value)}
 placeholder="Ex: Jardim América, Loteamento Universitário..."
 className="h-9 rounded-lg text-xs bg-background"
 autoFocus
 />
 </div>

 <div className="sm:col-span-5 space-y-1">
 <Label className="text-[11px] text-muted-foreground">Taxa de Entrega (R$)</Label>
 <CurrencyField
 value={newNeighborhoodFee}
 onChange={(cents) => setNewNeighborhoodFee(cents || 0)}
 placeholder="0,00"
 className="h-9 text-xs rounded-lg font-mono"
 />
 </div>
 </div>

 <div className="flex justify-end gap-2 pt-1">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => setIsAddingNew(false)}
 className="h-8 rounded-lg text-xs font-semibold"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 size="sm"
 className="h-8 rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-2"
 >
 <Check className="size-3.5" />
 <span>Salvar Bairro</span>
 </Button>
 </div>
 </form>
 )}

 {/* ── BARRA DE FERRAMENTAS RÁPIDAS (POWER BAR) ── */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-lg bg-card border border-border/70">
 {/* Busca Rápida */}
 <div className="relative w-full sm:w-60 shrink-0">
 <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Filtrar bairro..."
 className="h-8 pl-8 rounded-lg text-xs bg-background"
 />
 {searchQuery && (
 <button
 type="button"
 onClick={() => setSearchQuery("")}
 className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
 >
 <X className="size-3" />
 </button>
 )}
 </div>

 {/* Ações em Lote */}
 <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={handleSelectAll}
 className="h-7 px-3 rounded-lg text-[11px] font-bold text-muted-foreground hover:text-foreground gap-1"
 title="Marcar todos os bairros como atendidos"
 >
 <CheckCheck className="size-3.5 text-success" />
 <span>Selecionar Todos</span>
 </Button>

 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={handleDeselectAll}
 className="h-8 px-3 rounded-lg text-[11px] font-bold text-muted-foreground hover:text-foreground gap-1"
 title="Desmarcar todos os bairros"
 >
 <XSquare className="size-3.5 text-destructive" />
 <span>Desmarcar Todos</span>
 </Button>

 <Button
 type="button"
 variant={isBulkFeeOpen ? "secondary" : "outline"}
 size="sm"
 onClick={() => setIsBulkFeeOpen((prev) => !prev)}
 className="h-8 px-3 rounded-lg text-[11px] font-bold gap-1"
 >
 <DollarSign className="size-3.5 text-warning" />
 <span>Taxa em Lote</span>
 </Button>
 </div>
 </div>

 {/* ── BARRA EXPANSÍVEL DE TAXA EM LOTE ── */}
 {isBulkFeeOpen && (
 <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-between gap-3 animate-in fade-in duration-150">
 <div className="flex items-center gap-2 flex-1">
 <span className="text-xs font-bold text-warning whitespace-nowrap">
 Aplicar taxa fixa para todos os bairros ativos:
 </span>
 <div className="w-32">
 <CurrencyField
 value={bulkFeeInput}
 onChange={(cents) => setBulkFeeInput(cents)}
 placeholder="R$ 0,00"
 className="h-8 text-xs rounded-lg font-mono bg-background"
 autoFocus
 />
 </div>
 </div>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 size="sm"
 onClick={handleApplyBulkFee}
 className="h-8 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1"
 >
 <Check className="size-3.5" />
 <span>Aplicar a Todos</span>
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => setIsBulkFeeOpen(false)}
 className="h-8 rounded-lg text-xs"
 >
 Cancelar
 </Button>
 </div>
 </div>
 )}

 {/* ── LISTA DE BAIRROS DE ALTA DENSIDADE ── */}
 <div className="rounded-lg border border-border/80 bg-background/50 divide-y divide-border/40 max-h-72 overflow-y-auto no-scrollbar shadow-2xs">
 {filteredList.length === 0 ? (
 <div className="p-8 text-center text-muted-foreground space-y-1">
 <MapPin className="size-6 mx-auto opacity-40 mb-1" />
 <p className="text-xs font-bold text-foreground">Nenhum bairro encontrado</p>
 <p className="text-[11px]">
 Tente buscar por outro termo ou clique em "+ Novo Bairro" para cadastrar.
 </p>
 </div>
 ) : (
 filteredList.map((item) => {
 const originalIndex = value.findIndex((n) => n.name === item.name);
 const isEditing = editingIndex === originalIndex;

 return (
 <div
 key={originalIndex}
 className={cn(
 "flex items-center justify-between p-3 gap-3 transition-colors",
 item.active ? "hover:bg-muted/20" : "bg-muted/10 opacity-70"
 )}
 >
 {/* Checkbox & Nome */}
 <div className="flex items-center gap-3 flex-1 min-w-0">
 <input
 type="checkbox"
 id={`neighborhood-${originalIndex}`}
 checked={item.active}
 onChange={() => handleToggleActive(originalIndex)}
 className="size-4 rounded border-border text-primary cursor-pointer shrink-0"
 />

 {isEditing ? (
 <div className="flex items-center gap-2 flex-1 max-w-sm">
 <Input
 value={editingNameValue}
 onChange={(e) => setEditingNameValue(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter") handleSaveRename(originalIndex);
 if (e.key === "Escape") handleCancelRename();
 }}
 className="h-7 text-xs rounded-lg bg-background"
 autoFocus
 />
 <Button
 type="button"
 size="icon"
 variant="secondary"
 className="size-7 rounded-lg shrink-0"
 onClick={() => handleSaveRename(originalIndex)}
 title="Salvar nome"
 >
 <Check className="size-3.5" />
 </Button>
 <Button
 type="button"
 size="icon"
 variant="ghost"
 className="size-7 rounded-lg shrink-0 text-muted-foreground"
 onClick={handleCancelRename}
 title="Cancelar"
 >
 <X className="size-3.5" />
 </Button>
 </div>
 ) : (
 <div className="flex items-center gap-2 truncate">
 <label
 htmlFor={`neighborhood-${originalIndex}`}
 className={cn(
 "text-xs cursor-pointer truncate select-none",
 item.active ? "font-bold text-foreground" : "text-muted-foreground line-through"
 )}
 >
 {item.name}
 </label>
 <button
 type="button"
 onClick={() => handleStartRename(originalIndex, item.name)}
 className="opacity-0 group-hover:opacity-100 hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity p-1"
 title="Editar nome do bairro"
 >
 <Edit2 className="size-3" />
 </button>
 </div>
 )}
 </div>

 {/* Taxa de Entrega Individual & Ações */}
 <div className="flex items-center gap-2 shrink-0">
 {item.active && (
 <div className="flex items-center gap-2">
 <span className="text-[11px] text-muted-foreground font-mono">Taxa:</span>
 <div className="w-24">
 <CurrencyField
 value={item.defaultFeeCents}
 onChange={(cents) => handleUpdateFee(originalIndex, cents || 0)}
 placeholder="0,00"
 className="h-8 text-xs rounded-lg font-mono text-right bg-background"
 />
 </div>
 </div>
 )}

 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleDeleteNeighborhood(originalIndex, item.name)}
 className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
 title="Remover bairro"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 );
 })
 )}
 </div>
 </div>
 );
}
