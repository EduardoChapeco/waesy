import React from "react";

interface StudioSidebarProps {
  children: React.ReactNode;
  className?: string;
  width?: number;
}

export function StudioSidebar({ children, className = "", width = 420 }: StudioSidebarProps) {
  return (
    <aside
      style={{ "--dyn-w": `${width}px` } as React.CSSProperties}
      className={`shrink-0 overflow-y-auto border-r border-border bg-surface dark:bg-zinc-950 p-5 no-scrollbar waesy-dyn-w ${className}`}
    >
      <div className="space-y-4">{children}</div>
    </aside>
  );
}
