import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CanonicalFieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

/**
 * P3: CanonicalFieldGroup — Agrupamento lógico de campos de formulário
 */
export const CanonicalFieldGroup = React.forwardRef<HTMLDivElement, CanonicalFieldGroupProps>(
  ({ className, title, description, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('w-full rounded-xl border border-border bg-card p-4 md:p-6 space-y-4', className)}
        {...props}
      >
        {(title || description) && (
          <div className="space-y-1 pb-2 border-b border-border/50">
            {title && <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        )}
        <div className="space-y-4">{children}</div>
      </div>
    );
  }
);
CanonicalFieldGroup.displayName = 'CanonicalFieldGroup';

/**
 * P3: CanonicalFormRow — Linha com 2 ou 3 colunas para distribuição de inputs
 */
export interface CanonicalFormRowProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 2 | 3;
}

export const CanonicalFormRow = React.forwardRef<HTMLDivElement, CanonicalFormRowProps>(
  ({ className, columns = 2, children, ...props }, ref) => {
    const gridCols = columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';
    return (
      <div
        ref={ref}
        className={cn('w-full grid grid-cols-1 gap-4 items-start', gridCols, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CanonicalFormRow.displayName = 'CanonicalFormRow';

/**
 * P3: CanonicalField — Campo atômico com Label, Hint, Erro e Suporte a Touch Target >= 44px
 */
export interface CanonicalFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  htmlFor?: string;
}

export const CanonicalField = React.forwardRef<HTMLDivElement, CanonicalFieldProps>(
  ({ className, label, required, hint, error, htmlFor, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('w-full space-y-1.5', className)} {...props}>
        <div className="flex items-center justify-between">
          <label
            htmlFor={htmlFor}
            className="text-xs font-medium text-foreground tracking-wide flex items-center gap-1"
          >
            {label}
            {required && <span className="text-destructive font-semibold">*</span>}
          </label>
        </div>

        <div className="relative">{children}</div>

        {hint && (!error) && <p className="text-xs text-muted-foreground">{hint}</p>}
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </div>
    );
  }
);
CanonicalField.displayName = 'CanonicalField';
