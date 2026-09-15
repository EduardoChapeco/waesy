/**
 * src/types/studio-machine.ts
 * Tipagens Canônicas do Motor Studio Machine & Sistema ESCAMAS (8 Camadas).
 * Extraído e compatibilizado dos módulos avançados de studiomachine e brand-builder-ai.
 */

export interface StudioBrandProfile {
  id: string;
  name: string;
  niche: string;
  description?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontHeading: string;
  fontBody: string;
  mood: string;
  handle: string;
  logoLetter: string;
  logoUrl?: string;
  moodboardImages?: string[];
}

export type EscamasLayerType =
  | 'subject'
  | 'design'
  | 'textfx'
  | 'overlay'
  | 'atmospheric'
  | 'person'
  | 'dynamic';

export interface EscamasLayerElement {
  id: string;
  type: EscamasLayerType;
  url: string;
  x: number;          // 0 a 100%
  y: number;          // 0 a 100%
  scale: number;      // 0.1 a 3.0
  rotation: number;   // graus
  opacity: number;    // 0 a 1
  zIndex: number;     // 1 a 8
  prompt?: string;
  title?: string;
}

export type EscamasLayoutType =
  | 'escamas_layered'
  | 'analista_craft'
  | 'magnata_lux'
  | 'viral_card'
  | 'typography_mask'
  | 'split_solid'
  | 'ios_notification';

export interface EscamasSlide {
  id: string;
  slide_number: number;
  layout_type: EscamasLayoutType;
  role_in_narrative: string;
  text_content: {
    headline: string;
    body?: string;
    kicker?: string;
    badge?: string;
    cta_text?: string;
  };
  visual_blueprint?: string;
  background_url?: string;
  background_prompt?: string;
  background_opacity: number;
  layers: EscamasLayerElement[];
  isLoading?: boolean;
}

export interface EscamasCarouselProject {
  id: string;
  topic: string;
  goal: 'leads' | 'viral' | 'education' | 'civic_impact';
  targetAudience?: string;
  brand: StudioBrandProfile;
  slides: EscamasSlide[];
  title: string;
  createdAt: number;
  visualStyle: string;
  generationMode: 'ai_full' | 'manual_upload' | 'escamas';
  source_type?: 'mined_news' | 'pncp_bid' | 'job_post' | 'event' | 'catalog_product' | 'custom';
  source_id?: string;
}

export interface EscamasStepWizardData {
  topic: string;
  goal: string;
  targetAudience: string;
  visualStyle: string;
  brandId: string;
  slideCount: number;
  generationMode: 'ai_full' | 'manual_upload' | 'escamas';
  customTone?: string;
}
