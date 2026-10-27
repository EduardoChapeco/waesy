import React, { useMemo } from "react";
import { Plane, Hotel, MapPin } from "lucide-react";
import type { TravelVoucherDTO } from "@/types/travel-vouchers";
import { generateQrCodeDataUri } from "@/lib/qr-code";

export interface TemplateVoucherStoryProps {
  voucher: Partial<TravelVoucherDTO> & {
    destination?: string;
    general_locator?: string;
    flights?: Array<{
      origin?: string;
      destination?: string;
      airline?: string;
      flight_number?: string;
      date?: string;
    }>;
    accommodation?: Array<{
      name?: string;
      city?: string;
    }>;
    passengers?: Array<{
      name: string;
    }>;
  };
  agencyName?: string;
  agencySlug?: string;
  agencyLogo?: string | null;
  agencyBrandColor?: string;
}

export function TemplateVoucherStory({
  voucher: v,
  agencyName = "Agência Waesy Turismo",
  agencySlug = "waesyturismo",
  agencyLogo,
}: TemplateVoucherStoryProps) {
  // Normalização defensiva de voos
  const flights =
    v.flights && v.flights.length > 0
      ? v.flights
      : v.flight_data?.origin || v.flight_data?.destination
      ? [
          {
            origin: v.flight_data.origin || "Origem",
            destination: v.flight_data.destination || "Destino",
            airline: v.flight_data.airline || "Voo Regular",
            flight_number: v.flight_data.flightNumber,
            date: v.flight_data.departureTime,
          },
        ]
      : [];

  // Normalização defensiva de hospedagem
  const accommodation =
    v.accommodation && v.accommodation.length > 0
      ? v.accommodation
      : v.hotel_data?.hotelName
      ? [
          {
            name: v.hotel_data.hotelName,
            city: v.hotel_data.address,
          },
        ]
      : [];

  // Normalização defensiva de passageiros
  const passengers =
    v.passengers && v.passengers.length > 0
      ? v.passengers
      : v.passenger_name
      ? [{ name: v.passenger_name }]
      : [];

  const destination =
    v.destination ||
    v.flight_data?.destination ||
    v.hotel_data?.hotelName ||
    v.title ||
    "Sua Viagem dos Sonhos";
  const locator =
    v.general_locator || v.voucher_number || v.hotel_data?.confirmationCode || "VCH-2026";

  const qrDataUri = useMemo(() => {
    return generateQrCodeDataUri(`WAESY-VOUCHER:${locator}`, { border: 1 });
  }, [locator]);

  return (
    <div
      id="voucher-story-canvas"
      className="relative flex flex-col w-96 min-h-160 aspect-9/16 overflow-hidden bg-slate-950 text-neutral-100 rounded-lg mx-auto border border-slate-800 font-sans"
    >
      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full p-6 sm:p-7 justify-between">
        {/* Header: Agência & Badges */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {agencyLogo ? (
              <img
                src={agencyLogo}
                alt={agencyName}
                crossOrigin="anonymous"
                className="size-8 object-contain rounded-full bg-slate-900 p-1 backdrop-blur-md border border-slate-800"
              />
            ) : (
              <div className="size-8 rounded-full bg-primary flex items-center justify-center font-bold text-xs text-primary-foreground">
                {agencyName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <span className="font-bold text-sm tracking-tight text-neutral-100 block leading-tight">
                {agencyName}
              </span>
              <span className="text-xs text-slate-400 tracking-wider uppercase font-mono">
                @{agencySlug}
              </span>
            </div>
          </div>

          <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold tracking-wide uppercase">
            Confirmado
          </div>
        </div>

        {/* Destination Hero Block */}
        <div className="my-auto py-4">
          <div className="flex items-center gap-2 mb-2 text-slate-300">
            <MapPin className="size-3.5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Voucher Oficial de Embarque
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight text-neutral-100 break-words">
            {destination}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-1 rounded-md bg-slate-900 text-xs font-mono font-bold text-neutral-100 border border-slate-800">
              LOC: {locator}
            </span>
            {v.voucher_type && (
              <span className="text-xs text-slate-400 capitalize font-medium">
                · {v.voucher_type}
              </span>
            )}
          </div>

          {/* Cards de Voo / Hotel */}
          <div className="flex flex-col gap-3 mt-5">
            {flights.length > 0 && (
              <div className="rounded-lg bg-slate-900/90 border border-slate-800 backdrop-blur-md p-4">
                <div className="flex justify-between items-center text-xs uppercase font-bold tracking-wider text-slate-400 mb-2">
                  <span className="flex items-center gap-1">
                    <Plane className="size-3 text-sky-400" /> Voo Confirmado
                  </span>
                  <span className="font-mono text-slate-400">{flights[0].airline}</span>
                </div>
                <div className="flex justify-between items-center text-base sm:text-lg font-extrabold tracking-tight text-neutral-100">
                  <span>{flights[0].origin}</span>
                  <div className="flex items-center gap-1 text-slate-500">
                    <div className="h-px w-6 bg-slate-700" />
                    <Plane className="size-3 text-slate-300" />
                    <div className="h-px w-6 bg-slate-700" />
                  </div>
                  <span>{flights[0].destination}</span>
                </div>
                {(flights[0].flight_number || flights[0].date) && (
                  <div className="text-xs text-slate-400 mt-1 text-center font-mono">
                    {flights[0].flight_number && `Voo ${flights[0].flight_number}`}
                    {flights[0].flight_number && flights[0].date && " · "}
                    {flights[0].date && flights[0].date}
                  </div>
                )}
              </div>
            )}

            {accommodation.length > 0 && (
              <div className="rounded-lg bg-slate-900/90 border border-slate-800 backdrop-blur-md p-4">
                <div className="flex justify-between items-center text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Hotel className="size-3 text-amber-400" /> Hospedagem
                  </span>
                </div>
                <div className="text-sm font-bold text-neutral-100 break-words">
                  {accommodation[0].name}
                </div>
                {accommodation[0].city && (
                  <div className="text-xs text-slate-400 break-words mt-1">
                    {accommodation[0].city}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lista de Passageiros */}
          {passengers.length > 0 ? (
            <div className="mt-4 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-center">
              <span className="text-xs uppercase tracking-wider text-slate-400 block font-semibold">
                Passageiro{passengers.length > 1 ? "s" : ""}
              </span>
              <p className="text-xs font-bold text-neutral-100 mt-1 break-words">
                {passengers.map((p) => p.name).join(" · ")}
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
              Nenhum passageiro vinculado
            </div>
          )}
        </div>

        {/* Footer: QR Code Real & Assinatura Digital */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-widest text-slate-400 block">
              Emissão Digital Autorizada
            </span>
            <span className="text-xs font-bold text-neutral-200 block">Waesy Travel Suite</span>
          </div>

          <div className="size-12 rounded-lg bg-neutral-100 p-1 flex items-center justify-center shrink-0">
            <img src={qrDataUri} alt="QR Code Voucher" className="size-full object-contain" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateVoucherStory;
