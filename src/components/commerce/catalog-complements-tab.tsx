import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Check, Layers, Sliders, DollarSign, AlertCircle } from 'lucide-react';
import { listStoreComplementGroups, saveStoreComplementGroup, deleteStoreComplementGroup } from "@/services/admin-catalog.functions";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getNicheSemantics } from "@/lib/niche-semantics";

interface OptionItem {
 id?: string;
 name: string;
 price_cents: number;
 is_active: boolean;
}

export function CatalogComplementsTab({ store }: { store?: any } = {}) {
 const semantics = getNicheSemantics(store);
 const isTourism = semantics.nicheId === "tourism";
 const isGastro = semantics.nicheId === "gastronomy";
 const isRetail = semantics.nicheId === "retail" || semantics.nicheId === "supermarket" || semantics.nicheId === "wholesale";
 const isServices = semantics.nicheId === "services";

 const tabTitle = semantics.modifiersLabel || "Grupos de Complementos & Adicionais";
 const tabSubtitle = isTourism
 ? "Crie opcionais e passeios adicionais (seguro viagem, transfers in/out, passeios guiados, regime de alimentação) vinculáveis aos pacotes e roteiros."
 : isGastro
 ? "Crie adicionais reutilizáveis (molhos, queijos extras, acompanhamentos, ponto da carne) vinculáveis a pratos do cardápio."
 : isRetail
 ? "Crie variações e personalizações (grades de cores/tamanhos, embalagens especiais) vinculáveis aos produtos."
 : isServices
 ? "Crie procedimentos extras e complementos de cuidado vinculáveis aos serviços."
 : "Crie opções adicionais e complementos reutilizáveis vinculáveis aos itens do catálogo.";

 const emptyText = isTourism
 ? "Cadastre opcionais para que os passageiros possam personalizar seus pacotes e viagens."
 : isGastro
 ? "Cadastre adicionais para que seus clientes possam personalizar pratos e lanches."
 : isRetail
 ? "Cadastre opções de grade ou personalizações para os produtos do catálogo."
 : "Cadastre opções adicionais para que seus clientes possam personalizar os itens.";

 const newGroupLabel = semantics.newModifierAction || "Novo Grupo de Complementos";

 const queryClient = useQueryClient();
 const [modalOpen, setModalOpen] = useState(false);
 const [editingGroup, setEditingGroup] = useState<any | null>(null);

 // Form states
 const [title, setTitle] = useState("");
 const [description, setDescription] = useState("");
 const [minSelection, setMinSelection] = useState(0);
 const [maxSelection, setMaxSelection] = useState(1);
 const [isRequired, setIsRequired] = useState(false);
 const [options, setOptions] = useState<OptionItem[]>([
 { name: "", price_cents: 0, is_active: true },
 ]);

 const { data: groups = [], isLoading } = useQuery({
 queryKey: ["store-complement-groups"],
 queryFn: () => listStoreComplementGroups(),
 });

 const saveMutation = useMutation({
 mutationFn: (payload: any) => saveStoreComplementGroup({ data: payload }),
 onSuccess: () => {
 toast.success("Grupo de complementos salvo com sucesso!");
 queryClient.invalidateQueries({ queryKey: ["store-complement-groups"] });
 setModalOpen(false);
 resetForm();
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao salvar grupo de complementos");
 },
 });

 const deleteMutation = useMutation({
 mutationFn: (id: string) => deleteStoreComplementGroup({ data: { id } }),
 onSuccess: () => {
 toast.success("Grupo excluído com sucesso");
 queryClient.invalidateQueries({ queryKey: ["store-complement-groups"] });
 },
 onError: (err: any) => {
 toast.error(err.message || "Erro ao excluir grupo");
 },
 });

 const resetForm = () => {
 setEditingGroup(null);
 setTitle("");
 setDescription("");
 setMinSelection(0);
 setMaxSelection(1);
 setIsRequired(false);
 setOptions([{ name: "", price_cents: 0, is_active: true }]);
 };

 const handleOpenNew = () => {
 resetForm();
 setModalOpen(true);
 };

 const handleEdit = (group: any) => {
 setEditingGroup(group);
 setTitle(group.title || "");
 setDescription(group.description || "");
 setMinSelection(group.min_selection ?? 0);
 setMaxSelection(group.max_selection ?? 1);
 setIsRequired(group.is_required ?? false);
 setOptions(
 Array.isArray(group.options) && group.options.length > 0
 ? group.options
 : [{ name: "", price_cents: 0, is_active: true }],
 );
 setModalOpen(true);
 };

 const handleAddOption = () => {
 setOptions([...options, { name: "", price_cents: 0, is_active: true }]);
 };

 const handleRemoveOption = (index: number) => {
 if (options.length === 1) return;
 setOptions(options.filter((_, i) => i !== index));
 };

 const handleOptionChange = (index: number, field: keyof OptionItem, value: any) => {
 const updated = [...options];
 updated[index] = { ...updated[index], [field]: value };
 setOptions(updated);
 };

 const handleSave = () => {
 if (!title.trim()) {
 toast.error("Informe o título do grupo de complementos");
 return;
 }
 const validOptions = options.filter((o) => o.name.trim() !== "");
 if (validOptions.length === 0) {
 toast.error("Adicione ao menos uma opção válida ao grupo");
 return;
 }

 saveMutation.mutate({
 id: editingGroup?.id,
 title: title.trim(),
 description: description.trim() || undefined,
 min_selection: Number(minSelection) || 0,
 max_selection: Math.max(1, Number(maxSelection) || 1),
 is_required: isRequired,
 options: validOptions,
 is_active: true,
 });
 };

 return (
 <div className="space-y-6">
 {/* Header da Aba */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-lg p-5">
 <div className="space-y-1">
 <div className="flex items-center gap-2">
 <Layers className="size-5 text-primary" />
 <h2 className="text-base font-bold text-foreground">
 {tabTitle}
 </h2>
 </div>
 <p className="text-xs text-muted-foreground">
 {tabSubtitle}
 </p>
 </div>

 <Button
 onClick={handleOpenNew}
 size="sm"
 className="rounded-lg font-bold text-xs h-9 px-4 gap-2 bg-primary text-primary-foreground cursor-pointer"
 >
 <Plus className="size-4" />
 {newGroupLabel}
 </Button>
 </div>

 {/* Lista de Grupos */}
 {isLoading ? (
 <div className="p-8 text-center text-xs text-muted-foreground">
 Carregando complementos...
 </div>
 ) : groups.length === 0 ? (
 <div className="py-12 text-center rounded-lg border border-dashed border-border bg-card/40 space-y-3">
 <div className="size-12 rounded-lg bg-muted flex items-center justify-center mx-auto text-muted-foreground">
 <Sliders className="size-6" />
 </div>
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground">Nenhum grupo cadastrado</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 {emptyText}
 </p>
 </div>
 <Button onClick={handleOpenNew} size="sm" variant="outline" className="rounded-lg text-xs font-bold cursor-pointer">
 <Plus className="size-3.5 mr-1" />
 Criar Primeiro Grupo
 </Button>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {groups.map((grp: any) => (
 <div
 key={grp.id}
 className="p-5 rounded-lg bg-card border border-border/80 flex flex-col justify-between space-y-4 hover:border-primary/50 transition-colors"
 >
 <div className="space-y-2">
 <div className="flex items-start justify-between gap-2">
 <h3 className="text-sm font-bold text-foreground leading-snug">
 {grp.title}
 </h3>
 <Badge variant={grp.is_required ? "default" : "outline"} className="text-[10px] shrink-0 font-bold">
 {grp.is_required ? "Obrigatório" : "Opcional"}
 </Badge>
 </div>

 {grp.description && (
 <p className="text-xs text-muted-foreground line-clamp-2">
 {grp.description}
 </p>
 )}

 <div className="text-[11px] font-mono text-muted-foreground bg-muted/30 px-3 py-1 rounded-lg inline-block">
 Escolha: Min {grp.min_selection} • Max {grp.max_selection}
 </div>

 {/* Lista de Opções */}
 <div className="space-y-2 pt-2 border-t border-border/60">
 <span className="text-[10px] font-bold text-muted-foreground uppercase">
 Opções ({grp.options?.length || 0})
 </span>
 <div className="space-y-1 max-h-36 overflow-y-auto no-scrollbar pr-1">
 {(grp.options || []).map((opt: any, i: number) => (
 <div
 key={i}
 className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-background/50 border border-border/40"
 >
 <span className="font-medium text-foreground truncate">{opt.name}</span>
 <span className="font-mono text-xs text-primary font-bold shrink-0">
 {opt.price_cents > 0 ? `+ ${formatMoney(opt.price_cents)}` : "Grátis"}
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>

 <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
 <Button
 size="sm"
 variant="ghost"
 onClick={() => handleEdit(grp)}
 className="rounded-lg text-xs font-semibold h-8 gap-1"
 >
 <Edit2 className="size-3.5" />
 Editar
 </Button>
 <Button
 size="sm"
 variant="ghost"
 onClick={() => {
 if (confirm(`Deseja excluir o grupo "${grp.title}"?`)) {
 deleteMutation.mutate(grp.id);
 }
 }}
 className="rounded-lg text-xs font-semibold h-8 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 gap-1"
 >
 <Trash2 className="size-3.5" />
 Excluir
 </Button>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Modal / Dialog de Criação/Edição */}
 <Dialog open={modalOpen} onOpenChange={setModalOpen}>
 <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar">
 <DialogHeader>
 <DialogTitle className="text-base font-bold">
 {editingGroup ? "Editar Grupo de Complementos" : "Novo Grupo de Complementos"}
 </DialogTitle>
 </DialogHeader>

 <div className="space-y-4 py-3">
 <div className="space-y-2">
 <Label className="text-xs font-bold">Nome do Grupo *</Label>
 <Input
 placeholder="Ex: Ponto da Carne, Queijo Extra, Borda..."
 value={title}
 onChange={(e) => setTitle(e.target.value)}
 className="h-10 rounded-lg text-xs font-medium"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold">Descrição (opcional)</Label>
 <Input
 placeholder="Ex: Escolha até 2 opções para turbinar seu prato"
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 className="h-9 rounded-lg text-xs"
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-2">
 <Label className="text-xs font-bold">Mínimo de Escolhas</Label>
 <Input
 type="number"
 min={0}
 value={minSelection}
 onChange={(e) => setMinSelection(Number(e.target.value))}
 className="h-9 rounded-lg text-xs font-mono"
 />
 </div>
 <div className="space-y-2">
 <Label className="text-xs font-bold">Máximo de Escolhas</Label>
 <Input
 type="number"
 min={1}
 value={maxSelection}
 onChange={(e) => setMaxSelection(Number(e.target.value))}
 className="h-9 rounded-lg text-xs font-mono"
 />
 </div>
 </div>

 <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/70">
 <div className="space-y-1">
 <span className="text-xs font-bold text-foreground">Seleção Obrigatória</span>
 <p className="text-[11px] text-muted-foreground">O cliente não pode avançar sem escolher</p>
 </div>
 <Switch checked={isRequired} onCheckedChange={setIsRequired} className="scale-75" />
 </div>

 {/* Opções dinâmicas */}
 <div className="space-y-2 pt-2 border-t border-border/60">
 <div className="flex items-center justify-between">
 <Label className="text-xs font-bold">Opções do Grupo</Label>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleAddOption}
 className="h-7 text-[11px] rounded-lg font-bold gap-1"
 >
 <Plus className="size-3" />
 Adicionar Opção
 </Button>
 </div>

 <div className="space-y-2 max-h-52 overflow-y-auto no-scrollbar pr-1">
 {options.map((opt, idx) => (
 <div key={idx} className="flex items-center gap-2">
 <Input
 placeholder={`Nome da opção ${idx + 1}`}
 value={opt.name}
 onChange={(e) => handleOptionChange(idx, "name", e.target.value)}
 className="h-9 rounded-lg text-xs flex-1"
 />
 <div className="w-28 relative">
 <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">R$</span>
 <Input
 type="number"
 step="0.50"
 min="0"
 placeholder="0,00"
 value={opt.price_cents > 0 ? (opt.price_cents / 100).toFixed(2) : ""}
 onChange={(e) =>
 handleOptionChange(
 idx,
 "price_cents",
 Math.round(parseFloat(e.target.value || "0") * 100),
 )
 }
 className="h-9 rounded-lg text-xs pl-8 font-mono"
 />
 </div>
 {options.length > 1 && (
 <Button
 type="button"
 size="icon"
 variant="ghost"
 onClick={() => handleRemoveOption(idx)}
 className="size-9 rounded-lg text-rose-500 hover:bg-rose-500/10 shrink-0"
 >
 <Trash2 className="size-4" />
 </Button>
 )}
 </div>
 ))}
 </div>
 </div>
 </div>

 <DialogFooter className="flex gap-2 sm:justify-end">
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setModalOpen(false)}
 className="rounded-lg text-xs font-semibold"
 >
 Cancelar
 </Button>
 <Button
 size="sm"
 onClick={handleSave}
 disabled={saveMutation.isPending}
 className="rounded-lg font-bold text-xs h-9 px-4 bg-primary text-primary-foreground"
 >
 {saveMutation.isPending ? "Salvando..." : "Salvar Grupo"}
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
