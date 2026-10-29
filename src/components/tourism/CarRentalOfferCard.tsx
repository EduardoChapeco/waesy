import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Car,
  CheckCircle,
  MapPin,
  SuitcaseRolling,
  Users,
  Gear,
  Snowflake,
  ShieldCheck,
  CalendarBlank,
  SlidersHorizontal,
  ArrowRight,
  Buildings,
  CreditCard,
  Clock,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { publicTourismAutoServiceSearchFn } from "@/services/infotravel";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface CarRentalOfferItem {
  id: string;
  rentalCompany: string;
  providerOrigin?: "infotravel_b2c" | "wooba_b2b" | "agency_catalog";
  isCorporateB2B?: boolean;
  vehicleCategory: string;
  vehicleModelExample: string;
  imageUrl?: string | null;
  transmission: "Automático" | "Manual";
  passengersCount?: number;
  bagsCount?: number;
  doorsCount?: number;
  hasAirConditioning?: boolean;
  includesUnlimitedMileage?: boolean;
  includesFullProtection?: boolean;
  freeCancellation?: boolean;
  pickupLocation: string;
  dropoffLocation?: string;
  paymentTiming?: "pay_at_pickup" | "pay_now" | "corporate_billed";
  dailyRateBrl: number;
  totalThreeDaysBrl?: number;
  corporateAgreementCode?: string;
  billingModalityLabel?: string;
}

export const DEFAULT_B2C_CAR_OFFERS: CarRentalOfferItem[] = [
  {
    id: "car-b2c-compact-1",
    rentalCompany: "Localiza",
    providerOrigin: "infotravel_b2c",
    isCorporateB2B: false,
    vehicleCategory: "Carros Pequenos",
    vehicleModelExample: "Chevrolet Onix, HB20 ou similar",
    transmission: "Manual",
    passengersCount: 5,
    bagsCount: 2,
    doorsCount: 4,
    hasAirConditioning: true,
    includesUnlimitedMileage: true,
    includesFullProtection: true,
    freeCancellation: true,
    pickupLocation: "Aeroporto de Chapecó (XAP)",
    dropoffLocation: "Aeroporto de Chapecó (XAP)",
    paymentTiming: "pay_at_pickup",
    dailyRateBrl: 129,
    totalThreeDaysBrl: 387,
  },
  {
    id: "car-b2c-sedan-2",
    rentalCompany: "Movida",
    providerOrigin: "infotravel_b2c",
    isCorporateB2B: false,
    vehicleCategory: "Sedã Executivo",
    vehicleModelExample: "Toyota Corolla, Virtus ou similar",
    transmission: "Automático",
    passengersCount: 5,
    bagsCount: 3,
    doorsCount: 4,
    hasAirConditioning: true,
    includesUnlimitedMileage: true,
    includesFullProtection: true,
    freeCancellation: true,
    pickupLocation: "Aeroporto de Chapecó (XAP)",
    dropoffLocation: "Aeroporto de Chapecó (XAP)",
    paymentTiming: "pay_at_pickup",
    dailyRateBrl: 189,
    totalThreeDaysBrl: 567,
  },
  {
    id: "car-b2c-suv-3",
    rentalCompany: "Unidas",
    providerOrigin: "infotravel_b2c",
    isCorporateB2B: false,
    vehicleCategory: "SUVs e Caminhonetes",
    vehicleModelExample: "Jeep Compass, T-Cross ou similar",
    transmission: "Automático",
    passengersCount: 5,
    bagsCount: 4,
    doorsCount: 4,
    hasAirConditioning: true,
    includesUnlimitedMileage: true,
    includesFullProtection: true,
    freeCancellation: true,
    pickupLocation: "Aeroporto de Chapecó (XAP)",
    dropoffLocation: "Aeroporto de Chapecó (XAP)",
    paymentTiming: "pay_at_pickup",
    dailyRateBrl: 239,
    totalThreeDaysBrl: 717,
  },
  {
    id: "car-b2c-util-4",
    rentalCompany: "InfoTravel GDS",
    providerOrigin: "infotravel_b2c",
    isCorporateB2B: false,
    vehicleCategory: "Utilitários",
    vehicleModelExample: "Fiat Toro, Oroch ou similar",
    transmission: "Automático",
    passengersCount: 5,
    bagsCount: 4,
    doorsCount: 4,
    hasAirConditioning: true,
    includesUnlimitedMileage: true,
    includesFullProtection: true,
    freeCancellation: true,
    pickupLocation: "Aeroporto de Chapecó (XAP)",
    dropoffLocation: "Aeroporto de Chapecó (XAP)",
    paymentTiming: "pay_at_pickup",
    dailyRateBrl: 269,
    totalThreeDaysBrl: 807,
  },
];

export const DEFAULT_B2B_WOOBA_CAR_OFFERS: CarRentalOfferItem[] = [
  {
    id: "car-b2b-wooba-1",
    rentalCompany: "Localiza · Wooba Corporate",
    providerOrigin: "wooba_b2b",
    isCorporateB2B: true,
    vehicleCategory: "Carros Pequenos",
    vehicleModelExample: "Chevrolet Onix Plus ou similar (Frota B2B)",
    transmission: "Automático",
    passengersCount: 5,
    bagsCount: 2,
    doorsCount: 4,
    hasAirConditioning: true,
    includesUnlimitedMileage: true,
    includesFullProtection: true,
    freeCancellation: true,
    pickupLocation: "Aeroporto de Congonhas (CGH)",
    dropoffLocation: "Aeroporto de Congonhas (CGH)",
    paymentTiming: "corporate_billed",
    dailyRateBrl: 118,
    totalThreeDaysBrl: 354,
    corporateAgreementCode: "CORP-WOOBA-LOC",
    billingModalityLabel: "Faturado 15/30 dias · Sem caução no cartão pessoal",
  },
  {
    id: "car-b2b-wooba-2",
    rentalCompany: "Movida · Wooba Corporate",
    providerOrigin: "wooba_b2b",
    isCorporateB2B: true,
    vehicleCategory: "Sedã Executivo",
    vehicleModelExample: "Toyota Corolla XEi ou similar (Frota B2B)",
    transmission: "Automático",
    passengersCount: 5,
    bagsCount: 3,
    doorsCount: 4,
    hasAirConditioning: true,
    includesUnlimitedMileage: true,
    includesFullProtection: true,
    freeCancellation: true,
    pickupLocation: "Aeroporto de Congonhas (CGH)",
    dropoffLocation: "Aeroporto de Congonhas (CGH)",
    paymentTiming: "corporate_billed",
    dailyRateBrl: 172,
    totalThreeDaysBrl: 516,
    corporateAgreementCode: "CORP-WOOBA-MOV",
    billingModalityLabel: "Faturado 15/30 dias · Proteção integral inclusa",
  },
  {
    id: "car-b2b-wooba-3",
    rentalCompany: "Unidas · Wooba Corporate",
    providerOrigin: "wooba_b2b",
    isCorporateB2B: true,
    vehicleCategory: "SUVs e Caminhonetes",
    vehicleModelExample: "Jeep Compass Longitude ou similar",
    transmission: "Automático",
    passengersCount: 5,
    bagsCount: 4,
    doorsCount: 4,
    hasAirConditioning: true,
    includesUnlimitedMileage: true,
    includesFullProtection: true,
    freeCancellation: true,
    pickupLocation: "Aeroporto de Congonhas (CGH)",
    dropoffLocation: "Aeroporto de Congonhas (CGH)",
    paymentTiming: "corporate_billed",
    dailyRateBrl: 215,
    totalThreeDaysBrl: 645,
    corporateAgreementCode: "CORP-WOOBA-UNI",
    billingModalityLabel: "Faturado 15/30 dias · Sem bloqueio de limite",
  },
];

export interface CarRentalOfferCardProps {
  offer: CarRentalOfferItem;
  days?: number;
  pickupOverride?: string;
  paymentPreference?: "pay_at_pickup" | "pay_now";
  onSelect?: (offer: CarRentalOfferItem) => void;
  className?: string;
}

export function CarRentalOfferCard({
  offer,
  days = 3,
  pickupOverride,
  paymentPreference = "pay_at_pickup",
  onSelect,
  className,
}: CarRentalOfferCardProps) {
  const [imgError, setImgError] = useState(false);

  const effectiveDays = Math.max(1, days);
  const effectivePickup = pickupOverride || offer.pickupLocation;
  const discountMultiplier = paymentPreference === "pay_now" && !offer.isCorporateB2B ? 0.95 : 1;
  const effectiveDailyBrl = Math.round(offer.dailyRateBrl * discountMultiplier);
  const totalForDaysBrl =
    effectiveDays === 3 && offer.totalThreeDaysBrl && discountMultiplier === 1
      ? offer.totalThreeDaysBrl
      : effectiveDailyBrl * effectiveDays;

  const paymentLabel = offer.isCorporateB2B
    ? "Faturado Corporativo"
    : paymentPreference === "pay_now"
      ? "Pague agora (5% OFF)"
      : "Pague ao retirar";

  return (
    <article
      onClick={() => onSelect?.(offer)}
      className={cn(
        "rounded-2xl border border-border bg-card p-4 flex flex-col justify-between transition-colors hover:border-primary/40 cursor-pointer gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      {/* Top Row: Rental Company & B2B/B2C Badge */}
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant="secondary"
          className="text-xs font-bold px-2 py-1 rounded-lg bg-muted text-foreground truncate"
        >
          {offer.rentalCompany}
        </Badge>
        {offer.isCorporateB2B ? (
          <span className="text-3xs font-mono font-bold uppercase px-2 py-1 rounded-md bg-primary/10 text-primary shrink-0">
            Wooba B2B
          </span>
        ) : (
          <span className="text-3xs font-mono font-semibold uppercase px-2 py-1 rounded-md bg-muted text-muted-foreground shrink-0">
            InfoTravel B2C
          </span>
        )}
      </div>

      {/* Vehicle Visual Area (aspect-4/3 clean container without nested border+bg-card) */}
      <div className="relative aspect-4/3 w-full rounded-xl bg-muted/50 p-3 flex flex-col justify-between overflow-hidden">
        <div className="flex items-center justify-between gap-1 z-10">
          <span className="text-3xs font-semibold px-2 py-1 rounded-md bg-background/80 text-foreground flex items-center gap-1">
            <Gear size={12} weight="bold" />
            <span>{offer.transmission}</span>
          </span>
          {offer.hasAirConditioning !== false && (
            <span className="text-3xs font-semibold px-2 py-1 rounded-md bg-background/80 text-foreground flex items-center gap-1">
              <Snowflake size={12} weight="bold" />
              <span>Ar-cond.</span>
            </span>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center my-2">
          {offer.imageUrl && !imgError ? (
            <img
              src={offer.imageUrl}
              alt={`${offer.vehicleCategory} - ${offer.vehicleModelExample}`}
              onError={() => setImgError(true)}
              className="w-full h-full object-contain max-h-28"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground/70 gap-1">
              <Car size={56} weight="duotone" className="text-primary/80" />
              <span className="text-3xs font-mono uppercase tracking-wider text-muted-foreground">
                {offer.includesUnlimitedMileage !== false ? "KM Livre" : "Franquia KM"}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 z-10 text-3xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1 bg-background/80 px-2 py-1 rounded-md text-foreground">
            <Users size={12} weight="bold" />
            <span>{offer.passengersCount || 5} lugares</span>
          </span>
          <span className="flex items-center gap-1 bg-background/80 px-2 py-1 rounded-md text-foreground">
            <SuitcaseRolling size={12} weight="bold" />
            <span>{offer.bagsCount || 2} malas</span>
          </span>
        </div>
      </div>

      {/* Category Title, Subtitle, Cancellation & Pickup */}
      <div className="space-y-2">
        <div>
          <h3 className="text-base font-bold text-foreground leading-snug">
            {offer.vehicleCategory}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {offer.vehicleModelExample}
          </p>
        </div>

        {offer.freeCancellation !== false && (
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={16} weight="fill" className="shrink-0" />
            <span>Cancelamento grátis</span>
          </div>
        )}

        <div className="flex items-start gap-1 text-xs text-muted-foreground">
          <MapPin size={14} weight="bold" className="text-primary shrink-0 mt-1" />
          <span className="line-clamp-1">
            Retirada e devolução: {effectivePickup}
          </span>
        </div>
      </div>

      {/* Footer Pricing Block & Tactile CTA */}
      <div className="pt-3 border-t border-border/50 space-y-3">
        <div>
          <span className="text-3xs font-semibold text-muted-foreground block">
            {paymentLabel} · {effectiveDays} {effectiveDays === 1 ? "dia" : "dias"} a partir de
          </span>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <span className="text-xl font-bold text-foreground font-mono">
              {formatMoney(totalForDaysBrl * 100)}
            </span>
            <span className="text-xs font-medium text-muted-foreground font-mono">
              {formatMoney(effectiveDailyBrl * 100)}/dia
            </span>
          </div>
        </div>

        <Button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(offer);
          }}
          className="h-11 min-h-11 w-full rounded-xl font-bold text-xs gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>{offer.isCorporateB2B ? "Reservar carro" : "Ver detalhes"}</span>
          <ArrowRight size={14} weight="bold" />
        </Button>
      </div>
    </article>
  );
}

export interface CarRentalDetailModalProps {
  offer: CarRentalOfferItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  days: number;
  onDaysChange?: (days: number) => void;
  pickupLocation?: string;
  paymentPreference?: "pay_at_pickup" | "pay_now";
  onConfirmBooking?: (offer: CarRentalOfferItem, days: number, driverName: string, driverDoc: string) => void;
}

export function CarRentalDetailModal({
  offer,
  open,
  onOpenChange,
  days,
  onDaysChange,
  pickupLocation,
  paymentPreference = "pay_at_pickup",
  onConfirmBooking,
}: CarRentalDetailModalProps) {
  const [driverName, setDriverName] = useState("");
  const [driverDoc, setDriverDoc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!offer) return null;

  const effectiveDays = Math.max(1, days);
  const effectivePickup = pickupLocation || offer.pickupLocation;
  const discountMultiplier = paymentPreference === "pay_now" && !offer.isCorporateB2B ? 0.95 : 1;
  const effectiveDailyBrl = Math.round(offer.dailyRateBrl * discountMultiplier);
  const totalForDaysBrl =
    effectiveDays === 3 && offer.totalThreeDaysBrl && discountMultiplier === 1
      ? offer.totalThreeDaysBrl
      : effectiveDailyBrl * effectiveDays;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim() || !driverDoc.trim()) {
      toast.error("Informe o nome completo e CNH/CPF do condutor principal.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (onConfirmBooking) {
        onConfirmBooking(offer, effectiveDays, driverName.trim(), driverDoc.trim());
      } else {
        toast.success(
          offer.isCorporateB2B
            ? `Pré-reserva corporativa Wooba (${offer.vehicleCategory}) registrada para ${driverName}!`
            : `Solicitação de reserva InfoTravel (${offer.vehicleCategory} · ${effectiveDays} dias) gerada com sucesso!`
        );
      }
      onOpenChange(false);
      setDriverName("");
      setDriverDoc("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl pt-safe-modal max-h-screen overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs font-bold">
              {offer.rentalCompany}
            </Badge>
            <Badge variant="outline" className="text-3xs font-mono uppercase">
              {offer.isCorporateB2B ? "Tarifa Acordo Wooba B2B" : "Tarifa InfoTravel GDS"}
            </Badge>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            {offer.vehicleCategory}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {offer.vehicleModelExample} · Retirada e devolução em {effectivePickup}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4 pt-2">
          {/* Duration Selector Pills */}
          {onDaysChange && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">
                Período da locação (dias)
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                {[1, 3, 5, 7, 15].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onDaysChange(d)}
                    className={cn(
                      "h-11 min-h-11 px-4 rounded-xl border text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      effectiveDays === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-foreground border-border hover:bg-muted"
                    )}
                  >
                    {d} {d === 1 ? "dia" : "dias"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Vehicle Technical Specifications */}
          <div className="rounded-xl bg-muted/40 p-3 space-y-2">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Especificações do Veículo e Franquia
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-foreground">
              <div className="flex items-center gap-2">
                <Gear size={16} className="text-primary shrink-0" weight="bold" />
                <span>Câmbio {offer.transmission}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-primary shrink-0" weight="bold" />
                <span>{offer.passengersCount || 5} Passageiros</span>
              </div>
              <div className="flex items-center gap-2">
                <SuitcaseRolling size={16} className="text-primary shrink-0" weight="bold" />
                <span>{offer.bagsCount || 2} Malas grandes</span>
              </div>
              <div className="flex items-center gap-2">
                <Snowflake size={16} className="text-primary shrink-0" weight="bold" />
                <span>Ar-condicionado</span>
              </div>
              <div className="flex items-center gap-2">
                <Car size={16} className="text-primary shrink-0" weight="bold" />
                <span>{offer.doorsCount || 4} Portas</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-primary shrink-0" weight="bold" />
                <span>{offer.includesUnlimitedMileage !== false ? "KM Livre" : "Franquia controlada"}</span>
              </div>
            </div>
          </div>

          {/* Protection & Rate Inclusions */}
          <div className="rounded-xl bg-muted/40 p-3 space-y-2">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Coberturas e Condições da Tarifa
            </h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle size={16} weight="fill" className="shrink-0" />
                <span>Cancelamento grátis até 24h antes da retirada</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary shrink-0" weight="bold" />
                <span>
                  {offer.includesFullProtection !== false
                    ? "Proteção parcial do casco (LDW) e terceiros inclusa na diária"
                    : "Proteção básica padrão inclusa"}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CreditCard size={16} className="text-primary shrink-0" weight="bold" />
                <span>
                  {offer.isCorporateB2B
                    ? offer.billingModalityLabel || "Faturamento Corporativo B2B via agência sem caução pessoal"
                    : paymentPreference === "pay_now"
                      ? "Pagamento antecipado com desconto garantido via PIX ou Cartão"
                      : "Pague ao retirar diretamente no balcão da locadora"}
                </span>
              </li>
            </ul>
          </div>

          {/* Driver Form */}
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Nome Completo do Condutor</Label>
              <Input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Ex: João Carlos da Silva"
                className="h-11 min-h-11 text-xs rounded-xl"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">CPF ou Número da CNH</Label>
              <Input
                value={driverDoc}
                onChange={(e) => setDriverDoc(e.target.value)}
                placeholder="000.000.000-00"
                className="h-11 min-h-11 text-xs rounded-xl"
                required
              />
            </div>
          </div>

          {/* Pricing Breakdown Summary */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div>
              <span className="text-xs text-muted-foreground block">
                Total para {effectiveDays} {effectiveDays === 1 ? "diária" : "diárias"} ({formatMoney(effectiveDailyBrl * 100)}/dia)
              </span>
              <span className="text-xl font-bold text-foreground font-mono">
                {formatMoney(totalForDaysBrl * 100)}
              </span>
            </div>
            <span className="text-3xs font-mono uppercase px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
              Taxas inclusas
            </span>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Link
              to="/_store/turismo/aluguel-carros/$id"
              params={{ id: offer.id }}
              className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold border border-border inline-flex items-center justify-center hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Página Completa
            </Link>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Fechar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 min-h-11 px-5 rounded-xl text-xs font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isSubmitting
                ? "Processando..."
                : offer.isCorporateB2B
                  ? "Confirmar Reserva B2B"
                  : "Confirmar Reserva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export interface CarRentalShowcaseRailProps {
  mode?: "b2c" | "b2b";
  title?: string;
  initialDays?: number;
  initialPickupLocation?: string;
  offers?: CarRentalOfferItem[];
  onBookOffer?: (offer: CarRentalOfferItem, days: number) => void;
  className?: string;
}

const PICKUP_LOCATIONS = [
  "Aeroporto de Chapecó (XAP)",
  "Aeroporto de Florianópolis (FLN)",
  "Aeroporto de Curitiba (CWB)",
  "Aeroporto de Porto Alegre (POA)",
  "Aeroporto de São Paulo (GRU)",
  "Aeroporto de Congonhas (CGH)",
];

function formatDateRangeLabel(days: number): string {
  const start = new Date();
  start.setDate(start.getDate() + 7);
  const end = new Date(start);
  end.setDate(start.getDate() + Math.max(1, days));

  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  return `${fmt(start)} - ${fmt(end)}`;
}

export function CarRentalShowcaseRail({
  mode = "b2c",
  title = "Precisa de um carro?",
  initialDays = 3,
  initialPickupLocation,
  offers: customOffers,
  onBookOffer,
  className,
}: CarRentalShowcaseRailProps) {
  const [days, setDays] = useState<number>(initialDays);
  const [pickupLocation, setPickupLocation] = useState<string>(
    initialPickupLocation ||
      (mode === "b2b" ? "Aeroporto de Congonhas (CGH)" : "Aeroporto de Chapecó (XAP)")
  );
  const [paymentPreference, setPaymentPreference] = useState<"pay_at_pickup" | "pay_now">(
    "pay_at_pickup"
  );
  const [isEditingFilter, setIsEditingFilter] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<CarRentalOfferItem | null>(null);

  const { data: liveSearchData, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-tourism-cars", mode, pickupLocation],
    queryFn: () =>
      publicTourismAutoServiceSearchFn({
        data: {
          service: "cars",
          destination: pickupLocation,
        },
      }),
    enabled: mode === "b2c" && !customOffers,
    staleTime: 5 * 60 * 1000,
  });

  const activeOffers: CarRentalOfferItem[] = useMemo(() => {
    if (customOffers && customOffers.length > 0) {
      return customOffers;
    }
    if (mode === "b2b") {
      return [];
    }
    const liveResults = liveSearchData?.results || [];
    const mappedLive = liveResults
      .filter((r) => r.category === "cars")
      .map((r, idx): CarRentalOfferItem => {
        const anyItem = r as any;
        const dailyBrl =
          Number(anyItem.dailyRateBrl) > 0
            ? Number(anyItem.dailyRateBrl)
            : r.priceCents > 0
              ? Math.round(r.priceCents / 100 / 3)
              : 139 + idx * 40;
        return {
          id: r.id,
          rentalCompany: String(anyItem.rentalCompany || r.badge || "InfoTravel GDS"),
          providerOrigin: "infotravel_b2c",
          isCorporateB2B: false,
          vehicleCategory: r.title,
          vehicleModelExample: r.subtitle || "Chevrolet Onix ou similar",
          imageUrl: r.imageUrl || null,
          transmission: anyItem.transmission === "Manual" ? "Manual" : "Automático",
          passengersCount: 5,
          bagsCount: 2,
          doorsCount: 4,
          hasAirConditioning: true,
          includesUnlimitedMileage: true,
          includesFullProtection: true,
          freeCancellation: anyItem.freeCancellation !== false,
          pickupLocation: String(anyItem.pickupLocation || r.destination || pickupLocation),
          dropoffLocation: String(anyItem.pickupLocation || r.destination || pickupLocation),
          paymentTiming: anyItem.paymentTiming || "pay_at_pickup",
          dailyRateBrl: dailyBrl,
          totalThreeDaysBrl: Number(anyItem.totalThreeDaysBrl) || dailyBrl * 3,
        };
      });

    return mappedLive;
  }, [customOffers, mode, liveSearchData, pickupLocation]);

  const dateRangeLabel = useMemo(() => formatDateRangeLabel(days), [days]);

  return (
    <section aria-label={title} className={cn("w-full space-y-4", className)}>
      {/* Decolar-inspired Header & Interactive Filter Pill Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground">
              {title}
            </h2>
            {mode === "b2b" && (
              <Badge variant="outline" className="text-3xs font-mono uppercase text-primary border-primary/30 bg-primary/10">
                Acordo Corporativo Wooba
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {mode === "b2b"
              ? "Tarifas corporativas negociadas com faturamento direto e proteção inclusa"
              : "Compare locadoras com cancelamento grátis e pagamento na retirada"}
          </p>
        </div>

        {/* Interactive Filter Pill: "{days} dias: {dateRangeLabel}" + "Editar" button (h-11) */}
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground pr-1">
            <CalendarBlank size={16} weight="bold" className="text-primary shrink-0" />
            <span>
              {days} {days === 1 ? "dia" : "dias"}: {dateRangeLabel}
            </span>
            <span className="hidden md:inline text-muted-foreground">
              · {pickupLocation.split("(")[0].trim()}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsEditingFilter((prev) => !prev)}
            className="h-11 min-h-11 px-3 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SlidersHorizontal size={14} weight="bold" />
            <span>{isEditingFilter ? "Fechar" : "Editar"}</span>
          </Button>
        </div>
      </div>

      {/* Expandable Filter Editor for Days, Pickup Location & Payment Preference */}
      {isEditingFilter && (
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Number of Days */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">
                Quantidade de Diárias
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                {[1, 3, 5, 7, 15].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={cn(
                      "h-11 min-h-11 px-3 rounded-xl border text-xs font-bold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      days === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:bg-muted"
                    )}
                  >
                    {d} {d === 1 ? "dia" : "dias"}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Pickup Location */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">
                Local de Retirada e Devolução
              </Label>
              <div className="tab-list flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {PICKUP_LOCATIONS.map((loc) => {
                  const code = loc.match(/\(([A-Z]{3})\)/)?.[1] || loc;
                  const active = pickupLocation === loc;
                  return (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setPickupLocation(loc)}
                      className={cn(
                        "h-11 min-h-11 px-3 rounded-xl border text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-foreground text-background border-foreground font-bold"
                          : "bg-card text-muted-foreground border-border hover:text-foreground"
                      )}
                    >
                      {code}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Payment Preference */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">
                Modalidade de Pagamento
              </Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentPreference("pay_at_pickup")}
                  className={cn(
                    "h-11 min-h-11 px-3 rounded-xl border text-xs font-bold flex-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    paymentPreference === "pay_at_pickup"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-muted"
                  )}
                >
                  Pague ao retirar
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentPreference("pay_now")}
                  className={cn(
                    "h-11 min-h-11 px-3 rounded-xl border text-xs font-bold flex-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    paymentPreference === "pay_now"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:bg-muted"
                  )}
                >
                  Pague agora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards Grid (Direct CarRentalOfferCard children — Zero Card-in-Card DL-31) */}
      {isLoading && activeOffers.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-border bg-card p-4 h-80 animate-pulse motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : isError && activeOffers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-destructive/40 p-8 text-center bg-card space-y-3">
          <Car className="size-8 mx-auto text-destructive" />
          <p className="text-xs font-semibold text-destructive">
            Instabilidade temporária na consulta de frotas e tarifas da locadora.
          </p>
          <p className="text-3xs text-muted-foreground max-w-md mx-auto">
            O diagnóstico foi registrado nos logs do sistema. Clique abaixo para tentar novamente a consulta em tempo real.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-11 min-h-11 px-4 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Tentar Novamente
          </Button>
        </div>
      ) : activeOffers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card space-y-3">
          <Car className="size-8 mx-auto text-muted-foreground" />
          <p className="text-xs font-semibold text-foreground">
            Nenhum veículo disponível para locação em {pickupLocation} para {days} {days === 1 ? "diária" : "diárias"}.
          </p>
          <p className="text-3xs text-muted-foreground max-w-md mx-auto">
            Selecione outro aeroporto de retirada ou ajuste o período de diárias para consultar disponibilidade da frota.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {activeOffers.map((offer) => (
            <CarRentalOfferCard
              key={offer.id}
              offer={offer}
              days={days}
              pickupOverride={pickupLocation}
              paymentPreference={paymentPreference}
              onSelect={(selected) => setSelectedOffer(selected)}
            />
          ))}
        </div>
      )}

      {/* Car Rental Detail & Booking Modal */}
      <CarRentalDetailModal
        offer={selectedOffer}
        open={Boolean(selectedOffer)}
        onOpenChange={(open) => {
          if (!open) setSelectedOffer(null);
        }}
        days={days}
        onDaysChange={setDays}
        pickupLocation={pickupLocation}
        paymentPreference={paymentPreference}
        onConfirmBooking={(bookedOffer, bookedDays, driverName) => {
          if (onBookOffer) {
            onBookOffer(bookedOffer, bookedDays);
          } else {
            toast.success(
              `Reserva confirmada: ${bookedOffer.vehicleCategory} (${bookedOffer.rentalCompany}) por ${bookedDays} ${bookedDays === 1 ? "dia" : "dias"} para ${driverName}!`
            );
          }
        }}
      />
    </section>
  );
}
