import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { SlidersHorizontal, Plus, Edit2, ExternalLink, CheckCircle2, Layers, Sliders, Utensils, PlusCircle } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickOptionGroupDialog } from "./quick-option-group-dialog";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface ProductModifiersCardProps {
 groups: any[];
 selectedGroupIds: string[];
 onSelectedGroupsChange: (newSelectedIds: string[]) => void;
 onGroupsListChange?: (newGroups: any[]) => void;
}

export function ProductModifiersCard({
 groups: initialGroups = [],
 selectedGroupIds = [],
 onSelectedGroupsChange,
 onGroupsListChange,
}: ProductModifiersCardProps) {
 const [groups, setGroups] = useState<any[]>(initialGroups);
 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [editingGroup, setEditingGroup] = useState<any | null>(null);

 // Sincroniza caso a prop inicial mude
 if (initialGroups !== groups && initialGroups.length > 0 && groups.length === 0) {
 setGroups(initialGroups);
 }

 const handleCreateNew = () => {
 setEditingGroup(null);
 setIsDialogOpen(true);
 };

 const handleEdit = (grp: any, e: React.MouseEvent) => {
 e.stopPropagation();
 e.preventDefault();
 setEditingGroup(grp);
 setIsDialogOpen(true);
 };

 const handleSaved = (savedGroup: any) => {
 setGroups((prev) => {
 const exists = prev.some((g) => g.id === savedGroup.id);
 let updated: any[];
 if (exists) {
 updated = prev.map((g) => (g.id === savedGroup.id ? savedGroup : g));
 } else {
 updated = [savedGroup, ...prev];
 // Auto-seleciona o novo grupo criado para o produto
 if (!selectedGroupIds.includes(savedGroup.id)) {
 onSelectedGroupsChange([...selectedGroupIds, savedGroup.id]);
 }
 }
 onGroupsListChange?.(updated);
 return updated;
 });
 };

 const toggleGroup = (groupId: string) => {
 if (selectedGroupIds.includes(groupId)) {
 onSelectedGroupsChange(selectedGroupIds.filter((id) => id !== groupId));
 } else {
 onSelectedGroupsChange([...selectedGroupIds, groupId]);
 }
 };

 return (
 <div className="bg-card rounded-2xl p-5 space-y-4 border border-border/60 ">
 {/* CABEÇALHO */}
 <div className="flex items-center justify-between gap-3">
 <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
 <SlidersHorizontal className="size-4 text-primary" />
 <span>Adicionais e Modificadores</span>
 {groups.length > 0 && (
 <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4.5">
 {selectedGroupIds.length}/{groups.length} ativos
 </Badge>
 )}
 </div>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={handleCreateNew}
 className="h-7 text-xs gap-1.5 font-medium border-dashed text-primary hover:text-primary hover:bg-primary/5"
 >
 <Plus className="size-3.5" />
 Novo Grupo
 </Button>

 <Link
 to="/workspace/catalogo/atributos"
 className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
 title="Abrir gerenciador de atributos"
 >
 <span>Gerenciar</span>
 <ExternalLink className="size-3" />
 </Link>
 </div>
 </div>

 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Selecione quais grupos de adicionais e opções estarão disponíveis para o cliente escolher neste produto:
 </p>

 {/* CONTEÚDO PRINCIPAL: LISTA OU EMPTY STATE PROATIVO */}
 {groups.length > 0 ? (
 <div className="grid grid-cols-1 gap-2.5 pt-1">
 {groups.map((grp: any) => {
 const isChecked = selectedGroupIds.includes(grp.id);
 const values = grp.values || [];

 return (
 <div
 key={grp.id}
 onClick={() => toggleGroup(grp.id)}
 className={cn(
 "relative flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all text-xs select-none group",
 isChecked
 ? "border-primary/80 bg-primary/[0.03] text-foreground shadow-xs ring-1 ring-primary/20"
 : "border-border/80 bg-background text-muted-foreground hover:border-foreground/30 hover:bg-muted/20",
 )}
 >
 {/* CHECKBOX */}
 <div className="pt-0.5">
 <input
 type="checkbox"
 className="rounded border-border text-primary focus:ring-primary size-4.5 cursor-pointer accent-primary"
 checked={isChecked}
 onChange={() => toggleGroup(grp.id)}
 onClick={(e) => e.stopPropagation()}
 />
 </div>

 {/* INFORMAÇÕES DO GRUPO */}
 <div className="min-w-0 flex-1 space-y-1">
 <div className="flex items-center justify-between gap-2 pr-8">
 <p className="font-bold text-foreground truncate text-xs">
 {grp.display_name || grp.internal_name}
 </p>
 </div>

 {/* REGRAS & BADGES */}
 <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
 <Badge
 variant={grp.is_required ? "default" : "secondary"}
 className={cn(
 "text-[9px] px-1.5 py-0 h-4 font-semibold uppercase tracking-wider",
 grp.is_required ? "bg-warning text-warning-foreground hover:bg-warning/90" : "text-muted-foreground",
 )}
 >
 {grp.is_required ? "Obrigatório" : "Opcional"}
 </Badge>

 <span className="text-muted-foreground font-mono">
 {grp.selection_type === "single"
 ? "Escolha 1"
 : `Mín: ${grp.min_selections ?? 0} • Máx: ${grp.max_selections ?? 1}`}
 </span>

 <span className="text-muted-foreground">•</span>

 <span className="text-muted-foreground">
 {values.length} opção(ões)
 </span>
 </div>

 {/* PREVIEW DAS PRIMEIRAS OPÇÕES */}
 {values.length > 0 && (
 <div className="flex flex-wrap gap-1 pt-1">
 {values.slice(0, 4).map((val: any) => (
 <span
 key={val.id || val.label}
 className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 text-[10px] text-muted-foreground font-medium"
 >
 <span>{val.label}</span>
 {val.price_modifier_cents > 0 && (
 <span className="text-primary font-bold">
 +{formatMoney(val.price_modifier_cents)}
 </span>
 )}
 </span>
 ))}
 {values.length > 4 && (
 <span className="text-[10px] text-muted-foreground self-center px-1">
 +{values.length - 4} mais
 </span>
 )}
 </div>
 )}
 </div>

 {/* BOTÃO DE EDIÇÃO RÁPIDA */}
 <button
 type="button"
 onClick={(e) => handleEdit(grp, e)}
 title="Editar este grupo de adicionais"
 className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors opacity-80 group-hover:opacity-100"
 >
 <Edit2 className="size-3.5" />
 </button>
 </div>
 );
 })}
 </div>
 ) : (
 /* EMPTY STATE PROATIVO COM BOTÃO '+' CENTRAL */
 <div
 onClick={handleCreateNew}
 className="group relative flex flex-col items-center justify-center p-8 text-center rounded-2xl border-2 border-dashed border-border/80 hover:border-primary/50 bg-muted/10 hover:bg-primary/[0.02] cursor-pointer transition-all space-y-3"
 >
 <div className="size-12 rounded-2xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center text-primary transition-all group-hover:scale-110 shadow-xs ring-4 ring-primary/5">
 <Plus className="size-6 stroke-[2.5]" />
 </div>

 <div className="space-y-1 max-w-sm">
 <h4 className="text-xs font-bold text-foreground">
 Criar Primeiro Grupo de Adicionais
 </h4>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Turbine seu catálogo adicionando opções como ponto da carne, bebidas, tamanhos e adicionais extras pagos.
 </p>
 </div>

 <Button
 type="button"
 variant="default"
 size="sm"
 onClick={(e) => {
 e.stopPropagation();
 handleCreateNew();
 }}
 className="h-8 text-xs font-bold gap-1.5 shadow-xs"
 >
 <Plus className="size-3.5" />
 Adicionar Rapidamente
 </Button>
 </div>
 )}

 {/* DIALOG CANÔNICO DE CRIAÇÃO / EDIÇÃO */}
 <QuickOptionGroupDialog
 open={isDialogOpen}
 onOpenChange={setIsDialogOpen}
 groupToEdit={editingGroup}
 onSaved={handleSaved}
 />
 </div>
 );
}
