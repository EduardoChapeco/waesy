/**
 * app-item-detail-drawer.tsx — Drawer/Sheet de Detalhes Contextual 100% Isolado no App
 * Elimina fugas de rota para vitrines globais (/turismo/:id, /classificados/:id, /evento/:id)
 * mantendo o usuário dentro de /app/:slug ou domínio próprio da empresa.
 */

import React, { useMemo, useState } from "react";
import {
  AirplaneTilt,
  CalendarBlank,
  CheckCircle,
  MapPin,
  Package,
  Ticket,
  WhatsappLogo,
} from "@phosphor-icons/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { BrandedAppRuntimeBundleDTO } from "@/types/branded-app";

export type BrandedAppInspectedEntity =
  | { kind: "tourism"; item: any }
  | { kind: "classified"; item: any }
  | { kind: "event"; item: any };

export interface AppItemDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: BrandedAppInspectedEntity | null;
  store: BrandedAppRuntimeBundleDTO["store"];
  onOpenQuote?: (destination?: string) => void;
  onBuyEventTicket?: (event: any, lot: any) => void;
}

export function AppItemDetailDrawer({
  open,
  onOpenChange,
  entity,
  store,
  onOpenQuote,
  onBuyEventTicket,
}: AppItemDetailDrawerProps) {
  const [imgIdx, setImgIdx] = useState(0);

  const mediaList = useMemo(() => {
    if (!entity) return [] as string[];
    const item = entity.item || {};
    const candidates: string[] = [];
    if (Array.isArray(item.gallery_urls)) candidates.push(...item.gallery_urls);
    if (Array.isArray(item.images)) candidates.push(...item.images);
    const single = item.cover_url || item.image_url || item.cover_image || item.cover_image_url;
    if (single) candidates.unshift(single);
    return Array.from(new Set(candidates.filter((u) => typeof u === "string" && u.trim().length > 0)));
  }, [entity]);

  if (!entity || !entity.item) return null;

  const { kind, item } = entity;
  const activeMedia = mediaList[imgIdx] || mediaList[0] || null;
  const cleanWa = String(item.contact_whatsapp || store.whatsapp || store.phone || "").replace(/\D/g, "");
  const waHref = cleanWa
    ? `https://wa.me/${cleanWa.startsWith("55") ? cleanWa : `55${cleanWa}`}?text=${encodeURIComponent(
        `Olá! Tenho interesse em: ${item.title || "Item do App"} (${store.name})`,
      )}`
    : null;

  const priceCents = Number(
    item.price_cents ?? item.price_min_cents ?? item.min_price_cents ?? 0,
  );
  const inclusions: string[] = Array.isArray(item.inclusions)
    ? item.inclusions
    : Array.isArray(item.includes)
      ? item.includes
      : [];
  const lots: any[] = kind === "event" && Array.isArray(item.ticket_lots) ? item.ticket_lots : [];
  const availableLot =
    lots.find(
      (l) => l.status !== "closed" && ((l.capacity || 0) === 0 || (l.sold_count || 0) < l.capacity),
    ) || lots[0] || null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col justify-between bg-card border-l border-border z-50"
      >
        <div className="p-5 pb-3 border-b border-border pt-safe-modal">
          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">
                {kind === "tourism"
                  ? item.category || "Roteiro & Pacote"
                  : kind === "event"
                    ? item.category || "Evento"
                    : item.deal_type || item.category || "Portfólio"}
              </Badge>
              <span className="text-xs text-muted-foreground">{store.name}</span>
            </div>
            <SheetTitle className="text-base font-extrabold text-foreground leading-snug break-words">
              {item.title}
            </SheetTitle>
            {(item.destination || item.location_name || item.city || item.location || item.venue) && (
              <SheetDescription className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3.5 shrink-0" />
                <span>
                  {item.destination ||
                    item.venue ||
                    item.location_name ||
                    item.location ||
                    [item.city, item.state].filter(Boolean).join(", ")}
                </span>
              </SheetDescription>
            )}
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeMedia ? (
            <div className="space-y-2">
              <div className="aspect-4/3 w-full rounded-2xl overflow-hidden bg-muted border border-border">
                <img src={activeMedia} alt={item.title} className="size-full object-cover" />
              </div>
              {mediaList.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto scroll-area-carousel no-scrollbar pb-1">
                  {mediaList.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setImgIdx(idx)}
                      aria-label={`Ver mídia ${idx + 1}`}
                      className={cn(
                        "size-14 min-h-11 min-w-11 rounded-xl overflow-hidden border shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        imgIdx === idx ? "border-primary ring-2 ring-primary/30" : "border-border opacity-75",
                      )}
                    >
                      <img src={url} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video w-full rounded-2xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground">
              {kind === "tourism" ? (
                <AirplaneTilt className="size-10" weight="duotone" />
              ) : kind === "event" ? (
                <CalendarBlank className="size-10" weight="duotone" />
              ) : (
                <Package className="size-10" weight="duotone" />
              )}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-muted/20 p-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs text-muted-foreground block">
                {kind === "event" && item.is_free ? "Entrada" : "Investimento"}
              </span>
              <span className="text-xl font-black font-mono tabular-nums text-primary">
                {kind === "event" && item.is_free
                  ? "Gratuito"
                  : priceCents > 0
                    ? formatMoney(priceCents)
                    : "Sob consulta"}
              </span>
            </div>
            {kind === "event" && item.event_date && (
              <div className="text-right text-xs text-muted-foreground font-mono">
                <span className="block font-semibold text-foreground">Data do Evento</span>
                <span>{formatDate(item.event_date)}</span>
              </div>
            )}
          </div>

          {(item.description || item.content) && (
            <div className="space-y-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Detalhes &amp; Especificações
              </h3>
              <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-line break-words">
                {item.description || item.content}
              </p>
            </div>
          )}

          {inclusions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                O que está incluso
              </h3>
              <ul className="space-y-2">
                {inclusions.map((inc, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                    <CheckCircle className="size-4 text-primary shrink-0 mt-1" weight="fill" />
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-card flex flex-wrap items-center gap-2 pb-safe">
          {kind === "tourism" && onOpenQuote && (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onOpenQuote(item.destination || item.title);
              }}
              className="flex-1 h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
            >
              <AirplaneTilt className="size-4" weight="bold" />
              <span>Solicitar Cotação</span>
            </Button>
          )}

          {kind === "event" && availableLot && onBuyEventTicket && (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onBuyEventTicket(item, availableLot);
              }}
              className="flex-1 h-11 min-h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer"
            >
              <Ticket className="size-4" weight="bold" />
              <span>Garantir Ingresso</span>
            </Button>
          )}

          {waHref && (
            <Button
              asChild
              variant={kind === "classified" ? "default" : "outline"}
              className="flex-1 h-11 min-h-11 rounded-xl text-xs font-bold gap-2"
            >
              <a href={waHref} target="_blank" rel="noopener noreferrer">
                <WhatsappLogo className="size-4" weight="fill" />
                <span>Falar com Especialista</span>
              </a>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
