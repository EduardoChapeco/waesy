import { useIsDesktop } from "@/hooks/use-mobile";
import { BookingDetailMobile } from "@/components/booking/booking-detail-mobile";
import { BookingDetailDesktop } from "@/components/booking/booking-detail-desktop";
import { BookingDrawerSheet } from "@/components/booking/booking-drawer-sheet";
﻿import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Clock,
  CalendarDots,
  ArrowLeft,
  Storefront,
  CheckCircle,
  WarningCircle,
  Sparkle,
  ShieldCheck,
  Phone,
  User,
  CaretRight,
  CircleNotch,
  Ticket,
  CreditCard,
  QrCode,
  Money,
  MapPin,
  WhatsappLogo,
  Star,
  Check,
  ArrowRight,
  ChatCircleDots,
  ArrowSquareOut,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  getBookingServiceById,
  getAvailableSlots,
  createAppointment,
  listMyPassesForService,
} from "@/services/booking.functions";
import { ContentActionsMenu } from "@/components/common/content-actions-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/agendar/$id")({
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.title
          ? `${loaderData.title} | Agendamentos Waesy`
          : "Serviço | Waesy",
      },
      {
        name: "description",
        content:
          loaderData?.description?.slice(0, 160) ||
          "Agende horários online com profissionais qualificados.",
      },
    ],
  }),
  loader: async ({ params }: { params: { id: string } }) => {
    try {
      return await getBookingServiceById({ data: { id: params.id } });
    } catch (err) {
      console.error("[loader:_store.agendar.$id] Unhandled loader error:", err);
      return null as any;
    }
  },
  component: ServiceDetailPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  barbearia: "Barbearia",
  salao_cabelo: "Salão & Cabelo",
  unhas_manicure: "Unhas & Manicure",
  estetica_massagem: "Estética & Massagem",
  saude_fisioterapia: "Saúde & Fisioterapia",
  pet_shop: "Pet Shop & Banho",
  personal_fitness: "Personal & Aulas",
};

function ServiceDetailPage() {
  const service = Route.useLoaderData();
  const queryClient = useQueryClient();

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // 1. Horários disponíveis para a data selecionada
  const { data: slotsResult, isLoading: isLoadingSlots } = useQuery({
    queryKey: ["service-slots", service?.id, selectedDate],
    queryFn: () => getAvailableSlots({ data: { service_id: service!.id, date: selectedDate } }),
    enabled: Boolean(isBookingOpen && service?.id && selectedDate),
  });

  const slots = slotsResult?.data || [];

  // 2. Passes de sessões do usuário
  const { data: activePasses } = useQuery({
    queryKey: ["my-service-passes", service?.id],
    queryFn: () => listMyPassesForService({ data: { service_id: service!.id } }),
    enabled: Boolean(isBookingOpen && service?.id),
  });

  const appointmentMutation = useMutation({
    mutationFn: () => {
      const scheduledIso = selectedSlot
        ? selectedSlot
        : new Date(selectedDate + "T14:00:00.000Z").toISOString();

      return createAppointment({
        data: {
          service_id: service?.id || "",
          guest_name: guestName,
          guest_phone: guestPhone,
          scheduled_at: scheduledIso,
          notes: notes || undefined,
          pass_id: selectedPassId || undefined,
        },
      });
    },
    onSuccess: () => {
      setIsSuccess(true);
      toast.success(
        selectedPassId
          ? "Agendamento confirmado usando seu pacote de sessões!"
          : "Horário reservado com sucesso!"
      );
      queryClient.invalidateQueries({ queryKey: ["my-service-passes"] });
      if (service?.id) {
        queryClient.invalidateQueries({ queryKey: ["service-slots", service.id, selectedDate] });
      }
    },
    onError: (err: any) => {
      toast.error(err?.message || "Não foi possível confirmar o agendamento.");
    },
  });

  if (!service) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-4">
        <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-2">
          <WarningCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Serviço não encontrado</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          O serviço solicitado não está disponível ou foi arquivado pelo estabelecimento.
        </p>
        <Button asChild className="rounded-xl font-bold" variant="outline">
          <Link to="/agendar">
            <ArrowLeft size={16} weight="bold" className="mr-2" />
            Voltar para Serviços & Agendamentos
          </Link>
        </Button>
      </div>
    );
  }

  const handleStartBooking = () => {
    setIsBookingOpen(true);
    setIsSuccess(false);
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestPhone) {
      toast.error("Preencha seu nome e telefone WhatsApp para confirmação.");
      return;
    }
    if (!selectedSlot && slots.length > 0) {
      toast.error("Selecione um horário disponível para o agendamento.");
      return;
    }
    appointmentMutation.mutate();
  };

  const categoryLabel = CATEGORY_LABELS[service.category] || service.category || "Geral";
  const store = service.stores;
  const storeSettings = (store?.settings as any) || {};
  const storeCity = storeSettings.address?.city || storeSettings.address_city || "São Miguel do Oeste, SC";
  const storeAddress = storeSettings.address?.street
    ? `${storeSettings.address.street}, ${storeSettings.address.number || "s/n"} - ${storeSettings.address.neighborhood || ""}`
    : "Atendimento no estabelecimento parceiro";
  const storePhone = storeSettings.phone || storeSettings.whatsapp || "";

  // Próximos 7 dias para seleção rápida
  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" }).toUpperCase();
    const dayNum = d.getDate();
    return { iso, weekday, dayNum, isToday: i === 0 };
  });

  const targetGenderLabel =
    service.gender_target === "male"
      ? "Público Masculino"
      : service.gender_target === "female"
      ? "Público Feminino"
      : "Unissex (Todos os Públicos)";

  const isDesktop = useIsDesktop(1024);

  return (
    <>
      {isDesktop ? (
        <BookingDetailDesktop
          service={service}
          categoryLabel={categoryLabel}
          targetGenderLabel={targetGenderLabel}
          store={store}
          storeAddress={storeAddress}
          storeCity={storeCity}
          storePhone={storePhone}
          onStartBooking={handleStartBooking}
        />
      ) : (
        <BookingDetailMobile
          service={service}
          categoryLabel={categoryLabel}
          targetGenderLabel={targetGenderLabel}
          store={store}
          storeAddress={storeAddress}
          storeCity={storeCity}
          storePhone={storePhone}
          onStartBooking={handleStartBooking}
        />
      )}

      <BookingDrawerSheet
        isOpen={isBookingOpen}
        onOpenChange={setIsBookingOpen}
        service={service}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        nextDays={nextDays}
        slots={slots}
        isLoadingSlots={isLoadingSlots}
        selectedSlot={selectedSlot}
        setSelectedSlot={setSelectedSlot}
        activePasses={activePasses}
        selectedPassId={selectedPassId}
        setSelectedPassId={setSelectedPassId}
        guestName={guestName}
        setGuestName={setGuestName}
        guestPhone={guestPhone}
        setGuestPhone={setGuestPhone}
        notes={notes}
        setNotes={setNotes}
        isSuccess={isSuccess}
        onSubmit={handleSubmitBooking}
        isPending={appointmentMutation.isPending}
      />
    </>
  );
}
