import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Target, AlertCircle, PieChart, Layers, ShieldCheck, Zap } from "lucide-react";
import { listEventBudgets } from "@/services/events.functions";

interface EventoCustosProps {
  eventId: string;
}

const CATEGORIA_LABELS: Record<string, string> = {
  sonorizacao: "Sonorização & Iluminação",
  palco: "Palco & Estruturas",
  seguranca: "Segurança & Ambulância",
  licencas: "Alvarás, AVCB & Taxas",
  gerador: "Gerador & Energia",
  equipe: "Staff & Mão de Obra",
  marketing: "Marketing & Tráfego",
  outros: "Outros Custos",
};

export function EventoCustos({ eventId }: EventoCustosProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalReceitas: 0,
    totalDespesas: 0,
    margemLucro: 0,
    margemPercentual: 0,
  });
  const [breakdown, setBreakdown] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const budgets = await listEventBudgets({ data: { eventId } });
        if (budgets && budgets.length > 0) {
          const active = budgets.find((b) => b.status === "aprovado") || budgets[0];
          const itens = Array.isArray(active.itens) ? active.itens : [];

          const rec = itens.filter((i: any) => i.tipo === "receita").reduce((a: number, b: any) => a + (b.valor || 0), 0);
          const desp = itens.filter((i: any) => i.tipo === "despesa").reduce((a: number, b: any) => a + (b.valor || 0), 0);
          const margem = rec - desp;
          const margemPct = rec > 0 ? Math.round((margem / rec) * 100) : 0;

          setSummary({
            totalReceitas: rec,
            totalDespesas: desp,
            margemLucro: margem,
            margemPercentual: margemPct,
          });

          // Agrupar despesas por categoria
          const catMap: Record<string, number> = {};
          itens
            .filter((i: any) => i.tipo === "despesa")
            .forEach((i: any) => {
              const c = i.categoria || "Outros";
              catMap[c] = (catMap[c] || 0) + (i.valor || 0);
            });

          const bdown = Object.entries(catMap).map(([categoria, valor]) => ({
            categoria,
            valor,
            percentual: desp > 0 ? Math.round((valor / desp) * 100) : 0,
          }));

          setBreakdown(bdown);
        }
      } catch (e) {
        console.error("Erro ao calcular DRE de eventos:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground text-sm gap-2">
        <Layers className="size-4 animate-spin" />
        <span>Calculando demonstrativo de resultados do evento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── HEADER EXECUTIVO COM INDICADORES CONSOLIDADOS ── */}
      <div className="p-4 rounded-lg bg-card border border-border/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">DRE Operacional</h3>
            <Badge variant="outline" className="text-xs font-mono">
              Margem Líquida: {summary.margemPercentual}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Demonstrativo de resultado do exercício, ponto de equilíbrio e centro de custos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            className={
              summary.margemLucro >= 0
                ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-bold py-1 px-3"
                : "bg-rose-500/15 text-rose-600 border border-rose-500/30 text-xs font-bold py-1 px-3"
            }
          >
            {summary.margemLucro >= 0 ? "Operação Superavitária" : "Operação em Risco / Déficit"}
          </Badge>
        </div>
      </div>

      {/* ── CARDS DE FLUXO CONSOLIDADO APPLE HIG ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-lg border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Faturamento Bruto</span>
            <TrendingUp className="size-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">
            {summary.totalReceitas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Bilheteria + patrocínios + consumo</p>
        </Card>

        <Card className="rounded-lg border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Custo Total de Produção</span>
            <TrendingDown className="size-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
            {summary.totalDespesas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">Fornecedores, equipe, estrutura e taxas</p>
        </Card>

        <Card className="rounded-lg border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Lucro Líquido Projetado</span>
            <Target className="size-4 text-primary" />
          </div>
          <p
            className={`text-2xl font-bold mt-2 ${
              summary.margemLucro >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {summary.margemLucro.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Margem líquida de {summary.margemPercentual}% sobre o faturamento
          </p>
        </Card>
      </div>

      {/* ── CENTRO DE CUSTOS POR CATEGORIA COM BARRAS DE DISTRIBUIÇÃO ── */}
      <Card className="rounded-lg border border-border/80 bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-foreground">Distribuição do Custo de Produção</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Participação de cada categoria de despesa no orçamento global
            </p>
          </div>
          <PieChart className="size-4 text-muted-foreground" />
        </div>

        {breakdown.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Cadastre lançamentos no orçamento para visualizar a distribuição dos centros de custo.
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {breakdown.map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">{item.categoria}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">
                      {item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-mono py-0 px-2">
                      {item.percentual}%
                    </Badge>
                  </div>
                </div>
                <Progress value={item.percentual} className="h-2 rounded-full" />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
