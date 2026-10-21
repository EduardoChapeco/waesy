import { Badge } from "@/components/ui/badge";
import { Ticket, Calendar, MapPin, QrCode } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { generateQrCodeDataUri } from "@/lib/qr-code";

interface TicketPreviewProps {
  eventName: string;
  ticketType: string;
  priceCents: number;
  description?: string;
  date?: string;
  location?: string;
  coverImage?: string;
  logoUrl?: string;
  qrCodeValue?: string;
}

export function TicketPreview({
  eventName,
  ticketType,
  priceCents,
  description,
  date,
  location,
  coverImage,
  logoUrl,
  qrCodeValue,
}: TicketPreviewProps) {
  return (
    <div className="w-full max-w-xs mx-auto select-none">
      <div className="relative bg-card rounded-lg overflow-hidden border border-border/60 transition-transform duration-300">
        {/* Upper Section: Event Info */}
        <div className="relative h-44 bg-muted">
          {coverImage ? (
            <img
              src={coverImage}
              alt={eventName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/30">
              <Ticket className="h-12 w-12 text-primary/40" />
            </div>
          )}

          {/* Floating Price Tag */}
          <div className="absolute top-3 right-3 bg-background/95 backdrop-blur-md px-3 py-2 rounded-lg text-xs font-black tracking-tight text-foreground border border-border/40">
            {priceCents === 0 ? "Cortesia / Grátis" : formatMoney(priceCents)}
          </div>

          {/* Logo Overlay */}
          {logoUrl && (
            <div className="absolute -bottom-5 left-5 h-11 w-11 rounded-lg bg-card p-1 z-10 ring-1 ring-border">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
          )}
        </div>

        {/* Middle Section: Details */}
        <div className="pt-7 pb-5 px-5 space-y-4 bg-card">
          <div>
            <Badge
              variant="secondary"
              className="mb-2 text-xs uppercase font-bold tracking-wider text-muted-foreground"
            >
              {ticketType || "Ingresso Geral"}
            </Badge>
            <h3 className="text-lg font-bold leading-tight line-clamp-2 text-foreground">
              {eventName || "Nome do Evento"}
            </h3>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 shrink-0 text-primary" />
              <span>{date || "Data a definir"}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5 shrink-0 text-primary" />
              <span className="line-clamp-1">{location || "Local a definir"}</span>
            </div>
          </div>

          {description && (
            <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded-lg border border-border/40">
              {description}
            </p>
          )}
        </div>

        {/* Dashed Separator (Tear Line) */}
        <div className="relative flex items-center justify-between px-2 bg-card">
          <div className="h-5 w-5 rounded-full bg-background -ml-3 border-r border-border/60 shadow-inner" />
          <div className="flex-1 border-b-2 border-dashed border-border/50 mx-2" />
          <div className="h-5 w-5 rounded-full bg-background -mr-3 border-l border-border/60 shadow-inner" />
        </div>

        {/* Lower Section: QR Code Pass */}
        <div className="p-5 bg-card flex flex-col items-center justify-center gap-2">
          <div className="p-3 bg-card rounded-lg border border-border flex flex-col items-center">
            {qrCodeValue ? (
              <img
                src={generateQrCodeDataUri(qrCodeValue)}
                alt={`QR Code ${qrCodeValue}`}
                className="size-20 object-contain"
                loading="lazy"
              />
            ) : (
              <QrCode className="size-20 text-foreground" />
            )}
            <span className="text-xs font-mono text-muted-foreground mt-1 uppercase tracking-wider">
              {qrCodeValue ? qrCodeValue.slice(0, 16) : "TKT-VALID-PASS"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono mt-1">
            Validação Portaria Digital
          </p>
        </div>

        {/* Decorative Bottom Bar */}
        <div className="h-1 w-full bg-primary/20" />
      </div>
    </div>
  );
}
