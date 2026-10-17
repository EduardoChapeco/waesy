import * as React from "react";
import { cn } from "@/lib/utils";

export interface MobileShellProps {
  headerSlot?: React.ReactNode;
  bottomNavSlot?: React.ReactNode;
  contextActionSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function MobileShell({
  headerSlot,
  bottomNavSlot,
  contextActionSlot,
  children,
  className,
}: MobileShellProps) {
  return (
    <div
      className={cn(
        "flex flex-col w-full h-dvh overflow-hidden bg-background text-foreground overscroll-none select-none",
        className
      )}
    >
      {/* 1. Native Mobile Header (Safe Area Aware) */}
      {headerSlot && (
        <header className="flex items-center justify-between min-h-12 px-4 safe-area-top border-b border-border/50 bg-card/95 backdrop-blur-md shrink-0 z-20">
          {headerSlot}
        </header>
      )}

      {/* 2. Scrollable Edge-Aware Content */}
      <main className="flex-1 overflow-y-auto native-scroll overscroll-contain px-4 py-3">
        {children}
      </main>

      {/* 3. Sticky Contextual Action (Hoober Thumb Zone) */}
      {contextActionSlot && (
        <div className="p-3 border-t border-border/40 bg-card/95 backdrop-blur-md shrink-0 z-10">
          {contextActionSlot}
        </div>
      )}

      {/* 4. Bottom Navigation (Safe Area Aware + Hide on Keyboard) */}
      {bottomNavSlot && (
        <nav
          aria-label="Navegação Inferior"
          className="min-h-14 safe-area-bottom border-t border-border/50 bg-card/95 backdrop-blur-md shrink-0 z-20 mobile-nav-hide-on-keyboard"
        >
          {bottomNavSlot}
        </nav>
      )}
    </div>
  );
}
