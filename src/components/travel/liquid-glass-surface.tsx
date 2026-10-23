/**
 * liquid-glass-surface.tsx — Superfície de Vidro Fosco & Refrativo (Padrão Figma / Apple HIG)
 * Implementa a pilha de 7 camadas (Sec. 17):
 * 1. Backdrop Blur + Saturação + Brilho + Contraste
 * 2. Lente SVG (feTurbulence + feGaussianBlur + feDisplacementMap + Dispersão Cromática RGB)
 * 3. Fill Translúcido (~19–20% na Arte Salva)
 * 4. Reflexo Interno & Sombra Interna
 * 5. Textura de Ruído Procedural (Mono / Duo / Multi)
 * 6. Borda Especular Direcional (Light Angle & Intensity)
 * 7. Conteúdo Tipográfico Nítido Acima do Vidro
 */

import React, { useId, useMemo } from "react";
import {
  type GlassMaterial,
  computeGlassOptics,
  normalizeGlassMaterial,
} from "@/lib/travel/liquid-glass-engine";

export interface LiquidGlassSurfaceProps {
  material?: Partial<GlassMaterial>;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  exportSafe?: boolean;
  id?: string;
}

export function LiquidGlassSurface({
  material,
  children,
  className = "",
  style,
  exportSafe = false,
  id,
}: LiquidGlassSurfaceProps) {
  const reactId = useId();
  const filterId = useMemo(
    () => `liquid-glass-filter-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [reactId]
  );
  const noiseFilterId = useMemo(
    () => `liquid-glass-noise-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [reactId]
  );

  const normalized = useMemo(() => normalizeGlassMaterial(material), [material]);
  const optics = useMemo(() => computeGlassOptics(normalized), [normalized]);

  const combinedStyle: React.CSSProperties = useMemo(
    () => ({
      ...optics.cssVariables,
      borderRadius: `${normalized.radius}px`,
      backgroundColor: optics.fillRgbaCss,
      backdropFilter: optics.backdropFilterCss,
      WebkitBackdropFilter: optics.backdropFilterCss,
      boxShadow: optics.boxShadowCss,
      border: `${normalized.border.width}px solid ${optics.borderRgbaCss}`,
      ...style,
    }),
    [normalized, optics, style]
  );

  return (
    <div
      id={id}
      style={combinedStyle}
      data-glass-preset={normalized.presetId || "custom"}
      data-glass-frost={normalized.optics.frost}
      data-glass-refraction={normalized.optics.refraction}
      data-glass-dispersion={normalized.optics.dispersion}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Definição de Filtros SVG Ópticos (Refração, Splay, Dispersão e Grão Procedural) */}
      {!exportSafe && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute w-0 h-0 overflow-hidden"
        >
          <defs>
            <filter
              id={filterId}
              x="-15%"
              y="-15%"
              width="130%"
              height="130%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency={`${optics.baseFrequencyX} ${optics.baseFrequencyY}`}
                numOctaves={2}
                seed={normalized.noise.seed}
                result="refractionNoise"
              />
              <feGaussianBlur
                in="refractionNoise"
                stdDeviation={Math.max(1, Number((normalized.optics.splay / 25).toFixed(2)))}
                result="smoothedLens"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="smoothedLens"
                scale={optics.displacementScale}
                xChannelSelector="R"
                yChannelSelector="G"
                result="displaced"
              />
              {normalized.optics.dispersion > 0 ? (
                <>
                  <feOffset
                    in="displaced"
                    dx={optics.chromaticOffsetPx}
                    dy={0}
                    result="redShift"
                  />
                  <feOffset
                    in="displaced"
                    dx={-optics.chromaticOffsetPx}
                    dy={0}
                    result="blueShift"
                  />
                  <feBlend in="redShift" in2="blueShift" mode="screen" />
                </>
              ) : null}
            </filter>

            {normalized.noise.enabled && normalized.noise.opacity > 0 && (
              <filter id={noiseFilterId} x="0%" y="0%" width="100%" height="100%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency={`${(0.65 / normalized.noise.sizeX).toFixed(2)} ${(
                    0.65 / normalized.noise.sizeY
                  ).toFixed(2)}`}
                  numOctaves={3}
                  seed={normalized.noise.seed}
                  stitchTiles="stitch"
                  result="grain"
                />
                {normalized.noise.kind === "mono" && (
                  <feColorMatrix type="saturate" values="0" in="grain" result="monoGrain" />
                )}
              </filter>
            )}
          </defs>
        </svg>
      )}

      {/* Camada 2: Reflexo Direcional Interno (Light Angle & Intensity) */}
      {normalized.reflection.enabled && (
        <div
          aria-hidden="true"
          style={{
            background: optics.reflectionGradientCss,
            borderRadius: `${normalized.radius}px`,
          }}
          className="pointer-events-none absolute inset-0"
        />
      )}

      {/* Camada 3: Borda Especular Rim Highlight */}
      {normalized.edgeHighlight.enabled && (
        <div
          aria-hidden="true"
          style={{
            borderRadius: `${normalized.radius}px`,
            padding: `${normalized.edgeHighlight.thicknessPx}px`,
            background: optics.specularGradientCss,
            opacity: normalized.edgeHighlight.intensity,
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
          className="pointer-events-none absolute inset-0"
        />
      )}

      {/* Camada 4: Grão / Frost Texturizado */}
      {normalized.noise.enabled && normalized.noise.opacity > 0 && (
        <div
          aria-hidden="true"
          style={{
            opacity: normalized.noise.opacity,
            filter: !exportSafe ? `url(#${noiseFilterId})` : undefined,
            backgroundImage: exportSafe
              ? "radial-gradient(rgba(255,255,255,0.22) 1px, transparent 0)"
              : undefined,
            backgroundSize: exportSafe ? "3px 3px" : undefined,
          }}
          className="pointer-events-none absolute inset-0 mix-blend-overlay"
        />
      )}

      {/* Camada 5: Conteúdo Tipográfico Nítido */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
