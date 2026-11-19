import { lazy, Suspense, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import {
  Building2,
  Bus,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Compass,
  ImagePlus,
  Navigation,
  Plane,
  Plus,
  Route as RouteIcon,
  Ship,
  Train,
  Trash2,
  X,
} from "lucide-react";
import type { StoryHighlight } from "@/components/classifieds/story-highlight-uploader";
import type { ItineraryDay } from "@/components/classifieds/itinerary-day-editor";
import type { TravelLodging } from "@/components/classifieds/creator/niche-cards";
import { CANONICAL_LODGING_AMENITIES } from "@/components/classifieds/creator/niche-cards";
import { WeatherWidget } from "@/components/classifieds/weather-widget";
import { uploadClassifiedMedia } from "@/lib/classifieds/upload-classified-media";
import {
  CANONICAL_AIRLINES,
  CANONICAL_BUS_CATEGORIES,
  CANONICAL_GUIDE_SERVICES,
  CANONICAL_TRANSFER_VEHICLES,
  CANONICAL_TRANSPORT_TYPES,
  DEPARTURE_STATUS_CONFIG,
  type DepartureOption,
  type DepartureStatus,
} from "@/lib/classifieds/canonical-airports";
import { AirportCombobox } from "@/components/ui/airport-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const StoryHighlightUploader = lazy(() =>
  import("@/components/classifieds/story-highlight-uploader").then((m) => ({
    default: m.StoryHighlightUploader,
  })),
);
const ItineraryDayEditor = lazy(() =>
  import("@/components/classifieds/itinerary-day-editor").then((m) => ({
    default: m.ItineraryDayEditor,
  })),
);

export interface ClassifiedTravelSectionProps {
  onOpenTravelStudio: () => void;
  travelVisibilityMode: "public" | "unlisted" | "private";
  onTravelVisibilityModeChange: (v: "public" | "unlisted" | "private") => void;
  travelIsCustomQuote: boolean;
  onTravelIsCustomQuoteChange: (v: boolean) => void;
  travelAdultsCount: number;
  onTravelAdultsCountChange: (v: number) => void;
  travelChildrenCount: number;
  onTravelChildrenCountChange: (v: number) => void;
  travelChildrenMaxAge: number;
  onTravelChildrenMaxAgeChange: (v: number) => void;
  travelDuration: string;
  onTravelDurationChange: (v: string) => void;
  travelMealPlan: string;
  onTravelMealPlanChange: (v: string) => void;
  travelGuests: string;
  onTravelGuestsChange: (v: string) => void;
  travelDates: string;
  onTravelDatesChange: (v: string) => void;
  travelDestinationCity: string;
  onTravelDestinationCityChange: (v: string) => void;
  travelDepartureDate: string;
  onTravelDepartureDateChange: (v: string) => void;
  travelReturnDate: string;
  onTravelReturnDateChange: (v: string) => void;
  travelTransportType: string;
  onTravelTransportTypeChange: (v: string) => void;
  travelDepartureIATA: string;
  onTravelDepartureIATAChange: (v: string) => void;
  travelArrivalIATA: string;
  onTravelArrivalIATAChange: (v: string) => void;
  travelAirline: string;
  onTravelAirlineChange: (v: string) => void;
  travelConnections: number;
  onTravelConnectionsChange: (v: number) => void;
  travelConnectionCity: string;
  onTravelConnectionCityChange: (v: string) => void;
  travelDepartureTime: string;
  onTravelDepartureTimeChange: (v: string) => void;
  travelArrivalTime: string;
  onTravelArrivalTimeChange: (v: string) => void;
  travelFlightPrice: string;
  onTravelFlightPriceChange: (v: string) => void;
  travelFlightDuration: string;
  onTravelFlightDurationChange: (v: string) => void;
  travelBaggagePersonalItem: boolean;
  onTravelBaggagePersonalItemChange: Dispatch<SetStateAction<boolean>>;
  travelBaggageCarryOn: boolean;
  onTravelBaggageCarryOnChange: Dispatch<SetStateAction<boolean>>;
  travelBaggageChecked: number;
  onTravelBaggageCheckedChange: (v: number) => void;
  travelBusCategory: string;
  onTravelBusCategoryChange: (v: string) => void;
  travelBusCompany: string;
  onTravelBusCompanyChange: (v: string) => void;
  travelDepartureCity: string;
  onTravelDepartureCityChange: (v: string) => void;
  travelMeetingPoint: string;
  onTravelMeetingPointChange: (v: string) => void;
  travelReturnDepartureTime: string;
  onTravelReturnDepartureTimeChange: (v: string) => void;
  travelBoardingGatewayInput: string;
  onTravelBoardingGatewayInputChange: (v: string) => void;
  travelBoardingGateways: string[];
  onAddGateway: () => void;
  onRemoveGateway: (gateway: string) => void;
  travelGuideService: string;
  onTravelGuideServiceChange: (v: string) => void;
  travelComboFromIATA: string;
  onTravelComboFromIATAChange: (v: string) => void;
  travelComboToIATA: string;
  onTravelComboToIATAChange: (v: string) => void;
  travelComboAirline: string;
  onTravelComboAirlineChange: (v: string) => void;
  travelComboFlightPrice: string;
  onTravelComboFlightPriceChange: (v: string) => void;
  travelTransferVehicle: string;
  onTravelTransferVehicleChange: (v: string) => void;
  travelTransferDuration: string;
  onTravelTransferDurationChange: (v: string) => void;
  travelTransferFrom: string;
  onTravelTransferFromChange: (v: string) => void;
  travelTransferTo: string;
  onTravelTransferToChange: (v: string) => void;
  travelTransferTime: string;
  onTravelTransferTimeChange: (v: string) => void;
  travelComboNotes: string;
  onTravelComboNotesChange: (v: string) => void;
  travelShipName: string;
  onTravelShipNameChange: (v: string) => void;
  travelCruiseLine: string;
  onTravelCruiseLineChange: (v: string) => void;
  travelCabinCategory: string;
  onTravelCabinCategoryChange: (v: string) => void;
  travelEmbarkationPort: string;
  onTravelEmbarkationPortChange: (v: string) => void;
  travelDepartureOptions: DepartureOption[];
  onAddDeparture: () => void;
  onUpdateDeparture: (id: string, patch: Partial<DepartureOption>) => void;
  onRemoveDeparture: (id: string) => void;
  travelBioBullets: string[];
  onTravelBioBulletsChange: Dispatch<SetStateAction<string[]>>;
  onAddTravelBullet: () => void;
  onUpdateTravelBullet: (index: number, value: string) => void;
  onMoveTravelBullet: (index: number, direction: "up" | "down") => void;
  onRemoveTravelBullet: (index: number) => void;
  travelLodgings: TravelLodging[];
  onAddTravelLodging: () => void;
  onUpdateTravelLodging: (id: string, patch: Partial<TravelLodging>) => void;
  onRemoveTravelLodging: (id: string) => void;
  travelStoryHighlights: StoryHighlight[];
  onTravelStoryHighlightsChange: (h: StoryHighlight[]) => void;
  travelItineraryDays: ItineraryDay[];
  onTravelItineraryDaysChange: (d: ItineraryDay[]) => void;
}

const TRAVEL_QUICK_BULLETS = [
  "All Inclusive",
  "Café da Manhã Incluso",
  "Aéreo Ida e Volta",
  "Transfer In/Out",
  "Pé na Areia",
  "Piscina Aquecida",
  "Suíte com Vista",
  "Ingressos Inclusos",
  "Wi-Fi Alta Velocidade",
  "Open Bar Nacional",
];

export function ClassifiedTravelSection({
  onOpenTravelStudio,
  travelVisibilityMode,
  onTravelVisibilityModeChange,
  travelIsCustomQuote,
  onTravelIsCustomQuoteChange,
  travelAdultsCount,
  onTravelAdultsCountChange,
  travelChildrenCount,
  onTravelChildrenCountChange,
  travelChildrenMaxAge,
  onTravelChildrenMaxAgeChange,
  travelDuration,
  onTravelDurationChange,
  travelMealPlan,
  onTravelMealPlanChange,
  travelGuests,
  onTravelGuestsChange,
  travelDates,
  onTravelDatesChange,
  travelDestinationCity,
  onTravelDestinationCityChange,
  travelDepartureDate,
  onTravelDepartureDateChange,
  travelReturnDate,
  onTravelReturnDateChange,
  travelTransportType,
  onTravelTransportTypeChange,
  travelDepartureIATA,
  onTravelDepartureIATAChange,
  travelArrivalIATA,
  onTravelArrivalIATAChange,
  travelAirline,
  onTravelAirlineChange,
  travelConnections,
  onTravelConnectionsChange,
  travelConnectionCity,
  onTravelConnectionCityChange,
  travelDepartureTime,
  onTravelDepartureTimeChange,
  travelArrivalTime,
  onTravelArrivalTimeChange,
  travelFlightPrice,
  onTravelFlightPriceChange,
  travelFlightDuration,
  onTravelFlightDurationChange,
  travelBaggagePersonalItem,
  onTravelBaggagePersonalItemChange,
  travelBaggageCarryOn,
  onTravelBaggageCarryOnChange,
  travelBaggageChecked,
  onTravelBaggageCheckedChange,
  travelBusCategory,
  onTravelBusCategoryChange,
  travelBusCompany,
  onTravelBusCompanyChange,
  travelDepartureCity,
  onTravelDepartureCityChange,
  travelMeetingPoint,
  onTravelMeetingPointChange,
  travelReturnDepartureTime,
  onTravelReturnDepartureTimeChange,
  travelBoardingGatewayInput,
  onTravelBoardingGatewayInputChange,
  travelBoardingGateways,
  onAddGateway,
  onRemoveGateway,
  travelGuideService,
  onTravelGuideServiceChange,
  travelComboFromIATA,
  onTravelComboFromIATAChange,
  travelComboToIATA,
  onTravelComboToIATAChange,
  travelComboAirline,
  onTravelComboAirlineChange,
  travelComboFlightPrice,
  onTravelComboFlightPriceChange,
  travelTransferVehicle,
  onTravelTransferVehicleChange,
  travelTransferDuration,
  onTravelTransferDurationChange,
  travelTransferFrom,
  onTravelTransferFromChange,
  travelTransferTo,
  onTravelTransferToChange,
  travelTransferTime,
  onTravelTransferTimeChange,
  travelComboNotes,
  onTravelComboNotesChange,
  travelShipName,
  onTravelShipNameChange,
  travelCruiseLine,
  onTravelCruiseLineChange,
  travelCabinCategory,
  onTravelCabinCategoryChange,
  travelEmbarkationPort,
  onTravelEmbarkationPortChange,
  travelDepartureOptions,
  onAddDeparture,
  onUpdateDeparture,
  onRemoveDeparture,
  travelBioBullets,
  onTravelBioBulletsChange,
  onAddTravelBullet,
  onUpdateTravelBullet,
  onMoveTravelBullet,
  onRemoveTravelBullet,
  travelLodgings,
  onAddTravelLodging,
  onUpdateTravelLodging,
  onRemoveTravelLodging,
  travelStoryHighlights,
  onTravelStoryHighlightsChange,
  travelItineraryDays,
  onTravelItineraryDaysChange,
}: ClassifiedTravelSectionProps) {
  return (
    <div className="bg-card rounded-lg p-4 sm:p-5 space-y-6 border border-border/60">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/40 w-full">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-foreground">
          <Plane className="size-4 text-primary shrink-0" />
          <span>Detalhes da Viagem</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenTravelStudio}
          className="h-11 min-h-11 px-4 text-xs font-semibold gap-2 border-primary/40 text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Compass className="size-4 shrink-0 text-primary" />
          <span>Estúdio de Divulgação (Story 9:16 + WhatsApp)</span>
        </Button>
      </div>

      {/* 2.0 — Modo de Visibilidade & Orçamento Privado */}
      <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Visibilidade & Formato Comercial
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-foreground font-medium">Modo de Exibição</Label>
            <Select
              value={travelVisibilityMode}
              onValueChange={(v) => onTravelVisibilityModeChange(v as "public" | "unlisted" | "private")}
            >
              <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Público na Vitrine & Catálogo</SelectItem>
                <SelectItem value="unlisted">Não Listado (Apenas Link Direto p/ Cliente)</SelectItem>
                <SelectItem value="private">Rascunho Interno Privado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-foreground font-medium">Tipo de Oferta</Label>
            <Select
              value={travelIsCustomQuote ? "custom_quote" : "standard_package"}
              onValueChange={(v) => onTravelIsCustomQuoteChange(v === "custom_quote")}
            >
              <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard_package">Pacote de Vitrine (CTA: Garantir Reserva)</SelectItem>
                <SelectItem value="custom_quote">Orçamento Sob Medida (CTA: Aceitar Orçamento)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Composição Exata de Passageiros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40">
          <div className="space-y-1">
            <Label className="text-xs text-foreground font-medium">Qtd. Adultos no Pacote</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={travelAdultsCount}
              onChange={(e) => onTravelAdultsCountChange(Math.max(1, Number(e.target.value) || 1))}
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-foreground font-medium">Qtd. Crianças no Pacote</Label>
            <Input
              type="number"
              min={0}
              max={10}
              value={travelChildrenCount}
              onChange={(e) => onTravelChildrenCountChange(Math.max(0, Number(e.target.value) || 0))}
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-foreground font-medium">Idade Máx. Criança (Anos)</Label>
            <Input
              type="number"
              min={1}
              max={17}
              value={travelChildrenMaxAge}
              onChange={(e) => onTravelChildrenMaxAgeChange(Math.max(1, Number(e.target.value) || 12))}
              className="h-11 rounded-lg text-xs bg-background font-mono"
            />
          </div>
        </div>
      </div>

      {/* 2.1 — Resumo Rápido: Duração, Regime, Hóspedes */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resumo do Pacote</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-foreground font-medium">Duração (Ex: 5D / 4N)</Label>
            <Input
              value={travelDuration}
              onChange={(e) => onTravelDurationChange(e.target.value)}
              placeholder="5D / 4N"
              className="h-11 rounded-lg text-xs bg-background font-medium"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-foreground font-medium">Regime</Label>
            <Select value={travelMealPlan} onValueChange={onTravelMealPlanChange}>
              <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Inclusive">All Inclusive (Tudo Incluso)</SelectItem>
                <SelectItem value="Pensão Completa">Pensão Completa (Café, Almoço, Jantar)</SelectItem>
                <SelectItem value="Meia Pensão">Meia Pensão (Café e Jantar)</SelectItem>
                <SelectItem value="Café da Manhã">Café da Manhã Incluso</SelectItem>
                <SelectItem value="Só Hospedagem">Só Hospedagem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-foreground font-medium">Hóspedes Indicados (Rótulo)</Label>
            <Input
              value={travelGuests}
              onChange={(e) => onTravelGuestsChange(e.target.value)}
              placeholder="Ex: 2 Adultos + 1 Criança"
              className="h-11 rounded-lg text-xs bg-background font-medium"
            />
          </div>
        </div>
      </div>

      {/* 2.2 — Datas e Destino */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Datas e Destino</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-foreground font-medium">Datas (texto livre)</Label>
            <Input
              value={travelDates}
              onChange={(e) => onTravelDatesChange(e.target.value)}
              placeholder="Ex: 23/10 a 27/10/2026"
              className="h-11 rounded-lg text-xs bg-background font-medium"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-foreground font-medium">Cidade Destino (para clima real)</Label>
            <Input
              value={travelDestinationCity}
              onChange={(e) => onTravelDestinationCityChange(e.target.value)}
              placeholder="Ex: Jericoacoara, CE"
              className="h-11 rounded-lg text-xs bg-background font-medium"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-foreground font-medium">Data de Saída</Label>
            <Input
              type="date"
              value={travelDepartureDate}
              onChange={(e) => onTravelDepartureDateChange(e.target.value)}
              className="h-11 rounded-lg text-xs bg-background font-medium"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-foreground font-medium">Data de Retorno</Label>
            <Input
              type="date"
              value={travelReturnDate}
              onChange={(e) => onTravelReturnDateChange(e.target.value)}
              className="h-11 rounded-lg text-xs bg-background font-medium"
            />
          </div>
        </div>

        {travelDestinationCity && <WeatherWidget city={travelDestinationCity} className="mt-2" />}
      </div>

      {/* 2.3 — Transporte Adaptativo */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <RouteIcon className="size-4 text-primary" />
            Logística de Transporte
          </p>
          <Badge variant="outline" className="text-xs font-mono text-primary bg-primary/10 border-primary/30">
            {CANONICAL_TRANSPORT_TYPES.find((t) => t.id === travelTransportType)?.label || "Selecione"}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {CANONICAL_TRANSPORT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTravelTransportTypeChange(t.id)}
              className={cn(
                "px-3 py-2 min-h-11 rounded-lg border text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none",
                travelTransportType === t.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border/50 text-muted-foreground hover:border-primary/50 hover:text-primary",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* AÉREO */}
        {travelTransportType === "airplane" && (
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Plane className="size-4" /> Detalhes do Voo
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <AirportCombobox
                  label="Aeroporto de Saída (IATA)"
                  value={travelDepartureIATA}
                  onChange={onTravelDepartureIATAChange}
                  placeholder="Buscar saída (ex: XAP, GRU)..."
                  showAirportLink={true}
                />
              </div>
              <div className="space-y-2">
                <AirportCombobox
                  label="Aeroporto de Chegada (IATA)"
                  value={travelArrivalIATA}
                  onChange={onTravelArrivalIATAChange}
                  placeholder="Buscar chegada (ex: FOR, MIA)..."
                  showAirportLink={true}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Companhia Aérea</Label>
                <Select value={travelAirline} onValueChange={onTravelAirlineChange}>
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CANONICAL_AIRLINES.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Conexões / Escalas</Label>
                <Select value={String(travelConnections)} onValueChange={(v) => onTravelConnectionsChange(Number(v))}>
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Voo Direto (sem escala)</SelectItem>
                    <SelectItem value="1">1 Conexão</SelectItem>
                    <SelectItem value="2">2 Conexões</SelectItem>
                    <SelectItem value="3">3+ Conexões</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {travelConnections > 0 && (
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs font-medium">Aeroporto / Cidade de Conexão</Label>
                  <Input
                    value={travelConnectionCity}
                    onChange={(e) => onTravelConnectionCityChange(e.target.value)}
                    placeholder="Ex: Aeroporto Internacional de Guarulhos (GRU)"
                    className="h-11 rounded-lg text-xs bg-background"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Horário Embarque</Label>
                <Input
                  type="time"
                  value={travelDepartureTime}
                  onChange={(e) => onTravelDepartureTimeChange(e.target.value)}
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Horário Chegada (Destino)</Label>
                <Input
                  type="time"
                  value={travelArrivalTime}
                  onChange={(e) => onTravelArrivalTimeChange(e.target.value)}
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Estimativa de Preço do Aéreo</Label>
                <Input
                  value={travelFlightPrice}
                  onChange={(e) => onTravelFlightPriceChange(e.target.value)}
                  placeholder="Ex: R$ 1.139+"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Duração do Voo</Label>
                <Input
                  value={travelFlightDuration}
                  onChange={(e) => onTravelFlightDurationChange(e.target.value)}
                  placeholder="Ex: 2h 15min"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
            </div>

            {/* Franquia de Bagagem */}
            <div className="pt-3 border-t border-border/40 space-y-2">
              <Label className="text-xs font-semibold text-foreground">Franquia de Bagagem Inclusa</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onTravelBaggagePersonalItemChange((p) => !p)}
                  className={cn(
                    "h-11 min-h-11 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    travelBaggagePersonalItem
                      ? "bg-secondary border-primary text-foreground"
                      : "bg-background border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span>Item Pessoal (10kg)</span>
                  <span>{travelBaggagePersonalItem ? "Incluso" : "Não"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTravelBaggageCarryOnChange((p) => !p)}
                  className={cn(
                    "h-11 min-h-11 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    travelBaggageCarryOn
                      ? "bg-secondary border-primary text-foreground"
                      : "bg-background border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span>Bagagem de Mão (10kg)</span>
                  <span>{travelBaggageCarryOn ? "Inclusa" : "Não"}</span>
                </button>
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium shrink-0">Despachada (23kg):</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    value={travelBaggageChecked}
                    onChange={(e) => onTravelBaggageCheckedChange(Math.max(0, Number(e.target.value) || 0))}
                    className="h-11 rounded-lg text-xs bg-background font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TERRESTRE / EXCURSÃO */}
        {travelTransportType === "bus" && (
          <div className="rounded-lg border border-border bg-muted p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Bus className="size-4" /> Excursão Rodoviária
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Categoria do Veículo</Label>
                <Select value={travelBusCategory} onValueChange={onTravelBusCategoryChange}>
                  <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CANONICAL_BUS_CATEGORIES.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Empresa / Fretadora</Label>
                <Input
                  value={travelBusCompany}
                  onChange={(e) => onTravelBusCompanyChange(e.target.value)}
                  placeholder="Ex: Expresso Itapemirim, Fretur SC..."
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Cidade de Saída / Embarque (Origem)</Label>
                <Input
                  value={travelDepartureCity}
                  onChange={(e) => onTravelDepartureCityChange(e.target.value)}
                  placeholder="Ex: Chapecó, SC"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Cidade de Destino da Viagem (sincronizada)</Label>
                <Input
                  value={travelDestinationCity}
                  onChange={(e) => onTravelDestinationCityChange(e.target.value)}
                  placeholder="Ex: Beto Carrero / Penha, SC"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Horário de Embarque (Saída)</Label>
                <Input
                  type="time"
                  value={travelDepartureTime}
                  onChange={(e) => onTravelDepartureTimeChange(e.target.value)}
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label className="text-xs font-medium">Ponto de Encontro / Embarque</Label>
                <Input
                  value={travelMeetingPoint}
                  onChange={(e) => onTravelMeetingPointChange(e.target.value)}
                  placeholder="Ex: Posto Bertaso (Rod. SC-480), Chapecó — 22:00h"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Horário Previsto de Retorno</Label>
                <Input
                  type="time"
                  value={travelReturnDepartureTime}
                  onChange={(e) => onTravelReturnDepartureTimeChange(e.target.value)}
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tempo Total de Percurso</Label>
                <Input
                  value={travelFlightDuration}
                  onChange={(e) => onTravelFlightDurationChange(e.target.value)}
                  placeholder="Ex: 12h (ida), 14h (volta)"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
            </div>

            {/* Embarques na Rota */}
            <div className="space-y-2">
              <Label className="text-xs font-medium flex items-center gap-2">
                <Navigation className="size-4 text-primary" />
                Pontos de Embarque na Rota
              </Label>
              <p className="text-xs text-muted-foreground">
                Cidades ou paradas onde passageiros embarcam ao longo da rota (em ordem).
              </p>
              <div className="flex gap-2">
                <Input
                  value={travelBoardingGatewayInput}
                  onChange={(e) => onTravelBoardingGatewayInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAddGateway();
                    }
                  }}
                  placeholder="Ex: Xaxim, Xanxerê, Joaçaba..."
                  className="h-11 min-h-11 rounded-lg text-xs bg-background flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddGateway}
                  className="h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border-border bg-card text-foreground hover:bg-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  + Adicionar
                </Button>
              </div>
              {travelBoardingGateways.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {travelBoardingGateways.map((gw) => (
                    <span
                      key={gw}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-secondary border border-border text-xs font-medium text-foreground"
                    >
                      <Navigation className="size-4" />
                      {gw}
                      <button
                        type="button"
                        onClick={() => onRemoveGateway(gw)}
                        className="size-11 min-h-11 min-w-11 hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-800 dark:hover:text-rose-200 rounded-lg flex items-center justify-center ml-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <X className="size-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Serviço de Guia Turístico</Label>
              <Select value={travelGuideService} onValueChange={onTravelGuideServiceChange}>
                <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
                  <SelectValue placeholder="Selecione o serviço de guia..." />
                </SelectTrigger>
                <SelectContent>
                  {CANONICAL_GUIDE_SERVICES.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* MULTIMODAL / COMBO */}
        {travelTransportType === "combo" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1">
                <Plane className="size-4" /> Trecho 1 — Voo
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <AirportCombobox
                    label="Aeroporto de Origem"
                    value={travelComboFromIATA}
                    onChange={onTravelComboFromIATAChange}
                    placeholder="Buscar origem (ex: XAP, CWB)..."
                    showAirportLink={true}
                  />
                </div>
                <div className="space-y-2">
                  <AirportCombobox
                    label="Aeroporto de Desembarque (Gateway)"
                    value={travelComboToIATA}
                    onChange={onTravelComboToIATAChange}
                    placeholder="Buscar gateway (ex: FOR, CUN)..."
                    showAirportLink={true}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Companhia Aérea</Label>
                  <Select value={travelComboAirline} onValueChange={onTravelComboAirlineChange}>
                    <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CANONICAL_AIRLINES.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Estimativa do Aéreo</Label>
                  <Input
                    value={travelComboFlightPrice}
                    onChange={(e) => onTravelComboFlightPriceChange(e.target.value)}
                    placeholder="Ex: R$ 1.139+"
                    className="h-11 rounded-lg text-xs bg-background"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-warning/60 bg-warning/30 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-warning-strong flex items-center gap-1">
                <RouteIcon className="size-4" /> Trecho 2 — Transfer Terrestre / Marítimo
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Veículo do Transfer</Label>
                  <Select value={travelTransferVehicle} onValueChange={onTravelTransferVehicleChange}>
                    <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
                      <SelectValue placeholder="Ex: 4x4 Hilux, Van..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CANONICAL_TRANSFER_VEHICLES.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Duração do Transfer</Label>
                  <Input
                    value={travelTransferDuration}
                    onChange={(e) => onTravelTransferDurationChange(e.target.value)}
                    placeholder="Ex: 4h, 2h30min"
                    className="h-11 rounded-lg text-xs bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">De (Ponto de Partida do Transfer)</Label>
                  <Input
                    value={travelTransferFrom}
                    onChange={(e) => onTravelTransferFromChange(e.target.value)}
                    placeholder="Ex: Fortaleza (Aeroporto FOR)"
                    className="h-11 rounded-lg text-xs bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Até (Destino Final)</Label>
                  <Input
                    value={travelTransferTo}
                    onChange={(e) => onTravelTransferToChange(e.target.value)}
                    placeholder="Ex: Jericoacoara, CE"
                    className="h-11 rounded-lg text-xs bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Horário Saída do Transfer</Label>
                  <Input
                    type="time"
                    value={travelTransferTime}
                    onChange={(e) => onTravelTransferTimeChange(e.target.value)}
                    className="h-11 rounded-lg text-xs bg-background font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Serviço de Guia no Destino</Label>
                  <Select value={travelGuideService} onValueChange={onTravelGuideServiceChange}>
                    <SelectTrigger className="h-11 rounded-lg text-xs bg-background font-medium">
                      <SelectValue placeholder="Serviço de guia..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CANONICAL_GUIDE_SERVICES.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-xs font-medium">Observações do Roteiro Multimodal</Label>
                  <Input
                    value={travelComboNotes}
                    onChange={(e) => onTravelComboNotesChange(e.target.value)}
                    placeholder="Ex: Transfer privativo, recomendamos cabine com mochila 30L..."
                    className="h-11 rounded-lg text-xs bg-background"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CRUZEIRO */}
        {travelTransportType === "cruise" && (
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Ship className="size-4" /> Detalhes do Cruzeiro
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Nome do Navio</Label>
                <Input
                  value={travelShipName}
                  onChange={(e) => onTravelShipNameChange(e.target.value)}
                  placeholder="Ex: MSC Grandiosa"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Armadora / Linha de Cruzeiros</Label>
                <Input
                  value={travelCruiseLine}
                  onChange={(e) => onTravelCruiseLineChange(e.target.value)}
                  placeholder="Ex: MSC Cruzeiros, Costa Cruceros..."
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Categoria da Cabine</Label>
                <Input
                  value={travelCabinCategory}
                  onChange={(e) => onTravelCabinCategoryChange(e.target.value)}
                  placeholder="Ex: Cabine Interior, Balcão, Suite"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Porto de Embarque</Label>
                <Input
                  value={travelEmbarkationPort}
                  onChange={(e) => onTravelEmbarkationPortChange(e.target.value)}
                  placeholder="Ex: Terminal de Passageiros Santos, SP"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Horário Embarque</Label>
                <Input
                  type="time"
                  value={travelDepartureTime}
                  onChange={(e) => onTravelDepartureTimeChange(e.target.value)}
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Duração do Cruzeiro</Label>
                <Input
                  value={travelFlightDuration}
                  onChange={(e) => onTravelFlightDurationChange(e.target.value)}
                  placeholder="Ex: 7 noites, 8 dias"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
            </div>
          </div>
        )}

        {/* TREM */}
        {travelTransportType === "train" && (
          <div className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Train className="size-4" /> Detalhes do Trem
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Estação de Partida</Label>
                <Input
                  value={travelMeetingPoint}
                  onChange={(e) => onTravelMeetingPointChange(e.target.value)}
                  placeholder="Ex: Estação da Luz — São Paulo, SP"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Horário de Partida</Label>
                <Input
                  type="time"
                  value={travelDepartureTime}
                  onChange={(e) => onTravelDepartureTimeChange(e.target.value)}
                  className="h-11 rounded-lg text-xs bg-background font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Classe / Categoria</Label>
                <Input
                  value={travelBusCategory}
                  onChange={(e) => onTravelBusCategoryChange(e.target.value)}
                  placeholder="Ex: Classe Econômica, Primeira Classe..."
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Duração do Percurso</Label>
                <Input
                  value={travelFlightDuration}
                  onChange={(e) => onTravelFlightDurationChange(e.target.value)}
                  placeholder="Ex: 3h 40min"
                  className="h-11 rounded-lg text-xs bg-background"
                />
              </div>
            </div>
          </div>
        )}

        {/* CARRO PRÓPRIO / HOTEL ONLY */}
        {(travelTransportType === "car" || travelTransportType === "hotel_only") && (
          <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
            <p className="text-xs text-muted-foreground">
              {travelTransportType === "car"
                ? "O passageiro viajará de carro próprio ou alugado até o destino. Preencha o roteiro e hospedagem abaixo."
                : "Pacote local / hospedagem + passeios. Transporte até o destino por conta do passageiro."}
            </p>
            <div className="mt-3 space-y-2">
              <Label className="text-xs font-medium">Ponto de Check-in / Encontro no Destino</Label>
              <Input
                value={travelMeetingPoint}
                onChange={(e) => onTravelMeetingPointChange(e.target.value)}
                placeholder="Ex: Hotel Costa Brava — Recepção — 14:00h"
                className="h-11 rounded-lg text-xs bg-background"
              />
            </div>
          </div>
        )}

        {/* MÚLTIPLAS SAÍDAS / DATAS */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              Saídas Confirmadas
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddDeparture}
              className="h-11 min-h-11 text-xs font-semibold rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus className="size-4" /> Adicionar Saída
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Cadastre múltiplas datas de saída. O cliente verá todas as opções disponíveis no anúncio.
          </p>

          {travelDepartureOptions.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 text-center border border-dashed border-border/50 rounded-lg">
              Nenhuma saída cadastrada — as datas acima serão usadas como saída única.
            </p>
          )}

          <div className="space-y-2">
            {travelDepartureOptions.map((opt, idx) => (
              <div key={opt.id} className="rounded-lg border border-border/50 bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Saída {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveDeparture(opt.id)}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring size-11 min-h-11 min-w-11 rounded-lg text-destructive hover:bg-destructive/10 flex items-center justify-center cursor-pointer"
                    aria-label={`Remover saída ${idx + 1}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Label (Opcional)</label>
                    <input
                      type="text"
                      value={opt.label || ""}
                      onChange={(e) => onUpdateDeparture(opt.id, { label: e.target.value })}
                      placeholder="Ex: Carnaval 2026"
                      className="w-full h-11 min-h-11 px-2 rounded-lg border border-border/60 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Data de Saída</label>
                    <input
                      type="date"
                      value={opt.departure_date}
                      onChange={(e) => onUpdateDeparture(opt.id, { departure_date: e.target.value })}
                      className="w-full h-11 min-h-11 px-2 rounded-lg border border-border/60 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Data de Retorno</label>
                    <input
                      type="date"
                      value={opt.return_date}
                      onChange={(e) => onUpdateDeparture(opt.id, { return_date: e.target.value })}
                      className="w-full h-11 min-h-11 px-2 rounded-lg border border-border/60 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <select
                      value={opt.status}
                      onChange={(e) => onUpdateDeparture(opt.id, { status: e.target.value as DepartureStatus })}
                      className="w-full h-11 min-h-11 px-2 rounded-lg border border-border/60 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {(Object.keys(DEPARTURE_STATUS_CONFIG) as DepartureStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {DEPARTURE_STATUS_CONFIG[s].icon} {DEPARTURE_STATUS_CONFIG[s].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Horário Embarque</label>
                    <input
                      type="time"
                      value={opt.departure_time || ""}
                      onChange={(e) => onUpdateDeparture(opt.id, { departure_time: e.target.value })}
                      className="w-full h-11 min-h-11 px-2 rounded-lg border border-border/60 bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Vagas Disponíveis</label>
                    <input
                      type="number"
                      min={0}
                      value={opt.available_seats ?? ""}
                      onChange={(e) =>
                        onUpdateDeparture(opt.id, { available_seats: e.target.value ? Number(e.target.value) : undefined })
                      }
                      placeholder="Ex: 42"
                      className="w-full h-11 min-h-11 px-2 rounded-lg border border-border/60 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Observação</label>
                    <input
                      type="text"
                      value={opt.notes || ""}
                      onChange={(e) => onUpdateDeparture(opt.id, { notes: e.target.value })}
                      placeholder="Ex: Pacote diferenciado"
                      className="w-full h-11 min-h-11 px-2 rounded-lg border border-border/60 bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2.4 — Diferenciais do Pacote */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Diferenciais do Pacote
            </p>
            <p className="text-xs text-muted-foreground">
              Campos livres dinâmicos. Adicione quantos diferenciais e benefícios desejar.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddTravelBullet}
            className="h-11 min-h-11 text-xs font-semibold rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="size-4" />
            <span>Adicionar</span>
          </Button>
        </div>

        <div className="space-y-2">
          {travelBioBullets.map((bullet, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground w-4 text-center shrink-0">
                {idx + 1}.
              </span>
              <Input
                value={bullet}
                onChange={(e) => onUpdateTravelBullet(idx, e.target.value)}
                placeholder={`Diferencial ${idx + 1} (ex: All Inclusive, Voo Incluso, Pé na Areia, Vista Panorâmica...)`}
                className="h-11 min-h-11 rounded-lg text-xs bg-background flex-1"
              />
              <div className="flex items-center gap-1 shrink-0">
                {travelBioBullets.length > 1 && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={idx === 0}
                      onClick={() => onMoveTravelBullet(idx, "up")}
                      className="h-11 min-h-11 w-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      title="Mover para cima"
                      aria-label="Mover para cima"
                    >
                      <ChevronUp className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={idx === travelBioBullets.length - 1}
                      onClick={() => onMoveTravelBullet(idx, "down")}
                      className="h-11 min-h-11 w-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      title="Mover para baixo"
                      aria-label="Mover para baixo"
                    >
                      <ChevronDown className="size-3" />
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveTravelBullet(idx)}
                  className="h-11 min-h-11 w-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title={travelBioBullets.length === 1 ? "Limpar campo" : "Remover diferencial"}
                  aria-label="Remover diferencial"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddTravelBullet}
            className="w-full h-11 min-h-11 text-xs font-medium border-dashed border-border/70 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary rounded-lg gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary mt-1"
          >
            <Plus className="size-4" />
            <span>Adicionar outro diferencial</span>
          </Button>
        </div>

        {/* Sugestões Rápidas */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs text-muted-foreground font-medium">Sugestões rápidas:</span>
          {TRAVEL_QUICK_BULLETS.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => {
                onTravelBioBulletsChange((prev) => {
                  if (prev.length > 0 && !prev[prev.length - 1].trim()) {
                    const next = [...prev];
                    next[next.length - 1] = sug;
                    return next;
                  }
                  return [...prev, sug];
                });
              }}
              className="text-xs px-2 py-1 rounded-lg border border-border/60 bg-muted/40 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary text-muted-foreground"
            >
              + {sug}
            </button>
          ))}
        </div>
      </div>

      {/* 2.5 — Hospedagem & Hotel do Pacote */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <span>Hospedagem & Hotel do Pacote</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Adicione os dados da acomodação (resort, hotel, pousada). Suporta múltiplos hotéis ou estadias combinadas.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddTravelLodging}
            className="h-11 min-h-11 text-xs font-semibold rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Plus className="size-4" />
            <span>Adicionar Hotel / Hospedagem</span>
          </Button>
        </div>

        {travelLodgings.length === 0 && (
          <div className="p-4 rounded-lg border border-dashed border-border/70 text-center space-y-2 bg-muted/10">
            <p className="text-xs text-muted-foreground">Nenhuma hospedagem cadastrada para este pacote.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddTravelLodging}
              className="h-11 min-h-11 text-xs font-semibold rounded-lg gap-2 border-primary/40 text-primary hover:bg-primary/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Plus className="size-4" />
              <span>Cadastrar Hotel / Pousada</span>
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {travelLodgings.map((lodging, idx) => (
            <div key={lodging.id} className="p-4 rounded-lg border border-border/70 bg-card space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <span className="size-6 rounded-md bg-primary/10 text-primary font-bold text-xs flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {lodging.name ? lodging.name : `Hospedagem ${idx + 1}`}
                  </span>
                  {lodging.stars ? (
                    <Badge variant="outline" className="text-xs font-bold text-warning-strong border-warning/30">
                      {lodging.stars} estrelas
                    </Badge>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveTravelLodging(lodging.id)}
                  className="size-11 min-h-11 min-w-11 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  title="Remover Hospedagem"
                  aria-label="Remover Hospedagem"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs font-medium text-foreground">Nome do Hotel / Pousada / Resort *</Label>
                  <Input
                    value={lodging.name}
                    onChange={(e) => onUpdateTravelLodging(lodging.id, { name: e.target.value })}
                    placeholder="Ex: Nannai Muro Alto Resort ou Hotel Costa Brava"
                    className="h-11 rounded-lg text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Tipo de Hospedagem</Label>
                  <Select
                    value={lodging.type || "hotel"}
                    onValueChange={(v) => onUpdateTravelLodging(lodging.id, { type: v as TravelLodging["type"] })}
                  >
                    <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resort">Resort</SelectItem>
                      <SelectItem value="hotel">Hotel</SelectItem>
                      <SelectItem value="pousada">Pousada</SelectItem>
                      <SelectItem value="flat">Flat / Apart-hotel</SelectItem>
                      <SelectItem value="hostel">Hostel</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Regime de Alimentação</Label>
                  <Select
                    value={lodging.regime || "Café da Manhã"}
                    onValueChange={(v) => onUpdateTravelLodging(lodging.id, { regime: v })}
                  >
                    <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Inclusive">All Inclusive (Tudo Incluso)</SelectItem>
                      <SelectItem value="Pensão Completa">Pensão Completa</SelectItem>
                      <SelectItem value="Meia Pensão">Meia Pensão</SelectItem>
                      <SelectItem value="Café da Manhã">Café da Manhã Incluso</SelectItem>
                      <SelectItem value="Só Hospedagem">Só Hospedagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Classificação (Estrelas)</Label>
                  <Select
                    value={String(lodging.stars || 4)}
                    onValueChange={(v) => onUpdateTravelLodging(lodging.id, { stars: Number(v) })}
                  >
                    <SelectTrigger className="h-11 rounded-lg text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 Estrelas (Luxo)</SelectItem>
                      <SelectItem value="4">4 Estrelas (Superior)</SelectItem>
                      <SelectItem value="3">3 Estrelas (Conforto)</SelectItem>
                      <SelectItem value="2">2 Estrelas (Econômico)</SelectItem>
                      <SelectItem value="1">1 Estrela (Simples)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Categoria do Quarto / Acomodação</Label>
                  <Input
                    value={lodging.room_category || ""}
                    onChange={(e) => onUpdateTravelLodging(lodging.id, { room_category: e.target.value })}
                    placeholder="Ex: Suíte Standard, Bangalô Luxo..."
                    className="h-11 rounded-lg text-xs bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Cidade / Destino da Hospedagem</Label>
                  <Input
                    value={lodging.city || ""}
                    onChange={(e) => onUpdateTravelLodging(lodging.id, { city: e.target.value })}
                    placeholder="Ex: Porto de Galinhas, PE"
                    className="h-11 rounded-lg text-xs bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Endereço / Localização Exata</Label>
                  <Input
                    value={lodging.address || ""}
                    onChange={(e) => onUpdateTravelLodging(lodging.id, { address: e.target.value })}
                    placeholder="Ex: Av. Beira Mar, 1200 - Centro"
                    className="h-11 rounded-lg text-xs bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Horário Check-in</Label>
                  <Input
                    value={lodging.checkin_time || "14:00"}
                    onChange={(e) => onUpdateTravelLodging(lodging.id, { checkin_time: e.target.value })}
                    placeholder="14:00"
                    className="h-11 rounded-lg text-xs bg-background font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Horário Check-out</Label>
                  <Input
                    value={lodging.checkout_time || "11:00"}
                    onChange={(e) => onUpdateTravelLodging(lodging.id, { checkout_time: e.target.value })}
                    placeholder="11:00"
                    className="h-11 rounded-lg text-xs bg-background font-mono"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-medium text-foreground">Código de Reserva / Voucher (Opcional)</Label>
                  <Input
                    value={lodging.booking_code || ""}
                    onChange={(e) => onUpdateTravelLodging(lodging.id, { booking_code: e.target.value })}
                    placeholder="Ex: HTR-88291"
                    className="h-11 rounded-lg text-xs bg-background font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Descrição da Estrutura & Lazer do Hotel</Label>
                <Textarea
                  value={lodging.description || ""}
                  onChange={(e) => onUpdateTravelLodging(lodging.id, { description: e.target.value })}
                  placeholder="Descreva as piscinas, restaurantes, localização em relação à praia ou pontos turísticos..."
                  rows={2}
                  className="text-xs rounded-lg bg-background resize-none"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <Label className="text-xs font-semibold text-foreground">Comodidades do Hotel & Estrutura</Label>
                <div className="flex flex-wrap gap-2">
                  {CANONICAL_LODGING_AMENITIES.map((amenity) => {
                    const isSelected = (lodging.amenities || []).includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => {
                          const nextAmenities = isSelected
                            ? (lodging.amenities || []).filter((a) => a !== amenity)
                            : [...(lodging.amenities || []), amenity];
                          onUpdateTravelLodging(lodging.id, { amenities: nextAmenities });
                        }}
                        className={cn(
                          "h-11 px-3 rounded-md text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isSelected
                            ? "bg-primary/10 border-primary/40 text-primary"
                            : "bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted/70",
                        )}
                      >
                        {isSelected && <Check className="size-3 shrink-0" />}
                        <span>{amenity}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border/40">
                <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <ImagePlus className="size-4 text-primary" />
                  <span>Fotos da Hospedagem ({(lodging.photos || []).length})</span>
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  {(lodging.photos || []).map((photoUrl, pIdx) => (
                    <div key={pIdx} className="relative size-16 rounded-lg overflow-hidden border border-border/60 bg-muted group shrink-0">
                      <img src={photoUrl} alt={`Foto ${pIdx + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const nextPhotos = (lodging.photos || []).filter((_, i) => i !== pIdx);
                          onUpdateTravelLodging(lodging.id, { photos: nextPhotos });
                        }}
                        className="absolute top-1 right-1 size-11 min-h-11 min-w-11 rounded-md bg-neutral-950/80 hover:bg-destructive text-neutral-100 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        title="Remover foto"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  <label className="size-16 rounded-lg border border-dashed border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 flex flex-col items-center justify-center cursor-pointer transition-colors text-muted-foreground hover:text-foreground shrink-0">
                    <ImagePlus className="size-4 mb-1" />
                    <span className="text-xs font-semibold">+ Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const url = await uploadClassifiedMedia(file, "lodging");
                          if (url) {
                            const current = lodging.photos || [];
                            onUpdateTravelLodging(lodging.id, { photos: [...current, url] });
                          }
                        } catch {
                          toast.error("Erro ao enviar foto do hotel");
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2.6 — Story Highlights */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <ImagePlus className="size-4 text-primary" />
          <span>Destaques Visuais</span>
        </p>
        <Suspense fallback={null}>
          <StoryHighlightUploader
            highlights={travelStoryHighlights}
            onChange={onTravelStoryHighlightsChange}
            onUpload={(file) => uploadClassifiedMedia(file, "highlights")}
            maxHighlights={8}
          />
        </Suspense>
      </div>

      {/* 2.7 — Roteiro Dia a Dia */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Roteiro Dia a Dia</p>
        <Suspense fallback={null}>
          <ItineraryDayEditor
            days={travelItineraryDays}
            onChange={onTravelItineraryDaysChange}
            onUploadImage={(file) => uploadClassifiedMedia(file, "itinerary")}
          />
        </Suspense>
      </div>
    </div>
  );
}
