import React from "react";
import { Plane, Hotel, MapPin, CheckCircle2 } from "lucide-react";
import { type Voucher } from "@/services/vouchers";
import { type BrandKit } from "@/lib/agency-context";

interface Props {
  voucher: Voucher;
  agency: {
    name: string;
    slug: string;
    logo_url?: string | null;
    brand_color?: string;
  };
  brandKit?: BrandKit | null;
}

export default function TemplateVoucherStory({ voucher: v, agency, brandKit }: Props) {
  const logoUrl = brandKit?.logo_white_url || brandKit?.logo_url || agency.logo_url;

  return (
    <div
      id="story-canvas"
      className="relative flex flex-col w-full h-full min-h-full overflow-hidden bg-card text-card-foreground select-none"
    >
      {/* ── 1. Topo: Logo & Identificação da Agência ── */}
      <div className="relative z-10 flex flex-col h-full p-6 sm:p-8 justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={agency.name}
                crossOrigin="anonymous"
                className="h-10 w-auto object-contain rounded-full p-1 bg-muted/60 border border-border"
              />
            ) : (
              <span className="font-extrabold text-lg tracking-tight text-primary">
                {agency.name}
              </span>
            )}
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
            Voucher 9:16
          </span>
        </div>

        {/* ── 2. Hero do Destino ── */}
        <div className="my-auto py-6 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground">
              Próximo Destino
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black leading-tight tracking-tight text-foreground">
            {v.destination ?? "Sua Viagem dos Sonhos"}
          </h1>

          {v.general_locator && (
            <div className="inline-block px-3 py-1 rounded-lg bg-muted text-xs font-mono text-foreground border border-border">
              LOCALIZADOR: <span className="font-bold text-primary">{v.general_locator}</span>
            </div>
          )}
        </div>

        {/* ── 3. Cards Informativos (Voo / Hotel) ── */}
        <div className="space-y-3">
          {v.flights && v.flights.length > 0 && (
            <div className="rounded-lg bg-muted/40 border border-border/80 p-4 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Plane className="size-3.5 text-primary" /> Voo Confirmado
                </span>
                <span className="font-mono text-foreground">{v.flights[0].flight_number || "Aéreo"}</span>
              </div>
              <div className="flex justify-between items-center text-base sm:text-lg font-bold text-foreground">
                <span>{v.flights[0].origin ?? "—"}</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-px w-6 bg-border" />
                  <Plane className="size-3 text-primary" />
                  <div className="h-px w-6 bg-border" />
                </div>
                <span>{v.flights[0].destination ?? "—"}</span>
              </div>
              <div className="text-xs text-muted-foreground text-center font-mono">
                {v.flights[0].airline} {v.flights[0].date && ` · ${v.flights[0].date}`}
              </div>
            </div>
          )}

          {v.accommodation && v.accommodation.length > 0 && (
            <div className="rounded-lg bg-muted/40 border border-border/80 p-4 space-y-1">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Hotel className="size-3.5 text-emerald-600" /> Hospedagem
                </span>
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Confirmado
                </span>
              </div>
              <div className="text-sm font-bold text-foreground truncate">
                {v.accommodation[0].name || "Hospedagem Selecionada"}
              </div>
              <div className="text-xs text-muted-foreground">
                {v.accommodation[0].city} · Check-in: {v.accommodation[0].checkin || "A combinar"}
              </div>
            </div>
          )}

          {/* ── 4. Rodapé do Story ── */}
          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>{agency.name}</span>
            <span>Apresentação Digital</span>
          </div>
        </div>
      </div>
    </div>
  );
}
