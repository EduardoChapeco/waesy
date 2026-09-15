import { vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const secretsPath = path.resolve(process.cwd(), ".env.secrets");
if (fs.existsSync(secretsPath)) {
  const parsed = dotenv.parse(fs.readFileSync(secretsPath));
  for (const k in parsed) {
    process.env[k] = parsed[k];
  }
  process.env.SUPABASE_DB_HOST = "aws-0-sa-east-1.pooler.supabase.com";
  process.env.SUPABASE_DB_PORT = "6543";
  process.env.SUPABASE_DB_USER = "postgres.jfuebqmltksyznovhlwa";
  process.env.SUPABASE_DB_NAME = "postgres";
}

const createChainableMock = () => {
  let proxy: any;
  const fn: any = vi.fn((..._args: any[]) => proxy);
  proxy = new Proxy(fn, {
    get: (target, prop) => {
      if (prop === "then") {
        return (resolve: any) => resolve({ data: [], error: null });
      }
      if (!(prop in target)) {
        target[prop] = createChainableMock();
      }
      return target[prop];
    },
    apply: (_target, _thisArg, _argArray) => {
      return proxy;
    },
  });
  return proxy;
};

const mockIdentity = {
 id: "test-user-id",
 role: "admin",
 store_id: "test-store-id",
 memberships: [{ store_id: "store-123", role: "admin" }],
};

// These hoists will register the mock modules
vi.mock("@/lib/server-access", () => ({
 getServerIdentity: vi.fn(),
 assertStoreAccess: vi.fn(),
 getSSRClient: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
 getServerClient: vi.fn(),
 SupabaseUnconfiguredError: class extends Error {},
}));

vi.mock("@/lib/tenant.server", () => ({
 resolveTenantStoreId: vi.fn(),
}));

import { getServerIdentity } from "@/lib/server-access";
import { getSSRClient } from "@/lib/server-access";
import { getServerClient } from "@/lib/supabase";
import { resolveTenantStoreId } from "@/lib/tenant.server";

beforeEach(() => {
 vi.clearAllMocks();

 vi.mocked(getServerIdentity).mockResolvedValue(mockIdentity);
 vi.mocked(getSSRClient).mockReturnValue(createChainableMock());
 vi.mocked(getServerClient).mockReturnValue(createChainableMock());
 vi.mocked(resolveTenantStoreId).mockResolvedValue("test-store-id");
});
