import { describe, expect, it } from "vitest";
import { canUseRuntimeSkill, getRuntimeSkill, listRuntimeSkills } from "./skill-registry";

describe("Waesy runtime skill registry", () => {
  it("expõe orchestration para Copilot, builders e editores", () => {
    expect(getRuntimeSkill("waesy-copilot-orchestration", "copilot")?.capabilities).toContain("react_loop");
    expect(getRuntimeSkill("waesy-copilot-orchestration", "builder")).toBeDefined();
    expect(getRuntimeSkill("waesy-copilot-orchestration", "editor")).toBeDefined();
    expect(canUseRuntimeSkill("waesy-copilot-orchestration", "copilot")).toBe(true);
    expect(listRuntimeSkills("mining")).toHaveLength(1);
  });
});
