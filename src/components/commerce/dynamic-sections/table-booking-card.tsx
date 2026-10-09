import * as React from "react";
import { useState } from "react";
import { Users, Calendar as CalendarIcon, Clock, MessageSquare, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "sonner";

export interface TableBookingProps {
 title?: string;
 subtitle?: string;
 whatsappNumber?: string;
 maxPartySize?: number;
 storeData?: any;
}

export function TableBookingSection({
 title = "Reserve sua Mesa",
 subtitle = "Garanta uma experiência gastronômica memorável. Confirmação instantânea via WhatsApp.",
 whatsappNumber,
 maxPartySize = 12,
 storeData,
}: TableBookingProps) {
 const [name, setName] = useState("");
 const [guests, setGuests] = useState("2");
 const [date, setDate] = useState("");
 const [time, setTime] = useState("20:00");
 const [notes, setNotes] = useState("");

 const handleBooking = (e: React.FormEvent) => {
 e.preventDefault();
 const rawNumber = storeData?.phone || whatsappNumber || "";
 const cleanNumber = rawNumber.replace(/\D/g, "");
 const intlPhone = cleanNumber.length <= 11 && cleanNumber.length > 0 ? `55${cleanNumber}` : cleanNumber;

 if (!intlPhone) {
 toast.error("O restaurante ainda não configurou o WhatsApp para recebimento de reservas.");
 return;
 }

 const message = encodeURIComponent(
 `Olá! Gostaria de reservar uma mesa no restaurante:\n\n` +
 `Nome: ${name || "Cliente"}\n` +
 `Pessoas: ${guests}\n` +
 `Data: ${date || "A definir"}\n` +
 `⏰ Horário: ${time}\n` +
 (notes ? `Observações: ${notes}\n` : "") +
 `\nPoderiam confirmar a disponibilidade? Obrigado!`
 );

 window.open(`https://wa.me/${intlPhone}?text=${message}`, "_blank");
 };

 return (
 <section className="py-12 bg-muted/20 w-full">
 <div className="max-w-4xl mx-auto px-4 sm:px-6">
 <div className="rounded-lg border border-border/80 bg-card p-6 sm:p-10 shadow-2xs space-y-6">
 <div className="text-center max-w-xl mx-auto space-y-2">
 <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground border-border/80">
 Atendimento VIP
 </Badge>
 <h2 className="text-2xl font-bold text-foreground tracking-tight">{title}</h2>
 <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
 </div>

 <form onSubmit={handleBooking} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">Seu Nome Completo</Label>
 <Input
 required
 value={name}
 onChange={(e) => setName(e.target.value)}
 placeholder="Ex: Carlos Eduardo"
 className="h-10 rounded-lg bg-background border-border/80 text-xs"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">Número de Convidados</Label>
 <Select value={guests} onValueChange={setGuests}>
 <SelectTrigger className="h-10 rounded-lg bg-background border-border/80 text-xs">
 <SelectValue placeholder="Selecione" />
 </SelectTrigger>
 <SelectContent className="rounded-lg border-border/80 bg-popover">
 {Array.from({ length: maxPartySize }, (_, i) => i + 1).map((num) => (
 <SelectItem key={num} value={String(num)} className="text-xs">
 {num} {num === 1 ? "Pessoa" : "Pessoas"}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">Data da Reserva</Label>
 <Input
 type="date"
 required
 value={date}
 onChange={(e) => setDate(e.target.value)}
 className="h-10 rounded-lg bg-background border-border/80 text-xs"
 />
 </div>

 <div className="space-y-2">
 <Label className="text-xs font-semibold text-foreground">Horário Pretendido</Label>
 <Input
 type="time"
 required
 value={time}
 onChange={(e) => setTime(e.target.value)}
 className="h-10 rounded-lg bg-background border-border/80 text-xs"
 />
 </div>

 <div className="sm:col-span-2 space-y-2">
 <Label className="text-xs font-semibold text-foreground">Observações ou Celebrações (Opcional)</Label>
 <Input
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Ex: Aniversário de casamento, mesa na varanda..."
 className="h-10 rounded-lg bg-background border-border/80 text-xs"
 />
 </div>

 <div className="sm:col-span-2 pt-2">
 <Button
 type="submit"
 size="lg"
 className="w-full h-11 rounded-lg font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer gap-2"
 >
 <MessageSquare className="size-4" />
 <span>Solicitar Reserva via WhatsApp</span>
 </Button>
 </div>
 </form>
 </div>
 </div>
 </section>
 );
}
