import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20261008090000_global_hotels_deduplication.sql"),
  "utf8",
);
const service = fs.readFileSync(path.join(root, "src/services/travel-catalog.functions.ts"), "utf8");
const component = fs.readFileSync(
  path.join(root, "src/components/tourism/hotels/hotel-autocomplete-input.tsx"),
  "utf8",
);

describe("Turismo — banco global de hotéis", () => {
  it("declara entidades canônicas, aliases únicos e classificação separada de reviews", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.global_hotels");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.hotel_aliases");
    expect(migration).toContain("UNIQUE (normalized_alias)");
    expect(migration).toContain("hotel_rating");
    expect(migration).toContain("destination_rating");
    expect(migration).toContain("agency_service_rating");
    expect(migration).toContain("global_hotels_master_write");
  });

  it("consulta apenas hotéis verificados e limita o resultado do autocomplete", () => {
    expect(service).toContain("export const searchGlobalHotels");
    expect(service).toContain('.eq("verified_by_master", true)');
    expect(service).toContain(".limit(20)");
    expect(component).toContain("setTimeout");
    expect(component).toContain("searchGlobalHotels({ data: { query: term } })");
    expect(component).not.toContain("onOpenCreate");
  });
});
