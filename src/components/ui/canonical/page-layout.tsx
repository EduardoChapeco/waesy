import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CanonicalPageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  hasBottomBar?: boolean;
}

const MAX_WIDTH_CLASSES: Record<string, string> = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

/**
 * P2 / R10: CanonicalPage — Estrutura de topo para qualquer página canônica
 */
export const CanonicalPage = React.forwardRef<HTMLDivElement, CanonicalPageProps>(
  ({ className, maxWidth = 'xl', hasBottomBar = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full min-h-screen bg-background text-foreground flex flex-col',
          hasBottomBar && 'pb-20',
          className
        )}
        {...props}
      >
        <div className={cn('w-full mx-auto px-4 md:px-6 py-4 flex-1 flex flex-col', MAX_WIDTH_CLASSES[maxWidth])}>
          {children}
        </div>
      </div>
    );
  }
);
CanonicalPage.displayName = 'CanonicalPage';

/**
 * R10: CanonicalShell — Container de aplicação com Header, Rail/Sidebar e Área de Conteúdo
 */
export interface CanonicalShellProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  rail?: React.ReactNode;
  bottomBar?: React.ReactNode;
  children: React.ReactNode;
}

export const CanonicalShell = React.forwardRef<HTMLDivElement, CanonicalShellProps>(
  ({ className, header, rail, bottomBar, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('min-h-screen w-full bg-background text-foreground flex flex-col', className)}
        {...props}
      >
        {header && <header className="w-full border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">{header}</header>}
        <div className="flex-1 flex w-full">
          {rail && <aside className="hidden lg:block shrink-0 border-r border-border bg-card/50">{rail}</aside>}
          <main className={cn('flex-1 w-full', bottomBar && 'pb-20')}>{children}</main>
        </div>
        {bottomBar && <div className="sticky bottom-0 z-40 w-full">{bottomBar}</div>}
      </div>
    );
  }
);
CanonicalShell.displayName = 'CanonicalShell';

/**
 * P2 / R10: CanonicalSection — Seção semântica com espaçamento modular de 4px/8px
 */
export interface CanonicalSectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export const CanonicalSection = React.forwardRef<HTMLElement, CanonicalSectionProps>(
  ({ className, title, description, action, children, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn('w-full py-4 border-b border-border last:border-b-0 space-y-4', className)}
        {...props}
      >
        {(title || action) && (
          <div className="flex items-center justify-between gap-4">
            <div>
              {title && <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}
        {children}
      </section>
    );
  }
);
CanonicalSection.displayName = 'CanonicalSection';

/**
 * R10: CanonicalStack — Pilha flexível com espaçamento modular estrito (4px grid)
 */
export interface CanonicalStackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'vertical' | 'horizontal';
  spacing?: 2 | 3 | 4 | 6 | 8;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between';
}

const SPACING_MAP: Record<number, string> = {
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
};

export const CanonicalStack = React.forwardRef<HTMLDivElement, CanonicalStackProps>(
  ({ className, direction = 'vertical', spacing = 4, align = 'stretch', justify = 'start', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          direction === 'vertical' ? 'flex-col' : 'flex-row items-center',
          SPACING_MAP[spacing],
          align === 'center' && 'items-center',
          align === 'start' && 'items-start',
          align === 'end' && 'items-end',
          justify === 'between' && 'justify-between',
          justify === 'center' && 'justify-center',
          justify === 'end' && 'justify-end',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CanonicalStack.displayName = 'CanonicalStack';

/**
 * R10: CanonicalGrid — Grade responsiva protegida contra DL-29
 */
export interface CanonicalGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3 | 4 | 6;
  gap?: 2 | 4 | 6 | 8;
}

const GRID_COLS_MAP: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
};

export const CanonicalGrid = React.forwardRef<HTMLDivElement, CanonicalGridProps>(
  ({ className, columns = 3, gap = 4, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('w-full grid', GRID_COLS_MAP[columns], SPACING_MAP[gap], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CanonicalGrid.displayName = 'CanonicalGrid';

/**
 * R10: CanonicalToolbar — Barra de comandos e filtros com alvos de toque >= 44px
 */
export interface CanonicalToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
}

export const CanonicalToolbar = React.forwardRef<HTMLDivElement, CanonicalToolbarProps>(
  ({ className, search, filters, actions, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full min-h-11 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-2 bg-muted/40 rounded-lg border border-border',
          className
        )}
        {...props}
      >
        <div className="flex flex-1 items-center gap-2">
          {search && <div className="flex-1 max-w-sm">{search}</div>}
          {filters && <div className="flex items-center gap-2">{filters}</div>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    );
  }
);
CanonicalToolbar.displayName = 'CanonicalToolbar';

/**
 * R10: CanonicalRail — Trilho lateral compacto para navegação desktop
 */
export interface CanonicalRailItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  onSelect?: () => void;
}

export interface CanonicalRailProps extends React.HTMLAttributes<HTMLElement> {
  items: CanonicalRailItem[];
}

export const CanonicalRail = React.forwardRef<HTMLElement, CanonicalRailProps>(
  ({ className, items, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn('w-16 h-full py-4 flex flex-col items-center gap-3', className)}
        aria-label="Navegação secundária"
        {...props}
      >
        {items.map((item) => (
          <button /* focus-visible: */
            key={item.id}
            type="button"
            onClick={item.onSelect} /* focus-visible:ring-2 */
            title={item.label}
            className={cn(
              'h-11 w-11 rounded-lg flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              item.active
                ? 'bg-primary text-primary-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
          >
            {item.icon}
          </button>
        ))}
      </nav>
    );
  }
);
CanonicalRail.displayName = 'CanonicalRail';

/**
 * P2: CanonicalSplit — Layout responsivo de 2 colunas (Editor + Preview Real P4)
 */
export interface CanonicalSplitProps extends React.HTMLAttributes<HTMLDivElement> {
  leftPane: React.ReactNode;
  rightPane: React.ReactNode;
  ratio?: '50-50' | '60-40' | '70-30';
}

export const CanonicalSplit = React.forwardRef<HTMLDivElement, CanonicalSplitProps>(
  ({ className, leftPane, rightPane, ratio = '60-40', ...props }, ref) => {
    const leftWidth = ratio === '70-30' ? 'lg:w-8/12' : ratio === '60-40' ? 'lg:w-7/12' : 'lg:w-1/2';
    const rightWidth = ratio === '70-30' ? 'lg:w-4/12' : ratio === '60-40' ? 'lg:w-5/12' : 'lg:w-1/2';

    return (
      <div
        ref={ref}
        className={cn('w-full flex flex-col lg:flex-row gap-6 items-start', className)}
        {...props}
      >
        <div className={cn('w-full space-y-6', leftWidth)}>{leftPane}</div>
        <div className={cn('w-full space-y-6 sticky top-4', rightWidth)}>{rightPane}</div>
      </div>
    );
  }
);
CanonicalSplit.displayName = 'CanonicalSplit';

/**
 * P2 / R10: CanonicalBottomBarContainer — Barra de ação fixa inferior para mobile e desktop
 */
export interface CanonicalBottomBarContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CanonicalBottomBarContainer = React.forwardRef<HTMLDivElement, CanonicalBottomBarContainerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'sticky bottom-0 z-40 w-full bg-card/95 backdrop-blur-md border-t border-border p-4 flex items-center justify-between gap-4',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CanonicalBottomBarContainer.displayName = 'CanonicalBottomBarContainer';
