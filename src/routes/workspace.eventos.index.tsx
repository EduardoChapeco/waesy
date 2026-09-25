import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Plus,
  QrCode,
  ExternalLink,
  MapPin,
  Clock,
  Ticket,
  Users,
  CheckCircle2,
  Trash2,
  Flame,
  Building,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { ImageUpload } from "@/components/ui/image-upload";
import { listAdminEvents, upsertEvent } from "@/services/events.functions";
import { getStoreSettings } from "@/services/store.functions";
import { WorkspaceCanonicalToolbar } from "@/components/workspace/workspace-canonical-toolbar";
import {
  WorkspaceDashboardSheet,
  type MetricCardItem,
} from "@/components/workspace/workspace-dashboard-sheet";
import { NicheOperationalGuard } from "@/components/workspace/niche-operational-guard";
import { CrudActionsMenu } from "@/components/ui/crud-actions-menu";

export const Route = createFileRoute("/workspace/eventos/")({
  head: () => ({ meta: [{ title: "Gestão de Eventos & Produtora | Workspace Waesy" }] }),
  loader: async () => {
    try {
      const [events, store] = await Promise.all([
        listAdminEvents().catch(() => []),
        getStoreSettings().catch(() => null),
      ]);
      return { events: events || [], store };
    } catch {
      return { events: [], store: null };
    }
  },
  component: WorkspaceEventosPage,
});

export default function WorkspaceEventosPage() {
  const { events: initialEvents, store } = ((Route.useLoaderData?.() as any) || {});
  const router = useRouter();
  const [eventsList] = useState<any[]>(initialEvents || []);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  // Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_date: "",
    end_date: "",
    location: "",
    city: "",
    state: "",
    organizer_name: "",
    organizer_phone: "",
    cover_image: "",
    category: "shows",
    capacity: 200,
    age_rating: "livre",
    is_free: false,
    is_external_ticket: false,
    external_ticket_url: "",
  });

  // Métricas Executivas da Produtora de Eventos
  const metrics = useMemo(() => {
    const total = eventsList.length;
    const now = new Date().getTime();
    const upcoming = eventsList.filter((e) => new Date(e.event_date).getTime() >= now).length;
    const past = total - upcoming;
    const totalCapacity = eventsList.reduce((acc, e) => acc + (e.capacity || 0), 0);

    return { total, upcoming, past, totalCapacity };
  }, [eventsList]);

  // Filtro
  const filteredEvents = useMemo(() => {
    return eventsList.filter((e) => {
      if (selectedCategory !== "all" && e.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          e.title?.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [eventsList, selectedCategory, search]);

  const metricsItems: MetricCardItem[] = [
    {
      label: "Eventos Cadastrados",
      value: `${metrics.total} produções`,
      description: "Total de atrações no histórico",
    },
    {
      label: "Próximos Shows & Eventos",
      value: `${metrics.upcoming} ativos`,
      description: "Com ingressos ou cronograma aberto",
    },
    {
      label: "Capacidade Ofertada",
      value: `${metrics.totalCapacity.toLocaleString("pt-BR")} pessoas`,
      description: "Público máximo estimado em todos os locais",
    },
    {
      label: "Eventos Concluídos",
      value: `${metrics.past} realizados`,
      description: "Histórico de portarias encerradas",
    },
  ];

  const TABS = [
    { id: "all", label: "Todos os Eventos", count: metrics.total },
    { id: "shows", label: "Shows & Festivais" },
    { id: "corporate", label: "Corporativo & Palestras" },
    { id: "theatre", label: "Teatro & Cultura" },
    { id: "sports", label: "Esportivos" },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.event_date) {
      toast.error("Informe o título e a data do evento.");
      return;
    }

    setIsSaving(true);
    try {
      const normalizedDate =
        form.event_date.includes("Z") || form.event_date.includes("+")
          ? form.event_date
          : new Date(form.event_date).toISOString();

      await upsertEvent({
        data: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          event_date: normalizedDate,
          end_date: form.end_date || null,
          location: form.location.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          organizer_name: form.organizer_name.trim() || null,
          organizer_phone: form.organizer_phone.trim() || null,
          cover_image: form.cover_image || null,
          category: form.category || "shows",
          capacity: form.capacity ? Number(form.capacity) : 200,
          age_rating: form.age_rating || "livre",
          is_free: form.is_free,
          is_external_ticket: form.is_external_ticket,
          external_ticket_url: form.is_external_ticket && form.external_ticket_url ? form.external_ticket_url : null,
          status: "published",
        },
      });

      toast.success("Evento criado com sucesso! Lote inicial provisionado.");
      setIsOpen(false);
      setForm({
        title: "",
        description: "",
        event_date: "",
        end_date: "",
        location: "",
        city: "",
        state: "",
        organizer_name: "",
        organizer_phone: "",
        cover_image: "",
        category: "shows",
        capacity: 200,
        age_rating: "livre",
        is_free: false,
        is_external_ticket: false,
        external_ticket_url: "",
      });
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar evento.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <NicheOperationalGuard
      targetNiche="events"
      toolTitle="Gestão de Eventos, Shows & Produtora"
      toolDescription="Controle de ingressos, lotes promocionais, check-in de portaria com QR Code, orçamentos e fornecedores de eventos."
      store={store}
    >
      <div className="w-full max-w-7xl mx-auto px-0 sm:px-0 space-y-6 pb-20 animate-in fade-in duration-200">
        {/* ── 1. TOOLBAR CANÔNICA PADRÃO Waesy ── */}
        <WorkspaceCanonicalToolbar
          tabs={TABS}
          activeTab={selectedCategory}
          onTabChange={(id) => setSelectedCategory(id)}
          searchPlaceholder="Buscar eventos por título, local ou atração..."
          searchValue={search}
          onSearchChange={setSearch}
          onOpenDashboard={() => setIsDashboardOpen(true)}
          dashboardLabel="Métricas de Bilheteria"
          metricsBadge={metrics.upcoming > 0 ? `${metrics.upcoming} ativos` : undefined}
          primaryAction={{
            label: "Novo Evento & Lotes",
            icon: Plus,
            onClick: () => setIsOpen(true),
          }}
        />

        {/* ── 2. GRID DE EVENTOS ── */}
        {filteredEvents.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-card rounded-2xl border border-dashed border-border/70 p-8">
            <Calendar className="size-12 mx-auto text-muted-foreground/40" />
            <h3 className="text-sm font-bold text-foreground">Nenhum evento encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Cadastre sua atração, configure os lotes de ingressos e ative o validador de portaria QR Code para o público.
            </p>
            <Button
              size="sm"
              onClick={() => setIsOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 h-9 mt-2 cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Criar Primeiro Evento</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map((event: any) => {
              const evtTime = new Date(event.event_date).getTime();
              const isPast = evtTime < new Date().getTime();

              return (
                <Card
                  key={event.id}
                  className="rounded-2xl border border-border/70 bg-card overflow-hidden hover:border-foreground/20 transition-all flex flex-col justify-between shadow-2xs"
                >
                  <div>
                    {event.cover_image ? (
                      <div className="w-full aspect-[16/9] bg-muted overflow-hidden relative">
                        <img
                          src={event.cover_image}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-background/95 text-foreground border border-border/80 text-[10px] font-semibold shadow-xs">
                            {event.category || "Evento"}
                          </Badge>
                        </div>
                        <div className="absolute top-3 right-3">
                          <Badge
                            variant={isPast ? "secondary" : "default"}
                            className="text-[10px] font-semibold uppercase shadow-xs"
                          >
                            {isPast ? "Encerrado" : "Confirmado"}
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-[16/9] bg-muted/40 flex items-center justify-center text-muted-foreground relative">
                        <Calendar className="size-8 opacity-40" />
                        <div className="absolute top-3 left-3">
                          <Badge variant="outline" className="text-[10px] font-mono uppercase">
                            {event.category || "Evento"}
                          </Badge>
                        </div>
                      </div>
                    )}

                    <div className="p-4 space-y-2">
                      <h3 className="font-bold text-base text-foreground line-clamp-1">
                        {event.title}
                      </h3>

                      {event.event_date && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                          <Clock className="size-3.5 shrink-0" />
                          <span>
                            {new Date(event.event_date).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </p>
                      )}

                      {event.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 line-clamp-1 font-mono">
                          <MapPin className="size-3.5 shrink-0" />
                          <span>{event.location}</span>
                        </p>
                      )}

                      {event.capacity && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-mono pt-1">
                          <Users className="size-3.5 shrink-0" />
                          <span>Capacidade: {event.capacity} pessoas</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações Rápidas do Evento (Apple HIG / Padrão Silencioso) */}
                  <div className="p-4 pt-0 flex items-center justify-between gap-2 border-t border-border/40 mt-3 pt-3">
                    <Button
                      asChild
                      variant="default"
                      size="sm"
                      className="flex-1 h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Link to="/workspace/eventos/$id" params={{ id: event.id }}>
                        <Ticket className="size-3.5" />
                        <span>Lotes & Ingressos</span>
                      </Link>
                    </Button>

                    <CrudActionsMenu
                      entityName="Evento"
                      editUrl={`/workspace/eventos/${event.id}`}
                      viewUrl={`/evento/${event.id}`}
                      customActions={[
                        {
                          label: "Portaria & Validador QR Code",
                          icon: QrCode,
                          href: `/workspace/eventos/${event.id}/checkin`,
                        },
                      ]}
                      onDelete={() => {
                        toast.info("Para desativar este evento, altere o status dos lotes para encerrado.");
                      }}
                      deleteConfirmTitle="Encerrar Evento?"
                      deleteConfirmDescription={`Deseja realmente desativar as vendas de ingressos para "${event.title}"?`}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── 3. SHEET DE CADASTRO DE EVENTO & LOTES ── */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="right" size="wide" className="w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 overflow-y-auto no-scrollbar flex flex-col h-full bg-background border-l border-border">
            <SheetHeader className="px-6 py-4 bg-muted/20 border-b border-border/60 text-left shrink-0">
              <SheetTitle className="text-lg font-bold">Novo Evento & Lotes de Ingressos</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Cadastre o evento para habilitar a venda de ingressos, controle de lotes e portaria.
              </SheetDescription>
            </SheetHeader>

            <form onSubmit={handleSave} className="p-6 space-y-4 flex-1">
              <div className="space-y-1.5">
                <Label htmlFor="evt-title" className="text-xs font-bold">Título do Evento *</Label>
                <Input
                  id="evt-title"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Festival de Música de Verão 2026"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="evt-date" className="text-xs font-bold">Data e Hora de Início *</Label>
                  <Input
                    id="evt-date"
                    type="datetime-local"
                    required
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="evt-cat" className="text-xs font-bold">Categoria</Label>
                  <select
                    id="evt-cat"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="shows">Shows & Festivais</option>
                    <option value="corporate">Corporativo & Palestras</option>
                    <option value="theatre">Teatro & Cultura</option>
                    <option value="sports">Esportivos</option>
                    <option value="gastronomy">Gastronomia & Open Food</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="evt-loc" className="text-xs font-bold">Local / Endereço</Label>
                  <Input
                    id="evt-loc"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Ex: Arena Central — Centro"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="evt-cap" className="text-xs font-bold">Capacidade Estimada (Público)</Label>
                  <Input
                    id="evt-cap"
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                    placeholder="Ex: 500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Capa do Evento (16:9)</Label>
                <ImageUpload
                  value={form.cover_image}
                  onChange={(url) => setForm({ ...form, cover_image: url })}
                  onRemove={() => setForm({ ...form, cover_image: "" })}
                  aspectPreset="widescreen"
                  bucket="cms-media"
                  helperText="Selecione a imagem oficial do banner ou flyer de divulgação."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="evt-desc" className="text-xs font-bold">Descrição / Regulamento</Label>
                <Textarea
                  id="evt-desc"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Line-up, horários de abertura de portões, classificação indicativa e avisos gerais..."
                />
              </div>

              {/* ── Campos Avançados ── */}
              <div className="border-t border-border/60 pt-4 space-y-4">
                <p className="text-xs font-bold text-foreground">Informações Adicionais</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="evt-city" className="text-xs font-bold">Cidade</Label>
                    <Input
                      id="evt-city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Ex: Chapecó"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="evt-state" className="text-xs font-bold">Estado (UF)</Label>
                    <Input
                      id="evt-state"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })}
                      placeholder="SC"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="evt-age" className="text-xs font-bold">Classificação Etária</Label>
                    <select
                      id="evt-age"
                      value={form.age_rating}
                      onChange={(e) => setForm({ ...form, age_rating: e.target.value })}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="livre">Livre</option>
                      <option value="12">12+</option>
                      <option value="14">14+</option>
                      <option value="16">16+</option>
                      <option value="18">18+</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="evt-organizer" className="text-xs font-bold">Produtor / Organizador</Label>
                    <Input
                      id="evt-organizer"
                      value={form.organizer_name}
                      onChange={(e) => setForm({ ...form, organizer_name: e.target.value })}
                      placeholder="Ex: Waesy Eventos e Cultura"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="evt-org-phone" className="text-xs font-bold">Contato do Produtor</Label>
                    <Input
                      id="evt-org-phone"
                      type="tel"
                      value={form.organizer_phone}
                      onChange={(e) => setForm({ ...form, organizer_phone: e.target.value })}
                      placeholder="(49) 99999-9999"
                    />
                  </div>
                </div>

                {/* Toggle: Ingresso Externo */}
                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">Ingresso por Link Externo</p>
                      <p className="text-[11px] text-muted-foreground">Ative se os ingressos são vendidos em outra plataforma.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, is_external_ticket: !form.is_external_ticket })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                        form.is_external_ticket ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`inline-block size-4 transform rounded-full bg-background shadow-sm transition-transform ${
                          form.is_external_ticket ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {form.is_external_ticket && (
                    <div className="space-y-1.5">
                      <Label htmlFor="evt-ext-url" className="text-xs font-bold">URL de Compra de Ingressos</Label>
                      <Input
                        id="evt-ext-url"
                        type="url"
                        value={form.external_ticket_url}
                        onChange={(e) => setForm({ ...form, external_ticket_url: e.target.value })}
                        placeholder="https://ingresso.com/evento/..."
                      />
                    </div>
                  )}
                </div>
              </div>

              <SheetFooter className="pt-4 border-t border-border/60 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving} className="font-bold">
                  {isSaving ? "Salvando..." : "Criar Evento"}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        {/* ── 4. DASHBOARD SHEET DE MÉTRICAS ── */}
        <WorkspaceDashboardSheet
          isOpen={isDashboardOpen}
          onClose={() => setIsDashboardOpen(false)}
          title="Painel Executivo da Produtora"
          subtitle="Taxa de ocupação de público e capacidade dos eventos"
          metrics={metricsItems}
        />
      </div>
    </NicheOperationalGuard>
  );
}
