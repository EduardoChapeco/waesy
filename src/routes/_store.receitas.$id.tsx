import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Clock,
  Users,
  ChevronLeft,
  Share2,
  Printer,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  CheckCircle2,
  Circle,
  ChefHat,
  Bookmark,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getPublicRecipeByIdFn, type MinedRecipeDTO } from "@/services/mining.functions";
import { RecipeStoryModal } from "@/components/recipes/recipe-story-modal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/receitas/$id")({
  head: ({ loaderData }) => {
    const recipe = loaderData?.recipe;
    const title = recipe ? `${recipe.title} | Receitas Waesy` : "Receita | Waesy Gastronomia";
    const description = recipe?.description || "Veja ingredientes, tempo de preparo e modo de fazer completo.";
    const imageUrl = recipe?.cover_image_url || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1200&q=80";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: imageUrl },
        { property: "og:type", content: "article" },
      ],
    };
  },
  loader: async ({ params }) => {
    try {
      const recipe = await getPublicRecipeByIdFn({ data: { id: params.id } });
      return { recipe };
    } catch (err) {
      console.error("[loader:_store.receitas.$id] Error:", err);
      return { recipe: null };
    }
  },
  component: RecipeDetailPage,
});

function RecipeDetailPage() {
  const { recipe } = Route.useLoaderData();
  const [checkedIngredients, setCheckedIngredients] = useState<Record<number, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!recipe) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <ChefHat className="size-12 text-muted-foreground/40 mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Receita não encontrada</h2>
        <p className="text-xs text-muted-foreground">
          Esta receita pode ter sido removida ou não está disponível no momento.
        </p>
        <Button asChild variant="outline" className="rounded-xl text-xs h-9">
          <Link to="/receitas">Voltar para Receitas</Link>
        </Button>
      </div>
    );
  }

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: `Confira esta receita: ${recipe.title}`,
          url,
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado para a área de transferência!");
      } catch {
        toast.error("Erro ao copiar link.");
      }
    }
  };

  // Schema.org Recipe JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    image: recipe.cover_image_url ? [recipe.cover_image_url] : [],
    description: recipe.description,
    recipeCategory: recipe.category,
    recipeCuisine: recipe.cuisine || undefined,
    recipeYield: recipe.recipe_yield || undefined,
    prepTime: recipe.prep_time || undefined,
    cookTime: recipe.cook_time || undefined,
    totalTime: recipe.total_time || undefined,
    recipeIngredient: recipe.ingredients,
    recipeInstructions: recipe.instructions.map((step) => ({
      "@type": "HowToStep",
      text: step,
    })),
    publisher: {
      "@type": "Organization",
      name: "Waesy",
      url: "https://usewaesy.com",
    },
  };

  return (
    <>
      {/* Schema.org Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6">
        {/* ── 1. Top Navigation & Silent Actions ── */}
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-4">
          <Link
            to="/receitas"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ChevronLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Voltar para Receitas</span>
          </Link>

          {/* Silent Ghost Buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              onClick={() => setIsStoryModalOpen(true)}
              variant="ghost"
              size="sm"
              className="rounded-xl h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-1.5"
              title="Gerar Story para Instagram (9:16)"
            >
              <Sparkles className="size-3.5 text-primary" />
              <span className="hidden sm:inline">Gerar Story</span>
            </Button>

            <Button
              onClick={handlePrint}
              variant="ghost"
              size="sm"
              className="rounded-xl h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-1.5"
              title="Imprimir ou Salvar PDF"
            >
              <Printer className="size-3.5" />
              <span className="hidden sm:inline">Baixar PDF</span>
            </Button>

            <Button
              onClick={handleShare}
              variant="ghost"
              size="sm"
              className="rounded-xl h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-1.5"
              title="Compartilhar"
            >
              <Share2 className="size-3.5" />
              <span className="hidden sm:inline">Compartilhar</span>
            </Button>
          </div>
        </div>

        {/* ── 2. Imersão Visual: Imagem Destaque Clean (Apple HIG) ── */}
        <div className="relative w-full aspect-video sm:aspect-[21/9] rounded-2xl overflow-hidden bg-muted border border-border/50">
          <img
            src={
              recipe.cover_image_url ||
              "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1200&q=80"
            }
            alt={recipe.title}
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* Badges Flutuantes sobre a Imagem */}
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-background/90 backdrop-blur-none px-2.5 py-1 text-xs font-mono font-bold text-foreground">
              {recipe.category || "Receita"}
            </span>
            {recipe.cuisine && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-background/90 backdrop-blur-none px-2.5 py-1 text-xs font-mono text-muted-foreground">
                {recipe.cuisine}
              </span>
            )}
          </div>
        </div>

        {/* ── 3. Cabeçalho Editorial & Metadados ── */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
            {recipe.title}
          </h1>

          {recipe.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {recipe.description}
            </p>
          )}

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 border-y border-border/40 py-3 text-xs font-mono">
            {recipe.prep_time && (
              <div className="flex items-center gap-1.5 text-foreground">
                <Clock className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Preparo:</span>
                <span className="font-bold">{recipe.prep_time}</span>
              </div>
            )}
            {recipe.cook_time && (
              <div className="flex items-center gap-1.5 text-foreground">
                <Clock className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Cozimento:</span>
                <span className="font-bold">{recipe.cook_time}</span>
              </div>
            )}
            {recipe.total_time && (
              <div className="flex items-center gap-1.5 text-foreground">
                <Clock className="size-3.5 text-primary" />
                <span className="text-muted-foreground">Total:</span>
                <span className="font-bold text-primary">{recipe.total_time}</span>
              </div>
            )}
            {recipe.recipe_yield && (
              <div className="flex items-center gap-1.5 text-foreground">
                <Users className="size-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Rendimento:</span>
                <span className="font-bold">{recipe.recipe_yield}</span>
              </div>
            )}
            {recipe.source_name && (
              <div className="text-[11px] text-muted-foreground ml-auto hidden sm:block">
                Fonte: <span className="font-semibold text-foreground">{recipe.source_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Grade de Conteúdo Principal (2 Colunas no Desktop) ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pt-2">
          {/* Coluna Esquerda: Ingredientes (WhatsApp Minimalist List com Checkboxes) */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Ingredientes
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">
                {Object.values(checkedIngredients).filter(Boolean).length} / {recipe.ingredients.length}
              </span>
            </div>

            <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/30 overflow-hidden">
              {recipe.ingredients.map((ing, idx) => {
                const isChecked = !!checkedIngredients[idx];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleIngredient(idx)}
                    className={cn(
                      "w-full text-left p-3 flex items-start gap-3 transition-colors cursor-pointer select-none",
                      isChecked ? "bg-muted/30" : "hover:bg-muted/20"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isChecked ? (
                        <CheckCircle2 className="size-4 text-emerald-500 fill-emerald-500/10" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground/50" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs leading-relaxed transition-all",
                        isChecked ? "line-through text-muted-foreground/60" : "text-foreground"
                      )}
                    >
                      {ing}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Ação Direta: Comprar Ingredientes no Comércio Local */}
            <div className="p-3.5 rounded-xl border border-border/50 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-4 text-primary" />
                <span className="text-xs font-bold text-foreground">Comércio Local</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Encontre estes ingredientes nos supermercados, hortifrutis e açougues da cidade.
              </p>
              <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs h-8 gap-1.5">
                <Link to="/mercado">
                  <span>Ver Mercados Locais</span>
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Coluna Direita: Modo de Preparo (Passo a Passo Minimalista) */}
          <div className="md:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Modo de Preparo
              </h2>
              <span className="text-[11px] font-mono text-muted-foreground">
                {Object.values(completedSteps).filter(Boolean).length} / {recipe.instructions.length} passos
              </span>
            </div>

            <div className="space-y-3">
              {recipe.instructions.map((step, idx) => {
                const isStepCompleted = !!completedSteps[idx];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer select-none space-y-2",
                      isStepCompleted
                        ? "border-emerald-500/30 bg-emerald-500/5 text-muted-foreground"
                        : "border-border/50 bg-card hover:border-primary/40 text-foreground"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-[10px] font-mono font-bold px-2 py-0.5 rounded-md",
                          isStepCompleted
                            ? "bg-emerald-500/20 text-emerald-600"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        Passo {idx + 1}
                      </span>
                      {isStepCompleted && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          Concluído
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-xs leading-relaxed",
                        isStepCompleted && "line-through text-muted-foreground/70"
                      )}
                    >
                      {step}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 5. Fonte e Autoria Silenciosa ── */}
        {recipe.source_url && (
          <div className="pt-6 border-t border-border/40 text-center">
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
            >
              <span>Receita original publicada por {recipe.source_name}</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        )}
      </div>

      {/* Story 9:16 Modal */}
      <RecipeStoryModal
        recipe={recipe}
        isOpen={isStoryModalOpen}
        onClose={() => setIsStoryModalOpen(false)}
      />
    </>
  );
}
