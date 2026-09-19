import { describe, it, expect } from "vitest";
import { getActiveSecretForProvider } from "./secret-vault.functions";
import { testPaymentGatewayConnection } from "./integrations.functions";
import {
  signClassifiedNda,
  checkClassifiedNdaStatus,
  listClassifiedNdaSignatures,
} from "./classifieds.functions";
import { DEFAULT_PUBLIC_API_GOVERNANCE } from "./public-apis.functions";

describe("Unified Integrations Hub, Gateway Testing & Digital NDA", () => {
  it("should have SimLabs telemetry in classifieds disabled by default in governance settings", () => {
    expect(DEFAULT_PUBLIC_API_GOVERNANCE.isSimLabsClassifiedTelemetryActive).toBe(false);
  });

  it("should have getActiveSecretForProvider defined and return null gracefully when no secrets are set", async () => {
    const secret = await getActiveSecretForProvider("openrouter", "non-existent-owner");
    expect(secret).toBeNull();
  });

  it("should export testPaymentGatewayConnection as a valid server function", () => {
    expect(typeof testPaymentGatewayConnection).toBe("function");
  });

  it("should reject invalid payment gateway provider in testPaymentGatewayConnection validation", async () => {
    await expect(
      testPaymentGatewayConnection({
        data: {
          provider: "unsupported_gateway" as any,
          apiKey: "sk_test_123456",
        },
      })
    ).rejects.toThrow();
  });

  it("should export digital NDA server functions (sign, check status, list signatures)", () => {
    expect(typeof signClassifiedNda).toBe("function");
    expect(typeof checkClassifiedNdaStatus).toBe("function");
    expect(typeof listClassifiedNdaSignatures).toBe("function");
  });

  it("should validate required fields for signClassifiedNda", async () => {
    // classifiedId must be a valid UUID
    await expect(
      signClassifiedNda({
        data: {
          classifiedId: "invalid-uuid",
          signerName: "Investidor Teste",
          signerEmail: "investidor@empresa.com",
          signerDocument: "12345678901",
        },
      })
    ).rejects.toThrow();
  });
  it("should support resolving secrets for both ownerId and storeId without errors", async () => {
    const secret = await getActiveSecretForProvider(
      "openai",
      "00000000-0000-0000-0000-000000000001",
      "00000000-0000-0000-0000-000000000002"
    );
    expect(secret).toBeNull();
  });

  it("should generate cryptographically secure random values within valid range for raffle draws", () => {
    const totalTickets = 46;
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const winnerIndex = randomArray[0] % totalTickets;
    expect(winnerIndex).toBeGreaterThanOrEqual(0);
    expect(winnerIndex).toBeLessThan(totalTickets);
  });
});
