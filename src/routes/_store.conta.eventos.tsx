import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Ticket,
  Plus,
  Copy,
  ExternalLink,
  Archive,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Video,
  Image as ImageIcon,
  Sparkles,
  MapPin,
  Clock,
  Search,
  RotateCcw,
  CheckCircle2,
  Users,
} from "lucide-react";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaUploader } from "@/components/ui/media-uploader";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { NativeMobileHeader } from "@/components/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { getUserSession } from "@/services/auth.functions";
import {
  listCivilianEvents,
  upsertCivilianEvent,
  softDeleteCivilianEvent,
  archiveCivilianEvent,
  duplicateCivilianEvent,
} from "@/services/events.functions";

export const Route = createFileRoute("/_store/conta/eventos")({
  head: () => ({
    meta: [{ title: "Meus Eventos & Bilheteria | Waesy" }],
  }),
  loader: async () => {
    try {
      const session = await getUserSession().catch(() => null);
      if (!session || (!session.id && !session.user)) {
        throw redirect({
          to: "/entrar",
          search: { returnUrl: "/conta/eventos" },
        });
      }

      const events = await listCivilianEvents().catch(() => []);
      return { events, session };
    } catch (err) {
      console.error("[loader:_store.conta.eventos] Error loading civilian events:", err);
      return { events: [], session: null };
    }
  },
  component: CivilianEventsPage,
});

const EVENT_CATEGORIES = [
  { value: "shows", label: "Shows & Música" },
  { value: "palestras", label: "Palestras & Workshops" },
  { value: "esportes", label: "Esportes & Torneios" },
  { value: "gastronomia", label: "Gastronomia & Festivais" },
  { value: "social", label: "Encontros & Festas" },
  { value: "corporativo", label: "Corporativo & Negócios" },
  { value: "cultura", label: "Teatro & Artes" },
  { value: "outros", label: "Outros Eventos" },
];

function CivilianEventsPage() {
  const router = useRouter();
  const loaderData = (Route.useLoaderData() || {}) as any;
  const initialEvents = (loaderData.events as any[]) || [];

  const [eventsList, setEventsList] = useState<any[]>(initialEvents);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "drafts" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("Chapecó");
  const [formState, setFormState] = useState("SC");
  const [formCategory, setFormCategory] = useState("shows");
  const [formCoverImage, setFormCoverImage] = useState("");
  const [formIsFree, setFormIsFree] = useState(true);
  const [formPriceReais, setFormPriceReais] = useState("0");
  const [formCapacity, setFormCapacity] = useState("100");
  const [formVisibility, setFormVisibility] = useState<"public" | "link_only">("public");
  const [formStoryUrl, setFormStoryUrl] = useState("");
  const [formStoryType, setFormStoryType] = useState<"image" | "video">("image");
  const [formStoryAutoOpen, setFormStoryAutoOpen] = useState(true);

  const resetForm = () => {
    setEditingEvent(null);
    setFormTitle("");
    setFormDescription("");
    setFormDate("");
    setFormEndDate("");
    setFormLocation("");
    setFormAddress("");
    setFormCity("Chapecó");
    setFormState("SC");
    setFormCategory("shows");
    setFormCoverImage("");
    setFormIsFree(true);
    setFormPriceReais("0");
    setFormCapacity("100");
    setFormVisibility("public");
    setFormStoryUrl("");
    setFormStoryType("image");
    setFormStoryAutoOpen(true);
  };

  const openEditorForNew = () => {
    resetForm();
    setIsEditorOpen(true);
  };

  const openEditorForEdit = (ev: any) => {
    setEditingEvent(ev);
    setFormTitle(ev.title || "");
    setFormDescription(ev.description || "");
    setFormDate(ev.event_date ? ev.event_date.slice(0, 16) : "");
    setFormEndDate(ev.end_date ? ev.end_date.slice(0, 16) : "");
    setFormLocation(ev.location || "");
    setFormAddress(ev.address || "");
    setFormCity(ev.city || "Chapecó");
    setFormState(ev.state || "SC");
    setFormCategory(ev.category || "shows");
    setFormCoverImage(ev.cover_image || "");
    setFormIsFree(ev.is_free ?? true);
    setFormPriceReais(ev.price_cents ? (ev.price_cents / 100).toFixed(2) : "0");
    setFormCapacity(ev.capacity ? String(ev.capacity) : "100");
    setFormVisibility(ev.visibility === "link_only" ? "link_only" : "public");
    setFormStoryUrl(ev.story_media_url || "");
    setFormStoryType(ev.story_media_type || "image");
    setFormStoryAutoOpen(ev.story_auto_open ?? true);
    setIsEditorOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Informe o título do evento.");
      return;
    }
    if (!formDate) {
      toast.error("Informe a data e horário do evento.");
      return;
    }

    setIsSubmitting(true);
    try {
      const priceCents = formIsFree ? 0 : Math.round(Number(formPriceReais.replace(",", ".")) * 100);

      const payload: any = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        event_date: new Date(formDate).toISOString(),
        end_date: formEndDate ? new Date(formEndDate).toISOString() : null,
        location: formLocation.trim() || null,
        address: formAddress.trim() || null,
        city: formCity.trim() || null,
        state: formState.trim() || null,
        category: formCategory,
        cover_image: formCoverImage.trim() || null,
        is_free: formIsFree,
        price_cents: priceCents,
        capacity: Number(formCapacity) || 100,
        visibility: formVisibility,
        status: "published",
        story_media_url: formStoryUrl.trim() || null,
        story_media_type: formStoryType,
        story_auto_open: formStoryAutoOpen,
      };

      if (editingEvent?.id) {
        payload.id = editingEvent.id;
      }

      const saved = await upsertCivilianEvent({ data: payload });

      toast.success(editingEvent ? "Evento atualizado com sucesso!" : "Evento publicado com sucesso!");
      setIsEditorOpen(false);
      resetForm();

      // Atualiza lista local
      if (editingEvent?.id) {
        setEventsList((prev) => prev.map((item) => (item.id === saved.id ? { ...item, ...saved } : item)));
      } else {
        setEventsList((prev) => [saved, ...prev]);
      }
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar evento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = async (eventId: string) => {
    try {
      const cloned = await duplicateCivilianEvent({ data: { eventId } });
      toast.success("Evento duplicado como rascunho!");
      setEventsList((prev) => [cloned, ...prev]);
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao duplicar evento.");
    }
  };

  const handleArchive = async (eventId: string, currentArchived: boolean) => {
    try {
      await archiveCivilianEvent({ data: { eventId, archive: !currentArchived } });
      toast.success(!currentArchived ? "Evento arquivado." : "Evento desarquivado.");
      setEventsList((prev) =>
        prev.map((item) =>
          item.id === eventId
            ? { ...item, archived_at: !currentArchived ? new Date().toISOString() : null }
            : item
        )
      );
      router.invalidate();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao arquivar evento.");
    }
  };

  const handleDelete = async (eventId: string) => {
    const backupEvent = eventsList.find((e) => e.id === eventId);
    setEventsList((prev) => prev.filter((e) => e.id !== eventId));

    try {
      await softDeleteCivilianEvent({ data: { eventId } });
      toast.success("Evento excluído.", {
        action: {
          label: "Desfazer",
          onClick: async () => {
            if (backupEvent) {
              await upsertCivilianEvent({
                data: {
                  ...backupEvent,
                  deleted_at: null,
                  status: backupEvent.status || "published",
                },
              });
              setEventsList((prev) => [backupEvent, ...prev]);
              toast.success("Evento restaurado!");
              router.invalidate();
            }
          },
        },
      });
      router.invalidate();
    } catch (err: any) {
      if (backupEvent) setEventsList((prev) => [backupEvent, ...prev]);
      toast.error(err?.message || "Erro ao excluir evento.");
    }
  };

  const handleCopyPublicLink = (eventId: string, isLinkOnly: boolean) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://usewaesy.pages.dev";
    const modeParam = isLinkOnly ? "?mode=standalone" : "";
    const url = `${origin}/evento/${eventId}${modeParam}`;
    navigator.clipboard.writeText(url);
    toast.success("Link público copiado para a área de transferência!");
  };

  // Filtragem
  const filteredEvents = useMemo(() => {
    return eventsList.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.city?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const isArchived = Boolean(item.archived_at);
      const isDraft = item.status === "draft";

      if (activeTab === "active") return !isArchived && !isDraft;
      if (activeTab === "drafts") return isDraft && !isArchived;
      if (activeTab === "archived") return isArchived;
      return true;
    });
  }, [eventsList, activeTab, searchQuery]);

  // Métricas rápidas
  const totalEvents = eventsList.length;
  const totalTicketsSold = eventsList.reduce((acc, ev) => acc + Number(ev.tickets_sold || 0), 0);
  const totalRevenueCents = eventsList.reduce((acc, ev) => acc + Number(ev.ticket_revenue_cents || 0), 0);

  return (
    <div className="w-full min-h-screen bg-background text-foreground pb-24 font-sans select-none antialiased">
      {/* ── Mobile Top Header ── */}
      <div className="md:hidden">
        <NativeMobileHeader
          title="Meus Eventos"
          onBack={() => router.navigate({ to: "/conta" })}
          rightActions={
            <Button
              onClick={openEditorForNew}
              size="sm"
              className="h-11 min-h-11 px-3 rounded-xl font-bold bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-4 mr-1" />
              Novo
            </Button>
          }
        />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* ── Desktop Header ── */}
        <div className="hidden md:flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Meus Eventos & Produções</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Crie, gerencie bilheterias, stories e listas de presença para seus eventos.
            </p>
          </div>
          <Button
            onClick={openEditorForNew}
            className="h-11 min-h-11 px-5 rounded-xl font-bold bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-4 mr-2" />
            Criar Novo Evento
          </Button>
        </div>

        {/* ── Metrics Summary Bar ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-xs text-muted-foreground font-medium">Eventos Cadastrados</span>
            <span className="text-xl sm:text-2xl font-bold text-foreground mt-1">{totalEvents}</span>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-xs text-muted-foreground font-medium">Ingressos Emitidos</span>
            <span className="text-xl sm:text-2xl font-bold text-primary mt-1">{totalTicketsSold}</span>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col justify-center">
            <span className="text-xs text-muted-foreground font-medium">Receita de Bilheteria</span>
            <span className="text-xl sm:text-2xl font-bold text-foreground mt-1">
              {formatMoney(totalRevenueCents)}
            </span>
          </div>
        </div>

        {/* ── Search & Filter Tabs ── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 p-1 bg-muted/60 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("all")}
              className={`h-9 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeTab === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos ({eventsList.length})
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`h-9 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeTab === "active"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Ativos ({eventsList.filter((e) => !e.archived_at && e.status !== "draft").length})
            </button>
            <button
              onClick={() => setActiveTab("drafts")}
              className={`h-9 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeTab === "drafts"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Rascunhos ({eventsList.filter((e) => e.status === "draft" && !e.archived_at).length})
            </button>
            <button
              onClick={() => setActiveTab("archived")}
              className={`h-9 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                activeTab === "archived"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Arquivados ({eventsList.filter((e) => !!e.archived_at).length})
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar evento por título ou local..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 min-h-11 pl-9 rounded-xl text-xs bg-card border-border/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* ── Event List / Empty State ── */}
        {filteredEvents.length === 0 ? (
          <div className="bg-card border border-border/60 rounded-3xl p-8 sm:p-12 text-center space-y-4">
            <div className="size-16 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
              <Calendar className="size-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Nenhum evento encontrado</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? "Nenhum resultado corresponde à sua busca. Tente outros termos."
                  : "Você ainda não possui eventos cadastrados. Crie seu primeiro evento e comece a divulgar."}
              </p>
            </div>
            {!searchQuery && (
              <Button
                onClick={openEditorForNew}
                className="h-11 min-h-11 px-6 rounded-xl font-bold bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-4 mr-2" />
                Criar Meu Primeiro Evento
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredEvents.map((ev) => {
              const isArchived = Boolean(ev.archived_at);
              const isLinkOnly = ev.visibility === "link_only";
              const hasStory = Boolean(ev.story_media_url);

              return (
                <div
                  key={ev.id}
                  className="bg-card border border-border/60 rounded-3xl p-4 sm:p-5 flex flex-col justify-between space-y-4 hover:border-border transition-colors shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isArchived ? (
                          <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-500">
                            Arquivado
                          </Badge>
                        ) : ev.status === "draft" ? (
                          <Badge variant="secondary" className="text-xs">
                            Rascunho
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            Ativo
                          </Badge>
                        )}

                        {isLinkOnly ? (
                          <Badge variant="outline" className="text-xs text-muted-foreground flex items-center gap-1">
                            <EyeOff className="size-3" />
                            Link Único
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground flex items-center gap-1">
                            <Eye className="size-3" />
                            Público
                          </Badge>
                        )}

                        {hasStory && (
                          <Badge variant="outline" className="text-xs text-purple-600 border-purple-500/30 flex items-center gap-1">
                            <Sparkles className="size-3" />
                            Story 9:16
                          </Badge>
                        )}
                      </div>

                      <span className="text-xs font-semibold text-muted-foreground">
                        {ev.is_free ? "Gratuito" : formatMoney(ev.price_cents || 0)}
                      </span>
                    </div>

                    {/* Title & Metadata */}
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-foreground line-clamp-2">{ev.title}</h4>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <Clock className="size-3.5" />
                          {ev.event_date ? formatDate(ev.event_date) : "Data a definir"}
                        </span>
                        {(ev.location || ev.city) && (
                          <span className="flex items-center gap-2">
                            <MapPin className="size-3.5" />
                            {ev.location ? `${ev.location} - ` : ""}
                            {ev.city || "Chapecó"}
                            {ev.state ? `/${ev.state}` : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats pill */}
                    <div className="bg-muted/40 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" />
                        {ev.tickets_sold || 0} confirmados
                      </span>
                      <span>Capacidade: {ev.ticket_capacity || ev.capacity || 100}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditorForEdit(ev)}
                        className="h-11 min-h-11 px-3 rounded-xl text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Edit className="size-3.5 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyPublicLink(ev.id, isLinkOnly)}
                        className="h-11 min-h-11 px-3 rounded-xl text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Copy className="size-3.5 mr-2" />
                        Copiar Link
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-11 min-h-11 px-3 rounded-xl text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Link to="/evento/$id" params={{ id: ev.id }}>
                          <ExternalLink className="size-3.5 mr-2" />
                          Visualizar
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(ev.id)}
                        className="h-11 min-h-11 size-11 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Duplicar evento"
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleArchive(ev.id, isArchived)}
                        className="h-11 min-h-11 size-11 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title={isArchived ? "Desarquivar" : "Arquivar"}
                      >
                        <Archive className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(ev.id)}
                        className="h-11 min-h-11 size-11 p-0 rounded-xl text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        title="Excluir evento"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Editor Modal (Create / Edit Event) ── */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-xl max-h-(--spacing-screen-90,90vh) overflow-y-auto rounded-3xl p-6 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingEvent ? "Editar Evento" : "Criar Novo Evento"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure as informações essenciais, formato de entrada e presença do seu evento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEvent} className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Título do Evento *</Label>
              <Input
                type="text"
                placeholder="Ex: Workshop de Inteligência Artificial, Sunset acústico..."
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                required
                className="h-11 min-h-11 rounded-xl text-xs bg-background border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Descrição</Label>
              <Textarea
                placeholder="Explique os detalhes do evento, atrações, requisitos e orientações gerais..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                className="rounded-xl text-xs bg-background border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {/* Date & Time Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Início (Data e Horário) *</Label>
                <Input
                  type="datetime-local"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  className="h-11 min-h-11 rounded-xl text-xs bg-background border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Término (Opcional)</Label>
                <Input
                  type="datetime-local"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="h-11 min-h-11 rounded-xl text-xs bg-background border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Categoria</Label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full h-11 min-h-11 px-3 rounded-xl text-xs bg-background border border-border text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {EVENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Location & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Nome do Local</Label>
                <Input
                  type="text"
                  placeholder="Ex: Salão Nobre, Arena Central, Online"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="h-11 min-h-11 rounded-xl text-xs bg-background border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Cidade / UF</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Cidade"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="h-11 min-h-11 flex-1 rounded-xl text-xs bg-background border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <Input
                    type="text"
                    placeholder="UF"
                    value={formState}
                    onChange={(e) => setFormState(e.target.value)}
                    className="h-11 min-h-11 w-16 rounded-xl text-xs bg-background border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </div>

            {/* Pricing & Capacity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/40 rounded-2xl">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Entrada Gratuita</Label>
                  <Switch checked={formIsFree} onCheckedChange={setFormIsFree} />
                </div>
                {!formIsFree && (
                  <div className="space-y-1">
                    <Label className="text-2xs text-muted-foreground">Valor do Ingresso (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formPriceReais}
                      onChange={(e) => setFormPriceReais(e.target.value)}
                      className="h-11 min-h-11 rounded-xl text-xs bg-background border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">Capacidade Total</Label>
                <Input
                  type="number"
                  min="1"
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  className="h-11 min-h-11 rounded-xl text-xs bg-background border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            {/* Visibility Mode (GAP-03) */}
            <div className="space-y-2 p-3 bg-muted/40 rounded-2xl">
              <Label className="text-xs font-semibold text-foreground">Visibilidade do Evento</Label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFormVisibility("public")}
                  className={`h-11 min-h-11 rounded-xl px-3 text-xs font-medium border flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    formVisibility === "public"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  <Eye className="size-3.5" />
                  Vitrine Pública
                </button>
                <button
                  type="button"
                  onClick={() => setFormVisibility("link_only")}
                  className={`h-11 min-h-11 rounded-xl px-3 text-xs font-medium border flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    formVisibility === "link_only"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  <EyeOff className="size-3.5" />
                  Somente Via Link
                </button>
              </div>
              <p className="text-2xs text-muted-foreground mt-1">
                {formVisibility === "public"
                  ? "Aparece na agenda e na busca do Waesy para qualquer visitante."
                  : "Não listado na vitrine pública. Apenas convidados com o link direto podem acessar."}
              </p>
            </div>

            {/* Capa do Evento (Upload Direto no Bucket) */}
            <div className="space-y-2 p-3 bg-muted/40 rounded-2xl">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="size-3.5 text-primary" />
                Imagem de Capa do Evento (16:9)
              </Label>
              <MediaUploader
                value={formCoverImage ? [formCoverImage] : []}
                onChange={(urls) => setFormCoverImage(urls[0] || "")}
                maxFiles={1}
                bucket="post-media"
                folder="events/covers"
                aspect={16 / 9}
                accept="image"
                label="Capa do Evento"
              />
            </div>

            {/* Story 9:16 (GAP-04) */}
            <div className="space-y-2 p-3 bg-muted/40 rounded-2xl">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="size-3.5 text-purple-600" />
                Story Imersivo 9:16 (Auto-Abertura)
              </Label>
              <MediaUploader
                value={formStoryUrl ? [formStoryUrl] : []}
                onChange={(urls) => setFormStoryUrl(urls[0] || "")}
                maxFiles={1}
                bucket="post-media"
                folder="events/stories"
                aspect={9 / 16}
                accept="all"
                label="Mídia do Story"
              />
              {formStoryUrl && (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormStoryType("image")}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold border flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        formStoryType === "image"
                          ? "bg-background text-foreground border-primary"
                          : "text-muted-foreground border-transparent hover:bg-muted"
                      }`}
                    >
                      <ImageIcon className="size-3" />
                      Imagem
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStoryType("video")}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold border flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        formStoryType === "video"
                          ? "bg-background text-foreground border-primary"
                          : "text-muted-foreground border-transparent hover:bg-muted"
                      }`}
                    >
                      <Video className="size-3" />
                      Vídeo
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-2xs text-muted-foreground">Auto-abrir no primeiro acesso</Label>
                    <Switch checked={formStoryAutoOpen} onCheckedChange={setFormStoryAutoOpen} />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditorOpen(false)}
                className="h-11 min-h-11 px-4 rounded-xl font-semibold border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 min-h-11 px-5 rounded-xl font-bold bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isSubmitting ? "Salvando..." : editingEvent ? "Salvar Alterações" : "Publicar Evento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CivilianEventsPage;
