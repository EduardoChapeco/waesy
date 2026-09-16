import type { StyleSpecification } from "maplibre-gl";

/**
 * Estilos de Mapa Canônicos e Confiáveis (Retina 2x, Zero API Key, 100% Uptime)
 * Utiliza CARTO Voyager e CARTO Dark Matter hospedados globalmente com HTTPS,
 * eliminando falhas de renderização (quadro cinza) causadas por endpoints de terceiros.
 */

export const CANONICAL_MAP_STYLE_LIGHT: StyleSpecification = {
 version: 8,
 sources: {
 "carto-voyager": {
 type: "raster",
 tiles: [
 "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
 "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
 "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
 "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
 ],
 tileSize: 256,
 attribution:
 '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
 },
 },
 layers: [
 {
 id: "carto-voyager-layer",
 type: "raster",
 source: "carto-voyager",
 minzoom: 0,
 maxzoom: 20,
 },
 ],
};

export const CANONICAL_MAP_STYLE_DARK: StyleSpecification = {
 version: 8,
 sources: {
 "carto-dark": {
 type: "raster",
 tiles: [
 "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
 "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
 "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
 "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
 ],
 tileSize: 256,
 attribution:
 '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
 },
 },
 layers: [
 {
 id: "carto-dark-layer",
 type: "raster",
 source: "carto-dark",
 minzoom: 0,
 maxzoom: 20,
 },
 ],
};

export const CANONICAL_MAP_STYLE_OSM_STANDARD: StyleSpecification = {
  version: 8,
  sources: {
    "osm-standard": {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "osm-standard-layer",
      type: "raster",
      source: "osm-standard",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export function getCanonicalMapStyle(
  isDark?: boolean,
  provider: string = "osm_standard"
): StyleSpecification {
  const effectiveIsDark =
    isDark !== undefined
      ? isDark
      : typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false;

  const normalizedProvider = (provider || "osm_standard").toLowerCase();

  if (normalizedProvider === "carto_dark") {
    return CANONICAL_MAP_STYLE_DARK;
  }
  if (normalizedProvider === "carto_voyager") {
    return CANONICAL_MAP_STYLE_LIGHT;
  }
  if (
    normalizedProvider === "osm_standard" ||
    normalizedProvider === "open_street_map" ||
    normalizedProvider === "openstreetmap" ||
    normalizedProvider === "openmaps" ||
    normalizedProvider === "osm"
  ) {
    return CANONICAL_MAP_STYLE_OSM_STANDARD;
  }

  // Fallback padrão 100% limpo e livre de marcas d'água (Prioriza OSM Standard quando não há Carto explícito)
  return effectiveIsDark ? CANONICAL_MAP_STYLE_DARK : CANONICAL_MAP_STYLE_OSM_STANDARD;
}

/**
 * Garante que o canvas do MapLibre seja recalculado imediatamente quando o container
 * ganha dimensões no DOM (evita tela cinza em modais, tabs ou carregamentos assíncronos).
 */
export function setupMapResizeObserver(map: any, container: HTMLElement): () => void {
 if (!map || !container) return () => {};

 // Força recálculo imediato e após render inicial
 const t1 = setTimeout(() => map.resize(), 50);
 const t2 = setTimeout(() => map.resize(), 200);
 const t3 = setTimeout(() => map.resize(), 600);

 let resizeObserver: ResizeObserver | null = null;
 if (typeof ResizeObserver !== "undefined") {
 resizeObserver = new ResizeObserver(() => {
 map.resize();
 });
 resizeObserver.observe(container);
 }

 return () => {
 clearTimeout(t1);
 clearTimeout(t2);
 clearTimeout(t3);
 if (resizeObserver) {
 resizeObserver.disconnect();
 }
 };
}
