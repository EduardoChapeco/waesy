import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Car, Bike, Plus, Truck, Ban, Clock, CheckCircle2, Loader2, MoreVertical, Sliders, Phone, DollarSign, Activity, ShieldCheck, Route as RouteIcon, Receipt, MapPin, KeyRound, ExternalLink, Copy, Wallet, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { listCouriers, updateCourier, type CourierSummaryDTO } from "@/services/fleet.functions";
import { listDispatches, type DispatchRecord } from "@/services/dispatch.functions";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { WorkspaceCanonicalToolbar, type WorkspaceToolbarTab } from "@/components/workspace/workspace-canonical-toolbar";
import { WorkspaceDashboardSheet, type MetricCardItem } from "@/components/workspace/workspace-dashboard-sheet";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";

export const Route = createFileRoute("/workspace/pedidos/entregadores/")({
  head: () => ({ meta: [{ title: "Entregadores & Rotas | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [couriers, dispatches] = await Promise.all([
        listCouriers({ data: {} }).catch(() => []),
        listDispatches().catch(() => []),
      ]);
      return { initialData: couriers || [], initialDispatches: dispatches || [] };
    } catch {
      return { initialData: [], initialDispatches: [] };
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
    <Badge variant={cfg.variant} className="gap-2 text-xs font-medium">
      <Icon className="size-3" />
      {cfg.label}
    </Badge>
  );
}

function CouriersListPage() {
  const { isCompact: isMobile } = useWindowSizeClass();
  const { initialData, initialDispatches } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<CourierSummaryDTO | null>(null);

  // Vales & Adiantamentos Locais Persistidos
  const [vales, setVales] = useState<Record<string, { amountCents: number; description: string }>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem("waesy_courier_vales");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [isValeModalOpen, setIsValeModalOpen] = useState(false);
  const [valeCourier, setValeCourier] = useState<CourierSummaryDTO | null>(null);
  const [valeAmount, setValeAmount] = useState("");
  const [valeDescription, setValeDescription] = useState("");

  const { data: couriers, isLoading } = useQuery({
    queryKey: ["couriers"],
    queryFn: () => listCouriers({ data: {} }),
    initialData,
    staleTime: 60_000,
  });

  const { data: dispatches = [], isLoading: isLoadingDispatches } = useQuery({
    queryKey: ["dispatches"],
    queryFn: () => listDispatches(),
    initialData: initialDispatches,
    staleTime: 30_000,
  });

  const courierList: any[] = couriers || [];

  // Contadores para as Tabs Canônicas
  const availableCount = courierList.filter((c: any) => c.status === "available").length;
  const onRouteCount = courierList.filter((c: any) => c.status === "on_route").length;
  const offlineCount = courierList.filter((c: any) => c.status === "offline").length;
  const suspendedCount = courierList.filter((c: any) => c.status === "suspended").length;
  const totalDispatchesCount = (dispatches || []).length;

  const tabs: WorkspaceToolbarTab[] = [
    { id: "all", label: "Entregadores", count: courierList.length },
    { id: "routes", label: "Rotas Ativas", count: totalDispatchesCount },
    { id: "settlement", label: "Espelho & Vales", count: courierList.length },
    { id: "available", label: "Disponíveis", count: availableCount },
    { id: "on_route", label: "Em Rota", count: onRouteCount },
    { id: "offline", label: "Offline", count: offlineCount },
    { id: "suspended", label: "Suspensos", count: suspendedCount },
  ];

  // Agrupamento de rotas ativas consolidadas por entregador
  const groupedRoutes = useMemo(() => {
    const map = new Map<string, { courierName: string; courierPhone?: string; dispatches: any[]; totalFeeCents: number }>();

    (dispatches || []).forEach((d: any) => {
      const key = d.courier_name || "Aguardando Atribuição";
      if (!map.has(key)) {
        map.set(key, {
          courierName: key,
          courierPhone: d.courier_phone,
          dispatches: [],
          totalFeeCents: 0,
        });
      }
      const entry = map.get(key)!;
      entry.dispatches.push(d);
      entry.totalFeeCents += d.delivery_fee_cents || 0;
    });

    return Array.from(map.values());
  }, [dispatches]);

  const handleOpenValeModal = (courier: CourierSummaryDTO) => {
    setValeCourier(courier);
    const existing = vales[courier.id];
    setValeAmount(existing ? (existing.amountCents / 100).toFixed(2) : "");
    setValeDescription(existing?.description || "");
    setIsValeModalOpen(true);
  };

  const handleSaveVale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valeCourier) return;

    const parsed = Math.round(parseFloat(valeAmount.replace(",", ".")) * 100);
    const amountCents = isNaN(parsed) || parsed < 0 ? 0 : parsed;

    const updated = {
      ...vales,
      [valeCourier.id]: {
        amountCents,
        description: valeDescription.trim() || "Vale / Adiantamento de combustível",
      },
    };
    setVales(updated);
    try {
      localStorage.setItem("waesy_courier_vales", JSON.stringify(updated));
    } catch {}

    toast.success(`Vale de ${formatMoney(amountCents)} registrado para ${valeCourier.name}!`);
    setIsValeModalOpen(false);
  };

  const handleCopySettlement = (courier: any, gross: number, vale: number, net: number, count: number) => {
    const text = `*Espelho de Entregas - Waesy*\n` +
      `Entregador: ${courier.name}\n` +
      `Placa / Veículo: ${courier.vehicle_plate || "N/A"}\n` +
      `Total de Pedidos / Despachos: ${count}\n` +
      `Total Bruto: ${formatMoney(gross)}\n` +
      `Vales / Adiantamentos: -${formatMoney(vale)}\n` +
      `*Líquido a Pagar:* ${formatMoney(net)}\n` +
      `Data: ${new Date().toLocaleDateString("pt-BR")}`;
    navigator.clipboard.writeText(text);
    toast.success(`Espelho copiado para a área de transferência!`);
  };

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
      <div className="flex flex-col h-full space-y-6 w-full px-0 sm:px-4 md:px-0">
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

        {/* ── ABA: ROTAS CONSOLIDADAS DE ENTREGA (PADRÃO PÁGINA 3) ── */}
        {activeTab === "routes" && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-card border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <RouteIcon className="size-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Rotas Consolidadas & Telemetria</h3>
                  <Badge variant="outline" className="text-2xs font-bold bg-primary/10 text-primary border-none">
                    Tempo Real
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Despachos ativos agrupados por entregador com itinerário, PIN de conferência e status.
                </p>
              </div>
              <Button asChild size="sm" className="h-11 min-h-11 px-4 rounded-lg font-bold text-xs gap-2 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">
                <Link to="/workspace/pedidos/frota">
                  <Sliders className="size-4" />
                  <span>Novo Despacho</span>
                </Link>
              </Button>
            </div>

            {groupedRoutes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card border-border/60">
                <Truck className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-semibold text-foreground">Nenhuma rota de entrega ativa no momento.</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Assim que pedidos forem despachados para a frota, as rotas agrupadas aparecerão aqui automaticamente.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedRoutes.map((routeGroup, idx) => (
                  <div key={routeGroup.courierName + idx} className="rounded-lg bg-card border border-border/60 overflow-hidden shadow-xs">
                    <div className="p-4 bg-muted/30 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Bike className="size-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">{routeGroup.courierName}</span>
                            <Badge variant="secondary" className="text-2xs font-bold font-mono">
                              {routeGroup.dispatches.length} {routeGroup.dispatches.length === 1 ? "parada" : "paradas"}
                            </Badge>
                          </div>
                          {routeGroup.courierPhone && (
                            <a
                              href={`tel:${routeGroup.courierPhone}`}
                              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
                            >
                              <Phone className="size-3 text-primary" />
                              <span>{routeGroup.courierPhone}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <div className="text-right">
                          <span className="text-3xs uppercase font-bold text-muted-foreground block">Total de Fretes</span>
                          <span className="font-mono font-black text-sm text-foreground">
                            {formatMoney(routeGroup.totalFeeCents)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-border/40">
                      {routeGroup.dispatches.map((disp: any, stopIdx: number) => {
                        const isDelivered = disp.status === "delivered";
                        return (
                          <div key={disp.id || stopIdx} className="p-4 space-y-2 hover:bg-muted/10 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="size-6 rounded-md bg-muted text-foreground font-mono font-bold text-2xs flex items-center justify-center shrink-0">
                                  #{stopIdx + 1}
                                </span>
                                <span className="font-bold text-xs text-foreground font-mono">
                                  #{disp.order_number}
                                </span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="font-semibold text-xs text-foreground">
                                  {disp.recipient_name}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={isDelivered ? "default" : "secondary"}
                                  className="text-2xs font-semibold gap-1"
                                >
                                  {isDelivered ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                                  {isDelivered ? "Entregue" : "Em Rota"}
                                </Badge>
                                <span className="font-mono text-2xs font-bold px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border/40">
                                  PIN: {disp.pin_code}
                                </span>
                                <span className="font-mono font-bold text-xs text-foreground">
                                  {disp.delivery_fee_cents > 0 ? formatMoney(disp.delivery_fee_cents) : "---"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground pl-8">
                              <div className="flex items-center gap-2 min-w-0">
                                <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                                <span className="truncate">{disp.delivery_address}</span>
                              </div>
                              {disp.delivery_token && (
                                <a
                                  href={`/entrega/${disp.delivery_token}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline font-semibold flex items-center gap-1 shrink-0 text-2xs focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <span>Rastrear</span>
                                  <ExternalLink className="size-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA: ESPELHO FINANCEIRO & FECHAMENTO DE VALES ── */}
        {activeTab === "settlement" && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-card border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Receipt className="size-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Espelho Financeiro & Fechamento de Vales</h3>
                  <Badge variant="outline" className="text-2xs font-bold bg-primary/10 text-primary border-none">
                    Acerto de Contas
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Consolidação de fretes brutos, dedução de adiantamentos/combustível e apuração do valor líquido a pagar via Pix.
                </p>
              </div>
              <Button asChild size="sm" className="h-11 min-h-11 px-4 rounded-lg font-bold text-xs gap-2 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">
                <Link to="/workspace/pedidos/frota">
                  <Sliders className="size-4" />
                  <span>Painel de Despacho</span>
                </Link>
              </Button>
            </div>

            {courierList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card border-border/60">
                <Wallet className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-semibold text-foreground">Nenhum entregador cadastrado para apuração.</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Cadastre entregadores próprios para acompanhar o fechamento de diárias e vales.
                </p>
              </div>
            ) : (
              <div className="rounded-lg overflow-hidden bg-card border border-border/60 shadow-xs">
                <div className="divide-y divide-border/60">
                  {courierList.map((courier: any) => {
                    const courierDispatches = (dispatches || []).filter(
                      (d: any) => (d.courier_name || "").toLowerCase() === courier.name.toLowerCase()
                    );
                    const grossEarningsCents = courierDispatches.reduce(
                      (acc: number, d: any) => acc + (d.delivery_fee_cents || courier.default_fee_cents || 0),
                      0
                    );
                    const courierVale = vales[courier.id];
                    const valeCents = courierVale?.amountCents || 0;
                    const netPayCents = Math.max(0, grossEarningsCents - valeCents);

                    return (
                      <div key={courier.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Bike className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-foreground">{courier.name}</span>
                                {courier.vehicle_plate && (
                                  <span className="font-mono text-2xs font-bold uppercase px-2 py-1 rounded-md bg-muted/80">
                                    {courier.vehicle_plate}
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {courierDispatches.length} {courierDispatches.length === 1 ? "corrida registrada" : "corridas registradas"}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-right">
                            <div className="p-2 rounded-lg bg-muted/30">
                              <span className="text-3xs uppercase font-bold text-muted-foreground block">Bruto</span>
                              <span className="font-mono font-bold text-xs text-foreground">
                                {formatMoney(grossEarningsCents)}
                              </span>
                            </div>

                            <div className="p-2 rounded-lg bg-muted/30">
                              <span className="text-3xs uppercase font-bold text-destructive block">Vales</span>
                              <span className="font-mono font-bold text-xs text-destructive">
                                -{formatMoney(valeCents)}
                              </span>
                            </div>

                            <div className="p-2 rounded-lg bg-primary/10">
                              <span className="text-3xs uppercase font-bold text-primary block">Líquido</span>
                              <span className="font-mono font-black text-xs text-primary">
                                {formatMoney(netPayCents)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {courierVale?.description && (
                          <div className="text-2xs text-muted-foreground bg-muted/20 px-3 py-2 rounded-md flex items-center justify-between">
                            <span>Motivo do Vale: {courierVale.description}</span>
                            <span className="font-mono font-bold text-destructive">-{formatMoney(valeCents)}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenValeModal(courier)}
                            className="min-h-11 h-11 px-3 text-xs font-semibold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Wallet className="size-3.5 text-muted-foreground" />
                            <span>{valeCents > 0 ? "Editar Vale" : "Lançar Vale"}</span>
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleCopySettlement(courier, grossEarningsCents, valeCents, netPayCents, courierDispatches.length)}
                            className="min-h-11 h-11 px-3 text-xs font-bold gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Copy className="size-3.5 text-muted-foreground" />
                            <span>Copiar Espelho Pix</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LISTAGEM DE ENTREGADORES (TODOS / DISPONÍVEIS / EM ROTA) ── */}
        {activeTab !== "routes" && activeTab !== "settlement" && (
          <>
            {isLoading && (
              <div className="flex justify-center py-16">
                <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-muted-foreground" />
              </div>
            )}

            {!isLoading && filteredCouriers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card">
                <Bike className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-semibold text-foreground">Nenhum entregador encontrado.</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Cadastre entregadores próprios ou chame motoboys avulsos sob demanda.
                </p>
                <Button asChild size="sm" className="mt-4 rounded-lg font-bold h-11 px-5">
                  <Link to="/workspace/pedidos/entregadores/novo">
                    <Plus className="size-4 mr-2" />
                    Cadastrar Entregador
                  </Link>
                </Button>
              </div>
            )}

            {!isLoading && filteredCouriers.length > 0 && (
              <div className="rounded-lg overflow-hidden bg-card border border-border/60 shadow-xs">
                <div className="p-4 bg-muted/20 flex items-center justify-between border-b border-border/40">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Entregadores Ativos ({filteredCouriers.length})
                  </span>
                  <Button asChild variant="ghost" size="sm" className="h-8 text-xs font-semibold min-h-11 sm:min-h-0">
                    <Link to="/workspace/pedidos/frota">
                      <Sliders className="size-3.5 mr-2" />
                      Painel de Despacho
                    </Link>
                  </Button>
                </div>

                {isMobile ? (
                  /* ── Visualização Móvel: Cards Verticais Ergonômicos (Apple HIG / Paradigma Clean) ── */
                  <div className="divide-y divide-border/60">
                  {filteredCouriers.map((courier: any) => {
                    const VehicleIcon = VEHICLE_ICONS[courier.vehicle_type] ?? Bike;
                    const isSuspended = courier.status === "suspended";

                    return (
                      <div
                        key={courier.id}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedCourier(courier); } }}
                        className="p-4 space-y-3 bg-card hover:bg-muted/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        onClick={() => setSelectedCourier(courier)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="font-bold text-base text-foreground">{courier.name}</p>
                            {courier.phone && (
                              <a
                                href={`tel:${courier.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <Phone className="size-3 text-primary" />
                                {courier.phone}
                              </a>
                            )}
                          </div>
                          <div /* design-lint-ignore DL-15 reason:"Conteiner nao interativo; onClick apenas isola propagacao de evento" expiry:"2027-12-31" */ className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <StatusBadge status={courier.status} />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-11 sm:size-9 rounded-lg hover:bg-muted/60 cursor-pointer min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
                                >
                                  <MoreVertical className="size-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 rounded-lg p-1">
                                <DropdownMenuItem asChild>
                                  <Link
                                    to="/workspace/pedidos/entregadores/$id"
                                    params={{ id: courier.id }}
                                  >
                                    Ver Perfil Completo
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem /* design-lint-ignore DL-15 reason:"Primitivo Radix com foco por teclado nativo e indicador visual focus:bg-accent no componente base" expiry:"2027-12-31" */
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
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                              <VehicleIcon className="size-4 text-muted-foreground" />
                            </div>
                            {courier.vehicle_plate && (
                              <span className="font-mono bg-muted/80 px-2 py-1 rounded-md uppercase font-bold text-foreground">
                                {courier.vehicle_plate}
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground uppercase font-semibold block">
                              Taxa Padrão
                            </span>
                            <span className="font-mono font-black text-sm text-foreground">
                              {courier.default_fee_cents > 0
                                ? formatMoney(courier.default_fee_cents)
                                : "---"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                ) : (
                  /* ── Visualização Desktop: Tabela Analítica ── */
                  <div>
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
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedCourier(courier); } }}
                            className="hover:bg-muted/20 transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            onClick={() => setSelectedCourier(courier)}
                          >
                            <td className="px-4 py-4">
                              <p className="font-bold text-foreground">{courier.name}</p>
                              {courier.phone && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Phone className="size-3" />
                                  {courier.phone}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <div className="size-7 rounded-lg bg-muted flex items-center justify-center">
                                  <VehicleIcon className="size-3.5 text-muted-foreground" />
                                </div>
                                {courier.vehicle_plate && (
                                  <span className="text-xs font-mono bg-muted/80 px-2 py-1 rounded-md uppercase font-bold">
                                    {courier.vehicle_plate}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <StatusBadge status={courier.status} />
                            </td>
                            <td className="px-4 py-4 text-right font-mono font-bold">
                              {courier.default_fee_cents > 0
                                ? formatMoney(courier.default_fee_cents)
                                : "---"}
                            </td>
                            <td /* design-lint-ignore DL-15 reason:"Conteiner nao interativo; onClick apenas isola propagacao de evento" expiry:"2027-12-31" */ className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-9 rounded-lg hover:bg-muted/60 min-h-11 sm:min-h-0 min-w-11 sm:min-w-0"
                                  >
                                    <MoreVertical className="size-4 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-lg p-1">
                                  <DropdownMenuItem asChild>
                                    <Link
                                      to="/workspace/pedidos/entregadores/$id"
                                      params={{ id: courier.id }}
                                    >
                                      Ver Perfil Completo
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem /* design-lint-ignore DL-15 reason:"Primitivo Radix com foco por teclado nativo e indicador visual focus:bg-accent no componente base" expiry:"2027-12-31" */
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
              </div>
            )}
          </>
        )}

        {/* ── DASHBOARD SHEET EXECUTIVO DE FROTA ── */}
        <WorkspaceDashboardSheet
          open={dashboardOpen}
          onOpenChange={setDashboardOpen}
          title="Telemetria da Frota"
          description="Controle em tempo real de disponibilidade, taxas e entregas ativas."
          metrics={dashboardMetrics}
        />

        {/* ── SHEET LATERAL DE DETALHES RÁPIDOS (EDIÇÃO EM PROFUNDIDADE 3) ── */}
        <Sheet open={!!selectedCourier} onOpenChange={(open) => !open && setSelectedCourier(null)}>
          <SheetContent size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl p-6 space-y-6 overflow-y-auto overscroll-contain">
            {selectedCourier && (
              <>
                <SheetHeader className="space-y-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Bike className="size-4" />
                    </span>
                    <SheetTitle className="text-base font-bold">{selectedCourier.name}</SheetTitle>
                  </div>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Dados operacionais e status de despacho do entregador.
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 pt-2">
                  <div className="p-4 rounded-lg bg-muted/40 border border-border/40 space-y-3">
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
                      className="w-full h-11 rounded-lg font-bold min-h-11"
                    >
                      <Link
                        to="/workspace/pedidos/entregadores/$id"
                        params={{ id: selectedCourier.id }}
                      >
                        Abrir Perfil e Extrato Completo
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
                      className="w-full h-11 rounded-lg text-xs font-bold min-h-11"
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

        {/* ── MODAL DE LANÇAMENTO DE VALE / ADIANTAMENTO ── */}
        <Dialog open={isValeModalOpen} onOpenChange={setIsValeModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="size-5 text-primary" />
                <span>Lançar Vale / Adiantamento</span>
              </DialogTitle>
              <DialogDescription>
                Informe o valor a ser abatido no próximo fechamento para {valeCourier?.name}.
              </DialogDescription>
            </DialogHeader>

            <form id="vale-form" onSubmit={handleSaveVale} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Valor do Vale (R$) *</Label>
                <Input
                  value={valeAmount}
                  onChange={(e) => setValeAmount(e.target.value)}
                  placeholder="0,00"
                  className="min-h-11 h-11 text-xs font-mono font-bold focus-visible:ring-2 focus-visible:ring-ring"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Motivo / Descrição</Label>
                <Input
                  value={valeDescription}
                  onChange={(e) => setValeDescription(e.target.value)}
                  placeholder="Ex: Adiantamento combustível, refeição, socorro mecânico"
                  className="min-h-11 h-11 text-xs focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </form>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsValeModalOpen(false)}
                className="min-h-11 h-11 px-4 text-xs font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="vale-form"
                className="min-h-11 h-11 px-5 text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                Salvar Vale
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </NicheOperationalGuard>
  );
}
