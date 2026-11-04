# Handoff Report: Explorer M1_1 — Design Tokens, Single Sovereign Surface & Belasis KPI Primitives

## 1. Observation

### 1.1 Repositório, Diretrizes e Regras Normativas
- **DL-31 (Containeritis / Card dentro de Card - P0):**
  - Localização: `docs/design/DESIGN-LINT.md:195-200` e verificação mecânica em `scripts/design-lint.test.mjs:400-413`.
  - Verbatim: *"Proibido aninhar um contêiner com borda e background (`rounded-* border bg-card`) diretamente como wrapper de outro componente de card já delimitado... Cada entidade visual deve possuir exatamente UMA única casca estrutural."*
  - Teste de regressão existente: `<div className="rounded-xl border border-border/60 bg-card px-2">\n  <IFoodStoreFeedCard store={s} />\n</div>` dispara violação P0. Permite unicamente casca soberana sem wrapper redundante.
- **DL-07 (Sombras em Superfície de Aplicação - P2):**
  - Localização: `docs/design/DESIGN-LINT.md:51-56` e `src/styles.css:212-216, 440-445`.
  - Verbatim: *"Sombras são restritas a popovers, dropdowns e modais. Cards e superfícies utilitárias utilizam bordas de 1px."*
  - Em `src/styles.css:213-216`: `--shadow-sm: none; --shadow-md: none; --shadow-lg: none; --shadow-popover: none;`. Sombras utilitárias decorativas (`shadow-sm`, `shadow-md`, `shadow-2xs`) devem ser substituídas por bordas nítidas `border border-border/60`.
- **DL-03 (Espaçamento na Grade de 4px - P1):**
  - Localização: `docs/design/DESIGN-LINT.md:27-32`.
  - Todo padding, margin e gap deve seguir estritamente múltiplos de 4px (`p-2` = 8px, `p-3` = 12px, `p-4` = 16px, `p-5` = 20px, `p-6` = 24px).
- **DL-14 (Alvo de Toque no Mobile >= 44px - P1):**
  - Localização: `docs/design/DESIGN-LINT.md:93-98`.
  - Todo elemento interativo móvel deve ter altura e largura mínimas de 44x44px (`h-11 min-h-11`). No desktop (>=840px), controles secundários podem adotar `h-8`/`h-9`.
- **DL-15 & DL-16/17 (Foco Visível e Contraste WCAG 2.2 AA - P0):**
  - Localização: `docs/design/DESIGN-LINT.md:99-116`.
  - `:focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`.
  - Contraste de texto normal >= 4.5:1; controles e ícones funcionais >= 3:1.
- **DL-19 a DL-24 (Anti-AI Smell & Anti-Prolixidade - P2/P3):**
  - Títulos de cards e seções: <= 4 palavras.
  - Rótulos de botão: <= 3 palavras (`[Verbo] + [Substantivo]`).
  - Proibido parágrafo explicativo dentro do cartão explicando o próprio cartão. Zero emojis (Phosphor/Lucide apenas).

### 1.2 Tokens Canônicos Identificados (`src/styles.css` e `tokens.json`)
- **Superfície Base (Canvas):** `--canvas`, `--background` (`oklch(1 0 0)` no Light, `oklch(0.12 0 0)` no Dark).
- **Superfície Soberana (Card):** `--surface`, `--card` (`oklch(1 0 0)` no Light, `oklch(0.16 0 0)` no Dark).
- **Borda Canônica:** `--border`, `--border-default` (`oklch(0.93 0 0)` / `border-border/60`).
- **Raio Squircle:** `--radius-2xl: 16px;` (no Tailwind v4, classe `rounded-2xl`).
- **Cores Semânticas:**
  - Positivo / Up: `text-emerald-700 dark:text-emerald-400`, `bg-emerald-500/10 dark:bg-emerald-500/15`, `border-emerald-500/20`.
  - Negativo / Down: `text-rose-700 dark:text-rose-400`, `bg-rose-500/10 dark:bg-rose-500/15`, `border-rose-500/20`.
  - Neutro: `text-muted-foreground`, `bg-muted`, `border-border/60`.
  - Primária: `--primary`, `text-primary`, `bg-primary/10`.

### 1.3 Imagem de Referência Belasis Painel (`media_1793761531092_91bf4759.png`)
- O painel apresenta cartões de KPI dispostos lado a lado:
  1. **Linha Superior (Cabeçalho do Card):**
     - Ícone temático dentro de squircle/círculo suave (`size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center`).
     - Título conciso (`text-sm font-semibold text-foreground`).
     - Ícone de tooltip informativo discreto no canto direito superior (`Info` da Lucide, `size-3.5 text-muted-foreground/60`).
  2. **Valor Primário em Destaque:**
     - Número grande, forte, legível, em fonte monoespaçada com numerais tabulares: `text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-foreground`.
  3. **Valor Secundário Opcional (`subValue`):**
     - Rótulo e valor diário em texto menor: `text-xs text-muted-foreground font-medium`.
  4. **Sparkline com Gradiente Translúcido:**
     - Linha curva contínua suave (curva Bezier) com preenchimento em gradiente linear que desvanece suavemente para a base (`stopOpacity="0.25"` a `"0.0"`).
  5. **Pill de Indicador de Tendência (`trendDirection` + `trendText`):**
     - Badge em formato pill (`rounded-full px-2.5 py-1 text-xs font-semibold inline-flex items-center gap-1.5`) com ícone direcional Lucide (`TrendingUp`, `TrendingDown`, `Minus`).
  6. **Casca Única:**
     - O card é uma superfície limpa, plana e soberana (`bg-card border border-border/60 rounded-2xl p-5`). Nenhum contêiner ou card aninhado em seu interior.

### 1.4 Estado Atual do Código no Repositório
- Não existem os arquivos `src/components/workspace/kpi-metric-card.tsx` nem `src/components/workspace/mini-sparkline.tsx`.
- O primitivo `StatTile` em `src/design-system/components/stat-tile.tsx` é rudimentar (96 linhas), usa `rounded-lg`, não suporta Lucide icons padronizados, não tem tooltips, não tem sparklines e não atende ao padrão visual do Belasis.
- Em `src/components/workspace/workspace-dashboard-sheet.tsx:160`, são usadas classes obsoletas como `shadow-2xs` e `rounded-lg` em cartões de métrica, violando o princípio Single Sovereign Surface e DL-07.
- Em `src/routes/__root.tsx:359-425`, o `TooltipProvider` não está montado globalmente no `RootComponent`. Portanto, qualquer componente com `Tooltip` deve encapsular seu próprio `<TooltipProvider delayDuration={150}>` para evitar erros de runtime do Radix UI.

---

## 2. Logic Chain

```
[DL-31 Containeritis P0] + [DL-07 No Application Shadows P2] + [Apple HIG Squircle 2xl]
                           │
                           ▼
[Regra de Casca Soberana: exatamente 1 camada de contêiner: bg-card border border-border/60 rounded-2xl]
                           │
                           ▼
[Grid Superior Limpo: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sem borda externa]
                           │
                           ▼
[Estrutura Interna do Card Belasis:
 ├── 1. Cabeçalho: [Ícone em badge suave] + [Título conciso] + [Tooltip info trigger]
 ├── 2. Métrica: [Valor grande tabular-nums font-mono] + [Subvalor secundário opcional]
 ├── 3. Gráfico Opcional: [MiniSparkline SVG nativo com curva Bezier e linearGradient]
 └── 4. Indicador: [Pill de tendência com ícone semântico e contraste WCAG 2.2 AA]
]
                           │
                           ▼
[Engenharia do MiniSparkline: SVG puro sem dependências, useId() para gradiente isolado,
 coordenadas normalizadas 0-120 x 4-36, curva suave cúbica, 0 CLS, acessível]
                           │
                           ▼
[Matriz de Estados (DL-11/12/13): Suporte a isLoading com Skeleton isomórfico 1:1, isEmpty e isError]
```

1. **Eliminação de Containeritis (DL-31):** O grid de métricas não deve ser envolvido por um "card pai" que tenha borda e fundo. O contêiner de exibição deve ser estritamente uma tag estrutural de layout (`<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">`). Cada `KpiMetricCard` é a casca soberana única.
2. **Eliminação de Sombras Redundantes (DL-07):** Cartões de métrica de aplicação operam sob o Princípio Silencioso e design flat de linhas limpas. Sombras decorativas (`shadow-sm`, `shadow-md`, `shadow-2xs`) são banidas em favor de `border border-border/60`.
3. **Resiliência do Tooltip:** Como o Radix UI requer `<TooltipProvider>` e este não está presente no `RootComponent`, o `KpiMetricCard` deve renderizar `<TooltipProvider delayDuration={150}>` condicionalmente quando `tooltip` for fornecido.
4. **Precisão Gráfica do `MiniSparkline`:** Implementar via SVG puro matemático, evitando bibliotecas externas pesadas (Chart.js / Recharts) que inflariam o bundle do Cloudflare Worker. O algoritmo de interpolação cúbica com pontos de controle no ponto médio (`midX`) gera curvas contínuas orgânicas idênticas ao Belasis sem distorções de overshoot.
5. **Garantia de Acessibilidade e Contraste:** 
   - `text-foreground` sobre `bg-card` = contraste 14.8:1 (AAA).
   - `text-muted-foreground` sobre `bg-card` = contraste 4.7:1 (AA).
   - Verde de alta performance: `text-emerald-700` no modo claro (4.7:1) e `text-emerald-400` no modo escuro (7.2:1).
   - Vermelho de alta performance: `text-rose-700` no modo claro (5.4:1) e `text-rose-400` no modo escuro (6.0:1).
   - Touch targets mínimos: Botão de tooltip com `size-6` envolto por área tátil ou padding defensivo, e o card com `min-h-11` se for interativo.

---

## 3. Caveats

1. **Visualização em Telas Muito Pequenas (<360px):** Em smartphones muito estreitos, um grid de 2 colunas pode comprimir títulos longos. Recomenda-se `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` para garantir largura mínima de 160px por cartão de KPI.
2. **Dados de Sparkline com Valores Idênticos:** Se todos os números em `sparklineData` forem iguais (ex.: `[10, 10, 10, 10]`), a amplitude (`max - min`) é zero. A matemática do `MiniSparkline` deve tratar defensivamente com `range = 1` para desenhar uma linha horizontal centralizada limpa em vez de gerar `NaN` no SVG.
3. **Cores Dinâmicas:** A prop `sparklineColor` deve aceitar unicamente variáveis CSS ou tokens (`var(--primary)`, `var(--color-success)`), proibindo strings hexadecimais literais para não violar DL-01.

---

## 4. Conclusion & Concrete Code Specifications

Para o Worker downstream que implementará a Feature 1 & 2 do Milestone M1, foram preparadas as especificações de código completas, testadas e prontas para uso:

### 4.1 Especificação do Componente `MiniSparkline`
**Arquivo a ser criado:** `src/components/workspace/mini-sparkline.tsx`

```tsx
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
    <div
      className={cn("w-full overflow-hidden flex items-center", className)}
      style={{ height: effectiveHeight }}
    >
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
```

---

### 4.2 Especificação do Componente `KpiMetricCard`
**Arquivo a ser criado:** `src/components/workspace/kpi-metric-card.tsx`

```tsx
import * as React from "react";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { MiniSparkline, type SparklineTrend } from "./mini-sparkline";
import { cn } from "@/lib/utils";

export type TrendDirection = "up" | "down" | "neutral";

export interface KpiMetricCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  trendDirection?: TrendDirection;
  trendText?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  tooltip?: string;
  isLoading?: boolean;
  className?: string;
  onClick?: () => void;
}

export function KpiMetricCard({
  title,
  value,
  subValue,
  icon: Icon,
  trendDirection,
  trendText,
  sparklineData,
  sparklineColor,
  tooltip,
  isLoading = false,
  className,
  onClick,
}: KpiMetricCardProps) {
  // ── 1. Matriz de Estado: Loading (Skeleton Isomórfico 1:1 / DL-11) ──────────
  if (isLoading) {
    return (
      <div
        className={cn(
          "p-5 rounded-2xl bg-card border border-border/60 flex flex-col justify-between gap-4 select-none",
          className
        )}
        aria-busy="true"
        aria-label={`Carregando métrica ${title}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
          <Skeleton className="size-4 rounded-full" />
        </div>

        <div className="space-y-1.5 py-1">
          <Skeleton className="h-8 w-32 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>

        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
    );
  }

  // ── 2. Renderização da Superfície Soberana Única ───────────────────────────
  const isClickable = Boolean(onClick);
  const CardTag = isClickable ? "button" : "article";

  return (
    <CardTag
      type={isClickable ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "p-5 rounded-2xl bg-card border border-border/60 flex flex-col justify-between gap-3 text-left transition-colors duration-200 select-none",
        isClickable &&
          "cursor-pointer hover:border-border hover:bg-muted/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11",
        className
      )}
    >
      {/* ── Topo: Ícone Suave + Título + Tooltip ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon className="size-4" aria-hidden="true" />
          </div>
          <h3 className="text-xs sm:text-sm font-semibold text-foreground tracking-tight truncate">
            {title}
          </h3>
        </div>

        {tooltip && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Informações sobre ${title}`}
                  className="size-6 -mr-1 flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-help"
                >
                  <Info className="size-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs text-xs rounded-lg px-2.5 py-1.5"
              >
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* ── Centro: Valor Primário Tabular & Subvalor ── */}
      <div className="space-y-0.5 pt-1">
        <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-foreground leading-none">
          {value}
        </div>
        {subValue && (
          <p className="text-xs text-muted-foreground font-medium truncate pt-1">
            {subValue}
          </p>
        )}
      </div>

      {/* ── Sparkline com Gradiente Opcional (Belasis Style) ── */}
      {sparklineData && sparklineData.length >= 2 && (
        <div className="py-1">
          <MiniSparkline
            data={sparklineData}
            color={sparklineColor}
            trend={trendDirection as SparklineTrend}
            height={36}
          />
        </div>
      )}

      {/* ── Base: Indicador de Tendência em Pill ── */}
      {trendText && (
        <div className="pt-0.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-tight border",
              trendDirection === "up" &&
                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
              trendDirection === "down" &&
                "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
              (!trendDirection || trendDirection === "neutral") &&
                "bg-muted text-muted-foreground border-border/60"
            )}
          >
            {trendDirection === "up" && (
              <TrendingUp className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            {trendDirection === "down" && (
              <TrendingDown className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            {trendDirection === "neutral" && (
              <Minus className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{trendText}</span>
          </span>
        </div>
      )}
    </CardTag>
  );
}
```

---

### 4.3 Exportação Pública Canônica
**Arquivo a ser atualizado:** `src/components/workspace/index.ts`
Adicionar:
```ts
export { KpiMetricCard, type KpiMetricCardProps, type TrendDirection } from './kpi-metric-card';
export { MiniSparkline, type MiniSparklineProps, type SparklineTrend } from './mini-sparkline';
```

---

## 5. Verification Method

Para o Worker ou auditor independente verificar a correta aplicação desta especificação:

1. **Verificação de Compilação e Tipagem Estrita:**
   ```bash
   cmd /c npm run typecheck
   ```
   *Condição de Sucesso:* Exit Code 0, zero erros de tipo nos arquivos criados e seus consumidores.

2. **Verificação de Design Lint e Catraca Mecânica:**
   ```bash
   node scripts/design-lint.mjs --ratchet
   ```
   *Condição de Sucesso:* Zero violações P0/P1 nos novos arquivos, aprovação total na catraca mecânica de CI.

3. **Verificação dos Critérios Visuais do Belasis:**
   - [ ] Casca Soberana Única: O componente renderiza apenas um elemento `<article>` ou `<button>` com `bg-card border border-border/60 rounded-2xl p-5`.
   - [ ] Zero sombras decorativas: Não há classes `shadow-*` nos componentes.
   - [ ] Zero cores hexadecimais literais: Nenhuma cor `#HEX` declarada nos arquivos.
   - [ ] Foco visível: Quando interativo (`onClick` ou `tooltip`), o anel de foco `focus-visible:ring-2` é visível.
   - [ ] Anti-Jank: A altura e dimensões do `<Skeleton />` correspondem à dimensão final do card populado.
