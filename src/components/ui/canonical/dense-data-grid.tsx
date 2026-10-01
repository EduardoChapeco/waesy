import * as React from 'react';
import { cn } from '@/lib/utils';
import { useWindowSizeClass } from '@/hooks/use-mobile';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface ColumnDefinition<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DenseDataGridProps<T> {
  data: T[];
  columns: ColumnDefinition<T>[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (item: T) => void;
}

/**
 * P7 / G33: DenseDataGrid — Tabela de alta densidade no Desktop / Cards responsivos no Mobile
 * 
 * P9: Matriz de estados completa: dados, carregamento (skeleton), vazio (empty) e erro.
 */
export function DenseDataGrid<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  errorMessage,
  onRetry,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription = 'Tente ajustar os filtros ou cadastrar um novo item.',
  emptyAction,
  onRowClick,
}: DenseDataGridProps<T>) {
  const { isCompact } = useWindowSizeClass();

  // 1. Estado de Erro
  if (errorMessage) {
    return (
      <div className="w-full rounded-lg border border-destructive/30 bg-destructive/5 p-6 flex flex-col items-center justify-center text-center space-y-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Ocorreu uma falha ao carregar os dados</p>
          <p className="text-xs text-muted-foreground">{errorMessage}</p>
        </div>
        {onRetry && (
          <button type="button" onClick={onRetry} className="h-11 px-4 rounded-lg bg-card border border-border text-foreground text-xs font-medium flex items-center gap-2 hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </button>
        )}
      </div>
    );
  }

  // 2. Estado de Carregamento (Skeleton Paritário)
  if (isLoading) {
    return (
      <div className="w-full space-y-2">
        <div className="h-10 w-full rounded-lg bg-muted/60 animate-pulse motion-reduce:animate-none" />
        <div className="h-12 w-full rounded-lg bg-muted/40 animate-pulse motion-reduce:animate-none" />
        <div className="h-12 w-full rounded-lg bg-muted/30 animate-pulse motion-reduce:animate-none" />
        <div className="h-12 w-full rounded-lg bg-muted/20 animate-pulse motion-reduce:animate-none" />
      </div>
    );
  }

  // 3. Estado Vazio (Empty State)
  if (data.length === 0) {
    return (
      <div className="w-full rounded-lg border border-dashed border-border p-8 flex flex-col items-center justify-center text-center space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{emptyTitle}</h3>
          <p className="text-xs text-muted-foreground max-w-sm">{emptyDescription}</p>
        </div>
        {emptyAction && <div className="pt-2">{emptyAction}</div>}
      </div>
    );
  }

  // 4. Modo Mobile: Lista de Cards
  if (isCompact) {
    return (
      <div className="w-full space-y-3">
        {data.map((item) => {
          const key = keyExtractor(item);
          if (onRowClick) {
            return (
              <button key={key} type="button" onClick={() => onRowClick(item)} className="w-full text-left rounded-lg border border-border bg-card p-4 space-y-2 transition-colors cursor-pointer hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                {columns.map((col) => (
                  <div key={col.key} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-muted-foreground font-medium">{col.header}:</span>
                    <div className="text-foreground font-medium text-right">{col.render(item)}</div>
                  </div>
                ))}
              </button>
            );
          }

          return (
            <div key={key} className="w-full rounded-lg border border-border bg-card p-4 space-y-2">
              {columns.map((col) => (
                <div key={col.key} className="flex items-center justify-between text-xs gap-2">
                  <span className="text-muted-foreground font-medium">{col.header}:</span>
                  <div className="text-foreground font-medium text-right">{col.render(item)}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  // 5. Modo Desktop: Tabela Densa com Cabeçalho Fixo
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-left border-collapse text-xs">
        <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 font-medium',
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {data.map((item) => {
            const key = keyExtractor(item);
            return (
              <tr key={key} className="transition-colors hover:bg-muted/30">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-foreground',
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    )}
                  >
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
