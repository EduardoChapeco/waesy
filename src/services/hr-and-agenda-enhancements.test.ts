import { describe, it, expect } from "vitest";
import { z } from "zod";

describe("HR Point-Punching & Agenda Operations (BigTech Council & Apple HIG)", () => {
  it("1. Deve validar o schema de registro de batida de ponto com tipos canônicos", () => {
    const timeClockSchema = z.object({
      employeeId: z.string().uuid(),
      entryType: z.enum([
        "clock_in",
        "lunch_out",
        "lunch_in",
        "clock_out",
        "break_out",
        "break_in",
        "overtime_in",
        "overtime_out",
      ]),
      source: z.enum(["web", "mobile_pwa", "biometric_terminal", "supervisor_manual"]).default("web"),
      geolocation: z.object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        accuracy: z.number().optional(),
        address: z.string().optional(),
      }).default({}),
      photoUrl: z.string().optional(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    });

    const validPayload = {
      employeeId: "123e4567-e89b-12d3-a456-426614174000",
      entryType: "clock_in" as const,
      source: "mobile_pwa" as const,
      geolocation: {
        latitude: -26.7268,
        longitude: -53.5186,
        address: "São Miguel do Oeste - SC",
      },
    };

    const parsed = timeClockSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);

    const invalidType = timeClockSchema.safeParse({
      ...validPayload,
      entryType: "invalid_type",
    });
    expect(invalidType.success).toBe(false);
  });

  it("2. Deve exigir justificativa com no mínimo 5 caracteres para ajuste manual de ponto", () => {
    const adjustSchema = z.object({
      entryId: z.string().uuid(),
      reason: z.string().min(5, "Justificativa obrigatória"),
      newRecordedAt: z.string().datetime().optional(),
    });

    const shortReason = adjustSchema.safeParse({
      entryId: "123e4567-e89b-12d3-a456-426614174000",
      reason: "ops",
    });
    expect(shortReason.success).toBe(false);

    const validAdjustment = adjustSchema.safeParse({
      entryId: "123e4567-e89b-12d3-a456-426614174000",
      reason: "Esquecimento de registro na saída do intervalo de almoço",
    });
    expect(validAdjustment.success).toBe(true);
  });

  it("3. Deve blindar rotas de Gestão de Equipe e Ponto contra acesso indevido por operadores", () => {
    const TEAM_MANAGEMENT_ROUTES = [
      "/workspace/configuracoes/equipe",
      "/workspace/rh/ponto",
      "/workspace/empregos/candidatos",
      "/workspace/financeiro/funcionarios",
    ];

    const allowedRoles = ["owner", "admin", "proprietario", "manager", "gerente", "rh", "recruiter"];

    const isRouteAllowed = (path: string, userRole: string) => {
      const isRestricted = TEAM_MANAGEMENT_ROUTES.some((r) => path === r || path.startsWith(r + "/"));
      if (!isRestricted) return true;
      return allowedRoles.includes(userRole);
    };

    // Vendedor, caixa e expedição não podem acessar espelho de ponto nem equipe
    expect(isRouteAllowed("/workspace/rh/ponto", "seller")).toBe(false);
    expect(isRouteAllowed("/workspace/rh/ponto", "cashier")).toBe(false);
    expect(isRouteAllowed("/workspace/rh/ponto", "kitchen")).toBe(false);
    expect(isRouteAllowed("/workspace/configuracoes/equipe", "operator")).toBe(false);

    // Gerente, RH e Proprietário têm acesso garantido
    expect(isRouteAllowed("/workspace/rh/ponto", "owner")).toBe(true);
    expect(isRouteAllowed("/workspace/rh/ponto", "manager")).toBe(true);
    expect(isRouteAllowed("/workspace/rh/ponto", "rh")).toBe(true);
    expect(isRouteAllowed("/workspace/empregos/candidatos", "recruiter")).toBe(true);
  });

  it("4. Deve calcular corretamente slots de agendamento e duração de atendimento em minutos", () => {
    const calculateEndTime = (startIso: string, durationMinutes: number): string => {
      const startDate = new Date(startIso);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
      return endDate.toISOString();
    };

    const start = "2026-10-15T14:00:00.000Z";
    const end60 = calculateEndTime(start, 60);
    expect(end60).toBe("2026-10-15T15:00:00.000Z");

    const end90 = calculateEndTime(start, 90);
    expect(end90).toBe("2026-10-15T15:30:00.000Z");
  });

  it("5. Deve validar integridade de preço em centavos BRL nos agendamentos da agenda", () => {
    const appointmentServiceSchema = z.object({
      id: z.string().uuid(),
      title: z.string().min(1),
      price_cents: z.number().int().min(0),
      duration_minutes: z.number().int().min(5),
    });

    const validService = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      title: "Consultoria Jurídica / Atendimento Personalizado",
      price_cents: 25000, // R$ 250,00
      duration_minutes: 60,
    };

    const parsed = appointmentServiceSchema.safeParse(validService);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.price_cents).toBe(25000);

    const floatPrice = appointmentServiceSchema.safeParse({
      ...validService,
      price_cents: 250.50, // Float é proibido (Integer Cents Mandate)
    });
    expect(floatPrice.success).toBe(false);
  });
});
