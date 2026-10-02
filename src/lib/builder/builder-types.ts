import { z } from "zod";

export type ExperienceType = "storefront" | "biolink" | "pwa" | "campaign" | "seller_showcase";

export interface ExperienceDocument {
 id: string;
 store_id: string;
 document_type: ExperienceType;
 owner_id?: string | null;
 slug: string;
 title: string;
 seo_metadata: Record<string, any>;
 is_active: boolean;
 created_at: string;
 updated_at: string;
}

export type NodeType = "section" | "container" | "element" | "composition" | "block";

export type BlockType =
 | "section"
 | "container"
 | "rich_text"
 | "hero_carousel"
 | "bento_grid"
 | "countdown_timer"
 | "stories_ring"
 | "trust_badges"
 | "product_rail"
 | "announcement_bar"
 | "video_section"
 | "contact_form"
 | "booking_calendar"
 | "gallery_grid"
 | "info_cards"
 | "mosaic_banners"
 | "social_grid"
 | "faq_accordion"
 | "testimonial_carousel"
 | "timeline_history"
 | "product_carousel"
 | "product_grid"
 | "split_banner"
 | "store_profile_hero"
 | "store_hours"
 | "store_contact"
 | "image_hotspots"
 | "routine_steps"
 | "ingredient_spotlight"
 | "before_after_slider"
 | "event_rail"
 | "community_feed"
 // Biolink blocks
 | "biolink_profile_header"
 | "biolink_action_buttons"
 | "biolink_pix_card"
 // Location & Contact blocks
 | "location_map_card"
 // Marketing & Capture blocks
 | "newsletter_capture"
 // Tourism blocks
 | "tourism_quote_hero"
 | "tourism_services_grid"
 | "tourism_destinations_carousel"
 // Food & Restaurant blocks
 | "food_menu_streamlined"
 | "food_menu_tabs"
 | "chef_special_banner"
 | "restaurant_hours_delivery"
 | "table_booking_card"
 | "table_order_comanda"
 // Commerce blocks
 | "curated_hits_rail"
 | "shop_the_look_hotspots"
 | "size_guide_table"
 // Service & Professional blocks
 | "specialist_team_grid"
 | "service_pricing_table"
 | "property_features_grid"
 // Extended & Advanced Portal Blocks
 | "hero_banner"
 | "flash_sale_hero"
 | "category_cards_grid"
 | "featured_collection_banner"
 | "tourism_itinerary_timeline"
 | "portal_contracts"
 | "portal_carnes_bills"
 | "portal_appointments"
 | "portal_orders_rentals"
 | "careers_hero_banner"
 | "careers_job_filters"
 | "careers_job_grid"
 | "reputation_score_header"
 | "reputation_badges_strip"
 | "office_contract_viewer"
 | "reputation_timeline_feed";

export interface ResponsiveValue<T> {
 base: T;
 sm?: T;
 md?: T;
 lg?: T;
 xl?: T;
 "2xl"?: T;
}

export interface DataBinding {
 source?: string;
 limit?: number;
 collection_slug?: string;
 [key: string]: any;
}

export const DataBindingSchema = z
 .object({
 source: z.string().optional(),
 limit: z.number().optional(),
 collection_slug: z.string().optional(),
 })
 .catchall(z.unknown());

export const ExperienceNodeSchema = z.object({
 id: z.string().min(1),
 version_id: z.string().uuid().optional(),
 parent_id: z.string().nullable().optional(),
 node_type: z.enum(["section", "container", "element", "composition"]),
 block_type: z.string(),
 layout_variant: z.string().nullable().optional(),
 content: z.record(z.unknown()).nullish().transform((v) => v ?? {}),
 design_tokens: z.record(z.unknown()).nullish().transform((v) => v ?? {}),
 layout_rules: z.record(z.unknown()).nullish().transform((v) => v ?? {}),
 responsive_overrides: z.record(z.unknown()).nullish().transform((v) => v ?? {}),
 data_bindings: DataBindingSchema.nullish().transform((v) => v ?? {}),
 action_bindings: z.record(z.unknown()).nullish().transform((v) => v ?? {}),
 sort_order: z.number().nullish().transform((v) => v ?? 0),
 is_hidden: z.boolean().nullish().transform((v) => v ?? false),
 children: z.array(z.unknown()).optional(),
});

export interface ExperienceNode {
 id: string;
 version_id?: string;
 parent_id?: string | null;

 node_type: NodeType;
 block_type: BlockType;
 layout_variant?: string | null;

 content: Record<string, any>;
 design_tokens: Record<string, any>;
 layout_rules: Record<string, any>;
 responsive_overrides: Record<string, ResponsiveValue<any>>;
 data_bindings: DataBinding;
 action_bindings: Record<string, any>;

 sort_order: number;
 is_hidden: boolean;

 // Children (hydrated in the tree representation, not persisted in flat rows)
 children?: ExperienceNode[];
}

// ---------------------------------------------------------------------------
// Block Registry Definitions
// ---------------------------------------------------------------------------

export type InspectorFieldType =
 | "text"
 | "textarea"
 | "number"
 | "boolean"
 | "color"
 | "collection_select"
 | "category_select"
 | "image"
 | "video"
 | "select"
 | "radio"
 | "slider"
 | "data_binding"
 | "action_selector"
 | "collection"
 | "product"
 | "json"
 | "array";

export interface InspectorField {
 name: string;
 label: string;
 type: InspectorFieldType;
 options?: { label: string; value: string }[];
 defaultValue?: any;
 helpText?: string;
 placeholder?: string;
 required?: boolean;
 arrayFields?: InspectorField[];
}

export type BlockCategory =
 "layout" | "content" | "media" | "commerce" | "social" | "forms" | "marketing";

export interface BlockManifest {
 type: BlockType;
 version: string;
 name: string;
 description: string;
 category: BlockCategory;
 icon: string;

 allowedBuilderProfiles: ExperienceType[] | "all";
 allowedParentTypes: NodeType[] | "none" | "all";
 allowedChildTypes: NodeType[] | "none" | "all";

 // Schemas for server-side validation
 contentSchema: z.ZodTypeAny;
 styleSchema?: z.ZodTypeAny;
 layoutSchema?: z.ZodTypeAny;

 layoutVariants?: { label: string; value: string }[];

 // Inspector definition (UI for the editor)
 inspector: {
 content?: InspectorField[];
 design?: InspectorField[];
 layout?: InspectorField[];
 };

 defaultProps: Partial<ExperienceNode>;
 previewImageUrl?: string; // Used in Guided Mode
}

export interface SectionTemplate {
 id: string;
 name: string;
 description: string;
 category: BlockCategory;
 previewImageUrl: string; // The thumbnail to show in the Section Picker
 defaultSource?: string; // Optional default data binding source (e.g. 'latest_products')
 /**
 * The template structure.
 * When injected, these are cloned and assigned new UUIDs, maintaining parent/child relationships based on array order or placeholder IDs.
 * For simplicity in this micro-phase, we define a structured tree that will be flattened at injection.
 */
 nodes: Partial<ExperienceNode>[];
}
