import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  CookingPot,
  Clock,
  Users,
  Search,
  CheckCircle2,
  Share2,
  Copy,
  ExternalLink,
  BookOpen,
  Sparkles,
  ShoppingBag,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { listPublicRecipesFn, type MinedRecipeDTO } from "@/services/mining.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/receitas/")({
  head: () => ({
    meta: [
      { title: "Receitas & Gastronomia Local | Waesy" },
      {
        name: "description",
        content: "Explore receitas culinárias tradicionais e contemporâneas, com lista de ingredientes do comércio local.",
      },
    ],
  }),
  loader: async () => {
    try {
      const res = await listPublicRecipesFn({ data: { limit: 30 } }).catch(() => ({
        recipes: [],
        total: 0,
      }));
      return {
        recipes: res.recipes || [],
        total: res.total || 0,
      };
    } catch (err) {
      console.error("[loader:_store.receitas.index] Error:", err);
      return { recipes: [], total: 0 };
    }
  },
  component: PublicRecipesPage,
});

const CATEGORIES = [
  "Todas",
  "Doces & Sobremesas",
  "Pratos Principais",
  "Massas & Risotos",
  "Lanches & Petiscos",
  "Saudáveis & Saladas",
];

function PublicRecipesPage() {
  const data = Route.useLoaderData();
  const recipes: MinedRecipeDTO[] = data?.recipes || [];

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedRecipe, setSelectedRecipe] = useState<MinedRecipeDTO | null>(null);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const matchSearch =
        !search.trim() ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.ingredients.some((ing) => ing.toLowerCase().includes(search.toLowerCase()));

      const matchCategory =
        selectedCategory === "Todas" ||
        (r.category && r.category.toLowerCase().includes(selectedCategory.toLowerCase()));

      return matchSearch && matchCategory;
    });
  }, [recipes, search, selectedCategory]);

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleCopyShoppingList = (recipe: MinedRecipeDTO) => {
    const list = [
      `*Lista de Ingredientes — ${recipe.title}*`,
      "",
      ...recipe.ingredients.map((ing) => `• ${ing}`),
      "",
      "Encontrado no Guia de Receitas do Waesy",
    ].join("\n");

    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(list);
      toast.success("Lista de compras copiada para a área de transferência!");
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
      {/* ── 1. Header Minimalista & Direto ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4 pt-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-primary/10 text-primary">
              <CookingPot className="size-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Receitas & Culinária
            </h1>
            <Badge variant="outline" className="text-xs font-mono py-0 px-2 border-primary/30 text-primary">
              {filteredRecipes.length} receitas
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Pratos típicos regionais, sobremesas e receitas com ingredientes disponíveis no comércio local.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar receita ou ingrediente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 sm:h-10 text-xs rounded-xl bg-card border-border/60"
          />
        </div>
      </div>

      {/* ── 2. Filtro Horizontal de Categorias (Pills) ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
              selectedCategory === cat
                ? "bg-foreground text-background font-bold shadow-xs"
                : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── 3. Grid de Cards de Receitas ── */}
      {filteredRecipes.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-10 text-center space-y-3">
          <CookingPot className="size-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Nenhuma receita encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Tente buscar com outro ingrediente ou selecionar a categoria "Todas".
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSearch("");
              setSelectedCategory("Todas");
            }}
            className="rounded-xl text-xs h-8"
          >
            Limpar Filtros
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredRecipes.map((rec) => (
            <div
              key={rec.id}
              onClick={() => {
                setSelectedRecipe(rec);
                setCheckedIngredients({});
              }}
              className="group rounded-2xl bg-card border border-border/60 overflow-hidden hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Imagem de Capa 16:9 */}
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  <img
                    src={
                      rec.cover_image_url ||
                      "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={rec.title}
                    className="size-full object-cover group-hover:scale-103 transition-transform duration-300"
                    loading="lazy"
                  />
                  {rec.total_time && (
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-lg bg-background/90 backdrop-blur-md px-2 py-0.5 text-[11px] font-mono font-bold text-foreground">
                      <Clock className="size-3 text-primary" />
                      {rec.total_time}
                    </span>
                  )}
                  {rec.recipe_yield && (
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg bg-background/90 backdrop-blur-md px-2 py-0.5 text-[11px] font-mono font-bold text-foreground">
                      <Users className="size-3 text-muted-foreground" />
                      {rec.recipe_yield}
                    </span>
                  )}
                </div>

                {/* Conteúdo do Card */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-mono py-0 px-1.5 text-primary border-primary/30">
                      {rec.category || "Culinária"}
                    </Badge>
                    {rec.cuisine && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {rec.cuisine}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {rec.title}
                  </h3>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {rec.description}
                  </p>
                </div>
              </div>

              {/* Rodapé do Card com Ação */}
              <div className="px-4 pb-4 pt-1 flex items-center justify-between border-t border-border/30 mt-2 text-xs">
                <span className="text-[11px] text-muted-foreground font-mono">
                  {rec.ingredients.length} ingredientes
                </span>
                <span className="font-semibold text-primary inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Ver preparo <ChevronRight className="size-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 4. Modal de Detalhe Completo da Receita ── */}
      <Dialog
        open={Boolean(selectedRecipe)}
        onOpenChange={(open) => !open && setSelectedRecipe(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border/60 p-0">
          {selectedRecipe && (
            <div>
              {/* Capa */}
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                <img
                  src={
                    selectedRecipe.cover_image_url ||
                    "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1200&q=80"
                  }
                  alt={selectedRecipe.title}
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <Badge variant="outline" className="text-[10px] uppercase font-mono py-0 px-2 text-primary border-primary/30 bg-background/80 backdrop-blur-xs mb-1.5">
                    {selectedRecipe.category}
                  </Badge>
                  <h2 className="text-base sm:text-xl font-bold text-foreground leading-snug">
                    {selectedRecipe.title}
                  </h2>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                {/* Métricas Rápidas */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-muted/40 border border-border/50 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-muted-foreground block">
                      Preparo
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {selectedRecipe.prep_time || "15 min"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-muted-foreground block">
                      Cozimento
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {selectedRecipe.cook_time || "30 min"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-muted-foreground block">
                      Rendimento
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {selectedRecipe.recipe_yield || "4 porções"}
                    </span>
                  </div>
                </div>

                {/* Seção 1: Ingredientes com Checklist Interativo */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <ShoppingBag className="size-4 text-primary" />
                      Ingredientes ({selectedRecipe.ingredients.length})
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyShoppingList(selectedRecipe)}
                      className="h-7 px-2 text-[11px] rounded-lg gap-1 font-semibold cursor-pointer"
                    >
                      <Copy className="size-3" />
                      Copiar Lista
                    </Button>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl bg-card border border-border/50">
                    {selectedRecipe.ingredients.map((ing, idx) => (
                      <div
                        key={idx}
                        onClick={() => toggleIngredient(idx)}
                        className={cn(
                          "flex items-start gap-2.5 p-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors",
                          checkedIngredients[idx]
                            ? "line-through text-muted-foreground/60 bg-muted/20"
                            : "text-foreground hover:bg-muted/40"
                        )}
                      >
                        <CheckCircle2
                          className={cn(
                            "size-4 shrink-0 mt-0.5 transition-colors",
                            checkedIngredients[idx]
                              ? "text-emerald-500 fill-emerald-500/20"
                              : "text-muted-foreground/40"
                          )}
                        />
                        <span>{ing}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Seção 2: Modo de Preparo Passo a Passo */}
                {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <BookOpen className="size-4 text-primary" />
                      Modo de Preparo
                    </h3>

                    <div className="space-y-3">
                      {selectedRecipe.instructions.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <span className="size-6 rounded-full bg-primary/10 text-primary font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-xs text-foreground/90 leading-relaxed pt-0.5">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fonte e Compartilhar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <span>Fonte:</span>
                    <a
                      href={selectedRecipe.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground inline-flex items-center gap-0.5 underline"
                    >
                      {selectedRecipe.source_name || selectedRecipe.source_domain}
                      <ExternalLink className="size-2.5" />
                    </a>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (typeof window !== "undefined" && navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success("Link da receita copiado!");
                      }
                    }}
                    className="h-7 px-2 text-[11px] rounded-lg gap-1 cursor-pointer"
                  >
                    <Share2 className="size-3" />
                    Compartilhar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
