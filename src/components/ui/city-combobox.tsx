import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Check,
  ChevronsUpDown,
  Search,
  Crosshair,
  Building,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CANONICAL_CITIES,
  searchCanonicalCities,
  type CityRecord,
  findCityByLabel,
} from "@/lib/constants/cities";
import { useMasterLocation } from "@/components/location/location-master-pill";

// ── Vaul Drawer primitives (mobile) ─────────────────────────────────────────
import { Drawer as DrawerPrimitive } from "vaul";

const DrawerRoot = ({ shouldScaleBackground = false, ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm", className)} {...props} />
));
DrawerOverlay.displayName = "DrawerOverlay";

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border border-border/60 bg-background",
        "max-h-[80dvh]",
        className,
      )}
      {...props}
    >
      {/* Drag Handle */}
      <div className="mx-auto mt-3 mb-1 h-1 w-10 shrink-0 rounded-full bg-border" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

// ── Types ────────────────────────────────────────────────────────────────────
export interface StructuredLocationValue {
  city: string;
  state: string;
  neighborhood: string;
  formatted: string;
  lat?: number | null;
  lng?: number | null;
}

interface CityComboboxProps {
  value?: string;
  onChange: (formatted: string, structured?: StructuredLocationValue) => void;
  className?: string;
  label?: string;
  helperText?: string;
  required?: boolean;
}

// ── Quick-access regional poles (Oeste SC / priority cities) ─────────────────
const QUICK_CITIES_IDS = [
  "sao-miguel-do-oeste-sc",
  "chapeco-sc",
  "xanxere-sc",
  "concordia-sc",
  "sao-lourenco-do-oeste-sc",
];

// ── City picker inner panel (shared between mobile sheet & desktop popover) ──
function CityPickerPanel({
  searchQuery,
  setSearchQuery,
  selectedCity,
  onSelect,
  onClose,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCity: CityRecord | null;
  onSelect: (city: CityRecord) => void;
  onClose: () => void;
}) {
  const filteredCities = searchCanonicalCities(searchQuery, 12);
  const quickCities = QUICK_CITIES_IDS
    .map((id) => CANONICAL_CITIES.find((c) => c.id === id))
    .filter(Boolean) as CityRecord[];

  return (
    <div className="flex flex-col gap-3 pb-safe-bottom">
      {/* Search bar */}
      <div className="relative px-4">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar cidade..."
          className="h-11 pl-10 pr-10 rounded-2xl text-sm bg-muted/50 border-border/60 font-medium"
          autoFocus
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-7 top-1/2 -translate-y-1/2 size-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full transition-colors"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Quick-access chips */}
      {!searchQuery && (
        <div className="px-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {quickCities.map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => { onSelect(city); onClose(); }}
              className={cn(
                "shrink-0 h-8 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                selectedCity?.id === city.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border/70 hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              {city.name}
            </button>
          ))}
        </div>
      )}

      {/* Results list */}
      <div className="overflow-y-auto flex-1 px-2 pb-6 space-y-0.5">
        {filteredCities.length > 0 ? (
          filteredCities.map((city) => {
            const isSelected = selectedCity?.id === city.id;
            return (
              <button
                key={city.id}
                type="button"
                onClick={() => { onSelect(city); onClose(); }}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-left cursor-pointer transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/60 text-foreground"
                )}
              >
                <div className="flex flex-col min-w-0">
                  <span className={cn("text-sm font-semibold truncate", isSelected && "text-primary")}>
                    {city.name}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {city.state} • {city.region}
                  </span>
                </div>
                {isSelected && <Check className="size-4 text-primary shrink-0" />}
              </button>
            );
          })
        ) : (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma cidade encontrada para &ldquo;{searchQuery}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function CityCombobox({
  value = "",
  onChange,
  className = "",
  label = "Cidade do Anúncio",
  helperText = "Para sua privacidade, o endereço exato não é exibido publicamente.",
  required = false,
}: CityComboboxProps) {
  const { location: masterLoc } = useMasterLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [selectedCity, setSelectedCity] = useState<CityRecord | null>(() => {
    if (value) {
      const parts = value.split("—").map((p) => p.trim());
      const lastPart = parts[parts.length - 1] || "";
      const matched = findCityByLabel(lastPart) || findCityByLabel(value);
      if (matched) return matched;
    }
    if (masterLoc.city && masterLoc.city.toLowerCase() !== "global") {
      return findCityByLabel(masterLoc.city) || null;
    }
    return null;
  });

  const [neighborhood, setNeighborhood] = useState(() => {
    if (value && value.includes("—")) return value.split("—")[0].trim();
    if (value && value.includes(",")) return value.split(",")[0].trim();
    return "";
  });

  // Seed onChange once on mount if no value provided
  useEffect(() => {
    if (!value && selectedCity) {
      const formatted = neighborhood
        ? `${neighborhood} — ${selectedCity.label}`
        : selectedCity.label;
      onChange(formatted, { city: selectedCity.name, state: selectedCity.state, neighborhood, formatted });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDesktopOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleSelectCity = (city: CityRecord) => {
    setSelectedCity(city);
    setSearchQuery("");
    const formatted = neighborhood ? `${neighborhood} — ${city.label}` : city.label;
    onChange(formatted, { city: city.name, state: city.state, neighborhood, formatted });
  };

  const handleNeighborhoodChange = (newNeigh: string) => {
    setNeighborhood(newNeigh);
    const cityLabel = selectedCity ? selectedCity.label : (masterLoc.city !== "Global" ? masterLoc.city : "");
    const cityName = selectedCity ? selectedCity.name : (masterLoc.city !== "Global" ? masterLoc.city : "");
    const cityState = selectedCity ? selectedCity.state : (masterLoc.state || "");
    const formatted = newNeigh.trim() && cityLabel
      ? `${newNeigh.trim()} — ${cityLabel}`
      : cityLabel || newNeigh.trim();
    onChange(formatted, { city: cityName, state: cityState, neighborhood: newNeigh.trim(), formatted });
  };

  const handleAutoFill = () => {
    if (!masterLoc.city || masterLoc.city.toLowerCase() === "global") return;
    const matched =
      findCityByLabel(masterLoc.city) ||
      CANONICAL_CITIES.find((c) => c.name.toLowerCase() === masterLoc.city.toLowerCase());
    if (matched) {
      setSelectedCity(matched);
      const neigh = masterLoc.address?.split(",")[0]?.trim() || "";
      setNeighborhood(neigh);
      const formatted = neigh ? `${neigh} — ${matched.label}` : matched.label;
      onChange(formatted, { city: matched.name, state: matched.state, neighborhood: neigh, formatted });
    }
  };

  const triggerLabel = selectedCity ? selectedCity.label : "Selecionar cidade";

  // ── Trigger Button (shared) ──────────────────────────────────────────────
  const TriggerButton = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full h-11 px-3 rounded-xl flex items-center justify-between gap-2 text-sm font-medium transition-all cursor-pointer",
        "border border-border/80 bg-background hover:border-primary/50 hover:bg-muted/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        !selectedCity && "text-muted-foreground"
      )}
    >
      <span className="flex items-center gap-2 truncate">
        <Building className="size-4 text-muted-foreground shrink-0" />
        <span className="truncate">{triggerLabel}</span>
      </span>
      <ChevronsUpDown className="size-4 text-muted-foreground shrink-0" />
    </button>
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Label row */}
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-foreground font-medium flex items-center gap-1.5">
          <MapPin className="size-3.5 text-primary" />
          <span>{label}</span>
          {required && <span className="text-destructive">*</span>}
        </Label>
        {masterLoc.city && masterLoc.city.toLowerCase() !== "global" && (
          <button
            type="button"
            onClick={handleAutoFill}
            className="flex-shrink-0 text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Crosshair className="size-3" />
            <span>Usar {masterLoc.city}</span>
          </button>
        )}
      </div>

      {/* Two-column grid: Neighborhood + City */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Neighborhood input */}
        <Input
          value={neighborhood}
          onChange={(e) => handleNeighborhoodChange(e.target.value)}
          placeholder="Bairro / Região (ex: Centro)"
          className="h-11 rounded-xl text-sm bg-background border-border/80 font-medium placeholder:text-muted-foreground/60"
        />

        {/* ── Mobile: Vaul Drawer ── */}
        <div className="sm:hidden">
          <DrawerRoot open={mobileOpen} onOpenChange={setMobileOpen}>
            <DrawerPrimitive.Trigger asChild>
              <TriggerButton onClick={() => setMobileOpen(true)} />
            </DrawerPrimitive.Trigger>
            <DrawerContent className="pb-[env(safe-area-inset-bottom)] min-h-[60dvh]">
              <div className="px-4 pb-2 pt-1">
                <DrawerPrimitive.Title className="text-base font-bold text-foreground">
                  Selecionar Cidade
                </DrawerPrimitive.Title>
              </div>
              <div className="flex-1 overflow-hidden">
                <CityPickerPanel
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  selectedCity={selectedCity}
                  onSelect={handleSelectCity}
                  onClose={() => setMobileOpen(false)}
                />
              </div>
            </DrawerContent>
          </DrawerRoot>
        </div>

        {/* ── Desktop: Popover dropdown ── */}
        <div className="hidden sm:block relative" ref={dropdownRef}>
          <TriggerButton onClick={() => { setDesktopOpen(!desktopOpen); setSearchQuery(""); }} />

          {desktopOpen && (
            <div
              className={cn(
                "absolute left-0 right-0 top-[calc(100%+6px)] z-50",
                "bg-popover border border-border/80 rounded-2xl shadow-xl",
                "overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150",
              )}
            >
              <div className="p-2 border-b border-border/40">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar cidade..."
                    className="h-9 pl-9 rounded-xl text-xs bg-muted/50 border-none font-medium"
                    autoFocus
                  />
                </div>
                {/* Chips */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar pb-0.5">
                  {QUICK_CITIES_IDS.map((id) => {
                    const city = CANONICAL_CITIES.find((c) => c.id === id);
                    if (!city) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => { handleSelectCity(city); setDesktopOpen(false); }}
                        className={cn(
                          "shrink-0 h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer",
                          selectedCity?.id === id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {city.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Results */}
              <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
                {searchCanonicalCities(searchQuery, 10).map((city) => {
                  const isSelected = selectedCity?.id === city.id;
                  return (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => { handleSelectCity(city); setDesktopOpen(false); }}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors text-left",
                        isSelected
                          ? "bg-primary/10 text-primary font-bold"
                          : "hover:bg-muted/70 text-foreground font-medium"
                      )}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{city.name}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">{city.state} • {city.region}</span>
                      </div>
                      {isSelected && <Check className="size-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {helperText && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">{helperText}</p>
      )}
    </div>
  );
}
