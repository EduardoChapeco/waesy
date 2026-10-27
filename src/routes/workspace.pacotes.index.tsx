import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sliders,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Layers,
  Clock,
  Ticket,
  DollarSign,
  Repeat,
  CheckCircle2,
  Users,
  History,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";

import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyField } from "@/components/ui/currency-field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listWorkspacePackages,
  saveServicePackage,
  deleteServicePackage,
  listWorkspaceCustomerPasses,
  listWorkspacePassLedger,
  adjustCustomerPassCredits,
} from "@/services/service-packages.functions";
import { listBookingServices } from "@/services/booking.functions";
import { formatMoney } from "@/lib/money";
import { EmptyState } from "@/components/state/states";

export const Route = createFileRoute("/workspace/pacotes/")({
  head: () => ({ meta: [{ title: "Pacotes de Aulas e Serviços | Workspace" }] }),
  component: WorkspacePackagesPage,
});

function WorkspacePackagesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"pacotes" | "passes" | "ledger">("pacotes");
  const [isOpen, setIsOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<any | null>(null);

  // Modal de Ajuste de Crédito
  const [adjustModalPass, setAdjustModalPass] = useState<any | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(1);
  const [adjustReason, setAdjustReason] = useState<string>("");

  const { data: packages = [], isLoading: isLoadingPackages } = useQuery({
    queryKey: ["workspace-packages"],
    queryFn: () => listWorkspacePackages(),
  });

  const { data: customerPasses = [], isLoading: isLoadingCustomerPasses } = useQuery({
    queryKey: ["workspace-customer-passes"],
    queryFn: () => listWorkspaceCustomerPasses(),
    enabled: activeTab === "passes",
  });

  const { data: ledgerRecords = [], isLoading: isLoadingLedger } = useQuery({
    queryKey: ["workspace-pass-ledger"],
    queryFn: () => listWorkspacePassLedger(),
    enabled: activeTab === "ledger",
  });

  const { data: servicesRes } = useQuery({
    queryKey: ["booking-services-list"],
    queryFn: () => listBookingServices(),
  });

  const services = servicesRes?.data || [];

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await saveServicePackage({ data: payload });
    },
    onSuccess: () => {
      toast.success("Pacote de aulas salvo com sucesso!");
      setIsOpen(false);
      setEditingPkg(null);
      queryClient.invalidateQueries({ queryKey: ["workspace-packages"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar pacote.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteServicePackage({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Pacote removido.");
      queryClient.invalidateQueries({ queryKey: ["workspace-packages"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao remover pacote.");
    },
  });

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!adjustModalPass) throw new Error("Selecione um passe.");
      return await adjustCustomerPassCredits({
        data: {
          pass_id: adjustModalPass.id,
          credits_delta: adjustDelta,
          reason: adjustReason,
        },
      });
    },
    onSuccess: () => {
      toast.success("Saldo de créditos ajustado e registrado em auditoria.");
      setAdjustModalPass(null);
      setAdjustReason("");
      queryClient.invalidateQueries({ queryKey: ["workspace-customer-passes"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-pass-ledger"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao ajustar créditos.");
    },
  });

  const handleOpenNew = () => {
    setEditingPkg({
      title: "",
      description: "",
      service_id: services[0]?.id || "",
      total_credits: 10,
      price_cents: 15000,
      validity_days: 30,
      is_recurring: false,
      recurrence_interval: "monthly",
      max_reschedules_per_credit: 2,
      is_active: true,
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (pkg: any) => {
    setEditingPkg({ ...pkg });
    setIsOpen(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <PageHeader
        title="Pacotes de Aulas e Serviços"
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleOpenNew}
              className="rounded-lg font-bold bg-foreground text-background hover:bg-foreground/90 h-11 min-h-11 px-4 text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus className="size-4 mr-2" />
              Novo Pacote
            </Button>
          </div>
        }
      />

      {/* ── Abas de Navegação em Linha Única (B.39) ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-border/40 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("pacotes")}
          className={`h-11 min-h-11 px-4 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary ${
            activeTab === "pacotes"
              ? "bg-foreground text-background"
              : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Ticket size={16} /> Pacotes Cadastrados ({packages.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("passes")}
          className={`h-11 min-h-11 px-4 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary ${
            activeTab === "passes"
              ? "bg-foreground text-background"
              : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Users size={16} /> Passes de Clientes
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ledger")}
          className={`h-11 min-h-11 px-4 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-primary ${
            activeTab === "ledger"
              ? "bg-foreground text-background"
              : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <History size={16} /> Extrato de Auditoria (Ledger)
        </button>
      </div>

      {/* ── ABA 1: Pacotes Cadastrados ── */}
      {activeTab === "pacotes" && (
        <>
          {packages.length === 0 ? (
            <EmptyState
              title="Nenhum pacote cadastrado"
              description="Crie passes de aulas, mensalidades ou combos de sessões com desconto."
              action={
                <Button
                  onClick={handleOpenNew}
                  className="rounded-lg font-bold text-xs h-11 min-h-11 px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Plus className="size-4 mr-2" /> Criar Primeiro Pacote
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg: any) => (
                <div
                  key={pkg.id}
                  className="p-5 rounded-xl bg-card border border-border/60 space-y-4 flex flex-col justify-between hover:border-foreground/20 transition-colors duration-200 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Ticket size={18} />
                        </span>
                        <Badge className="bg-muted text-muted-foreground font-mono text-xs px-2 py-1">
                          {pkg.total_credits} {pkg.total_credits === 1 ? "Sessão" : "Sessões"}
                        </Badge>
                      </div>
                      <Badge
                        className={`text-xs font-mono px-2 py-1 ${
                          pkg.is_active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {pkg.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground break-words text-wrap leading-tight">
                        {pkg.title}
                      </h3>
                      <span className="text-xs text-muted-foreground font-medium block mt-1">
                        Serviço: {pkg.booking_services?.title || "Geral"}
                      </span>
                    </div>

                    {pkg.description && (
                      <p className="text-xs text-muted-foreground break-words text-wrap leading-relaxed line-clamp-2">
                        {pkg.description}
                      </p>
                    )}

                    <div className="p-3 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-xs text-muted-foreground uppercase block font-semibold">
                          Preço do Pacote
                        </span>
                        <span className="text-sm font-black text-foreground">
                          {formatMoney(pkg.price_cents)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground uppercase block font-semibold">
                          Validade
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {pkg.validity_days} dias
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono">
                      {pkg.is_recurring ? "Assinatura Recorrente" : "Compra Avulsa"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(pkg)}
                        className="h-11 min-h-11 px-3 rounded-lg border-border text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Edit2 className="size-3.5 mr-2" /> Editar
                      </Button>
                      <CrudActionsMenu
                        entityName="Pacote"
                        onEdit={() => handleOpenEdit(pkg)}
                        onDelete={() => deleteMutation.mutate(pkg.id)}
                        deleteConfirmTitle={`Excluir pacote "${pkg.title}"?`}
                        deleteConfirmDescription="Esta ação removerá o pacote do catálogo e da vitrine pública."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── ABA 2: Passes dos Clientes (EARS-06) ── */}
      {activeTab === "passes" && (
        <div className="space-y-4">
          {customerPasses.length === 0 ? (
            <EmptyState
              title="Nenhum passe emitido ainda"
              description="Quando clientes adquirirem seus pacotes, os passes e créditos aparecerão aqui em tempo real."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-mono">
                  <tr>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Pacote Contratado</th>
                    <th className="p-3 text-center">Créditos</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3">Validade</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {customerPasses.map((pass: any) => {
                    const isExpired = new Date(pass.expires_at) < new Date();
                    return (
                      <tr key={pass.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <span className="font-bold text-foreground block">
                            {pass.profiles?.full_name || "Cliente Civil"}
                          </span>
                          <span className="text-2xs text-muted-foreground font-mono">
                            {pass.profiles?.phone || "Sem telefone"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-foreground block">
                            {pass.package_snapshot?.title || pass.service_packages?.title || "Pacote"}
                          </span>
                          <span className="text-2xs text-muted-foreground">
                            {pass.package_snapshot?.service_title || "Atendimento"}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="font-black text-sm text-foreground">
                            {pass.remaining_credits}
                          </span>
                          <span className="text-muted-foreground text-2xs"> / {pass.total_credits}</span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            className={`text-xs font-mono px-2 py-1 ${
                              pass.status === "active" && !isExpired
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isExpired ? "Expirado" : pass.remaining_credits === 0 ? "Esgotado" : "Ativo"}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          {format(new Date(pass.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAdjustModalPass(pass);
                              setAdjustDelta(1);
                              setAdjustReason("");
                            }}
                            className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-border cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            Ajustar Saldo
                          </Button>
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

      {/* ── ABA 3: Extrato de Auditoria (Ledger) (EARS-03) ── */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          {ledgerRecords.length === 0 ? (
            <EmptyState
              title="Nenhum lançamento no ledger ainda"
              description="Todas as concessões, agendamentos, check-ins, reembolsos e cancelamentos são registrados aqui de forma imutável."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase font-mono">
                  <tr>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">Cliente / Passe</th>
                    <th className="p-3">Tipo de Movimento</th>
                    <th className="p-3">Justificativa</th>
                    <th className="p-3 text-right">Delta</th>
                    <th className="p-3 text-right">Saldo Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {ledgerRecords.map((log: any) => {
                    const pass = log.customer_service_passes;
                    return (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-foreground block">
                            {pass?.profiles?.full_name || "Cliente"}
                          </span>
                          <span className="text-2xs text-muted-foreground font-mono">
                            {pass?.package_snapshot?.title || pass?.service_packages?.title || "Passe"}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">
                          <Badge variant="outline" className="font-mono text-2xs">
                            {log.movement_type}
                          </Badge>
                        </td>
                        <td className="p-3 break-words text-wrap max-w-xs text-foreground">
                          {log.reason || "Lançamento transacional"}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          <span
                            className={
                              log.credits_delta > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }
                          >
                            {log.credits_delta > 0 ? `+${log.credits_delta}` : log.credits_delta}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-black text-foreground">
                          {log.balance_after}
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

      {/* ── Sheet Lateral de Criação / Edição de Pacote ── */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          size="wide"
          className="w-full sm:max-w-2xl border-l p-0 overflow-y-auto no-scrollbar bg-card flex flex-col justify-between"
        >
          <div className="p-6 space-y-4">
            <SheetHeader className="pb-3 border-b border-border/60">
              <SheetTitle className="text-base font-bold text-foreground">
                {editingPkg?.id ? "Editar Pacote" : "Novo Pacote"}
              </SheetTitle>
            </SheetHeader>

            {editingPkg && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Serviço Vinculado *</Label>
                  <Select
                    value={editingPkg.service_id}
                    onValueChange={(val) => setEditingPkg({ ...editingPkg, service_id: val })}
                  >
                    <SelectTrigger className="rounded-lg h-11 min-h-11 text-xs">
                      <SelectValue placeholder="Selecione o serviço..." />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((s: any) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.title} ({s.duration_minutes} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Título do Pacote *</Label>
                  <Input
                    placeholder="ex: Combo 10 Aulas de Pilates, Plano Mensal 2x/Semana"
                    value={editingPkg.title || ""}
                    onChange={(e) => setEditingPkg({ ...editingPkg, title: e.target.value })}
                    className="rounded-lg h-11 min-h-11 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Descrição / Benefícios</Label>
                  <Input
                    placeholder="ex: Acesso flexível com agendamento livre"
                    value={editingPkg.description || ""}
                    onChange={(e) => setEditingPkg({ ...editingPkg, description: e.target.value })}
                    className="rounded-lg h-11 min-h-11 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Quantidade de Sessões / Aulas *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingPkg.total_credits || 1}
                      onChange={(e) =>
                        setEditingPkg({ ...editingPkg, total_credits: parseInt(e.target.value) || 1 })
                      }
                      className="rounded-lg h-11 min-h-11 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Preço Total do Pacote *</Label>
                    <CurrencyField
                      value={editingPkg.price_cents || 0}
                      onChange={(cents) => setEditingPkg({ ...editingPkg, price_cents: cents })}
                      className="rounded-lg h-11 min-h-11 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Validade (dias corridos) *</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editingPkg.validity_days || 30}
                      onChange={(e) =>
                        setEditingPkg({ ...editingPkg, validity_days: parseInt(e.target.value) || 30 })
                      }
                      className="rounded-lg h-11 min-h-11 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Remarcações por Aula</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editingPkg.max_reschedules_per_credit || 2}
                      onChange={(e) =>
                        setEditingPkg({
                          ...editingPkg,
                          max_reschedules_per_credit: parseInt(e.target.value) || 0,
                        })
                      }
                      className="rounded-lg h-11 min-h-11 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-border/40">
                  <div>
                    <span className="text-xs font-semibold block text-foreground">Pacote Ativo</span>
                    <span className="text-2xs text-muted-foreground block">
                      Visível para compra pelos clientes na vitrine pública
                    </span>
                  </div>
                  <Switch
                    checked={editingPkg.is_active}
                    onCheckedChange={(checked) => setEditingPkg({ ...editingPkg, is_active: checked })}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border/60 flex items-center justify-end gap-2 bg-muted/20">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="h-11 min-h-11 px-4 rounded-lg text-xs font-bold border-border cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              disabled={saveMutation.isPending || !editingPkg?.title || !editingPkg?.service_id}
              onClick={() => saveMutation.mutate(editingPkg)}
              className="h-11 min-h-11 px-6 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar Pacote"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Dialog de Ajuste Manual de Crédito (Auditoria Ledger) ── */}
      <Dialog open={!!adjustModalPass} onOpenChange={(open) => !open && setAdjustModalPass(null)}>
        <DialogContent className="sm:max-w-md sm:rounded-xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Ajustar Saldo de Créditos
            </DialogTitle>
          </DialogHeader>

          {adjustModalPass && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-1">
                <span className="text-muted-foreground block">Cliente:</span>
                <span className="font-bold text-foreground text-sm block">
                  {adjustModalPass.profiles?.full_name || "Cliente"}
                </span>
                <span className="text-2xs text-muted-foreground font-mono block">
                  Saldo atual: {adjustModalPass.remaining_credits} de {adjustModalPass.total_credits}
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Créditos a Adicionar ou Deduzir (+ / -) *</Label>
                <Input
                  type="number"
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(parseInt(e.target.value) || 0)}
                  className="h-11 min-h-11 rounded-lg text-xs font-mono font-bold"
                />
                <span className="text-2xs text-muted-foreground block">
                  Ex: +1 para cortesia/bonificação, -1 para dedução de sessão realizada fora da agenda.
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Justificativa Auditada *</Label>
                <Input
                  placeholder="ex: Cortesia por atraso de instrutor, reposição de aula"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="h-11 min-h-11 rounded-lg text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setAdjustModalPass(null)}
              className="h-11 min-h-11 rounded-lg text-xs font-bold border-border cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              disabled={adjustMutation.isPending || adjustDelta === 0 || adjustReason.trim().length < 3}
              onClick={() => adjustMutation.mutate()}
              className="h-11 min-h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
            >
              {adjustMutation.isPending ? "Ajustando..." : "Confirmar Ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
