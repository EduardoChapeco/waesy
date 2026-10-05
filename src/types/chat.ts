/**
 * @fileoverview Tipos canônicos para o Shell de Conversa AI-First, Trilha de Atividade e Artefatos (Waesy BigTech).
 */

import type { CopilotFsmPhase, CopilotFsmExecutionState } from "./copilot-fsm";

export type { CopilotFsmPhase, CopilotFsmExecutionState };

export type AIActivityStepType =
  | "skill"
  | "tool"
  | "search"
  | "database"
  | "squad"
  | "model"
  | "thought";

export type AIActivityStepStatus =
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface AIActivityStep {
  id: string;
  type: AIActivityStepType;
  label: string;
  detail?: string;
  status: AIActivityStepStatus;
  fsmPhase?: CopilotFsmPhase;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  tokensUsed?: number;
  costUsd?: number;
}

export type ChatArtifactType =
  | "document"
  | "spreadsheet"
  | "presentation"
  | "landing_page"
  | "proposal"
  | "image"
  | "itinerary"
  | "travel_itinerary";

export interface ChatArtifactData {
  id: string;
  type: ChatArtifactType;
  title: string;
  version: number;
  totalVersions?: number;
  authorName?: string;
  authorRole?: string;
  updatedAt?: string;
  previewSummary?: string;
  data?: Record<string, any>;
  fileSizeBytes?: number;
}
