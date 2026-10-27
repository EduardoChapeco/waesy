import { describe, it, expect } from "vitest";
import {
  getEnrichedAirportProfile,
  CANONICAL_ANAC_RIGHTS,
} from "./airport-intelligence";

describe("Airport Intelligence & Rich Infrastructure Profiles (SSOT)", () => {
  it("deve carregar o perfil rico e específico de Chapecó (XAP)", () => {
    const xap = getEnrichedAirportProfile("XAP");
    expect(xap).toBeDefined();
    expect(xap?.iata_code).toBe("XAP");
    expect(xap?.operator_name).toContain("Voe Xap");
    expect(xap?.phone_pabx).toBe("(49) 3328-4000");

    // Órgãos públicos
    const pf = xap?.official_sectors.find((s) => s.type === "police");
    expect(pf).toBeDefined();
    expect(pf?.phone).toContain("3321-6900");

    const rf = xap?.official_sectors.find((s) => s.type === "customs");
    expect(rf).toBeDefined();

    const lost = xap?.official_sectors.find((s) => s.type === "lost_found");
    expect(lost).toBeDefined();
    expect(lost?.email).toBe("achadosperdidos@voexap.com.br");

    // Transporte terrestre
    expect(xap?.ground_transportation.taxi_official.phone).toBe("(49) 3322-2020");
    expect(xap?.ground_transportation.app_rides.uber_available).toBe(true);
  });

  it("deve carregar o perfil rico e específico de São Paulo / Guarulhos (GRU)", () => {
    const gru = getEnrichedAirportProfile("GRU");
    expect(gru).toBeDefined();
    expect(gru?.operator_name).toContain("GRU Airport");
    expect(gru?.terminals.length).toBe(3);

    // Órgãos públicos federais
    const anvisa = gru?.official_sectors.find((s) => s.type === "health");
    expect(anvisa).toBeDefined();
    expect(anvisa?.name).toContain("ANVISA");

    const vigiagro = gru?.official_sectors.find((s) => s.type === "agriculture");
    expect(vigiagro).toBeDefined();

    // Táxi oficial Guarucoop
    expect(gru?.ground_transportation.taxi_official.name).toContain("Guarucoop");

    // Transporte sobre trilhos People Mover
    expect(gru?.ground_transportation.public_transit?.metro_train).toContain("CPTM");
  });

  it("deve conter informações detalhadas sobre a taxa TUUA de trânsito em Lima (LIM)", () => {
    const lim = getEnrichedAirportProfile("LIM");
    expect(lim).toBeDefined();
    expect(lim?.operator_name).toContain("Lima Airport Partners");

    const tuuaFee = lim?.fees_and_taxes.find((f) => f.type === "international_transit");
    expect(tuuaFee).toBeDefined();
    expect(tuuaFee?.title).toContain("TUUA");
    expect(tuuaFee?.explanation).toContain("conexão internacional");

    // Alerta de taxa
    const notice = lim?.notices.find((n) => n.id === "not-lim-1");
    expect(notice).toBeDefined();
    expect(notice?.summary).toContain("taxa TUUA");
  });

  it("deve sintetizar perfil canônico autêntico para qualquer aeroporto internacional sem dados curados (ex: CDG)", () => {
    const cdg = getEnrichedAirportProfile("CDG");
    expect(cdg).toBeDefined();
    expect(cdg?.iata_code).toBe("CDG");
    expect(cdg?.city).toContain("Paris");
    expect(cdg?.country).toBe("França");
    expect(cdg?.official_sectors.length).toBeGreaterThan(0);
    expect(cdg?.ground_transportation.taxi_official).toBeDefined();
    expect(cdg?.fees_and_taxes.length).toBeGreaterThan(0);
  });

  it("deve incluir o resumo oficial de direitos do passageiro ANAC (Resolução 400)", () => {
    expect(CANONICAL_ANAC_RIGHTS.contact_phone).toContain("163");
    expect(CANONICAL_ANAC_RIGHTS.delay_1h).toContain("Comunicação");
    expect(CANONICAL_ANAC_RIGHTS.delay_2h).toContain("Alimentação");
    expect(CANONICAL_ANAC_RIGHTS.delay_4h).toContain("Acomodação");
  });
});
