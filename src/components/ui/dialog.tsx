"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
 React.ElementRef<typeof DialogPrimitive.Overlay>,
 React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
 <DialogPrimitive.Overlay
 ref={ref}
 className={cn(
 "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
 className,
 )}
 {...props}
 />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export interface DialogContentProps
 extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
 size?: "default" | "sm" | "lg" | "xl" | "full";
}

const DialogContent = React.forwardRef<
 React.ElementRef<typeof DialogPrimitive.Content>,
 DialogContentProps
>(({ className, children, size = "default", ...props }, ref) => {
 const sizeClasses = {
 sm: "sm:max-w-md",
 default: "sm:max-w-lg",
 lg: "sm:max-w-2xl",
 xl: "sm:max-w-4xl",
 full: "sm:max-w-5xl sm:h-[90vh]",
 }[size];

 return (
 <DialogPortal>
 <DialogOverlay />
 <DialogPrimitive.Content
 ref={ref}
 className={cn(
 // Mobile: Full-Screen 100% da viewport, sem margens espremidas, scroll natural e zero layout shifts
 "fixed inset-0 z-50 flex flex-col w-full h-full max-w-none rounded-none border-none bg-background p-5 overflow-y-auto no-scrollbar duration-200",
 // Desktop (sm+): Dialog centralizado elegante com bordas contidas
 "sm:fixed sm:inset-auto sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:border sm:border-border sm:p-6",
 sizeClasses,
 "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
 className,
 )}
 {...props}
 >
 {children}
 <DialogPrimitive.Close className="absolute right-4 top-4 rounded-xl p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary">
 <X className="size-5" />
 <span className="sr-only">Fechar</span>
 </DialogPrimitive.Close>
 </DialogPrimitive.Content>
 </DialogPortal>
 );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
 <div className={cn("flex flex-col space-y-1 text-left pb-3 mb-2 ", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
 <div
 className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-3 mt-auto gap-2", className)}
 {...props}
 />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
 React.ElementRef<typeof DialogPrimitive.Title>,
 React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
 <DialogPrimitive.Title
 ref={ref}
 className={cn("text-lg font-bold tracking-tight text-foreground", className)}
 {...props}
 />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
 React.ElementRef<typeof DialogPrimitive.Description>,
 React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
 <DialogPrimitive.Description
 ref={ref}
 className={cn("text-xs text-muted-foreground font-medium", className)}
 {...props}
 />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
 Dialog,
 DialogPortal,
 DialogOverlay,
 DialogTrigger,
 DialogClose,
 DialogContent,
 DialogHeader,
 DialogFooter,
 DialogTitle,
 DialogDescription,
};
