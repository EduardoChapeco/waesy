import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
 return <div className={cn("animate-pulse motion-reduce:animate-none rounded-none bg-ink/10", className)} {...props} />;
}

export { Skeleton };
