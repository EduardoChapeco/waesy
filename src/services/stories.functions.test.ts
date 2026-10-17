import { beforeEach, describe, expect, it, vi } from "vitest";

const STORE_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID = "550e8400-e29b-41d4-a716-446655440099";
const CREATOR_ID = "550e8400-e29b-41d4-a716-446655440050";
const STORY_ID = "550e8400-e29b-41d4-a716-446655440010";

const testState = vi.hoisted(() => ({
  identity: {
    id: "550e8400-e29b-41d4-a716-446655440099" as string | null,
    role: "owner",
    store_id: "550e8400-e29b-41d4-a716-446655440001" as string | null,
    memberships: [
      { store_id: "550e8400-e29b-41d4-a716-446655440001", role: "owner" },
    ],
  },
  currentIdentity: {
    customer_id: "550e8400-e29b-41d4-a716-446655440099" as string | null,
    store_id: "550e8400-e29b-41d4-a716-446655440001" as string | null,
  },
  responseQueues: {} as Record<string, { data: any; error: any }[]>,
  actions: [] as { table: string; method: string; args: any[] }[],
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any = {}) => {
        const parsed = schema ? schema.parse(args?.data) : args?.data;
        return fn({ data: parsed });
      },
    }),
    handler: (fn: any) => async (args: any = {}) => fn(args || {}),
  }),
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: async () => testState.identity,
  assertStoreAccess: (identity: any, allowedRoles: string[], targetStoreId?: string | null) => {
    if (!identity?.id) throw new Error("Unauthorized: User not authenticated.");
    const storeId = targetStoreId || identity.store_id;
    if (!storeId) throw new Error("Unauthorized: No active store context found.");
    const membership = identity.memberships?.find((entry: any) => entry.store_id === storeId);
    if (!membership || !allowedRoles.includes(membership.role)) {
      throw new Error("Unauthorized: Insufficient permissions for store.");
    }
  },
}));

vi.mock("@/services/cart-helpers", () => ({
  getCurrentIdentity: async () => testState.currentIdentity,
}));

function createQuery(table: string) {
  const queue = testState.responseQueues[table] || [];
  const response = queue.length > 0 ? queue.shift()! : { data: [], error: null };
  const query: any = {};
  const chainable = ["select", "eq", "or", "order", "limit", "in"];

  for (const method of chainable) {
    query[method] = (...args: any[]) => {
      testState.actions.push({ table, method, args });
      return query;
    };
  }

  query.insert = (...args: any[]) => {
    testState.actions.push({ table, method: "insert", args });
    return query;
  };

  query.update = (...args: any[]) => {
    testState.actions.push({ table, method: "update", args });
    return query;
  };

  query.single = () => Promise.resolve(response);
  query.then = (resolve: any, reject: any) => Promise.resolve(response).then(resolve, reject);

  return query;
}

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => createQuery(table),
  }),
  getAnonServerClient: () => ({
    from: (table: string) => createQuery(table),
  }),
}));

import {
  getRankedStoriesFeed,
  createStory,
  recordStoryTelemetry,
  toggleAmbassadorStatus,
  getStoreStoriesAnalytics,
} from "./stories.functions";

describe("stories.functions — Invariant B.25 parameter integrity", () => {
  beforeEach(() => {
    testState.actions = [];
    testState.responseQueues = {};
    testState.identity = {
      id: USER_ID,
      role: "owner",
      store_id: STORE_ID,
      memberships: [{ store_id: STORE_ID, role: "owner" }],
    };
    testState.currentIdentity = {
      customer_id: USER_ID,
      store_id: STORE_ID,
    };
  });

  describe("getRankedStoriesFeed", () => {
    it("handles absent parameters gracefully with default query", async () => {
      testState.responseQueues["store_followers"] = [{ data: [], error: null }];
      testState.responseQueues["stories"] = [{ data: [], error: null }];

      const result = await (getRankedStoriesFeed as any)();
      expect(result).toEqual([]);

      const storySelectAction = testState.actions.find(
        (a) => a.table === "stories" && a.method === "select",
      );
      expect(storySelectAction).toBeDefined();

      // Ensure no specific store_id or niche eq was applied when empty
      const storeEq = testState.actions.find(
        (a) => a.table === "stories" && a.method === "eq" && a.args[0] === "store_id",
      );
      expect(storeEq).toBeUndefined();
    });

    it("applies storeId filter when storeId parameter is present", async () => {
      testState.responseQueues["store_followers"] = [{ data: [], error: null }];
      testState.responseQueues["stories"] = [{ data: [], error: null }];

      await (getRankedStoriesFeed as any)({
        data: { storeId: STORE_ID },
      });

      const storeEq = testState.actions.find(
        (a) => a.table === "stories" && a.method === "eq" && a.args[0] === "store_id",
      );
      expect(storeEq).toBeDefined();
      expect(storeEq?.args[1]).toBe(STORE_ID);
    });

    it("applies niche filter when niche parameter is present", async () => {
      testState.responseQueues["store_followers"] = [{ data: [], error: null }];
      testState.responseQueues["stories"] = [{ data: [], error: null }];

      await (getRankedStoriesFeed as any)({
        data: { niche: "gastronomia" },
      });

      const nicheEq = testState.actions.find(
        (a) => a.table === "stories" && a.method === "eq" && a.args[0] === "niche",
      );
      expect(nicheEq).toBeDefined();
      expect(nicheEq?.args[1]).toBe("gastronomia");
    });

    it("filters stories by city parameter matching store or creator city", async () => {
      testState.responseQueues["store_followers"] = [{ data: [], error: null }];
      testState.responseQueues["stories"] = [
        {
          data: [
            {
              id: "story-1",
              store_id: "store-chapeco",
              creator_id: null,
              media_url: "https://example.com/s1.jpg",
              duration_seconds: 15,
              stores: { id: "store-chapeco", name: "Loja Chapecó", city: "Chapecó" },
              creator_profiles: null,
            },
            {
              id: "story-2",
              store_id: "store-florianopolis",
              creator_id: null,
              media_url: "https://example.com/s2.jpg",
              duration_seconds: 15,
              stores: { id: "store-florianopolis", name: "Loja Floripa", city: "Florianópolis" },
              creator_profiles: null,
            },
          ],
          error: null,
        },
      ];

      const result = await (getRankedStoriesFeed as any)({
        data: { city: "chapeco" },
      });

      expect(result).toHaveLength(1);
      expect(result[0].entityName).toBe("Loja Chapecó");
    });
  });

  describe("createStory", () => {
    it("destructures and handles complete parameters", async () => {
      const mockStory = { id: STORY_ID, media_url: "https://example.com/video.mp4" };
      testState.responseQueues["stories"] = [{ data: mockStory, error: null }];

      const result = await (createStory as any)({
        data: {
          mediaUrl: "https://example.com/video.mp4",
          linkUrl: "https://example.com/promo",
          linkCta: "Comprar Agora",
          durationSeconds: 75,
          niche: "moda",
          hashtags: ["verao", "looks"],
          productId: "550e8400-e29b-41d4-a716-446655440020",
          targetStoreId: STORE_ID,
        },
      });

      expect(result).toEqual(mockStory);
      const insertAction = testState.actions.find(
        (a) => a.table === "stories" && a.method === "insert",
      );
      expect(insertAction).toBeDefined();
      expect(insertAction?.args[0]).toMatchObject({
        media_url: "https://example.com/video.mp4",
        link_url: "https://example.com/promo",
        link_cta: "Comprar Agora",
        duration_seconds: 75,
        is_long_format: true,
        niche: "moda",
        hashtags: ["verao", "looks"],
        product_id: "550e8400-e29b-41d4-a716-446655440020",
        store_id: STORE_ID,
      });
    });

    it("destructures and applies defaults when optional parameters are omitted", async () => {
      const mockStory = { id: STORY_ID, media_url: "https://example.com/photo.jpg" };
      testState.responseQueues["stories"] = [{ data: mockStory, error: null }];

      const result = await (createStory as any)({
        data: {
          mediaUrl: "https://example.com/photo.jpg",
        },
      });

      expect(result).toEqual(mockStory);
      const insertAction = testState.actions.find(
        (a) => a.table === "stories" && a.method === "insert",
      );
      expect(insertAction).toBeDefined();
      expect(insertAction?.args[0]).toMatchObject({
        media_url: "https://example.com/photo.jpg",
        link_url: null,
        link_cta: null,
        duration_seconds: 15,
        is_long_format: false,
        niche: "geral",
        hashtags: [],
        product_id: null,
        store_id: STORE_ID,
      });
    });
  });

  describe("recordStoryTelemetry", () => {
    it("destructures parameters with default watchTimeSeconds", async () => {
      testState.responseQueues["story_analytics_events"] = [{ data: null, error: null }];

      const result = await (recordStoryTelemetry as any)({
        data: {
          storyId: STORY_ID,
          eventType: "view",
        },
      });

      expect(result).toEqual({ success: true });
      const insertAction = testState.actions.find(
        (a) => a.table === "story_analytics_events" && a.method === "insert",
      );
      expect(insertAction).toBeDefined();
      expect(insertAction?.args[0]).toMatchObject({
        story_id: STORY_ID,
        event_type: "view",
        watch_time_seconds: 0,
      });
    });

    it("destructures custom watchTimeSeconds when provided", async () => {
      testState.responseQueues["story_analytics_events"] = [{ data: null, error: null }];

      await (recordStoryTelemetry as any)({
        data: {
          storyId: STORY_ID,
          eventType: "watch_time",
          watchTimeSeconds: 42,
        },
      });

      const insertAction = testState.actions.find(
        (a) => a.table === "story_analytics_events" && a.method === "insert",
      );
      expect(insertAction?.args[0]).toMatchObject({
        story_id: STORY_ID,
        event_type: "watch_time",
        watch_time_seconds: 42,
      });
    });
  });

  describe("toggleAmbassadorStatus", () => {
    it("blocks non-master users from toggling status", async () => {
      testState.identity.role = "owner";

      await expect(
        (toggleAmbassadorStatus as any)({
          data: {
            creatorId: CREATOR_ID,
            isOfficialAmbassador: true,
          },
        }),
      ).rejects.toThrow("Apenas o Administrador Master pode conceder selos oficiais de embaixador.");
    });

    it("updates creator ambassador status when master role is present", async () => {
      testState.identity.role = "master";
      const updatedProfile = { id: CREATOR_ID, is_official_ambassador: true };
      testState.responseQueues["creator_profiles"] = [{ data: updatedProfile, error: null }];

      const result = await (toggleAmbassadorStatus as any)({
        data: {
          creatorId: CREATOR_ID,
          isOfficialAmbassador: true,
          ambassadorBadgeLabel: "Embaixador Master",
        },
      });

      expect(result).toEqual(updatedProfile);
      const updateAction = testState.actions.find(
        (a) => a.table === "creator_profiles" && a.method === "update",
      );
      expect(updateAction).toBeDefined();
      expect(updateAction?.args[0]).toMatchObject({
        is_official_ambassador: true,
        ambassador_badge_label: "Embaixador Master",
      });
    });
  });

  describe("getStoreStoriesAnalytics", () => {
    it("returns zero metrics when store has no stories", async () => {
      testState.responseQueues["store_stories"] = [{ data: [], error: null }];

      const result = await (getStoreStoriesAnalytics as any)();
      expect(result).toEqual({
        totalViews: 0,
        totalWatchTimeSeconds: 0,
        totalProductClicks: 0,
        stories: [],
      });
    });
  });
});
