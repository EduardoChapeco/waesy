import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { getCustomerCredits, requestRedemption } from "@/services/credits.functions";
import { formatMoney } from "@/lib/money";
import { useState } from "react";
import { formatDate } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowDownRight, Receipt, ShoppingBag, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { NativeMobileHeader } from "@/components/navigation/native-mobile-header";

export const Route = createFileRoute("/_store/conta/creditos")({
  head: () => ({ meta: [{ title: "Meus Créditos | Waesy" }] }),
  loader: async () => {
    try {
      return (
        (await getCustomerCredits().catch(() => ({
          balance_cents: 0,
          customer_credit_transactions: [],
        }))) || { balance_cents: 0, customer_credit_transactions: [] }
      );
    } catch (err) {
      console.error("[loader:_store.conta.creditos] Unhandled loader error:", err);
      return { balance_cents: 0, customer_credit_transactions: [] } as any;
    }
  },
  component: Page,
});

function Page() {
  const credits = Route.useLoaderData() || { balance_cents: 0, customer_credit_transactions: [] };
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pixKey, setPixKey] = useState("");
  const [amountStr, setAmountStr] = useState("");

  const maxCents = credits?.balance_cents || 0;
  const typedAmountCents = Math.round(parseFloat(amountStr || "0") * 100);

  async function handleRedeem() {
    if (typedAmountCents < 100) {
      toast.error("O valor mínimo para resgate é R$ 1,00");
      return;
    }
    if (typedAmountCents > maxCents) {
      toast.error("Saldo insuficiente.");
      return;
    }
    if (pixKey.trim().length < 5) {
      toast.error("Chave PIX inválida.");
      return;
    }

    setIsSubmitting(true);
    try {
      await requestRedemption({
        data: { amount_cents: typedAmountCents, pix_key: pixKey.trim() },
      });
      toast.success("Solicitação de resgate enviada com sucesso!");
      setIsOpen(false);
      setPixKey("");
      setAmountStr("");
      router.invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao solicitar resgate.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const redeemDialog = (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="rounded-lg h-11 min-h-11 px-4 text-xs font-semibold gap-2 bg-foreground text-background hover:bg-foreground/90 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          disabled={maxCents < 100}
        >
          <ArrowDownRight className="size-4 shrink-0" />
          <span>Sacar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Resgate</DialogTitle>
          <DialogDescription>
            Seu saldo disponível é de <strong className="text-foreground">{formatMoney(maxCents)}</strong>.
            O valor será transferido para a chave PIX informada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Valor a resgatar (R$)</Label>
            <Input
              type="number"
              placeholder="0.00"
              min="1"
              step="0.01"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="h-11 min-h-11 rounded-lg"
            />
            <p className="text-xs text-muted-foreground">Mínimo R$ 1,00</p>
          </div>
          <div className="space-y-2">
            <Label>Chave PIX</Label>
            <Input
              placeholder="E-mail, CPF, Telefone ou Aleatória"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              className="h-11 min-h-11 rounded-lg"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="rounded-lg h-11 min-h-11 px-4 focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancelar
            </Button>
          </DialogClose>
          <Button
            onClick={handleRedeem}
            disabled={isSubmitting}
            className="rounded-lg h-11 min-h-11 min-w-32 focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : "Confirmar Saque"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-safe pb-24 px-0 sm:px-4 md:px-0">
      {/* ── 0. Native Mobile Header (<768px) ── */}
      <NativeMobileHeader
        title="Meus Créditos"
        fallbackHref="/conta"
        mobileOnly
        rightAction={redeemDialog}
      />

      {/* ── 1. Clean Minimalist Header (Desktop >=768px) ── */}
      <div className="hidden md:flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Créditos
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {redeemDialog}

          <Button asChild size="sm" variant="outline" className="rounded-lg text-xs font-semibold h-11 min-h-11 px-4 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary">
            <Link to="/mercado">
              <ShoppingBag className="size-4 mr-2 shrink-0" />
              Usar no Mercado
            </Link>
          </Button>
        </div>
      </div>

      {/* ── 2. Card de Saldo com Métricas Claras ── */}
      <div className="bg-card p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 rounded-lg border border-border/40">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Wallet className="size-4 text-primary shrink-0" />
            <span>Saldo Disponível</span>
          </div>
          <p className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
            {formatMoney(credits.balance_cents)}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto md:hidden pt-2 border-t border-border/40">
          <Button asChild variant="outline" className="h-11 min-h-11 rounded-lg text-xs font-semibold cursor-pointer">
            <Link to="/mercado">
              <ShoppingBag className="size-4 mr-2 shrink-0" />
              Usar no Mercado
            </Link>
          </Button>
        </div>

        <div className="relative z-10 hidden md:block">
          <p className="text-xs text-muted-foreground max-w-56 font-medium leading-relaxed text-right">
            O saldo é aplicado automaticamente na etapa de pagamento do Checkout, ou pode ser sacado via PIX.
          </p>
        </div>
      </div>

      {/* ── 3. Histórico de Transações ── */}
      <div className="space-y-4 pt-2 sm:pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Histórico de Transações
          </h2>
          {credits.customer_credit_transactions?.length > 0 && (
            <span className="text-xs text-muted-foreground font-mono">
              {credits.customer_credit_transactions.length} registros
            </span>
          )}
        </div>

        {(!credits.customer_credit_transactions || credits.customer_credit_transactions.length === 0) ? (
          <div className="rounded-lg border border-dashed border-border/80 p-8 sm:p-12 text-center flex flex-col items-center gap-3 bg-muted/20">
            <div className="size-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              <Receipt className="size-6" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm sm:text-base text-foreground">Sem movimentações</p>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm">
                Você ainda não possui transações de créditos registradas. Cashback e reembolsos aparecerão aqui.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-2 sm:gap-3">
            {credits.customer_credit_transactions
              .slice()
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((t: any) => (
                <div
                  key={t.id}
                  className="flex justify-between items-center p-3 sm:p-4 rounded-lg border border-border/40 bg-card gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-xs sm:text-sm truncate">
                      {t.reason || "Crédito na plataforma"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(t.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`font-semibold text-sm sm:text-base ${
                        t.amount_cents > 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                      }`}
                    >
                      {t.amount_cents > 0 ? "+" : ""}
                      {formatMoney(t.amount_cents)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
