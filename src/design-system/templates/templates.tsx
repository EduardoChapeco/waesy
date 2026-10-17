import * as React from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "../sections/page-sections";
import { MetricStrip } from "../sections/page-sections";

/* -------------------------------------------------------------------------- */
/* 1. DashboardTemplate                                                       */
/* -------------------------------------------------------------------------- */

export interface DashboardTemplateProps {
  title: string;
  description?: string;
  headerActionsSlot?: React.ReactNode;
  metricCardsSlot: React.ReactNode;
  primaryChartSlot?: React.ReactNode;
  secondaryWidgetSlot?: React.ReactNode;
  recentActivitySlot?: React.ReactNode;
  quickActionsSlot?: React.ReactNode;
  className?: string;
}

export function DashboardTemplate({
  title,
  description,
  headerActionsSlot,
  metricCardsSlot,
  primaryChartSlot,
  secondaryWidgetSlot,
  recentActivitySlot,
  quickActionsSlot,
  className,
}: DashboardTemplateProps) {
  return (
    <div className={cn("space-y-6 w-full pb-8", className)}>
      <PageHeader
        title={title}
        description={description}
        actionsSlot={headerActionsSlot}
      />

      <MetricStrip columns={4}>{metricCardsSlot}</MetricStrip>

      {quickActionsSlot && <div>{quickActionsSlot}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          {primaryChartSlot}
        </div>
        <div className="lg:col-span-4 space-y-6">
          {secondaryWidgetSlot}
          {recentActivitySlot}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. TransactionsTemplate                                                    */
/* -------------------------------------------------------------------------- */

export interface TransactionsTemplateProps {
  title: string;
  description?: string;
  toolbarSlot: React.ReactNode;
  tableSlot: React.ReactNode;
  summaryStatsSlot?: React.ReactNode;
  className?: string;
}

export function TransactionsTemplate({
  title,
  description,
  toolbarSlot,
  tableSlot,
  summaryStatsSlot,
  className,
}: TransactionsTemplateProps) {
  return (
    <div className={cn("space-y-6 w-full pb-8", className)}>
      <PageHeader title={title} description={description} />
      {summaryStatsSlot && <div>{summaryStatsSlot}</div>}
      <div className="space-y-4">
        {toolbarSlot}
        {tableSlot}
      </div>
    </div>
  );
}
