import type {
  AIActivityStep,
  ExecutionPlanStep,
  WorkspaceVfsFileEntry,
} from "@/types/chat";

export type AiSseEvent =
  | { type: "status"; phase: "planning" | "running" | "verifying"; message: string }
  | { type: "run_started"; executionId: string; threadId?: string; mode?: string; resumedChunk?: number }
  | { type: "plan_updated"; executionId: string; steps: ExecutionPlanStep[] }
  | { type: "file_updated"; executionId: string; file: WorkspaceVfsFileEntry; originalContent: string }
  | { type: "step_started"; step: AIActivityStep }
  | { type: "step_updated"; stepId: string; patch: Partial<AIActivityStep> }
  | { type: "step_completed"; step: AIActivityStep }
  | {
      type: "browser_frame";
      stepId?: string;
      url: string;
      screenshotUrl?: string;
      liveViewerUrl?: string;
      sessionId?: string;
      driver?: "vps_playwright_cdp" | "steel_cdp_session" | "steel_cloud" | "firecrawl_fallback";
      title?: string;
    }
  | {
      type: "checkpoint";
      executionId: string;
      threadId?: string;
      completedSteps: number;
      totalSteps: number;
      progressPercent: number;
      canAutoContinue: boolean;
      reason: string;
    }
  | {
      type: "artifact_draft";
      artifactType: string;
      title: string;
      partialPayload?: Record<string, unknown>;
    }
  | { type: "artifact_ready"; artifact: Record<string, unknown> }
  | { type: "widget"; widgetType: string; payload: Record<string, unknown> }
  | { type: "delta"; text: string; final: boolean }
  | { type: "structured"; payload: Record<string, unknown>; source: "platform" }
  | {
      type: "done";
      callId?: string;
      executionId?: string;
      provider?: string;
      model?: string;
      aiMessage?: Record<string, unknown>;
      updatedWorkingMemory?: Record<string, unknown>;
    }
  | { type: "error"; code: string; message: string };

export function encodeAiSseEvent(event: AiSseEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function createAiSseHeaders(): Headers {
  return new Headers({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
}
