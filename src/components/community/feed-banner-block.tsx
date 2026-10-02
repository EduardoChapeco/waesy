import { ArrowRight, Layers } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

interface FeedBannerBlockProps {
 title: string;
 subtitle?: string;
 badge?: string;
 imageUrl?: string;
 actionLabel?: string;
 actionHref?: string;
}

export function FeedBannerBlock({
 title,
 subtitle,
 badge = "Destaque",
 imageUrl,
 actionLabel = "Descobrir",
 actionHref = "/mercado",
}: FeedBannerBlockProps) {
 return (
 <div className="relative my-4 overflow-hidden rounded-lg bg-card p-5">
 {imageUrl && (
 <>
 <img
 src={imageUrl}
 alt={title}
 className="absolute inset-0 size-full object-cover opacity-25"
 />
 <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
 </>
 )}

 <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="space-y-1 max-w-md">
 <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
 <Layers className="size-3.5" />
 <span>{badge}</span>
 </div>
 <h4 className="text-base font-bold text-foreground tracking-tight">{title}</h4>
 {subtitle && <p className="text-xs text-muted-foreground line-clamp-2">{subtitle}</p>}
 </div>

 <Button
 asChild
 size="sm"
 className="rounded-lg shrink-0 font-semibold self-start sm:self-center"
 >
 <Link to={actionHref}>
 {actionLabel}
 <ArrowRight className="size-3.5 ml-2" />
 </Link>
 </Button>
 </div>
 </div>
 );
}
