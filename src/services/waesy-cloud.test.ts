/**
 * waesy-cloud.test.ts — Testes Unitários e Criptográficos da Engine Waesy Cloud
 */

import { describe, it, expect } from "vitest";
import {
  signSupabaseJwt,
  generateCanonicalSupabaseKeys,
  WaesyServiceHealthSchema,
  WaesyCloudStatusSchema,
} from "./waesy-cloud.functions";

describe("Waesy Cloud Engine & JWT Cryptography", () => {
  const TEST_SECRET = "super-secret-jwt-token-with-minimum-32-bytes-length-xyz123";

  it("deve assinar um JWT HS256 canônico com 3 partes separadas por pontos", () => {
    const payload = {
      role: "anon",
      iss: "supabase",
      iat: 1730000000,
      exp: 2045000000,
    };

    const token = signSupabaseJwt(payload, TEST_SECRET);
    expect(token).toBeDefined();

    const parts = token.split(".");
    expect(parts).toHaveLength(3);

    // Valida Header
    const headerJson = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    expect(headerJson).toEqual({ alg: "HS256", typ: "JWT" });

    // Valida Payload
    const payloadJson = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    expect(payloadJson.role).toBe("anon");
    expect(payloadJson.iss).toBe("supabase");
  });

  it("deve gerar o par de chaves anon e service_role com roles corretas", () => {
    const keys = generateCanonicalSupabaseKeys(TEST_SECRET);

    expect(keys.anonKey).toBeDefined();
    expect(keys.serviceRoleKey).toBeDefined();
    expect(keys.anonKey).not.toEqual(keys.serviceRoleKey);

    const anonParts = keys.anonKey.split(".");
    const anonPayload = JSON.parse(Buffer.from(anonParts[1], "base64url").toString("utf8"));
    expect(anonPayload.role).toBe("anon");
    expect(anonPayload.iss).toBe("supabase");

    const serviceParts = keys.serviceRoleKey.split(".");
    const servicePayload = JSON.parse(Buffer.from(serviceParts[1], "base64url").toString("utf8"));
    expect(servicePayload.role).toBe("service_role");
    expect(servicePayload.iss).toBe("supabase");
  });

  it("deve validar schemas Zod de saúde de microsserviço", () => {
    const validService = {
      service: "postgrest" as const,
      label: "PostgREST Engine",
      url: "http://localhost:54321/rest/v1/",
      status: "healthy" as const,
      statusCode: 200,
      latencyMs: 14,
      error: null,
    };

    const parsed = WaesyServiceHealthSchema.safeParse(validService);
    expect(parsed.success).toBe(true);
  });

  it("deve validar schemas Zod do status global do cluster", () => {
    const statusData = {
      activeTarget: "waesy_cloud_sovereign" as const,
      targetBaseUrl: "http://localhost:54321",
      isConfigured: true,
      clusterName: "Cluster Local Sovereign",
      overallStatus: "healthy" as const,
      avgLatencyMs: 16,
      services: [
        {
          service: "postgres" as const,
          label: "PostgreSQL 17 Core",
          url: "localhost:5432",
          status: "healthy" as const,
          statusCode: 200,
          latencyMs: 10,
          error: null,
        },
      ],
      anonKeyMasked: "eyJhbGciOi...123456",
      hasServiceRoleConfigured: true,
      hasDbUrlConfigured: true,
      lastHandshakeAt: "2026-10-30T10:00:00.000Z",
      baasStats: {
        totalTenants: 5,
        activeSubscriptions: 3,
        monthlyRevenueEstimatedCents: 45000,
      },
    };

    const parsed = WaesyCloudStatusSchema.safeParse(statusData);
    expect(parsed.success).toBe(true);
  });
});
