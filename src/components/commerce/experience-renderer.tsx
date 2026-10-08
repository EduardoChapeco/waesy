import { resolveStudioMotionClasses } from "@/lib/builder/motion-runtime";
import { BuilderAssetRefSchema } from "@/lib/builder/asset-contract";
import { BuilderAssetCredits } from "@/components/builder/BuilderAssetCredits";

function resolveAnimationClasses(designTokens?: Record<string, any>, layoutRules?: Record<string, any>): string {
 const anim = designTokens?.animation || layoutRules?.animation;
 return resolveStudioMotionClasses(anim);
}

import * as React from "react";
import { ExperienceNode } from "@/lib/builder-types";
import { builderRegistry } from "@/lib/builder-registry";
import type { OmniPageDocument } from "@/types/omni-builder";
import { omniPageToExperienceNodes, OMNI_EXPERIENCE_NODE_PREFIX } from "@/lib/builder/omni-experience-adapter";
import { getSiteBlockByIdStrict } from "@/components/builder/registry";
import { cn } from "@/lib/utils";
import { Surface } from "@/components/ui/surface";
import { HeroCarousel } from "./dynamic-sections/hero-carousel";
import { RichText } from "./dynamic-sections/rich-text";

import { BentoGrid } from "./dynamic-sections/bento-grid";
import { CountdownTimer } from "./dynamic-sections/countdown-timer";
import { StoriesRing } from "./dynamic-sections/stories-ring";
import { TrustBadges } from "./dynamic-sections/trust-badges";
import { ProductRail } from "./dynamic-sections/product-rail";
import { AnnouncementBar } from "./dynamic-sections/announcement-bar";
import { VideoSection } from "./dynamic-sections/video-section";
import { ContactForm } from "./dynamic-sections/contact-form";
import { GalleryGrid } from "./dynamic-sections/gallery-grid";
import { InfoCards } from "./dynamic-sections/info-cards";
import { MosaicBanners } from "./dynamic-sections/mosaic-banners";
import { SocialGrid } from "./dynamic-sections/social-grid";
import { FaqAccordion } from "./dynamic-sections/faq-accordion";
import { TestimonialCarousel } from "./dynamic-sections/testimonial-carousel";
import { TimelineHistory } from "./dynamic-sections/timeline-history";
import { ProductCarousel } from "./dynamic-sections/product-carousel";
import { ProductGrid } from "./dynamic-sections/product-grid";
import { SplitBanner } from "./dynamic-sections/split-banner";
import { StoreProfileHero } from "./dynamic-sections/store-profile-hero";
import { StoreHours } from "./dynamic-sections/store-hours";
import { StoreContact } from "./dynamic-sections/store-contact";
import { ImageHotspots } from "./dynamic-sections/image-hotspots";
import { RoutineSteps } from "./dynamic-sections/routine-steps";
import { IngredientSpotlight } from "./dynamic-sections/ingredient-spotlight";
import { BeforeAfterSlider } from "./dynamic-sections/before-after-slider";
import { BookingCalendar } from "./dynamic-sections/booking-calendar";
import { EventRail } from "./dynamic-sections/event-rail";
import { CommunityFeed } from "./dynamic-sections/community-feed";
import { TourismQuoteHero } from "./dynamic-sections/tourism-quote-hero";
import { TourismServicesGrid } from "./dynamic-sections/tourism-services-grid";
import { FlashSaleHero } from "./dynamic-sections/flash-sale-hero";
import { ServicePricingTable } from "./dynamic-sections/service-pricing-table";
import { FoodMenuTabsSection } from "./dynamic-sections/food-menu-tabs";
import { ChefSpecialBannerSection } from "./dynamic-sections/chef-special-banner";
import { RestaurantHoursDeliverySection } from "./dynamic-sections/restaurant-hours-delivery";
import { TableBookingSection } from "./dynamic-sections/table-booking-card";
import { ShopTheLookSection } from "./dynamic-sections/shop-the-look-hotspots";
import { SizeGuideTableSection } from "./dynamic-sections/size-guide-table";
import { PropertyFeaturesGridSection } from "./dynamic-sections/property-features-grid";
import { SpecialistTeamGridSection } from "./dynamic-sections/specialist-team-grid";
import {
  BiolinkProfileSection,
  BiolinkActionButtonsSection,
  BiolinkPixCardSection,
} from "./dynamic-sections/biolink-sections";
import { LocationMapCardSection } from "./dynamic-sections/location-map-card";
import { NewsletterCaptureSection } from "./dynamic-sections/newsletter-capture";
import { TourismDestinationsCarouselSection } from "./dynamic-sections/tourism-destinations-carousel";
import { FoodMenuStreamlinedSection } from "./dynamic-sections/food-menu-streamlined";
import { CuratedHitsRailSection } from "./dynamic-sections/curated-hits-rail";
import { TableOrderComandaSection } from "./dynamic-sections/table-order-comanda";
import { PortalContractsWidget } from "./dynamic-sections/portal-contracts-widget";
import { PortalCarnesBillsWidget } from "./dynamic-sections/portal-carnes-bills-widget";
import { PortalAppointmentsWidget } from "./dynamic-sections/portal-appointments-widget";
import { PortalOrdersRentalsWidget } from "./dynamic-sections/portal-orders-rentals-widget";
import { CareersHeroBanner } from "./dynamic-sections/careers-hero-banner";
import { CareersJobFilters } from "./dynamic-sections/careers-job-filters";
import { CareersJobGrid } from "./dynamic-sections/careers-job-grid";
import { ReputationScoreHeader } from "./dynamic-sections/reputation-score-header";
import { ReputationBadgesStrip } from "./dynamic-sections/reputation-badges-strip";
import { ReputationTimelineFeed } from "./dynamic-sections/reputation-timeline-feed";
import { OfficeContractViewer } from "./dynamic-sections/office-contract-viewer";
import { TravelHotelSlider } from "./dynamic-sections/travel-hotel-slider";
import { TravelItineraryTimeline } from "./dynamic-sections/travel-itinerary-timeline";
import { TravelPackageHero } from "./dynamic-sections/travel-package-hero";
import { TrackView } from "./analytics-provider";

// ---------------------------------------------------------------------------
// Block type → React component mapping
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Block type aliases to guarantee compatibility with legacy or variant blocks
// ---------------------------------------------------------------------------
const BLOCK_TYPE_ALIASES: Record<string, string> = {
  hero_banner: "hero_carousel",
  featured_collection_banner: "split_banner",
  category_cards_grid: "gallery_grid",
  tourism_itinerary_timeline: "travel_itinerary_timeline",
  service_catalog_list: "service_pricing_table",
  property_schedule_visit: "contact_form",
  property_virtual_tour: "video_section",
  biolink_featured_product: "product_rail",
};

const componentMap: Record<string, React.FC<any>> = {
  hero_carousel: HeroCarousel,
  hero_banner: HeroCarousel,
  travel_hotel_slider: TravelHotelSlider,
  travel_itinerary_timeline: TravelItineraryTimeline,
  travel_package_hero: TravelPackageHero,
  rich_text: RichText,
  bento_grid: BentoGrid,
  countdown_timer: CountdownTimer,
  stories_ring: StoriesRing,
  trust_badges: TrustBadges,
  product_rail: ProductRail,
  announcement_bar: AnnouncementBar,
  video_section: VideoSection,
  contact_form: ContactForm,
  gallery_grid: GalleryGrid,
  info_cards: InfoCards,
  mosaic_banners: MosaicBanners,
  social_grid: SocialGrid,
  faq_accordion: FaqAccordion,
  testimonial_carousel: TestimonialCarousel,
  timeline_history: TimelineHistory,
  product_carousel: ProductCarousel,
  product_grid: ProductGrid,
  split_banner: SplitBanner,
  store_profile_hero: StoreProfileHero,
  store_hours: StoreHours,
  store_contact: StoreContact,
  image_hotspots: ImageHotspots,
  routine_steps: RoutineSteps,
  ingredient_spotlight: IngredientSpotlight,
  before_after_slider: BeforeAfterSlider,
  booking_calendar: BookingCalendar,
  event_rail: EventRail,
  community_feed: CommunityFeed,
  tourism_quote_hero: TourismQuoteHero,
  tourism_services_grid: TourismServicesGrid,
  tourism_destinations_carousel: TourismDestinationsCarouselSection,
  flash_sale_hero: FlashSaleHero,
  service_pricing_table: ServicePricingTable,
  food_menu_tabs: FoodMenuTabsSection,
  food_menu_streamlined: FoodMenuStreamlinedSection,
  curated_hits_rail: CuratedHitsRailSection,
  table_order_comanda: TableOrderComandaSection,
  portal_contracts: PortalContractsWidget,
  portal_carnes_bills: PortalCarnesBillsWidget,
  portal_appointments: PortalAppointmentsWidget,
  portal_orders_rentals: PortalOrdersRentalsWidget,
  careers_hero_banner: CareersHeroBanner,
  careers_job_filters: CareersJobFilters,
  careers_job_grid: CareersJobGrid,
  reputation_score_header: ReputationScoreHeader,
  reputation_badges_strip: ReputationBadgesStrip,
  reputation_timeline_feed: ReputationTimelineFeed,
  chef_special_banner: ChefSpecialBannerSection,
  restaurant_hours_delivery: RestaurantHoursDeliverySection,
  table_booking_card: TableBookingSection,
  shop_the_look_hotspots: ShopTheLookSection,
  size_guide_table: SizeGuideTableSection,
  property_features_grid: PropertyFeaturesGridSection,
  specialist_team_grid: SpecialistTeamGridSection,
  biolink_profile_header: BiolinkProfileSection,
  biolink_action_buttons: BiolinkActionButtonsSection,
  biolink_pix_card: BiolinkPixCardSection,
  location_map_card: LocationMapCardSection,
  newsletter_capture: NewsletterCaptureSection,
};

const OMNI_BLOCK_RENDERER_IDS: Record<string, string> = {
 hero_minimal_split: "hero_minimal_split",
 hero_interactive_carousel: "hero_interactive_carousel",
 bento_asymmetric_4: "bento_asymmetric_4",
 bento_asymmetric_grid: "bento_asymmetric_4",
 pricing_three_tiers: "pricing_three_tiers",
 pricing_tables_clean: "pricing_three_tiers",
 media_gallery_mosaic: "media_gallery_mosaic",
 testimonials_social_proof: "testimonials_social_proof",
 contact_form_direct: "contact_form_direct",
 faq_clean_accordion: "faq_clean_accordion",
};

function createOmniBlockRenderer(blockType: string): React.FC<any> {
 const definition = getSiteBlockByIdStrict(OMNI_BLOCK_RENDERER_IDS[blockType] ?? blockType);
 const OmniComponent = definition?.component as React.ComponentType<any> | undefined;

 return function OmniBlockRenderer({ content, node_id, design_tokens, asset_refs }: any) {
  if (!OmniComponent) return null;
  return (
   <div className="w-full">
    <OmniComponent
     id={node_id}
     data={content ?? {}}
     styling={design_tokens?.omniStyling}
    />
    <BuilderAssetCredits assets={Array.isArray(asset_refs) ? asset_refs : []} />
   </div>
  );
 };
}

for (const blockType of Object.keys(OMNI_BLOCK_RENDERER_IDS)) {
 componentMap[`${OMNI_EXPERIENCE_NODE_PREFIX}${blockType}`] = createOmniBlockRenderer(blockType);
}

// ---------------------------------------------------------------------------
// Block types that receive real-time store profile data from transient_data
// ---------------------------------------------------------------------------
const STORE_PROFILE_BLOCKS = new Set([
  "store_profile_hero",
  "store_hours",
  "store_contact",
  "restaurant_hours_delivery",
  "table_booking_card",
  "tourism_quote_hero",
  "tourism_services_grid",
  "property_features_grid",
  "biolink_action_buttons",
]);

// ---------------------------------------------------------------------------
// Block types that receive product arrays from transient_data.products
// ---------------------------------------------------------------------------
const PRODUCT_DATA_BLOCKS = new Set([
  "product_rail",
  "product_carousel",
  "product_grid",
  "curated_hits_rail",
  "food_menu_streamlined",
  "food_menu_tabs",
  "chef_special_banner",
  "service_pricing_table",
]);

// ---------------------------------------------------------------------------
// Block types that receive review arrays from transient_data.reviews
// ---------------------------------------------------------------------------
const REVIEW_DATA_BLOCKS = new Set(["testimonial_carousel"]);

// ---------------------------------------------------------------------------
// Block types that receive event arrays from transient_data.events
// ---------------------------------------------------------------------------
const EVENT_DATA_BLOCKS = new Set(["event_rail"]);

// ---------------------------------------------------------------------------
// Block types that receive classifieds arrays from transient_data.classifieds
// ---------------------------------------------------------------------------
const CLASSIFIEDS_DATA_BLOCKS = new Set(["community_feed"]);

// ---------------------------------------------------------------------------
// Block types that receive banner arrays from transient_data.banners
// ---------------------------------------------------------------------------
const BANNER_DATA_BLOCKS = new Set([
  "hero_carousel",
  "hero_banner",
  "mosaic_banners",
  "split_banner",
]);

// ---------------------------------------------------------------------------
// BlockErrorBoundary — Prevents single blocks from crashing the whole page
// ---------------------------------------------------------------------------
class BlockErrorBoundary extends React.Component<
  { children: React.ReactNode; isEditing?: boolean; blockName?: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[Builder] Render error in block "${this.props.blockName}":`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.isEditing) {
        return (
          <div className="p-4 border border-dashed border-destructive/40 bg-destructive/10 text-destructive rounded-lg text-sm w-full h-full flex flex-col items-center justify-center">
            <span className="font-bold">Erro de Renderização no Bloco: {this.props.blockName}</span>
            <span className="text-xs opacity-80 mt-1">{this.state.error?.message}</span>
          </div>
        );
      }
      return null; // Silent failure in production to avoid WSOD
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// ExperienceRenderer — root entry
// ---------------------------------------------------------------------------
interface ExperienceRendererProps {
 nodes?: any[];
 document?: OmniPageDocument;
 bindings?: any;
 transientData?: any;
 isEditing?: boolean;
 selectedNodeId?: string | null;
 onSelectNode?: (id: string) => void;
}

export function ExperienceRenderer({
 nodes,
 document,
 bindings,
 transientData,
 isEditing,
 selectedNodeId,
 onSelectNode,
}: ExperienceRendererProps) {
 const renderNodes = document ? omniPageToExperienceNodes(document) : nodes;
 if (!renderNodes || renderNodes.length === 0) return null;
 const rendered = (
 <>
 {renderNodes.map((node) => (
 <BlockErrorBoundary key={node.id} isEditing={isEditing} blockName={node.block_type}>
 <ExperienceNodeRenderer
 node={node}
 transientData={transientData}
 bindings={bindings}
 isEditing={isEditing}
 selectedNodeId={selectedNodeId}
 onSelectNode={onSelectNode}
 />
 </BlockErrorBoundary>
 ))}
 </>
 );
 if (!document) return rendered;

 return (
  <div
   className="min-h-dvh w-full flex flex-col overflow-x-hidden bg-background text-foreground"
   data-omni-document-id={document.id ?? document.page_id}
   style={{
    backgroundColor: document.theme?.backgroundColor,
    color: document.theme?.textColor,
    fontFamily: document.theme?.fontFamily,
   }}
 >
  {rendered}
 </div>
 );
}

// ---------------------------------------------------------------------------
// ExperienceNodeRenderer — recursive node renderer
// ---------------------------------------------------------------------------
interface ExperienceNodeRendererProps {
  node: ExperienceNode;
  transientData?: any;
  bindings?: any;
  isEditing?: boolean;
  selectedNodeId?: string | null;
  onSelectNode?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Sanitizador Defensivo de Nós (Zero TypeError: cannot read .map of undefined)
// ---------------------------------------------------------------------------
export function sanitizeNodeProps(rawNode: ExperienceNode): ExperienceNode {
  if (!rawNode || typeof rawNode !== "object") {
    return {
      id: "safe-empty-node",
      node_type: "block",
      block_type: "rich_text",
      content: { text: "", items: [], slides: [], buttons: [] },
      design_tokens: {},
      layout_rules: {},
      responsive_overrides: {},
      data_bindings: {},
      action_bindings: {},
      sort_order: 0,
      is_hidden: false,
    } as ExperienceNode;
  }

  const content =
    rawNode.content && typeof rawNode.content === "object" ? { ...rawNode.content } : {};

  // Chaves de arrays que componentes frequentemente iteram com .map()
  const arrayKeys = [
    "items",
    "slides",
    "buttons",
    "features",
    "reviews",
    "hotspots",
    "badges",
    "cards",
    "steps",
    "faq_items",
    "categories",
    "banners",
    "destinations",
    "packages",
    "services",
    "tabs",
    "columns",
    "tags",
    "images",
    "options",
    "social_links",
    "business_hours",
    "schedule",
    "questions",
    "highlights",
    "links",
  ];

  for (const key of arrayKeys) {
    if (key in content) {
      if (!Array.isArray(content[key])) {
        content[key] = [];
      }
    } else {
      // Se a chave não existir mas for padrão em certos tipos, inicializa seguro
      if (key === "items" || key === "slides" || key === "buttons" || key === "features") {
        content[key] = [];
      }
    }
  }

  // Fallbacks de strings comuns
  if (content.title === undefined) content.title = "";
  if (content.subtitle === undefined) content.subtitle = "";
  if (content.description === undefined) content.description = "";

  return {
    ...rawNode,
    content,
    design_tokens:
      rawNode.design_tokens && typeof rawNode.design_tokens === "object"
        ? rawNode.design_tokens
        : {},
    layout_rules:
      rawNode.layout_rules && typeof rawNode.layout_rules === "object" ? rawNode.layout_rules : {},
    responsive_overrides:
      rawNode.responsive_overrides && typeof rawNode.responsive_overrides === "object"
        ? rawNode.responsive_overrides
        : {},
    data_bindings:
      rawNode.data_bindings && typeof rawNode.data_bindings === "object"
        ? rawNode.data_bindings
        : {},
    action_bindings:
      rawNode.action_bindings && typeof rawNode.action_bindings === "object"
        ? rawNode.action_bindings
        : {},
    section_anchor_id:
      typeof rawNode.section_anchor_id === "string" && /^[a-z][a-z0-9_-]{0,63}$/.test(rawNode.section_anchor_id)
        ? rawNode.section_anchor_id
        : undefined,
    asset_refs: Array.isArray(rawNode.asset_refs)
      ? rawNode.asset_refs.flatMap((asset: unknown) => {
          const parsed = BuilderAssetRefSchema.safeParse(asset);
          return parsed.success ? [parsed.data] : [];
        })
      : undefined,
    children: Array.isArray(rawNode.children) ? rawNode.children.map(sanitizeNodeProps) : undefined,
  };
}

function ExperienceNodeRenderer({
  node: rawNode,
  transientData,
  bindings,
  isEditing,
  selectedNodeId,
  onSelectNode,
}: ExperienceNodeRendererProps) {
  const node = sanitizeNodeProps(rawNode);
  if (!node || (node.is_hidden && !isEditing)) return null;

  // ── Checagem de Localidade / Cidade Alvo (Filtro Geográfico CMS) ────────────
  const nodeCityFilter =
    (node.layout_rules as any)?.city_filter || (node.content as any)?.city_filter;
  if (!isEditing && nodeCityFilter && nodeCityFilter !== "all") {
    const currentActiveCity =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("cidade") ||
          localStorage.getItem("waesy_selected_city")
        : null;
    if (currentActiveCity && currentActiveCity.toLowerCase() !== nodeCityFilter.toLowerCase()) {
      return null;
    }
  }

  const effectiveType = BLOCK_TYPE_ALIASES[node.block_type] || node.block_type;
  const manifest = builderRegistry[node.block_type] ||
    builderRegistry[effectiveType] || {
      type: node.block_type as any,
      version: "1.0.0",
      name: node.block_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      description: "Bloco dinâmico de vitrine",
      category: "content",
      icon: "Square",
      allowedBuilderProfiles: "all",
      allowedParentTypes: "all",
      allowedChildTypes: "all",
      contentSchema: null as any,
      inspector: { content: [] },
      defaultProps: {},
    };

  // ── Interactive editing wrapper ────────────────────────────────────────────
  const wrapInteractive = (
    children: React.ReactNode,
    className: string = "",
    style?: React.CSSProperties,
  ) => {
    const animClasses = resolveAnimationClasses(
      node.design_tokens as any,
      node.layout_rules as any,
    );
    if (!isEditing) {
      if (style || className || (node as any).section_anchor_id) {
        return (
          <div id={(node as any).section_anchor_id} className={cn(className, animClasses)} style={style}>
            {children}
          </div>
        );
      }
      return children;
    }
    const isSelected = selectedNodeId === node.id;
    return (
      <div
        id={(node as any).section_anchor_id}
        className={cn(
          "relative group cursor-pointer transition-all outline-none",
          isSelected
            ? "ring-2 ring-primary ring-inset z-10"
            : "hover:ring-2 hover:ring-primary/50 hover:ring-inset z-0",
          className,
          animClasses,
        )}
        style={style}
        onClick={(e) => {
          e.stopPropagation();
          if (onSelectNode) onSelectNode(node.id);
        }}
      >
        {children}
        {isSelected && (
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] px-2 py-1 font-mono z-20 rounded-bl-md pointer-events-none">
            {manifest.name}
          </div>
        )}
      </div>
    );
  };

  // ── Structural: section ────────────────────────────────────────────────────
  if (node.block_type === "section") {
    const bgImage = (node.design_tokens as any)?.backgroundImage;
    const variant = (node.design_tokens as any)?.surfaceVariant ?? "default";
    const elevation = (node.design_tokens as any)?.surfaceElevation ?? "none";
    const padding = (node.design_tokens as any)?.surfacePadding ?? "none";
    const bgColor = (node.design_tokens as any)?.backgroundColor;
    const textColor = (node.design_tokens as any)?.textColor;
    const rules = (node.layout_rules as any) || {};

    const pyClass =
      (
        {
          none: "py-0",
          sm: "py-4",
          md: "py-8",
          lg: "py-12",
          xl: "py-16",
          "2xl": "py-24",
        } as Record<string, string>
      )[rules.paddingY as string] ?? "";

    return wrapInteractive(
      <Surface
        as="section"
        variant={variant as any}
        elevation={elevation as any}
        padding={padding as any}
        className={cn("w-full relative", pyClass)}
        style={{
          backgroundColor: bgColor || undefined,
          color: textColor || undefined,
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {node.children && node.children.length > 0 ? (
          node.children.map((child: ExperienceNode) => (
            <ExperienceNodeRenderer
              key={child.id}
              node={child}
              transientData={transientData}
              bindings={bindings}
              isEditing={isEditing}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          ))
        ) : isEditing ? (
          <div className="p-8 text-center border-0/50 text-muted-foreground text-sm">
            Seção Vazia — adicione um Container
          </div>
        ) : null}
      </Surface>,
    );
  }

  // ── Structural: container ──────────────────────────────────────────────────
  if (node.block_type === "container") {
    const rules = (node.layout_rules as any) || {};
    const bgColor = (node.design_tokens as any)?.backgroundColor;
    const textColor = (node.design_tokens as any)?.textColor;

    const maxWidthClass =
      (
        {
          sm: "max-w-sm",
          md: "max-w-md",
          lg: "max-w-3xl",
          xl: "max-w-5xl",
          "2xl": "max-w-7xl",
          full: "max-w-full",
        } as Record<string, string>
      )[rules.maxWidth as string] ?? "max-w-5xl";

    const displayClass =
      (
        {
          block: "block",
          flex: "flex",
          grid: "grid",
        } as Record<string, string>
      )[rules.display as string] ?? "flex";

    const flexDirClass = rules.flexDirection === "row" ? "flex-row" : "flex-col";

    const gapClass =
      (
        {
          none: "gap-0",
          sm: "gap-2",
          md: "gap-6",
          lg: "gap-12",
          xl: "gap-20",
        } as Record<string, string>
      )[rules.gap as string] ?? "gap-6";

    const pxClass =
      (
        {
          none: "px-0",
          sm: "px-2",
          md: "px-4 lg:px-8",
          lg: "px-8 lg:px-12",
        } as Record<string, string>
      )[rules.paddingX as string] ?? "px-4 lg:px-8";

    const pyClass =
      (
        {
          none: "py-0",
          sm: "py-4",
          md: "py-8",
          lg: "py-12",
          xl: "py-16",
          "2xl": "py-24",
        } as Record<string, string>
      )[rules.paddingY as string] ?? "py-16";

    return wrapInteractive(
      <div
        className={cn(
          "mx-auto w-full",
          maxWidthClass,
          displayClass,
          flexDirClass,
          gapClass,
          pxClass,
          pyClass,
        )}
        style={{
          backgroundColor: bgColor || undefined,
          color: textColor || undefined,
        }}
      >
        {node.children && node.children.length > 0 ? (
          node.children.map((child: ExperienceNode) => (
            <ExperienceNodeRenderer
              key={child.id}
              node={child}
              transientData={transientData}
              bindings={bindings}
              isEditing={isEditing}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          ))
        ) : isEditing ? (
          <div className="p-4 text-center border-0/50 text-muted-foreground text-sm w-full">
            Container Vazio — selecione este container e adicione um bloco
          </div>
        ) : null}
      </div>,
    );
  }

  // ── Leaf/Composition component ─────────────────────────────────────────────
  const Component = componentMap[node.block_type] || componentMap[effectiveType];
  if (!Component) {
    if (isEditing) {
      return (
        <div className="p-4 border border-dashed border-warning bg-warning text-warning text-sm">
          Falta componente React para: {node.block_type}
        </div>
      );
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Resolve dynamic data for this specific node.
  //
  // Priority order:
  // 1. Node-level transient_data (injected by BFF hydrateBindings per-node)
  // 2. Page-level transientData (passed top-down from route loader)
  // 3. External bindings map (legacy fallback)
  // ---------------------------------------------------------------------------
  const nodeTransientData = (node as any).transient_data ?? null;
  const bindingSource = (node.data_bindings as any)?.source || null;

  // Props for store profile blocks: extract the correct sub-key com fallback defensivo seguro
  let storeProfileProps: Record<string, any> = {};
  if (STORE_PROFILE_BLOCKS.has(node.block_type)) {
    const rawStore =
      nodeTransientData?.store_hero ??
      nodeTransientData?.store ??
      nodeTransientData ??
      transientData?.store;
    if (!rawStore && !isEditing) return null;
    const storeObj = typeof rawStore === "object" && rawStore !== null ? rawStore : {};
    if (node.block_type === "store_profile_hero") {
      storeProfileProps = { storeData: nodeTransientData?.store_hero ?? storeObj };
    } else if (
      node.block_type === "store_hours" ||
      node.block_type === "restaurant_hours_delivery"
    ) {
      storeProfileProps = { storeData: nodeTransientData?.store_hours ?? storeObj };
    } else if (node.block_type === "store_contact" || node.block_type === "table_booking_card") {
      storeProfileProps = { storeData: nodeTransientData?.store_contact ?? storeObj };
    } else {
      storeProfileProps = { storeData: storeObj };
    }
  }

  // Props for product blocks: sempre um array seguro
  let resolvedProducts: any[] = [];
  if (PRODUCT_DATA_BLOCKS.has(node.block_type)) {
    if (Array.isArray(nodeTransientData?.products)) {
      resolvedProducts = nodeTransientData.products;
    } else if (Array.isArray(transientData?.products)) {
      resolvedProducts = transientData.products;
    } else if (bindingSource && bindings) {
      const key = `${node.id}_${bindingSource}`;
      resolvedProducts = Array.isArray(bindings[key]) ? bindings[key] : [];
    }
  }

  // Props for review blocks: sempre um array seguro
  let resolvedReviews: any[] = [];
  if (REVIEW_DATA_BLOCKS.has(node.block_type)) {
    if (Array.isArray(nodeTransientData?.reviews)) {
      resolvedReviews = nodeTransientData.reviews;
    } else if (Array.isArray(transientData?.reviews)) {
      resolvedReviews = transientData.reviews;
    }
  }

  // Props for event blocks
  let resolvedEvents: any[] = [];
  if (EVENT_DATA_BLOCKS.has(node.block_type)) {
    if (Array.isArray(nodeTransientData?.events)) {
      resolvedEvents = nodeTransientData.events;
    } else if (Array.isArray(transientData?.events)) {
      resolvedEvents = transientData.events;
    }
  }

  // Props for classifieds blocks
  let resolvedClassifieds: any[] = [];
  if (CLASSIFIEDS_DATA_BLOCKS.has(node.block_type)) {
    if (Array.isArray(nodeTransientData?.classifieds)) {
      resolvedClassifieds = nodeTransientData.classifieds;
    } else if (Array.isArray(transientData?.classifieds)) {
      resolvedClassifieds = transientData.classifieds;
    }
  }

  // Props for banner blocks
  let resolvedBanners: any[] = [];
  if (BANNER_DATA_BLOCKS.has(node.block_type)) {
    if (Array.isArray(nodeTransientData?.banners)) {
      resolvedBanners = nodeTransientData.banners;
    } else if (Array.isArray(transientData?.banners)) {
      resolvedBanners = transientData.banners;
    }
  }

  // Props for destination blocks
  let resolvedDestinations: any[] = [];
  if (
    node.block_type === "tourism_destinations_carousel" ||
    bindingSource === "destinations_catalog"
  ) {
    if (Array.isArray(nodeTransientData?.destinations)) {
      resolvedDestinations = nodeTransientData.destinations;
    } else if (Array.isArray(transientData?.destinations)) {
      resolvedDestinations = transientData.destinations;
    }
  }

  // The canonical content object (from DB node.content JSONB)
  const content = (node.content as Record<string, any>) ?? {};
  const designTokens = (node.design_tokens as Record<string, any>) ?? {};
  const layoutRules = (node.layout_rules as Record<string, any>) ?? {};
  const effectiveLayoutVariant = node.layout_variant || layoutRules.variant;

  return wrapInteractive(
    <TrackView nodeId={node.id} blockType={node.block_type}>
      <Component
        // ── Canonical: Pass the full content object ─────────────────────────
        content={content}
        // ── Legacy Compat: Spread content fields as flat props ──────────────
        {...content}
        // ── Extra canonical props ───────────────────────────────────────────
        node_id={node.id}
        block_type={node.block_type}
        layout_variant={effectiveLayoutVariant}
        design_tokens={designTokens}
        layout_rules={layoutRules}
        data_bindings={node.data_bindings}
        action_bindings={node.action_bindings}
        asset_refs={node.asset_refs}
        isEditing={isEditing}
        // ── Dynamic data ────────────────────────────────────────────────────
        resolvedProducts={resolvedProducts}
        products={resolvedProducts}
        resolvedReviews={resolvedReviews}
        reviews={resolvedReviews}
        resolvedEvents={resolvedEvents}
        events={resolvedEvents}
        resolvedClassifieds={resolvedClassifieds}
        classifieds={resolvedClassifieds}
        resolvedBanners={resolvedBanners}
        banners={resolvedBanners}
        resolvedDestinations={resolvedDestinations}
        destinations={resolvedDestinations}
        {...storeProfileProps}
      />
    </TrackView>,
    "",
    {
      backgroundColor: designTokens.backgroundColor || undefined,
      color: designTokens.textColor || undefined,
    },
  );
}
