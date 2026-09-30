import * as React from "react";
import { cn } from "@/lib/utils";

export type TableWindowVariant = "auto" | "compact" | "expanded";

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  windowVariant?: TableWindowVariant;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, windowVariant = "auto", ...props }, ref) => {
    const containerClasses = {
      compact: "relative w-full overflow-x-auto no-scrollbar snap-x rounded-xl border border-border/60",
      expanded: "relative w-full overflow-x-auto rounded-2xl border border-border/50",
      auto: "relative w-full overflow-x-auto no-scrollbar sm:overflow-visible rounded-xl sm:rounded-2xl border border-border/50",
    }[windowVariant];

    const tableTypography = {
      compact: "text-xs",
      expanded: "text-xs font-mono tabular-nums",
      auto: "text-xs sm:text-sm",
    }[windowVariant];

    return (
      <div className={containerClasses}>
        <table ref={ref} className={cn("w-full caption-bottom", tableTypography, className)} {...props} />
      </div>
    );
  }
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b bg-muted/30", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0 divide-y divide-border/40", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  windowVariant?: TableWindowVariant;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, windowVariant = "auto", ...props }, ref) => {
    const rowHeight = {
      compact: "min-h-12 py-1",
      expanded: "h-9",
      auto: "min-h-11 sm:h-9",
    }[windowVariant];

    return (
      <tr
        ref={ref}
        className={cn(
          "border-b border-border/40 transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted",
          rowHeight,
          className
        )}
        {...props}
      />
    );
  }
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-9 sm:h-10 px-3 text-left align-middle font-semibold text-muted-foreground text-xs uppercase tracking-wider [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-3 py-2.5 sm:py-2 align-middle text-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-xs text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
