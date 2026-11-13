import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Wrench,
  Plus,
  CarFront,
  Search,
  Clock,
  CheckCircle2,
  ClipboardList,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/state/states";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listServiceOrders,
  createServiceOrder,
  updateServiceOrder,
  updateServiceOrderStatus,
} from "@/services/service-orders.functions";
import { getStoreSettings } from "@/services/store.functions";
import { getUnifiedNicheSpec } from "@/lib/niches/niche-ssot";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/ordens-servico/")({
  component: WorkspaceServiceOrdersPage,
});

type ServiceOrderStatus =
  | "draft"
  | "waiting_approval"
  | "in_repair"
  | "ready_for_pickup"
  | "delivered"
  | "completed"
  | "cancelled";

const STATUS_META: Record<
  ServiceOrderStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Aberta", variant: "secondary" },
  waiting_approval: { label: "Aguardando Aprovação", variant: "outline" },
  in_repair: { label: "Em Execução", variant: "default" },
  ready_for_pickup: { label: "Pronta para Retirada", variant: "default" },
  delivered: { label: "Entregue", variant: "secondary" },
  completed: { label: "Concluída", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

function formatCurrencyCents(cents: number): string {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function WorkspaceServiceOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [activeStore, setActiveStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  // Campos de criação / edição
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [equipmentName, setEquipmentName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [reportedDefect, setReportedDefect] = useState("");
  const [technicalDiagnosis, setTechnicalDiagnosis] = useState("");
  const [laborCostReais, setLaborCostReais] = useState("0");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleBrandModel, setVehicleBrandModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [odometerKm, setOdometerKm] = useState("");
  const [chassisVin, setChassisVin] = useState("");

  const nicheSpec = useMemo(() => getUnifiedNicheSpec(activeStore), [activeStore]);
  const isAutomotive = nicheSpec.id === "automotive" || nicheSpec.capabilities.hasVehicleFields;

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const current = await getStoreSettings();
      setActiveStore(current);
      if (!current?.id) {
        setOrders([]);
        return;
      }
      const ordersData = await listServiceOrders({
        data: { store_id: current.id, status: statusFilter },
      });
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Erro ao carregar ordens de serviço.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [statusFilter]);

  const resetForm = () => {
    setEditingOrder(null);
    setCustomerName("");
    setCustomerPhone("");
    setEquipmentName("");
    setSerialNumber("");
    setReportedDefect("");
    setTechnicalDiagnosis("");
    setLaborCostReais("0");
    setVehiclePlate("");
    setVehicleBrandModel("");
    setVehicleYear("");
    setOdometerKm("");
    setChassisVin("");
  };

  const openNewModal = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditModal = (order: any) => {
    setEditingOrder(order);
    setCustomerName(order.client_name || order.customer_name || "");
    setCustomerPhone(order.client_phone || order.customer_phone || "");
    setEquipmentName(order.equipment_name || "");
    setSerialNumber(order.serial_number || "");
    setReportedDefect(order.reported_issue || order.reported_defect || "");
    setTechnicalDiagnosis(order.technical_diagnosis || "");
    setLaborCostReais(String(Number(order.labor_cost_cents || 0) / 100));
    setVehiclePlate(order.vehicle_plate || "");
    setVehicleBrandModel(order.vehicle_brand_model || "");
    setVehicleYear(order.vehicle_year ? String(order.vehicle_year) : "");
    setOdometerKm(order.odometer_km ? String(order.odometer_km) : "");
    setChassisVin(order.chassis_vin || "");
    setIsCreateOpen(true);
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customerName.trim().length < 3 || reportedDefect.trim().length < 5) {
      toast.error("Informe o nome do cliente (mín. 3 caracteres) e o relato (mín. 5 caracteres).");
      return;
    }

    if (!editingOrder && (!activeStore?.id || customerPhone.trim().length < 8)) {
      toast.error("Informe um WhatsApp/telefone válido para abrir a Ordem de Serviço.");
      return;
    }

    const parsedLabor = Math.max(0, Math.round(Number(laborCostReais.replace(",", ".")) * 100) || 0);
    setSubmitting(true);
    try {
      if (editingOrder) {
        await updateServiceOrder({
          data: {
            order_id: editingOrder.id,
            equipment_name: equipmentName.trim() || (vehicleBrandModel.trim() || undefined),
            reported_issue: reportedDefect.trim(),
            technical_diagnosis: technicalDiagnosis.trim() || null,
            labor_cost_cents: parsedLabor,
            vehicle_plate: vehiclePlate.trim().toUpperCase() || null,
            vehicle_brand_model: vehicleBrandModel.trim() || null,
            vehicle_year: vehicleYear ? Number(vehicleYear) : null,
            odometer_km: odometerKm ? Number(odometerKm) : null,
            chassis_vin: chassisVin.trim().toUpperCase() || null,
          },
        });
        toast.success("Ordem de serviço atualizada.");
      } else {
        await createServiceOrder({
          data: {
            store_id: activeStore.id,
            client_name: customerName.trim(),
            client_phone: customerPhone.trim(),
            equipment_name:
              equipmentName.trim() ||
              vehicleBrandModel.trim() ||
              (isAutomotive ? "Veículo em manutenção" : "Atendimento técnico"),
            serial_number: serialNumber.trim() || undefined,
            reported_issue: reportedDefect.trim(),
            labor_cost_cents: parsedLabor,
            niche_id: nicheSpec.id,
            vehicle_plate: vehiclePlate.trim().toUpperCase() || undefined,
            vehicle_brand_model: vehicleBrandModel.trim() || undefined,
            vehicle_year: vehicleYear ? Number(vehicleYear) : undefined,
            odometer_km: odometerKm ? Number(odometerKm) : undefined,
            chassis_vin: chassisVin.trim().toUpperCase() || undefined,
          },
        });
        toast.success("Ordem de serviço criada.");
      }
      setIsCreateOpen(false);
      resetForm();
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar ordem de serviço.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (orderId: string, nextStatus: ServiceOrderStatus) => {
    setBusyOrderId(orderId);
    try {
      await updateServiceOrderStatus({
        data: { order_id: orderId, status: nextStatus },
      });
      toast.success("Status da OS atualizado.");
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar status da OS.");
    } finally {
      setBusyOrderId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!searchTerm.trim()) return orders;
    const q = searchTerm.toLowerCase();
    return orders.filter(
      (o) =>
        (o.order_number || "").toLowerCase().includes(q) ||
        (o.client_name || o.customer_name || "").toLowerCase().includes(q) ||
        (o.equipment_name || "").toLowerCase().includes(q) ||
        (o.vehicle_plate || "").toLowerCase().includes(q) ||
        (o.vehicle_brand_model || "").toLowerCase().includes(q),
    );
  }, [orders, searchTerm]);

  const metrics = useMemo(() => {
    const active = orders.filter((o) => ["draft", "waiting_approval", "in_repair"].includes(o.status)).length;
    const ready = orders.filter((o) => o.status === "ready_for_pickup").length;
    const completed = orders.filter((o) => o.status === "completed" || o.status === "delivered").length;
    return { active, ready, completed };
  }, [orders]);

  if (loadError) {
    return (
      <div className="space-y-6 pb-20">
        <ErrorState
          title="Erro ao carregar Ordens de Serviço"
          description={loadError}
          onRetry={() => void loadData()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isAutomotive ? (
              <CarFront className="size-5 text-primary" />
            ) : (
              <Wrench className="size-5 text-primary" />
            )}
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Ordens de Serviço
            </h1>
            <Badge variant="secondary" className="text-3xs uppercase font-mono">
              {nicheSpec.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Controle de bancada, diagnóstico técnico, execução e entrega de OS.
          </p>
        </div>

        <Button
          type="button"
          onClick={openNewModal}
          className="h-11 min-h-11 px-4 gap-2 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" />
          <span>Nova Ordem de Serviço</span>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Em Bancada / Abertas</span>
            <Clock className="size-4 text-primary" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">{metrics.active}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Prontas para Retirada</span>
            <ClipboardList className="size-4 text-warning-strong" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">{metrics.ready}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Concluídas & Entregues</span>
            <CheckCircle2 className="size-4 text-success" />
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">{metrics.completed}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              isAutomotive
                ? "Buscar por número, cliente, placa ou veículo..."
                : "Buscar por número, cliente ou item..."
            }
            className="h-11 min-h-11 pl-9 text-sm"
            aria-label="Buscar ordens de serviço"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-56 h-11 min-h-11 text-sm">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="draft">Aberta</SelectItem>
            <SelectItem value="waiting_approval">Aguardando Aprovação</SelectItem>
            <SelectItem value="in_repair">Em Execução</SelectItem>
            <SelectItem value="ready_for_pickup">Pronta para Retirada</SelectItem>
            <SelectItem value="completed">Concluída</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista / Estados */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={isAutomotive ? CarFront : Wrench}
          title="Nenhuma ordem de serviço"
          description={
            isAutomotive
              ? "Abra a primeira OS informando placa, veículo e checklist técnico."
              : "Crie uma nova ordem de serviço para acompanhar diagnósticos e prazos."
          }
          action={
            <Button
              type="button"
              onClick={openNewModal}
              className="h-11 min-h-11 px-4 gap-2 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-4" />
              <span>Abrir Ordem de Serviço</span>
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border border-border bg-card divide-y divide-border/60">
          {filteredOrders.map((os) => {
            const meta = STATUS_META[(os.status as ServiceOrderStatus) || "draft"] || STATUS_META.draft;
            const isBusy = busyOrderId === os.id;
            return (
              <div
                key={os.id}
                className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {os.order_number || "OS"}
                    </span>
                    <Badge variant={meta.variant} className="text-3xs font-mono">
                      {meta.label}
                    </Badge>
                    {os.vehicle_plate && (
                      <Badge variant="outline" className="text-3xs font-mono">
                        {os.vehicle_plate}
                      </Badge>
                    )}
                    {os.odometer_km !== null && os.odometer_km !== undefined && (
                      <span className="text-2xs font-mono text-muted-foreground">
                        {Number(os.odometer_km).toLocaleString("pt-BR")} km
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-foreground truncate">
                    {os.equipment_name || os.vehicle_brand_model || "Atendimento Técnico"} —{" "}
                    <span className="font-normal text-muted-foreground">{os.client_name || os.customer_name}</span>
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {os.reported_issue || os.reported_defect}
                  </p>
                  {os.technical_diagnosis && (
                    <p className="text-2xs text-foreground/80">
                      Diagnóstico: {os.technical_diagnosis}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                    <p className="text-sm font-bold font-mono text-foreground">
                      {formatCurrencyCents(os.total_cost_cents ?? os.labor_cost_cents ?? 0)}
                    </p>
                  </div>

                  <Select
                    value={os.status || "draft"}
                    onValueChange={(val) =>
                      void handleStatusChange(os.id, val as ServiceOrderStatus)
                    }
                    disabled={isBusy}
                  >
                    <SelectTrigger
                      className="w-full sm:w-44 h-11 min-h-11 text-xs"
                      aria-label={`Alterar status da ${os.order_number || "OS"}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Aberta</SelectItem>
                      <SelectItem value="waiting_approval">Aguardando Aprovação</SelectItem>
                      <SelectItem value="in_repair">Em Execução</SelectItem>
                      <SelectItem value="ready_for_pickup">Pronta p/ Retirada</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="delivered">Entregue</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openEditModal(os)}
                    disabled={isBusy}
                    className={cn(
                      "h-11 min-h-11 px-4 text-xs font-medium focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    {isBusy ? (
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                    ) : (
                      "Editar OS"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar OS */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-screen overflow-y-auto pt-safe-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              {isAutomotive ? (
                <CarFront className="size-4 text-primary" />
              ) : (
                <Wrench className="size-4 text-primary" />
              )}
              <span>{editingOrder ? `Editar ${editingOrder.order_number}` : "Nova Ordem de Serviço"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Registre identificação, relato do cliente, diagnóstico técnico e valor de mão de obra.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveOrder} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="os-customer-name" className="text-xs font-semibold">
                  Cliente / Titular *
                </Label>
                <Input
                  id="os-customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={Boolean(editingOrder)}
                  placeholder="Nome completo"
                  className="h-11 min-h-11 text-sm"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="os-customer-phone" className="text-xs font-semibold">
                  WhatsApp / Telefone {!editingOrder ? "*" : ""}
                </Label>
                <Input
                  id="os-customer-phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  disabled={Boolean(editingOrder)}
                  placeholder="(49) 99999-9999"
                  className="h-11 min-h-11 text-sm"
                  required={!editingOrder}
                />
              </div>
            </div>

            {isAutomotive ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="os-vehicle-plate" className="text-xs font-semibold">
                    Placa do Veículo
                  </Label>
                  <Input
                    id="os-vehicle-plate"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    placeholder="ABC1D23"
                    className="h-11 min-h-11 text-sm font-mono uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="os-vehicle-model" className="text-xs font-semibold">
                    Marca / Modelo
                  </Label>
                  <Input
                    id="os-vehicle-model"
                    value={vehicleBrandModel}
                    onChange={(e) => setVehicleBrandModel(e.target.value)}
                    placeholder="Ex: Honda Civic Touring"
                    className="h-11 min-h-11 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="os-odometer" className="text-xs font-semibold">
                    Quilometragem (KM)
                  </Label>
                  <Input
                    id="os-odometer"
                    type="number"
                    min={0}
                    value={odometerKm}
                    onChange={(e) => setOdometerKm(e.target.value)}
                    placeholder="45000"
                    className="h-11 min-h-11 text-sm font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="os-vehicle-year" className="text-xs font-semibold">
                    Ano
                  </Label>
                  <Input
                    id="os-vehicle-year"
                    type="number"
                    min={1950}
                    max={2100}
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    placeholder="2024"
                    className="h-11 min-h-11 text-sm font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="os-equipment" className="text-xs font-semibold">
                    Equipamento / Objeto
                  </Label>
                  <Input
                    id="os-equipment"
                    value={equipmentName}
                    onChange={(e) => setEquipmentName(e.target.value)}
                    placeholder="Ex: MacBook Pro / Contrato / Aparelho"
                    className="h-11 min-h-11 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="os-serial" className="text-xs font-semibold">
                    Número de Série / Protocolo
                  </Label>
                  <Input
                    id="os-serial"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Série ou identificador"
                    className="h-11 min-h-11 text-sm font-mono"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="os-defect" className="text-xs font-semibold">
                Relato / Solicitação do Cliente *
              </Label>
              <Textarea
                id="os-defect"
                value={reportedDefect}
                onChange={(e) => setReportedDefect(e.target.value)}
                rows={3}
                placeholder="Descreva os sintomas, solicitação ou itens para revisão..."
                required
              />
            </div>

            {editingOrder && (
              <div className="space-y-2">
                <Label htmlFor="os-diagnosis" className="text-xs font-semibold">
                  Diagnóstico Técnico / Laudo
                </Label>
                <Textarea
                  id="os-diagnosis"
                  value={technicalDiagnosis}
                  onChange={(e) => setTechnicalDiagnosis(e.target.value)}
                  rows={2}
                  placeholder="Parecer técnico da equipe..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="os-labor" className="text-xs font-semibold">
                Valor de Mão de Obra / Serviço (R$)
              </Label>
              <Input
                id="os-labor"
                value={laborCostReais}
                onChange={(e) => setLaborCostReais(e.target.value)}
                placeholder="0,00"
                className="h-11 min-h-11 text-sm font-mono"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="h-11 min-h-11 px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 min-h-11 px-4 gap-2 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {submitting && (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                )}
                <span>{editingOrder ? "Salvar Alterações" : "Abrir OS"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
