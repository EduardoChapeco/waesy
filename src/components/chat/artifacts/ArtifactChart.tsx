import React, { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, Download, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ArtifactChartProps {
  title: string;
  subtitle?: string;
  chartType?: "bar" | "line" | "area" | "pie";
  data: Array<{ name: string; value: number; [key: string]: any }>;
  xKey?: string;
  yKey?: string;
  className?: string;
}

const SEMANTIC_PALETTE = [
  "var(--primary)",
  "var(--accent)",
  "var(--secondary)",
  "var(--muted-foreground)",
];

export function ArtifactChart({
  title,
  subtitle,
  chartType = "bar",
  data = [],
  xKey = "name",
  yKey = "value",
  className,
}: ArtifactChartProps) {
  const [selectedType, setSelectedType] = useState<"bar" | "line" | "area" | "pie">(chartType);

  const handleExportJson = () => {
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonStr;
    link.download = `${title.toLowerCase().replace(/\s+/g, "_")}_chart.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={cn("rounded-lg border border-border/50 bg-card p-4 space-y-4", className)}>
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" aria-hidden="true" />
            <h4 className="text-sm font-bold text-foreground leading-snug">{title}</h4>
          </div>
          {subtitle && <p className="text-2xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>

        {/* Controles de Tipo de Gráfico */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={selectedType === "bar" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType("bar")}
            className="h-11 min-h-11 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
            title="Visualização em Barras"
            aria-label="Alternar para Gráfico em Barras"
          >
            <BarChart3 className="size-4" />
          </Button>

          <Button
            type="button"
            variant={selectedType === "line" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType("line")}
            className="h-11 min-h-11 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
            title="Visualização em Linhas"
            aria-label="Alternar para Gráfico em Linhas"
          >
            <LineIcon className="size-4" />
          </Button>

          <Button
            type="button"
            variant={selectedType === "area" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType("area")}
            className="h-11 min-h-11 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
            title="Visualização em Área"
            aria-label="Alternar para Gráfico em Área"
          >
            <Layers className="size-4" />
          </Button>

          <Button
            type="button"
            variant={selectedType === "pie" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType("pie")}
            className="h-11 min-h-11 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
            title="Visualização em Pizza"
            aria-label="Alternar para Gráfico em Pizza"
          >
            <PieIcon className="size-4" />
          </Button>
        </div>
      </div>

      {/* Área do Gráfico */}
      <div className="w-full h-64 select-none">
        {data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border/60 rounded-md">
            Nenhum dado numérico disponível para plotagem.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {selectedType === "line" ? (
              <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey={xKey} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={yKey}
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "var(--primary)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : selectedType === "area" ? (
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey={xKey} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={yKey}
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.2}
                />
              </AreaChart>
            ) : selectedType === "pie" ? (
              <PieChart>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Pie
                  data={data}
                  dataKey={yKey}
                  nameKey={xKey}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={4}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={SEMANTIC_PALETTE[index % SEMANTIC_PALETTE.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey={xKey} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey={yKey} fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Rodapé de Ações */}
      <div className="flex items-center justify-between border-t border-border/40 pt-3">
        <Badge variant="outline" className="text-2xs font-mono">
          {data.length} série(s) de dados
        </Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExportJson}
          className="h-11 min-h-11 px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer flex items-center gap-2"
        >
          <Download className="size-4" />
          <span>Exportar Dados</span>
        </Button>
      </div>
    </div>
  );
}
