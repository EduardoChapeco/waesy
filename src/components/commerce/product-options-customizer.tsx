import React from "react";
import { Check, Plus, Minus, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";

export interface OptionValue {
 id: string;
 label: string;
 priceModifierCents: number;
 isDefault?: boolean;
}

export interface OptionGroup {
 id: string;
 internalName: string;
 displayName: string;
 selectionType: "single" | "multiple";
 minSelections?: number;
 maxSelections?: number;
 isRequired?: boolean;
 values: OptionValue[];
}

interface ProductOptionsCustomizerProps {
 optionGroups: OptionGroup[];
 selectedOptions: Record<string, string[]>;
 onChange: (groupId: string, valueIds: string[]) => void;
}

export function ProductOptionsCustomizer({
 optionGroups,
 selectedOptions,
 onChange,
}: ProductOptionsCustomizerProps) {
 if (!optionGroups || optionGroups.length === 0) return null;

 const handleSingleSelect = (groupId: string, valueId: string) => {
 onChange(groupId, [valueId]);
 };

 const handleMultipleToggle = (
 groupId: string,
 valueId: string,
 maxSelections?: number,
 ) => {
 const current = selectedOptions[groupId] || [];
 if (current.includes(valueId)) {
 onChange(
 groupId,
 current.filter((id) => id !== valueId),
 );
 } else {
 if (maxSelections && current.length >= maxSelections) {
 return; // Limit reached
 }
 onChange(groupId, [...current, valueId]);
 }
 };

 return (
 <div className="space-y-6 pt-4 ">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
 Personalize seu Pedido
 </h3>
 <span className="text-[11px] text-muted-foreground font-medium">
 Adicionais e Opções
 </span>
 </div>

 <div className="space-y-5">
 {optionGroups.map((group) => {
 const selected = selectedOptions[group.id] || [];
 const isComplete =
 !group.isRequired ||
 (group.minSelections
 ? selected.length >= group.minSelections
 : selected.length > 0);

 return (
 <div
 key={group.id}
 className="p-4 rounded-lg bg-card/60 space-y-3"
 >
 <div className="flex items-start justify-between gap-2">
 <div>
 <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
 <span>{group.displayName}</span>
 {group.isRequired && (
 <span className="text-xs text-destructive font-bold">*</span>
 )}
 </h4>
 <p className="text-[11px] text-muted-foreground">
 {group.selectionType === "single"
 ? "Escolha 1 opção"
 : `Escolha ${group.minSelections ? `no mínimo ${group.minSelections}` : ""} ${
 group.maxSelections
 ? `até ${group.maxSelections} opções`
 : "quantos desejar"
 }`}
 </p>
 </div>

 <Badge
 variant={isComplete ? "secondary" : "destructive"}
 className="text-[9px] font-bold uppercase tracking-wider"
 >
 {isComplete
 ? group.isRequired
 ? "Obrigatório ✓"
 : "Opcional"
 : "Pendente"}
 </Badge>
 </div>

 {/* Valores / Adicionais */}
 <div className="space-y-2 pt-1">
 {group.values.map((val) => {
 const isChecked = selected.includes(val.id);
 const isSingle = group.selectionType === "single";

 return (
 <button
 key={val.id}
 type="button"
 onClick={() =>
 isSingle
 ? handleSingleSelect(group.id, val.id)
 : handleMultipleToggle(
 group.id,
 val.id,
 group.maxSelections,
 )
 }
 className={`w-full p-3 rounded-lg border text-left transition-all flex items-center justify-between select-none cursor-pointer ${
 isChecked
 ? "bg-primary/10 border-primary text-foreground font-semibold"
 : "bg-card border-border/70 text-muted-foreground hover:border-border hover:bg-muted/30"
 }`}
 >
 <div className="flex items-center gap-3">
 <div
 className={`size-5 rounded-md flex items-center justify-center transition-all ${
 isSingle ? "rounded-full" : "rounded-md"
 } ${
 isChecked
 ? "bg-primary text-primary-foreground"
 : " bg-background"
 }`}
 >
 {isChecked && <Check className="size-3.5" />}
 </div>
 <span className="text-xs font-bold text-foreground">
 {val.label}
 </span>
 </div>

 <div className="text-xs font-mono font-bold text-foreground">
 {val.priceModifierCents > 0 ? (
 <span>+{formatMoney(val.priceModifierCents)}</span>
 ) : (
 <span className="text-muted-foreground font-normal">
 Grátis
 </span>
 )}
 </div>
 </button>
 );
 })}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}
