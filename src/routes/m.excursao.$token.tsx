import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
 Bus,
 Calendar,
 MapPin,
 CheckCircle2,
 ShieldCheck,
 Phone,
 User,
 HeartPulse,
 Send,
 AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
 getPublicPassengerForm,
 submitPassengerForm,
} from "@/services/group-tour-tokens.functions";

export const Route = createFileRoute("/m/excursao/$token")({
 head: () => ({ meta: [{ title: "Confirmação de Passageiro | Waesy" }] }),
 loader: async ({ params }: { params: { token: string } }) => {
   try {
 const formData = await getPublicPassengerForm({ data: { token: params.token } }).catch(
 (err) => {
 return { error: err?.message || "Link inválido ou expirado" };
 }
 );
 return { formData };
   } catch (err) {
     console.error("[loader:m.excursao.$token] Unhandled loader error:", err);
     return { error: null };
   }
 },
 component: PublicPassengerRegistrationPage,
});

function PublicPassengerRegistrationPage() {
 const { formData } = (Route.useLoaderData as any)();

 const [name, setName] = useState(formData?.passenger_name || "");
 const [doc, setDoc] = useState(formData?.passenger_document || "");
 const [phone, setPhone] = useState(formData?.passenger_phone || "");
 const [birthDate, setBirthDate] = useState(formData?.passenger_birth_date || "");
 const [emergencyName, setEmergencyName] = useState(formData?.emergency_contact_name || "");
 const [emergencyPhone, setEmergencyPhone] = useState(formData?.emergency_contact_phone || "");
 const [dietary, setDietary] = useState(formData?.dietary_restrictions || "");
 const [boardingPoint, setBoardingPoint] = useState(formData?.boarding_point || "");
 const [termsAccepted, setTermsAccepted] = useState(formData?.terms_accepted || false);

 const [submitting, setSubmitting] = useState(false);
 const [submitted, setSubmitted] = useState(formData?.status === "completed");

 if (!formData || formData.error) {
 return (
 <div className="min-h-screen bg-background flex items-center justify-center p-4">
 <div className="max-w-md w-full p-6 rounded-2xl bg-card border border-border/80 text-center space-y-4">
 <div className="size-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
 <AlertCircle className="size-6" />
 </div>
 <h1 className="text-base font-bold text-foreground">Link Indisponível</h1>
 <p className="text-xs text-muted-foreground">
 {formData?.error || "Este formulário de viagem não foi encontrado ou expirou."}
 </p>
 </div>
 </div>
 );
 }

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!name.trim()) return toast.error("Informe seu nome completo");
 if (!doc.trim()) return toast.error("Informe seu documento (CPF/RG)");
 if (!phone.trim()) return toast.error("Informe seu telefone");
 if (!emergencyName.trim() || !emergencyPhone.trim()) {
 return toast.error("Informe um contato de emergência completo");
 }
 if (!termsAccepted) {
 return toast.error("Você deve aceitar os termos de transporte da viagem");
 }

 try {
 setSubmitting(true);
 await submitPassengerForm({
 data: {
 token: formData.token,
 passenger_name: name.trim(),
 passenger_document: doc.trim(),
 passenger_phone: phone.trim(),
 passenger_birth_date: birthDate,
 emergency_contact_name: emergencyName.trim(),
 emergency_contact_phone: emergencyPhone.trim(),
 dietary_restrictions: dietary.trim() || null,
 boarding_point: boardingPoint.trim() || null,
 terms_accepted: true,
 },
 });

 toast.success("Dados confirmados com sucesso!");
 setSubmitted(true);
 } catch (err: any) {
 toast.error(err?.message || "Erro ao salvar informações");
 } finally {
 setSubmitting(false);
 }
 };

 if (submitted) {
 return (
 <div className="min-h-screen bg-background flex items-center justify-center p-4">
 <div className="max-w-md w-full p-8 rounded-2xl bg-card border border-border/80 text-center space-y-4 shadow-sm">
 <div className="size-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-500/20">
 <CheckCircle2 className="size-8" />
 </div>

 <div className="space-y-1">
 <h1 className="text-lg font-bold text-foreground">Cadastro Confirmado!</h1>
 <p className="text-xs text-muted-foreground leading-relaxed">
 Suas informações foram registradas com sucesso no manifesto da viagem.
 </p>
 </div>

 {formData.passenger_seat_number && (
 <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 text-center">
 <span className="text-[11px] font-mono text-primary uppercase font-bold">
 Sua Poltrona Reservada
 </span>
 <p className="text-2xl font-black text-primary font-mono">
 #{formData.passenger_seat_number}
 </p>
 </div>
 )}

 <div className="p-4 rounded-2xl bg-muted/20 border border-border/60 text-left space-y-1 text-xs">
 <p className="font-bold text-foreground">{formData.tour.title}</p>
 <p className="text-muted-foreground">
 Destino: <strong className="text-foreground">{formData.tour.destination}</strong>
 </p>
 <p className="text-muted-foreground">
 Saída: {formData.tour.departure_date} às {formData.tour.departure_time} ({formData.tour.departure_city})
 </p>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen bg-muted/20 py-8 px-4 flex justify-center">
 <div className="max-w-lg w-full space-y-6">
 {/* Header da Viagem */}
 <div className="p-6 rounded-2xl bg-card border border-border/70 space-y-3 shadow-xs">
 <div className="flex items-center justify-between">
 <Badge variant="outline" className="text-[10px] font-mono gap-1 text-primary border-primary/30">
 <Bus className="size-3" /> Ficha de Embarque
 </Badge>

 {formData.passenger_seat_number && (
 <Badge variant="default" className="text-xs font-mono font-bold">
 Poltrona #{formData.passenger_seat_number}
 </Badge>
 )}
 </div>

 <div className="space-y-1">
 <h1 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
 {formData.tour.title}
 </h1>
 <p className="text-xs text-muted-foreground flex items-center gap-1.5">
 <MapPin className="size-3.5 text-primary shrink-0" />
 {formData.tour.departure_city} ➔ {formData.tour.destination}
 </p>
 <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
 <Calendar className="size-3.5 text-muted-foreground shrink-0" />
 Saída: {formData.tour.departure_date} às {formData.tour.departure_time}
 </p>
 </div>
 </div>

 {/* Formulário de Passageiro */}
 <form
 onSubmit={handleSubmit}
 className="p-6 rounded-2xl bg-card border border-border/70 space-y-5 shadow-xs"
 >
 <div className="border-b border-border/60 pb-3">
 <h2 className="text-sm font-bold text-foreground">Identificação do Passageiro</h2>
 <p className="text-xs text-muted-foreground">
 Necessário para emissão da lista oficial de embarque e seguro viagem.
 </p>
 </div>

 {/* Nome e Documento */}
 <div className="space-y-3">
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-foreground">Nome Completo *</label>
 <Input
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Nome como consta no documento"
 className="h-11 rounded-xl text-xs"
 required
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-foreground">CPF ou RG *</label>
 <Input
 value={doc}
 onChange={(e) => setDoc(e.target.value)}
 placeholder="000.000.000-00"
 className="h-11 rounded-xl text-xs font-mono"
 required
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-foreground">Data de Nascimento *</label>
 <Input
 type="date"
 value={birthDate}
 onChange={(e) => setBirthDate(e.target.value)}
 className="h-11 rounded-xl text-xs font-mono"
 required
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-foreground">WhatsApp / Celular *</label>
 <Input
 type="tel"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 placeholder="(00) 00000-0000"
 className="h-11 rounded-xl text-xs font-mono"
 required
 />
 </div>
 </div>

 {/* Contato de Emergência */}
 <div className="border-t border-border/60 pt-4 space-y-3">
 <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
 <HeartPulse className="size-4 text-rose-500" />
 <span>Contato de Emergência</span>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-foreground">Nome do Contato *</label>
 <Input
 value={emergencyName}
 onChange={(e) => setEmergencyName(e.target.value)}
 placeholder="Ex: Parente / Amigo"
 className="h-11 rounded-xl text-xs"
 required
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-foreground">Telefone de Emergência *</label>
 <Input
 type="tel"
 value={emergencyPhone}
 onChange={(e) => setEmergencyPhone(e.target.value)}
 placeholder="(00) 00000-0000"
 className="h-11 rounded-xl text-xs font-mono"
 required
 />
 </div>
 </div>
 </div>

 {/* Embarque & Observações */}
 <div className="border-t border-border/60 pt-4 space-y-3">
 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-foreground">
 Local de Embarque Preferencial
 </label>
 <Input
 value={boardingPoint}
 onChange={(e) => setBoardingPoint(e.target.value)}
 placeholder="Ex: Posto Ipiranga Centro, Rodoviária..."
 className="h-11 rounded-xl text-xs"
 />
 </div>

 <div className="space-y-1.5">
 <label className="text-xs font-semibold text-foreground">
 Restrições Alimentares / Alergias
 </label>
 <Input
 value={dietary}
 onChange={(e) => setDietary(e.target.value)}
 placeholder="Ex: Vegetariano, intolerante a lactose..."
 className="h-11 rounded-xl text-xs"
 />
 </div>
 </div>

 {/* Termos e Aceite */}
 <div className="border-t border-border/60 pt-4 space-y-3">
 <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-muted/20 border border-border/60">
 <input
 type="checkbox"
 id="termsCheck"
 checked={termsAccepted}
 onChange={(e) => setTermsAccepted(e.target.checked)}
 className="size-5 rounded border-border text-primary cursor-pointer mt-0.5"
 required
 />
 <label htmlFor="termsCheck" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
 Declaro que as informações acima são verdadeiras e estou ciente das normas de transporte rodoviário, horários de saída e políticas de viagem.
 </label>
 </div>
 </div>

 {/* Botão de Enviar */}
 <Button
 type="submit"
 disabled={submitting}
 className="w-full h-12 rounded-2xl text-xs font-bold gap-2 cursor-pointer shadow-xs"
 >
 <Send className="size-4" />
 {submitting ? "Confirmando dados..." : "Confirmar Minhas Informações"}
 </Button>
 </form>
 </div>
 </div>
 );
}
