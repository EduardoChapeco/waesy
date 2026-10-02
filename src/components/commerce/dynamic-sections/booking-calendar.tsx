"use client";

import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listBookingServices, getAvailableSlots, createAppointment } from "@/services/booking.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface BookingCalendarProps {
 content?: {
 title?: string;
 subtitle?: string;
 };
 node_id?: string;
 block_type?: string;
}

export function BookingCalendar({ content }: BookingCalendarProps) {
 const [selectedService, setSelectedService] = useState<string | null>(null);
 const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
 const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
 const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Service, 2: Date/Time, 3: Form, 4: Success

 // Form states
 const [guestName, setGuestName] = useState("");
 const [guestPhone, setGuestPhone] = useState("");
 const [notes, setNotes] = useState("");

 const listServicesFn = useServerFn(listBookingServices);
 const getSlotsFn = useServerFn(getAvailableSlots);
 const createFn = useServerFn(createAppointment);

 // Queries
 const { data: servicesRes, isLoading: isLoadingServices } = useQuery({
 queryKey: [
 "booking_services",
 typeof window !== "undefined" ? window.location.hostname : "ssr",
 ],
 queryFn: () => listServicesFn(),
 });

 const { data: slotsRes, isLoading: isLoadingSlots } = useQuery({
 queryKey: [
 "booking_slots",
 typeof window !== "undefined" ? window.location.hostname : "ssr",
 selectedService,
 selectedDate?.toISOString().split("T")[0],
 ],
 queryFn: () =>
 getSlotsFn({
 data: {
 service_id: selectedService!,
 date: selectedDate!.toISOString().split("T")[0],
 },
 }),
 enabled: !!selectedService && !!selectedDate && step === 2,
 });

 // Mutations
 const bookMutation = useMutation({
 mutationFn: (data: any) => createFn({ data }),
 onSuccess: () => {
 setStep(4);
 },
 });

 const handleNext = () => {
 if (step === 1 && selectedService) setStep(2);
 else if (step === 2 && selectedSlot) setStep(3);
 };

 const handleBook = () => {
 if (!selectedService || !selectedSlot || !guestName || !guestPhone) return;

 bookMutation.mutate({
 service_id: selectedService,
 guest_name: guestName,
 guest_phone: guestPhone,
 scheduled_at: selectedSlot,
 notes: notes,
 });
 };

 const services = servicesRes?.data || [];
 const slots = slotsRes?.data || [];

 const title = content?.title || "Agende seu Atendimento";
 const subtitle = content?.subtitle || "Escolha o melhor serviço e horário para você.";

 return (
 <section className="w-full py-12 bg-muted/30">
 <div className="container mx-auto px-4 max-w-4xl">
 <div className="text-center mb-8">
 <h2 className="text-3xl font-bold tracking-tight mb-2">{title}</h2>
 <p className="text-muted-foreground">{subtitle}</p>
 </div>

 <Card className="border-muted">
 <CardHeader className="bg-muted/50 border-b">
 <div className="flex justify-between items-center text-sm font-medium">
 <span className={step >= 1 ? "text-primary" : "text-muted-foreground"}>
 1. Serviço
 </span>
 <span className="text-muted-foreground/30">/</span>
 <span className={step >= 2 ? "text-primary" : "text-muted-foreground"}>
 2. Data e Hora
 </span>
 <span className="text-muted-foreground/30">/</span>
 <span className={step >= 3 ? "text-primary" : "text-muted-foreground"}>
 3. Confirmação
 </span>
 </div>
 </CardHeader>
 <CardContent className="p-6">
 {/* STEP 1: Select Service */}
 {step === 1 && (
 <div className="space-y-4 animate-in fade-in zoom-in-95">
 <CardTitle className="mb-4">Selecione o Serviço</CardTitle>
 {isLoadingServices ? (
 <div className="flex justify-center p-8">
 <Loader2 className="animate-spin text-primary" />
 </div>
 ) : services.length === 0 ? (
 <div className="text-center p-8 text-muted-foreground">
 Nenhum serviço disponível no momento.
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {services.map((svc) => (
 <div
 key={svc.id}
 onClick={() => setSelectedService(svc.id)}
 className={`p-4 border cursor-pointer transition-all ${selectedService === svc.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
 >
 <h3 className="font-semibold text-lg">{svc.title}</h3>
 <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
 {svc.description}
 </p>
 <div className="mt-3 flex items-center text-sm font-medium">
 <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
 {svc.duration_minutes} min
 </div>
 </div>
 ))}
 </div>
 )}

 <div className="mt-6 flex justify-end">
 <Button onClick={handleNext} disabled={!selectedService}>
 Continuar
 </Button>
 </div>
 </div>
 )}

 {/* STEP 2: Select Date & Time */}
 {step === 2 && (
 <div className="space-y-6 animate-in fade-in zoom-in-95">
 <CardTitle>Escolha o Dia e Horário</CardTitle>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div>
 <Calendar
 mode="single"
 selected={selectedDate}
 onSelect={setSelectedDate}
 disabled={(date) => date < new Date() || date.getDay() === 0} // Disable past and Sundays
 locale={ptBR}
 className="rounded-lg border p-3"
 />
 </div>
 <div>
 <h4 className="font-medium mb-3 flex items-center">
 <CalendarIcon className="w-4 h-4 mr-2" />
 Horários em{" "}
 {selectedDate ? format(selectedDate, "dd 'de' MMMM", { locale: ptBR }) : ""}
 </h4>

 {isLoadingSlots ? (
 <div className="flex justify-center p-8">
 <Loader2 className="animate-spin text-primary" />
 </div>
 ) : slots.length === 0 ? (
 <div className="text-center p-8 text-muted-foreground bg-muted/50">
 Nenhum horário livre neste dia.
 </div>
 ) : (
 <div className="grid grid-cols-3 gap-2">
 {slots.map((slot) => {
 const dateObj = new Date(slot);
 return (
 <Button
 key={slot}
 variant={selectedSlot === slot ? "default" : "outline"}
 className="w-full"
 onClick={() => setSelectedSlot(slot)}
 >
 {format(dateObj, "HH:mm")}
 </Button>
 );
 })}
 </div>
 )}
 </div>
 </div>

 <div className="mt-6 flex justify-between">
 <Button variant="ghost" onClick={() => setStep(1)}>
 Voltar
 </Button>
 <Button onClick={handleNext} disabled={!selectedSlot}>
 Continuar
 </Button>
 </div>
 </div>
 )}

 {/* STEP 3: Form */}
 {step === 3 && (
 <div className="space-y-6 animate-in fade-in zoom-in-95 max-w-md mx-auto">
 <div className="text-center mb-6">
 <CardTitle>Seus Dados</CardTitle>
 <CardDescription className="mt-2">
 Reserva para{" "}
 {selectedSlot && format(new Date(selectedSlot), "dd/MM/yyyy 'às' HH:mm")}
 </CardDescription>
 </div>

 <div className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="guestName">Nome Completo</Label>
 <Input
 id="guestName"
 value={guestName}
 onChange={(e) => setGuestName(e.target.value)}
 placeholder="Ex: Maria Silva"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="guestPhone">WhatsApp</Label>
 <Input
 id="guestPhone"
 value={guestPhone}
 onChange={(e) => setGuestPhone(e.target.value)}
 placeholder="(11) 99999-9999"
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="notes">Observações (Opcional)</Label>
 <Textarea
 id="notes"
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Algum detalhe para o atendimento?"
 />
 </div>
 </div>

 <div className="mt-8 flex justify-between">
 <Button variant="ghost" onClick={() => setStep(2)}>
 Voltar
 </Button>
 <Button
 onClick={handleBook}
 disabled={!guestName || guestPhone.length < 10 || bookMutation.isPending}
 >
 {bookMutation.isPending ? (
 <Loader2 className="w-4 h-4 mr-2 animate-spin" />
 ) : null}
 Confirmar Agendamento
 </Button>
 </div>
 </div>
 )}

 {/* STEP 4: Success */}
 {step === 4 && (
 <div className="text-center space-y-6 py-12 animate-in fade-in zoom-in-95">
 <div className="flex justify-center">
 <CheckCircle2 className="w-20 h-20 text-success" />
 </div>
 <CardTitle className="text-2xl">Agendamento Confirmado!</CardTitle>
 <p className="text-muted-foreground text-lg max-w-md mx-auto">
 Sua reserva para o dia{" "}
 <strong>
 {selectedSlot && format(new Date(selectedSlot), "dd/MM/yyyy 'às' HH:mm")}
 </strong>{" "}
 foi realizada com sucesso.
 </p>
 <p className="text-sm text-muted-foreground">
 Entraremos em contato pelo WhatsApp para confirmar.
 </p>
 <Button
 className="mt-8"
 onClick={() => {
 setStep(1);
 setSelectedService(null);
 setSelectedSlot(null);
 setGuestName("");
 }}
 >
 Fazer Novo Agendamento
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 </section>
 );
}
