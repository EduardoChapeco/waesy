import { describe, it, expect } from "vitest";
import { parseTimeToMinutes, getConnectionWarning } from "./SectionFlights";
import type { Flight } from "@/services/proposals";

describe("SectionFlights — Cálculo e Alertas de Conexão Aérea (GAP-01)", () => {
  it("converte horário string HH:MM para minutos desde meia-noite", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("08:30")).toBe(510);
    expect(parseTimeToMinutes("14:45")).toBe(885);
    expect(parseTimeToMinutes("23:59")).toBe(1439);
    expect(parseTimeToMinutes("invalido")).toBeNull();
    expect(parseTimeToMinutes(undefined)).toBeNull();
  });

  it("alerta conexão apertada quando intervalo for inferior a 45 minutos", () => {
    const flight1: Flight = {
      id: "1",
      origin: "XAP",
      destination: "GRU",
      date: "2026-11-10",
      departure_time: "09:00",
      arrival_time: "10:30",
      airline: "GOL",
      flight_number: "G31200",
      stops: 0,
      baggage_rules: "23kg",
      price: 400,
    };

    const flight2: Flight = {
      id: "2",
      origin: "GRU",
      destination: "MCZ",
      date: "2026-11-10",
      departure_time: "11:05", // 35 minutos após chegada às 10:30
      arrival_time: "14:15",
      airline: "GOL",
      flight_number: "G31250",
      stops: 0,
      baggage_rules: "23kg",
      price: 600,
    };

    const warning = getConnectionWarning(flight1, flight2);
    expect(warning).not.toBeNull();
    expect(warning?.type).toBe("tight");
    expect(warning?.message).toContain("35 min");
    expect(warning?.message).toContain("Risco elevado de perda de conexão");
  });

  it("alerta inconsistência de horários quando voo seguinte decola antes da chegada", () => {
    const flight1: Flight = {
      id: "1",
      origin: "SDU",
      destination: "BSB",
      date: "2026-11-10",
      departure_time: "14:00",
      arrival_time: "15:45",
      airline: "LATAM",
      flight_number: "LA3001",
      stops: 0,
      baggage_rules: "10kg",
      price: 350,
    };

    const flight2: Flight = {
      id: "2",
      origin: "BSB",
      destination: "MAO",
      date: "2026-11-10",
      departure_time: "15:20", // decola antes das 15:45!
      arrival_time: "18:30",
      airline: "LATAM",
      flight_number: "LA3002",
      stops: 0,
      baggage_rules: "10kg",
      price: 550,
    };

    const warning = getConnectionWarning(flight1, flight2);
    expect(warning).not.toBeNull();
    expect(warning?.type).toBe("negative");
    expect(warning?.message).toContain("Inconsistência de horários");
  });

  it("alerta conexão longa quando tempo de espera for superior a 6 horas (360 min)", () => {
    const flight1: Flight = {
      id: "1",
      origin: "CWB",
      destination: "GRU",
      date: "2026-11-10",
      departure_time: "07:00",
      arrival_time: "08:10",
      airline: "Azul",
      flight_number: "AD4100",
      stops: 0,
      baggage_rules: "23kg",
      price: 300,
    };

    const flight2: Flight = {
      id: "2",
      origin: "GRU",
      destination: "MIA",
      date: "2026-11-10",
      departure_time: "15:30", // 7h 20m de espera (440 min)
      arrival_time: "22:00",
      airline: "American",
      flight_number: "AA930",
      stops: 0,
      baggage_rules: "23kg",
      price: 2500,
    };

    const warning = getConnectionWarning(flight1, flight2);
    expect(warning).not.toBeNull();
    expect(warning?.type).toBe("long");
    expect(warning?.message).toContain("7h 20min de espera");
  });

  it("retorna null quando a conexão tiver intervalo confortável (ex: 2h 15m)", () => {
    const flight1: Flight = {
      id: "1",
      origin: "FLN",
      destination: "VCP",
      date: "2026-11-10",
      departure_time: "10:00",
      arrival_time: "11:15",
      airline: "Azul",
      flight_number: "AD2001",
      stops: 0,
      baggage_rules: "10kg",
      price: 250,
    };

    const flight2: Flight = {
      id: "2",
      origin: "VCP",
      destination: "SSA",
      date: "2026-11-10",
      departure_time: "13:30", // 2h 15m (135 min)
      arrival_time: "16:00",
      airline: "Azul",
      flight_number: "AD2002",
      stops: 0,
      baggage_rules: "10kg",
      price: 450,
    };

    const warning = getConnectionWarning(flight1, flight2);
    expect(warning).toBeNull();
  });
});
