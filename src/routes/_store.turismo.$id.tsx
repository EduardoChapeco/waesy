import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
 Compass,
 MapPin,
 Clock,
 Star,
 WhatsappLogo,
 ShareNetwork,
 ArrowLeft,
 CheckCircle,
 SuitcaseRolling,
 SlidersHorizontal,
 CalendarDots,
 Users,
 CircleNotch,
 User,
 EnvelopeSimple,
 Phone,
 ChatText,
 ShieldCheck,
 AirplaneTilt,
 Ticket,
 CreditCard,
 QrCode,
 IdentificationCard,
 Plus,
 Trash,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { TravelQuoteModal } from "@/components/tourism/travel-quote-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogTrigger,
 DialogDescription,
} from "@/components/ui/dialog";
import {
 getPublicTourismById,
 bookTourismExperience,
 type TourismItemDTO,
 type TourismPassenger,
} from "@/services/tourism.functions";
import { getUserSession } from "@/services/auth.functions";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { ProtectedContactButton } from "@/components/common/protected-contact-button";
import { ProductTelemetry } from "@/components/commerce/product-telemetry";
import { WeatherWidget } from "@/components/classifieds/weather-widget";

export const Route = createFileRoute("/_store/turismo/$id")({
 head: ({
 loaderData,
 }: {
 loaderData?: { experience: TourismItemDTO | null; session: any };
 }) => ({
 meta: [
 {
 title: loaderData?.experience
 ? `${loaderData.experience.title} — Turismo Waesy`
 : "Experiência Turística — Waesy",
 },
 {
 name: "description",
 content: loaderData?.experience?.description
 ? `${loaderData.experience.description.slice(0, 160)}...`
 : "Descubra passeios, hospedagens e roteiros turísticos autênticos no Waesy.",
 },
 ],
 }),
 loader: async ({ params }): Promise<{ experience: TourismItemDTO | null; session: any }> => {
 const [experience, session] = await Promise.all([
 getPublicTourismById({ data: { experienceId: params.id } }).catch(() => null),
 getUserSession().catch(() => null),
 ]);
 return { experience, session };
 },
 component: TourismDetailPage,
});

function TourismDetailPage() {
 const { experience, session } = ((Route.useLoaderData?.() as any) || {});
 const navigate = useNavigate();

 const [isBookingOpen, setIsBookingOpen] = useState(false);
 const [isTravelQuoteOpen, setIsTravelQuoteOpen] = useState(false);
 const [customerName, setCustomerName] = useState(session?.user_metadata?.full_name || "");
 const [customerEmail, setCustomerEmail] = useState(session?.email || "");
 const [customerPhone, setCustomerPhone] = useState("");
 const [desiredDate, setDesiredDate] = useState("");
 const [guestsCount, setGuestsCount] = useState(1);
 const [passengers, setPassengers] = useState<TourismPassenger[]>([
 { name: session?.user_metadata?.full_name || "", document: "" },
 ]);
 const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card" | "agency_pay">("pix");
 const [message, setMessage] = useState("");
 const [activeImage, setActiveImage] = useState(0);
 const [issuedVoucher, setIssuedVoucher] = useState<{ voucherCode: string; bookingId: string } | null>(null);

 const handleGuestsCountChange = (count: number) => {
 const validCount = Math.max(1, Math.min(50, count));
 setGuestsCount(validCount);
 setPassengers((prev) => {
 const next = [...prev];
 while (next.length < validCount) {
 next.push({ name: "", document: "" });
 }
 return next.slice(0, validCount);
 });
 };

 const handlePassengerChange = (index: number, field: keyof TourismPassenger, val: string) => {
 setPassengers((prev) => {
 const next = [...prev];
 next[index] = { ...next[index], [field]: val };
 return next;
 });
 };

 const bookingMutation = useMutation({
 mutationFn: () =>
 bookTourismExperience({
 data: {
 experienceId: experience?.id || "",
 customerName: customerName || passengers[0]?.name || "Cliente",
 customerEmail,
 customerPhone,
 desiredDate,
 guestsCount,
 passengers,
 paymentMethod: paymentMethod === "agency_pay" ? "pix" : paymentMethod,
 message: message || undefined,
 },
 }),
 onSuccess: (res) => {
 setIssuedVoucher({ voucherCode: res.voucher_code, bookingId: res.booking_id });
 toast.success(res.message);
 },
 onError: (err: any) => {
 toast.error(err?.message || "Erro ao realizar reserva.");
 },
 });

 if (!experience) {
 return (
 <div className="w-full max-w-3xl mx-auto py-24 text-center space-y-4">
 <Compass size={48} className="text-muted-foreground/40 mx-auto" />
 <h1 className="text-xl font-bold text-foreground">Experiência Não Encontrada</h1>
 <p className="text-sm text-muted-foreground max-w-md mx-auto">
 Este roteiro ou hospedagem pode ter sido desativado pelo anfitrião.
 </p>
 <Button asChild className="rounded-xl font-bold">
 <Link to="/turismo">
 <ArrowLeft size={16} weight="bold" className="mr-2" />
 Explorar todas as experiências
 </Link>
 </Button>
 </div>
 );
 }

 const images = experience.gallery_urls?.length > 0 ? experience.gallery_urls : [experience.image_url];
 // whatsappUrl: removido — agora usa trackAndOpenWhatsApp para rastreamento real de conversões

 const unitPriceCents = experience.price_cents || 0;
 const totalPriceCents = unitPriceCents * guestsCount;

 const handleShare = () => {
 if (typeof window !== "undefined" && navigator.clipboard) {
 navigator.clipboard.writeText(window.location.href);
 toast.success("Link do passeio copiado para a área de transferência!");
 }
 };

 return (
 <div className="w-full max-w-6xl mx-auto space-y-8 pb-6 px-0 sm:px-4 md:px-0">
 <ProductTelemetry
   storeId={experience.store_id}
   productId={experience.id}
   productTitle={experience.title}
   description={experience.description || "Experiência turística e passeios"}
   priceCents={experience.price_cents || 0}
   imageUrl={experience.image_url}
   slug={experience.id}
   category={experience.category || "Turismo"}
 />

 {/* ── 1. Top Navigation & Breadcrumb ── */}
 <div className="flex items-center justify-between pt-2">
 <Link
 to="/turismo"
 className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group"
 >
 <ArrowLeft size={16} weight="bold" className="group-hover:-translate-x-1 transition-transform" />
 <span>Voltar para Turismo & Lazer</span>
 </Link>

 <Button
 variant="outline"
 size="sm"
 onClick={handleShare}
 className="rounded-xl font-semibold text-xs gap-1.5 h-9"
 >
 <ShareNetwork size={16} weight="bold" />
 <span>Compartilhar</span>
 </Button>
 </div>

 {/* ── 2. Header & Title Block ── */}
 <div className="space-y-3">
 <div className="flex flex-wrap items-center gap-2">
 <Badge variant="outline" className="text-xs font-bold bg-muted/60 text-foreground">
 {experience.badge_label || "Experiência Regional"}
 </Badge>
 <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full">
 <Star size={14} weight="fill" />
 <span>{experience.rating.toFixed(1)}</span>
 </div>
 </div>

 <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground">
 {experience.title}
 </h1>

 {experience.subtitle && (
 <p className="text-sm sm:text-base text-muted-foreground font-medium">
 {experience.subtitle}
 </p>
 )}

 <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm text-muted-foreground font-medium pt-1">
 <span className="flex items-center gap-1.5">
 <MapPin size={16} weight="bold" className="text-foreground shrink-0" />
 <span>{experience.location}</span>
 </span>
 <span className="flex items-center gap-1.5">
 <Clock size={16} weight="bold" className="text-foreground shrink-0" />
 <span>Duração: {experience.duration}</span>
 </span>
 <span className="flex items-center gap-1.5">
 <Compass size={16} weight="bold" className="text-foreground shrink-0" />
 <span>Anfitrião: {experience.provider_name}</span>
 </span>
 </div>
 </div>

 {/* ── 3. Visual Gallery ── */}
 <div className="space-y-3">
 <div className="relative w-full aspect-video sm:aspect-21/9 rounded-2xl border border-border/60 overflow-hidden bg-muted">
 <img
 src={images[activeImage] || experience.image_url}
 alt={experience.title}
 className="size-full object-cover"
 />
 </div>

 {images.length > 1 && (
 <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
 {images.map((img: string, idx: number) => (
 <button
 key={idx}
 onClick={() => setActiveImage(idx)}
 className={`relative w-20 sm:w-24 aspect-video rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
 activeImage === idx ? "border-foreground " : "border-transparent opacity-70 hover:opacity-100"
 }`}
 >
 <img src={img} alt={`Thumb ${idx}`} className="size-full object-cover" />
 </button>
 ))}
 </div>
 )}
 </div>

 {/* ── 4. Main Content Grid ── */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 {/* Left Column: Description, Weather, Itinerary, Inclusions, What to Bring */}
 <div className="md:col-span-2 space-y-8">
 {/* Sobre a Experiência */}
 <section className="space-y-3">
 <h2 className="text-lg font-bold text-foreground">Sobre a Experiência</h2>
 <div className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
 {experience.description}
 </div>
 </section>

 {/* Previsão do Tempo Real via wttr.in (Regra 21) */}
 {experience.location && (
 <div className="space-y-2">
 <WeatherWidget city={experience.location.split(",")[0].trim()} />
 </div>
 )}

 {/* Roteiro Dia a Dia / Itinerário Detalhado (Renderizado apenas se cadastrado - Regra 19) */}
 {experience.itinerary && experience.itinerary.length > 0 && (
 <section className="space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <CalendarDots size={18} weight="bold" className="text-primary" />
 <span>Roteiro Dia a Dia & Atividades</span>
 </h3>
 <Badge variant="outline" className="text-[10px] font-mono font-bold">
 Programação Oficial
 </Badge>
 </div>

 <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/60">
 {experience.itinerary.map((item: any, idx: number) => (
 <div key={idx} className="relative pl-8 space-y-1">
 <div className="absolute left-2 top-1.5 size-3.5 rounded-full bg-primary ring-4 ring-background -translate-x-1/2" />
 <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary block">
 Dia {item.day || idx + 1} {item.time ? `• ${item.time}` : ""}
 </span>
 <p className="text-xs font-bold text-foreground">{item.title}</p>
 {item.description && (
 <p className="text-xs text-muted-foreground leading-relaxed">
 {item.description}
 </p>
 )}
 </div>
 ))}
 </div>
 </section>
 )}

 {/* O que está incluso */}
 {experience.included_items && experience.included_items.length > 0 && (
 <section className="space-y-3">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <CheckCircle size={18} weight="bold" className="text-emerald-600" />
 <span>O que está incluso no pacote</span>
 </h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 {experience.included_items.map((item: string, idx: number) => (
 <div
 key={idx}
 className="flex items-center gap-2.5 p-3 rounded-2xl border border-border/60 bg-card text-xs font-medium text-foreground"
 >
 <CheckCircle size={14} weight="bold" className="text-emerald-500 shrink-0" />
 <span>{item}</span>
 </div>
 ))}
 </div>
 </section>
 )}

 {/* Transporte, Hospedagem & Documentação Obrigatória */}
 <section className="p-5 rounded-2xl bg-muted/20 border border-border/60 space-y-4">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <ShieldCheck size={18} weight="bold" className="text-primary" />
 <span>Informações Importantes & Documentação</span>
 </h3>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
 <div className="p-3 rounded-xl bg-card border border-border/40 space-y-1">
 <span className="font-bold text-foreground block">🛂 Documentação de Viagem:</span>
 <p className="text-muted-foreground leading-relaxed">
 Documento oficial com foto (RG em bom estado emitido há menos de 10 anos ou CNH válida). Para viagens internacionais, passaporte com validade mínima de 6 meses.
 </p>
 </div>

 <div className="p-3 rounded-xl bg-card border border-border/40 space-y-1">
 <span className="font-bold text-foreground block">🏨 Políticas de Hotelaria & Bagagem:</span>
 <p className="text-muted-foreground leading-relaxed">
 Check-in a partir das 14h / Check-out até às 11h. Franquia de bagagem conforme modalidade de transporte informada no voucher.
 </p>
 </div>
 </div>
 </section>

 {/* O que levar */}
 {experience.what_to_bring && experience.what_to_bring.length > 0 && (
 <section className="space-y-3">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <SuitcaseRolling size={18} weight="bold" className="text-primary" />
 <span>Recomendações / O que levar</span>
 </h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
 {experience.what_to_bring.map((item: string, idx: number) => (
 <div
 key={idx}
 className="flex items-center gap-2.5 p-3 rounded-2xl border border-border/60 bg-card text-xs font-medium text-foreground"
 >
 <span className="size-1.5 rounded-full bg-primary shrink-0" />
 <span>{item}</span>
 </div>
 ))}
 </div>
 </section>
 )}
 </div>

 {/* Right Column: Pricing, Instant Booking, WhatsApp */}
 <aside className="space-y-4">
 <div className="p-6 rounded-2xl border border-border/60 bg-card space-y-5 sticky top-20">
 <div>
 <span className="text-xs text-muted-foreground font-medium block">Valor da Experiência</span>
 <div className="text-2xl font-black text-foreground mt-0.5">
 {experience.price_display}
 </div>
 </div>

 {/* Modal de Reserva Real com Voucher */}
 <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
 <DialogTrigger asChild>
 <Button className="w-full rounded-xl font-bold h-12 text-sm bg-foreground text-background gap-2">
 <Ticket size={18} weight="bold" />
 <span>Reservar & Emitir Voucher</span>
 </Button>
 </DialogTrigger>

 <DialogContent className="sm:max-w-lg sm:rounded-2xl p-5 sm:p-8 bg-card border-border">
 <DialogHeader className="space-y-2">
 <DialogTitle className="text-lg font-black text-foreground">
 Reservar {experience.title}
 </DialogTitle>
 <DialogDescription className="text-xs text-muted-foreground">
 Informe os dados dos participantes e a data para confirmação e emissão do voucher digital.
 </DialogDescription>
 </DialogHeader>

 {issuedVoucher ? (
 <div className="py-6 text-center space-y-4">
 <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
 <CheckCircle size={32} weight="bold" />
 </div>
 <div className="space-y-1">
 <h4 className="text-base font-bold text-foreground">Voucher Emitido com Sucesso!</h4>
 <p className="text-xs text-muted-foreground">
 Sua reserva está confirmada. Você pode consultar seu voucher em "Minhas Viagens".
 </p>
 <div className="pt-2 font-mono font-black text-sm text-foreground bg-muted p-2 rounded-xl">
 Código: {issuedVoucher.voucherCode}
 </div>
 </div>

 <div className="flex flex-col sm:flex-row gap-2 pt-2">
 <Button
 asChild
 className="flex-1 rounded-xl font-bold text-xs bg-foreground text-background h-11"
 >
 <Link to="/conta/viagens">
 <Compass size={16} weight="bold" className="mr-1.5" />
 <span>Ver Minhas Viagens</span>
 </Link>
 </Button>

 <Button
 variant="outline"
 onClick={() => {
 setIsBookingOpen(false);
 setIssuedVoucher(null);
 }}
 className="rounded-xl font-bold text-xs h-11"
 >
 Fechar
 </Button>
 </div>
 </div>
 ) : (
 <form
 onSubmit={(e) => {
 e.preventDefault();
 bookingMutation.mutate();
 }}
 className="space-y-4 pt-2"
 >
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <CalendarDots size={14} weight="bold" />
 <span>Data do Passeio *</span>
 </label>
 <Input
 required
 type="date"
 value={desiredDate}
 onChange={(e) => setDesiredDate(e.target.value)}
 className="rounded-xl h-10 text-xs bg-background"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Users size={14} weight="bold" />
 <span>Nº Passageiros *</span>
 </label>
 <Input
 type="number"
 min={1}
 max={50}
 value={guestsCount}
 onChange={(e) => handleGuestsCountChange(parseInt(e.target.value) || 1)}
 className="rounded-xl h-10 text-xs bg-background"
 />
 </div>
 </div>

 {/* Lista de Passageiros */}
 <div className="space-y-2 pt-1 ">
 <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <IdentificationCard size={14} weight="bold" />
 <span>Dados dos Participantes</span>
 </span>

 <div className="space-y-2 max-h-44 overflow-y-auto no-scrollbar pr-1">
 {passengers.map((p, idx) => (
 <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-2xl bg-muted/40 ">
 <Input
 required
 placeholder={`Nome do participante ${idx + 1}`}
 value={p.name}
 onChange={(e) => handlePassengerChange(idx, "name", e.target.value)}
 className="rounded-lg h-8 text-xs bg-background"
 />
 <Input
 placeholder="CPF / Doc (opcional)"
 value={p.document || ""}
 onChange={(e) => handlePassengerChange(idx, "document", e.target.value)}
 className="rounded-lg h-8 text-xs bg-background"
 />
 </div>
 ))}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 ">
 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <Phone size={14} weight="bold" />
 <span>WhatsApp para contato *</span>
 </label>
 <Input
 required
 placeholder="(49) 99999-9999"
 value={customerPhone}
 onChange={(e) => setCustomerPhone(e.target.value)}
 className="rounded-xl h-10 text-xs bg-background"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
 <EnvelopeSimple size={14} weight="bold" />
 <span>E-mail para o voucher *</span>
 </label>
 <Input
 required
 type="email"
 placeholder="seu.email@exemplo.com"
 value={customerEmail}
 onChange={(e) => setCustomerEmail(e.target.value)}
 className="rounded-xl h-10 text-xs bg-background"
 />
 </div>
 </div>

 {/* Resumo de Preço Total */}
 {totalPriceCents > 0 && (
 <div className="p-3.5 rounded-2xl bg-muted/50 flex items-center justify-between text-xs font-bold">
 <span className="text-muted-foreground">
 Total ({guestsCount}x {formatMoney(unitPriceCents)}):
 </span>
 <span className="text-sm font-black text-foreground">
 {formatMoney(totalPriceCents)}
 </span>
 </div>
 )}

 <Button
 type="submit"
 disabled={bookingMutation.isPending}
 className="w-full rounded-xl font-bold h-11 text-xs bg-foreground text-background mt-2 "
 >
 {bookingMutation.isPending ? (
 <>
 <CircleNotch size={16} className="animate-spin mr-2" />
 Processando reserva e emitindo voucher...
 </>
 ) : (
 "Confirmar Reserva & Gerar Voucher"
 )}
 </Button>
 </form>
 )}
 </DialogContent>
 </Dialog>

 {/* Botão de Cotação Personalizada Sob Medida */}
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsTravelQuoteOpen(true)}
 className="w-full rounded-xl font-bold h-11 text-xs border-border gap-2 cursor-pointer bg-card hover:bg-muted/50"
 >
 <SlidersHorizontal size={16} weight="bold" className="text-primary" />
 <span>Personalizar Viagem / Cotar Outras Datas</span>
 </Button>

 {/* WhatsApp do Provedor — Rastreado e Protegido por Login */}
 {experience.contact_whatsapp && (
 <ProtectedContactButton
 phone={experience.contact_whatsapp}
 storeId={(experience as any).store_id || null}
 entityType="tourism"
 entityId={experience.id}
 entityTitle={experience.title}
 niche={experience.category || "turismo"}
 variant="outline"
 size="lg"
 label="Conversar no WhatsApp"
 className="w-full rounded-xl font-bold h-11 text-xs border-border gap-2"
 />
 )}

 <div className="pt-3 space-y-2 text-[11px] text-muted-foreground">
 <div className="flex items-center gap-2">
 <ShieldCheck size={16} weight="bold" className="text-foreground shrink-0" />
 <span>Experiência verificada e curada pelo ecossistema Waesy.</span>
 </div>
 </div>
 </div>
 </aside>
 </div>
 <TravelQuoteModal
 open={isTravelQuoteOpen}
 onOpenChange={setIsTravelQuoteOpen}
 defaultDestination={experience.location_name || experience.title}
 defaultTripType={experience.category === "hospedagens" ? "hotel_only" : (experience.category as string) === "cruzeiro" ? "cruise" : "air_package"}
 />
 </div>
 );
}
