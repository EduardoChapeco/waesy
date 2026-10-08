import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Hotel as HotelIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchGlobalHotels, type GlobalHotelDTO } from "@/services/travel-catalog.functions";

interface HotelAutocompleteInputProps {
  value?: string | null;
  onChange: (hotel: GlobalHotelDTO | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function HotelAutocompleteInput({
  value,
  onChange,
  placeholder = "Buscar hotel ou resort no banco central...",
  disabled = false,
}: HotelAutocompleteInputProps) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<GlobalHotelDTO[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const requestId = useRef(0);

  const selected = options.find((hotel) => hotel.id === value || hotel.canonical_slug === value);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setOptions([]);
      setIsLoading(false);
      return;
    }

    const currentRequest = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchGlobalHotels({ data: { query: term } });
        if (currentRequest === requestId.current) setOptions(results);
      } catch {
        if (currentRequest === requestId.current) setOptions([]);
      } finally {
        if (currentRequest === requestId.current) setIsLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex min-h-11 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-left text-sm hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <HotelIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className={selected ? "truncate font-medium text-foreground" : "truncate text-muted-foreground"}>
            {selected ? `${selected.name} · ${selected.city}` : placeholder}
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
            className="h-10 text-sm"
            aria-label="Buscar hotel canônico"
          />
          <div role="listbox" className="max-h-60 overflow-y-auto space-y-1">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-3 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Buscando no banco central...
              </div>
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
                    onChange(hotel);
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="min-w-0 truncate">
                    <span className="block truncate font-medium">{hotel.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
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
