import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Ticket, Calendar, MapPin, Copy, Check, QrCode, Sparkles, ExternalLink, Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { purchaseEventTicketsInstant } from "@/services/event-tickets.functions";
import { useRouter } from "@tanstack/react-router";

interface TicketPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    title: string;
    event_date?: string | null;
    location?: string | null;
  };
  lot: {
    id: string;
    name: string;
    price_cents: number;
    capacity?: number;
    sold_count?: number;
  };
  userProfile?: {
    full_name?: string | null;
    email?: string | null;
    tax_id?: string | null;
  } | null;
}

export function TicketPurchaseModal({
  open,
  onOpenChange,
  event,
  lot,
  userProfile,
}: TicketPurchaseModalProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [attendeeName, setAttendeeName] = useState(userProfile?.full_name || "");
  const [attendeeEmail, setAttendeeEmail] = useState(userProfile?.email || "");
  const [attendeeTaxId, setAttendeeTaxId] = useState(userProfile?.tax_id || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const [pixResult, setPixResult] = useState<{
    orderId: string;
    amountCents: number;
    pixCopyPaste: string;
    qrDataUri: string;
    message: string;
  } | null>(null);

  const isFree = (lot.price_cents || 0) === 0;
  const totalPriceCents = (lot.price_cents || 0) * quantity;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendeeName.trim()) {
      toast.error("Informe o nome do titular do ingresso.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await purchaseEventTicketsInstant({
        data: {
          eventId: event.id,
          lotId: lot.id,
          quantity,
          attendeeName: attendeeName.trim(),
          attendeeEmail: attendeeEmail.trim() || undefined,
          attendeeTaxId: attendeeTaxId.trim() || undefined,
          paymentMethod: isFree ? "free" : "pix",
        },
      });

      if (res.status === "success") {
        toast.success(res.message || "Ingressos emitidos com sucesso!");
        onOpenChange(false);
        router.navigate({ to: "/conta/ingressos" });
      } else if (res.status === "pending_pix") {
        setPixResult({
          orderId: res.orderId,
          amountCents: res.amountCents,
          pixCopyPaste: res.pixCopyPaste,
          qrDataUri: res.qrDataUri,
          message: res.message,
        });
      }
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : String(err)) || "Erro ao processar ingresso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPix = async () => {
    if (!pixResult?.pixCopyPaste) return;
    try {
      await navigator.clipboard.writeText(pixResult.pixCopyPaste);
      setCopiedPix(true);
      toast.success("Código Pix Copia e Cola copiado!");
      setTimeout(() => setCopiedPix(false), 3000);
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-full overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Ticket className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {pixResult ? "Pagamento via Pix" : isFree ? "Emissão de Ingresso Grátis" : "Adquirir Ingressos"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate max-w-xs">
                {event.title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {pixResult ? (
          /* ── Tela de Pagamento PIX ── */
          <div className="space-y-4 pt-2 text-center">
            <div className="p-3 bg-muted/30 border border-border/50 rounded-lg space-y-1">
              <p className="text-xs text-muted-foreground">Valor Total a Pagar</p>
              <p className="text-xl font-black font-mono text-foreground">
                {formatMoney(pixResult.amountCents)}
              </p>
              <Badge variant="outline" className="text-xs font-mono">
                Lote: {lot.name} ({quantity}x)
              </Badge>
            </div>

            {/* QR Code Offline gerado via uqr */}
            <div className="flex flex-col items-center justify-center p-4 bg-card border border-border/60 rounded-lg shadow-xs">
              <img
                src={pixResult.qrDataUri}
                alt="QR Code Pix"
                className="size-44 object-contain rounded-md"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Abra o aplicativo do seu banco e escaneie o QR Code
              </p>
            </div>

            {/* Código Copia e Cola */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground text-left block">
                Pix Copia e Cola
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={pixResult.pixCopyPaste}
                  className="font-mono text-xs h-11 bg-muted/40"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyPix}
                  className="h-11 px-4 text-xs font-bold shrink-0 gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {copiedPix ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                  <span>{copiedPix ? "Copiado!" : "Copiar"}</span>
                </Button>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="default"
                onClick={() => {
                  onOpenChange(false);
                  router.navigate({ to: "/conta/ingressos" });
                }}
                className="w-full h-11 min-h-11 font-bold text-xs rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>Ver Meus Ingressos</span>
              </Button>
            </div>
          </div>
        ) : (
          /* ── Formulário de Inscrição / Emissão ── */
          <form onSubmit={handleConfirm} className="space-y-4 pt-2">
            <div className="p-3 bg-muted/20 border border-border/50 rounded-lg space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between font-semibold text-foreground">
                <span>{lot.name}</span>
                <span className="font-mono">{isFree ? "Gratuito" : formatMoney(lot.price_cents)}</span>
              </div>
              {event.event_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="size-3.5 text-primary" />
                  <span>{event.event_date}</span>
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="size-3.5 text-primary" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
            </div>

            {/* Quantidade */}
            <div className="space-y-2">
              <Label htmlFor="ticket-qty" className="text-xs font-semibold text-foreground">
                Quantidade
              </Label>
              <select
                id="ticket-qty"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-xs font-semibold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                {[1, 2, 3, 4, 5].map((q) => (
                  <option key={q} value={q}>
                    {q} {q === 1 ? "ingresso" : "ingressos"} {isFree ? "(Cortesia)" : `— ${formatMoney((lot.price_cents || 0) * q)}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Dados do Titular */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="attendee-name" className="text-xs font-semibold text-foreground">
                  Nome Completo do Titular *
                </Label>
                <Input
                  id="attendee-name"
                  value={attendeeName}
                  onChange={(e) => setAttendeeName(e.target.value)}
                  placeholder="Nome que constará no ingresso"
                  required
                  className="h-11 text-xs bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendee-email" className="text-xs font-semibold text-foreground">
                  E-mail para Recebimento
                </Label>
                <Input
                  id="attendee-email"
                  type="email"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="h-11 text-xs bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendee-cpf" className="text-xs font-semibold text-foreground">
                  CPF do Titular (Opcional para Validação na Portaria)
                </Label>
                <Input
                  id="attendee-cpf"
                  value={attendeeTaxId}
                  onChange={(e) => setAttendeeTaxId(e.target.value)}
                  placeholder="000.000.000-00"
                  className="h-11 text-xs bg-background font-mono"
                />
              </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Total:</span>
              <span className="text-base font-black font-mono text-primary">
                {isFree ? "R$ 0,00 (Gratuito)" : formatMoney(totalPriceCents)}
              </span>
            </div>

            <div className="pt-1 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-11 px-4 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 px-6 text-xs font-bold rounded-lg cursor-pointer gap-2 focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                <span>{isFree ? "Confirmar e Emitir" : "Avançar para Pix"}</span>
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
