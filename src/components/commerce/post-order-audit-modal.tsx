import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X, ShieldCheck, Layers } from 'lucide-react';
import { submitPostOrderAudit } from "@/services/tag-audit.functions";
import { toast } from "sonner";

interface PostOrderAuditModalProps {
 isOpen: boolean;
 onClose: () => void;
 orderId?: string;
 storeId: string;
 storeName: string;
 tagsToAudit?: Array<"entrega_gratis" | "entrega_expressa" | "compre_2_leve_1">;
}

export function PostOrderAuditModal({
 isOpen,
 onClose,
 orderId,
 storeId,
 storeName,
 tagsToAudit = ["entrega_gratis"],
}: PostOrderAuditModalProps) {
 const [currentStep, setCurrentStep] = useState(0);
 const [isSubmitting, setIsSubmitting] = useState(false);

 const tagQuestions = {
 entrega_gratis: {
 title: "Verificação de Frete Grátis",
 question: `O seu pedido em ${storeName} tinha a tag "Entrega Grátis". Foi cobrado algum valor extra de frete pelo entregador ou pela loja?`,
 yesLabel: "Sim, me cobraram por fora",
 noLabel: "Não, o frete foi 100% grátis",
 isYesBad: true,
 },
 entrega_expressa: {
 title: "Verificação de Entrega Expressa",
 question: `O seu pedido foi marcado como "Entrega Expressa / Full". Ele chegou dentro do tempo prometido?`,
 yesLabel: "Sim, chegou no prazo!",
 noLabel: "Não, houve atraso considerável",
 isYesBad: false,
 },
 compre_2_leve_1: {
 title: "Verificação de Bonificação (2x1)",
 question: `O anúncio prometia a promoção "Compre 2 Leve 1". Você recebeu os itens bonificados corretamente?`,
 yesLabel: "Sim, tudo certo!",
 noLabel: "Não recebi a bonificação",
 isYesBad: false,
 },
 };

 const currentTag = tagsToAudit[currentStep] || "entrega_gratis";
 const config = tagQuestions[currentTag];

 const handleAnswer = async (answeredYes: boolean) => {
 setIsSubmitting(true);
 const wasFulfilled = config.isYesBad ? !answeredYes : answeredYes;
 const extraFee = config.isYesBad ? answeredYes : false;

 try {
 await submitPostOrderAudit({
 data: {
 order_id: orderId,
 store_id: storeId,
 tag_audited: currentTag,
 was_fulfilled: wasFulfilled,
 extra_fee_charged: extraFee,
 },
 });

 if (currentStep < tagsToAudit.length - 1) {
 setCurrentStep((prev) => prev + 1);
 } else {
 toast.success("Obrigado! Sua avaliação ajuda a manter a Comunidade Waesy confiável.");
 onClose();
 }
 } catch {
 onClose();
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <Dialog open={isOpen} onOpenChange={onClose}>
 <DialogContent className="sm:max-w-[420px] sm:rounded-lg bg-card sm:p-6 p-5">
 <DialogHeader className="space-y-2">
 <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-1">
 <ShieldCheck className="size-5" />
 </div>
 <DialogTitle className="text-base font-bold text-foreground">
 {config.title}
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
 {config.question}
 </DialogDescription>
 </DialogHeader>

 <div className="grid grid-cols-2 gap-3 pt-4">
 <Button
 type="button"
 variant="outline"
 disabled={isSubmitting}
 onClick={() => handleAnswer(false)}
 className="h-12 rounded-lg font-bold text-xs flex items-center gap-2 border-border hover:bg-muted/70 cursor-pointer"
 >
 <X className="size-4 text-destructive" />
 <span className="truncate">{config.noLabel}</span>
 </Button>

 <Button
 type="button"
 disabled={isSubmitting}
 onClick={() => handleAnswer(true)}
 className="h-12 rounded-lg font-bold text-xs bg-foreground text-background flex items-center gap-2 hover:bg-foreground/90 cursor-pointer"
 >
 <Check className="size-4 text-emerald-400" />
 <span className="truncate">{config.yesLabel}</span>
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 );
}
