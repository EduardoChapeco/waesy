"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

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
 "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
 className,
 )}
 {...props}
 ref={ref}
 />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t max-sm:!h-[100dvh] max-sm:!inset-0 max-sm:!rounded-none data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:max-h-[85vh] sm:rounded-t-3xl",
        left: "inset-y-0 left-0 h-full w-full max-sm:!h-[100dvh] max-sm:!inset-0 max-sm:!rounded-none border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
        right:
          "inset-y-0 right-0 h-full w-full max-sm:!h-[100dvh] max-sm:!inset-0 max-sm:!rounded-none border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
      },
      size: {
        default: "w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw]",
        sm: "w-full sm:max-w-xl md:max-w-2xl",
        md: "w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl",
        lg: "w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[65vw]",
        xl: "w-full sm:max-w-4xl md:max-w-5xl lg:max-w-[70vw]",
        "70": "w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw]",
        wide: "w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw]",
        full: "w-screen max-w-full",
      },
    },
    defaultVariants: {
      side: "right",
      size: "default",
    },
  },
);

interface SheetContentProps
  extends
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", size = "default", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content ref={ref} className={cn(sheetVariants({ side, size }), className)} {...props}>
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-lg opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary z-10">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
));
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

export interface SheetPageProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  contentClassName?: string;
  side?: "top" | "bottom" | "left" | "right";
}

export function SheetPage({
  isOpen,
  onClose,
  title,
  description,
  children,
  contentClassName,
  side = "right",
}: SheetPageProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side={side}
        size="wide"
        className={cn(
          "w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw] p-0 flex flex-col h-full bg-background border-l border-border",
          contentClassName,
        )}
      >
        {title && (
          <SheetHeader className="px-6 py-4 border-b border-border/60 text-left shrink-0">
            <SheetTitle className="text-base font-bold">{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

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
