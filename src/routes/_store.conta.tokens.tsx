import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Store,
  Globe,
  Gift,
  Bot,
  ShoppingBag,
  TrendingUp,
  RotateCw,
  Info,
  ShieldCheck,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { getUserWzSummary, listUserWzMovements } from "@/services/wz-engine.functions";
import { formatWz } from "@/lib/wz-quote-engine";

export const Route = createFileRoute("/_store/conta/tokens")({
  head: () => ({ meta: [{ title: "Economia $WZ | Minha Conta Waesy" }] }),
  loader: async () => {
    try {
      const [summary, movementsData] = await Promise.all([
        getUserWzSummary().catch(() => ({
          authenticated: false,
          total_available_wz: 0,
          total_available_wz_formatted: "0 $WZ",
          global_available_wz: 0,
          global_available_wz_formatted: "0 $WZ",
          merchant_available_wz: 0,
          merchant_available_wz_formatted: "0 $WZ",
          total_reference_brl: "R$ 0,00",
          buckets: [],
        })),
        listUserWzMovements({ data: { filter: "all", limit: 30 } }).catch(() => ({
          movements: [],
          hasMore: false,
          nextCursor: null,
        })),
      ]);

      return {
        summary,
        movements: movementsData.movements || [],
        hasMore: movementsData.hasMore || false,
      };
    } catch (err) {
      console.error("[loader:_store.conta.tokens] Erro:", err);
      return {
        summary: {
          authenticated: false,
          total_available_wz: 0,
          total_available_wz_formatted: "0 $WZ",
          global_available_wz: 0,
          global_available_wz_formatted: "0 $WZ",
          merchant_available_wz: 0,
          merchant_available_wz_formatted: "0 $WZ",
          total_reference_brl: "R$ 0,00",
          buckets: [],
        },
        movements: [],
        hasMore: false,
      };
    }
  },
  component: WzEconomyPage,
});

type FilterType = "all" | "received" | "spent" | "ai" | "purchases" | "boost" | "cashback" | "gift_cards";

const FILTER_LABELS: Array<{ id: FilterType; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "received", label: "Recebidos" },
  { id: "spent", label: "Gastos" },
  { id: "ai", label: "IA" },
  { id: "purchases", label: "Compras" },
  { id: "boost", label: "Impulso" },
  { id: "cashback", label: "Cashback" },
  { id: "gift_cards", label: "Vales" },
];

function WzEconomyPage() {
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const summary = loaderData.summary;

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [movements, setMovements] = useState<any[]>(loaderData.movements || []);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);

  const handleFilterChange = async (newFilter: FilterType) => {
    setActiveFilter(newFilter);
    setIsLoadingMovements(true);
    try {
      const res = await listUserWzMovements({
        data: { filter: newFilter, limit: 30 },
      });
      setMovements(res.movements || []);
    } catch (e) {
      console.error("[WzEconomyPage] Erro ao filtrar extrato:", e);
    } finally {
      setIsLoadingMovements(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background text-foreground w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-28 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
      {/* ── 1. Top Header com Navegação Nativa Mobile e Desktop ── */}
      <NativeMobileHeader
        title="Central $WZ"
        fallbackHref="/conta"
        mobileOnly
        rightActions={
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-11 min-h-11 px-3 text-xs font-semibold rounded-lg text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Link to="/conta/gift-cards">
              <Gift className="size-4 text-primary" />
            </Link>
          </Button>
        }
      />

      <div className="hidden sm:flex items-center justify-between gap-3 border-b border-border/40 pb-3 pt-1 px-4 sm:px-0">
        <div className="flex items-center gap-3">
          <NativeBackButton fallbackHref="/conta" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Central $WZ
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="rounded-lg text-xs font-semibold h-11 min-h-11 px-4 gap-2 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link to="/conta/gift-cards">
              <Gift className="size-4 text-primary" />
              <span>Vales-Presente</span>
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="rounded-lg text-xs font-bold h-11 min-h-11 px-4 bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Link to="/mercado">Explorar Lojas</Link>
          </Button>
        </div>
      </div>

      {/* ── 2. Card Principal de Saldo $WZ ── */}
      <div className="mx-4 sm:mx-0 p-5 rounded-lg border border-border/60 bg-card space-y-4 ">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Saldo Disponível para Uso
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            Valor de ref.: <strong className="text-foreground">{summary.total_reference_brl}</strong>
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-mono">
            {summary.total_available_wz_formatted}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40">
          <div className="p-3 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Globe className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Waesy Global</p>
                <p className="text-xs text-muted-foreground">Uso geral e plataforma</p>
              </div>
            </div>
            <span className="font-mono text-sm font-bold text-foreground">
              {summary.global_available_wz_formatted}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Store className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Empresas Parceiras</p>
                <p className="text-xs text-muted-foreground">Restrito a cada emissor</p>
              </div>
            </div>
            <span className="font-mono text-sm font-bold text-foreground">
              {summary.merchant_available_wz_formatted}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
          <Info className="size-3.5 text-muted-foreground shrink-0" />
          <span>
            Parte dos seus $WZ possui escopo restrito à empresa que o emitiu e reduz o valor das compras naquela loja.
          </span>
        </div>
      </div>

      {/* ── 3. Seus Saldos por Empresa (Onde Posso Usar?) ── */}
      {summary.buckets && summary.buckets.length > 0 && (
        <div className="space-y-3 px-4 sm:px-0">
          <h2 className="text-sm font-bold text-foreground tracking-tight">
            Onde posso usar meus $WZ?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {summary.buckets.map((b: any) => (
              <div
                key={b.id}
                className="p-4 rounded-lg border border-border/60 bg-card flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {b.scope_logo ? (
                      <img
                        src={b.scope_logo}
                        alt={b.scope_name}
                        className="size-6 rounded-full object-cover border border-border/40 shrink-0"
                      />
                    ) : (
                      <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                        {b.scope_type === "GLOBAL" ? <Globe className="size-3.5 text-primary" /> : <Store className="size-3.5 text-muted-foreground" />}
                      </div>
                    )}
                    <span className="text-xs font-bold text-foreground break-words text-wrap leading-tight">{b.scope_name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold px-2 py-1 shrink-0">
                    {b.scope_type === "GLOBAL" ? "Global" : "Loja"}
                  </Badge>
                </div>

                <div>
                  <span className="text-lg font-extrabold font-mono text-foreground block">
                    {b.available_wz_formatted}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {b.scope_type === "GLOBAL"
                      ? "Válido em compras, IA e serviços da Waesy"
                      : `Válido exclusivamente nesta empresa`}
                  </p>
                </div>

                {b.scope_slug && (
                  <Button asChild size="sm" variant="ghost" className="h-11 min-h-11 px-3 text-xs font-semibold justify-between w-full border border-border/40 focus-visible:ring-2 focus-visible:ring-primary">
                    <Link to={"/u/$username" as any} params={{ username: b.scope_slug } as any}>
                      <span>Ver Loja</span>
                      <ChevronRight className="size-3.5" />
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. Filtros de Movimentações (Régua Horizontal Contínua) ── */}
      <div className="space-y-3 px-4 sm:px-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground tracking-tight">
            Movimentações do Livro $WZ
          </h2>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"> {/* design-lint-ignore DL-30 reason:"Regua horizontal continua de filtros conforme AGENTS.md B.39" expiry:"2027-12-31" */}
          {FILTER_LABELS.map((flt) => (
            <button
              key={flt.id}
              type="button"
              onClick={() => handleFilterChange(flt.id)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors h-11 min-h-11 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary ${
                activeFilter === flt.id
                  ? "bg-foreground text-background"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {flt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 5. Extrato de Transações (WhatsApp Pattern Edge-to-Edge no Mobile) ── */}
      <div className="bg-card border-y sm:border border-border/60 sm:rounded-lg divide-y divide-border/40 overflow-hidden">
        {isLoadingMovements ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Carregando movimentações do ledger...
          </div>
        ) : movements.length > 0 ? (
          movements.map((tx) => (
            <button
              key={tx.id}
              type="button"
              onClick={() => setSelectedTx(tx)}
              className="w-full text-left px-4 py-3 min-h-14 flex items-center justify-between gap-3 active:bg-muted/30 hover:bg-muted/10 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
                    tx.is_positive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tx.is_positive ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {tx.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`font-mono text-sm font-bold block ${
                    tx.is_positive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-foreground"
                  }`}
                >
                  {tx.amount_formatted}
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                  {tx.entry_type}
                </span>
              </div>
            </button>
          ))
        ) : (
          <div className="py-12 text-center text-xs text-muted-foreground px-4">
            Nenhuma movimentação encontrada para o filtro selecionado.
          </div>
        )}
      </div>

      {/* ── 6. Modal de Detalhe Forense da Transação ── */}
      {selectedTx && (
        <Dialog open={Boolean(selectedTx)} onOpenChange={() => setSelectedTx(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Detalhes da Movimentação
              </DialogTitle>
              <DialogDescription className="text-xs">
                Registro imutável auditado no Ledger de $WZ da Waesy.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-1">
                <span className="text-xs text-muted-foreground block">Operação</span>
                <p className="font-semibold text-foreground">{selectedTx.description}</p>
                <div className="flex items-center justify-between pt-1 font-mono">
                  <span>Valor:</span>
                  <span className={`font-bold ${selectedTx.is_positive ? "text-emerald-500" : "text-foreground"}`}>
                    {selectedTx.amount_formatted}
                  </span>
                </div>
              </div>

              <div className="space-y-2 border-t border-border/40 pt-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID do Evento:</span>
                  <span className="text-foreground">{selectedTx.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo de Entrada:</span>
                  <span className="text-foreground">{selectedTx.entry_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Escopo do Ativo:</span>
                  <span className="text-foreground">{selectedTx.scope_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fonte de Lastro:</span>
                  <span className="text-foreground">{selectedTx.funding_source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carimbo Forense:</span>
                  <span className="text-foreground truncate max-w-xs">{selectedTx.tamper_seal}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button className="w-full h-11 min-h-11 rounded-lg text-xs font-bold">
                  Fechar
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
