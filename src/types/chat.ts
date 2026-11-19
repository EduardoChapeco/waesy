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
  | "thought"
  | "subagent"
  | "planner";

export type AIActivityStepStatus =
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type SubagentRole = "@planner" | "@investigator" | "@harvester" | "@critic" | string;

export interface ExecutionPlanStep {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  notes?: string;
}

export interface WorkspaceVfsFileEntry {
  path: string;
  content: string;
  language: string;
  updatedAt: string;
  sizeBytes: number;
  version: number;
}

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
  role?: SubagentRole;
  parentTaskId?: string;
  browserUrl?: string;
  screenshotUrl?: string;
  liveViewerUrl?: string;
  driver?: string;
  terminalOutput?: string;
  fileDiff?: string;
  fileName?: string;
  fileOriginal?: string;
  toolLogs?: Array<Record<string, any>>;
}

export type ChatArtifactType =
  | "document"
  | "spreadsheet"
  | "presentation"
  | "landing_page"
  | "proposal"
  | "image"
  | "video"
  | "omnibuilder"
  | "code"
  | "itinerary"
  | "travel_itinerary"
  | "chart"
  | "interactive_table"
  | "biolink_cluster"
  | "builder_bridge"
  | "travel_dossier"
  | "document_preview"
  | "website"
  | "social_post"
  | "dashboard"
  | "map_view"
  | "creative_post"
  | "carousel"
  | "motion_video"
  | "simlab_report"
  | "business_plan"
  | "web_app"
  | "schedule_plan";

export type CopilotQuickToolMode =
  | "default"
  | "website_builder"
  | "interactive_map"
  | "document"
  | "creative_post"
  | "hot_offer";

export interface ChatSourceItem {
  id: string;
  title: string;
  kind: "platform" | "place" | "project_file" | "attachment" | "builder" | "mcp" | "web";
  detail?: string;
  url?: string;
}

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
