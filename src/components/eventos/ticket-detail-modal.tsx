import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  User,
  Share2,
  Download,
  ArrowRightLeft,
  XCircle,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Building,
  QrCode,
  Copy,
  Check,
} from "lucide-react";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { generateQrCodeDataUri } from "@/lib/qr-code";
import { TicketTransferModal } from "./ticket-transfer-modal";
import { TicketCancelModal } from "./ticket-cancel-modal";
import type { CustomerEventTicketDTO } from "@/services/event-tickets.functions";

interface TicketDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: CustomerEventTicketDTO | null;
  onTicketUpdated?: () => void;
}

export function TicketDetailModal({
  open,
  onOpenChange,
  ticket,
  onTicketUpdated,
}: TicketDetailModalProps) {
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!ticket) return null;

  const isValid = !ticket.isUsed && ["paid", "processing", "completed", "valid"].includes(ticket.status);
  const isCancelled = ["cancelled", "returned", "revoked"].includes(ticket.status);
  const isUsed = ticket.isUsed || ticket.status === "used";

  const qrDataUri = useMemo(() => {
    return generateQrCodeDataUri(ticket.qrHash || ticket.humanCode);
  }, [ticket.qrHash, ticket.humanCode]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(ticket.humanCode || ticket.accessCode);
      setCopiedCode(true);
      toast.success("Código de acesso copiado!");
      setTimeout(() => setCopiedCode(false), 3000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: ticket.eventTitle,
        text: `Meu ingresso: ${ticket.eventTitle} — Código: ${ticket.humanCode || ticket.accessCode}`,
        url: window.location.href,
      });
    } catch {
      handleCopyCode();
    }
  };

  const handleDownloadCalendar = () => {
    if (!ticket.eventDate) {
      toast.error("Data do evento indisponível.");
      return;
    }

    const startDate = ticket.eventDate.replace(/[^0-9]/g, "").slice(0, 8);
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Waesy Inc.//Waesy Tickets//PT",
      "BEGIN:VEVENT",
      `SUMMARY:${ticket.eventTitle}`,
      `DESCRIPTION:Ingresso Waesy: ${ticket.lotName || "Geral"} - Código: ${ticket.humanCode}`,
      `LOCATION:${ticket.eventLocation || "Local a confirmar"}`,
      `DTSTART:${startDate || "20261101"}T190000Z`,
      `DTEND:${startDate || "20261101"}T230000Z`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ingresso_${ticket.humanCode}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Arquivo de calendário (.ics) baixado com sucesso!");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-full overflow-y-auto p-0 gap-0">
          {/* Header com Capa ou Banner */}
          <div className="relative h-40 bg-muted overflow-hidden">
            {ticket.coverUrl ? (
              <img
                src={ticket.coverUrl}
                alt={ticket.eventTitle}
                className="size-full object-cover"
              />
            ) : (
              <div className="size-full flex items-center justify-center bg-primary/5">
                <Ticket className="size-16 text-primary/30" />
              </div>
            )}
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
              <div>
                <Badge
                  variant={isUsed ? "secondary" : isCancelled ? "destructive" : "default"}
                  className="text-xs font-bold px-2 py-1 rounded-md shadow-xs"
                >
                  {isUsed ? (
                    <>
                      <CheckCircle2 className="size-3 mr-1" />
                      Utilizado
                    </>
                  ) : isCancelled ? (
                    <>
                      <XCircle className="size-3 mr-1" />
                      Cancelado / Revogado
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3 mr-1" />
                      Válido • Entrada Liberada
                    </>
                  )}
                </Badge>
              </div>
              <span className="text-sm font-black font-mono text-foreground bg-background/80 backdrop-blur-md px-2 py-1 rounded-md border border-border/40">
                {ticket.priceCents === 0 ? "Gratuito" : formatMoney(ticket.priceCents)}
              </span>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Informações Principais */}
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground leading-tight">
                {ticket.eventTitle}
              </h3>
              {ticket.lotName && (
                <p className="text-xs font-semibold text-primary">{ticket.lotName}</p>
              )}
            </div>

            {/* Credencial Digital WCTS-1 com QR Code Vetorial Offline */}
            <div className="p-4 bg-muted/20 border border-border/60 rounded-lg flex flex-col items-center justify-center text-center space-y-3">
              <div className="p-3 bg-card rounded-lg border border-border flex flex-col items-center">
                {isValid ? (
                  <img
                    src={qrDataUri}
                    alt={`QR Code ${ticket.humanCode}`}
                    className="size-48 object-contain rounded-lg"
                  />
                ) : (
                  <div className="size-48 flex flex-col items-center justify-center text-muted-foreground/40 gap-2 border border-dashed border-border/60 rounded-lg">
                    <QrCode className="size-16" />
                    <span className="text-xs font-bold">QR Revogado / Usado</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-mono font-black text-foreground tracking-wider">
                    {ticket.humanCode || ticket.accessCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="size-11 min-h-11 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    title="Copiar código"
                  >
                    {copiedCode ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  Apresente este QR Code na portaria do evento
                </p>
                <p className="text-xs text-muted-foreground">
                  Funciona 100% offline. Aumente o brilho da tela para agilizar a leitura.
                </p>
              </div>
            </div>

            {/* Metadados do Evento e Titular */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {ticket.eventDate && (
                <div className="p-3 bg-muted/20 rounded-lg border border-border/40 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                    <Calendar className="size-3.5 text-primary" />
                    <span>Data</span>
                  </div>
                  <p className="font-bold text-foreground">{formatDate(ticket.eventDate)}</p>
                </div>
              )}

              {ticket.eventLocation && (
                <div className="p-3 bg-muted/20 rounded-lg border border-border/40 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                    <MapPin className="size-3.5 text-primary" />
                    <span>Local</span>
                  </div>
                  <p className="font-bold text-foreground truncate">{ticket.eventLocation}</p>
                </div>
              )}

              <div className="p-3 bg-muted/20 rounded-lg border border-border/40 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                  <User className="size-3.5 text-primary" />
                  <span>Titular do Ingresso</span>
                </div>
                <p className="font-bold text-foreground">{ticket.recipientName || "Titular Nominal"}</p>
              </div>

              <div className="p-3 bg-muted/20 rounded-lg border border-border/40 space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground font-semibold">
                  <ShieldCheck className="size-3.5 text-primary" />
                  <span>Padrão de Segurança</span>
                </div>
                <p className="font-bold text-foreground font-mono">WCTS-1 (HMAC-SHA256)</p>
              </div>
            </div>

            {/* Informações de Cancelamento se houver */}
            {ticket.cancellationReason && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs space-y-1 text-destructive">
                <p className="font-bold">Motivo do Cancelamento:</p>
                <p>{ticket.cancellationReason}</p>
              </div>
            )}

            {/* Ações Primárias e de Gestão */}
            <div className="pt-2 border-t border-border/40 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleShare}
                  className="h-11 min-h-11 text-xs font-semibold rounded-lg gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Share2 className="size-4" />
                  <span>Compartilhar</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadCalendar}
                  className="h-11 min-h-11 text-xs font-semibold rounded-lg gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Download className="size-4" />
                  <span>Calendário (.ics)</span>
                </Button>
              </div>

              {isValid && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsTransferOpen(true)}
                    className="h-11 min-h-11 text-xs font-semibold rounded-lg gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ArrowRightLeft className="size-4" />
                    <span>Transferir</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCancelOpen(true)}
                    className="h-11 min-h-11 text-xs font-semibold rounded-lg gap-2 cursor-pointer text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive"
                  >
                    <XCircle className="size-4" />
                    <span>Cancelar</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Transferência */}
      <TicketTransferModal
        open={isTransferOpen}
        onOpenChange={setIsTransferOpen}
        ticket={{
          id: ticket.id,
          eventTitle: ticket.eventTitle,
          humanCode: ticket.humanCode,
          recipientName: ticket.recipientName,
        }}
        onSuccess={() => {
          onTicketUpdated?.();
          onOpenChange(false);
        }}
      />

      {/* Modal de Cancelamento */}
      <TicketCancelModal
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        ticket={{
          id: ticket.id,
          eventTitle: ticket.eventTitle,
          humanCode: ticket.humanCode,
        }}
        onSuccess={() => {
          onTicketUpdated?.();
          onOpenChange(false);
        }}
      />
    </>
  );
}
