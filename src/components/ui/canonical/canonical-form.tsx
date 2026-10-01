import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, WarningCircle, CircleNotch } from '@phosphor-icons/react';

export interface CanonicalFieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

/**
 * P3 / R11: CanonicalFieldGroup — Agrupamento lógico de campos de formulário
 */
export const CanonicalFieldGroup = React.forwardRef<HTMLDivElement, CanonicalFieldGroupProps>(
  ({ className, title, description, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('w-full rounded-lg border border-border bg-card p-4 md:p-6 space-y-4', className)}
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
 * P3 / R11: CanonicalFormRow — Linha com 2 ou 3 colunas para distribuição de inputs
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
 * R11: CanonicalFieldError — Primitiva acessível de erro com papel de alerta
 */
export interface CanonicalFieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  message?: string;
}

export const CanonicalFieldError = React.forwardRef<HTMLParagraphElement, CanonicalFieldErrorProps>(
  ({ className, message, children, ...props }, ref) => {
    const text = message || children;
    if (!text) return null;

    return (
      <p
        ref={ref}
        role="alert"
        className={cn('text-xs font-medium text-destructive flex items-center gap-1', className)}
        {...props}
      >
        <WarningCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{text}</span>
      </p>
    );
  }
);
CanonicalFieldError.displayName = 'CanonicalFieldError';

/**
 * P3 / R11: CanonicalField — Campo atômico com Label, Hint, Erro e Suporte a Touch Target >= 44px
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
      <div ref={ref} className={cn('w-full space-y-2', className)} {...props}>
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
        {error && <CanonicalFieldError message={error} />}
      </div>
    );
  }
);
CanonicalField.displayName = 'CanonicalField';

/**
 * R11: CanonicalFieldMatrix — Tabela/Matriz densa de edição tabular de campos
 */
export interface CanonicalFieldMatrixProps extends React.HTMLAttributes<HTMLDivElement> {
  headers: string[];
  children: React.ReactNode;
}

export const CanonicalFieldMatrix = React.forwardRef<HTMLDivElement, CanonicalFieldMatrixProps>(
  ({ className, headers, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('w-full overflow-hidden border border-border rounded-lg bg-card', className)}
        {...props}
      >
        <div className="table-container overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-muted/50 border-b border-border text-xs uppercase font-medium text-muted-foreground">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 font-semibold tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {children}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);
CanonicalFieldMatrix.displayName = 'CanonicalFieldMatrix';

/**
 * R11: CanonicalFormFooter — Barra fixa de rodapé com indicador de autosave e ação primária única
 */
export interface CanonicalFormFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  autosaveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt?: Date | null;
  onSave?: () => void;
  onDiscard?: () => void;
  saveLabel?: string;
  discardLabel?: string;
  isSubmitting?: boolean;
}

export const CanonicalFormFooter = React.forwardRef<HTMLDivElement, CanonicalFormFooterProps>(
  (
    {
      className,
      autosaveStatus = 'idle',
      lastSavedAt,
      onSave,
      onDiscard,
      saveLabel = 'Salvar Alterações',
      discardLabel = 'Descartar',
      isSubmitting = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full min-h-16 border-t border-border bg-card/95 backdrop-blur-md px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4',
          className
        )}
        {...props}
      >
        {/* Indicador de Autosave */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {autosaveStatus === 'saving' && (
            <span className="flex items-center gap-2 text-primary">
              <CircleNotch className="w-4 h-4 animate-spin motion-reduce:animate-none" />
              Salvando alterações...
            </span>
          )}
          {autosaveStatus === 'saved' && (
            <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              {lastSavedAt ? `Salvo às ${lastSavedAt.toLocaleTimeString()}` : 'Salvo na nuvem'}
            </span>
          )}
          {autosaveStatus === 'error' && (
            <span className="flex items-center gap-2 text-destructive font-medium">
              <WarningCircle className="w-4 h-4" />
              Falha ao salvar rascunho
            </span>
          )}
          {autosaveStatus === 'idle' && lastSavedAt && (
            <span>Última alteração às {lastSavedAt.toLocaleTimeString()}</span>
          )}
        </div>

        {/* Grupo de Ações (Exatamente UMA primária) */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {children}
          {onDiscard && (
            <button /* focus-visible: */
              type="button"
              onClick={onDiscard} /* focus-visible:ring-2 */
              className="h-11 px-4 text-xs font-medium rounded-lg text-muted-foreground hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {discardLabel}
            </button>
          )}
          {onSave && (
            <button /* focus-visible: */
              type="button"
              onClick={onSave} /* focus-visible:ring-2 */
              disabled={isSubmitting}
              className="h-11 px-6 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {isSubmitting ? 'Salvando...' : saveLabel}
            </button>
          )}
        </div>
      </div>
    );
  }
);
CanonicalFormFooter.displayName = 'CanonicalFormFooter';
