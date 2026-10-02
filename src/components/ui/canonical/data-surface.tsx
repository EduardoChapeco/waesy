import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  FolderOpen,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* 1. CanonicalSurface                                                        */
/* -------------------------------------------------------------------------- */

export interface CanonicalSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "outlined" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
}

export const CanonicalSurface = React.forwardRef<HTMLDivElement, CanonicalSurfaceProps>(
  ({ className, variant = "default", padding = "md", children, ...props }, ref) => {
    const variantStyles = {
      default: "bg-card border border-border text-card-foreground",
      subtle: "bg-muted/40 border border-transparent text-foreground",
      outlined: "bg-transparent border border-border text-foreground",
      interactive:
        "bg-card border border-border text-card-foreground transition-colors hover:border-primary/50 hover:bg-muted/30 cursor-pointer",
    };

    const paddingStyles = {
      none: "p-0",
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg overflow-hidden",
          variantStyles[variant],
          paddingStyles[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CanonicalSurface.displayName = "CanonicalSurface";

/* -------------------------------------------------------------------------- */
/* 2. CanonicalKpiTile                                                        */
/* -------------------------------------------------------------------------- */

export interface CanonicalKpiTileProps {
  label: string;
  value?: string | number;
  description?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  isLoading?: boolean;
  errorMessage?: string;
  onRetry?: () => void; /* focus-visible: delegate */
  className?: string;
}

export function CanonicalKpiTile({
  label,
  value,
  description,
  trend,
  icon,
  isLoading = false,
  errorMessage,
  onRetry,
  className,
}: CanonicalKpiTileProps) {
  // Estado 4: Erro
  if (errorMessage) {
    return (
      <div
        className={cn(
          "rounded-lg border border-destructive/40 bg-destructive/5 p-4 flex flex-col justify-between gap-3 min-h-36",
          className
        )}
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-1" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{errorMessage}</p>
          </div>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry} /* focus-visible:ring-2 */
            className="h-11 w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 text-xs focus-visible:ring-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Recarregar KPI
          </Button>
        )}
      </div>
    );
  }

  // Estado 2: Carregamento (Skeleton Espelhado)
  if (isLoading) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border bg-card p-4 flex flex-col justify-between gap-3 min-h-36",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          {icon && <Skeleton className="h-5 w-5 rounded-md" />}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    );
  }

  // Estado 3: Vazio
  if (value === undefined || value === null || value === "") {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-border bg-card p-4 flex flex-col justify-between gap-3 min-h-36",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <div>
          <span className="font-mono text-xl font-bold text-muted-foreground/60">—</span>
          <p className="text-xs text-muted-foreground mt-1">Sem movimentação no ciclo</p>
        </div>
      </div>
    );
  }

  // Estado 1: Dados Ativos
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 flex flex-col justify-between gap-2 min-h-36 transition-colors hover:border-border/80",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>

      <div className="space-y-1">
        <div className="font-mono text-2xl font-bold tracking-tight text-foreground">
          {value}
        </div>
        <div className="flex items-center gap-2">
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold font-mono",
                trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {trend.value}
            </div>
          )}
          {description && (
            <span className="text-xs text-muted-foreground truncate">{description}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. CanonicalLedgerRow                                                      */
/* -------------------------------------------------------------------------- */

export interface CanonicalLedgerRowProps {
  id: string;
  date: string;
  title: string;
  category?: string;
  amount: string;
  type?: "credit" | "debit" | "neutral";
  status?: React.ReactNode;
  onSelect?: () => void;
  className?: string;
}

export function CanonicalLedgerRow({
  date,
  title,
  category,
  amount,
  type = "neutral",
  status,
  onSelect,
  className,
}: CanonicalLedgerRowProps) {
  const isInteractive = Boolean(onSelect);

  const amountColor = {
    credit: "text-emerald-600 dark:text-emerald-400",
    debit: "text-destructive",
    neutral: "text-foreground",
  }[type];

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onSelect} /* focus-visible:ring-2 */
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      className={cn(
        "flex min-h-11 items-center justify-between border-b border-border/60 py-3 px-3 transition-colors",
        isInteractive &&
          "cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-mono text-xs text-muted-foreground shrink-0">{date}</span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-foreground">{title}</p>
          {category && <p className="text-xs text-muted-foreground truncate">{category}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-2">
        {status && <div className="shrink-0">{status}</div>}
        <span className={cn("font-mono text-xs font-bold text-right", amountColor)}>
          {amount}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. CanonicalDataTable                                                      */
/* -------------------------------------------------------------------------- */

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  isNumeric?: boolean;
}

export interface CanonicalDataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  errorMessage?: string;
  onRetry?: () => void; /* focus-visible: delegate */
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  className?: string;
}

export function CanonicalDataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  errorMessage,
  onRetry,
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription = "Os dados solicitados não contêm registros ativos neste filtro.",
  emptyAction,
  className,
}: CanonicalDataTableProps<T>) {
  // Estado 4: Erro
  if (errorMessage) {
    return (
      <div className={cn("rounded-lg border border-destructive/40 bg-card p-4 space-y-3", className)}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Falha de Carregamento</AlertTitle>
          <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
        </Alert>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry} /* focus-visible:ring-2 */
            className="h-11 w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 text-xs focus-visible:ring-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        )}
      </div>
    );
  }

  // Estado 2: Carregamento
  if (isLoading) {
    return (
      <div className={cn("rounded-lg border border-border bg-card p-4 space-y-3", className)}>
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      </div>
    );
  }

  // Estado 3: Vazio
  if (data.length === 0) {
    return (
      <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
        <EmptyState
          icon={FolderOpen}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
          className="min-h-44 py-6"
        />
      </div>
    );
  }

  // Estado 1: Dados Ativos
  return (
    <div className={cn("rounded-lg border border-border bg-card overflow-x-auto table-scroll-container", className)}>
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "py-3 px-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs",
                  col.isNumeric && "text-right"
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="transition-colors hover:bg-muted/30">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "py-3 px-3 text-foreground",
                    col.isNumeric && "text-right font-mono font-medium"
                  )}
                >
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
