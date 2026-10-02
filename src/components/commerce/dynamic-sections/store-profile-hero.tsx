import { cn } from "@/lib/utils";
import { Store } from "lucide-react";

interface StoreHeroData {
 name?: string;
 slug?: string;
 description?: string;
 logo_url?: string;
 cover_url?: string;
}

interface StoreProfileHeroProps {
 // Flat content fields (spread by ExperienceRenderer from node.content)
 show_description?: boolean;
 show_logo?: boolean;
 show_cover?: boolean;
 layout?: "centered" | "left" | "instagram";
 design_tokens?: {
 backgroundColor?: string;
 textColor?: string;
 className?: string;
 };
 // Canonical: storeData injected by ExperienceRenderer
 storeData?: StoreHeroData;
 // Legacy compat: raw transient_data from BFF when component receives it directly
 transient_data?: {
 store_hero?: StoreHeroData;
 };
}

export function StoreProfileHero({
 show_description,
 show_logo,
 show_cover,
 layout,
 design_tokens,
 storeData,
 transient_data,
}: StoreProfileHeroProps) {
 const store = storeData ?? transient_data?.store_hero;
 const resolvedLayout = layout ?? "centered";
 const showLogo = show_logo !== false;
 const showCover = show_cover !== false;
 const showDescription = show_description !== false;

 if (!store) {
 return (
 <div className="w-full h-48 flex items-center justify-center bg-muted/50 text-muted-foreground text-sm">
 <Store className="mr-2 h-5 w-5" />
 Perfil não configurado
 </div>
 );
 }

 return (
 <div
 className={cn("w-full overflow-hidden", design_tokens?.className)}
 style={{
 backgroundColor: design_tokens?.backgroundColor,
 color: design_tokens?.textColor,
 }}
 >
 {/* Cover */}
 {showCover && (
 <div className="relative h-40 @md:h-56 w-full bg-muted">
 {store.cover_url ? (
 <img
 src={store.cover_url}
 alt={`Capa de ${store.name}`}
 className="h-full w-full object-cover"
 />
 ) : (
 <div className="h-full w-full from-primary/20 to-primary/5" />
 )}
 <div className="absolute inset-0 from-background/80" />
 </div>
 )}

 {/* Profile info */}
 <div
 className={cn(
 "mx-auto max-w-2xl px-4 @md:px-6 pb-8",
 showCover ? "-mt-12 relative z-10" : "pt-10",
 resolvedLayout === "centered" && "flex flex-col items-center text-center",
 resolvedLayout === "left" && "flex flex-col items-start",
 resolvedLayout === "instagram" && "flex flex-col items-center text-center",
 )}
 >
 {showLogo && (
 <div
 className={cn(
 "mb-4",
 resolvedLayout === "centered" || resolvedLayout === "instagram" ? "mx-auto" : "",
 )}
 >
 {store.logo_url ? (
 <img
 src={store.logo_url}
 alt={store.name}
 className="size-24 object-contain p-1 bg-card/80 backdrop-blur-xs"
 />
 ) : (
 <div className="size-24 rounded-full bg-background border border-background flex items-center justify-center text-primary">
 <Store className="h-10 w-10" />
 </div>
 )}
 </div>
 )}

 <div>
 <h1 className="text-2xl font-bold leading-tight">{store.name}</h1>
 {store.slug && <p className="text-sm text-muted-foreground mt-1">@{store.slug}</p>}
 {showDescription && store.description && (
 <p className="mt-3 text-sm leading-relaxed text-muted-foreground max-w-sm">
 {store.description}
 </p>
 )}
 </div>
 </div>
 </div>
 );
}
