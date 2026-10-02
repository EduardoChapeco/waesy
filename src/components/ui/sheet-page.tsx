"use client";

import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface SheetPageProps {
 open?: boolean;
 isOpen?: boolean;
 onOpenChange?: (open: boolean) => void;
 onClose?: () => void;
 title?: React.ReactNode;
 description?: React.ReactNode;
 children: React.ReactNode;
 footer?: React.ReactNode;
 size?: "sm" | "default" | "lg" | "xl" | "2xl" | "wide" | "70" | "full";
 className?: string;
 contentClassName?: string;
 side?: "top" | "bottom" | "left" | "right";
}

export function SheetPage({
 open,
 isOpen,
 onOpenChange,
 onClose,
 title,
 description,
 children,
 footer,
 size = "default",
 className,
 contentClassName,
 side = "right",
}: SheetPageProps) {
 const isSheetOpen = open ?? isOpen ?? false;
 const handleOpenChange = (nextOpen: boolean) => {
   if (onOpenChange) onOpenChange(nextOpen);
   if (!nextOpen && onClose) onClose();
 };

 const sizeClasses = {
    sm: "w-full sm:max-w-xl md:max-w-2xl",
    default: "w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw]",
    lg: "w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw]",
    xl: "w-full sm:max-w-3xl md:max-w-5xl lg:max-w-[70vw] xl:max-w-[70vw]",
    "2xl": "w-full sm:max-w-3xl md:max-w-5xl lg:max-w-[70vw] xl:max-w-[70vw]",
    wide: "w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw]",
    "70": "w-full sm:max-w-3xl md:max-w-4xl lg:max-w-[70vw] xl:max-w-[70vw]",
    full: "w-screen max-w-full",
 }[size];

 return (
 <Sheet open={isSheetOpen} onOpenChange={handleOpenChange}>
 <SheetContent
 side={side}
 className={cn(
 "w-full h-full flex flex-col p-0 bg-background z-50",
 sizeClasses,
 className,
 )}
 >
 {/* Header Fixo */}
 <SheetHeader className="px-6 py-4.5 text-left bg-card/60 shrink-0">
 <SheetTitle className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
 {title}
 </SheetTitle>
 {description && (
 <SheetDescription className="text-xs text-muted-foreground font-medium">
 {description}
 </SheetDescription>
 )}
 </SheetHeader>

 {/* Corpo Scrollável Natural */}
 <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 space-y-5">
 {children}
 </div>

 {/* Rodapé Fixo */}
 {footer && (
 <SheetFooter className="px-6 py-4 bg-card/80 flex items-center justify-end gap-2 shrink-0">
 {footer}
 </SheetFooter>
 )}
 </SheetContent>
 </Sheet>
 );
}
