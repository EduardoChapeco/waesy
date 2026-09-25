import { useIsDesktop } from "@/hooks/use-mobile";
import { EventDetailMobile } from "@/components/events/event-detail-mobile";
import { EventDetailDesktop } from "@/components/events/event-detail-desktop";
﻿import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarBlank,
  Ticket,
  WarningCircle,
  ArrowLeft,
  MapPin,
  ArrowSquareOut,
  Users,
  CheckCircle,
  Star,
  XCircle,
  Newspaper,
  PencilSimple,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { addToCart } from "@/services/cart.functions";
import { recordUserBehavior, linkEventInteractionToCrmFn } from "@/services/telemetry-affinity.functions";
import { getEventWithLots } from "@/services/events.functions";
import {
  getEventRsvpStatus,
  toggleEventRsvpAction,
} from "@/services/events/external-events.functions";
import { getIdentity } from "@/services/identity.functions";
import { ContentActionsMenu } from "@/components/common/content-actions-menu";

export const Route = createFileRoute("/_store/evento/$id")({
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.event?.title
          ? `${loaderData.event.title} - Ingressos | Waesy`
          : "Evento | Waesy",
      },
      {
        name: "description",
        content:
          loaderData?.event?.description?.slice(0, 160) || "Evento cultural na Comunidade Waesy.",
      },
    ],
  }),
  loader: async ({ params }: { params: { id: string } }) => {
    try {
      const [eventData, rsvpRes, identityRes] = await Promise.all([
        getEventWithLots({ data: { eventId: params.id } }).catch(() => null),
        getEventRsvpStatus({ data: { event_id: params.id } }).catch(() => ({ user_status: null })),
        getIdentity().catch(() => null),
      ]);

      const event = eventData?.event;
      const isOwner = Boolean(
        identityRes?.id &&
          (identityRes.id === event?.store_id ||
            identityRes.store_id === event?.store_id ||
            identityRes.role === "admin")
      );

      return {
        event,
        lots: eventData?.lots || [],
        linkedNews: eventData?.linkedNews || null,
        userRsvp: rsvpRes?.user_status || null,
        isOwner,
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
  const isOwner = data?.isOwner || false;
  const router = useRouter();

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
        <div className="inline-flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-2">
          <WarningCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Evento não encontrado</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          O evento que você procura não existe ou foi cancelado pelo organizador.
        </p>
        <Button asChild className="rounded-xl font-bold" variant="outline">
          <Link to="/agenda">
            <ArrowLeft size={16} weight="bold" className="mr-2" />
            Voltar para Agenda
          </Link>
        </Button>
      </div>
    );
  }

  const handleBuyTicket = async (lot: any) => {
    try {
      await addToCart({
        data: {
          variantId: lot.id,
          quantity: 1,
        },
      });
      recordUserBehavior({
        data: {
          eventType: "add_to_cart",
          entityType: "event",
          entityId: event.id,
          niche: "eventos",
          metadata: { lot_id: lot.id, price_cents: lot.price_cents },
        },
      }).catch(() => {});

      if (event.store_id) {
        linkEventInteractionToCrmFn({
          data: {
            eventId: event.id,
            storeId: event.store_id,
            interactionType: "ticket_buy",
            metadata: { lot_id: lot.id, price_cents: lot.price_cents },
          },
        }).catch(() => {});
      }

      toast.success("Ingresso adicionado ao carrinho!");
      router.navigate({ to: "/carrinho" });
    } catch (err: unknown) {
      toast.error(
        (err instanceof Error ? err.message : String(err)) || "Erro ao adicionar ingresso."
      );
    }
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

  if (!isDesktop) {
    return (
      <EventDetailMobile
        event={event}
        lots={lots}
        linkedNews={linkedNews}
        userRsvp={userRsvp}
        rsvpCounts={rsvpCounts}
        isSubmittingRsvp={isSubmittingRsvp}
        handleToggleRsvp={handleToggleRsvp}
        handleBuyTicket={handleBuyTicket}
        isOwner={isOwner}
      />
    );
  }

  return (
    <EventDetailDesktop
      event={event}
      lots={lots}
      linkedNews={linkedNews}
      userRsvp={userRsvp}
      rsvpCounts={rsvpCounts}
      isSubmittingRsvp={isSubmittingRsvp}
      handleToggleRsvp={handleToggleRsvp}
      handleBuyTicket={handleBuyTicket}
      isOwner={isOwner}
    />
  );
}
