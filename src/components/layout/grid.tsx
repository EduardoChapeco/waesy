import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type GridCols = 1 | 2 | 3 | 4 | 6 | 12;

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: GridCols;
  smCols?: GridCols;
  mdCols?: GridCols;
  lgCols?: GridCols;
  xlCols?: GridCols;
  gap?: 1 | 2 | 3 | 4 | 6 | 8 | 12;
}

const colsMap: Record<GridCols, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  12: "grid-cols-2 sm:grid-cols-4 lg:grid-cols-12",
};

const smColsMap: Record<GridCols, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  6: "sm:grid-cols-6",
  12: "sm:grid-cols-12",
};

const mdColsMap: Record<GridCols, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  6: "md:grid-cols-6",
  12: "md:grid-cols-12",
};

const lgColsMap: Record<GridCols, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  6: "lg:grid-cols-6",
  12: "lg:grid-cols-12",
};

const xlColsMap: Record<GridCols, string> = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  6: "xl:grid-cols-6",
  12: "xl:grid-cols-12",
};

const gapMap: Record<number, string> = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
  12: "gap-12",
};

/**
 * Primitiva Canônica de Grade (Grid)
 * Grid responsivo baseado estritamente na escala canônica sem classes arbitrárias
 * e com proteção intrínseca para viewport móvel (DL-29).
 */
export const Grid = forwardRef<HTMLDivElement, GridProps>(
  (
    {
      className,
      cols = 1,
      smCols,
      mdCols,
      lgCols,
      xlCols,
      gap = 4,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "grid",
          colsMap[cols],
          smCols && smColsMap[smCols],
          mdCols && mdColsMap[mdCols],
          lgCols && lgColsMap[lgCols],
          xlCols && xlColsMap[xlCols],
          gapMap[gap] || "gap-4",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Grid.displayName = "Grid";
