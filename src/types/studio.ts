/**
 * WAESY STUDIO 3.0 - Types & Canvas Schema
 */

export type StudioAspectRatio = "1:1" | "4:5" | "9:16" | "16:9" | "1.91:1";

export interface StudioDimensions {
 width: number;
 height: number;
}

export const STUDIO_DIMENSIONS: Record<StudioAspectRatio, StudioDimensions> = {
 "1:1": { width: 1080, height: 1080 },
 "4:5": { width: 1080, height: 1350 },
 "9:16": { width: 1080, height: 1920 },
 "16:9": { width: 1920, height: 1080 },
 "1.91:1": { width: 1200, height: 630 },
};

// Layer Types (8 Layers System)
export type StudioLayerType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const LAYER_NAMES: Record<StudioLayerType, string> = {
 0: "Background",
 1: "Efeitos Atmosféricos",
 2: "Elementos Gráficos",
 3: "Mídia Principal",
 4: "Máscaras",
 5: "Pessoas/Objetos",
 6: "Overlays",
 7: "Texto",
};

export type StudioElementType =
 "text" | "image" | "shape" | "video" | "sticker" | "qrcode" | "gradient" | "badge";

export interface TextProperties {
 content: string;
 fontFamily: string;
 fontSize: number;
 fontWeight: number;
 color: string;
 textAlign: "left" | "center" | "right" | "justify";
 lineHeight: number;
 letterSpacing: number;
 textShadow?: {
 offsetX: number;
 offsetY: number;
 blur: number;
 color: string;
 };
 textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
}

export interface ImageProperties {
 src: string;
 alt?: string;
 objectFit: "cover" | "contain" | "fill";
 borderRadius?: number;
 filter?: {
 brightness: number;
 contrast: number;
 saturation: number;
 blur: number;
 };
}

export interface ShapeProperties {
 shapeType: "rectangle" | "circle" | "triangle" | "polygon" | "line" | "star" | "badge";
 fill: string;
 strokeColor?: string;
 strokeWidth?: number;
 borderRadius?: number;
}

export interface QrCodeProperties {
 value: string;
 fgColor: string;
 bgColor: string;
 label?: string;
}

export type StudioElementProperties =
 TextProperties | ImageProperties | ShapeProperties | QrCodeProperties | Record<string, any>;

export interface StudioElement {
 id: string;
 type: StudioElementType;
 layer: StudioLayerType;
 zIndex: number;
 position: { x: number; y: number }; // percentage 0-100
 size: { width: number; height: number }; // percentage 0-100
 rotation: number;
 opacity: number;
 locked: boolean;
 visible: boolean;
 name?: string;
 properties: StudioElementProperties;
}

export interface SlideBackground {
 type: "color" | "gradient" | "image";
 value?: string;
 gradient?: {
 type: "linear" | "radial";
 angle?: number;
 colors: Array<{ color: string; position: number }>;
 };
 imageUrl?: string;
}

export interface StudioCanvasData {
 background: SlideBackground;
 elements: StudioElement[];
 aspectRatio: StudioAspectRatio;
}

// Default Element Initializers
export const DEFAULT_TEXT_PROPERTIES: TextProperties = {
 content: "Sua mensagem inspiradora aqui",
 fontFamily: "Inter",
 fontSize: 42,
 fontWeight: 800,
 color: "#FFFFFF",
 textAlign: "center",
 lineHeight: 1.2,
 letterSpacing: 0,
};

export const DEFAULT_SHAPE_PROPERTIES: ShapeProperties = {
 shapeType: "rectangle",
 fill: "#FACC15",
 borderRadius: 16,
};

export interface BrandKitColorsDTO {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text_primary: string;
  text_secondary: string;
}

export interface BrandKitTypographyDTO {
  heading_font: string;
  body_font: string;
  accent_font?: string;
  heading_scale: "compact" | "normal" | "expressive";
}

export interface BrandKitLogosDTO {
  primary_url?: string;
  secondary_url?: string;
  favicon_url?: string;
  watermark_url?: string;
}

export interface BrandKitVoiceDTO {
  tone: string[];
  formality: "casual" | "neutral" | "formal";
  keywords: string[];
  prohibited_words: string[];
  emoji_policy: "strict_none" | "minimal" | "free";
  tone_rules?: string[];
  do_words?: string[];
  dont_words?: string[];
}

export interface BrandKitDTO {
  id?: string;
  store_id?: string | null;
  company_name?: string;
  archetype?: string;
  archetype_justification?: string;
  colors: BrandKitColorsDTO | Record<string, any>;
  typography?: BrandKitTypographyDTO;
  fonts?: Record<string, any>;
  logos: BrandKitLogosDTO | Record<string, any>;
  voice: BrandKitVoiceDTO | Record<string, any>;
  content_pillars?: string[];
  visual_style?: {
    border_radius: "none" | "small" | "medium" | "large" | "full";
    shadow: "none" | "subtle" | "medium";
    icon_set: "lucide" | "phosphor";
  };
  swot_analysis?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  seven_sins_triggers?: Record<string, string>;
  edited_by_human?: boolean;
  updated_at?: string;
}
