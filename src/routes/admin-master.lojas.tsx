import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { getPlatformStoresList, toggleStoreStatus } from "@/services/master.functions";
import { setTenantContext } from "@/services/identity.functions";
import { setClientContextCookies } from "@/lib/context-auth";
import { Store, Search, Download, ExternalLink, Sliders, ShieldCheck, Check, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  STORE_PLANS,
  COMMERCIAL_MODULE_CATALOG,
  CommercialModuleId,
  StorePlanTier,
} from "@/lib/architecture/module-plan-governance";
import {
  updateStorePlanTier,
  toggleStoreModuleAddon,
} from "@/services/store-modules.functions";
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
 const [selectedStoreForPlan, setSelectedStoreForPlan] = useState<any | null>(null);
 const [planDialogOpen, setPlanDialogOpen] = useState(false);
 const [selectedTier, setSelectedTier] = useState<StorePlanTier>("free");
 const [activeAddons, setActiveAddons] = useState<string[]>([]);
 const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

 const handleOpenPlanModal = (store: any) => {
   setSelectedStoreForPlan(store);
   const tier = (store.plan_tier || store.settings?.plan_tier || "free").toLowerCase() as StorePlanTier;
   setSelectedTier(STORE_PLANS[tier] ? tier : "free");
   setActiveAddons(Array.isArray(store.settings?.active_modules) ? store.settings.active_modules : []);
   setPlanDialogOpen(true);
 };

 const handleSaveTier = async (newTier: StorePlanTier) => {
   if (!selectedStoreForPlan) return;
   setIsUpdatingPlan(true);
   try {
     await updateStorePlanTier({
       data: {
         storeId: selectedStoreForPlan.id,
         planTier: newTier,
       },
     });
     setSelectedTier(newTier);
     toast.success(`Plano da loja alterado para ${STORE_PLANS[newTier].name}.`);
     router.invalidate();
   } catch (e: unknown) {
     toast.error(e instanceof Error ? e.message : "Erro ao alterar plano.");
   } finally {
     setIsUpdatingPlan(false);
   }
 };

 const handleToggleAddonModule = async (moduleId: CommercialModuleId, active: boolean) => {
   if (!selectedStoreForPlan) return;
   setIsUpdatingPlan(true);
   try {
     await toggleStoreModuleAddon({
       data: {
         storeId: selectedStoreForPlan.id,
         moduleId,
         active,
       },
     });
     setActiveAddons((prev) =>
       active ? [...prev, moduleId] : prev.filter((m) => m !== moduleId)
     );
     toast.success(`Módulo ${COMMERCIAL_MODULE_CATALOG[moduleId].name} ${active ? "ativado" : "desativado"}.`);
     router.invalidate();
   } catch (e: unknown) {
     toast.error(e instanceof Error ? e.message : "Erro ao atualizar módulo.");
   } finally {
     setIsUpdatingPlan(false);
   }
 };

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
      setClientContextCookies({ context: "store", storeId });
      await setTenantContext({ data: { store_id: storeId } }).catch(() => null);
      toast.success(`Acessando painel de "${storeName}"...`);
      window.location.href = `/workspace?storeId=${encodeURIComponent(storeId)}`;
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
 <p className="text-xs text-muted-foreground mt-1">
 Governança e auditoria de todos os negócios registrados na plataforma.
 </p>
 </div>

 <Button
 variant="outline"
 size="sm"
 onClick={handleExportStoresCsv}
 className="h-9 px-4 rounded-lg text-xs font-medium gap-2 cursor-pointer bg-card border-border/60"
 >
 <Download className="size-3.5" />
 <span>Exportar CSV</span>
 </Button>
 </div>

 {/* Table Card */}
 <div className="bg-card rounded-lg border border-border/60 overflow-hidden shadow-2xs">
 <div className="p-4 border-b border-border/40 bg-muted/20 flex items-center justify-between gap-3">
 <div className="relative max-w-xs w-full">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
 <Input
 placeholder="Buscar por nome ou slug..."
 className="pl-8 bg-background h-8.5 rounded-lg text-xs border-border/60"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 <span className="text-xs text-muted-foreground font-mono">
 {filteredStores.length} {filteredStores.length === 1 ? "loja" : "lojas"}
 </span>
 </div>

 <div className="overflow-x-auto scroll-area-carousel no-scrollbar">
 <table className="w-full text-xs text-left">
 <thead className="bg-muted/30 text-muted-foreground border-b border-border/40 font-semibold uppercase text-2xs tracking-wider">
 <tr>
 <th className="px-5 py-3">Loja</th>
 <th className="px-5 py-3">Slug</th>
 <th className="px-5 py-3">Plano</th>
 <th className="px-5 py-3">Cadastro</th>
 <th className="px-5 py-3">Status</th>
 <th className="px-5 py-3 text-right">Ações</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border/40">
 {filteredStores.map((store: any) => (
 <tr key={store.id} className="hover:bg-muted/30 transition-colors">
 <td className="px-5 py-4">
 <div className="flex items-center gap-3">
 <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
 {store.name?.slice(0, 2).toUpperCase()}
 </div>
 <div>
 <div className="flex items-center gap-2">
 <p className="font-semibold text-foreground">{store.name}</p>
 {store.settings?.segment && (
 <Badge variant="outline" className="text-3xs px-2 py-0 h-4 border-border/60 uppercase">
 {store.settings.segment}
 </Badge>
 )}
 </div>
 <p className="text-2xs text-muted-foreground">
 {store.city ? `${store.city} - ${store.state || "SC"}` : "Santa Catarina"}
 </p>
 </div>
 </div>
 </td>
 <td className="px-5 py-4 font-mono text-2xs text-muted-foreground">
 /{store.slug}
 </td>
 <td className="px-5 py-4">
   <Button
     type="button"
     variant="outline"
     size="sm"
     onClick={() => handleOpenPlanModal(store)}
     className="h-7 px-2 rounded-lg text-2xs font-bold gap-1 border-border/60 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
   >
     <Sliders className="size-3 text-primary" />
     <span className="capitalize">{STORE_PLANS[(store.plan_tier || store.settings?.plan_tier || "free").toLowerCase() as StorePlanTier]?.name || "Free"}</span>
   </Button>
 </td>
 <td className="px-5 py-4 text-muted-foreground text-2xs">
 {format(new Date(store.created_at || Date.now()), "dd/MM/yyyy", { locale: ptBR })}
 </td>
 <td className="px-5 py-4">
 <Badge
 variant={store.is_active ? "default" : "destructive"}
 className={cn(
 "text-2xs font-medium px-2 py-1",
 store.is_active ? "bg-emerald-600/90 text-foreground" : ""
 )}
 >
 {store.is_active ? "Ativa" : "Bloqueada"}
 </Badge>
 </td>
 <td className="px-5 py-4 text-right">
 <div className="flex items-center justify-end gap-2">
 <Button
 size="sm"
 variant="outline"
 className="h-7 px-3 rounded-lg text-xs font-medium bg-card focus-visible:ring-2 focus-visible:ring-primary"
 disabled={loadingId === store.id}
 onClick={() => handleImpersonateStore(store.id, store.name)}
 >
 Acessar
 </Button>
 <Button
 size="sm"
 variant="ghost"
 className="h-7 px-2 rounded-lg text-xs font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
 title="Gerenciar Plano e Módulos"
 onClick={() => handleOpenPlanModal(store)}
 >
 <Sliders className="size-3.5" />
 </Button>
 <Button
 size="sm"
 variant="ghost"
 className={cn(
 "h-7 px-2 rounded-lg text-xs font-medium focus-visible:ring-2 focus-visible:ring-primary",
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
 <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
 Nenhuma loja encontrada.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>
 </div>

 {/* Modal de Gestão de Plano e Módulos Comerciais da Loja */}
 <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
   <DialogContent className="max-w-xl max-h-screen overflow-y-auto">
     <DialogHeader>
       <DialogTitle className="flex items-center gap-2 text-base font-bold">
         <Sliders className="size-5 text-primary" />
         <span>Plano e Módulos • {selectedStoreForPlan?.name}</span>
       </DialogTitle>
       <DialogDescription className="text-xs text-muted-foreground">
         Configure o tier contratual da loja e ative ou desative módulos adicionais com faturamento e permissões dinâmicas.
       </DialogDescription>
     </DialogHeader>

     <div className="space-y-5 py-2">
       {/* Seletor de Tier */}
       <div className="space-y-2">
         <Label className="text-xs font-bold text-foreground">Tier do Plano da Empresa</Label>
         <Select
           value={selectedTier}
           onValueChange={(val) => handleSaveTier(val as StorePlanTier)}
           disabled={isUpdatingPlan}
         >
           <SelectTrigger className="w-full h-11 min-h-11 text-xs">
             <SelectValue placeholder="Selecione o plano" />
           </SelectTrigger>
           <SelectContent>
             {Object.values(STORE_PLANS).map((p) => (
               <SelectItem key={p.tier} value={p.tier} className="text-xs py-2">
                 <div className="flex items-center justify-between gap-4 w-full">
                   <span className="font-bold">{p.name}</span>
                   <span className="text-muted-foreground font-mono">
                     {p.monthlyPriceCents === 0
                       ? "Gratuito"
                       : `R$ ${(p.monthlyPriceCents / 100).toFixed(2)}/mês`}
                   </span>
                 </div>
               </SelectItem>
             ))}
           </SelectContent>
         </Select>
       </div>

       {/* Detalhes do Tier Selecionado */}
       {STORE_PLANS[selectedTier] && (
         <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1 text-xs">
           <div className="flex items-center justify-between">
             <span className="font-semibold text-foreground">Usuários de Equipe Inclusos:</span>
             <span className="font-mono text-muted-foreground">
               {STORE_PLANS[selectedTier].maxStaffUsers === 9999
                 ? "Ilimitados"
                 : STORE_PLANS[selectedTier].maxStaffUsers}
             </span>
           </div>
           <div className="flex items-center justify-between">
             <span className="font-semibold text-foreground">Instâncias WhatsApp:</span>
             <span className="font-mono text-muted-foreground">
               {STORE_PLANS[selectedTier].maxWhatsAppInstances === 999
                 ? "Ilimitadas"
                 : STORE_PLANS[selectedTier].maxWhatsAppInstances}
             </span>
           </div>
         </div>
       )}

       {/* Catálogo de Módulos Comerciais e Add-ons */}
       <div className="space-y-2">
         <Label className="text-xs font-bold text-foreground">
           Módulos e Recursos Contratados
         </Label>
         <div className="divide-y divide-border/40 rounded-lg border border-border/60 overflow-hidden">
           {Object.values(COMMERCIAL_MODULE_CATALOG).map((mod) => {
             const isIncludedInPlan = STORE_PLANS[selectedTier]?.includedModules.includes(mod.id);
             const isSubscribed = activeAddons.includes(mod.id);
             const isEnabled = isIncludedInPlan || isSubscribed;

             return (
               <div
                 key={mod.id}
                 className="p-3 flex items-start justify-between gap-3 bg-card hover:bg-muted/10 transition-colors"
               >
                 <div className="space-y-1 min-w-0 pr-2">
                   <div className="flex items-center gap-2">
                     <p className="font-bold text-xs text-foreground truncate">{mod.name}</p>
                     {isIncludedInPlan && (
                       <Badge variant="secondary" className="text-3xs px-2 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                         Incluso no Plano
                       </Badge>
                     )}
                     {!isIncludedInPlan && isSubscribed && (
                       <Badge variant="outline" className="text-3xs px-2 py-0 h-4 border-success/30 text-success">
                         Add-on Ativo
                       </Badge>
                     )}
                   </div>
                   <p className="text-2xs text-muted-foreground line-clamp-1">{mod.tagline}</p>
                   <p className="text-3xs font-mono text-muted-foreground">
                     R$ {(mod.monthlyPriceCents / 100).toFixed(2)}/mês avulso
                   </p>
                 </div>

                 <div className="shrink-0 pt-1">
                   <Switch
                     checked={isEnabled}
                     disabled={isIncludedInPlan || isUpdatingPlan}
                     onCheckedChange={(checked) => handleToggleAddonModule(mod.id, checked)}
                     aria-label={`Ativar ${mod.name}`}
                   />
                 </div>
               </div>
             );
           })}
         </div>
       </div>
     </div>

     <DialogFooter className="flex items-center justify-between sm:justify-between pt-3 border-t border-border/40">
       <Button
         type="button"
         variant="outline"
         size="sm"
         onClick={() => handleImpersonateStore(selectedStoreForPlan?.id, selectedStoreForPlan?.name)}
         className="h-11 min-h-11 px-4 text-xs font-bold gap-2"
       >
         <ExternalLink className="size-4" />
         <span>Acessar Workspace Desta Loja</span>
       </Button>
       <Button
         type="button"
         variant="default"
         size="sm"
         onClick={() => setPlanDialogOpen(false)}
         className="h-11 min-h-11 px-5 text-xs font-bold"
       >
         Concluído
       </Button>
     </DialogFooter>
   </DialogContent>
 </Dialog>
 </div>
 );
}
