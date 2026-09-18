import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Barcode,
  Package,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Tag,
  Percent,
  X,
  Loader2,
  Building2,
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
import {
  searchMasterCatalogProducts,
} from "@/services/master-catalog.functions";
import type { MasterProductRecord } from "@/lib/data/master-products-catalog";
import { formatMoney } from "@/lib/money";

interface MasterCatalogSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct: (product: MasterProductRecord) => void;
}

const CATEGORY_TABS = [
  { id: "all", label: "Todos os Itens" },
  { id: "Alimentos & Mercearia", label: "Alimentos" },
  { id: "Bebidas", label: "Bebidas" },
  { id: "Gastronomia", label: "Gastronomia & Restaurantes" },
  { id: "Móveis", label: "Móveis & Decoração" },
  { id: "Eletrodomésticos", label: "Eletrodomésticos" },
  { id: "Automotivo", label: "Automotivo & Peças" },
  { id: "Eletrônicos & Acessórios", label: "Eletrônicos" },
  { id: "Limpeza & Lavanderia", label: "Limpeza" },
  { id: "Higiene & Cuidados Pessoais", label: "Higiene" },
  { id: "Papelaria & Escritório", label: "Papelaria" },
  { id: "Bazar & Utilidades", label: "Bazar" },
];

export function MasterCatalogSearchDialog({
  open,
  onOpenChange,
  onSelectProduct,
}: MasterCatalogSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<MasterProductRecord[]>([]);

  // Carregar produtos conforme busca ou filtro
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const isBarcode = /^\d{8,14}$/.test(searchQuery.trim());
        const res = await searchMasterCatalogProducts({
          data: {
            query: isBarcode ? "" : searchQuery.trim(),
            barcode: isBarcode ? searchQuery.trim() : undefined,
            category: selectedCategory === "all" ? undefined : selectedCategory,
            limit: 40,
          },
        });

        if (isMounted) {
          setProducts(res.products || []);
        }
      } catch (err) {
        console.error("Erro ao buscar no catálogo mestre:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [open, searchQuery, selectedCategory]);

  const handleSelect = (product: MasterProductRecord) => {
    onSelectProduct(product);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size="wide"
        className="w-full max-sm:!max-w-full max-sm:!w-screen sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border"
      >
        {/* Cabeçalho */}
        <SheetHeader className="p-5 pb-4 border-b border-border/80 bg-muted/20 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="size-4" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Catálogo Central de Produtos & Dados Fiscais</span>
                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 font-semibold">
                    Reforma Tributária 2026
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                  Pesquise por nome, marca, código de barras (EAN-13) ou NCM para preencher o cadastro completo em 1 toque.
                </SheetDescription>
              </div>
            </div>
          </div>

          {/* Campo de Busca & Bipador EAN */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Digite o nome do produto, marca, NCM ou bipe o código de barras (ex: Arroz, Heineken, 7891149103102)..."
              className="pl-9 pr-9 h-11 text-xs rounded-xl bg-background border-border/80 shadow-2xs font-medium"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Categorias / Departamentos */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5">
            {CATEGORY_TABS.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* Lista de Resultados */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2.5 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">Consultando base mestre de produtos...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center p-6 bg-muted/20 rounded-2xl border border-dashed border-border/70">
              <Package className="size-10 text-muted-foreground/50 mb-2" />
              <h4 className="text-sm font-bold text-foreground">Nenhum produto localizado</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Tente buscar por termos mais genéricos, outro departamento ou limpe os filtros de busca.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {products.map((p) => {
                const isExempt = p.tax_regime === "isento_cesta_basica" || p.ibs_rate === 0;

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-card border border-border/70 hover:border-primary/50 transition-all hover:shadow-sm flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Miniatura do Produto */}
                      <div className="size-16 rounded-xl bg-muted/30 border border-border/60 overflow-hidden shrink-0 flex items-center justify-center">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="size-full object-contain p-1"
                            loading="lazy"
                          />
                        ) : (
                          <Package className="size-6 text-muted-foreground/40" />
                        )}
                      </div>

                      {/* Informações Centrais */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                            {p.brand_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">•</span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {p.category}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                          {p.name}
                        </h4>

                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-xs font-mono font-bold text-foreground">
                            {formatMoney(p.suggested_price_cents)}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            /{p.selling_unit.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Barra de Inteligência Fiscal */}
                    <div className="p-2 rounded-xl bg-muted/30 border border-border/50 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-mono">
                          NCM: <strong className="text-foreground">{p.ncm_code}</strong>
                        </span>
                        {p.cest_code && (
                          <span className="font-mono">
                            CEST: <strong className="text-foreground">{p.cest_code}</strong>
                          </span>
                        )}
                        <span className="font-mono">
                          CFOP: <strong className="text-foreground">{p.cfop_default}</strong>
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-0.5 border-t border-border/40">
                        <div className="flex items-center gap-1.5">
                          {isExempt ? (
                            <Badge className="h-5 text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
                              Cesta Básica (IBS/CBS 0%)
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <span>IBS: <strong className="text-foreground">{p.ibs_rate}%</strong></span>
                              <span>•</span>
                              <span>CBS: <strong className="text-foreground">{p.cbs_rate}%</strong></span>
                            </div>
                          )}
                        </div>

                        <span className="text-[10px] font-mono text-muted-foreground">
                          EAN: {p.barcode_ean}
                        </span>
                      </div>
                    </div>

                    {/* Botão de Importação em 1 Toque */}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSelect(p)}
                      className="w-full h-8 rounded-xl text-xs font-bold gap-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>Usar Este Produto</span>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
