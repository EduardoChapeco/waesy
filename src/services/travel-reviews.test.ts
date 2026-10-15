import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const validated = schema ? schema.parse(args?.data) : args?.data;
        return fn({ data: validated });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

import {
  submitAndClassifyHotelReview,
  aggregateHotelScores,
  getHotelReviewsAndScores,
} from "./travel-reviews.functions";

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => {
      if (table === "hotel_reviews") {
        return {
          insert: mockInsert,
          select: mockSelect,
        };
      }
      if (table === "global_hotels") {
        return {
          update: mockUpdate,
          select: mockSelect,
        };
      }
      return {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
      };
    },
  }),
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn().mockResolvedValue({
    id: "00000000-0000-0000-0000-000000000001",
    name: "Viajante Teste",
    email: "viajante@waesy.com.br",
  }),
}));

describe("travel-reviews tripartite scoring", () => {
  const testHotelId = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submete avaliação tripartite com classificação e agregação de notas", async () => {
    // 1. Mock do hotel existente
    mockSelect.mockImplementation(() => ({
      eq: vi.fn().mockImplementation((col: string, val: string) => {
        if (col === "id" && val === testHotelId) {
          return {
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: testHotelId, name: "Hotel Bertaso", city: "Chapecó" },
              error: null,
            }),
          };
        }
        if (col === "global_hotel_id") {
          return {
            eq: vi.fn().mockResolvedValue({
              data: [
                { hotel_rating: 4.5, destination_rating: 4.0, agency_service_rating: 5.0 },
                { hotel_rating: 4.0, destination_rating: 4.5, agency_service_rating: 4.5 },
              ],
              error: null,
            }),
          };
        }
        return {
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }),
    }));

    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "22222222-2222-2222-2222-222222222222" },
          error: null,
        }),
      }),
    });

    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const result = await submitAndClassifyHotelReview({
      data: {
        globalHotelId: testHotelId,
        comment: "Hotel excelente, cidade acolhedora e atendimento ágil da agência!",
        hotelRating: 4.5,
        destinationRating: 4.0,
        agencyServiceRating: 5.0,
      },
    });

    expect(result.success).toBe(true);
    expect(result.reviewId).toBe("22222222-2222-2222-2222-222222222222");
    expect(result.aggregate).toBeDefined();
    expect(result.aggregate.reviews_count).toBe(2);
    expect(result.aggregate.hotel_score).toBe(4.25);
    expect(result.aggregate.destination_score).toBe(4.25);
    expect(result.aggregate.agency_service_score).toBe(4.75);
  });

  it("rejeita avaliações com notas fora do intervalo [0, 5]", async () => {
    await expect(
      submitAndClassifyHotelReview({
        data: {
          globalHotelId: testHotelId,
          comment: "Hotel excelente!",
          hotelRating: 6.0, // Inválido (> 5)
        },
      })
    ).rejects.toThrow();

    await expect(
      submitAndClassifyHotelReview({
        data: {
          globalHotelId: testHotelId,
          comment: "Hotel excelente!",
          hotelRating: -1.0, // Inválido (< 0)
        },
      })
    ).rejects.toThrow();
  });

  it("agrega médias tripartites honestamente com arredondamento em 2 casas decimais", async () => {
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { hotel_rating: 4.0, destination_rating: 4.0, agency_service_rating: 5.0 },
            { hotel_rating: 4.5, destination_rating: 5.0, agency_service_rating: 4.5 },
            { hotel_rating: 5.0, destination_rating: 4.5, agency_service_rating: 5.0 },
          ],
          error: null,
        }),
      }),
    });

    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const aggregates = await aggregateHotelScores(testHotelId);

    expect(aggregates.reviews_count).toBe(3);
    expect(aggregates.hotel_score).toBeCloseTo(4.5, 2);
    expect(aggregates.destination_score).toBeCloseTo(4.5, 2);
    expect(aggregates.agency_service_score).toBeCloseTo(4.83, 2);
  });
});
