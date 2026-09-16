import { forwardRef } from "react";
import {
 Plane,
 Building2,
 Car,
 Shield,
 Phone,
 Users,
 Calendar,
 MapPin,
 QrCode,
 Compass,
 Luggage,
 Clock,
 Ticket,
 FileCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";

export interface VoucherData {
 id: string;
 voucher_code: string;
 public_token: string;
 destination?: string | null;
 cover_image_url?: string | null;
 passengers?: Array<{ name: string; document?: string; seat?: string }>;
 flights?: Array<{
 origin?: string;
 destination?: string;
 airline?: string;
 flight_number?: string;
 locator?: string;
 departure_time?: string;
 arrival_time?: string;
 date?: string;
 baggage?: string;
 class?: string;
 }>;
 hotels?: Array<{
 name?: string;
 city?: string;
 meal_plan?: string;
 checkin?: string;
 checkout?: string;
 room_type?: string;
 confirmation?: string;
 nights?: number;
 }>;
 transfers?: Array<{
 type?: string;
 origin?: string;
 destination?: string;
 date?: string;
 pickup_time?: string;
 }>;
 tours?: Array<{
 title?: string;
 date?: string;
 duration?: string;
 location?: string;
 }>;
 insurance?: {
 provider?: string;
 policy_number?: string;
 emergency_phone?: string;
 coverage_details?: string;
 };
 emergency_contacts?: Array<{ name: string; phone: string }>;
 observations?: string | null;
 created_at?: string;
}

export interface AgencyData {
 name: string;
 logo_url?: string | null;
 whatsapp_phone?: string | null;
}

export interface VoucherBoardingCardProps {
  voucher: VoucherData | any;
  trip?: any;
  tripNumber?: string;
  agency?: AgencyData;
  store?: any;
  passengers?: any[];
  confirmationItems?: any[];
  showActions?: boolean;
}

export const VoucherBoardingCard = forwardRef<HTMLDivElement, VoucherBoardingCardProps>(
  ({ voucher, trip, tripNumber: tripNumProp, agency: agencyProp, store, passengers, confirmationItems, showActions }, ref) => {
    const agency: AgencyData = agencyProp || {
      name: store?.name || trip?.agency_name || "Agência de Viagens",
      logo_url: store?.settings?.logoUrl || store?.settings?.logo_url || null,
      whatsapp_phone: store?.settings?.whatsapp || store?.settings?.phone || null,
    };
    const tripNumber = tripNumProp || trip?.trip_code || trip?.title || "";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://usewaesy.pages.dev";
    const publicUrl = `${origin}/voucher/${voucher?.public_token || ""}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(publicUrl)}`;

 return (
 <div
 ref={ref}
 id="voucher-printable-area"
 className="w-full max-w-4xl mx-auto bg-white text-neutral-900 shadow-md border border-neutral-200 rounded-2xl overflow-hidden print:border-none print:shadow-none print:rounded-none print:m-0 print:w-full print:max-w-none text-xs"
 style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif" }}
 >
 {/* ── HEADER DA AGÊNCIA & GUIA DE EMBARQUE ── */}
 <div className="bg-neutral-900 text-white p-4 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-primary">
 <div className="flex items-center gap-4">
 {agency.logo_url ? (
 <img
 src={agency.logo_url}
 alt={agency.name}
 className="h-12 w-auto max-w-[140px] object-contain brightness-0 invert"
 crossOrigin="anonymous"
 />
 ) : (
 <div className="flex items-center gap-2">
 <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
 <Compass className="size-6" />
 </div>
 <div>
 <h1 className="text-base font-black tracking-tight uppercase">{agency.name}</h1>
 <span className="text-[10px] text-neutral-400 font-medium">Turismo & Experiências</span>
 </div>
 </div>
 )}
 </div>

 <div className="text-left sm:text-right space-y-0.5">
 <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-white font-mono text-[11px] font-bold">
 <Ticket className="size-3 text-primary" />
 <span>{voucher.voucher_code}</span>
 </div>
 {tripNumber && (
 <p className="text-[10px] text-neutral-400 font-mono">
 Reserva: <span className="font-semibold text-neutral-200">{tripNumber}</span>
 </p>
 )}
 <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
 {voucher.destination || "Voucher de Viagem"}
 </h2>
 </div>
 </div>

 <div className="p-4 sm:p-8 space-y-6">
 {/* ── 1. PASSAGEIROS TITULARES & ROOMING LIST ── */}
 {voucher.passengers && voucher.passengers.length > 0 && (
 <div className="space-y-3">
 <div className="flex items-center gap-2 pb-1.5 border-b border-neutral-200">
 <Users className="size-4 text-neutral-500" />
 <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
 Passageiros & Documentação
 </span>
 </div>
 <div className="flex flex-col gap-2.5 sm:grid sm:grid-cols-2 lg:grid-cols-3">
 {voucher.passengers.map((p: any, idx: number) => (
 <div
 key={idx}
 className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 flex flex-col justify-between space-y-1.5"
 >
 <span className="font-bold text-neutral-900 text-sm truncate">{p.name}</span>
 <div className="flex items-center gap-3 text-xs text-neutral-600 font-mono">
 {p.document && <span>Doc: <strong className="text-neutral-800">{p.document}</strong></span>}
 {p.seat && <span>Assento: <strong className="text-neutral-800">{p.seat}</strong></span>}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* ── 2. VOOS & BILHETES AÉREOS ── */}
 {voucher.flights && voucher.flights.length > 0 && (
 <div className="space-y-3">
 <div className="flex items-center gap-2 pb-1.5 border-b border-neutral-200">
 <Plane className="size-4 text-neutral-500" />
 <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
 Malha Aérea & Cartões de Embarque
 </span>
 </div>

 <div className="flex flex-col gap-3">
 {voucher.flights.map((flight: any, idx: number) => (
 <div
 key={idx}
 className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-2xs"
 >
 <div className="space-y-1.5">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="font-black text-base sm:text-lg text-neutral-900">
 {flight.origin || "Origem"} → {flight.destination || "Destino"}
 </span>
 {flight.class && (
 <span className="px-2.5 py-0.5 rounded-md bg-neutral-200 text-neutral-800 text-xs font-bold uppercase">
 {flight.class}
 </span>
 )}
 </div>
 <p className="text-xs sm:text-sm text-neutral-600">
 {flight.airline || "Cia Aérea"} • Voo <strong className="text-neutral-800">{flight.flight_number || "—"}</strong>
 {flight.date && ` • ${flight.date}`}
 </p>
 </div>

 <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-neutral-700 sm:text-right font-mono">
 {(flight.departure_time || flight.arrival_time) && (
 <div>
 <span className="text-[10px] text-neutral-400 block uppercase">Horários</span>
 <span className="font-bold text-neutral-900 text-sm">
 {flight.departure_time || "--:--"} ➔ {flight.arrival_time || "--:--"}
 </span>
 </div>
 )}
 {flight.locator && (
 <div className="bg-white px-3 py-1.5 rounded-lg border border-neutral-200 shadow-2xs">
 <span className="text-[10px] text-neutral-400 block uppercase font-sans">Localizador PNR</span>
 <span className="font-black text-neutral-900 text-sm tracking-wider">
 {flight.locator}
 </span>
 </div>
 )}
 {flight.baggage && (
 <div className="flex items-center gap-1.5 text-xs text-neutral-600">
 <Luggage className="size-3.5" />
 <span>{flight.baggage}</span>
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

  {/* ── 3. HOSPEDAGEM & ACOMODAÇÃO ── */}
  {voucher.hotels && voucher.hotels.length > 0 && (
  <div className="space-y-3">
  <div className="flex items-center gap-2 pb-1.5 border-b border-neutral-200">
  <Building2 className="size-4 text-neutral-500" />
  <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
  Hospedagem & Voucher Hoteleiro
  </span>
  </div>

  <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2">
  {voucher.hotels.map((hotel: any, idx: number) => (
  <div
  key={idx}
  className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-3 shadow-2xs"
  >
  <div className="flex items-start justify-between gap-2">
  <div>
  <h4 className="font-bold text-neutral-900 text-sm sm:text-base">{hotel.name}</h4>
  {hotel.city && (
  <span className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
  <MapPin className="size-3.5" /> {hotel.city}
  </span>
  )}
  </div>
  {hotel.confirmation && (
  <div className="text-right font-mono">
  <span className="text-[10px] text-neutral-400 block uppercase">Reserva</span>
  <span className="font-bold text-neutral-900 text-xs sm:text-sm">
  {hotel.confirmation}
  </span>
  </div>
  )}
  </div>

  <div className="grid grid-cols-2 gap-2.5 text-xs bg-white p-2.5 rounded-lg border border-neutral-200">
  <div>
  <span className="text-[10px] text-neutral-400 block uppercase">Check-in</span>
  <span className="font-bold text-neutral-800">{hotel.checkin || "—"}</span>
  </div>
  <div>
  <span className="text-[10px] text-neutral-400 block uppercase">Check-out</span>
  <span className="font-bold text-neutral-800">{hotel.checkout || "—"}</span>
  </div>
  {hotel.room_type && (
  <div>
  <span className="text-[10px] text-neutral-400 block uppercase">Quarto</span>
  <span className="font-semibold text-neutral-800 truncate block">
  {hotel.room_type}
  </span>
  </div>
  )}
  {hotel.meal_plan && (
  <div>
  <span className="text-[10px] text-neutral-400 block uppercase">Regime</span>
  <span className="font-semibold text-neutral-800">{hotel.meal_plan}</span>
  </div>
  )}
  </div>
  </div>
  ))}
  </div>
  </div>
  )}

  {/* ── 4. TRANSFERS, PASSEIOS & SERVIÇOS ── */}
  {((voucher.transfers && voucher.transfers.length > 0) ||
  (voucher.tours && voucher.tours.length > 0)) && (
  <div className="space-y-3">
  <div className="flex items-center gap-2 pb-1.5 border-b border-neutral-200">
  <Car className="size-4 text-neutral-500" />
  <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
  Transfers & Passeios Inclusos
  </span>
  </div>

  <div className="flex flex-col gap-2.5 sm:grid sm:grid-cols-2">
  {voucher.transfers?.map((t: any, idx: number) => (
  <div
  key={idx}
  className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/60 flex items-center justify-between text-xs sm:text-sm"
  >
  <div className="space-y-0.5">
  <span className="font-bold text-neutral-900 block">{t.type || "Transfer"}</span>
  <span className="text-neutral-500 text-xs">
  {t.origin} ➔ {t.destination}
  </span>
  </div>
  {t.date && (
  <span className="font-mono text-xs text-neutral-700 bg-white px-2.5 py-1 rounded border border-neutral-200 shadow-2xs font-semibold">
  {t.date}
  </span>
  )}
  </div>
  ))}

  {voucher.tours?.map((tour: any, idx: number) => (
  <div
  key={idx}
  className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/60 flex items-center justify-between text-xs sm:text-sm"
  >
  <div className="space-y-0.5">
  <span className="font-bold text-neutral-900 block">{tour.title}</span>
  {tour.location && (
  <span className="text-neutral-500 text-xs">{tour.location}</span>
  )}
  </div>
  {tour.date && (
  <span className="font-mono text-xs text-neutral-700 bg-white px-2.5 py-1 rounded border border-neutral-200 shadow-2xs font-semibold">
  {tour.date}
  </span>
  )}
  </div>
  ))}
  </div>
  </div>
  )}

 {/* ── 5. SEGURO VIAGEM & ASSISTÊNCIA ── */}
 {voucher.insurance && voucher.insurance.policy_number && (
 <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1.5">
 <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px]">
 <Shield className="size-3.5 text-emerald-600" />
 <span>Seguro Viagem & Assistência Médica 24h</span>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] text-neutral-700">
 <div>
 <span className="text-neutral-500 block">Seguradora:</span>
 <span className="font-semibold">{voucher.insurance.provider || "Assist Card / Universal"}</span>
 </div>
 <div>
 <span className="text-neutral-500 block">Número da Apólice:</span>
 <span className="font-mono font-bold text-emerald-900">
 {voucher.insurance.policy_number}
 </span>
 </div>
 <div>
 <span className="text-neutral-500 block">Central de Emergência:</span>
 <span className="font-bold">{voucher.insurance.emergency_phone || "0800 24h"}</span>
 </div>
 </div>
 </div>
 )}

 {/* ── 6. ORIENTAÇÕES GERAIS & PLANTÃO ── */}
 {voucher.observations && (
 <div className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 text-[10px] text-neutral-600 leading-relaxed">
 <span className="font-bold text-neutral-800 block mb-0.5 uppercase tracking-wider text-[9px]">
 Orientações Importantes:
 </span>
 {voucher.observations}
 </div>
 )}

 {/* ── 7. FOOTER COM QR CODE OFICIAL DE VALIDAÇÃO ── */}
 <div className="pt-4 border-t-2 border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
 <div className="space-y-1 text-center sm:text-left">
 <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] font-bold text-neutral-900">
 <FileCheck className="size-4 text-emerald-600" />
 <span>Documento Oficial de Viagem & Embarque</span>
 </div>
 <p className="text-[10px] text-neutral-500 max-w-md">
 Apresente este voucher impresso ou digital acompanhado de documento oficial com foto no balcão da companhia aérea e recepção do hotel.
 </p>
 {agency.whatsapp_phone && (
 <p className="text-[10px] text-neutral-600 font-mono">
 Plantão 24h da Agência: <span className="font-bold">{agency.whatsapp_phone}</span>
 </p>
 )}
 </div>

 <div className="flex items-center gap-3 bg-neutral-50 p-2 rounded-xl border border-neutral-200">
 <img
 src={qrUrl}
 alt="QR Code de Validação"
 className="size-16 rounded-lg object-contain bg-white p-1 border border-neutral-200"
 />
 <div className="text-[9px] font-mono text-neutral-500 space-y-0.5">
 <span className="font-bold text-neutral-900 block uppercase">Autenticidade</span>
 <span>Token: {voucher?.public_token ? `${voucher.public_token.substring(0, 10)}...` : "—"}</span>
 <span className="block text-[8px] text-neutral-400">Escaneie para validar</span>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 }
);

VoucherBoardingCard.displayName = "VoucherBoardingCard";
