import { randomUUID } from "node:crypto";

export type ReactDecision = "continue" | "complete" | "retry" | "fallback" | "ask_human" | "replan" | "failed_final";
export type ReactStepStatus = "running" | "completed" | "failed_retryable" | "paused" | "failed_final";

export interface ReactStep<TAction = unknown, TResult = unknown> {
  id: string;
  iteration: number;
  action: TAction;
  observation?: TResult;
  status: ReactStepStatus;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export interface ReactLoopInput<TPlan, TAction, TResult, TState> {
  initialPlan: TPlan;
  initialState: TState;
  maxIterations?: number;
  planNext: (input: { plan: TPlan; state: TState; steps: ReactStep<TAction, TResult>[] }) => Promise<{ action?: TAction; decision: ReactDecision; plan?: TPlan; reason?: string }>;
  act: (action: TAction, state: TState) => Promise<TResult>;
  observe: (result: TResult, state: TState) => Promise<{ valid: boolean; state: TState; decision?: ReactDecision; reason?: string }>;
}

export interface ReactLoopResult<TPlan, TResult, TState, TAction> {
  status: "completed" | "paused" | "failed";
  plan: TPlan;
  state: TState;
  steps: ReactStep<TAction, TResult>[];
  reason?: string;
}

export async function runReactLoop<TPlan, TAction, TResult, TState>(input: ReactLoopInput<TPlan, TAction, TResult, TState>): Promise<ReactLoopResult<TPlan, TResult, TState, TAction>> {
  const maxIterations = Math.max(1, Math.min(input.maxIterations ?? 6, 20));
  let plan = input.initialPlan;
  let state = input.initialState;
  const steps: ReactStep<TAction, TResult>[] = [];
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const next = await input.planNext({ plan, state, steps });
    if (next.plan !== undefined) plan = next.plan;
    if (next.decision === "complete") return { status: "completed", plan, state, steps, reason: next.reason };
    if (next.decision === "ask_human") return { status: "paused", plan, state, steps, reason: next.reason || "Input humano necessário." };
    if (!next.action) return { status: "failed", plan, state, steps, reason: next.reason || "Planner não produziu ação." };
    const step: ReactStep<TAction, TResult> = { id: randomUUID(), iteration, action: next.action, status: "running", startedAt: new Date().toISOString() };
    steps.push(step);
    try {
      const result = await input.act(next.action, state);
      step.observation = result;
      const observation = await input.observe(result, state);
      state = observation.state;
      step.completedAt = new Date().toISOString();
      if (!observation.valid) {
        step.status = observation.decision === "ask_human" ? "paused" : "failed_retryable";
        if (observation.decision === "ask_human") return { status: "paused", plan, state, steps, reason: observation.reason };
        if (observation.decision === "failed_final") return { status: "failed", plan, state, steps, reason: observation.reason };
        continue;
      }
      step.status = "completed";
      if (observation.decision === "complete") return { status: "completed", plan, state, steps, reason: observation.reason };
    } catch (error) {
      step.status = "failed_retryable";
      step.error = error instanceof Error ? error.message : String(error);
      step.completedAt = new Date().toISOString();
    }
  }
  return { status: "paused", plan, state, steps, reason: `Limite de ${maxIterations} iterações atingido.` };
}
