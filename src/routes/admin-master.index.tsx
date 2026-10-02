import { createFileRoute, useRouter } from "@tanstack/react-router";
import { getPlatformMetrics, getPlatformStoresList, getPlatformInvoicesList, toggleStoreStatus } from "@/services/master.functions";
import { listPlatformDomainTaxonomies, upsertPlatformDomainTaxonomy } from "@/services/deep-core.functions";
import { formatMoney } from "@/lib/money";
import { DollarSign, Store, Activity, AlertTriangle, Users, UserCheck, Layers, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin-master/")({
  head: () => ({ meta: [{ title: "Dashboard | Admin Master" }] }),
  loader: async () => {
    try {
      const [metrics, stores, invoices, taxonomiesRes] = await Promise.all([
        getPlatformMetrics(),
        getPlatformStoresList(),
        getPlatformInvoicesList(),
        listPlatformDomainTaxonomies({ data: { activeOnly: false } }).catch(() => ({ taxonomies: [] })),
      ]);
      return {
        metrics,
        stores,
        invoices,
        taxonomies: taxonomiesRes?.taxonomies || [],
      };
    } catch (err) {
      console.error("[loader:admin-master.index] Unhandled loader error:", err);
      return { metrics: null, stores: null, invoices: null, taxonomies: [] };
    }
  },
  component: AdminMasterDashboard,
});

function AdminMasterDashboard() {
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const metrics = loaderData.metrics || {
    totalRevenueCents: 0,
    pendingRevenueCents: 0,
    totalStores: 0,
    totalUsers: 0,
    pendingReports: 0,
    pendingKyc: 0,
  };
  const stores = loaderData.stores || [];
  const invoices = loaderData.invoices || [];
  const taxonomies = loaderData.taxonomies || [];
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Estado do gerenciador de Taxonomias Dinâmicas (V113 Deep Core)
  const [newTaxGroup, setNewTaxGroup] = useState<
    "store_niche" | "classified_category" | "job_category" | "tourism_spec" | "real_estate_spec" | "automotive_spec"
  >("store_niche");
  const [newTaxSlug, setNewTaxSlug] = useState("");
  const [newTaxLabel, setNewTaxLabel] = useState("");
  const [isSavingTax, setIsSavingTax] = useState(false);

  const handleCreateTaxonomy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaxSlug.trim() || !newTaxLabel.trim()) return;
    setIsSavingTax(true);
    try {
      await upsertPlatformDomainTaxonomy({
        data: {
          domainGroup: newTaxGroup,
          slug: newTaxSlug.trim().toLowerCase(),
          label: newTaxLabel.trim(),
          isActive: true,
          sortOrder: taxonomies.length * 10 + 10,
        },
      });
      toast.success("Taxonomia dinâmica registrada no núcleo da plataforma.");
      setNewTaxSlug("");
      setNewTaxLabel("");
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar taxonomia.");
    } finally {
      setIsSavingTax(false);
    }
  };

  const handleToggleStore = async (storeId: string, currentStatus: boolean) => {
    if (!confirm(`Deseja realmente ${currentStatus ? "bloquear" : "desbloquear"} esta loja?`))
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

  const METRIC_CARDS = [
    {
      label: "Receita Faturada",
      value: formatMoney(metrics.totalRevenueCents || 0),
      icon: DollarSign,
      color: "text-primary bg-primary/10",
    },
    {
      label: "Receita Pendente",
      value: formatMoney(metrics.pendingRevenueCents),
      icon: Activity,
      color: "text-amber-600 bg-amber-500/10",
    },
    {
      label: "Total de Lojas",
      value: metrics.totalStores,
      icon: Store,
      color: "text-emerald-600 bg-emerald-500/10",
    },
    {
      label: "Usuários Cadastrados",
      value: metrics.totalUsers,
      icon: Users,
      color: "text-info bg-info/10",
    },
    {
      label: "Denúncias Pendentes",
      value: metrics.pendingReports,
      icon: AlertTriangle,
      color: "text-rose-600 bg-rose-500/10",
    },
    {
      label: "KYC Pendente",
      value: metrics.pendingKyc,
      icon: UserCheck,
      color: "text-primary bg-primary/10",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="pb-4 border-b border-border/40">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Painel Master</h1>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {METRIC_CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-card rounded-lg p-4 border border-border/60 shadow-2xs space-y-2 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">{card.label}</span>
                <div className={cn("size-7 rounded-lg flex items-center justify-center", card.color)}>
                  <Icon className="size-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold text-foreground tracking-tight">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Lists Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stores Table */}
        <div className="bg-card rounded-lg border border-border/60 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Lojas Recentes</span>
            <span className="text-xs text-muted-foreground font-mono">{stores.length} lojas</span>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/30 text-muted-foreground border-b border-border/40 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Loja</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {stores.slice(0, 8).map((store: any) => (
                  <tr key={store.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{store.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">/{store.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={store.is_active ? "default" : "destructive"}
                        className={cn(
                          "text-[10px] font-medium px-2 py-1",
                          store.is_active ? "bg-emerald-600/90 text-white" : ""
                        )}
                      >
                        {store.is_active ? "Ativa" : "Bloqueada"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={store.is_active ? "outline" : "default"}
                        className="h-7 px-3 rounded-lg text-xs font-medium"
                        disabled={loadingId === store.id}
                        onClick={() => handleToggleStore(store.id, store.is_active)}
                      >
                        {store.is_active ? "Bloquear" : "Ativar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-card rounded-lg border border-border/60 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">Faturas</span>
            <span className="text-xs text-muted-foreground font-mono">{invoices.length} faturas</span>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/30 text-muted-foreground border-b border-border/40 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Loja</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {invoices.slice(0, 8).map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {inv.description || "Assinatura Mensal"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.stores?.name || "Global"}</td>
                    <td className="px-4 py-3 font-semibold">{formatMoney(inv.amount_cents)}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={inv.status === "paid" ? "default" : "secondary"}
                        className={cn(
                          "text-[10px] font-medium px-2 py-1",
                          inv.status === "paid" ? "bg-emerald-600/90 text-white" : ""
                        )}
                      >
                        {inv.status === "paid" ? "Pago" : "Pendente"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhuma fatura registrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── V113 DEEP CORE: TAXONOMIAS DINÂMICAS DO DOMÍNIO (platform_domain_taxonomies) ── */}
      <div className="bg-card rounded-lg border border-border/60 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <span className="text-xs font-bold text-foreground">
              Taxonomias Dinâmicas ({taxonomies.length})
            </span>
          </div>

          <form onSubmit={handleCreateTaxonomy} className="flex flex-wrap items-center gap-2">
            <select
              value={newTaxGroup}
              onChange={(e) => setNewTaxGroup(e.target.value as any)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium"
            >
              <option value="store_niche">Nicho de Loja</option>
              <option value="classified_category">Classificados</option>
              <option value="job_category">Empregos</option>
              <option value="tourism_spec">Turismo</option>
              <option value="real_estate_spec">Imóveis</option>
              <option value="automotive_spec">Automotivo</option>
            </select>
            <Input
              value={newTaxSlug}
              onChange={(e) => setNewTaxSlug(e.target.value)}
              placeholder="slug (ex: nautica)"
              className="h-9 w-36 rounded-lg text-xs font-mono"
            />
            <Input
              value={newTaxLabel}
              onChange={(e) => setNewTaxLabel(e.target.value)}
              placeholder="Rótulo (ex: Náutica)"
              className="h-9 w-40 rounded-lg text-xs"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isSavingTax}
              className="h-9 rounded-lg text-xs font-bold gap-1"
            >
              <Plus className="size-3.5" />
              <span>Adicionar</span>
            </Button>
          </form>
        </div>

        <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
          {taxonomies.map((tax: any) => (
            <div
              key={tax.id || `${tax.domain_group}-${tax.slug}`}
              className="h-11 px-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Badge variant="outline" className="text-[10px] font-mono">
                  {tax.domain_group}
                </Badge>
                <span className="text-xs font-semibold text-foreground truncate">
                  {tax.label}
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  /{tax.slug}
                </span>
              </div>
              <Badge
                variant={tax.is_active ? "default" : "secondary"}
                className="text-[10px] h-5 px-2"
              >
                {tax.is_active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
