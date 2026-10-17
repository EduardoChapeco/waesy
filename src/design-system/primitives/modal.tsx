import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, AlertTriangle, Search, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWindowSizeClass } from "@/hooks/use-mobile";

/* -------------------------------------------------------------------------- */
/* 1. Modal / Dialog                                                          */
/* -------------------------------------------------------------------------- */

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footerSlot?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const MAX_WIDTH_MAP = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footerSlot,
  maxWidth = "md",
  className,
}: ModalProps) {
  const { isCompact } = useWindowSizeClass();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Backdrop / Overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs transition-opacity duration-200" />

        {/* Modal Window */}
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 bg-card text-foreground border border-border/80 shadow-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isCompact
              ? "inset-x-0 bottom-0 rounded-t-2xl border-b-0 p-5 max-h-sheet flex flex-col overscroll-contain"
              : cn(
                  "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full rounded-lg p-6 max-h-modal flex flex-col overscroll-contain",
                  MAX_WIDTH_MAP[maxWidth]
                ),
            className
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-border/40 shrink-0">
            <div className="space-y-1 min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold tracking-tight text-foreground truncate">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-xs text-muted-foreground line-clamp-2">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>

            <DialogPrimitive.Close
              aria-label="Fechar"
              className="size-11 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Body with Independent Scroll */}
          <div className="flex-1 overflow-y-auto native-scroll py-4 space-y-4">
            {children}
          </div>

          {/* Footer Slot */}
          {footerSlot && (
            <div className="pt-3 border-t border-border/40 flex items-center justify-end gap-3 shrink-0">
              {footerSlot}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export const Dialog = Modal;

/* -------------------------------------------------------------------------- */
/* 2. ConfirmationDialog                                                      */
/* -------------------------------------------------------------------------- */

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  isDestructive = false,
  isLoading = false,
}: ConfirmationDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      maxWidth="sm"
      footerSlot={
        <div className="flex items-center gap-2 w-full justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="min-h-11 px-4 py-2 rounded-lg border border-border/80 bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "min-h-11 px-4 py-2 rounded-lg text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
              isDestructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-3 py-1">
        {isDestructive && (
          <div className="size-9 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <AlertTriangle className="size-4" />
          </div>
        )}
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. FormDialog                                                              */
/* -------------------------------------------------------------------------- */

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  maxWidth?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  submitLabel = "Salvar",
  cancelLabel = "Cancelar",
  isLoading = false,
  maxWidth = "md",
  children,
}: FormDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 bg-card text-foreground border border-border/80 shadow-2xl p-6 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full rounded-lg max-h-modal flex flex-col focus-visible:outline-none",
            MAX_WIDTH_MAP[maxWidth]
          )}
        >
          <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-border/40 shrink-0">
              <div className="space-y-1 min-w-0">
                <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                  {title}
                </DialogPrimitive.Title>
                {description && (
                  <DialogPrimitive.Description className="text-xs text-muted-foreground">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
              <DialogPrimitive.Close
                aria-label="Fechar"
                className="size-11 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <X className="size-5" />
              </DialogPrimitive.Close>
            </div>

            <div className="flex-1 overflow-y-auto native-scroll py-4 space-y-4">
              {children}
            </div>

            <div className="pt-3 border-t border-border/40 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="min-h-11 px-4 py-2 rounded-lg border border-border/80 bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="min-h-11 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                {submitLabel}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. DetailModal                                                             */
/* -------------------------------------------------------------------------- */

export interface DetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  actionSlot?: React.ReactNode;
}

export function DetailModal({
  open,
  onOpenChange,
  title,
  badge,
  children,
  actionSlot,
}: DetailModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs" />
        <DialogPrimitive.Content className="fixed z-50 bg-card text-foreground border border-border/80 shadow-2xl p-6 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl rounded-lg max-h-modal flex flex-col focus-visible:outline-none">
          <div className="flex items-center justify-between pb-4 border-b border-border/40 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <DialogPrimitive.Title className="text-lg font-bold text-foreground truncate">
                {title}
              </DialogPrimitive.Title>
              {badge}
            </div>
            <div className="flex items-center gap-2">
              {actionSlot}
              <DialogPrimitive.Close
                aria-label="Fechar"
                className="size-11 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <X className="size-5" />
              </DialogPrimitive.Close>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto native-scroll py-4">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. CommandModal                                                            */
/* -------------------------------------------------------------------------- */

export interface CommandModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder?: string;
  children: React.ReactNode;
}

export function CommandModal({
  open,
  onOpenChange,
  placeholder = "Digite um comando ou busque...",
  children,
}: CommandModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs" />
        <DialogPrimitive.Content className="fixed z-50 bg-card text-foreground border border-border/80 shadow-2xl p-0 left-1/2 top-1/4 -translate-x-1/2 w-full max-w-2xl rounded-lg overflow-hidden flex flex-col focus-visible:outline-none">
          <div className="flex items-center px-4 border-b border-border/40 min-h-12">
            <Search className="size-5 text-muted-foreground shrink-0 mr-3" />
            <input
              type="text"
              placeholder={placeholder}
              className="flex-1 bg-transparent py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              autoFocus
            />
            <span className="text-2xs font-mono text-muted-foreground px-2 py-1 rounded bg-muted">
              ESC
            </span>
          </div>
          <div className="max-h-80 overflow-y-auto native-scroll p-2">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. MediaModal                                                              */
/* -------------------------------------------------------------------------- */

export interface MediaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  src: string;
  type?: "image" | "video";
}

export function MediaModal({
  open,
  onOpenChange,
  title,
  src,
  type = "image",
}: MediaModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/85 backdrop-blur-md" />
        <DialogPrimitive.Content className="fixed z-50 inset-4 md:inset-12 flex flex-col items-center justify-center focus-visible:outline-none">
          <div className="absolute top-0 right-0 p-2 z-10">
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="size-11 rounded-full bg-foreground/50 text-primary-foreground hover:bg-foreground/80 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
            >
              <X className="size-6" />
            </DialogPrimitive.Close>
          </div>
          {title && (
            <div className="absolute top-2 left-2 text-primary-foreground text-sm font-semibold bg-foreground/50 px-3 py-2 rounded-lg">
              {title}
            </div>
          )}
          <div className="w-full h-full flex items-center justify-center p-2">
            {type === "image" ? (
              <img
                src={src}
                alt={title ?? "Mídia"}
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : (
              <video
                src={src}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-lg"
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. BottomSheet                                                             */
/* -------------------------------------------------------------------------- */

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footerSlot?: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footerSlot,
  className,
}: BottomSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs transition-opacity duration-200" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 bg-card text-foreground border-t border-border/80 rounded-t-2xl shadow-2xl p-5 max-h-sheet flex flex-col focus-visible:outline-none overscroll-contain",
            className
          )}
        >
          {/* Grab Handle */}
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-3 shrink-0" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-3 border-b border-border/40 shrink-0">
            <div className="space-y-1">
              <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-xs text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>

            <DialogPrimitive.Close
              aria-label="Fechar"
              className="size-11 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto native-scroll py-4 space-y-4">
            {children}
          </div>

          {/* Footer Slot */}
          {footerSlot && (
            <div className="pt-3 border-t border-border/40 shrink-0">{footerSlot}</div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. SideSheet                                                               */
/* -------------------------------------------------------------------------- */

export interface SideSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footerSlot?: React.ReactNode;
  width?: "sm" | "md" | "lg";
}

export function SideSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footerSlot,
  width = "md",
}: SideSheetProps) {
  const widthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-xl",
  }[width];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-xs transition-opacity" />
        <DialogPrimitive.Content
          className={cn(
            "fixed right-0 top-0 bottom-0 z-50 w-full bg-card text-foreground border-l border-border/80 shadow-2xl p-6 flex flex-col focus-visible:outline-none overscroll-contain",
            widthClasses
          )}
        >
          <div className="flex items-start justify-between pb-4 border-b border-border/40 shrink-0">
            <div className="space-y-1 min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold text-foreground truncate">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-xs text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Fechar"
              className="size-11 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto native-scroll py-4 space-y-4">
            {children}
          </div>

          {footerSlot && (
            <div className="pt-4 border-t border-border/40 shrink-0">{footerSlot}</div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* 9. FullScreenSheet                                                         */
/* -------------------------------------------------------------------------- */

export interface FullScreenSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  actionSlot?: React.ReactNode;
}

export function FullScreenSheet({
  open,
  onOpenChange,
  title,
  children,
  actionSlot,
}: FullScreenSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className="fixed inset-0 z-50 bg-background text-foreground flex flex-col focus-visible:outline-none overscroll-contain">
          <header className="flex items-center justify-between px-6 min-h-14 border-b border-border/50 bg-card shrink-0">
            <DialogPrimitive.Title className="text-base font-bold text-foreground">
              {title}
            </DialogPrimitive.Title>
            <div className="flex items-center gap-2">
              {actionSlot}
              <DialogPrimitive.Close
                aria-label="Fechar tela cheia"
                className="size-11 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <X className="size-5" />
              </DialogPrimitive.Close>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto native-scroll p-6">
            {children}
          </main>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
