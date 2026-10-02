/**
 * product-waitlist-sheet.tsx — Captura de Intenção Comercial (Waitlist)
 * Sheet clean e direto para o cliente entrar na fila de espera de itens esgotados.
 */

import { useState } from "react";
import { toast } from "sonner";
import { BellRing, CheckCircle2, ShoppingBag } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { joinProductWaitlist } from "@/services/waitlist.functions";

interface ProductWaitlistSheetProps {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 product: {
 id: string;
 title: string;
 storeId: string;
 coverImageUrl?: string;
 };
 variant?: {
 id: string;
 sku?: string;
 attributes?: Record<string, string>;
 } | null;
}

export function ProductWaitlistSheet({
 open,
 onOpenChange,
 product,
 variant,
}: ProductWaitlistSheetProps) {
 const [name, setName] = useState("");
 const [contact, setContact] = useState("");
 const [notes, setNotes] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isSubmitted, setIsSubmitted] = useState(false);

 const variantAttributes = variant?.attributes
 ? Object.entries(variant.attributes)
 .map(([k, v]) => `${k}: ${v}`)
 .join(" • ")
 : null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim() || !contact.trim()) {
 toast.error("Por favor, preencha seu nome e WhatsApp.");
 return;
 }

 setIsSubmitting(true);
 try {
 await joinProductWaitlist({
 data: {
 storeId: product.storeId,
 productId: product.id,
 variantId: variant?.id || null,
 customerName: name,
 customerContact: contact,
 notes: notes || undefined,
 },
 });

 setIsSubmitted(true);
 toast.success("Você entrou na lista de espera! Avisaremos assim que o produto for reposto.");
 } catch (err: any) {
 toast.error(err?.message || "Erro ao entrar na lista de espera.");
 } finally {
 setIsSubmitting(false);
 }
 };

 const handleClose = () => {
 setIsSubmitted(false);
 onOpenChange(false);
 };

 return (
 <Sheet open={open} onOpenChange={onOpenChange}>
 <SheetContent
 side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col justify-between"
 >
 <SheetHeader className="p-6 border-b border-border/80">
 <div className="flex items-center gap-2 text-xs font-bold font-mono text-primary uppercase tracking-wider">
 <BellRing className="size-4" />
 <span>Lista de Espera</span>
 </div>
 <SheetTitle className="text-base font-bold text-foreground">
 Avise-me quando chegar
 </SheetTitle>
 <SheetDescription className="text-xs text-muted-foreground">
 Deixe seu contato para ser notificado assim que este item estiver disponível para compra.
 </SheetDescription>
 </SheetHeader>

 <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-5">
 {/* Card Resumo do Produto Selecionado */}
 <div className="p-4 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-3">
 <div className="size-14 rounded-lg overflow-hidden bg-background border border-border/60 shrink-0 flex items-center justify-center">
 {product.coverImageUrl ? (
 <img
 src={product.coverImageUrl}
 alt={product.title}
 className="size-full object-cover"
 />
 ) : (
 <ShoppingBag className="size-6 text-muted-foreground/40" />
 )}
 </div>
 <div className="min-w-0 space-y-1">
 <h4 className="text-xs font-bold text-foreground truncate">{product.title}</h4>
 {variantAttributes && (
 <Badge variant="outline" className="text-[10px] font-mono border-border">
 {variantAttributes}
 </Badge>
 )}
 <p className="text-[10px] text-destructive font-semibold">
 Atualmente esgotado no estoque
 </p>
 </div>
 </div>

 {isSubmitted ? (
 <div className="p-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
 <CheckCircle2 className="size-10 text-emerald-600 mx-auto" />
 <h3 className="text-sm font-bold text-foreground">Inscrição Confirmada!</h3>
 <p className="text-xs text-muted-foreground leading-relaxed">
 Registramos seu interesse em <strong>{product.title}</strong>. Assim que a loja repuser o estoque, entraremos em contato via WhatsApp.
 </p>
 <Button
 type="button"
 onClick={handleClose}
 className="mt-2 h-10 px-5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
 >
 Concluir
 </Button>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Seu Nome Completo *</Label>
 <Input
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Ex: Maria Silva"
 className="h-11 rounded-lg bg-card text-xs font-medium"
 required
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">WhatsApp ou Celular *</Label>
 <Input
 value={contact}
 onChange={(e) => setContact(e.target.value)}
 placeholder="(49) 99999-9999"
 className="h-11 rounded-lg bg-card text-xs font-medium font-mono"
 required
 />
 <p className="text-[11px] text-muted-foreground">
 Enviaremos uma mensagem direta com o link de compra assim que reposto.
 </p>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-bold text-foreground">Observações (Opcional)</Label>
 <Input
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Ex: Prefiro tamanho M caso chegue"
 className="h-11 rounded-lg bg-card text-xs font-medium"
 />
 </div>

 <Button
 type="submit"
 disabled={isSubmitting}
 className="w-full h-11 rounded-lg text-xs font-bold bg-primary text-primary-foreground gap-2 mt-4 shadow-sm"
 >
 <BellRing className="size-4" />
 <span>{isSubmitting ? "Salvando..." : "Entrar na Lista de Espera"}</span>
 </Button>
 </form>
 )}
 </div>

 {!isSubmitted && (
 <SheetFooter className="p-4 border-t border-border/80">
 <Button
 type="button"
 variant="ghost"
 onClick={() => onOpenChange(false)}
 className="w-full h-9 rounded-lg text-xs text-muted-foreground hover:text-foreground"
 >
 Voltar ao produto
 </Button>
 </SheetFooter>
 )}
 </SheetContent>
 </Sheet>
 );
}
