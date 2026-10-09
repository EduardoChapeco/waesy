import * as React from "react";
import type { OmniBlockStyling } from "./types";
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
}) => {
  const { cart, refreshCart, setIsCartOpen } = useCart();

  const sectionStyle: React.CSSProperties = {
    backgroundColor: styling.backgroundColor || undefined,
    color: styling.textColor || undefined,
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

  const paddingClass = getPaddingClass(styling.paddingY);
  const maxWidthClass = getMaxWidthClass(styling.maxWidth);

  // Normalização de dados do catálogo
  const resolvedProducts = Array.isArray(products) ? products : [];
  const resolvedCategories = Array.isArray(categories) ? categories : [];

  return (
    <section
      id={id}
      style={sectionStyle}
      className={`relative w-full ${paddingClass} ${className}`}
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
}) {
  const WrappedComponent: React.FC<{
    id: string;
    data: any;
    styling?: OmniBlockStyling;
    className?: string;
    isEditing?: boolean;
    products?: any[];
    categories?: any[];
    collections?: any[];
    storeData?: any;
  }> = (props) => {
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
  };
}
