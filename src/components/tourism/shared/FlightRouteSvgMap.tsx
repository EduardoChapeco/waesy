import React, { useMemo } from "react";
import { TOKEN_HEX } from "@/lib/design-tokens";
import {
  buildSvgProjectionForRoute,
  FLIGHT_ROUTE_DISCLAIMER,
  resolveFlightRouteModel,
  type FlightSegmentRouteInput,
} from "@/lib/tourism/flight-route-geometry";

export interface FlightRouteSvgMapProps {
  segments: FlightSegmentRouteInput[];
  airportsData?: Array<{
    iata_code: string;
    city?: string | null;
    name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    country_code?: string | null;
  }>;
  tone?: "light" | "dark";
  accentColor?: string;
  showDisclaimer?: boolean;
  capturedMapUrl?: string | null;
  className?: string;
}

/**
 * Synchronous, CORS-free geodesic SVG route map tailored for PDF/PNG Flyer Exports
 * and SSR/offline fallback inside FlightRouteMap.
 */
export function FlightRouteSvgMap({
  segments,
  airportsData = [],
  tone = "light",
  accentColor,
  showDisclaimer = true,
  capturedMapUrl,
  className = "",
}: FlightRouteSvgMapProps) {
  const model = useMemo(
    () => resolveFlightRouteModel(segments, airportsData),
    [segments, airportsData],
  );

  const svgProj = useMemo(
    () => buildSvgProjectionForRoute(model, 720, 220, 48),
    [model],
  );

  if (model.stops.length === 0) {
    return null;
  }

  const isDark = tone === "dark";
  const oceanFill = isDark ? TOKEN_HEX.neutral950 : TOKEN_HEX.blue50;
  const landFill = isDark ? TOKEN_HEX.neutral900 : TOKEN_HEX.neutral50;
  const coastStroke = isDark ? TOKEN_HEX.neutral700 : TOKEN_HEX.neutral300;
  const borderStroke = isDark ? TOKEN_HEX.neutral600 : TOKEN_HEX.neutral400;
  const gridStroke = isDark ? TOKEN_HEX.neutral800 : TOKEN_HEX.neutral200;
  const textFill = isDark ? TOKEN_HEX.neutral50 : TOKEN_HEX.neutral900;
  const mutedFill = isDark ? TOKEN_HEX.neutral400 : TOKEN_HEX.neutral600;
  const idaStroke = accentColor || TOKEN_HEX.blue600;
  const voltaStroke = isDark ? TOKEN_HEX.neutral300 : TOKEN_HEX.neutral500;
  const layoverFill = TOKEN_HEX.amber500;
  const layoverStroke = isDark ? TOKEN_HEX.neutral900 : TOKEN_HEX.white;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="rounded-xl border border-border overflow-hidden bg-muted/30">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card/80 text-xs">
          <span className="font-bold text-foreground">Mapa Geodésico da Rota e Conexões</span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <svg width="20" height="8" viewBox="0 0 20 8" aria-hidden="true">
                <line x1="1" y1="4" x2="19" y2="4" stroke={idaStroke} strokeWidth="3" strokeLinecap="round" />
              </svg>
              <span>Ida</span>
            </span>
            {svgProj.paths.some((p) => p.direction === "volta") && (
              <span className="inline-flex items-center gap-2">
                <svg width="20" height="8" viewBox="0 0 20 8" aria-hidden="true">
                  <line
                    x1="1"
                    y1="4"
                    x2="19"
                    y2="4"
                    stroke={voltaStroke}
                    strokeWidth="2.5"
                    strokeDasharray="4 3"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Volta</span>
              </span>
            )}
            {svgProj.stops.some((s) => s.role === "layover") && (
              <span className="inline-flex items-center gap-2">
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <circle cx="5" cy="5" r="4" fill={layoverFill} />
                </svg>
                <span>Conexão / Escala</span>
              </span>
            )}
          </div>
        </div>

        {capturedMapUrl ? (
          <div className="relative w-full h-56 bg-muted overflow-hidden">
            <img
              src={capturedMapUrl}
              alt={`Mapa de rota aérea conectando ${model.allIatas.join(" - ")}`}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          </div>
        ) : (
          <svg
            viewBox="0 0 720 220"
            role="img"
            aria-label={`Mapa de rota aérea conectando ${model.allIatas.join(" - ")}`}
            className="w-full h-auto block"
          >
            {/* Fundo de Oceano realista com contraste garantido para PDF/PNG */}
            <rect x="0" y="0" width="720" height="220" fill={oceanFill} />

            {/* Silhueta da América do Sul e litoral do Brasil */}
            {svgProj.landmassPath && (
              <path
                d={svgProj.landmassPath}
                fill={landFill}
                stroke={coastStroke}
                strokeWidth="1.2"
              />
            )}

            {/* Destaque das fronteiras do Brasil */}
            {svgProj.brazilBorderPath && (
              <path
                d={svgProj.brazilBorderPath}
                fill="none"
                stroke={borderStroke}
                strokeWidth="1.2"
                strokeDasharray="4 2"
              />
            )}

            {/* Rótulos geográficos de continente e oceano */}
            {svgProj.brazilLabelPoint && (
              <text
                x={svgProj.brazilLabelPoint.x}
                y={svgProj.brazilLabelPoint.y}
                fontSize="11"
                fontWeight="700"
                letterSpacing="2.5"
                textAnchor="middle"
                fill={borderStroke}
                opacity="0.85"
              >
                BRASIL
              </text>
            )}
            {svgProj.oceanLabelPoint && (
              <text
                x={svgProj.oceanLabelPoint.x}
                y={svgProj.oceanLabelPoint.y}
                fontSize="9.5"
                fontStyle="italic"
                letterSpacing="1.5"
                textAnchor="middle"
                fill={isDark ? TOKEN_HEX.blue500 : TOKEN_HEX.blue600}
                opacity="0.55"
              >
                Oceano Atlântico
              </text>
            )}

            {/* Subtle latitude / longitude gridlines */}
            {[44, 88, 132, 176].map((y) => (
              <line
                key={`h-${y}`}
                x1="0"
                y1={y}
                x2="720"
                y2={y}
                stroke={gridStroke}
                strokeWidth="0.6"
                strokeDasharray="3 3"
                opacity="0.5"
              />
            ))}
            {[120, 240, 360, 480, 600].map((x) => (
              <line
                key={`v-${x}`}
                x1={x}
                y1="0"
                x2={x}
                y2="220"
                stroke={gridStroke}
                strokeWidth="0.6"
                strokeDasharray="3 3"
                opacity="0.5"
              />
            ))}

            {/* Geodesic flight legs */}
            {svgProj.paths.map((p) => (
              <path
                key={p.id}
                d={p.d}
                fill="none"
                stroke={p.direction === "ida" ? idaStroke : voltaStroke}
                strokeWidth={p.direction === "ida" ? 2.5 : 1.9}
                strokeDasharray={p.direction === "ida" ? undefined : "6 5"}
                strokeLinecap="round"
              />
            ))}

            {/* Stop markers (origin, layover, destination) */}
            {svgProj.stops.map((s) => {
              const isLayover = s.role === "layover";
              const radius = isLayover ? 5.5 : 7;
              const fill = isLayover ? layoverFill : idaStroke;
              const labelY = s.y < 52 ? s.y + 19 : s.y - 14;
              return (
                <g key={s.iata}>
                  {/* Halo de precisão e radar geodésico */}
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={radius + 4}
                    fill={fill}
                    fillOpacity="0.22"
                  />
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={radius}
                    fill={fill}
                    stroke={layoverStroke}
                    strokeWidth="2"
                  />
                  {/* Núcleo central de marcação cartográfica */}
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r="2"
                    fill={isDark ? TOKEN_HEX.neutral900 : TOKEN_HEX.white}
                  />
                  <text
                    x={s.x}
                    y={labelY}
                    textAnchor="middle"
                    fontSize="12"
                    fontWeight="700"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    fill={textFill}
                  >
                    {s.iata}
                  </text>
                  {s.city && s.city.toUpperCase() !== s.iata && (
                    <text
                      x={s.x}
                      y={labelY + 11}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="500"
                      fill={mutedFill}
                    >
                      {s.city.slice(0, 18)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {showDisclaimer && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {FLIGHT_ROUTE_DISCLAIMER}
        </p>
      )}
    </div>
  );
}
