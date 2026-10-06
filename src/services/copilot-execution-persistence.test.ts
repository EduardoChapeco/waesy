import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, getSSRClient } from "@/lib/server-access";
import { startCopilotExecution, createPersistedActivitySteps, completeCopilotExecution, resumeCopilotExecution } from "./copilot-execution-persistence";
import type { AIActivityStep } from "@/types/chat";

const writes: Array<{ table: string; operation: string; payload: Record<string, unknown> }> = [];
let failure: Error | undefined;
let execution: Record<string, unknown> | null;

function client(scoped = false) {
  return {
    from(table: string) {
      let operation = "select";
      let payload: Record<string, unknown> = {};
      const builder = {
        upsert(value: Record<string, unknown>) { operation = "upsert"; payload = value; return builder; },
        update(value: Record<string, unknown>) { operation = "update"; payload = value; return builder; },
        select() { return builder; }, eq() { return builder; }, order() { return builder; }, maybeSingle() { return builder; },
        async throwOnError() {
          if (failure) throw failure;
          if (scoped && operation === "select") return { data: table === "copilot_executions" ? execution : [], error: null };
          writes.push({ table, operation, payload });
          return { data: null, error: null };
        },
      };
      return builder;
    },
  };
}

beforeEach(() => {
  writes.length = 0;
  failure = undefined;
  execution = null;
  vi.mocked(getServerClient).mockReturnValue(client() as unknown as ReturnType<typeof getServerClient>);
  vi.mocked(getSSRClient).mockResolvedValue(client(true) as unknown as Awaited<ReturnType<typeof getSSRClient>>);
});

describe("Copilot persistent execution", () => {
  it("stores nullable optional context without inventing tenant or owner", async () => {
    await startCopilotExecution({ executionId: "optional", taskId: "task", domain: "chat" });
    expect(writes[0].payload).toMatchObject({ store_id: null, user_id: null, thread_id: null });
    await startCopilotExecution({ executionId: "full", taskId: "task", domain: "chat", storeId: "tenant", userId: "owner", threadId: "thread" });
    expect(writes[1].payload).toMatchObject({ store_id: "tenant", user_id: "owner", thread_id: "thread" });
  });

  it("propagates a database failure rather than reporting saved state", async () => {
    failure = new Error("write failed");
    await expect(startCopilotExecution({ executionId: "failed", taskId: "task", domain: "chat" })).rejects.toThrow("write failed");
    expect(writes).toHaveLength(0);
  });

  it("writes queued steps in order before completing the execution", async () => {
    const steps = createPersistedActivitySteps({ executionId: "ordered" });
    const step: AIActivityStep = { id: "one", type: "tool", label: "Step", status: "completed", startedAt: new Date().toISOString() };
    expect(steps.push(step, { ...step, id: "two" })).toBe(2);
    await completeCopilotExecution({ executionId: "ordered" }, "completed");
    expect(writes.filter((entry) => entry.table === "copilot_execution_steps").map((entry) => entry.payload.sequence_no)).toEqual([0, 1]);
    expect(writes.at(-1)?.payload.status).toBe("completed");
  });

  it("does not resume records hidden by the user's RLS client", async () => {
    expect(await resumeCopilotExecution("other-owner")).toEqual({ execution: null, steps: [] });
    expect(getSSRClient).toHaveBeenCalled();
    expect(writes).toHaveLength(0);
  });

  it("requires identity before fetching or resuming", async () => {
    vi.mocked(getServerIdentity).mockRejectedValueOnce(new Error("unauthorized"));
    await expect(resumeCopilotExecution("private")).rejects.toThrow("unauthorized");
    expect(getSSRClient).not.toHaveBeenCalled();
    expect(writes).toHaveLength(0);
  });

  it("resumes a visible record using the checked execution state", async () => {
    execution = { id: "own", resume_count: 2 };
    expect((await resumeCopilotExecution("own")).execution).toEqual(execution);
    expect(writes[0].payload).toMatchObject({ resume_count: 3, status: "running" });
  });
});
