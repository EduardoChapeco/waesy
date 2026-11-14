import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, Clock, MapPin, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface PortalAppointmentItem {
 id: string;
 service_name: string;
 professional_name?: string;
 scheduled_at: string;
 status: "confirmed" | "in_progress" | "completed" | "cancelled";
 location?: string;
 notes?: string;
}

interface PortalAppointmentsWidgetProps {
 content?: {
 title?: string;
 subtitle?: string;
 appointments?: PortalAppointmentItem[];
 };
 design_tokens?: any;
}

export function PortalAppointmentsWidget({ content, design_tokens }: PortalAppointmentsWidgetProps) {
 const appointments: PortalAppointmentItem[] = content?.appointments || [
 {
 id: "apt-001",
 service_name: "Revisão Periódica & Alinhamento",
 professional_name: "Eng. Marcos Silva",
 scheduled_at: "2026-09-12T10:00:00Z",
 status: "confirmed",
 location: "Unidade Central - Box 04",
 notes: "Trazer manual e chave reserva.",
 },
 {
 id: "apt-002",
 service_name: "Embarque Excursão Serra Gaúcha",
 professional_name: "Guia Turístico Roberto",
 scheduled_at: "2026-09-25T07:30:00Z",
 status: "confirmed",
 location: "Terminal Turístico - Portão B",
 },
 ];

 return (
 <div className={cn("w-full max-w-5xl mx-auto py-8 px-4", design_tokens?.className)}>
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
 <div>
 <div className="flex items-center gap-2">
 <Calendar className="w-6 h-6 text-primary" />
 <h2 className="text-xl font-bold tracking-tight text-foreground">
 {content?.title || "Agendamentos"}
 </h2>
 </div>
 <p className="text-sm text-muted-foreground mt-1">
 {content?.subtitle || "Horários e atendimentos confirmados."}
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-4">
 {appointments.map((apt) => (
 <div
 key={apt.id}
 className="p-5 rounded-lg border border-border bg-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors"
 >
 <div className="space-y-2 flex-1">
 <div className="flex items-center gap-3 flex-wrap">
 <span className="font-semibold text-base text-foreground">{apt.service_name}</span>
 {apt.status === "confirmed" && (
 <Badge variant="outline" className="bg-muted text-foreground border-border text-xs flex items-center gap-1">
 <CheckCircle2 className="w-3 h-3" /> Confirmado
 </Badge>
 )}
 {apt.status === "in_progress" && (
 <Badge variant="outline" className="bg-secondary text-secondary-foreground border-border text-xs flex items-center gap-1">
 <Clock className="w-3 h-3" /> Em Andamento
 </Badge>
 )}
 </div>

 <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
 <span className="flex items-center gap-1">
 <Clock className="w-3.5 h-3.5 text-primary" />
 {new Date(apt.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
 </span>
 {apt.professional_name && (
 <span>Profissional: <strong>{apt.professional_name}</strong></span>
 )}
 {apt.location && (
 <span className="flex items-center gap-1">
 <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
 {apt.location}
 </span>
 )}
 </div>

 {apt.notes && (
 <p className="text-xs text-muted-foreground/80 italic pt-1">
 Obs: {apt.notes}
 </p>
 )}
 </div>

 <div className="flex items-center gap-2 w-full md:w-auto">
 <Button
 asChild
 size="sm"
 variant="outline"
 className="min-h-11 flex-1 md:flex-none gap-2 text-xs"
 >
 <Link to="/conta/agendamentos">
 <RefreshCw className="w-3.5 h-3.5" />
 Gerenciar Agendamento
 </Link>
 </Button>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}
