import React, { useState, useMemo } from "react";
import {
  MapPin,
  Navigation,
  Phone,
  MessageCircle,
  ExternalLink,
  Search,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapLibreCanvas, type MapMarkerItem } from "@/components/mobility/maplibre-canvas";
import { cn } from "@/lib/utils";

export interface MapPlaceItem {
  id: string;
  name: string;
  category: string;
  address: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  phone?: string;
  whatsapp?: string;
  lat?: number;
  lng?: number;
  verified?: boolean;
  source?: string;
}

export interface ArtifactInteractiveMapProps {
  title: string;
  city?: string;
  state?: string;
  places?: MapPlaceItem[];
  userLat?: number;
  userLng?: number;
  className?: string;
}

export function ArtifactInteractiveMap({
  title,
  city = "",
  state = "",
  places = [],
  userLat,
  userLng,
  className,
}: ArtifactInteractiveMapProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    places[0]?.id || null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Categorias únicas
  const categories = useMemo(() => {
    const set = new Set<string>();
    places.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [places]);

  // Filtragem
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      const matchSearch =
        !searchTerm.trim() ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.neighborhood && p.neighborhood.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory =
        selectedCategory === "all" || p.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [places, searchTerm, selectedCategory]);

  const activePlace = useMemo(() => {
    return places.find((p) => p.id === selectedPlaceId) || filteredPlaces[0] || null;
  }, [places, selectedPlaceId, filteredPlaces]);

  const handleCopyContact = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMapUrl = (place: MapPlaceItem) => {
    if (place.lat && place.lng) {
      return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
    }
    const query = encodeURIComponent(`${place.name}, ${place.address}, ${city} - ${state}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const getWhatsappUrl = (phone?: string) => {
    if (!phone) return "#";
    const cleanPhone = phone.replace(/\D/g, "");
    const formatted = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${formatted}`;
  };

  const mapMarkers: MapMarkerItem[] = useMemo(() => {
    return filteredPlaces
      .filter((p) => typeof p.lat === "number" && typeof p.lng === "number" && Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => ({
        id: p.id,
        lat: Number(p.lat),
        lng: Number(p.lng),
        title: p.name,
        kind: p.category,
        category: p.category,
      }));
  }, [filteredPlaces]);

  const mapCenter = useMemo(() => {
    if (activePlace && typeof activePlace.lat === "number" && typeof activePlace.lng === "number") {
      return { lat: activePlace.lat, lng: activePlace.lng };
    }
    if (mapMarkers.length > 0) {
      return { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng };
    }
    if (typeof userLat === "number" && typeof userLng === "number") {
      return { lat: userLat, lng: userLng };
    }
    return undefined;
  }, [activePlace, mapMarkers, userLat, userLng]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Cabeçalho do Mapa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary shrink-0" />
            <h2 className="text-base font-bold text-foreground">{title}</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredPlaces.length} locais mapeados{city ? ` em ${city}${state ? ` - ${state}` : ""}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {city && (
            <Badge variant="outline" className="text-2xs font-mono">
              {city}{state ? ` / ${state}` : ""}
            </Badge>
          )}
          <Badge variant="secondary" className="text-2xs">
            OpenStreetMap
          </Badge>
        </div>
      </div>

      {/* Canvas Interativo Real (MapLibre + OSM) */}
      <div className="h-64 w-full rounded-2xl overflow-hidden border border-border bg-muted">
        <MapLibreCanvas
          markers={mapMarkers}
          selectedMarkerId={activePlace?.id || null}
          onMarkerClick={(marker) => setSelectedPlaceId(marker.id)}
          center={mapCenter}
          zoom={mapMarkers.length > 1 ? 13 : 14}
        />
      </div>

      {/* Controles de Busca e Filtro */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, bairro ou endereço..."
            className="pl-9 h-11 rounded-xl text-xs"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "h-11 min-h-11 px-4 rounded-xl text-2xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selectedCategory === "all"
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              Todos ({places.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "h-11 min-h-11 px-4 rounded-xl text-2xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selectedCategory === cat
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cartão Squircle de Destaque do Local Selecionado */}
      {activePlace && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-foreground truncate">
                  {activePlace.name}
                </h3>
                {activePlace.verified && (
                  <Badge variant="secondary" className="text-2xs gap-1">
                    <CheckCircle2 className="size-3 text-success" />
                    Verificado
                  </Badge>
                )}
              </div>
              <Badge variant="outline" className="text-2xs">
                {activePlace.category}
              </Badge>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              asChild
              className="h-11 min-h-11 px-3 rounded-xl text-xs gap-2 focus-visible:ring-2 focus-visible:ring-ring shrink-0"
            >
              <a
                href={getMapUrl(activePlace)}
                target="_blank"
                rel="noreferrer noopener"
                className="min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Navigation className="size-4" />
                <span>Traçar Rota</span>
              </a>
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p className="flex items-center gap-2">
              <MapPin className="size-3.5 text-muted-foreground shrink-0" />
              <span>
                {activePlace.address}
                {activePlace.neighborhood ? ` - ${activePlace.neighborhood}` : ""}
              </span>
            </p>

            {(activePlace.phone || activePlace.whatsapp) && (
              <p className="flex items-center gap-2 font-mono">
                <Phone className="size-3.5 text-muted-foreground shrink-0" />
                <span>{activePlace.phone || activePlace.whatsapp}</span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {activePlace.whatsapp && (
              <Button
                type="button"
                variant="default"
                size="sm"
                asChild
                className="h-11 min-h-11 px-4 rounded-xl text-xs gap-2 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <a
                  href={getWhatsappUrl(activePlace.whatsapp)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <MessageCircle className="size-4" />
                  <span>Chamar no WhatsApp</span>
                </a>
              </Button>
            )}

            {(activePlace.phone || activePlace.whatsapp) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  handleCopyContact(
                    activePlace.id,
                    activePlace.phone || activePlace.whatsapp || ""
                  )
                }
                className="h-11 min-h-11 px-4 rounded-xl text-xs gap-2 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {copiedId === activePlace.id ? (
                  <Check className="size-4 text-success" />
                ) : (
                  <Copy className="size-4" />
                )}
                <span>
                  {copiedId === activePlace.id ? "Copiado!" : "Copiar Contato"}
                </span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Lista de Locais Mapeados */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-foreground">
          Locais Encontrados ({filteredPlaces.length})
        </h4>

        {filteredPlaces.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-2xl">
            Nenhum estabelecimento corresponde aos filtros informados.
          </div>
        ) : (
          <div className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
            {filteredPlaces.map((place) => {
              const isSelected = place.id === selectedPlaceId;

              return (
                <div
                  key={place.id}
                  className={cn(
                    "w-full p-3 text-xs transition-colors flex items-center justify-between gap-3",
                    isSelected ? "bg-surface-active" : "hover:bg-surface-hover"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPlaceId(place.id)}
                    className="flex-1 text-left min-w-0 min-h-11 flex flex-col justify-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground truncate">
                        {place.name}
                      </span>
                      <Badge variant="outline" className="text-2xs shrink-0">
                        {place.category}
                      </Badge>
                    </div>
                    <p className="text-2xs text-muted-foreground truncate">
                      {place.address}
                      {place.neighborhood ? ` · ${place.neighborhood}` : ""}
                    </p>
                  </button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    asChild
                    className="size-11 min-w-11 min-h-11 p-0 text-muted-foreground hover:text-foreground shrink-0 rounded-xl"
                  >
                    <a
                      href={getMapUrl(place)}
                      target="_blank"
                      rel="noreferrer noopener"
                      title="Abrir rota externa"
                      className="min-h-11 min-w-11 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
