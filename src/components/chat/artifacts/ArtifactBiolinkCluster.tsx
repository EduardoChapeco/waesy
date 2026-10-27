import React from "react";
import {
  MessageCircle,
  MapPin,
  Instagram,
  Globe,
  ExternalLink,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface BiolinkPlaceItem {
  id: string;
  name: string;
  segment?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  whatsapp?: string;
  instagram?: string;
  website?: string;
  cnpj?: string;
  isVerified?: boolean;
}

export interface ArtifactBiolinkClusterProps {
  title: string;
  subtitle?: string;
  places: BiolinkPlaceItem[];
  className?: string;
}

export function ArtifactBiolinkCluster({
  title,
  subtitle,
  places = [],
  className,
}: ArtifactBiolinkClusterProps) {
  const openExternal = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={cn("rounded-lg border border-border/50 bg-card p-4 space-y-3", className)}>
      {/* Cabeçalho */}
      <div className="flex flex-col border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-primary" aria-hidden="true" />
          <h4 className="text-sm font-bold text-foreground leading-snug">{title}</h4>
        </div>
        {subtitle && <p className="text-2xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      {/* Lista de Empresas / Biolinks */}
      <div className="space-y-3">
        {places.map((place) => {
          const cleanPhone = (place.whatsapp || place.phone || "").replace(/\D/g, "");
          const whatsappUrl = cleanPhone
            ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá! Encontrei seu contato no Waesy.`)}`
            : null;
          const mapsUrl = place.address
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.address}, ${place.city || ""}`)}`
            : null;
          const instaUrl = place.instagram
            ? place.instagram.startsWith("http")
              ? place.instagram
              : `https://instagram.com/${place.instagram.replace(/^@/, "")}`
            : null;

          return (
            <div
              key={place.id}
              className="rounded-lg border border-border/40 bg-muted/20 p-4 space-y-3 hover:border-border transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="font-bold text-sm text-foreground">{place.name}</h5>
                    {place.isVerified && (
                      <Badge variant="secondary" className="text-2xs flex items-center gap-1 h-5">
                        <ShieldCheck className="size-3 text-primary" />
                        <span>Verificado</span>
                      </Badge>
                    )}
                  </div>
                  {place.segment && (
                    <span className="text-2xs text-primary font-medium block mt-1">
                      {place.segment}
                    </span>
                  )}
                  {place.address && (
                    <p className="text-2xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="size-3 shrink-0" />
                      <span>{place.address}{place.city ? `, ${place.city}` : ""}</span>
                    </p>
                  )}
                  {place.cnpj && (
                    <span className="text-2xs text-muted-foreground font-mono block mt-1">
                      CNPJ: {place.cnpj}
                    </span>
                  )}
                </div>
              </div>

              {/* Botões Táteis com Altura Mínima Canônica de 44px (h-11) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-border/40">
                {whatsappUrl ? (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => openExternal(whatsappUrl)}
                    className="h-11 min-h-11 px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="size-4" />
                    <span>WhatsApp</span>
                  </Button>
                ) : null}

                {mapsUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openExternal(mapsUrl)}
                    className="h-11 min-h-11 px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <MapPin className="size-4" />
                    <span>Como Chegar</span>
                  </Button>
                ) : null}

                {instaUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openExternal(instaUrl)}
                    className="h-11 min-h-11 px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Instagram className="size-4" />
                    <span>Instagram</span>
                  </Button>
                ) : place.website ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openExternal(place.website!)}
                    className="h-11 min-h-11 px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Globe className="size-4" />
                    <span>Website</span>
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}

        {places.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-md">
            Nenhuma empresa cadastrada no bloco no momento.
          </div>
        )}
      </div>
    </div>
  );
}
