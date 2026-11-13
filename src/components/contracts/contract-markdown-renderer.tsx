import React from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export interface ContractMarkdownRendererProps {
  content: string;
  className?: string;
}

type MarkdownBlock =
  | { type: "markdown"; content: string }
  | {
      type: "table";
      headers: string[];
      alignments: Array<"left" | "center" | "right">;
      rows: string[][];
    };

function isTableRowLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.length >= 2;
}

function isTableSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!isTableRowLine(trimmed)) return false;
  const cells = splitTableCells(trimmed);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));
}

function parseAlignment(sepCell: string): "left" | "center" | "right" {
  const t = sepCell.trim();
  if (t.startsWith(":") && t.endsWith(":")) return "center";
  if (t.endsWith(":")) return "right";
  return "left";
}

function splitTableCells(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.slice(1, -1);
  return inner.split("|").map((cell) => cell.trim());
}

export function splitMarkdownAndTables(content: string): MarkdownBlock[] {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let mdBuffer: string[] = [];

  const flushMarkdown = () => {
    const text = mdBuffer.join("\n").trim();
    if (text) {
      blocks.push({ type: "markdown", content: text });
    }
    mdBuffer = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const nextLine = lines[i + 1] ?? "";

    if (isTableRowLine(line) && isTableSeparatorLine(nextLine)) {
      flushMarkdown();
      const headers = splitTableCells(line);
      const alignments = splitTableCells(nextLine).map(parseAlignment);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isTableRowLine(lines[i] ?? "")) {
        const parsedRow = splitTableCells(lines[i] ?? "");
        const paddedRow = headers.map((_, colIdx) => parsedRow[colIdx] ?? "");
        rows.push(paddedRow);
        i++;
      }
      blocks.push({ type: "table", headers, alignments, rows });
      continue;
    }

    mdBuffer.push(line);
    i++;
  }

  flushMarkdown();
  return blocks;
}

const ALIGN_CLASS: Record<"left" | "center" | "right", string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function ContractMarkdownRenderer({ content, className }: ContractMarkdownRendererProps) {
  const blocks = React.useMemo(() => splitMarkdownAndTables(content || ""), [content]);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {blocks.map((block, idx) => {
        if (block.type === "table") {
          return (
            <div
              key={`tbl-${idx}`}
              className="my-3 w-full overflow-x-auto scroll-area rounded-lg border border-border bg-background"
            >
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/60 border-b border-border">
                    {block.headers.map((header, hIdx) => (
                      <th
                        key={`th-${hIdx}`}
                        className={cn(
                          "px-3 py-2 font-bold text-foreground whitespace-nowrap",
                          ALIGN_CLASS[block.alignments[hIdx] || "left"],
                        )}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {block.rows.map((row, rIdx) => (
                    <tr key={`tr-${rIdx}`} className="hover:bg-muted/30 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td
                          key={`td-${rIdx}-${cIdx}`}
                          className={cn(
                            "px-3 py-2 text-foreground/90 align-top break-words",
                            ALIGN_CLASS[block.alignments[cIdx] || "left"],
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return (
          <div key={`md-${idx}`} className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{block.content}</ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}
