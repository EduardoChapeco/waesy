import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  computePacedScheduleTimestamps,
  interpolateProspectingMessage,
  parseRawProspectCsvText,
} from "@/services/whatsapp-prospecting-csv.functions";

describe("Phase 2 — Wave 3: Active Opportunity Matchmaker, OmniMatch Unification & CSV Prospecting", () => {
  const rootDir = process.cwd();

  it("parses CSV/TSV contact lists, normalizes Brazilian phones, and deduplicates entries", () => {
    const csv = [
      "Nome;Telefone;Interesse;Cidade",
      "Maria Silva;(49) 99911-2233;Gramado em Família;Chapecó",
      "João Souza;5549988776655;Cruzeiro Nordeste;Xanxerê",
      "Duplicado Maria;49999112233;Outro;Chapecó",
      "Invalido;123;Nada;SC",
    ].join("\n");

    const parsed = parseRawProspectCsvText(csv);
    expect(parsed.valid.length).toBe(2);
    expect(parsed.valid[0]).toEqual({
      name: "Maria Silva",
      phone: "5549999112233",
      interest: "Gramado em Família",
      city: "Chapecó",
    });
    expect(parsed.valid[1].phone).toBe("5549988776655");
    expect(parsed.invalidOrDuplicateCount).toBe(2);
  });

  it("interpolates Branded App link (/app/:slug) and agency variables into prospecting messages", () => {
    const rendered = interpolateProspectingMessage({
      template: "Oi {{nome}}, somos da {{agencia}} em {{cidade}}! Veja nosso app: {{app_link}}",
      contact: {
        name: "Carlos Eduardo",
        phone: "5549999112233",
        interest: "Europa",
        city: "Chapecó",
      },
      storeName: "Excelência Tour",
      brandedAppUrl: "https://waesy.com.br/app/excelencia-tour",
    });

    expect(rendered).toContain("Oi Carlos");
    expect(rendered).toContain("Excelência Tour");
    expect(rendered).toContain("https://waesy.com.br/app/excelencia-tour");
  });

  it("computes anti-ban paced timestamps strictly inside BRT business hours (08:30–19:30 BRT)", () => {
    // 2026-11-19T03:00:00Z is 00:00 BRT (midnight -> must shift to 11:30 UTC / 08:30 BRT)
    const midnightBrt = new Date("2026-11-19T03:00:00.000Z");
    const slots = computePacedScheduleTimestamps(3, midnightBrt, 50, 90);
    expect(slots.length).toBe(3);

    const first = new Date(slots[0]);
    expect(first.getUTCHours()).toBe(11);
    expect(first.getUTCMinutes()).toBe(30);

    const second = new Date(slots[1]);
    const diffSec = (second.getTime() - first.getTime()) / 1000;
    expect(diffSec).toBeGreaterThanOrEqual(50);
    expect(diffSec).toBeLessThanOrEqual(90);
  });

  it("verifies Opportunity Radar lead_id fix, catalog scan, WhatsApp dispatch, and OmniMatch leads_crm unification", () => {
    const radarSrc = fs.readFileSync(path.join(rootDir, "src/services/opportunity-radar.functions.ts"), "utf8");
    const matchSrc = fs.readFileSync(path.join(rootDir, "src/services/match-engine.functions.ts"), "utf8");
    const campaignSrc = fs.readFileSync(path.join(rootDir, "src/services/whatsapp-automation.functions.ts"), "utf8");
    const leadCardSrc = fs.readFileSync(path.join(rootDir, "src/components/tourism/crm/LeadCard.tsx"), "utf8");

    expect(radarSrc).toContain("dRow.lead_id || dRow.crm_lead_id");
    expect(radarSrc).toContain('from("classifieds")');
    expect(radarSrc).toContain("dispatchRadarOpportunityViaWhatsAppFn");
    expect(radarSrc).toContain("whatsapp_opt_out");

    expect(matchSrc).not.toContain('from("crm_leads")');
    expect(matchSrc).toContain('from("leads_crm")');
    expect(matchSrc).toContain('rpc("match_next_cards_batch"');

    expect(campaignSrc).toContain('"evolution_api"');
    expect(campaignSrc).toContain("CAMPAIGN_PAUSED");

    expect(leadCardSrc).toContain("(staleness.isStale || staleness.isCold)");
    expect(leadCardSrc).toContain("Proposta Enviada");
    expect(leadCardSrc).toContain("Sem Proposta");
  });
});
