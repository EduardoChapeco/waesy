import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bike, Copy, Check, ExternalLink, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { createDeliveryDispatch, getCompanyDeliverySettings } from "@/services/company-delivery.functions";
import { formatMoney } from "@/lib/money";

export interface DispatchDeliveryModalProps {
  storeId: string;
  lead: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DispatchDeliveryModal({
  storeId,
  lead,
  isOpen,
  onClose,
  onSuccess,
}: DispatchDeliveryModalProps) {
  const [customerName, setCustomerName] = useState(lead?.customer_name || "");
  const [customerPhone, setCustomerPhone] = useState(lead?.customer_phone || "");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryFeeReais, setDeliveryFeeReais] = useState("0,00");
  const [orderAmountReais, setOrderAmountReais] = useState(
    lead?.amount_cents ? ((lead.amount_cents) / 100).toFixed(2).replace(".", ",") : "0,00"
  );
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [confirmationPin, setConfirmationPin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Atualiza se o lead mudar
  React.useEffect(() => {
    if (lead) {
      setCustomerName(lead.customer_name || "");
      setCustomerPhone(lead.customer_phone || "");
      setDeliveryAddress(lead.customer_address || "");
      if (lead.amount_cents) {
        setOrderAmountReais((lead.amount_cents / 100).toFixed(2).replace(".", ","));
      }
    }
  }, [lead]);

  const handleCreateDispatch = async () => {
    if (!deliveryAddress.trim()) {
      toast.error("Por favor, informe o endereço de entrega.");
      return;
    }

    setIsSubmitting(true);
    try {
      const feeCents = Math.max(0, Math.round(parseFloat(deliveryFeeReais.replace(",", ".")) * 100) || 0);
      const amountCents = Math.round(parseFloat(orderAmountReais.replace(",", ".")) * 100) || 0;

      const res = await createDeliveryDispatch({
        data: {
          storeId,
          dealId: lead?.id || undefined,
          classifiedId: lead?.classified_id || undefined,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          deliveryAddress: deliveryAddress.trim(),
          deliveryFeeCents: feeCents,
          orderAmountCents: amountCents,
          paymentMethod,
          notes: notes.trim() || undefined,
        },
      });

      if (res?.success) {
        const fullUrl = `${window.location.origin}${res.magicLinkUrl}`;
        setGeneratedLink(fullUrl);
        setConfirmationPin(res.confirmationPin);
        toast.success("Corrida gerada com sucesso! Compartilhe o link com o entregador.");
        onSuccess?.();
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao despachar entrega");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Link do motoboy copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!generatedLink) return;
    const text = `🛵 *NOVA ENTREGA DISPONÍVEL*\nCliente: ${customerName}\nEndereço: ${deliveryAddress}\nTaxa do Motoboy: R$ ${deliveryFeeReais}\nPIN de Confirmação: ${confirmationPin}\n\n👉 *Acesse a rota e confirme no link:*\n${generatedLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleResetAndClose = () => {
    setGeneratedLink(null);
    setConfirmationPin(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleResetAndClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Bike className="size-4" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              {generatedLink ? "Corrida Despachada!" : "Despachar para Entregador"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {generatedLink
              ? "Envie o Magic Link para o entregador. Ele poderá ver o destino no mapa e confirmar a entrega sem precisar de app."
              : "Gere um Link Mágico para seu entregador fixo ou motoboy avulso via WhatsApp."}
          </DialogDescription>
        </DialogHeader>

        {generatedLink ? (
          <div className="space-y-4 py-3">
            {/* Box com o Link e PIN */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Magic Link do Motoboy</span>
                {confirmationPin && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-mono font-bold">
                    PIN: {confirmationPin}
                  </Badge>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-background border border-border/60 text-xs font-mono text-muted-foreground break-all">
                {generatedLink}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="rounded-xl text-xs font-bold gap-1.5"
                >
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  <span>{copied ? "Copiado!" : "Copiar Link"}</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handleShareWhatsApp}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Send className="size-3.5" />
                  <span>Enviar no WhatsApp</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Cliente</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="rounded-xl h-10 text-xs bg-muted/20"
                placeholder="Nome do destinatário"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Endereço de Entrega *</Label>
              <Input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="rounded-xl h-10 text-xs"
                placeholder="Rua, número, bairro e referências..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Taxa do Motoboy (R$)</Label>
                <Input
                  value={deliveryFeeReais}
                  onChange={(e) => setDeliveryFeeReais(e.target.value)}
                  className="rounded-xl h-10 text-xs font-mono"
                  placeholder="10,00"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Valor do Pedido (R$)</Label>
                <Input
                  value={orderAmountReais}
                  onChange={(e) => setOrderAmountReais(e.target.value)}
                  className="rounded-xl h-10 text-xs font-mono"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-foreground">Observações / Instruções</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl h-10 text-xs"
                placeholder="Ex: Pagamento já feito no Pix / Cobrar na máquina"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/60">
          {generatedLink ? (
            <Button onClick={handleResetAndClose} className="rounded-xl text-xs font-bold w-full sm:w-auto">
              Concluir
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="rounded-xl text-xs font-bold">
                Cancelar
              </Button>
              <Button
                onClick={handleCreateDispatch}
                disabled={isSubmitting}
                className="rounded-xl text-xs font-bold gap-1.5"
              >
                {isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : <Bike className="size-3.5" />}
                <span>Gerar Link do Motoboy</span>
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
