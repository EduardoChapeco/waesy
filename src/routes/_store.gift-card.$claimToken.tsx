import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/commerce/page-header";
import { Button } from "@/components/ui/button";
import { checkGiftCardBalance, claimGiftCard } from "@/services/giftcard.functions";
import { getUserSession } from "@/services/auth.functions";
import { formatMoney } from "@/lib/money";
import { Gift, Lock, Loader2, Layers, ArrowRight, UserCheck } from 'lucide-react';
import { toast } from "sonner";

export const Route = createFileRoute("/_store/gift-card/$claimToken")({
 head: () => ({ meta: [{ title: "Resgatar Vale-Presente" }] }),
 loader: async ({ params: { claimToken } }) => {
   try {
 // Check if user is logged in using isomorphic server function
 const user = await getUserSession();

 try {
 const cardInfo = await checkGiftCardBalance({ data: { code: claimToken } });
 return {
 code: claimToken,
 card: cardInfo,
 user,
 error: null,
 };
 } catch (e: unknown) {
 return {
 code: claimToken,
 card: null,
 user,
 error: (e instanceof Error ? e.message : String(e)) || "Cartão-presente inválido.",
 };
 }
   } catch (err) {
     console.error("[loader:_store.gift-card.$claimToken] Unhandled loader error:", err);
     return { code: null, card: null, user: null, error: null };
   }
 },
 component: ClaimGiftCardPage,
});

function ClaimGiftCardPage() {
 const { code, card, user, error } = ((Route.useLoaderData?.() as any) || {});
 const navigate = useNavigate();
 const [isRedeeming, setIsRedeeming] = useState(false);
 const [showAnimation, setShowAnimation] = useState(false);

 // Play entry animation
 useEffect(() => {
 const timer = setTimeout(() => setShowAnimation(true), 150);
 return () => clearTimeout(timer);
 }, []);

 const handleClaim = async () => {
 if (!user) {
 toast.error("Por favor, faça login para resgatar este cartão.");
 navigate({ to: "/entrar", search: { returnUrl: window.location.pathname } });
 return;
 }

 setIsRedeeming(true);
 try {
 const res = await claimGiftCard({ data: { code } });
 if (res) {
 toast.success("Vale-Presente vinculado com sucesso!");
 navigate({ to: "/conta/gift-cards" });
 } else {
 toast.error("Erro ao vincular vale-presente.");
 }
 } catch (err: unknown) {
 toast.error((err instanceof Error ? err.message : String(err)) || "Erro inesperado.");
 } finally {
 setIsRedeeming(false);
 }
 };

 if (error || !card) {
 return (
 <div className="container max-w-lg py-24 mx-auto px-0 sm:px-4 text-center">
 <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
 <Lock className="size-8 text-destructive" />
 </div>
 <h1 className="text-2xl font-sans text-muted-foreground font-bold mb-3">
 Cartão Indisponível
 </h1>
 <p className="text-muted-foreground mb-8">
 {error ||
 "Este vale-presente não foi encontrado, já foi totalmente utilizado ou foi cancelado pela administração da loja."}
 </p>
 <Button asChild>
 <Link to="/">Voltar para a Vitrine</Link>
 </Button>
 </div>
 );
 }

 return (
 <div className="container max-w-4xl py-12 mx-auto px-0 sm:px-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
 {/* Left Side: Premium Glowing Gift Card Reveal */}
 <div className="flex justify-center items-center">
 <div
 className={`relative w-80 h-48 p-6 flex flex-col justify-between overflow-hidden transition-all duration-700 transform ${showAnimation ? "scale-100 translate-y-0" : "scale-75 rotate-3 translate-y-8"} hover:scale-105 hover: cursor-pointer group`}
 >
 {/*  effects overlay */}
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] pointer-events-none" />
 <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />

 <div className="flex justify-between items-start">
 <div>
 <span className="text-xs font-semibold text-accent">VALE-PRESENTE</span>
 <h3 className="font-sans text-muted-foreground font-bold text-white text-xl mt-1">Waesy</h3>
 </div>
 <div className="size-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
 <Gift className="size-5 text-white" />
 </div>
 </div>

 <div className="space-y-1">
 <span className="text-xs text-accent block font-mono">{code}</span>
 <div className="flex items-baseline gap-1 text-white">
 <span className="text-sm font-semibold">R$</span>
 <span className="text-4xl font-extrabold tracking-tight">
 {formatMoney(card.balanceCents).replace("R$", "").trim()}
 </span>
 </div>
 </div>

 <div className="flex justify-between items-center text-xs text-accent/80 border-t border-white/10 pt-3">
 <span>Exclusivo na Vitrine</span>
 <span className="flex items-center gap-1 font-mono">
 <Layers className="size-3.5 animate-spin" />
 ATIVO
 </span>
 </div>
 </div>
 </div>

 {/* Right Side: Information and Redemption Panel */}
 <div className="space-y-6">
 <span className="text-xs font-semibold text-primary block">VOCÊ GANHOU UM PRESENTE!</span>
 <h1 className="text-3xl md:text-4xl font-sans text-muted-foreground font-bold tracking-tight">
 Resgatar Vale-Presente de {formatMoney(card.balanceCents)}
 </h1>
 <p className="text-muted-foreground">
 Este código dá direito a um desconto instantâneo de{""}
 <strong>{formatMoney(card.balanceCents)}</strong> em qualquer compra na nossa loja.
 Resgate para sua conta para visualizar seu saldo durante o checkout.
 </p>

 <div className="bg-muted/40 p-4 flex items-start gap-3">
 <Gift className="size-5 text-primary shrink-0 mt-0.5" />
 <div className="text-xs text-muted-foreground font-normal space-y-1">
 <p className="font-semibold text-foreground">Como funciona?</p>
 <p>1. Clique em"Resgatar para minha conta" para vincular o saldo ao seu e-mail.</p>
 <p>
 2. No checkout, selecione a opção de saldo de Vale-Presente para abater nos seus
 produtos.
 </p>
 </div>
 </div>

 <div className="pt-2">
 {user ? (
 <Button
 size="lg"
 onClick={handleClaim}
 disabled={isRedeeming}
 className="w-full sm:w-auto font-semibold gap-2 shadow-primary/25"
 >
 {isRedeeming ? (
 <>
 <Loader2 className="animate-spin size-4" />
 Resgatando...
 </>
 ) : (
 <>
 <UserCheck className="size-4" />
 Resgatar para Minha Conta
 </>
 )}
 </Button>
 ) : (
 <div className="space-y-4">
 <Button asChild size="lg" className="w-full sm:w-auto font-semibold gap-2">
 <Link to="/entrar" search={{ returnUrl: window.location.pathname }}>
 Entrar para Resgatar
 <ArrowRight className="size-4" />
 </Link>
 </Button>
 <p className="text-xs text-muted-foreground">
 Você precisa criar uma conta ou fazer login para vincular permanentemente este
 saldo.
 </p>
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
