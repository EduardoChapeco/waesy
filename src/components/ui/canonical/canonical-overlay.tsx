import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X, AlertTriangle } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* 1. CanonicalDrawer                                                         */
/* -------------------------------------------------------------------------- */

export interface CanonicalDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  side?: "right" | "bottom";
  children: React.ReactNode;
  footerAction?: React.ReactNode;
  className?: string;
}

export function CanonicalDrawer({
  open,
  onOpenChange,
  title,
  description,
  side = "right",
  children,
  footerAction,
  className,
}: CanonicalDrawerProps) {
  const sideClasses =
    side === "bottom"
      ? "inset-x-0 bottom-0 rounded-t-lg border-t border-border max-h-screen overflow-y-auto"
      : "inset-y-0 right-0 h-full w-full max-w-md border-l border-border rounded-l-lg";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs transition-opacity" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 bg-card text-foreground shadow-2xl dialog-content duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none flex flex-col justify-between",
            sideClasses,
            className
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 p-4 md:p-6 border-b border-border">
            <div className="space-y-1">
              <DialogPrimitive.Title className="text-base font-semibold text-foreground tracking-tight">
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
          <div className="p-4 md:p-6 flex-1 overflow-y-auto">{children}</div>

          {/* Footer */}
          {footerAction && (
            <div className="p-4 md:p-6 border-t border-border bg-muted/20 flex items-center justify-end gap-3">
              {footerAction}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. CanonicalConfirmDialog (Apenas para ações críticas irreversíveis)      */
/* -------------------------------------------------------------------------- */

export interface CanonicalConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void; /* focus-visible: delegate */
  isLoading?: boolean;
  isDestructive?: boolean;
}

export function CanonicalConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar Exclusão",
  cancelLabel = "Cancelar",
  onConfirm,
  isLoading = false,
  isDestructive = true,
}: CanonicalConfirmDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs transition-opacity" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-2xl dialog-content duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <div className="flex justify-end gap-3 pt-2">
                <Skeleton className="h-11 w-24 rounded-md" />
                <Skeleton className="h-11 w-32 rounded-md" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                {isDestructive && (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                )}
                <div className="space-y-1">
                  <DialogPrimitive.Title className="text-base font-semibold text-foreground tracking-tight">
                    {title}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="text-xs text-muted-foreground leading-relaxed">
                    {description}
                  </DialogPrimitive.Description>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)} /* focus-visible:ring-2 */
                  className="h-11 px-4 text-xs focus-visible:ring-2"
                >
                  {cancelLabel}
                </Button>
                <Button
                  type="button"
                  variant={isDestructive ? "destructive" : "default"}
                  size="sm"
                  onClick={onConfirm} /* focus-visible:ring-2 */
                  className="h-11 px-5 text-xs font-semibold focus-visible:ring-2"
                >
                  {confirmLabel}
                </Button>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
