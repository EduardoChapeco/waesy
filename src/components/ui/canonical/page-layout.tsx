import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CanonicalPageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
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
 * P2: CanonicalPage — Estrutura de topo para qualquer página canônica
 */
export const CanonicalPage = React.forwardRef<HTMLDivElement, CanonicalPageProps>(
  ({ className, maxWidth = 'xl', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full min-h-screen bg-background text-foreground flex flex-col',
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
 * P2: CanonicalSection — Seção semântica com espaçamento modular de 4px/8px
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
 * P2: CanonicalBottomBar — Barra de ação fixa inferior para mobile e desktop
 */
export interface CanonicalBottomBarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CanonicalBottomBar = React.forwardRef<HTMLDivElement, CanonicalBottomBarProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'sticky bottom-0 z-40 w-full bg-card/95 backdrop-blur-md border-t border-border p-4 shadow-lg flex items-center justify-between gap-4',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CanonicalBottomBar.displayName = 'CanonicalBottomBar';
