import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, CheckCircle2, FileText, Layers, ArrowUpRight, Calculator, Building } from "lucide-react";
import { toast } from "sonner";
import { listEventBudgets, upsertEventBudget, deleteEventBudget } from "@/services/events.functions";

interface EventoOrcamentosProps {
  eventId: string;
}

const CATEGORIAS_DESPESA = [
  "Sonorização & Iluminação",
  "Palco & Estruturas",
  "Segurança Privada & Brigada",
  "Alvarás, AVCB & Licenças",
  "Gerador & Combustível",
  "Ambulância & Equipe Médica",
  "Limpeza & Resíduos",
  "Cache & Logística Artística",
  "Marketing & Divulgação",
  "Bebidas & Estoque Bar",
  "Outros Fornecedores",
];

const CATEGORIAS_RECEITA = [
  "Venda de Ingressos (Bilheteria)",
  "Cotas de Patrocínio",
  "Consumo de Bar & Praça de Alimentação",
  "Estacionamento & Guarda-Volumes",
  "Merchandising & Souvenirs",
  "Outras Receitas",
];

export function EventoOrcamentos({ eventId }: EventoOrcamentosProps) {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modal de Item do Orçamento
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemType, setItemType] = useState<"despesa" | "receita">("despesa");
  const [itemCategory, setItemCategory] = useState(CATEGORIAS_DESPESA[0]);
  const [itemDescription, setItemDescription] = useState("");
  const [itemValue, setItemValue] = useState("");

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const res = await listEventBudgets({ data: { eventId } });
      setBudgets(res || []);
      if (res && res.length > 0) {
        setSelectedBudget(res[0]);
      } else {
        setSelectedBudget(null);
      }
    } catch (err: any) {
      toast.error("Erro ao carregar orçamentos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      loadBudgets();
    }
  }, [eventId]);

  const handleCreateNewVersion = async () => {
    const nextVersion = (budgets.length > 0 ? Math.max(...budgets.map((b) => b.versao || 1)) : 0) + 1;
    startTransition(async () => {
      try {
        const created = await upsertEventBudget({
          data: {
            eventId,
            versao: nextVersion,
            status: "rascunho",
            totalReceitas: 0,
            totalDespesas: 0,
            margemLucro: 0,
            itens: [
              { id: "1", tipo: "despesa", categoria: "Sonorização & Iluminação", descricao: "PA Palco Principal", valor: 15000 },
              { id: "2", tipo: "despesa", categoria: "Segurança Privada & Brigada", descricao: "Equipe de 12 agentes", valor: 8500 },
            ],
            observacoes: `Orçamento de Planejamento - Versão ${nextVersion}`,
          },
        });
        toast.success(`Orçamento Versão ${nextVersion} criado!`);
        loadBudgets();
      } catch (err: any) {
        toast.error("Erro ao criar orçamento: " + err.message);
      }
    });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBudget) return;
    const numVal = parseFloat(itemValue.replace(/\./g, "").replace(",", "."));
    if (isNaN(numVal) || numVal <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    const newItem = {
      id: "item-" + Date.now(),
      tipo: itemType,
      categoria: itemCategory,
      descricao: itemDescription.trim() || itemCategory,
      valor: numVal,
    };

    const currentItems = Array.isArray(selectedBudget.itens) ? selectedBudget.itens : [];
    const updatedItems = [...currentItems, newItem];

    // Recalcular totais
    const totalReceitas = updatedItems
      .filter((i: any) => i.tipo === "receita")
      .reduce((acc: number, i: any) => acc + (i.valor || 0), 0);
    const totalDespesas = updatedItems
      .filter((i: any) => i.tipo === "despesa")
      .reduce((acc: number, i: any) => acc + (i.valor || 0), 0);
    const margemLucro = totalReceitas - totalDespesas;

    startTransition(async () => {
      try {
        const updated = await upsertEventBudget({
          data: {
            id: selectedBudget.id,
            eventId,
            versao: selectedBudget.versao,
            status: selectedBudget.status,
            totalReceitas,
            totalDespesas,
            margemLucro,
            itens: updatedItems,
            observacoes: selectedBudget.observacoes,
          },
        });
        toast.success("Item adicionado ao orçamento!");
        setSelectedBudget(updated);
        setIsItemModalOpen(false);
        setItemDescription("");
        setItemValue("");
        loadBudgets();
      } catch (err: any) {
        toast.error("Erro ao salvar: " + err.message);
      }
    });
  };

  const handleRemoveItem = (itemId: string) => {
    if (!selectedBudget) return;
    const currentItems = Array.isArray(selectedBudget.itens) ? selectedBudget.itens : [];
    const updatedItems = currentItems.filter((i: any) => i.id !== itemId);

    const totalReceitas = updatedItems
      .filter((i: any) => i.tipo === "receita")
      .reduce((acc: number, i: any) => acc + (i.valor || 0), 0);
    const totalDespesas = updatedItems
      .filter((i: any) => i.tipo === "despesa")
      .reduce((acc: number, i: any) => acc + (i.valor || 0), 0);
    const margemLucro = totalReceitas - totalDespesas;

    startTransition(async () => {
      try {
        const updated = await upsertEventBudget({
          data: {
            id: selectedBudget.id,
            eventId,
            versao: selectedBudget.versao,
            status: selectedBudget.status,
            totalReceitas,
            totalDespesas,
            margemLucro,
            itens: updatedItems,
            observacoes: selectedBudget.observacoes,
          },
        });
        toast.success("Item removido.");
        setSelectedBudget(updated);
        loadBudgets();
      } catch (err: any) {
        toast.error("Erro: " + err.message);
      }
    });
  };

  const handleToggleStatus = async () => {
    if (!selectedBudget) return;
    const nextStatus = selectedBudget.status === "aprovado" ? "rascunho" : "aprovado";
    startTransition(async () => {
      try {
        const updated = await upsertEventBudget({
          data: {
            id: selectedBudget.id,
            eventId,
            versao: selectedBudget.versao,
            status: nextStatus,
            totalReceitas: selectedBudget.total_receitas || 0,
            totalDespesas: selectedBudget.total_despesas || 0,
            margemLucro: selectedBudget.margem_lucro || 0,
            itens: selectedBudget.itens || [],
            observacoes: selectedBudget.observacoes,
          },
        });
        toast.success(`Orçamento marcado como ${nextStatus === "aprovado" ? "Aprovado" : "Rascunho"}!`);
        setSelectedBudget(updated);
        loadBudgets();
      } catch (err: any) {
        toast.error("Erro ao alterar status: " + err.message);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm gap-2">
        <Layers className="size-4 animate-spin" />
        <span>Carregando orçamentos e fornecedores...</span>
      </div>
    );
  }

  const items = Array.isArray(selectedBudget?.itens) ? selectedBudget.itens : [];
  const despesas = items.filter((i: any) => i.tipo === "despesa");
  const receitas = items.filter((i: any) => i.tipo === "receita");
  const totalDesp = despesas.reduce((a: number, b: any) => a + (b.valor || 0), 0);
  const totalRec = receitas.reduce((a: number, b: any) => a + (b.valor || 0), 0);
  const saldo = totalRec - totalDesp;

  return (
    <div className="space-y-6">
      {/* Header com Seletor de Versão e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border/70 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">
              Orçamento Executivo
            </h3>
            {selectedBudget && (
              <Badge
                className={
                  selectedBudget.status === "aprovado"
                    ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-bold"
                    : "bg-amber-500/15 text-amber-600 border border-amber-500/30 text-xs font-bold"
                }
              >
                {selectedBudget.status === "aprovado" ? "Aprovado" : "Rascunho"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            DRE projetado, fornecedores contratados, custos fixos e margem líquida.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de Versões */}
          {budgets.length > 0 && (
            <Select
              value={selectedBudget?.id}
              onValueChange={(id) => setSelectedBudget(budgets.find((b) => b.id === id))}
            >
              <SelectTrigger className="h-11 rounded-xl text-xs w-[140px]">
                <SelectValue placeholder="Versão" />
              </SelectTrigger>
              <SelectContent>
                {budgets.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs font-medium">
                    Versão {b.versao} ({b.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            onClick={handleCreateNewVersion}
            disabled={isPending}
            className="h-11 rounded-xl text-xs font-bold gap-1.5"
          >
            <Plus className="size-3.5" />
            <span>Nova Versão</span>
          </Button>

          {selectedBudget && (
            <Button
              variant={selectedBudget.status === "aprovado" ? "secondary" : "default"}
              onClick={handleToggleStatus}
              disabled={isPending}
              className="h-11 rounded-xl text-xs font-bold gap-1.5"
            >
              <CheckCircle2 className="size-3.5" />
              <span>{selectedBudget.status === "aprovado" ? "Reabrir Rascunho" : "Aprovar Versão"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Cards de Métricas Financeiras Apple HIG */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Receitas Projetadas</span>
            <TrendingUp className="size-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">
            {totalRec.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {receitas.length} fonte(s) de receita
          </p>
        </Card>

        <Card className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Custos e Fornecedores</span>
            <TrendingDown className="size-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
            {totalDesp.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {despesas.length} item(ns) de despesa
          </p>
        </Card>

        <Card className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Resultado / Margem</span>
            <Calculator className="size-4 text-primary" />
          </div>
          <p
            className={`text-2xl font-bold mt-2 ${
              saldo >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Margem de lucro estimada
          </p>
        </Card>
      </div>

      {/* Botão de Adicionar Item & Tabela de Itens */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Estrutura Analítica de Custos e Receitas
        </h4>

        {selectedBudget && (
          <Sheet open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="h-9 rounded-xl text-xs font-bold gap-1.5">
                <Plus className="size-3.5" />
                <span>Adicionar Lançamento</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-6">
              <SheetHeader>
                <SheetTitle className="text-lg font-bold">Novo Lançamento Orçamentário</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Insira um contrato com fornecedor, custo fixo ou projeção de receita.
                </SheetDescription>
              </SheetHeader>

              <form onSubmit={handleAddItem} className="space-y-4 mt-6">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Tipo de Lançamento</Label>
                  <Select
                    value={itemType}
                    onValueChange={(v: any) => {
                      setItemType(v);
                      setItemCategory(v === "despesa" ? CATEGORIAS_DESPESA[0] : CATEGORIAS_RECEITA[0]);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="despesa" className="text-xs font-medium text-rose-600">
                        Despesa / Custo de Fornecedor
                      </SelectItem>
                      <SelectItem value="receita" className="text-xs font-medium text-emerald-600">
                        Receita / Patrocínio / Bar
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Categoria</Label>
                  <Select value={itemCategory} onValueChange={setItemCategory}>
                    <SelectTrigger className="h-11 rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(itemType === "despesa" ? CATEGORIAS_DESPESA : CATEGORIAS_RECEITA).map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Descrição / Fornecedor *</Label>
                  <Input
                    required
                    placeholder="Ex: Empresa de Geradores Santa Clara"
                    className="h-11 rounded-xl text-xs"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Valor em Reais (R$) *</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="h-11 rounded-xl text-xs font-mono"
                    value={itemValue}
                    onChange={(e) => setItemValue(e.target.value)}
                  />
                </div>

                <Button type="submit" disabled={isPending} className="w-full h-11 rounded-xl text-xs font-bold mt-4">
                  {isPending ? "Salvando..." : "Confirmar Lançamento"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* Lista de Itens do Orçamento */}
      {!selectedBudget || items.length === 0 ? (
        <Card className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card/40">
          <Building className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs font-bold text-foreground">Nenhum item lançado neste orçamento</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Clique em "Adicionar Lançamento" para discriminar fornecedores e receitas.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card hover:border-border transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`size-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    item.tipo === "receita"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-rose-500/10 text-rose-600"
                  }`}
                >
                  {item.tipo === "receita" ? "+" : "-"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-foreground">{item.descricao}</p>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                      {item.categoria}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {item.tipo === "receita" ? "Receita Projetada" : "Custo Operacional"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`font-mono text-xs font-bold ${
                    item.tipo === "receita" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {item.tipo === "receita" ? "+" : "-"}
                  {(item.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>

                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                  title="Remover item"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
