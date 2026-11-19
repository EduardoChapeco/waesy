import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Plane, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TOKEN_HEX } from "@/lib/design-tokens";
import { getCanonicalMapStyle, setupMapResizeObserver } from "@/lib/map-styles";
import { getAirportsByIatasFn } from "@/services/tourism-airports.functions";
import {
  extractUniqueRouteIatas,
  FLIGHT_ROUTE_DISCLAIMER,
  resolveFlightRouteModel,
  type FlightSegmentRouteInput,
} from "@/lib/tourism/flight-route-geometry";
import { FlightRouteSvgMap } from "./FlightRouteSvgMap";

export interface FlightRouteMapProps {
  segments: FlightSegmentRouteInput[];
  tone?: "light" | "dark";
  accentColor?: string;
  heightClass?: string;
  className?: string;
}

/**
 * Interactive Geodesic Flight Route Map with automatic layover resolution from
 * `public.airports_global`, distinct Ida/Volta geodesic dashed arcs, layover popups,
 * `preserveDrawingBuffer: true`, and automatic crisp SVG fallback on non-WebGL/offline envs.
 */
export function FlightRouteMap({
  segments,
  tone = "light",
  accentColor,
  heightClass = "h-64 sm:h-72",
  className = "",
}: FlightRouteMapProps) {
  const uniqueIatas = useMemo(() => extractUniqueRouteIatas(segments), [segments]);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const { data: dbAirportsRes, isLoading: isLoadingAirports } = useQuery({
    queryKey: ["flight-route-airports", uniqueIatas.join(",")],
    queryFn: () => getAirportsByIatasFn({ data: { iatas: uniqueIatas } }),
    enabled: uniqueIatas.length >= 2,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const dbAirports = dbAirportsRes?.airports || [];
  const routeModel = useMemo(
    () => resolveFlightRouteModel(segments, dbAirports),
    [segments, dbAirports],
  );

  const idaColor = accentColor || TOKEN_HEX.blue600;
  const voltaColor = tone === "dark" ? TOKEN_HEX.neutral300 : TOKEN_HEX.neutral600;
  const layoverColor = TOKEN_HEX.amber500;

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !containerRef.current ||
      routeModel.stops.length < 2 ||
      mapFailed
    ) {
      return;
    }

    let isMounted = true;
    let cleanupResize: (() => void) | undefined;

    import("maplibre-gl")
      .then((maplibreglModule) => {
        if (!isMounted || !containerRef.current) return;
        import("maplibre-gl/dist/maplibre-gl.css" as any).catch(() => {});
        const maplibregl = (maplibreglModule as any).default || maplibreglModule;

        const firstStop = routeModel.stops[0];
        const map = new maplibregl.Map({
          container: containerRef.current,
          style: getCanonicalMapStyle(tone === "dark", "osm_standard"),
          center: [firstStop.lng, firstStop.lat],
          zoom: 3.5,
          preserveDrawingBuffer: true,
          attributionControl: false,
        });

        cleanupResize = setupMapResizeObserver(map, containerRef.current);
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

        map.on("error", () => {
          // Do not break the map for single tile failures unless core WebGL fails
        });

        map.on("load", () => {
          if (!isMounted) return;
          mapRef.current = map;
          setMapReady(true);
          syncMapFeatures(map, maplibregl);
        });
      })
      .catch(() => {
        if (isMounted) setMapFailed(true);
      });

    return () => {
      isMounted = false;
      cleanupResize?.();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      try {
        mapRef.current?.remove();
      } catch {
        // Ignore cleanup errors on unmounted WebGL context
      }
      mapRef.current = null;
      setMapReady(false);
    };
  }, [tone, mapFailed]);

  const syncMapFeatures = (map: any, maplibregl: any) => {
    if (!map || !map.isStyleLoaded?.()) return;

    const idaFeatures = routeModel.legs
      .filter((leg) => leg.direction === "ida")
      .map((leg) => ({
        type: "Feature" as const,
        properties: { direction: "ida", from: leg.from.iata, to: leg.to.iata },
        geometry: {
          type: "LineString" as const,
          coordinates: leg.arcPoints,
        },
      }));

    const voltaFeatures = routeModel.legs
      .filter((leg) => leg.direction === "volta")
      .map((leg) => ({
        type: "Feature" as const,
        properties: { direction: "volta", from: leg.from.iata, to: leg.to.iata },
        geometry: {
          type: "LineString" as const,
          coordinates: leg.arcPoints,
        },
      }));

    const idaGeo = { type: "FeatureCollection" as const, features: idaFeatures };
    const voltaGeo = { type: "FeatureCollection" as const, features: voltaFeatures };

    if (map.getSource("route-ida")) {
      (map.getSource("route-ida") as any).setData(idaGeo);
    } else {
      map.addSource("route-ida", { type: "geojson", data: idaGeo });
      map.addLayer({
        id: "route-ida-line",
        type: "line",
        source: "route-ida",
        paint: {
          "line-color": idaColor,
          "line-width": 3,
          "line-opacity": 0.9,
        },
      });
    }

    if (map.getSource("route-volta")) {
      (map.getSource("route-volta") as any).setData(voltaGeo);
    } else {
      map.addSource("route-volta", { type: "geojson", data: voltaGeo });
      map.addLayer({
        id: "route-volta-line",
        type: "line",
        source: "route-volta",
        paint: {
          "line-color": voltaColor,
          "line-width": 2.4,
          "line-dasharray": [2, 2],
          "line-opacity": 0.85,
        },
      });
    }

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = new maplibregl.LngLatBounds();
    for (const stop of routeModel.stops) {
      bounds.extend([stop.lng, stop.lat]);
      const isLayover = stop.role === "layover";
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute(
        "aria-label",
        `${stop.iata} - ${stop.city}${isLayover ? " (Conexão / Escala)" : ""}`,
      );
      el.className =
        "px-2 py-1 rounded-full text-xs font-mono font-bold border shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
      el.style.backgroundColor = isLayover ? layoverColor : idaColor;
      el.style.color = TOKEN_HEX.white;
      el.style.borderColor = TOKEN_HEX.white;
      el.textContent = stop.iata;

      const roleLabel =
        stop.role === "origin"
          ? "Origem"
          : stop.role === "destination"
            ? "Destino Principal"
            : "Conexão / Escala";

      const popup = new maplibregl.Popup({ offset: 18 }).setText(
        `${stop.iata} · ${stop.city} — ${stop.name} (${roleLabel})`,
      );
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([stop.lng, stop.lat])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    }

    if (routeModel.stops.length >= 2) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 6.5, duration: 400 });
    }
  };

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    import("maplibre-gl")
      .then((maplibreglModule) => {
        const maplibregl = (maplibreglModule as any).default || maplibreglModule;
        syncMapFeatures(mapRef.current, maplibregl);
      })
      .catch(() => {});
  }, [mapReady, routeModel, idaColor, voltaColor]);

  if (routeModel.stops.length === 0) {
    return null;
  }

  if (mapFailed || routeModel.stops.length < 2) {
    return (
      <FlightRouteSvgMap
        segments={segments}
        airportsData={dbAirports}
        tone={tone}
        accentColor={accentColor}
        className={className}
      />
    );
  }

  const layovers = routeModel.stops.filter((s) => s.role === "layover");
  const hasVolta = routeModel.legs.some((l) => l.direction === "volta");

  return (
    <div className={`rounded-xl border border-border bg-card overflow-hidden ${className}`}>
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Plane className="size-4 text-primary shrink-0" />
          <span>Mapa Interativo da Rota Aérea</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {isLoadingAirports && (
            <Skeleton className="h-4 w-24 rounded-full" aria-label="Carregando coordenadas" />
          )}
          <span className="inline-flex items-center gap-2">
            <svg width="20" height="8" viewBox="0 0 20 8" aria-hidden="true">
              <line x1="1" y1="4" x2="19" y2="4" stroke={idaColor} strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span>Ida</span>
          </span>
          {hasVolta && (
            <span className="inline-flex items-center gap-2">
              <svg width="20" height="8" viewBox="0 0 20 8" aria-hidden="true">
                <line
                  x1="1"
                  y1="4"
                  x2="19"
                  y2="4"
                  stroke={voltaColor}
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                />
              </svg>
              <span>Volta</span>
            </span>
          )}
          {layovers.length > 0 && (
            <Badge variant="outline" className="text-xs font-semibold gap-1">
              <MapPin className="size-3 text-warning-strong" />
              <span>
                {layovers.length} conexão(ões): {layovers.map((l) => l.iata).join(", ")}
              </span>
            </Badge>
          )}
        </div>
      </div>

      <div className={`relative w-full bg-muted ${heightClass}`}>
        <div ref={containerRef} className="size-full" />
        {!mapReady && (
          <div className="absolute inset-0 bg-card flex items-center justify-center p-2 pointer-events-none">
            <FlightRouteSvgMap
              segments={segments}
              airportsData={dbAirports}
              tone={tone}
              accentColor={accentColor}
              showDisclaimer={false}
              className="w-full"
            />
          </div>
        )}
      </div>

      <div className="px-3 py-2 bg-muted/20 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          {routeModel.stops.map((stop) => (
            <span key={stop.iata} className="inline-flex items-center gap-1 font-medium text-foreground">
              <span className="font-mono font-bold">{stop.iata}</span>
              <span className="text-muted-foreground">({stop.city})</span>
            </span>
          ))}
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Info className="size-3.5 shrink-0" />
          <span>{FLIGHT_ROUTE_DISCLAIMER}</span>
        </span>
      </div>
    </div>
  );
}
