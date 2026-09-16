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

import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import { Button } from "@/components/ui/button";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
 DropdownMenu,
 DropdownMenuContent,
 DropdownMenuItem,
 DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listCollections, updateCollection } from "@/services/admin-catalog.functions";

export const Route = createFileRoute("/workspace/catalogo/colecoes/")({
 head: () => ({ meta: [{ title: "Coleções & Agrupamentos | Workspace Waesy" }] }),
 loader: async () => {
 try {
 const res = await listCollections();
 return res || [];
 } catch {
 return [];
 }
 },
 component: AdminCollectionsPage,
});

function AdminCollectionsPage() {
 const collections = Route.useLoaderData();
 const router = useRouter();
 const [statusFilter, setStatusFilter] = useState<"active" | "archived">("active");
 const [searchQuery, setSearchQuery] = useState("");

 const activeCollectionsCount = collections.filter((c: any) => c.status !== "archived").length;
 const archivedCollectionsCount = collections.filter((c: any) => c.status === "archived").length;

 const filteredCollections = useMemo(() => {
 return collections.filter((c: any) => {
 const matchesSearch =
 c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 c.slug.toLowerCase().includes(searchQuery.toLowerCase());

 const matchesStatus =
 statusFilter === "active" ? c.status !== "archived" : c.status === "archived";

 return matchesSearch && matchesStatus;
 });
 }, [collections, searchQuery, statusFilter]);

 const handleUpdateStatus = async (id: string, newStatus: "active" | "inactive" | "archived") => {
 try {
 const res = await updateCollection({ data: { id, status: newStatus } });
 if (res) {
 toast.success(
 newStatus === "archived"
 ? "Coleção arquivada com sucesso!"
 : "Coleção reativada/atualizada!",
 );
 router.invalidate();
 } else {
 toast.error(res.message || "Erro ao atualizar coleção");
 }
 } catch {
 toast.error("Erro inesperado ao atualizar status");
 }
 };

 return (
 <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
 <WorkspaceCanonicalToolbar
 tabs={[
 { id: "active", label: "Ativas", count: activeCollectionsCount },
 { id: "archived", label: "Arquivo Morto", count: archivedCollectionsCount },
 ]}
 activeTab={statusFilter}
 onTabChange={(val) => setStatusFilter(val as "active" | "archived")}
 searchPlaceholder="Buscar coleção por nome ou slug..."
 searchValue={searchQuery}
 onSearchChange={setSearchQuery}
 primaryAction={{
 label: "Nova Coleção",
 icon: Plus,
 onClick: () => router.navigate({ to: "/workspace/catalogo/colecoes/novo" }),
 }}
 />

      {filteredCollections.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-border/40 bg-card/60 space-y-4 px-4">
          <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Plus className="size-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              {statusFilter === "active"
                ? "Nenhuma coleção cadastrada"
                : "Nenhuma coleção no arquivo morto"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Crie coleções temáticas e sazonais para agrupar produtos na vitrine da sua loja.
            </p>
          </div>
          {statusFilter === "active" && (
            <Button
              asChild
              className="h-11 px-6 rounded-xl font-bold text-sm gap-2 bg-primary text-primary-foreground cursor-pointer shadow-xs"
            >
              <Link to="/workspace/catalogo/colecoes/novo">
                <Plus className="size-4" />
                <span>Criar Primeira Coleção</span>
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* ── 1. Mobile List Layout (Zero-Cramping & 44px Touch Targets) ── */}
          <div className="space-y-3 block md:hidden">
            {filteredCollections.map((col: any) => (
              <div
                key={col.id}
                className="p-4 rounded-2xl bg-card border border-border/50 shadow-2xs space-y-3.5 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-12 rounded-xl bg-muted/60 border border-border/40 overflow-hidden flex items-center justify-center shrink-0">
                      {col.cover_url || col.image_url ? (
                        <img
                          src={col.cover_url || col.image_url}
                          alt={col.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground uppercase">
                          {col.name.slice(0, 2)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-base font-bold text-foreground truncate">
                        {col.name}
                      </h4>
                      <p className="text-xs font-mono text-muted-foreground truncate mt-0.5">
                        /{col.slug}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant={
                      col.status === "active"
                        ? "default"
                        : col.status === "archived"
                        ? "outline"
                        : "secondary"
                    }
                    className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                  >
                    {col.status === "active"
                      ? "Ativa"
                      : col.status === "inactive"
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
                    <Link to={`/workspace/catalogo/colecoes/${col.id}` as any}>
                      <Edit className="size-4 text-muted-foreground" />
                      <span>Editar</span>
                    </Link>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-11 px-4 rounded-xl border-border/60 hover:bg-muted cursor-pointer"
                        aria-label="Mais opções"
                      >
                        <MoreHorizontal className="size-5 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl">
                      {col.status !== "archived" ? (
                        <>
                          {col.status === "active" ? (
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(col.id, "inactive")}
                              className="h-10 rounded-lg text-sm font-medium cursor-pointer"
                            >
                              <EyeOff className="mr-2 size-4 text-muted-foreground" />
                              Desativar Coleção
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleUpdateStatus(col.id, "active")}
                              className="h-10 rounded-lg text-sm font-medium cursor-pointer"
                            >
                              <Check className="mr-2 size-4 text-success" />
                              Ativar Coleção
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="h-10 rounded-lg text-sm font-medium text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => handleUpdateStatus(col.id, "archived")}
                          >
                            <Archive className="mr-2 size-4" />
                            Arquivar
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleUpdateStatus(col.id, "active")}
                          className="h-10 rounded-lg text-sm font-medium cursor-pointer"
                        >
                          <RotateCcw className="mr-2 size-4" />
                          Restaurar Coleção
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>

          {/* ── 2. Desktop High-Density Table Layout ── */}
          <div className="hidden md:block rounded-2xl overflow-hidden bg-card border border-border/40 shadow-2xs">
            <div className="overflow-x-auto no-scrollbar">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-16 py-3.5"></TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider text-muted-foreground py-3.5">
                      Coleção & Slug
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
                  {filteredCollections.map((col: any) => (
                    <TableRow key={col.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="pl-4 pr-0 py-3.5">
                        <div className="size-10 rounded-xl bg-muted/60 border border-border/50 overflow-hidden flex items-center justify-center shrink-0">
                          {col.cover_url || col.image_url ? (
                            <img
                              src={col.cover_url || col.image_url}
                              alt={col.name}
                              className="size-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                              {col.name.slice(0, 2)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <div className="space-y-0.5">
                          <Link
                            to={`/workspace/catalogo/colecoes/${col.id}` as any}
                            className="font-bold text-sm text-foreground hover:text-primary transition-colors block"
                          >
                            {col.name}
                          </Link>
                          <span className="text-muted-foreground font-mono text-xs block">
                            /{col.slug}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge
                          variant={
                            col.status === "active"
                              ? "default"
                              : col.status === "archived"
                              ? "outline"
                              : "secondary"
                          }
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        >
                          {col.status === "active"
                            ? "Ativa"
                            : col.status === "inactive"
                            ? "Inativa"
                            : "Arquivada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-9 rounded-lg hover:bg-muted cursor-pointer"
                              aria-label="Ações da coleção"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl">
                            {col.status !== "archived" ? (
                              <>
                                <DropdownMenuItem asChild className="h-9 rounded-lg text-sm cursor-pointer">
                                  <Link to={`/workspace/catalogo/colecoes/${col.id}` as any}>
                                    <Edit className="mr-2 size-4" />
                                    Editar Coleção
                                  </Link>
                                </DropdownMenuItem>
                                {col.status === "active" ? (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(col.id, "inactive")}
                                    className="h-9 rounded-lg text-sm cursor-pointer"
                                  >
                                    <EyeOff className="mr-2 size-4 text-muted-foreground" />
                                    Desativar
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateStatus(col.id, "active")}
                                    className="h-9 rounded-lg text-sm cursor-pointer"
                                  >
                                    <Check className="mr-2 size-4 text-success" />
                                    Ativar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="h-9 rounded-lg text-sm text-destructive focus:text-destructive cursor-pointer"
                                  onClick={() => handleUpdateStatus(col.id, "archived")}
                                >
                                  <Archive className="mr-2 size-4" />
                                  Arquivar
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleUpdateStatus(col.id, "active")}
                                className="h-9 rounded-lg text-sm cursor-pointer"
                              >
                                <RotateCcw className="mr-2 size-4" />
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
        </>
      )}
    </div>
  );
}
