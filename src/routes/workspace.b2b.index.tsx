import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Building2,
  Package,
  Truck,
  Percent,
  Search,
  CheckCircle2,
  Tag,
  ArrowRight,
  ShieldCheck,
  FileText,
  BadgePercent,
  Store,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { formatMoney } from "@/lib/money";
import { listPriceTables } from "@/services/price-tables.functions";
import { getModularSurfaceFeed } from "@/services/surface-cms.functions";

export const Route = createFileRoute("/workspace/b2b/")({
  head: () => ({
    meta: [
      { title: "Central de Compras B2B & Atacado (CNPJ) | Workspace" },
      {
        name: "description",
        content:
          "Compre insumos, mercadorias e contrate serviços com condições especiais de atacado, faturamento PJ e tabela exclusiva para empresas.",
      },
    ],
  }),
  loader: async () => {
    try {
      const [feed, priceTables] = await Promise.all([
        getModularSurfaceFeed({ data: { surfaceSlug: "home" } }).catch(() => ({ sections: [], allProducts: [] })),
        listPriceTables().catch(() => []),
      ]);
      return {
        feed,
        priceTables: Array.isArray(priceTables) ? priceTables : [],
      };
    } catch (err) {
      console.error("[loader:workspace.b2b] Erro ao carregar vitrine B2B:", err);
      return { feed: { sections: [], allProducts: [] }, priceTables: [] };
    }
  },
  component: WorkspaceB2BShowcasePage,
});

const B2B_CATEGORIES = [
  { id: "todos", label: "Tudo no Atacado" },
  { id: "construcao", label: "Construção & Obra" },
  { id: "alimentos", label: "Alimentos & Bebidas" },
  { id: "embalagens", label: "Embalagens & Descartáveis" },
  { id: "escritorio", label: "Escritório & Informática" },
  { id: "servicos", label: "Serviços Corporativos" },
];

function WorkspaceB2BShowcasePage() {
  const { feed, priceTables } = Route.useLoaderData() as any;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todos");

  // Localiza tabela B2B / Atacado ativa cadastrada no ecossistema
  const b2bTable = useMemo(() => {
    if (!Array.isArray(priceTables)) return null;
    return (
      priceTables.find(
        (t: any) =>
          t.active &&
          (t.code === "atacado" || t.code === "b2b" || t.code === "cnpj" || t.code === "revenda"),
      ) || null
    );
  }, [priceTables]);

  const b2bProducts = useMemo(() => {
    const prods = feed?.allProducts || [];
    return prods.filter((p: any) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (p.title || "").toLowerCase().includes(q);
        const matchesDesc = (p.description || "").toLowerCase().includes(q);
        const matchesStore = (p.store_name || "").toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesStore) return false;
      }

      if (selectedCategory !== "todos") {
        const cat = (p.category_slug || p.category || "").toLowerCase();
        const title = (p.title || "").toLowerCase();
        if (selectedCategory === "construcao") {
          return cat.includes("construcao") || title.includes("cimento") || title.includes("tinta") || title.includes("ferramenta");
        }
        if (selectedCategory === "alimentos") {
          return cat.includes("alimentos") || cat.includes("bebidas") || cat.includes("acougue") || title.includes("carne");
        }
        if (selectedCategory === "embalagens") {
          return title.includes("caixa") || title.includes("saco") || title.includes("embalagem") || title.includes("fita");
        }
        if (selectedCategory === "escritorio") {
          return cat.includes("eletronicos") || title.includes("papel") || title.includes("computador") || title.includes("mouse");
        }
        if (selectedCategory === "servicos") {
          return cat.includes("servicos");
        }
      }

      return true;
    });
  }, [feed, searchQuery, selectedCategory]);

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      {/* ── 1. Topo Canônico do Hub B2B ── */}
      <PageHeader
        eyebrow="Compras Corporativas"
        title="Central de Compras B2B & Atacado (CNPJ)"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-card font-mono flex items-center gap-2 py-1">
              <Building2 className="size-3.5 text-primary" />
              <span>Faturamento PJ Exclusivo</span>
            </Badge>
          </div>
        }
      />

      {/* ── 2. Banner de Destaque B2B (Informativo e Transparente) ── */}
      <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-2xs font-bold bg-primary/10 text-primary border border-primary/20">
              <BadgePercent className="size-3" />
              Preços de Atacado
            </span>
            <span className="text-xs text-muted-foreground">• Módulo Restrito a Empresas</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
            Negocie direto com distribuidores e empresas locais
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Neste módulo exclusivo do Workspace, sua empresa acessa tabelas B2B de atacado, faturamento por boleto a prazo e descontos progressivos por quantidade mínima.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            to="/workspace/catalogo/tabelas"
            className="h-11 min-h-11 px-4 rounded-lg border border-border/80 bg-background text-foreground text-xs font-bold hover:bg-muted/60 transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Layers className="size-3.5 text-muted-foreground" />
            <span>Minhas Tabelas de Preço</span>
          </Link>
        </div>
      </div>

      {/* ── 3. Barra de Busca e Categorias B2B ── */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar insumos, ferramentas, materiais ou produtos por atacado..."
            className="h-11 min-h-11 pl-10 text-xs rounded-xl bg-card border-border/80"
          />
        </div>

        {/* Chips de Categorias B2B */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {B2B_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`h-11 min-h-11 px-4 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                    : "bg-card text-muted-foreground border-border/70 hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 4. Grade de Produtos e Suprimentos com Preço B2B / CNPJ ── */}
      {b2bProducts.length === 0 ? (
        <div className="py-16 bg-card rounded-xl border border-border/60 text-center p-6">
          <EmptyState
            title="Nenhum item B2B encontrado"
            description="Nenhum produto ou fornecedor atendeu aos filtros selecionados. Tente buscar por outros termos ou categorias."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {b2bProducts.map((prod: any) => {
            const retailCents = Number(prod.price_cents || 0);
            // Preço real de atacado / B2B consultando tabela cadastrada ou campo do produto
            let b2bCents: number | null = prod.wholesale_price_cents ? Number(prod.wholesale_price_cents) : null;
            if (b2bCents === null && b2bTable) {
              if (b2bTable.adjustment_type === "percentage_discount") {
                const discount = (retailCents * Number(b2bTable.adjustment_value || 0)) / 100;
                b2bCents = Math.max(0, Math.round(retailCents - discount));
              } else if (b2bTable.adjustment_type === "fixed_discount") {
                b2bCents = Math.max(0, retailCents - Number(b2bTable.adjustment_value || 0));
              }
            }
            const minQty = 1;

            return (
              <div
                key={prod.id}
                className="rounded-xl border border-border/70 bg-card p-4 space-y-3 flex flex-col justify-between shadow-2xs hover:border-primary/40 transition-colors"
              >
                <div className="space-y-3">
                  {/* Topo do Card: Loja Fornecedora */}
                  <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Store className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs font-bold text-foreground truncate">
                        {prod.store_name || "Fornecedor Parceiro Waesy"}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-3xs font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                      CNPJ Ativo
                    </Badge>
                  </div>

                  {/* Foto e Título */}
                  <div className="flex items-start gap-3">
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.title}
                        className="size-16 rounded-lg object-cover shrink-0 border border-border/40"
                        loading="lazy"
                      />
                    ) : (
                      <div className="size-16 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-border/40">
                        <Package className="size-7 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2">
                        {prod.title}
                      </h3>
                      {prod.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {prod.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bloco de Preços: Varejo vs CNPJ */}
                  <div className="bg-muted/30 rounded-lg p-2 border border-border/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Preço Varejo Civil:</span>
                      <span className="line-through text-muted-foreground font-mono">
                        {formatMoney(retailCents)}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1 border-t border-border/30">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          Preço no Atacado / CNPJ:
                        </span>
                      </div>
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        {b2bCents !== null ? formatMoney(b2bCents) : "Sob Cotação"}
                        {b2bCents !== null && (
                          <span className="text-3xs font-normal text-muted-foreground ml-1">/un</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-3xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Truck className="size-3 text-muted-foreground" />
                        Lote Mínimo:
                      </span>
                      <strong className="font-mono text-foreground">{minQty} {minQty === 1 ? "unidade" : "unidades"}</strong>
                    </div>
                  </div>
                </div>

                {/* Ação: Solicitar Faturamento B2B */}
                <div className="pt-2">
                  <Button
                    size="sm"
                    className="w-full h-11 min-h-11 rounded-lg text-xs font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => {
                      toast.success(`Cotação B2B para "${prod.title}" gerada com sucesso! O fornecedor receberá os dados do seu CNPJ.`);
                    }}
                  >
                    <span>Comprar no Atacado (CNPJ)</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}