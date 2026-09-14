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
 <div className="py-12 text-center rounded-2xl border-0 bg-card/60 space-y-4">
 <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
 <Plus className="size-6" />
 </div>
 <div className="space-y-1">
 <h3 className="text-base font-bold text-foreground">
 {statusFilter === "active"
 ? "Nenhuma categoria cadastrada"
 : "Nenhuma categoria no arquivo morto"}
 </h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Crie categorias para estruturar e organizar os produtos da sua loja.
 </p>
 </div>
 {statusFilter === "active" && (
 <Button asChild size="sm" className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground ">
 <Link to="/workspace/catalogo/categorias/novo">
 <Plus className="size-4" />
 <span>Criar Primeira Categoria</span>
 </Link>
 </Button>
 )}
 </div>
 ) : (
 <div className=" rounded-2xl overflow-hidden bg-card ">
 <div className="overflow-x-auto no-scrollbar">
 <Table>
 <TableHeader>
 <TableRow className="bg-muted/40">
 <TableHead>Nome</TableHead>
 <TableHead>Slug</TableHead>
 <TableHead>Status</TableHead>
 <TableHead className="w-[80px] text-right">Ações</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredCategories.map((cat: any) => (
 <TableRow key={cat.id} className="hover:bg-muted/30 transition-colors">
 <TableCell className="font-semibold text-sm text-foreground">
 <div className="flex items-center gap-2">
 {cat.cover_url && (
 <img
 src={cat.cover_url}
 alt={cat.name}
 className="size-8 rounded object-cover"
 />
 )}
 <div className="flex flex-col">
 <span>{cat.name}</span>
 {cat.parent_id && (
 <span className="text-[10px] text-muted-foreground font-normal">
 Subcategoria de{""}
 {categories.find((c: any) => c.id === cat.parent_id)?.name || "outra"}
 </span>
 )}
 </div>
 </div>
 </TableCell>
 <TableCell className="text-muted-foreground font-mono text-xs">
 {cat.slug}
 </TableCell>
 <TableCell>
 <Badge
 variant={
 cat.status === "active"
 ? "default"
 : cat.status === "archived"
 ? "outline"
 : "secondary"
 }
 className="text-xs"
 >
 {cat.status === "active"
 ? "Ativa"
 : cat.status === "inactive"
 ? "Inativa"
 : "Arquivada"}
 </Badge>
 </TableCell>
 <TableCell className="text-right">
 <DropdownMenu>
 <DropdownMenuTrigger asChild>
 <Button variant="ghost" size="icon" aria-label="Ações da categoria">
 <MoreHorizontal className="size-4" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end">
 {cat.status !== "archived" ? (
 <>
 <DropdownMenuItem asChild>
 <Link to={`/workspace/catalogo/categorias/${cat.id}` as any}>
 <Edit className="mr-2 size-3.5" />
 Editar Categoria
 </Link>
 </DropdownMenuItem>
 {cat.status === "active" ? (
 <DropdownMenuItem
 onClick={() => handleUpdateStatus(cat.id, "inactive")}
 >
 <EyeOff className="mr-2 size-3.5" />
 Desativar
 </DropdownMenuItem>
 ) : (
 <DropdownMenuItem
 onClick={() => handleUpdateStatus(cat.id, "active")}
 >
 <Check className="mr-2 size-3.5 text-success" />
 Ativar
 </DropdownMenuItem>
 )}
 <DropdownMenuItem
 className="text-destructive focus:text-destructive"
 onClick={() => handleUpdateStatus(cat.id, "archived")}
 >
 <Archive className="mr-2 size-3.5" />
 Arquivar
 </DropdownMenuItem>
 </>
 ) : (
 <DropdownMenuItem onClick={() => handleUpdateStatus(cat.id, "active")}>
 <RotateCcw className="mr-2 size-3.5" />
 Restaurar
 </DropdownMenuItem>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 </div>
 )}
 </div>
 );
}
