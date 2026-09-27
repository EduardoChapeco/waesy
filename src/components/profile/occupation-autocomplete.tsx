import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  GLOBAL_PROFESSIONS_CATALOG,
  findProfessionByTitle,
  type ProfessionDefinition,
} from "@/lib/data/professions-catalog";
import { formatMoney } from "@/lib/money";
import { Briefcase, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OccupationAutocompleteProps {
  value: string;
  onChange: (title: string, profession?: ProfessionDefinition) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * ── AUTOCOMPLETE HUMANO DE CARGOS & OCUPAÇÕES ──
 * Erradica botões e jargões burocráticos do governo ("CBO").
 * Sugere ocupações limpas em tempo real, vinculando internamente ao profession_id.
 */
export function OccupationAutocomplete({
  value,
  onChange,
  placeholder = "Digite seu cargo (ex: Desenvolvedor, Designer UI/UX, Vendedor, Enfermeiro)...",
  className,
  autoFocus = false,
}: OccupationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Fecha dropdown se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = React.useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean || clean.length < 2) return [];

    // Normaliza variações comuns (dev -> desenvolv, front -> frontend, etc.)
    const searchTerms = [clean];
    if (clean === "dev" || clean.startsWith("dev")) searchTerms.push("desenvolv", "software", "programad");
    if (clean.includes("front")) searchTerms.push("frontend", "front-end", "interface");
    if (clean.includes("back")) searchTerms.push("backend", "back-end");
    if (clean.includes("ux") || clean.includes("ui")) searchTerms.push("design", "interface");
    if (clean.includes("rh")) searchTerms.push("recursos humanos", "recrut");

    return GLOBAL_PROFESSIONS_CATALOG.filter((p) => {
      const titleLower = p.title.toLowerCase();
      const sectorLower = p.sector.toLowerCase();
      const tagsLower = p.tags.map((t) => t.toLowerCase());

      return searchTerms.some(
        (term) =>
          titleLower.includes(term) ||
          sectorLower.includes(term) ||
          tagsLower.some((t) => t.includes(term))
      );
    }).slice(0, 6);
  }, [query]);

  const matchedProfession = React.useMemo(() => {
    return findProfessionByTitle(value);
  }, [value]);

  const handleSelect = (prof: ProfessionDefinition) => {
    setQuery(prof.title);
    onChange(prof.title, prof);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setQuery(next);
    onChange(next, undefined);
    setIsOpen(true);
  };

  return (
    <div ref={wrapperRef} className={cn("relative w-full space-y-1.5", className)}>
      <div className="relative">
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="h-10 rounded-xl text-xs pr-8 bg-background border-border/60 focus:border-primary transition-all"
        />
        {matchedProfession && (
          <div
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            title="Cargo verificado no catálogo oficial de carreiras"
          >
            <Check className="size-4 text-emerald-500" />
          </div>
        )}
      </div>

      {/* Floating Suggestions Dropdown (Apple HIG Polish) */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-2xl bg-popover/95 backdrop-blur-md border border-border shadow-xl p-1.5 space-y-1 max-h-64 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Cargos e Funções Sugeridos</span>
            <span className="font-normal lowercase">Toque para selecionar</span>
          </div>

          {suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full text-left p-2.5 rounded-xl hover:bg-muted/70 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Briefcase className="size-3.5 text-primary shrink-0" />
                  <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {p.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{p.sector}</span>
                  {p.junior_salary_cents > 0 && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        Piso médio: {formatMoney(p.junior_salary_cents)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <Badge
                variant="outline"
                className="text-[10px] shrink-0 font-medium border-border/50 group-hover:border-primary/40"
              >
                Selecionar
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Benchmark Salarial Discreto (Silêncio Visual) */}
      {matchedProfession && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
            <Sparkles className="size-3" />
            Média de mercado: {formatMoney(matchedProfession.junior_salary_cents)} a {formatMoney(matchedProfession.senior_salary_cents)}
          </span>
          <span className="text-border">•</span>
          <span>{matchedProfession.sector}</span>
        </div>
      )}
    </div>
  );
}
