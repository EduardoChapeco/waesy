import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { getCustomerCredits, requestRedemption } from "@/services/credits.functions";
import { formatMoney } from "@/lib/money";
import { useState } from "react";
import { formatDate } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowDownRight } from "lucide-react";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogTrigger,
 DialogFooter,
 DialogClose,
} from "@/components/ui/dialog";

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
     return {} as any;
    }
 },
 component: Page,
});

function Page() {
 const credits = Route.useLoaderData();
 const router = useRouter();

 const [isOpen, setIsOpen] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [pixKey, setPixKey] = useState("");
 const [amountStr, setAmountStr] = useState("");

 const maxCents = credits.balance_cents || 0;
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
 } catch (e: any) {
 toast.error(e.message || "Erro ao solicitar resgate.");
 } finally {
 setIsSubmitting(false);
 }
 }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Créditos
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl h-8 px-3.5 text-xs font-semibold gap-1.5 bg-foreground text-background hover:bg-foreground/90 shrink-0 shadow-xs cursor-pointer" disabled={maxCents < 100}>
                <ArrowDownRight className="size-3.5" />
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
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">Mínimo R$ 1,00</p>
                </div>
                <div className="space-y-2">
                  <Label>Chave PIX</Label>
                  <Input
                    placeholder="E-mail, CPF, Telefone ou Aleatória"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button variant="outline" className="rounded-xl">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleRedeem} disabled={isSubmitting} className="rounded-xl min-w-[120px]">
                  {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Confirmar Saque"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold h-8 px-3.5 cursor-pointer">
            <Link to="/mercado">Usar no Mercado</Link>
          </Button>
        </div>
      </div>

      <div className=" bg-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 rounded-xl border border-border/40">
 <div className="relative z-10">
 <p className="text-sm font-medium text-muted-foreground mb-2">Saldo Disponível</p>
 <p className="text-4xl font-semibold text-foreground">
 {formatMoney(credits.balance_cents)}
 </p>
 </div>
 <div className="relative z-10 hidden md:block">
 <p className="text-xs text-foreground/80 max-w-[200px] font-medium font-mono text-right">
 O saldo é aplicado automaticamente na etapa de pagamento do Checkout, ou pode ser sacado.
 </p>
 </div>
 </div>

 <div className="space-y-6 pt-6">
 <h3 className="text-lg font-semibold pb-2">Histórico de Transações</h3>
 {credits.customer_credit_transactions.length === 0 ? (
 <div className="rounded-xl border border-dashed border-border p-10 text-center flex flex-col items-center gap-4 bg-muted/20">
 <span className="text-4xl opacity-50">🧾</span>
 <div className="space-y-1">
 <p className="font-semibold text-base text-foreground">Sem movimentações</p>
 <p className="text-sm text-muted-foreground">
 Você ainda não possui transações de créditos registradas.
 </p>
 </div>
 </div>
 ) : (
 <div className="grid gap-3">
 {credits.customer_credit_transactions
 .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
 .map((t: any) => (
 <div
 key={t.id}
 className="flex justify-between items-center p-4 rounded-xl border border-border/40 bg-card"
 >
 <div>
 <p className="font-medium text-foreground text-sm">{t.reason}</p>
 <p className="text-xs text-muted-foreground mt-1">{formatDate(t.created_at)}</p>
 </div>
 <div className="text-right">
 <p
 className={`font-semibold text-base ${t.amount_cents > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
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
