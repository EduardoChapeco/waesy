import { createFileRoute, Link, useRouter, isRedirect } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Calculator, History, Lock, Play, ReceiptText, DollarSign, AlertTriangle, Plus, Minus, CheckCircle2, Clock, User, ShieldCheck, CreditCard, QrCode, Banknote, MonitorCheck, Layers, ExternalLink, ChevronRight, TrendingUp } from 'lucide-react';

import { PageHeader } from "@/components/commerce/page-header";
import { ErrorState, EmptyState } from "@/components/state/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
 Card,
 CardContent,
 CardDescription,
 CardFooter,
 CardHeader,
 CardTitle,
} from "@/components/ui/card";
import {
 Sheet,
 SheetContent,
 SheetDescription,
 SheetFooter,
 SheetHeader,
 SheetTitle,
} from "@/components/ui/sheet";
import {
 Form,
 FormControl,
 FormField,
 FormItem,
 FormLabel,
 FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";

import {
 addRegisterEntry,
 closeRegister,
 getActiveRegister,
 openRegister,
 listRegisterHistory,
} from "@/services/cash.functions";
import { parseCurrencyInputToCents } from "@/lib/cash";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspace/financeiro/caixa/")({
 head: () => ({ meta: [{ title: "Fluxo de Caixa & Turnos | Workspace Waesy" }] }),
 loader: async () => {
   try {
 const [registerRes, historyRes] = await Promise.all([
 getActiveRegister().catch(() => null),
 listRegisterHistory().catch(() => []),
 ]);
 return {
 register: registerRes,
 history: historyRes || [],
 };
   } catch (err) {
     console.error("[loader:workspace.financeiro.caixa.index] Unhandled loader error:", err);
     return { register: null, history: null };
   }
 },
 errorComponent: ({ error }) => <CashRegisterError error={error} />,
 component: CashRegisterManagerPage,
});

const OpenRegisterSchema = z.object({
 initialBalance: z.string().min(1, "Informe o troco inicial de abertura"),
 notes: z.string().optional(),
});

const CloseRegisterSchema = z.object({
 countedBalance: z.string().min(1, "Informe o valor total em dinheiro contado na gaveta"),
 notes: z.string().optional(),
});

const SangriaSuprimentoSchema = z.object({
 amount: z.string().min(1, "Informe o valor"),
 type: z.enum(["sangria", "suprimento"]),
 description: z.string().min(3, "Informe o motivo da movimentação"),
});

function CashRegisterError({ error }: { error: Error }) {
 if (isRedirect(error)) {
 throw error;
 }

 return (
 <div className="space-y-6">
 <PageHeader eyebrow="Financeiro" title="Fluxo de Caixa" />
 <ErrorState title="Falha ao carregar fluxo de caixa" />
 </div>
 );
}

function CashRegisterManagerPage() {
 const { register, history } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();

 // Channel filter state
 const [selectedChannel, setSelectedChannel] = useState<string>("all");

 const filteredEntries = useMemo(() => {
 const entries = (register?.recentEntries || []) as any[];
 if (selectedChannel === "all") return entries;
 return entries.filter((e) => (e.channel || "pos_counter") === selectedChannel);
 }, [register?.recentEntries, selectedChannel]);

 function getChannelBadge(channel?: string) {
 switch (channel) {
 case "mercadolivre":
 return <Badge variant="outline" className="text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">Mercado Livre</Badge>;
 case "ifood":
 return <Badge variant="outline" className="text-[10px] font-medium bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30">iFood</Badge>;
 case "amazon":
 return <Badge variant="outline" className="text-[10px] font-medium bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30">Amazon</Badge>;
 case "whatsapp":
 return <Badge variant="outline" className="text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">WhatsApp</Badge>;
 case "ecommerce":
 return <Badge variant="outline" className="text-[10px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30">Loja Virtual</Badge>;
 default:
 return <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border/60">Balcão / PDV</Badge>;
 }
 }

 // Dialog / Sheet states
 const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
 const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
 const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
 const [movementType, setMovementType] = useState<"sangria" | "suprimento">("sangria");

 const [isSubmitting, setIsSubmitting] = useState(false);

 // Forms
 const openForm = useForm<z.infer<typeof OpenRegisterSchema>>({
 resolver: zodResolver(OpenRegisterSchema),
 defaultValues: { initialBalance: "0,00", notes: "" },
 });

 const closeForm = useForm<z.infer<typeof CloseRegisterSchema>>({
 resolver: zodResolver(CloseRegisterSchema),
 defaultValues: { countedBalance: "", notes: "" },
 });

 const movementForm = useForm<z.infer<typeof SangriaSuprimentoSchema>>({
 resolver: zodResolver(SangriaSuprimentoSchema),
 defaultValues: { amount: "", type: "sangria", description: "" },
 });

 // Abertura de Turno
 const handleOpenRegister = async (values: z.infer<typeof OpenRegisterSchema>) => {
 setIsSubmitting(true);
 try {
 const cents = parseCurrencyInputToCents(values.initialBalance);
 await openRegister({
 data: {
 initialBalanceCents: cents,
 notes: values.notes || undefined,
 },
 });
 toast.success("Turno de caixa aberto com sucesso!");
 setIsOpenModalOpen(false);
 openForm.reset();
 router.invalidate();
 } catch (e: any) {
 toast.error(e.message || "Erro ao abrir caixa.");
 } finally {
 setIsSubmitting(false);
 }
 };

 // Fechamento de Turno
 const handleCloseRegister = async (values: z.infer<typeof CloseRegisterSchema>) => {
 if (!register) return;
 setIsSubmitting(true);
 try {
 const countedCents = parseCurrencyInputToCents(values.countedBalance);
 const res = await closeRegister({
 data: {
 registerId: register.id,
 countedBalanceCents: countedCents,
 notes: values.notes || undefined,
 },
 });

 if (res.discrepancy) {
 const diff = res.counted - res.expected;
 if (diff > 0) {
 toast.warning(`Caixa fechado com SOBRA de ${formatMoney(diff)}.`);
 } else {
 toast.warning(`Caixa fechado com FALTA de ${formatMoney(Math.abs(diff))}.`);
 }
 } else {
 toast.success("Turno de caixa fechado com sucesso e valores conferidos!");
 }

 setIsCloseModalOpen(false);
 closeForm.reset();
 router.invalidate();
 } catch (e: any) {
 toast.error(e.message || "Erro ao fechar caixa.");
 } finally {
 setIsSubmitting(false);
 }
 };

 // Sangria ou Suprimento
 const handleMovement = async (values: z.infer<typeof SangriaSuprimentoSchema>) => {
 if (!register) return;
 setIsSubmitting(true);
 try {
 const rawCents = parseCurrencyInputToCents(values.amount);
 const finalCents = values.type === "sangria" ? -Math.abs(rawCents) : Math.abs(rawCents);

 await addRegisterEntry({
 data: {
 registerId: register.id,
 amountCents: finalCents,
 method: "cash",
 description: `${values.type === "sangria" ? "[SANGRIA]" : "[SUPRIMENTO]"} ${values.description}`,
 },
 });

 toast.success(
 values.type === "sangria"
 ? "Sangria de dinheiro realizada com sucesso!"
 : "Suprimento de troco registrado com sucesso!",
 );

 setIsMovementModalOpen(false);
 movementForm.reset();
 router.invalidate();
 } catch (e: any) {
 toast.error(e.message || "Erro ao registrar movimentação.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const openMovementDialog = (type: "sangria" | "suprimento") => {
 setMovementType(type);
 movementForm.setValue("type", type);
 movementForm.setValue("amount", "");
 movementForm.setValue("description", "");
 setIsMovementModalOpen(true);
 };

 const isBoxOpen = register?.status === "open";

 return (
 <div className="space-y-6">
 {/* ── PageHeader Canônico ── */}
 <PageHeader
 eyebrow="Financeiro"
 title="Fluxo de Caixa"
 actions={
 <div className="flex items-center gap-2">
 <Button
 asChild
 size="sm"
 className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground h-9 px-4 cursor-pointer shadow-xs"
 >
 <Link to="/workspace/pdv">
 <Layers className="size-3.5" />
 <span>Abrir Terminal PDV</span>
 </Link>
 </Button>
 {isBoxOpen ? (
 <>
 <Button
 onClick={() => openMovementDialog("suprimento")}
 size="sm"
 variant="outline"
 className="rounded-xl text-xs font-bold h-9 gap-1"
 >
 <ArrowDownLeft className="size-3.5 text-emerald-500" />
 <span>Suprimento</span>
 </Button>
 <Button
 onClick={() => openMovementDialog("sangria")}
 size="sm"
 variant="outline"
 className="rounded-xl text-xs font-bold h-9 gap-1"
 >
 <ArrowUpRight className="size-3.5 text-rose-500" />
 <span>Sangria</span>
 </Button>
 <Button
 onClick={() => setIsCloseModalOpen(true)}
 size="sm"
 variant="destructive"
 className="rounded-xl text-xs font-bold h-9 gap-1"
 >
 <Lock className="size-3.5" />
 <span>Fechar Turno</span>
 </Button>
 </>
 ) : (
 <Button
 onClick={() => setIsOpenModalOpen(true)}
 size="sm"
 variant="outline"
 className="rounded-xl text-xs font-bold h-9 gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
 >
 <Play className="size-3.5" />
 <span>Abrir Turno de Caixa</span>
 </Button>
 )}
 </div>
 }
 />

 {/* ── Card de Status do Turno Atual ── */}
 <div className="p-6 rounded-2xl bg-card border border-border/70 shadow-2xs space-y-5">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
 <div className="flex items-center gap-3">
 <div
 className={`size-11 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
 isBoxOpen
 ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
 : "bg-muted text-muted-foreground border border-border"
 }`}
 >
 {isBoxOpen ? <MonitorCheck className="size-5" /> : <Lock className="size-5" />}
 </div>
 <div>
 <div className="flex items-center gap-2">
 <h2 className="text-base font-bold text-foreground">
 {isBoxOpen ? "Turno Atual em Operação" : "Caixa Fechado"}
 </h2>
 <Badge
 variant={isBoxOpen ? "default" : "secondary"}
 className="text-[10px] font-bold rounded-lg"
 >
 {isBoxOpen ? (register?.isExpired ? "Expirado (>24h)" : "Aberto") : "Fechado"}
 </Badge>
 </div>
 <p className="text-xs text-muted-foreground mt-0.5">
 {isBoxOpen
 ? `Aberto por ${register?.opened_by_profile?.full_name || "Operador"} em ${formatDateTime(register?.opened_at)}`
 : "Nenhum turno em andamento. Abra o caixa para registrar vendas e movimentações."}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-3 self-end sm:self-center">
 {isBoxOpen && (
 <div className="text-right">
 <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">
 Saldo em Gaveta (Dinheiro)
 </span>
 <span className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400">
 {formatMoney(register?.cashBalanceCents ?? register?.currentBalanceCents ?? 0)}
 </span>
 </div>
 )}
 </div>
 </div>

 {/* Grade de Métricas do Turno por Forma de Pagamento */}
 {isBoxOpen && (
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
 <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
 <Banknote className="size-3 text-emerald-500" />
 <span>Dinheiro</span>
 </span>
 <p className="text-sm font-mono font-bold text-foreground">
 {formatMoney(register?.cashBalanceCents ?? 0)}
 </p>
 </div>

 <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
 <QrCode className="size-3 text-cyan-500" />
 <span>PIX</span>
 </span>
 <p className="text-sm font-mono font-bold text-foreground">
 {formatMoney(register?.pixBalanceCents ?? 0)}
 </p>
 </div>

 <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
 <CreditCard className="size-3 text-blue-500" />
 <span>Débito</span>
 </span>
 <p className="text-sm font-mono font-bold text-foreground">
 {formatMoney(register?.debitBalanceCents ?? 0)}
 </p>
 </div>

 <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
 <CreditCard className="size-3 text-indigo-500" />
 <span>Crédito</span>
 </span>
 <p className="text-sm font-mono font-bold text-foreground">
 {formatMoney(register?.creditBalanceCents ?? 0)}
 </p>
 </div>

 <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
 <ArrowUpRight className="size-3 text-rose-500" />
 <span>Sangrias</span>
 </span>
 <p className="text-sm font-mono font-bold text-rose-600 dark:text-rose-400">
 -{formatMoney(register?.sangriaTotalCents ?? 0)}
 </p>
 </div>

 <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 space-y-1">
 <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
 <ArrowDownLeft className="size-3 text-emerald-500" />
 <span>Suprimentos</span>
 </span>
 <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
 +{formatMoney(register?.suprimentoTotalCents ?? 0)}
 </p>
 </div>
 </div>
 )}
 </div>

 {/* ── Abas de Governança: Extrato do Turno & Histórico ── */}
 <Tabs defaultValue="current" className="space-y-4">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl px-4 py-3">
 <TabsList className="flex overflow-x-auto no-scrollbar h-8">
 <TabsTrigger value="current" className="text-xs shrink-0">
 Lançamentos do Turno Atual ({register?.recentEntries?.length || 0})
 </TabsTrigger>
 <TabsTrigger value="history" className="text-xs shrink-0">
 Histórico de Turnos Passados ({history.length})
 </TabsTrigger>
 </TabsList>
 </div>

 {/* ── Conteúdo: Lançamentos do Turno Atual ── */}
 <TabsContent value="current" className="mt-0 space-y-4">
 {!isBoxOpen ? (
 <div className="py-12 text-center space-y-4 border border-dashed border-border/70 rounded-2xl bg-card/40">
 <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
 <ReceiptText className="size-6" />
 </div>
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground">Nenhum turno aberto</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Abra um turno de caixa para começar a registrar vendas de balcão e movimentações.
 </p>
 </div>
 <Button
 onClick={() => setIsOpenModalOpen(true)}
 size="sm"
 className="rounded-xl text-xs font-bold h-9"
 >
 <Play className="size-3.5 mr-1" />
 Abrir Turno de Caixa
 </Button>
 </div>
 ) : register?.recentEntries && register.recentEntries.length > 0 ? (
 <div className="space-y-3">
      {/* Seletor Rápido de Canal / Origem */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
        <span className="text-muted-foreground font-medium text-[11px] mr-1 shrink-0">Filtrar Canal:</span>
        {[
          { id: "all", label: "Todos os Canais" },
          { id: "pos_counter", label: "Balcão / PDV" },
          { id: "mercadolivre", label: "Mercado Livre" },
          { id: "ifood", label: "iFood" },
          { id: "amazon", label: "Amazon" },
          { id: "whatsapp", label: "WhatsApp" },
          { id: "ecommerce", label: "Loja Virtual" },
        ].map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => setSelectedChannel(ch.id)}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap",
              selectedChannel === ch.id
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {ch.label}
          </button>
        ))}
      </div>

      {filteredEntries.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border/70 rounded-xl bg-card/40">
          Nenhuma movimentação registrada no canal selecionado neste turno.
        </div>
      ) : (
        <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs font-bold">Horário</TableHead>
                <TableHead className="text-xs font-bold">Origem / Canal</TableHead>
                <TableHead className="text-xs font-bold">Tipo / Método</TableHead>
                <TableHead className="text-xs font-bold">Descrição / Notas</TableHead>
                <TableHead className="text-xs font-bold text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry: any) => {
                const isNegative = entry.amount_cents < 0;
                return (
                  <TableRow key={entry.id} className="hover:bg-muted/20 text-xs">
                    <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                      {formatDateTime(entry.created_at)}
                    </TableCell>
                    <TableCell>
                      {getChannelBadge(entry.channel)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={isNegative ? "destructive" : "outline"}
                          className="text-[10px] font-mono uppercase"
                        >
                          {entry.method}
                        </Badge>
                        {entry.order_id ? (
                          <Badge variant="outline" className="text-[9px] font-semibold text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                            NF-e
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground border-border/40">
                            Não Fiscal
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-foreground font-medium">
                      <span>{entry.description || "Venda balcão / Lançamento"}</span>
                      {entry.marketplace_fee_cents && entry.marketplace_fee_cents > 0 ? (
                        <span className="block text-[10px] text-muted-foreground font-mono">
                          Taxa canal: -{formatMoney(entry.marketplace_fee_cents)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell
                      className={`text-right font-mono font-bold ${
                        isNegative
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isNegative ? "-" : "+"}
                      {formatMoney(Math.abs(entry.amount_cents))}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  ) : (
 <div className="py-12 text-center space-y-4 border border-dashed border-border/70 rounded-2xl bg-card/40">
 <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
 <ReceiptText className="size-6" />
 </div>
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground">Nenhuma movimentação neste turno</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 As vendas realizadas no Terminal PDV, sangrias e suprimentos serão listadas aqui em tempo real.
 </p>
 </div>
 <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-bold h-9">
 <Link to="/workspace/pdv">
 <Layers className="size-3.5 mr-1" />
 Ir para Terminal PDV
 </Link>
 </Button>
 </div>
 )}
 </TabsContent>

 {/* ── Conteúdo: Histórico de Turnos Anteriores ── */}
 <TabsContent value="history" className="mt-0 space-y-4">
 {history.length === 0 ? (
 <div className="py-12 text-center space-y-4 border border-dashed border-border/70 rounded-2xl bg-card/40">
 <div className="size-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
 <History className="size-6" />
 </div>
 <div className="space-y-1">
 <h3 className="text-sm font-bold text-foreground">Nenhum histórico disponível</h3>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Quando você fechar os turnos de caixa, o relatório e auditoria ficarão salvos aqui.
 </p>
 </div>
 </div>
 ) : (
 <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-2xs">
 <Table>
 <TableHeader>
 <TableRow className="bg-muted/30">
 <TableHead className="text-xs font-bold">Abertura / Fechamento</TableHead>
 <TableHead className="text-xs font-bold">Responsáveis</TableHead>
 <TableHead className="text-xs font-bold text-right">Troco Inicial</TableHead>
 <TableHead className="text-xs font-bold text-right">Esperado</TableHead>
 <TableHead className="text-xs font-bold text-right">Contado</TableHead>
 <TableHead className="text-xs font-bold text-center">Diferença</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {history.map((turn: any) => {
 const diff =
 turn.final_balance_cents !== null && turn.expected_balance_cents !== null
 ? turn.final_balance_cents - turn.expected_balance_cents
 : 0;

 return (
 <TableRow key={turn.id} className="hover:bg-muted/20 text-xs">
 <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
 <div>
 <span className="text-foreground font-semibold">
 {formatDateTime(turn.opened_at)}
 </span>
 {turn.closed_at && (
 <p className="text-[10px] text-muted-foreground">
 Até {formatDateTime(turn.closed_at)}
 </p>
 )}
 </div>
 </TableCell>
 <TableCell>
 <div className="text-foreground">
 <span>{turn.opened_by_profile?.full_name || "Operador"}</span>
 {turn.closed_by_profile && (
 <p className="text-[10px] text-muted-foreground">
 Fechado por {turn.closed_by_profile.full_name}
 </p>
 )}
 </div>
 </TableCell>
 <TableCell className="text-right font-mono">
 {formatMoney(turn.initial_balance_cents)}
 </TableCell>
 <TableCell className="text-right font-mono">
 {formatMoney(turn.expected_balance_cents ?? turn.currentBalanceCents ?? 0)}
 </TableCell>
 <TableCell className="text-right font-mono font-bold">
 {turn.final_balance_cents !== null
 ? formatMoney(turn.final_balance_cents)
 : "Em Aberto"}
 </TableCell>
 <TableCell className="text-center">
 {turn.status === "open" ? (
 <Badge variant="default" className="text-[10px]">
 Aberto
 </Badge>
 ) : diff === 0 ? (
 <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
 Exato (R$ 0,00)
 </Badge>
 ) : diff > 0 ? (
 <Badge variant="outline" className="text-[10px] text-cyan-600 border-cyan-500/30">
 Sobra +{formatMoney(diff)}
 </Badge>
 ) : (
 <Badge variant="destructive" className="text-[10px]">
 Falta -{formatMoney(Math.abs(diff))}
 </Badge>
 )}
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>
 )}
 </TabsContent>
 </Tabs>

 {/* ── Side Sheet: Abertura de Turno ── */}
 <Sheet open={isOpenModalOpen} onOpenChange={setIsOpenModalOpen}>
 <SheetContent side="right" className="sm:max-w-xl w-full flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border">
 <SheetHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
 <div className="flex items-center gap-2.5">
 <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
 <Play className="size-4.5" />
 </div>
 <div>
 <SheetTitle className="text-base font-bold text-foreground">
 Abrir Turno de Caixa
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground mt-0.5">
 Informe o fundo de troco inicial disponível na gaveta.
 </SheetDescription>
 </div>
 </div>
 </SheetHeader>

 <Form {...openForm}>
 <form onSubmit={openForm.handleSubmit(handleOpenRegister)} className="flex-1 flex flex-col justify-between">
 <div className="p-6 space-y-4 overflow-y-auto no-scrollbar">
 <FormField
 control={openForm.control}
 name="initialBalance"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-xs font-bold text-foreground">
 Fundo de Troco Inicial (R$) *
 </FormLabel>
 <FormControl>
 <Input
 placeholder="100,00"
 {...field}
 className="h-10 text-sm font-mono rounded-xl"
 autoFocus
 />
 </FormControl>
 <FormMessage className="text-xs" />
 </FormItem>
 )}
 />

 <FormField
 control={openForm.control}
 name="notes"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-xs font-bold text-foreground">
 Observações de Abertura (Opcional)
 </FormLabel>
 <FormControl>
 <Textarea
 placeholder="Ex: Turno da manhã, notas de 10 e 20..."
 {...field}
 rows={3}
 className="text-xs rounded-xl"
 />
 </FormControl>
 <FormMessage className="text-xs" />
 </FormItem>
 )}
 />
 </div>

 <SheetFooter className="p-4 border-t border-border/80 bg-muted/10 gap-2 sm:gap-0">
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsOpenModalOpen(false)}
 className="h-10 rounded-xl text-xs"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 className="h-10 rounded-xl text-xs font-bold bg-primary text-primary-foreground"
 >
 {isSubmitting ? "Abrindo..." : "Confirmar Abertura"}
 </Button>
 </SheetFooter>
 </form>
 </Form>
 </SheetContent>
 </Sheet>

 {/* ── Side Sheet: Fechamento de Turno ── */}
 <Sheet open={isCloseModalOpen} onOpenChange={setIsCloseModalOpen}>
 <SheetContent side="right" className="sm:max-w-xl w-full flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border">
 <SheetHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
 <div className="flex items-center gap-2.5">
 <div className="size-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
 <Lock className="size-4.5" />
 </div>
 <div>
 <SheetTitle className="text-base font-bold text-foreground">
 Fechamento de Turno
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground mt-0.5">
 Faça a contagem cega do dinheiro na gaveta para auditoria.
 </SheetDescription>
 </div>
 </div>
 </SheetHeader>

 <Form {...closeForm}>
 <form onSubmit={closeForm.handleSubmit(handleCloseRegister)} className="flex-1 flex flex-col justify-between">
 <div className="p-6 space-y-4 overflow-y-auto no-scrollbar">
 <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
 <span className="text-[11px] font-bold text-muted-foreground block">
 Saldo Esperado em Dinheiro:
 </span>
 <span className="text-lg font-mono font-bold text-foreground">
 {formatMoney(register?.cashBalanceCents ?? register?.currentBalanceCents ?? 0)}
 </span>
 </div>

 <FormField
 control={closeForm.control}
 name="countedBalance"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-xs font-bold text-foreground">
 Valor Total Contado na Gaveta (R$) *
 </FormLabel>
 <FormControl>
 <Input
 placeholder="Informe o dinheiro contado"
 {...field}
 className="h-10 text-sm font-mono rounded-xl"
 autoFocus
 />
 </FormControl>
 <FormMessage className="text-xs" />
 </FormItem>
 )}
 />

 <FormField
 control={closeForm.control}
 name="notes"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-xs font-bold text-foreground">
 Justificativa / Observações (Opcional)
 </FormLabel>
 <FormControl>
 <Textarea
 placeholder="Ex: Diferença de troco para cliente, sangria não registrada..."
 {...field}
 rows={3}
 className="text-xs rounded-xl"
 />
 </FormControl>
 <FormMessage className="text-xs" />
 </FormItem>
 )}
 />
 </div>

 <SheetFooter className="p-4 border-t border-border/80 bg-muted/10 gap-2 sm:gap-0">
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsCloseModalOpen(false)}
 className="h-10 rounded-xl text-xs"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 variant="destructive"
 className="h-10 rounded-xl text-xs font-bold"
 >
 {isSubmitting ? "Fechando..." : "Confirmar Fechamento"}
 </Button>
 </SheetFooter>
 </form>
 </Form>
 </SheetContent>
 </Sheet>

 {/* ── Side Sheet: Sangria ou Suprimento ── */}
 <Sheet open={isMovementModalOpen} onOpenChange={setIsMovementModalOpen}>
 <SheetContent side="right" className="sm:max-w-xl w-full flex flex-col p-0 gap-0 overflow-hidden bg-card border-l border-border">
 <SheetHeader className="p-6 pb-4 border-b border-border/80 bg-muted/20">
 <div className="flex items-center gap-2.5">
 <div
 className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${
 movementType === "sangria"
 ? "bg-rose-500/10 text-rose-500"
 : "bg-emerald-500/10 text-emerald-500"
 }`}
 >
 {movementType === "sangria" ? (
 <ArrowUpRight className="size-4.5" />
 ) : (
 <ArrowDownLeft className="size-4.5" />
 )}
 </div>
 <div>
 <SheetTitle className="text-base font-bold text-foreground">
 {movementType === "sangria" ? "Registrar Sangria" : "Registrar Suprimento"}
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground mt-0.5">
 {movementType === "sangria"
 ? "Retirada de dinheiro da gaveta (depósito ou despesa)."
 : "Reforço ou entrada de troco na gaveta."}
 </SheetDescription>
 </div>
 </div>
 </SheetHeader>

 <Form {...movementForm}>
 <form onSubmit={movementForm.handleSubmit(handleMovement)} className="flex-1 flex flex-col justify-between">
 <div className="p-6 space-y-4 overflow-y-auto no-scrollbar">
 <FormField
 control={movementForm.control}
 name="amount"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-xs font-bold text-foreground">Valor (R$) *</FormLabel>
 <FormControl>
 <Input
 placeholder="Ex: 50,00"
 {...field}
 className="h-10 text-sm font-mono rounded-xl"
 autoFocus
 />
 </FormControl>
 <FormMessage className="text-xs" />
 </FormItem>
 )}
 />

 <FormField
 control={movementForm.control}
 name="description"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-xs font-bold text-foreground">
 Motivo / Justificativa *
 </FormLabel>
 <FormControl>
 <Input
 placeholder={
 movementType === "sangria"
 ? "Ex: Pagamento fornecedor pão, depósito cofre..."
 : "Ex: Troco moedas 1 real, reforço inicial..."
 }
 {...field}
 className="h-10 text-xs rounded-xl"
 />
 </FormControl>
 <FormMessage className="text-xs" />
 </FormItem>
 )}
 />
 </div>

 <SheetFooter className="p-4 border-t border-border/80 bg-muted/10 gap-2 sm:gap-0">
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsMovementModalOpen(false)}
 className="h-10 rounded-xl text-xs"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 className="h-10 rounded-xl text-xs font-bold bg-primary text-primary-foreground"
 >
 {isSubmitting ? "Processando..." : "Confirmar Movimentação"}
 </Button>
 </SheetFooter>
 </form>
 </Form>
 </SheetContent>
 </Sheet>
 </div>
 );
}
