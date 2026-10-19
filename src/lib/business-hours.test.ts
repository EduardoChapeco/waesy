import { describe, it, expect } from "vitest";
import { resolveStoreDepartmentSchedules, normalizeWorkingHours, formatWeeklyScheduleSummary } from "./business-hours";

describe("business-hours — resolveStoreDepartmentSchedules", () => {
  it("deve inferir setores canônicos com horários e SLA padrão quando store.settings não possui configuração explícita", () => {
    const store = {
      id: "store-1",
      name: "Padaria Central",
      category: "gastronomia",
      phone: "49999999999",
      settings: {
        working_hours: {
          mon: { open: true, intervals: [{ from: "07:00", to: "19:00" }] },
          tue: { open: true, intervals: [{ from: "07:00", to: "19:00" }] },
          wed: { open: true, intervals: [{ from: "07:00", to: "19:00" }] },
          thu: { open: true, intervals: [{ from: "07:00", to: "19:00" }] },
          fri: { open: true, intervals: [{ from: "07:00", to: "19:00" }] },
          sat: { open: true, intervals: [{ from: "07:00", to: "13:00" }] },
          sun: { open: false, intervals: [] },
        },
      },
    };

    const depts = resolveStoreDepartmentSchedules(store);
    expect(depts).toHaveLength(3);

    const vendas = depts.find((d) => d.id === "vendas");
    expect(vendas).toBeDefined();
    expect(vendas?.name).toBe("Vendas & Orçamentos");
    expect(vendas?.hours).toBe("07:00 às 19:00");
    expect(vendas?.responseTime).toContain("10 min");
    expect(vendas?.daysDescription).toBe("Segunda a Sábado");

    const suporte = depts.find((d) => d.id === "suporte");
    expect(suporte).toBeDefined();
    expect(suporte?.name).toBe("Suporte & Pós-Venda");

    const financeiro = depts.find((d) => d.id === "financeiro");
    expect(financeiro).toBeDefined();
    expect(financeiro?.name).toBe("Financeiro & Pix");
    expect(financeiro?.hours).toBe("09:00 às 17:00");
  });

  it("deve consumir setores explícitos configurados em store.settings.department_schedules", () => {
    const store = {
      id: "store-2",
      name: "Clínica Vida",
      settings: {
        department_schedules: [
          {
            id: "triagem",
            name: "Triagem & Plantão",
            hours: "24 Horas",
            responseTime: "Imediato",
            days: "Todos os dias",
            is24h: true,
          },
          {
            id: "consultas",
            name: "Agendamento de Consultas",
            hours: "08:00 às 20:00",
            responseTime: "Até 15 min",
            days: "Segunda a Sexta",
          },
        ],
      },
    };

    const depts = resolveStoreDepartmentSchedules(store);
    expect(depts).toHaveLength(2);
    expect(depts[0].name).toBe("Triagem & Plantão");
    expect(depts[0].is24h).toBe(true);
    expect(depts[0].responseTime).toBe("Imediato");
    expect(depts[1].name).toBe("Agendamento de Consultas");
    expect(depts[1].hours).toBe("08:00 às 20:00");
  });

  it("deve normalizar horários e formatar resumo semanal corretamente", () => {
    const weekly = normalizeWorkingHours({
      mon: { open: true, intervals: [{ from: "08:00", to: "18:00" }] },
      tue: { open: true, intervals: [{ from: "08:00", to: "18:00" }] },
      wed: { open: true, intervals: [{ from: "08:00", to: "18:00" }] },
      thu: { open: true, intervals: [{ from: "08:00", to: "18:00" }] },
      fri: { open: true, intervals: [{ from: "08:00", to: "18:00" }] },
      sat: { open: false, intervals: [] },
      sun: { open: false, intervals: [] },
    });

    const summary = formatWeeklyScheduleSummary(weekly);
    expect(summary).toContain("Seg a Sex");
    expect(summary).toContain("08:00 às 18:00");
  });
});
