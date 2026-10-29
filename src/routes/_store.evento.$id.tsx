import { FastLeadRsvpModal } from "@/components/eventos/fast-lead-rsvp-modal";
import { EventStoryViewerModal } from "@/components/events/event-story-viewer-modal";
import { Sparkles, Share2 } from "lucide-react";
import { useIsDesktop } from "@/hooks/use-mobile";
import { EventDetailMobile } from "@/components/events/event-detail-mobile";
import { EventDetailDesktop } from "@/components/events/event-detail-desktop";
import { EventClassifiedShowcaseView } from "@/components/classifieds/event-classified-showcase-view";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarBlank, Ticket, WarningCircle, ArrowLeft, MapPin, ArrowSquareOut, Users, CheckCircle, Star, XCircle, Newspaper, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { recordUserBehavior, linkEventInteractionToCrmFn } from "@/services/telemetry-affinity.functions";
import { getEventWithLots } from "@/services/events.functions";
import { getEventRsvpStatus, toggleEventRsvpAction } from "@/services/events/external-events.functions";
import { getIdentity } from "@/services/identity.functions";
import { ContentActionsMenu } from "@/components/common/content-actions-menu";
import { ActionAuthGuardModal } from "@/components/common/action-auth-guard-modal";
import { useActionAuthGuard } from "@/hooks/use-action-auth-guard";
import { TicketPurchaseModal } from "@/components/eventos/ticket-purchase-modal";

export const Route = createFileRoute("/_store/evento/$id")({
  head: ({ loaderData }) => {
    const ev = loaderData?.event;
    const title = ev?.title
      ? `${ev.title} — Ingressos e Programação | Waesy Local Marketplace`
      : "Evento Cultural | Waesy Local Marketplace";
    const description =
      ev?.description?.slice(0, 160) || "Evento cultural, programação e ingressos no Waesy Local Marketplace.";
    const canonicalUrl = `https://waesy.com.br/evento/${ev?.id || "evento"}`;
    const imageUrl = ev?.cover_image || ev?.image_url || "https://waesy.com.br/pwa-512x512.png";
    const jsonLd = ev
      ? {
          "@context": "https://schema.org",
          "@type": "Event",
          name: ev.title,
          description,
          startDate: ev.starts_at || ev.event_date || new Date().toISOString(),
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          eventStatus: "https://schema.org/EventScheduled",
          image: [imageUrl],
          location: {
            "@type": "Place",
            name: ev.location || ev.venue_name || "Região Waesy",
            address: {
              "@type": "PostalAddress",
              addressLocality: ev.city || "Chapecó",
              addressRegion: ev.state || "SC",
              addressCountry: "BR",
            },
          },
          organizer: {
            "@type": "Organization",
            name: "Waesy Local Marketplace",
            url: "https://waesy.com.br",
          },
        }
      : null;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonicalUrl },
        { property: "og:image", content: imageUrl },
        { name: "geo.region", content: "BR-SC" },
        { name: "geo.placename", content: ev?.city || "Chapecó e Região" },
      ],
      links: [{ rel: "canonical", href: canonicalUrl }],
      scripts: jsonLd ? [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }] : [],
    };
  },
  loader: async ({ params }: { params: { id: string } }) => {
    try {
      const [eventData, rsvpRes, identityRes] = await Promise.all([
        getEventWithLots({ data: { eventId: params.id } }).catch(() => null),
        getEventRsvpStatus({ data: { event_id: params.id } }).catch(() => ({ user_status: null })),
        getIdentity().catch(() => null),
      ]);

      const event = eventData?.event;
      const classifiedEvent = (eventData as any)?.classifiedEvent || null;
      const isOwner = Boolean(
        identityRes?.id &&
          (identityRes.id === event?.store_id ||
            identityRes.store_id === event?.store_id ||
            (classifiedEvent?.profile_id && identityRes.id === classifiedEvent.profile_id) ||
            identityRes.role === "admin")
      );

      return {
        event,
        classifiedEvent,
        lots: eventData?.lots || [],
        linkedNews: eventData?.linkedNews || null,
        partners: eventData?.partners || [],
        concessions: eventData?.concessions || [],
        products: eventData?.products || [],
        surveys: eventData?.surveys || [],
        userRsvp: rsvpRes?.user_status || null,
        isOwner,
        identity: identityRes,
      };
    } catch (err) {
      console.error("[loader:_store.evento.$id] Unhandled loader error:", err);
      return null as any;
    }
  },
  component: EventDetailPage,
});

function EventDetailPage() {
  const data = Route.useLoaderData();
  const event = data?.event;
  const lots = data?.lots || [];
  const linkedNews = data?.linkedNews;
  const partners = data?.partners || [];
  const concessions = data?.concessions || [];
  const products = data?.products || [];
  const surveys = data?.surveys || [];
  const isOwner = data?.isOwner || false;
  const router = useRouter();
  const isLinkOnly = event?.visibility === "link_only" || (typeof window !== "undefined" && window.location.search.includes("mode=standalone"));
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [fastLeadLot, setFastLeadLot] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && event?.id && event?.story_media_url && event?.story_auto_open !== false) {
      const storageKey = `waesy_event_story_seen_${event.id}`;
      const hasSeen = sessionStorage.getItem(storageKey);
      if (!hasSeen) {
        sessionStorage.setItem(storageKey, "1");
        setIsStoryOpen(true);
      }
    }
  }, [event?.id, event?.story_media_url, event?.story_auto_open]);

  const [userRsvp, setUserRsvp] = useState<string | null>(data?.userRsvp || null);
  const [rsvpCounts, setRsvpCounts] = useState({
    going: Number(event?.rsvp_going_count || 0),
    interested: Number(event?.rsvp_interested_count || 0),
    not_going: Number(event?.rsvp_not_going_count || 0),
  });
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);

  useEffect(() => {
    if (event?.id) {
      recordUserBehavior({
        data: {
          eventType: "view_item",
          entityType: "event",
          entityId: event.id,
          niche: "eventos",
          metadata: { title: event.title, store_id: event.store_id },
        },
      }).catch(() => {});
    }
  }, [event?.id]);

  if (!event) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <div className="inline-flex size-16 items-center justify-center rounded-lg bg-muted text-muted-foreground mb-2">
          <WarningCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Evento não encontrado</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          O evento que você procura não existe ou foi cancelado pelo organizador.
        </p>
        <Button asChild className="h-11 min-h-11 px-4 rounded-lg font-bold" variant="outline">
          <Link to="/eventos">
            <ArrowLeft size={16} weight="bold" className="mr-2" />
            Voltar para Eventos
          </Link>
        </Button>
      </div>
    );
  }

  if ((data as any)?.classifiedEvent) {
    return (
      <EventClassifiedShowcaseView
        classified={(data as any).classifiedEvent}
        isOwner={isOwner}
        onEditClassified={() =>
          router.navigate({
            to: "/conta/classificados/novo",
            search: { editId: (data as any).classifiedEvent.id } as any,
          })
        }
      />
    );
  }

  const { requireAuth, modalProps } = useActionAuthGuard();

  const [selectedLotForPurchase, setSelectedLotForPurchase] = useState<any | null>(null);
  const identity = (data as any)?.identity || null;

  const handleBuyTicket = (lot: any) => {
    const isFreeLot = (lot.price_cents || 0) === 0 || event.is_free;
    if (isFreeLot && !identity?.id) {
      setFastLeadLot(lot);
      return;
    }
    requireAuth({
      title: "Faça login para emitir ingressos",
      description: `Para emitir seus ingressos com QR Code e segurança nominal para "${event.title}", acesse sua conta Waesy.`,
      actionContext: `Compra de Ingresso: ${lot.title || lot.name} (${event.title})`,
      onSuccess: async () => {
        setSelectedLotForPurchase({
          id: lot.id,
          name: lot.title || lot.name || "Ingresso",
          price_cents: lot.price_cents ?? 0,
          capacity: lot.capacity,
          sold_count: lot.sold_count,
        });
      },
    });
  };

  const handleToggleRsvp = async (status: "going" | "interested" | "not_going") => {
    if (isSubmittingRsvp) return;
    setIsSubmittingRsvp(true);

    const prevUserStatus = userRsvp;
    const prevCounts = { ...rsvpCounts };

    // Atualização otimista
    const isDeselecting = prevUserStatus === status;
    const nextStatus = isDeselecting ? null : status;
    setUserRsvp(nextStatus);

    setRsvpCounts((prev) => {
      const updated = { ...prev };
      if (prevUserStatus === "going") updated.going = Math.max(0, updated.going - 1);
      if (prevUserStatus === "interested") updated.interested = Math.max(0, updated.interested - 1);
      if (prevUserStatus === "not_going") updated.not_going = Math.max(0, updated.not_going - 1);

      if (!isDeselecting) {
        if (status === "going") updated.going += 1;
        if (status === "interested") updated.interested += 1;
        if (status === "not_going") updated.not_going += 1;
      }
      return updated;
    });

    try {
      // Fingerprint de fallback para usuários anônimos
      let sessionFp = typeof window !== "undefined" ? localStorage.getItem("waesy_fp") : null;
      if (!sessionFp && typeof window !== "undefined") {
        sessionFp = `fp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
        localStorage.setItem("waesy_fp", sessionFp);
      }

      const res: any = await toggleEventRsvpAction({
        data: {
          event_id: event.id,
          status,
          session_fingerprint: sessionFp || undefined,
        },
      });

      if (res?.success) {
        setUserRsvp(res.user_status);
        setRsvpCounts({
          going: res.going_count ?? rsvpCounts.going,
          interested: res.interested_count ?? rsvpCounts.interested,
          not_going: res.not_going_count ?? rsvpCounts.not_going,
        });

        recordUserBehavior({
          data: {
            eventType: "booking_complete",
            entityType: "event",
            entityId: event.id,
            niche: "eventos",
            metadata: { rsvp_status: status },
          },
        }).catch(() => {});

        if (event.store_id && status === "going") {
          linkEventInteractionToCrmFn({
            data: {
              eventId: event.id,
              storeId: event.store_id,
              interactionType: "rsvp",
              metadata: { rsvp_status: status },
            },
          }).catch(() => {});
        }

        if (res.user_status === "going") {
          toast.success("Presença confirmada! Nos vemos no evento.");
        } else if (res.user_status === "interested") {
          toast.info("Interesse registrado. Avisaremos sobre novidades.");
        } else {
          toast.info("Status de presença atualizado.");
        }
      }
    } catch (err: any) {
      // Rollback em caso de erro
      setUserRsvp(prevUserStatus);
      setRsvpCounts(prevCounts);
      toast.error(err.message || "Erro ao atualizar presença.");
    } finally {
      setIsSubmittingRsvp(false);
    }
  };

  const activeLots = lots.filter((l: any) => l.status === "active");

  const isDesktop = useIsDesktop(1024);

  return (
    <>
      {isLinkOnly && (
        <div className="w-full bg-card/90 backdrop-blur-md border-b border-border/60 sticky top-0 z-40 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-11 min-h-11 px-3 rounded-xl font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Link to="/agenda">
                <ArrowLeft size={16} className="mr-1" />
                Voltar
              </Link>
            </Button>
            <span className="text-xs font-bold text-foreground truncate max-w-50 sm:max-w-md">
              {event.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {event.story_media_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStoryOpen(true)}
                className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold text-purple-600 border-purple-500/30 hover:bg-purple-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Sparkles className="size-3.5 mr-1" />
                Story
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof window !== "undefined") {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link do evento copiado!");
                }
              }}
              className="h-11 min-h-11 px-3 rounded-xl text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Share2 className="size-3.5 mr-1" />
              Compartilhar
            </Button>
          </div>
        </div>
      )}
      {!isDesktop ? (
        <EventDetailMobile
          event={event}
          lots={lots}
          linkedNews={linkedNews}
          partners={partners}
          concessions={concessions}
          products={products}
          surveys={surveys}
          userRsvp={userRsvp}
          rsvpCounts={rsvpCounts}
          isSubmittingRsvp={isSubmittingRsvp}
          handleToggleRsvp={handleToggleRsvp}
          handleBuyTicket={handleBuyTicket}
          isOwner={isOwner}
          onOpenStory={() => setIsStoryOpen(true)}
        />
      ) : (
        <EventDetailDesktop
          event={event}
          lots={lots}
          linkedNews={linkedNews}
          partners={partners}
          concessions={concessions}
          products={products}
          surveys={surveys}
          userRsvp={userRsvp}
          rsvpCounts={rsvpCounts}
          isSubmittingRsvp={isSubmittingRsvp}
          handleToggleRsvp={handleToggleRsvp}
          handleBuyTicket={handleBuyTicket}
          isOwner={isOwner}
          onOpenStory={() => setIsStoryOpen(true)}
        />
      )}
      <ActionAuthGuardModal {...modalProps} />
      {selectedLotForPurchase && (
        <TicketPurchaseModal
          open={!!selectedLotForPurchase}
          onOpenChange={(isOpen) => {
            if (!isOpen) setSelectedLotForPurchase(null);
          }}
          event={{
            id: event.id,
            title: event.title,
            event_date: event.event_date || (event as any).start_date,
            location: event.location,
          }}
          lot={selectedLotForPurchase}
          userProfile={{
            full_name: identity?.full_name || identity?.name || "",
            email: identity?.email || "",
            tax_id: identity?.tax_id || identity?.cpf || "",
          }}
        />
      )}
      <FastLeadRsvpModal
        open={!!fastLeadLot}
        onOpenChange={(isOpen) => { if (!isOpen) setFastLeadLot(null); }}
        event={{ id: event.id, title: event.title, event_date: event.event_date || (event as any).start_date, location: event.location }}
        lot={fastLeadLot}
        onSuccess={() => { router.invalidate(); }}
      />
      {event.story_media_url && (
        <EventStoryViewerModal
          open={isStoryOpen}
          onClose={() => setIsStoryOpen(false)}
          mediaUrl={event.story_media_url}
          mediaType={event.story_media_type || "image"}
          eventTitle={event.title}
          eventDate={event.event_date ? String(event.event_date).slice(0, 10) : null}
        />
      )}
    </>
  );
}
