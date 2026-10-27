import React, { useState, useEffect, useMemo, useRef } from "react";
import { Hotel as HotelIcon, Check, ChevronsUpDown, Search, X, Star, MapPin, Sparkles, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  type HotelRecord,
  GLOBAL_HOTELS_RESORTS_CATALOG,
  searchHotelsCatalog,
  normalizeHotelName,
} from "@/lib/data/hotels-resorts-catalog";
import type { HotelBankDTO } from "@/services/travel-catalog.functions";

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
export interface HotelComboboxItem {
  id: string;
  name: string;
  city: string;
  state: string;
  country: string;
  stars: number;
  regime_options: string[];
  badges: string[];
  cover_photo_url?: string | null;
  photos?: string[];
  description?: string | null;
  bio_bullets?: string[];
  room_categories?: any[];
  policies?: any;
  structure?: any;
  is_canonical?: boolean;
}

export interface HotelComboboxProps {
  value?: string;
  onChange: (hotelId: string, hotelItem?: HotelComboboxItem) => void;
  className?: string;
  label?: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  storeHotels?: HotelBankDTO[];
  id?: string;
}

// ── Resorts Populares de 1 Toque ──────────────────────────────────────────────
const POPULAR_RESORT_PRESETS = [
  { name: "Salinas do Maragogi", city: "Maragogi, AL" },
  { name: "Nannai Muro Alto", city: "Porto de Galinhas, PE" },
  { name: "Carmel Taíba Exclusive", city: "Taíba, CE" },
  { name: "Tivoli Ecoresort Praia do Forte", city: "Mata de São João, BA" },
  { name: "Vila Galé Marés", city: "Guarajuba, BA" },
  { name: "Wish Serrano Resort", city: "Gramado, RS" },
];

// ── Painel de Busca e Seleção ────────────────────────────────────────────────
function HotelPickerPanel({
  searchQuery,
  setSearchQuery,
  selectedHotelId,
  onSelect,
  onClose,
  unifiedList,
}: {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedHotelId?: string;
  onSelect: (hotel: HotelComboboxItem) => void;
  onClose: () => void;
  unifiedList: HotelComboboxItem[];
}) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  const filteredHotels = useMemo(() => {
    let list = unifiedList;

    if (activeFilter === "all_inclusive") {
      list = list.filter((h) =>
        h.regime_options?.some((r) => r.toLowerCase().includes("inclusive")),
      );
    } else if (activeFilter === "pe_na_areia") {
      list = list.filter((h) =>
        h.badges?.some((b) => b.toLowerCase().includes("areia")),
      );
    } else if (activeFilter === "5_stars") {
      list = list.filter((h) => h.stars === 5);
    }

    const q = normalizeHotelName(searchQuery);
    if (!q) return list.slice(0, 40);

    const tokens = q.split(" ").filter((t) => t.length > 1);

    return list
      .filter((h) => {
        const hName = normalizeHotelName(h.name);
        const hCity = normalizeHotelName(h.city);
        const hState = normalizeHotelName(h.state);
        const hCountry = normalizeHotelName(h.country);

        if (hName.includes(q) || hCity.includes(q) || hState.includes(q)) {
          return true;
        }

        const combined = `${hName} ${hCity} ${hState} ${hCountry}`;
        return tokens.every((token) => combined.includes(token));
      })
      .slice(0, 40);
  }, [unifiedList, searchQuery, activeFilter]);

  return (
    <div className="flex flex-col gap-3 py-2">
      {/* Cabeçalho do Painel */}
      <div className="px-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <HotelIcon className="size-4 text-primary" />
            Catálogo Canônico de Hotéis & Resorts
          </h2>
          <p className="text-xs text-muted-foreground">
            Busque por nome, cidade ou selecione um resort do banco central.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Fechar painel de hotéis"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Campo de Busca Focalizado */}
      <div className="px-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ex: Salinas Maragogi, Nannai, Tivoli, Gramado..."
            className="pl-9 pr-9 h-11 min-h-11 text-sm bg-muted/40 border-border/80 focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Buscar hotel ou resort"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Limpar busca"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chips Rápidos de Filtro */}
      <div className="px-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: "all", label: "Todos" },
          { id: "all_inclusive", label: "All Inclusive" },
          { id: "pe_na_areia", label: "Pé na Areia" },
          { id: "5_stars", label: "5 Estrelas" },
        ].map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setActiveFilter(chip.id)}
            className={cn(
              "shrink-0 h-8 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeFilter === chip.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Resorts Frequentes de 1 Toque quando sem busca ativa */}
      {!searchQuery && (
        <div className="px-4 flex flex-wrap items-center gap-2 pb-1">
          {POPULAR_RESORT_PRESETS.map((resort) => {
            const matched = unifiedList.find((h) =>
              normalizeHotelName(h.name).includes(normalizeHotelName(resort.name)),
            );
            return (
              <button
                key={resort.name}
                type="button"
                onClick={() => {
                  if (matched) {
                    onSelect(matched);
                    onClose();
                  } else {
                    setSearchQuery(resort.name);
                  }
                }}
                className="shrink-0 h-9 px-3 rounded-lg text-xs font-medium border bg-card text-foreground border-border/70 hover:border-primary/50 hover:bg-primary/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {resort.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Lista de Hotéis & Resorts */}
      <div className="overflow-y-auto max-h-80 px-2 space-y-1">
        {filteredHotels.length > 0 ? (
          filteredHotels.map((hotel) => {
            const isSelected = selectedHotelId === hotel.id || selectedHotelId === hotel.name;

            return (
              <button
                key={hotel.id || hotel.name}
                type="button"
                onClick={() => {
                  onSelect(hotel);
                  onClose();
                }}
                className={cn(
                  "w-full min-h-11 flex items-center justify-between gap-3 px-3 py-3 rounded-lg text-left cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isSelected
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "hover:bg-muted/70 text-foreground border border-transparent",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "size-9 rounded-lg flex items-center justify-center shrink-0 border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/80 text-foreground/80 border-border/60",
                    )}
                  >
                    <HotelIcon className="size-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate leading-tight">
                        {hotel.name}
                      </span>
                      {hotel.stars > 0 && (
                        <span className="inline-flex items-center text-2xs font-semibold text-amber-500">
                          <Star className="size-3 fill-amber-500 mr-1" />
                          {hotel.stars}★
                        </span>
                      )}
                      {hotel.is_canonical && (
                        <Badge
                          variant="secondary"
                          className="text-3xs px-2 py-0 h-4 bg-primary/10 text-primary border-primary/20"
                        >
                          Oficial
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate font-normal flex items-center gap-1">
                      <MapPin className="size-3 shrink-0" />
                      {hotel.city}, {hotel.state} • {hotel.regime_options?.[0] || "Hospedagem"}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="size-4 text-primary shrink-0" />}
              </button>
            );
          })
        ) : (
          <div className="py-8 text-center px-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Nenhum hotel ou resort encontrado para &ldquo;{searchQuery}&rdquo;.
            </p>
            {searchQuery.trim().length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const customItem: HotelComboboxItem = {
                    id: `custom-${Date.now()}`,
                    name: searchQuery.trim(),
                    city: "",
                    state: "",
                    country: "Brasil",
                    stars: 4,
                    regime_options: ["Café da Manhã"],
                    badges: [],
                    is_canonical: false,
                  };
                  onSelect(customItem);
                  onClose();
                }}
                className="inline-flex items-center gap-2 h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-semibold cursor-pointer hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Sparkles className="size-3.5" />
                Usar &ldquo;{searchQuery.trim()}&rdquo; como hospedagem personalizada
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componente Principal HotelCombobox ────────────────────────────────────────
export function HotelCombobox({
  value,
  onChange,
  className,
  label,
  helperText,
  placeholder = "Buscar hotel ou resort no catálogo oficial...",
  required,
  disabled,
  storeHotels = [],
  id,
}: HotelComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Detecção de viewport móvel (< 768px)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fechar popover ao clicar fora no desktop
  useEffect(() => {
    if (!isOpen || isMobile) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isMobile]);

  // Lista unificada: Hotéis da Loja + Catálogo Canônico Global SSOT
  const unifiedList = useMemo<HotelComboboxItem[]>(() => {
    const seenNames = new Set<string>();
    const result: HotelComboboxItem[] = [];

    // 1. Hotéis cadastrados pela agência
    for (const h of storeHotels) {
      const norm = normalizeHotelName(h.name);
      seenNames.add(norm);
      result.push({
        id: h.id,
        name: h.name,
        city: h.city,
        state: h.state || "",
        country: h.country,
        stars: h.stars || 4,
        regime_options: h.regime_options || ["All Inclusive"],
        badges: h.badges || [],
        cover_photo_url: h.cover_photo_url,
        photos: h.photos || [],
        description: h.description,
        bio_bullets: h.bio_bullets,
        room_categories: h.room_categories,
        policies: h.policies,
        structure: h.structure,
        is_canonical: Boolean(h.global_hotel_id),
      });
    }

    // 2. Hotéis do Catálogo Global SSOT
    for (const h of GLOBAL_HOTELS_RESORTS_CATALOG) {
      const norm = normalizeHotelName(h.name);
      if (!seenNames.has(norm)) {
        seenNames.add(norm);
        result.push({
          id: h.id || `global-${norm.replace(/\s+/g, "-")}`,
          name: h.name,
          city: h.city,
          state: h.state,
          country: h.country,
          stars: h.stars,
          regime_options: h.regime_options,
          badges: h.badges,
          cover_photo_url: h.cover_photo_url,
          photos: h.photos,
          description: h.description,
          bio_bullets: h.bio_bullets,
          room_categories: h.room_categories,
          policies: h.policies,
          structure: h.structure,
          is_canonical: true,
        });
      }
    }

    return result;
  }, [storeHotels]);

  // Hotel selecionado atualmente
  const selectedHotel = useMemo(() => {
    if (!value) return undefined;
    return (
      unifiedList.find((h) => h.id === value) ||
      unifiedList.find(
        (h) => normalizeHotelName(h.name) === normalizeHotelName(value),
      )
    );
  }, [value, unifiedList]);

  const handleSelect = (hotel: HotelComboboxItem) => {
    onChange(hotel.id, hotel);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", undefined);
    setSearchQuery("");
  };

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      {label && (
        <Label
          htmlFor={id}
          className="text-xs font-semibold text-foreground flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Sliders className="size-3 text-primary" />
            <span>{label}</span>
            {required && <span className="text-destructive">*</span>}
          </span>
          {selectedHotel && (
            <span className="text-2xs text-primary font-mono font-normal">
              {selectedHotel.is_canonical ? "Catálogo Central" : "Banco da Agência"}
            </span>
          )}
        </Label>
      )}

      {/* Botão Gatilho / Trigger com Altura Canônica de 44px */}
      <div className="relative">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          className={cn(
            "w-full h-11 min-h-11 px-3 py-2 rounded-lg border bg-background text-left flex items-center justify-between gap-2 transition-colors cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            isOpen
              ? "border-primary ring-2 ring-primary/20"
              : "border-border/80 hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed bg-muted",
          )}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <HotelIcon className="size-4 shrink-0 text-muted-foreground" />
            {selectedHotel ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-foreground truncate">
                  {selectedHotel.name}
                </span>
                <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                  • {selectedHotel.city}, {selectedHotel.state}
                </span>
                {selectedHotel.stars > 0 && (
                  <span className="text-xs text-amber-500 font-semibold shrink-0">
                    {selectedHotel.stars}★
                  </span>
                )}
              </div>
            ) : value ? (
              <span className="text-sm font-medium text-foreground truncate">
                {value}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground truncate font-normal">
                {placeholder}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange("", undefined);
                  }
                }}
                className="size-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Limpar hotel selecionado"
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-4 text-muted-foreground" />
          </div>
        </button>

        {/* Modal / Painel Desktop Popover */}
        {!isMobile && isOpen && (
          <div
            ref={popoverRef}
            className="absolute z-50 left-0 right-0 top-12 mt-1 rounded-lg border border-border/80 bg-popover text-popover-foreground shadow-xs animate-in fade-in-0 zoom-in-95"
            style={{ minWidth: "340px" }}
          >
            <HotelPickerPanel
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedHotelId={selectedHotel?.id || value}
              onSelect={handleSelect}
              onClose={() => setIsOpen(false)}
              unifiedList={unifiedList}
            />
          </div>
        )}
      </div>

      {/* Drawer Mobile (Vaul) */}
      {isMobile && (
        <DrawerRoot
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setSearchQuery("");
          }}
        >
          <DrawerContent className="p-0">
            <HotelPickerPanel
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedHotelId={selectedHotel?.id || value}
              onSelect={handleSelect}
              onClose={() => setIsOpen(false)}
              unifiedList={unifiedList}
            />
          </DrawerContent>
        </DrawerRoot>
      )}

      {helperText && (
        <p className="text-2xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
