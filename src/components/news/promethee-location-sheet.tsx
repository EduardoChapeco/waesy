import React, { useMemo, useState } from "react";
import { Check, Compass, Globe, Loader2, MapPin, Navigation, Search, X } from "lucide-react";
import {
  CANONICAL_CITIES,
  findCityByLabel,
  searchCanonicalCities,
  type CityRecord,
} from "@/lib/constants/cities";
import {
  resolveGeoCoordinates,
  syncClientGeoCookie,
  type LocationState,
} from "@/components/location/location-master-pill";

export interface PrometheeLocationSheetProps {
  isOpen: boolean;
  selectedCity: string;
  allCitiesLabel?: string;
  presetCities?: string[];
  onSelectCity: (city: string) => void;
  onClose: () => void;
}

export function PrometheeLocationSheet({
  isOpen,
  selectedCity,
  allCitiesLabel = "Todas as Cidades",
  presetCities = [],
  onSelectCity,
  onClose,
}: PrometheeLocationSheetProps) {
  const [query, setQuery] = useState("");
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsFeedback, setGpsFeedback] = useState<string | null>(null);

  const cityRecords = useMemo<CityRecord[]>(() => {
    if (query.trim().length > 0) {
      return searchCanonicalCities(query, 18);
    }

    if (presetCities.length > 0) {
      const resolvedPresets: CityRecord[] = [];
      for (const name of presetCities) {
        if (!name || name === allCitiesLabel) continue;
        const found = findCityByLabel(name);
        if (found) {
          resolvedPresets.push(found);
        } else {
          resolvedPresets.push({
            id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            name,
            state: "SP",
            label: name,
            region: "Regional",
          });
        }
      }
      if (resolvedPresets.length > 0) return resolvedPresets;
    }

    return CANONICAL_CITIES.filter((c) => c.region.includes("Vale") || c.region.includes("Litoral") || c.region.includes("Mantiqueira")).concat(
      CANONICAL_CITIES.slice(0, 8),
    );
  }, [allCitiesLabel, presetCities, query]);

  if (!isOpen) return null;

  const commitCity = (cityName: string, stateUf = "", lat?: number, lng?: number, source: LocationState["source"] = "manual") => {
    onSelectCity(cityName);
    if (typeof window !== "undefined" && cityName !== allCitiesLabel) {
      const loc: LocationState = {
        city: cityName,
        state: stateUf,
        lat,
        lng,
        address: stateUf ? `${cityName} - ${stateUf}` : cityName,
        source,
      };
      try {
        localStorage.setItem("waesy_master_location", JSON.stringify(loc));
        syncClientGeoCookie(loc);
        window.dispatchEvent(new CustomEvent("waesy:location-updated", { detail: loc }));
      } catch {
        // Ignora falhas de armazenamento privado
      }
    }
    onClose();
  };

  const handleDetectGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsFeedback("Geolocalização indisponível neste dispositivo.");
      return;
    }

    setIsDetectingGps(true);
    setGpsFeedback(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const resolved = await resolveGeoCoordinates(pos.coords.latitude, pos.coords.longitude);
          if (resolved.city) {
            if (typeof localStorage !== "undefined") {
              localStorage.setItem("waesy_geo_permission_granted", "true");
            }
            commitCity(resolved.city, resolved.state, pos.coords.latitude, pos.coords.longitude, "gps");
          } else {
            setGpsFeedback("Não foi possível identificar o município.");
          }
        } catch {
          setGpsFeedback("Falha ao consultar coordenadas de GPS.");
        } finally {
          setIsDetectingGps(false);
        }
      },
      () => {
        setIsDetectingGps(false);
        setGpsFeedback("Permissão de GPS negada. Selecione uma cidade abaixo.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 180000 },
    );
  };

  const isAllActive = selectedCity === allCitiesLabel;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Selecionar localização"
      className="fixed inset-0 z-50 bg-overlay backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="w-full h-dvh sm:h-auto sm:max-h-dvh sm:max-w-lg bg-background text-foreground sm:rounded-3xl border-0 sm:border sm:border-border flex flex-col overflow-hidden safe-top safe-bottom">
        {/* Topo discreto e limpo */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2 min-w-0">
            <Compass className="size-5 text-foreground shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">Localização</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-11 min-h-11 shrink-0 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar seletor de cidade"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Busca + GPS Real */}
        <div className="px-4 sm:px-6 py-4 space-y-3 border-b border-border/60">
          <button
            type="button"
            disabled={isDetectingGps}
            onClick={handleDetectGps}
            className="h-11 min-h-11 w-full px-4 rounded-2xl bg-foreground text-background hover:bg-foreground/90 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isDetectingGps ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
            ) : (
              <Navigation className="size-4" />
            )}
            <span>{isDetectingGps ? "Localizando via GPS..." : "Usar minha localização GPS"}</span>
          </button>

          {gpsFeedback && (
            <p className="text-xs text-muted-foreground px-1">{gpsFeedback}</p>
          )}

          <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/30 px-3 h-11 min-h-11">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cidade ou região..."
              className="w-full h-11 min-h-11 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="size-11 min-h-11 shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                aria-label="Limpar busca"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Cidades */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-2">
          <button
            type="button"
            onClick={() => commitCity(allCitiesLabel)}
            className={`w-full min-h-11 px-4 py-3 rounded-2xl border flex items-center justify-between gap-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isAllActive
                ? "border-foreground bg-muted/60 text-foreground font-bold"
                : "border-border/70 bg-card hover:bg-muted/30 text-foreground"
            }`}
          >
            <div className="flex items-center gap-3">
              <Globe className="size-4 text-muted-foreground shrink-0" />
              <div>
                <span className="block text-sm font-semibold">{allCitiesLabel}</span>
                <span className="block text-xs text-muted-foreground">Cobertura regional completa</span>
              </div>
            </div>
            {isAllActive && <Check className="size-4 text-foreground shrink-0" />}
          </button>

          {cityRecords.map((city) => {
            const active = selectedCity.toLowerCase() === city.name.toLowerCase();
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => commitCity(city.name, city.state, city.lat, city.lng, "manual")}
                className={`w-full min-h-11 px-4 py-3 rounded-2xl border flex items-center justify-between gap-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "border-foreground bg-muted/60 text-foreground font-bold"
                    : "border-border/60 bg-card hover:bg-muted/30 text-foreground"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MapPin className="size-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-sm font-semibold text-anti-truncate">
                      {city.name}{city.state ? ` · ${city.state}` : ""}
                    </span>
                    <span className="block text-xs text-muted-foreground">{city.region}</span>
                  </div>
                </div>
                {active && <Check className="size-4 text-foreground shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
