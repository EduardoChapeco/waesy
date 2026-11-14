import React from "react";
import { cn } from "@/lib/utils";

interface PoweredByWaesyBadgeProps {
  className?: string;
  shortUrl?: string;
  variant?: "minimal" | "pill" | "footer";
  colorScheme?: "light" | "dark" | "auto";
}

export function PoweredByWaesyBadge({
  className,
  shortUrl,
  variant = "minimal",
  colorScheme = "auto",
}: PoweredByWaesyBadgeProps) {
  const isDark = colorScheme === "dark";
  const isLight = colorScheme === "light";

  if (variant === "pill") {
    return (
      <a
        href="https://usewaesy.pages.dev"
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1 rounded-full text-2xs font-medium transition-colors duration-200",
          isDark
            ? "bg-neutral-900 text-neutral-300 border border-neutral-700 hover:border-neutral-500 hover:text-neutral-50"
            : isLight
            ? "bg-card text-foreground border border-border hover:bg-muted"
            : "bg-muted text-muted-foreground border border-border hover:text-foreground",
          className
        )}
      >
        <span className="text-2xs opacity-75">Criado com</span>
        <span className="font-bold tracking-tight inline-flex items-center gap-1 text-foreground">
          <svg
            className="size-3 fill-current inline-block"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          waesy
        </span>
        {shortUrl && (
          <>
            <span className="opacity-40">•</span>
            <span className="font-mono text-2xs opacity-80">{shortUrl}</span>
          </>
        )}
      </a>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 text-2xs font-medium tracking-wide select-none py-2",
        isDark
          ? "text-zinc-400"
          : isLight
          ? "text-zinc-500"
          : "text-muted-foreground/70",
        className
      )}
    >
      <span className="opacity-80">Feito com</span>
      <a
        href="https://usewaesy.pages.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="font-bold tracking-tight inline-flex items-center gap-1 text-foreground/90 hover:text-primary transition-colors"
      >
        <svg
          className="size-2.5 fill-current inline-block text-primary"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Waesy</span>
      </a>
      {shortUrl && (
        <>
          <span className="opacity-40">•</span>
          <span className="font-mono opacity-80">{shortUrl}</span>
        </>
      )}
    </div>
  );
}
