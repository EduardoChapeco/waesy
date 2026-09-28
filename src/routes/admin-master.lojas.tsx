import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { getPlatformStoresList, toggleStoreStatus } from "@/services/master.functions";
import { setTenantContext } from "@/services/identity.functions";
import { Store, Search, Download, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin-master/lojas")({
 head: () => ({ meta: [{ title: "Lojas e Empresas | Admin Master" }] }),
  loader: async () => {
    try {
      const stores = await getPlatformStoresList();
      return { stores: stores || [] };
    } catch (err) {
      console.error("[loader:admin-master.lojas] Unhandled loader error:", err);
      return { stores: [] };
    }
  },
  component: MasterLojasPage,
});

function MasterLojasPage() {
  const loaderData = (Route.useLoaderData() as any) || {};
  const stores = loaderData.stores || [];
 const router = useRouter();
 const [loadingId, setLoadingId] = useState<string | null>(null);
 const [searchTerm, setSearchTerm] = useState("");

 const filteredStores = stores.filter(
 (s: any) =>
 s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
 s.slug.toLowerCase().includes(searchTerm.toLowerCase()),
 );

 const handleToggleStore = async (storeId: string, currentStatus: boolean) => {
 if (
 !confirm(
 `Deseja realmente ${currentStatus ? "bloquear" : "desbloquear"} esta loja?`,
 )
 )
 return;

 setLoadingId(storeId);
 try {
 await toggleStoreStatus({ data: { storeId, isActive: !currentStatus } });
 toast.success("Status da loja alterado com sucesso.");
 router.invalidate();
 } catch (e: unknown) {
 toast.error(e instanceof Error ? e.message : String(e));
 } finally {
 setLoadingId(null);
 }
 };

 const handleImpersonateStore = async (storeId: string, storeName: string) => {
 setLoadingId(storeId);
 try {
 if (typeof window !== "undefined") {
 window.document.cookie = `waesy_active_tenant=${storeId}; path=/; max-age=31536000; SameSite=Lax`;
 }
 await setTenantContext({ data: { store_id: storeId } }).catch(() => null);
 toast.success(`Acessando painel de "${storeName}"...`);
 window.location.href = "/workspace";
 } catch (e: unknown) {
 toast.error(e instanceof Error ? e.message : "Erro ao acessar contexto da loja.");
 setLoadingId(null);
 }
 };

 const handleExportStoresCsv = () => {
 const headers = ["ID", "Nome", "Slug", "Criado Em", "Status", "Tipo"];
 const rows = filteredStores.map((st: any) => [
 `"${st.id}"`,
 `"${st.name.replace(/"/g, '""')}"`,
 `"${st.slug}"`,
 `"${st.created_at}"`,
 `"${st.is_active ? "Ativo" : "Bloqueado"}"`,
 `"${st.settings?.segment || "Geral"}"`,
 ]);
 const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
 const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.setAttribute("href", url);
 link.setAttribute("download", `lojas_waesy_${new Date().toISOString().slice(0, 10)}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 toast.success("Arquivo CSV exportado.");
 };

 return (
 <div className="space-y-6 animate-in fade-in duration-300">
 {/* Page Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
 <div>
 <div className="flex items-center gap-2">
 <h1 className="text-2xl font-bold tracking-tight text-foreground">Lojas</h1>
 <Badge variant="secondary" className="text-xs font-normal">
 {stores.length} cadastradas
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground mt-0.5">
 Governança e auditoria de todos os negócios registrados na plataforma.
 </p>
 </div>

 <Button
 variant="outline"
 size="sm"
 onClick={handleExportStoresCsv}
 className="h-9 px-3.5 rounded-xl text-xs font-medium gap-1.5 cursor-pointer bg-card border-border/60"
 >
 <Download className="size-3.5" />
 <span>Exportar CSV</span>
 </Button>
 </div>

 {/* Table Card */}
 <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-2xs">
 <div className="p-3.5 border-b border-border/40 bg-muted/20 flex items-center justify-between gap-3">
 <div className="relative max-w-xs w-full">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
 <Input
 placeholder="Buscar por nome ou slug..."
 className="pl-8 bg-background h-8.5 rounded-xl text-xs border-border/60"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 <span className="text-xs text-muted-foreground font-mono">
 {filteredStores.length} {filteredStores.length === 1 ? "loja" : "lojas"}
 </span>
 </div>

 <div className="overflow-x-auto no-scrollbar">
 <table className="w-full text-xs text-left">
 <thead className="bg-muted/30 text-muted-foreground border-b border-border/40 font-semibold uppercase text-[10px] tracking-wider">
 <tr>
 <th className="px-5 py-3">Loja</th>
 <th className="px-5 py-3">Slug</th>
 <th className="px-5 py-3">Cadastro</th>
 <th className="px-5 py-3">Status</th>
 <th className="px-5 py-3 text-right">Ações</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/40">
 {filteredStores.map((store: any) => (
 <tr key={store.id} className="hover:bg-muted/30 transition-colors">
 <td className="px-5 py-3.5">
 <div className="flex items-center gap-3">
 <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
 {store.name?.slice(0, 2).toUpperCase()}
 </div>
 <div>
 <div className="flex items-center gap-1.5">
 <p className="font-semibold text-foreground">{store.name}</p>
 {store.settings?.segment && (
 <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-border/60 uppercase">
 {store.settings.segment}
 </Badge>
 )}
 </div>
 <p className="text-[11px] text-muted-foreground">
 {store.city ? `${store.city} - ${store.state || "SC"}` : "Santa Catarina"}
 </p>
 </div>
 </div>
 </td>
 <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground">
 /{store.slug}
 </td>
 <td className="px-5 py-3.5 text-muted-foreground text-[11px]">
 {format(new Date(store.created_at || Date.now()), "dd/MM/yyyy", { locale: ptBR })}
 </td>
 <td className="px-5 py-3.5">
 <Badge
 variant={store.is_active ? "default" : "destructive"}
 className={cn(
 "text-[10px] font-medium px-2 py-0.5",
 store.is_active ? "bg-emerald-600/90 text-white" : ""
 )}
 >
 {store.is_active ? "Ativa" : "Bloqueada"}
 </Badge>
 </td>
 <td className="px-5 py-3.5 text-right">
 <div className="flex items-center justify-end gap-1.5">
 <Button
 size="sm"
 variant="outline"
 className="h-7 px-2.5 rounded-lg text-xs font-medium bg-card"
 disabled={loadingId === store.id}
 onClick={() => handleImpersonateStore(store.id, store.name)}
 >
 Acessar
 </Button>
 <Button
 size="sm"
 variant="ghost"
 className={cn(
 "h-7 px-2 rounded-lg text-xs font-medium",
 store.is_active ? "text-destructive hover:bg-destructive/10" : "text-emerald-600"
 )}
 disabled={loadingId === store.id}
 onClick={() => handleToggleStore(store.id, store.is_active)}
 >
 {store.is_active ? "Bloquear" : "Ativar"}
 </Button>
 </div>
 </td>
 </tr>
 ))}
 {filteredStores.length === 0 && (
 <tr>
 <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
 Nenhuma loja encontrada.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 );
}
