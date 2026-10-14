import * as React from "react";
import { Plane, Calendar, Users, Edit3, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TravelSearchBubbleProps {
  route: string;
  dates: string;
  passengers: string;
  onClick?: () => void;
  className?: string;
}

export function TravelSearchBubble({
  route,
  dates,
  passengers,
  onClick,
  className,
}: TravelSearchBubbleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-3 px-4 py-2 rounded-full border border-border/80 bg-card hover:bg-muted/50 text-foreground transition-colors cursor-pointer select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-xs",
        className
      )}
    >
      <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
        <Plane className="size-3.5 text-primary" />
        <span>{route}</span>
      </div>

      <div className="w-px h-3.5 bg-border" />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="size-3" />
        <span>{dates}</span>
      </div>

      <div className="w-px h-3.5 bg-border" />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="size-3" />
        <span>{passengers}</span>
      </div>

      <Edit3 className="size-3 text-muted-foreground ml-1" />
    </button>
  );
}
