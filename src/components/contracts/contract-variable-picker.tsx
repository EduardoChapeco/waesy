/**
 * contract-variable-picker.tsx — Seletor de Dados Automáticos por Nicho
 * Plataforma Waesy (Padrão Apple HIG & Notion)
 *
 * Permite que o lojista insira dados comerciais automáticos como Nome do Cliente,
 * Valor Total, Placa do Carro ou Destino da Viagem com 1 toque confortável.
 */

import { useState, useMemo } from "react";
import {
  Users,
  DollarSign,
  Compass,
  Car,
  Home,
  Scale,
  ShoppingBag,
  Briefcase,
  Search,
  Sparkles,
  Plus,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CONTRACT_SEMANTIC_GROUPS,
  type ContractSemanticVariable,
} from "@/lib/contracts/contract-semantic-dictionary";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ContractVariablePickerProps {
  onInsertVariable: (token: string) => void;
  className?: string;
  defaultNiche?: string;
}

const NICHE_ICONS: Record<string, React.ReactNode> = {
  geral: <Users className="size-4" />,
  financeiro: <DollarSign className="size-4" />,
  turismo: <Compass className="size-4" />,
  automotivo: <Car className="size-4" />,
  imobiliario: <Home className="size-4" />,
  juridico: <Scale className="size-4" />,
  condicional: <ShoppingBag className="size-4" />,
  rh: <Briefcase className="size-4" />,
};

const NICHE_COLORS: Record<string, { bg: string; text: string; border: string; hover: string }> = {
  geral: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/25", hover: "hover:bg-blue-500/20" },
  financeiro: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/25", hover: "hover:bg-emerald-500/20" },
  turismo: { bg: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", border: "border-sky-500/25", hover: "hover:bg-sky-500/20" },
  automotivo: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/25", hover: "hover:bg-purple-500/20" },
  imobiliario: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/25", hover: "hover:bg-amber-500/20" },
  juridico: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/25", hover: "hover:bg-rose-500/20" },
  condicional: { bg: "bg-pink-500/10", text: "text-pink-700 dark:text-pink-300", border: "border-pink-500/25", hover: "hover:bg-pink-500/20" },
  rh: { bg: "bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-500/25", hover: "hover:bg-indigo-500/20" },
};

export function ContractVariablePicker({
  onInsertVariable,
  className,
  defaultNiche = "geral",
}: ContractVariablePickerProps) {
  const [activeNiche, setActiveNiche] = useState<string>(defaultNiche);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [lastInserted, setLastInserted] = useState<string | null>(null);

  // Filtragem
  const currentGroup = useMemo(() => {
    return CONTRACT_SEMANTIC_GROUPS.find((g) => g.id === activeNiche) || CONTRACT_SEMANTIC_GROUPS[0];
  }, [activeNiche]);

  const filteredVariables = useMemo(() => {
    if (!searchTerm.trim()) return currentGroup.variables;

    const term = searchTerm.toLowerCase();
    const all = CONTRACT_SEMANTIC_GROUPS.flatMap((g) => g.variables);
    return all.filter(
      (v) =>
        v.label.toLowerCase().includes(term) ||
        v.key.toLowerCase().includes(term) ||
        v.description.toLowerCase().includes(term)
    );
  }, [currentGroup, searchTerm]);

  const handleSelect = (v: ContractSemanticVariable) => {
    onInsertVariable(v.token);
    setLastInserted(v.token);
    toast.success(`"${v.label}" adicionado ao contrato!`, {
      description: `Exemplo real: "${v.example}"`,
      duration: 2000,
    });
    setTimeout(() => setLastInserted(null), 1800);
  };

  return (
    <div className={cn("p-4 rounded-2xl bg-card border border-border/70 shadow-xs space-y-3.5", className)}>
      {/* Cabeçalho da Barra — Comercial & Direto */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="size-4.5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
              Campos Automáticos
              <Badge variant="outline" className="text-xs font-semibold py-0.5 px-2 bg-muted/40">
                Preenchimento Inteligente
              </Badge>
            </h4>
            <p className="text-xs text-muted-foreground">
              Toque em qualquer dado para inserir no contrato. O sistema preenche na hora da venda.
            </p>
          </div>
        </div>

        {/* Busca rápida com altura confortável (40px) */}
        <div className="relative w-full sm:w-64">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar dado (ex: placa, valor)..."
            className="h-9.5 pl-9 text-xs sm:text-sm rounded-xl bg-background border-border/70"
          />
        </div>
      </div>

      {/* Abas dos Nichos (Scroll Horizontal Ergonômico) */}
      {!searchTerm.trim() && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
          {CONTRACT_SEMANTIC_GROUPS.map((group) => {
            const isActive = group.id === activeNiche;
            const colors = NICHE_COLORS[group.id] || NICHE_COLORS.geral;

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveNiche(group.id)}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer border",
                  isActive
                    ? cn("shadow-xs ring-1 ring-primary/20", colors.bg, colors.text, colors.border)
                    : "bg-muted/40 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/70"
                )}
              >
                {NICHE_ICONS[group.id]}
                <span>{group.name}</span>
                <span className="text-xs opacity-75">({group.variables.length})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grade de Badges Dinâmicos com Alvos de Toque Confortáveis */}
      <TooltipProvider delayDuration={150}>
        <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
          {filteredVariables.length === 0 ? (
            <div className="w-full py-6 text-center text-xs sm:text-sm text-muted-foreground">
              Nenhum dado encontrado para &quot;{searchTerm}&quot;.
            </div>
          ) : (
            filteredVariables.map((variable) => {
              const colors = NICHE_COLORS[variable.category] || NICHE_COLORS.geral;
              const isJustInserted = lastInserted === variable.token;

              return (
                <Tooltip key={variable.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleSelect(variable)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium border transition-all cursor-pointer min-h-[36px]",
                        colors.bg,
                        colors.text,
                        colors.border,
                        colors.hover,
                        isJustInserted && "ring-2 ring-primary scale-105"
                      )}
                    >
                      {isJustInserted ? (
                        <Check className="size-3.5 text-emerald-500 animate-in zoom-in" />
                      ) : (
                        <Plus className="size-3.5 opacity-60" />
                      )}
                      <span className="font-semibold">{variable.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs space-y-1.5 p-2.5 rounded-xl">
                    <p className="font-bold text-sm text-foreground">{variable.label}</p>
                    <p className="text-muted-foreground leading-relaxed">{variable.description}</p>
                    <div className="pt-1.5 border-t border-border/40 text-xs text-primary font-medium">
                      Exemplo preenchido: <span className="text-foreground font-semibold">&quot;{variable.example}&quot;</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
