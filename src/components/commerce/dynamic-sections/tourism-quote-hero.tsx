import * as React from "react";
import { useState } from "react";
import { Plane, Calendar, Users, MapPin, Send, Layers, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { recordWhatsAppLead } from "@/services/whatsapp-leads.functions";
import { cn } from "@/lib/utils";

export interface TourismQuoteHeroProps {
 title?: string;
 subtitle?: string;
 tagline?: string;
 badge?: string;
 bgImageUrl?: string;
 destinationPresets?: string[];
 whatsappPhone?: string;
 showOverlay?: boolean;
 storeData?: any;
}

export const TourismQuoteHero: React.FC<TourismQuoteHeroProps> = ({
 title = "Sua Próxima Viagem Inesquecível Começa Aqui",
 subtitle = "Roteiros exclusivos, cruzeiros, passagens aéreas e pacotes completos com assessoria VIP.",
 badge = "",
 bgImageUrl = "",
 destinationPresets = [],
 whatsappPhone,
 storeData,
}) => {
 const [destination, setDestination] = useState("");
 const [origin, setOrigin] = useState("");
 const [departureDate, setDepartureDate] = useState("");
 const [passengers, setPassengers] = useState("");
 const [clientName, setClientName] = useState("");
 const [clientPhone, setClientPhone] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [submitted, setSubmitted] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!destination.trim() || !clientPhone.trim()) {
 toast.error("Por favor, preencha o destino e o WhatsApp para receber a cotação.");
 return;
 }

 setIsSubmitting(true);
 try {
 // Salva lead no banco de dados via BFF
 await recordWhatsAppLead({
 data: {
 entity_type: "tourism",
 entity_title: `Cotação ${destination} (${passengers})`,
 phone_target: clientPhone.trim(),
 device_type: "desktop",
 metadata: { notes: `Nome: ${clientName} | Origem: ${origin} | Data: ${departureDate}` },
 },
 });

 setSubmitted(true);
 toast.success("Solicitação de cotação enviada com sucesso!");

 // Envia WhatsApp formatado
 const rawTarget = storeData?.phone || whatsappPhone || "";
 const cleanPhone = rawTarget.replace(/\D/g, "");
 const targetPhone = cleanPhone.length <= 11 && cleanPhone.length > 0 ? `55${cleanPhone}` : cleanPhone;

 if (targetPhone) {
 const msg = encodeURIComponent(
 `Olá! Solicitei uma cotação no site:\n\nDestino: ${destination}\nOrigem: ${origin}\nData: ${departureDate}\nPassageiros: ${passengers}\nNome: ${clientName}\n\nPoderiam me enviar os detalhes e valores disponíveis?`
 );
 setTimeout(() => {
 window.open(`https://wa.me/${targetPhone}?text=${msg}`, "_blank");
 }, 600);
 }
 } catch (err: any) {
 toast.error(err.message || "Erro ao solicitar cotação.");
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="relative w-full overflow-hidden bg-slate-950 py-12 md:py-20 text-white">
 {/* Background Image with Ambient Backdrop */}
 <div className="absolute inset-0 z-0">
 <img src={bgImageUrl} alt="Capa Turismo" className="h-full w-full object-cover object-center opacity-30" />
 <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/40" />
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent" />
 </div>

 <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
 <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
 {/* Coluna Esquerda: Headline & Value Props */}
 <div className="space-y-6 lg:col-span-7">
 <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-1 text-xs font-bold text-sky-300 backdrop-blur-md">
 <Layers className="size-3.5 text-sky-400" />
 <span>{badge}</span>
 </div>

 <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl leading-tight">
 {title}
 </h1>

 <p className="max-w-xl text-sm sm:text-base text-slate-300 leading-relaxed">
 {subtitle}
 </p>

 {/* Presets Rápidos de Destino */}
 <div className="space-y-2">
 <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
 Destinos Mais Procurados:
 </p>
 <div className="flex flex-wrap gap-2">
 {destinationPresets.map((dest, idx) => (
 <button
 key={idx}
 type="button"
 onClick={() => setDestination(dest)}
 className={cn(
 "rounded-lg border px-3 py-1 text-xs font-medium transition-all cursor-pointer",
 destination === dest
 ? "border-sky-400 bg-sky-500/20 text-sky-200 font-bold"
 : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500 hover:text-white"
 )}
 >
 {dest}
 </button>
 ))}
 </div>
 </div>

 {/* Badges de Confiança */}
 <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
 <div className="flex items-center gap-2">
 <ShieldCheck className="size-4 text-emerald-400" />
 <span>Atendimento Personalizado</span>
 </div>
 <div className="flex items-center gap-2">
 <CheckCircle2 className="size-4 text-sky-400" />
 <span>Parcelamento em até 10x</span>
 </div>
 </div>
 </div>

 {/* Coluna Direita: Card Flutuante de Cotação Instantânea */}
 <div className="lg:col-span-5">
 <div className="rounded-lg border border-white/10 bg-slate-900/90 p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
 <div className="mb-4 space-y-1">
 <h3 className="text-base font-bold text-white flex items-center gap-2">
 <Plane className="size-4 text-sky-400" />
 <span>Cotação Rápida de Viagem</span>
 </h3>
 <p className="text-xs text-slate-400">
 Receba opções de hotéis, voos e pacotes no seu WhatsApp em minutos.
 </p>
 </div>

 {submitted ? (
 <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-3">
 <CheckCircle2 className="size-10 text-emerald-400 mx-auto" />
 <h4 className="text-sm font-bold text-emerald-200">Cotação Encaminhada!</h4>
 <p className="text-xs text-slate-300 leading-relaxed">
 Nossos consultores já estão preparando o melhor roteiro com os melhores valores para você.
 </p>
 <Button
 onClick={() => setSubmitted(false)}
 variant="outline"
 size="sm"
 className="h-8 rounded-lg text-xs border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/20"
 >
 Fazer Outra Cotação
 </Button>
 </div>
 ) : (
 <form onSubmit={handleSubmit} className="space-y-3">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold text-slate-300">Para onde você quer viajar?</Label>
 <div className="relative">
 <MapPin className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <Input
 placeholder="Ex: Beto Carrero, Gramado, Maceió..."
 value={destination}
 onChange={(e) => setDestination(e.target.value)}
 className="pl-8.5 h-8.5 rounded-lg bg-slate-800/80 border-slate-700 text-xs text-white placeholder:text-slate-500 focus-visible:ring-sky-500"
 required
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold text-slate-300">Data Prevista</Label>
 <div className="relative">
 <Calendar className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <Input
 placeholder="Mês ou Data"
 value={departureDate}
 onChange={(e) => setDepartureDate(e.target.value)}
 className="pl-8.5 h-8.5 rounded-lg bg-slate-800/80 border-slate-700 text-xs text-white placeholder:text-slate-500"
 />
 </div>
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold text-slate-300">Viajantes</Label>
 <div className="relative">
 <Users className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <Input
 placeholder="Ex: 2 adultos, 1 criança"
 value={passengers}
 onChange={(e) => setPassengers(e.target.value)}
 className="pl-8.5 h-8.5 rounded-lg bg-slate-800/80 border-slate-700 text-xs text-white placeholder:text-slate-500"
 />
 </div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
 <Label className="text-[11px] font-bold text-slate-300">Seu Nome</Label>
 <Input
 placeholder="Nome completo"
 value={clientName}
 onChange={(e) => setClientName(e.target.value)}
 className="h-8.5 rounded-lg bg-slate-800/80 border-slate-700 text-xs text-white placeholder:text-slate-500"
 />
 </div>

 <div className="space-y-1">
 <Label className="text-[11px] font-bold text-slate-300">Seu WhatsApp</Label>
 <Input
 placeholder="(49) 99999-9999"
 value={clientPhone}
 onChange={(e) => setClientPhone(e.target.value)}
 className="h-8.5 rounded-lg bg-slate-800/80 border-slate-700 text-xs text-white placeholder:text-slate-500"
 required
 />
 </div>
 </div>

 <Button
 type="submit"
 disabled={isSubmitting}
 className="w-full h-9 mt-2 rounded-lg text-xs font-bold gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md cursor-pointer transition-all"
 >
 <Send className="size-3.5" />
 <span>{isSubmitting ? "Enviando..." : "Receber Roteiro & Preços no WhatsApp"}</span>
 </Button>
 </form>
 )}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
};

export default TourismQuoteHero;
