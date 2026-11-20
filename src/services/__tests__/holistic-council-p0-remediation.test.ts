import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCanonicalStructuredError,
  logCanonicalStructuredError,
} from "@/lib/telemetry/operational-logger";
import { logLoaderError } from "@/lib/loader-observability";

const ROOT = path.resolve(__dirname, "../../..");

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

describe("Conselho Técnico de Auditoria Integral — Remediação E2E (MF-1 a MF-6)", () => {
  it("MF-4: buildCanonicalStructuredError emite os 12 campos obrigatórios e extrai código 42703 e coluna ausente", () => {
    const pgError = {
      code: "42703",
      message: 'column leads_crm.origin_iata does not exist',
    };

    const payload = buildCanonicalStructuredError({
      route: "/workspace/radar",
      module: "opportunity-radar",
      contract: "scanOpportunityRadar",
      db_schema: "public",
      db_table: "leads_crm",
      user_role: "manager",
      error: pgError,
    });

    expect(Object.keys(payload)).toEqual([
      "trace_id",
      "severity",
      "route",
      "module",
      "contract",
      "db_schema",
      "db_table",
      "db_column",
      "error_code",
      "reason",
      "user_role",
      "timestamp",
    ]);
    expect(payload.error_code).toBe("42703");
    expect(payload.db_table).toBe("leads_crm");
    expect(payload.db_column).toBe("origin_iata");
    expect(payload.severity).toBe("error");
    expect(payload.user_role).toBe("manager");
  });

  it("MF-4: logLoaderError preserva fallback seguro enquanto registra envelope canônico de 12 campos", () => {
    const handler = logLoaderError(
      {
        route: "/workspace/crm",
        action: "listLeads",
        tableOrEntity: "leads_crm",
        userRole: "owner",
      },
      { items: [] },
    );
    const fallback = handler(new Error("PGRST204: Could not find the 'whatsapp' column of 'leads_crm' in the schema cache"));
    expect(fallback).toEqual({ items: [] });

    const logged = logCanonicalStructuredError({
      route: "/workspace/crm",
      module: "workspace-crm",
      contract: "listLeads",
      db_table: "leads_crm",
      error: new Error("PGRST204: Could not find the 'whatsapp' column of 'leads_crm' in the schema cache"),
    });
    expect(logged.error_code).toBe("PGRST204");
    expect(logged.db_column).toBe("whatsapp");
  });

  it("MF-1: OtaSelfServiceCheckoutModal não contém fallback sintético mockOutcome (BK-/LOC- fake)", () => {
    const src = readRepoFile("src/components/tourism/booking/OtaSelfServiceCheckoutModal.tsx");
    expect(src).not.toContain("mockOutcome");
    expect(src).toContain("Esta oferta requer vínculo com uma agência credenciada para emissão em tempo real.");
  });

  it("MF-2: Services BFF reconciliados não selecionam colunas inexistentes (42703)", () => {
    const radar = readRepoFile("src/services/opportunity-radar.functions.ts");
    expect(radar).not.toContain("departure_city, origin_city, origin_iata");
    expect(radar).toContain("room_occupancies, pax_adults, pax_children");

    const rfv = readRepoFile("src/services/rfv-and-referrals.functions.ts");
    expect(rfv).not.toContain("total_amount_cents, start_date");
    expect(rfv).toContain("travel_start_date, travel_end_date, customer_id, client_name, client_whatsapp");

    const surfaceCms = readRepoFile("src/services/surface-cms.functions.ts");
    expect(surfaceCms).not.toContain("category_slug, media_urls");
    expect(surfaceCms).toContain("category, niche_category, city, store_id, images, feed_media");

    const settlement = readRepoFile("src/services/multi-domain-payment-settlement.service.ts");
    expect(settlement).toContain("total_cents");
    expect(settlement).toContain("settled_at");
  });

  it("MF-3: Zero-Trust e anti-BOLA aplicados em corporate-travel, billing-ledger, affiliate-ledger, growth, security e jobs", () => {
    const corp = readRepoFile("src/services/corporate-travel.functions.ts");
    expect(corp).toContain("assertStoreAccess(identity, undefined, data.agencyId)");

    const billing = readRepoFile("src/services/billing-ledger.functions.ts");
    expect(billing).toContain("assertStoreAccess(identity, undefined, data.storeId)");

    const growth = readRepoFile("src/services/growth.functions.ts");
    expect(growth).toContain('.eq("id", input.id).eq("store_id", identity.store_id!)');

    const jobs = readRepoFile("src/services/jobs.functions.ts");
    expect(jobs).toContain('.eq("jobs.store_id", identity.store_id)');
    expect(jobs).toContain("Acesso negado: candidatura pertence a outra empresa.");
    expect(jobs).toContain("Candidato já foi admitido anteriormente para esta vaga.");
  });

  it("MF-6: Persistência idempotente de currículos (upsert profile_id,slug) e k-anonimato salarial (k >= 3)", () => {
    const resumes = readRepoFile("src/services/resumes.functions.ts");
    expect(resumes).toContain('{ onConflict: "profile_id,slug" }');

    const social = readRepoFile("src/services/social.functions.ts");
    expect(social).toContain("salaries.length >= 3");

    const jobs = readRepoFile("src/services/jobs.functions.ts");
    expect(jobs).toContain("salaryEntries.length >= 3");

    const migration = readRepoFile(
      "supabase/migrations/20270622000000_holistic_zero_trust_views_storage_and_infojobs_lgpd.sql",
    );
    expect(migration).toContain("security_invoker = true");
    expect(migration).toContain("v_public_employer_reviews");
    expect(migration).toContain("consent_lgpd_accepted");
  });
});
