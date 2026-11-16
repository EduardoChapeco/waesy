export type VerticalLandingSectionType =
  | "feature_split"
  | "modules_grid"
  | "plans_pricing"
  | "media_showcase"
  | "video_demo"
  | "workflow_steps"
  | "faq_accordion"
  | "metrics_bar"
  | "cta_banner";

export type VerticalLandingSectionLayout =
  | "split_right"
  | "split_left"
  | "grid_2"
  | "grid_3"
  | "bento"
  | "banner_wide";

export interface VerticalIsolatedModuleDTO {
  id: string;
  title: string;
  category: string;
  description: string;
  highlights: string[];
  iconName?: string;
  imageUrl?: string | null;
}

export interface VerticalLandingPlanDTO {
  id: string;
  sku?: string;
  name: string;
  badge?: string;
  tagline: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  isFeatured?: boolean;
  ctaLabel: string;
  features: string[];
  limits: string[];
}

export interface VerticalFaqItemDTO {
  question: string;
  answer: string;
}

export interface VerticalMetricDTO {
  label: string;
  value: string;
  detail: string;
}

export interface VerticalLandingSectionDTO {
  id: string;
  landing_slug: string;
  section_type: VerticalLandingSectionType;
  title: string;
  subtitle?: string | null;
  badge_tag?: string | null;
  body?: string | null;
  media_desktop_url?: string | null;
  media_mobile_url?: string | null;
  video_url?: string | null;
  cta_label?: string | null;
  cta_href?: string | null;
  items_json: Array<{
    title: string;
    description?: string;
    badge?: string;
    imageUrl?: string | null;
  }>;
  layout_variant: VerticalLandingSectionLayout;
  sort_order: number;
  is_active: boolean;
  updated_at?: string;
}

export interface VerticalLandingPageDTO {
  slug: string;
  subsystem_id?: string | null;
  brand_vertical_id?: string | null;
  niche_id?: string | null;
  vertical_sku?: string | null;
  display_name: string;
  tagline: string;
  badge_label?: string | null;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_label: string;
  hero_cta_secondary_label: string;
  hero_image_desktop_url?: string | null;
  hero_image_mobile_url?: string | null;
  hero_video_url?: string | null;
  login_split_image_url?: string | null;
  logo_url?: string | null;
  isolated_modules: VerticalIsolatedModuleDTO[];
  plans: VerticalLandingPlanDTO[];
  faq_items: VerticalFaqItemDTO[];
  metrics_items: VerticalMetricDTO[];
  sections: VerticalLandingSectionDTO[];
  is_published: boolean;
  updated_at?: string;
}
