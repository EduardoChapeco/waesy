import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table";
import { getUserSession } from "@/services/auth.functions";
import { getUserTokenWallet } from "@/services/tokens.functions";

export const Route = createFileRoute("/_store/conta/tokens")({
 head: () => ({ meta: [{ title: "Tokens de Fidelidade | Waesy" }] }),
 loader: async () => {
   try {
 const session = await getUserSession().catch(() => null);

 const wallet = await getUserTokenWallet().catch(() => ({
 user_id: "",
 full_name: "Cliente Waesy",
 balance: 0,
 lifetime_earned: 0,
 lifetime_redeemed: 0,
 transactions: [],
 hasMore: false,
 nextCursor: null,
 }));

 return { wallet, session };
   } catch (err) {
     console.error("[loader:_store.conta.tokens] Unhandled loader error:", err);
     return { wallet: null, session: null };
   }
 },
 component: UserTokensPage,
});

function UserTokensPage() {
 const { wallet } = ((Route.useLoaderData?.() as any) || {});
 
 const [transactions, setTransactions] = useState(wallet.transactions || []);
 const [hasMore, setHasMore] = useState(wallet.hasMore);
 const [cursor, setCursor] = useState(wallet.nextCursor);
 const [isLoading, setIsLoading] = useState(false);

 const loadMore = async () => {
 if (!hasMore || !cursor || isLoading) return;
 
 setIsLoading(true);
 try {
 const moreData = await getUserTokenWallet({ data: { limit: 25, cursor } });
 setTransactions((prev: any) => [...prev, ...moreData.transactions]);
 setHasMore(moreData.hasMore);
 setCursor(moreData.nextCursor);
 } catch (e) {
 console.error(e);
 } finally {
 setIsLoading(false);
 }
 };

 return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Tokens
          </h1>
        </div>

        <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold h-8 px-3.5 cursor-pointer">
          <Link to="/mercado">Explorar Lojas</Link>
        </Button>
      </div>

 {/* Card de Saldo Limpo */}
 <div className="p-5 rounded-2xl border border-border/60 bg-card space-y-1">
 <span className="text-xs text-muted-foreground font-medium block">Saldo Acumulado</span>
 <div className="text-3xl font-bold tracking-tight text-foreground">
 {(wallet.balance || 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">Tokens</span>
 </div>
 <p className="text-xs text-muted-foreground pt-1">
 Pontos de cashback emitidos por lojas participantes para desconto em compras.
 </p>
 </div>

 {/* Histórico Limpo */}
 <div className="space-y-2">
 <h2 className="text-sm font-semibold text-foreground">Histórico de Emissões</h2>
 <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="text-xs">Data</TableHead>
 <TableHead className="text-xs">Loja Emissora / Motivo</TableHead>
 <TableHead className="text-xs text-right">Tokens</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {transactions && transactions.length > 0 ? (
 transactions.map((tx: any) => (
 <TableRow key={tx.id}>
 <TableCell className="text-xs font-mono text-muted-foreground py-2.5">
 {new Date(tx.created_at).toLocaleDateString("pt-BR")}
 </TableCell>
 <TableCell className="text-xs font-medium text-foreground py-2.5">
 {tx.description || tx.origin_store_name || "Cashback de Loja"}
 </TableCell>
 <TableCell className="text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 py-2.5">
 {Number(tx.amount || 0) > 0 ? "+" : ""}{Number(tx.amount || 0).toLocaleString()}
 </TableCell>
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={3} className="text-center py-6 text-muted-foreground text-xs">
 Nenhum token recebido ainda. Compre em lojas participantes para acumular cashback.
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 
 {hasMore && (
 <div className="p-4 border-t border-border/40 flex justify-center bg-card">
 <Button 
 variant="outline" 
 size="sm" 
 className="rounded-xl w-full sm:w-auto"
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
    </div>
 );
}
