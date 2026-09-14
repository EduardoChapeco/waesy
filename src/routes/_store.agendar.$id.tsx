import { createFileRoute, Link } from "@tanstack/react-router";
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
      return {} as any;
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

  return (
    <div className="w-full max-w-6xl mx-auto px-1 sm:px-2 py-1 sm:py-3 space-y-6 pb-28 lg:pb-12">
      {/* ── Breadcrumb / Voltar ── */}
      <div className="flex items-center justify-between">
        <Link
          to="/agendar"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft size={16} weight="bold" className="group-hover:-translate-x-0.5 transition-transform" />
          <span>Voltar para Serviços & Agendamentos</span>
        </Link>
        <ContentActionsMenu
          entityType="product"
          entityId={service.id}
          isOwner={false}
          canonicalUrl={`/agendar/${service.id}`}
          title={service.title}
          description={service.description || ""}
          mediaUrl={service.image_url}
        />
      </div>

      {/* ── Layout Split BigTech (2 Colunas no Desktop) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ======================================================== */}
        {/* COLUNA PRINCIPAL: Mídia, Título, Detalhes, Especificações (7 Colunas) */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 space-y-7">
          {/* Banner / Foto Imersiva */}
          <div className="aspect-[16/10] sm:aspect-[16/9] w-full rounded-3xl overflow-hidden bg-muted relative shadow-xs border border-border/60">
            {service.image_url ? (
              <img
                src={service.image_url}
                alt={service.title}
                className="size-full object-cover"
              />
            ) : (
              <div className="size-full flex items-center justify-center bg-muted/60 text-muted-foreground">
                <Storefront size={48} />
              </div>
            )}
            <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
              <Badge className="bg-background/95 text-foreground backdrop-blur-md text-xs font-bold px-3 py-1 rounded-xl shadow-xs border border-border/60">
                {categoryLabel}
              </Badge>
              {service.duration_minutes && (
                <Badge variant="secondary" className="backdrop-blur-md text-xs font-mono font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-xs">
                  <Clock size={13} weight="bold" />
                  <span>{service.duration_minutes} min</span>
                </Badge>
              )}
            </div>
            <div className="absolute top-4 right-4">
              <Badge className="bg-emerald-500/90 text-white backdrop-blur-md text-[11px] font-bold px-3 py-1 rounded-xl shadow-xs flex items-center gap-1">
                <Sparkle size={12} weight="fill" />
                <span>Vagas Hoje</span>
              </Badge>
            </div>
          </div>

          {/* Badges Rápidos de Garantia */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/40 border border-border/40 text-[11px] font-semibold text-muted-foreground">
              <ShieldCheck size={14} weight="bold" className="text-emerald-500" />
              Profissional Certificado
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/40 border border-border/40 text-[11px] font-semibold text-muted-foreground">
              <Sparkle size={14} weight="bold" className="text-amber-500" />
              Biossegurança 100%
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-muted/40 border border-border/40 text-[11px] font-semibold text-muted-foreground">
              <CalendarDots size={14} weight="bold" className="text-primary" />
              Reagendamento Grátis
            </span>
          </div>

          {/* Título Principal */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-snug">
              {service.title}
            </h1>
          </div>

          {/* ── DETALHES E ESPECIFICAÇÕES LOGO APÓS O TÍTULO (Exigência do Usuário) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <SlidersHorizontal size={14} weight="bold" />
                <span>Especificações do Procedimento</span>
              </h2>
              <span className="text-[11px] text-muted-foreground font-mono">Atendimento Individual</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-card border border-border/60 flex flex-col justify-between gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock size={16} className="text-primary" />
                  <span className="text-[11px] font-semibold">Duração da Sessão</span>
                </div>
                <span className="text-xs font-bold text-foreground mt-0.5">
                  {service.duration_minutes || 60} minutos dedicados
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-card border border-border/60 flex flex-col justify-between gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User size={16} className="text-primary" />
                  <span className="text-[11px] font-semibold">Público Alvo</span>
                </div>
                <span className="text-xs font-bold text-foreground mt-0.5">
                  {targetGenderLabel}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-card border border-border/60 flex flex-col justify-between gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin size={16} className="text-primary" />
                  <span className="text-[11px] font-semibold">Modalidade</span>
                </div>
                <span className="text-xs font-bold text-foreground mt-0.5">
                  No Estabelecimento
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-card border border-border/60 flex flex-col justify-between gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <span className="text-[11px] font-semibold">Biossegurança</span>
                </div>
                <span className="text-xs font-bold text-foreground mt-0.5">
                  Materiais Esterilizados
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-card border border-border/60 flex flex-col justify-between gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard size={16} className="text-primary" />
                  <span className="text-[11px] font-semibold">Pagamento</span>
                </div>
                <span className="text-xs font-bold text-foreground mt-0.5">
                  Pix, Cartão ou no Local
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-card border border-border/60 flex flex-col justify-between gap-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDots size={16} className="text-primary" />
                  <span className="text-[11px] font-semibold">Flexibilidade</span>
                </div>
                <span className="text-xs font-bold text-foreground mt-0.5">
                  Reagendamento sem Taxa
                </span>
              </div>
            </div>
          </div>

          {/* ── Descrição Completa e Benefícios ── */}
          {service.description && (
            <div className="p-6 rounded-3xl bg-card border border-border/60 space-y-3 shadow-xs">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkle size={18} className="text-primary" weight="fill" />
                <span>Sobre este Atendimento</span>
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {service.description}
              </p>
            </div>
          )}

          {/* ── O que está incluso nesta sessão (Checklist) ── */}
          <div className="p-6 rounded-3xl bg-card border border-border/60 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle size={18} weight="fill" className="text-emerald-500" />
              <span>O que está incluso no seu atendimento</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-foreground/90">
              <div className="flex items-start gap-2.5">
                <Check size={16} weight="bold" className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Avaliação prévia e diagnóstico personalizado de necessidades</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check size={16} weight="bold" className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Procedimento completo realizado por profissional capacitado</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check size={16} weight="bold" className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Utilização de cosméticos e insumos homologados de linha profissional</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check size={16} weight="bold" className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Higienização prévia e protocolo rigoroso de assepsia</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check size={16} weight="bold" className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Finalização técnica com produto hidratante ou finalizador</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check size={16} weight="bold" className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Orientações de cuidados e manutenção pós-atendimento</span>
              </div>
            </div>
          </div>

          {/* ── Etapas da Experiência (Passo a Passo) ── */}
          <div className="p-6 rounded-3xl bg-card border border-border/60 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock size={18} className="text-primary" weight="bold" />
              <span>Como funciona o seu agendamento</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-1.5">
                <div className="size-7 rounded-xl bg-foreground text-background font-mono font-bold text-xs flex items-center justify-center">
                  1
                </div>
                <h3 className="font-bold text-xs text-foreground">Escolha a Data & Hora</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Consulte os horários disponíveis em tempo real e reserve sem burocracia.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-1.5">
                <div className="size-7 rounded-xl bg-foreground text-background font-mono font-bold text-xs flex items-center justify-center">
                  2
                </div>
                <h3 className="font-bold text-xs text-foreground">Confirmação Digital</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Receba os dados no WhatsApp com lembretes inteligentes antes do horário.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 space-y-1.5">
                <div className="size-7 rounded-xl bg-foreground text-background font-mono font-bold text-xs flex items-center justify-center">
                  3
                </div>
                <h3 className="font-bold text-xs text-foreground">Atendimento Pontual</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Chegue ao estabelecimento e seja atendido sem filas pelo profissional.
                </p>
              </div>
            </div>
          </div>

          {/* ── Pacotes de Sessões Disponíveis ── */}
          {service.packages && service.packages.length > 0 && (
            <div className="p-6 rounded-3xl bg-card border border-border/60 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Ticket size={18} className="text-primary" weight="bold" />
                  <span>Pacotes & Planos de Sessões com Desconto</span>
                </h2>
                <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                  Economia garantida
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {service.packages.map((pkg: any) => (
                  <div
                    key={pkg.id}
                    className="p-4 rounded-2xl border border-border/60 bg-muted/10 flex flex-col justify-between gap-3 hover:border-primary/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-xs text-foreground">{pkg.title}</h3>
                        <Badge className="text-[10px] font-mono bg-primary/10 text-primary border-primary/20">
                          {pkg.credits_count} sessões
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Validade de {pkg.validity_days} dias para uso individual ou transferível.
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Valor do Pacote</span>
                        <span className="font-mono font-bold text-sm text-foreground">
                          {formatMoney(pkg.price_cents)}
                        </span>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl font-bold">
                        Adquirir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Políticas da Casa & Regras de Atendimento ── */}
          <div className="p-5 rounded-3xl bg-muted/20 border border-border/50 space-y-2 text-xs text-muted-foreground">
            <h3 className="font-bold text-foreground flex items-center gap-1.5 text-xs">
              <WarningCircle size={15} className="text-amber-500" />
              <span>Políticas de Pontualidade & Cancelamento</span>
            </h3>
            <p className="leading-relaxed">
              Tolerância de atraso de até 10 minutos para garantir o tempo de atendimento adequado. 
              Cancelamentos ou reagendamentos podem ser realizados sem custos pelo app com até 2 horas de antecedência.
            </p>
          </div>

          {/* ── Outros Serviços Relacionados (Cross-selling) ── */}
          {service.relatedServices && service.relatedServices.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground">Outros Serviços Recomendados</h2>
                <Link to="/agendar" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                  <span>Ver todos</span>
                  <ArrowRight size={13} weight="bold" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {service.relatedServices.map((rel: any) => (
                  <Link
                    key={rel.id}
                    to="/agendar/$id"
                    params={{ id: rel.id }}
                    className="p-3.5 rounded-2xl border border-border/60 bg-card hover:border-foreground/30 transition-all flex items-center gap-3.5 group"
                  >
                    <div className="size-14 rounded-xl bg-muted overflow-hidden shrink-0 border border-border/40">
                      {rel.image_url ? (
                        <img src={rel.image_url} alt={rel.title} className="size-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="size-full flex items-center justify-center text-muted-foreground">
                          <Storefront size={20} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {rel.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {rel.duration_minutes || 60} min • {formatMoney(rel.price_cents)}
                      </p>
                    </div>
                    <CaretRight size={14} className="text-muted-foreground group-hover:text-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* COLUNA LATERAL STICKY: Preços, Pagamento, Loja/Prestador (5 Colunas) */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
          {/* ── CARD 1: Bloco Comercial (Preço, Pagamento, CTA) ── */}
          <div className="p-6 rounded-3xl bg-card border border-border/60 shadow-xs space-y-5">
            <div>
              <span className="text-xs font-semibold text-muted-foreground block">Valor do Atendimento</span>
              <div className="text-3xl sm:text-4xl font-black font-mono text-foreground mt-1">
                {formatMoney(service.price_cents)}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Clock size={14} className="text-primary" />
                <span>{service.duration_minutes || 60} minutos de dedicação exclusiva</span>
              </p>
            </div>

            {/* Formas de Pagamento Aceitas */}
            <div className="pt-4 border-t border-border/50 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Formas de Pagamento Aceitas
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-foreground/90">
                  <QrCode size={16} className="text-emerald-600" />
                  <span><strong>Pix Instantâneo</strong> (Aprovação imediata)</span>
                </div>
                <div className="flex items-center gap-2 text-foreground/90">
                  <CreditCard size={16} className="text-primary" />
                  <span><strong>Cartão de Crédito</strong> (em até 3x sem juros)</span>
                </div>
                <div className="flex items-center gap-2 text-foreground/90">
                  <Money size={16} className="text-amber-600" />
                  <span><strong>No Estabelecimento</strong> (Dinheiro ou Cartão)</span>
                </div>
              </div>
            </div>

            {/* Ação Primária de Agendamento */}
            <div className="pt-4 border-t border-border/50 space-y-3">
              <Button
                size="lg"
                onClick={handleStartBooking}
                className="w-full h-12 rounded-2xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
              >
                <CalendarDots size={18} weight="bold" className="mr-2" />
                Agendar Horário Agora
              </Button>

              {storePhone && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full h-10 rounded-xl text-xs font-bold border-border/60 hover:bg-muted"
                >
                  <a
                    href={`https://wa.me/55${storePhone.replace(/\D/g, "")}?text=Olá,%20gostaria%20de%20tirar%20dúvidas%20sobre%20o%20serviço%20${encodeURIComponent(service.title)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <WhatsappLogo size={16} weight="bold" className="mr-1.5 text-emerald-500" />
                    Tirar Dúvidas no WhatsApp
                  </a>
                </Button>
              )}

              <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  Garantia Waesy
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <CheckCircle size={14} className="text-primary" />
                  Sem taxas extras
                </span>
              </div>
            </div>
          </div>

          {/* ── CARD 2: Informações da Loja / Prestador (EMBAIXO DE PREÇOS/PAGAMENTOS, conforme exigido) ── */}
          {store && (
            <div className="p-6 rounded-3xl bg-card border border-border/60 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Prestador Responsável
                </span>
                <Badge variant="secondary" className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                  Verificado
                </Badge>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="size-13 rounded-2xl bg-muted overflow-hidden shrink-0 border border-border/50 shadow-2xs">
                  {store.avatar_url || store.logo_url ? (
                    <img
                      src={store.avatar_url || store.logo_url}
                      alt={store.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-muted-foreground font-black text-lg">
                      {store.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-foreground truncate">{store.name}</h3>
                    <ShieldCheck size={16} weight="fill" className="text-emerald-500 shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {storeCity}
                  </p>
                  <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold mt-1">
                    <Star size={13} weight="fill" />
                    <span>4.9</span>
                    <span className="text-muted-foreground font-normal">(120+ atendimentos)</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border/40 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MapPin size={15} className="text-primary shrink-0 mt-0.5" />
                  <span className="leading-snug text-foreground/90">{storeAddress}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-primary shrink-0" />
                  <span>Segunda a Sábado • 08:00 às 19:00</span>
                </div>
              </div>

              <div className="pt-2">
                <Button asChild variant="outline" className="w-full h-10 rounded-xl text-xs font-bold border-border/60">
                  <Link to="/c/$storeSlug" params={{ storeSlug: store.slug || store.id }}>
                    <Storefront size={15} className="mr-1.5" />
                    Ver Perfil Completo da Loja
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Barra Flutuante Mobile (Thumb Zone) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3.5 bg-background/95 backdrop-blur-md border-t border-border/60 z-30 flex items-center justify-between gap-3 shadow-lg">
        <div>
          <span className="text-[10px] text-muted-foreground font-semibold block">Total</span>
          <span className="text-lg font-black font-mono text-foreground">
            {formatMoney(service.price_cents)}
          </span>
        </div>
        <Button
          onClick={handleStartBooking}
          className="h-11 px-6 rounded-xl font-bold text-xs bg-primary text-primary-foreground cursor-pointer shrink-0 shadow-sm"
        >
          <CalendarDots size={16} weight="bold" className="mr-1.5" />
          Agendar Horário
        </Button>
      </div>

      {/* ── SHEET LATERAL DE AGENDAMENTO (Desktop e Mobile Drawer) ── */}
      <Sheet open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col justify-between bg-card">
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            <SheetHeader className="text-left space-y-1">
              <SheetTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <CalendarDots size={20} className="text-primary" />
                <span>Reservar Horário</span>
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                {service.title} • {formatMoney(service.price_cents)} ({service.duration_minutes || 60} min)
              </SheetDescription>
            </SheetHeader>

            {isSuccess ? (
              <div className="py-12 text-center space-y-4">
                <div className="size-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle size={36} weight="bold" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Agendamento Confirmado!</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Seu horário para <strong>{service.title}</strong> foi agendado com sucesso para o dia{" "}
                  <strong>{selectedDate}</strong> às <strong>{selectedSlot ? new Date(selectedSlot).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "horário comercial"}</strong>.
                </p>
                <div className="pt-4 flex flex-col gap-2">
                  <Button asChild className="rounded-xl font-bold text-xs h-10">
                    <Link to="/conta/agendamentos">Ver Meus Agendamentos</Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsBookingOpen(false)}
                    className="rounded-xl font-bold text-xs h-10"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            ) : (
              <form id="booking-form" onSubmit={handleSubmitBooking} className="space-y-5">
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
                              ? "bg-foreground text-background border-foreground font-bold shadow-sm"
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
                                ? "bg-primary text-primary-foreground border-primary"
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
                <div className="space-y-3 pt-2">
                  <Label className="text-xs font-bold text-foreground">3. Seus Dados de Contato</Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Seu nome completo"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="pl-9 h-10 rounded-xl text-xs"
                        required
                      />
                    </div>
                    <div className="relative">
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="WhatsApp (ex: 49 99999-9999)"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        className="pl-9 h-10 rounded-xl text-xs"
                        required
                      />
                    </div>
                    <Textarea
                      placeholder="Observações ou preferências para o profissional (opcional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="rounded-xl text-xs min-h-16 resize-none"
                    />
                  </div>
                </div>
              </form>
            )}
          </div>

          {!isSuccess && (
            <div className="p-4 border-t border-border/60 bg-background flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold block">Total</span>
                <span className="text-base font-black font-mono text-foreground">
                  {selectedPassId ? "1 Crédito (Pacote)" : formatMoney(service.price_cents)}
                </span>
              </div>
              <Button
                type="submit"
                form="booking-form"
                disabled={appointmentMutation.isPending}
                className="h-11 px-6 rounded-xl font-bold text-xs bg-primary text-primary-foreground cursor-pointer shadow-sm"
              >
                {appointmentMutation.isPending ? (
                  <CircleNotch size={16} className="animate-spin" />
                ) : (
                  "Confirmar Agendamento"
                )}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
