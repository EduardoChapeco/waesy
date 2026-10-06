"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useWindowSizeClass } from "@/hooks/use-mobile";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
 React.ElementRef<typeof SheetPrimitive.Overlay>,
 React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
 <SheetPrimitive.Overlay
 className={cn(
 "fixed inset-0 z-50 bg-overlay data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
 className,
 )}
 {...props}
 ref={ref}
 />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 transition-transform ease-in-out duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t rounded-t-lg data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom max-h-overlay-max",
        left: "inset-y-0 left-0 h-full w-full border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        right:
          "inset-y-0 right-0 h-full w-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
      },
      size: {
        default: "w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl",
        sm: "w-full sm:max-w-xl md:max-w-2xl",
        md: "w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl",
        lg: "w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl",
        xl: "w-full sm:max-w-4xl md:max-w-5xl lg:max-w-6xl",
        "70": "w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl",
        wide: "w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl",
        full: "w-full max-w-full",
      },
    },
    defaultVariants: {
      side: "right",
      size: "default",
    },
  },
);

export type SheetWindowVariant = "auto" | "compact" | "expanded";

export interface SheetContentProps
  extends
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  windowVariant?: SheetWindowVariant;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side, size = "default", windowVariant = "auto", className, children, ...props }, ref) => {
  const { isCompact } = useWindowSizeClass();

  const resolvedSide =
    side ??
    (windowVariant === "compact"
      ? "bottom"
      : windowVariant === "expanded"
      ? "right"
      : isCompact
      ? "bottom"
      : "right");

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          sheetVariants({ side: resolvedSide, size }),
          resolvedSide === "bottom" && "p-4 sm:p-6",
          className
        )}
        {...props}
      >
        {resolvedSide === "bottom" && (
          <div className="mx-auto w-12 h-1 rounded-full bg-muted-foreground/20 mb-3 shrink-0" aria-hidden="true" />
        )}
        <SheetPrimitive.Close className="absolute right-4 top-4 flex size-11 min-h-11 min-w-11 items-center justify-center rounded-lg ring-offset-background cursor-pointer transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none z-10 touch-manipulation">
          <X className="size-4" />
          <span className="sr-only">Fechar</span>
        </SheetPrimitive.Close>
        {children}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
 <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
 <div
 className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
 {...props}
 />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
 React.ElementRef<typeof SheetPrimitive.Title>,
 React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
 <SheetPrimitive.Title
 ref={ref}
 className={cn("text-lg font-semibold text-foreground", className)}
 {...props}
 />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
 React.ElementRef<typeof SheetPrimitive.Description>,
 React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
 <SheetPrimitive.Description
 ref={ref}
 className={cn("text-sm text-muted-foreground", className)}
 {...props}
 />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;


export {
 Sheet,
 SheetPortal,
 SheetOverlay,
 SheetTrigger,
 SheetClose,
 SheetContent,
 SheetHeader,
 SheetFooter,
 SheetTitle,
 SheetDescription,
};
