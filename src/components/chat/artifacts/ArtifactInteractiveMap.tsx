import React, { useState, useMemo } from "react";
import {
  MapPin,
  Navigation,
  Phone,
  MessageCircle,
  ExternalLink,
  Search,
  Building,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  city = "Chapecó",
  state = "SC",
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

  return (
    <div className={cn("space-y-4", className)}>
      {/* Cabeçalho do Mapa */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary shrink-0" />
            <h2 className="text-base font-bold text-foreground">{title}</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredPlaces.length} locais mapeados em {city} - {state}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-2xs font-mono">
            {city} / {state}
          </Badge>
          <Badge variant="secondary" className="text-2xs">
            OpenStreetMap Verificado
          </Badge>
        </div>
      </div>

      {/* Controles de Busca e Filtro */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, bairro ou endereço..."
            className="pl-9 h-11 text-xs"
          />
        </div>

        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "px-3 py-1 rounded-full text-2xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground"
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
                  "px-3 py-1 rounded-full text-2xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Visualização de Destaque / Painel do Local Selecionado */}
      {activePlace && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  {activePlace.name}
                </h3>
                {activePlace.verified && (
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-2xs">
                    <CheckCircle2 className="size-3 mr-1" />
                    Verificado
                  </Badge>
                )}
              </div>
              <Badge variant="secondary" className="text-2xs">
                {activePlace.category}
              </Badge>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              asChild
              className="h-11 min-h-11 px-3 text-xs gap-2 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <a
                href={getMapUrl(activePlace)}
                target="_blank"
                rel="noreferrer noopener"
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

          <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
            {activePlace.whatsapp && (
              <Button
                type="button"
                variant="default"
                size="sm"
                asChild
                className="h-11 min-h-11 px-3 text-xs gap-2 bg-emerald-600 hover:bg-emerald-700 text-primary-foreground focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <a
                  href={getWhatsappUrl(activePlace.whatsapp)}
                  target="_blank"
                  rel="noreferrer noopener"
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
                className="h-11 min-h-11 px-3 text-xs gap-2"
              >
                {copiedId === activePlace.id ? (
                  <Check className="size-4 text-emerald-600" />
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
          <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border/60 rounded-xl">
            Nenhum estabelecimento corresponde aos filtros informados.
          </div>
        ) : (
          <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card overflow-hidden">
            {filteredPlaces.map((place) => {
              const isSelected = place.id === selectedPlaceId;

              return (
                <button
                  type="button"
                  key={place.id}
                  onClick={() => setSelectedPlaceId(place.id)}
                  className={cn(
                    "w-full text-left p-3 text-xs transition-colors cursor-pointer flex items-center justify-between gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isSelected
                      ? "bg-primary/10 border-l-4 border-l-primary"
                      : "hover:bg-muted/40"
                  )}
                >
                  <div className="space-y-1 min-w-0">
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
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      asChild
                      className="size-11 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <a
                        href={getMapUrl(place)}
                        target="_blank"
                        rel="noreferrer noopener"
                        title="Ver no mapa"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
