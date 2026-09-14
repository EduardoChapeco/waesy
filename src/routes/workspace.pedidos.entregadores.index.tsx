import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Car,
  Bike,
  Plus,
  Truck,
  Ban,
  Clock,
  CheckCircle2,
  Loader2,
  MoreVertical,
  Sliders,
  Phone,
  DollarSign,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { listCouriers, updateCourier, type CourierSummaryDTO } from "@/services/fleet.functions";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import {
  WorkspaceCanonicalToolbar,
  type WorkspaceToolbarTab,
} from "@/components/workspace/workspace-canonical-toolbar";
import {
  WorkspaceDashboardSheet,
  type MetricCardItem,
} from "@/components/workspace/workspace-dashboard-sheet";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";

export const Route = createFileRoute("/workspace/pedidos/entregadores/")({
  head: () => ({ meta: [{ title: "Entregadores & Frota | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const data = await listCouriers({ data: {} });
      return { initialData: data || [] };
    } catch {
      return { initialData: [] };
    }
  },
  component: CouriersListPage,
});

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }
> = {
  available: { label: "Disponível", variant: "default", icon: CheckCircle2 },
  on_route: { label: "Em Rota", variant: "secondary", icon: Truck },
  offline: { label: "Offline", variant: "outline", icon: Clock },
  suspended: { label: "Suspenso", variant: "destructive", icon: Ban },
};

const VEHICLE_ICONS: Record<string, any> = {
  motorcycle: Bike,
  car: Car,
  bicycle: Bike,
  van: Truck,
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, variant: "outline", icon: Clock };
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="gap-1.5 text-xs font-medium">
      <Icon className="size-3" />
      {cfg.label}
    </Badge>
  );
}

function CouriersListPage() {
  const { initialData } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<CourierSummaryDTO | null>(null);

  const { data: couriers, isLoading } = useQuery({
    queryKey: ["couriers"],
    queryFn: () => listCouriers({ data: {} }),
    initialData,
    staleTime: 60_000,
  });

  const courierList: any[] = couriers || [];

  // Contadores para as Tabs Canônicas
  const availableCount = courierList.filter((c: any) => c.status === "available").length;
  const onRouteCount = courierList.filter((c: any) => c.status === "on_route").length;
  const offlineCount = courierList.filter((c: any) => c.status === "offline").length;
  const suspendedCount = courierList.filter((c: any) => c.status === "suspended").length;

  const tabs: WorkspaceToolbarTab[] = [
    { id: "all", label: "Todos", count: courierList.length },
    { id: "available", label: "Disponíveis", count: availableCount },
    { id: "on_route", label: "Em Rota", count: onRouteCount },
    { id: "offline", label: "Offline", count: offlineCount },
    { id: "suspended", label: "Suspensos", count: suspendedCount },
  ];

  // Filtro integrado
  const filteredCouriers = useMemo(() => {
    return courierList.filter((c: any) => {
      if (activeTab !== "all" && c.status !== activeTab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPlate = c.vehicle_plate?.toLowerCase().includes(q);
        const matchesPhone = c.phone?.toLowerCase().includes(q);
        if (!matchesName && !matchesPlate && !matchesPhone) return false;
      }
      return true;
    });
  }, [courierList, activeTab, search]);

  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      courierId,
      newStatus,
    }: {
      courierId: string;
      newStatus: "available" | "suspended" | "offline";
    }) => {
      return updateCourier({
        data: {
          courier_id: courierId,
          data: { status: newStatus },
        },
      });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.newStatus === "suspended"
          ? "Entregador suspenso temporariamente."
          : "Status do entregador atualizado.",
      );
      queryClient.invalidateQueries({ queryKey: ["couriers"] });
      if (selectedCourier && selectedCourier.id === variables.courierId) {
        setSelectedCourier((prev) => (prev ? { ...prev, status: variables.newStatus } : null));
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao atualizar entregador.");
    },
  });

  // Métricas do Dashboard de Frota
  const totalDefaultFees = courierList.reduce((acc: number, c: any) => acc + (c.default_fee_cents || 0), 0);
  const avgFeeCents = courierList.length > 0 ? Math.round(totalDefaultFees / courierList.length) : 0;

  const dashboardMetrics: MetricCardItem[] = [
    {
      id: "total",
      label: "Frota Cadastrada",
      value: courierList.length,
      description: "Total de motoboys e motoristas vinculados",
      icon: Bike,
      variant: "primary",
    },
    {
      id: "active",
      label: "Disponíveis Agora",
      value: availableCount,
      description: "Prontos para receber chamados de entrega",
      icon: CheckCircle2,
      variant: "success",
    },
    {
      id: "in_route",
      label: "Em Rota",
      value: onRouteCount,
      description: "Entregas em andamento neste momento",
      icon: Truck,
      variant: "info",
    },
    {
      id: "avg_fee",
      label: "Taxa Média por Corrida",
      value: formatMoney(avgFeeCents),
      description: "Valor médio padrão de remuneração da frota",
      icon: DollarSign,
      variant: "warning",
    },
  ];

  return (
    <NicheOperationalGuard requiredNiches={[]}>
      <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto">
        {/* ── TOOLBAR CANÔNICA SOBERANA Waesy ── */}
        <WorkspaceCanonicalToolbar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          searchPlaceholder="Buscar entregador por nome, placa ou telefone..."
          searchValue={search}
          onSearchChange={setSearch}
          onOpenDashboard={() => setDashboardOpen(true)}
          dashboardButtonLabel="Métricas da Frota"
          primaryAction={{
            label: "Novo Entregador",
            icon: Plus,
            onClick: () => {
              router.navigate({ to: "/workspace/pedidos/entregadores/novo" });
            },
          }}
        />

        {/* ── LISTAGEM DE ENTREGADORES ── */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && filteredCouriers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-2xl bg-card">
            <Bike className="size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground">Nenhum entregador encontrado.</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Cadastre entregadores próprios ou chame motoboys avulsos sob demanda.
            </p>
            <Button asChild size="sm" className="mt-4 rounded-xl font-bold h-11 px-5">
              <Link to="/workspace/pedidos/entregadores/novo">
                <Plus className="size-4 mr-1.5" />
                Cadastrar Entregador
              </Link>
            </Button>
          </div>
        )}

        {!isLoading && filteredCouriers.length > 0 && (
          <div className="rounded-2xl overflow-hidden bg-card border border-border/60 shadow-xs">
            <div className="p-4 bg-muted/20 flex items-center justify-between border-b border-border/40">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Entregadores Ativos ({filteredCouriers.length})
              </span>
              <Button asChild variant="ghost" size="sm" className="h-8 text-xs font-semibold">
                <Link to="/workspace/pedidos/frota">
                  <Sliders className="size-3.5 mr-1.5" />
                  Painel de Despacho
                </Link>
              </Button>
            </div>

            <table className="w-full text-sm text-left">
              <thead className="bg-muted/10 text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-medium">Entregador</th>
                  <th className="px-4 py-3 font-medium">Veículo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Taxa Padrão</th>
                  <th className="px-4 py-3 font-medium w-16 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCouriers.map((courier: any) => {
                  const VehicleIcon = VEHICLE_ICONS[courier.vehicle_type] ?? Bike;
                  const isSuspended = courier.status === "suspended";

                  return (
                    <tr
                      key={courier.id}
                      className="hover:bg-muted/20 transition-colors group cursor-pointer"
                      onClick={() => setSelectedCourier(courier)}
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-bold text-foreground">{courier.name}</p>
                        {courier.phone && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Phone className="size-3" />
                            {courier.phone}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-lg bg-muted flex items-center justify-center">
                            <VehicleIcon className="size-3.5 text-muted-foreground" />
                          </div>
                          {courier.vehicle_plate && (
                            <span className="text-xs font-mono bg-muted/80 px-2 py-0.5 rounded-md uppercase font-bold">
                              {courier.vehicle_plate}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={courier.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold">
                        {courier.default_fee_cents > 0
                          ? formatMoney(courier.default_fee_cents)
                          : "---"}
                      </td>
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-9 rounded-xl hover:bg-muted/60"
                            >
                              <MoreVertical className="size-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl p-1">
                            <DropdownMenuItem asChild>
                              <Link
                                to="/workspace/pedidos/entregadores/$id"
                                params={{ id: courier.id }}
                              >
                                Ver Perfil Completo
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                toggleStatusMutation.mutate({
                                  courierId: courier.id,
                                  newStatus: isSuspended ? "available" : "suspended",
                                })
                              }
                              disabled={toggleStatusMutation.isPending}
                              className={isSuspended ? "text-emerald-600 font-bold" : "text-destructive"}
                            >
                              {isSuspended ? "Reativar Entregador" : "Suspender Entregador"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── DASHBOARD SHEET EXECUTIVO DE FROTA ── */}
        <WorkspaceDashboardSheet
          open={dashboardOpen}
          onOpenChange={setDashboardOpen}
          title="Telemetria & Produtividade da Frota"
          description="Controle em tempo real de disponibilidade, taxas e entregas ativas."
          metrics={dashboardMetrics}
        />

        {/* ── SHEET LATERAL DE DETALHES RÁPIDOS (EDIÇÃO EM PROFUNDIDADE 3) ── */}
        <Sheet open={!!selectedCourier} onOpenChange={(open) => !open && setSelectedCourier(null)}>
          <SheetContent size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-6 space-y-6 overflow-y-auto">
            {selectedCourier && (
              <>
                <SheetHeader className="space-y-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Bike className="size-4" />
                    </span>
                    <SheetTitle className="text-base font-bold">{selectedCourier.name}</SheetTitle>
                  </div>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Dados operacionais e status de despacho do entregador.
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-semibold">Status Operacional</span>
                      <StatusBadge status={selectedCourier.status} />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <span className="text-xs text-muted-foreground font-semibold">Placa do Veículo</span>
                      <span className="text-xs font-mono font-bold uppercase">
                        {selectedCourier.vehicle_plate || "Não informada"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <span className="text-xs text-muted-foreground font-semibold">Telefone de Contato</span>
                      <span className="text-xs font-bold">
                        {selectedCourier.phone || "Não informado"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <span className="text-xs text-muted-foreground font-semibold">Taxa Padrão de Entrega</span>
                      <span className="text-sm font-black text-foreground">
                        {selectedCourier.default_fee_cents > 0
                          ? formatMoney(selectedCourier.default_fee_cents)
                          : "Sob Cotação Dinâmica"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button
                      asChild
                      className="w-full h-11 rounded-xl font-bold min-h-[44px]"
                    >
                      <Link
                        to="/workspace/pedidos/entregadores/$id"
                        params={{ id: selectedCourier.id }}
                      >
                        Abrir Perfil & Extrato Completo
                      </Link>
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          courierId: selectedCourier.id,
                          newStatus:
                            selectedCourier.status === "suspended" ? "available" : "suspended",
                        })
                      }
                      disabled={toggleStatusMutation.isPending}
                      className="w-full h-11 rounded-xl text-xs font-bold min-h-[44px]"
                    >
                      {selectedCourier.status === "suspended"
                        ? "Reativar Entregador"
                        : "Suspender Entregador"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </NicheOperationalGuard>
  );
}
