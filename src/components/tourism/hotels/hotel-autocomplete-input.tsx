import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Hotel as HotelIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchGlobalHotels, type GlobalHotelDTO } from "@/services/travel-catalog.functions";

interface HotelAutocompleteInputProps {
  value?: string | null;
  selectedLabel?: string;
  onChange: (hotel: GlobalHotelDTO | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function HotelAutocompleteInput({
  value,
  selectedLabel,
  onChange,
  placeholder = "Buscar hotel ou resort no banco central...",
  disabled = false,
}: HotelAutocompleteInputProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<GlobalHotelDTO[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<GlobalHotelDTO | null>(null);
  const requestId = useRef(0);

  const selected = [selectedHotel, ...options].find((hotel) => hotel && (hotel.id === value || hotel.canonical_slug === value));
  const label = selected ? `${selected.name} · ${selected.city}` : value ? selectedLabel : undefined;

  useEffect(() => {
    const term = query.trim();
    const currentRequest = ++requestId.current;
    setHasError(false);
    setOptions([]);
    if (!isOpen || disabled || term.length < 2) {
      setOptions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchGlobalHotels({ data: { query: term } });
        if (currentRequest === requestId.current) setOptions(results);
      } catch {
        if (currentRequest === requestId.current) { setOptions([]); setHasError(true); }
      } finally {
        if (currentRequest === requestId.current) setIsLoading(false);
      }
    }, 250);

    return () => { requestId.current += 1; window.clearTimeout(timer); };
  }, [query, isOpen, disabled]);

  return (
    <div className="relative w-full" onKeyDown={(event) => {
      if (event.key === "Escape") { event.stopPropagation(); setIsOpen(false); }
    }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false); }}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex min-h-11 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-left text-sm hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex min-w-0 items-center gap-2 whitespace-normal break-words">
          <HotelIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className={label ? "font-medium text-foreground" : "text-muted-foreground"}>
            {label || placeholder}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-12 z-50 space-y-2 rounded-lg border border-border bg-card p-2 shadow-lg">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Digite pelo menos 2 caracteres..."
            className="h-11 min-h-11 text-sm"
            aria-label="Buscar hotel canônico"
          />
          <div role="listbox" className="max-h-60 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-3 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> Buscando no banco central...
              </div>
            ) : hasError ? (
              <p role="alert" className="p-3 text-center text-xs text-destructive">Não foi possível buscar hotéis. Reabra a busca para tentar novamente.</p>
            ) : query.trim().length < 2 ? (
              <p className="p-3 text-center text-xs text-muted-foreground">Digite o nome, cidade ou destino.</p>
            ) : options.length === 0 ? (
              <p className="p-3 text-center text-xs text-muted-foreground">Nenhum hotel canônico encontrado.</p>
            ) : (
              options.map((hotel) => (
                <button
                  key={hotel.id}
                  type="button"
                  role="option"
                  aria-selected={hotel.id === value}
                  onClick={() => {
                    setSelectedHotel(hotel);
                    onChange(hotel);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0 whitespace-normal break-words">
                    <span className="block font-medium">{hotel.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {[hotel.city, hotel.state, hotel.country].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {hotel.id === value && <Check className="size-4 shrink-0 text-primary" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
