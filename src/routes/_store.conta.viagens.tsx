import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import {
 Compass,
 MapPin,
 CalendarDots,
 Users,
 WhatsappLogo,
 ShieldCheck,
 Printer,
 ShareNetwork,
 ArrowLeft,
 QrCode,
 Ticket,
 CheckCircle,
 Clock,
 ArrowUpRight,
 Info,
 Airplane,
 Buildings,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { Badge } from "@/components/ui/badge";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
} from "@/components/ui/dialog";
import { listCustomerTrips, type TourismBookingDTO } from "@/services/tourism.functions";
import { listCustomerAgencyTrips } from "@/services/travel-lifecycle.functions";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

export const Route = createFileRoute("/_store/conta/viagens")({
 head: () => ({
 meta: [
 { title: "Minhas Viagens & Vouchers | Waesy" },
 { name: "description", content: "Consulte seus vouchers, reservas de turismo e passeios confirmados." },
 ],
 }),
 loader: async () => {
   try {
 const [trips, agencyTrips] = await Promise.all([
 listCustomerTrips().catch(() => []),
 listCustomerAgencyTrips().catch(() => []),
 ]);
 return { trips, agencyTrips };
   } catch (err) {
     console.error("[loader:_store.conta.viagens] Unhandled error:", err);
     return { trips: null, agencyTrips: null };
   }
 },
 component: CustomerTripsPage,
});

function CustomerTripsPage() {
 const { trips, agencyTrips = [] } = ((Route.useLoaderData?.() as any) || {});
 const [selectedBooking, setSelectedBooking] = useState<TourismBookingDTO | null>(null);
 const [isVoucherOpen, setIsVoucherOpen] = useState(false);

 const handleOpenVoucher = (booking: TourismBookingDTO) => {
 setSelectedBooking(booking);
 setIsVoucherOpen(true);
 };

 const handlePrint = () => {
 if (typeof window !== "undefined") {
 window.print();
 }
 };

 const handleShare = (code: string) => {
 if (typeof window !== "undefined" && navigator.clipboard) {
 navigator.clipboard.writeText(`Voucher Waesy Turismo: ${code}`);
 toast.success("Código do voucher copiado!");
 }
 };

 const totalBookingsCount = trips.length + agencyTrips.length;
  const confirmedCount =
    trips.filter((t: any) => t.status === "confirmed").length +
    agencyTrips.filter((t: any) => t.status === "confirmed").length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20 px-0 sm:px-4 md:px-0">
      {/* ── 1. Clean Minimalist Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Viagens
          </h1>
          {totalBookingsCount > 0 && (
            <Badge variant="secondary" className="text-xs font-mono font-bold px-2 py-0.5 rounded-full">
              {totalBookingsCount}
            </Badge>
          )}
        </div>

        <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold h-8 px-3.5 cursor-pointer">
          <Link to="/turismo">Explorar Roteiros</Link>
        </Button>
      </div>

 {/* ── Summary KPI Cards ── */}
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 <div className="p-4 rounded-2xl bg-card ">
 <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
 <Ticket size={16} weight="bold" className="text-primary" />
 <span>Total de Viagens & Reservas</span>
 </div>
 <p className="text-2xl font-black text-foreground mt-2">{totalBookingsCount}</p>
 </div>

 <div className="p-4 rounded-2xl bg-card ">
 <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
 <CheckCircle size={16} weight="bold" className="text-emerald-500" />
 <span>Vouchers & Confirmações</span>
 </div>
 <p className="text-2xl font-black text-foreground mt-2">{confirmedCount}</p>
 </div>

 <div className="p-4 rounded-2xl bg-card col-span-2 sm:col-span-1">
 <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold">
 <ShieldCheck size={16} weight="bold" className="text-primary" />
 <span>Garantia & Plantão 24h</span>
 </div>
 <p className="text-xs text-muted-foreground mt-2 font-medium">
 Embarque 100% oficial com validação por QR Code e suporte ao viajante.
 </p>
 </div>
 </div>

 {/* ── 1. Pacotes & Viagens da Agência com Vouchers Oficiais ── */}
 {agencyTrips.length > 0 && (
 <div className="space-y-3">
 <div className="flex items-center justify-between">
 <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Airplane size={18} weight="bold" className="text-primary" />
 <span>Viagens & Pacotes Turísticos Integrados</span>
 </h2>
 <span className="text-[11px] text-muted-foreground font-medium">
 {agencyTrips.length} pacote(s) cadastrado(s)
 </span>
 </div>

 <div className="space-y-4">
 {agencyTrips.map((agencyTrip: any) => {
 const mainVoucher = agencyTrip.tourism_vouchers?.[0];
 const voucherUrl = mainVoucher ? `/voucher/${mainVoucher.public_token}` : null;
 const hasFlights = agencyTrip.flights && agencyTrip.flights.length > 0;
 const hasHotels = agencyTrip.hotels && agencyTrip.hotels.length > 0;

 return (
 <div
 key={agencyTrip.id}
 className="p-5 sm:p-6 rounded-2xl bg-card border border-border/70 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between hover:border-foreground/20 transition-all shadow-xs"
 >
 <div className="space-y-2 flex-1">
 <div className="flex flex-wrap items-center gap-2">
 <Badge variant="outline" className="text-[10px] font-mono font-bold bg-muted/60">
 {agencyTrip.trip_number}
 </Badge>
 <Badge
 variant="secondary"
 className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
 >
 ● {agencyTrip.status === "confirmed" ? "Confirmada" : agencyTrip.status}
 </Badge>
 {mainVoucher && (
 <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
 Voucher {mainVoucher.voucher_code}
 </Badge>
 )}
 </div>

 <h3 className="text-base font-bold text-foreground">
 {agencyTrip.destination_city || agencyTrip.title}
 </h3>

 {/* Resumo de Serviços (Voos & Hospedagem) */}
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
 {hasFlights && (
 <div className="flex items-center gap-1.5 font-medium">
 <Airplane size={14} className="text-primary shrink-0" />
 <span className="truncate">
 {agencyTrip.flights[0].origin} ➔ {agencyTrip.flights[0].destination} ({agencyTrip.flights[0].airline || "Voo"})
 </span>
 </div>
 )}
 {hasHotels && (
 <div className="flex items-center gap-1.5 font-medium">
 <Buildings size={14} className="text-primary shrink-0" />
 <span className="truncate">
 {agencyTrip.hotels[0].name} ({agencyTrip.hotels[0].city || "Hotel"})
 </span>
 </div>
 )}
 {(agencyTrip.travel_start_date || agencyTrip.travel_end_date) && (
 <div className="flex items-center gap-1.5">
 <CalendarDots size={14} className="text-muted-foreground shrink-0" />
 <span>
 {agencyTrip.travel_start_date || "—"} até {agencyTrip.travel_end_date || "—"}
 </span>
 </div>
 )}
 {agencyTrip.adults_count > 0 && (
 <div className="flex items-center gap-1.5">
 <Users size={14} className="text-muted-foreground shrink-0" />
 <span>{agencyTrip.adults_count} Adulto(s)</span>
 </div>
 )}
 </div>
 </div>

 <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
 {voucherUrl ? (
 <Button
 asChild
 className="flex-1 md:flex-initial rounded-xl font-bold text-xs gap-1.5 h-10 bg-primary text-primary-foreground hover:bg-primary/90"
 >
 <a href={voucherUrl} target="_blank" rel="noopener noreferrer">
 <QrCode size={16} weight="bold" />
 <span>Abrir Guia de Embarque</span>
 </a>
 </Button>
 ) : (
 <Button
 disabled
 variant="outline"
 className="flex-1 md:flex-initial rounded-xl font-bold text-xs gap-1.5 h-10"
 >
 <span>Voucher em Emissão</span>
 </Button>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}

 {/* ── 2. Lista de Passeios & Experiências Turísticas do Marketplace ── */}
 {trips.length === 0 && agencyTrips.length === 0 ? (
 <div className="text-center py-16 px-4 rounded-2xl bg-card space-y-4 border border-border/70">
 <div className="size-16 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
 <Compass size={32} weight="bold" className="text-primary" />
 </div>
 <div className="space-y-1">
 <h3 className="text-base font-bold text-foreground">Nenhuma viagem reservada ainda</h3>
 <p className="text-xs text-muted-foreground max-w-md mx-auto">
 Você ainda não possui vouchers de viagens, passagens ou experiências emitidos para sua conta.
 </p>
 </div>
 <Button asChild className="rounded-xl font-bold text-xs bg-foreground text-background">
 <Link to="/turismo">
 <Compass size={16} weight="bold" className="mr-1.5" />
 <span>Ver Roteiros Disponíveis</span>
 </Link>
 </Button>
 </div>
 ) : trips.length > 0 ? (
 <div className="space-y-3 pt-2">
 {agencyTrips.length > 0 && (
 <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Compass size={18} weight="bold" className="text-primary" />
 <span>Passeios & Experiências Locais</span>
 </h2>
 )}
 <div className="space-y-4">
 {trips.map((booking: any) => {
 const exp = booking.experience;
 const formattedDate = booking.desired_date
 ? new Date(booking.desired_date).toLocaleDateString("pt-BR", {
 day: "2-digit",
 month: "long",
 year: "numeric",
 })
 : "Data a combinar";

 const cleanWhatsapp = exp?.contact_whatsapp?.replace(/\D/g, "") || "";
 // whatsappUrl removido: usado trackAndOpenWhatsApp para rastreamento real

 return (
 <div
 key={booking.id}
 className="p-5 sm:p-6 rounded-2xl bg-card flex flex-col md:flex-row gap-5 items-start md:items-center justify-between hover:border-foreground/20 transition-all"
 >
 <div className="flex gap-4 items-start">
 {exp?.image_url ? (
 <img
 src={exp.image_url}
 alt={exp.title}
 className="size-20 sm:size-24 rounded-2xl object-cover shrink-0"
 />
 ) : (
 <div className="size-20 sm:size-24 rounded-2xl bg-muted flex items-center justify-center shrink-0 ">
 <Compass size={28} className="text-muted-foreground" />
 </div>
 )}

 <div className="space-y-1.5">
 <div className="flex flex-wrap items-center gap-2">
 <Badge variant="outline" className="text-[10px] font-mono font-bold bg-muted/60">
 {booking.voucher_code}
 </Badge>
 <Badge
 variant="secondary"
 className={`text-[10px] font-bold ${
 booking.status === "confirmed"
 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
 : "bg-amber-500/10 text-amber-600 border-amber-500/20"
 }`}
 >
 {booking.status === "confirmed" ? "● Confirmado" : "● Em Análise"}
 </Badge>
 </div>

 <h3 className="text-base font-bold text-foreground line-clamp-1">
 {exp?.title || "Experiência Turística"}
 </h3>

 <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground font-medium">
 <span className="flex items-center gap-1">
 <CalendarDots size={14} weight="bold" />
 <span>{formattedDate}</span>
 </span>
 <span className="flex items-center gap-1">
 <Users size={14} weight="bold" />
 <span>{booking.guests_count} participante(s)</span>
 </span>
 {booking.total_price_cents > 0 && (
 <span className="font-bold text-foreground">
 {formatMoney(booking.total_price_cents)}
 </span>
 )}
 </div>

 {exp?.location && (
 <p className="text-[11px] text-muted-foreground flex items-center gap-1">
 <MapPin size={12} weight="bold" />
 <span className="line-clamp-1">{exp.location}</span>
 </p>
 )}
 </div>
 </div>

 <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border">
 <Button
 onClick={() => handleOpenVoucher(booking)}
 className="flex-1 md:flex-initial rounded-xl font-bold text-xs gap-1.5 h-10 bg-foreground text-background "
 >
 <QrCode size={16} weight="bold" />
 <span>Ver Voucher Digital</span>
 </Button>

 {cleanWhatsapp && (
 <Button
 type="button"
 variant="outline"
 onClick={() =>
 trackAndOpenWhatsApp({
 phone: cleanWhatsapp,
 storeId: (exp as any)?.store_id || null,
 entityType: "tourism",
 entityId: exp?.id || null,
 entityTitle: exp?.title || "Experiência Turística",
 niche: "turismo",
 customMessage: `Olá! Tenho uma reserva confirmada com o voucher *${booking.voucher_code}* para *${exp?.title}*. Queria confirmar os detalhes.`,
 })
 }
 className="flex-1 md:flex-initial rounded-xl font-bold text-xs gap-1.5 h-10 border-border cursor-pointer"
 >
 <WhatsappLogo size={16} weight="bold" className="text-emerald-500" />
 <span>Falar com Guia</span>
 </Button>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 ) : null}

 {/* ── Modal Canônico de Voucher Digital (Padrão TravelAgencias / Waesy) ── */}
 <Dialog open={isVoucherOpen} onOpenChange={setIsVoucherOpen}>
 <DialogContent className="sm:max-w-lg sm:rounded-2xl p-5 sm:p-8 bg-card border-border">
 {selectedBooking && (
 <div className="space-y-6">
 {/* Header do Voucher */}
 <div className="text-center pb-4 space-y-2">
 <Badge variant="outline" className="text-xs font-mono font-black px-3 py-1 bg-muted">
 VOUCHER DIGITAL OFICIAL
 </Badge>
 <h2 className="text-xl font-black text-foreground">
 {selectedBooking.experience?.title || "Experiência Turística"}
 </h2>
 <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono">
 <span>CÓDIGO:</span>
 <span className="font-black text-foreground text-sm bg-primary/10 px-2 py-0.5 rounded-md">
 {selectedBooking.voucher_code}
 </span>
 </div>
 </div>

 {/* Detalhes do Roteiro */}
 <div className="grid grid-cols-2 gap-3 text-xs">
 <div className="p-3 rounded-2xl bg-muted/40 space-y-1">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Data do Passeio
 </span>
 <p className="font-bold text-foreground">
 {selectedBooking.desired_date
 ? new Date(selectedBooking.desired_date).toLocaleDateString("pt-BR")
 : "A combinar"}
 </p>
 </div>

 <div className="p-3 rounded-2xl bg-muted/40 space-y-1">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Passageiros
 </span>
 <p className="font-bold text-foreground">{selectedBooking.guests_count} pessoa(s)</p>
 </div>

 <div className="p-3 rounded-2xl bg-muted/40 space-y-1 col-span-2">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Ponto de Encontro / Local
 </span>
 <p className="font-bold text-foreground">
 {selectedBooking.meeting_point || selectedBooking.experience?.location || "Consulte o anfitrião"}
 </p>
 </div>

 <div className="p-3 rounded-2xl bg-muted/40 space-y-1 col-span-2">
 <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 Titular da Reserva
 </span>
 <p className="font-bold text-foreground">
 {selectedBooking.customer_name} ({selectedBooking.customer_phone})
 </p>
 </div>
 </div>

 {/* Informações de Embarque & Validação */}
 <div className="p-4 rounded-2xl bg-muted/20 space-y-2 text-xs">
 <div className="flex items-center gap-2 font-bold text-foreground">
 <Info size={16} weight="bold" className="text-primary" />
 <span>Instruções para o Embarque</span>
 </div>
 <p className="text-[11px] text-muted-foreground leading-relaxed">
 Apresente este voucher digital no smartphone ou impresso no momento da chegada ao ponto de encontro junto com um documento oficial com foto.
 </p>
 </div>

 {/* Ações do Voucher */}
 <div className="flex flex-col sm:flex-row gap-2 pt-2">
 <Button
 onClick={handlePrint}
 variant="outline"
 className="flex-1 rounded-xl font-bold text-xs gap-2 h-11"
 >
 <Printer size={16} weight="bold" />
 <span>Imprimir / Salvar PDF</span>
 </Button>

 <Button
 onClick={() => handleShare(selectedBooking.voucher_code)}
 className="flex-1 rounded-xl font-bold text-xs gap-2 h-11 bg-foreground text-background"
 >
 <ShareNetwork size={16} weight="bold" />
 <span>Copiar Código</span>
 </Button>
 </div>
 </div>
 )}
 </DialogContent>
 </Dialog>
 </div>
 );
}
