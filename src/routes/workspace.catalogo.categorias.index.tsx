import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
 Plus,
 MoreHorizontal,
 Edit,
 Archive,
 RotateCcw,
 EyeOff,
 Check,
 Search,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/commerce/page-header";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/states";
import { Surface } from "@/components/ui/surface";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listCategories, updateCategory } from "@/services/admin-catalog.functions";
import { getStoreSettings } from "@/services/store.functions";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";

export const Route = createFileRoute("/workspace/catalogo/categorias/")({
 head: () => ({ meta: [{ title: "Categorias & Sessões | Workspace Waesy" }] }),
 loader: async () => {
 try {
 const [catsRes, storeRes] = await Promise.all([
 listCategories().catch(() => []),
 getStoreSettings().catch(() => null),
 ]);
 return {
 categories: catsRes || [],
 store: storeRes || null,
 };
 } catch {
 return { categories: [], store: null };
 }
 },
 component: AdminCategoriesPage,
});

function AdminCategoriesPage() {
 const { categories, store } = ((Route.useLoaderData?.() as any) || {});
 const semantics = getNicheSemantics(store);
 const router = useRouter();
 const [statusFilter, setStatusFilter] = useState<"active" | "archived">("active");
 const [searchQuery, setSearchQuery] = useState("");

 const activeCategoriesCount = categories.filter((c: any) => c.status !== "archived").length;
 const archivedCategoriesCount = categories.filter((c: any) => c.status === "archived").length;

 const filteredCategories = useMemo(() => {
 return categories.filter((c: any) => {
 const matchesSearch =
 c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 c.slug.toLowerCase().includes(searchQuery.toLowerCase());

 const matchesStatus =
 statusFilter === "active" ? c.status !== "archived" : c.status === "archived";

 return matchesSearch && matchesStatus;
 });
 }, [categories, searchQuery, statusFilter]);

 const handleUpdateStatus = async (id: string, newStatus: "active" | "inactive" | "archived") => {
 try {
 const res = await updateCategory({ data: { id, status: newStatus } });
 if (res) {
 toast.success(
 newStatus === "archived"
 ? "Categoria arquivada com sucesso!"
 : "Categoria reativada/atualizada!",
 );
 router.invalidate();
 } else {
 toast.error(res.message || "Erro ao atualizar categoria");
 }
 } catch {
 toast.error("Erro inesperado ao atualizar status");
 }
 };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <WorkspaceCanonicalToolbar
        tabs={[
          { id: "active", label: "Ativas", count: activeCategoriesCount },
          { id: "archived", label: "Arquivo Morto", count: archivedCategoriesCount },
        ]}
        activeTab={statusFilter}
        onTabChange={(val) => setStatusFilter(val as "active" | "archived")}
        searchPlaceholder="Buscar por nome ou slug..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        primaryAction={{
          label: semantics.newCategoryAction,
          icon: Plus,
          onClick: () => router.navigate({ to: "/workspace/catalogo/categorias/novo" }),
        }}
      />

      {filteredCategories.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-border/40 bg-card/60 space-y-4 px-4">
          <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Plus className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              {statusFilter === "active"
                ? "Nenhuma categoria cadastrada"
                : "Nenhuma categoria no arquivo morto"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Crie categorias para estruturar o cardápio e os produtos da sua loja com navegação rápida.
            </p>
          </div>
          {statusFilter === "active" && (
            <Button
              asChild
              className="h-11 px-6 rounded-xl font-bold text-sm gap-2 bg-primary text-primary-foreground cursor-pointer shadow-xs"
            >
              <Link to="/workspace/catalogo/categorias/novo">
                <Plus className="size-4" />
                <span>Criar Primeira Categoria</span>
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* ── 1. Mobile List Layout (Zero-Cramping, Large Text & 44px Controls) ── */}
          <div className="space-y-3 block md:hidden">
            {filteredCategories.map((cat: any) => {
              const parentCat = cat.parent_id
                ? categories.find((c: any) => c.id === cat.parent_id)
                : null;

              return (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl bg-card border border-border/50 shadow-2xs space-y-3.5 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {cat.cover_url ? (
                        <img
                          src={cat.cover_url}
                          alt={cat.name}
                          className="size-12 rounded-xl object-cover shrink-0 border border-border/40"
                        />
                      ) : (
                        <div className="size-12 rounded-xl bg-muted/60 border border-border/40 flex items-center justify-center shrink-0 text-muted-foreground font-bold text-sm">
                          {cat.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-base font-bold text-foreground truncate">
                          {cat.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-muted-foreground truncate">
                            /{cat.slug}
                          </span>
                          {parentCat && (
                            <span className="text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-md truncate">
                              Sub de: {parentCat.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={
                        cat.status === "active"
                          ? "default"
                          : cat.status === "archived"
                          ? "outline"
                          : "secondary"
                      }
                      className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                    >
                      {cat.status === "active"
                        ? "Ativa"
                        : cat.status === "inactive"
                        ? "Inativa"
                        : "Arquivada"}
                    </Badge>
                  </div>

                  {/* Ações Móveis Ergonômicas (44px min height) */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/30">
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 h-11 rounded-xl text-sm font-semibold gap-2 border-border/60 hover:bg-muted cursor-pointer"
                    >
                      <Link to={`/workspace/catalogo/categorias/${cat.id}` as any}>
                        <Edit className="size-4 text-muted-foreground" />
                        <span>Editar</span>
                      </Link>
                    </Button>

                    <CrudActionsMenu
                      triggerVariant="outline"
                      triggerClassName="h-11 px-4 rounded-xl border-border/60 hover:bg-muted"
                      onEdit={() => router.navigate({ to: `/workspace/catalogo/categorias/${cat.id}` as any })}
                      onToggleStatus={() =>
                        handleUpdateStatus(cat.id, cat.status === "active" ? "inactive" : "active")
                      }
                      statusLabel={cat.status === "active" ? "Desativar Categoria" : "Ativar Categoria"}
                      onArchive={cat.status !== "archived" ? () => handleUpdateStatus(cat.id, "archived") : undefined}
                      archiveTitle={`Arquivar "${cat.name}"?`}
                      archiveDescription="A categoria será movida para o arquivo morto e seus produtos não aparecerão agrupados nesta aba na vitrine pública."
                      customActions={
                        cat.status === "archived"
                          ? [
                              {
                                label: "Restaurar Categoria",
                                icon: RotateCcw,
                                onClick: () => handleUpdateStatus(cat.id, "active"),
                              },
                            ]
                          : undefined
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 2. Desktop High-Density Table Layout ── */}
          <div className="hidden md:block rounded-2xl overflow-hidden bg-card border border-border/40 shadow-2xs">
            <div className="overflow-x-auto no-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5">
                      Nome da Categoria
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5">
                      Slug URL
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5">
                      Status
                    </TableHead>
                    <TableHead className="w-[100px] text-right font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((cat: any) => (
                    <TableRow key={cat.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-semibold text-sm text-foreground py-3.5">
                        <div className="flex items-center gap-3">
                          {cat.cover_url ? (
                            <img
                              src={cat.cover_url}
                              alt={cat.name}
                              className="size-9 rounded-lg object-cover border border-border/30"
                            />
                          ) : (
                            <div className="size-9 rounded-lg bg-muted/60 border border-border/40 flex items-center justify-center text-xs font-bold text-muted-foreground">
                              {cat.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{cat.name}</span>
                            {cat.parent_id && (
                              <span className="text-[11px] text-muted-foreground font-normal">
                                Subcategoria de{" "}
                                {categories.find((c: any) => c.id === cat.parent_id)?.name || "outra"}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs py-3.5">
                        /{cat.slug}
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge
                          variant={
                            cat.status === "active"
                              ? "default"
                              : cat.status === "archived"
                              ? "outline"
                              : "secondary"
                          }
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        >
                          {cat.status === "active"
                            ? "Ativa"
                            : cat.status === "inactive"
                            ? "Inativa"
                            : "Arquivada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        <CrudActionsMenu
                          onEdit={() => router.navigate({ to: `/workspace/catalogo/categorias/${cat.id}` as any })}
                          onToggleStatus={() =>
                            handleUpdateStatus(cat.id, cat.status === "active" ? "inactive" : "active")
                          }
                          statusLabel={cat.status === "active" ? "Desativar Categoria" : "Ativar Categoria"}
                          onArchive={cat.status !== "archived" ? () => handleUpdateStatus(cat.id, "archived") : undefined}
                          archiveTitle={`Arquivar "${cat.name}"?`}
                          archiveDescription="A categoria será movida para o arquivo morto e seus produtos não aparecerão agrupados nesta aba na vitrine pública."
                          customActions={
                            cat.status === "archived"
                              ? [
                                  {
                                    label: "Restaurar Categoria",
                                    icon: RotateCcw,
                                    onClick: () => handleUpdateStatus(cat.id, "active"),
                                  },
                                ]
                              : undefined
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
