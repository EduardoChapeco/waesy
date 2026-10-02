import React from "react";
import { Link } from "@tanstack/react-router";
import { Tag, MapPin, ArrowRight } from "lucide-react";
import { WhatsappLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { resolveClassifiedNiche } from "@/lib/classifieds/semantics";
import { trackClassifiedWhatsAppClick } from "@/services/classifieds.functions";
import { trackAndOpenWhatsApp } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

export interface ClassifiedItemCardProps {
  item: any;
  variant?: "grid" | "list" | "feed";
}

function getClassifiedCover(item: any): string | null {
  if (!item) return null;
  const imgs = item.images || item.media_urls || item.photos;
  if (Array.isArray(imgs) && imgs.length > 0) return imgs[0];
  if (typeof item.cover_image === "string" && item.cover_image) return item.cover_image;
  return null;
}

export function ClassifiedItemCard({ item, variant = "grid" }: ClassifiedItemCardProps) {
  const img = getClassifiedCover(item);
  const isTemporada = item.deal_type === "temporada";
  const isAluguel = item.deal_type === "aluguel";
  const itemNiche = resolveClassifiedNiche(item);
  const targetPhone = item.contact_whatsapp || item.whatsapp || item.profiles?.phone;

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!targetPhone) return;
    trackClassifiedWhatsAppClick({ data: { adId: item.id } }).catch(() => {});
    trackAndOpenWhatsApp(
      targetPhone,
      `Olá! Vi o anúncio "${item.title}" no Waesy e gostaria de falar com você.`,
      {
        classifiedId: item.id,
        classifiedTitle: item.title,
      }
    );
  };

  if (variant === "list") {
    return (
      <div className="group relative overflow-hidden rounded-lg border border-border/60 bg-card hover:border-foreground/30 transition-colors min-h-36 pl-32 sm:pl-48 w-full">
        <Link
          to="/classificados/$id"
          params={{ id: item.id }}
          className="absolute inset-y-0 left-0 w-32 sm:w-48 overflow-hidden rounded-l-2xl bg-muted/40 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {img ? (
            <img
              src={img}
              alt={item.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-muted/40 flex items-center justify-center">
              <Tag className="size-7 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap z-10">
            <Badge className="bg-background/95 text-foreground font-mono text-xs uppercase font-bold px-2 py-1 rounded-md">
              {itemNiche.shortLabel}
            </Badge>
            {(item.is_boosted || item.attributes?.is_boosted) && (
              <Badge variant="outline" className="border-border/60 text-foreground font-mono text-xs font-bold px-2 py-1 rounded-md">
                Destaque
              </Badge>
            )}
          </div>
        </Link>

        <div className="p-4 flex flex-col justify-between min-h-36 gap-2">
          <Link
            to="/classificados/$id"
            params={{ id: item.id }}
            className="space-y-2 block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <div className="flex items-center gap-2 flex-wrap">
              {(item.attributes?.accepts_trade || item.accepts_trade) && (
                <Badge variant="secondary" className="text-xs font-mono px-2 py-1 rounded-md">
                  Aceita Troca
                </Badge>
              )}
              {(item.attributes?.accepts_card || item.accepts_card) && (
                <Badge variant="outline" className="text-xs font-mono px-2 py-1 rounded-md">
                  {Number(item.attributes?.max_installments) > 1
                    ? `Cartão até ${item.attributes.max_installments}x`
                    : "Aceita Cartão"}
                </Badge>
              )}
            </div>

            <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {item.title}
            </h3>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-lg sm:text-xl font-black text-foreground font-mono">
                {formatMoney(item.price_cents || 0)}
                {(itemNiche.priceSuffix || (isAluguel ? " /mês" : isTemporada ? " /diária" : "")) && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    {itemNiche.priceSuffix || (isAluguel ? "/mês" : "/diária")}
                  </span>
                )}
              </span>
            </div>
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
            <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono truncate">
              <MapPin className="size-3 shrink-0 text-primary" />
              <span className="truncate">{item.location_name || item.location_text || "Regional"}</span>
            </span>

            <div className="flex items-center gap-2">
              {targetPhone && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleWhatsApp} /* focus-visible: */
                  className="h-11 px-3 rounded-lg text-xs gap-2 text-foreground border-border/50 hover:bg-muted/40 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <WhatsappLogo size={16} weight="fill" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </Button>
              )}

              <Button
                asChild
                size="sm"
                className="h-11 px-4 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Link to="/classificados/$id" params={{ id: item.id }}>
                  <span>Ver Detalhes</span>
                  <ArrowRight className="size-3.5 ml-1 inline" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "feed") {
    return (
      <div className="w-72 sm:w-80 shrink-0 h-full flex flex-col">
        <div className="group rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-colors flex flex-col justify-between h-full">
          <Link
            to="/classificados/$id"
            params={{ id: item.id }}
            className="flex-1 flex flex-col cursor-pointer min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
              {img ? (
                <img
                  src={img}
                  alt={item.title}
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="size-full bg-muted/40 flex items-center justify-center">
                  <Tag className="size-7 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap z-10">
                <Badge className="bg-background/95 text-foreground font-mono text-xs uppercase font-bold px-2 py-1 rounded-md border border-border/40">
                  {itemNiche.shortLabel}
                </Badge>
                {item.deal_type && (
                  <Badge
                    variant="secondary"
                    className="text-xs uppercase font-mono font-bold px-2 py-1 bg-background/90 text-foreground border border-border/40 rounded-md"
                  >
                    {isTemporada ? "Temporada" : isAluguel ? "Aluguel" : "Venda"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-4 space-y-2 flex-1 flex flex-col justify-between min-h-0">
              <div>
                <span className="text-lg sm:text-xl font-black text-foreground font-mono block">
                  {formatMoney(item.price_cents || 0)}
                  {(itemNiche.priceSuffix || (isAluguel ? " /mês" : isTemporada ? " /diária" : "")) && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      {itemNiche.priceSuffix || (isAluguel ? "/mês" : "/diária")}
                    </span>
                  )}
                </span>

                <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-tight group-hover:underline mt-1 h-9 overflow-hidden">
                  {item.title}
                </h3>
              </div>

              <div className="pt-2 text-xs text-muted-foreground font-mono flex items-center justify-between h-4">
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="size-3 shrink-0 text-primary" />
                  <span className="truncate">{item.location_name || item.location_text || "Regional"}</span>
                </span>
              </div>
            </div>
          </Link>

          <div className="px-4 pb-3 pt-1 flex items-center gap-2 border-t border-border/40">
            {targetPhone && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleWhatsApp} /* focus-visible: */
                className="h-11 px-3 rounded-lg text-xs gap-1 text-foreground border-border/50 hover:bg-muted/40 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
                title="Chamar no WhatsApp"
              >
                <WhatsappLogo size={16} weight="fill" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
            )}

            <Button
              asChild
              size="sm"
              className="flex-1 h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Link to="/classificados/$id" params={{ id: item.id }}>
                <span>Ver Anúncio</span>
                <ArrowRight className="size-3.5 ml-1 inline" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Grid mode (default)
  return (
    <div className="group rounded-lg border border-border/60 bg-card overflow-hidden hover:border-foreground/30 transition-colors flex flex-col justify-between h-full">
      <Link
        to="/classificados/$id"
        params={{ id: item.id }}
        className="flex-1 flex flex-col cursor-pointer min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-video w-full overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
          {img ? (
            <img
              src={img}
              alt={item.title}
              className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="size-full bg-muted/40 flex items-center justify-center">
              <Tag className="size-7 text-muted-foreground/30" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex items-center gap-1 flex-wrap z-10">
            <Badge className="bg-background/95 text-foreground font-mono text-xs uppercase font-bold px-2 py-1 rounded-lg border border-border/40">
              {itemNiche.shortLabel}
            </Badge>
            {item.deal_type && (
              <Badge
                variant="secondary"
                className="text-xs uppercase font-mono font-bold px-2 py-1 bg-background/90 text-foreground border border-border/40 rounded-md"
              >
                {isTemporada ? "Temporada" : isAluguel ? "Aluguel" : "Venda"}
              </Badge>
            )}
            {(item.is_boosted || item.attributes?.is_boosted) && (
              <Badge variant="secondary" className="bg-background/90 text-foreground border border-border/40 text-xs font-bold px-2 py-1 rounded-md">
                Destaque
              </Badge>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-2 flex-1 flex flex-col justify-between min-h-0">
          <div>
            <span className="text-xl sm:text-2xl font-black text-foreground font-mono block">
              {formatMoney(item.price_cents || 0)}
              {(itemNiche.priceSuffix || (isAluguel ? " /mês" : isTemporada ? " /diária" : "")) && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  {itemNiche.priceSuffix || (isAluguel ? "/mês" : "/diária")}
                </span>
              )}
            </span>

            <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors mt-1 h-11 sm:h-12 overflow-hidden">
              {item.title}
            </h3>
          </div>

          <div className="pt-2 text-xs text-muted-foreground font-mono flex items-center justify-between h-4">
            <span className="flex items-center gap-1 truncate">
              <MapPin className="size-3 shrink-0 text-primary" />
              <span className="truncate">{item.location_name || item.location_text || "Regional"}</span>
            </span>
          </div>
        </div>
      </Link>

      <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center gap-2">
        {targetPhone && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleWhatsApp} /* focus-visible: */
            className="h-11 px-3 rounded-lg text-xs gap-1 border-border/50 text-foreground hover:bg-muted/50 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            title="Chamar no WhatsApp"
          >
            <WhatsappLogo size={16} weight="fill" />
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>
        )}

        <Button
          asChild
          size="sm"
          className="flex-1 h-11 rounded-lg text-xs font-bold bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Link to="/classificados/$id" params={{ id: item.id }}>
            <span>Ver Anúncio</span>
            <ArrowRight className="size-3.5 ml-1 inline" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
