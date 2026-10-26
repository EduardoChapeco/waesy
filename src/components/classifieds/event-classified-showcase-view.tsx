import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Share2,
  ExternalLink,
  ShieldCheck,
  Users,
  Mic,
  HelpCircle,
  CheckCircle2,
  Building,
  Navigation,
  Car,
  Coffee,
  Download,
  Edit3,
  Phone,
  Check,
  Sparkles,
  Info,
  ChevronRight,
  Send,
  Loader2,
  X,
  Play,
  Volume2,
  VolumeX,
  Smartphone,
} from "lucide-react";

function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);
}
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SquircleCard } from "@/components/ui/squircle-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  registerClassifiedEventLead,
  submitClassifiedEventSurveyVote,
  getClassifiedEventSurveyResults,
  type SurveyVoteResponseItem,
} from "@/services/classifieds-events.functions";

export interface EventTicketTier {
  id: string;
  name: string;
  price_cents?: number;
  price?: number;
  external_url?: string;
  purchase_url?: string;
  batch?: string;
  description?: string;
  status?: "available" | "active" | "sold_out" | "coming_soon";
  included_items?: string[];
}

export interface EventScheduleItem {
  id: string;
  time: string;
  end_time?: string;
  stage_or_room?: string;
  stage?: string;
  title: string;
  description?: string;
  speaker_name?: string;
  speaker_role?: string;
  speaker_photo?: string;
  is_break?: boolean;
}

export interface EventSpeaker {
  id: string;
  name: string;
  role: string;
  photo_url?: string;
  avatar_url?: string;
  company?: string;
  bio?: string;
  social_link?: string;
  social_url?: string;
}

export interface EventSponsor {
  id: string;
  name: string;
  tier: "master" | "ouro" | "prata" | "apoio";
  logo_url?: string;
  website_url?: string;
}

export interface EventSurvey {
  id: string;
  question: string;
  options: string[];
  allow_anonymous?: boolean;
  is_active?: boolean;
  active?: boolean;
}

export interface EventClassifiedShowcaseViewProps {
  classified: any;
  isOwner?: boolean;
  onEditClassified?: () => void;
}

export function EventClassifiedShowcaseView({
  classified,
  isOwner = false,
  onEditClassified,
}: EventClassifiedShowcaseViewProps) {
  const attrs = classified.attributes || {};

  // Formatação de Datas e Horários
  const eventDateRaw = attrs.event_date || classified.event_date;
  const eventEndDateRaw = attrs.end_date || classified.end_date;
  const startTime = attrs.start_time || "09:00";
  const endTime = attrs.end_time;
  const gatesOpenTime = attrs.gates_open_time;

  const dateObject = useMemo(() => {
    if (!eventDateRaw) return null;
    const [y, m, d] = String(eventDateRaw).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }, [eventDateRaw]);

  const formattedDate = useMemo(() => {
    if (!dateObject) return "Data a definir";
    return dateObject.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [dateObject]);

  const dayNumber = dateObject ? String(dateObject.getDate()).padStart(2, "0") : "--";
  const monthAbbr = dateObject
    ? dateObject.toLocaleDateString("pt-BR", { month: "short" }).toUpperCase()
    : "DATA";

  // Localização
  const venueName = attrs.venue_name || classified.location_name || "Local a confirmar";
  const venueAddress = attrs.venue_address || classified.location_text || "";
  const cityState = [classified.city, classified.state].filter(Boolean).join(" - ");

  // Ingressos, Programação, Palestrantes e Patrocinadores
  const ticketTiers: EventTicketTier[] = Array.isArray(attrs.ticket_tiers) ? attrs.ticket_tiers : [];
  const schedule: EventScheduleItem[] = Array.isArray(attrs.schedule) ? attrs.schedule : [];
  const speakers: EventSpeaker[] = Array.isArray(attrs.speakers) ? attrs.speakers : [];
  const sponsors: EventSponsor[] = Array.isArray(attrs.sponsors) ? attrs.sponsors : [];
  const surveys: EventSurvey[] = Array.isArray(attrs.surveys) ? attrs.surveys : [];
  const policies = attrs.policies || {};

  // Mídia
  const bannerUrl = attrs.banner_image_url || classified.images?.[0] || "";
  const extraImages: string[] = Array.isArray(classified.images) ? classified.images : [];
  const videoUrl = attrs.video_url || "";

  // Dados do Story 9:16, Anfitrião (Luma style) e PWA
  const storyUrl = attrs.story_url || "";
  const storyAutoOpen = !!attrs.story_auto_open;
  const pwaEnabled = !!attrs.pwa_enabled;
  const hostName = attrs.host_name || classified.store?.name || classified.profiles?.full_name || "Organizador";
  const hostAvatarUrl = attrs.host_avatar_url || classified.store?.logo_url || classified.profiles?.avatar_url || "";
  const hostPhone = attrs.host_phone || classified.contact_whatsapp || "";
  const hostRole = attrs.host_role || "Anfitrião do Evento";

  // Estado do Story 9:16
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryMuted, setIsStoryMuted] = useState(false);
  const storyVideoRef = useRef<HTMLVideoElement | null>(null);

  // Auto-Abertura do Story (Respeita 1x por sessão para UX suave)
  useEffect(() => {
    if (storyUrl && storyAutoOpen && typeof window !== "undefined") {
      const key = `waesy_story_seen_${classified.id}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        setIsStoryOpen(true);
      }
    }
  }, [storyUrl, storyAutoOpen, classified.id]);

  // Temporizador para Story de Imagem
  useEffect(() => {
    if (!isStoryOpen || isVideoUrl(storyUrl)) return;
    setStoryProgress(0);
    const durationMs = 7000;
    const intervalMs = 100;
    const increment = (intervalMs / durationMs) * 100;

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev + increment >= 100) {
          clearInterval(timer);
          setIsStoryOpen(false);
          return 100;
        }
        return prev + increment;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isStoryOpen, storyUrl]);

  // Estado de Inscrição Rápida (Modal)
  const [selectedTicketForSignup, setSelectedTicketForSignup] = useState<EventTicketTier | null>(null);
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadWhatsapp, setLeadWhatsapp] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);

  // Estado de Enquetes ao Vivo
  const [votedSurveys, setVotedSurveys] = useState<Record<string, number>>({});
  const [isAnonymousVote, setIsAnonymousVote] = useState<Record<string, boolean>>({});
  const [surveyResults, setSurveyResults] = useState<
    Record<string, { totalVotes: number; percentages: Record<number, number>; responses?: SurveyVoteResponseItem[] }>
  >({});
  const [isVotingSurvey, setIsVotingSurvey] = useState(false);

  // Navegação Fluida por Âncoras do Menu de Abas (App Nativo Luma)
  const [activeSection, setActiveSection] = useState<string>("sobre");
  const [hostAvatarFailed, setHostAvatarFailed] = useState(false);
  const [storeLogoFailed, setStoreLogoFailed] = useState(false);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Carregamento Inicial dos Resultados das Enquetes ao Vivo
  useEffect(() => {
    if (surveys.length > 0 && classified.id) {
      surveys.forEach((survey) => {
        getClassifiedEventSurveyResults({
          data: { classifiedId: classified.id, surveyId: survey.id },
        })
          .then((res) => {
            if (res) {
              setSurveyResults((prev) => ({
                ...prev,
                [survey.id]: {
                  totalVotes: res.totalVotes,
                  percentages: res.percentages,
                  responses: res.responses || [],
                },
              }));
            }
          })
          .catch(() => null);
      });
    }
  }, [surveys, classified.id]);

  // Abertura do Modal de Inscrição
  const [issuedTicket, setIssuedTicket] = useState<{
    ticketCode: string;
    qrPayload: string;
    signature: string;
    pixCopyPaste: string | null;
    amountCents: number;
  } | null>(null);

  const handleOpenSignup = (tier?: EventTicketTier) => {
    setSelectedTicketForSignup(tier || null);
    setIsSignupModalOpen(true);
    setLeadSuccess(false);
    setIssuedTicket(null);
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim() || leadName.length < 2) {
      toast.error("Informe seu nome completo.");
      return;
    }
    if (!leadWhatsapp.trim() || leadWhatsapp.length < 8) {
      toast.error("Informe um WhatsApp válido para receber a confirmação.");
      return;
    }

    setIsSubmittingLead(true);
    try {
      const res = await registerClassifiedEventLead({
        data: {
          classifiedId: classified.id,
          name: leadName.trim(),
          whatsapp: leadWhatsapp.trim(),
          email: leadEmail.trim() || undefined,
          ticketTierId: selectedTicketForSignup?.id,
          ticketTierName: selectedTicketForSignup?.name,
          ticketTierPriceCents: selectedTicketForSignup?.price_cents,
          notes: leadNotes.trim() || undefined,
        },
      });

      if (res?.ticketCode) {
        setIssuedTicket({
          ticketCode: res.ticketCode,
          qrPayload: res.qrPayload,
          signature: res.signature,
          pixCopyPaste: res.pixCopyPaste || null,
          amountCents: res.amountCents || 0,
        });
      }
      setLeadSuccess(true);
      toast.success("Inscrição e bilhete criptográfico gerados com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível confirmar a sua inscrição.");
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Votação em Enquetes com Suporte a Anonimato
  const handleVoteSurvey = async (survey: EventSurvey, optionIndex: number, optionLabel: string) => {
    if (votedSurveys[survey.id] !== undefined) return;
    setIsVotingSurvey(true);
    try {
      const isAnon = isAnonymousVote[survey.id] ?? true;
      await submitClassifiedEventSurveyVote({
        data: {
          classifiedId: classified.id,
          surveyId: survey.id,
          optionIndex,
          optionLabel,
          isAnonymous: isAnon,
        },
      });

      setVotedSurveys((prev) => ({ ...prev, [survey.id]: optionIndex }));

      // Busca resultados atualizados com respostas para organizador
      const res = await getClassifiedEventSurveyResults({
        data: { classifiedId: classified.id, surveyId: survey.id },
      });

      if (res) {
        setSurveyResults((prev) => ({
          ...prev,
          [survey.id]: {
            totalVotes: res.totalVotes,
            percentages: res.percentages,
            responses: res.responses || [],
          },
        }));
      }
      toast.success("Voto computado com sucesso!");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao registrar voto na enquete.");
    } finally {
      setIsVotingSurvey(false);
    }
  };

  // Gerador de Arquivo de Calendário .ics (Download Direto)
  const handleDownloadCalendar = () => {
    if (!dateObject) {
      toast.error("Data do evento não configurada.");
      return;
    }

    const pad = (n: number) => String(n).padStart(2, "0");
    const y = dateObject.getFullYear();
    const m = pad(dateObject.getMonth() + 1);
    const d = pad(dateObject.getDate());

    const [startH, startMin] = startTime.split(":").map((v: string) => pad(Number(v) || 0));
    const [endH, endMin] = (endTime || "18:00").split(":").map((v: string) => pad(Number(v) || 0));

    const dtStart = `${y}${m}${d}T${startH}${startMin}00`;
    const dtEnd = `${y}${m}${d}T${endH}${endMin}00`;

    const summary = classified.title || "Evento Waesy";
    const desc = (classified.content || "").replace(/\n/g, "\\n");
    const loc = [venueName, venueAddress, cityState].filter(Boolean).join(", ");

    const icsData = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Waesy Inc//Waesy Events//PT",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:waesy-event-${classified.id}@waesy.com`,
      `DTSTAMP:${y}${m}${d}T000000Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      `LOCATION:${loc}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evento-${classified.id.slice(0, 8)}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Arquivo de calendário gerado! Abra para salvar na sua agenda.");
  };

  // Compartilhar
  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: classified.title,
          text: `Confira o evento ${classified.title} no Waesy`,
          url: window.location.href,
        })
        .catch(() => null);
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link do evento copiado para a área de transferência!");
    }
  };

  // Agrupamento de Patrocinadores por Cota
  const sponsorsByTier = useMemo(() => {
    return {
      master: sponsors.filter((s) => s.tier === "master"),
      ouro: sponsors.filter((s) => s.tier === "ouro"),
      prata: sponsors.filter((s) => s.tier === "prata"),
      apoio: sponsors.filter((s) => s.tier === "apoio"),
    };
  }, [sponsors]);

  return (
    <div className="w-full min-h-screen bg-background text-foreground pb-32 pb-safe">
      {/* ── 1. Hero Cinematográfico ── */}
      <section className="relative w-full border-b border-border/50 bg-card overflow-hidden">
        {bannerUrl ? (
          <div className="relative w-full h-64 sm:h-96 md:h-96 overflow-hidden bg-muted">
            <img
              src={bannerUrl}
              alt={classified.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-background/40 backdrop-blur-xs" />
          </div>
        ) : null}

        <div className={cn("max-w-6xl mx-auto px-4 sm:px-6 relative pb-8 space-y-6", bannerUrl ? "-mt-16 sm:-mt-24" : "pt-8 sm:pt-10")}>
          {/* Convite & Destaques de Abertura (Luma Style) */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
              <Sparkles className="size-3.5" />
              <span>Você foi convidado para participar</span>
            </div>
            {storyUrl && (
              <Badge variant="outline" className="rounded-full text-xs font-semibold py-1 px-3 border-primary/30 text-primary bg-primary/5">
                Story 9:16 Disponível
              </Badge>
            )}
          </div>

          {/* ── CABEÇALHO HERO: Título Não Comprimido em Linha Exclusiva ── */}
          <div className="flex items-start gap-4 sm:gap-6 w-full">
            {/* Card Calendário Squircle */}
            <div className="size-20 sm:size-24 rounded-2xl bg-background border border-border flex flex-col items-center justify-center shrink-0 text-center overflow-hidden">
              <span className="text-xs font-bold text-primary uppercase tracking-wider w-full bg-primary/10 py-1">
                {monthAbbr}
              </span>
              <span className="text-2xl sm:text-3xl font-black text-foreground leading-none py-1">
                {dayNumber}
              </span>
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-lg text-xs font-semibold py-1 px-3 bg-primary/10 text-primary border-primary/20">
                  <Ticket className="size-3 mr-1" />
                  <span>Eventos & Ingressos</span>
                </Badge>

                {attrs.visibility === "unlisted" && (
                  <Badge variant="secondary" className="rounded-lg text-xs font-semibold py-1 px-3">
                    Link Direto / Não Listado
                  </Badge>
                )}

                {attrs.age_rating && (
                  <Badge variant="outline" className="rounded-lg text-xs font-semibold py-1 px-3">
                    {attrs.age_rating}
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground break-words text-wrap leading-tight">
                {classified.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2 font-medium">
                  <Calendar className="size-4 text-primary shrink-0" />
                  <span className="capitalize">{formattedDate}</span>
                </span>

                <span className="inline-flex items-center gap-2 font-medium">
                  <Clock className="size-4 text-primary shrink-0" />
                  <span>{startTime}{endTime ? ' às ' + endTime : ''}</span>
                </span>

                <span className="inline-flex items-center gap-2 font-medium">
                  <MapPin className="size-4 text-primary shrink-0" />
                  <span className="truncate max-w-xs">{venueName}{cityState ? ' • ' + cityState : ''}</span>
                </span>
              </div>
            </div>
          </div>

          {/* ── Ações Rápidas do Cabeçalho — Barra Dedicada com Piso 44px ── */}
          <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-border/40">
            {ticketTiers.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleOpenSignup(ticketTiers[0])}
                className="rounded-lg h-11 min-h-11 px-6 text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
              >
                <Ticket className="size-4" />
                <span>Garantir Ingresso</span>
              </Button>
            )}

            {classified.whatsapp && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-lg h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary border-border hover:bg-muted/40"
              >
                <a
                  href={'https://wa.me/' + classified.whatsapp.replace(/\D/g, "") + '?text=' + encodeURIComponent('Olá! Tenho dúvidas sobre o evento "' + classified.title + '".')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4 text-emerald-500" />
                  <span>Falar com Organizador</span>
                </a>
              </Button>
            )}

            {storyUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStoryOpen(true)}
                className="rounded-lg h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer bg-primary/10 border-primary/30 text-foreground hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
              >
                <Play className="size-3.5 fill-primary text-primary" />
                <span>Story 9:16</span>
              </Button>
            )}

            {isOwner && onEditClassified && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEditClassified}
                className="rounded-lg h-11 min-h-11 px-4 text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary border-border"
              >
                <Edit3 className="size-4" />
                <span>Editar Evento</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCalendar}
              className="rounded-lg h-11 min-h-11 px-4 text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary border-border"
              title="Salvar no Google Calendar / Apple Agenda"
            >
              <Download className="size-4 text-muted-foreground" />
              <span>Salvar na Agenda</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              className="rounded-lg size-11 min-h-11 min-w-11 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary border-border"
              aria-label="Compartilhar evento"
            >
              <Share2 className="size-4 text-muted-foreground" />
            </Button>
          </div>

          {/* Card do Anfitrião / Organizador (Luma Style "Hosted by") & PWA */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-border/40">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/70 shadow-xs max-w-md">
              {hostAvatarUrl && !hostAvatarFailed ? (
                <img
                  src={hostAvatarUrl}
                  alt={hostName}
                  className="size-11 min-h-11 min-w-11 rounded-xl object-cover border border-border/80"
                  onError={() => setHostAvatarFailed(true)}
                />
              ) : (
                <div className="size-11 min-h-11 min-w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20">
                  {hostName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-xs text-muted-foreground font-medium block">
                  Organizado por
                </span>
                <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                  {hostName}
                </p>
                <span className="text-xs text-primary font-medium block truncate">
                  {hostRole}
                </span>
              </div>
              {hostPhone && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="rounded-lg h-11 min-h-11 px-3 text-xs font-semibold gap-2 cursor-pointer border-border shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <a
                    href={`https://wa.me/55${hostPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Olá ${hostName}! Vi o convite para o evento "${classified.title}" e gostaria de tirar uma dúvida.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Phone className="size-3.5 text-emerald-600" />
                    <span className="hidden sm:inline">Contatar</span>
                  </a>
                </Button>
              )}
            </div>

            {pwaEnabled && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/20 text-xs text-foreground max-w-sm">
                <Smartphone className="size-4 text-primary shrink-0" />
                <span className="text-xs text-muted-foreground leading-tight">
                  Adicione à tela inicial para acessar ingressos e programação offline.
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Rule B.39 / Luma App-Native Anchor Navigation Bar ── */}
      <nav aria-label="Navegação das Seções do Evento" className="sticky top-0 z-30 w-full bg-background border-b border-border py-3 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar px-4 sm:px-6 max-w-6xl mx-auto">
          <button
            type="button"
            onClick={() => scrollToSection("sobre")}
            className={cn(
              "h-11 min-h-11 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeSection === "sobre"
                ? "bg-foreground text-background font-bold"
                : "bg-muted/70 text-muted-foreground hover:text-foreground"
            )}
          >
            Sobre
          </button>
          {ticketTiers.length > 0 && (
            <button
              type="button"
              onClick={() => scrollToSection("ingressos")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeSection === "ingressos"
                  ? "bg-foreground text-background font-bold"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground"
              )}
            >
              <Ticket className="size-3.5" />
              <span>Ingressos ({ticketTiers.length})</span>
            </button>
          )}
          {schedule.length > 0 && (
            <button
              type="button"
              onClick={() => scrollToSection("programacao")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeSection === "programacao"
                  ? "bg-foreground text-background font-bold"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock className="size-3.5" />
              <span>Programação</span>
            </button>
          )}
          {speakers.length > 0 && (
            <button
              type="button"
              onClick={() => scrollToSection("palestrantes")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeSection === "palestrantes"
                  ? "bg-foreground text-background font-bold"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground"
              )}
            >
              <Mic className="size-3.5" />
              <span>Palestrantes ({speakers.length})</span>
            </button>
          )}
          {surveys.length > 0 && (
            <button
              type="button"
              onClick={() => scrollToSection("enquetes")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeSection === "enquetes"
                  ? "bg-foreground text-background font-bold"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground"
              )}
            >
              <HelpCircle className="size-3.5" />
              <span>Enquetes ao Vivo</span>
            </button>
          )}
          {venueName && (
            <button
              type="button"
              onClick={() => scrollToSection("localizacao")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeSection === "localizacao"
                  ? "bg-foreground text-background font-bold"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground"
              )}
            >
              <MapPin className="size-3.5" />
              <span>Local & Acesso</span>
            </button>
          )}
          {sponsors.length > 0 && (
            <button
              type="button"
              onClick={() => scrollToSection("patrocinadores")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeSection === "patrocinadores"
                  ? "bg-foreground text-background font-bold"
                  : "bg-muted/70 text-muted-foreground hover:text-foreground"
              )}
            >
              <Building className="size-3.5" />
              <span>Patrocinadores</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => scrollToSection("politicas")}
            className={cn(
              "h-11 min-h-11 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeSection === "politicas"
                ? "bg-foreground text-background font-bold"
                : "bg-muted/70 text-muted-foreground hover:text-foreground"
            )}
          >
            <ShieldCheck className="size-3.5" />
            <span>Políticas</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="h-11 min-h-11 px-4 rounded-full text-xs font-semibold whitespace-nowrap bg-muted/70 text-muted-foreground hover:text-foreground transition-colors shrink-0 flex items-center gap-2 ml-auto cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Share2 className="size-3.5" />
            <span>Compartilhar</span>
          </button>
        </div>
      </nav>

      {/* ── 2. Grid Principal (8 Cols Conteúdo + 4 Cols Ingressos/Comercial) ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Coluna de Conteúdo (8 Cols) */}
          <div className="lg:col-span-8 space-y-10">
            {/* Bloco: Sobre o Evento */}
            <section id="sobre" className="space-y-4 scroll-mt-18">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Info className="size-5 text-primary" />
                <span>Sobre o Evento</span>
              </h2>

              <div className="prose prose-sm max-w-none text-foreground/90 whitespace-pre-line leading-relaxed text-sm bg-card border border-border/60 rounded-2xl p-5 sm:p-6 shadow-xs">
                {classified.content || "Nenhuma descrição adicional informada pelo organizador."}
              </div>

              {/* Grid de Destaques em Squircles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <SquircleCard className="p-4 border border-border/60 flex flex-col justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Início</span>
                  <span className="text-base font-bold text-foreground mt-1">{startTime}</span>
                </SquircleCard>

                <SquircleCard className="p-4 border border-border/60 flex flex-col justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Portões</span>
                  <span className="text-base font-bold text-foreground mt-1">{gatesOpenTime || startTime}</span>
                </SquircleCard>

                <SquircleCard className="p-4 border border-border/60 flex flex-col justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Classificação</span>
                  <span className="text-base font-bold text-foreground mt-1">{attrs.age_rating || "Livre"}</span>
                </SquircleCard>

                <SquircleCard className="p-4 border border-border/60 flex flex-col justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Formato</span>
                  <span className="text-base font-bold text-foreground mt-1">Presencial</span>
                </SquircleCard>
              </div>

              {/* Vídeo Promocional se houver */}
              {videoUrl && (
                <div className="pt-4">
                  <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <span>Apresentação em Vídeo</span>
                  </h3>
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border bg-background">
                    {videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") ? (
                      <iframe
                        src={videoUrl.replace("watch?v=", "embed/")}
                        title="Vídeo do Evento"
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video src={videoUrl} controls className="w-full h-full object-cover" />
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Bloco: Programação Visual (Schedule / Line-up) */}
            {schedule.length > 0 && (
              <section id="programacao" className="space-y-4 pt-4 border-t border-border/40 scroll-mt-18">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Clock className="size-5 text-primary" />
                    <span>Programação do Evento</span>
                  </h2>
                  <Badge variant="outline" className="text-xs font-semibold py-1 px-3">
                    {schedule.length} {schedule.length === 1 ? "Atividade" : "Atividades"}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {schedule.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className={cn(
                        "p-4 sm:p-5 rounded-2xl border transition-colors",
                        item.is_break
                          ? "bg-muted/40 border-border/40 text-muted-foreground"
                          : "bg-card border-border/70 hover:border-primary/40 shadow-xs"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs sm:text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded-md">
                            {item.time}{item.end_time ? ` - ${item.end_time}` : ""}
                          </span>
                          {item.stage_or_room && (
                            <Badge variant="secondary" className="text-xs font-semibold py-1 px-2">
                              {item.stage_or_room}
                            </Badge>
                          )}
                        </div>

                        {item.is_break && (
                          <span className="text-xs text-muted-foreground font-semibold inline-flex items-center gap-1">
                            <Coffee className="size-3.5" />
                            <span>Intervalo / Convivência</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-foreground break-words text-wrap leading-tight">
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2 break-words text-wrap leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {item.speaker_name && (
                        <div className="flex items-center gap-2 pt-3 mt-2 border-t border-border/30">
                          {item.speaker_photo ? (
                            <img
                              src={item.speaker_photo}
                              alt={item.speaker_name}
                              className="size-7 rounded-full object-cover border border-border"
                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                              {item.speaker_name.charAt(0)}
                            </div>
                          )}
                          <div className="text-xs min-w-0">
                            <span className="font-bold text-foreground block truncate">{item.speaker_name}</span>
                            {item.speaker_role && (
                              <span className="text-muted-foreground truncate block">{item.speaker_role}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Bloco: Palestrantes & Atrações */}
            {speakers.length > 0 && (
              <section id="palestrantes" className="space-y-4 pt-4 border-t border-border/40 scroll-mt-18">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Mic className="size-5 text-primary" />
                  <span>Palestrantes & Atrações</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {speakers.map((speaker, idx) => (
                    <div
                      key={speaker.id || idx}
                      className="p-5 rounded-2xl border border-border/70 bg-card hover:border-primary/40 transition-colors flex items-start gap-4 shadow-xs"
                    >
                      {speaker.photo_url ? (
                        <img
                          src={speaker.photo_url}
                          alt={speaker.name}
                          className="size-16 sm:size-20 rounded-2xl object-cover shrink-0 border border-border"
                          onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="size-16 sm:size-20 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center shrink-0 text-xl font-bold border border-border">
                          {speaker.name.charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="text-base font-bold text-foreground break-words text-wrap leading-tight">
                          {speaker.name}
                        </h3>
                        <p className="text-xs font-semibold text-primary break-words text-wrap leading-tight">
                          {speaker.role}
                        </p>
                        {speaker.bio && (
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed pt-1">
                            {speaker.bio}
                          </p>
                        )}
                        {speaker.social_link && (
                          <a
                            href={speaker.social_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline pt-2"
                          >
                            <span>Ver Perfil</span>
                            <ExternalLink className="size-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Bloco: Enquetes e Interatividade ao Vivo */}
            {surveys.length > 0 && (
              <section id="enquetes" className="space-y-4 pt-4 border-t border-border/40 scroll-mt-18">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <HelpCircle className="size-5 text-primary" />
                    <span>Interatividade & Enquetes</span>
                  </h2>
                  <Badge variant="outline" className="text-xs font-semibold py-1 px-3">
                    Tempo Real
                  </Badge>
                </div>

                <div className="space-y-4">
                  {surveys.map((survey) => {
                    const hasVoted = votedSurveys[survey.id] !== undefined;
                    const res = surveyResults[survey.id];

                    return (
                      <div
                        key={survey.id}
                        className="p-5 sm:p-6 rounded-2xl border border-border/70 bg-card space-y-4 shadow-xs"
                      >
                        <h3 className="text-base font-bold text-foreground leading-snug">
                          {survey.question}
                        </h3>

                        <div className="space-y-3">
                          {survey.options.map((option, optIdx) => {
                            const isSelected = votedSurveys[survey.id] === optIdx;
                            const pct = res?.percentages?.[optIdx] ?? 0;

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={hasVoted || isVotingSurvey}
                                onClick={() => handleVoteSurvey(survey, optIdx, option)}
                                className={cn(
                                  "w-full text-left p-4 rounded-xl border text-xs sm:text-sm font-semibold transition-colors relative overflow-hidden flex items-center justify-between gap-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-11",
                                  hasVoted
                                    ? isSelected
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border/50 bg-muted/20 text-muted-foreground"
                                    : "border-border/70 bg-muted/30 hover:bg-muted/60 text-foreground"
                                )}
                              >
                                {hasVoted && (
                                  <div
                                    className="absolute inset-y-0 left-0 bg-primary/15 transition-colors duration-300"
                                    style={{ width: `${pct}%` }}
                                  />
                                )}
                                <span className="relative z-10 flex items-center gap-2 min-w-0 truncate">
                                  {isSelected && <CheckCircle2 className="size-4 shrink-0 text-primary" />}
                                  <span className="truncate">{option}</span>
                                </span>
                                {hasVoted && (
                                  <span className="relative z-10 font-mono text-xs font-bold shrink-0">
                                    {pct}%
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {!hasVoted && (
                          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              id={`anon-${survey.id}`}
                              checked={isAnonymousVote[survey.id] ?? true}
                              onChange={(e) =>
                                setIsAnonymousVote((prev) => ({ ...prev, [survey.id]: e.target.checked }))
                              }
                              className="size-4 rounded border-border"
                            />
                            <Label htmlFor={`anon-${survey.id}`} className="text-xs cursor-pointer text-muted-foreground">
                              Votar de forma anônima (sem expor nome no painel)
                            </Label>
                          </div>
                        )}

                        {hasVoted && (
                          <p className="text-xs text-muted-foreground text-right font-medium">
                            {res?.totalVotes ? `${res.totalVotes} votos registrados` : "Voto computado"}
                          </p>
                        )}

                        {/* Mini Painel de Respostas para o Organizador (Regra B.38) */}
                        {isOwner && res?.responses && res.responses.length > 0 && (
                          <div className="pt-3 border-t border-border/40 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Painel de Respostas do Organizador ({res.responses.length})
                              </span>
                              <Badge variant="outline" className="text-xs font-mono">
                                {res.totalVotes} votos
                              </Badge>
                            </div>
                            <div className="max-h-48 overflow-y-auto space-y-2 no-scrollbar">
                              {res.responses.map((resp: any) => (
                                <div
                                  key={resp.id}
                                  className="p-3 rounded-lg border border-border/40 bg-muted/20 flex items-center justify-between text-xs"
                                >
                                  <div className="space-y-1 min-w-0 pr-2">
                                    <span className="font-semibold text-foreground truncate block">
                                      {resp.isAnonymous ? "Anônimo" : resp.voterName}
                                    </span>
                                    <p className="text-muted-foreground text-xs truncate">
                                      Opção: <strong className="text-foreground">{resp.optionLabel}</strong>
                                    </p>
                                  </div>
                                  <span className="text-muted-foreground text-xs font-mono shrink-0">
                                    {new Date(resp.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Bloco: Localização & Como Chegar */}
            <section id="localizacao" className="space-y-4 pt-4 border-t border-border/40 scroll-mt-18">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Navigation className="size-5 text-primary" />
                <span>Localização & Acesso</span>
              </h2>

              <div className="p-5 sm:p-6 rounded-2xl border border-border/70 bg-card space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-base font-bold text-foreground">{venueName}</p>
                    {venueAddress && (
                      <p className="text-xs sm:text-sm text-muted-foreground">{venueAddress}</p>
                    )}
                    {cityState && (
                      <p className="text-xs text-muted-foreground">{cityState}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="rounded-lg h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary border-border"
                    >
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          [venueName, venueAddress, cityState].filter(Boolean).join(", ")
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin className="size-4 mr-2 text-primary" />
                        <span>Abrir no Google Maps</span>
                      </a>
                    </Button>
                  </div>
                </div>

                {(policies.parking_info || attrs.parking_info) && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 border border-border/40 text-xs text-muted-foreground">
                    <Car className="size-4 text-primary shrink-0 mt-1" />
                    <p className="leading-relaxed">
                      <strong>Estacionamento:</strong> {policies.parking_info || attrs.parking_info}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Bloco: Patrocinadores & Realização */}
            {sponsors.length > 0 && (
              <section id="patrocinadores" className="space-y-4 pt-4 border-t border-border/40 scroll-mt-18">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Building className="size-5 text-primary" />
                  <span>Patrocinadores & Parceiros</span>
                </h2>

                <div className="space-y-6">
                  {sponsorsByTier.master.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Cota Master
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-1 sm:grid-cols-3 gap-3">
                        {sponsorsByTier.master.map((s, idx) => (
                          <a
                            key={s.id || idx}
                            href={s.website_url || "#"}
                            target={s.website_url ? "_blank" : undefined}
                            rel="noopener noreferrer"
                            className="p-4 rounded-xl border border-border/70 bg-card hover:border-primary/50 transition-colors flex items-center justify-center min-h-24"
                          >
                            <img
                              src={s.logo_url}
                              alt={s.name}
                              className="max-h-12 max-w-full object-contain"
                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {sponsorsByTier.ouro.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Patrocínio Ouro
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {sponsorsByTier.ouro.map((s, idx) => (
                          <a
                            key={s.id || idx}
                            href={s.website_url || "#"}
                            target={s.website_url ? "_blank" : undefined}
                            rel="noopener noreferrer"
                            className="p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors flex items-center justify-center min-h-16"
                          >
                            <img
                              src={s.logo_url}
                              alt={s.name}
                              className="max-h-10 max-w-full object-contain"
                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {sponsorsByTier.prata.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Patrocínio Prata
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:grid-cols-5 gap-3">
                        {sponsorsByTier.prata.map((s, idx) => (
                          <div
                            key={s.id || idx}
                            className="p-3 rounded-lg border border-border/50 bg-card flex items-center justify-center min-h-16"
                          >
                            <img
                              src={s.logo_url}
                              alt={s.name}
                              className="max-h-8 max-w-full object-contain"
                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sponsorsByTier.apoio.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                        Apoio & Realização
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {sponsorsByTier.apoio.map((s, idx) => (
                          <div
                            key={s.id || idx}
                            className="px-3 py-2 rounded-lg border border-border/40 bg-muted/30 text-xs font-semibold text-muted-foreground"
                          >
                            {s.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Bloco: Políticas do Evento */}
            <section id="politicas" className="space-y-4 pt-4 border-t border-border/40 scroll-mt-18">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                <span>Políticas & Diretrizes</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-2">
                  <span className="text-xs font-bold text-foreground block">Cancelamento e Reembolso</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {policies.refund_policy || "Cancelamentos são aceitos em até 7 dias corridos após a compra, conforme o Código de Defesa do Consumidor."}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-2">
                  <span className="text-xs font-bold text-foreground block">Meia-Entrada & Benefícios</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {policies.half_price_policy || "Obrigatória a apresentação de documento comprobatório para estudantes, idosos e PCDs no credenciamento."}
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-border/60 bg-card space-y-2 sm:col-span-2">
                  <span className="text-xs font-bold text-foreground block">Acessibilidade PCD</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {policies.accessibility_info || "Espaço com acesso para cadeirantes, rampas e sanitários adaptados."}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Coluna Comercial Lateral (4 Cols no Desktop) */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Bloco de Ingressos e Lotes */}
            <div id="ingressos" className="p-5 sm:p-6 rounded-2xl border border-border bg-card space-y-5 shadow-xs sticky top-16 scroll-mt-18">
              <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground">Ingressos & Lotes</h3>
                  <p className="text-xs text-muted-foreground">Escolha a sua modalidade de acesso</p>
                </div>
                <Ticket className="size-5 text-primary" />
              </div>

              {ticketTiers.length > 0 ? (
                <div className="space-y-3">
                  {ticketTiers.map((tier) => {
                    const isSoldOut = tier.status === "sold_out";

                    return (
                      <div
                        key={tier.id}
                        className={cn(
                          "p-4 rounded-xl border transition-colors space-y-3",
                          isSoldOut
                            ? "border-border/40 bg-muted/20 opacity-60"
                            : "border-border/70 bg-muted/30 hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-foreground">{tier.name}</h4>
                            {tier.description && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tier.description}</p>
                            )}
                          </div>
                          <span className="font-mono text-sm font-bold text-foreground shrink-0">
                            {tier.price_cents === 0 ? "Gratuito" : formatMoney(tier.price_cents)}
                          </span>
                        </div>

                        {tier.external_url ? (
                          <Button
                            variant={isSoldOut ? "outline" : "default"}
                            size="sm"
                            asChild
                            disabled={isSoldOut}
                            className="w-full rounded-lg h-11 min-h-11 text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <a href={tier.external_url} target="_blank" rel="noopener noreferrer">
                              <span>{isSoldOut ? "Lote Esgotado" : "Comprar na Plataforma"}</span>
                              <ExternalLink className="size-3.5" />
                            </a>
                          </Button>
                        ) : (
                          <Button
                            variant={isSoldOut ? "outline" : "default"}
                            size="sm"
                            disabled={isSoldOut}
                            onClick={() => handleOpenSignup(tier)}
                            className="w-full rounded-lg h-11 min-h-11 text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <Ticket className="size-3.5" />
                            <span>{isSoldOut ? "Lote Esgotado" : "Garantir Participação"}</span>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Cadastre-se para receber o aviso e link de abertura de vendas.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => handleOpenSignup()}
                    className="w-full rounded-lg h-11 min-h-11 text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <span>Receber Link de Ingressos</span>
                  </Button>
                </div>
              )}

              {/* Informação do Organizador */}
              <div className="pt-4 border-t border-border/40 space-y-2">
                <span className="text-xs font-semibold text-muted-foreground block">Organizado por</span>
                <div className="flex items-center gap-3">
                  {classified.store?.logo_url && !storeLogoFailed ? (
                    <img
                      src={classified.store.logo_url}
                      alt={classified.store.name}
                      className="size-11 min-h-11 rounded-xl object-cover border border-border"
                      onError={() => setStoreLogoFailed(true)}
                    />
                  ) : (
                    <div className="size-11 min-h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {(classified.store?.name || classified.profiles?.full_name || "O").charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate">
                      {classified.store?.name || classified.profiles?.full_name || "Organizador Verificado"}
                    </p>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                      <ShieldCheck className="size-3" />
                      <span>Anunciante Verificado</span>
                    </span>
                  </div>
                </div>

                {classified.contact_whatsapp && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="w-full mt-2 rounded-lg h-11 min-h-11 text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary border-border"
                  >
                    <a
                      href={`https://wa.me/55${classified.contact_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Olá! Gostaria de mais informações sobre o evento "${classified.title}".`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Phone className="size-3.5 text-emerald-600" />
                      <span>Falar com o Organizador</span>
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ── 3. Barra Flutuante Mobile (Fixada em z-30 para não ocluir modais em z-50) ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t border-border px-4 py-3  flex items-center justify-between gap-3 pb-safe">
        <div className="min-w-0">
          <span className="text-xs text-muted-foreground block truncate">Ingressos a partir de</span>
          <span className="text-sm font-bold font-mono text-foreground">
            {ticketTiers.length > 0
              ? ticketTiers[0].price_cents === 0
                ? "Gratuito"
                : formatMoney(ticketTiers[0].price_cents)
              : "Consulte"}
          </span>
        </div>

        <Button
          variant="outline"
          onClick={() => handleOpenSignup(ticketTiers[0])}
          className="rounded-lg h-11 min-h-11 px-6 text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary "
        >
          <Ticket className="size-4" />
          <span>Garantir Vaga</span>
        </Button>
      </div>

      {/* ── 4. Modal de Inscrição Rápida / Captura de Leads ── */}
      <Dialog open={isSignupModalOpen} onOpenChange={setIsSignupModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 border-border/80 z-50">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-foreground">
              {leadSuccess ? "Inscrição Realizada!" : "Inscrição no Evento"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {leadSuccess
                ? "Seus dados foram confirmados. Nos vemos no evento!"
                : selectedTicketForSignup
                ? `Você está se inscrevendo para: ${selectedTicketForSignup.name} (${selectedTicketForSignup.price_cents === 0 ? "Gratuito" : formatMoney(selectedTicketForSignup.price_cents)})`
                : "Preencha para receber os links oficiais e ingressos."}
            </DialogDescription>
          </DialogHeader>

          {leadSuccess ? (
            <div className="py-4 space-y-4 text-center">
              <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="size-6" />
              </div>
              <p className="text-sm text-foreground font-semibold">
                Parabéns, {leadName}! Seu ingresso foi emitido.
              </p>

              {issuedTicket && (
                <div className="p-4 rounded-lg bg-muted/40 border border-border/80 text-left space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-600" />
                      <span>Bilhete Criptográfico WCTS-1</span>
                    </span>
                    <Badge variant="outline" className="text-xs font-mono">
                      HMAC-SHA256
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-background border border-border">
                    <span className="text-sm font-mono font-bold text-foreground tracking-wider">
                      {issuedTicket.ticketCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof navigator !== "undefined" && navigator.clipboard) {
                          navigator.clipboard.writeText(issuedTicket.qrPayload);
                          toast.success("Token criptográfico do ingresso copiado!");
                        }
                      }}
                      className="h-11 min-h-11 px-3 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    >
                      Copiar Token QR
                    </button>
                  </div>

                  {issuedTicket.pixCopyPaste && issuedTicket.amountCents > 0 && (
                    <div className="pt-2 border-t border-border/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">
                          Pagamento PIX ({formatMoney(issuedTicket.amountCents)})
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          BRCode EMV
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          if (typeof navigator !== "undefined" && navigator.clipboard && issuedTicket.pixCopyPaste) {
                            navigator.clipboard.writeText(issuedTicket.pixCopyPaste);
                            toast.success("Código PIX Copia e Cola copiado!");
                          }
                        }}
                        className="w-full rounded-lg h-11 min-h-11 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        Copiar Código PIX Copia e Cola
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Guarde o código do seu bilhete ({issuedTicket?.ticketCode || "Confirmado"}). Você também pode adicionar o evento à sua agenda agora mesmo.
              </p>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={handleDownloadCalendar}
                  className="rounded-lg h-11 min-h-11 text-xs font-semibold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary border-border"
                >
                  <Download className="size-4" />
                  <span>Salvar na Minha Agenda</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsSignupModalOpen(false)}
                  className="rounded-lg h-11 min-h-11 text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span>Concluir</span>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitLead} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="lead-name" className="text-xs font-semibold text-foreground">
                  Nome Completo *
                </Label>
                <Input
                  id="lead-name"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="h-11 min-h-11 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-whatsapp" className="text-xs font-semibold text-foreground">
                  WhatsApp com DDD *
                </Label>
                <Input
                  id="lead-whatsapp"
                  value={leadWhatsapp}
                  onChange={(e) => setLeadWhatsapp(e.target.value)}
                  placeholder="(00) 00000-0000"
                  required
                  className="h-11 min-h-11 text-xs rounded-lg font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-email" className="text-xs font-semibold text-foreground">
                  E-mail (opcional)
                </Label>
                <Input
                  id="lead-email"
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="h-11 min-h-11 text-xs rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lead-notes" className="text-xs font-semibold text-foreground">
                  Observações ou perguntas ao organizador (opcional)
                </Label>
                <Textarea
                  id="lead-notes"
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  placeholder="Ex: Necessito de assento reservado, etc."
                  rows={2}
                  className="text-xs rounded-lg resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSignupModalOpen(false)}
                  disabled={isSubmittingLead}
                  className="rounded-lg h-11 min-h-11 px-4 text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary border-border"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isSubmittingLead}
                  className="rounded-lg h-11 min-h-11 px-6 text-xs font-bold gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {isSubmittingLead ? (
                    <>
                      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                      <span>Confirmando...</span>
                    </>
                  ) : (
                    <span>Confirmar Inscrição</span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── 5. Modal de Story 9:16 (Visual Estilo Instagram / Reel Mobile-First) ── */}
      {storyUrl && (
        <Dialog open={isStoryOpen} onOpenChange={setIsStoryOpen}>
          <DialogContent
            className="aspect-post-moment max-h-sheet p-0 sm:max-w-sm w-full bg-background text-foreground border-0 overflow-hidden rounded-2xl flex flex-col justify-between z-50"
          >
            {/* Barra Superior com Progresso e Host */}
            <div className="absolute top-0 inset-x-0 z-20 p-3 bg-background/80 backdrop-blur-sm space-y-2">
              <div className="w-full bg-background/20 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-background h-full transition-colors duration-100 ease-linear rounded-full"
                  style={{ width: `${storyProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between gap-3 text-foreground">
                <div className="flex items-center gap-2 min-w-0">
                  {hostAvatarUrl && !hostAvatarFailed ? (
                    <img
                      src={hostAvatarUrl}
                      alt={hostName}
                      className="size-8 rounded-full object-cover border border-white/30"
                      onError={() => setHostAvatarFailed(true)}
                    />
                  ) : (
                    <div className="size-8 rounded-full bg-primary/40 text-foreground flex items-center justify-center font-bold text-xs">
                      {hostName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">{classified.title}</p>
                    <p className="text-xs text-foreground/70 truncate">{hostName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isVideoUrl(storyUrl) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsStoryMuted(!isStoryMuted)}
                      className="size-11 min-h-11 min-w-11 text-foreground hover:bg-background/20 rounded-full"
                    >
                      {isStoryMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsStoryOpen(false)}
                    className="size-11 min-h-11 min-w-11 text-foreground hover:bg-background/20 rounded-full"
                  >
                    <X className="size-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Visualizador de Mídia 9:16 */}
            <div className="relative w-full h-full flex items-center justify-center bg-background">
              {isVideoUrl(storyUrl) ? (
                <video
                  ref={storyVideoRef}
                  src={storyUrl}
                  autoPlay
                  playsInline
                  muted={isStoryMuted}
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget;
                    if (v.duration) {
                      setStoryProgress((v.currentTime / v.duration) * 100);
                    }
                  }}
                  onEnded={() => setIsStoryOpen(false)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={storyUrl}
                  alt={classified.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Barra Inferior com CTA de Conversão */}
            <div className="absolute bottom-0 inset-x-0 z-20 p-4 bg-muted/90 backdrop-blur-sm flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsStoryOpen(false);
                  handleOpenSignup(ticketTiers[0]);
                }}
                className="w-full rounded-xl h-11 min-h-11 text-xs font-bold gap-2 cursor-pointer "
              >
                <Ticket className="size-4" />
                <span>Garantir Ingresso</span>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── 6. Minimalist White-Label Badge (Feito com amor por Waesy) ── */}
      <div className="mt-16 pb-8 flex justify-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Waesy Plataforma de Eventos"
        >
          <Sparkles className="size-3 text-primary group-hover:scale-110 transition-transform" />
          <span>Feito com amor por <strong className="font-bold text-foreground">Waesy</strong></span>
        </Link>
      </div>
    </div>
  );
}
