import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeletons and status — no layout shift (DESIGN.md §5).
 */

/** Canonical centered loading indicator with accessible status text. */
export function LoadingState({
 label = "Carregando…",
 className,
}: {
 label?: string;
 className?: string;
}) {
 return (
 <div
 role="status"
 aria-live="polite"
 className={cn(
 "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
 className,
 )}
 >
 <Loader2
 className="size-6 animate-spin text-muted-foreground motion-reduce:animate-none"
 aria-hidden
 />
 <span className="text-sm text-muted-foreground">{label}</span>
 </div>
 );
}

export function ProductCardSkeleton() {
 return (
 <div className="flex flex-col gap-3">
 <Skeleton className="aspect-square rounded-lg w-full" />
 <Skeleton className="h-4 w-3/4" />
 <Skeleton className="h-4 w-1/3" />
 </div>
 );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
 return (
 <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
 {Array.from({ length: count }).map((_, i) => (
 <ProductCardSkeleton key={i} />
 ))}
 </div>
 );
}

export function LinesSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
 return (
 <div className={cn("space-y-3", className)}>
 {Array.from({ length: lines }).map((_, i) => (
 <Skeleton key={i} className="h-4 w-full last:w-2/3" />
 ))}
 </div>
 );
}

export function ProductRailSkeleton({
 count = 4,
 title = true,
}: {
 count?: number;
 title?: boolean;
}) {
 return (
 <section className="mx-auto max-w-screen-xl px-4 py-8 @md:px-6 w-full overflow-hidden">
 {title && (
 <div className="mb-5 flex items-end justify-between gap-3">
 <Skeleton className="h-8 w-1/3 rounded" />
 <Skeleton className="h-6 w-24 rounded hidden @sm:block" />
 </div>
 )}
 <div className="flex gap-4">
 {Array.from({ length: count }).map((_, i) => (
 <div
 key={i}
 className="min-w-0 flex-[0_0_80%] @sm:flex-[0_0_40%] @md:flex-[0_0_33.33%] @lg:flex-[0_0_25%] shrink-0"
 >
 <ProductCardSkeleton />
 </div>
 ))}
 </div>
 </section>
 );
}

export function PageSkeleton() {
 return (
 <div className="mx-auto max-w-screen-xl px-4 py-12 md:px-6 w-full animate-in fade-in duration-500">
 <div className="mb-12 space-y-4">
 <Skeleton className="h-10 w-1/2 md:w-1/3" />
 <Skeleton className="h-5 w-3/4 md:w-1/2" />
 </div>
 <ProductGridSkeleton count={8} />
 </div>
 );
}
