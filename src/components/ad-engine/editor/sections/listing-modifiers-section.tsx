import React from "react";
import { SlidersHorizontal, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { CurrencyField } from "@/components/ui/currency-field";
import type { UnifiedNiche } from "@/types/unified-ad-engine";
import { cn } from "@/lib/utils";

export interface UnifiedModifierOption {
  id: string;
  name: string;
  price_cents: number;
}

export interface UnifiedModifierGroup {
  id: string;
  name: string;
  min_selection: number;
  max_selection: number;
  is_required: boolean;
  options: UnifiedModifierOption[];
}

export interface ListingModifiersSectionProps {
  niche: UnifiedNiche;
  groups: UnifiedModifierGroup[];
  onChange: (groups: UnifiedModifierGroup[]) => void;
  className?: string;
}

export function ListingModifiersSection({
  niche,
  groups,
  onChange,
  className,
}: ListingModifiersSectionProps) {
  const handleAddGroup = () => {
    const newGroup: UnifiedModifierGroup = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: "Novo Grupo de Adicionais",
      min_selection: 0,
      max_selection: 3,
      is_required: false,
      options: [
        { id: String(Date.now() + 1), name: "Opção 1", price_cents: 0 },
      ],
    };
    onChange([...groups, newGroup]);
  };

  const handleUpdateGroup = (groupIndex: number, patch: Partial<UnifiedModifierGroup>) => {
    const updated = groups.map((g, idx) => (idx === groupIndex ? { ...g, ...patch } : g));
    onChange(updated);
  };

  const handleRemoveGroup = (groupIndex: number) => {
    onChange(groups.filter((_, idx) => idx !== groupIndex));
  };

  const handleAddOption = (groupIndex: number) => {
    const group = groups[groupIndex];
    if (!group) return;
    const newOpt: UnifiedModifierOption = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: `Opção ${group.options.length + 1}`,
      price_cents: 0,
    };
    handleUpdateGroup(groupIndex, { options: [...group.options, newOpt] });
  };

  const handleUpdateOption = (
    groupIndex: number,
    optionIndex: number,
    patch: Partial<UnifiedModifierOption>
  ) => {
    const group = groups[groupIndex];
    if (!group) return;
    const nextOptions = group.options.map((opt, idx) => (idx === optionIndex ? { ...opt, ...patch } : opt));
    handleUpdateGroup(groupIndex, { options: nextOptions });
  };

  const handleRemoveOption = (groupIndex: number, optionIndex: number) => {
    const group = groups[groupIndex];
    if (!group) return;
    handleUpdateGroup(groupIndex, {
      options: group.options.filter((_, idx) => idx !== optionIndex),
    });
  };

  return (
    <div className={cn("bg-card rounded-2xl p-4 sm:p-5 border border-border/60 space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
          <SlidersHorizontal className="size-4 text-primary shrink-0" />
          <span>Adicionais, Opcionais & Modificadores</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddGroup}
          className="h-8 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
        >
          <Plus className="size-3.5" />
          <span>Criar Grupo</span>
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-muted/20 border border-border/40 space-y-2">
          <SlidersHorizontal className="size-8 text-muted-foreground mx-auto" />
          <p className="text-xs font-semibold text-foreground">Nenhum adicional configurado</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Ideal para complementos, upgrades de quarto, bebidas extras ou personalizações de pedido.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group, gIdx) => (
            <div
              key={group.id}
              className="p-4 rounded-xl border border-border/60 bg-background space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/40">
                <div className="flex-1 space-y-1">
                  <Input
                    value={group.name}
                    onChange={(e) => handleUpdateGroup(gIdx, { name: e.target.value })}
                    placeholder="Nome do Grupo (ex: Upgrades Opcionais)"
                    className="h-9 rounded-lg text-xs font-bold bg-background"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-2xs text-muted-foreground">Obrigatório?</Label>
                    <Switch
                      checked={group.is_required}
                      onCheckedChange={(checked) => handleUpdateGroup(gIdx, { is_required: checked })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveGroup(gIdx)}
                    className="size-8 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Remover grupo"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Lista de Opções */}
              <div className="space-y-2 pt-1">
                {group.options.map((opt, oIdx) => (
                  <div key={opt.id} className="flex items-center gap-2">
                    <Input
                      value={opt.name}
                      onChange={(e) => handleUpdateOption(gIdx, oIdx, { name: e.target.value })}
                      placeholder="Nome do adicional (ex: Café da Manhã Completo)"
                      className="h-9 rounded-lg text-xs bg-background flex-1"
                    />
                    <div className="w-32">
                      <CurrencyField
                        value={opt.price_cents}
                        onChange={(cents) => handleUpdateOption(gIdx, oIdx, { price_cents: cents })}
                        className="h-9 rounded-lg text-xs bg-background"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(gIdx, oIdx)}
                      className="size-8 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer shrink-0"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddOption(gIdx)}
                  className="h-8 text-xs text-primary gap-1 cursor-pointer pl-0 hover:bg-transparent"
                >
                  <Plus className="size-3.5" />
                  <span>Adicionar opção ao grupo</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
