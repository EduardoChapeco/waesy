import { useEffect, useRef, useState } from "react";
import { Loader2, MapPinOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getPublicMapConfig } from "@/services/integrations.functions";

import { getCanonicalMapStyle, setupMapResizeObserver } from "@/lib/map-styles";

export interface MapPoint {
 lat: number;
 lng: number;
 label?: string;
}

export interface MapMarkerItem {
 id: string;
 lat: number;
 lng: number;
 title: string;
 kind?: string;
 category?: string;
 avatar_url?: string | null;
 image_url?: string | null;
}

export interface MapLibreCanvasProps {
 origin?: MapPoint | null;
 destination?: MapPoint | null;
 markers?: MapMarkerItem[];
 selectedMarkerId?: string | null;
 onMarkerClick?: (marker: MapMarkerItem) => void;
 center?: { lat: number; lng: number };
 zoom?: number;
 pinMode?: "origin" | "destination" | null;
 onMapClick?: (lat: number, lng: number) => void;
 provider?: "carto_voyager" | "carto_dark" | "osm_standard" | "google_maps" | "mapbox" | string | null;
 className?: string;
}

const DEFAULT_CENTER = { lat: -27.1004, lng: -52.6152 }; // Chapecó - SC

export function MapLibreCanvas({
 origin = null,
 destination = null,
 markers = [],
 selectedMarkerId = null,
 onMarkerClick,
 center = DEFAULT_CENTER,
 zoom = 13.5,
 pinMode = null,
 onMapClick,
 provider = null,
 className = "",
}: MapLibreCanvasProps) {
 const mapContainer = useRef<HTMLDivElement>(null);
 const mapRef = useRef<any>(null);
 const maplibreModuleRef = useRef<any>(null);
 const originMarkerRef = useRef<any>(null);
 const destMarkerRef = useRef<any>(null);
 const itemMarkersRef = useRef<Map<string, any>>(new Map());
 const [isLoaded, setIsLoaded] = useState(false);

 // Fetch active map integration config
 const { data: mapConfig, isLoading: isLoadingConfig } = useQuery({
 queryKey: ["public-map-config"],
 queryFn: () => getPublicMapConfig(),
 staleTime: 5 * 60 * 1000,
 });

 const effectiveProvider = provider || mapConfig?.provider || "osm_standard";

 // Initialize MapLibre dynamically only in the browser
 useEffect(() => {
 if (typeof window === "undefined" || !mapContainer.current || isLoadingConfig) return;
 if (mapConfig && !mapConfig.isActive) return;

 let isMounted = true;
 let cleanupResize: (() => void) | undefined;

 async function initMap() {
 try {
 const maplibregl = await import("maplibre-gl");
 await import("maplibre-gl/dist/maplibre-gl.css" as any);
 if (!isMounted || !mapContainer.current) return;
 maplibreModuleRef.current = maplibregl;

 // Se já existe um mapa montado (ex: troca de provider), limpa com segurança
 if (mapRef.current) {
 mapRef.current.remove();
 mapRef.current = null;
 }

 // Detect dark mode from html class
 const isDark = document.documentElement.classList.contains("dark");

 let mapStyle: any = getCanonicalMapStyle(isDark, effectiveProvider);

 if (mapConfig?.customTileUrl) {
 mapStyle = mapConfig.customTileUrl;
 } else if (effectiveProvider === "mapbox" && mapConfig?.apiKey) {
 mapStyle = `https://api.mapbox.com/styles/v1/mapbox/${isDark ? "dark-v11" : "light-v11"}?access_token=${mapConfig.apiKey}`;
 }

 const map = new maplibregl.Map({
 container: mapContainer.current,
 style: mapStyle,
 center: [center.lng, center.lat],
 zoom: zoom,
 attributionControl: false,
 });

 cleanupResize = setupMapResizeObserver(map, mapContainer.current);

 map.addControl(
 new maplibregl.NavigationControl({ showCompass: false }),
 "bottom-right",
 );

 map.on("load", () => {
 if (!isMounted) return;
 setIsLoaded(true);
 mapRef.current = map;
 });

 map.on("click", (e: any) => {
 if (onMapClick) {
 onMapClick(e.lngLat.lat, e.lngLat.lng);
 }
 });

 map.on("error", (err: any) => {
 console.warn("[map] Erro no carregamento de tiles:", err);
 });
 } catch (err) {
 console.warn("[map] Falha ao instanciar MapLibre:", err);
 }
 }

 initMap();

 return () => {
 isMounted = false;
 cleanupResize?.();
 if (mapRef.current) {
 mapRef.current.remove();
 mapRef.current = null;
 }
 };
 }, [mapConfig, isLoadingConfig, effectiveProvider]);

 // Update Origin Marker
 useEffect(() => {
 const map = mapRef.current;
 const maplibregl = maplibreModuleRef.current;
 if (!map || !maplibregl || !isLoaded) return;

 if (origin) {
 if (!originMarkerRef.current) {
 const el = document.createElement("div");
 el.className =
 "size-7 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs border-2 border-background cursor-pointer";
 el.innerHTML = `<span class="size-2 rounded-full bg-background"></span>`;
 originMarkerRef.current = new maplibregl.Marker({ element: el })
 .setLngLat([origin.lng, origin.lat])
 .addTo(map);
 } else {
 originMarkerRef.current.setLngLat([origin.lng, origin.lat]);
 }
 } else if (originMarkerRef.current) {
 originMarkerRef.current.remove();
 originMarkerRef.current = null;
 }
 }, [origin, isLoaded]);

 // Update Destination Marker
 useEffect(() => {
 const map = mapRef.current;
 const maplibregl = maplibreModuleRef.current;
 if (!map || !maplibregl || !isLoaded) return;

 if (destination) {
 if (!destMarkerRef.current) {
 const el = document.createElement("div");
 el.className =
 "size-7 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs border-2 border-background cursor-pointer";
 el.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
 destMarkerRef.current = new maplibregl.Marker({ element: el })
 .setLngLat([destination.lng, destination.lat])
 .addTo(map);
 } else {
 destMarkerRef.current.setLngLat([destination.lng, destination.lat]);
 }
 } else if (destMarkerRef.current) {
 destMarkerRef.current.remove();
 destMarkerRef.current = null;
 }
 }, [destination, isLoaded]);

 // Update Point of Interest Markers (POIs / Moments / Places)
 useEffect(() => {
 const map = mapRef.current;
 const maplibregl = maplibreModuleRef.current;
 if (!map || !maplibregl || !isLoaded) return;

 // Remove obsolete markers
 itemMarkersRef.current.forEach((marker, id) => {
 if (!markers.some((m) => m.id === id)) {
 marker.remove();
 itemMarkersRef.current.delete(id);
 }
 });

 // Add or update markers
 markers.forEach((m) => {
 if (!m.lat || !m.lng) return;
 const isSelected = selectedMarkerId === m.id;

 if (!itemMarkersRef.current.has(m.id)) {
 const el = document.createElement("div");
 el.className = `size-8 rounded-xl bg-card border-2 border-border flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${
 isSelected ? "scale-125 border-foreground ring-2 ring-foreground/20 z-30" : "z-10"
 }`;

 if (m.avatar_url || m.image_url) {
 el.innerHTML = `<img src="${m.avatar_url || m.image_url}" class="size-full rounded-lg object-cover" alt="${m.title}" />`;
 } else {
 el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-foreground"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
 }

 el.onclick = () => {
 if (onMarkerClick) onMarkerClick(m);
 };

 const marker = new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map);
 itemMarkersRef.current.set(m.id, marker);
 } else {
 const existing = itemMarkersRef.current.get(m.id);
 if (existing) {
 existing.setLngLat([m.lng, m.lat]);
 const el = existing.getElement();
 if (isSelected) {
 el.classList.add("scale-125", "border-foreground", "ring-2", "ring-foreground/20", "z-30");
 el.classList.remove("z-10");
 } else {
 el.classList.remove("scale-125", "border-foreground", "ring-2", "ring-foreground/20", "z-30");
 el.classList.add("z-10");
 }
 }
 }
 });
 }, [markers, selectedMarkerId, isLoaded]);

 // Focus selected marker smoothly
 useEffect(() => {
 const map = mapRef.current;
 if (!map || !isLoaded || !selectedMarkerId) return;

 const target = markers.find((m) => m.id === selectedMarkerId);
 if (target && target.lat && target.lng) {
 map.flyTo({
 center: [target.lng, target.lat],
 zoom: 15,
 duration: 800,
 essential: true,
 });
 }
 }, [selectedMarkerId, isLoaded]);

 // Fit bounds when both origin and destination are present
 useEffect(() => {
 const map = mapRef.current;
 const maplibregl = maplibreModuleRef.current;
 if (!map || !maplibregl || !isLoaded || !origin || !destination) return;

 const bounds = new maplibregl.LngLatBounds();
 bounds.extend([origin.lng, origin.lat]);
 bounds.extend([destination.lng, destination.lat]);

 map.fitBounds(bounds, {
 padding: { top: 100, bottom: 100, left: 450, right: 100 },
 maxZoom: 15,
 duration: 1000,
 });
 }, [origin, destination, isLoaded]);

 if (mapConfig && !mapConfig.isActive) {
 return (
 <div className={`relative w-full h-full flex flex-col items-center justify-center bg-muted/20 text-muted-foreground p-8 text-center border-0 ${className}`}>
 <MapPinOff className="size-10 mb-2 opacity-40" />
 <h3 className="text-sm font-semibold text-foreground">Serviço de Mapas Não Configurado</h3>
 <p className="text-xs max-w-sm mt-1">
 {mapConfig.message || "A integração de mapas (OpenStreetMap, Mapbox ou Google Maps) está inativa nas configurações do sistema."}
 </p>
 </div>
 );
 }

 return (
 <div className={`relative w-full h-full ${className}`}>
 <div
 ref={mapContainer}
 className={`w-full h-full ${pinMode ? "cursor-crosshair" : ""}`}
 />
 {(!isLoaded || isLoadingConfig) && (
 <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-xs">
 <Loader2 className="size-6 animate-spin text-muted-foreground" />
 </div>
 )}
 </div>
 );
}
