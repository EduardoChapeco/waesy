import * as React from "react";
import { cn } from "@/lib/utils";
import { NavigationRail, type NavigationRailItem } from "./navigation-rail";
import { MasterPanel, type MasterPanelProps } from "./master-panel";
import { DesktopShell } from "./desktop-shell";

export interface WorkspaceThreePaneProps {
  railItems?: NavigationRailItem[];
  activeRailId?: string;
  onSelectRailItem?: (id: string) => void;
  masterPanelProps?: MasterPanelProps;
  children: React.ReactNode;
  headerSlot?: React.ReactNode;
  utilityClusterSlot?: React.ReactNode;
  className?: string;
}

export function WorkspaceThreePane({
  railItems,
  activeRailId,
  onSelectRailItem,
  masterPanelProps,
  children,
  headerSlot,
  utilityClusterSlot,
  className,
}: WorkspaceThreePaneProps) {
  return (
    <DesktopShell
      railSlot={
        <NavigationRail
          items={railItems}
          activeId={activeRailId}
          onSelectItem={onSelectRailItem}
        />
      }
      masterPanelSlot={
        masterPanelProps ? <MasterPanel {...masterPanelProps} /> : undefined
      }
      headerSlot={headerSlot}
      utilityClusterSlot={utilityClusterSlot}
      className={className}
    >
      {children}
    </DesktopShell>
  );
}
