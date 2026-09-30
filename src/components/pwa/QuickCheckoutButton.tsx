import React from "react";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { formatMoney } from "@/lib/money";

export interface QuickCheckoutButtonProps {
  itemCount?: number;
  totalCents?: number;
  themeColor?: string;
  onCheckout?: () => void;
  label?: string;
}

export const QuickCheckoutButton: React.FC<QuickCheckoutButtonProps> = ({
  itemCount = 2,
  totalCents = 12900,
  themeColor = "#0F172A",
  onCheckout,
  label = "Finalizar Pedido",
}) => {
  if (itemCount <= 0) return null;

  return (
    <div className="w-full px-3 py-2 bg-background/80 backdrop-blur-md border-t border-border/40 select-none">
      <button
        type="button"
        onClick={onCheckout}
        style={{ backgroundColor: themeColor }}
        className="w-full min-h-11 rounded-xl px-4 py-2 text-white font-bold text-xs flex items-center justify-between shadow-md active:scale-98 transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-white/20 flex items-center justify-center text-xs font-black">
            {itemCount}
          </div>
          <span>{label}</span>
        </div>

        <div className="flex items-center gap-1.5 font-bold">
          <span>{formatMoney(totalCents)}</span>
          <ArrowRight className="size-3.5" />
        </div>
      </button>
    </div>
  );
};
