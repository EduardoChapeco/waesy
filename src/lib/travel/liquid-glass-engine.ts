/**
 * liquid-glass-engine.ts — Motor de Material Frosted / Liquid Glass (Padrão Figma / Apple HIG)
 * Controles independentes de luz, refração, dispersão cromática, frost, splay, ruído procedural e sombras.
 */

export type GlassNoiseKind = "mono" | "duo" | "multi";

export type GlassPresetId =
  | "saved_offer_glass"
  | "heavy_frost"
  | "dark_glass"
  | "clear_lens"
  | "subtle_glass";

export interface GlassMaterial {
  presetId?: GlassPresetId;
  fill: {
    color: string;
    opacity: number; // 0..1 (~0.19 - 0.20 in saved artwork)
  };
  radius: number; // e.g., 30px
  border: {
    width: number; // e.g., 1px
    color: string;
    opacity: number;
  };
  backdrop: {
    blurPx: number;
    saturation: number;
    brightness: number;
    contrast: number;
  };
  optics: {
    lightAngleDeg: number; // e.g., -45
    lightIntensity: number; // 0..100 (e.g., 70..80)
    refraction: number; // 0..100 (e.g., 75..90)
    depth: number; // 1..100 (e.g., 20..56)
    dispersion: number; // 0..100 (e.g., 28..50)
    frost: number; // 0..100 (e.g., 12..80)
    splay: number; // 0..100 (e.g., 0..45)
  };
  noise: {
    enabled: boolean;
    kind: GlassNoiseKind;
    sizeX: number;
    sizeY: number;
    density: number; // 0..1
    seed: number;
    opacity: number; // 0..1
  };
  innerShadow: {
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: string;
    opacity: number;
  };
  outerShadow: {
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: string;
    opacity: number;
  };
  edgeHighlight: {
    enabled: boolean;
    thicknessPx: number;
    intensity: number; // 0..1
  };
  reflection: {
    enabled: boolean;
    opacity: number; // 0..1
    angleDeg: number;
  };
}

function clamp(val: number, min: number, max: number): number {
  if (Number.isNaN(val)) return min;
  return Math.min(max, Math.max(min, val));
}

export const GLASS_MATERIAL_PRESETS: Record<GlassPresetId, GlassMaterial> = {
  /**
   * 1. Saved Offer Glass — Reproduz fielmente o cartão de preço da "ARTE SALVA" Excelência Tour
   * Fill #FFFFFF @ 19%, radius 30px, border 1px, light -45deg @ 76%, refraction 80, depth 36, dispersion 34, frost 32
   */
  saved_offer_glass: {
    presetId: "saved_offer_glass",
    fill: { color: "#FFFFFF", opacity: 0.19 },
    radius: 30,
    border: { width: 1, color: "#FFFFFF", opacity: 0.38 },
    backdrop: { blurPx: 22, saturation: 1.35, brightness: 1.06, contrast: 1.05 },
    optics: {
      lightAngleDeg: -45,
      lightIntensity: 76,
      refraction: 80,
      depth: 36,
      dispersion: 34,
      frost: 32,
      splay: 22,
    },
    noise: {
      enabled: true,
      kind: "mono",
      sizeX: 1,
      sizeY: 1,
      density: 0.2,
      seed: 1450,
      opacity: 0.08,
    },
    innerShadow: { x: 0, y: 2, blur: 14, spread: 0, color: "#FFFFFF", opacity: 0.28 },
    outerShadow: { x: 0, y: 20, blur: 44, spread: -6, color: "#000000", opacity: 0.42 },
    edgeHighlight: { enabled: true, thicknessPx: 1.5, intensity: 0.72 },
    reflection: { enabled: true, opacity: 0.22, angleDeg: -45 },
  },

  /**
   * 2. Heavy Frost (Preset A — Figma Reference)
   * Light -45deg @ 80%, Refraction 90, Depth 20, Dispersion 50, Frost 80, Fill #FFFFFF @ 20%, Radius 30
   */
  heavy_frost: {
    presetId: "heavy_frost",
    fill: { color: "#FFFFFF", opacity: 0.2 },
    radius: 30,
    border: { width: 1, color: "#FFFFFF", opacity: 0.45 },
    backdrop: { blurPx: 38, saturation: 1.45, brightness: 1.08, contrast: 1.04 },
    optics: {
      lightAngleDeg: -45,
      lightIntensity: 80,
      refraction: 90,
      depth: 20,
      dispersion: 50,
      frost: 80,
      splay: 35,
    },
    noise: {
      enabled: true,
      kind: "mono",
      sizeX: 1,
      sizeY: 1,
      density: 0.25,
      seed: 1450,
      opacity: 0.14,
    },
    innerShadow: { x: 0, y: 3, blur: 18, spread: 1, color: "#FFFFFF", opacity: 0.34 },
    outerShadow: { x: 0, y: 24, blur: 48, spread: -4, color: "#000000", opacity: 0.48 },
    edgeHighlight: { enabled: true, thicknessPx: 1.5, intensity: 0.8 },
    reflection: { enabled: true, opacity: 0.26, angleDeg: -45 },
  },

  /**
   * 3. Dark Glass / Refraction + Noise (Preset B — Figma Reference)
   * Light -45deg @ 70%, Refraction 75, Depth 56, Dispersion 28, Frost 12, Splay 45, Noise Mono 1x1 20% seed 1450
   */
  dark_glass: {
    presetId: "dark_glass",
    fill: { color: "#0B1324", opacity: 0.48 },
    radius: 30,
    border: { width: 1, color: "#FFFFFF", opacity: 0.28 },
    backdrop: { blurPx: 18, saturation: 1.3, brightness: 0.94, contrast: 1.12 },
    optics: {
      lightAngleDeg: -45,
      lightIntensity: 70,
      refraction: 75,
      depth: 56,
      dispersion: 28,
      frost: 12,
      splay: 45,
    },
    noise: {
      enabled: true,
      kind: "mono",
      sizeX: 1,
      sizeY: 1,
      density: 0.2,
      seed: 1450,
      opacity: 0.12,
    },
    innerShadow: { x: 0, y: 2, blur: 16, spread: 0, color: "#FFFFFF", opacity: 0.22 },
    outerShadow: { x: 0, y: 26, blur: 54, spread: -4, color: "#000000", opacity: 0.62 },
    edgeHighlight: { enabled: true, thicknessPx: 1.2, intensity: 0.65 },
    reflection: { enabled: true, opacity: 0.18, angleDeg: -45 },
  },

  /**
   * 4. Clear Lens — Alta refração óptica com mínimo frost
   */
  clear_lens: {
    presetId: "clear_lens",
    fill: { color: "#FFFFFF", opacity: 0.12 },
    radius: 30,
    border: { width: 1, color: "#FFFFFF", opacity: 0.5 },
    backdrop: { blurPx: 8, saturation: 1.5, brightness: 1.05, contrast: 1.08 },
    optics: {
      lightAngleDeg: -45,
      lightIntensity: 85,
      refraction: 92,
      depth: 64,
      dispersion: 44,
      frost: 6,
      splay: 50,
    },
    noise: {
      enabled: false,
      kind: "mono",
      sizeX: 1,
      sizeY: 1,
      density: 0.1,
      seed: 1450,
      opacity: 0.03,
    },
    innerShadow: { x: 0, y: 2, blur: 12, spread: 0, color: "#FFFFFF", opacity: 0.38 },
    outerShadow: { x: 0, y: 18, blur: 38, spread: -4, color: "#000000", opacity: 0.36 },
    edgeHighlight: { enabled: true, thicknessPx: 1.5, intensity: 0.85 },
    reflection: { enabled: true, opacity: 0.3, angleDeg: -45 },
  },

  /**
   * 5. Subtle Glass — Discreto para badges e chips secundários
   */
  subtle_glass: {
    presetId: "subtle_glass",
    fill: { color: "#FFFFFF", opacity: 0.15 },
    radius: 20,
    border: { width: 1, color: "#FFFFFF", opacity: 0.24 },
    backdrop: { blurPx: 14, saturation: 1.2, brightness: 1.02, contrast: 1.02 },
    optics: {
      lightAngleDeg: -45,
      lightIntensity: 55,
      refraction: 35,
      depth: 18,
      dispersion: 12,
      frost: 24,
      splay: 15,
    },
    noise: {
      enabled: true,
      kind: "mono",
      sizeX: 1,
      sizeY: 1,
      density: 0.15,
      seed: 1450,
      opacity: 0.05,
    },
    innerShadow: { x: 0, y: 1, blur: 8, spread: 0, color: "#FFFFFF", opacity: 0.18 },
    outerShadow: { x: 0, y: 12, blur: 28, spread: -4, color: "#000000", opacity: 0.3 },
    edgeHighlight: { enabled: true, thicknessPx: 1, intensity: 0.5 },
    reflection: { enabled: true, opacity: 0.14, angleDeg: -45 },
  },
};

export function getGlassPreset(presetId: GlassPresetId = "saved_offer_glass"): GlassMaterial {
  const base = GLASS_MATERIAL_PRESETS[presetId] || GLASS_MATERIAL_PRESETS.saved_offer_glass;
  return JSON.parse(JSON.stringify(base));
}

export function normalizeGlassMaterial(partial?: Partial<GlassMaterial>): GlassMaterial {
  const base = getGlassPreset(partial?.presetId || "saved_offer_glass");
  if (!partial) return base;

  return {
    presetId: partial.presetId || base.presetId,
    fill: {
      color: partial.fill?.color ?? base.fill.color,
      opacity: clamp(partial.fill?.opacity ?? base.fill.opacity, 0, 1),
    },
    radius: clamp(partial.radius ?? base.radius, 0, 120),
    border: {
      width: clamp(partial.border?.width ?? base.border.width, 0, 12),
      color: partial.border?.color ?? base.border.color,
      opacity: clamp(partial.border?.opacity ?? base.border.opacity, 0, 1),
    },
    backdrop: {
      blurPx: clamp(partial.backdrop?.blurPx ?? base.backdrop.blurPx, 0, 100),
      saturation: clamp(partial.backdrop?.saturation ?? base.backdrop.saturation, 0.5, 3),
      brightness: clamp(partial.backdrop?.brightness ?? base.backdrop.brightness, 0.5, 2),
      contrast: clamp(partial.backdrop?.contrast ?? base.backdrop.contrast, 0.5, 2),
    },
    optics: {
      lightAngleDeg: clamp(partial.optics?.lightAngleDeg ?? base.optics.lightAngleDeg, -180, 180),
      lightIntensity: clamp(partial.optics?.lightIntensity ?? base.optics.lightIntensity, 0, 100),
      refraction: clamp(partial.optics?.refraction ?? base.optics.refraction, 0, 100),
      depth: clamp(partial.optics?.depth ?? base.optics.depth, 1, 100),
      dispersion: clamp(partial.optics?.dispersion ?? base.optics.dispersion, 0, 100),
      frost: clamp(partial.optics?.frost ?? base.optics.frost, 0, 100),
      splay: clamp(partial.optics?.splay ?? base.optics.splay, 0, 100),
    },
    noise: {
      enabled: partial.noise?.enabled ?? base.noise.enabled,
      kind: partial.noise?.kind ?? base.noise.kind,
      sizeX: clamp(partial.noise?.sizeX ?? base.noise.sizeX, 0.5, 10),
      sizeY: clamp(partial.noise?.sizeY ?? base.noise.sizeY, 0.5, 10),
      density: clamp(partial.noise?.density ?? base.noise.density, 0, 1),
      seed: Math.round(partial.noise?.seed ?? base.noise.seed),
      opacity: clamp(partial.noise?.opacity ?? base.noise.opacity, 0, 1),
    },
    innerShadow: {
      x: partial.innerShadow?.x ?? base.innerShadow.x,
      y: partial.innerShadow?.y ?? base.innerShadow.y,
      blur: clamp(partial.innerShadow?.blur ?? base.innerShadow.blur, 0, 100),
      spread: partial.innerShadow?.spread ?? base.innerShadow.spread,
      color: partial.innerShadow?.color ?? base.innerShadow.color,
      opacity: clamp(partial.innerShadow?.opacity ?? base.innerShadow.opacity, 0, 1),
    },
    outerShadow: {
      x: partial.outerShadow?.x ?? base.outerShadow.x,
      y: partial.outerShadow?.y ?? base.outerShadow.y,
      blur: clamp(partial.outerShadow?.blur ?? base.outerShadow.blur, 0, 120),
      spread: partial.outerShadow?.spread ?? base.outerShadow.spread,
      color: partial.outerShadow?.color ?? base.outerShadow.color,
      opacity: clamp(partial.outerShadow?.opacity ?? base.outerShadow.opacity, 0, 1),
    },
    edgeHighlight: {
      enabled: partial.edgeHighlight?.enabled ?? base.edgeHighlight.enabled,
      thicknessPx: clamp(partial.edgeHighlight?.thicknessPx ?? base.edgeHighlight.thicknessPx, 0.5, 6),
      intensity: clamp(partial.edgeHighlight?.intensity ?? base.edgeHighlight.intensity, 0, 1),
    },
    reflection: {
      enabled: partial.reflection?.enabled ?? base.reflection.enabled,
      opacity: clamp(partial.reflection?.opacity ?? base.reflection.opacity, 0, 1),
      angleDeg: clamp(partial.reflection?.angleDeg ?? base.reflection.angleDeg, -180, 180),
    },
  };
}

export interface ComputedGlassOptics {
  effectiveBlurPx: number;
  displacementScale: number;
  baseFrequencyX: number;
  baseFrequencyY: number;
  chromaticOffsetPx: number;
  specularGradientCss: string;
  reflectionGradientCss: string;
  fillRgbaCss: string;
  borderRgbaCss: string;
  boxShadowCss: string;
  backdropFilterCss: string;
  cssVariables: Record<string, string>;
}

export function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = (hex || "#FFFFFF").replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16) || 255;
    const g = parseInt(clean[1] + clean[1], 16) || 255;
    const b = parseInt(clean[2] + clean[2], 16) || 255;
    return [r, g, b];
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [
    Number.isNaN(r) ? 255 : r,
    Number.isNaN(g) ? 255 : g,
    Number.isNaN(b) ? 255 : b,
  ];
}

/**
 * Calcula todos os parâmetros ópticos e CSS Custom Properties a partir de um GlassMaterial.
 * Garante diferenciação determinística para Frost (0, 50, 100), Refraction (0, 50, 100) e Dispersion (0, 50, 100).
 */
export function computeGlassOptics(materialInput?: Partial<GlassMaterial>): ComputedGlassOptics {
  const mat = normalizeGlassMaterial(materialInput);

  // Frost aumenta o desfoque efetivo além do backdrop.blurPx base
  const frostBlurBoost = (mat.optics.frost / 100) * 28;
  const effectiveBlurPx = Number((mat.backdrop.blurPx + frostBlurBoost).toFixed(2));

  // Refraction + Depth + Splay controlam a escala de deslocamento óptico (feDisplacementMap)
  const refractionNorm = mat.optics.refraction / 100;
  const depthNorm = mat.optics.depth / 100;
  const splayNorm = mat.optics.splay / 100;
  const displacementScale = Number(
    (refractionNorm * (12 + depthNorm * 26 + splayNorm * 14)).toFixed(2)
  );

  // Frequência base da lente / ruído
  const baseFrequencyX = Number((0.012 + (1 - splayNorm * 0.5) * 0.018).toFixed(4));
  const baseFrequencyY = Number((0.012 + (1 - depthNorm * 0.4) * 0.018).toFixed(4));

  // Dispersão cromática (separação de canais R / B nas bordas)
  const chromaticOffsetPx = Number(((mat.optics.dispersion / 100) * 4.5).toFixed(2));

  const [fillR, fillG, fillB] = hexToRgbTuple(mat.fill.color);
  const [borderR, borderG, borderB] = hexToRgbTuple(mat.border.color);
  const [innerR, innerG, innerB] = hexToRgbTuple(mat.innerShadow.color);
  const [outerR, outerG, outerB] = hexToRgbTuple(mat.outerShadow.color);

  const fillRgbaCss = `rgba(${fillR}, ${fillG}, ${fillB}, ${mat.fill.opacity})`;
  const borderRgbaCss = `rgba(${borderR}, ${borderG}, ${borderB}, ${mat.border.opacity})`;

  const lightAlpha = Number(((mat.optics.lightIntensity / 100) * 0.68).toFixed(3));
  const oppositeAlpha = Number((lightAlpha * 0.28).toFixed(3));
  const angleCss = `${mat.optics.lightAngleDeg + 180}deg`;

  const specularGradientCss = `linear-gradient(${angleCss}, rgba(255,255,255,${lightAlpha}) 0%, rgba(255,255,255,0.06) 42%, rgba(255,255,255,0) 68%, rgba(255,255,255,${oppositeAlpha}) 100%)`;

  const reflectionAlpha = mat.reflection.enabled ? mat.reflection.opacity : 0;
  const reflectionGradientCss = `linear-gradient(${mat.reflection.angleDeg + 180}deg, rgba(255,255,255,${reflectionAlpha}) 0%, rgba(255,255,255,0.02) 38%, rgba(255,255,255,0) 100%)`;

  // Dispersão adiciona micro-halo cromático interno (ciano/magenta sutil) proporcional a optics.dispersion
  const dispersionAlpha = Number(((mat.optics.dispersion / 100) * 0.26).toFixed(3));
  const dispersionShadow =
    mat.optics.dispersion > 0
      ? `, inset ${chromaticOffsetPx}px 0 ${Math.max(2, chromaticOffsetPx * 2)}px rgba(56, 189, 248, ${dispersionAlpha}), inset -${chromaticOffsetPx}px 0 ${Math.max(2, chromaticOffsetPx * 2)}px rgba(244, 114, 182, ${dispersionAlpha})`
      : "";

  const boxShadowCss = [
    `${mat.outerShadow.x}px ${mat.outerShadow.y}px ${mat.outerShadow.blur}px ${mat.outerShadow.spread}px rgba(${outerR}, ${outerG}, ${outerB}, ${mat.outerShadow.opacity})`,
    `inset ${mat.innerShadow.x}px ${mat.innerShadow.y}px ${mat.innerShadow.blur}px ${mat.innerShadow.spread}px rgba(${innerR}, ${innerG}, ${innerB}, ${mat.innerShadow.opacity})`,
  ].join(", ") + dispersionShadow;

  const backdropFilterCss = `blur(${effectiveBlurPx}px) saturate(${Math.round(
    mat.backdrop.saturation * 100
  )}%) brightness(${Math.round(mat.backdrop.brightness * 100)}%) contrast(${Math.round(
    mat.backdrop.contrast * 100
  )}%)`;

  const cssVariables: Record<string, string> = {
    "--glass-fill": fillRgbaCss,
    "--glass-radius": `${mat.radius}px`,
    "--glass-border-width": `${mat.border.width}px`,
    "--glass-border-color": borderRgbaCss,
    "--glass-blur": `${effectiveBlurPx}px`,
    "--glass-saturation": `${mat.backdrop.saturation}`,
    "--glass-brightness": `${mat.backdrop.brightness}`,
    "--glass-contrast": `${mat.backdrop.contrast}`,
    "--glass-light-angle": `${mat.optics.lightAngleDeg}deg`,
    "--glass-light-intensity": `${mat.optics.lightIntensity}`,
    "--glass-refraction": `${mat.optics.refraction}`,
    "--glass-depth": `${mat.optics.depth}`,
    "--glass-dispersion": `${mat.optics.dispersion}`,
    "--glass-frost": `${mat.optics.frost}`,
    "--glass-splay": `${mat.optics.splay}`,
    "--glass-noise-opacity": `${mat.noise.enabled ? mat.noise.opacity : 0}`,
    "--glass-displacement-scale": `${displacementScale}`,
    "--glass-chromatic-offset": `${chromaticOffsetPx}px`,
  };

  return {
    effectiveBlurPx,
    displacementScale,
    baseFrequencyX,
    baseFrequencyY,
    chromaticOffsetPx,
    specularGradientCss,
    reflectionGradientCss,
    fillRgbaCss,
    borderRgbaCss,
    boxShadowCss,
    backdropFilterCss,
    cssVariables,
  };
}
