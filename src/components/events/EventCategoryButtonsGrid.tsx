import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkle,
  Smiley,
  Ghost,
  MaskHappy,
  MusicNotes,
  Microphone,
  Tent,
  SquaresFour,
  X,
  Ticket,
  ForkKnife,
  GraduationCap,
  ShoppingBag,
  Tag,
  Flame,
  Confetti,
} from "@phosphor-icons/react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface EventCategoryButtonItem {
  id: string;
  label: string;
  to?: string;
  icon?: React.ComponentType<any>;
  imageUrl?: string | null;
  badge?: string | null;
  isAction?: boolean;
  categoryFilter?: string;
}

const DEFAULT_EVENT_8_BUTTONS: EventCategoryButtonItem[] = [
  {
    id: "clube",
    label: "Desconto Clube",
    to: "/conta/creditos",
    icon: Sparkle,
    badge: "VIP",
  },
  {
    id: "familia",
    label: "Família",
    categoryFilter: "infantil",
    icon: Smiley,
  },
  {
    id: "halloween",
    label: "Halloween",
    categoryFilter: "festas",
    icon: Ghost,
  },
  {
    id: "teatro",
    label: "Teatro e Arte",
    categoryFilter: "teatro",
    icon: MaskHappy,
  },
  {
    id: "shows",
    label: "Festas e Shows",
    categoryFilter: "shows",
    icon: MusicNotes,
  },
  {
    id: "standup",
    label: "Stand UP",
    categoryFilter: "teatro",
    icon: Microphone,
  },
  {
    id: "festivais",
    label: "Festivais",
    categoryFilter: "shows",
    icon: Tent,
  },
  {
    id: "ver_mais",
    label: "Ver mais",
    icon: SquaresFour,
    isAction: true,
  },
];

export const ALL_EXPANDED_EVENT_CATEGORIES = [
  { id: "todos", label: "Todos os Eventos", icon: Ticket },
  { id: "shows", label: "Shows e Baladas", icon: MusicNotes },
  { id: "sertanejo", label: "Sertanejo e Modão", icon: Flame },
  { id: "pagode", label: "Samba e Pagode", icon: Confetti },
  { id: "gastronomico", label: "Gastronomia e Feiras", icon: ForkKnife },
  { id: "teatro", label: "Teatro e Stand-up", icon: MaskHappy },
  { id: "feiras", label: "Feiras e Bazares", icon: ShoppingBag },
  { id: "workshops", label: "Cursos e Workshops", icon: GraduationCap },
  { id: "infantil", label: "Infantil e Família", icon: Smiley },
  { id: "gratis", label: "Entrada Gratuita", icon: Tag },
];

export interface EventCategoryButtonsGridProps {
  buttons?: EventCategoryButtonItem[];
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
  categoryCounts?: Record<string, number>;
  className?: string;
}

export function EventCategoryButtonsGrid({
  buttons = DEFAULT_EVENT_8_BUTTONS,
  activeCategory = "todos",
  onSelectCategory,
  categoryCounts = {},
  className,
}: EventCategoryButtonsGridProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleButtonClick = (item: EventCategoryButtonItem) => {
    if (item.isAction) {
      setDrawerOpen(true);
      return;
    }
    if (item.categoryFilter && onSelectCategory) {
      onSelectCategory(item.categoryFilter === activeCategory ? "todos" : item.categoryFilter);
    }
  };

  return (
    <section
      aria-label="Categorias de Eventos"
      className={cn("w-full px-3 sm:px-4 pt-7 pb-3", className)}
      data-testid="event-category-buttons-grid"
    >
      {/* ── Grade 2x4 Canônica de Botões Squircles (Sympla/iFood Padrão) ── */}
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {buttons.map((btn) => {
          const IconComp = btn.icon || SquaresFour;
          const isSelected = btn.categoryFilter && btn.categoryFilter === activeCategory;

          const content = (
            <div
              className={cn(
                "w-full aspect-[1/1.05] min-h-18 sm:min-h-20 rounded-2xl border transition-all duration-200 select-none",
                "flex flex-col items-center justify-center p-1.5 text-center cursor-pointer relative",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card border-border/60 hover:bg-muted/40 hover:border-foreground/30 text-foreground shadow-2xs",
              )}
            >
              {btn.badge && (
                <div className="absolute top-1 right-1 pointer-events-none">
                  <Badge
                    variant="default"
                    className="px-1 py-0 text-3xs font-black uppercase tracking-wider rounded-md"
                  >
                    {btn.badge}
                  </Badge>
                </div>
              )}

              {btn.imageUrl ? (
                <img
                  src={btn.imageUrl}
                  alt={btn.label}
                  className="size-7 sm:size-8 object-contain mb-1"
                  loading="lazy"
                />
              ) : (
                <div
                  className={cn(
                    "size-7 sm:size-8 flex items-center justify-center mb-1 transition-transform",
                    isSelected ? "text-primary-foreground" : "text-primary",
                  )}
                >
                  <IconComp size={24} weight="bold" />
                </div>
              )}

              <span
                className={cn(
                  "text-3xs sm:text-2xs font-bold line-clamp-1 px-0.5 leading-tight tracking-tight",
                  isSelected ? "text-primary-foreground font-black" : "text-foreground",
                )}
              >
                {btn.label}
              </span>
            </div>
          );

          if (btn.to && !btn.categoryFilter) {
            return (
              <Link
                key={btn.id}
                to={btn.to as any}
                className="w-full focus-visible:outline-none rounded-2xl"
                aria-label={btn.label}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={btn.id}
              type="button"
              onClick={() => handleButtonClick(btn)}
              className="w-full focus-visible:outline-none rounded-2xl"
              aria-label={btn.label}
            >
              {content}
            </button>
          );
        })}
      </div>

      {/* ── Gaveta Inferior Completa: Todas as Categorias (Ver mais) ── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 z-50">
          <SheetHeader className="pb-4 border-b border-border/40 text-left">
            <SheetTitle className="text-lg font-bold text-foreground">
              Todas as Categorias de Eventos
            </SheetTitle>
          </SheetHeader>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-4">
            {ALL_EXPANDED_EVENT_CATEGORIES.map((cat) => {
              const CatIcon = cat.icon;
              const isSelected = activeCategory === cat.id;
              const count = categoryCounts[cat.id];

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    if (onSelectCategory) onSelectCategory(cat.id);
                    setDrawerOpen(false);
                  }}
                  className={cn(
                    "h-12 min-h-12 px-3 rounded-xl border flex items-center justify-between text-left transition-colors cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95",
                    isSelected
                      ? "bg-foreground text-background border-foreground font-bold shadow-xs"
                      : "bg-card border-border/60 hover:bg-muted/40 text-foreground",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CatIcon size={20} weight="bold" className={isSelected ? "text-background" : "text-primary"} />
                    <span className="text-xs font-semibold truncate">{cat.label}</span>
                  </div>
                  {typeof count === "number" && count > 0 && (
                    <span
                      className={cn(
                        "text-3xs font-mono font-bold px-1.5 py-0.5 rounded-full shrink-0",
                        isSelected ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
