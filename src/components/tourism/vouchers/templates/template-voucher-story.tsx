import React from "react";
import { Plane, Hotel, MapPin, QrCode } from "lucide-react";
import type { TravelVoucherDTO } from "@/types/travel-vouchers";

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
  agencyBrandColor = "#0284c7",
}: TemplateVoucherStoryProps) {
  const primaryColor = agencyBrandColor;
  const secondaryColor = "#f43f5e";

  // Normalização defensiva de voos
  const flights = v.flights && v.flights.length > 0
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
  const accommodation = v.accommodation && v.accommodation.length > 0
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
  const passengers = v.passengers && v.passengers.length > 0
    ? v.passengers
    : v.passenger_name
    ? [{ name: v.passenger_name }]
    : [];

  const destination = v.destination || v.flight_data?.destination || v.hotel_data?.hotelName || v.title || "Sua Viagem dos Sonhos";
  const locator = v.general_locator || v.voucher_number || v.hotel_data?.confirmationCode || "VCH-2026";

  return (
    <div
      id="voucher-story-canvas"
      className="relative flex flex-col w-[360px] h-[640px] sm:w-[390px] sm:h-[693px] md:w-[414px] md:h-[736px] overflow-hidden text-white rounded-3xl shadow-2xl mx-auto border border-white/10"
      style={{
        background: `linear-gradient(145deg, #090d16 0%, #030712 100%)`,
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}
    >
      {/* Decorative ambient glow blobs */}
      <div
        className="absolute top-[-40px] right-[-40px] w-64 h-64 rounded-full opacity-35 blur-[70px] pointer-events-none"
        style={{ backgroundColor: primaryColor }}
      />
      <div
        className="absolute bottom-[-50px] left-[-50px] w-64 h-64 rounded-full opacity-25 blur-[70px] pointer-events-none"
        style={{ backgroundColor: secondaryColor }}
      />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-10 flex flex-col h-full p-6 sm:p-7 justify-between">
        {/* Header: Agência & Badges */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {agencyLogo ? (
              <img
                src={agencyLogo}
                alt={agencyName}
                crossOrigin="anonymous"
                className="size-8 object-contain rounded-full bg-white/10 p-1 backdrop-blur-md border border-white/10"
              />
            ) : (
              <div
                className="size-8 rounded-full flex items-center justify-center font-bold text-xs text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {agencyName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <span className="font-bold text-sm tracking-tight text-white block leading-tight">
                {agencyName}
              </span>
              <span className="text-[10px] text-white/50 tracking-wider uppercase font-mono">
                @{agencySlug}
              </span>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold tracking-wide uppercase">
            Confirmado
          </div>
        </div>

        {/* Destination Hero Block */}
        <div className="my-auto py-4">
          <div className="flex items-center gap-1.5 mb-1.5 text-white/70">
            <MapPin className="size-3.5 text-primary" style={{ color: primaryColor }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              Voucher Oficial de Embarque
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight text-white drop-shadow-sm">
            {destination}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-white/10 text-[11px] font-mono font-bold text-white/90 border border-white/10">
              LOC: {locator}
            </span>
            {v.voucher_type && (
              <span className="text-[11px] text-white/50 capitalize font-medium">
                · {v.voucher_type}
              </span>
            )}
          </div>

          {/* Cards de Voo / Hotel no Estilo Glassmorphism */}
          <div className="flex flex-col gap-2.5 mt-5">
            {flights.length > 0 && (
              <div className="rounded-2xl bg-white/[0.07] border border-white/15 backdrop-blur-md p-3.5 shadow-lg">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-white/60 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Plane className="size-3 text-sky-400" /> Voo Confirmado
                  </span>
                  <span className="font-mono text-white/50">{flights[0].airline}</span>
                </div>
                <div className="flex justify-between items-center text-base sm:text-lg font-extrabold tracking-tight">
                  <span>{flights[0].origin}</span>
                  <div className="flex items-center gap-1 text-white/40">
                    <div className="h-px w-6 bg-white/30" />
                    <Plane className="size-3 text-white/70" />
                    <div className="h-px w-6 bg-white/30" />
                  </div>
                  <span>{flights[0].destination}</span>
                </div>
                {(flights[0].flight_number || flights[0].date) && (
                  <div className="text-[10px] text-white/60 mt-1 text-center font-mono">
                    {flights[0].flight_number && `Voo ${flights[0].flight_number}`}
                    {flights[0].flight_number && flights[0].date && " · "}
                    {flights[0].date && flights[0].date}
                  </div>
                )}
              </div>
            )}

            {accommodation.length > 0 && (
              <div className="rounded-2xl bg-white/[0.07] border border-white/15 backdrop-blur-md p-3.5 shadow-lg">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-white/60 mb-1">
                  <span className="flex items-center gap-1">
                    <Hotel className="size-3 text-amber-400" /> Hospedagem
                  </span>
                </div>
                <div className="text-sm font-bold text-white truncate">
                  {accommodation[0].name}
                </div>
                {accommodation[0].city && (
                  <div className="text-[11px] text-white/60 truncate mt-0.5">
                    {accommodation[0].city}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lista de Passageiros */}
          {passengers.length > 0 && (
            <div className="mt-4 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-center">
              <span className="text-[10px] uppercase tracking-wider text-white/50 block font-semibold">
                Passageiro{passengers.length > 1 ? "s" : ""}
              </span>
              <p className="text-xs font-bold text-white/90 mt-0.5 truncate">
                {passengers.map((p) => p.name).join(" · ")}
              </p>
            </div>
          )}
        </div>

        {/* Footer: QR Code & Assinatura Digital */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="text-[9px] uppercase tracking-widest text-white/40 block">
              Emissão Digital Autorizada
            </span>
            <span className="text-[11px] font-bold text-white/80 block">
              Waesy Travel Suite
            </span>
          </div>

          <div className="size-10 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md">
            <QrCode className="size-8 text-slate-900" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateVoucherStory;
