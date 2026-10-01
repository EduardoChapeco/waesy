import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Direção do flex: 'vertical' (coluna) ou 'horizontal' (linha)
   */
  direction?: "vertical" | "horizontal";
  /**
   * Espaçamento na grade modular de 4px:
   * 1 = 4px, 2 = 8px, 3 = 12px, 4 = 16px, 6 = 24px, 8 = 32px, 12 = 48px
   */
  gap?: 1 | 2 | 3 | 4 | 6 | 8 | 12;
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  wrap?: boolean;
}

const gapMap: Record<number, string> = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
  12: "gap-12",
};

const alignMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const justifyMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

/**
 * Primitiva Canônica de Pilha (Stack)
 * Unifica espaçamentos na grade modular de 4px eliminando margens ad-hoc e classes arbitrárias.
 */
export const Stack = forwardRef<HTMLDivElement, StackProps>(
  (
    {
      className,
      direction = "vertical",
      gap = 4,
      align,
      justify,
      wrap = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          direction === "vertical" ? "flex-col" : "flex-row",
          gapMap[gap] || "gap-4",
          align && alignMap[align],
          justify && justifyMap[justify],
          wrap && "flex-wrap",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Stack.displayName = "Stack";
