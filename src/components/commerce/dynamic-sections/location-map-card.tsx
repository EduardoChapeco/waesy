import * as React from "react";
import { MapPin, Navigation, Clock, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface LocationMapCardProps {
 title?: string;
 subtitle?: string;
 address?: string;
 cityState?: string;
 zipCode?: string;
 phone?: string;
 workingHours?: string;
 googleMapsUrl?: string;
}

export function LocationMapCardSection({
 title = "",
 subtitle = "",
 address = "",
 cityState = "",
 zipCode = "",
 phone = "",
 workingHours = "",
 googleMapsUrl = "",
}: LocationMapCardProps) {
 if (!address && !cityState && !phone && !workingHours && !googleMapsUrl) return null;
 return (
 <section className="py-12 bg-background w-full">
 <div className="max-w-6xl mx-auto px-4 sm:px-6">
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-lg border border-border/80 bg-card p-6 sm:p-10 shadow-2xs">
 <div className="lg:col-span-6 space-y-5">
 <div className="space-y-2">
 <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground border-border/80">
 Localização
 </Badge>
 <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{title}</h2>
 {subtitle && <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>}
 </div>

 <div className="space-y-3 text-xs">
 <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border/60">
 <MapPin className="size-4 text-primary shrink-0 mt-1" />
 <div>
 <span className="font-bold text-foreground block text-sm">{address}</span>
 {(cityState || zipCode) && <span className="text-muted-foreground">{[cityState, zipCode].filter(Boolean).join(" • ")}</span>}
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <div className="p-4 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-3">
 <Clock className="size-4 text-primary shrink-0" />
 <div>
 <span className="text-[10px] text-muted-foreground block font-mono">Horário</span>
 <span className="font-semibold text-foreground">{workingHours}</span>
 </div>
 </div>

 <div className="p-4 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-3">
 <Phone className="size-4 text-primary shrink-0" />
 <div>
 <span className="text-[10px] text-muted-foreground block font-mono">Telefone</span>
 <span className="font-semibold text-foreground font-mono">{phone}</span>
 </div>
 </div>
 </div>
 </div>

 <div className="pt-2">
 <Button
 type="button"
 size="lg"
 onClick={() => window.open(googleMapsUrl, "_blank")}
 className="rounded-lg font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer gap-2 h-11"
 >
 <Navigation className="size-4" />
 <span>Abrir no Google Maps</span>
 </Button>
 </div>
 </div>

 <div className="lg:col-span-6 rounded-lg overflow-hidden aspect-4/3 bg-muted border border-border/60 relative flex items-center justify-center">
 {googleMapsUrl && <img src={googleMapsUrl} alt="Mapa" className="size-full object-cover" />}
 <div className="absolute inset-0 bg-background/20 backdrop-blur-2xs flex items-center justify-center">
 <div className="p-4 rounded-lg bg-background/95 border border-border shadow-xl flex items-center gap-3">
 <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
 <MapPin className="size-5" />
 </div>
 <div>
 <p className="font-bold text-xs text-foreground">{address}</p>
 <p className="text-[11px] text-muted-foreground">{cityState}</p>
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>
 );
}
