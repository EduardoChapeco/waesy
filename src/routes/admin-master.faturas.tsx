import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  getPlatformInvoicesList,
  getPlatformStoresList,
  updateInvoiceStatus,
  createPlatformInvoice,
  duplicatePlatformInvoice,
  deletePlatformInvoice,
  toggleStoreDebtBlock,
} from "@/services/master.functions";
import { formatMoney, parseMoney } from "@/lib/money";
import { DollarSign, Plus, Receipt, Copy, Trash2, ExternalLink, FileText, ShieldAlert, ShieldCheck, Filter, Smartphone, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DigitalCompanionCard,
  type CompanionCardSectionItem,
  type CompanionRuleItem,
  type CompanionContactItem,
} from "@/components/documents/digital-companion-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { ErrorState } from "@/components/state/states";
import { ImageUpload } from "@/components/ui/image-upload";

function safeFormatDate(rawDate?: string | null, pattern: string = "dd/MM/yyyy"): string {
  if (!rawDate) return "—";
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return "—";
    return format(d, pattern, { locale: ptBR });
  } catch {
    return "—";
  }
}

export function calculateReformaTributaria2026(amountCents: number) {
  const ibsCents = Math.round(amountCents * 0.0177); // 1.77% IBS
  const cbsCents = Math.round(amountCents * 0.088);  // 8.80% CBS
  const irrfCents = Math.round(amountCents * 0.015); // 1.50% IRRF
  const totalTaxCents = ibsCents + cbsCents;
  const netCents = Math.max(0, amountCents - totalTaxCents);
  return { ibsCents, cbsCents, irrfCents, totalTaxCents, netCents };
}

export const Route = createFileRoute("/admin-master/faturas")({
  head: () => ({ meta: [{ title: "Faturas & Planos | Admin Master" }] }),
  loader: async () => {
    try {
      const [invoices, stores] = await Promise.all([
        getPlatformInvoicesList().catch(() => []),
        getPlatformStoresList().catch(() => []),
      ]);
      return { invoices: invoices || [], stores: stores || [] };
    } catch {
      return { invoices: [], stores: [] };
    }
  },
  component: MasterFaturasPage,
  errorComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-20">
      <ErrorState
        title="Faturas Indisponíveis"
        description="Não foi possível carregar as faturas e planos da plataforma. Tente novamente."
        onRetry={() => {
          if (typeof window !== "undefined") window.location.reload();
        }}
      />
    </div>
  ),
});

function MasterFaturasPage() {
  const { invoices, stores } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompanionInvoice, setSelectedCompanionInvoice] = useState<any | null>(null);

  // Form states
  const [storeId, setStoreId] = useState("");
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [notes, setNotes] = useState("");

  const handleUpdateStatus = async (
    invoiceId: string,
    newStatus: "pending" | "paid" | "overdue" | "cancelled",
  ) => {
    if (!confirm(`Confirmar alteração de status para: ${newStatus.toUpperCase()}?`)) return;

    setLoadingAction(invoiceId);
    try {
      await updateInvoiceStatus({ data: { invoiceId, status: newStatus } });
      toast.success("Status da fatura atualizado.");
      router.invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleToggleDebtBlock = async (store: any) => {
    if (!store?.id) return;
    const isCurrentlyBlocked = Boolean(store?.settings?.blocked_due_to_debt);
    const actionLabel = isCurrentlyBlocked ? "desbloquear" : "bloquear por inadimplência";
    if (!confirm(`Deseja realmente ${actionLabel} a conta da loja "${store.name}"?`)) return;

    setLoadingAction(`debt-${store.id}`);
    try {
      await toggleStoreDebtBlock({
        data: {
          storeId: store.id,
          blocked: !isCurrentlyBlocked,
          reason: !isCurrentlyBlocked ? "Bloqueio preventivo por atraso de fatura" : "Desbloqueio regular após regularização",
        },
      });
      toast.success(`Conta da loja ${isCurrentlyBlocked ? "desbloqueada com sucesso" : "bloqueada por inadimplência"}.`);
      router.invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDuplicate = async (invoiceId: string) => {
    setLoadingAction(invoiceId);
    try {
      await duplicatePlatformInvoice({ data: { invoiceId } });
      toast.success("Fatura duplicada com sucesso.");
      router.invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDelete = async (invoiceId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta fatura definitivamente?")) return;
    setLoadingAction(invoiceId);
    try {
      await deletePlatformInvoice({ data: { invoiceId } });
      toast.success("Fatura excluída com sucesso.");
      router.invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !description || !amountStr || !dueDate) {
      toast.error("Preencha os campos obrigatórios (Loja, Descrição, Valor e Vencimento).");
      return;
    }

    const cents = parseMoney(amountStr);
    if (!cents || cents <= 0) {
      toast.error("Valor inválido.");
      return;
    }

    const parsedDate = new Date(dueDate);
    if (isNaN(parsedDate.getTime())) {
      toast.error("Data de vencimento inválida.");
      return;
    }

    setLoadingAction("creating");
    try {
      await createPlatformInvoice({
        data: {
          storeId,
          description,
          amountCents: cents,
          dueDate: parsedDate.toISOString(),
          receiptUrl: receiptUrl || null,
          notes: notes || null,
        },
      });
      toast.success("Fatura emitida com sucesso.");
      setIsCreating(false);
      setStoreId("");
      setDescription("");
      setAmountStr("");
      setDueDate("");
      setReceiptUrl("");
      setNotes("");
      router.invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSendWhatsAppNotice = (inv: any) => {
    const storeName = inv.stores?.name || "Parceiro";
    const amount = formatMoney(inv.total_updated_cents || inv.amount_cents);
    const due = safeFormatDate(inv.due_date || inv.created_at);
    const msg = `*FATURA DA PLATAFORMA WAESY*\n\n` +
      `Olá, *${storeName}*! Seguem os dados da sua fatura *#${inv.id.slice(0, 8)}*:\n\n` +
      `• *Descrição:* ${inv.description || "Assinatura de Plano"}\n` +
      `• *Valor:* ${amount}\n` +
      `• *Vencimento:* ${due}\n` +
      `• *Status:* ${inv.status === "paid" ? "PAGA" : "Aguardando Liquidação"}\n\n` +
      `Para regularizar via Pix ou acessar o recibo, consulte o seu Workspace no Waesy.`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const pendingCount = (invoices || []).filter((i: any) => i.status === "pending" && !i.is_overdue).length;
  const overdueCount = (invoices || []).filter((i: any) => i.status !== "paid" && (i.status === "overdue" || i.is_overdue)).length;
  const paidCount = (invoices || []).filter((i: any) => i.status === "paid").length;
  const withReceiptCount = (invoices || []).filter((i: any) => Boolean(i.receipt_url) && i.status !== "paid").length;

  const filteredInvoices = (invoices || []).filter((inv: any) => {
    if (statusFilter === "paid" && inv.status !== "paid") return false;
    if (statusFilter === "overdue" && (inv.status === "paid" || !(inv.status === "overdue" || inv.is_overdue))) return false;
    if (statusFilter === "pending" && (inv.status !== "pending" || inv.is_overdue)) return false;
    if (statusFilter === "with_receipt" && (!inv.receipt_url || inv.status === "paid")) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const storeName = (inv.stores?.name || "").toLowerCase();
      const desc = (inv.description || "").toLowerCase();
      const notes = (inv.notes || "").toLowerCase();
      if (!storeName.includes(q) && !desc.includes(q) && !notes.includes(q)) return false;
    }

    return true;
  });

  const totalInvoicedCents = (invoices || []).reduce((acc: number, inv: any) => acc + (inv.amount_cents || 0), 0);
  const totalPaidCents = (invoices || []).filter((inv: any) => inv.status === "paid").reduce((acc: number, inv: any) => acc + (inv.amount_cents || 0), 0);
  const totalOverdueCents = (invoices || []).filter((inv: any) => inv.status !== "paid" && (inv.status === "overdue" || inv.is_overdue)).reduce((acc: number, inv: any) => acc + (inv.total_updated_cents || inv.amount_cents || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Faturas & Planos
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Emissão de cobranças, cálculo automático de juros pós-vencimento e gestão de bloqueio por inadimplência.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsCreating(!isCreating)}
            className="rounded-xl text-xs font-semibold gap-1.5"
          >
            <Plus className="size-3.5" />
            <span>{isCreating ? "Fechar Formulário" : "Nova Fatura"}</span>
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Emitido</span>
            <Receipt className="size-4 text-primary" />
          </div>
          <div className="text-xl font-bold mt-2 text-foreground">
            {formatMoney(totalInvoicedCents)}
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            {invoices.length} faturas registradas
          </span>
        </div>

        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Liquidado</span>
            <DollarSign className="size-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold mt-2 text-emerald-600">
            {formatMoney(totalPaidCents)}
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Recebimento confirmado
          </span>
        </div>

        <div className="bg-card rounded-2xl border border-border/60 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Vencido (c/ Multa e Juros)</span>
            <ShieldAlert className="size-4 text-destructive" />
          </div>
          <div className="text-xl font-bold mt-2 text-destructive">
            {formatMoney(totalOverdueCents)}
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5 block">
            Inadimplência atualizada pro-rata
          </span>
        </div>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="bg-card rounded-2xl border border-border/80 p-5 shadow-sm">
          <h2 className="text-sm font-semibold mb-3">Emitir Nova Fatura / Cobrança</h2>
          <form onSubmit={handleCreateInvoice} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Loja / Empresa Destino</Label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger className="h-9 rounded-xl bg-background text-xs">
                  <SelectValue placeholder="Selecione a loja..." />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s: any) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição</Label>
              <Input
                placeholder="Ex: Mensalidade - Outubro"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 rounded-xl bg-background text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor (R$)</Label>
              <Input
                placeholder="0,00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="h-9 rounded-xl bg-background text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Vencimento</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 rounded-xl bg-background text-xs"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold">Comprovante de Pagamento / Anexo (Opcional)</Label>
              <div className="space-y-2">
                <ImageUpload
                  value={receiptUrl}
                  onChange={(url) => setReceiptUrl(url)}
                  aspectPreset="landscape"
                />
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Ou informe uma URL direta do arquivo (PDF / Imagem)..."
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    className="h-8 rounded-xl bg-background text-xs flex-1"
                  />
                  {receiptUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setReceiptUrl("")}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive shrink-0"
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold">Observações / Referência (Opcional)</Label>
              <Input
                placeholder="Ex: Pagamento referente ao plano Scale"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 rounded-xl bg-background text-xs"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
              <Button
                type="submit"
                size="sm"
                disabled={loadingAction === "creating"}
                className="rounded-xl text-xs font-semibold px-4"
              >
                {loadingAction === "creating" ? "Emitindo..." : "Confirmar Emissão"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs & Invoices Table */}
      <div className="bg-card rounded-2xl border border-border/60 overflow-hidden shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 py-3 border-b border-border/40 bg-muted/10 gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="size-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Filtro:</span>
            <div className="flex items-center gap-1 ml-1">
              {[
                { id: "all", label: `Todas (${invoices.length})` },
                { id: "pending", label: `Pendentes (${pendingCount})` },
                { id: "overdue", label: `Vencidas (${overdueCount})` },
                { id: "paid", label: `Pagas (${paidCount})` },
                { id: "with_receipt", label: `Com Comprovante (${withReceiptCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer",
                    statusFilter === tab.id
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por loja ou fatura..."
              className="h-8 w-full sm:w-48 text-xs rounded-xl"
            />
            <span className="text-[11px] text-muted-foreground shrink-0">
              {filteredInvoices.length} de {invoices.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/30 text-muted-foreground border-b border-border/40 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3">Descrição</th>
                <th className="px-5 py-3">Loja / Status da Conta</th>
                <th className="px-5 py-3">Valor / Atualizado</th>
                <th className="px-5 py-3">Vencimento</th>
                <th className="px-5 py-3">Comprovante</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredInvoices.map((inv: any) => {
                const isOverdue = inv.is_overdue || inv.status === "overdue";
                const isStoreBlocked = inv.is_store_debt_blocked || Boolean(inv.stores?.settings?.blocked_due_to_debt);
                const canBlockStore = inv.stores?.id && !inv.stores?.is_platform_root && inv.stores?.slug !== "waesy";

                return (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-semibold text-foreground">
                      <div>{inv.description || "Assinatura Mensal"}</div>
                      {inv.notes && (
                        <div className="text-[10px] text-muted-foreground font-normal">{inv.notes}</div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{inv.stores?.name || "Global"}</span>
                        {isStoreBlocked && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                            Bloqueada
                          </Badge>
                        )}
                      </div>
                      {canBlockStore && (
                        <button
                          onClick={() => handleToggleDebtBlock(inv.stores)}
                          disabled={loadingAction === `debt-${inv.stores?.id}`}
                          className="text-[10px] text-muted-foreground hover:text-foreground underline block mt-0.5"
                        >
                          {isStoreBlocked ? "Desbloquear conta" : "Bloquear por inadimplência"}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-bold text-foreground">{formatMoney(inv.amount_cents)}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5" title="Reforma Tributária 2026: IBS 1,77% + CBS 8,8%">
                        Líq. Est.: {formatMoney(calculateReformaTributaria2026(inv.amount_cents).netCents)}
                      </div>
                      {isOverdue && inv.status !== "paid" && (
                        <div className="text-[10px] font-semibold text-destructive mt-0.5">
                          Total: {formatMoney(inv.total_updated_cents)}
                          <span className="block text-[9px] font-normal text-muted-foreground">
                            (+{formatMoney(inv.fine_cents + inv.interest_cents)} juros/multa)
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-[11px]">
                      {safeFormatDate(inv.due_date || inv.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      {inv.receipt_url ? (
                        <div className="flex flex-col gap-1 items-start">
                          <a
                            href={inv.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline text-xs"
                          >
                            <FileText className="size-3.5" />
                            <span>Ver Comprovante</span>
                            <ExternalLink className="size-3 opacity-60" />
                          </a>
                          {inv.status !== "paid" && (
                            <span className="text-[9px] font-semibold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              Anexado p/ Lojista
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant={
                          inv.status === "paid"
                            ? "default"
                            : isOverdue
                            ? "destructive"
                            : "secondary"
                        }
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5",
                          inv.status === "paid" ? "bg-emerald-600/90 text-white" : ""
                        )}
                      >
                        {inv.status === "paid"
                          ? "Pago"
                          : isOverdue
                          ? `Vencido (+${inv.days_overdue || 1}d)`
                          : "Pendente"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {inv.status !== "paid" && (
                          inv.receipt_url ? (
                            <Button
                              size="sm"
                              className="h-7 px-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1 cursor-pointer"
                              disabled={loadingAction === inv.id}
                              onClick={() => handleUpdateStatus(inv.id, "paid")}
                            >
                              <CheckCircle2 className="size-3.5" />
                              <span>Aprovar & Baixar</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 rounded-lg text-xs font-medium text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                              disabled={loadingAction === inv.id}
                              onClick={() => handleUpdateStatus(inv.id, "paid")}
                            >
                              Marcar Pago
                            </Button>
                          )
                        )}
                        {inv.status === "pending" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 rounded-lg text-xs font-medium text-amber-600 hover:bg-amber-500/10"
                            disabled={loadingAction === inv.id}
                            onClick={() => handleUpdateStatus(inv.id, "cancelled")}
                          >
                            Cancelar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Gerar Cartão 9:16 para WhatsApp"
                          className="size-7 p-0 rounded-lg text-primary hover:bg-primary/10"
                          onClick={() => setSelectedCompanionInvoice(inv)}
                        >
                          <Smartphone className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Enviar Notificação via WhatsApp"
                          className="size-7 p-0 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 cursor-pointer"
                          onClick={() => handleSendWhatsAppNotice(inv)}
                        >
                          <Smartphone className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Duplicar Fatura"
                          className="size-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                          disabled={loadingAction === inv.id}
                          onClick={() => handleDuplicate(inv.id)}
                        >
                          <Copy className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Excluir Fatura"
                          className="size-7 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                          disabled={loadingAction === inv.id}
                          onClick={() => handleDelete(inv.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted-foreground">
                    Nenhuma fatura encontrada para o filtro selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL DIGITAL COMPANION CARD 9:16 (FATURA / COBRANÇA WHATSAPP) ── */}
      <Dialog
        open={Boolean(selectedCompanionInvoice)}
        onOpenChange={(open) => {
          if (!open) setSelectedCompanionInvoice(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-3xl bg-background border border-border shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Fatura Digital 9:16 da Plataforma</DialogTitle>
          </DialogHeader>
          {selectedCompanionInvoice && (
            <div className="w-full">
              <DigitalCompanionCard {...getInvoiceCompanionData(selectedCompanionInvoice)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getInvoiceCompanionData(inv: any) {
  const storeName = inv.stores?.name || "Loja Parceira";
  const isOverdue = inv.is_overdue || inv.status === "overdue";
  const dueDateStr = safeFormatDate(inv.due_date || inv.created_at);

  const sections: CompanionCardSectionItem[] = [
    {
      id: "invoice-details",
      type: "custom" as const,
      badge: inv.status === "paid" ? "PAGA ✓" : isOverdue ? "VENCIDA" : "A VENCER",
      title: inv.description || "Assinatura / Mensalidade",
      subtitle: `Vencimento: ${dueDateStr}`,
      details: [
        { label: "Valor Original", value: formatMoney(inv.amount_cents) },
        ...(isOverdue && inv.status !== "paid"
          ? [
              { label: "Encargos Moratórios", value: `+${formatMoney((inv.fine_cents || 0) + (inv.interest_cents || 0))}` },
              { label: "Total Atualizado", value: formatMoney(inv.total_updated_cents || inv.amount_cents), highlight: true },
            ]
          : [{ label: "Total", value: formatMoney(inv.amount_cents), highlight: true }]),
        { label: "Situação", value: inv.status === "paid" ? "Liquidada" : isOverdue ? "Pendente com atraso" : "Aguardando pagamento" },
        ...(inv.notes ? [{ label: "Referência", value: inv.notes }] : []),
      ],
    },
  ];

  const rules: CompanionRuleItem[] = [
    {
      title: "Chave Pix de Liquidação",
      description: "Efetue o pagamento através da chave Pix oficial da plataforma para conciliação bancária imediata.",
      badge: "Pix 24h",
      highlight: true,
    },
    {
      title: "Bloqueio Preventivo por Atraso",
      description: "Faturas em atraso superior a 5 dias úteis acarretam restrição de novos pedidos e emissões no Workspace.",
      badge: "Inadimplência",
    },
    {
      title: "Comprovante de Quitação",
      description: "Após a compensação, o recibo de liquidação é disponibilizado no cofre fiscal da conta do lojista.",
      badge: "Recibo",
    },
  ];

  const emergencyContacts: CompanionContactItem[] = [
    {
      name: "Financeiro Waesy Platform",
      category: "Setor de Cobrança & Contas",
      phone: "0800 000 0000",
      whatsapp: true,
      is24h: false,
    },
    {
      name: "Suporte Técnico Master",
      category: "Central 24h",
      phone: "0800 000 0000",
      whatsapp: true,
      is24h: true,
    },
  ];

  return {
    niche: "retail" as const,
    title: inv.description || "Fatura de Serviços",
    subtitle: `${storeName} · Vencimento: ${dueDateStr}`,
    code: `FAT-${inv.id.slice(0, 8).toUpperCase()}`,
    companyName: "Waesy Platform",
    participantsLabel: "Lojista / Titular",
    participants: [storeName],
    sections,
    rules,
    emergencyContacts,
  };
}
