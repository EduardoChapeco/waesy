import { describe, expect, it } from "vitest";
import { canAccessAiThread } from "./ai-conversations.functions";

describe("Copilot thread access contract", () => {
  const thread = {
    customer_id: "customer-a",
    recipient_profile_id: null,
    store_id: "store-a",
    assigned_to_profile_id: "agent-a",
  };

  it("allows the participant, assigned agent and store manager", () => {
    expect(canAccessAiThread(thread, { id: "customer-a", role: "seller", store_id: "store-a", memberships: [] } as any)).toBe(true);
    expect(canAccessAiThread(thread, { id: "agent-a", role: "support", store_id: "store-a", memberships: [] } as any)).toBe(true);
    expect(canAccessAiThread(thread, { id: "manager-a", role: "manager", store_id: "store-a", memberships: [] } as any)).toBe(true);
  });

  it("rejects an unassigned seller, cross-store member and anonymous caller", () => {
    expect(canAccessAiThread(thread, { id: "seller-b", role: "seller", store_id: "store-a", memberships: [] } as any)).toBe(false);
    expect(canAccessAiThread(thread, { id: "seller-c", role: "seller", store_id: "store-b", memberships: [{ store_id: "store-b" }] } as any)).toBe(false);
    expect(canAccessAiThread(thread, null as any)).toBe(false);
  });
});
