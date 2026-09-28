import { describe, it, expect } from "vitest";
import { SubmitDealReviewSchema, RespondToDealReviewSchema, ListStoreDealReviewsSchema } from "./deal-reviews.functions";

describe("Deal Reviews & Verified Reputation Contracts", () => {
  it("validates SubmitDealReviewSchema with valid ratings and limits", () => {
    const valid = SubmitDealReviewSchema.safeParse({
      dealId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      rating: 5,
      comment: "Atendimento excepcional, pacote de viagem entregue conforme prometido!",
    });
    expect(valid.success).toBe(true);

    const invalidRating = SubmitDealReviewSchema.safeParse({
      dealId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      rating: 6, // Máximo 5
    });
    expect(invalidRating.success).toBe(false);

    const invalidDealId = SubmitDealReviewSchema.safeParse({
      dealId: "not-a-uuid",
      rating: 4,
    });
    expect(invalidDealId.success).toBe(false);
  });

  it("validates RespondToDealReviewSchema lojista reply contract", () => {
    const valid = RespondToDealReviewSchema.safeParse({
      reviewId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      responseComment: "Muito obrigado pelo carinho! Esperamos vocês novamente em breve.",
    });
    expect(valid.success).toBe(true);

    const tooShort = RespondToDealReviewSchema.safeParse({
      reviewId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      responseComment: "A",
    });
    expect(tooShort.success).toBe(false);
  });

  it("validates ListStoreDealReviewsSchema filters", () => {
    const valid = ListStoreDealReviewsSchema.safeParse({
      storeId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      limit: 30,
    });
    expect(valid.success).toBe(true);

    const defaultLimit = ListStoreDealReviewsSchema.parse({});
    expect(defaultLimit.limit).toBe(20);
  });
});
