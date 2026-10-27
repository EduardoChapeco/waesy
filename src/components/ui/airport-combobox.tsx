import React, { useState, useEffect, useRef } from "react";
import { Plane, Check, ChevronsUpDown, Search, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type AirportRecord,
  getAirportByIata,
  searchAirportsCatalog,
} from "@/lib/data/airports-catalog";

// ── Vaul Drawer primitives (mobile) ─────────────────────────────────────────
import { Drawer as DrawerPrimitive } from "vaul";

const DrawerRoot = ({
  shouldScaleBackground = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
);
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-background/80 backdrop-blur-sm", className)}
    {...props}
  />
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
        "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-lg border border-border/60 bg-background pb-safe max-h-full",
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-3 mb-1 h-1 w-10 shrink-0 rounded-full bg-border" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

// ── Types ────────────────────────────────────────────────────────────────────
export interface AirportComboboxProps {
  value?: string;
  onChange: (iata: string, airport?: AirportRecord) => void;
  className?: string;
  label?: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  countryFilter?: string;
  id?: string;
  showAirportLink?: boolean;
}

// ── Hubs Rápidos de 1 Toque (Brasil & Destinos Internacionais Mais Procurados) ──────
const POPULAR_HUBS = [
  { iata: "XAP", label: "Chapecó (XAP)" },
  { iata: "GRU", label: "Guarulhos (GRU)" },
  { iata: "CGH", label: "Congonhas (CGH)" },
  { iata: "FLN", label: "Florianópolis (FLN)" },
  { iata: "NVT", label: "Navegantes (NVT)" },
  { iata: "POA", label: "Porto Alegre (POA)" },
  { iata: "CWB", label: "Curitiba (CWB)" },
  { iata: "BSB", label: "Brasília (BSB)" },
  { iata: "GIG", label: "Galeão (GIG)" },
  { iata: "SDU", label: "Santos Dumont (SDU)" },
  { iata: "CNF", label: "Belo Horizonte (CNF)" },
  { iata: "REC", label: "Recife (REC)" },
  { iata: "SSA", label: "Salvador (SSA)" },
  { iata: "FOR", label: "Fortaleza (FOR)" },
  { iata: "MIA", label: "Miami (MIA)" },
  { iata: "MCO", label: "Orlando (MCO)" },
  { iata: "LIS", label: "Lisboa (LIS)" },
  { iata: "PUJ", label: "Punta Cana (PUJ)" },
  { iata: "CUN", label: "Cancún (CUN)" },
  { iata: "SCL", label: "Santiago (SCL)" },
  { iata: "EZE", label: "Buenos Aires (EZE)" },
  { iata: "LIM", label: "Lima (LIM)" },
];

// Lista de aeroportos mais procurados para exibir quando o campo de busca estiver vazio
const DEFAULT_TOP_AIRPORTS_IATAS = [
  "XAP", "GRU", "CGH", "GIG", "SDU", "BSB", "CNF", "POA", "CWB", "FLN", "NVT",
  "REC", "SSA", "FOR", "VIX", "CGR", "GYN", "BEL", "MAO", "MIA", "MCO", "JFK",
  "LIS", "OPO", "MAD", "CDG", "LHR", "EZE", "SCL", "LIM", "CUN", "PUJ",
];

// ── Painel de Busca e Seleção ────────────────────────────────────────────────
function AirportPickerPanel({
  searchQuery,
  setSearchQuery,
  selectedAirport,
  onSelect,
  onClose,
  countryFilter,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedAirport?: AirportRecord;
  onSelect: (airport: AirportRecord) => void;
  onClose: () => void;
  countryFilter?: string;
}) {
  const isSearchEmpty = !searchQuery.trim();

  // Quando vazio, exibe apenas os aeroportos mais procurados (evita poluição da lista)
  const defaultAirports = React.useMemo(() => {
    return DEFAULT_TOP_AIRPORTS_IATAS
      .map((iata) => getAirportByIata(iata))
      .filter((a): a is AirportRecord => Boolean(a));
  }, []);

  const filteredAirports = isSearchEmpty
    ? defaultAirports
    : searchAirportsCatalog(searchQuery, {
        country: countryFilter,
        limit: 30,
      });

  const queryUpper = searchQuery.trim().toUpperCase();
  const isCustomCode =
    queryUpper.length === 3 &&
    !filteredAirports.some((a) => a.iata_code === queryUpper);

  return (
    <div className="flex flex-col gap-3 pb-4">
      {/* Search Input */}
      <div className="relative px-4 pt-1">
        <Search className="absolute left-7 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar IATA, cidade, estado, país ou aeroporto..."
          className="h-11 min-h-11 pl-10 pr-12 rounded-lg text-sm bg-muted/40 border-border/70 font-medium focus-visible:ring-2 focus-visible:ring-primary"
          autoFocus
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-6 top-1/2 -translate-y-1/2 size-11 min-h-11 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Limpar busca"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Hubs Rápidos de 1 Toque */}
      {isSearchEmpty && (
        <div className="px-4 space-y-2">
          <div className="text-2xs font-bold text-muted-foreground uppercase tracking-wider">
            Destinos Mais Procurados
          </div>
          <div className="flex flex-wrap items-center gap-2 pb-1 max-h-28 overflow-y-auto no-scrollbar">
            {POPULAR_HUBS.map((hub) => {
              const isSelected = selectedAirport?.iata_code === hub.iata;
              return (
                <button
                  key={hub.iata}
                  type="button"
                  onClick={() => {
                    const found = getAirportByIata(hub.iata);
                    if (found) {
                      onSelect(found);
                      onClose();
                    }
                  }}
                  className={cn(
                    "shrink-0 h-11 min-h-11 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border/70 hover:border-primary/50 hover:bg-primary/10",
                  )}
                >
                  {hub.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Título da Lista */}
      <div className="px-4 text-2xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
        <span>{isSearchEmpty ? "Principais Aeroportos Comerciais" : `Resultados (${filteredAirports.length})`}</span>
        {!isSearchEmpty && (
          <span className="text-muted-foreground/80 font-normal">Auto-filtrado instantâneo</span>
        )}
      </div>

      {/* Lista de Resultados */}
      <div className="overflow-y-auto max-h-80 px-2 space-y-1">
        {filteredAirports.length > 0 ? (
          filteredAirports.map((airport) => {
            const isSelected = selectedAirport?.iata_code === airport.iata_code;
            const locationStr =
              airport.country_code === "BR" && airport.state_province
                ? `${airport.city}, ${airport.state_province} • Brasil`
                : `${airport.city} • ${airport.country}`;

            return (
              <button
                key={airport.iata_code}
                type="button"
                onClick={() => {
                  onSelect(airport);
                  onClose();
                }}
                className={cn(
                  "w-full h-11 min-h-11 flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted/70 text-foreground",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "size-8 rounded-md flex items-center justify-center font-bold text-xs shrink-0 tracking-wider",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground/80 border border-border/60",
                    )}
                  >
                    {airport.iata_code}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold truncate leading-tight">
                      {airport.city}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({airport.iata_code})
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground truncate font-normal">
                      {airport.name} • {locationStr}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="size-4 text-primary shrink-0" />}
              </button>
            );
          })
        ) : (
          <div className="py-8 text-center px-4">
            <p className="text-sm text-muted-foreground">
              Nenhum aeroporto encontrado para &ldquo;{searchQuery}&rdquo;.
            </p>
            {isCustomCode && (
              <button
                type="button"
                onClick={() => {
                  onSelect({
                    iata_code: queryUpper,
                    icao_code: "",
                    name: `Aeroporto Personalizado (${queryUpper})`,
                    city: queryUpper,
                    country: "Personalizado",
                    country_code: "XX",
                    latitude: 0,
                    longitude: 0,
                    timezone: "America/Sao_Paulo",
                    is_commercial: true,
                  });
                  onClose();
                }}
                className="mt-3 inline-flex items-center gap-2 h-11 min-h-11 px-4 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Usar código IATA customizado: {queryUpper}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente Principal Exportado ──────────────────────────────────────────
export function AirportCombobox({
  value,
  onChange,
  className,
  label,
  helperText,
  placeholder = "Selecione o aeroporto de embarque ou destino...",
  required,
  disabled,
  countryFilter,
  id,
  showAirportLink = false,
}: AirportComboboxProps) {
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cleanValue = (value || "").trim().toUpperCase();
  const selectedAirport = cleanValue ? getAirportByIata(cleanValue) : undefined;

  // Fechar popover ao clicar fora no Desktop
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDesktopOpen(false);
      }
    }
    if (desktopOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [desktopOpen]);

  const handleSelect = (airport: AirportRecord) => {
    onChange(airport.iata_code, airport);
    setDesktopOpen(false);
    setMobileOpen(false);
    setSearchQuery("");
  };

  const displayText = selectedAirport
    ? `${selectedAirport.iata_code} — ${selectedAirport.city}${
        selectedAirport.country_code === "BR" && selectedAirport.state_province
          ? `, ${selectedAirport.state_province}`
          : `, ${selectedAirport.country}`
      }`
    : cleanValue
      ? `${cleanValue} (Aeroporto)`
      : "";

  return (
    <div className={cn("space-y-2 w-full", className)}>
      {label && (
        <Label
          htmlFor={id}
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2"
        >
          <Plane className="size-4 text-primary" />
          <span>{label}</span>
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      {/* Botão Gatilho Principal (Mobile Drawer / Desktop Popover) */}
      <div className="relative w-full" ref={dropdownRef}>
        <button
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setSearchQuery("");
            if (window.innerWidth < 768) {
              setMobileOpen(true);
            } else {
              setDesktopOpen((prev) => !prev);
            }
          }}
          className={cn(
            "w-full h-11 min-h-11 px-3 rounded-lg border border-input bg-background text-sm flex items-center justify-between text-left transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
            disabled && "opacity-50 cursor-not-allowed bg-muted/40",
            !disabled && "cursor-pointer hover:border-primary/50 hover:bg-muted/10",
            selectedAirport ? "text-foreground font-medium" : "text-muted-foreground font-normal",
          )}
          aria-expanded={desktopOpen || mobileOpen}
        >
          <div className="flex items-center gap-2 truncate">
            <Plane
              className={cn(
                "size-4 shrink-0 transition-colors",
                selectedAirport ? "text-primary" : "text-muted-foreground",
              )}
            />
            <span className="truncate">
              {displayText || placeholder}
            </span>
          </div>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground ml-2 opacity-60" />
        </button>

        {/* Popover Desktop (>= 768px) */}
        {desktopOpen && (
          <div className="hidden md:block absolute left-0 right-0 top-full mt-2 z-50 rounded-lg border border-border/80 bg-background p-2 animate-in fade-in-0 zoom-in-95">
            <AirportPickerPanel
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedAirport={selectedAirport}
              onSelect={handleSelect}
              onClose={() => setDesktopOpen(false)}
              countryFilter={countryFilter}
            />
          </div>
        )}
      </div>

      {/* Drawer Mobile (< 768px) */}
      <div className="md:hidden">
        <DrawerRoot open={mobileOpen} onOpenChange={setMobileOpen}>
          <DrawerContent>
            <div className="px-4 py-2 border-b border-border/40">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Plane className="size-4 text-primary" />
                {label || "Selecionar Aeroporto"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Busque pelo código IATA, cidade ou nome do aeroporto
              </p>
            </div>
            <div className="pt-2">
              <AirportPickerPanel
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedAirport={selectedAirport}
                onSelect={handleSelect}
                onClose={() => setMobileOpen(false)}
                countryFilter={countryFilter}
              />
            </div>
          </DrawerContent>
        </DrawerRoot>
      </div>

      {showAirportLink && selectedAirport && (
        <div className="flex items-center justify-between text-xs pt-1 px-1">
          <span className="text-muted-foreground text-2xs">Aeroporto selecionado:</span>
          <a
            href={`/aeroporto/${selectedAirport.iata_code.toLowerCase()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-semibold flex items-center gap-1 text-2xs"
          >
            Ver Terminais, PF e Serviços ({selectedAirport.iata_code})
            <ExternalLink className="size-3" />
          </a>
        </div>
      )}

      {helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
