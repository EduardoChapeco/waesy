import { useState } from "react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Brand logo — renders the store image logo at its dynamic natural aspect ratio
 * with a transparent background.
 * If src is missing or fails to load, gracefully falls back to an elegant text logo
 * without showing broken image icons or solid black boxes.
 */
export function Logo({ src, className, ...props }: Omit<ComponentProps<"img">, "alt">) {
 const [hasError, setHasError] = useState(false);

 if (src && !hasError) {
 return (
 <img
 src={src}
 alt="Waesy — Super App & Comunidade"
 className={cn(
 "h-8 w-auto max-w-60 select-none object-contain bg-transparent mix-blend-normal",
 className,
 )}
 onError={() => setHasError(true)}
 {...props}
 />
 );
 }

 return (
 <span
 className={cn(
 "font-bold text-lg tracking-tight text-foreground select-none flex items-center gap-2",
 className,
 )}
 >
 Waesy
 </span>
 );
}

/** Canonical alias (see COMPONENT_CATALOG.md). */
export const BrandLogo = Logo;
