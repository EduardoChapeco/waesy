import * as React from "react";
import type { OmniBlockStyling, BlockCapabilities, BlockDataBinding } from "./types";
import { useCart } from "@/lib/cart-context";

export interface ClassicBlockAdapterProps {
  id?: string;
  component: React.ComponentType<any>;
  data?: Record<string, any>;
  styling?: OmniBlockStyling;
  className?: string;
  isEditing?: boolean;
  products?: any[];
  categories?: any[];
  collections?: any[];
  storeData?: any;
  classifieds?: any[];
  posts?: any[];
  flyers?: any[];
  events?: any[];
  jobs?: any[];
  stores?: any[];
  banners?: any[];
  hotpages?: any[];
  newsArticles?: any[];
  sponsors?: any[];
  pageSlug?: string;
  onAddToCart?: (productId: string) => void;
  onLeadSubmit?: (payload: any) => Promise<any>;
  activeSubstate?: string;
  onUpdateInlineText?: (fieldPath: string, newValue: string) => void;
}

/**
 * ClassicBlockAdapter — Adaptador Universal de Blocos Clássicos para o Omni-Builder
 * 
 * Converte a anatomia do Omni-Block ({ id, data, styling }) nas props ricas
 * esperadas pelos componentes de `src/components/commerce/dynamic-sections/`.
 * Injeta data bindings reais do catálogo e hook de carrinho de compras nativo.
 */
export const ClassicBlockAdapter: React.FC<ClassicBlockAdapterProps> = ({
  id,
  component: Component,
  data = {},
  styling = {},
  className = "",
  isEditing = false,
  products = [],
  categories = [],
  collections = [],
  storeData = null,
  classifieds = [],
  posts = [],
  flyers = [],
  events = [],
  jobs = [],
  stores = [],
  banners = [],
  hotpages = [],
  newsArticles = [],
  sponsors = [],
  pageSlug,
  onAddToCart,
  onLeadSubmit,
  activeSubstate,
  onUpdateInlineText,
}) => {
  const { cart, refreshCart, setIsCartOpen } = useCart();

  const isLegacyTwBg = Boolean(styling.backgroundColor && styling.backgroundColor.startsWith("bg-"));
  const sectionStyle: React.CSSProperties = {
    backgroundColor: !isLegacyTwBg && styling.backgroundColor ? styling.backgroundColor : undefined,
    color: styling.textColor && !styling.textColor.startsWith("text-") ? styling.textColor : undefined,
    animationDelay:
      typeof styling.animationDelayMs === "number" && styling.animationDelayMs > 0
        ? `${styling.animationDelayMs}ms`
        : undefined,
  };

  const getPaddingClass = (pad?: string) => {
    switch (pad) {
      case "none":
        return "py-0";
      case "sm":
        return "py-6 sm:py-8";
      case "lg":
        return "py-16 sm:py-24";
      case "xl":
        return "py-20 sm:py-32";
      case "md":
      default:
        return "py-12 sm:py-16";
    }
  };

  const ptMap: Record<string, string> = {
    none: "pt-0",
    sm: "pt-6 sm:pt-8",
    md: "pt-12 sm:pt-16",
    lg: "pt-16 sm:pt-24",
    xl: "pt-20 sm:pt-32",
  };
  const pbMap: Record<string, string> = {
    none: "pb-0",
    sm: "pb-6 sm:pb-8",
    md: "pb-12 sm:pb-16",
    lg: "pb-16 sm:pb-24",
    xl: "pb-20 sm:pb-32",
  };
  const surfaceMap: Record<string, string> = {
    default: "",
    muted: "bg-muted/40",
    card: "bg-card border-y border-border/60",
    accent: "bg-primary/5 border-y border-primary/20",
  };
  const roundedMap: Record<string, string> = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    "2xl": "rounded-2xl",
    full: "rounded-full",
  };

  const getMaxWidthClass = (mw?: string) => {
    switch (mw) {
      case "sm":
        return "max-w-screen-sm";
      case "md":
        return "max-w-screen-md";
      case "lg":
        return "max-w-screen-lg";
      case "xl":
        return "max-w-screen-xl";
      case "full":
        return "max-w-none";
      case "7xl":
      default:
        return "max-w-7xl";
    }
  };

  const paddingClass =
    styling.paddingTop || styling.paddingBottom
      ? [
          ptMap[styling.paddingTop || styling.paddingY || "md"] || "",
          pbMap[styling.paddingBottom || styling.paddingY || "md"] || "",
        ]
          .filter(Boolean)
          .join(" ")
      : getPaddingClass(styling.paddingY);
  const maxWidthClass = getMaxWidthClass(styling.maxWidth);
  const surfaceClass = styling.surfacePreset ? surfaceMap[styling.surfacePreset] || "" : "";
  const borderClass = styling.border ? "border-y border-border/70" : "";
  const radiusClass = styling.borderRadius ? roundedMap[styling.borderRadius] || "" : "";
  const twBgClass = isLegacyTwBg ? styling.backgroundColor : "";

  // Normalização de dados do catálogo
  const resolvedProducts = Array.isArray(products) ? products : [];
  const resolvedCategories = Array.isArray(categories) ? categories : [];

  return (
    <section
      id={id}
      style={sectionStyle}
      className={`relative w-full ${paddingClass} ${surfaceClass} ${twBgClass} ${borderClass} ${radiusClass} ${className}`.trim()}
    >
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${maxWidthClass}`}>
        <Component
          {...data}
          content={data}
          layout_rules={styling}
          design_tokens={styling}
          isEditing={isEditing}
          products={resolvedProducts}
          resolvedProducts={resolvedProducts}
          categories={resolvedCategories}
          collections={collections}
          storeData={storeData}
          classifieds={classifieds}
          posts={posts}
          flyers={flyers}
          events={events}
          jobs={jobs}
          stores={stores}
          banners={banners}
          hotpages={hotpages}
          newsArticles={newsArticles}
          sponsors={sponsors}
          pageSlug={pageSlug}
          onAddToCart={onAddToCart}
          onLeadSubmit={onLeadSubmit}
          activeSubstate={activeSubstate}
          onUpdateInlineText={onUpdateInlineText}
          cart={cart}
          onRefreshCart={refreshCart}
          onOpenCart={() => setIsCartOpen(true)}
        />
      </div>
    </section>
  );
};

/**
 * Cria uma definição de bloco compatível com o Omni-Builder a partir de um componente clássico
 */
export function createClassicOmniBlock(options: {
  id: string;
  name: string;
  category: any;
  description: string;
  component: React.ComponentType<any>;
  defaultProps: Record<string, any>;
  defaultStyling?: OmniBlockStyling;
  capabilities?: BlockCapabilities;
  dataRequirements?: Partial<BlockDataBinding>;
}) {
  const WrappedComponent: React.FC<Record<string, any>> = (props) => {
    return (
      <ClassicBlockAdapter
        id={props.id}
        component={options.component}
        data={props.data}
        styling={props.styling}
        className={props.className}
        isEditing={props.isEditing}
        products={props.products}
        categories={props.categories}
        collections={props.collections}
        storeData={props.storeData}
        classifieds={props.classifieds}
        posts={props.posts}
        flyers={props.flyers}
        events={props.events}
        jobs={props.jobs}
        stores={props.stores}
        banners={props.banners}
        hotpages={props.hotpages}
        newsArticles={props.newsArticles}
        sponsors={props.sponsors}
        pageSlug={props.pageSlug}
        onAddToCart={props.onAddToCart}
        onLeadSubmit={props.onLeadSubmit}
        activeSubstate={props.activeSubstate}
        onUpdateInlineText={props.onUpdateInlineText}
      />
    );
  };

  WrappedComponent.displayName = `OmniBlock_${options.id}`;

  return {
    id: options.id,
    name: options.name,
    category: options.category,
    description: options.description,
    component: WrappedComponent as any,
    defaultProps: options.defaultProps,
    defaultStyling: options.defaultStyling,
    capabilities: options.capabilities,
    dataRequirements: options.dataRequirements,
  };
}
