import React, { useState, useEffect } from "react";
import { Plus, Trash2, DollarSign, TrendingUp, Users, Calculator, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";
import { listGroupTourCosts, createGroupTourCost, deleteGroupTourCost, getGroupTourBudgetSummary, type GroupTourCostItem } from "@/services/group-tours.functions";

interface GroupTourBudgetProps {
 tourId: string;
 tourPriceCents: number;
 totalSeats: number;
 passengersCount: number;
}

const CATEGORY_LABELS: Record<string, { label: string; className: string }> = {
 transport: { label: "Transporte / Ônibus", className: "bg-sky-500/10 text-sky-600 border-sky-500/30" },
 hotel: { label: "Hospedagem / Hotel", className: "bg-indigo-500/10 text-indigo-600 border-indigo-500/30" },
 insurance: { label: "Seguro Viagem", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
 tickets: { label: "Ingressos / Passeios", className: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
 guide: { label: "Guia Local", className: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
 food: { label: "Alimentação / Refeições", className: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
 other: { label: "Outros Custos", className: "bg-muted text-muted-foreground border-border" },
};

export function GroupTourBudgetManager({
 tourId,
 tourPriceCents,
 totalSeats,
 passengersCount,
}: GroupTourBudgetProps) {
 const [costs, setCosts] = useState<GroupTourCostItem[]>([]);
 const [summary, setSummary] = useState<any>(null);
 const [loading, setLoading] = useState(true);

 const [modalOpen, setModalOpen] = useState(false);
 const [category, setCategory] = useState<any>("transport");
 const [description, setDescription] = useState("");
 const [amountStr, setAmountStr] = useState("");
 const [isFixed, setIsFixed] = useState(true);
 const [submitting, setSubmitting] = useState(false);

 const loadBudget = async () => {
 try {
 setLoading(true);
 const [items, sum] = await Promise.all([
 listGroupTourCosts({ data: { tour_id: tourId } }),
 getGroupTourBudgetSummary({ data: { tour_id: tourId, price_cents: tourPriceCents } }),
 ]);
 setCosts(items);
 setSummary(sum);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao carregar orçamento");
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 loadBudget();
 }, [tourId, tourPriceCents]);

 const handleCreateCost = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!description.trim()) {
 toast.error("Informe a descrição do custo");
 return;
 }

 const valFloat = parseFloat(amountStr.replace(",", "."));
 if (isNaN(valFloat) || valFloat <= 0) {
 toast.error("Informe um valor válido maior que zero");
 return;
 }

 const costCents = Math.round(valFloat * 100);

 try {
 setSubmitting(true);
 await createGroupTourCost({
 data: {
 tour_id: tourId,
 category,
 description: description.trim(),
 cost_cents: costCents,
 is_fixed: isFixed,
 },
 });

 toast.success("Custo operacional adicionado!");
 setModalOpen(false);
 setDescription("");
 setAmountStr("");
 setIsFixed(true);
 loadBudget();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao adicionar custo");
 } finally {
 setSubmitting(false);
 }
 };

 const handleDeleteCost = async (id: string) => {
 if (!window.confirm("Deseja realmente remover este custo?")) return;

 try {
 await deleteGroupTourCost({ data: { cost_id: id } });
 toast.success("Custo removido");
 loadBudget();
 } catch (err: any) {
 toast.error(err?.message || "Erro ao remover custo");
 }
 };

 // Cálculos de Projeção em Tempo Real
 const totalRevenueCurrent = passengersCount * tourPriceCents;
 const totalRevenueCapacity = totalSeats * tourPriceCents;

 const totalFixedCosts = summary?.totalFixedCents || 0;
 const variablePerPax = summary?.variablePerPaxCents || 0;

 const totalCostsCurrent = totalFixedCosts + passengersCount * variablePerPax;
 const netProfitCurrent = totalRevenueCurrent - totalCostsCurrent;

 const totalCostsCapacity = totalFixedCosts + totalSeats * variablePerPax;
 const netProfitCapacity = totalRevenueCapacity - totalCostsCapacity;

 return (
 <div className="space-y-6">
 {/* ── 1. Painel de Indicadores de Rentabilidade ── */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
 {/* Custos Fixos Totais */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-xs font-semibold">Custos Fixos</span>
 <Calculator className="size-4 text-sky-500" />
 </div>
 <p className="text-xl sm:text-2xl font-extrabold text-foreground font-mono">
 {formatMoney(totalFixedCosts)}
 </p>
 <p className="text-[11px] text-muted-foreground">Ônibus, guias e despesas fixas</p>
 </div>

 {/* Custo Variável por Passageiro */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-xs font-semibold">Custo / Passageiro</span>
 <Users className="size-4 text-indigo-500" />
 </div>
 <p className="text-xl sm:text-2xl font-extrabold text-foreground font-mono">
 {formatMoney(variablePerPax)}
 </p>
 <p className="text-[11px] text-muted-foreground">Ingressos, kit e seguro individual</p>
 </div>

 {/* Ponto de Equilíbrio (Break-Even) */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-xs font-semibold">Break-Even (Mínimo)</span>
 <ShieldCheck className="size-4 text-amber-500" />
 </div>
 <p className="text-xl sm:text-2xl font-extrabold text-foreground font-mono text-amber-600">
 {summary?.breakEvenPax ?? 0} passageiros
 </p>
 <p className="text-[11px] text-muted-foreground">
 Mínimo para zerar os custos da viagem
 </p>
 </div>

 {/* Lucro Líquido Atual */}
 <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1">
 <div className="flex items-center justify-between text-muted-foreground">
 <span className="text-xs font-semibold">Resultado Atual</span>
 <TrendingUp
 className={netProfitCurrent >= 0 ? "size-4 text-emerald-500" : "size-4 text-rose-500"}
 />
 </div>
 <p
 className={`text-xl sm:text-2xl font-extrabold font-mono ${
 netProfitCurrent >= 0 ? "text-emerald-600" : "text-rose-600"
 }`}
 >
 {formatMoney(netProfitCurrent)}
 </p>
 <p className="text-[11px] text-muted-foreground">
 Potencial total: {formatMoney(netProfitCapacity)}
 </p>
 </div>
 </div>

 {/* ── 2. Lista de Custos & Ação de Adicionar ── */}
 <div className="p-5 rounded-2xl bg-card border border-border/70 space-y-4">
 <div className="flex items-center justify-between">
 <div>
 <h3 className="text-sm font-bold text-foreground">Detalhamento dos Custos da Viagem</h3>
 <p className="text-xs text-muted-foreground">
 Cadastre todos os gastos contratados para cálculo automático da margem de lucro.
 </p>
 </div>

 <Button
 type="button"
 onClick={() => setModalOpen(true)}
 className="h-9 px-3.5 rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
 >
 <Plus className="size-3.5" /> Adicionar Custo
 </Button>
 </div>

 {/* Tabela de Itens de Custo */}
 <div className="space-y-2">
 {costs.map((item) => {
 const cat = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.other;
 return (
 <div
 key={item.id}
 className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/15 hover:bg-muted/30 transition-colors"
 >
 <div className="flex items-center gap-3 min-w-0 flex-1">
 <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${cat.className}`}>
 {cat.label}
 </Badge>

 <div className="space-y-0.5 min-w-0 flex-1">
 <p className="text-xs font-semibold text-foreground truncate">
 {item.description}
 </p>
 <p className="text-[10px] text-muted-foreground font-mono">
 {item.is_fixed ? "Custo Fixo do Grupo" : "Custo Variável (Por Passageiro)"}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-3 shrink-0">
 <span className="font-mono font-bold text-xs text-foreground">
 {formatMoney(item.cost_cents)}
 </span>

 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => handleDeleteCost(item.id)}
 className="size-7 rounded-lg text-muted-foreground hover:text-rose-600 cursor-pointer"
 >
 <Trash2 className="size-3.5" />
 </Button>
 </div>
 </div>
 );
 })}

 {costs.length === 0 && (
 <div className="p-8 text-center rounded-xl border border-dashed border-border/70 text-xs text-muted-foreground">
 Nenhum custo cadastrado. Adicione a locação do ônibus, diárias do hotel e ingressos para calcular a margem.
 </div>
 )}
 </div>
 </div>

 {/* ── 3. Modal de Adicionar Custo ── */}
 <Dialog open={modalOpen} onOpenChange={setModalOpen}>
 <DialogContent className="sm:max-w-md rounded-2xl border-border/70 bg-card p-5 space-y-4">
 <DialogHeader>
 <DialogTitle className="text-base font-bold text-foreground">
 Novo Custo Operacional
 </DialogTitle>
 </DialogHeader>

 <form onSubmit={handleCreateCost} className="space-y-4">
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-foreground">Categoria</label>
 <select
 value={category}
 onChange={(e) => setCategory(e.target.value)}
 className="w-full h-11 px-3 rounded-xl border border-input bg-background text-xs font-semibold text-foreground focus:outline-none"
 >
 <option value="transport">Transporte / Ônibus</option>
 <option value="hotel">Hospedagem / Hotel</option>
 <option value="insurance">Seguro Viagem</option>
 <option value="tickets">Ingressos / Passeios</option>
 <option value="guide">Guia Local</option>
 <option value="food">Alimentação / Refeições</option>
 <option value="other">Outros Custos</option>
 </select>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-foreground">Descrição do Item *</label>
 <Input
 value={description}
 onChange={(e) => setDescription(e.target.value)}
 placeholder="Ex: Fretamento de Ônibus Leito Marcopolo (3 dias)"
 className="h-11 rounded-xl text-xs"
 autoFocus
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-foreground">Valor (R$) *</label>
 <Input
 type="text"
 value={amountStr}
 onChange={(e) => setAmountStr(e.target.value)}
 placeholder="Ex: 4500,00"
 className="h-11 rounded-xl text-xs font-mono"
 />
 </div>

 <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/60">
 <div className="space-y-0.5">
 <p className="text-xs font-semibold text-foreground">Tipo de Custo</p>
 <p className="text-[10px] text-muted-foreground">
 {isFixed
 ? "Fixo: pago integralmente independentemente do nº de passageiros"
 : "Variável: multiplicado pelo número de passageiros que viajarem"}
 </p>
 </div>
 <Button
 type="button"
 variant={isFixed ? "default" : "outline"}
 size="sm"
 onClick={() => setIsFixed(!isFixed)}
 className="h-8 px-3 rounded-lg text-xs cursor-pointer"
 >
 {isFixed ? "Fixo" : "Por PAX"}
 </Button>
 </div>

 <DialogFooter className="pt-2 flex items-center justify-end gap-2">
 <Button
 type="button"
 variant="ghost"
 onClick={() => setModalOpen(false)}
 disabled={submitting}
 className="h-10 px-4 rounded-xl text-xs cursor-pointer"
 >
 Cancelar
 </Button>
 <Button
 type="submit"
 disabled={submitting || !description.trim() || !amountStr.trim()}
 className="h-10 px-5 rounded-xl text-xs font-semibold cursor-pointer"
 >
 {submitting ? "Adicionando..." : "Salvar Custo"}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 </div>
 );
}
