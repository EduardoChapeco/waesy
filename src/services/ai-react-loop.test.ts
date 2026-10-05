import { describe, expect, it } from "vitest";
import { runReactLoop } from "./ai-react-loop";

describe("runReactLoop", () => {
  it("executa múltiplas etapas com feedback até completar", async () => {
    const result = await runReactLoop<{ remaining: number }, number, number, { values: number[] }>({
      initialPlan: { remaining: 2 }, initialState: { values: [] as number[] },
      planNext: async ({ state }) => state.values.length < 2 ? { decision: "continue" as const, action: state.values.length + 1 } : { decision: "complete" as const },
      act: async (action) => action * 2,
      observe: async (value, state) => ({ valid: true, state: { values: [...state.values, value] }, decision: state.values.length + 1 >= 2 ? "complete" as const : "continue" as const }),
    });
    expect(result.status).toBe("completed");
    expect(result.steps).toHaveLength(2);
    expect(result.state.values).toEqual([2, 4]);
  });

  it("pausa quando o planner solicita input humano", async () => {
    const result = await runReactLoop({
      initialPlan: {}, initialState: {},
      planNext: async () => ({ decision: "ask_human" as const, reason: "Escolha necessária" }),
      act: async () => null,
      observe: async (_result, state) => ({ valid: true, state }),
    });
    expect(result.status).toBe("paused");
    expect(result.reason).toContain("Escolha");
  });
});
