import { Badge } from "@/components/ui/badge";
import { Ticket, Calendar, MapPin, QrCode } from "lucide-react";
import { formatMoney } from "@/lib/money";

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
    <div className="w-full max-w-[340px] mx-auto perspective-1000 select-none">
      <div className="relative bg-card rounded-2xl overflow-hidden shadow-xl border border-border/60 transition-transform hover:scale-[1.02] duration-300">
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
          <div className="absolute top-3 right-3 bg-background/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-black tracking-tight shadow-sm text-foreground border border-border/40">
            {priceCents === 0 ? "Cortesia / Grátis" : formatMoney(priceCents)}
          </div>

          {/* Logo Overlay */}
          {logoUrl && (
            <div className="absolute -bottom-5 left-5 h-11 w-11 rounded-xl bg-card p-1 shadow-md z-10 ring-1 ring-border">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
          )}
        </div>

        {/* Middle Section: Details */}
        <div className="pt-7 pb-5 px-5 space-y-3.5 bg-card">
          <div>
            <Badge
              variant="secondary"
              className="mb-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground"
            >
              {ticketType || "Ingresso Geral"}
            </Badge>
            <h3 className="text-lg font-bold leading-tight line-clamp-2 text-foreground">
              {eventName || "Nome do Evento"}
            </h3>
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground">
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
            <p className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded-lg border border-border/40">
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
          <div className="p-3 bg-white rounded-xl shadow-sm border border-border/20 flex flex-col items-center">
            {qrCodeValue ? (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=6&data=${encodeURIComponent(qrCodeValue)}`}
                alt={`QR Code ${qrCodeValue}`}
                className="size-20 object-contain"
                loading="lazy"
              />
            ) : (
              <QrCode className="size-20 text-neutral-950" />
            )}
            <span className="text-[9px] font-mono text-neutral-600 mt-1 uppercase tracking-wider">
              {qrCodeValue ? qrCodeValue.slice(0, 16) : "TKT-VALID-PASS"}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono mt-1">
            Validação Portaria Digital
          </p>
        </div>

        {/* Decorative Bottom Bar */}
        <div className="h-1.5 w-full bg-primary/20" />
      </div>
    </div>
  );
}
