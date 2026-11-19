import * as React from "react";
import { MapPin, Plane, Search, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CANONICAL_DESTINATIONS } from "@/lib/tourism/destinations-catalog";
import {
  normalizeDestinationTagList,
  normalizeOpportunityText,
  resolveCanonicalDestinationTag,
  type StructuredDestinationTag,
} from "@/lib/travel/opportunity-matching-engine";
import type { DestinationCatalogSearchHit } from "@/lib/travel/travel-intent-parser";
import { searchUnifiedDestinationsCatalogFn } from "@/services/travel-intent-ai.functions";

interface DestinationTagsPickerProps {
  value: StructuredDestinationTag[];
  onChange: (tags: StructuredDestinationTag[]) => void;
  legacyText?: string | null;
  label?: string;
  placeholder?: string;
  multiple?: boolean;
  disabled?: boolean;
}

export function DestinationTagsPicker({
  value,
  onChange,
  legacyText,
  label = "Destinos de interesse",
  placeholder = "Buscar cidade, destino turístico ou IATA (ex: Maceió, POA, Cancún)...",
  multiple = true,
  disabled = false,
}: DestinationTagsPickerProps) {
  const inputId = React.useId();
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [remoteHits, setRemoteHits] = React.useState<DestinationCatalogSearchHit[]>([]);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const normalizedTags = React.useMemo(() => {
    return normalizeDestinationTagList(value, value.length === 0 ? legacyText : undefined);
  }, [value, legacyText]);

  React.useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (!isOpen) return;
    if (trimmed.length < 2) {
      setRemoteHits([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await searchUnifiedDestinationsCatalogFn({
          data: {
            query: trimmed,
            limit: 16,
            includeAirports: true,
            includeCities: true,
          },
        });
        if (!cancelled) {
          setRemoteHits(res.hits || []);
        }
      } catch {
        if (!cancelled) {
          setRemoteHits([]);
        }
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, isOpen]);

  const localHits = React.useMemo<DestinationCatalogSearchHit[]>(() => {
    const q = normalizeOpportunityText(query);
    return CANONICAL_DESTINATIONS.filter((d) => {
      if (!q) return true;
      return normalizeOpportunityText(`${d.name} ${d.city} ${d.state} ${d.iata}`).includes(q);
    })
      .slice(0, 10)
      .map((d) => {
        const resolved = resolveCanonicalDestinationTag(d.name);
        return {
          id: `local-${d.id}`,
          label: `${d.name}${d.state && d.state !== "INT" ? ` (${d.state})` : ""}`,
          normalized: resolved?.normalized || normalizeOpportunityText(d.city),
          iata: resolved?.iata || d.iata || null,
          gatewayIatas: resolved?.gatewayIatas || (d.iata ? [d.iata] : []),
          city: d.city,
          state: d.state,
          country: d.country,
          destinationId: d.id,
          cityIbge: null,
          source: "canonical" as const,
          subtitle: `${d.state === "INT" ? d.country : `${d.city} - ${d.state}`} · Gateway ${d.iata}`,
        };
      });
  }, [query]);

  const displayHits = React.useMemo(() => {
    const map = new Map<string, DestinationCatalogSearchHit>();
    for (const h of [...remoteHits, ...localHits]) {
      const key = `${h.normalized}::${h.iata || ""}`;
      if (!map.has(key)) map.set(key, h);
    }
    return Array.from(map.values()).slice(0, 14);
  }, [remoteHits, localHits]);

  const handleSelectHit = (hit: DestinationCatalogSearchHit) => {
    const tag: StructuredDestinationTag = {
      id: hit.id,
      label: hit.label,
      normalized: hit.normalized,
      iata: hit.iata,
      gatewayIatas: hit.gatewayIatas,
      city: hit.city,
      state: hit.state,
      country: hit.country,
      destinationId: hit.destinationId,
      cityIbge: hit.cityIbge,
      source: hit.source,
    };

    const exists = normalizedTags.some(
      (t) => t.normalized === tag.normalized && (t.iata || "") === (tag.iata || "")
    );
    if (!exists) {
      onChange(multiple ? [...normalizedTags, tag] : [tag]);
    }
    setQuery("");
    if (!multiple) setIsOpen(false);
  };

  const handleAddFreeText = () => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const resolved = resolveCanonicalDestinationTag(trimmed);
    if (!resolved) return;
    const exists = normalizedTags.some((t) => t.normalized === resolved.normalized);
    if (!exists) {
      onChange(multiple ? [...normalizedTags, resolved] : [resolved]);
    }
    setQuery("");
    if (!multiple) setIsOpen(false);
  };

  const handleRemoveTag = (idx: number) => {
    const next = normalizedTags.filter((_, i) => i !== idx);
    onChange(next);
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={inputId} className="text-xs font-semibold text-foreground">{label}</Label>
        {normalizedTags.length > 0 && (
          <Badge variant="outline" className="text-xs font-medium">
            {normalizedTags.length} {normalizedTags.length === 1 ? "selecionado" : "selecionados"}
          </Badge>
        )}
      </div>

      {normalizedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {normalizedTags.map((tag, idx) => (
            <button
              key={`${tag.normalized}-${tag.iata || idx}`}
              type="button"
              disabled={disabled}
              onClick={() => handleRemoveTag(idx)}
              aria-label={`Remover destino ${tag.label}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-secondary px-3 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <MapPin className="size-3.5 text-primary shrink-0" />
              <span>{tag.label}</span>
              {(tag.iata || (tag.gatewayIatas && tag.gatewayIatas.length > 0)) && (
                <span className="rounded bg-background/80 px-2 py-1 text-xs font-mono text-muted-foreground">
                  {tag.iata || tag.gatewayIatas?.slice(0, 2).join("/")}
                </span>
              )}
              <X className="size-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          value={query}
          disabled={disabled}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (displayHits.length > 0 && query.trim().length >= 2) {
                handleSelectHit(displayHits[0]);
              } else {
                handleAddFreeText();
              }
            } else if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          className="h-11 min-h-11 pl-10 pr-4 text-base md:text-sm"
        />

        {isOpen && !disabled && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-md">
            {isSearching && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Buscando destinos, cidades e aeroportos...
              </div>
            )}

            {displayHits.map((hit) => {
              const isSelected = normalizedTags.some(
                (t) => t.normalized === hit.normalized && (t.iata || "") === (hit.iata || "")
              );
              return (
                <button
                  key={hit.id}
                  type="button"
                  onClick={() => handleSelectHit(hit)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      {hit.source === "airports_global" ? (
                        <Plane className="size-3.5 text-info shrink-0" />
                      ) : (
                        <MapPin className="size-3.5 text-primary shrink-0" />
                      )}
                      <span className="whitespace-normal break-words">{hit.label}</span>
                    </div>
                    <div className="whitespace-normal break-words text-xs text-muted-foreground pl-5">{hit.subtitle}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {hit.iata && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {hit.iata}
                      </Badge>
                    )}
                    {isSelected && (
                      <Badge variant="success" className="text-xs">
                        Selecionado
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}

            {query.trim().length >= 2 && (
              <div className="mt-1 border-t border-border pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddFreeText}
                  className="h-11 min-h-11 w-full justify-start gap-2 text-xs font-medium"
                >
                  <Plus className="size-3.5" />
                  Adicionar &ldquo;{query.trim()}&rdquo;
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
