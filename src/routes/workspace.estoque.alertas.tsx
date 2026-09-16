import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  BellRing,
  Search,
  FileSpreadsheet,
  Plus,
  Boxes,
  Flame,
  ShieldAlert,
  PackageCheck,
  CheckCircle2,
} from "lucide-react";

import { PageHeader } from "@/components/commerce/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/state/states";
import { getStockLevels, adjustStock } from "@/services/stock.functions";
import { getWaitlistDemandCounts } from "@/services/waitlist.functions";
import { playCashRegisterSound, playWarningAlert } from "@/lib/audio-chimes";

export const Route = createFileRoute("/workspace/estoque/alertas")({
  head: () => ({ meta: [{ title: "Alertas de Reposição & Ruptura | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const res = await getStockLevels({ data: {} });
      // Filtrar produtos com estoque baixo (saldo <= 5) ou esgotados
      return (res || []).filter((v: any) => v.stock_on_hand <= 5);
    } catch (err) {
      console.error("[loader:workspace.estoque.alertas] Unhandled loader error:", err);
      return [];
    }
  },
  component: StockAlertsPage,
});

function StockAlertsPage() {
  const rawVariants = Route.useLoaderData();
  const variants = Array.isArray(rawVariants) ? rawVariants : [];
  const router = useRouter();

  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<"all" | "out_of_stock" | "low_stock" | "with_waitlist">("all");

  // Estado do Modal de Reposição Customizada
  const [customModalItem, setCustomModalItem] = useState<any | null>(null);
  const [customQuantity, setCustomQuantity] = useState<number>(20);
  const [customNote, setCustomNote] = useState<string>("Entrada de reposição de estoque");
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  const { data: waitlistCounts = {} } = useQuery({
    queryKey: ["waitlist-demand-counts"],
    queryFn: () => getWaitlistDemandCounts(),
  });

  // KPIs de Ruptura e Alertas
  const kpis = useMemo(() => {
    let outOfStock = 0;
    let lowStock = 0;
    let totalWaitlist = 0;

    variants.forEach((v: any) => {
      const available = v.stock_on_hand || 0;
      if (available <= 0) {
        outOfStock++;
      } else {
        lowStock++;
      }
      const waiting = (waitlistCounts as any)[v.id] || (waitlistCounts as any)[v.product_id] || 0;
      totalWaitlist += waiting;
    });

    return {
      outOfStock,
      lowStock,
      totalWaitlist,
      totalAtRisk: variants.length,
    };
  }, [variants, waitlistCounts]);

  // Filtros combinados de busca e gravidade
  const filteredVariants = useMemo(() => {
    return variants.filter((v: any) => {
      const available = v.stock_on_hand || 0;
      const waiting = (waitlistCounts as any)[v.id] || (waitlistCounts as any)[v.product_id] || 0;
      const title = (v.products?.title || "").toLowerCase();
      const sku = (v.sku || "").toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      if (q && !title.includes(q) && !sku.includes(q)) {
        return false;
      }

      if (filterSeverity === "out_of_stock" && available > 0) return false;
      if (filterSeverity === "low_stock" && available <= 0) return false;
      if (filterSeverity === "with_waitlist" && waiting === 0) return false;

      return true;
    });
  }, [variants, searchQuery, filterSeverity, waitlistCounts]);

  const handleQuickRefill = async (variantId: string, qty: number) => {
    setAdjustingId(variantId);
    try {
      await adjustStock({
        data: {
          variantId,
          qty,
          movementType: "purchase",
          note: `Reposição rápida de +${qty} unidades via alertas`,
        },
      });
      playCashRegisterSound();
      toast.success(`${qty} unidades adicionadas ao estoque com sucesso.`);
      router.invalidate();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao repor estoque");
    } finally {
      setAdjustingId(null);
    }
  };

  const handleConfirmCustomRefill = async () => {
    if (!customModalItem || customQuantity <= 0) {
      toast.error("Informe uma quantidade válida maior que zero.");
      return;
    }

    setIsSubmittingCustom(true);
    try {
      await adjustStock({
        data: {
          variantId: customModalItem.id,
          qty: customQuantity,
          movementType: "purchase",
          note: customNote.trim() || "Entrada de reposição de estoque",
        },
      });

      playCashRegisterSound();
      toast.success(`${customQuantity} unidades reabastecidas com sucesso!`);
      setCustomModalItem(null);
      setCustomQuantity(20);
      setCustomNote("Entrada de reposição de estoque");
      router.invalidate();
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : String(e)) || "Erro ao registrar reposição.");
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Produto",
      "SKU",
      "Saldo em Estoque",
      "Status de Gravidade",
      "Clientes na Fila de Espera",
      "Sugestão de Compra",
    ];

    const rows = filteredVariants.map((v: any) => {
      const available = v.stock_on_hand || 0;
      const waiting = (waitlistCounts as any)[v.id] || (waitlistCounts as any)[v.product_id] || 0;
      const statusLabel = available <= 0 ? "Esgotado (Ruptura)" : "Estoque Baixo";
      const suggestion = Math.max(15, waiting * 2);

      return [
        `"${(v.products?.title || "Item sem título").replace(/"/g, '""')}"`,
        `"${v.sku || "-"}"`,
        available,
        `"${statusLabel}"`,
        waiting,
        suggestion,
      ].join(";");
    });

    const csvContent = [headers.join(";"), ...rows].join("\r\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `lista_reposicao_estoque_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    playCashRegisterSound();
    toast.success("Lista de compras e reposição exportada em CSV com sucesso!");
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Gestão de Estoque & Ruptura"
        title="Alertas Críticos de Reposição"
        description="Identifique produtos esgotados, níveis críticos de suprimento e demanda reprimida para reposição imediata."
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExportCsv}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-bold h-9 gap-1.5 cursor-pointer"
              disabled={variants.length === 0}
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              <span>Exportar Pedido de Compra (CSV)</span>
            </Button>
          </div>
        }
      />

      {/* ── BANNER DE ALERTA SE HOUVER CLIENTES ESPERANDO ITENS ESGOTADOS ── */}
      {kpis.totalWaitlist > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 shadow-2xs">
          <ShieldAlert className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Demanda Reprimida Identificada: {kpis.totalWaitlist} {kpis.totalWaitlist === 1 ? "cliente aguardando" : "clientes aguardando"}
            </h3>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
              Existem compradores cadastrados na lista de espera aguardando notificação assim que esses itens forem repostos.
            </p>
          </div>
        </div>
      )}

      {/* ── KPIS NO PARADIGMA CLEAN ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="size-3.5 text-destructive" />
            Itens Esgotados
          </span>
          <div className="text-2xl font-mono font-bold text-destructive">
            {kpis.outOfStock}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Ruptura total (saldo zero)
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-amber-500" />
            Nível Crítico
          </span>
          <div className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">
            {kpis.lowStock}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Saldo entre 1 e 5 unidades
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <BellRing className="size-3.5 text-blue-600" />
            Fila de Espera (Waitlist)
          </span>
          <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
            {kpis.totalWaitlist}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Clientes aguardando aviso
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-1 shadow-2xs">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Boxes className="size-3.5 text-foreground" />
            Total SKUs em Risco
          </span>
          <div className="text-2xl font-mono font-bold text-foreground">
            {kpis.totalAtRisk}
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Itens monitorados pelo sistema
          </p>
        </div>
      </div>

      {/* ── BARRA DE CONTROLE, BUSCA E FILTROS ── */}
      <div className="p-4 rounded-2xl bg-card border border-border/70 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por produto ou SKU..."
              className="pl-9 h-10 rounded-xl bg-background border-border/80 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <Button
              size="sm"
              variant={filterSeverity === "all" ? "default" : "outline"}
              onClick={() => setFilterSeverity("all")}
              className="rounded-xl text-xs h-8 cursor-pointer"
            >
              Todos ({variants.length})
            </Button>
            <Button
              size="sm"
              variant={filterSeverity === "out_of_stock" ? "default" : "outline"}
              onClick={() => setFilterSeverity("out_of_stock")}
              className="rounded-xl text-xs h-8 cursor-pointer"
            >
              Esgotados ({kpis.outOfStock})
            </Button>
            <Button
              size="sm"
              variant={filterSeverity === "low_stock" ? "default" : "outline"}
              onClick={() => setFilterSeverity("low_stock")}
              className="rounded-xl text-xs h-8 cursor-pointer"
            >
              Críticos ({kpis.lowStock})
            </Button>
            <Button
              size="sm"
              variant={filterSeverity === "with_waitlist" ? "default" : "outline"}
              onClick={() => setFilterSeverity("with_waitlist")}
              className="rounded-xl text-xs h-8 cursor-pointer"
            >
              Com Espera ({variants.filter((v: any) => ((waitlistCounts as any)[v.id] || 0) > 0).length})
            </Button>
          </div>
        </div>
      </div>

      {/* ── TABELA ANALÍTICA DE ALERTAS ── */}
      {filteredVariants.length === 0 ? (
        <EmptyState
          title={
            variants.length === 0
              ? "Estoque 100% abastecido"
              : "Nenhum produto encontrado com os filtros atuais"
          }
          description={
            variants.length === 0
              ? "Parabéns! Todos os produtos da loja estão com níveis de suprimento saudáveis."
              : "Tente limpar o termo de busca ou alterar o filtro de gravidade."
          }
        />
      ) : (
        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-2xs">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 bg-muted/20">
                <TableHead className="text-xs font-bold">Produto</TableHead>
                <TableHead className="text-xs font-bold font-mono">SKU</TableHead>
                <TableHead className="text-xs font-bold text-center">Saldo em Mãos</TableHead>
                <TableHead className="text-xs font-bold text-center">Gravidade</TableHead>
                <TableHead className="text-xs font-bold text-center">Fila de Espera</TableHead>
                <TableHead className="text-xs font-bold text-right">Reposição Rápida</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVariants.map((v: any) => {
                const available = v.stock_on_hand || 0;
                const waitingCount =
                  (waitlistCounts as any)[v.id] ||
                  (waitlistCounts as any)[v.product_id] ||
                  0;
                const isItemAdjusting = adjustingId === v.id;

                return (
                  <TableRow key={v.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                    <TableCell className="font-semibold text-xs text-foreground">
                      {v.products?.title || "Produto sem título"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {v.sku || "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-sm">
                      <span className={available <= 0 ? "text-destructive" : "text-amber-600"}>
                        {available} un
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {available <= 0 ? (
                        <Badge variant="destructive" className="gap-1 text-[10px] font-bold">
                          <Flame className="size-3" />
                          Esgotado
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300">
                          <AlertTriangle className="size-3 text-amber-500" />
                          Crítico ({available} un)
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {waitingCount > 0 ? (
                        <Badge variant="outline" className="gap-1 text-blue-600 border-blue-200 bg-blue-50/50 dark:bg-blue-950/30 font-bold text-[10px]">
                          <BellRing className="size-3" />
                          <span>{waitingCount} {waitingCount === 1 ? "cliente" : "clientes"}</span>
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 font-mono">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickRefill(v.id, 5)}
                          disabled={isItemAdjusting}
                          className="h-8 text-[11px] font-bold px-2 rounded-lg cursor-pointer"
                        >
                          +5
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickRefill(v.id, 10)}
                          disabled={isItemAdjusting}
                          className="h-8 text-[11px] font-bold px-2 rounded-lg cursor-pointer"
                        >
                          +10
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setCustomModalItem(v);
                            setCustomQuantity(waitingCount > 0 ? waitingCount * 2 : 20);
                          }}
                          className="h-8 text-[11px] font-bold px-3 rounded-lg gap-1 cursor-pointer"
                        >
                          <Plus className="size-3" />
                          Personalizado
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── MODAL DE ENTRADA CUSTOMIZADA DE REPOSIÇÃO ── */}
      <Dialog open={Boolean(customModalItem)} onOpenChange={(open) => !open && setCustomModalItem(null)}>
        <DialogContent className="sm:max-w-md bg-background border-border/80 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <PackageCheck className="size-4 text-emerald-600" />
              Repor Estoque de Produto
            </DialogTitle>
            <DialogDescription className="text-xs">
              {customModalItem?.products?.title} ({customModalItem?.sku})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Quantidade a Adicionar ao Estoque
              </Label>
              <Input
                type="number"
                min={1}
                value={customQuantity}
                onChange={(e) => setCustomQuantity(parseInt(e.target.value, 10) || 1)}
                className="font-mono font-bold text-sm h-11 rounded-xl bg-background border-border/80"
              />
              <p className="text-[11px] text-muted-foreground">
                Saldo atual: <strong>{customModalItem?.stock_on_hand || 0} un</strong> ➔ Novo saldo:{" "}
                <strong className="text-emerald-600">
                  {(customModalItem?.stock_on_hand || 0) + customQuantity} un
                </strong>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Nota / Justificativa de Entrada
              </Label>
              <Input
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Ex: NF 1042 / Fornecedor XPTO"
                className="text-xs h-10 rounded-xl bg-background border-border/80"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomModalItem(null)}
              className="rounded-xl text-xs font-bold h-10 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirmCustomRefill}
              disabled={isSubmittingCustom}
              className="rounded-xl text-xs font-bold h-10 cursor-pointer"
            >
              {isSubmittingCustom ? "Registrando..." : "Confirmar Entrada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
