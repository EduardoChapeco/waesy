import React, { useState, useEffect } from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight, Plus, Trash2, Receipt, DollarSign, Fuel, Utensils, CreditCard, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import { listTourCashEntries, createTourCashEntry, deleteTourCashEntry, getTourCashSummary, type TourCashEntryItem } from "@/services/group-tour-cash.functions";

interface GroupTourCashLedgerProps {
 tourId: string;
 storeId: string;
}

const CATEGORY_MAP: Record<string, { label: string; icon: any }> = {
 advance: { label: "Adiantamento de Caixa", icon: Wallet },
 toll: { label: "Pedágio", icon: Receipt },
 fuel: { label: "Combustível", icon: Fuel },
 meal: { label: "Alimentação Motorista/Guia", icon: Utensils },
 parking: { label: "Estacionamento", icon: Receipt },
 tips: { label: "Gorjetas", icon: Coins },
 passenger_payment: { label: "Recebimento Local de PAX", icon: ArrowDownLeft },
 pharmacy: { label: "Farmácia / Emergência", icon: Receipt },
 other: { label: "Outros Gastos", icon: DollarSign },
};

const PAYMENT_METHODS: Record<string, string> = {
 cash: "Dinheiro em Espécie",
 pix: "PIX",
 corporate_card: "Cartão Corporativo",
 other: "Outro",
};

export function GroupTourCashLedger({ tourId, storeId }: GroupTourCashLedgerProps) {
 const [entries, setEntries] = useState<TourCashEntryItem[]>([]);
 const [summary, setSummary] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 // Modal
 const [modalOpen, setModalOpen] = useState(false);
 const [entryType, setEntryType] = useState<"inflow" | "outflow">("outflow");
 const [category, setCategory] = useState("toll");
 const [description, setDescription] = useState("");
 const [amountStr, setAmountStr] = useState("");
 const [paymentMethod, setPaymentMethod] = useState<any>("cash");
 const [submitting, setSubmitting] = useState(false);

 const loadData = async () => {
 try {
 setLoading(true);
 const [items, sum] = await Promise.all([
 listTourCashEntries({ data: { store_id: storeId, tour_id: tourId } }),
 getTourCashSummary({ data: { store_id: storeId, tour_id: tourId } }),
 ]);
 setEntries(items);
 setSummary(sum);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao carregar caixa da viagem");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 if (storeId && tourId) {
 loadData();
 }
 }, [storeId, tourId]);

 const handleCreateEntry = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!description.trim()) return toast.error("Informe a descrição do lançamento");

 const valFloat = parseFloat(amountStr.replace(",", "."));
 if (isNaN(valFloat) || valFloat <= 0) {
 return toast.error("Informe um valor válido maior que zero");
 }

 const amountCents = Math.round(valFloat * 100);

 try {
 setSubmitting(true);
 await createTourCashEntry({
 data: {
 store_id: storeId,
 tour_id: tourId,
 entry_type: entryType,
 category,
 description: description.trim(),
 amount_cents: amountCents,
 payment_method: paymentMethod,
 },
 });

 toast.success("Lançamento adicionado ao caixa!");
 setModalOpen(false);
 setDescription("");
 setAmountStr("");
 loadData();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao lançar no caixa");
 } finally {
 setSubmitting(false);
 }
 };

 const handleDeleteEntry = async (id: string) => {
 if (!window.confirm("Deseja realmente remover este lançamento?")) return;
 try {
 await deleteTourCashEntry({ data: { store_id: storeId, entry_id: id } });
 toast.success("Lançamento removido");
 loadData();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao remover lançamento");
 }
 };

 const openNewEntry = (type: "inflow" | "outflow") => {
 setEntryType(type);
 setCategory(type === "inflow" ? "advance" : "toll");
 setModalOpen(true);
 };

 const balance = summary?.currentBalanceCents ?? 0;

 return (
 <div className="space-y-6">
 {/* ── 1. Resumo do Caixa da Viagem ── */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
 {/* Saldo Disponível */}
 <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-xs font-semibold">Saldo Atual em Viagem</span>
 <Wallet className="size-4 text-primary" />
 </div>
 <p
 className={`text-2xl font-extrabold font-mono ${
 balance >= 0 ? "text-emerald-600" : "text-rose-600"
 }`}
 >
 {formatMoney(balance)}
 </p>
 <p className="text-[11px] text-muted-foreground">Dinheiro disponível com o guia/motorista</p>
 </div>

 {/* Total de Entradas */}
 <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-xs font-semibold">Total Suprimentos / Entradas</span>
 <ArrowDownLeft className="size-4 text-emerald-500" />
 </div>
 <p className="text-2xl font-extrabold text-foreground font-mono">
 {formatMoney(summary?.totalInflowsCents ?? 0)}
 </p>
 <p className="text-[11px] text-muted-foreground">Adiantamentos e recebimentos no ônibus</p>
 </div>

 {/* Total de Saídas */}
 <div className="p-4 rounded-lg bg-card border border-border/70 space-y-1">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-xs font-semibold">Total Despesas Pagas</span>
 <ArrowUpRight className="size-4 text-rose-500" />
 </div>
 <p className="text-2xl font-extrabold text-foreground font-mono">
 {formatMoney(summary?.totalOutflowsCents ?? 0)}
 </p>
 <p className="text-[11px] text-muted-foreground">Pedágios, alimentação e despesas locais</p>
 </div>
 </div>

 {/* ── 2. Lista de Lançamentos do Caixa ── */}
 <div className="p-5 rounded-lg bg-card border border-border/70 space-y-4">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <h3 className="text-sm font-bold text-foreground">Livro Caixa da Excursão</h3>
 <p className="text-xs text-muted-foreground">
 Histórico detalhado de entradas e saídas durante a viagem para prestação de contas.
 </p>
 </div>

 <div className="flex items-center gap-2">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => openNewEntry("inflow")}
 className="h-9 px-3 rounded-lg text-xs font-bold gap-2 cursor-pointer text-emerald-600 hover:text-emerald-700"
 >
 <ArrowDownLeft className="size-3.5" /> Adicionar Suprimento
 </Button>

 <Button
 type="button"
 size="sm"
 onClick={() => openNewEntry("outflow")}
 className="h-9 px-3 rounded-lg text-xs font-bold gap-2 cursor-pointer shadow-xs"
 >
 <Plus className="size-3.5" /> Lançar Despesa
 </Button>
 </div>
 </div>

 {/* Itens do Caixa */}
 <div className="space-y-2">
 {entries.map((item) => {
 const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.other;
 const isInflow = item.entry_type === "inflow";

 return (
 <div
 key={item.id}
 className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/15 hover:bg-muted/30 transition-colors"
 >
 <div className="flex items-center gap-3 min-w-0 flex-1">
 <div
 className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${
 isInflow
 ? "bg-emerald-500/10 text-emerald-600"
 : "bg-rose-500/10 text-rose-600"
 }`}
 >
 {isInflow ? (
 <ArrowDownLeft className="size-4" />
 ) : (
 <ArrowUpRight className="size-4" />
 )}
 </div>

 <div className="space-y-1 min-w-0 flex-1">
 <p className="text-xs font-semibold text-foreground truncate">
 {item.description}
 </p>
 <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
 <span>{cat.label}</span>
 <span>•</span>
 <span>{PAYMENT_METHODS[item.payment_method] || item.payment_method}</span>
 <span>•</span>
 <span>{new Date(item.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
 </div>
 </div>
 </div>

 <div className="flex items-center gap-3 shrink-0">
 <span
 className={`font-mono font-bold text-xs ${
 isInflow ? "text-emerald-600" : "text-rose-600"
 }`}
 >
 {isInflow ? "+" : "-"} {formatMoney(item.amount_cents)}
 </span>

 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleDeleteEntry(item.id)}
 className="size-7 rounded-lg text-muted-foreground hover:text-rose-600 cursor-pointer"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 );
 })}

 {entries.length === 0 && (
 <div className="p-8 text-center rounded-lg border border-dashed border-border/70 text-xs text-muted-foreground">
 Nenhum lançamento no caixa desta viagem. Lance adiantamentos ou despesas em trânsito.
 </div>
 )}
 </div>
 </div>

 {/* ── 3. Modal de Lançamento ── */}
 <Dialog open={modalOpen} onOpenChange={setModalOpen}>
 <DialogContent className="sm:max-w-md rounded-lg border-border/70 bg-card p-5 space-y-4">
 <DialogHeader>
 <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
 <Wallet className="size-4 text-primary" />
 {entryType === "inflow" ? "Novo Suprimento / Entrada" : "Lançamento de Despesa"}
 </DialogTitle>
 </DialogHeader>

 <form onSubmit={handleCreateEntry} className="space-y-4">
 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">Categoria *</label>
 <select
 value={category}
 onChange={(e) => setCategory(e.target.value)}
 className="w-full h-10 px-3 rounded-lg border border-input bg-background text-xs font-semibold text-foreground focus:outline-none"
 >
 {entryType === "inflow" ? (
 <>
 <option value="advance">Adiantamento da Agência</option>
 <option value="passenger_payment">Recebimento de Passageiro</option>
 <option value="other">Outra Entrada</option>
 </>
 ) : (
 <>
 <option value="toll">Pedágio Rodoviário</option>
 <option value="fuel">Abastecimento / Diesel</option>
 <option value="meal">Alimentação Motorista / Guia</option>
 <option value="parking">Estacionamento</option>
 <option value="tips">Gorjetas / Guias Locais</option>
 <option value="pharmacy">Farmácia / Emergência Médica</option>
 <option value="other">Outros Gastos Operacionais</option>
 </>
 )}
 </select>
 </div>

 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">Descrição do Gasto *</label>
 <Input
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="Ex: Pedágio praça Palhoça km 220"
 className="h-10 text-xs rounded-lg"
 autoFocus
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">Valor (R$) *</label>
 <Input
 value={amountStr}
 onChange={(e) => setAmountStr(e.target.value)}
 placeholder="Ex: 58,50"
 className="h-10 text-xs rounded-lg font-mono"
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-semibold text-foreground">Forma de Pagamento</label>
 <select
 value={paymentMethod}
 onChange={(e) => setPaymentMethod(e.target.value)}
 className="w-full h-10 px-2 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none"
 >
 <option value="cash">Dinheiro em Espécie</option>
 <option value="pix">PIX</option>
 <option value="corporate_card">Cartão Corporativo</option>
 <option value="other">Outro</option>
 </select>
 </div>
 </div>

 <DialogFooter className="pt-2">
 <Button
 type="submit"
 disabled={submitting || !description.trim() || !amountStr.trim()}
 className="w-full h-10 rounded-lg text-xs font-bold cursor-pointer"
 >
 {submitting ? "Registrando..." : "Confirmar Lançamento"}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 </div>
 );
}
