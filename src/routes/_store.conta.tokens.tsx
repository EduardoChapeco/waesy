import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeBackButton } from "@/components/ui/native-back-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getUserSession } from "@/services/auth.functions";
import { getUserTokenWallet } from "@/services/tokens.functions";

const FALLBACK_WALLET = {
  user_id: "",
  full_name: "Cliente Waesy",
  balance: 0,
  lifetime_earned: 0,
  lifetime_redeemed: 0,
  transactions: [],
  hasMore: false,
  nextCursor: null,
};

export const Route = createFileRoute("/_store/conta/tokens")({
  head: () => ({ meta: [{ title: "Tokens de Fidelidade | Waesy" }] }),
  loader: async () => {
    try {
      const session = await getUserSession().catch(() => null);
      const wallet = await getUserTokenWallet().catch(() => FALLBACK_WALLET);

      return {
        wallet: wallet || FALLBACK_WALLET,
        session,
      };
    } catch (err) {
      console.error("[loader:_store.conta.tokens] Unhandled loader error:", err);
      return { wallet: FALLBACK_WALLET, session: null };
    }
  },
  component: UserTokensPage,
});

function UserTokensPage() {
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const wallet = loaderData.wallet || FALLBACK_WALLET;

  const [transactions, setTransactions] = useState<any[]>(wallet.transactions || []);
  const [hasMore, setHasMore] = useState(Boolean(wallet.hasMore));
  const [cursor, setCursor] = useState(wallet.nextCursor || null);
  const [isLoading, setIsLoading] = useState(false);

  const loadMore = async () => {
    if (!hasMore || !cursor || isLoading) return;

    setIsLoading(true);
    try {
      const moreData = await getUserTokenWallet({ data: { limit: 25, cursor } });
      if (moreData?.transactions) {
        setTransactions((prev: any[]) => [...prev, ...moreData.transactions]);
        setHasMore(Boolean(moreData.hasMore));
        setCursor(moreData.nextCursor || null);
      }
    } catch (e) {
      console.error("[UserTokensPage] Erro ao carregar mais transações:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-24 px-0 sm:px-4 md:px-0 animate-in fade-in duration-200">
      {/* ── 1. Clean Minimalist Header (Apple HIG / Native Back) ── */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3 pt-1 px-4 sm:px-0">
        <div className="flex items-center gap-3">
          <NativeBackButton fallbackHref="/conta" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Tokens
          </h1>
        </div>

        <Button
          asChild
          size="sm"
          variant="outline"
          className="rounded-lg text-xs font-semibold h-9 px-4"
        >
          <Link to="/mercado">Explorar Lojas</Link>
        </Button>
      </div>

      {/* ── 2. Card de Saldo Limpo ── */}
      <div className="mx-4 sm:mx-0 p-5 rounded-lg border border-border/60 bg-card space-y-1">
        <span className="text-xs text-muted-foreground font-medium block">
          Saldo Acumulado
        </span>
        <div className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          {(wallet.balance || 0).toLocaleString()}
          <span className="text-sm font-normal text-muted-foreground">Tokens</span>
        </div>
        <p className="text-xs text-muted-foreground pt-1">
          Pontos de cashback emitidos por lojas participantes para desconto em compras.
        </p>
      </div>

      {/* ── 3. Histórico de Emissões ── */}
      <div className="space-y-2">
        <div className="px-4 sm:px-0">
          <h2 className="text-sm font-semibold text-foreground">
            Histórico de Emissões
          </h2>
        </div>

        {/* Mobile View: WhatsApp List Pattern (Edge-to-Edge) */}
        <div className="block sm:hidden bg-card border-y border-border/40 divide-y divide-border/30">
          {transactions.length > 0 ? (
            transactions.map((tx: any) => {
              const amount = Number(tx.amount || 0);
              const isPositive = amount > 0;
              return (
                <div
                  key={tx.id}
                  className="px-4 py-3 min-h-[52px] flex items-center justify-between gap-3 active:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {tx.description || tx.origin_store_name || "Cashback de Loja"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono text-sm font-semibold ${
                        isPositive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground px-4">
              Nenhum token recebido ainda. Compre em lojas participantes para acumular cashback.
            </div>
          )}
        </div>

        {/* Desktop View: Clean Table */}
        <div className="hidden sm:block rounded-lg border border-border/60 overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">Loja Emissora / Motivo</TableHead>
                <TableHead className="text-xs text-right">Tokens</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((tx: any) => {
                  const amount = Number(tx.amount || 0);
                  const isPositive = amount > 0;
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs font-mono text-muted-foreground py-3">
                        {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground py-3">
                        {tx.description || tx.origin_store_name || "Cashback de Loja"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold py-3">
                        <span
                          className={
                            isPositive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-foreground"
                          }
                        >
                          {isPositive ? "+" : ""}
                          {amount.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-6 text-muted-foreground text-xs"
                  >
                    Nenhum token recebido ainda. Compre em lojas participantes para acumular cashback.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação / Carregar Mais */}
        {hasMore && (
          <div className="p-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg w-full sm:w-auto h-11 sm:h-9"
              onClick={loadMore}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isLoading ? "Carregando..." : "Carregar mais antigas"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
