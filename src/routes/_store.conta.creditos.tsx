import { createFileRoute, Link } from "@tanstack/react-router";
import { getCustomerCredits } from "@/services/credits.functions";
import { Button } from "@/components/ui/button";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";
import { Coins, ArrowRight, ShieldCheck } from "lucide-react";
import { formatWz } from "@/lib/wz-quote-engine";

export const Route = createFileRoute("/_store/conta/creditos")({
  head: () => ({ meta: [{ title: "Créditos e Fidelidade | Waesy" }] }),
  loader: async () => {
    try {
      const data = await getCustomerCredits().catch(() => ({
        balance_cents: 0,
        balance_wz: 0,
        balance_wz_formatted: "0 $WZ",
        customer_credit_transactions: [],
      }));
      return data;
    } catch (err) {
      console.error("[loader:_store.conta.creditos] Unhandled error:", err);
      return {
        balance_cents: 0,
        balance_wz: 0,
        balance_wz_formatted: "0 $WZ",
        customer_credit_transactions: [],
      };
    }
  },
  component: UnifiedCreditsPage,
});

function UnifiedCreditsPage() {
  const credits = Route.useLoaderData() || {
    balance_cents: 0,
    balance_wz: 0,
    balance_wz_formatted: "0 $WZ",
    customer_credit_transactions: [],
  };

  // Ação da barra de topo móvel
  const headerRightAction = (
    <Button
      asChild
      size="sm"
      variant="ghost"
      className="h-11 min-h-11 px-3 text-xs font-semibold rounded-lg text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
    >
      <Link to="/conta/tokens">
        <Coins className="size-4 text-primary" />
      </Link>
    </Button>
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-24 px-4 sm:px-6">
      {/* ── 1. Top Header com Navegação Nativa Mobile e Desktop ── */}
      <NativeMobileHeader
        title="Créditos em Loja"
        fallbackHref="/conta"
        mobileOnly
        rightActions={headerRightAction}
      />

      <div className="hidden sm:flex items-center justify-between border-b border-border/40 pb-3 pt-1">
        <div className="flex items-center gap-3">
          <NativeBackButton fallbackHref="/conta" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Créditos em Loja
          </h1>
        </div>

        <Button asChild className="rounded-lg h-11 min-h-11 px-4 text-xs font-bold bg-primary text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
          <Link to="/conta/tokens">
            <span>Abrir Central $WZ</span>
            <ArrowRight className="size-4 ml-2" />
          </Link>
        </Button>
      </div>

      {/* ── 2. Card de Unificação Canônica $WZ ── */}
      <div className="p-6 rounded-lg border border-border/60 bg-card space-y-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Coins className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Créditos unificados em $WZ
            </h2>
            <p className="text-xs text-muted-foreground">
              Todos os seus saldos, cortesias, cashback e fidelidade foram consolidados na economia oficial $WZ.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-muted/40 border border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-xs text-muted-foreground font-medium block">
              Seu Saldo nesta Loja
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-foreground">
              {credits.balance_wz_formatted || formatWz(credits.balance_wz || 0)}
            </span>
            <span className="text-xs text-muted-foreground block pt-1">
              Equivalente a {(credits.balance_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} em compras
            </span>
          </div>

          <Button asChild className="rounded-lg h-11 min-h-11 px-5 text-xs font-bold w-full sm:w-auto focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
            <Link to="/mercado">Usar em Compras</Link>
          </Button>
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
          <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-1" />
          <span>
            Os créditos de loja concedidos por comerciantes são benefícios restritos a descontos nesta empresa e não possuem taxa de resgate em dinheiro ou saque via Pix.
          </span>
        </div>
      </div>

      {/* ── 3. Histórico de Movimentações nesta Loja ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">
          Histórico Recente
        </h3>

        {credits.customer_credit_transactions && credits.customer_credit_transactions.length > 0 ? (
          <div className="bg-card border border-border/60 rounded-lg divide-y divide-border/40 overflow-hidden shadow-xs">
            {credits.customer_credit_transactions.map((tx: any) => (
              <div key={tx.id} className="px-4 py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-semibold text-foreground">{tx.reason}</p>
                  <p className="text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="font-mono font-bold text-foreground">
                  {formatWz(tx.amount_wz || 0)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg">
            Nenhum crédito recente nesta loja.
          </div>
        )}
      </div>
    </div>
  );
}
