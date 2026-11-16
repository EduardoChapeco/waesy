import type {
  AIActivityStep,
  ChatArtifactData,
  ChatSourceItem,
  CopilotFsmExecutionState,
  CopilotFsmPhase,
  CopilotQuickToolMode,
  ExecutionPlanStep,
  WorkspaceVfsFileEntry,
} from "@/types/chat";
import type { AiSseEvent } from "@/lib/ai/sse";

export interface AiToolExecutionRecord {
  tool: string;
  arguments: Record<string, any>;
  status: "success" | "error";
  durationMs: number;
  resultSummary?: string;
  executedAt: string;
}

export interface AiExecutionResult {
  responseMessage: string;
  activitySteps: AIActivityStep[];
  executionId?: string;
  toolCalls?: AiToolExecutionRecord[];
  artifact?: ChatArtifactData;
  structuredPayload?: Record<string, any>;
  sources?: ChatSourceItem[];
  updatedMemory: Record<string, any>;
  fsmPhase?: CopilotFsmPhase;
  fsmState?: CopilotFsmExecutionState;
  plan?: ExecutionPlanStep[];
  vfsFiles?: WorkspaceVfsFileEntry[];
  checkpoint?: {
    hasMore: boolean;
    progressPercent: number;
    completedSteps: number;
    totalSteps: number;
    reason?: string;
  };
  liveBrowserFrame?: {
    url: string;
    screenshotUrl?: string;
    liveViewerUrl?: string;
    sessionId?: string;
    driver?: string;
    title?: string;
  };
}

export interface AiCopilotContext {
  threadId?: string;
  userId?: string;
  storeId?: string;
  folderId?: string | null;
  projectId?: string | null;
  projectKnowledgeContext?: string;
  quickToolMode?: CopilotQuickToolMode;
  userLat?: number;
  userLng?: number;
  city?: string;
  state?: string;
  signal?: AbortSignal;
  /** URLs (storage) dos anexos enviados pelo usuário nesta mensagem. */
  attachments?: string[];
  /** Histórico recente da conversa para janela deslizante e compactação automática. */
  recentMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  onEvent?: (event: AiSseEvent) => Promise<void> | void;
  /** Quando true, ignora chamada bloqueante do Estágio 1 e delega planejamento + tokens progressivos ao loop ReAct. */
  streamReact?: boolean;
  /** Retomada de checkpoint duravel a partir de uma execucao pausada/em andamento. */
  continueExecutionId?: string;
  /** Orientacao humana injetada ao assumir controle ou corrigir rota em tempo real. */
  userGuidance?: string;
  /** Limite maximo opcional de iteracoes do ciclo atual antes de emitir checkpoint. */
  maxChunkIterations?: number;
  /** Uso estritamente interno em workers cron confiaveis (nunca aceitar do cliente HTTP). */
  workerBypass?: boolean;
}
