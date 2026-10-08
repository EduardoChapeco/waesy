import { describe, expect, it } from "vitest";
import { approvalIdempotencyKey, isHighImpactChatAction } from "./ai-conversations.functions";

describe("Copilot human approval contract", () => {
  it("classifies externally mutating actions as high impact", () => {
    expect(isHighImpactChatAction("request_travel_quote")).toBe(true);
    expect(isHighImpactChatAction("submit_legal_demand")).toBe(true);
    expect(isHighImpactChatAction("publish_ad")).toBe(true);
    expect(isHighImpactChatAction("add_to_cart")).toBe(false);
  });

  it("generates stable idempotency keys independent of payload insertion order", () => {
    expect(approvalIdempotencyKey("publish_ad", { body_text: "Oferta", headline: "Título" }))
      .toBe(approvalIdempotencyKey("publish_ad", { headline: "Título", body_text: "Oferta" }));
    expect(approvalIdempotencyKey("publish_ad", { headline: "Outro" }))
      .not.toBe(approvalIdempotencyKey("publish_ad", { headline: "Título" }));
  });
});
