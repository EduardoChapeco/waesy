import { useState, useRef, useEffect } from "react";
import { Loader2, Camera, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { uploadProposalMedia } from "@/services/proposal-storage";
import { getCanonicalMapStyle, setupMapResizeObserver } from "@/lib/map-styles";
import { useQuery } from "@tanstack/react-query";
import { getPublicMapConfig } from "@/services/integrations.functions";

export type Waypoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
};

type Props = {
  agencyId: string;
  proposalId: string;
  waypoints?: Waypoint[];
  onMapCaptured: (url: string) => void;
  onWaypointsChange?: (waypoints: Waypoint[]) => void;
};

export function StudioMapWidget({
  agencyId,
  proposalId,
  waypoints = [],
  onMapCaptured,
  onWaypointsChange,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [localWaypoints, setLocalWaypoints] = useState<Waypoint[]>(waypoints);
  const [searchQuery, setSearchQuery] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [searching, setSearching] = useState(false);

  const { data: mapConfig } = useQuery({
    queryKey: ["public-map-config"],
    queryFn: () => getPublicMapConfig(),
    staleTime: 5 * 60 * 1000,
  });

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapContainer.current || mapRef.current) return;
    let isMounted = true;
    let cleanupResize: (() => void) | undefined;

    const effectiveProvider = mapConfig?.provider || "osm_standard";

    import("maplibre-gl").then((maplibreglModule) => {
      if (!isMounted || !mapContainer.current || mapRef.current) return;
      const maplibregl = (maplibreglModule as any).default || maplibreglModule;

      const initialCenter: [number, number] = localWaypoints.length > 0
        ? [localWaypoints[0].lng, localWaypoints[0].lat]
        : [-52.6152, -27.1004];

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: getCanonicalMapStyle(undefined, effectiveProvider),
        center: initialCenter,
        zoom: localWaypoints.length > 0 ? 5 : 2,
        preserveDrawingBuffer: true,
        attributionControl: false,
      });

      cleanupResize = setupMapResizeObserver(map, mapContainer.current);
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        if (!isMounted) return;
        mapRef.current = map;
        renderWaypoints(map, maplibregl, localWaypoints);
      });
    });

    return () => {
      isMounted = false;
      cleanupResize?.();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mounted]);

  const renderWaypoints = (map: any, maplibregl: any, wps: Waypoint[]) => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (!map || wps.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();

    wps.forEach((wp, idx) => {
      bounds.extend([wp.lng, wp.lat]);

      const el = document.createElement("div");
      el.className = "flex items-center justify-center size-7 rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-md border-2 border-white cursor-pointer";
      el.innerText = `${idx + 1}`;

      const popup = new maplibregl.Popup({ offset: 25 }).setText(wp.label);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([wp.lng, wp.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    if (wps.length > 1) {
      map.fitBounds(bounds, { padding: 40, maxZoom: 14 });
    } else if (wps.length === 1) {
      map.flyTo({ center: [wps[0].lng, wps[0].lat], zoom: 12 });
    }
  };

  useEffect(() => {
    if (mapRef.current) {
      import("maplibre-gl").then((maplibreglModule) => {
        const maplibregl = (maplibreglModule as any).default || maplibreglModule;
        renderWaypoints(mapRef.current, maplibregl, localWaypoints);
      });
    }
  }, [localWaypoints]);

  async function handleSearch() {
    if (!searchQuery) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const result = data[0];
        const newWp: Waypoint = {
          id: Date.now().toString(),
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          label: result.display_name.split(",")[0],
        };
        const updated = [...localWaypoints, newWp];
        setLocalWaypoints(updated);
        setSearchQuery("");
        onWaypointsChange?.(updated);
      } else {
        toast.error("Local não encontrado.");
      }
    } catch {
      toast.error("Erro na busca de endereço.");
    } finally {
      setSearching(false);
    }
  }

  function removeWaypoint(id: string) {
    const updated = localWaypoints.filter((w) => w.id !== id);
    setLocalWaypoints(updated);
    onWaypointsChange?.(updated);
  }

  async function captureMap() {
    if (!mapRef.current) return;
    setCapturing(true);
    try {
      const canvas = mapRef.current.getCanvas();
      canvas.toBlob(
        async (blob: Blob | null) => {
          if (!blob) {
            toast.error("Falha ao capturar tela do mapa.");
            setCapturing(false);
            return;
          }
          const file = new File([blob], `map_${Date.now()}.png`, { type: "image/png" });
          const url = await uploadProposalMedia(agencyId, proposalId, file, "map");
          onMapCaptured(url);
          toast.success("Mapa capturado e salvo com sucesso!");
          setCapturing(false);
        },
        "image/png",
        0.92
      );
    } catch (e: any) {
      toast.error("Falha ao capturar o mapa: " + (e?.message || "Erro"));
      setCapturing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          placeholder="Buscar cidade, hotel ou ponto turístico..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="rounded-xl h-10 text-xs"
        />
        <Button onClick={handleSearch} disabled={searching} variant="secondary" className="rounded-xl h-10 text-xs gap-1.5 shrink-0">
          {searching ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          <span>Adicionar</span>
        </Button>
      </div>

      {localWaypoints.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {localWaypoints.map((wp, i) => (
            <div
              key={wp.id}
              className="flex items-center gap-1.5 bg-muted/70 text-foreground text-xs px-2.5 py-1 rounded-xl border border-border/60"
            >
              <span className="font-bold text-primary">{i + 1}.</span>
              <span className="truncate max-w-[140px]">{wp.label}</span>
              <button
                type="button"
                onClick={() => removeWaypoint(wp.id)}
                className="text-muted-foreground hover:text-destructive ml-1"
                aria-label={`Remover ${wp.label}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative h-[380px] w-full rounded-2xl border border-border/60 overflow-hidden bg-muted/20">
        <div ref={mapContainer} className="h-full w-full" />

        {capturing && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="bg-card p-4 rounded-2xl border border-border flex items-center gap-3 shadow-lg">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="text-xs font-semibold">Capturando mapa em alta resolução...</span>
            </div>
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={captureMap}
        disabled={capturing || localWaypoints.length === 0}
        className="w-full h-10 rounded-xl text-xs font-semibold gap-2"
      >
        <Camera className="size-4" />
        {capturing ? "Processando..." : "Capturar Imagem HD do Mapa"}
      </Button>
    </div>
  );
}
