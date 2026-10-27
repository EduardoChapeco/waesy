import React from "react";
import { cn } from "@/lib/utils";
import {
  computeTeteterisGrid,
  type TeteterisItemInput,
  type TeteterisRatio,
  type TeteterisCalculatedSlot,
} from "@/lib/layout/teteterisgrid-engine";

export interface TeteterisSlotMeta {
  id: string;
  colSpan: number;
  rowSpan: number;
  col: number;
  row: number;
  aspectRatio: TeteterisRatio;
}

export interface TeteterisGridViewProps<T = any> {
  items: TeteterisItemInput<T>[];
  maxCols?: 4 | 6;
  compact?: boolean;
  className?: string;
  slotClassName?: string;
  renderCard: (item: T, meta: TeteterisSlotMeta) => React.ReactNode;
}

/**
 * TeteterisGridView
 * Componente visual canônico do sistema teteterisgrid com geometria squircle Apple HIG.
 * Garante preenchimento de 100% da grade (zero lacunas) e prevenção absoluta de truncamento.
 */
export function TeteterisGridView<T = any>({
  items,
  maxCols = 4,
  compact = false,
  className,
  slotClassName,
  renderCard,
}: TeteterisGridViewProps<T>) {
  const slots: TeteterisCalculatedSlot<T>[] = React.useMemo(
    () => computeTeteterisGrid(items, maxCols),
    [items, maxCols]
  );

  if (!slots || slots.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Grade Dinâmica Teteterisgrid"
      data-compact-grid={compact ? "true" : "false"}
      className={cn(
        "grid gap-3 sm:gap-4 auto-rows-fr",
        compact
          ? "grid-cols-2"
          : maxCols === 4
          ? "grid-cols-2 sm:grid-cols-2 xl:grid-cols-4"
          : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
        className
      )}
    >
      {slots.map((slot) => {
        const colSpanClass = compact
          ? slot.colSpan >= 2
            ? "col-span-2"
            : "col-span-1"
          : slot.colSpan === 6
          ? "col-span-2 sm:col-span-3 lg:col-span-6"
          : slot.colSpan === 4
          ? "col-span-2 xl:col-span-4"
          : slot.colSpan === 3
          ? "col-span-2 xl:col-span-3"
          : slot.colSpan === 2
          ? "col-span-2"
          : "col-span-1";

        const rowSpanClass = slot.rowSpan === 2 ? "row-span-2" : "row-span-1";

        return (
          <div
            key={slot.id}
            data-col-span={slot.colSpan}
            data-row-span={slot.rowSpan}
            className={cn(
              colSpanClass,
              rowSpanClass,
              "rounded-lg bg-card border border-border/60 p-4 sm:p-5 flex flex-col justify-between transition-colors hover:border-primary/40 shadow-2xs min-w-0",
              slotClassName
            )}
          >
            {renderCard(slot.content, {
              id: slot.id,
              colSpan: slot.colSpan,
              rowSpan: slot.rowSpan,
              col: slot.col,
              row: slot.row,
              aspectRatio: slot.aspectRatio,
            })}
          </div>
        );
      })}
    </div>
  );
}
