import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BookingDrawerSheet } from "@/components/booking/booking-drawer-sheet";
import {
  createAppointment,
  getAvailableSlots,
  listMyPassesForService,
} from "@/services/booking.functions";

export interface AppServiceBookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  service: any | null;
  resources?: Array<{ id: string; name: string; resource_type: string }>;
}

function buildNextSevenDays() {
  const days: Array<{ iso: string; weekday: string; dayNum: number }> = [];
  const weekdayLabels = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    days.push({
      iso,
      weekday: i === 0 ? "HOJE" : weekdayLabels[d.getDay()],
      dayNum: d.getDate(),
    });
  }
  return days;
}

export function AppServiceBookingSheet({
  open,
  onOpenChange,
  storeId,
  service,
  resources = [],
}: AppServiceBookingSheetProps) {
  const queryClient = useQueryClient();
  const nextDays = useMemo(() => buildNextSevenDays(), []);
  const [selectedDate, setSelectedDate] = useState<string>(nextDays[0]?.iso || "");
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const serviceId = service?.id ? String(service.id) : "";

  const { data: slotsData, isLoading: isLoadingSlots } = useQuery({
    queryKey: ["app-booking-slots", serviceId, selectedDate, selectedResourceId],
    queryFn: () =>
      getAvailableSlots({
        data: {
          service_id: serviceId,
          date: selectedDate,
          resource_id: selectedResourceId || undefined,
        },
      }),
    enabled: Boolean(open && serviceId && selectedDate),
  });

  const { data: passesData } = useQuery({
    queryKey: ["app-booking-passes", serviceId],
    queryFn: () => listMyPassesForService({ data: { service_id: serviceId } }),
    enabled: Boolean(open && serviceId),
  });

  const { mutate: bookNow, isPending } = useMutation({
    mutationFn: createAppointment,
    onSuccess: (res: any) => {
      if (res?.status === "error") {
        toast.error(res.message || "Horário indisponível.");
        return;
      }
      setIsSuccess(true);
      toast.success("Agendamento confirmado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["client-store-portal", storeId] });
      queryClient.invalidateQueries({ queryKey: ["app-booking-slots", serviceId] });
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Erro ao confirmar agendamento.");
    },
  });

  if (!service) return null;

  const rawSlots = Array.isArray((slotsData as any)?.slots)
    ? (slotsData as any).slots
    : Array.isArray(slotsData)
      ? slotsData
      : [];

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsSuccess(false);
      setSelectedSlot(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) {
      toast.error("Escolha um horário disponível.");
      return;
    }
    if (!guestName.trim() || guestPhone.replace(/\D/g, "").length < 8) {
      toast.error("Informe seu nome completo e WhatsApp válido.");
      return;
    }

    const scheduledIso = selectedSlot.includes("T")
      ? selectedSlot
      : `${selectedDate}T${selectedSlot}:00.000Z`;

    bookNow({
      data: {
        service_id: serviceId,
        guest_name: guestName.trim(),
        guest_phone: guestPhone.trim(),
        scheduled_at: scheduledIso,
        notes: notes.trim() || undefined,
        pass_id: selectedPassId || undefined,
        resource_id: selectedResourceId || undefined,
      },
    });
  };

  return (
    <BookingDrawerSheet
      isOpen={open}
      onOpenChange={handleOpenChange}
      service={service}
      selectedDate={selectedDate}
      setSelectedDate={setSelectedDate}
      nextDays={nextDays}
      resources={resources}
      selectedResourceId={selectedResourceId}
      setSelectedResourceId={setSelectedResourceId}
      slots={rawSlots}
      isLoadingSlots={isLoadingSlots}
      selectedSlot={selectedSlot}
      setSelectedSlot={setSelectedSlot}
      activePasses={Array.isArray(passesData) ? passesData : []}
      selectedPassId={selectedPassId}
      setSelectedPassId={setSelectedPassId}
      guestName={guestName}
      setGuestName={setGuestName}
      guestPhone={guestPhone}
      setGuestPhone={setGuestPhone}
      notes={notes}
      setNotes={setNotes}
      isSuccess={isSuccess}
      onSubmit={handleSubmit}
      isPending={isPending}
    />
  );
}
