import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const surfaceVariants = cva("relative overflow-hidden transition-colors duration-200 duration-200", {
 variants: {
 variant: {
 default: "bg-background text-foreground border rounded-lg",
 zine: "bg-background text-foreground border rounded-lg", // Alias para manter compatibilidade
 flyer: "bg-primary text-primary-foreground border rounded-lg",
 "yellow-pages": "bg-secondary text-secondary-foreground border rounded-lg ",
 ticket: "bg-background text-foreground border border-dashed rounded-lg ",
 polaroid: "bg-background text-foreground p-4 pb-12 border rounded-lg",
 cardboard: "bg-muted text-muted-foreground border rounded-lg",
 charcoal: "bg-card text-card-foreground border rounded-lg ",
 none: "bg-transparent text-foreground border-none shadow-none",
 lambe: "bg-primary text-primary-foreground border rounded-lg",
 journal: "bg-background text-foreground border-y font-serif",
 flat: "bg-background text-foreground border-none rounded-lg",
 muted: "bg-muted text-muted-foreground border-none rounded-lg",
 op: "card-op",
 },
 elevation: {
 none: "shadow-none",
 sm: "",
 md: "",
 hard: "",
 },
 padding: {
 none: "p-0",
 sm: "p-3",
 md: "p-6",
 lg: "p-10",
 },
 },
 defaultVariants: {
 variant: "default",
 elevation: "none",
 padding: "md",
 },
});

export interface SurfaceProps
 extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof surfaceVariants> {
 as?: React.ElementType;
}

const Surface = React.forwardRef<HTMLDivElement, SurfaceProps>(
 ({ className, variant, elevation, padding, as: Component = "div", ...props }, ref) => {
 return (
 <Component
 ref={ref}
 className={cn(surfaceVariants({ variant, elevation, padding, className }))}
 {...props}
 />
 );
 },
);
Surface.displayName = "Surface";

export { Surface, surfaceVariants };
