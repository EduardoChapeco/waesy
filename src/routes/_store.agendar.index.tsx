import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Scissors,
  Clock,
  CalendarDots,
  CheckCircle,
  CircleNotch,
  Sparkle,
  ShieldCheck,
  Phone,
  User,
  CaretRight,
  Ticket,
  Heartbeat,
  PawPrint,
  Barbell,
  Storefront,
} from "@phosphor-icons/react";
import { Tag } from "lucide-react";
import {
  listBookingServices,
  createAppointment,
  listMyPassesForService,
  getAvailableSlots,
} from "@/services/booking.functions";
import { listActiveBanners } from "@/services/banner.functions";
import { listHotpages } from "@/services/hotpage.functions";
import { BannerHeroCarousel } from "@/components/commerce/banner-hero-carousel";
import { HotpagesRail } from "@/components/commerce/hotpages-rail";
import { HorizontalRail } from "@/components/commerce/horizontal-rail";
import {
  DiscoveryControlBar,
  type ViewModeType,
  type FilterChipOption,
} from "@/components/commerce/discovery-control-bar";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_store/agendar/")({
  head: () => ({
    meta: [
      { title: "Serviços & Agendamentos | Waesy" },
      {
        name: "description",
        content:
          "Agende horários em barbearias, salões, clínicas, estética, pet shops e bem-estar na sua cidade.",
      },
    ],
  }),
  loader: async () => {
    try {
      const [banners, hotpages] = await Promise.all([
        listActiveBanners({ data: { placement: "agenda" } }).catch(() => []),
        listHotpages({ data: { module: "agenda" } }).catch(() => []),
      ]);
      return { banners, hotpages };
    } catch (err) {
      console.error("[loader:_store.agendar.index] Unhandled error:", err);
      return { banners: [], hotpages: [] };
    }
  },
  component: BookingIndexPage,
});

const BOOKING_CATEGORIES: FilterChipOption[] = [
  { id: "todos", label: "Tudo", icon: Tag },
  { id: "barbearia", label: "Barbearias", icon: Scissors },
  { id: "salao_cabelo", label: "Salão & Cabelo", icon: Scissors },
  { id: "unhas_manicure", label: "Unhas & Manicure", icon: Sparkle },
  { id: "estetica_massagem", label: "Estética & Massagem", icon: Sparkle },
  { id: "saude_fisioterapia", label: "Saúde & Fisioterapia", icon: Heartbeat },
  { id: "pet_shop", label: "Pet Shop & Banho", icon: PawPrint },
  { id: "personal_fitness", label: "Personal & Aulas", icon: Barbell },
];

const CATEGORY_NAMES: Record<string, string> = {
  barbearia: "Barbearias & Cuidados Masculinos",
  salao_cabelo: "Salão de Beleza & Cabelos",
  unhas_manicure: "Unhas, Manicure & Spa dos Pés",
  estetica_massagem: "Estética Avançada, Spa & Massagens",
  saude_fisioterapia: "Saúde, Fisioterapia & Bem-Estar",
  pet_shop: "Pet Shop, Banho & Tosa",
  personal_fitness: "Personal Trainer & Avaliação Física",
};

function BookingIndexPage() {
  const { banners, hotpages } = ((Route.useLoaderData?.() as any) || {});
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [viewMode, setViewMode] = useState<ViewModeType>("grid");
  const [search, setSearch] = useState("");

  // Estado do Sheet lateral de agendamento rápido
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedPassId, setSelectedPassId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Consulta de serviços reais no Supabase via BFF
  const { data: servicesResult, isLoading } = useQuery({
    queryKey: ["booking-services", selectedCategory, search],
    queryFn: () =>
      listBookingServices({
        data: {
          category: selectedCategory === "todos" ? undefined : selectedCategory,
          search: search || undefined,
        },
      }),
  });

  const services = servicesResult?.data || [];

  // Horários disponíveis para o serviço selecionado no Sheet
  const { data: slotsResult, isLoading: isLoadingSlots } = useQuery({
    queryKey: ["service-slots", selectedService?.id, selectedDate],
    queryFn: () =>
      getAvailableSlots({
        data: { service_id: selectedService.id, date: selectedDate },
      }),
    enabled: !!selectedService?.id && !!selectedDate,
  });

  const slots = slotsResult?.data || [];

  // Passes ativos para o serviço selecionado
  const { data: activePasses } = useQuery({
    queryKey: ["my-service-passes", selectedService?.id],
    queryFn: () => listMyPassesForService({ data: { service_id: selectedService.id } }),
    enabled: !!selectedService?.id,
  });

  // Mutação de Agendamento Real
  const appointmentMutation = useMutation({
    mutationFn: () => {
      const scheduledIso = selectedSlot
        ? selectedSlot
        : new Date(selectedDate + "T14:00:00.000Z").toISOString();

      return createAppointment({
        data: {
          service_id: selectedService.id,
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
          ? "Agendamento confirmado com 1 crédito do seu pacote!"
          : "Horário reservado com sucesso!"
      );
      queryClient.invalidateQueries({ queryKey: ["my-service-passes"] });
      queryClient.invalidateQueries({ queryKey: ["service-slots"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao agendar horário.");
    },
  });

  const handleOpenBookingSheet = (service: any, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedService(service);
    setSelectedSlot(null);
    setSelectedPassId(null);
    setIsSuccess(false);
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestPhone) {
      toast.error("Por favor, preencha seu nome e telefone para confirmação.");
      return;
    }
    if (!selectedSlot && slots.length > 0) {
      toast.error("Por favor, selecione um horário disponível.");
      return;
    }
    appointmentMutation.mutate();
  };

  // Agrupamento por categorias para o Modo Feed
  const servicesByCategory = useMemo(() => {
    const map = new Map<string, any[]>();
    services.forEach((s: any) => {
      const cat = s.category || "geral";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    });

    return Array.from(map.entries()).map(([catKey, items]) => ({
      categoryKey: catKey,
      categoryName: CATEGORY_NAMES[catKey] || catKey.toUpperCase(),
      items,
    }));
  }, [services]);

  // Próximos 7 dias para seleção rápida no Sheet
  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" }).toUpperCase();
    const dayNum = d.getDate();
    return { iso, weekday, dayNum };
  });

  return (
    <div className="w-full space-y-6 pb-20">
      {/* ── Banners Temáticos de Serviços (se configurados) ── */}
      {banners && banners.length > 0 && <BannerHeroCarousel banners={banners} />}
      {hotpages && hotpages.length > 0 && <HotpagesRail hotpages={hotpages} cleanMode={true} />}

      {/* ── BARRA DE CONTROLE CANÔNICA (DiscoveryControlBar) ── */}
      <DiscoveryControlBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar serviço, barbearia, salão, massagem ou profissional..."
        categories={BOOKING_CATEGORIES}
        activeCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        allowedViewModes={["feed", "grid", "list"]}
      />

      {/* ── ESTADOS DE CARREGAMENTO E VAZIO ── */}
      {isLoading ? (
        <div className="flex justify-center py-24">
          <CircleNotch size={32} className="animate-spin text-muted-foreground" />
        </div>
      ) : services.length === 0 ? (
        <div className="py-24 text-center space-y-3 bg-card rounded-2xl border border-border/40 p-8">
          <Scissors size={40} className="text-muted-foreground/40 mx-auto" />
          <h2 className="text-base font-bold text-foreground">
            Nenhum serviço disponível no momento
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Tente selecionar outra categoria ou buscar por outro termo.
          </p>
        </div>
      ) : (
        <>
          {/* ── MODO 1: FEED DE CARROSSÉIS PADRONIZADOS ── */}
          {viewMode === "feed" && (
            <div className="space-y-10">
              {servicesByCategory.map(({ categoryKey, categoryName, items }) => (
                <HorizontalRail
                  key={categoryKey}
                  title={categoryName}
                  hideHeader={true}
                  actionLabel="Ver todos"
                  onAction={() => {
                    setSelectedCategory(categoryKey);
                    setViewMode("grid");
                  }}
                >
                  {items.map((service: any) => (
                    <Link
                      key={service.id}
                      to="/agendar/$id"
                      params={{ id: service.id }}
                      className="min-w-[280px] sm:min-w-[310px] max-w-[330px] rounded-2xl bg-card border border-border/60 overflow-hidden hover:border-foreground/30 transition-all flex flex-col justify-between shrink-0 group select-none block"
                    >
                      <div>
                        {/* Imagem do Serviço */}
                        <div className="aspect-[16/10] relative overflow-hidden bg-muted">
                          {service.image_url ? (
                            <img
                              src={service.image_url}
                              alt={service.title}
                              className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center text-muted-foreground/40">
                              <Storefront size={32} />
                            </div>
                          )}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                            <span className="bg-background/90 backdrop-blur-md text-foreground text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-border/40">
                              {service.category || "Geral"}
                            </span>
                            {service.duration_minutes && (
                              <span className="bg-background/90 backdrop-blur-md text-foreground text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-border/40 flex items-center gap-1">
                                <Clock size={11} />
                                <span>{service.duration_minutes}m</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Informações */}
                        <div className="p-4 space-y-2 text-xs">
                          {service.stores?.name && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Storefront size={13} className="text-primary" />
                              <span className="font-semibold truncate">{service.stores.name}</span>
                            </div>
                          )}
                          <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {service.title}
                          </h3>
                          {service.description && (
                            <p className="text-muted-foreground line-clamp-2 leading-relaxed text-[11px]">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Preço e Botão */}
                      <div className="p-4 pt-2 border-t border-border/40 flex items-center justify-between">
                        <span className="font-mono font-black text-base text-foreground">
                          {formatMoney(service.price_cents)}
                        </span>
                        <Button
                          size="sm"
                          onClick={(e) => handleOpenBookingSheet(service, e)}
                          className="h-8 px-3 rounded-xl font-bold text-xs bg-primary text-primary-foreground cursor-pointer shadow-sm hover:opacity-90"
                        >
                          Agendar
                        </Button>
                      </div>
                    </Link>
                  ))}
                </HorizontalRail>
              ))}

              {/* Gôndola Geral de Agendamentos */}
              <div className="space-y-4 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <CalendarDots size={18} weight="bold" className="text-primary" />
                    <span>Todos os Serviços Disponíveis</span>
                  </h2>
                  <span className="text-xs text-muted-foreground font-mono font-bold">
                    {services.length} opções
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {services.map((service: any) => (
                    <Link
                      key={service.id}
                      to="/agendar/$id"
                      params={{ id: service.id }}
                      className="rounded-2xl bg-card border border-border/60 overflow-hidden hover:border-foreground/30 transition-all flex flex-col justify-between group block"
                    >
                      <div>
                        <div className="aspect-[16/10] relative overflow-hidden bg-muted">
                          {service.image_url ? (
                            <img
                              src={service.image_url}
                              alt={service.title}
                              className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center text-muted-foreground/40">
                              <Storefront size={32} />
                            </div>
                          )}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                            <span className="bg-background/90 backdrop-blur-md text-foreground text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-border/40">
                              {service.category || "Geral"}
                            </span>
                            {service.duration_minutes && (
                              <span className="bg-background/90 backdrop-blur-md text-foreground text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-border/40 flex items-center gap-1">
                                <Clock size={11} />
                                <span>{service.duration_minutes}m</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-4 space-y-2">
                          {service.stores?.name && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Storefront size={13} className="text-primary" />
                              <span className="font-semibold truncate">{service.stores.name}</span>
                            </div>
                          )}
                          <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {service.title}
                          </h3>
                          {service.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="p-4 pt-2 border-t border-border/40 flex items-center justify-between">
                        <span className="font-mono font-black text-base text-foreground">
                          {formatMoney(service.price_cents)}
                        </span>
                        <Button
                          size="sm"
                          onClick={(e) => handleOpenBookingSheet(service, e)}
                          className="h-8 px-3.5 rounded-xl font-bold text-xs bg-primary text-primary-foreground cursor-pointer shadow-sm hover:opacity-90"
                        >
                          Agendar
                        </Button>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── MODO 2: GRADE EXPANDIDA (Grid de 3 Colunas) ── */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map((service: any) => (
                <Link
                  key={service.id}
                  to="/agendar/$id"
                  params={{ id: service.id }}
                  className="rounded-2xl bg-card border border-border/60 overflow-hidden hover:border-foreground/30 transition-all flex flex-col justify-between group block shadow-xs"
                >
                  <div>
                    {/* Imagem */}
                    <div className="aspect-[16/10] relative overflow-hidden bg-muted">
                      {service.image_url ? (
                        <img
                          src={service.image_url}
                          alt={service.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-muted-foreground/40">
                          <Storefront size={32} />
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="bg-background/90 backdrop-blur-md text-foreground text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-border/40">
                          {service.category || "Geral"}
                        </span>
                        {service.duration_minutes && (
                          <span className="bg-background/90 backdrop-blur-md text-foreground text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border border-border/40 flex items-center gap-1">
                            <Clock size={11} />
                            <span>{service.duration_minutes}m</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="p-4 space-y-2">
                      {service.stores?.name && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Storefront size={13} className="text-primary" />
                          <span className="font-semibold truncate">{service.stores.name}</span>
                        </div>
                      )}
                      <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                        {service.title}
                      </h3>
                      {service.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {service.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rodapé */}
                  <div className="p-4 pt-2 border-t border-border/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">A partir de</span>
                      <span className="font-mono font-black text-lg text-foreground">
                        {formatMoney(service.price_cents)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => handleOpenBookingSheet(service, e)}
                      className="h-9 px-4 rounded-xl font-bold text-xs bg-primary text-primary-foreground cursor-pointer shadow-sm hover:opacity-90"
                    >
                      Agendar Horário
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* ── MODO 3: LISTA COMPACTA (Largura Máxima) ── */}
          {viewMode === "list" && (
            <div className="flex flex-col space-y-3 w-full">
              {services.map((service: any) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/60 hover:border-foreground/30 transition-all gap-4 w-full group shadow-xs"
                >
                  <Link
                    to="/agendar/$id"
                    params={{ id: service.id }}
                    className="flex items-center gap-4 min-w-0 flex-1 block"
                  >
                    <div className="size-20 sm:size-24 rounded-xl overflow-hidden bg-muted shrink-0 relative border border-border/40">
                      {service.image_url ? (
                        <img
                          src={service.image_url}
                          alt={service.title}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-muted-foreground/40">
                          <Storefront size={24} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[9px] font-mono font-bold uppercase px-1.5 py-0 rounded-md">
                          {service.category || "Geral"}
                        </Badge>
                        {service.duration_minutes && (
                          <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                            <Clock size={12} />
                            <span>{service.duration_minutes} min</span>
                          </span>
                        )}
                        {service.stores?.name && (
                          <span className="text-[11px] text-muted-foreground font-medium truncate">
                            • {service.stores.name}
                          </span>
                        )}
                      </div>

                      <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                        {service.title}
                      </h3>

                      {service.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed hidden sm:block">
                          {service.description}
                        </p>
                      )}
                    </div>
                  </Link>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4 shrink-0">
                    <span className="font-mono font-black text-base sm:text-lg text-foreground">
                      {formatMoney(service.price_cents)}
                    </span>
                    <Button
                      size="sm"
                      onClick={(e) => handleOpenBookingSheet(service, e)}
                      className="h-9 px-4 rounded-xl font-bold text-xs bg-primary text-primary-foreground shrink-0 cursor-pointer hover:opacity-90 shadow-sm"
                    >
                      Agendar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── SHEET LATERAL DE AGENDAMENTO RÁPIDO (Desktop e Mobile Drawer) ── */}
      <Sheet open={!!selectedService} onOpenChange={(open) => !open && setSelectedService(null)}>
        <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col justify-between bg-card">
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            <SheetHeader className="text-left space-y-1">
              <SheetTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <CalendarDots size={20} className="text-primary" />
                <span>Reservar Horário</span>
              </SheetTitle>
              {selectedService && (
                <SheetDescription className="text-xs text-muted-foreground">
                  {selectedService.title} • {formatMoney(selectedService.price_cents)} ({selectedService.duration_minutes || 60} min)
                </SheetDescription>
              )}
            </SheetHeader>

            {isSuccess ? (
              <div className="py-12 text-center space-y-4">
                <div className="size-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle size={36} weight="bold" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Agendamento Confirmado!</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Seu horário para <strong>{selectedService?.title}</strong> foi agendado para dia{" "}
                  <strong>{selectedDate}</strong> às <strong>{selectedSlot ? new Date(selectedSlot).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "horário comercial"}</strong>.
                </p>
                <div className="pt-4 flex flex-col gap-2">
                  <Button asChild className="rounded-xl font-bold text-xs h-10">
                    <Link to="/conta/agendamentos">Ver Meus Agendamentos</Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedService(null)}
                    className="rounded-xl font-bold text-xs h-10"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            ) : (
              selectedService && (
                <form id="quick-booking-form" onSubmit={handleSubmitBooking} className="space-y-5">
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
                        {slots.length} horários
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

                  {/* 3. Pacotes de Sessões Ativos */}
                  {activePasses && activePasses.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
                      <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <Ticket size={15} weight="bold" />
                        Usar Crédito de Pacote
                      </span>
                      {activePasses.map((pass: any) => (
                        <label
                          key={pass.id}
                          className="flex items-center gap-2 text-xs text-foreground cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="service_pass_quick"
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

                  {/* 4. Dados Pessoais */}
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
              )
            )}
          </div>

          {!isSuccess && selectedService && (
            <div className="p-4 border-t border-border/60 bg-background flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-muted-foreground font-semibold block">Total</span>
                <span className="text-base font-black font-mono text-foreground">
                  {selectedPassId ? "1 Crédito (Pacote)" : formatMoney(selectedService.price_cents)}
                </span>
              </div>
              <Button
                type="submit"
                form="quick-booking-form"
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
