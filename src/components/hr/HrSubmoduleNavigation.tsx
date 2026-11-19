import React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Users, Clock, Wallet, ShieldCheck, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HrSubmoduleNavigationProps {
  activeModule?: "hub" | "ponto" | "folha" | "compliance";
  className?: string;
  totalEmployees?: number;
  openIssuesCount?: number;
}

export function HrSubmoduleNavigation({
  activeModule,
  className = "",
  totalEmployees,
  openIssuesCount,
}: HrSubmoduleNavigationProps) {
  const location = useLocation();
  const pathname = location.pathname;

  const currentActive =
    activeModule ||
    (pathname.includes("/rh/ponto")
      ? "ponto"
      : pathname.includes("/rh/folha")
        ? "folha"
        : pathname.includes("/rh/compliance")
          ? "compliance"
          : "hub");

  const items = [
    {
      id: "hub",
      label: "Colaboradores & Setores",
      href: "/workspace/rh",
      icon: Users,
      badge: totalEmployees !== undefined && totalEmployees > 0 ? `${totalEmployees}` : undefined,
    },
    {
      id: "ponto",
      label: "Ponto Eletrônico",
      href: "/workspace/rh/ponto",
      icon: Clock,
    },
    {
      id: "folha",
      label: "Folha & Benefícios",
      href: "/workspace/rh/folha",
      icon: Wallet,
    },
    {
      id: "compliance",
      label: "Compliance & ASO",
      href: "/workspace/rh/compliance",
      icon: ShieldCheck,
      badge: openIssuesCount !== undefined && openIssuesCount > 0 ? `${openIssuesCount}` : undefined,
      badgeVariant: "destructive" as const,
    },
  ];

  return (
    <nav
      aria-label="Submódulos de Gente & Gestão (RH/DP)"
      className={cn(
        "tab-strip flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/80 scrollbar-none",
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentActive === item.id;

        return (
          <Link
            key={item.id}
            to={item.href}
            className={cn(
              "min-h-11 h-11 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none",
              isActive
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{item.label}</span>
            {item.badge && (
              <span
                className={cn(
                  "ml-1 px-2 py-1 rounded-full text-3xs font-mono font-bold leading-none",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : item.badgeVariant === "destructive"
                      ? "bg-destructive/15 text-destructive font-extrabold"
                      : "bg-muted text-muted-foreground border border-border"
                )}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
