import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

export interface ScrollAreaProps
 extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
 hideScrollBar?: boolean;
}

const ScrollArea = React.forwardRef<
 React.ElementRef<typeof ScrollAreaPrimitive.Root>,
 ScrollAreaProps
>(({ className, children, hideScrollBar = false, ...props }, ref) => (
 <ScrollAreaPrimitive.Root
 ref={ref}
 className={cn("relative overflow-hidden", className)}
 {...props}
 >
 <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-inherit [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
 {children}
 </ScrollAreaPrimitive.Viewport>
 {!hideScrollBar && <ScrollBar />}
 <ScrollAreaPrimitive.Corner />
 </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
 React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
 React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
 <ScrollAreaPrimitive.ScrollAreaScrollbar
 ref={ref}
 orientation={orientation}
 className={cn(
 "flex touch-none select-none transition-opacity opacity-0 hover:opacity-100",
 orientation === "vertical" && "h-full w-1.5 border-l border-l-transparent p-0.5",
 orientation === "horizontal" && "h-1.5 flex-col border-t border-t-transparent p-0.5",
 className,
 )}
 {...props}
 >
 <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border/50 hover:bg-border transition-colors" />
 </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
