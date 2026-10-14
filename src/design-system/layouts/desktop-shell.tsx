import * as React from "react";
import { cn } from "@/lib/utils";

export interface DesktopShellProps {
  railSlot: React.ReactNode;
  masterPanelSlot?: React.ReactNode;
  children: React.ReactNode;
  utilityClusterSlot?: React.ReactNode;
  headerSlot?: React.ReactNode;
  className?: string;
}

export function DesktopShell({
  railSlot,
  masterPanelSlot,
  children,
  utilityClusterSlot,
  headerSlot,
  className,
}: DesktopShellProps) {
  return (
    <div
      className={cn(
        "flex w-full h-dvh overflow-hidden bg-background text-foreground select-none",
        className
      )}
    >
      {/* 1. Global Navigation Rail (56-72px) */}
      <div className="shrink-0 h-full">{railSlot}</div>

      {/* 2. Optional Master Panel (280-380px) */}
      {masterPanelSlot && <div className="shrink-0 h-full">{masterPanelSlot}</div>}

      {/* 3. Workspace (flex-1, min-w-0, independent scroll) */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-background">
        {/* Global Header / TopBar inside workspace */}
        {(headerSlot || utilityClusterSlot) && (
          <header className="flex items-center justify-between h-14 px-6 border-b border-border/50 bg-card/60 backdrop-blur-xs shrink-0 z-10">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {headerSlot}
            </div>
            {utilityClusterSlot && (
              <div className="shrink-0 pl-4">{utilityClusterSlot}</div>
            )}
          </header>
        )}

        {/* Scrollable Canvas */}
        <div className="flex-1 overflow-y-auto native-scroll p-6">
          <div className="max-w-desktop mx-auto w-full">{children}</div>
        </div>
      </main>
    </div>
  );
}
