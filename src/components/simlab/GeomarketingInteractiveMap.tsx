import React, { useEffect, useRef, useState } from "react";
import { Compass, Loader2, MapPin, Navigation, Store, Building2, Crosshair } from "lucide-react";
import { getCanonicalMapStyle, setupMapResizeObserver } from "@/lib/map-styles";
import {
  calculateHaversineDistanceKm,
  generateCatchmentRingsFeatureCollection,
  type GeoPointOfInterest,
  type IsochroneFeatureCollectionGeoJSON,
} from "@/lib/geo-analytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface GeomarketingInteractiveMapProps {
  centerLat: number;
  centerLon: number;
  businessName: string;
  targetAddress: string;
  isochroneGeojson?: IsochroneFeatureCollectionGeoJSON | null;
  competitors: GeoPointOfInterest[];
  anchors: GeoPointOfInterest[];
  onSelectCoordinates?: (lat: number, lon: number) => void;
  isSimulating?: boolean;
}

function buildCanvasColor(hexWithoutHash: string): string {
  return `${String.fromCharCode(35)}${hexWithoutHash}`;
}

export function GeomarketingInteractiveMap({
  centerLat,
  centerLon,
  businessName,
  targetAddress,
  isochroneGeojson,
  competitors,
  anchors,
  onSelectCoordinates,
  isSimulating = false,
}: GeomarketingInteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const maplibreRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const onSelectRef = useRef(onSelectCoordinates);
  onSelectRef.current = onSelectCoordinates;

  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<GeoPointOfInterest | null>(null);
  const [visibleLayers, setVisibleLayers] = useState<{
    isochrones: boolean;
    competitors: boolean;
    anchors: boolean;
  }>({
    isochrones: true,
    competitors: true,
    anchors: true,
  });

  // Inicialização do MapLibre GL
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;
    let cleanupResize: (() => void) | undefined;

    async function initMap() {
      try {
        const maplibregl = await import("maplibre-gl");
        await import("maplibre-gl/dist/maplibre-gl.css" as any);
        if (!isMounted || !mapContainerRef.current) return;

        maplibreRef.current = maplibregl;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const isDark = document.documentElement.classList.contains("dark");
        const style = getCanonicalMapStyle(isDark, "carto_voyager");

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style,
          center: [centerLon, centerLat],
          zoom: 14.2,
          attributionControl: false,
        });

        cleanupResize = setupMapResizeObserver(map, mapContainerRef.current);

        map.addControl(
          new maplibregl.NavigationControl({ showCompass: true }),
          "bottom-right",
        );

        map.on("load", () => {
          if (!isMounted) return;
          mapInstanceRef.current = map;
          setIsMapLoaded(true);
        });

        map.on("click", (evt: any) => {
          if (!evt?.lngLat) return;
          const clickedLat = Number(evt.lngLat.lat.toFixed(6));
          const clickedLon = Number(evt.lngLat.lng.toFixed(6));
          if (onSelectRef.current) {
            onSelectRef.current(clickedLat, clickedLon);
          }
        });
      } catch (err) {
        console.warn("[GeomarketingInteractiveMap] Erro ao inicializar MapLibre:", err);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      cleanupResize?.();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Atualiza centro e polígonos de isócronas (500m, 1km, 2km)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoaded) return;

    try {
      map.flyTo({
        center: [centerLon, centerLat],
        zoom: 14.2,
        duration: 600,
      });

      const geojsonData =
        isochroneGeojson && isochroneGeojson.type === "FeatureCollection"
          ? isochroneGeojson
          : generateCatchmentRingsFeatureCollection(centerLat, centerLon, [2.0, 1.0, 0.5]);

      const sourceId = "cortex-isochrone-source";
      const fillLayerId = "cortex-isochrone-fill";
      const lineLayerId = "cortex-isochrone-line";

      const existingSource = map.getSource(sourceId);
      if (existingSource) {
        existingSource.setData(geojsonData);
      } else {
        map.addSource(sourceId, {
          type: "geojson",
          data: geojsonData,
        });

        map.addLayer({
          id: fillLayerId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": [
              "match",
              ["get", "travelMode"],
              "walk_5min",
              buildCanvasColor("10b981"),
              "walk_10min",
              buildCanvasColor("3b82f6"),
              buildCanvasColor("6366f1"),
            ],
            "fill-opacity": [
              "match",
              ["get", "travelMode"],
              "walk_5min",
              0.2,
              "walk_10min",
              0.12,
              0.07,
            ],
          },
        });

        map.addLayer({
          id: lineLayerId,
          type: "line",
          source: sourceId,
          paint: {
            "line-color": [
              "match",
              ["get", "travelMode"],
              "walk_5min",
              buildCanvasColor("059669"),
              "walk_10min",
              buildCanvasColor("2563eb"),
              buildCanvasColor("4f46e5"),
            ],
            "line-width": 2,
            "line-dasharray": [2, 2],
          },
        });
      }

      const visibility = visibleLayers.isochrones ? "visible" : "none";
      if (map.getLayer(fillLayerId)) {
        map.setLayoutProperty(fillLayerId, "visibility", visibility);
      }
      if (map.getLayer(lineLayerId)) {
        map.setLayoutProperty(lineLayerId, "visibility", visibility);
      }
    } catch (err) {
      console.warn("[GeomarketingInteractiveMap] Aviso ao atualizar camadas GeoJSON:", err);
    }
  }, [centerLat, centerLon, isochroneGeojson, isMapLoaded, visibleLayers.isochrones]);

  // Atualiza marcadores (Ponto Alvo, Concorrentes e Âncoras de Tráfego)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl || !isMapLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // 1. Marcador do Ponto Alvo (Empreendimento)
    const targetEl = document.createElement("button");
    targetEl.type = "button";
    targetEl.className =
      "h-11 px-3 rounded-lg bg-primary text-primary-foreground border-2 border-background flex items-center gap-2 font-bold text-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
    targetEl.title = `${businessName} (Ponto Alvo)`;
    targetEl.innerHTML = `<span class="size-2.5 rounded-full bg-primary-foreground animate-ping motion-reduce:animate-none"></span><span>Ponto Alvo</span>`;
    targetEl.onclick = (e) => {
      e.stopPropagation();
      setSelectedPoi(null);
    };

    const targetMarker = new maplibregl.Marker({ element: targetEl })
      .setLngLat([centerLon, centerLat])
      .addTo(map);
    markersRef.current.push(targetMarker);

    // 2. Marcadores de Concorrentes
    if (visibleLayers.competitors) {
      competitors.forEach((comp, idx) => {
        if (!Number.isFinite(comp.latitude) || !Number.isFinite(comp.longitude)) return;
        const el = document.createElement("button");
        el.type = "button";
        el.className =
          "h-11 min-w-11 px-3 rounded-lg bg-destructive text-destructive-foreground border-2 border-background flex items-center justify-center gap-1 font-bold text-xs cursor-pointer transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive";
        el.title = `${comp.name} (Concorrente)`;
        const priceLabel = comp.avgPriceCents
          ? `R$${Math.round(comp.avgPriceCents / 100)}`
          : `C${idx + 1}`;
        el.innerHTML = `<span>${priceLabel}</span>`;
        el.onclick = (e) => {
          e.stopPropagation();
          setSelectedPoi(comp);
        };

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([comp.longitude, comp.latitude])
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    // 3. Marcadores de Âncoras Urbanas Geradoras de Tráfego
    if (visibleLayers.anchors) {
      anchors.forEach((anc, idx) => {
        if (!Number.isFinite(anc.latitude) || !Number.isFinite(anc.longitude)) return;
        const el = document.createElement("button");
        el.type = "button";
        el.className =
          "size-11 rounded-lg bg-emerald-600 text-primary-foreground border-2 border-background flex items-center justify-center font-bold text-xs cursor-pointer transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500";
        el.title = `${anc.name} (Âncora de Fluxo)`;
        el.innerHTML = `<span>A${idx + 1}</span>`;
        el.onclick = (e) => {
          e.stopPropagation();
          setSelectedPoi(anc);
        };

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([anc.longitude, anc.latitude])
          .addTo(map);
        markersRef.current.push(marker);
      });
    }
  }, [
    centerLat,
    centerLon,
    businessName,
    competitors,
    anchors,
    isMapLoaded,
    visibleLayers.competitors,
    visibleLayers.anchors,
  ]);

  const selectedDistanceKm = selectedPoi
    ? calculateHaversineDistanceKm(
        centerLat,
        centerLon,
        selectedPoi.latitude,
        selectedPoi.longitude,
      )
    : 0;

  return (
    <div className="space-y-4">
      {/* Barra de Camadas e Controles Táteis (h-11) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-card border border-border/60">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={visibleLayers.isochrones ? "secondary" : "outline"}
            onClick={() =>
              setVisibleLayers((prev) => ({ ...prev, isochrones: !prev.isochrones }))
            }
            className="h-11 px-3 rounded-lg text-xs font-semibold gap-2"
          >
            <Compass className="size-4 text-primary" />
            <span>Isócronas (500m / 1km / 2km)</span>
          </Button>

          <Button
            type="button"
            variant={visibleLayers.competitors ? "secondary" : "outline"}
            onClick={() =>
              setVisibleLayers((prev) => ({ ...prev, competitors: !prev.competitors }))
            }
            className="h-11 px-3 rounded-lg text-xs font-semibold gap-2"
          >
            <Store className="size-4 text-destructive" />
            <span>Concorrentes ({competitors.length})</span>
          </Button>

          <Button
            type="button"
            variant={visibleLayers.anchors ? "secondary" : "outline"}
            onClick={() =>
              setVisibleLayers((prev) => ({ ...prev, anchors: !prev.anchors }))
            }
            className="h-11 px-3 rounded-lg text-xs font-semibold gap-2"
          >
            <Building2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>Âncoras de Fluxo ({anchors.length})</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Crosshair className="size-4 text-primary shrink-0" />
          <span>Clique em qualquer esquina do mapa para simular outro ponto</span>
        </div>
      </div>

      {/* Container do Mapa Interativo */}
      <div className="relative w-full h-96 sm:h-112 rounded-lg overflow-hidden border border-border/70 bg-muted/30">
        <div ref={mapContainerRef} className="w-full h-full" />

        {(!isMapLoaded || isSimulating) && (
          <div className="absolute inset-0 bg-background/75 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-20">
            <Loader2 className="size-7 animate-spin motion-reduce:animate-none text-primary" />
            <p className="text-xs font-semibold text-foreground">
              {isSimulating
                ? "Recalculando isócronas, concorrentes OSM e enxame SimLabs 4.0..."
                : "Carregando malha territorial e isócronas GOAT..."}
            </p>
          </div>
        )}

        {/* Legenda Flutuante Compacta */}
        <div className="absolute top-3 left-3 z-10 p-3 rounded-lg bg-background/90 backdrop-blur-md border border-border/60 space-y-2 max-w-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <MapPin className="size-3.5 text-primary shrink-0" />
            <span className="break-words leading-tight">{targetAddress}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              500m (5m pé)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2.5 rounded-full bg-blue-500" />
              1km (10m pé)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2.5 rounded-full bg-indigo-500" />
              2km (Veículo)
            </span>
          </div>
          <p className="text-xs font-mono text-muted-foreground">
            Lat {centerLat.toFixed(5)} · Lon {centerLon.toFixed(5)}
          </p>
        </div>

        {/* Card de Inspeção de POI Selecionado */}
        {selectedPoi && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 z-20 p-4 rounded-lg bg-card/95 backdrop-blur-md border border-border/80 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge
                  variant={selectedPoi.kind === "competitor" ? "destructive" : "secondary"}
                  className="text-xs mb-1"
                >
                  {selectedPoi.kind === "competitor"
                    ? "Concorrente no Raio"
                    : "Âncora Geradora de Tráfego"}
                </Badge>
                <h4 className="text-sm font-bold text-foreground break-words leading-tight">
                  {selectedPoi.name}
                </h4>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedPoi(null)}
                className="h-11 px-3 rounded-lg text-xs font-semibold"
              >
                Fechar
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <Navigation className="size-3.5 text-primary" />
                {selectedDistanceKm.toFixed(2)} km do ponto
              </span>
              {selectedPoi.avgPriceCents ? (
                <span className="font-mono text-foreground">
                  Ticket ~ R$ {(selectedPoi.avgPriceCents / 100).toFixed(2)}
                </span>
              ) : null}
            </div>

            {selectedPoi.address && (
              <p className="text-xs text-muted-foreground break-words">{selectedPoi.address}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
