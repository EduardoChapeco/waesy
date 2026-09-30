import { useState, useEffect } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Receipt, QrCode, Save, Check, FileText, CreditCard, ArrowRight, CheckCircle2, Clock, AlertCircle, Handshake, UploadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { NativeBackButton } from "@/components/ui/native-back-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EmptyState } from "@/components/state/states";
import { ImageUpload } from "@/components/ui/image-upload";
import { getCustomerInstallments } from "@/services/installments.functions";
import { getCustomerOrderPayments, getProfilePixSettings, saveProfilePixSettings } from "@/services/payment.functions";
import { listUserReceivables, registerInstallmentPayment } from "@/services/receivables.functions";
import { formatMoney } from "@/lib/money";
import { Surface } from "@/components/ui/surface";
import { formatDate } from "@/lib/datetime";

export const Route = createFileRoute("/_store/conta/pagamentos")({
  head: () => ({ meta: [{ title: "Pagamentos | Waesy" }] }),
  loader: async () => {
    try {
      const [plans, orders, receivables] = await Promise.all([
        getCustomerInstallments().catch(() => []),
        getCustomerOrderPayments().catch(() => []),
        listUserReceivables().catch(() => []),
      ]);
      return {
        plans: Array.isArray(plans) ? plans : [],
        orders: Array.isArray(orders) ? orders : [],
        receivables: Array.isArray(receivables) ? receivables : [],
      };
    } catch (err) {
      console.error("[loader:_store.conta.pagamentos] Unhandled error:", err);
      return { plans: [], orders: [], receivables: [] };
    }
  },
  component: CustomerInstallmentsPage,
});

function translatePaymentStatus(status: string) {
  switch (status) {
    case "awaiting_payment":
    case "pending":
      return { label: "Aguardando Pagamento", variant: "secondary" as const, icon: Clock };
    case "paid":
    case "approved":
    case "completed":
      return { label: "Aprovado", variant: "default" as const, icon: CheckCircle2 };
    case "cancelled":
    case "failed":
      return { label: "Falha / Cancelado", variant: "destructive" as const, icon: AlertCircle };
    default:
      return { label: status, variant: "outline" as const, icon: FileText };
  }
}

function translatePaymentMethod(method?: string) {
  switch (method) {
    case "pix":
      return "PIX";
    case "credit_card":
      return "Cartão de Crédito";
    case "boleto":
      return "Boleto Bancário";
    case "manual":
      return "Transferência / Manual";
    default:
      return "Online";
  }
}

function CustomerInstallmentsPage() {
  const { plans, orders, receivables } = ((Route.useLoaderData?.() as any) || {});
  const safePlans = Array.isArray(plans) ? plans : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeReceivables = Array.isArray(receivables) ? receivables : [];

  const router = useRouter();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [activeMainTab, setActiveMainTab] = useState<"history" | "pix_settings">("history");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("cpf_cnpj");
  const [pixReceiverName, setPixReceiverName] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");

  const { data: profilePix, isLoading: isPixLoading } = useQuery({
    queryKey: ["profile-pix-settings"],
    queryFn: () => getProfilePixSettings(),
  });

  useEffect(() => {
    if (profilePix) {
      if (profilePix.pix_key) setPixKey(profilePix.pix_key);
      if (profilePix.pix_key_type) setPixKeyType(profilePix.pix_key_type);
      if (profilePix.pix_receiver_name) setPixReceiverName(profilePix.pix_receiver_name);
      if (profilePix.payment_instructions) setPaymentInstructions(profilePix.payment_instructions);
    }
  }, [profilePix]);

  const savePixMutation = useMutation({
    mutationFn: () => saveProfilePixSettings({
      data: {
        pix_key: pixKey.trim(),
        pix_key_type: pixKeyType as any,
        pix_receiver_name: pixReceiverName.trim(),
        payment_instructions: paymentInstructions.trim(),
      },
    }),
    onSuccess: () => {
      toast.success("Dados de recebimento PIX salvos com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao salvar dados PIX.");
    },
  });


  const payInstallmentMutation = useMutation({
    mutationFn: registerInstallmentPayment,
    onSuccess: () => {
      toast.success("Pagamento da parcela registrado com sucesso!");
      setPaymentModalOpen(false);
      setSelectedInstallment(null);
      setPaymentProofUrl("");
      setNotes("");
      router.invalidate();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao registrar quitação da parcela.");
    },
  });

  const handleOpenPay = (inst: any) => {
    setSelectedInstallment(inst);
    setPaymentModalOpen(true);
  };

  const handleConfirmPay = () => {
    if (!selectedInstallment) return;
    payInstallmentMutation.mutate({
      data: {
        installmentId: selectedInstallment.id,
        paymentMethod: "PIX",
        paymentProofUrl: paymentProofUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      },
    });
  };

  const hasAnyData =
    safePlans.length > 0 || safeOrders.length > 0 || safeReceivables.length > 0;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground w-full max-w-5xl mx-auto space-y-6 pb-24 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
      {/* ── 1. Clean Minimalist Header (Apple HIG / Native Back) ── */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 pt-1 px-4 sm:px-0">
        <div className="flex items-center gap-3">
          <NativeBackButton fallbackHref="/conta" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Pagamentos
          </h1>
        </div>
      </div>

      
      {/* ── Tabs de Navegação Apple HIG ── */}
      <div className="flex items-center gap-2 px-4 sm:px-0">
        <button
          type="button"
          onClick={() => setActiveMainTab("history")}
          className={cn(
            "h-10 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
            activeMainTab === "history"
              ? "bg-foreground text-background shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          )}
        >
          <CreditCard className="size-4" />
          <span>Faturas & Histórico</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab("pix_settings")}
          className={cn(
            "h-10 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer",
            activeMainTab === "pix_settings"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          )}
        >
          <QrCode className="size-4" />
          <span>Meus Dados PIX (Recebimento)</span>
        </button>
      </div>

      {activeMainTab === "pix_settings" ? (
        <div className="px-4 sm:px-0 max-w-xl space-y-5 animate-in fade-in duration-200">
          <div className="p-5 rounded-3xl bg-card border border-border/60 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <QrCode className="size-5 text-emerald-600" />
                <span>Dados de Recebimento do Anunciante</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure sua Chave PIX e dados bancários padrão. Esses dados serão sugeridos automaticamente nos seus anúncios de classificados e negociações com clientes.
              </p>
            </div>

            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Tipo de Chave PIX</Label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  className="w-full h-11 rounded-xl border border-border/60 bg-background text-xs px-3 font-medium"
                >
                  <option value="cpf_cnpj">CPF / CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone Celular (com DDD)</option>
                  <option value="random">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Chave PIX *</Label>
                <Input
                  placeholder="Ex: 000.000.000-00, seuemail@dominio.com ou (49) 99999-9999"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="h-11 rounded-xl text-xs bg-background font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Nome do Titular / Favorecido *</Label>
                <Input
                  placeholder="Nome completo de quem vai receber o valor"
                  value={pixReceiverName}
                  onChange={(e) => setPixReceiverName(e.target.value)}
                  className="h-11 rounded-xl text-xs bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Instruções para o Comprador (Opcional)</Label>
                <Textarea
                  placeholder="Ex: Após a transferência, envie o comprovante diretamente pelo chat ou WhatsApp para liberação imediata."
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  rows={3}
                  className="text-xs bg-background resize-none rounded-xl"
                />
              </div>

              <Button
                type="button"
                onClick={() => savePixMutation.mutate()}
                disabled={savePixMutation.isPending || !pixKey.trim()}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 cursor-pointer transition-all active:scale-[0.99]"
              >
                {savePixMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    <span>Salvar Dados de Recebimento PIX</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : !hasAnyData ? (
        <div className="px-4 sm:px-0 py-8">
          <EmptyState title="Nenhum histórico de pagamento ou cobrança" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Seção 1: Pagamentos de Pedidos */}
          {safeOrders.length > 0 && (
            <section className="space-y-3">
              <div className="px-4 sm:px-0">
                <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 text-foreground">
                  <CreditCard className="size-4 text-primary" />
                  Pagamentos de Pedidos
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Histórico de transações dos seus pedidos recentes.
                </p>
              </div>

              {/* Mobile View: WhatsApp List Pattern */}
              <div className="block md:hidden bg-card border-y border-border/40 divide-y divide-border/30">
                {safeOrders.map((order: any) => {
                  const payment = order.payments?.[0] || {};
                  const statusInfo = translatePaymentStatus(payment.status || order.status);
                  return (
                    <div
                      key={order.id}
                      className="p-4 min-h-[56px] space-y-2 active:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          #{order.public_token}
                        </span>
                        <Badge variant={statusInfo.variant} className="text-[10px] px-2 py-0.5">
                          {statusInfo.label}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {formatDate(order.created_at)} • {translatePaymentMethod(order.payment_method || payment.method)}
                        </span>
                        <span className="font-bold text-foreground">
                          {formatMoney(order.total_cents)}
                        </span>
                      </div>

                      <div className="pt-1 flex justify-end">
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs font-semibold px-2 text-primary"
                        >
                          <Link to="/conta/pedidos" search={{ orderId: order.id } as any}>
                            Ver Detalhes
                            <ArrowRight className="size-3.5 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block rounded-2xl border border-border/60 overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Pedido</TableHead>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Método</TableHead>
                      <TableHead className="text-xs">Valor</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeOrders.map((order: any) => {
                      const payment = order.payments?.[0] || {};
                      const statusInfo = translatePaymentStatus(payment.status || order.status);
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono font-medium text-xs">#{order.public_token}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{formatDate(order.created_at)}</TableCell>
                          <TableCell className="text-xs">{translatePaymentMethod(order.payment_method || payment.method)}</TableCell>
                          <TableCell className="font-semibold text-xs">{formatMoney(order.total_cents)}</TableCell>
                          <TableCell>
                            <Badge variant={statusInfo.variant} className="text-[10px]">
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline" className="h-8 text-xs rounded-xl">
                              <Link to="/conta/pedidos" search={{ orderId: order.id } as any}>
                                Detalhes
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}

          {/* Seção 2: Contratos e Parcelas P2P (Recebíveis / Locações) */}
          {safeReceivables.length > 0 && (
            <section className="space-y-4">
              <div className="px-4 sm:px-0">
                <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 text-foreground">
                  <Handshake className="size-4 text-primary" />
                  Contratos e Parcelas de Negociações
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Parcelas decorrentes de contratos, acordos de aluguel ou compras diretas.
                </p>
              </div>

              <div className="space-y-4">
                {safeReceivables.map((rec: any) => (
                  <div key={rec.id} className="bg-card border-y border-border/40 sm:border sm:rounded-2xl overflow-hidden">
                    <div className="flex flex-row items-center justify-between p-4 bg-muted/20 border-b border-border/40">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          {rec.contract?.title || rec.title || "Contrato de Negociação"}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Total: <strong className="text-foreground">{formatMoney(rec.total_amount_cents)}</strong> • {rec.total_installments} parcelas
                        </p>
                      </div>
                      <Badge
                        variant={
                          rec.status === "settled"
                            ? "default"
                            : rec.status === "defaulted"
                            ? "destructive"
                            : "outline"
                        }
                        className="uppercase text-[10px]"
                      >
                        {rec.status === "settled" ? "Quitado" : rec.status === "active" ? "Em Aberto" : rec.status}
                      </Badge>
                    </div>

                    {/* Mobile View: Parcelas agrupadas */}
                    <div className="block md:hidden divide-y divide-border/30">
                      {(rec.installments || []).map((inst: any) => {
                        const isLate = inst.status === "pending" && new Date(inst.due_date) < new Date();
                        const isPaid = inst.status === "paid";
                        return (
                          <div key={inst.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                            <div className="space-y-0.5">
                              <p className="font-medium text-foreground">
                                {inst.installment_number}ª Parcela • {formatDate(inst.due_date)}
                              </p>
                              <p className="font-mono font-semibold text-foreground">
                                {formatMoney(inst.amount_cents)}
                              </p>
                              {inst.paid_at && (
                                <p className="text-[10px] text-muted-foreground">
                                  Paga em {formatDate(inst.paid_at)}
                                </p>
                              )}
                            </div>
                            <div>
                              {isPaid ? (
                                <Badge variant="default" className="bg-emerald-600 text-white text-[10px]">
                                  Paga
                                </Badge>
                              ) : isLate ? (
                                <Badge variant="destructive" className="text-[10px]">Atrasada</Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenPay(inst)}
                                  className="h-8 text-xs font-semibold rounded-xl"
                                >
                                  Quitar
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop View: Table */}
                    <div className="hidden md:block p-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Parcela</TableHead>
                            <TableHead className="text-xs">Vencimento</TableHead>
                            <TableHead className="text-xs">Valor</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                            <TableHead className="text-xs">Data de Pagamento</TableHead>
                            <TableHead className="text-xs text-right">Ação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(rec.installments || []).map((inst: any) => {
                            const isLate = inst.status === "pending" && new Date(inst.due_date) < new Date();
                            const isPaid = inst.status === "paid";

                            return (
                              <TableRow key={inst.id}>
                                <TableCell className="font-medium text-xs">{inst.installment_number}ª Parcela</TableCell>
                                <TableCell className="text-xs">{formatDate(inst.due_date)}</TableCell>
                                <TableCell className="font-semibold font-mono text-xs">{formatMoney(inst.amount_cents)}</TableCell>
                                <TableCell>
                                  {isPaid ? (
                                    <Badge variant="default" className="bg-emerald-600 text-[10px]">Paga</Badge>
                                  ) : isLate ? (
                                    <Badge variant="destructive" className="text-[10px]">Em Atraso</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-[10px]">Pendente</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-xs">
                                  {inst.paid_at ? formatDate(inst.paid_at) : "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {!isPaid && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenPay(inst)}
                                      className="h-8 text-xs font-semibold rounded-xl"
                                    >
                                      Quitar Parcela
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Seção 3: Carnês e Crediário */}
          {safePlans.length > 0 && (
            <section className="space-y-4">
              <div className="px-4 sm:px-0">
                <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 text-foreground">
                  <Receipt className="size-4 text-primary" />
                  Carnês e Crediário
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Parcelamentos ativos via crediário e faturas de carnê.
                </p>
              </div>

              <div className="space-y-4">
                {safePlans.map((plan: any) => (
                  <div key={plan.id} className="bg-card border-y border-border/40 sm:border sm:rounded-2xl overflow-hidden">
                    <div className="flex flex-row items-center justify-between p-4 bg-muted/20 border-b border-border/40">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          Pedido #{plan.orderToken}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Gerado em {formatDate(plan.createdAt)} — Total: {formatMoney(plan.totalCents)}
                        </p>
                      </div>
                      <Badge
                        variant={
                          plan.status === "active"
                            ? "default"
                            : plan.status === "paid_off"
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-[10px]"
                      >
                        {plan.status === "active" ? "Ativo" : plan.status === "paid_off" ? "Quitado" : "Em Atraso"}
                      </Badge>
                    </div>

                    <div className="p-4">
                      <div className="block md:hidden divide-y divide-border/30">
                        {plan.installments.map((inst: any, idx: number) => {
                          const isLate = inst.status === "pending" && new Date(inst.dueDate) < new Date();
                          return (
                            <div key={inst.id} className="py-2.5 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-medium text-foreground">{idx + 1}ª Parcela • {formatDate(inst.dueDate)}</p>
                                <p className="font-mono font-semibold">{formatMoney(inst.amountCents)}</p>
                              </div>
                              <Badge
                                variant={inst.status === "paid" ? "default" : isLate ? "destructive" : "secondary"}
                                className="text-[10px]"
                              >
                                {inst.status === "paid" ? "Paga" : isLate ? "Atrasada" : "Pendente"}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>

                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Parcela</TableHead>
                              <TableHead className="text-xs">Vencimento</TableHead>
                              <TableHead className="text-xs">Valor</TableHead>
                              <TableHead className="text-xs">Status</TableHead>
                              <TableHead className="text-xs">Data de Pagamento</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {plan.installments.map((inst: any, idx: number) => {
                              const isLate = inst.status === "pending" && new Date(inst.dueDate) < new Date();
                              return (
                                <TableRow key={inst.id}>
                                  <TableCell className="font-medium text-xs">{idx + 1}ª</TableCell>
                                  <TableCell className="text-xs">{formatDate(inst.dueDate)}</TableCell>
                                  <TableCell className="text-xs font-mono font-semibold">{formatMoney(inst.amountCents)}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={inst.status === "paid" ? "default" : isLate ? "destructive" : "secondary"}
                                      className="text-[10px]"
                                    >
                                      {inst.status === "paid" ? "Paga" : isLate ? "Atrasada" : "Pendente"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{inst.paidAt ? formatDate(inst.paidAt) : "-"}</TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal de Quitação de Parcela (16px Mandate para evitar iOS Zoom) */}
      {selectedInstallment && (
        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl p-5 sm:p-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base font-bold text-foreground">
                Quitar {selectedInstallment.installment_number}ª Parcela
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Valor:{" "}
                <strong className="text-foreground">
                  {formatMoney(selectedInstallment.amount_cents)}
                </strong>{" "}
                • Vencimento: {formatDate(selectedInstallment.due_date)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Comprovante de Pagamento (Foto / Anexo)
                </Label>
                <ImageUpload
                  value={paymentProofUrl}
                  onChange={(url) => setPaymentProofUrl(url)}
                  onRemove={() => setPaymentProofUrl("")}
                  bucket="cms-media"
                  aspectPreset="square"
                  className="w-24 h-24"
                  helperText="Foto do comprovante"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Observações / Código da Transação</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Pago via PIX pelo banco às 14:30"
                  rows={3}
                  className="rounded-xl text-base sm:text-xs bg-background resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPaymentModalOpen(false)}
                  className="rounded-xl text-xs h-10 px-4"
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  onClick={handleConfirmPay}
                  disabled={payInstallmentMutation.isPending}
                  className="rounded-xl text-xs font-bold gap-1.5 h-10 px-4 bg-primary text-primary-foreground"
                >
                  {payInstallmentMutation.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <span>Confirmar Pagamento</span>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
