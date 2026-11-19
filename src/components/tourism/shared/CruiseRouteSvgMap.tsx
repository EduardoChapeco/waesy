import React, { useMemo } from "react";
import { Anchor, Navigation, Ship } from "lucide-react";
import { TOKEN_HEX } from "@/lib/design-tokens";
import {
  buildSvgProjectionForCruise,
  type CruiseItineraryDayDTO,
} from "@/lib/tourism/flight-route-geometry";

export interface CruiseRouteSvgMapProps {
  itinerary: CruiseItineraryDayDTO[];
  tone?: "light" | "dark";
  accentColor?: string;
  shipName?: string;
  showDisclaimer?: boolean;
  className?: string;
}

/**
 * Synchronous, CORS-free Coastal Cruise Route Map in pure SVG.
 * Tailored for MSC / Costa proposal sheets, PDF export, PNG flyer snapshots, and Web showcase.
 */
export function CruiseRouteSvgMap({
  itinerary,
  tone = "light",
  accentColor = "currentColor",
  shipName = "Navio de Cruzeiro",
  showDisclaimer = true,
  className = "",
}: CruiseRouteSvgMapProps) {
  const isDark = tone === "dark";
  const oceanFill = isDark ? TOKEN_HEX.neutral950 : TOKEN_HEX.blue50;
  const landFill = isDark ? TOKEN_HEX.neutral900 : TOKEN_HEX.neutral50;
  const coastStroke = isDark ? TOKEN_HEX.neutral700 : TOKEN_HEX.neutral300;
  const routeStroke = isDark ? TOKEN_HEX.blue500 : TOKEN_HEX.blue700;
  const textFill = isDark ? TOKEN_HEX.neutral50 : TOKEN_HEX.neutral900;
  const oceanTextFill = isDark ? TOKEN_HEX.neutral400 : TOKEN_HEX.neutral600;
  const portFill = isDark ? TOKEN_HEX.blue500 : TOKEN_HEX.blue600;
  const markerStroke = isDark ? TOKEN_HEX.neutral900 : TOKEN_HEX.white;

  const svgProj = useMemo(
    () => buildSvgProjectionForCruise(itinerary, 720, 260, 48),
    [itinerary],
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="rounded-xl border border-border overflow-hidden bg-card/80">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card text-xs">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <Ship className="size-4 text-primary shrink-0" />
            <span>Itinerário Náutico & Rota Costeira</span>
            {shipName && (
              <span className="hidden sm:inline-block font-normal text-muted-foreground">
                — {shipName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-foreground" />
              <span>Porto / Escala</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <Navigation className="size-3 text-primary" />
              <span>Rota Marítima</span>
            </span>
          </div>
        </div>

        <svg
          viewBox="0 0 720 260"
          role="img"
          aria-label={`Mapa da rota do cruzeiro ${shipName}`}
          className="w-full h-auto block"
        >
          <defs>
            <marker
              id="cruise-arrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" className="fill-primary" />
            </marker>
          </defs>

          {/* Ocean Background */}
          <rect x="0" y="0" width="720" height="260" fill={oceanFill} />

          {/* Landmass of Brazilian Coast */}
          {svgProj.landmassPath && (
            <path
              d={svgProj.landmassPath}
              fill={landFill}
              stroke={coastStroke}
              strokeWidth="1.2"
            />
          )}

          {/* Land Label (Brazil) */}
          <text
            x={svgProj.landLabel.x}
            y={svgProj.landLabel.y}
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            letterSpacing="2"
            fill={textFill}
            opacity="0.85"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {svgProj.landLabel.text}
          </text>

          {/* Ocean Label (Atlantic Ocean) */}
          <text
            x={svgProj.oceanLabel.x}
            y={svgProj.oceanLabel.y}
            textAnchor="middle"
            fontSize="12"
            fontStyle="italic"
            letterSpacing="1.5"
            fill={oceanTextFill}
            opacity="0.8"
            fontFamily="ui-serif, Georgia, serif"
          >
            {svgProj.oceanLabel.text}
          </text>

          {/* Nautical sailing track with arrows */}
          {svgProj.routePath && (
            <path
              d={svgProj.routePath}
              fill="none"
              stroke={routeStroke}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              markerEnd="url(#cruise-arrow)"
            />
          )}

          {/* Direction arrows along the route */}
          {svgProj.arrows.map((arr, idx) => (
            <g
              key={idx}
              transform={`translate(${arr.x}, ${arr.y}) rotate(${arr.angle})`}
            >
              <polygon points="-5,-3 4,0 -5,3" fill={routeStroke} />
            </g>
          ))}

          {/* Port stops & labels */}
          {svgProj.stops.map((s) => {
            const labelY = s.y > 130 ? s.y - 14 : s.y + 22;
            return (
              <g key={s.code}>
                {/* Outer halo */}
                <circle
                  cx={s.x}
                  cy={s.y}
                  r="9"
                  fill={portFill}
                  fillOpacity="0.2"
                />
                {/* Port marker */}
                <circle
                  cx={s.x}
                  cy={s.y}
                  r="5.5"
                  fill={portFill}
                  stroke={markerStroke}
                  strokeWidth="2"
                />
                <circle
                  cx={s.x}
                  cy={s.y}
                  r="2"
                  fill={markerStroke}
                />
                {/* Port City Name */}
                <text
                  x={s.x}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="800"
                  letterSpacing="1"
                  fill={textFill}
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {s.city}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {showDisclaimer && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          Itinerário marítimo ilustrativo. Sujeito a alterações operacionais da armadora e capitania dos portos.
        </p>
      )}
    </div>
  );
}
