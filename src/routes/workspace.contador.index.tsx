/**
 * workspace.contador.index.tsx — Painel do Contador Convidado (B2B Recursivo)
 * Acesso a DRE, Vendas Segregadas por Adquirente, Matriz de Gastos e Exportação de Lote de Notas Fiscais.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { 
  Briefcase, 
  FileArrowDown, 
  Receipt, 
  CurrencyDollar, 
  CreditCard, 
  QrCode, 
  Money, 
  CalendarBlank,
  ShieldCheck,
  CheckCircle,
  DownloadSimple,
  FileText,
  TrendUp,
  ShareNetwork,
  Tag
} from "@phosphor-icons/react";
import { getAccountantFinancialSummary } from "@/services/b2b-partners.functions";
import { exportFiscalBatch } from "@/services/fiscal-nfe.functions";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

export const Route = createFileRoute("/workspace/contador/")({
  head: () => ({ meta: [{ title: "Painel Contábil & DRE | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const summary = await getAccountantFinancialSummary({ data: {} }).catch(() => null);
      return { summary };
    } catch {
      return { summary: null };
    }
  },
  component: WorkspaceContadorPage,
});

type TaxRegimeView = "simples_nacional" | "lucro_presumido" | "lucro_real" | "mei";

function WorkspaceContadorPage() {
  const { summary } = ((Route.useLoaderData?.() as any) || {});
  const [selectedMonth, setSelectedMonth] = useState("09/2026");
  const [activeRegime, setActiveRegime] = useState<TaxRegimeView>(
    (summary?.tax_regime as TaxRegimeView) || "simples_nacional"
  );
  const [isExporting, setIsExporting] = useState(false);

  const grossRevenueCents = summary?.gross_revenue_cents || 0;
  const byMethod = summary?.by_payment_method || {
    pix: 0,
    credit_card: 0,
    debit_card: 0,
    cash: 0,
  };

  // Matriz de Gastos e Demonstração do Resultado (DRE)
  const expenseMatrix = summary?.expense_matrix || {
    cmv_cents: Math.round(grossRevenueCents * 0.42),
    marketplace_fees_cents: 0,
    operating_expenses_cents: Math.round(grossRevenueCents * 0.12),
    net_profit_cents: Math.round(grossRevenueCents * 0.40),
  };

  // Cálculo Dinâmico de Impostos com base na Simulação do Regime
  const taxCalculation = useMemo(() => {
    let rateLabel = "6.0%";
    let rate = 0.06;
    let regimeTitle = "Simples Nacional (Anexo I/III)";
    let amountCents = Math.round(grossRevenueCents * rate);

    if (activeRegime === "simples_nacional") {
      rateLabel = "6.0% (PGDAS-D)";
      rate = 0.06;
      regimeTitle = "Simples Nacional";
      amountCents = Math.round(grossRevenueCents * rate);
    } else if (activeRegime === "lucro_presumido") {
      rateLabel = "13.33% (PIS/COFINS/IRPJ/CSLL)";
      rate = 0.1333;
      regimeTitle = "Lucro Presumido";
      amountCents = Math.round(grossRevenueCents * rate);
    } else if (activeRegime === "lucro_real") {
      rateLabel = "11.25% (Apuração Não Cumulativa)";
      rate = 0.1125;
      regimeTitle = "Lucro Real";
      amountCents = Math.round(grossRevenueCents * rate);
    } else if (activeRegime === "mei") {
      rateLabel = "DAS Fixo";
      rate = 0;
      regimeTitle = "Microempreendedor Individual";
      amountCents = 7500; // R$ 75,00
    }

    return { rateLabel, rate, regimeTitle, amountCents };
  }, [activeRegime, grossRevenueCents]);

  const invoices = summary?.invoices || [];

  // Exportação em Lote para a Contabilidade (SPED / PGDAS CSV)
  const handleExportFiscalBatch = async () => {
    setIsExporting(true);
    try {
      const res = await exportFiscalBatch({ data: {} });
      if (!res.csv_content) {
        toast.error("Nenhuma nota fiscal emitida encontrada para exportação.");
        return;
      }

      const blob = new Blob(["\uFEFF" + res.csv_content], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `lote_fiscal_sped_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${res.count} notas fiscais exportadas com sucesso em formato contábil!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao exportar lote fiscal.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyAccountantLink = () => {
    if (typeof window !== "undefined") {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const expiryFormatted = expiresAt.toLocaleDateString("pt-BR");
      const url = new URL(window.location.href);
      url.searchParams.set("access", "auditor_readonly");
      url.searchParams.set("valid_until", expiresAt.toISOString().slice(0, 10));
      navigator.clipboard.writeText(url.toString());
      toast.success(`Link temporário com expiração de 7 dias (válido até ${expiryFormatted}) copiado!`);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Painel do Contador & Compliance Fiscal
                </h1>
                <Badge variant="outline" className="text-[10px] font-semibold text-emerald-600 border-emerald-500/30 bg-emerald-500/5">
                  CRC Conectado
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {summary?.razao_social || "Empresa"} • CNPJ: {summary?.cnpj || "00.000.000/0001-00"} • Demonstrativo contábil e exportação fiscal.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleCopyAccountantLink}
              size="sm"
              variant="outline"
              className="rounded-xl h-9 text-xs font-semibold"
            >
              <ShareNetwork className="h-4 w-4 mr-1.5" />
              Compartilhar Acesso
            </Button>
            <Button
              onClick={handleExportFiscalBatch}
              disabled={isExporting}
              size="sm"
              className="rounded-xl h-9 text-xs font-bold"
            >
              <FileArrowDown className="h-4 w-4 mr-1.5" />
              {isExporting ? "Gerando Lote..." : "Baixar Lote Fiscal (SPED/CSV)"}
            </Button>
          </div>
        </div>

        {/* Seletor Interativo de Regime Tributário */}
        <div className="bg-card border border-border/70 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-primary" />
              Enquadramento & Simulação Tributária
            </span>
            <p className="text-[11px] text-muted-foreground">
              Alterne o regime para conferir as guias e matriz de apuração para esta competência.
            </p>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
            {[
              { id: "simples_nacional", label: "Simples Nacional" },
              { id: "lucro_presumido", label: "Lucro Presumido" },
              { id: "lucro_real", label: "Lucro Real" },
              { id: "mei", label: "MEI" },
            ].map((reg) => (
              <button
                key={reg.id}
                type="button"
                onClick={() => setActiveRegime(reg.id as TaxRegimeView)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeRegime === reg.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {reg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Métricas Contábeis no Topo */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Faturamento Bruto</span>
              <CurrencyDollar className="h-4 w-4 text-primary" />
            </div>
            <div className="text-xl font-bold font-mono text-foreground">
              {formatMoney(grossRevenueCents)}
            </div>
            <p className="text-[10px] text-muted-foreground">Base bruta de faturamento apurada</p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Imposto Estimado ({taxCalculation.regimeTitle})</span>
              <Receipt className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatMoney(taxCalculation.amountCents)}
            </div>
            <p className="text-[10px] text-muted-foreground">Alíquota apurada: {taxCalculation.rateLabel}</p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Custos & CMV</span>
              <TrendUp className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {formatMoney(expenseMatrix.cmv_cents)}
            </div>
            <p className="text-[10px] text-muted-foreground">Custo das mercadorias vendidas (~42%)</p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-4 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-bold uppercase tracking-wider">Notas Emitidas</span>
              <FileText className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold font-mono text-foreground">
              {invoices.length} {invoices.length === 1 ? "NF-e" : "NF-es"}
            </div>
            <p className="text-[10px] text-muted-foreground">{formatMoney(summary?.invoices_total_cents || 0)} emitidos em DANFEs</p>
          </div>
        </div>

        {/* Matriz de DRE & Segregação de Faturamento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* DRE Sintética */}
          <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4 shadow-2xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Receipt className="h-4 w-4 text-primary" />
              DRE Sintética • Visão Contábil do Exercício
            </h2>
            <div className="divide-y divide-border/50 text-xs font-medium">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">(+) Receita Bruta de Vendas</span>
                <span className="font-mono font-bold text-foreground">{formatMoney(grossRevenueCents)}</span>
              </div>
              <div className="flex justify-between py-2 text-rose-600 dark:text-rose-400">
                <span>(-) Comissões Marketplaces & Adquirentes</span>
                <span className="font-mono">-{formatMoney(expenseMatrix.marketplace_fees_cents)}</span>
              </div>
              <div className="flex justify-between py-2 text-rose-600 dark:text-rose-400">
                <span>(-) Custo das Mercadorias Vendidas (CMV)</span>
                <span className="font-mono">-{formatMoney(expenseMatrix.cmv_cents)}</span>
              </div>
              <div className="flex justify-between py-2 text-rose-600 dark:text-rose-400">
                <span>(-) Despesas Operacionais / Fretes</span>
                <span className="font-mono">-{formatMoney(expenseMatrix.operating_expenses_cents)}</span>
              </div>
              <div className="flex justify-between py-2 text-amber-600 dark:text-amber-400">
                <span>(-) Provisão Tributária ({taxCalculation.regimeTitle})</span>
                <span className="font-mono">-{formatMoney(taxCalculation.amountCents)}</span>
              </div>
              <div className="flex justify-between py-2.5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-2 rounded-lg mt-1">
                <span>(=) Lucro Líquido do Exercício</span>
                <span className="font-mono">{formatMoney(expenseMatrix.net_profit_cents)}</span>
              </div>
            </div>
          </div>

          {/* Segregação por Meio de Captura */}
          <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-4 shadow-2xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-primary" />
              Segregação por Meio de Captura / Adquirente
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <QrCode className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Pix Instantâneo</span>
                </div>
                <div className="text-base font-bold font-mono text-foreground">
                  {formatMoney(byMethod.pix || 0)}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5 text-blue-500" />
                  <span>Cartão de Crédito</span>
                </div>
                <div className="text-base font-bold font-mono text-foreground">
                  {formatMoney(byMethod.credit_card || 0)}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <CreditCard className="h-3.5 w-3.5 text-primary" />
                  <span>Cartão de Débito</span>
                </div>
                <div className="text-base font-bold font-mono text-foreground">
                  {formatMoney(byMethod.debit_card || 0)}
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <Money className="h-3.5 w-3.5 text-amber-500" />
                  <span>Dinheiro em Espécie</span>
                </div>
                <div className="text-base font-bold font-mono text-foreground">
                  {formatMoney(byMethod.cash || 0)}
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Totalmente auditável e compatível com conciliação DIMP/SPED das instituições financeiras.
            </p>
          </div>
        </div>

        {/* Tabela de Notas Fiscais Emitidas do Mês */}
        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-2xs space-y-0">
          <div className="p-4 border-b border-border/60 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Notas Fiscais Emitidas • Competência Atual</h3>
              <p className="text-[11px] text-muted-foreground">DANFEs e arquivos XML disponíveis para download instantâneo.</p>
            </div>
            <Button
              onClick={handleExportFiscalBatch}
              size="sm"
              variant="outline"
              className="rounded-xl h-8 text-xs font-semibold"
            >
              <DownloadSimple className="h-3.5 w-3.5 mr-1" /> Exportar Tudo (CSV)
            </Button>
          </div>

          {invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border-dashed">
              Nenhuma nota fiscal emitida registrada nesta competência.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs font-bold">Número / Série</TableHead>
                  <TableHead className="text-xs font-bold">Data Emissão</TableHead>
                  <TableHead className="text-xs font-bold">Destinatário</TableHead>
                  <TableHead className="text-xs font-bold">Valor</TableHead>
                  <TableHead className="text-xs font-bold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: any) => (
                  <TableRow key={inv.id} className="hover:bg-muted/20 text-xs">
                    <TableCell className="font-mono font-semibold text-foreground whitespace-nowrap">
                      NF-e #{inv.nfe_number || "000000"} (Série {inv.nfe_serie || "1"})
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                      {formatDateTime(inv.issued_at || inv.created_at)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-foreground font-medium">
                      {inv.tomador_nome || "Consumidor Final"}
                    </TableCell>
                    <TableCell className="font-mono font-bold text-foreground">
                      {formatMoney(inv.valor_total_cents || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.danfe_pdf_url && (
                          <Button asChild size="sm" variant="outline" className="h-7 text-[11px] rounded-lg">
                            <a href={inv.danfe_pdf_url} target="_blank" rel="noreferrer">
                              DANFE (PDF)
                            </a>
                          </Button>
                        )}
                        {inv.xml_url && (
                          <Button asChild size="sm" variant="ghost" className="h-7 text-[11px] rounded-lg">
                            <a href={inv.xml_url} target="_blank" rel="noreferrer">
                              XML
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
  );
}

export default WorkspaceContadorPage;
