import * as React from "react";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  homeHref?: string;
  onHomeClick?: () => void;
  className?: string;
}

export function Breadcrumbs({
  items,
  homeHref,
  onHomeClick,
  className,
}: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center text-xs select-none", className)}>
      <ol className="flex items-center gap-2 flex-wrap">
        <li>
          <button
            type="button"
            onClick={onHomeClick}
            aria-label="Página Inicial"
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <Home className="size-3.5" />
          </button>
        </li>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <React.Fragment key={idx}>
              <li className="text-muted-foreground/60">
                <ChevronRight className="size-3" />
              </li>
              <li>
                {isLast ? (
                  <span
                    aria-current="page"
                    className="font-semibold text-foreground px-1"
                  >
                    {item.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="text-muted-foreground hover:text-foreground transition-colors px-1 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  >
                    {item.label}
                  </button>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
