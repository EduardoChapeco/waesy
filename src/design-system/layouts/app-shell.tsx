import * as React from "react";
import { useWindowSizeClass } from "@/hooks/use-mobile";
import { DesktopShell } from "./desktop-shell";
import { MobileShell } from "./mobile-shell";

export interface DSAppShellProps {
  railSlot: React.ReactNode;
  masterPanelSlot?: React.ReactNode;
  children: React.ReactNode;
  headerSlot?: React.ReactNode;
  utilityClusterSlot?: React.ReactNode;
  bottomNavSlot?: React.ReactNode;
  contextActionSlot?: React.ReactNode;
  className?: string;
}

/**
 * AppShell: Casca unificada que bifurca deterministicamente entre DesktopShell e MobileShell
 * baseando-se nas Window Size Classes canônicas do Waesy (Compact < 600px, Medium 600-839px, Expanded >= 840px).
 */
export function AppShell({
  railSlot,
  masterPanelSlot,
  children,
  headerSlot,
  utilityClusterSlot,
  bottomNavSlot,
  contextActionSlot,
  className,
}: DSAppShellProps) {
  const { isExpanded } = useWindowSizeClass();

  if (isExpanded) {
    return (
      <DesktopShell
        railSlot={railSlot}
        masterPanelSlot={masterPanelSlot}
        headerSlot={headerSlot}
        utilityClusterSlot={utilityClusterSlot}
        className={className}
      >
        {children}
      </DesktopShell>
    );
  }

  return (
    <MobileShell
      headerSlot={headerSlot}
      bottomNavSlot={bottomNavSlot}
      contextActionSlot={contextActionSlot}
      className={className}
    >
      {masterPanelSlot && (
        <div className="mb-4 pb-4 border-b border-border/50">
          {masterPanelSlot}
        </div>
      )}
      {children}
    </MobileShell>
  );
}
