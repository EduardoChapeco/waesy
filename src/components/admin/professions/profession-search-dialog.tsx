import { useState, useEffect } from "react";
import {
  Search,
  Briefcase,
  GraduationCap,
  DollarSign,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  Loader2,
  TrendingUp,
  Tag,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { searchCentralProfessions } from "@/services/central-knowledge.functions";
import type { ProfessionDefinition } from "@/lib/data/professions-catalog";
import { formatMoney } from "@/lib/money";

interface ProfessionSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProfession: (profession: ProfessionDefinition) => void;
}

const CATEGORY_TABS = [
  { id: "all", label: "Todas as Áreas" },
  { id: "Tecnologia & Software", label: "Tecnologia & Dev" },
  { id: "Design & Produto", label: "Design & UX" },
  { id: "Marketing & Comunicação", label: "Marketing" },
  { id: "Vendas & Comercial", label: "Comercial" },
  { id: "Finanças & Contabilidade", label: "Finanças" },
  { id: "Operações & Logística", label: "Logística" },
  { id: "Turismo & Hospitalidade", label: "Turismo" },
  { id: "Gastronomia & Alimentos", label: "Gastronomia" },
];

export function ProfessionSearchDialog({
  open,
  onOpenChange,
  onSelectProfession,
}: ProfessionSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [professions, setProfessions] = useState<ProfessionDefinition[]>([]);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await searchCentralProfessions({
          data: {
            query: searchQuery.trim(),
            category: selectedCategory === "all" ? undefined : selectedCategory,
            limit: 40,
          },
        });

        if (isMounted) {
          setProfessions(res.professions || []);
        }
      } catch (err) {
        console.error("Erro ao buscar no catálogo de profissões:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [open, searchQuery, selectedCategory]);

  const handleSelect = (profession: ProfessionDefinition) => {
    onSelectProfession(profession);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col bg-background border-l border-border/40 shadow-2xl"
      >
        {/* CABEÇALHO */}
        <SheetHeader className="p-4 sm:p-6 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Banco Central de Profissões & Médias Salariais
              </span>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <SheetTitle className="text-xl font-bold tracking-tight text-foreground mt-1">
            Autopreenchimento Inteligente de Cargos & Vagas
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Selecione uma profissão oficial com código CBO, benchmarks salariais de Júnior a Lead e competências. Todos os dados são 100% editáveis no formulário.
          </SheetDescription>

          {/* BARRA DE PESQUISA */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cargo, código CBO ou competência..."
              className="pl-9 pr-4 h-10 text-sm bg-background border-border/60 focus:border-primary/60 rounded-lg shadow-sm"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* CHIPS DE CATEGORIAS */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-3 -mb-1">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`text-xs px-3 py-1 rounded-full whitespace-nowrap font-medium transition-all ${
                  selectedCategory === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* LISTAGEM DE PROFISSÕES */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-xs">Consultando banco central de profissões CBO/MTE...</p>
            </div>
          ) : professions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <Briefcase className="w-10 h-10 stroke-1 mb-2 opacity-40" />
              <p className="text-sm font-medium text-foreground">Nenhuma profissão encontrada</p>
              <p className="text-xs mt-1 max-w-xs">
                Tente buscar por termos mais genéricos como "desenvolvedor", "analista", "gerente", "cozinheiro" ou "vendedor".
              </p>
            </div>
          ) : (
            professions.map((prof) => (
              <div
                key={prof.id}
                onClick={() => handleSelect(prof)}
                className="group p-4 rounded-xl border border-border/40 hover:border-primary/50 bg-card/60 hover:bg-muted/20 transition-all cursor-pointer flex flex-col gap-2.5 shadow-sm"
              >
                {/* TOPO: TÍTULO & CBO */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {prof.title}
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4 border-border/60">
                        CBO {prof.cbo_code}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {prof.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {prof.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 h-8 px-2.5 text-xs text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                  >
                    Usar
                  </Button>
                </div>

                {/* MÉDIAS SALARIAIS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/30 text-[11px]">
                  <div className="bg-muted/30 p-2 rounded-lg">
                    <span className="text-muted-foreground block text-[10px]">Júnior</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(prof.average_salary_junior_cents)}
                    </span>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-lg">
                    <span className="text-muted-foreground block text-[10px]">Pleno</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(prof.average_salary_mid_cents)}
                    </span>
                  </div>
                  <div className="bg-muted/30 p-2 rounded-lg">
                    <span className="text-muted-foreground block text-[10px]">Sênior</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(prof.average_salary_senior_cents)}
                    </span>
                  </div>
                  <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                    <span className="text-emerald-700 dark:text-emerald-400 block text-[10px]">Benchmark Hora</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatMoney(prof.hourly_rate_benchmark_cents)}/h
                    </span>
                  </div>
                </div>

                {/* COMPETÊNCIAS & EDUCAÇÃO */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <GraduationCap className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                    <span className="truncate">{prof.required_education}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <Clock className="w-3 h-3" />
                    <span>{prof.standard_workload_hours_weekly}h/sem</span>
                  </div>
                </div>

                {/* SKILLS */}
                {prof.essential_skills && prof.essential_skills.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
                    {prof.essential_skills.slice(0, 4).map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-background border border-border/40 text-muted-foreground px-1.5 py-0.5 rounded whitespace-nowrap"
                      >
                        {skill}
                      </span>
                    ))}
                    {prof.essential_skills.length > 4 && (
                      <span className="text-[9px] text-muted-foreground/80">
                        +{prof.essential_skills.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
