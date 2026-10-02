import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface ChoiceCardProps extends React.HTMLAttributes<HTMLDivElement> {
 icon: React.ComponentType<{ className?: string }>;
 title: string;
 description: string;
 badge?: string;
 selected?: boolean;
 onSelect?: () => void;
 disabled?: boolean;
}

export const ChoiceCard = React.forwardRef<HTMLDivElement, ChoiceCardProps>(
 (
 {
 className,
 icon: Icon,
 title,
 description,
 badge,
 selected = false,
 onSelect,
 disabled = false,
 ...props
 },
 ref,
 ) => {
 const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
 if (disabled) return;
 if (e.key === "Enter" || e.key === " ") {
 e.preventDefault();
 onSelect?.();
 }
 };

 return (
 <div
 ref={ref}
 role="button"
 tabIndex={disabled ? -1 : 0}
 aria-pressed={selected}
 aria-disabled={disabled}
 onClick={disabled ? undefined : onSelect}
 onKeyDown={handleKeyDown}
 className={cn(
 "squircle squircle-hover bg-card p-5 relative select-none cursor-pointer flex flex-col justify-between transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
 selected && "squircle-selected border-primary",
 disabled && "opacity-50 pointer-events-none cursor-not-allowed",
 className,
 )}
 {...props}
 >
 {/* Top bar: Icon tile + optional Badge + Selected Indicator */}
 <div className="flex items-start justify-between gap-3 mb-4">
 <div
 className={cn(
 "squircle-soft size-12 flex items-center justify-center transition-colors shrink-0",
 selected
 ? "bg-primary text-primary-foreground "
 : "bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary",
 )}
 >
 <Icon className="size-6" />
 </div>

 <div className="flex items-center gap-2">
 {badge && (
 <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider">
 {badge}
 </Badge>
 )}

 {selected && (
 <div className="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center ">
 <Check className="size-3.5 stroke-[3]" />
 </div>
 )}
 </div>
 </div>

 {/* Content */}
 <div className="space-y-1">
 <h3 className="text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
 {title}
 </h3>
 <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
 </div>
 </div>
 );
 },
);
ChoiceCard.displayName = "ChoiceCard";
