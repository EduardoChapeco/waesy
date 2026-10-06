/**
 * @fileoverview Tipos e definições de componentes para o Omni-Builder (Waesy BigTech).
 * Schemas e DTOs canônicos residem em @/types/omni-builder.
 */

import React from "react";
import type { SiteBlockCategory, OmniBlockStyling } from "@/types/omni-builder";

export * from "@/types/omni-builder";

export interface SiteBuilderBlockDefinition<T = any> {
  id: string;
  version?: string;
  name: string;
  category: SiteBlockCategory;
  description: string;
  capabilities?: Array<"responsive" | "cms" | "motion" | "media" | "form" | "commerce">;
  sourceOfTruth?: "waesy" | "external";
  component: React.ComponentType<{ id: string; data: T; styling?: OmniBlockStyling; className?: string }>;
  defaultProps: T;
  defaultStyling?: OmniBlockStyling;
}
