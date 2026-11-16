import React, { useId, useState, useMemo } from "react";
import { Search, ArrowUpDown, Download, Share2, Table, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { exportElementAsPdf } from "@/lib/pdf-export";
import { toast } from "sonner";

function parseNumericCell(val: unknown): number | null {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed.startsWith("=")) return null;
  const normalized = trimmed
    .replace(/R\$\s?/gi, "")
    .replace(/\s+/g, "")
    .replace(/\.(?=\d{3}(?:[,.]|$))/g, "")
    .replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

export function evaluateTableFormulaCell(
  rawCell: string | number,
  allRows: (string | number)[][],
  headers: string[],
): string | number {
  if (typeof rawCell !== "string") return rawCell;
  const trimmed = rawCell.trim();
  const match = trimmed.match(/^=(SUM|AVG|COUNT)\(([^)]*)\)$/i);
  if (!match) return rawCell;

  const fn = match[1].toUpperCase();
  const arg = match[2].trim();
  if (fn === "COUNT" && !arg) {
    return allRows.filter((r) => !r.some((c) => typeof c === "string" && c.trim().startsWith("="))).length;
  }

  let colIdx = Number.isInteger(Number(arg)) && arg !== "" ? Number(arg) : -1;
  if (colIdx < 0 && arg) {
    colIdx = headers.findIndex((h) => h.toLowerCase().trim() === arg.toLowerCase());
  }
  if (colIdx < 0) return rawCell;

  const nums = allRows
    .map((r) => parseNumericCell(r[colIdx]))
    .filter((n): n is number => n !== null);
  if (fn === "COUNT") return nums.length;
  if (nums.length === 0) return 0;
  const total = nums.reduce((acc, n) => acc + n, 0);
  if (fn === "SUM") return Number(total.toFixed(2));
  return Number((total / nums.length).toFixed(2));
}

export interface ArtifactInteractiveTableProps {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: Record<string, number>;
  className?: string;
}

export function ArtifactInteractiveTable({
  title,
  headers = [],
  rows = [],
  summary,
  className,
}: ArtifactInteractiveTableProps) {
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const pageSize = 25;
  const uid = useId();
  const tableStageId = `artifact-table-stage-${uid.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const evaluatedRows = useMemo(
    () =>
      rows.map((row) =>
        row.map((cell) => evaluateTableFormulaCell(cell, rows, headers)),
      ),
    [rows, headers],
  );

  // Filtragem
  const filteredRows = useMemo(() => {
    if (!search.trim()) return evaluatedRows;
    const term = search.toLowerCase();
    return evaluatedRows.filter((r) => r.some((c) => String(c).toLowerCase().includes(term)));
  }, [evaluatedRows, search]);

  // Ordenação
  const sortedRows = useMemo(() => {
    if (sortCol === null) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const valA = a[sortCol] ?? "";
      const valB = b[sortCol] ?? "";
      if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredRows, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, validPage, pageSize]);

  const toggleSort = (colIdx: number) => {
    setCurrentPage(1);
    if (sortCol === colIdx) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(colIdx);
      setSortAsc(true);
    }
  };


  const handleExportCsv = () => {
    const csvRows = [headers.join(";")];
    for (const r of evaluatedRows) {
      csvRows.push(r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"));
    }
    const blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const slug = (title || "planilha-waesy").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32);
      await exportElementAsPdf(tableStageId, `${slug}.pdf`, "l");
      toast.success("Planilha exportada em PDF!");
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gerar PDF da planilha.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleShareWhatsapp = () => {
    let text = `*${title}*\n\n`;
    const previewRows = evaluatedRows.slice(0, 5);
    for (const r of previewRows) {
      text += r.join(" | ") + "\n";
    }
    if (evaluatedRows.length > 5) {
      text += `\n...e mais ${evaluatedRows.length - 5} linhas.`;
    }
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, "_blank");
  };

  return (
    <div id={tableStageId} className={cn("@container rounded-lg border border-border/50 bg-card p-4 space-y-3", className)}>
      {/* Cabeçalho */}
      <div className="flex flex-col @sm:flex-row @sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Table className="size-4 text-primary" aria-hidden="true" />
          <h4 className="text-sm font-bold text-foreground leading-snug">{title}</h4>
        </div>
        <Badge variant="outline" className="text-2xs font-mono self-start @sm:self-auto">
          {sortedRows.length} de {rows.length} registros
        </Badge>
      </div>

      {/* Barra de Filtro e Ações */}
      <div className="flex flex-col @sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Filtrar dados da tabela..."
            className="pl-9 h-11 text-xs focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-11 min-h-11 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center gap-2"
            title="Baixar planilha CSV"
          >
            <Download className="size-4" />
            <span className="hidden @sm:inline">CSV</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isExportingPdf}
            onClick={() => void handleExportPdf()}
            className="h-11 min-h-11 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center gap-2"
            title="Exportar planilha PDF"
          >
            <FileText className="size-4" />
            <span className="hidden @sm:inline">{isExportingPdf ? "Gerando..." : "PDF"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShareWhatsapp}
            className="h-11 min-h-11 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center gap-2"
            title="Compartilhar resumo via WhatsApp"
          >
            <Share2 className="size-4" />
            <span className="hidden @sm:inline">WhatsApp</span>
          </Button>
        </div>
      </div>

      {/* Tabela Scrollável */}
      {/* design-lint-ignore DL-30 reason:"Tabela responsiva de dados com rolagem horizontal" expiry:"2027-12-31" */}
      <div className="overflow-x-auto scroll-area-carousel rounded border border-border/40 max-h-72">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-muted/40 border-b border-border/60 sticky top-0 z-10">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="p-3 font-semibold text-foreground whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => toggleSort(i)}
                    className="flex items-center gap-1 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded cursor-pointer"
                  >
                    <span>{h}</span>
                    <ArrowUpDown className="size-3 text-muted-foreground" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-muted/20 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-3 whitespace-nowrap text-muted-foreground font-mono">
                      {String(cell)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length || 1} className="p-4 text-center text-muted-foreground">
                  Nenhum dado encontrado para o filtro digitado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de Paginação Tátil (Piso 44px) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={validPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="h-11 min-h-11 px-3 text-xs gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer disabled:opacity-40"
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
            <span>Anterior</span>
          </Button>

          <span className="text-2xs font-mono text-muted-foreground">
            Página {validPage} de {totalPages}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={validPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="h-11 min-h-11 px-3 text-xs gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer disabled:opacity-40"
            aria-label="Próxima página"
          >
            <span>Próxima</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Resumo se houver */}
      {summary && Object.keys(summary).length > 0 && (
        <div className="rounded border border-border/40 bg-muted/20 p-3 flex flex-wrap items-center gap-4 text-xs">
          {Object.entries(summary).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
              <span className="font-bold font-mono text-foreground">{Number(val).toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
