import { Check, MapPin, ShieldCheck } from "lucide-react";
import { CityCombobox, type StructuredLocationValue } from "@/components/ui/city-combobox";
import { Label } from "@/components/ui/label";
import { PhoneField } from "@/components/ui/phone-field";
import { Switch } from "@/components/ui/switch";

export interface ClassifiedLocationSectionProps {
  locationName: string;
  hideLocation: boolean;
  onLocationChange: (formatted: string, structured?: StructuredLocationValue) => void;
  onHideLocationChange: (hidden: boolean) => void;
  whatsapp?: string;
  onWhatsappChange?: (val: string) => void;
}

export function ClassifiedLocationSection({
  locationName,
  hideLocation,
  onLocationChange,
  onHideLocationChange,
  whatsapp,
  onWhatsappChange,
}: ClassifiedLocationSectionProps) {
  return (
    <section className="bg-card rounded-lg p-4 sm:p-5 space-y-4 border border-border/60" aria-labelledby="classified-location-heading">
      <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground pb-3 border-b border-border/40">
        <MapPin className="size-4 text-primary shrink-0" aria-hidden="true" />
        <span id="classified-location-heading">Localização e Contato</span>
      </div>

      <CityCombobox
        value={locationName}
        onChange={onLocationChange}
        label="Bairro e Cidade do Anúncio *"
      />

      {/* Controle de Privacidade Total de Endereço (LGPD) */}
      <div className="p-4 bg-muted/20 border border-border/70 rounded-lg space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <Label htmlFor="hide-location-toggle" className="text-xs font-bold text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
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
          <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg font-medium flex items-center gap-2">
            <Check className="size-3 shrink-0" aria-hidden="true" />
            Privacidade total ativa: nenhum dado geográfico ou mapa será exposto.
          </div>
        )}
      </div>

      {onWhatsappChange && (
        <div className="space-y-2 pt-1">
          <Label className="text-xs text-foreground font-medium">
            WhatsApp para Contato Direto
          </Label>
          <PhoneField
            value={whatsapp || ""}
            onChange={(val) => onWhatsappChange(val || "")}
            placeholder="(49) 99999-9999"
            className="h-11 min-h-11 rounded-lg text-xs bg-background"
          />
        </div>
      )}
    </section>
  );
}
