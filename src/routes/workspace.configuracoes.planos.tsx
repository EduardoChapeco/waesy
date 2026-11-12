import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Layers, Users, Smartphone, Receipt, Check, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/commerce/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ErrorState, EmptyState } from "@/components/state/states";
import { getStoreSettings } from "@/services/store.functions";
import {
  getStorePlanOverview,
  toggleStoreModuleAddon,
  updateStorePlanTier,
} from "@/services/store-modules.functions";
import type { CommercialModuleId, StorePlanTier } from "@/lib/architecture/module-plan-governance";
import { formatMoney } from "@/lib/money";

export const Route = createFileRoute("/workspace/configuracoes/planos")({
  head: () => ({ meta: [{ title: "Plano e Módulos | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const storeSettings = await getStoreSettings();
      const storeId = (storeSettings as any)?.id || (storeSettings as any)?.store?.id;
      if (!storeId) {
        return { overview: null, error: "Loja ativa não encontrada." };
      }
      const overview = await getStorePlanOverview({ data: { storeId } });
      return { overview, error: null };
    } catch (err: unknown) {
      return {
        overview: null,
        error: err instanceof Error ? err.message : "Erro ao carregar plano e módulos.",
      };
    }
  },
  component: WorkspaceConfiguracoesPlanosPage,
});

function formatBrDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function WorkspaceConfiguracoesPlanosPage() {
  const { overview: initialOverview, error } = Route.useLoaderData() as {
    overview: Awaited<ReturnType<typeof getStorePlanOverview>> | null;
    error: string | null;
  };
  const router = useRouter();
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const [busyModule, setBusyModule] = useState<string | null>(null);

  if (error || !initialOverview) {
    return (
      <div className="mx-auto max-w-2xl py-16 px-4">
        <ErrorState
          title="Plano Indisponível"
          description={error || "Não foi possível carregar as informações do plano desta loja."}
          onRetry={() => router.invalidate()}
        />
      </div>
    );
  }

  const { store, plan, usage, monthlyTotalCents, invoices, modules, availablePlans } = initialOverview;
  const staffUnlimited = store.isExempt || usage.maxStaffUsers >= 999;
  const waUnlimited = store.isExempt || usage.maxWhatsAppInstances >= 999;
  const staffPct = staffUnlimited ? 25 : Math.min(100, Math.round((usage.staffCount / Math.max(1, usage.maxStaffUsers)) * 100));
  const waPct = waUnlimited ? 25 : Math.min(100, Math.round((usage.whatsAppInstancesCount / Math.max(1, usage.maxWhatsAppInstances)) * 100));

  const handleSelectPlan = async (tier: StorePlanTier) => {
    if (tier === store.tier) return;
    setBusyTier(tier);
    try {
      await updateStorePlanTier({ data: { storeId: store.id, planTier: tier } });
      toast.success(`Plano alterado para ${tier.toUpperCase()}.`);
      await router.invalidate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar o plano.");
    } finally {
      setBusyTier(null);
    }
  };

  const handleToggleModule = async (moduleId: CommercialModuleId, nextActive: boolean) => {
    setBusyModule(moduleId);
    try {
      await toggleStoreModuleAddon({ data: { storeId: store.id, moduleId, active: nextActive } });
      toast.success(nextActive ? "Módulo adicional ativado." : "Módulo adicional desativado.");
      await router.invalidate();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar módulo.");
    } finally {
      setBusyModule(null);
    }
  };

  return (
    <div className="space-y-8 w-full px-0 sm:px-4 md:px-0 pb-20">
      <PageHeader
        eyebrow="Assinatura Corporativa"
        title="Plano e Módulos"
        description="Gerencie limites de equipe, instâncias WhatsApp, add-ons e faturas da plataforma."
        actions={
          <Button asChild variant="outline" className="h-11 min-h-11 px-4 text-xs font-semibold gap-2 focus-visible:ring-2 focus-visible:ring-ring">
            <Link to="/workspace/financeiro/faturas">
              <Receipt className="size-4" />
              <span>Ver Todas Faturas</span>
            </Link>
          </Button>
        }
      />

      {/* Resumo de Uso & Cotas Atuais */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plano Ativo</span>
            <Badge variant="secondary" className="font-mono text-2xs uppercase">
              {store.isExempt ? "Enterprise (SSOT)" : plan.name}
            </Badge>
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {formatMoney(monthlyTotalCents)}
            <span className="text-xs font-normal text-muted-foreground">/mês</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Inclui {plan.includedModules.length} módulo(s) nativo(s) e {plan.includedVerticalsCount} vertical(is).
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="size-3.5" />
              <span>Membros da Equipe</span>
            </span>
            <span className="text-xs font-mono font-bold text-foreground">
              {usage.staffCount} / {staffUnlimited ? "Ilimitado" : usage.maxStaffUsers}
            </span>
          </div>
          <Progress value={staffPct} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Colaboradores com acesso ativo</span>
            <Link to="/workspace/configuracoes/equipe" className="font-semibold text-primary inline-flex items-center gap-1 hover:underline">
              <span>Equipe</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="size-3.5" />
              <span>Instâncias WhatsApp</span>
            </span>
            <span className="text-xs font-mono font-bold text-foreground">
              {usage.whatsAppInstancesCount} / {waUnlimited ? "Ilimitadas" : usage.maxWhatsAppInstances}
            </span>
          </div>
          <Progress value={waPct} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Canais conectados na Evolution / Meta</span>
            <Link to="/workspace/configuracoes/integracoes" className="font-semibold text-primary inline-flex items-center gap-1 hover:underline">
              <span>Integrações</span>
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Tiers Disponíveis */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">Níveis de Licenciamento</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {availablePlans.map((tierDef) => {
            const isCurrent = tierDef.tier === store.tier;
            const isLoading = busyTier === tierDef.tier;
            return (
              <div
                key={tierDef.tier}
                className={`rounded-lg border p-5 flex flex-col justify-between gap-4 bg-card ${
                  isCurrent ? "border-primary ring-1 ring-primary/30" : "border-border"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground">{tierDef.name}</h3>
                    {isCurrent && (
                      <Badge variant="secondary" className="text-3xs font-mono uppercase">
                        Atual
                      </Badge>
                    )}
                  </div>
                  <div className="text-xl font-bold font-mono text-foreground">
                    {formatMoney(tierDef.monthlyPriceCents)}
                    <span className="text-xs font-normal text-muted-foreground">/mês</span>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground pt-2">
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-primary shrink-0" />
                      <span>
                        {tierDef.maxStaffUsers >= 999
                          ? "Usuários ilimitados"
                          : `Até ${tierDef.maxStaffUsers} colaborador(es)`}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-primary shrink-0" />
                      <span>
                        {tierDef.maxWhatsAppInstances >= 999
                          ? "Instâncias ilimitadas"
                          : `Até ${tierDef.maxWhatsAppInstances} instância(s) WhatsApp`}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="size-3.5 text-primary shrink-0" />
                      <span>{tierDef.includedModules.length} módulo(s) incluso(s)</span>
                    </li>
                  </ul>
                </div>

                <Button
                  type="button"
                  variant={isCurrent ? "secondary" : "default"}
                  disabled={isCurrent || Boolean(busyTier) || store.isExempt}
                  onClick={() => handleSelectPlan(tierDef.tier)}
                  className="h-11 min-h-11 w-full text-xs font-bold gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isLoading && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />}
                  <span>{store.isExempt ? "Protegido (SSOT)" : isCurrent ? "Plano Ativo" : "Selecionar Plano"}</span>
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Módulos Comerciais & Add-ons */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <h2 className="text-base font-bold text-foreground">Módulos e Add-ons</h2>
        </div>
        <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
          {modules.map((mod) => {
            const isUpdating = busyModule === mod.id;
            const lockedByPlan = mod.isIncludedInPlan || store.isExempt;
            return (
              <div key={mod.id} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{mod.name}</span>
                    {mod.isIncludedInPlan && (
                      <Badge variant="secondary" className="text-3xs bg-primary/10 text-primary border-primary/20">
                        Incluso no Plano
                      </Badge>
                    )}
                    {!mod.isIncludedInPlan && mod.isSubscribedAsAddon && (
                      <Badge variant="outline" className="text-3xs border-success/40 text-success bg-success/10">
                        Add-on Ativo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{mod.tagline}</p>
                  <p className="text-2xs font-mono text-muted-foreground">
                    {formatMoney(mod.monthlyPriceCents)}/mês avulso
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {isUpdating && <Loader2 className="size-4 animate-spin motion-reduce:animate-none text-muted-foreground" />}
                  <Switch
                    checked={mod.isActive}
                    disabled={lockedByPlan || isUpdating}
                    onCheckedChange={(checked) => handleToggleModule(mod.id as CommercialModuleId, checked)}
                    aria-label={`Alternar módulo ${mod.name}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Faturas Recentes da Loja */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Receipt className="size-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Faturas Recentes</h2>
          </div>
          <Link to="/workspace/financeiro/faturas" className="text-xs font-semibold text-primary hover:underline">
            Abrir central financeira
          </Link>
        </div>

        {invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Nenhuma fatura emitida"
            description="As faturas mensais de assinatura e add-ons desta loja aparecerão aqui."
          />
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-x-auto table-scroll-area">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-3xs font-semibold border-b border-border/60">
                <tr>
                  <th className="p-3">Descrição</th>
                  <th className="p-3">Vencimento</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {invoices.map((inv: any) => (
                  <tr key={inv.id}>
                    <td className="p-3 font-medium text-foreground">{inv.description}</td>
                    <td className="p-3 font-mono text-muted-foreground">{formatBrDate(inv.due_date)}</td>
                    <td className="p-3">
                      <Badge
                        variant={inv.status === "paid" ? "default" : inv.status === "overdue" ? "destructive" : "secondary"}
                        className="text-3xs uppercase font-mono"
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-foreground">
                      {formatMoney(Number(inv.amount_cents || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
