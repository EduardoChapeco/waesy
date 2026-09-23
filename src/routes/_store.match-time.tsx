import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { generateMatchTimeOffers } from "@/services/marketing.functions";
import { useCartContext } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Heart, X, Layers, ShoppingBag, ArrowLeft } from 'lucide-react';
import { toast } from "sonner";
import { formatMoney } from "@/lib/money";

import { addToCart } from "@/services/cart.functions";

export const Route = createFileRoute("/_store/match-time")({
 head: () => ({ meta: [{ title: "Match Time! Ofertas Surpresa" }] }),
 loader: async () => {
   try {
 return await generateMatchTimeOffers();
   } catch (err) {
     console.error("[loader:_store.match-time] Unhandled loader error:", err);
     return null as any;
    }
 },
 component: MatchTimePage,
});

function MatchTimePage() {
 const initialOffers = Route.useLoaderData();
 const { refreshCart, isCartUpdating, setIsCartOpen } = useCartContext();
 const router = useRouter();

 const [offers, setOffers] = useState<any[]>(initialOffers);
 const [currentIndex, setCurrentIndex] = useState(0);
 const [direction, setDirection] = useState<"left" | "right" | null>(null);

 const currentOffer = offers[currentIndex];

 const handleSwipe = async (swipeDirection: "left" | "right") => {
 if (!currentOffer || direction !== null || isCartUpdating) return;

 setDirection(swipeDirection);

 if (swipeDirection === "right") {
 // Match! Add to cart with the flash price
 try {
 await addToCart({ data: { variantId: currentOffer.variantId, quantity: 1 } });
 await refreshCart();
 toast.success("Deu Match! Adicionado ao carrinho com desconto oculto.");
 } catch (e: unknown) {
 toast.error("Erro ao adicionar oferta.");
 }
 }

 // Animate out and move to next
 setTimeout(() => {
 setDirection(null);
 setCurrentIndex((prev) => prev + 1);
 }, 400); // Wait for CSS animation
 };

 if (!currentOffer && currentIndex > 0) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6 space-y-6">
 <div className="size-24 rounded-full bg-primary/10 text-primary flex items-center justify-center">
 <Layers className="size-12" />
 </div>
 <h1 className="text-2xl font-semibold tracking-tight">Acabaram as ofertas de hoje!</h1>
 <p className="text-muted-foreground max-w-md">
 Você varreu todas as promoções secretas que preparamos para você neste momento. Volte mais
 tarde!
 </p>
 <div className="flex gap-4">
 <Button onClick={() => router.navigate({ to: "/mercado" })} variant="outline" size="lg">
 Ir para o Catálogo
 </Button>
 <Button onClick={() => setIsCartOpen(true)} size="lg">
 <ShoppingBag className="w-5 h-5 mr-2" />
 Ver meu Carrinho
 </Button>
 </div>
 </div>
 );
 }

 return (
 <div className="flex flex-col items-center justify-center min-h-[75vh] py-8 relative overflow-hidden">
 <div className="w-full max-w-sm mb-6 flex items-center justify-between px-4">
 <Link
 to="/"
 className="text-muted-foreground hover:text-foreground p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
 >
 <ArrowLeft className="w-6 h-6" />
 </Link>
 <div className="flex items-center text-primary font-semibold text-xl tracking-tight">
 <Layers className="w-5 h-5 mr-1" />
 Match Time
 </div>
 <div className="w-10"></div> {/* spacer */}
 </div>

 <div className="relative w-full max-w-sm aspect-[3/4] mx-auto px-4 perspective-1000">
 {currentOffer && (
 <div
 className={`absolute inset-0 px-4 transition-all duration-300 ease-out transform ${direction === "left" ? "-translate-x-full rotate-[-20deg] opacity-0" : direction === "right" ? "translate-x-full rotate-[20deg] opacity-0" : "translate-x-0 opacity-100"}`}
 >
 <div className="w-full h-full bg-card border overflow-hidden relative group">
 {/* Image */}
 <div className="w-full h-[65%] bg-muted relative">
 {currentOffer.image ? (
 <img
 src={currentOffer.image}
 alt={currentOffer.title}
 className="w-full h-full object-cover"
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center text-muted-foreground">
 Sem Imagem
 </div>
 )}

 <div className="absolute top-4 right-4 bg-primary text-primary-foreground font-semibold px-3 py-1.5 rounded-full text-sm">
 -{currentOffer.discountPercentage}%
 </div>
 </div>

 {/* Info */}
 <div className="p-6 flex flex-col justify-between h-[35%]">
 <div>
 <h2 className="font-bold text-xl leading-tight line-clamp-2">
 {currentOffer.title}
 </h2>
 <p className="text-sm text-muted-foreground mt-1">{currentOffer.variantName}</p>
 </div>
 <div className="flex items-end gap-2 mt-auto">
 <span className="text-sm text-muted-foreground line-through">
 {formatMoney(currentOffer.originalPrice)}
 </span>
 <span className="text-2xl font-bold text-primary">
 {formatMoney(currentOffer.matchPrice)}
 </span>
 </div>
 </div>

 {/* Overlays during swipe */}
 <div
 className={`absolute inset-0 bg-destructive/20 transition-opacity flex items-center justify-center ${direction === "left" ? "opacity-100" : "opacity-0"}`}
 >
 <div className="border border-destructive rounded text-destructive font-bold text-4xl p-4 rotate-[-20deg] uppercase">
 Nope
 </div>
 </div>
 <div
 className={`absolute inset-0 bg-success/20 transition-opacity flex items-center justify-center ${direction === "right" ? "opacity-100" : "opacity-0"}`}
 >
 <div className="border border-success rounded text-success font-bold text-4xl p-4 rotate-[20deg] uppercase">
 Match!
 </div>
 </div>
 </div>
 </div>
 )}
 </div>

 {/* Controls */}
 <div className="flex gap-6 mt-10">
 <Button
 variant="outline"
 size="icon"
 className="w-16 h-16 rounded-full border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all"
 onClick={() => handleSwipe("left")}
 disabled={direction !== null || isCartUpdating}
 >
 <X className="w-8 h-8" />
 </Button>

 <Button
 variant="outline"
 size="icon"
 className="w-16 h-16 rounded-full border border-success text-success hover:bg-success hover:text-success-foreground transition-all "
 onClick={() => handleSwipe("right")}
 disabled={direction !== null || isCartUpdating}
 >
 <Heart className="w-8 h-8 fill-current" />
 </Button>
 </div>

 <p className="text-xs text-muted-foreground mt-6 text-center px-8">
 Deslize ou use os botões.
 <br />
 As ofertas do Match Time só são válidas se adicionadas agora!
 </p>
 </div>
 );
}
