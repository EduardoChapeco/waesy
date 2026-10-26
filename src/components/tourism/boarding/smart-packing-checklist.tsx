import { useState, useEffect } from "react";
import {
  Luggage,
  Check,
  Plus,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Shirt,
  Pill,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface PackingItem {
  id: string;
  label: string;
  category: "docs" | "tech" | "clothes" | "health" | "comfort";
  checked: boolean;
  isCustom?: boolean;
}

export interface SmartPackingChecklistProps {
  tripId: string;
  destination: string;
  durationDays?: number;
}

const DEFAULT_PACKING_ITEMS: Array<Omit<PackingItem, "id" | "checked">> = [
  // Documentos & Financeiro
  { label: "Documento com foto original (RG válido <10 anos ou Passaporte)", category: "docs" },
  { label: "Vouchers de hospedagem e bilhetes aéreos (PDF no celular)", category: "docs" },
  { label: "Apólice de Seguro Viagem impressa ou salva offline", category: "docs" },
  { label: "Cartão de crédito/débito habilitado para uso no destino", category: "docs" },

  // Eletrônicos & Conectividade
  { label: "Carregador de celular e cabo extra", category: "tech" },
  { label: "Carregador portátil (Powerbank de até 20.000mAh na mala de mão)", category: "tech" },
  { label: "Adaptador universal de tomadas", category: "tech" },
  { label: "Fone de ouvido para voo ou viagem rodoviária", category: "tech" },

  // Vestuário & Conforto
  { label: "Casaco leve corta-vento para a climatização do avião/ônibus", category: "clothes" },
  { label: "Roupas íntimas e meias para todos os dias da viagem", category: "clothes" },
  { label: "Calçado confortável amaciado para caminhadas e passeios", category: "clothes" },
  { label: "Óculos de sol e boné/chapéu", category: "clothes" },

  // Farmácia & Saúde
  { label: "Medicamentos de uso contínuo com receita médica legível", category: "health" },
  { label: "Analgésico, antitérmico e remédio para enjoo de movimento", category: "health" },
  { label: "Protetor solar e repelente de insetos", category: "health" },
  { label: "Curativos adesivos e soro fisiológico nasal", category: "health" },

  // Higiene & Mala de Mão
  { label: "Frascos de líquidos até 100ml em saquinho transparente selado", category: "comfort" },
  { label: "Escova, pasta de dente e fio dental", category: "comfort" },
  { label: "Almofada de pescoço ergonômica e máscara de dormir", category: "comfort" },
];

const CATEGORY_CONFIG: Record<
  PackingItem["category"],
  { label: string; icon: any; color: string }
> = {
  docs: { label: "Documentos & Financeiro", icon: ShieldCheck, color: "text-emerald-500" },
  tech: { label: "Eletrônicos & Conectividade", icon: Smartphone, color: "text-sky-500" },
  clothes: { label: "Vestuário & Calçados", icon: Shirt, color: "text-amber-500" },
  health: { label: "Farmácia & Saúde", icon: Pill, color: "text-rose-500" },
  comfort: { label: "Higiene & Conforto", icon: Sparkles, color: "text-purple-500" },
};

export function SmartPackingChecklist({ tripId, destination }: SmartPackingChecklistProps) {
  const storageKey = `waesy_packing_list_${tripId || "default"}`;

  const [items, setItems] = useState<PackingItem[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback para defaults
    }
    return DEFAULT_PACKING_ITEMS.map((item, idx) => ({
      ...item,
      id: `default-${idx}`,
      checked: false,
    }));
  });

  const [newItemText, setNewItemText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PackingItem["category"]>("docs");

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Ignorar falha de quota em navegadores privados
    }
  }, [items, storageKey]);

  const totalCount = items.length;
  const checkedCount = items.filter((i) => i.checked).length;
  const progressPercent = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newItemText.trim()) return;

    const newItem: PackingItem = {
      id: `custom-${Date.now()}`,
      label: newItemText.trim(),
      category: selectedCategory,
      checked: false,
      isCustom: true,
    };

    setItems((prev) => [...prev, newItem]);
    setNewItemText("");
    toast.success("Item adicionado ao checklist de bagagem!");
  };

  const handleReset = () => {
    const resetList = DEFAULT_PACKING_ITEMS.map((item, idx) => ({
      ...item,
      id: `default-${idx}`,
      checked: false,
    }));
    setItems(resetList);
    toast.info("Checklist reiniciado para os itens padrão de viagem.");
  };

  return (
    <div className="p-4 sm:p-6 rounded-lg bg-card border border-border space-y-6 shadow-2xs">
      {/* Cabeçalho do Checklist */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-primary/10 text-primary shrink-0">
            <Luggage className="size-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Mala Inteligente & Checklist de Embarque
            </h3>
            <p className="text-xs text-muted-foreground">
              Itens essenciais recomendados para sua viagem a <strong>{destination}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {checkedCount} de {totalCount} prontos ({progressPercent}%)
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-11 min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
            title="Reiniciar checklist de viagem"
          >
            <RotateCcw className="size-4 mr-1" />
            <span>Resetar</span>
          </Button>
        </div>
      </div>

      {/* Barra de Progresso Canônica */}
      <div className="space-y-2">
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-transform duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground font-mono">
          <span>{progressPercent === 100 ? "Mala 100% pronta para embarque!" : "Conferência pré-embarque"}</span>
          <span>{checkedCount}/{totalCount}</span>
        </div>
      </div>

      {/* Formulário para Adicionar Item Personalizado */}
      <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row items-stretch gap-2">
        <Input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Adicionar item à mala (ex: Adaptador de tomada)..."
          className="h-11 min-h-11 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as PackingItem["category"])}
            className="h-11 min-h-11 px-3 rounded-lg border border-border bg-background text-xs font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
          >
            <option value="docs">Documentos</option>
            <option value="tech">Eletrônicos</option>
            <option value="clothes">Vestuário</option>
            <option value="health">Saúde</option>
            <option value="comfort">Conforto</option>
          </select>

          <Button
            type="submit"
            className="h-11 min-h-11 px-4 text-xs font-bold gap-2 shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Adicionar</span>
          </Button>
        </div>
      </form>

      {/* Lista de Itens por Categoria */}
      <div className="space-y-5">
        {(Object.keys(CATEGORY_CONFIG) as Array<PackingItem["category"]>).map((catKey) => {
          const categoryItems = items.filter((i) => i.category === catKey);
          if (categoryItems.length === 0) return null;

          const config = CATEGORY_CONFIG[catKey];
          const CategoryIcon = config.icon;

          return (
            <div key={catKey} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1">
                <CategoryIcon className={cn("size-4", config.color)} />
                <span>{config.label}</span>
                <span className="text-muted-foreground font-mono font-normal">
                  ({categoryItems.filter((i) => i.checked).length}/{categoryItems.length})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleItem(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleItem(item.id);
                      }
                    }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border text-left transition-colors cursor-pointer select-none",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      item.checked
                        ? "bg-primary/5 border-primary/30 text-muted-foreground line-through"
                        : "bg-muted/20 border-border hover:bg-muted/40 text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3 pr-2">
                      <div
                        className={cn(
                          "size-5 rounded border flex items-center justify-center shrink-0 transition-colors",
                          item.checked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border bg-background"
                        )}
                      >
                        {item.checked && <Check className="size-3.5 stroke-2" />}
                      </div>
                      <span className="text-xs font-medium leading-relaxed break-words">
                        {item.label}
                      </span>
                    </div>

                    {item.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.id);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
                        title="Remover item"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
