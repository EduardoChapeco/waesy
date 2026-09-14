import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Gift, Layers, Copy, Calendar, Loader2 } from 'lucide-react';
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
 Form,
 FormControl,
 FormField,
 FormItem,
 FormLabel,
 FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { listCustomerGiftCards, claimGiftCard } from "@/services/giftcard.functions";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";

export const Route = createFileRoute("/_store/conta/gift-cards")({
 head: () => ({ meta: [{ title: "Meus Vales-Presente | Waesy" }] }),
 loader: async () => {
 try {
 const res = await listCustomerGiftCards();
 return {
 giftCards: res || [],
 };
 } catch {
 return {
 giftCards: [],
 };
 }
 },
 component: CustomerGiftCardsPage,
});

const CheckBalanceSchema = z.object({
 code: z.string().min(5, "Código muito curto"),
});

function CustomerGiftCardsPage() {
 const { giftCards } = ((Route.useLoaderData?.() as any) || {});
 const router = useRouter();
 const [isLoading, setIsLoading] = useState(false);

 const form = useForm<z.infer<typeof CheckBalanceSchema>>({
 resolver: zodResolver(CheckBalanceSchema),
 defaultValues: { code: "" },
 });

 const handleClaim = async (data: z.infer<typeof CheckBalanceSchema>) => {
 setIsLoading(true);
 try {
 const res = await claimGiftCard({ data: { code: data.code.trim().toUpperCase() } });
 if (res) {
 toast.success("Vale-presente resgatado e vinculado à sua conta!");
 form.reset();
 router.invalidate();
 }
 } catch (e: unknown) {
 toast.error(e instanceof Error ? e.message : "Erro ao resgatar cartão");
 } finally {
 setIsLoading(false);
 }
 };

 const handleCopyCode = (code: string) => {
 navigator.clipboard.writeText(code);
 toast.success("Código copiado para a área de transferência!");
 };

 return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Vales-Presente
          </h1>
          {giftCards.length > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {giftCards.length}
            </Badge>
          )}
        </div>

        <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold h-8 px-3.5 cursor-pointer">
          <Link to="/mercado">Explorar Lojas</Link>
        </Button>
      </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {/* Resgatar Vale */}
 <div className="md:col-span-1">
 <div className=" bg-card rounded-2xl p-5 space-y-4">
 <div className="flex items-center gap-2">
 <Layers className="size-5 text-primary" />
 <h2 className="text-base font-bold text-foreground">Resgatar Vale</h2>
 </div>
 <p className="text-xs text-muted-foreground">
 Digite o código de 12 dígitos para adicionar o saldo à sua conta.
 </p>

 <Form {...form}>
 <form onSubmit={form.handleSubmit(handleClaim)} className="space-y-4 pt-2">
 <FormField
 control={form.control}
 name="code"
 render={({ field }) => (
 <FormItem>
 <FormLabel className="text-xs font-semibold text-foreground">
 Código do Cartão
 </FormLabel>
 <FormControl>
 <Input
 placeholder="Ex: ABCD-1234-WXYZ"
 className="font-mono uppercase font-bold h-10 rounded-xl"
 {...field}
 />
 </FormControl>
 <FormMessage className="text-xs" />
 </FormItem>
 )}
 />
 <Button
 type="submit"
 className="w-full font-bold text-xs h-10 bg-primary text-primary-foreground rounded-xl"
 disabled={isLoading}
 >
 {isLoading ? (
 <>
 <Loader2 className="size-4 animate-spin mr-2" />
 Resgatando...
 </>
 ) : (
 "Resgatar Saldo"
 )}
 </Button>
 </form>
 </Form>
 </div>
 </div>

 {/* Listagem de Cartões Vinculados */}
 <div className="md:col-span-2 space-y-4">
 <div className="flex items-center justify-between pb-3">
 <h2 className="text-base font-bold text-foreground">Vales Vinculados</h2>
 <Badge variant="secondary" className="font-mono text-xs">
 {giftCards.length}
 </Badge>
 </div>

 {giftCards.length === 0 ? (
 <div className="border-0 p-8 text-center bg-card rounded-2xl flex flex-col items-center gap-3">
 <Gift className="size-10 text-muted-foreground/40" />
 <div className="space-y-1">
 <p className="font-semibold text-sm text-foreground">Nenhum vale ativo vinculado</p>
 <p className="text-xs text-muted-foreground max-w-sm mx-auto">
 Vales vinculados são aplicados automaticamente como saldo de desconto no checkout.
 </p>
 </div>
 </div>
 ) : (
 <div className="grid gap-3">
 {giftCards.map((card: any) => {
 const isUsed = card.status === "used" || card.balance_cents === 0;
 const isExpired = card.expires_at && new Date(card.expires_at) < new Date();

 return (
 <div
 key={card.id}
 className={`p-4 sm:p-5 bg-card flex flex-col sm:flex-row justify-between sm:items-center gap-3 rounded-xl transition-all ${
 isUsed || card.status === "cancelled" || isExpired
 ? "opacity-60 bg-muted/30"
 : "hover:border-primary/40 "
 }`}
 >
 <div className="space-y-1.5">
 <div className="flex items-center gap-2">
 <span className="font-mono font-bold text-sm bg-muted px-2 py-0.5 rounded-md">
 {card.code}
 </span>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleCopyCode(card.code)}
 className="size-7 rounded-md"
 title="Copiar código"
 >
 <Copy className="size-3.5" />
 </Button>
 </div>

 <div className="flex gap-3 text-xs text-muted-foreground font-mono">
 <span>Original: {formatMoney(card.initial_balance_cents)}</span>
 {card.expires_at && (
 <span className="flex items-center gap-1">
 <Calendar className="size-3" />
 Exp: {formatDate(card.expires_at).split(" ")[0]}
 </span>
 )}
 </div>
 </div>

 <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 border-border pt-3 sm:pt-0">
 <div className="text-right">
 <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
 Saldo Disponível
 </span>
 <span
 className={`text-lg font-bold ${
 isUsed ? "text-muted-foreground" : "text-primary"
 }`}
 >
 {formatMoney(card.balance_cents)}
 </span>
 </div>

 <div>
 {card.status === "cancelled" ? (
 <Badge variant="destructive" className="text-[10px] uppercase">
 Cancelado
 </Badge>
 ) : isExpired ? (
 <Badge variant="outline" className="text-[10px] uppercase">
 Expirado
 </Badge>
 ) : isUsed ? (
 <Badge variant="secondary" className="text-[10px] uppercase">
 Utilizado
 </Badge>
 ) : (
 <Badge className="bg-emerald-600 text-white text-[10px] uppercase">
 Ativo
 </Badge>
 )}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
