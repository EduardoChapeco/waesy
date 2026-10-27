import React from "react";
import { type Voucher } from "@/services/vouchers";
import { type BrandKit, type CompanyProfile } from "@/lib/agency-context";
import { Plane, Hotel, MapPin, CheckCircle2, AlertTriangle, ShieldCheck, QrCode } from "lucide-react";
import { generateQrCodeDataUri } from "@/lib/qr-code";

interface Props {
  voucher: Voucher;
  agency: {
    name: string;
    slug: string;
    logo_url?: string | null;
    brand_color?: string;
  };
  brandKit?: BrandKit | null;
  companyProfile?: CompanyProfile | null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div className="h-px flex-1 bg-border/60" />
      </div>
      {children}
    </div>
  );
}

export default function TemplateVoucherEmbarqueA4({
  voucher: v,
  agency,
  brandKit,
  companyProfile,
}: Props) {
  const logoUrl = brandKit?.logo_white_url || brandKit?.logo_url || agency.logo_url;
  const qrUri = generateQrCodeDataUri(v.general_locator || v.id || "VOUCHER-WAESY", { border: 1 });

  return (
    <div
      id="voucher-canvas"
      className="a4-page w-full max-w-3xl min-h-screen bg-card text-card-foreground p-8 sm:p-10 font-sans flex flex-col justify-between border border-border/80 mx-auto"
    >
      <div className="space-y-6">
        {/* ── 1. CABEÇALHO DO GUIA DE EMBARQUE ── */}
        <div className="flex items-start justify-between pb-6 border-b-2 border-foreground/80">
          <div className="space-y-1">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={agency.name}
                className="h-10 w-auto object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="text-xl font-black tracking-tight text-primary">
                {agency.name}
              </div>
            )}
            <p className="text-xs font-mono text-muted-foreground uppercase">
              Guia de Embarque & Voucher Oficial
            </p>
          </div>

          <div className="text-right space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              {v.destination ?? "Destino da Viagem"}
            </h1>
            {v.general_locator && (
              <div className="text-xs font-mono text-muted-foreground">
                LOCALIZADOR: <span className="font-bold text-primary">{v.general_locator}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── 2. PASSAGEIROS TITULARES ── */}
        {v.passengers && v.passengers.length > 0 && (
          <Section title="Passageiros Registrados">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {v.passengers.map((p: any, i: number) => (
                <div key={i} className="flex flex-col p-3 rounded-lg bg-muted/30 border border-border/80 text-xs">
                  <span className="font-bold text-sm text-foreground">{p.name}</span>
                  {p.document && <span className="text-muted-foreground">Doc: {p.document}</span>}
                  {p.seat && <span className="text-muted-foreground">Assento: {p.seat}</span>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── 3. DETALHAMENTO DE VOOS ── */}
        {v.flights && v.flights.length > 0 && (
          <Section title="Voos e Trechos Aéreos">
            <div className="space-y-3">
              {v.flights.map((f: any, i: number) => (
                <div key={i} className="p-4 rounded-lg bg-muted/20 border border-border/80 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-base font-black text-foreground">
                      <Plane className="size-4 text-primary" />
                      {f.origin ?? "—"} → {f.destination ?? "—"}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-mono uppercase bg-primary/10 text-primary border border-primary/20">
                      {f.class ?? "Econômica"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Cia Aérea:</span>
                      <span className="font-semibold text-foreground">{f.airline || "Aérea"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Voo:</span>
                      <span className="font-mono font-semibold text-foreground">{f.flight_number || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Data:</span>
                      <span className="font-mono font-semibold text-foreground">{f.date || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Saída / Chegada:</span>
                      <span className="font-mono font-semibold text-foreground">{f.departure_time || "—"} / {f.arrival_time || "—"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── 4. HOSPEDAGEM ── */}
        {v.accommodation && v.accommodation.length > 0 && (
          <Section title="Hospedagem Confirmada">
            <div className="space-y-3">
              {v.accommodation.map((a: any, i: number) => (
                <div key={i} className="p-4 rounded-lg bg-muted/20 border border-border/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Hotel className="size-4 text-emerald-600" />
                      {a.name || "Hotel Confirmado"}
                    </span>
                    <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="size-3.5" /> Reserva Ativa
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Cidade:</span>
                      <span className="font-semibold text-foreground">{a.city || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Check-in:</span>
                      <span className="font-mono font-semibold text-foreground">{a.checkin || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Check-out:</span>
                      <span className="font-mono font-semibold text-foreground">{a.checkout || "—"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* ── 5. VALIDAÇÃO & QR CODE DIGITAL ── */}
      <div className="pt-6 border-t border-border/80 flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-mono font-bold tracking-wider text-primary uppercase">
            Autenticidade & Validação Digital
          </span>
          <p className="text-xs text-muted-foreground max-w-sm">
            Documento com validação biométrica e hash criptográfico gerado pelo sistema Waesy.
          </p>
        </div>

        <div className="p-2 bg-card rounded-lg border border-border text-center space-y-1">
          {qrUri ? (
            <img src={qrUri} alt="QR Code" className="size-16 mx-auto pointer-events-none" />
          ) : (
            <div className="size-16 bg-muted rounded flex items-center justify-center text-xs font-mono">QR</div>
          )}
          <span className="text-xs font-mono text-muted-foreground font-bold block">
            {v.general_locator || "VCH-WAESY"}
          </span>
        </div>
      </div>
    </div>
  );
}
