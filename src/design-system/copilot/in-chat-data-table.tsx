import * as React from "react";
import { cn } from "@/lib/utils";

export interface InChatDataTableProps {
  title?: string;
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, string | number>[];
  className?: string;
}

export function InChatDataTable({
  title,
  columns,
  rows,
  className,
}: InChatDataTableProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-card overflow-hidden my-2 select-none text-xs",
        className
      )}
    >
      {title && (
        <div className="px-4 py-2 bg-muted/40 border-b border-border/60 font-semibold text-foreground">
          {title}
        </div>
      )}
      <div className="overflow-x-auto native-scroll">
        <table className="w-full text-left border-collapse">
          <thead className="bg-muted/20 border-b border-border/40 text-muted-foreground font-medium">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-2 text-2xs",
                    col.align === "right" && "text-right"
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30 text-foreground">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/30 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-3 py-2 text-xs",
                      col.align === "right" && "text-right font-mono tabular-nums"
                    )}
                  >
                    {row[col.key] ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
