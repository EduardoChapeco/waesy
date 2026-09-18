import { describe, it, expect } from "vitest";
import {
  listStoreSquads,
  triggerSquadRun,
  approveSquadRun,
} from "./squads-runtime.functions";

describe("Store Squads Runtime & Virtual Offices (Big Tech Council)", () => {
  const realStoreId = "c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7";
  let activeSquadId: string;
  let createdRunId: string;

  it("1. Deve listar ou instanciar os 4 squads virtuais da loja", async () => {
    const squads = await listStoreSquads(realStoreId);

    expect(Array.isArray(squads)).toBe(true);
    expect(squads.length).toBeGreaterThanOrEqual(4);

    // Verificar departamentos dos 4 squads canônicos
    const depts = squads.map((s) => s.template.department);
    expect(depts).toContain("marketing");
    expect(depts).toContain("accounting");
    expect(depts).toContain("human_resources");
    expect(depts).toContain("executive_strategy");

    // Verificar que os agentes têm currículo de PhD/Especialistas
    const marketingSquad = squads.find((s) => s.template.department === "marketing");
    expect(marketingSquad).toBeDefined();
    expect(marketingSquad!.agents.length).toBeGreaterThanOrEqual(5);

    const firstAgent = marketingSquad!.agents[0];
    expect(firstAgent.curriculum).toBeDefined();
    expect(firstAgent.curriculum.certifications.length).toBeGreaterThan(0);

    activeSquadId = marketingSquad!.id;
  });

  it("2. Deve disparar uma nova corrida com supervisão Human-in-the-Loop", async () => {
    expect(activeSquadId).toBeDefined();
    const run = await triggerSquadRun(realStoreId, activeSquadId, {
      triggerSource: "manual",
      inputPayload: { goal: "Revisão e disparo de anúncio promocional semanal" },
    });

    expect(run).toBeDefined();
    expect(run.id).toBeDefined();
    expect(run.status).toBe("needs_approval");
    expect(run.total_tokens_consumed).toBeGreaterThan(0);

    createdRunId = run.id;
  }, 15000);

  it("3. Deve aprovar a entrega do squad em 1 clique pelo lojista", async () => {
    expect(createdRunId).toBeDefined();
    const approved = await approveSquadRun(realStoreId, createdRunId);

    expect(approved).toBeDefined();
    expect(approved.id).toBe(createdRunId);
    expect(approved.status).toBe("completed");
    expect(approved.completed_at).toBeDefined();
  });
});
