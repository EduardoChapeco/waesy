/**
 * contract-variable-picker.tsx — Seletor de Variáveis Inteligentes por Nicho
 * Plataforma Waesy (Padrão Pipefy / DocuSign / Notion)
 *
 * Permite que o autor do contrato insira blocos dinâmicos como {{cliente_nome}},
 * {{valor_total}}, {{placa_veiculo}}, {{destino_hotel}} com 1 clique.
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
  Info,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  type ContractNicheGroup,
} from "@/lib/contracts/contract-semantic-dictionary";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ContractVariablePickerProps {
  onInsertVariable: (token: string) => void;
  className?: string;
  defaultNiche?: string;
}

const NICHE_ICONS: Record<string, React.ReactNode> = {
  geral: <Users className="size-3.5" />,
  financeiro: <DollarSign className="size-3.5" />,
  turismo: <Compass className="size-3.5" />,
  automotivo: <Car className="size-3.5" />,
  imobiliario: <Home className="size-3.5" />,
  juridico: <Scale className="size-3.5" />,
  condicional: <ShoppingBag className="size-3.5" />,
  rh: <Briefcase className="size-3.5" />,
};

const NICHE_COLORS: Record<string, { bg: string; text: string; border: string; hover: string }> = {
  geral: { bg: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20", hover: "hover:bg-blue-500/20" },
  financeiro: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20", hover: "hover:bg-emerald-500/20" },
  turismo: { bg: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", border: "border-sky-500/20", hover: "hover:bg-sky-500/20" },
  automotivo: { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/20", hover: "hover:bg-purple-500/20" },
  imobiliario: { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20", hover: "hover:bg-amber-500/20" },
  juridico: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/20", hover: "hover:bg-rose-500/20" },
  condicional: { bg: "bg-pink-500/10", text: "text-pink-700 dark:text-pink-300", border: "border-pink-500/20", hover: "hover:bg-pink-500/20" },
  rh: { bg: "bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-500/20", hover: "hover:bg-indigo-500/20" },
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
    // Se estiver buscando, procura em TODOS os nichos
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
    toast.success(`Variável ${v.token} inserida na minuta!`, {
      description: `Exemplo real: "${v.example}"`,
      duration: 2500,
    });
    setTimeout(() => setLastInserted(null), 1800);
  };

  return (
    <div className={cn("p-3.5 rounded-2xl bg-card border border-border/70 shadow-xs space-y-3", className)}>
      {/* Cabeçalho da Barra */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              Variáveis Inteligentes
              <Badge variant="outline" className="text-[10px] font-normal py-0">
                Auto-Preenchimento
              </Badge>
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Clique em uma variável para inseri-la no texto do seu contrato.
            </p>
          </div>
        </div>

        {/* Busca rápida de variáveis */}
        <div className="relative w-full sm:w-56">
          <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar variável (ex: placa, valor)..."
            className="h-8 pl-8 text-xs rounded-xl bg-background"
          />
        </div>
      </div>

      {/* Abas dos Nichos (quando não há busca ativa) */}
      {!searchTerm.trim() && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CONTRACT_SEMANTIC_GROUPS.map((group) => {
            const isActive = group.id === activeNiche;
            const colors = NICHE_COLORS[group.id] || NICHE_COLORS.geral;

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveNiche(group.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer border",
                  isActive
                    ? cn("shadow-xs", colors.bg, colors.text, colors.border)
                    : "bg-muted/40 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/70"
                )}
              >
                {NICHE_ICONS[group.id]}
                <span>{group.name}</span>
                <span className="text-[10px] opacity-70">({group.variables.length})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grade de Badges Dinâmicos Clicáveis */}
      <TooltipProvider delayDuration={150}>
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
          {filteredVariables.length === 0 ? (
            <div className="w-full py-4 text-center text-xs text-muted-foreground">
              Nenhuma variável encontrada para &quot;{searchTerm}&quot;.
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
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                        colors.bg,
                        colors.text,
                        colors.border,
                        colors.hover,
                        isJustInserted && "ring-2 ring-primary scale-105"
                      )}
                    >
                      {isJustInserted ? (
                        <Check className="size-3 text-emerald-500 animate-in zoom-in" />
                      ) : (
                        <Plus className="size-3 opacity-60" />
                      )}
                      <span>{variable.label}</span>
                      <span className="text-[10px] font-mono opacity-60 ml-0.5">{variable.token}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs space-y-1">
                    <p className="font-bold">{variable.label}</p>
                    <p className="text-muted-foreground">{variable.description}</p>
                    <div className="pt-1 border-t border-border/40 text-[11px] text-primary">
                      Exemplo: <span className="font-medium text-foreground">{variable.example}</span>
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
