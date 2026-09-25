import React from "react";
import { Link } from "@tanstack/react-router";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  CalendarDots,
  CheckCircle,
  CircleNotch,
  Ticket,
  Phone,
  User,
  ChatCircleDots,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface BookingDrawerSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  service: any;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  nextDays: Array<{ iso: string; weekday: string; dayNum: number }>;
  slots: string[];
  isLoadingSlots: boolean;
  selectedSlot: string | null;
  setSelectedSlot: (s: string | null) => void;
  activePasses?: any[];
  selectedPassId: string | null;
  setSelectedPassId: (p: string | null) => void;
  guestName: string;
  setGuestName: (n: string) => void;
  guestPhone: string;
  setGuestPhone: (p: string) => void;
  notes: string;
  setNotes: (n: string) => void;
  isSuccess: boolean;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function BookingDrawerSheet({
  isOpen,
  onOpenChange,
  service,
  selectedDate,
  setSelectedDate,
  nextDays,
  slots,
  isLoadingSlots,
  selectedSlot,
  setSelectedSlot,
  activePasses = [],
  selectedPassId,
  setSelectedPassId,
  guestName,
  setGuestName,
  guestPhone,
  setGuestPhone,
  notes,
  setNotes,
  isSuccess,
  onSubmit,
  isPending,
}: BookingDrawerSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col justify-between bg-card border-l border-border/80 shadow-2xl"
      >
        <div className="p-5 pb-4 border-b border-border/40 shrink-0">
          <SheetHeader className="text-left space-y-1">
            <SheetTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <CalendarDots size={20} className="text-primary" />
              <span>Reservar Horário</span>
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {service.title} • {formatMoney(service.price_cents)} ({service.duration_minutes || 60} min)
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 flex-1 no-scrollbar">
          {isSuccess ? (
            <div className="py-12 text-center space-y-4">
              <div className="size-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle size={36} weight="bold" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Agendamento Confirmado!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Seu horário para <strong>{service.title}</strong> foi agendado com sucesso para o dia{" "}
                <strong>{selectedDate}</strong> às{" "}
                <strong>
                  {selectedSlot
                    ? new Date(selectedSlot).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                    : "horário comercial"}
                </strong>.
              </p>
              <div className="pt-4 flex flex-col gap-2">
                <Button asChild className="rounded-xl font-bold text-xs h-10">
                  <Link to="/conta/agendamentos">Ver Meus Agendamentos</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="rounded-xl font-bold text-xs h-10"
                >
                  Fechar
                </Button>
              </div>
            </div>
          ) : (
            <form id="booking-form" onSubmit={onSubmit} className="space-y-5">
              {/* 1. Escolha do Dia */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">1. Escolha a Data</Label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {nextDays.map((day) => {
                    const isSelected = selectedDate === day.iso;
                    return (
                      <button
                        key={day.iso}
                        type="button"
                        onClick={() => {
                          setSelectedDate(day.iso);
                          setSelectedSlot(null);
                        }}
                        className={cn(
                          "p-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center",
                          isSelected
                            ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                            : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <span className="text-[9px] font-mono tracking-wider">{day.weekday}</span>
                        <span className="text-sm font-bold mt-0.5">{day.dayNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Horários Disponíveis */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">2. Horário Disponível</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {slots.length} opções disponíveis
                  </span>
                </div>

                {isLoadingSlots ? (
                  <div className="flex items-center justify-center py-6">
                    <CircleNotch size={24} className="animate-spin text-muted-foreground" />
                  </div>
                ) : slots.length === 0 ? (
                  <div className="p-3.5 rounded-xl bg-muted/40 text-center text-xs text-muted-foreground">
                    Nenhum horário disponível para esta data. Selecione outro dia.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                    {slots.map((slotIso: string) => {
                      const timeStr = new Date(slotIso).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      const isSelected = selectedSlot === slotIso;

                      return (
                        <button
                          key={slotIso}
                          type="button"
                          onClick={() => setSelectedSlot(slotIso)}
                          className={cn(
                            "h-9 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer flex items-center justify-center",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-card border-border/60 hover:bg-muted text-foreground"
                          )}
                        >
                          {timeStr}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Pacotes de Sessões Ativos do Usuário */}
              {activePasses && activePasses.length > 0 && (
                <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Ticket size={15} weight="bold" />
                      Usar Crédito de Pacote
                    </span>
                  </div>
                  {activePasses.map((pass: any) => (
                    <label
                      key={pass.id}
                      className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="service_pass"
                        checked={selectedPassId === pass.id}
                        onChange={() => setSelectedPassId(pass.id)}
                        className="text-primary"
                      />
                      <span>
                        {pass.service_packages?.title} ({pass.remaining_credits} créditos restantes)
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* 4. Dados Pessoais do Cliente */}
              <div className="space-y-3 pt-1">
                <Label className="text-xs font-bold text-foreground">3. Seus Dados de Contato</Label>
                <div className="space-y-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                      <User size={13} />
                      Nome Completo *
                    </Label>
                    <Input
                      required
                      placeholder="Nome do cliente"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                      <Phone size={13} />
                      WhatsApp / Telefone para Confirmação *
                    </Label>
                    <Input
                      required
                      type="tel"
                      placeholder="(00) 00000-0000"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1">
                      <ChatCircleDots size={13} />
                      Observações / Pedido Especial (Opcional)
                    </Label>
                    <Textarea
                      placeholder="Ex: Preferência por profissional, detalhes adicionais..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="text-xs rounded-xl resize-none"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {!isSuccess && (
          <div className="p-4 border-t border-border/60 bg-background flex items-center justify-between gap-3 shrink-0">
            <div>
              <span className="text-[10px] text-muted-foreground font-semibold block">Total</span>
              <span className="text-base font-black font-mono text-foreground">
                {selectedPassId ? "1 Crédito (Pacote)" : formatMoney(service.price_cents)}
              </span>
            </div>
            <Button
              type="submit"
              form="booking-form"
              disabled={isPending}
              className="h-11 px-6 rounded-xl font-bold text-xs bg-primary text-primary-foreground cursor-pointer shadow-sm"
            >
              {isPending ? (
                <CircleNotch size={16} className="animate-spin" />
              ) : (
                "Confirmar Agendamento"
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
