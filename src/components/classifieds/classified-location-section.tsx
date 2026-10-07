import { Check, MapPin } from "lucide-react";
import { CityCombobox, type StructuredLocationValue } from "@/components/ui/city-combobox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export interface ClassifiedLocationSectionProps {
  locationName: string;
  hideLocation: boolean;
  onLocationChange: (formatted: string, structured?: StructuredLocationValue) => void;
  onHideLocationChange: (hidden: boolean) => void;
}

export function ClassifiedLocationSection({
  locationName,
  hideLocation,
  onLocationChange,
  onHideLocationChange,
}: ClassifiedLocationSectionProps) {
  return (
    <section className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60" aria-labelledby="classified-location-heading">
      <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-3 border-b border-border/40">
        <MapPin className="size-4 text-primary shrink-0" />
        <span id="classified-location-heading">Localização</span>
      </div>

      <CityCombobox
        value={locationName}
        onChange={onLocationChange}
        label="Bairro e Cidade do Anúncio *"
      />

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background p-3">
        <div className="space-y-1">
          <Label htmlFor="hide-location-toggle" className="text-xs font-semibold text-foreground">
            Ocultar endereço completamente
          </Label>
          <p className="text-xs text-muted-foreground leading-snug">
            Não exibe cidade, bairro nem mapa no anúncio público.
          </p>
        </div>
        <Switch
          id="hide-location-toggle"
          checked={hideLocation}
          onCheckedChange={onHideLocationChange}
        />
      </div>

      {hideLocation && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="size-3 shrink-0" />
          Privacidade total ativa: nenhum dado geográfico ou mapa será exposto.
        </div>
      )}
    </section>
  );
}
