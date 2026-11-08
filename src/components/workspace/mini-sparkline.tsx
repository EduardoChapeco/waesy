import * as React from "react";
import { cn } from "@/lib/utils";

export type SparklineTrend = "up" | "down" | "neutral";

export interface MiniSparklineProps {
  data: number[];
  color?: string;
  trend?: SparklineTrend;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

export function MiniSparkline({
  data,
  color,
  trend,
  height = 36,
  strokeWidth = 2,
  className,
}: MiniSparklineProps) {
  const gradientId = React.useId();

  if (!data || data.length < 2) {
    return null;
  }

  // Resolução de cores estritamente por tokens/variáveis CSS (DL-01 compliance)
  const resolvedColor =
    color ||
    (trend === "up"
      ? "var(--color-success, oklch(0.5 0.13 150))"
      : trend === "down"
        ? "var(--color-destructive, oklch(0.55 0.19 25))"
        : "var(--primary, oklch(0.52 0.13 240))");

  const width = 120;
  const paddingY = 4;
  const effectiveHeight = height;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max === min ? 1 : max - min;

  // Mapeia coordenadas normalizadas
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y =
      effectiveHeight -
      paddingY -
      ((val - min) / range) * (effectiveHeight - paddingY * 2);
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  // Gera curva Bezier cúbica suave contínua
  let pathD = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = Number(((p0.x + p1.x) / 2).toFixed(1));
    pathD += ` C ${midX},${p0.y} ${midX},${p1.y} ${p1.x},${p1.y}`;
  }

  // Fecha o caminho até o fundo para preenchimento de gradiente translúcido
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaD = `${pathD} L ${lastPoint.x},${effectiveHeight} L ${firstPoint.x},${effectiveHeight} Z`;

  return (
    <div className={cn("w-full h-9 overflow-hidden flex items-center", className)}>
      <svg
        viewBox={`0 0 ${width} ${effectiveHeight}`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
        role="img"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={resolvedColor} stopOpacity={0.24} />
            <stop offset="100%" stopColor={resolvedColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Preenchimento Translúcido Belasis */}
        <path d={areaD} fill={`url(#${gradientId})`} />

        {/* Linha de Traçado Suave */}
        <path
          d={pathD}
          fill="none"
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
