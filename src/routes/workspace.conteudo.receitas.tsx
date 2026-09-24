import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useTransition } from "react";
import {
  ChefHat,
  Eye,
  EyeOff,
  Edit2,
  Copy,
  Trash2,
  ExternalLink,
  Plus,
  Search,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Save,
  X,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  listAdminMinedRecipesFn,
  updateMinedRecipeFn,
  toggleMinedRecipeVisibilityFn,
  duplicateMinedRecipeFn,
  deleteMinedRecipeFn,
  type MinedRecipeDTO,
} from "@/services/mining.functions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/conteudo/receitas")({
  head: () => ({ meta: [{ title: "Curadoria de Receitas | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const recipes = await listAdminMinedRecipesFn({ data: { limit: 100 } });
      return { recipes };
    } catch (err) {
      console.error("[loader:workspace.conteudo.receitas] Error:", err);
      return { recipes: [] };
    }
  },
  component: WorkspaceRecipesManagementPage,
});

function WorkspaceRecipesManagementPage() {
  const router = useRouter();
  const { recipes: initialRecipes } = Route.useLoaderData();
  const [recipes, setRecipes] = useState<MinedRecipeDTO[]>(initialRecipes || []);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "hidden">("all");
  const [isPending, startTransition] = useTransition();

  // Edit Modal State
  const [editingRecipe, setEditingRecipe] = useState<MinedRecipeDTO | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "",
    cuisine: "",
    prep_time: "",
    cook_time: "",
    recipe_yield: "",
    cover_image_url: "",
    ingredientsText: "",
    instructionsText: "",
  });

  const openEditModal = (rec: MinedRecipeDTO) => {
    setEditingRecipe(rec);
    setEditForm({
      title: rec.title,
      category: rec.category || "Geral",
      cuisine: rec.cuisine || "",
      prep_time: rec.prep_time || "",
      cook_time: rec.cook_time || "",
      recipe_yield: rec.recipe_yield || "",
      cover_image_url: rec.cover_image_url || "",
      ingredientsText: rec.ingredients.join("\n"),
      instructionsText: rec.instructions.join("\n"),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRecipe) return;

    try {
      startTransition(async () => {
        const ingredients = editForm.ingredientsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);

        const instructions = editForm.instructionsText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);

        const updated = await updateMinedRecipeFn({
          data: {
            id: editingRecipe.id,
            title: editForm.title.trim(),
            category: editForm.category.trim(),
            cuisine: editForm.cuisine.trim() || undefined,
            prep_time: editForm.prep_time.trim() || undefined,
            cook_time: editForm.cook_time.trim() || undefined,
            recipe_yield: editForm.recipe_yield.trim() || undefined,
            cover_image_url: editForm.cover_image_url.trim() || undefined,
            ingredients,
            instructions,
          },
        });

        setRecipes((prev) =>
          prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
        );

        toast.success("Receita atualizada com sucesso!");
        setEditingRecipe(null);
        router.invalidate();
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar receita.");
    }
  };

  const handleToggleVisibility = async (rec: MinedRecipeDTO) => {
    const nextStatus = rec.status === "hidden" ? "active" : "hidden";
    try {
      // Optimistic update
      setRecipes((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, status: nextStatus } : r))
      );

      await toggleMinedRecipeVisibilityFn({
        data: { id: rec.id, currentStatus: rec.status },
      });

      toast.success(
        nextStatus === "hidden"
          ? "Receita ocultada da vitrine pública."
          : "Receita visível na vitrine pública!"
      );
      router.invalidate();
    } catch (err: any) {
      // Revert on failure
      setRecipes((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, status: rec.status } : r))
      );
      toast.error(err.message || "Erro ao alterar visibilidade.");
    }
  };

  const handleDuplicate = async (rec: MinedRecipeDTO) => {
    try {
      toast.info("Duplicando receita...");
      const duplicated = await duplicateMinedRecipeFn({
        data: { id: rec.id },
      });

      setRecipes((prev) => [duplicated, ...prev]);
      toast.success("Receita duplicada! Edite os detalhes para variações sazonais.");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao duplicar receita.");
    }
  };

  const handleDelete = async (rec: MinedRecipeDTO) => {
    if (!confirm(`Tem certeza que deseja excluir "${rec.title}"?`)) return;

    try {
      setRecipes((prev) => prev.filter((r) => r.id !== rec.id));
      await deleteMinedRecipeFn({ data: { id: rec.id } });
      toast.success("Receita excluída permanentemente.");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir receita.");
    }
  };

  // Filter recipes
  const filtered = recipes.filter((rec) => {
    const matchesSearch =
      rec.title.toLowerCase().includes(search.toLowerCase()) ||
      rec.category.toLowerCase().includes(search.toLowerCase()) ||
      rec.ingredients.some((ing) => ing.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterStatus === "active") return rec.status !== "hidden";
    if (filterStatus === "hidden") return rec.status === "hidden";
    return true;
  });

  const activeCount = recipes.filter((r) => r.status !== "hidden").length;
  const hiddenCount = recipes.filter((r) => r.status === "hidden").length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-0 sm:px-6 py-4">
      {/* ── 1. Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ChefHat className="size-4" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Curadoria & Gestão de Receitas
            </h1>
            <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
              {recipes.length} extrações
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Modere receitas extraídas, altere status de visibilidade, edite ingredientes e crie variações sazonais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-xl text-xs h-9 gap-1.5">
            <Link to="/receitas">
              <Eye className="size-3.5" />
              <span>Ver Vitrine Pública</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 2. Quick KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border/50 bg-card space-y-1">
          <span className="text-[11px] font-mono uppercase text-muted-foreground">Total Extraídas</span>
          <p className="text-xl font-bold text-foreground">{recipes.length}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-border/50 bg-card space-y-1">
          <span className="text-[11px] font-mono uppercase text-emerald-600">Ativas na Vitrine</span>
          <p className="text-xl font-bold text-emerald-600">{activeCount}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-border/50 bg-card space-y-1">
          <span className="text-[11px] font-mono uppercase text-amber-600">Ocultas / Moderação</span>
          <p className="text-xl font-bold text-amber-600">{hiddenCount}</p>
        </div>
        <div className="p-3.5 rounded-xl border border-border/50 bg-card space-y-1">
          <span className="text-[11px] font-mono uppercase text-muted-foreground">Categorias Ativas</span>
          <p className="text-xl font-bold text-foreground">
            {new Set(recipes.map((r) => r.category)).size}
          </p>
        </div>
      </div>

      {/* ── 3. Filters & Search Control Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, ingrediente ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl bg-card border-border/60"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <Button
            size="sm"
            variant={filterStatus === "all" ? "default" : "outline"}
            onClick={() => setFilterStatus("all")}
            className="rounded-xl text-xs h-8 px-3"
          >
            Todas ({recipes.length})
          </Button>
          <Button
            size="sm"
            variant={filterStatus === "active" ? "default" : "outline"}
            onClick={() => setFilterStatus("active")}
            className="rounded-xl text-xs h-8 px-3"
          >
            Ativas ({activeCount})
          </Button>
          <Button
            size="sm"
            variant={filterStatus === "hidden" ? "default" : "outline"}
            onClick={() => setFilterStatus("hidden")}
            className="rounded-xl text-xs h-8 px-3"
          >
            Ocultas ({hiddenCount})
          </Button>
        </div>
      </div>

      {/* ── 4. Recipes Table (WhatsApp List / Depth Table Pattern) ── */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-border/60 bg-card space-y-3">
          <ChefHat className="size-10 text-muted-foreground/30 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">Nenhuma receita encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Ajuste os filtros de busca ou verifique se a extração foi concluída no módulo de Mineração.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card divide-y divide-border/30 overflow-hidden">
          {filtered.map((rec) => {
            const isHidden = rec.status === "hidden";
            return (
              <div
                key={rec.id}
                className={cn(
                  "p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors",
                  isHidden && "opacity-60 bg-muted/10"
                )}
              >
                {/* Visual Thumbnail & Metadata */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="size-12 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/40 relative">
                    <img
                      src={
                        rec.cover_image_url ||
                        "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=200&q=80"
                      }
                      alt={rec.title}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono font-bold uppercase text-primary">
                        {rec.category || "Geral"}
                      </span>
                      {rec.total_time && (
                        <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {rec.total_time}
                        </span>
                      )}
                      <Badge
                        variant={isHidden ? "secondary" : "outline"}
                        className={cn(
                          "text-[9px] uppercase font-mono py-0 px-1.5",
                          isHidden
                            ? "bg-zinc-800 text-zinc-300"
                            : "border-emerald-500/40 text-emerald-600"
                        )}
                      >
                        {isHidden ? "Oculta" : "Visível"}
                      </Badge>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                      {rec.title}
                    </h4>

                    <p className="text-[11px] text-muted-foreground truncate">
                      {rec.ingredients.length} ingredientes • {rec.instructions.length} passos de preparo
                      {rec.source_name && ` • Fonte: ${rec.source_name}`}
                    </p>
                  </div>
                </div>

                {/* Operations Bar */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  {/* Visibilidade */}
                  <Button
                    onClick={() => handleToggleVisibility(rec)}
                    variant="ghost"
                    size="sm"
                    className="rounded-xl h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                    title={isHidden ? "Publicar na vitrine" : "Ocultar da vitrine"}
                  >
                    {isHidden ? (
                      <>
                        <Eye className="size-3.5 text-emerald-500" />
                        <span className="hidden md:inline">Publicar</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="size-3.5 text-amber-500" />
                        <span className="hidden md:inline">Ocultar</span>
                      </>
                    )}
                  </Button>

                  {/* Editar */}
                  <Button
                    onClick={() => openEditModal(rec)}
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-8 px-2.5 text-xs gap-1"
                    title="Editar dados da receita"
                  >
                    <Edit2 className="size-3.5" />
                    <span>Editar</span>
                  </Button>

                  {/* Duplicar */}
                  <Button
                    onClick={() => handleDuplicate(rec)}
                    variant="ghost"
                    size="sm"
                    className="rounded-xl h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    title="Duplicar para variação sazonal"
                  >
                    <Copy className="size-3.5" />
                  </Button>

                  {/* Ver Página Pública */}
                  <Button asChild variant="ghost" size="sm" className="rounded-xl h-8 px-2 text-xs">
                    <Link to="/receitas/$id" params={{ id: rec.id }} title="Ver página pública">
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </Button>

                  {/* Excluir */}
                  <Button
                    onClick={() => handleDelete(rec)}
                    variant="ghost"
                    size="sm"
                    className="rounded-xl h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                    title="Excluir receita"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 5. Modal de Edição Completa da Receita ── */}
      <Dialog open={Boolean(editingRecipe)} onOpenChange={(open) => !open && setEditingRecipe(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border/60 p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <ChefHat className="size-4 text-primary" />
              Editar Receita
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-xs">
            {/* Título */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Título da Receita</label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                className="h-9 text-xs rounded-xl bg-background"
              />
            </div>

            {/* Categoria & Culinária */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Categoria</label>
                <Input
                  value={editForm.category}
                  onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="Doces, Carnes, Massas..."
                  className="h-9 text-xs rounded-xl bg-background"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Culinária / Origem</label>
                <Input
                  value={editForm.cuisine}
                  onChange={(e) => setEditForm((p) => ({ ...p, cuisine: e.target.value }))}
                  placeholder="Italiana, Regional, Alemã..."
                  className="h-9 text-xs rounded-xl bg-background"
                />
              </div>
            </div>

            {/* Tempos & Rendimento */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Tempo Preparo</label>
                <Input
                  value={editForm.prep_time}
                  onChange={(e) => setEditForm((p) => ({ ...p, prep_time: e.target.value }))}
                  placeholder="ex: 20 min"
                  className="h-9 text-xs rounded-xl bg-background"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Tempo Cozimento</label>
                <Input
                  value={editForm.cook_time}
                  onChange={(e) => setEditForm((p) => ({ ...p, cook_time: e.target.value }))}
                  placeholder="ex: 45 min"
                  className="h-9 text-xs rounded-xl bg-background"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Rendimento</label>
                <Input
                  value={editForm.recipe_yield}
                  onChange={(e) => setEditForm((p) => ({ ...p, recipe_yield: e.target.value }))}
                  placeholder="ex: 8 porções"
                  className="h-9 text-xs rounded-xl bg-background"
                />
              </div>
            </div>

            {/* URL da Imagem */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">URL da Imagem de Capa</label>
              <Input
                value={editForm.cover_image_url}
                onChange={(e) => setEditForm((p) => ({ ...p, cover_image_url: e.target.value }))}
                placeholder="https://..."
                className="h-9 text-xs rounded-xl bg-background"
              />
            </div>

            {/* Ingredientes */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span>Ingredientes (um por linha)</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {editForm.ingredientsText.split("\n").filter(Boolean).length} itens
                </span>
              </label>
              <textarea
                value={editForm.ingredientsText}
                onChange={(e) => setEditForm((p) => ({ ...p, ingredientsText: e.target.value }))}
                rows={5}
                className="w-full rounded-xl border border-border/60 bg-background p-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Modo de Preparo */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground flex items-center justify-between">
                <span>Modo de Preparo (um passo por linha)</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {editForm.instructionsText.split("\n").filter(Boolean).length} passos
                </span>
              </label>
              <textarea
                value={editForm.instructionsText}
                onChange={(e) => setEditForm((p) => ({ ...p, instructionsText: e.target.value }))}
                rows={5}
                className="w-full rounded-xl border border-border/60 bg-background p-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border/40 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingRecipe(null)}
              className="rounded-xl text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveEdit}
              disabled={isPending}
              className="rounded-xl text-xs h-9 gap-1.5 font-semibold"
            >
              <Save className="size-3.5" />
              {isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
