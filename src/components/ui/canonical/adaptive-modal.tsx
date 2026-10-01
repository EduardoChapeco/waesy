import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWindowSizeClass } from '@/hooks/use-mobile';

export interface AdaptiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footerAction?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const MAX_WIDTH_CLASSES: Record<string, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
};

/**
 * P5 / G31: AdaptiveModal — Dialog no Desktop / Bottom Sheet no Mobile
 * 
 * Regra: Respiro e touch no mobile, densidade no desktop, com foco WCAG e tokens canônicos.
 */
export function AdaptiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footerAction,
  maxWidth = 'md',
}: AdaptiveModalProps) {
  const { isCompact } = useWindowSizeClass();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs transition-opacity" />
        <DialogPrimitive.Content
          className={cn(
            'fixed z-50 bg-card text-foreground border border-border duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            isCompact
              ? 'inset-x-0 bottom-0 rounded-t-lg border-b-0 p-4 max-h-full overflow-y-auto'
              : cn('left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full rounded-lg p-6', MAX_WIDTH_CLASSES[maxWidth])
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-border/50">
            <div className="space-y-1">
              <DialogPrimitive.Title className="text-base font-semibold tracking-tight text-foreground">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-xs text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>

            <DialogPrimitive.Close aria-label="Fechar" className="h-11 w-11 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="py-4 space-y-4">{children}</div>

          {/* Footer */}
          {footerAction && (
            <div className="pt-3 border-t border-border/50 flex items-center justify-end gap-3">
              {footerAction}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
