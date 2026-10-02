/**
 * @fileoverview Tipos e definições de componentes para o Omni-Builder (Waesy BigTech).
 * Schemas e DTOs canônicos residem em @/types/omni-builder.
 */

import React from "react";
import type { SiteBlockCategory, OmniBlockStyling } from "@/types/omni-builder";

export * from "@/types/omni-builder";

export interface SiteBuilderBlockDefinition<T = any> {
  id: string;
  name: string;
  category: SiteBlockCategory;
  description: string;
  component: React.ComponentType<{ id: string; data: T; styling?: OmniBlockStyling; className?: string }>;
  defaultProps: T;
  defaultStyling?: OmniBlockStyling;
}
