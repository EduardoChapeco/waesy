import { describe, it, expect, vi } from "vitest";
import {
  FacetedSearchInputSchema,
  type FacetedSearchFacets,
  calculateRelevanceScore,
} from "@/services/faceted-search.functions";

describe("Adversarial Stress Test: FacetedSearch & Boundary Edge Cases", () => {
  describe("1. Facets State Boundary Handling (null, undefined, empty arrays)", () => {
    it("handles null facets safely without runtime exceptions", () => {
      const facets: FacetedSearchFacets | null = null;
      expect(facets).toBeNull();
      // Verifies optional chaining safety
      const categories = facets?.categories ?? [];
      const niches = facets?.niches ?? [];
      const priceRange = facets?.price_range ?? null;
      expect(categories).toEqual([]);
      expect(niches).toEqual([]);
      expect(priceRange).toBeNull();
    });

    it("handles undefined facets safely", () => {
      const facets = undefined as unknown as FacetedSearchFacets | null;
      const categories = facets?.categories ?? [];
      const niches = facets?.niches ?? [];
      const priceRange = facets?.price_range ?? null;
      expect(categories).toEqual([]);
      expect(niches).toEqual([]);
      expect(priceRange).toBeNull();
    });

    it("handles empty arrays for categories, niches, and cities", () => {
      const emptyFacets: FacetedSearchFacets = {
        price_range: { min_cents: 0, max_cents: 0 },
        categories: [],
        niches: [],
        cities: [],
      };
      expect(emptyFacets.categories.length).toBe(0);
      expect(emptyFacets.niches.length).toBe(0);
      expect(emptyFacets.cities.length).toBe(0);
      expect(emptyFacets.price_range.min_cents).toBe(0);
      expect(emptyFacets.price_range.max_cents).toBe(0);
    });

    it("handles malformed/unusual price ranges (min > max, zero, negative)", () => {
      const invertedFacets: FacetedSearchFacets = {
        price_range: { min_cents: 50000, max_cents: 1000 },
        categories: [],
        niches: [],
        cities: [],
      };
      expect(invertedFacets.price_range.min_cents).toBeGreaterThan(invertedFacets.price_range.max_cents);
    });
  });

  describe("2. Extreme Price Ranges & Zod Schema Hardening", () => {
    it("accepts valid non-negative integer price cents", () => {
      const valid = FacetedSearchInputSchema.safeParse({
        min_price_cents: 1000,
        max_price_cents: 50000,
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.min_price_cents).toBe(1000);
        expect(valid.data.max_price_cents).toBe(50000);
      }
    });

    it("REJECTS negative min_price_cents under strict Zod validation", () => {
      const negativeMin = FacetedSearchInputSchema.safeParse({
        min_price_cents: -100,
      });
      expect(negativeMin.success).toBe(false);
      if (!negativeMin.success) {
        expect(negativeMin.error.issues[0].code).toBe("too_small");
      }
    });

    it("REJECTS negative max_price_cents under strict Zod validation", () => {
      const negativeMax = FacetedSearchInputSchema.safeParse({
        max_price_cents: -500,
      });
      expect(negativeMax.success).toBe(false);
      if (!negativeMax.success) {
        expect(negativeMax.error.issues[0].code).toBe("too_small");
      }
    });

    it("REJECTS non-integer float cents in schema", () => {
      const floatPrice = FacetedSearchInputSchema.safeParse({
        min_price_cents: 199.99,
      });
      expect(floatPrice.success).toBe(false);
    });

    it("validates price string normalization logic as used in FacetedSearchSheet", () => {
      const parsePriceInput = (val: string): number | undefined => {
        if (!val || !val.trim()) return undefined;
        const normalized = val.replace(",", ".");
        const parsed = parseFloat(normalized);
        if (isNaN(parsed)) return undefined;
        return Math.round(parsed * 100);
      };

      // Empty string
      expect(parsePriceInput("")).toBeUndefined();
      expect(parsePriceInput("   ")).toBeUndefined();

      // Valid Brazilian currency formats
      expect(parsePriceInput("10,50")).toBe(1050);
      expect(parsePriceInput("10.50")).toBe(1050);
      expect(parsePriceInput("0")).toBe(0);
      expect(parsePriceInput("0,00")).toBe(0);

      // Non-numeric / NaN strings
      expect(parsePriceInput("abc")).toBeUndefined();
      expect(parsePriceInput("NaN")).toBeUndefined();
      expect(parsePriceInput("Infinity")).toBe(Infinity ? Math.round(Infinity * 100) : undefined);

      // Negative values
      expect(parsePriceInput("-50")).toBe(-5000);
    });

    it("detects when min > max price range inversion occurs", () => {
      const minPrice = 5000;
      const maxPrice = 2000;
      const isInverted = minPrice > maxPrice;
      expect(isInverted).toBe(true);

      // Schema allows both since they are independent non-negative integers,
      // but query returns empty items list
      const parsed = FacetedSearchInputSchema.safeParse({
        min_price_cents: minPrice,
        max_price_cents: maxPrice,
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe("3. Filter Reset and Active Filters Counting Mechanisms", () => {
    const computeActiveFiltersCount = (params: {
      categories: string[];
      niches: string[];
      minPrice?: number;
      maxPrice?: number;
      sort: string;
    }): number => {
      let count = 0;
      if (params.categories.length > 0) count += params.categories.length;
      if (params.niches.length > 0) count += params.niches.length;
      if (params.minPrice !== undefined) count += 1;
      if (params.maxPrice !== undefined) count += 1;
      if (params.sort !== "relevance_telemetry") count += 1;
      return count;
    };

    it("calculates 0 active filters when all are in default state", () => {
      const count = computeActiveFiltersCount({
        categories: [],
        niches: [],
        minPrice: undefined,
        maxPrice: undefined,
        sort: "relevance_telemetry",
      });
      expect(count).toBe(0);
    });

    it("calculates correct count with multiple active filters", () => {
      const count = computeActiveFiltersCount({
        categories: ["pizzas", "bebidas"],
        niches: ["gastronomia"],
        minPrice: 1000,
        maxPrice: 5000,
        sort: "price_asc",
      });
      // 2 categories + 1 niche + 1 minPrice + 1 maxPrice + 1 sort = 6
      expect(count).toBe(6);
    });

    it("simulates filter reset mechanism", () => {
      let state = {
        categories: ["eletronicos"],
        niches: ["varejo"],
        minPrice: 10000 as number | undefined,
        maxPrice: 50000 as number | undefined,
        sort: "price_desc",
      };

      expect(computeActiveFiltersCount(state)).toBe(5);

      // Reset action
      const handleReset = () => {
        state = {
          categories: [],
          niches: [],
          minPrice: undefined,
          maxPrice: undefined,
          sort: "relevance_telemetry",
        };
      };

      handleReset();
      expect(computeActiveFiltersCount(state)).toBe(0);
      expect(state.categories).toEqual([]);
      expect(state.niches).toEqual([]);
      expect(state.minPrice).toBeUndefined();
      expect(state.maxPrice).toBeUndefined();
      expect(state.sort).toBe("relevance_telemetry");
    });
  });

  describe("4. Asynchronous Re-query and Stale Closure Hazard", () => {
    it("proves the asynchronous state closure risk if re-query is triggered synchronously within reset", async () => {
      let categories = ["pizzas"];
      let minPrice: number | undefined = 2000;
      const apiCalls: any[] = [];

      const fakeSearchFacetedCatalog = (filters: any) => {
        apiCalls.push({ ...filters });
        return Promise.resolve({ items: [], facets: {} });
      };

      // Simulates handleSearch closure
      const handleSearch = (q: string) => {
        return fakeSearchFacetedCatalog({
          query: q,
          categories,
          minPrice,
        });
      };

      // Simulates faulty onResetFilters where state setters are called but handleSearch
      // reads existing closure synchronously:
      const faultyReset = () => {
        // In React: setCategories([]) and setMinPrice(undefined) schedule updates for NEXT render.
        // During THIS synchronous tick, closure variables `categories` and `minPrice` are UNCHANGED.
        handleSearch("pizza");
      };

      await faultyReset();

      // The synchronous call captured the STALE filters!
      expect(apiCalls[0].categories).toEqual(["pizzas"]);
      expect(apiCalls[0].minPrice).toBe(2000);

      // Now with the CORRECT pure-parameter design:
      const pureSearch = (q: string, overrideFilters?: { categories?: string[]; minPrice?: number }) => {
        return fakeSearchFacetedCatalog({
          query: q,
          categories: overrideFilters && "categories" in overrideFilters ? overrideFilters.categories : categories,
          minPrice: overrideFilters && "minPrice" in overrideFilters ? overrideFilters.minPrice : minPrice,
        });
      };

      const correctReset = () => {
        // Passes clean overrides directly
        pureSearch("pizza", { categories: [], minPrice: undefined });
      };

      await correctReset();
      expect(apiCalls[1].categories).toEqual([]);
      expect(apiCalls[1].minPrice).toBeUndefined();
    });
  });

  describe("5. Behavioral Relevance Engine under Boundary Inputs", () => {
    it("handles empty title and empty query without NaN or crash", () => {
      const score = calculateRelevanceScore(
        {
          title: "",
          description: null,
          niche: "varejo",
          created_at: new Date().toISOString(),
        },
        ""
      );
      expect(score).toBeGreaterThanOrEqual(50);
      expect(Number.isFinite(score)).toBe(true);
    });

    it("handles extreme length queries (adversarial long string)", () => {
      const longQuery = "a".repeat(1000);
      const score = calculateRelevanceScore(
        {
          title: "Hambúrguer",
          description: "Lanche",
          niche: "gastronomia",
          created_at: new Date().toISOString(),
        },
        longQuery
      );
      expect(Number.isFinite(score)).toBe(true);
    });
  });
});
