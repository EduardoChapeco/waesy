import * as React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?:
    | React.ReactNode
    | {
        label: string;
        onClick?: () => void;
        href?: string;
      };
  minimal?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  minimal = true,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        minimal
          ? "py-10 px-4 min-h-[220px] bg-transparent"
          : "p-8 md:p-12 min-h-[300px] border border-dashed rounded-xl bg-muted/30",
        className,
      )}
      {...props}
    >
      {Icon && (
        <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
          <Icon className="size-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-bold tracking-tight text-foreground mb-1">{title}</h3>
      {description ? (
        <p className="text-muted-foreground text-xs max-w-sm mx-auto mb-5">{description}</p>
      ) : null}
      {action &&
        (React.isValidElement(action) ? (
          action
        ) : (action as any).href ? (
          <Button asChild className="rounded-xl h-10 px-5 text-xs font-semibold">
            <a href={(action as any).href}>{(action as any).label}</a>
          </Button>
        ) : (
          <Button onClick={(action as any).onClick} className="rounded-xl h-10 px-5 text-xs font-semibold">
            {(action as any).label}
          </Button>
        ))}
    </div>
  );
}
