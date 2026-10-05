/**
 * copilot-fsm.ts — Máquina de Estados Determinística de 13 Fases do Waesy Copilot.
 * 
 * Fonte Normativa: CHAT_CONTRACT.md (Seção 2: 13 Estados Oficiais).
 * `RECEIVED` -> `UNDERSTANDING` -> `NEEDS_CLARIFICATION` -> `PLANNED` ->
 * `WAITING_APPROVAL` -> `RUNNING` -> `WAITING_TOOL` -> `PARTIAL_RESULT` ->
 * `VALIDATING` -> `COMPLETED` | `FAILED_RETRYABLE` | `FAILED_FINAL` | `CANCELLED`.
 */

export const COPILOT_FSM_PHASES = [
  "RECEIVED",
  "UNDERSTANDING",
  "NEEDS_CLARIFICATION",
  "PLANNED",
  "WAITING_APPROVAL",
  "RUNNING",
  "WAITING_TOOL",
  "PARTIAL_RESULT",
  "VALIDATING",
  "COMPLETED",
  "FAILED_RETRYABLE",
  "FAILED_FINAL",
  "CANCELLED",
] as const;

export type CopilotFsmPhase = (typeof COPILOT_FSM_PHASES)[number];

export interface CopilotFsmPhaseMeta {
  readonly phase: CopilotFsmPhase;
  readonly label: string;
  readonly description: string;
  readonly isTerminal: boolean;
  readonly isFailure: boolean;
  readonly allowsRetry: boolean;
}

export const COPILOT_FSM_PHASE_META: Record<CopilotFsmPhase, CopilotFsmPhaseMeta> = {
  RECEIVED: {
    phase: "RECEIVED",
    label: "Mensagem Recebida",
    description: "Mensagem ingressou no gateway soberano e foi registrada na thread.",
    isTerminal: false,
    isFailure: false,
    allowsRetry: false,
  },
  UNDERSTANDING: {
    phase: "UNDERSTANDING",
    label: "Compreensão de Intenção",
    description: "Análise contextual, decomposição sintática e inspeção perimetral de segurança.",
    isTerminal: false,
    isFailure: false,
    allowsRetry: false,
  },
  NEEDS_CLARIFICATION: {
    phase: "NEEDS_CLARIFICATION",
    label: "Aguardando Esclarecimento",
    description: "Ambiguidade detectada; assistente aguarda parâmetros adicionais do usuário.",
    isTerminal: false,
    isFailure: false,
    allowsRetry: false,
  },
  PLANNED: {
    phase: "PLANNED",
    label: "Plano Estruturado",
    description: "Grafo de ferramentas e etapas de execução composto com sucesso.",
    isTerminal: false,
    isFailure: false,
    allowsRetry: false,
  },
  WAITING_APPROVAL: {
    phase: "WAITING_APPROVAL",
    label: "Aguardando Aprovação",
    description: "Ação de alto impacto ou modificação patrimonial aguardando confirmação humana.",
    isTerminal: false,
    isFailure: false,
    allowsRetry: false,
  },
  RUNNING: {
    phase: "RUNNING",
    label: "Em Execução",
    description: "Execução ativa do pipeline soberano ou despachante de ferramentas.",
    isTerminal: false,
    isFailure: false,
    allowsRetry: false,
  },
  WAITING_TOOL: {
    phase: "WAITING_TOOL",
    label: "Aguardando Ferramenta",
    description: "Aguardando retorno síncrono de harvester externo ou MCP tool.",
    isTerminal: false,
    isFailure: false,
    allowsRetry: false,
  },
  PARTIAL_RESULT: {
    phase: "PARTIAL_RESULT",
    label: "Resultado Parcial",
    description: "Resultados preliminares obtidos de fontes intermediárias.",
    isTerminal: false,
    isFailure: false,
    allowsRetry: false,
  },
  VALIDATING: {
    phase: "VALIDATING",
    label: "Validação de Qualidade",
    description: "Verificação de integridade, sanitização de saída e validação de schema.",
    isTerminal: false,
    isFailure: false,
    allowsRetry: false,
  },
  COMPLETED: {
    phase: "COMPLETED",
    label: "Concluído com Sucesso",
    description: "Execução finalizada com resposta e artefatos emitidos sem erros.",
    isTerminal: true,
    isFailure: false,
    allowsRetry: false,
  },
  FAILED_RETRYABLE: {
    phase: "FAILED_RETRYABLE",
    label: "Falha Recuperável",
    description: "Erro transitório em ferramenta ou rede externa; permite nova tentativa segura.",
    isTerminal: false,
    isFailure: true,
    allowsRetry: true,
  },
  FAILED_FINAL: {
    phase: "FAILED_FINAL",
    label: "Falha Irrecuperável",
    description: "Violação estrita de segurança, esgotamento de retentativas ou erro fatal.",
    isTerminal: true,
    isFailure: true,
    allowsRetry: false,
  },
  CANCELLED: {
    phase: "CANCELLED",
    label: "Cancelado pelo Usuário",
    description: "Operação interrompida por solicitação explícita do usuário ou timeout.",
    isTerminal: true,
    isFailure: false,
    allowsRetry: false,
  },
};

/**
 * Matriz canônica de transições válidas da FSM de 13 fases.
 */
export const COPILOT_FSM_TRANSITIONS: Record<CopilotFsmPhase, readonly CopilotFsmPhase[]> = {
  RECEIVED: ["UNDERSTANDING", "CANCELLED", "FAILED_FINAL"],
  UNDERSTANDING: [
    "NEEDS_CLARIFICATION",
    "PLANNED",
    "RUNNING",
    "VALIDATING",
    "COMPLETED",
    "FAILED_RETRYABLE",
    "FAILED_FINAL",
    "CANCELLED",
  ],
  NEEDS_CLARIFICATION: ["RECEIVED", "UNDERSTANDING", "CANCELLED"],
  PLANNED: ["WAITING_APPROVAL", "RUNNING", "CANCELLED", "FAILED_RETRYABLE"],
  WAITING_APPROVAL: ["RUNNING", "PLANNED", "CANCELLED"],
  RUNNING: [
    "WAITING_TOOL",
    "PARTIAL_RESULT",
    "VALIDATING",
    "COMPLETED",
    "FAILED_RETRYABLE",
    "FAILED_FINAL",
    "CANCELLED",
  ],
  WAITING_TOOL: [
    "PARTIAL_RESULT",
    "RUNNING",
    "VALIDATING",
    "FAILED_RETRYABLE",
    "FAILED_FINAL",
    "CANCELLED",
  ],
  PARTIAL_RESULT: [
    "RUNNING",
    "WAITING_TOOL",
    "VALIDATING",
    "COMPLETED",
    "FAILED_RETRYABLE",
    "FAILED_FINAL",
    "CANCELLED",
  ],
  VALIDATING: [
    "COMPLETED",
    "RUNNING",
    "FAILED_RETRYABLE",
    "FAILED_FINAL",
    "CANCELLED",
  ],
  COMPLETED: [],
  FAILED_RETRYABLE: [
    "RECEIVED",
    "RUNNING",
    "FAILED_FINAL",
    "CANCELLED",
  ],
  FAILED_FINAL: [],
  CANCELLED: [],
};

/**
 * Verifica se uma fase é terminal.
 */
export function isTerminalCopilotPhase(phase: CopilotFsmPhase): boolean {
  return COPILOT_FSM_PHASE_META[phase].isTerminal;
}

/**
 * Valida se uma transição de fase é permitida pelo contrato canônico.
 */
export function canTransitionCopilotPhase(
  from: CopilotFsmPhase,
  to: CopilotFsmPhase
): boolean {
  if (from === to) return true; // idempotente
  const allowed = COPILOT_FSM_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

/**
 * Garante em tempo de execução que a transição é válida, lançando erro se violada.
 */
export function assertValidCopilotTransition(
  from: CopilotFsmPhase,
  to: CopilotFsmPhase
): void {
  if (!canTransitionCopilotPhase(from, to)) {
    throw new Error(
      `[COPILOT_FSM_VIOLATION] Transição inválida de '${from}' para '${to}'. Fases permitidas a partir de '${from}': [${(COPILOT_FSM_TRANSITIONS[from] || []).join(", ")}]`
    );
  }
}

/**
 * Validador de tipo estreito para strings arbitrárias.
 */
export function isValidCopilotPhase(value: unknown): value is CopilotFsmPhase {
  return typeof value === "string" && (COPILOT_FSM_PHASES as readonly string[]).includes(value);
}

export interface CopilotFsmTransitionRecord {
  from: CopilotFsmPhase;
  to: CopilotFsmPhase;
  timestamp: string;
  reason?: string;
}

export interface CopilotFsmExecutionState {
  currentPhase: CopilotFsmPhase;
  previousPhase?: CopilotFsmPhase;
  history: CopilotFsmTransitionRecord[];
  retryCount: number;
  maxRetries: number;
  lastError?: {
    message: string;
    phase: CopilotFsmPhase;
    retryable: boolean;
    timestamp: string;
  };
}

/**
 * Gerenciador determinístico de ciclo de vida da FSM do Copilot.
 */
export class CopilotStateMachine {
  private state: CopilotFsmExecutionState;

  constructor(initialPhase: CopilotFsmPhase = "RECEIVED", maxRetries: number = 3) {
    this.state = {
      currentPhase: initialPhase,
      history: [
        {
          from: initialPhase,
          to: initialPhase,
          timestamp: new Date().toISOString(),
          reason: "FSM inicializada",
        },
      ],
      retryCount: 0,
      maxRetries,
    };
  }

  get currentPhase(): CopilotFsmPhase {
    return this.state.currentPhase;
  }

  get isTerminal(): boolean {
    return isTerminalCopilotPhase(this.state.currentPhase);
  }

  get isFailure(): boolean {
    return COPILOT_FSM_PHASE_META[this.state.currentPhase].isFailure;
  }

  get allowsRetry(): boolean {
    return (
      COPILOT_FSM_PHASE_META[this.state.currentPhase].allowsRetry &&
      this.state.retryCount < this.state.maxRetries
    );
  }

  get snapshot(): CopilotFsmExecutionState {
    return {
      currentPhase: this.state.currentPhase,
      previousPhase: this.state.previousPhase,
      history: [...this.state.history],
      retryCount: this.state.retryCount,
      maxRetries: this.state.maxRetries,
      lastError: this.state.lastError ? { ...this.state.lastError } : undefined,
    };
  }

  /**
   * Executa uma transição formal de estado.
   */
  transition(to: CopilotFsmPhase, reason?: string): this {
    const from = this.state.currentPhase;
    assertValidCopilotTransition(from, to);

    this.state.previousPhase = from;
    this.state.currentPhase = to;
    this.state.history.push({
      from,
      to,
      timestamp: new Date().toISOString(),
      reason,
    });

    return this;
  }

  /**
   * Registra uma falha protegida.
   * Se ainda houver retentativas disponíveis, transita para FAILED_RETRYABLE.
   * Caso contrário, esgota e transita para FAILED_FINAL.
   */
  recordFailure(error: Error | string, isFatal: boolean = false): this {
    const message = typeof error === "string" ? error : error.message;
    const from = this.state.currentPhase;
    const canRetry = !isFatal && this.state.retryCount < this.state.maxRetries;
    const targetPhase: CopilotFsmPhase = canRetry ? "FAILED_RETRYABLE" : "FAILED_FINAL";

    this.state.lastError = {
      message,
      phase: from,
      retryable: canRetry,
      timestamp: new Date().toISOString(),
    };

    if (canRetry) {
      this.state.retryCount += 1;
    }

    if (canTransitionCopilotPhase(from, targetPhase)) {
      this.transition(targetPhase, `Erro capturado: ${message.slice(0, 100)}`);
    } else {
      // Fallback de emergência caso estado atual não permita transição direta
      this.state.currentPhase = targetPhase;
      this.state.history.push({
        from,
        to: targetPhase,
        timestamp: new Date().toISOString(),
        reason: `Fallback de contenção: ${message.slice(0, 100)}`,
      });
    }

    return this;
  }
}
