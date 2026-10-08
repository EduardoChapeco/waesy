import { describe, expect, it } from "vitest";
import { builderRegistry } from "./builder-registry";
import { validateBuilderRegistry } from "./registry-contract";

describe("Builder manifest contracts", () => {
  it("mantém schemas, defaults e Inspector coerentes", () => {
    const issues = validateBuilderRegistry(builderRegistry);
    expect(issues, issues.map((issue) => `${issue.ruleId} ${issue.path}: ${issue.message}`).join("\n")).toEqual([]);
  });
});
