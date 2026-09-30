import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getCart, getGlobalCarts, updateCartItemQty, updateCartItemOptions, removeFromCart } from "@/services/cart.functions";
import type { CartDTO } from "@/types/orders";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";

interface CartContextType {
  cart: CartDTO | null; // Current store cart
  globalCarts: CartDTO[]; // All active carts
  isCartOpen: boolean;
  isCartUpdating: boolean;
  setIsCartOpen: (open: boolean) => void;
  refreshCart: () => Promise<void>;
  updateQty: (variantId: string, delta: number, itemId?: string) => Promise<void>;
  updateItemOptions: (
    itemId: string,
    params: {
      variantId?: string;
      options?: Record<string, string | string[]>;
      quantity?: number;
    },
  ) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  initCart: (initialCart: CartDTO | null, initialGlobalCarts?: CartDTO[]) => void;
  setCartData: (cart: CartDTO | null, globalCarts?: CartDTO[]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartDTO | null>(null);
  const [globalCarts, setGlobalCarts] = useState<CartDTO[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartUpdating, setIsCartUpdating] = useState(false);
  const router = useRouter();

  const isRefreshingRef = React.useRef(false);

  const initCart = (initialCart: CartDTO | null, initialGlobalCarts?: CartDTO[]) => {
    if (initialCart !== undefined) setCart(initialCart);
    if (initialGlobalCarts !== undefined) setGlobalCarts(initialGlobalCarts);
  };

  const refreshCart = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsCartUpdating(true);
    try {
      const [updatedCart, updatedGlobalCarts] = await Promise.all([
        getCart().catch(() => null),
        getGlobalCarts().catch(() => []),
      ]);
      setCart(updatedCart || null);
      setGlobalCarts(updatedGlobalCarts || []);
      await router.invalidate();
    } catch (e) {
      console.error("Failed to refresh cart", e);
    } finally {
      isRefreshingRef.current = false;
      setIsCartUpdating(false);
    }
  };

  useEffect(() => {
    const handleFocus = () => {
      if (!isRefreshingRef.current) refreshCart();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const updateQty = async (variantId: string, delta: number, itemId?: string) => {
    setIsCartUpdating(true);
    try {
      const res = await updateCartItemQty({ data: { variantId, delta, itemId } });
      if (res && (res as any).status === "error") {
        toast.error((res as any).message || "Erro ao atualizar carrinho");
      }
    } catch (e: unknown) {
      toast.error(
        (e instanceof Error ? e.message : String(e)) || "Erro inesperado ao atualizar carrinho",
      );
    } finally {
      await refreshCart();
    }
  };

  const updateItemOptions = async (
    itemId: string,
    params: {
      variantId?: string;
      options?: Record<string, string | string[]>;
      quantity?: number;
    },
  ) => {
    setIsCartUpdating(true);
    try {
      const res = await updateCartItemOptions({
        data: {
          itemId,
          variantId: params.variantId,
          options: params.options,
          quantity: params.quantity,
        },
      });
      if (res && (res as any).status === "error") {
        toast.error((res as any).message || "Erro ao atualizar item do carrinho");
      } else {
        toast.success("Item atualizado no carrinho!");
      }
    } catch (e: unknown) {
      toast.error(
        (e instanceof Error ? e.message : String(e)) || "Erro ao atualizar item do carrinho",
      );
    } finally {
      await refreshCart();
    }
  };

  const removeItem = async (itemId: string) => {
    setIsCartUpdating(true);
    try {
      await removeFromCart({ data: { itemId } });
    } catch (e: unknown) {
      toast.error(
        (e instanceof Error ? e.message : String(e)) || "Erro inesperado ao remover item",
      );
    } finally {
      await refreshCart();
    }
  };

  const setCartData = (newCart: CartDTO | null, newGlobalCarts?: CartDTO[]) => {
    if (newCart) setCart(newCart);
    if (newGlobalCarts && newGlobalCarts.length > 0) {
      setGlobalCarts(newGlobalCarts);
    } else if (newCart && newCart.itemCount > 0) {
      setGlobalCarts((prev) => {
        const otherCarts = prev.filter((c) => c.id !== newCart.id);
        return [newCart, ...otherCarts];
      });
    }
    refreshCart();
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        globalCarts,
        isCartOpen,
        isCartUpdating,
        setIsCartOpen,
        refreshCart,
        updateQty,
        updateItemOptions,
        removeItem,
        initCart,
        setCartData,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

const fallbackCartContext: CartContextType = {
  cart: null,
  globalCarts: [],
  isCartOpen: false,
  isCartUpdating: false,
  setIsCartOpen: () => {},
  refreshCart: async () => {},
  updateQty: async () => {},
  updateItemOptions: async () => {},
  removeItem: async () => {},
  initCart: () => {},
  setCartData: () => {},
};

export function useCartContext() {
  const context = useContext(CartContext);
  if (!context) {
    return fallbackCartContext;
  }
  return context;
}

export const useCart = useCartContext;
