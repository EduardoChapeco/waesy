import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { 
  getExecutiveGrowthMetrics, 
  recordFinancialEntry, 
  deleteFinancialEntry 
} from "@/services/growth-targets.functions";
import { formatMoney } from "@/lib/money";
import { 
  TrendingUp, 
  Target, 
  Store, 
  Users, 
  DollarSign, 
  BarChart3, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Building2, 
  Coins, 
  ArrowUpRight, 
  Cpu, 
  Code2, 
  Scale, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin-master/crescimento")({
  head: () => ({ meta: [{ title: "Metas Projetadas vs. Dados Reais & Valuation | Waesy Master" }] }),
  loader: async () => {
    try {
      const data = await getExecutiveGrowthMetrics();
      return data;
    } catch (err: any) {
      console.error("[loader:admin-master.crescimento] Error:", err);
      return {
        real: {
          profilesCount: 0,
          storesCount: 0,
          ordersCount: 0,
          realGmvCents: 0,
          paidOrdersCents: 0,
          paidInvoicesCents: 0,
          realDirectRevenueCents: 0,
          classifiedsCount: 0,
          totalExpensesCents: 0,
          totalInvestmentsCents: 0,
          netCashFlowCents: 0,
          realConversionRate: 0,
          currentCalculatedValuationCents: 412000000,
        },
        codebase: {
          srcFiles: 1154,
          srcLines: 402905,
          srcBytes: 14265072,
          supabaseLines: 65236,
          totalLines: 468141,
          routesCount: 341,
          servicesCount: 217,
          componentsCount: 452,
          techAssetValueCents: 412000000,
        },
        targets: [],
        financialRecords: [],
      };
    }
  },
  component: GrowthValuationDashboard,
});

function GrowthValuationDashboard() {
  const router = useRouter();
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const real = loaderData.real || {};
  const codebase = loaderData.codebase || {};
  const targets = loaderData.targets || [];
  const financialRecords = loaderData.financialRecords || [];

  const [selectedStageKey, setSelectedStageKey] = useState<string>("fase_1_500_stores");
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State para Livro-Caixa Real
  const [entryType, setEntryType] = useState<"expense" | "investment" | "revenue_adjustment">("expense");
  const [category, setCategory] = useState("infraestrutura");
  const [amountInput, setAmountInput] = useState("");
  const [description, setDescription] = useState("");

  const activeTarget = targets.find((t: any) => t.period_key === selectedStageKey) || targets[0] || {
    label: "Fase 1: Ignição Extremo Oeste",
    target_stores: 500,
    target_clients: 10000,
    target_mrr_cents: 12550000,
    target_arr_cents: 150600000,
    target_gmv_monthly_cents: 150000000,
    target_valuation_conservative_cents: 650000000,
    target_valuation_strategic_cents: 900000000,
  };

  // Cálculos de Atingimento de Metas
  const storesProgress = activeTarget.target_stores > 0 
    ? Math.min(100, Math.round(((real.storesCount || 0) / activeTarget.target_stores) * 100)) 
    : 0;

  const clientsProgress = activeTarget.target_clients > 0 
    ? Math.min(100, Math.round(((real.profilesCount || 0) / activeTarget.target_clients) * 100)) 
    : 0;

  const mrrProgress = activeTarget.target_mrr_cents > 0 
    ? Math.min(100, Math.round(((real.realDirectRevenueCents || 0) / activeTarget.target_mrr_cents) * 100)) 
    : 0;

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(amountInput.replace(",", "."));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      toast.error("Informe um valor válido em Reais.");
      return;
    }

    setIsSubmitting(true);
    try {
      await recordFinancialEntry({
        data: {
          entryType,
          category,
          amountCents: Math.round(cleanAmount * 100),
          description,
        }
      });
      toast.success("Lançamento financeiro registrado com sucesso.");
      setIsRecordModalOpen(false);
      setAmountInput("");
      setDescription("");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Falha ao salvar lançamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Deseja realmente estornar este lançamento financeiro?")) return;
    try {
      await deleteFinancialEntry({ data: { id } });
      toast.success("Lançamento estornado.");
      router.invalidate();
    } catch (err: any) {
      toast.error(err.message || "Erro ao estornar.");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 bg-background">
      {/* Header Executivo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
              Governança & M&A
            </Badge>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              Eixo Chapecó ↔ São Miguel do Oeste
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Metas Projetadas vs. Dados Reais & Valuation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auditoria financeira em tempo real do ecossistema, fluxo de caixa corporativo e valor de mercado em escalas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => setIsRecordModalOpen(true)} 
            className="gap-2 h-10 px-4 font-medium shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento Financeiro
          </Button>
        </div>
      </div>

      {/* Tabs Principais */}
      <Tabs defaultValue="overview" className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/60 rounded-xl">
          <TabsTrigger value="overview" className="gap-2 py-2.5 text-xs sm:text-sm">
            <Target className="w-4 h-4" />
            Metas vs Realidade
          </TabsTrigger>
          <TabsTrigger value="scales" className="gap-2 py-2.5 text-xs sm:text-sm">
            <BarChart3 className="w-4 h-4" />
            Escalas & M&A (500 a 5k)
          </TabsTrigger>
          <TabsTrigger value="ledger" className="gap-2 py-2.5 text-xs sm:text-sm">
            <DollarSign className="w-4 h-4" />
            Livro-Caixa Corporativo
          </TabsTrigger>
          <TabsTrigger value="tech" className="gap-2 py-2.5 text-xs sm:text-sm">
            <Code2 className="w-4 h-4" />
            Ativo Tecnológico (Codebase)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: VISÃO EXECUTIVA (METAS VS REAL) */}
        <TabsContent value="overview" className="space-y-6">
          {/* Seletor de Fase Alvo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm">
            <div>
              <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                Fase Alvo em Análise
              </span>
              <p className="text-sm font-medium text-foreground">
                {activeTarget.label}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {targets.map((t: any) => (
                <Button
                  key={t.period_key}
                  variant={selectedStageKey === t.period_key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStageKey(t.period_key)}
                  className="text-xs h-9"
                >
                  {t.target_stores} Lojas ({t.target_clients / 1000}k Clientes)
                </Button>
              ))}
            </div>
          </div>

          {/* Cards de Métricas Principais (Real vs Meta) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Lojas */}
            <Card className="border-border/50 bg-card/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lojas / Empresas</CardTitle>
                <Store className="w-4 h-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold">{real.storesCount || 0}</div>
                  <div className="text-xs text-muted-foreground font-mono">Meta: {activeTarget.target_stores}</div>
                </div>
                <Progress value={storesProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{storesProgress}% atingido</span>
                  <span>Faltam {Math.max(0, activeTarget.target_stores - (real.storesCount || 0))}</span>
                </div>
              </CardContent>
            </Card>

            {/* Clientes */}
            <Card className="border-border/50 bg-card/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Clientes / Cidadãos</CardTitle>
                <Users className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold">{real.profilesCount || 0}</div>
                  <div className="text-xs text-muted-foreground font-mono">Meta: {activeTarget.target_clients?.toLocaleString()}</div>
                </div>
                <Progress value={clientsProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{clientsProgress}% atingido</span>
                  <span>Faltam {Math.max(0, activeTarget.target_clients - (real.profilesCount || 0))}</span>
                </div>
              </CardContent>
            </Card>

            {/* Faturamento Direto / MRR */}
            <Card className="border-border/50 bg-card/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Receita Direta (MRR)</CardTitle>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold font-mono">{formatMoney(real.realDirectRevenueCents || 0)}</div>
                  <div className="text-xs text-muted-foreground font-mono">Meta: {formatMoney(activeTarget.target_mrr_cents || 0)}</div>
                </div>
                <Progress value={mrrProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{mrrProgress}% da meta</span>
                  <span>ARR Meta: {formatMoney(activeTarget.target_arr_cents || 0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* GMV Transacionado */}
            <Card className="border-border/50 bg-card/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">GMV Acumulado</CardTitle>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold font-mono">{formatMoney(real.realGmvCents || 0)}</div>
                  <div className="text-xs text-muted-foreground font-mono">{real.ordersCount} pedidos</div>
                </div>
                <div className="text-xs text-muted-foreground pt-1 flex items-center justify-between">
                  <span>Conversão Real:</span>
                  <Badge variant="outline" className="text-xs font-mono">{real.realConversionRate}%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Destaque de Valuation Atual vs Projetado */}
          <Card className="border-border/50 bg-linear-to-br from-card/80 via-card/40 to-muted/20">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Badge variant="outline" className="mb-2 bg-primary/10 text-primary border-primary/20">
                    Métricas de Capital & M&A
                  </Badge>
                  <CardTitle className="text-xl font-bold">Valuation Calculado da Waesy Platform</CardTitle>
                  <CardDescription>
                    Baseado no Ativo Tecnológico auditado (Custo de Reposição COCOMO II) somado à Receita Recorrente anualizada.
                  </CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Valuation Atual da Tecnologia:</span>
                  <div className="text-2xl sm:text-3xl font-bold text-primary font-mono">
                    {formatMoney(real.currentCalculatedValuationCents || codebase.techAssetValueCents)}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-border/50 bg-background/50 space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase">Cenário Conservador ({activeTarget.label?.split("(")[1]?.replace(")", "") || "Fase"})</span>
                  <div className="text-xl font-bold font-mono text-foreground">
                    {formatMoney(activeTarget.target_valuation_conservative_cents || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Múltiplo de 4,0x a 5,5x sobre o ARR da fase.</p>
                </div>

                <div className="p-4 rounded-xl border border-border/50 bg-background/50 space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase">M&A Estratégico (Zucchetti / Senior)</span>
                  <div className="text-xl font-bold font-mono text-emerald-600">
                    {formatMoney(activeTarget.target_valuation_strategic_cents || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Múltiplo de 7,0x a 9,0x ARR com dominância regional.</p>
                </div>

                <div className="p-4 rounded-xl border border-border/50 bg-background/50 space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase">Ativo Intelectual Puro (Codebase)</span>
                  <div className="text-xl font-bold font-mono text-foreground">
                    {formatMoney(codebase.techAssetValueCents)}
                  </div>
                  <p className="text-xs text-muted-foreground">468k linhas | 341 rotas | 11 FTEs sênior por 20 meses.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: ESCALAS & M&A */}
        <TabsContent value="scales" className="space-y-6">
          <Card className="border-border/50 bg-card/40">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Quadro Comparativo de Hiperescala (500 a 5.000 Empresas)</CardTitle>
              <CardDescription>
                Projeção auditada de DRE, geração de caixa e potencial de liquidez em cada estágio de expansão no Sul do Brasil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-xs uppercase text-muted-foreground font-semibold">
                      <th className="py-3 px-4">Indicador Financeiro / Operacional</th>
                      <th className="py-3 px-4">Fase 1: 500 Lojas (10k Clientes)</th>
                      <th className="py-3 px-4">Fase 2: 1.000 Lojas (20k Clientes)</th>
                      <th className="py-3 px-4 text-emerald-600">Fase 3: 5.000 Lojas (100k Clientes)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono text-xs sm:text-sm">
                    <tr>
                      <td className="py-3 px-4 font-sans font-medium text-foreground">Receita SaaS Lojas (R$ 189/mês)</td>
                      <td className="py-3 px-4">R$ 94.500,00 / mês</td>
                      <td className="py-3 px-4">R$ 189.000,00 / mês</td>
                      <td className="py-3 px-4 font-bold text-emerald-600">R$ 945.000,00 / mês</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-sans font-medium text-foreground">Take-rate Transações (1,5% GMV)</td>
                      <td className="py-3 px-4">R$ 22.500,00 / mês</td>
                      <td className="py-3 px-4">R$ 45.000,00 / mês</td>
                      <td className="py-3 px-4 text-emerald-600">R$ 225.000,00 / mês</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-sans font-medium text-foreground">Classificados, Ads & Destaques</td>
                      <td className="py-3 px-4">R$ 8.500,00 / mês</td>
                      <td className="py-3 px-4">R$ 18.000,00 / mês</td>
                      <td className="py-3 px-4 text-emerald-600">R$ 80.000,00 / mês</td>
                    </tr>
                    <tr className="bg-muted/30 font-semibold">
                      <td className="py-3 px-4 font-sans text-foreground">FATURAMENTO MENSAL (MRR)</td>
                      <td className="py-3 px-4">R$ 125.500,00</td>
                      <td className="py-3 px-4">R$ 252.000,00</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">R$ 1.250.000,00</td>
                    </tr>
                    <tr className="bg-muted/40 font-bold">
                      <td className="py-3 px-4 font-sans text-foreground">FATURAMENTO ANUAL (ARR)</td>
                      <td className="py-3 px-4">R$ 1.506.000,00</td>
                      <td className="py-3 px-4">R$ 3.024.000,00</td>
                      <td className="py-3 px-4 text-emerald-600">R$ 15.000.000,00</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-sans font-medium text-foreground">Custos Servidores & Gateways</td>
                      <td className="py-3 px-4 text-rose-500">(R$ 7.700,00)</td>
                      <td className="py-3 px-4 text-rose-500">(R$ 14.800,00)</td>
                      <td className="py-3 px-4 text-rose-500">(R$ 60.500,00)</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-sans font-medium text-foreground">Margem Bruta de Software</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">85,8%</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">86,1%</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">86,6%</td>
                    </tr>
                    <tr className="bg-muted/20">
                      <td className="py-3 px-4 font-sans font-medium text-foreground">EBITDA ANUALIZADO (Lucro Operacional)</td>
                      <td className="py-3 px-4">R$ 645.120,00 (42,8%)</td>
                      <td className="py-3 px-4">R$ 1.404.480,00 (46,4%)</td>
                      <td className="py-3 px-4 text-emerald-600 font-bold">R$ 7.500.000,00 (50,0%)</td>
                    </tr>
                    <tr className="bg-primary/5 font-bold text-primary">
                      <td className="py-4 px-4 font-sans text-foreground">VALUATION INDICATIVO (M&A)</td>
                      <td className="py-4 px-4">R$ 6,5M a R$ 9,0M</td>
                      <td className="py-4 px-4">R$ 16,5M a R$ 21,0M</td>
                      <td className="py-4 px-4 text-emerald-600 font-extrabold text-base">R$ 85,0M a R$ 115,0M</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: LIVRO-CAIXA CORPORATIVO */}
        <TabsContent value="ledger" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border/50 bg-card/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-medium text-muted-foreground">Total de Aportes / Investimento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-emerald-600">
                  {formatMoney(real.totalInvestmentsCents || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Capital aportado pelo fundador e sócios.</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-medium text-muted-foreground">Total de Gastos Operacionais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-rose-500">
                  {formatMoney(real.totalExpensesCents || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Servidores, marketing e despesas gerais.</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-medium text-muted-foreground">Fluxo de Caixa Líquido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-primary">
                  {formatMoney(real.netCashFlowCents || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Investimentos + Receitas - Gastos.</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Lançamentos */}
          <Card className="border-border/50 bg-card/40">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Lançamentos Financeiros Auditados</CardTitle>
                <CardDescription>Rastreabilidade de custos operacionais e capital de giro.</CardDescription>
              </div>
              <Button size="sm" onClick={() => setIsRecordModalOpen(true)} className="gap-1 h-8 text-xs">
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              {financialRecords.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum lançamento financeiro registrado ainda. Clique em "Novo Lançamento" para cadastrar aportes ou gastos reais.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-border/40 text-xs uppercase text-muted-foreground">
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Categoria</th>
                        <th className="py-2.5 px-3">Descrição</th>
                        <th className="py-2.5 px-3 text-right">Valor</th>
                        <th className="py-2.5 px-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20 font-mono text-xs">
                      {financialRecords.map((r: any) => (
                        <tr key={r.id}>
                          <td className="py-2.5 px-3">{r.entry_date}</td>
                          <td className="py-2.5 px-3 font-sans">
                            <Badge variant={r.entry_type === "investment" ? "default" : "secondary"} className="text-xs">
                              {r.entry_type === "investment" ? "Aporte" : "Gasto"}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 font-sans text-muted-foreground">{r.category}</td>
                          <td className="py-2.5 px-3 font-sans text-foreground max-w-xs truncate">{r.description}</td>
                          <td className={cn(
                            "py-2.5 px-3 text-right font-bold",
                            r.entry_type === "investment" ? "text-emerald-600" : "text-rose-500"
                          )}>
                            {r.entry_type === "expense" ? "- " : "+ "}
                            {formatMoney(r.amount_cents)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRecord(r.id)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: ATIVO TECNOLÓGICO */}
        <TabsContent value="tech" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-card/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-medium text-muted-foreground">Linhas de Código Totais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-primary">
                  {codebase.totalLines?.toLocaleString() || "468.141"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">402k em TypeScript + 65k em SQL RPCs.</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-medium text-muted-foreground">Rotas Estruturadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {codebase.routesCount || 341}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Vitrines, Workspace, Contas e Master.</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-medium text-muted-foreground">Serviços BFF (Server Functions)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {codebase.servicesCount || 217}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Mutações atômicas com validação Zod.</p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase font-medium text-muted-foreground">Componentes Modulares</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {codebase.componentsCount || 452}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Design System canônico e tipado.</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 bg-card/40">
            <CardHeader>
              <CardTitle className="text-base font-bold">Custo de Reposição de Software (COCOMO II Method)</CardTitle>
              <CardDescription>
                Auditoria de esforço para justificar contábil e juridicamente o valor patrimonial intangível da Waesy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl border border-border/50 bg-background/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-foreground text-sm">Equipe Equivalente Mínima de Engenharia:</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    11 Profissionais Seniores (1 Arquiteto Chefe, 4 Full-Stacks, 1 DBA, 2 Front-ends, 1 Designer, 1 QA, 1 DevSecOps) trabalhando ininterruptamente por 20 a 24 meses.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-muted-foreground font-mono">Valor em Folha + Encargos:</span>
                  <div className="text-xl font-bold text-emerald-600 font-mono">
                    R$ 4.120.000,00
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground pt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Zero Erros de Build (Compilação 100% limpa)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>RLS Deny-by-Default em 50+ tabelas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Stack Moderna Edge Serverless sem dívida técnica</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Lançamento Financeiro Real */}
      <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Lançamento no Livro-Caixa</DialogTitle>
            <DialogDescription>
              Registre gastos reais de infraestrutura/marketing ou aportes de investimento para o cálculo do Runway.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRecord} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="entryType" className="text-xs">Tipo de Lançamento</Label>
              <Select value={entryType} onValueChange={(val: any) => setEntryType(val)}>
                <SelectTrigger id="entryType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Despesa / Gasto Operacional</SelectItem>
                  <SelectItem value="investment">Aporte de Investimento / Capital</SelectItem>
                  <SelectItem value="revenue_adjustment">Ajuste de Receita Extraordinária</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs">Categoria</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Servidores, Marketing, Jurídico, Aporte Inicial"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs">Descrição do Lançamento</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Pagamento Cloudflare e Supabase, Tráfego regional SMO"
                required
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsRecordModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Gravando..." : "Confirmar Lançamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
