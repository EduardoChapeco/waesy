import { useState, useEffect } from "react";
import {
  Search,
  Wrench,
  Clock,
  Sparkles,
  Tag,
  CheckCircle2,
  X,
  Loader2,
  Layers,
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
import { searchCentralOnDemandServices } from "@/services/central-knowledge.functions";
import type { OnDemandMarketplaceService } from "@/lib/data/services-catalog";
import { formatMoney } from "@/lib/money";

interface ServiceSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectService: (service: OnDemandMarketplaceService) => void;
}

const CATEGORY_TABS = [
  { id: "all", label: "Todos os Serviços" },
  { id: "Reformas & Reparos", label: "Reformas & Reparos" },
  { id: "Tecnologia & Programação", label: "Dev & Tecnologia" },
  { id: "Design & Criação", label: "Design & Criação" },
  { id: "Marketing & Conteúdo", label: "Marketing & Conteúdo" },
  { id: "Serviços Domésticos", label: "Serviços Domésticos" },
  { id: "Saúde & Bem-Estar", label: "Saúde & Fitness" },
];

export function ServiceSearchDialog({
  open,
  onOpenChange,
  onSelectService,
}: ServiceSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [services, setServices] = useState<OnDemandMarketplaceService[]>([]);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await searchCentralOnDemandServices({
          data: {
            query: searchQuery.trim(),
            category: selectedCategory === "all" ? undefined : selectedCategory,
            limit: 40,
          },
        });

        if (isMounted) {
          setServices(res.services || []);
        }
      } catch (err) {
        console.error("Erro ao buscar no catálogo de serviços sob demanda:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [open, searchQuery, selectedCategory]);

  const handleSelect = (service: OnDemandMarketplaceService) => {
    onSelectService(service);
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
                Catálogo de Serviços Sob Demanda (GetNinjas / Workana / 99Freelas)
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
            Autopreenchimento de Serviços & Pacotes
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Selecione um serviço com descrição profissional, unidades de cobrança, faixas de preço de mercado e prazos. Você poderá editar todos os campos livremente.
          </SheetDescription>

          {/* BARRA DE PESQUISA */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por serviço, eletricista, site, diarista, tráfego..."
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

        {/* LISTAGEM DE SERVIÇOS */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-xs">Consultando banco de serviços sob demanda...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <Wrench className="w-10 h-10 stroke-1 mb-2 opacity-40" />
              <p className="text-sm font-medium text-foreground">Nenhum serviço encontrado</p>
              <p className="text-xs mt-1 max-w-xs">
                Tente buscar por termos como "pintura", "limpeza", "logo", "site", "ar condicionado" ou "personal".
              </p>
            </div>
          ) : (
            services.map((srv) => (
              <div
                key={srv.id}
                onClick={() => handleSelect(srv)}
                className="group p-4 rounded-xl border border-border/40 hover:border-primary/50 bg-card/60 hover:bg-muted/20 transition-all cursor-pointer flex flex-col gap-2.5 shadow-sm"
              >
                {/* TOPO: TÍTULO & CATEGORIA */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {srv.name}
                      </h4>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-border/60">
                        Cobrado por {srv.pricing_unit}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {srv.subcategory}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {srv.description}
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

                {/* FAIXA DE PREÇO & PRAZO */}
                <div className="flex items-center justify-between pt-1 border-t border-border/30 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-[11px]">Mercado médio:</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(srv.estimated_avg_price_cents)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ({formatMoney(srv.estimated_min_price_cents)} - {formatMoney(srv.estimated_max_price_cents)})
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Prazo médio: ~{srv.estimated_delivery_days} {srv.estimated_delivery_days === 1 ? 'dia' : 'dias'}</span>
                  </div>
                </div>

                {/* TAGS */}
                {srv.suggested_tags && srv.suggested_tags.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-0.5">
                    {srv.suggested_tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-background border border-border/40 text-muted-foreground px-1.5 py-0.5 rounded whitespace-nowrap"
                      >
                        #{tag}
                      </span>
                    ))}
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
