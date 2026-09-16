import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
 Plus,
 Search,
 MoreVertical,
 Copy,
 Eye,
 Edit3,
 Archive,
 CheckCircle2,
 FileText,
 Trash2,
 Download,
 Package,
 Filter,
 Layers,
 Palette,
 Globe,
} from "lucide-react";

import { PageHeader } from "@/components/commerce/page-header";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Surface } from "@/components/ui/surface";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuLabel,
 DropdownMenuSeparator,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/state/states";
import { CatalogComplementsTab } from "@/components/commerce/catalog-complements-tab";
import { ImportCatalogModal } from "@/components/admin/catalog/import-catalog-modal";
import {
 listAdminProducts,
 duplicateProduct,
 toggleProductStatus,
 bulkUpdateProductStatus,
 updateProduct,
} from "@/services/admin-catalog.functions";
import { getStoreSettings } from "@/services/store.functions";
import { getNicheSemantics } from "@/lib/niche-semantics";
import { getNicheCatalogContext } from "@/lib/catalog-niche-context";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { AdminProductRow } from "@/types/catalog";

export const Route = createFileRoute("/workspace/catalogo/produtos/")({
 head: () => ({ meta: [{ title: "Catálogo & Itens | Workspace Waesy" }] }),
 loader: async () => {
   try {
 const [products, store] = await Promise.all([
 listAdminProducts().catch(() => []),
 getStoreSettings().catch(() => null),
 ]);
 return {
 products: products || [],
 store: store || null,
 };
   } catch (err) {
     console.error("[loader:workspace.catalogo.produtos.index] Unhandled loader error:", err);
     return { products: null, store: null };
   }
 },
 component: AdminProductsPage,
});

function EditablePriceCell({
 productId,
 initialCents,
 onSave,
}: {
 productId: string;
 initialCents: number;
 onSave: (val: number) => Promise<boolean>;
}) {
 const [editing, setEditing] = useState(false);
 const [centsVal, setCentsVal] = useState<number | undefined>(initialCents);
 const [isSaving, setIsSaving] = useState(false);

 const save = async () => {
 setIsSaving(true);
 const finalCents = centsVal ?? initialCents;
 if (finalCents >= 0) {
 const ok = await onSave(finalCents);
 if (ok) {
 setEditing(false);
 } else {
 setCentsVal(initialCents);
 }
 } else {
 setCentsVal(initialCents);
 }
 setIsSaving(false);
 setEditing(false);
 };

 if (editing) {
 return (
 <div className="flex items-center gap-1 w-28">
 <CurrencyField
 compact
 autoFocus
 value={centsVal}
 onChange={(c) => setCentsVal(c)}
 onEnter={save}
 onBlur={save}
 disabled={isSaving}
 className="h-7 text-xs font-mono font-bold"
 />
 </div>
 );
 }

 return (
 <div
 onClick={() => {
 setCentsVal(initialCents);
 setEditing(true);
 }}
 className="font-bold text-sm text-foreground cursor-text hover:bg-muted/50 p-1 rounded -ml-1 transition-colors border border-transparent hover:border-border"
 title="Clique para editar com máscara"
 >
 {formatMoney(initialCents)}
 </div>
 );
}

function EditableStockCell({
 productId,
 initialStock,
 onSave,
}: {
 productId: string;
 initialStock: number;
 onSave: (val: number) => Promise<boolean>;
}) {
 const [editing, setEditing] = useState(false);
 const [val, setVal] = useState(String(initialStock ?? 0));
 const [isSaving, setIsSaving] = useState(false);

 const save = async () => {
 setIsSaving(true);
 const qty = parseInt(val, 10);
 if (!isNaN(qty) && qty >= 0) {
 const ok = await onSave(qty);
 if (ok) {
 setEditing(false);
 } else {
 setVal(String(initialStock ?? 0));
 }
 } else {
 setVal(String(initialStock ?? 0));
 }
 setIsSaving(false);
 setEditing(false);
 };

 if (editing) {
 return (
 <div className="flex items-center gap-1 w-20">
 <Input
 type="number"
 min={0}
 autoFocus
 value={val}
 onChange={(e) => setVal(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter") save();
 if (e.key === "Escape") {
 setVal(String(initialStock ?? 0));
 setEditing(false);
 }
 }}
 onBlur={save}
 disabled={isSaving}
 className="h-7 text-xs font-mono font-bold"
 />
 </div>
 );
 }

 return (
 <div
 onClick={() => setEditing(true)}
 className="font-mono text-xs cursor-text hover:bg-muted/50 px-1.5 py-0.5 rounded transition-colors border border-transparent hover:border-border inline-flex items-center gap-1"
 title="Clique para editar estoque"
 >
 <span className={initialStock > 0 ? "text-foreground font-semibold" : "text-destructive font-bold"}>
 {initialStock ?? 0} un
 </span>
 </div>
 );
}

function AdminProductsPage() {
 const { products: initialProducts, store } = ((Route.useLoaderData?.() as any) || {});
 const semantics = getNicheSemantics(store);
 const nicheCtx = getNicheCatalogContext(store);

 const [products, setProducts] = useState<AdminProductRow[]>(initialProducts);
 const [mainTab, setMainTab] = useState<"products" | "complements">("products");
 const [searchQuery, setSearchQuery] = useState("");
 const [statusFilter, setStatusFilter] = useState<string>("active");
 const [selectedIds, setSelectedIds] = useState<string[]>([]);
 const [isProcessing, setIsProcessing] = useState(false);
 const [isImportModalOpen, setIsImportModalOpen] = useState(false);
 const navigate = useNavigate();

 const handleToggleActive = async (product: AdminProductRow, active: boolean) => {
 const newStatus: "published" | "draft" = active ? "published" : "draft";
 setProducts((prev) =>
 prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p)),
 );
 try {
 await toggleProductStatus({ data: { productId: product.id, status: newStatus } });
 toast.success(
 active
 ? `${nicheCtx.entityName} ativado com sucesso!`
 : `${nicheCtx.entityName} pausado!`,
 );
 } catch {
 toast.error("Erro ao alterar status do item.");
 setProducts((prev) =>
 prev.map((p) => (p.id === product.id ? { ...p, status: product.status } : p)),
 );
 }
 };

 // Filter products by search & status tab
 const filteredProducts = useMemo(() => {
 return products.filter((p) => {
 const matchesSearch =
 p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
 p.slug.toLowerCase().includes(searchQuery.toLowerCase());

 const matchesStatus =
 statusFilter === "active" ? p.status !== "archived" : p.status === statusFilter;

 return matchesSearch && matchesStatus;
 });
 }, [products, searchQuery, statusFilter]);

 // Handle Select All
 const isAllSelected =
 filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.includes(p.id));

 const toggleSelectAll = () => {
 if (isAllSelected) {
 setSelectedIds([]);
 } else {
 setSelectedIds(filteredProducts.map((p) => p.id));
 }
 };

 const toggleSelectRow = (id: string) => {
 setSelectedIds((prev) =>
 prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
 );
 };

 // Action: Duplicate Single
 const handleDuplicate = async (productId: string) => {
 setIsProcessing(true);
 const res = await duplicateProduct({ data: { productId } });
 setIsProcessing(false);

 if (res.status === "success" && res.data) {
 toast.success(`${nicheCtx.entityName} duplicado com sucesso em modo Rascunho!`);
 const reloaded = await listAdminProducts();
 if (reloaded) setProducts(reloaded);
 } else {
 toast.error((res as any).message || `Erro ao duplicar ${nicheCtx.entityName.toLowerCase()}.`);
 }
 };

 // Action: Edit Price Inline
 const handleUpdatePrice = async (productId: string, price_cents: number) => {
 const res = await updateProduct({ data: { id: productId, price_cents } });
 if (res?.id) {
 setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, price_cents } : p)));
 toast.success("Preço atualizado!");
 return true;
 }
 toast.error("Erro ao atualizar preço.");
 return false;
 };

 // Action: Edit Stock Inline
 const handleUpdateStock = async (productId: string, stock: number) => {
 try {
 const res = await updateProduct({
 data: {
 id: productId,
 variants: [
 {
 stock: stock,
 },
 ],
 },
 });
 if (res?.id) {
 setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, stock } : p)));
 toast.success("Estoque atualizado!");
 return true;
 }
 toast.error("Erro ao atualizar estoque.");
 return false;
 } catch {
 toast.error("Erro ao atualizar estoque.");
 return false;
 }
 };

 // Action: Toggle Status
 const handleToggleStatus = async (productId: string, newStatus: string) => {
 const res = await toggleProductStatus({ data: { productId, status: newStatus as "published" | "draft" | "archived" } });
 if (res?.id) {
 setProducts((prev) =>
 prev.map((p) => (p.id === productId ? { ...p, status: newStatus as any } : p)),
 );
 toast.success("Status atualizado!");
 } else {
 toast.error("Erro ao alterar status.");
 }
 };

 // Action: Bulk Status Update
 const handleBulkAction = async (newStatus: "published" | "draft" | "archived" | "delete") => {
 if (selectedIds.length === 0) return;
 setIsProcessing(true);
 const res = await bulkUpdateProductStatus({ data: { productIds: selectedIds, action: newStatus } });
 setIsProcessing(false);

 if (res && res.count >= 0) {
 toast.success(`Ação concluída em ${selectedIds.length} item(ns).`);
 if (newStatus === "delete") {
 setProducts((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
 } else {
 setProducts((prev) =>
 prev.map((p) => (selectedIds.includes(p.id) ? { ...p, status: newStatus } : p)),
 );
 }
 setSelectedIds([]);
 } else {
 toast.error("Erro ao executar ação em lote.");
 }
 };

 // Action: Export JSON
 const handleExportJSON = () => {
 const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
 JSON.stringify(filteredProducts, null, 2),
 )}`;
 const downloadAnchor = document.createElement("a");
 downloadAnchor.setAttribute("href", jsonString);
 downloadAnchor.setAttribute("download", `catalogo_${Date.now()}.json`);
 document.body.appendChild(downloadAnchor);
 downloadAnchor.click();
 downloadAnchor.remove();
 toast.success("Catálogo exportado em arquivo JSON.");
 };

  const ProductActionsMenu = ({ product }: { product: AdminProductRow }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Ações do item"
          className="size-11 rounded-xl hover:bg-muted cursor-pointer shrink-0"
        >
          <MoreVertical className="size-5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-xl">
 <DropdownMenuLabel className="text-xs">Ações Comerciais</DropdownMenuLabel>
 <DropdownMenuItem asChild>
 <Link to={`/workspace/catalogo/produtos/${product.id}` as never}>
 <Edit3 className="size-3.5 mr-2" />
 Editar {nicheCtx.entityName}
 </Link>
 </DropdownMenuItem>
 <DropdownMenuItem asChild>
 <Link to={`/produto/${product.slug}` as never} target="_blank">
 <Eye className="size-3.5 mr-2" />
 Ver na Loja
 </Link>
 </DropdownMenuItem>
 <DropdownMenuItem onClick={() => handleDuplicate(product.id)}>
 <Copy className="size-3.5 mr-2" />
 Duplicar {nicheCtx.entityName}
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 <DropdownMenuItem asChild>
 <Link to={`/workspace/estudio` as never} search={{ productId: product.id } as never}>
 <Palette className="size-3.5 mr-2 text-info" />
 Criar Post (Estúdio)
 </Link>
 </DropdownMenuItem>
 <DropdownMenuSeparator />
 {product.status !== "published" && (
 <DropdownMenuItem onClick={() => handleToggleStatus(product.id, "published")}>
 <CheckCircle2 className="size-3.5 mr-2 text-success" />
 Publicar na Vitrine
 </DropdownMenuItem>
 )}
 {product.status !== "draft" && (
 <DropdownMenuItem onClick={() => handleToggleStatus(product.id, "draft")}>
 <FileText className="size-3.5 mr-2 text-warning" />
 Mover para Rascunho
 </DropdownMenuItem>
 )}
 {product.status !== "archived" && (
 <DropdownMenuItem onClick={() => handleToggleStatus(product.id, "archived")}>
 <Archive className="size-3.5 mr-2" />
 Arquivar {nicheCtx.entityName}
 </DropdownMenuItem>
 )}
 </DropdownMenuContent>
 </DropdownMenu>
 );

 return (
    <div className="space-y-6">
      {/* Abas Principais do Catálogo (Estilo Apple HIG / Omnichannel) */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted/40 border border-border/60 w-fit">
        <button
          type="button"
          onClick={() => setMainTab("products")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            mainTab === "products"
              ? "bg-background text-foreground shadow-2xs font-black"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
          )}
        >
          {semantics.catalogTitle}
        </button>
        <button
          type="button"
          onClick={() => setMainTab("complements")}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            mainTab === "complements"
              ? "bg-background text-foreground shadow-2xs font-black"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
          )}
        >
          {semantics.modifiersLabel || "Complementos & Adicionais"}
        </button>
      </div>

      {mainTab === "complements" ? (
        <CatalogComplementsTab store={store} />
      ) : (
        <>
          {/* ── TOOLBAR CANÔNICA SOBERANA Waesy ── */}
          <WorkspaceCanonicalToolbar
            tabs={[
              { id: "active", label: "Ativos", count: products.filter((p) => p.status !== "archived").length },
              { id: "published", label: "Publicados", count: products.filter((p) => p.status === "published").length },
              { id: "draft", label: "Rascunhos", count: products.filter((p) => p.status === "draft").length },
              { id: "archived", label: "Arquivados", count: products.filter((p) => p.status === "archived").length },
            ]}
            activeTab={statusFilter}
            onTabChange={setStatusFilter}
            searchPlaceholder={semantics.searchItemPlaceholder}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            secondaryActions={[
              {
                label: semantics.nicheId === "gastronomy" ? "Importar Cardápio" : "Importar por Link",
                icon: Globe,
                onClick: () => setIsImportModalOpen(true),
              },
              {
                label: "Exportar",
                icon: Download,
                onClick: handleExportJSON,
              },
            ]}
            primaryAction={{
              label: semantics.newItemAction,
              icon: Plus,
              onClick: () => navigate({ to: "/workspace/catalogo/produtos/novo" }),
            }}
          />

 {/* Barra Flutuante de Ações em Lote */}
 {selectedIds.length > 0 && (
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border border-primary/30 bg-primary/10 dark:bg-primary/20 rounded-xl animate-in fade-in-50 gap-3">
 <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
 <Badge variant="default" className="font-bold">
 {selectedIds.length}
 </Badge>
 <span>{semantics.itemSingular.toLowerCase()}(s) selecionado(s)</span>
 </div>
 <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
 <Button
 variant="outline"
 size="sm"
 className="text-xs flex-1 sm:flex-none justify-center"
 disabled={isProcessing}
 onClick={() => handleBulkAction("published")}
 >
 <CheckCircle2 className="size-3.5 mr-1 text-success shrink-0" />
 Publicar
 </Button>
 <Button
 variant="outline"
 size="sm"
 className="text-xs flex-1 sm:flex-none justify-center"
 disabled={isProcessing}
 onClick={() => handleBulkAction("draft")}
 >
 <FileText className="size-3.5 mr-1 text-warning shrink-0" />
 Rascunho
 </Button>
 <Button
 variant="outline"
 size="sm"
 className="text-xs flex-1 sm:flex-none justify-center"
 disabled={isProcessing}
 onClick={() => handleBulkAction("archived")}
 >
 <Archive className="size-3.5 mr-1 text-muted-foreground shrink-0" />
 Arquivar
 </Button>
 <Button
 variant="destructive"
 size="sm"
 className="text-xs flex-1 sm:flex-none justify-center"
 disabled={isProcessing}
 onClick={() => handleBulkAction("delete")}
 >
 <Trash2 className="size-3.5 mr-1 shrink-0" />
 Excluir
 </Button>
 </div>
 </div>
 )}

 {/* Tabela de Produtos */}
 {filteredProducts.length === 0 ? (
 <div className="py-12 text-center rounded-2xl border-0 bg-card/60 space-y-4">
 <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
 <Package className="size-6" />
 </div>
 <div className="space-y-1">
 <h3 className="text-base font-bold text-foreground">
 {statusFilter === "active"
 ? semantics.emptyCatalogText
 : `Nenhum ${semantics.itemSingular.toLowerCase()} com este filtro`}
 </h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Cadastre seus itens para exibi-los automaticamente nos canais de venda e vitrines.
 </p>
 </div>
 {statusFilter === "active" && (
 <Button
 asChild
 className="h-11 px-6 rounded-xl font-bold text-sm gap-2 bg-primary text-primary-foreground cursor-pointer shadow-xs"
 >
 <Link to="/workspace/catalogo/produtos/novo">
 <Plus className="size-4" />
 <span>{semantics.newItemAction}</span>
 </Link>
 </Button>
 )}
 </div>
 ) : (
 <div>
 {/* VISÃO MOBILE: Lista Espaçosa de Cartões (Zero-Aperto & Tipografia Ampla) */}
 <div className="md:hidden space-y-3">
 {filteredProducts.map((product) => {
 const cover = product.product_media?.[0]?.url;
 const isSelected = selectedIds.includes(product.id);
 const typeName = product.product_types?.name || "Padrão";

 return (
 <div
 key={product.id}
 className={`p-4 rounded-2xl bg-card border border-border/50 shadow-2xs space-y-3 transition-all ${
 isSelected ? "ring-2 ring-primary/40 bg-primary/5" : ""
 }`}
 >
 <div className="flex items-start gap-3">
 <div className="pt-1 shrink-0">
 <Checkbox
 checked={isSelected}
 onCheckedChange={() => toggleSelectRow(product.id)}
 aria-label={`Selecionar ${product.title}`}
 className="size-5 rounded-md"
 />
 </div>

 {cover ? (
 <img
 src={cover}
 alt=""
 className="size-18 object-cover rounded-xl shrink-0 border border-border/40"
 />
 ) : (
 <div className="size-18 bg-muted/60 border border-border/40 rounded-xl flex items-center justify-center shrink-0">
 <Package className="size-7 text-muted-foreground" aria-hidden />
 </div>
 )}

 <div className="min-w-0 flex-1 flex flex-col">
 <div className="flex items-start justify-between gap-2">
 <Link
 to={`/workspace/catalogo/produtos/${product.id}` as never}
 className="font-bold text-base text-foreground leading-snug line-clamp-2"
 >
 {product.title}
 </Link>
 <ProductActionsMenu product={product} />
 </div>

 <div className="flex items-center flex-wrap gap-2 mt-1">
 <Badge
 variant={
 product.status === "published"
 ? "default"
 : product.status === "archived"
 ? "outline"
 : "secondary"
 }
 className="text-xs px-2 py-0.5 rounded-full font-semibold"
 >
 {product.status === "published"
 ? "Publicado"
 : product.status === "archived"
 ? "Arquivado"
 : "Rascunho"}
 </Badge>
 <span className="text-xs text-muted-foreground font-medium">
 {typeName}
 </span>
 </div>
 </div>
 </div>

 {/* Preço e Estoque em Destaque com Edição Direta */}
 <div className="pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
 <div className="flex items-baseline gap-2">
 <EditablePriceCell
 productId={product.id}
 initialCents={product.price_cents}
 onSave={(cents) => handleUpdatePrice(product.id, cents)}
 />
 {product.compare_at_cents ? (
 <span className="text-xs text-muted-foreground line-through">
 {formatMoney(product.compare_at_cents)}
 </span>
 ) : null}
 </div>

 <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl border border-border/40">
 <span className="font-medium">Estoque:</span>
 <EditableStockCell
 productId={product.id}
 initialStock={(product as any).stock ?? 0}
 onSave={(stock) => handleUpdateStock(product.id, stock)}
 />
 </div>
 </div>
 </div>
 );
 })}
 </div>

 {/* VISÃO DESKTOP: DataGrid / Tabela de Alta Densidade */}
 <div className="hidden md:block rounded-2xl overflow-hidden bg-surface-paper border border-border/40 shadow-2xs">
 <Table>
 <TableHeader>
 <TableRow className="bg-muted/30">
 <TableHead className="w-12 text-center">
 <Checkbox
 checked={isAllSelected}
 onCheckedChange={toggleSelectAll}
 aria-label="Selecionar todos os produtos"
 />
 </TableHead>
 <TableHead>Produto</TableHead>
 <TableHead>Status</TableHead>
 <TableHead>Tipo / Marca</TableHead>
 <TableHead>Preço de Venda</TableHead>
 <TableHead>Estoque</TableHead>
 <TableHead className="text-right">Ações</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filteredProducts.map((product) => {
 const cover = product.product_media?.[0]?.url;
 const isSelected = selectedIds.includes(product.id);
 const typeName = product.product_types?.name || "Padrão";

 return (
 <TableRow
 key={product.id}
 className={`transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}
 >
 <TableCell className="text-center">
 <Checkbox
 checked={isSelected}
 onCheckedChange={() => toggleSelectRow(product.id)}
 aria-label={`Selecionar ${product.title}`}
 />
 </TableCell>

 <TableCell>
 <div className="flex items-center gap-3">
 {cover ? (
 <img
 src={cover}
 alt=""
 className="size-11 object-cover rounded shrink-0"
 />
 ) : (
 <div className="size-11 bg-muted rounded flex items-center justify-center shrink-0">
 <Package className="size-5 text-muted-foreground" aria-hidden />
 </div>
 )}
 <div className="min-w-0 flex-1">
 <Link
 to={`/workspace/catalogo/produtos/${product.id}` as never}
 className="font-semibold text-sm text-foreground hover:underline truncate block"
 >
 {product.title}
 </Link>
 <span className="text-xs text-muted-foreground font-mono">
 /{product.slug}
 </span>
 </div>
 </div>
 </TableCell>

 <TableCell>
 <div className="flex items-center gap-2">
 <Switch
 checked={product.status === "published"}
 onCheckedChange={(c) => handleToggleActive(product, c)}
 className="scale-75"
 aria-label={`Alternar status de ${product.title}`}
 />
 <Badge
 variant={
 product.status === "published"
 ? "default"
 : product.status === "archived"
 ? "outline"
 : "secondary"
 }
 className="text-[10px] font-bold"
 >
 {product.status === "published"
 ? "Ativo"
 : product.status === "archived"
 ? "Arquivado"
 : "Pausado"}
 </Badge>
 </div>
 </TableCell>

 <TableCell className="text-xs text-muted-foreground">
 <div className="flex flex-col">
 <span className="font-medium text-foreground">{typeName}</span>
 {product.brand && <span className="text-[11px]">{product.brand}</span>}
 </div>
 </TableCell>

 <TableCell>
 <div className="flex flex-col">
 <EditablePriceCell
 productId={product.id}
 initialCents={product.price_cents}
 onSave={(cents) => handleUpdatePrice(product.id, cents)}
 />
 {product.compare_at_cents ? (
 <span className="text-xs text-muted-foreground line-through">
 {formatMoney(product.compare_at_cents)}
 </span>
 ) : null}
 </div>
 </TableCell>

 <TableCell>
 <EditableStockCell
 productId={product.id}
 initialStock={(product as any).stock ?? 0}
 onSave={(stock) => handleUpdateStock(product.id, stock)}
 />
 </TableCell>

 <TableCell className="text-right">
 <ProductActionsMenu product={product} />
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>
 </div>
 )}
 </>
 )}

 {/* ── MODAL DE IMPORTAÇÃO DE CARDÁPIO / CATÁLOGO (iFood & IA) ── */}
 <ImportCatalogModal
 open={isImportModalOpen}
 onOpenChange={setIsImportModalOpen}
 onSuccess={async () => {
 const fresh = await listAdminProducts();
 if (fresh) setProducts(fresh);
 }}
 />
 </div>
 );
}
