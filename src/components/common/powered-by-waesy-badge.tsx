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
          "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium transition-all shadow-xs",
          isDark
            ? "bg-black/80 text-white/80 border border-white/10 hover:border-white/20 hover:text-white"
            : isLight
            ? "bg-white text-zinc-700 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-900"
            : "bg-muted/40 text-muted-foreground border border-border/60 hover:text-foreground hover:border-border",
          className
        )}
      >
        <span className="text-[10px] opacity-75">Criado com</span>
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
            <span className="font-mono text-[10px] opacity-80">{shortUrl}</span>
          </>
        )}
      </a>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 text-[10px] font-medium tracking-wide select-none py-2",
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
