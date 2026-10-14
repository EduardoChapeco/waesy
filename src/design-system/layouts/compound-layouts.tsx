import * as React from "react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* 1. WorkspaceTwoPane                                                        */
/* -------------------------------------------------------------------------- */

export interface WorkspaceTwoPaneProps {
  primarySlot: React.ReactNode;
  secondarySlot: React.ReactNode;
  secondaryWidth?: "sm" | "md" | "lg";
  className?: string;
}

export function WorkspaceTwoPane({
  primarySlot,
  secondarySlot,
  secondaryWidth = "md",
  className,
}: WorkspaceTwoPaneProps) {
  const widthClasses = {
    sm: "w-72 md:w-80",
    md: "w-80 md:w-96",
    lg: "w-96 md:w-1/3",
  }[secondaryWidth];

  return (
    <div className={cn("flex flex-col lg:flex-row gap-6 w-full h-full", className)}>
      <div className="flex-1 min-w-0">{primarySlot}</div>
      <div className={cn("shrink-0", widthClasses)}>{secondarySlot}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. MasterDetailLayout                                                      */
/* -------------------------------------------------------------------------- */

export interface MasterDetailLayoutProps {
  listSlot: React.ReactNode;
  detailSlot: React.ReactNode;
  emptyDetailSlot?: React.ReactNode;
  hasSelectedDetail?: boolean;
  className?: string;
}

export function MasterDetailLayout({
  listSlot,
  detailSlot,
  emptyDetailSlot,
  hasSelectedDetail = false,
  className,
}: MasterDetailLayoutProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-12 gap-6 w-full h-full min-h-0",
        className
      )}
    >
      {/* Master List Column */}
      <div className="md:col-span-5 lg:col-span-4 overflow-y-auto native-scroll">
        {listSlot}
      </div>

      {/* Detail Inspector Column */}
      <div className="md:col-span-7 lg:col-span-8 overflow-y-auto native-scroll rounded-lg border border-border/70 bg-card p-6">
        {hasSelectedDetail ? detailSlot : emptyDetailSlot ?? detailSlot}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. DashboardGrid                                                           */
/* -------------------------------------------------------------------------- */

export interface DashboardGridProps {
  metricsSlot?: React.ReactNode;
  chartsSlot?: React.ReactNode;
  feedSlot?: React.ReactNode;
  tasksSlot?: React.ReactNode;
  className?: string;
}

export function DashboardGrid({
  metricsSlot,
  chartsSlot,
  feedSlot,
  tasksSlot,
  className,
}: DashboardGridProps) {
  return (
    <div className={cn("space-y-6 w-full", className)}>
      {metricsSlot && <div>{metricsSlot}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {chartsSlot && <div className="lg:col-span-8 space-y-6">{chartsSlot}</div>}
        {(feedSlot || tasksSlot) && (
          <div className="lg:col-span-4 space-y-6">
            {feedSlot}
            {tasksSlot}
          </div>
        )}
      </div>
    </div>
  );
}
