import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { createQuickOrder } from "@/services/quick-order.functions";
import {
  ShoppingBag,
  Store,
  Truck,
  CheckCircle2,
  Loader2,
  QrCode,
  CreditCard,
  Banknote,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ProductQuickOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    title: string;
    priceCents: number;
    image?: string | null;
    storeId?: string | null;
    storeName?: string | null;
    storeSlug?: string | null;
    storePhone?: string | null;
  };
  selectedVariant?: {
    id: string;
    title?: string;
    effectivePriceCents?: number;
    attributes?: Record<string, string>;
  } | null;
  quantity?: number;
}

/**
 * 🏛️ ProductQuickOrderDialog — Concierge de Compra Expressa Waesy (Anti-Ghost Orders)
 *
 * Garante que:
 * 1. O clique em "Pedir Agora" grava a transação no banco (tabela `orders` e `order_items`) ANTES do WhatsApp.
 * 2. Gera Short ID Humano sequencial (#WSY-XXXX).
 * 3. Constrói a mensagem humana e educada de WhatsApp (The WhatsApp Concierge).
 * 4. Zero jargão técnico (status amigáveis, sem termos de código).
 */
export function ProductQuickOrderDialog({
  open,
  onOpenChange,
  product,
  selectedVariant,
  quantity = 1,
}: ProductQuickOrderDialogProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<"pickup" | "immediate">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "cash">("pix");
  const [cashChangeFor, setCashChangeFor] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unitPriceCents = selectedVariant?.effectivePriceCents || product.priceCents || 0;
  const subtotalCents = unitPriceCents * quantity;
  const deliveryFeeCents = deliveryMode === "immediate" ? 700 : 0; // Taxa padrão base (R$ 7,00) se entrega imediata
  const grandTotalCents = subtotalCents + deliveryFeeCents;

  const variantSummary = selectedVariant?.attributes
    ? Object.entries(selectedVariant.attributes)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" • ")
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || customerName.trim().length < 2) {
      toast.error("Por favor, informe seu nome para o comerciante.");
      return;
    }

    if (!customerPhone.trim() || customerPhone.replace(/\D/g, "").length < 8) {
      toast.error("Por favor, informe seu número de WhatsApp com DDD.");
      return;
    }

    if (deliveryMode === "immediate" && !deliveryAddress.trim()) {
      toast.error("Por favor, informe o endereço de entrega completo.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createQuickOrder({
        data: {
          storeId: product.storeId || undefined,
          storeSlug: product.storeSlug || undefined,
          storeName: product.storeName || "Loja Parceira",
          sellerPhone: product.storePhone || undefined,
          productId: product.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          items: [
            {
              title: product.title,
              quantity,
              unitPriceCents,
              totalCents: subtotalCents,
              variantId: selectedVariant?.id,
              imageUrl: product.image || undefined,
              itemDetails: variantSummary,
            },
          ],
          subtotalCents,
          deliveryFeeCents,
          discountCents: 0,
          grandTotalCents,
          deliveryMode,
          deliveryAddress: deliveryMode === "immediate" ? deliveryAddress.trim() : undefined,
          paymentMethod,
          cashChangeFor: paymentMethod === "cash" && cashChangeFor ? cashChangeFor : undefined,
        },
      });

      if (res.status === "error" || !res.orderId) {
        toast.error(res.message || "Não foi possível registrar o pedido no momento.");
        return;
      }

      toast.success(`Pedido #${res.shortId} registrado com sucesso!`);
      onOpenChange(false);

      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, "_blank");
      }
    } catch (err: unknown) {
      console.error("[quick-order-dialog] Erro ao criar pedido:", err);
      toast.error("Não foi possível processar seu pedido. Verifique sua conexão e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-5 sm:p-6 rounded-2xl bg-card border-border/60 shadow-xl overflow-hidden">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="size-5 text-primary" />
            <span>Confirmar Pedido</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Seu pedido é gravado com identificador único antes de enviar ao WhatsApp da loja.
          </DialogDescription>
        </DialogHeader>

        {/* Resumo do Produto Selecionado */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-3">
          {product.image ? (
            <img
              src={product.image}
              alt={product.title}
              className="size-14 rounded-lg object-cover bg-background shrink-0 border border-border/40"
            />
          ) : (
            <div className="size-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Store className="size-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-0.5">
            <h4 className="text-xs font-bold text-foreground truncate">{product.title}</h4>
            {variantSummary && (
              <p className="text-[11px] text-muted-foreground truncate">{variantSummary}</p>
            )}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="font-mono text-muted-foreground">Qtd: {quantity}x</span>
              <span className="font-mono font-bold text-foreground">
                {formatMoney(subtotalCents)}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Dados Pessoais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">Seu Nome</label>
              <Input
                placeholder="Ex: Ana Silva"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-10 text-xs rounded-xl bg-background border-border/60"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-foreground">Seu WhatsApp</label>
              <Input
                placeholder="(00) 00000-0000"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-10 text-xs rounded-xl bg-background border-border/60"
                required
              />
            </div>
          </div>

          {/* Modo de Recebimento */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground">Como deseja receber?</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryMode("pickup")}
                className={cn(
                  "p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer",
                  deliveryMode === "pickup"
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold">Retirada</span>
                  <Store className="size-3.5" />
                </div>
                <span className="text-[10px] text-muted-foreground">No balcão (Grátis)</span>
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMode("immediate")}
                className={cn(
                  "p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer",
                  deliveryMode === "immediate"
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/30"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold">Entrega</span>
                  <Truck className="size-3.5" />
                </div>
                <span className="text-[10px] text-muted-foreground">No seu endereço</span>
              </button>
            </div>
          </div>

          {/* Endereço de Entrega se não for retirada */}
          {deliveryMode === "immediate" && (
            <div className="space-y-1 animate-in fade-in-50 duration-150">
              <label className="text-[11px] font-semibold text-foreground">Endereço de Entrega</label>
              <Input
                placeholder="Rua, Número, Bairro e Ponto de Referência"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="h-10 text-xs rounded-xl bg-background border-border/60"
                required
              />
            </div>
          )}

          {/* Forma de Pagamento */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-foreground">Forma de Pagamento</label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod("pix")}
                className={cn(
                  "p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer",
                  paymentMethod === "pix"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                )}
              >
                <QrCode className="size-3.5" />
                <span className="text-[10px]">PIX</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("card")}
                className={cn(
                  "p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer",
                  paymentMethod === "card"
                    ? "border-primary bg-primary/10 text-foreground font-bold"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                )}
              >
                <CreditCard className="size-3.5" />
                <span className="text-[10px]">Cartão</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("cash")}
                className={cn(
                  "p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer",
                  paymentMethod === "cash"
                    ? "border-primary bg-primary/10 text-foreground font-bold"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                )}
              >
                <Banknote className="size-3.5" />
                <span className="text-[10px]">Dinheiro</span>
              </button>
            </div>
          </div>

          {/* Campo de Troco se Dinheiro */}
          {paymentMethod === "cash" && (
            <div className="space-y-1 animate-in fade-in-50 duration-150">
              <label className="text-[11px] font-semibold text-foreground">Troco para quanto?</label>
              <Input
                placeholder="Ex: 50,00 ou Não preciso"
                value={cashChangeFor}
                onChange={(e) => setCashChangeFor(e.target.value)}
                className="h-10 text-xs rounded-xl bg-background border-border/60"
              />
            </div>
          )}

          {/* Linha de Total */}
          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-sm">
            <span className="text-xs text-muted-foreground">Total com envio:</span>
            <span className="font-mono font-bold text-base text-foreground">
              {formatMoney(grandTotalCents)}
            </span>
          </div>

          {/* Ação Principal: Gravar no Supabase e Abrir WhatsApp */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-11 rounded-xl text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95 transition-all shadow-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Registrando Pedido...</span>
              </>
            ) : (
              <>
                <MessageCircle className="size-4" />
                <span>Pedir Agora no WhatsApp</span>
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
