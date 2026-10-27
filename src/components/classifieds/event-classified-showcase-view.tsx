import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Users,
  Mic,
  Award,
  BarChart3,
  Info,
  ExternalLink,
  Smartphone,
  QrCode,
  Play,
  Copy,
  Check,
  MessageCircle,
  Edit3,
  Car,
  Accessibility,
  RefreshCcw,
  BadgePercent,
  Lock,
  Plus,
  Send,
  Star,
  Download,
  Image as ImageIcon,
  ChevronDown,
  Navigation,
  Building2,
} from "lucide-react";
import { formatCanonicalAddress } from "@/lib/format-address";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapLibreCanvas } from "@/components/mobility/maplibre-canvas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/money";
import { useIsDesktop } from "@/hooks/use-mobile";
import {
  normalizeEventDomain,
  buildEventCalendarLinks,
  type EventTicketTierNormalized,
} from "@/lib/classifieds/event-domain";
import {
  checkoutClassifiedEventTicket,
  voteClassifiedEventSurvey,
  getClassifiedEventPublicWall,
  submitClassifiedEventTestimonial,
  verifyClassifiedTicketByCode,
} from "@/services/classifieds-events.functions";

export type {
  EventTicketTier,
  EventScheduleItem,
  EventSpeaker,
  EventSponsor,
  EventSurvey,
  EventPollOptionNormalized,
} from "@/lib/classifieds/event-domain";

export interface EventClassifiedShowcaseViewProps {
  classified: any;
  isOwner?: boolean;
  onEditClassified?: () => void;
  previewViewport?: "mobile" | "desktop" | "auto";
  templateStyle?: "editorial" | "standard";
  displayMode?: "tabs" | "continuous_list";
}

export function EventClassifiedShowcaseView({
  classified,
  isOwner = false,
  onEditClassified,
  previewViewport = "auto",
}: EventClassifiedShowcaseViewProps) {
  const queryClient = useQueryClient();
  const isViewportDesktop = useIsDesktop(1024);
  const effectiveIsDesktop =
    previewViewport === "mobile"
      ? false
      : previewViewport === "desktop"
      ? true
      : isViewportDesktop;

  const event = normalizeEventDomain(classified);
  const calendarLinks = buildEventCalendarLinks(
    event,
    typeof window !== "undefined" ? window.location.href : undefined
  );

  // Selected Ticket Tier (defaults to first purchasable tier, or first tier)
  const defaultTierId =
    event.active_ticket_tiers[0]?.id || event.ticket_tiers[0]?.id || null;
  const [selectedTierId, setSelectedTierId] = useState<string | null>(defaultTierId);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const canonicalVenueAddress = formatCanonicalAddress(event.venue_address, event.city, event.state);

  useEffect(() => {
    const nextDefault =
      event.active_ticket_tiers[0]?.id || event.ticket_tiers[0]?.id || null;
    if (!selectedTierId || !event.ticket_tiers.some((t) => t.id === selectedTierId)) {
      setSelectedTierId(nextDefault);
    }
  }, [event.ticket_tiers, event.active_ticket_tiers, selectedTierId]);

  const selectedTier: EventTicketTierNormalized | null =
    event.ticket_tiers.find((t) => t.id === selectedTierId) ||
    event.active_ticket_tiers[0] ||
    event.ticket_tiers[0] ||
    null;

  // Multi-day schedule tab state
  const [selectedScheduleDayKey, setSelectedScheduleDayKey] = useState<string>(
    event.schedule_days[0]?.day_key || "default"
  );
  useEffect(() => {
    if (
      event.schedule_days.length > 0 &&
      !event.schedule_days.some((d) => d.day_key === selectedScheduleDayKey)
    ) {
      setSelectedScheduleDayKey(event.schedule_days[0].day_key);
    }
  }, [event.schedule_days, selectedScheduleDayKey]);

  // Anchor Navigation + ScrollSpy
  const [activeSection, setActiveSection] = useState<string>("sobre");
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return;
    }
    const sectionIds = event.available_sections.map((s) => `section-${s.id}`);
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) {
          const id = visible[0].target.id.replace(/^section-/, "");
          setActiveSection(id);
        }
      },
      {
        rootMargin: "-20% 0px -65% 0px",
        threshold: [0.1, 0.25, 0.5],
      }
    );

    for (const el of elements) {
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [event.available_sections]);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    if (typeof document !== "undefined") {
      const el = document.getElementById(`section-${sectionId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  // Calendar Menu state
  const [calendarMenuOpen, setCalendarMenuOpen] = useState(false);

  // Lightbox state for Exclusive Gallery
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Story Viewer Modal
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  useEffect(() => {
    if (
      event.story_url &&
      event.story_auto_open &&
      typeof window !== "undefined" &&
      previewViewport === "auto"
    ) {
      const key = `waesy_story_seen_${event.id}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        setStoryViewerOpen(true);
      }
    }
  }, [event.story_url, event.story_auto_open, event.id, previewViewport]);

  // Checkout Modal State
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ticketQty, setTicketQty] = useState(1);
  const [buyerName, setBuyerName] = useState("");
  const [buyerWhatsapp, setBuyerWhatsapp] = useState("");
  const [buyerDocument, setBuyerDocument] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "free">("pix");
  const [issuedResult, setIssuedResult] = useState<any | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Check-in Validator Modal
  const [validatorOpen, setValidatorOpen] = useState(false);
  const [verifyCodeInput, setVerifyCodeInput] = useState("");
  const [verifyResult, setVerifyResult] = useState<any | null>(null);

  // Testimonial Form
  const [testimonialOpen, setTestimonialOpen] = useState(false);
  const [testName, setTestName] = useState("");
  const [testRating, setTestRating] = useState(5);
  const [testComment, setTestComment] = useState("");

  // Local Poll Votes Tracking
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});

  // Public Wall Query
  const isRealUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    event.id
  );
  const { data: wallData } = useQuery({
    queryKey: ["classified-event-wall", event.id],
    queryFn: () => getClassifiedEventPublicWall({ data: { classifiedId: event.id } }),
    enabled: isRealUuid,
  });

  const attendees = wallData?.attendees || [];
  const totalConfirmed = wallData?.totalConfirmed || 0;
  const testimonials = wallData?.testimonials || [];

  // Checkout Mutation
  const checkoutMutation = useMutation({
    mutationFn: (payload: any) => checkoutClassifiedEventTicket({ data: payload }),
    onSuccess: (res) => {
      setIssuedResult(res);
      toast.success("Inscrição confirmada e ingresso emitido!");
      queryClient.invalidateQueries({ queryKey: ["classified-event-wall", event.id] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Não foi possível emitir o ingresso.");
    },
  });

  // Survey Vote Mutation
  const voteMutation = useMutation({
    mutationFn: (payload: { surveyId: string; optionId: string }) =>
      voteClassifiedEventSurvey({
        data: {
          classifiedId: event.id,
          surveyId: payload.surveyId,
          optionId: payload.optionId,
        },
      }),
    onSuccess: (_, variables) => {
      setVotedPolls((prev) => ({ ...prev, [variables.surveyId]: variables.optionId }));
      toast.success("Voto computado com sucesso!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao registrar voto.");
    },
  });

  // Testimonial Mutation
  const testimonialMutation = useMutation({
    mutationFn: (payload: any) => submitClassifiedEventTestimonial({ data: payload }),
    onSuccess: () => {
      toast.success("Depoimento publicado no mural do evento!");
      setTestimonialOpen(false);
      setTestName("");
      setTestComment("");
      queryClient.invalidateQueries({ queryKey: ["classified-event-wall", event.id] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao enviar avaliação.");
    },
  });

  // Check-in Verify Mutation
  const verifyMutation = useMutation({
    mutationFn: (code: string) =>
      verifyClassifiedTicketByCode({
        data: { ticketCode: code, markAsCheckedIn: isOwner },
      }),
    onSuccess: (res) => {
      setVerifyResult(res);
      if (res.valid) {
        toast.success(
          res.checkedInNow ? "Check-in realizado com sucesso!" : "Ingresso autêntico!"
        );
      } else {
        toast.error(res.message || "Ingresso não encontrado.");
      }
    },
  });

  const handleOpenCheckout = (tier?: EventTicketTierNormalized | null) => {
    const targetTier = tier || selectedTier;
    if (targetTier) {
      if (!targetTier.is_purchasable) {
        toast.info(`Este lote não está disponível (${targetTier.lifecycle_badge_label}).`);
        return;
      }
      if (targetTier.external_url) {
        window.open(targetTier.external_url, "_blank", "noopener,noreferrer");
        return;
      }
      setSelectedTierId(targetTier.id);
      setPaymentMethod(targetTier.is_free ? "free" : "pix");
    } else if (event.external_ticket_url) {
      window.open(event.external_ticket_url, "_blank", "noopener,noreferrer");
      return;
    } else {
      setPaymentMethod("free");
    }
    setIssuedResult(null);
    setCheckoutOpen(true);
  };

  const handleDownloadIcs = () => {
    const blob = new Blob([calendarLinks.icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = calendarLinks.icsFilename;
    a.click();
    URL.revokeObjectURL(url);
    setCalendarMenuOpen(false);
    toast.success("Arquivo .ics baixado para sua agenda!");
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Confira o evento ${event.title}`,
          url,
        });
        return;
      } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      toast.success("Link do evento copiado!");
    }
  };

  const activeDayGroup =
    event.schedule_days.find((d) => d.day_key === selectedScheduleDayKey) ||
    event.schedule_days[0] ||
    null;

  return (
    <div className="min-h-screen bg-background pb-32 pb-safe">
      {/* 1. CLEAN WIDE HERO BANNER (ZERO HEAVY SHADOW OVERLAY, CONTROLLABLE FOCAL POINT) */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-lg overflow-hidden border border-border/60 bg-muted">
          {event.hero_image_url && !heroImageFailed ? (
            <img
              src={event.hero_image_url}
              alt={event.title}
              onError={() => setHeroImageFailed(true)}
              className={`w-full h-full object-cover ${
                event.hero_focal_point === "top"
                  ? "object-top"
                  : event.hero_focal_point === "bottom"
                  ? "object-bottom"
                  : "object-center"
              }`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground gap-2 p-6 text-center">
              <Calendar className="size-10 text-primary/60" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Capa Oficial do Evento
              </span>
            </div>
          )}

          {/* Top Floating Utility Controls */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            {event.story_url && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStoryViewerOpen(true)}
                className="h-11 min-h-11 rounded-lg bg-background/95 hover:bg-background text-foreground font-bold text-xs gap-2 px-3 border border-border/60 focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Play className="size-4 text-primary fill-primary" />
                <span>Story (9:16)</span>
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={handleShare}
              className="h-11 min-h-11 rounded-lg bg-background/95 hover:bg-background text-foreground font-semibold text-xs gap-2 px-3 border border-border/60 focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Compartilhar evento"
            >
              <Share2 className="size-4" />
              <span className="hidden sm:inline">Compartilhar</span>
            </Button>
            {isOwner && onEditClassified && (
              <Button
                type="button"
                variant="secondary"
                onClick={onEditClassified}
                className="h-11 min-h-11 rounded-lg bg-background/95 hover:bg-background text-foreground font-semibold text-xs gap-2 px-3 border border-border/60 focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Edit3 className="size-4" />
                <span className="hidden sm:inline">Editar</span>
              </Button>
            )}
          </div>
        </div>

        {/* 2. FULL-WIDTH EVENT HEADER & STRUCTURED SUMMARY BAR (ZERO TRUNCATION) */}
        <header className="mt-4 sm:mt-6 sm:bg-card sm:rounded-lg sm:border sm:border-border/60 py-2 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            {/* Left: Date Tile + Full-Width Title + Separated Schedule & Metadata */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              {event.date_tile && (
                <div className="shrink-0 w-16 sm:w-20 rounded-lg border border-primary/30 bg-primary/5 p-3 text-center flex flex-col items-center justify-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {event.date_tile.month_short}
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-foreground leading-none my-1 tabular-nums">
                    {event.date_tile.day}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    {event.date_tile.weekday_short}
                  </span>
                </div>
              )}

              <div className="space-y-3 flex-1 min-w-0">
                {/* Category & Metadata Badges (Separated from Schedule Times!) */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold text-xs px-3 py-1 rounded-md">
                    {event.modality_label}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-semibold px-3 py-1 rounded-md">
                    {event.age_rating_label}
                  </Badge>
                  {event.visibility === "unlisted" && (
                    <Badge
                      variant="outline"
                      className="text-xs font-semibold px-3 py-1 rounded-md border-amber-500/40 text-amber-600 dark:text-amber-400"
                    >
                      Evento Exclusivo (Link Direto)
                    </Badge>
                  )}
                  {totalConfirmed > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs font-semibold px-3 py-1 rounded-md gap-1"
                    >
                      <Users className="size-3 text-primary" />
                      <span>{totalConfirmed} confirmados</span>
                    </Badge>
                  )}
                </div>

                {/* Full Event Title — 100% Width, Natural Wrap, Zero Truncate */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground leading-tight break-words text-wrap">
                  {event.title}
                </h1>

                {event.subtitle && (
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed break-words">
                    {event.subtitle}
                  </p>
                )}

                {/* Structured Date, Explicit Schedule Times & Location */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  {/* Date & Explicit Schedule Block */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                    <Clock className="size-4 text-primary shrink-0 mt-1" />
                    <div className="space-y-1 min-w-0">
                      <p className="font-bold text-foreground capitalize break-words">
                        {event.formatted_date_range}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {event.gates_open_time && (
                          <span>
                            Portões: <strong className="text-foreground">{event.gates_open_time}</strong>
                          </span>
                        )}
                        {event.start_time && (
                          <span>
                            Início: <strong className="text-foreground">{event.start_time}</strong>
                          </span>
                        )}
                        {event.end_time && (
                          <span>
                            Término: <strong className="text-foreground">{event.end_time}</strong>
                          </span>
                        )}
                        <span className="text-muted-foreground/80">({event.timezone_short})</span>
                      </div>
                    </div>
                  </div>

                  {/* Venue & City Block */}
                  <button
                    type="button"
                    onClick={() => scrollToSection("local")}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 hover:border-primary/40 transition-colors text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <MapPin className="size-4 text-primary shrink-0 mt-1" />
                    <div className="space-y-1 min-w-0">
                      <p className="font-bold text-foreground break-words">
                        {event.venue_name}
                      </p>
                      <p className="text-xs text-muted-foreground break-words">
                        {canonicalVenueAddress?.display ||
                          [event.venue_address, `${event.city} - ${event.state}`]
                            .filter(Boolean)
                            .join(" • ")}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Save to Calendar Dropdown & Check-in Validator Trigger */}
            <div className="flex flex-wrap sm:flex-nowrap lg:flex-col items-stretch sm:items-center lg:items-end gap-2 shrink-0">
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCalendarMenuOpen((prev) => !prev)}
                  aria-expanded={calendarMenuOpen}
                  className="h-11 min-h-11 w-full sm:w-auto rounded-lg font-semibold text-xs gap-2 px-4 focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Calendar className="size-4 text-primary" />
                  <span>Salvar na Agenda</span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </Button>

                {calendarMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-lg border border-border bg-card p-2 z-30 space-y-1">
                    <a
                      href={calendarLinks.googleCalendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setCalendarMenuOpen(false)}
                      className="flex items-center justify-between w-full h-11 min-h-11 px-3 rounded-md text-xs font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span>Google Calendar</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </a>
                    <a
                      href={calendarLinks.outlookCalendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setCalendarMenuOpen(false)}
                      className="flex items-center justify-between w-full h-11 min-h-11 px-3 rounded-md text-xs font-semibold text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span>Outlook Calendar</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </a>
                    <button
                      type="button"
                      onClick={handleDownloadIcs}
                      className="flex items-center justify-between w-full h-11 min-h-11 px-3 rounded-md text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span>Apple Calendar / Baixar .ics</span>
                      <Download className="size-3 text-primary" />
                    </button>
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setValidatorOpen(true)}
                className="h-11 min-h-11 w-full sm:w-auto rounded-lg font-semibold text-xs gap-2 px-4 focus-visible:ring-2 focus-visible:ring-primary"
              >
                <QrCode className="size-4 text-primary" />
                <span>{isOwner ? "Portaria / Check-in" : "Validar Ingresso"}</span>
              </Button>
            </div>
          </div>
        </header>
      </div>

      {/* 3. STICKY DYNAMIC ANCHOR NAVIGATION WITH SCROLLSPY (RULE B.39 SINGLE CONTINUOUS ROW) */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/60 mt-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center gap-2 overflow-x-auto flex-nowrap no-scrollbar py-2 tab-list" role="tablist">
          {event.available_sections.map((sec) => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={`px-4 h-11 min-h-11 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <span>{sec.label}</span>
                {typeof sec.count === "number" && sec.count > 0 && (
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-extrabold ${
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {sec.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. MAIN BIDIRECTIONAL CONTENT GRID */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8">
        <div
          className={
            effectiveIsDesktop
              ? "grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              : "space-y-8"
          }
        >
          {/* LEFT / MAIN COLUMN (8 cols on Desktop) */}
          <div className={effectiveIsDesktop ? "lg:col-span-8 space-y-10" : "space-y-8"}>
            {/* HIGHLIGHT PROMO STRIP (Visual Microcards) */}
            {event.promo_cards.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {event.promo_cards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => scrollToSection(card.target_section)}
                    className="p-4 rounded-lg border border-border/60 bg-card hover:border-primary/40 transition-colors text-left flex items-center gap-3 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {card.image_url ? (
                      <img
                        src={card.image_url}
                        alt={card.title}
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                        className="size-12 rounded-lg object-cover shrink-0 border border-border/50"
                      />
                    ) : (
                      <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Ticket className="size-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                        {card.badge}
                      </span>
                      <p className="text-sm font-bold text-foreground break-words leading-snug">
                        {card.title}
                      </p>
                      <p className="text-xs text-muted-foreground break-words mt-1">
                        {card.subtitle}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* SECTION: SOBRE O EVENTO + CUSTOM CMS SECTIONS */}
            <section id="section-sobre" className="scroll-mt-20 space-y-6">
              <div className="py-2 sm:bg-card sm:rounded-lg sm:border sm:border-border/60 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Info className="size-5 text-primary shrink-0" />
                  <h2 className="text-xl font-black tracking-tight text-foreground">
                    Sobre o Evento
                  </h2>
                </div>

                {event.summary && (
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-sm font-medium text-foreground leading-relaxed break-words">
                    {event.summary}
                  </div>
                )}

                <div className="text-sm sm:text-base text-foreground/90 whitespace-pre-line leading-relaxed break-words">
                  {event.description || "Descrição oficial do evento em atualização."}
                </div>

                {event.tags.length > 0 && (
                  <div className="pt-3 border-t border-border/40 flex flex-wrap gap-2">
                    {event.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-xs font-medium px-3 py-1 rounded-md"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Structured Sections (Rich Text, Highlights, FAQ, Callouts) */}
              {event.sections.map((sec) => (
                <div
                  key={sec.id}
                  className={`rounded-lg border p-6 space-y-3 ${
                    sec.type === "highlight"
                      ? "bg-primary/5 border-primary/30"
                      : "bg-card border-border/60"
                  }`}
                >
                  <h3 className="text-lg font-bold text-foreground break-words">
                    {sec.title}
                  </h3>
                  {sec.subtitle && (
                    <p className="text-xs font-semibold text-muted-foreground break-words">
                      {sec.subtitle}
                    </p>
                  )}
                  <div className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed break-words">
                    {sec.content}
                  </div>
                  {sec.cta_label && sec.cta_url && (
                    <div className="pt-2">
                      <a
                        href={sec.cta_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 h-11 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <span>{sec.cta_label}</span>
                        <ExternalLink className="size-4" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </section>

            {/* SECTION: INGRESSOS & LOTES (ANCHOR TARGET IN MAIN FLOW) */}
            {(event.ticket_tiers.length > 0 ||
              event.external_ticket_url ||
              event.participation_mode === "FREE") && (
              <section id="section-ingressos" className="scroll-mt-20 space-y-4">
                <div className="py-2 sm:bg-card sm:rounded-lg sm:border sm:border-border/60 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Ticket className="size-5 text-primary shrink-0" />
                      <h2 className="text-xl font-black tracking-tight text-foreground">
                        Ingressos e Lotes
                      </h2>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold w-fit">
                      {event.participation_mode_label}
                    </Badge>
                  </div>

                  {event.ticket_tiers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {event.ticket_tiers.map((tier) => {
                        const isSelected = selectedTier?.id === tier.id;
                        return (
                          <div
                            key={tier.id}
                            className={`rounded-lg border p-4 flex flex-col justify-between gap-4 transition-colors ${
                              !tier.is_purchasable
                                ? "border-border/40 bg-muted/20 opacity-75"
                                : isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                : "border-border/60 bg-background hover:border-primary/40"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-bold px-2 py-1 rounded-md"
                                >
                                  {tier.category_label}
                                </Badge>
                                <Badge
                                  variant={tier.is_purchasable ? "default" : "outline"}
                                  className={`text-xs font-bold px-2 py-1 rounded-md ${
                                    tier.lifecycle_state === "SOLD_OUT" ||
                                    tier.lifecycle_state === "ENDED"
                                      ? "border-destructive/40 text-destructive"
                                      : ""
                                  }`}
                                >
                                  {tier.lifecycle_badge_label}
                                </Badge>
                              </div>

                              <h3 className="text-base font-bold text-foreground break-words">
                                {tier.name}
                              </h3>

                              {tier.eligibility_rule && (
                                <p className="text-xs font-medium text-muted-foreground break-words">
                                  {tier.eligibility_rule}
                                </p>
                              )}
                            </div>

                            <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-3">
                              <div>
                                <span
                                  className={`text-lg font-black tabular-nums ${
                                    tier.is_free ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                                  }`}
                                >
                                  {tier.price_display}
                                </span>
                                {tier.capacity > 0 && tier.is_purchasable && (
                                  <p className="text-xs text-muted-foreground">
                                    {tier.remaining_count} vagas restantes
                                  </p>
                                )}
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                variant={isSelected ? "default" : "outline"}
                                disabled={!tier.is_purchasable}
                                onClick={() => handleOpenCheckout(tier)}
                                className="h-11 min-h-11 rounded-lg font-bold text-xs px-4 focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                {!tier.is_purchasable
                                  ? tier.lifecycle_badge_label
                                  : tier.external_url
                                  ? "Comprar Externo"
                                  : tier.is_free
                                  ? "Garantir Vaga"
                                  : "Selecionar"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground">
                          {event.has_free_tier
                            ? "Inscrição Gratuita"
                            : "Garanta sua participação"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Emita sua credencial oficial com QR Code para acesso rápido na portaria.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => handleOpenCheckout(null)}
                        className="h-11 min-h-11 rounded-lg font-bold text-xs px-5 focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {event.external_ticket_url
                          ? "Acessar Inscrição Externa"
                          : "Garantir Credencial"}
                      </Button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* SECTION: PROGRAMAÇÃO & CRONOGRAMA MULTI-DIA COM PALESTRANTES VINCULADOS */}
            {event.schedule.length > 0 && (
              <section id="section-programacao" className="scroll-mt-20 space-y-4">
                <div className="py-2 sm:bg-card sm:rounded-lg sm:border sm:border-border/60 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="size-5 text-primary shrink-0" />
                      <h2 className="text-xl font-black tracking-tight text-foreground">
                        Programação Oficial
                      </h2>
                    </div>

                    {/* Multi-Day Selector Tabs */}
                    {event.schedule_days.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto flex-nowrap no-scrollbar tab-list" role="tablist">
                        {event.schedule_days.map((dayGroup) => {
                          const active = dayGroup.day_key === activeDayGroup?.day_key;
                          return (
                            <button
                              key={dayGroup.day_key}
                              type="button"
                              onClick={() => setSelectedScheduleDayKey(dayGroup.day_key)}
                              className={`h-11 min-h-11 px-4 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {dayGroup.day_label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {(activeDayGroup?.items || event.schedule).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border/60 bg-background p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-4 hover:border-primary/40 transition-colors"
                      >
                        {/* Time Pill */}
                        <div className="shrink-0 flex sm:flex-col items-center sm:items-start gap-2 sm:w-28">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-primary/10 text-primary font-mono text-xs font-black tabular-nums">
                            {item.time}
                            {item.end_time ? ` - ${item.end_time}` : ""}
                          </span>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {item.type_label}
                          </Badge>
                        </div>

                        {/* Activity Content + Linked Speaker */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-base font-bold text-foreground break-words">
                              {item.title}
                            </h3>
                            {item.stage_or_room && (
                              <Badge variant="secondary" className="text-xs font-semibold">
                                {item.stage_or_room}
                              </Badge>
                            )}
                          </div>

                          {item.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words whitespace-pre-line">
                              {item.description}
                            </p>
                          )}

                          {/* Linked Speaker Card */}
                          {item.linked_speaker ? (
                            <div className="pt-2 flex items-center gap-3">
                              {item.linked_speaker.photo_url ? (
                                <img
                                  src={item.linked_speaker.photo_url}
                                  alt={item.linked_speaker.name}
                                  className="size-9 rounded-full object-cover border border-border shrink-0"
                                />
                              ) : (
                                <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                  {item.linked_speaker.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground break-words">
                                  {item.linked_speaker.name}
                                </p>
                                {(item.linked_speaker.role || item.linked_speaker.company) && (
                                  <p className="text-xs text-muted-foreground break-words">
                                    {[item.linked_speaker.role, item.linked_speaker.company]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : item.speaker_name ? (
                            <div className="pt-1 flex items-center gap-2 text-xs font-semibold text-primary">
                              <Mic className="size-3 shrink-0" />
                              <span className="break-words">{item.speaker_name}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* SECTION: PALESTRANTES, CONVIDADOS & ATRAÇÕES (ZERO BIO TRUNCATION) */}
            {event.speakers.length > 0 && (
              <section id="section-palestrantes" className="scroll-mt-20 space-y-4">
                <div className="py-2 sm:bg-card sm:rounded-lg sm:border sm:border-border/60 sm:p-6 space-y-5">
                  <div className="flex items-center gap-2">
                    <Mic className="size-5 text-primary shrink-0" />
                    <h2 className="text-xl font-black tracking-tight text-foreground">
                      Palestrantes e Atrações Confirmadas
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {event.speakers.map((speaker) => (
                      <div
                        key={speaker.id}
                        className="rounded-lg border border-border/60 bg-background p-5 flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start gap-4">
                            {speaker.photo_url ? (
                              <img
                                src={speaker.photo_url}
                                alt={speaker.name}
                                className="size-16 rounded-lg object-cover border border-border shrink-0"
                              />
                            ) : (
                              <div className="size-16 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xl shrink-0">
                                {speaker.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1 space-y-1">
                              <h3 className="text-base font-bold text-foreground break-words">
                                {speaker.name}
                              </h3>
                              {speaker.role && (
                                <p className="text-xs font-bold text-primary break-words">
                                  {speaker.role}
                                </p>
                              )}
                              {speaker.company && (
                                <p className="text-xs font-medium text-muted-foreground break-words">
                                  {speaker.company}
                                </p>
                              )}
                            </div>
                          </div>

                          {speaker.bio && (
                            <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line leading-relaxed break-words">
                              {speaker.bio}
                            </p>
                          )}
                        </div>

                        {speaker.social_url && (
                          <div className="pt-2 border-t border-border/40">
                            <a
                              href={speaker.social_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 h-11 min-h-11 px-3 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                              <ExternalLink className="size-4" />
                              <span>Ver perfil / Rede social</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* SECTION: MÍDIA, GALERIA EXCLUSIVA DO EVENTO & VÍDEO */}
            {(event.gallery_images.length > 0 || event.video_url || event.story_url) && (
              <section id="section-midia" className="scroll-mt-20 space-y-4">
                <div className="py-2 sm:bg-card sm:rounded-lg sm:border sm:border-border/60 sm:p-6 space-y-5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="size-5 text-primary shrink-0" />
                      <h2 className="text-xl font-black tracking-tight text-foreground">
                        Mídia e Galeria do Evento
                      </h2>
                    </div>
                    {event.story_url && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStoryViewerOpen(true)}
                        className="h-11 min-h-11 rounded-lg text-xs font-bold gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <Play className="size-4 text-primary" />
                        <span>Assistir Story Vertical (9:16)</span>
                      </Button>
                    )}
                  </div>

                  {/* Gallery Grid */}
                  {event.gallery_images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {event.gallery_images.map((imgUrl, idx) => (
                        <button
                          key={`${imgUrl}-${idx}`}
                          type="button"
                          onClick={() => setLightboxImageUrl(imgUrl)}
                          className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-border/60 bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <img
                            src={imgUrl}
                            alt={`${event.title} - Mídia ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Official Event Video */}
                  {event.video_url && (
                    <div className="pt-2 space-y-2">
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Play className="size-4 text-primary" />
                        <span>Vídeo / Aftermovie Oficial</span>
                      </h3>
                      <div className="aspect-video w-full rounded-lg overflow-hidden border border-border/60 bg-foreground">
                        {event.video_url.includes("youtube.com") ||
                        event.video_url.includes("youtu.be") ? (
                          <iframe
                            src={event.video_url
                              .replace("watch?v=", "embed/")
                              .replace("youtu.be/", "youtube.com/embed/")}
                            title={event.title}
                            className="w-full h-full"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            src={event.video_url}
                            controls
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* SECTION: ENQUETES INTERATIVAS COM AGENDAMENTO */}
            {event.surveys.length > 0 && (
              <section id="section-enquetes" className="scroll-mt-20 space-y-4">
                <div className="py-2 sm:bg-card sm:rounded-lg sm:border sm:border-border/60 sm:p-6 space-y-5">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="size-5 text-primary shrink-0" />
                    <h2 className="text-xl font-black tracking-tight text-foreground">
                      Enquetes Oficiais
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {event.surveys.map((survey) => {
                      const userVotedOptionId = votedPolls[survey.id];
                      const isOpen = survey.lifecycle_state === "OPEN";
                      const totalVotes =
                        survey.total_votes + (userVotedOptionId ? 1 : 0);

                      return (
                        <div
                          key={survey.id}
                          className="rounded-lg border border-border/60 bg-background p-5 space-y-4"
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <h3 className="text-base font-bold text-foreground break-words">
                              {survey.question}
                            </h3>
                            <Badge
                              variant={isOpen ? "default" : "outline"}
                              className="text-xs font-bold"
                            >
                              {survey.lifecycle_label}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {survey.options.map((opt) => {
                              const isVoted = userVotedOptionId === opt.id;
                              const effectiveVotes = opt.votes + (isVoted ? 1 : 0);
                              const pct =
                                totalVotes > 0
                                  ? Math.round((effectiveVotes / totalVotes) * 100)
                                  : 0;

                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  disabled={!isOpen || Boolean(userVotedOptionId) || voteMutation.isPending}
                                  onClick={() =>
                                    voteMutation.mutate({
                                      surveyId: survey.id,
                                      optionId: opt.id,
                                    })
                                  }
                                  className={`relative w-full min-h-11 p-3 rounded-lg border text-left overflow-hidden transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                    isVoted
                                      ? "border-primary bg-primary/5"
                                      : "border-border/60 hover:border-primary/40 bg-card"
                                  }`}
                                >
                                  <div
                                    className="absolute inset-y-0 left-0 bg-primary/10 transition-transform duration-500 motion-reduce:transition-none"
                                    style={{ width: `${pct}%` }}
                                  />
                                  <div className="relative flex items-center justify-between gap-3 text-xs sm:text-sm">
                                    <span className="font-semibold text-foreground flex items-center gap-2 break-words">
                                      {isVoted && (
                                        <CheckCircle2 className="size-4 text-primary shrink-0" />
                                      )}
                                      {opt.text}
                                    </span>
                                    <span className="font-mono font-bold text-muted-foreground shrink-0 tabular-nums">
                                      {pct}% ({effectiveVotes})
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* SECTION: LOCALIZAÇÃO, MAPA & MÚLTIPLOS PONTOS DE ACESSO */}
            <section id="section-local" className="scroll-mt-20 space-y-4">
              <div className="py-2 sm:bg-card sm:rounded-lg sm:border sm:border-border/60 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-5 text-primary shrink-0" />
                    <h2 className="text-xl font-black tracking-tight text-foreground">
                      Localização e Pontos de Acesso
                    </h2>
                  </div>
                  <a
                    href={event.primary_map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 h-11 min-h-11 px-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-colors w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Navigation className="size-4" />
                    <span>Como Chegar (Google Maps)</span>
                  </a>
                </div>

                {/* Primary Venue Card */}
                <div className="py-3 border-t border-border/40 sm:p-4 sm:rounded-lg sm:border sm:border-border/60 sm:bg-background space-y-2">
                  <Badge variant="secondary" className="text-xs font-bold">
                    Local Principal
                  </Badge>
                  <h3 className="text-base font-bold text-foreground break-words">
                    {event.venue_name}
                  </h3>
                  <p className="text-sm text-muted-foreground break-words">
                    {canonicalVenueAddress?.display ||
                      [event.venue_address, `${event.city} - ${event.state}`]
                        .filter(Boolean)
                        .join(" • ")}
                  </p>
                </div>

                {/* Mapa real do local (coordenadas persistidas do evento) */}
                {typeof event.latitude === "number" && typeof event.longitude === "number" && (
                  <div className="w-full aspect-[16/9] sm:aspect-[21/9] rounded-lg overflow-hidden border border-border/60 bg-muted/20">
                    <MapLibreCanvas
                      initialCenter={[event.longitude, event.latitude]}
                      initialZoom={15}
                      markers={[
                        {
                          id: "event-venue",
                          lat: event.latitude,
                          lng: event.longitude,
                          title: event.venue_name,
                        },
                      ]}
                      className="size-full"
                    />
                  </div>
                )}

                {/* Multiple Access Points (Credenciamento, Estacionamento, Entrada VIP, PCD) */}
                {event.access_points.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Acessos, Portarias e Estacionamentos do Evento
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {event.access_points.map((ap) => (
                        <div
                          key={ap.id}
                          className="p-4 rounded-lg border border-border/60 bg-background flex flex-col justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <Badge variant="outline" className="text-xs font-semibold">
                              {ap.type_label}
                            </Badge>
                            <p className="text-sm font-bold text-foreground break-words">
                              {ap.label}
                            </p>
                            {ap.address && (
                              <p className="text-xs text-muted-foreground break-words">
                                {ap.address}
                              </p>
                            )}
                            {ap.instructions && (
                              <p className="text-xs text-muted-foreground/90 break-words">
                                {ap.instructions}
                              </p>
                            )}
                          </div>
                          <a
                            href={ap.map_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 h-11 min-h-11 px-3 rounded-lg border border-border/60 hover:border-primary/40 text-xs font-bold text-primary w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <ExternalLink className="size-3" />
                            <span>Ver no Mapa</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Parking & Accessibility Summary inside Location */}
                {(event.policies.parking_info || event.policies.accessibility_info) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {event.policies.parking_info && (
                      <div className="py-3 border-t border-border/40 sm:p-4 sm:rounded-lg sm:bg-muted/30 sm:border sm:border-border/50 space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <Car className="size-4 text-primary shrink-0" />
                          <span>Estacionamento</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed break-words">
                          {event.policies.parking_info}
                        </p>
                      </div>
                    )}
                    {event.policies.accessibility_info && (
                      <div className="py-3 border-t border-border/40 sm:p-4 sm:rounded-lg sm:bg-muted/30 sm:border sm:border-border/50 space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <Accessibility className="size-4 text-primary shrink-0" />
                          <span>Acessibilidade (PCD)</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed break-words">
                          {event.policies.accessibility_info}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* SECTION: PARCEIROS, PATROCINADORES & APOIO (RECTANGULAR CONTAIN LOGOS) */}
            {event.sponsors.length > 0 && (
              <section id="section-parceiros" className="scroll-mt-20 space-y-4">
                <div className="py-2 sm:bg-card sm:rounded-lg sm:border sm:border-border/60 sm:p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <Award className="size-5 text-primary shrink-0" />
                    <h2 className="text-xl font-black tracking-tight text-foreground">
                      Patrocinadores e Apoiadores
                    </h2>
                  </div>

                  {(
                    ["realizacao", "ouro", "prata", "apoio", "parceiro_midia"] as const
                  ).map((tierKey) => {
                    const tierSponsors = event.sponsors.filter((s) => s.tier === tierKey);
                    if (tierSponsors.length === 0) return null;
                    return (
                      <div key={tierKey} className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">
                          {tierSponsors[0].tier_label}
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          {tierSponsors.map((sp) => {
                            const cardInner = (
                              <div className="rounded-lg border border-border/60 bg-background p-4 flex flex-col items-center justify-center gap-3 h-32 hover:border-primary/40 transition-colors text-center">
                                {sp.logo_url ? (
                                  <img
                                    src={sp.logo_url}
                                    alt={sp.name}
                                    className="max-h-14 max-w-full object-contain"
                                  />
                                ) : (
                                  <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                    <Building2 className="size-5" />
                                  </div>
                                )}
                                <span className="text-xs font-bold text-foreground break-words leading-tight">
                                  {sp.name}
                                </span>
                              </div>
                            );

                            return sp.website_url ? (
                              <a
                                key={sp.id}
                                href={sp.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
                              >
                                {cardInner}
                              </a>
                            ) : (
                              <div key={sp.id}>{cardInner}</div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* SECTION: POLÍTICAS E DIRETRIZES OFICIAIS */}
            {event.has_policies && (
              <section id="section-politicas" className="scroll-mt-20 space-y-4">
                <div className="py-2 sm:bg-card sm:rounded-lg sm:border sm:border-border/60 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Info className="size-5 text-primary shrink-0" />
                    <h2 className="text-xl font-black tracking-tight text-foreground">
                      Políticas e Diretrizes do Evento
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {event.policies.refund_policy && (
                      <div className="py-3 border-t border-border/40 sm:p-4 sm:rounded-lg sm:border sm:border-border/60 sm:bg-background space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <RefreshCcw className="size-4 text-primary shrink-0" />
                          <span>Cancelamento e Reembolso</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed break-words">
                          {event.policies.refund_policy}
                        </p>
                      </div>
                    )}
                    {event.policies.half_price_policy && (
                      <div className="py-3 border-t border-border/40 sm:p-4 sm:rounded-lg sm:border sm:border-border/60 sm:bg-background space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <BadgePercent className="size-4 text-primary shrink-0" />
                          <span>Meia-Entrada e Benefícios</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed break-words">
                          {event.policies.half_price_policy}
                        </p>
                      </div>
                    )}
                    {event.policies.accessibility_info && (
                      <div className="py-3 border-t border-border/40 sm:p-4 sm:rounded-lg sm:border sm:border-border/60 sm:bg-background space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <Accessibility className="size-4 text-primary shrink-0" />
                          <span>Acessibilidade</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed break-words">
                          {event.policies.accessibility_info}
                        </p>
                      </div>
                    )}
                    {event.policies.parking_info && (
                      <div className="py-3 border-t border-border/40 sm:p-4 sm:rounded-lg sm:border sm:border-border/60 sm:bg-background space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <Car className="size-4 text-primary shrink-0" />
                          <span>Estacionamento e Acesso</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed break-words">
                          {event.policies.parking_info}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* MURAL DE PARTICIPANTES & DEPOIMENTOS */}
            {(totalConfirmed > 0 || testimonials.length > 0) && (
              <section className="py-2 sm:bg-card sm:rounded-lg sm:border sm:border-border/60 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Users className="size-5 text-primary shrink-0" />
                    <h2 className="text-lg font-black text-foreground">
                      Comunidade e Participantes ({totalConfirmed})
                    </h2>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTestimonialOpen(true)}
                    className="h-11 min-h-11 rounded-lg text-xs font-bold gap-2 focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Plus className="size-4" />
                    <span>Deixar Depoimento</span>
                  </Button>
                </div>

                {attendees.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attendees.map((att: any) => (
                      <div
                        key={att.id}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 border border-border/60 text-xs font-medium"
                      >
                        <CheckCircle2 className="size-3 text-emerald-500" />
                        <span>{att.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {testimonials.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {testimonials.map((t: any) => (
                      <div
                        key={t.id}
                        className="py-3 border-t border-border/40 sm:p-4 sm:rounded-lg sm:border sm:border-border/60 sm:bg-background space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">
                            {t.authorName}
                          </span>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: t.rating || 5 }).map((_, idx) => (
                              <Star
                                key={idx}
                                className="size-3 fill-amber-400 text-amber-400"
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground break-words">
                          "{t.comment}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* RIGHT SIDEBAR: STICKY CONVERSION BOX & MULTIPLE ORGANIZERS (4 cols on Desktop) */}
          <aside
            className={
              effectiveIsDesktop
                ? "lg:col-span-4 lg:sticky lg:top-20 space-y-6"
                : "space-y-6"
            }
          >
            {/* Ticket Conversion Card */}
            <div className="py-2 sm:bg-card sm:rounded-lg sm:border sm:border-border/60 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                    Inscrições & Ingressos
                  </span>
                  <h3 className="text-lg font-black text-foreground mt-1">
                    {event.all_tickets_sold_out
                      ? "Ingressos Esgotados"
                      : selectedTier
                      ? selectedTier.price_display
                      : event.has_free_tier
                      ? "GRÁTIS"
                      : event.lowest_active_price_cents !== null
                      ? formatMoney(event.lowest_active_price_cents)
                      : "Sob Consulta"}
                  </h3>
                  {selectedTier?.eligibility_rule && (
                    <p className="text-xs font-medium text-muted-foreground mt-1 break-words">
                      {selectedTier.eligibility_rule}
                    </p>
                  )}
                </div>
                <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Ticket className="size-5" />
                </div>
              </div>

              {/* Quick Lot Selector in Sidebar */}
              {event.ticket_tiers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Selecione o Ingresso / Lote
                  </Label>
                  <div className="space-y-2">
                    {event.ticket_tiers.map((tier) => {
                      const isSelected = selectedTier?.id === tier.id;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          disabled={!tier.is_purchasable}
                          onClick={() => setSelectedTierId(tier.id)}
                          className={`w-full p-3 rounded-lg border text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            !tier.is_purchasable
                              ? "border-border/40 bg-muted/20 opacity-60 cursor-not-allowed"
                              : isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-border/60 hover:border-primary/40 bg-background"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-foreground break-words">
                              {tier.name}
                            </span>
                            <span
                              className={`text-xs font-black tabular-nums shrink-0 ${
                                tier.is_free
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-primary"
                              }`}
                            >
                              {tier.price_display}
                            </span>
                          </div>
                          {tier.eligibility_rule && (
                            <p className="text-xs text-muted-foreground mt-1 break-words">
                              {tier.eligibility_rule}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                            <span>{tier.category_label}</span>
                            <span className="font-semibold">{tier.lifecycle_badge_label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Primary CTA (Single Primary Action per Surface - Rule B.8) */}
              <Button
                type="button"
                disabled={event.all_tickets_sold_out}
                onClick={() => handleOpenCheckout(selectedTier)}
                className="w-full h-11 min-h-11 rounded-lg font-bold text-sm gap-2 focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Ticket className="size-4" />
                <span>
                  {event.all_tickets_sold_out
                    ? "Lotes Esgotados"
                    : selectedTier?.external_url || event.external_ticket_url
                    ? "Comprar no Site Oficial"
                    : selectedTier?.is_free || event.has_free_tier
                    ? "Garantir Ingresso Gratuito"
                    : "Comprar Ingresso"}
                </span>
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground text-center">
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                <span>Credencial digital Waesy com QR Code antifraude</span>
              </div>
            </div>

            {/* Multiple Organizers & Realizers Card (Honest Verification - Rule B.33) */}
            <div className="py-2 sm:bg-card sm:rounded-lg sm:border sm:border-border/60 sm:p-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Realização e Organização
              </h4>

              <div className="space-y-3">
                {event.organizers.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background"
                  >
                    {org.avatar_url ? (
                      <img
                        src={org.avatar_url}
                        alt={org.name}
                        className={`size-12 shrink-0 border border-border/60 ${
                          org.entity_type === "PERSON"
                            ? "rounded-full object-cover"
                            : "rounded-lg object-contain bg-card p-1"
                        }`}
                      />
                    ) : (
                      <div className="size-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-base shrink-0">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                        {org.role_label}
                      </span>
                      <p className="text-sm font-bold text-foreground break-words">
                        {org.name}
                      </p>
                      {org.is_verified && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                          <CheckCircle2 className="size-3 shrink-0" />
                          <span>Organizador Verificado</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {event.primary_organizer.phone && (
                <a
                  href={`https://wa.me/55${event.primary_organizer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Olá! Gostaria de informações sobre o evento "${event.title}".`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-11 min-h-11 rounded-lg border border-border/60 hover:bg-muted/50 text-xs font-bold text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <MessageCircle className="size-4 text-emerald-500" />
                  <span>Falar com a Organização</span>
                </a>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* MOBILE STICKY BOTTOM BAR (Z-30 PER RULE B.34) */}
      {!effectiveIsDesktop && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-md border-t border-border/60 p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-muted-foreground block">
              {selectedTier ? selectedTier.name : "Inscrição"}
            </span>
            <span className="text-base font-black text-foreground tabular-nums">
              {selectedTier
                ? selectedTier.price_display
                : event.has_free_tier
                ? "GRÁTIS"
                : event.lowest_active_price_cents !== null
                ? formatMoney(event.lowest_active_price_cents)
                : "Consultar"}
            </span>
          </div>
          <Button
            type="button"
            disabled={event.all_tickets_sold_out}
            onClick={() => handleOpenCheckout(selectedTier)}
            className="h-11 min-h-11 rounded-lg font-bold text-xs px-5 gap-2 shrink-0 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Ticket className="size-4" />
            <span>
              {event.all_tickets_sold_out
                ? "Esgotado"
                : selectedTier?.is_free || event.has_free_tier
                ? "Garantir Vaga"
                : "Comprar Ingresso"}
            </span>
          </Button>
        </div>
      )}

      {/* DIALOG: LIGHTBOX FOR EXCLUSIVE EVENT GALLERY */}
      <Dialog
        open={Boolean(lightboxImageUrl)}
        onOpenChange={(open) => !open && setLightboxImageUrl(null)}
      >
        <DialogContent className="sm:max-w-3xl rounded-lg p-3 bg-background border border-border">
          <DialogHeader className="sr-only">
            <DialogTitle>Visualização de Mídia — {event.title}</DialogTitle>
            <DialogDescription>Foto ampliada da galeria do evento.</DialogDescription>
          </DialogHeader>
          {lightboxImageUrl && (
            <img
              src={lightboxImageUrl}
              alt={event.title}
              className="w-full max-h-[80vh] object-contain rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: STORY VERTICAL (9:16) */}
      <Dialog open={storyViewerOpen} onOpenChange={setStoryViewerOpen}>
        <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-lg bg-foreground border-border/40">
          <DialogHeader className="sr-only">
            <DialogTitle>Story Oficial — {event.title}</DialogTitle>
            <DialogDescription>Destaque vertical 9:16 do evento.</DialogDescription>
          </DialogHeader>
          <div className="relative aspect-[9/16] w-full bg-foreground flex items-center justify-center">
            {event.story_url &&
            (event.story_url.endsWith(".mp4") || event.story_url.endsWith(".webm")) ? (
              <video
                src={event.story_url}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : event.story_url ? (
              <img
                src={event.story_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: CHECKOUT & EMISSÃO DE INGRESSO QR */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="sm:max-w-lg rounded-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <Ticket className="size-5 text-primary" />
              <span>
                {issuedResult ? "Seu Ingresso Digital QR" : "Inscrição e Emissão de Ingresso"}
              </span>
            </DialogTitle>
            <DialogDescription>
              {issuedResult
                ? "Apresente o código abaixo na portaria do evento."
                : `${event.title} • ${selectedTier ? selectedTier.name : "Inscrição Geral"}`}
            </DialogDescription>
          </DialogHeader>

          {!issuedResult ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-primary">
                    {selectedTier ? selectedTier.name : "Ingresso Individual"}
                  </p>
                  {selectedTier?.eligibility_rule && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedTier.eligibility_rule}
                    </p>
                  )}
                  <p className="text-lg font-black text-foreground mt-1">
                    {selectedTier ? selectedTier.price_display : "GRÁTIS"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTicketQty(Math.max(1, ticketQty - 1))}
                    className="size-11 min-h-11 min-w-11 rounded-lg font-bold"
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-bold text-sm tabular-nums">
                    {ticketQty}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTicketQty(
                        Math.min(selectedTier?.max_per_order || 10, ticketQty + 1)
                      )
                    }
                    className="size-11 min-h-11 min-w-11 rounded-lg font-bold"
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Nome Completo do Participante *</Label>
                  <Input
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="h-11 min-h-11 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">WhatsApp *</Label>
                    <Input
                      value={buyerWhatsapp}
                      onChange={(e) => setBuyerWhatsapp(e.target.value)}
                      placeholder="(49) 99999-9999"
                      className="h-11 min-h-11 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">CPF (Opcional)</Label>
                    <Input
                      value={buyerDocument}
                      onChange={(e) => setBuyerDocument(e.target.value)}
                      placeholder="000.000.000-00"
                      className="h-11 min-h-11 rounded-lg"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">E-mail (Opcional)</Label>
                  <Input
                    type="email"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="h-11 min-h-11 rounded-lg"
                  />
                </div>
              </div>

              <Button
                type="button"
                disabled={checkoutMutation.isPending}
                onClick={() => {
                  if (buyerName.trim().length < 2) {
                    toast.error("Informe o nome completo.");
                    return;
                  }
                  if (buyerWhatsapp.trim().length < 8) {
                    toast.error("Informe um WhatsApp válido.");
                    return;
                  }
                  checkoutMutation.mutate({
                    classifiedId: event.id,
                    tierId: selectedTier?.id || "general",
                    tierName: selectedTier?.name || "Ingresso Geral",
                    quantity: ticketQty,
                    unitPriceCents: selectedTier?.price_cents || 0,
                    buyerName: buyerName.trim(),
                    buyerWhatsapp: buyerWhatsapp.trim(),
                    buyerDocument: buyerDocument.trim() || undefined,
                    buyerEmail: buyerEmail.trim() || undefined,
                    paymentMethod:
                      (selectedTier?.price_cents || 0) === 0 ? "free" : paymentMethod,
                  });
                }}
                className="w-full h-11 min-h-11 rounded-lg font-bold text-sm gap-2"
              >
                <QrCode className="size-4" />
                <span>
                  {checkoutMutation.isPending
                    ? "Emitindo Credencial..."
                    : "Confirmar e Gerar QR Code"}
                </span>
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {issuedResult.tickets?.map((tkt: any) => (
                <div
                  key={tkt.code}
                  className="p-4 rounded-lg border-2 border-primary/40 bg-primary/5 flex flex-col items-center text-center space-y-3"
                >
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 font-bold">
                    CREDENCIAL VÁLIDA
                  </Badge>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                      tkt.qrPayload
                    )}`}
                    alt={`QR Code ${tkt.code}`}
                    className="size-40 rounded-lg border border-border p-2 bg-card"
                  />
                  <p className="font-mono text-base font-black tracking-wider text-primary">
                    {tkt.code}
                  </p>
                </div>
              ))}
              {issuedResult.pixCopyPaste && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-2">
                  <Label className="text-xs font-bold">Chave PIX do Organizador</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={issuedResult.pixCopyPaste}
                      className="h-11 min-h-11 text-xs font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(issuedResult.pixCopyPaste);
                        setCopiedPix(true);
                        toast.success("Chave PIX copiada!");
                      }}
                      className="h-11 min-h-11 px-3"
                    >
                      {copiedPix ? <Check className="size-4" /> : <Copy className="size-4" />}
                    </Button>
                  </div>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setCheckoutOpen(false)}
                className="w-full h-11 min-h-11 rounded-lg font-bold"
              >
                Concluir
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: PORTARIA & VALIDADOR DE INGRESSOS */}
      <Dialog open={validatorOpen} onOpenChange={setValidatorOpen}>
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-black">
              <QrCode className="size-5 text-primary" />
              <span>Validador de Credenciais</span>
            </DialogTitle>
            <DialogDescription>
              Digite o código do ingresso (ex: WSY-EVT-XXXXXX) para validar autenticidade.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                value={verifyCodeInput}
                onChange={(e) => setVerifyCodeInput(e.target.value.toUpperCase())}
                placeholder="WSY-EVT-XXXXXX"
                className="h-11 min-h-11 font-mono uppercase rounded-lg"
              />
              <Button
                type="button"
                disabled={verifyMutation.isPending || verifyCodeInput.trim().length < 4}
                onClick={() => verifyMutation.mutate(verifyCodeInput.trim())}
                className="h-11 min-h-11 rounded-lg font-bold px-4"
              >
                Validar
              </Button>
            </div>
            {verifyResult && (
              <div
                className={`p-4 rounded-lg border text-xs space-y-1 ${
                  verifyResult.valid
                    ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}
              >
                <p className="font-bold">{verifyResult.message}</p>
                {verifyResult.valid && (
                  <>
                    <p>Participante: {verifyResult.buyerName}</p>
                    <p>Lote: {verifyResult.tierName}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG: NOVO DEPOIMENTO */}
      <Dialog open={testimonialOpen} onOpenChange={setTestimonialOpen}>
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="font-black">Publicar Depoimento</DialogTitle>
            <DialogDescription>
              Compartilhe sua expectativa ou avaliação sobre {event.title}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Seu Nome</Label>
              <Input
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Como deseja aparecer"
                className="h-11 min-h-11 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Comentário</Label>
              <Textarea
                value={testComment}
                onChange={(e) => setTestComment(e.target.value)}
                rows={3}
                className="rounded-lg text-xs"
              />
            </div>
            <Button
              type="button"
              disabled={testimonialMutation.isPending}
              onClick={() =>
                testimonialMutation.mutate({
                  classifiedId: event.id,
                  authorName: testName.trim(),
                  rating: testRating,
                  comment: testComment.trim(),
                })
              }
              className="w-full h-11 min-h-11 rounded-lg font-bold text-xs gap-2"
            >
              <Send className="size-4" />
              <span>Publicar no Mural</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
