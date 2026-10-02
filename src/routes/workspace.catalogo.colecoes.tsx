import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Layers, Plus, Search, SlidersHorizontal, Edit2, Trash2, ExternalLink, CheckCircle2, XCircle, Package, Image as ImageIcon, Star } from "lucide-react";

import { listCollections, createCollection, updateCollection, deleteCollection } from "@/services/admin-catalog.functions";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/state/states";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/catalogo/colecoes")({
  head: () => ({ meta: [{ title: "Coleções de Produtos | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const collections = await listCollections().catch(() => []);
      return { initialCollections: collections || [] };
    } catch {
      return { initialCollections: [] };
    }
  },
  component: WorkspaceCollectionsPage,
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function WorkspaceCollectionsPage() {
  const { initialCollections } = (Route.useLoaderData() as any) || { initialCollections: [] };
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<any | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const { data: collections = initialCollections, isLoading } = useQuery({
    queryKey: ["workspace-collections"],
    queryFn: () => listCollections(),
    initialData: initialCollections,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createCollection({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-collections"] });
      toast.success("Coleção criada com sucesso!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao criar coleção."),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateCollection({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-collections"] });
      toast.success("Coleção atualizada!");
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao atualizar coleção."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCollection({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-collections"] });
      toast.success("Coleção removida!");
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao excluir coleção."),
  });

  const resetForm = () => {
    setName("");
    setSlug("");
    setDescription("");
    setCoverUrl("");
    setStatus("active");
    setEditingCollection(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleOpenEdit = (col: any) => {
    setEditingCollection(col);
    setName(col.name);
    setSlug(col.slug);
    setDescription(col.description || "");
    setCoverUrl(col.cover_url || "");
    setStatus(col.status === "inactive" ? "inactive" : "active");
    setDialogOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCollection) {
      setSlug(slugify(val));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("O nome da coleção é obrigatório.");
      return;
    }
    const cleanSlug = slugify(slug || name);

    if (editingCollection) {
      updateMutation.mutate({
        id: editingCollection.id,
        name: name.trim(),
        slug: cleanSlug,
        description: description.trim() || null,
        cover_url: coverUrl || null,
        status,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        slug: cleanSlug,
        description: description.trim() || null,
        cover_url: coverUrl || null,
        status,
      });
    }
  };

  const filteredCollections = useMemo(() => {
    return (collections || []).filter((col: any) => {
      const matchesSearch =
        col.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        col.slug?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && col.status === "active") ||
        (statusFilter === "inactive" && col.status === "inactive");
      return matchesSearch && matchesStatus;
    });
  }, [collections, searchTerm, statusFilter]);

  return (
    <div className="w-full space-y-6 pb-24 font-sans text-foreground">
      {/* ── 1. Top Header ── */}
      <PageHeader
        eyebrow="Catálogo"
        title="Coleções de Produtos"
        actions={
          <Button
            onClick={handleOpenCreate}
            size="sm"
            className="h-9 px-4 rounded-lg font-bold text-xs gap-2 bg-primary text-primary-foreground shadow-sm cursor-pointer hover:opacity-90"
          >
            <Plus className="size-4" />
            <span>Nova Coleção</span>
          </Button>
        }
      />

      {/* ── 2. Toolbar & Filtros ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border/60">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou slug..."
            className="pl-9 h-9 text-xs rounded-lg bg-background border-border/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(val: any) => setStatusFilter(val)}
          >
            <SelectTrigger className="h-9 text-xs rounded-lg w-[130px] bg-background border-border/50">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="inactive">Inativas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── 3. Grid / Lista de Coleções ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 rounded-lg bg-card/60 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : filteredCollections.length === 0 ? (
        <div className="bg-card rounded-lg border border-border/60 p-8 text-center">
          <EmptyState
            title="Nenhuma coleção encontrada"
            description={
              searchTerm || statusFilter !== "all"
                ? "Tente ajustar seus termos de busca ou filtros."
                : "Agrupe produtos por temas, campanhas sazonais ou vitrines especiais."
            }
          />
          {!searchTerm && statusFilter === "all" && (
            <Button
              onClick={handleOpenCreate}
              size="sm"
              className="mt-4 rounded-lg text-xs font-bold gap-2"
            >
              <Plus className="size-4" />
              <span>Criar Primeira Coleção</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCollections.map((col: any) => {
            const isActive = col.status === "active";
            return (
              <div
                key={col.id}
                className="bg-card rounded-lg border border-border/60 p-4 flex flex-col justify-between space-y-3 hover:border-foreground/30 transition-all group shadow-xs"
              >
                <div className="space-y-3">
                  {col.cover_url ? (
                    <div className="w-full h-32 rounded-lg overflow-hidden bg-muted relative">
                      <img
                        src={col.cover_url}
                        alt={col.name}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <Badge
                        variant={isActive ? "default" : "secondary"}
                        className="absolute top-2 right-2 text-xs font-bold"
                      >
                        {isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-between px-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Layers className="size-5 text-primary" />
                        <span className="text-xs font-mono font-medium">Sem imagem de capa</span>
                      </div>
                      <Badge
                        variant={isActive ? "default" : "secondary"}
                        className="text-xs font-bold"
                      >
                        {isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                  )}

                  <div>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                      {col.name}
                    </h3>
                    <p className="text-xs font-mono text-muted-foreground">
                      /{col.slug}
                    </p>
                  </div>

                  {col.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {col.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Package className="size-3.5" />
                    <span>Coleção</span>
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(col)}
                      className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Editar Coleção"
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTarget(col)}
                      className="size-8 rounded-lg text-destructive hover:bg-destructive/10 cursor-pointer"
                      title="Excluir Coleção"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 4. Dialog de Criação / Edição ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-lg bg-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                {editingCollection ? "Editar Coleção" : "Nova Coleção"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure os metadados da coleção para organizar os produtos na vitrine.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Nome da Coleção</Label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Coleção de Verão, Mais Vendidos..."
                  className="h-9 text-xs rounded-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Slug da URL</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="colecao-de-verao"
                  className="h-9 text-xs rounded-lg font-mono"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Descrição (Opcional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição da coleção para os clientes..."
                  className="text-xs rounded-lg min-h-16 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Imagem de Capa (Banner)</Label>
                <ImageUpload
                  value={coverUrl}
                  onChange={(url) => setCoverUrl(url || "")}
                  bucket="catalog"
                  aspectPreset="banner"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Status de Exibição</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger className="h-9 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa (Visível no site)</SelectItem>
                    <SelectItem value="inactive">Inativa (Rascunho)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="h-9 rounded-lg text-xs font-medium"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="h-9 rounded-lg text-xs font-bold bg-primary text-primary-foreground"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Salvando..."
                  : editingCollection
                  ? "Salvar Alterações"
                  : "Criar Coleção"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── 5. Diálogo de Confirmação de Exclusão ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-lg bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Excluir Coleção "{deleteTarget?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Esta ação removerá o agrupamento da vitrine. Os produtos vinculados a esta coleção não serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 rounded-lg text-xs font-medium">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="h-9 rounded-lg text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
